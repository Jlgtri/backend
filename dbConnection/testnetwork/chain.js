const con = require("../index");

// Data to insert
const chains = [
    { id: 97, name: 'Binance Smart testnet' }
];

async function insertChains() {
    try {
        const insertQuery = 'INSERT IGNORE INTO chains (id, name) VALUES ?';
        const values = chains.map(chain => [chain.id, chain.name]);
        await con.execute(insertQuery, [values]);
        console.log('Data inserted successfully');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
}

