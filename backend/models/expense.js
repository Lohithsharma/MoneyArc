const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

module.exports = {
    async getByUser(userId) {
        const res = await pool.query('SELECT * FROM expenses WHERE user_id=$1 ORDER BY date DESC', [userId]);
        return res.rows;
    },

    async add(userId, amount, category, date, description) {
        const res = await pool.query(
            'INSERT INTO expenses (user_id, amount, category, date, description) VALUES($1,$2,$3,$4,$5) RETURNING *',
            [userId, amount, category, date, description]
        );
        return res.rows[0];
    },

    async getSummary(userId) {
        const res = await pool.query(
            'SELECT category, SUM(amount) as total FROM expenses WHERE user_id=$1 GROUP BY category',
            [userId]
        );
        return res.rows;
    }
};
