const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL pool

// Middleware to check login
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

// Show budget page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM budgets WHERE user_id=$1 ORDER BY id DESC',
            [req.session.userId]
        );
        const budget = result.rows; // array of budgets
        res.render('budget', { budget });
    } catch (err) {
        console.error(err);
        res.send('Error fetching budget data');
    }
});

// Save new budget
router.post('/save', isAuthenticated, async (req, res) => {
    const { category, amount } = req.body;
    try {
        await pool.query(
            'INSERT INTO budgets (user_id, category, amount) VALUES ($1, $2, $3)',
            [req.session.userId, category, amount]
        );
        res.redirect('/budget'); // redirect back to budget page
    } catch (err) {
        console.error(err);
        res.send('Error saving budget');
    }
});

module.exports = router;
