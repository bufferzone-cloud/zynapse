// Note: Private key should NEVER be exposed in client-side code
// Authentication endpoint needs to be implemented on your server
var imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://your-server.com/imagekit-auth"
});

// Function to generate image URL with transformations
function generateImageURL(path, width = 400, height = 300) {
    return imagekit.url({
        path: path,
        transformation: [{
            "height": height,
            "width": width
        }]
    });
}

// Upload function
async function uploadToImageKit(file, fileName) {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: fileName,
            tags: ['zynapse-profile']
        }, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}
