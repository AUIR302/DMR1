import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Utility function to call Groq
async function callGroq(prompt, systemMsg = "You are a helpful AI assistant.") {
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",  // stable Groq model
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: prompt }
        ],
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error("Groq API Error:", err.message);
    throw err;
  }
}

// Generic AI chat
app.post("/ask", async (req, res) => {
  try {
    const { prompt } = req.body;
    const reply = await callGroq(prompt);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SendMessage endpoint
app.post("/sendmessage", async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await callGroq(message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Voice doubt AI (special system message)
app.post("/voicedoubt", async (req, res) => {
  try {
    const { question } = req.body;
    const reply = await callGroq(question, "You are a teacher helping students clear doubts with simple answers.");
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Competitive prep AI
app.post("/competitive", async (req, res) => {
  try {
    const { topic } = req.body;
    const reply = await callGroq(topic, "You are a competitive exam coach giving detailed step-by-step solutions.");
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quiz generator
app.post("/quiz", async (req, res) => {
  try {
    const { subject } = req.body;
    const prompt = `Generate 5 multiple choice questions with 4 options each and correct answers for ${subject}. Format as JSON.`;
    const reply = await callGroq(prompt, "You are a quiz generator AI.");
    res.json({ quiz: reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check (for Render)
app.get("/", (req, res) => {
  res.send("✅ DMR Proxy Server is running with Groq AI!");
});

// Render requires PORT
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
