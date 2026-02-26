// =========================
// index.js — Render Node.js AI Server
// =========================
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors()); // allow cross-origin requests

// =========================
// POST /ask-ai
// =========================
app.post("/ask-ai", async (req, res) => {
  try {
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    console.log("Received prompt:", prompt);

    // Make sure GEMINI_API_KEY is set
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "Server misconfigured: API key missing" });
    }

    // Call Google Gemini / Generative Language API
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: { text: prompt }
        })
      }
    );

    console.log("Gemini response status:", response.status);

    const data = await response.json();
    console.log("Gemini raw response:", data);

    res.json(data); // send raw response to frontend / Postman

  } catch (err) {
    console.error("Error in /ask-ai:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// Start server
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
