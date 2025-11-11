const express = require('express');
const router = express.Router();
const pool = require('../db'); // PostgreSQL connection

// Middleware to check if user is logged in
function isAuthenticated(req, res, next) {
    if (req.session.userId) return next();
    res.redirect('/login');
}

// GET /budget - Render the budget page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM budgets WHERE user_id = $1 ORDER BY id DESC',
            [req.session.userId]
        );
        res.render('budget', { budget: result.rows });
    } catch (err) {
        console.error('Error fetching budgets:', err);
        res.send('Error fetching budgets');
    }
});

// POST /budget/save - Save a new budget entry
router.post('/save', isAuthenticated, async (req, res) => {
    const { category, amount } = req.body;

    if (!category || !amount) {
        return res.send('Category and amount are required');
    }

    try {
        await pool.query(
            'INSERT INTO budgets (user_id, category, amount) VALUES ($1, $2, $3)',
            [req.session.userId, category, amount]
        );
        res.redirect('/budget'); // reload page after adding
    } catch (err) {
        console.error('Error saving budget:', err);
        res.send('Error saving budget');
    }
});

module.exports = router;
