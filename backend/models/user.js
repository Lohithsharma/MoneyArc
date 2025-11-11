const { Pool } = require('pg');
require('dotenv').config(); // load .env variables

const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD), // force string
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10)    // force number
});

pool.on('connect', () => console.log('Connected to PostgreSQL DB'));

module.exports = {
    async findByEmail(email) {
        const res = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
        return res.rows[0];
    },

    async findById(id) {
        const res = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
        return res.rows[0];
    },

    async create(username, email, password) {
        const res = await pool.query(
            'INSERT INTO users (username,email,password) VALUES($1,$2,$3) RETURNING *',
            [username, email, password]
        );
        return res.rows[0];
    }
};
