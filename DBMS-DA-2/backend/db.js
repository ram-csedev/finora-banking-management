const path = require('path');
const oracledb = require('oracledb');
const dotenv = require('dotenv');

// Load .env from backend directory or fallback to current working directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

async function getConnection() {
    return await oracledb.getConnection({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING
    });
}

module.exports = { getConnection };