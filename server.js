// server.js (Groq-backed, chat + MCQ)
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors()); // allow Flutter web / cross-origin requests

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

// ---------------------
// Helper: ensure messages array
// ---------------------
function ensureMessages(body) {
  if (body.messages && Array.isArray(body.messages)) return body.messages;
  if (body.prompt && typeof body.prompt === "string") {
    return [{ role: "user", content: body.prompt }];
  }
  if (body.text && typeof body.text === "string") {
    return [{ role: "user", content: body.text }];
  }
  return [];
}

// ---------------------
// Chat endpoint
// ---------------------
app.post("/chat", async (req, res) => {
  try {
    const messages = ensureMessages(req.body);
    if (messages.length === 0) {
      return res.status(400).json({ error: "No prompt/messages provided" });
    }

    const model = req.body.model || DEFAULT_MODEL;
    const payload = {
      model,
      messages,
      max_tokens: req.body.max_tokens || 800,
      temperature: req.body.temperature ?? 0.7,
    };

    const r = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Groq API failed:", r.status, text);
      return res.status(500).json({ error: "Groq API error", details: text });
    }

    const data = await r.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      "No response from AI";

    return res.json({ answer: reply });
  } catch (err) {
    console.error("Error /chat:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------
// MCQ generator endpoint
// ---------------------
app.post("/mcq", async (req, res) => {
  try {
    const topic = req.body.topic || req.body.prompt || "";
    const count = req.body.count || 5;
    if (!topic) return res.status(400).json({ error: "topic required" });

    const prompt = `
Generate ${count} multiple-choice questions about "${topic}".
Return as a JSON array. Each object must have:
"type":"MCQ","question":"...","options":["..."],"answer_index": 0
Return ONLY valid JSON.
`;

    const r = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error("Groq MCQ API failed:", r.status, text);
      return res.status(500).json({ error: "Groq API error", details: text });
    }

    const data = await r.json();
    const raw =
      data.choices?.[0]?.message?.content || data.choices?.[0]?.text || "";

    try {
      const parsed = JSON.parse(raw);
      return res.json(parsed);
    } catch {
      return res.json({ raw });
    }
  } catch (err) {
    console.error("Error /mcq:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------
// Health check
// ---------------------
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ---------------------
// Start server
// ---------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
