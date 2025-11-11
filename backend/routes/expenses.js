const express = require('express');
const router = express.Router();
const Expense = require('../models/expense');

// Middleware to check login
function isAuthenticated(req, res, next){
    if(req.session.userId) return next();
    res.redirect('/login');
}

// Dashboard
router.get('/dashboard', isAuthenticated, async (req,res) => {
    const expenses = await Expense.getByUser(req.session.userId);
    const summary = await Expense.getSummary(req.session.userId);

    // Dynamic AI recommendations
    const recommendations = [];

    // Calculate totals per category
    const categoryTotals = {};
    expenses.forEach(e => {
        if(!categoryTotals[e.category]) categoryTotals[e.category] = 0;
        categoryTotals[e.category] += parseFloat(e.amount);
    });

    // Generate recommendations based on spending
    for(const cat in categoryTotals){
        const total = categoryTotals[cat];
        if(total > 1000){
            recommendations.push(`You spent $${total} on ${cat}. Consider reducing it next month.`);
        } else if(total < 100){
            recommendations.push(`Your spending on ${cat} is low. Consider investing or using it wisely.`);
        }
    }

    // General finance tips
    recommendations.push("Set a monthly budget and track your expenses.");
    recommendations.push("Try to save at least 20% of your monthly income.");

    res.render('dashboard', { expenses, summary, recommendations });
});

// Add expense
router.post('/add', isAuthenticated, async (req,res) => {
    const { amount, category, date, description } = req.body;
    await Expense.add(req.session.userId, amount, category, date, description);
    res.redirect('/expenses/dashboard');
});

module.exports = router;
