const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../frontend/.env.local') });
// const config = {
//   user: process.env.REACT_APP_SQL_USERNAME,
//   password: process.env.REACT_APP_SQL_PASSWORD,
//   server: process.env.REACT_APP_SQL_SERVER,
//   port: 8433,
//   database: process.env.REACT_APP_SQL_DATABASE,
//   driver: 'msnodesqlv8',
//   options: {
//     trustedConnection: true,
//     enableArithAbort: true,
//     trustServerCertificate: true, 
//     charset: 'UTF-8',
//     encrypt: false,
//   }
// };

// module.exports = config;
const config = {
  user: process.env.REACT_APP_SQL_USERNAME,
  password: process.env.REACT_APP_SQL_PASSWORD,
  server: process.env.REACT_APP_SQL_SERVER,
  database: process.env.REACT_APP_SQL_DATABASE,
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true,
    enableArithAbort: true,
    trustServerCertificate: true, 
    charset: 'UTF-8',
    encrypt: false,
  }
};

module.exports = config;