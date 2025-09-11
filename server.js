// server.js
import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
app.use(cors()); // allow requests from your app; tighten in production if needed
app.use(express.json({ limit: "1mb" }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const PROXY_SECRET = process.env.PROXY_SECRET || ""; // optional secret check

// Basic rate limiter — adjust for your needs
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // limit each IP to 120 requests per windowMs
});
app.use(limiter);

// Simple health route
app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// Optional middleware to require a simple secret header (recommended)
function maybeRequireSecret(req, res, next) {
  if (!PROXY_SECRET) return next(); // no secret configured
  const found = req.headers["x-proxy-secret"] || req.headers["x-app-key"];
  if (!found || String(found) !== PROXY_SECRET) {
    return res.status(401).json({ error: "Missing or invalid proxy secret" });
  }
  return next();
}

// POST /chat - proxy to OpenAI chat completions
app.post("/chat", maybeRequireSecret, async (req, res) => {
  try {
    const payload = req.body;

    // If the client didn't include model/messages, optionally accept our shorter body.
    // We forward the body as-is to OpenAI, but ensure required fields exist.
    const body = {
      model: payload.model || "gpt-3.5-turbo",
      messages: payload.messages || [{ role: "user", content: String(payload.prompt || "") }],
      max_tokens: payload.max_tokens ?? payload.max_tokens ?? 800,
      temperature: payload.temperature ?? 0.2,
      ...payload.extra // allow passthrough
    };

    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 60_000,
      }
    );

    // pass through OpenAI response directly
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error("Error /chat:", err?.response?.data || err.message || err);
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { error: String(err?.message || err) };
    res.status(status).json(data);
  }
});

// POST /images - proxy to OpenAI images (or adapt to DALL·E / images API)
app.post("/images", maybeRequireSecret, async (req, res) => {
  try {
    const { prompt, size = "512x512", n = 1 } = req.body;
    const resp = await axios.post(
      "https://api.openai.com/v1/images/generations",
      { prompt, size, n },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 60_000,
      }
    );
    res.status(resp.status).json(resp.data);
  } catch (err) {
    console.error("Error /images:", err?.response?.data || err.message || err);
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { error: String(err?.message || err) };
    res.status(status).json(data);
  }
});

// Health and fallback
app.get("/", (req, res) => res.send("DMR Proxy is running. /health"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy server running at http://localhost:${PORT} (PORT=${PORT})`);
});
