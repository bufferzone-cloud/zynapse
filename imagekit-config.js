// ImageKit initialization for Zynapse
const imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://imagekit-auth.onrender.com/auth"
});

// Profile picture upload
async function uploadProfilePicture(file, userId) {
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: `profile_${userId}_${Date.now()}.jpg`,
            folder: "/zynapse/profiles",
            tags: ["profile", userId],
            useUniqueFileName: true
        }, function(error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

// Media upload for chat
async function uploadMedia(file, type, userId, chatId) {
    const folder = type === 'image' ? '/zynapse/chat/images' : '/zynapse/chat/videos';
    
    return new Promise((resolve, reject) => {
        imagekit.upload({
            file: file,
            fileName: `${type}_${userId}_${chatId}_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
            folder: folder,
            tags: [type, userId, chatId],
            useUniqueFileName: true
        }, function(error, result) {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

// Generate optimized URL
function getOptimizedImageURL(url, width = 400, height = 400) {
    return imagekit.url({
        src: url,
        transformation: [{
            height: height.toString(),
            width: width.toString(),
            crop: "fit"
        }]
    });
}
