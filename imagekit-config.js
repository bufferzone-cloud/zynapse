// ImageKit Configuration using custom auth server
const imageKitConfig = {
    authEndpoint: "https://imagekit-auth-server-uafl.onrender.com/auth",
    publicKey: "public_lP5Vb+5SXLUjuoliJDp19GPOU6s=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy"
};

// ImageKit Helper Functions
const imageKitHelpers = {
    // Initialize ImageKit with authentication
    init: async function() {
        try {
            // Get authentication parameters from our server
            const response = await fetch(imageKitConfig.authEndpoint);
            const authParams = await response.json();
            
            // Create ImageKit instance with auth parameters
            this.imagekit = new ImageKit({
                publicKey: imageKitConfig.publicKey,
                urlEndpoint: imageConfig.urlEndpoint,
                ...authParams
            });
            
            console.log("ImageKit initialized successfully");
            return this.imagekit;
        } catch (error) {
            console.error("ImageKit initialization error:", error);
            throw error;
        }
    },

    // Generate image URL with transformations
    generateImageUrl: function(url, transformations = []) {
        if (!url) return '';
        
        try {
            // Use ImageKit URL generator if available
            if (this.imagekit) {
                return this.imagekit.url({
                    src: url,
                    transformation: transformations
                });
            }
            
            // Fallback to manual URL construction
            let imageUrl = url;
            if (transformations.length > 0) {
                const tr = transformations.map(t => 
                    Object.entries(t).map(([k, v]) => `${k}-${v}`).join(',')
                ).join('/');
                imageUrl = `${url}?tr=${tr}`;
            }
            return imageUrl;
        } catch (error) {
            console.error("Error generating image URL:", error);
            return url;
        }
    },

    // Upload file using custom server
    uploadFile: async function(file, fileName, folder = '/zynapse') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', fileName);
            formData.append('folder', folder);
            
            const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const result = await response.json();
            console.log("File upload success:", result);
            
            // Ensure we have the URL in the expected format
            const fileUrl = result.url || result.secure_url || result.filePath;
            if (!fileUrl) {
                throw new Error('No URL returned from server');
            }
            
            return {
                url: fileUrl,
                fileId: result.fileId || fileName,
                thumbnailUrl: result.thumbnailUrl || fileUrl,
                name: fileName,
                size: file.size,
                type: file.type
            };
        } catch (error) {
            console.error("ImageKit upload error:", error);
            throw error;
        }
    },

    // Upload profile picture
    uploadProfilePicture: async function(file, userId) {
        try {
            const fileName = `profile_${userId}_${Date.now()}.${file.name.split('.').pop()}`;
            const result = await this.uploadFile(file, fileName, '/zynapse/profiles');
            
            // Generate thumbnail URL
            const thumbnailUrl = this.generateImageUrl(result.url, [{
                height: "150",
                width: "150",
                crop: "force"
            }]);
            
            return {
                originalUrl: result.url,
                thumbnailUrl: thumbnailUrl || result.url,
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
                optimizedUrl = this.generateImageUrl(result.url, [{
                    height: "800",
                    width: "800",
                    crop: "at_max"
                }]);
            } else if (type === 'video') {
                // For videos, we just return the original URL
                // ImageKit provides video transformation support
                optimizedUrl = result.url;
            }
            
            return {
                originalUrl: result.url,
                optimizedUrl: optimizedUrl || result.url,
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
            const thumbnailUrl = this.generateImageUrl(result.url, [{
                height: "400",
                width: "400",
                crop: "at_max"
            }]);
            
            return {
                originalUrl: result.url,
                thumbnailUrl: thumbnailUrl || result.url,
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
            const thumbnailUrl = this.generateImageUrl(result.url, [{
                height: "100",
                width: "100",
                crop: "force"
            }]);
            
            return {
                originalUrl: result.url,
                thumbnailUrl: thumbnailUrl || result.url,
                fileId: result.fileId
            };
        } catch (error) {
            console.error("Error uploading group image:", error);
            throw error;
        }
    },

    // Delete file from ImageKit (requires server-side implementation)
    deleteFile: async function(fileId) {
        try {
            const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ fileId: fileId })
            });
            
            if (!response.ok) {
                throw new Error('Delete failed');
            }
            
            const result = await response.json();
            console.log("Delete success for file:", fileId);
            return { success: true, ...result };
        } catch (error) {
            console.error("Error deleting file:", error);
            return { success: false, error: error.message };
        }
    },

    // Generate optimized image URL
    getOptimizedImage: function(url, width = 400, height = 400) {
        return this.generateImageUrl(url, [{
            height: height.toString(),
            width: width.toString(),
            crop: "at_max"
        }]);
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

// Initialize ImageKit when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await imageKitHelpers.init();
        console.log("ImageKit helpers initialized");
    } catch (error) {
        console.error("Failed to initialize ImageKit:", error);
    }
});

// Export for use in other files
window.imageKitHelpers = imageKitHelpers;
window.imageKitConfig = imageKitConfig;
