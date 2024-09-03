const con = require("./index");

// Data to insert
const tokens = [
    { id: 1, chain_id: 1, symbol: 'ETH', name: 'ETH (Ethereum)' },
    { id: 2, chain_id: 10, symbol: 'ETH', name: 'ETH (OP Mainnet)' },
    { id: 3, chain_id: 56, symbol: 'BNB', name: 'BNB (Binance Smart Chain)' },
    { id: 4, chain_id: 137, symbol: 'MATIC', name: 'MATIC (Polygon Mainnet)' },
    { id: 5, chain_id: 8453, symbol: 'ETH', name: 'ETH (Base)' },
    { id: 6, chain_id: 42161, symbol: 'ETH', name: 'ETH (Arbitrum One)' },
    { id: 7, chain_id: 59144, symbol: 'ETH', name: 'ETH (Linea)' },
    { id: 8, chain_id: 1, symbol: 'USDC', name: 'USDC (Ethereum)' },
    { id: 9, chain_id: 1, symbol: 'USDT', name: 'USDT (Ethereum)' },
];

async function insertTokens() {
    try {
        const insertQuery = 'INSERT INTO tokens (id, chain_id, symbol, name) VALUES ?';

        // Prepare the data for batch insert
        const values = tokens.map(token => [token.id, token.chain_id, token.symbol, token.name]);

        // Execute the query
        await con.query(insertQuery, [values]);

        console.log('Tokens inserted successfully');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
}

// insertTokens();
