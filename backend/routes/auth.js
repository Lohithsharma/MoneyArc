const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const bcrypt = require('bcrypt');

// Register
router.get('/register', (req, res) => res.render('register'));
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    await User.create(username, email, hashed);
    res.redirect('/login');
});

// Login
router.get('/login', (req, res) => res.render('login'));
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.redirect('/login');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.redirect('/login');
    req.session.userId = user.id;
    res.redirect('expenses/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Google OAuth
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.userId = req.user.id;
        res.redirect('/expenses/dashboard');
    }
);

module.exports = router;
