// ImageKit Configuration
const imagekit = new ImageKit({
    publicKey: "public_lP5Vb+5SXLUjuoliJDp19GPOU6s=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://imagekit-auth.onrender.com/auth"
});

// ImageKit Helper Functions
const imageKitHelpers = {
    // Initialize ImageKit
    init: function() {
        console.log("ImageKit initialized successfully");
        return imagekit;
    },

    // Generate image URL with transformations
    generateImageUrl: function(path, transformations = []) {
        return imagekit.url({
            path: path,
            transformation: transformations
        });
    },

    // Upload file to ImageKit
    uploadFile: function(file, fileName, folder = '/zynapse') {
        return new Promise((resolve, reject) => {
            imagekit.upload({
                file: file,
                fileName: fileName,
                folder: folder,
                tags: ['zynapse']
            }, function(err, result) {
                if (err) {
                    console.error("ImageKit upload error:", err);
                    reject(err);
                } else {
                    console.log("ImageKit upload success:", result);
                    resolve(result);
                }
            });
        });
    },

    // Upload profile picture
    uploadProfilePicture: async function(file, userId) {
        try {
            const fileName = `profile_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
            const result = await this.uploadFile(file, fileName, '/zynapse/profiles');
            
            // Generate thumbnail URL
            const thumbnailUrl = imagekit.url({
                src: result.url,
                transformation: [{
                    height: "150",
                    width: "150",
                    crop: "force"
                }]
            });
            
            return {
                originalUrl: result.url,
                thumbnailUrl: thumbnailUrl,
                fileId: result.fileId
            };
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            throw error;
        }
    },

    // Upload chat media (image/video)
    uploadChatMedia: async function(file, chatId, type = 'image') {
        try {
            const extension = file.name.split('.').pop();
            const fileName = `${type}_${chatId}_${Date.now()}.${extension}`;
            const folder = type === 'image' ? '/zynapse/chat/images' : '/zynapse/chat/videos';
            
            const result = await this.uploadFile(file, fileName, folder);
            
            // Generate optimized versions
            let optimizedUrl = result.url;
            if (type === 'image') {
                optimizedUrl = imagekit.url({
                    src: result.url,
                    transformation: [{
                        height: "800",
                        width: "800",
                        crop: "at_max"
                    }]
                });
            } else if (type === 'video') {
                optimizedUrl = imagekit.url({
                    src: result.url,
                    transformation: [{
                        height: "480",
                        width: "854"
                    }]
                });
            }
            
            return {
                originalUrl: result.url,
                optimizedUrl: optimizedUrl,
                thumbnailUrl: type === 'video' ? result.thumbnailUrl : optimizedUrl,
                fileId: result.fileId,
                type: type
            };
        } catch (error) {
            console.error("Error uploading chat media:", error);
            throw error;
        }
    },

    // Upload Zyne media
    uploadZyneMedia: async function(file, userId, type = 'image') {
        try {
            const extension = file.name.split('.').pop();
            const fileName = `zyne_${userId}_${Date.now()}.${extension}`;
            const folder = '/zynapse/zynes';
            
            const result = await this.uploadFile(file, fileName, folder);
            
            // Generate thumbnail for Zyne
            const thumbnailUrl = imagekit.url({
                src: result.url,
                transformation: [{
                    height: "400",
                    width: "400",
                    crop: "at_max"
                }]
            });
            
            return {
                originalUrl: result.url,
                thumbnailUrl: thumbnailUrl,
                fileId: result.fileId,
                type: type
            };
        } catch (error) {
            console.error("Error uploading Zyne media:", error);
            throw error;
        }
    },

    // Upload group image
    uploadGroupImage: async function(file, groupId) {
        try {
            const fileName = `group_${groupId}_${Date.now()}.${file.name.split('.').pop()}`;
            const result = await this.uploadFile(file, fileName, '/zynapse/groups');
            
            // Generate thumbnail
            const thumbnailUrl = imagekit.url({
                src: result.url,
                transformation: [{
                    height: "100",
                    width: "100",
                    crop: "force"
                }]
            });
            
            return {
                originalUrl: result.url,
                thumbnailUrl: thumbnailUrl,
                fileId: result.fileId
            };
        } catch (error) {
            console.error("Error uploading group image:", error);
            throw error;
        }
    },

    // Delete file from ImageKit
    deleteFile: function(fileId) {
        return new Promise((resolve, reject) => {
            // Note: This requires server-side implementation
            // as ImageKit JavaScript SDK doesn't support delete
            console.log("Delete requested for file:", fileId);
            resolve({ success: true });
        });
    },

    // Generate optimized image URL
    getOptimizedImage: function(url, width = 400, height = 400) {
        return imagekit.url({
            src: url,
            transformation: [{
                height: height.toString(),
                width: width.toString(),
                crop: "at_max"
            }]
        });
    },

    // Check if file is image
    isImageFile: function(file) {
        return file.type.startsWith('image/');
    },

    // Check if file is video
    isVideoFile: function(file) {
        return file.type.startsWith('video/');
    },

    // Validate file size (max 10MB for images, 50MB for videos)
    validateFileSize: function(file, maxSizeMB = 10) {
        const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
        if (file.size > maxSize) {
            throw new Error(`File size must be less than ${maxSizeMB}MB`);
        }
        return true;
    },

    // Get file extension
    getFileExtension: function(filename) {
        return filename.split('.').pop().toLowerCase();
    },

    // Create image preview
    createImagePreview: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve(e.target.result);
            };
            reader.onerror = function(error) {
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    },

    // Create video preview
    createVideoPreview: function(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = function() {
                URL.revokeObjectURL(video.src);
                
                // Create thumbnail
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                resolve({
                    thumbnail: canvas.toDataURL('image/jpeg'),
                    duration: video.duration,
                    width: video.videoWidth,
                    height: video.videoHeight
                });
            };
            
            video.onerror = function() {
                reject(new Error('Failed to load video'));
            };
            
            video.src = URL.createObjectURL(file);
        });
    }
};

// Initialize ImageKit
document.addEventListener('DOMContentLoaded', function() {
    try {
        imageKitHelpers.init();
        console.log("ImageKit helpers initialized");
    } catch (error) {
        console.error("Failed to initialize ImageKit:", error);
    }
});

// Export for use in other files
window.imageKit = imagekit;
window.imageKitHelpers = imageKitHelpers;
