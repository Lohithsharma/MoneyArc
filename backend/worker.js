const dotenv = require("dotenv");
const path = require("path");
const { Pool } = require("pg");
const cron = require("node-cron");
const { generateAndSaveRecommendation } = require("./ai/advisor");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

pool
  .connect()
  .then(() => console.log("✅ Worker connected to PostgreSQL"))
  .catch((err) => console.error("❌ Worker DB connection failed:", err.message));

async function runForAllUsers() {
  try {
    const users = (await pool.query("SELECT * FROM users")).rows;
    console.log(`🧠 Running AI recommendations for ${users.length} users...`);
    for (const u of users) {
      try {
        console.log(`⚡ Generating recommendation for: ${u.email}`);
        await generateAndSaveRecommendation(u);
        console.log(`✅ Saved AI recommendation for ${u.email}`);
        await new Promise((r) => setTimeout(r, 2000)); // delay for Render stability
      } catch (err) {
        console.error(`❌ Failed for ${u.email}:`, err.message);
      }
    }
    console.log("✅ Hourly AI recommendation cycle completed successfully");
  } catch (err) {
    console.error("❌ Worker job error:", err.message);
  }
}

// 🕒 Schedule hourly job (in IST)
cron.schedule(
  "0 * * * *",
  async () => {
    console.log("⏰ Hourly AI generation started at:", new Date().toISOString());
    await runForAllUsers();
  },
  { timezone: "Asia/Kolkata" }
);
