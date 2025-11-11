const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const profileRoutes = require('./routes/profile');
const budgetRoutes = require('./routes/budget');


dotenv.config();

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const User = require('./models/user');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// EJS & Layouts
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

// Make session available in EJS
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

app.use('/profile', profileRoutes);
app.use('/budget', budgetRoutes);

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
    let user = await User.findByEmail(profile.emails[0].value);
    if (!user) {
        user = await User.create(profile.displayName, profile.emails[0].value, 'oauth_dummy_password');
    }
    done(null, user);
}));

// Routes
app.use('/', authRoutes);
app.use('/expenses', expenseRoutes);

// Home
app.get('/', (req, res) => res.render('index'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
