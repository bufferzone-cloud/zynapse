const express = require("express");
const ImageKit = require("imagekit");
const cors = require("cors");

const app = express();

// Enable CORS
app.use(cors());

// Initialize ImageKit with your private key
const imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    privateKey: "private_0Bru5lLQ0ECJW/osZmXzOuNXemM=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy"
});

// This is the auth endpoint ImageKit calls
app.get("/auth", (req, res) => {
    try {
        const authParams = imagekit.getAuthenticationParameters();
        res.json(authParams);
    } catch (error) {
        console.error("Auth error:", error);
        res.status(500).json({ error: "Authentication failed" });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`ImageKit Auth server running on port ${PORT}`);
    console.log(`Auth endpoint: http://localhost:${PORT}/auth`);
});

module.exports = app;
