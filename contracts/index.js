const { Web3 } = require("web3");
const priceFeedAbi = require('./priceFeedAbi.json');
const { getRpcUrl } = require("./rpc");

// Function to get the standardized chain ID
const getStandardChainId = (chainId) => {
    if (chainId === 11155111 || chainId === 1) return 1;
    if (chainId === 10 || chainId === 10) return 10;
    if (chainId === 97 || chainId === 56) return 56;
    if (chainId === 137 || chainId === 137) return 137;
    if (chainId === 8453 || chainId === 8453) return 8453;
    if (chainId === 421614 || chainId === 42161) return 42161;
    if (chainId === 59144 || chainId === 59144) return 59144;
    return chainId; // Return the input chainId if it doesn't need mapping
};

// Function to get the contract address based on chain ID
const getContractAddress = (chainId) => {
    switch (chainId) {
        case 1:
            return "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
        case 10:
            return "0xb7B9A39CC63f856b90B364911CC324dC46aC1770";
        case 56:
            return "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";
        case 137:
            return "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0";
        case 8453:
            return "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70";
        case 42161:
            return "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612";
        case 59144:
            return "0x3c6Cd9Cc7c7a4c2Cf5a82734CD249D7D593354dA";
        default:
            return null;
    }
};

// Function to create a Web3 instance
const web3Instance = async (chainId) => {
    try {
        chainId = getStandardChainId(chainId);
        const rpcUrl = getRpcUrl(chainId);

        if (rpcUrl) {
            return new Web3(rpcUrl);
        } else {
            throw new Error("Chain ID not supported");
        }
    } catch (error) {
        console.error("Error creating Web3 instance:", error);
        throw error;
    }
};

// Function to fetch the latest price feed from the contract
const latestPriceFeed = async (chainId) => {
    try {
        chainId = Number(getStandardChainId(chainId));

        const address = getContractAddress(chainId);

        if (!address) {
            throw new Error(`No contract address found for chain ID: ${chainId}`);
        }

        const web3 = await web3Instance(chainId);
        const contract = new web3.eth.Contract(priceFeedAbi, address);
        const latestPrice = Number(await contract.methods.latestAnswer().call()) / 10 ** 8;
        return latestPrice;
    } catch (error) {
        console.error("Error fetching latest price feed:", error);
        throw error;
    }
};

module.exports = {
    latestPriceFeed,
    web3Instance,
};
