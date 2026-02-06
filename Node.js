// Node.js/Express server
const express = require('express');
const ImageKit = require('imagekit');
const app = express();

const imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    privateKey: "private_0Bru5lLQ0ECJW/osZmXzOuNXemM=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy"
});

app.get('/auth', (req, res) => {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.send(authenticationParameters);
});

app.listen(3000, () => {
    console.log('ImageKit auth server running on port 3000');
});
