const mysql = require('mysql2');

// Function to establish a MySQL connection
function connectToMySQL() {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      // Attempt to reconnect after a delay
      setTimeout(connectToMySQL, 2000); // Retry connection after 2 seconds
    } else {
      console.log('Connected to MySQL');
    }
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
