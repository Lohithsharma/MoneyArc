// backend/testGemini.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Say 'Gemini is working successfully!'");
    console.log("✅ Gemini Response:\n", result.response.text());
  } catch (err) {
    console.error("❌ Gemini test failed:", err.message);
  }
}

testGemini();
