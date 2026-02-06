// ImageKit SDK initialization
import ImageKit from "https://cdn.jsdelivr.net/npm/imagekit-javascript@1.5.4/dist/imagekit.min.js";

let imagekit;

// Initialize ImageKit with authentication endpoint
function initImageKit() {
    imagekit = new ImageKit({
        publicKey: "public_lP5Vb+5SXLUjuoliJDp19GPOU6s=",
        urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
        authenticationEndpoint: "https://imagekit-auth-server-uafl.onrender.com/auth"
    });
    return imagekit;
}

// Upload file to ImageKit
async function uploadToImageKit(file, fileName, tags = []) {
    if (!imagekit) initImageKit();
    
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: fileName,
            tags: tags,
            folder: "/zynapse/profiles"
        }, function(err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

// Generate URL with transformations
function getImageKitUrl(src, transformations = []) {
    if (!imagekit) initImageKit();
    return imagekit.url({
        src: src,
        transformation: transformations
    });
}

export { initImageKit, uploadToImageKit, getImageKitUrl };
