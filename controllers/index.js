const { Web3 } = require("web3");
const con = require("../dbConnection/index");
const { latestPriceFeed } = require("../contracts");
const tokenAbi = require("./tokenAbi.json");
const { getRpcUrl } = require("../contracts/rpc");
const moment = require('moment');

const userAddress = process.env.WALLET_ADDRESS;
const ERC20_TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function decodeTransferEvent(log, web3) {
    if (log.topics[0] !== ERC20_TRANSFER_EVENT_SIGNATURE) {
        return null;
    }
    const from = '0x' + log.topics[1].slice(26);
    const to = '0x' + log.topics[2].slice(26);
    const value = web3.utils.toBigInt(log.data).toString();
    return { from, to, value };
}

const rawUnits = {
    1: "wei",
    3: "kwei",
    6: "mwei",
    9: "gwei",
    12: "szabo",
    15: "finney",
    18: "ether",
    21: "kether",
    24: "mether",
    27: "gether",
    30: "tether"
};

const updatePresale = async (presale_id) => {
    console.log("Starting presale update...");

    // Get current timestamp
    const currentTimestamp = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
        // Fetch the presale
        const [presaleRows] = await con.execute("SELECT `total_supply` FROM presales WHERE `id`=?", [presale_id]);
        const presale = presaleRows[0];

        if (presale) {
            // Calculate total purchased amount
            const [purchaseRows] = await con.execute("SELECT SUM(`purchased_amount`) AS purchased_amount FROM `purchases` WHERE `presale_id`=? AND `payment_status`='paid'", [presale_id]);
            const currentAmount = purchaseRows[0].purchased_amount || 0;

            // Check if the total purchased amount meets or exceeds the total supply
            if (Number(currentAmount) >= Number(presale.total_supply)) {
                // Update current presale status to 'Ended'
                const [updateResult] = await con.execute("UPDATE presales SET status = 'Ended', ends_at = ? WHERE id = ?", [currentTimestamp, presale_id]);
                const nextPresaleId = presale_id + 1;

                if (updateResult.affectedRows > 0) {
                    // Update next presale status to 'Live'
                    const [nextUpdateResult] = await con.execute("UPDATE presales SET status = 'Live' WHERE id = ?", [nextPresaleId]);
                    if (nextUpdateResult.affectedRows > 0) {
                        console.log('Next presale status updated successfully');
                    } else {
                        console.log('Failed to update the next presale status');
                    }
                } else {
                    console.log('Failed to update the current presale status');
                }
            } else {
                console.log('Total purchased amount is less than total supply');
            }
        } else {
            console.log("No presale found with the given ID");
        }

    } catch (error) {
        console.error("Error during presale update:", error.message);
    }
};


function formattedDateTime(unixTimestamp) {
    const transactionDate = new Date(unixTimestamp * 1000);
    // Extract date and time components
    const year = transactionDate.getFullYear();
    const month = (transactionDate.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-based
    const day = transactionDate.getDate().toString().padStart(2, '0');
    const hours = transactionDate.getHours().toString().padStart(2, '0');
    const minutes = transactionDate.getMinutes().toString().padStart(2, '0');
    const seconds = transactionDate.getSeconds().toString().padStart(2, '0');

    // Format the date and time
    const formattedDateTiming = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    return formattedDateTiming;

}

async function getTransactionDetails() {
    try {

        const [pendingTransactions] = await con.execute("SELECT * FROM `purchases` WHERE `payment_status`='unpaid'");


        if (pendingTransactions.length) {


            await Promise.all(pendingTransactions.map(async (transaction) => {

                const rpc_url = getRpcUrl(transaction.chain_id);

                if (!rpc_url) return;

                const web3 = new Web3(rpc_url); //"https://data-seed-prebsc-1-s1.binance.org:8545/" testnet

                const txHash = transaction.hash; // Extract the transaction hash from the database record

                const referralAddress = transaction.referral_address;

                const [token] = await con.execute("SELECT * FROM `tokens` WHERE `chain_id`=? AND `symbol`=?", [transaction.chain_id, transaction.token_symbol]);
                const tokenAddress = token[0]?.contractAddress;

                const latestPrice = await latestPriceFeed(transaction.chain_id);
                const usdPrice = tokenAddress ? 1 : latestPrice;

                const blockchainTransaction = await web3.eth.getTransaction(txHash);
                if (!blockchainTransaction) {
                    console.log(`Transaction not found for hash: ${txHash}`);
                    return;
                }

                const receipt = await web3.eth.getTransactionReceipt(txHash);
                if (!receipt) {
                    console.log(`Transaction receipt not found for hash: ${txHash}`);
                    return;
                }

                const block = await web3.eth.getBlock(receipt.blockNumber);
                const Timestamp = formattedDateTime(Number(block.timestamp));

                if (receipt.status) {
                    const [presales] = await con.execute("SELECT id, price FROM presales WHERE starts_at <= ? AND (ends_at IS NULL OR ends_at >= ?) LIMIT 1; ", [Timestamp, Timestamp]);
                    if (presales.length == 0) return console.log("Data not found")
                    const presale = presales[0];
                    const involvesUserAddress = blockchainTransaction.to && blockchainTransaction.to.toLowerCase() === userAddress.toLowerCase();

                    if (involvesUserAddress) {
                        const value = web3.utils.fromWei(blockchainTransaction.value, "ether");
                        const from = blockchainTransaction.from;
                        const usdUserAmount = usdPrice * value;
                        const tokens = usdUserAmount / Number(presale.price);
                        const tokenAmountExact = tokens;
                        const referralAmount = referralAddress ? tokenAmountExact / 100 : 0;
                        await con.execute("UPDATE `purchases` SET `payment_status`='paid', `address`=?, `amount`=?, `purchased_amount`=?, `referral_rewards`=?, `presale_id`=? WHERE `hash`=?", [from, value, tokenAmountExact, referralAmount, presale.id, txHash]);
                    } else {
                        const transfers = receipt.logs.map(log => decodeTransferEvent(log, web3)).filter(event => event !== null);

                        if (transfers.length > 0) {
                            console.log("Token Transfer Details:");
                            const tokenContract = new web3.eth.Contract(tokenAbi, receipt.to);
                            const decimals = Number(await tokenContract.methods.decimals().call());
                            const rawUnit = rawUnits[decimals];
                            transfers.forEach(async transfer => {
                                const involveUserAddress = transfer.to && transfer.to.toLowerCase() === userAddress.toLowerCase();
                                if (involveUserAddress) {
                                    const value = web3.utils.fromWei(transfer.value, rawUnit);
                                    const from = transfer.from;
                                    const usdUserAmount = usdPrice * value;
                                    const tokens = usdUserAmount / Number(presale.price);
                                    const tokenAmountExact = tokens;
                                    const referralAmount = referralAddress ? tokenAmountExact / 100 : 0;
                                    await con.execute("UPDATE `purchases` SET `payment_status`='paid', `address`=?, `amount`=?, `purchased_amount`=?, `referral_rewards`=?, `presale_id`=? WHERE `hash`=?", [from, value, tokenAmountExact, referralAmount, presale.id, txHash]);
                                }
                            });
                        } else {
                            console.log("No ERC-20 token transfers found in this transaction.");
                        }
                    }

                    await updatePresale(presale.id);

                } else {
                    console.log(`Transaction failed for hash: ${txHash}`);
                }
            }));

        } else {
            console.log("No Pending Transactions");
        }

    } catch (error) {
        console.error("Error fetching transaction details:", error);
    }
}

module.exports = {
    getTransactionDetails
}


