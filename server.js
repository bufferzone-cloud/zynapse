const express = require("express");
const cors = require("cors");
const ImageKit = require("imagekit");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
  privateKey: "private_0Bru5lLQ0ECJW/osZmXzOuNXemM=",
  urlEndpoint: "https://ik.imagekit.io/48l5ydkzy"
});

// ImageKit authentication endpoint
app.get("/auth", (req, res) => {
  try {
    const authParams = imagekit.getAuthenticationParameters();
    res.json(authParams);
  } catch (error) {
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Zynapse server running" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Zynapse auth server running on port ${PORT}`);
});
