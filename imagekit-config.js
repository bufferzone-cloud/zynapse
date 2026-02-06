// ImageKit SDK initialization
const imagekit = new ImageKit({
    publicKey: "public_lP5Vb+5SXLUjuoliJDp19GPOU6s=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://imagekit-auth.onrender.com/auth"
});

// Function to upload media to ImageKit
async function uploadMedia(file, fileName, tags = []) {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: fileName || `zynapse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            folder: "/zynapse",
            tags: tags,
            useUniqueFileName: true
        }, function(err, result) {
            if (err) {
                console.error("ImageKit Upload Error:", err);
                reject(err);
            } else {
                console.log("ImageKit Upload Success:", result);
                resolve(result);
            }
        });
    });
}

// Function to get optimized URL
function getOptimizedImageUrl(url, options = {}) {
    const { width, height, quality = 80 } = options;
    const transformations = [];
    
    if (width || height) {
        transformations.push({
            width: width || undefined,
            height: height || undefined,
            quality: quality
        });
    }
    
    return imagekit.url({
        src: url,
        transformation: transformations
    });
}

// Export functions
export { imagekit, uploadMedia, getOptimizedImageUrl };
