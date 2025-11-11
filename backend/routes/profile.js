const express = require('express');
const router = express.Router();
const User = require('../models/user');

// Middleware
function isAuthenticated(req, res, next){
    if(req.session.userId) return next();
    res.redirect('/login');
}

// Profile page
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId); // <-- use findById
        if (!user) return res.send('User not found');
        res.render('profile', { user });
    } catch (err) {
        console.error(err);
        res.send('Error fetching user');
    }
});

module.exports = router;
