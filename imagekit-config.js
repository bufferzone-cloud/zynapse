// ImageKit Configuration
const imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://imagekit-auth.onrender.com/auth"
});

// Upload function with error handling
async function uploadToImageKit(file, fileName, tags = []) {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: fileName,
            tags: tags,
            folder: "/zynapse/profiles"
        }, function(err, result) {
            if (err) {
                console.error("ImageKit Upload Error:", err);
                reject(err);
            } else {
                console.log("Upload successful:", result);
                resolve(result);
            }
        });
    });
}

// Generate URL with transformations
function generateImageKitURL(path, transformation = []) {
    return imagekit.url({
        path: path,
        transformation: transformation
    });
}
