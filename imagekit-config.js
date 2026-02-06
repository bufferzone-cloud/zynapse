// ImageKit SDK initialization
var imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://imagekit-auth.onrender.com/auth"
});

// Upload function
function uploadFile(file, fileName, onProgress) {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: fileName,
            tags: ['zynapse', 'profile'],
            useUniqueFileName: true
        }, function(err, result) {
            if (err) {
                console.error("Upload error:", err);
                reject(err);
            } else {
                console.log("Upload success:", result);
                resolve(result);
            }
        });
    });
}

// Generate thumbnail URL
function generateThumbnailUrl(url, width = 300, height = 300) {
    return imagekit.url({
        src: url,
        transformation: [{
            height: height.toString(),
            width: width.toString(),
            crop: 'fit'
        }]
    });
}

// Generate optimized image URL
function generateOptimizedUrl(url, width, height, quality = 80) {
    return imagekit.url({
        src: url,
        transformation: [{
            height: height.toString(),
            width: width.toString(),
            quality: quality.toString()
        }]
    });
}
