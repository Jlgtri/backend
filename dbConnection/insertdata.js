const con = require("./index");

// Data to insert
const chains = [
    { id: 1, name: 'Ethereum' },
    { id: 10, name: 'OP Mainnet' },
    { id: 56, name: 'Binance Smart Chain' },
    { id: 137, name: 'Polygon Mainnet' },
    { id: 8453, name: 'Base' },
    { id: 42161, name: 'Arbitrum One' },
    { id: 59144, name: 'Linea' },
];

async function insertChains() {
    try {
        const insertQuery = 'INSERT IGNORE INTO chains (id, name) VALUES ?';
        const values = chains.map(chain => [chain.id, chain.name]);
        await con.query(insertQuery, [values]);
        console.log('Data inserted successfully');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
}

// insertChains();
