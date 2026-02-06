const express = require("express");
const ImageKit = require("imagekit");

const app = express();

// Initialize ImageKit (private_0Bru5lLQ0ECJW/osZmXzOuNXemM=)
const imagekit = new ImageKit({
  publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
  privateKey: "private_0Bru5lLQ0ECJW/osZmXzOuNXemM=",
  urlEndpoint: "https://ik.imagekit.io/48l5ydkzy"
});

// This is the auth endpoint ImageKit calls
app.get("/auth", (req, res) => {
  const authParams = imagekit.getAuthenticationParameters();
  res.json(authParams);
});

// Start server
app.listen(3000, () => {
  console.log("Auth server running at http://localhost:3000/auth");
});

// Render sets port via environment variable
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Auth server running on port ${PORT}`);
});
