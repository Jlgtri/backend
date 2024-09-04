const mysql = require('mysql2');

// Function to establish a MySQL connection
function connectToMySQL() {
  const connection = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
    idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

  // Handle MySQL connection errors
  connection.on('error', (err) => {
    console.error('MySQL error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      // Connection to MySQL server is lost, attempt to reconnect
      connectToMySQL();
    } else {
      throw err;
    }
  });

  return connection;
}

// Start MySQL connection
const con = connectToMySQL().promise();

// const chains = [
//     { id: 97, name: 'Binance Smart Chain testnet' }
// ];

// async function insertChains() {
//     try {
//         const insertQuery = 'INSERT IGNORE INTO chains (id, name) VALUES ?';
//         const values = chains.map(chain => [chain.id, chain.name]);
//         await con.query(insertQuery, [values]);
//         console.log('Data inserted successfully');
//     } catch (error) {
//         console.error('Error inserting data:', error);
//     }
// }

module.exports = con;
