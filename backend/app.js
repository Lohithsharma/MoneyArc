const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cron = require("node-cron");
const { Pool } = require("pg");
const { generateAndSaveRecommendation } = require("./ai/advisor");
const User = require("./models/user");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ✅ Database Connection
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

pool
  .connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ Database connection failed:", err.message));

const app = express();

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.use(expressLayouts);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("layout", "layout");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// ✅ Make session and user available to all EJS templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.user = req.user;
  next();
});

app.use(passport.initialize());
app.use(passport.session());

// ✅ Passport Setup
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// ✅ Google OAuth + AI Recommendation on New User
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findByEmail(profile.emails[0].value);
        const isNewUser = !user;

        if (!user) {
          user = await User.create(
            profile.displayName,
            profile.emails[0].value,
            "oauth_dummy_password"
          );
          console.log(`🧍 New user created: ${user.email}`);
        }

        // Generate AI recommendation for new users
        if (isNewUser) {
          console.log(`🧠 Generating first AI recommendation for ${user.email}...`);
          try {
            await generateAndSaveRecommendation(user);
            console.log(`✅ First AI recommendation saved for ${user.email}`);
          } catch (err) {
            console.error(`❌ AI generation failed:`, err.message);
          }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ✅ Routes
const profileRoutes = require("./routes/profile");
const budgetRoutes = require("./routes/budget");
const authRoutes = require("./routes/auth");
const expenseRoutes = require("./routes/expenses");

app.use("/", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/profile", profileRoutes);
app.use("/budget", budgetRoutes);

app.get("/", (req, res) => res.render("index"));

// ✅ AI Recommendations Page
app.get("/profile/recommendations", async (req, res) => {
  try {
    if (!req.user) return res.redirect("/login");

    const userId = req.user.id;
    const recQuery = await pool.query(
      "SELECT * FROM recommendations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    const rec = recQuery.rows[0];
    if (!rec) {
      return res.render("recommendations", {
        rec: null,
        parsed: null,
        message: "No AI recommendations yet. Please check back later.",
      });
    }

    // ✅ Safely parse stored JSON
    let parsed;
    try {
      parsed = typeof rec.details === "object" ? rec.details : JSON.parse(rec.details || "{}");
    } catch {
      parsed = {};
    }

    res.render("recommendations", { rec, parsed, message: null });
  } catch (err) {
    console.error("Error fetching recommendations:", err);
    res.status(500).send("Internal server error");
  }
});

// ✅ Hourly Cron Job for Auto AI Generation
async function runForAllUsers() {
  try {
    const users = (await pool.query("SELECT * FROM users")).rows;
    console.log(`🧠 Running AI recommendations for ${users.length} users...`);
    for (const u of users) {
      await generateAndSaveRecommendation(u);
    }
  } catch (err) {
    console.error("Error during cron job:", err.message);
  }
}

cron.schedule("0 * * * *", () => {
  console.log("⏰ Hourly AI generation started...");
  runForAllUsers();
});

// ✅ Manual Test AI Route
app.get("/test-ai", async (req, res) => {
  try {
    const user = (await pool.query("SELECT * FROM users LIMIT 1")).rows[0];
    if (!user) return res.send("❌ No users found.");
    const result = await generateAndSaveRecommendation(user);
    res.send(`<pre>${JSON.stringify(result.parsed, null, 2)}</pre>`);
  } catch (err) {
    res.status(500).send("❌ Error: " + err.message);
  }
});

// ✅ Server Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
