const con = require("./index");

// Data to insert
const presales = [
    {
        id: 1,
        name: 'Presale Round 1',
        starts_at: new Date('2024-08-10'),
        ends_at: null,
        price: 0.016,
        minimum_buy: 4000,
        maximum_buy: 1000000,
        total_supply: 35000000,
        vesting_initial_unlock: 0.10,
        vesting_starts_after: 3,
        vesting_period: 2 * 30 * 86400, // Ensure this is in MySQL INTERVAL format
        vesting_period_count: 3,
    },
    {
        id: 2,
        name: 'Presale Round 2',
        starts_at: new Date('2024-08-20'),
        ends_at: null,
        price: 0.024,
        minimum_buy: 2000,
        maximum_buy: 600000,
        total_supply: 35000000,
        vesting_initial_unlock: 0.175,
        vesting_starts_after: 2,
        vesting_period: 1 * 30 * 86400, // Ensure this is in MySQL INTERVAL format
        vesting_period_count: 4,
    },
    {
        id: 3,
        name: 'Presale Round 3',
        starts_at: new Date('2024-08-30'),
        ends_at: null,
        price: 0.032,
        minimum_buy: 1000,
        maximum_buy: 400000,
        total_supply: 40000000,
        vesting_initial_unlock: 0.25,
        vesting_starts_after: 0,
        vesting_period: 1 * 30 * 86400, // Ensure this is in MySQL INTERVAL format
        vesting_period_count: 3,
    },
];

async function insertpresales() {
    try {
        const presaleInsertQuery = 'INSERT IGNORE INTO presales (id, name, starts_at, ends_at, price, minimum_buy, maximum_buy, total_supply, vesting_initial_unlock, vesting_starts_after, vesting_period, vesting_period_count) VALUES ?';
        const presaleValues = presales.map(p => [
            p.id, p.name, p.starts_at, p.ends_at, p.price, p.minimum_buy, p.maximum_buy, p.total_supply,
            p.vesting_initial_unlock, p.vesting_starts_after, p.vesting_period, p.vesting_period_count
        ]);
        await con.query(presaleInsertQuery, [presaleValues]);

        console.log('Presales data inserted successfully');
    } catch (error) {
        console.error('Error inserting data:', error);
    }
}

// insertpresales();
