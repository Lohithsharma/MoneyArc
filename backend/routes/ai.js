// routes/ai.js (or inside your main server where routes live)
import express from "express";
import { generateAndSaveRecommendation } from "../ai/advisor.js";
import pool from "../db/pool.js"; // your PG pool

const router = express.Router();

router.get("/ai/recommendations/run/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const userRes = await pool.query("SELECT * FROM users WHERE id=$1", [userId]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).send("User not found");
    const result = await generateAndSaveRecommendation(user);
    res.json({ ok: true, id: result.id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating recommendation");
  }
});

export default router;
