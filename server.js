// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Chat endpoint (proxy)
app.post("/chat", async (req, res) => {
  try {
    // Send request to Groq API
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, // Groq key from Render env
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile", // or "llama-3.1-8b-instant" for faster
        messages: req.body.messages, // forward user messages
      }),
    });

    const data = await response.json();

    // Return the same structure OpenAI gives
    res.json(data);
  } catch (err) {
    console.error("❌ Error in /chat:", err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));

