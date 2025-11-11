const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,       // must be string
    port: parseInt(process.env.DB_PORT, 10)  // force number
});

pool.on('connect', () => console.log('Connected to PostgreSQL DB'));

module.exports = pool;
