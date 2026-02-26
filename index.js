// =========================
// index.js — Render Node.js AI Server (Gemini API)
// =========================
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors()); // allow cross-origin requests from your frontend

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "Server misconfigured: API key missing" });
    }

    // Use the latest Gemini Pro model endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    console.log("Gemini response status:", response.status);

    const data = await response.json();
    console.log("Gemini raw response:", JSON.stringify(data, null, 2));

    // Forward the response exactly as received from Gemini
    res.json(data);

  } catch (err) {
    console.error("Error in /ask-ai:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// =========================
// Root endpoint (optional, for health check)
// =========================
app.get("/", (req, res) => {
  res.send("Zynapse AI Server is running.");
});

// =========================
// Start server
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
