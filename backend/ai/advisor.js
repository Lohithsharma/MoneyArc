import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// ✅ Fix .env path (since your .env is outside backend)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// ✅ Connect PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// ✅ Function to call OpenRouter API (Free LLaMA model)
async function askAI(prompt) {
  try {
    console.log("⚡ Generating financial recommendation via OpenRouter LLaMA...");
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct", // 🦙 Free model on OpenRouter
        messages: [
          {
            role: "system",
            content:
              "You are a financial advisory AI. Always respond strictly in JSON format with clear, structured data.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 700,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://yourwebsite.com",
          "X-Title": "Expense Tracker AI",
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices?.[0]?.message?.content || "";
    console.log("✅ AI Response received successfully from OpenRouter");
    return content;
  } catch (err) {
    console.error("❌ OpenRouter AI failed:", err.response?.data || err.message);
    throw new Error("AI request failed. Check model name or API key.");
  }
}

// ✅ Fetch market data (from AlphaVantage)
async function fetchMarketData(tickers = ["NSE:TCS", "NSE:RELIANCE"]) {
  const key = process.env.MARKET_API_KEY;
  const results = {};
  for (const t of tickers) {
    try {
      const r = await axios.get("https://www.alphavantage.co/query", {
        params: {
          function: "TIME_SERIES_DAILY_ADJUSTED",
          symbol: t,
          apikey: key,
        },
        timeout: 15000,
      });
      results[t] = r.data;
    } catch (e) {
      results[t] = { error: e.message };
    }
  }
  return results;
}

// ✅ Fetch latest business news (from NewsAPI)
async function fetchNews() {
  try {
    const r = await axios.get("https://newsapi.org/v2/top-headlines", {
      params: { category: "business", pageSize: 5, apiKey: process.env.NEWS_API_KEY },
      timeout: 10000,
    });
    return r.data.articles || [];
  } catch (e) {
    return [];
  }
}

// ✅ Build AI prompt
function buildPrompt({ user, marketData, news }) {
  const userSummary = `User profile:
- id: ${user.id}
- income: ${user.monthly_income || "unknown"}
- monthly_budget: ${user.monthly_budget || "unknown"}
- total_expenses: ${user.total_expenses || "unknown"}
- risk_profile: ${user.risk_profile || "moderate"}
- investable_cash: ${user.investable_cash || "unknown"}\n\n`;

  const marketSummary = `Market snapshot:
${Object.keys(marketData)
  .slice(0, 5)
  .map((t) => {
    const d = marketData[t];
    if (d && d["Time Series (Daily)"]) {
      const keys = Object.keys(d["Time Series (Daily)"]);
      const last = keys[0];
      const close = d["Time Series (Daily)"][last]["4. close"];
      return `- ${t}: ${close} on ${last}`;
    } else {
      return `- ${t}: unavailable`;
    }
  })
  .join("\n")}\n\n`;

  const newsSummary = `Recent business news:
${news.map((n) => "- " + n.title).join("\n")}\n\n`;

  const instructions = `
You are an AI financial advisor. Based on this user's profile, market data, and news:
1. Suggest up to 3 recommendations:
   - where to INVEST (sector/ticker/ETF)
   - where to REDUCE spending
2. Provide rationale and confidence score (0–100)
3. Add disclaimer: "AI-generated suggestions, not financial advice."

Return strictly in JSON:
{
  "date": "...",
  "recommendations": [
    {"action": "invest"|"reduce", "target": "...", "amount_pct": ..., "rationale": "..."}
  ],
  "confidence": number,
  "notes": "..."
}`;

  return userSummary + marketSummary + newsSummary + instructions;
}

// ✅ Improved JSON-safe parser
function safeParseJSON(content) {
  try {
    return JSON.parse(content);
  } catch {
    const jstart = content.indexOf("{");
    const jend = content.lastIndexOf("}");
    if (jstart !== -1 && jend !== -1) {
      try {
        return JSON.parse(content.slice(jstart, jend + 1));
      } catch {
        return { text: content };
      }
    }
    return { text: content };
  }
}

// ✅ Main Function
export async function generateAndSaveRecommendation(user) {
  try {
    const watchlist =
      user.watchlist?.length > 0
        ? user.watchlist.slice(0, 6)
        : ["RELIANCE.NS", "TCS.NS", "INFY.NS"];

    const [marketData, news] = await Promise.all([
      fetchMarketData(watchlist),
      fetchNews(),
    ]);

    const prompt = buildPrompt({ user, marketData, news });
    const content = await askAI(prompt);
    const parsed = safeParseJSON(content);

    const summary = parsed.recommendations
      ? parsed.recommendations
          .map((r) => `${r.action}: ${r.target} (${r.amount_pct || ""}%)`)
          .join(" | ")
      : (parsed.text || content).slice(0, 300);

    const insertSql = `
      INSERT INTO recommendations (user_id, rec_date, summary, details, source, confidence, delivered)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING id;
    `;
    const values = [
      user.id,
      new Date().toISOString().slice(0, 10),
      summary,
      parsed,
      { marketData, news },
      parsed.confidence || null,
    ];

    const res = await pool.query(insertSql, values);
    console.log(`✅ Saved AI recommendation for ${user.email || user.id}`);
    return { id: res.rows[0].id, parsed };
  } catch (err) {
    console.error("❌ Recommendation generation error:", err.message);
    throw err;
  }
}
