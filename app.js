// Zynapse Application JavaScript
// This file contains shared utility functions between index.html and home.html

// Cloudinary upload function for general use
async function uploadToCloudinary(file, resourceType = 'auto') {
    const CLOUDINARY_CONFIG = {
        cloudName: 'dd3lcymrk',
        uploadPreset: 'h3eyhc2o',
        folder: 'zynapse'
    };
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
    formData.append('folder', CLOUDINARY_CONFIG.folder);
    
    if (resourceType !== 'auto') {
        formData.append('resource_type', resourceType);
    }
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.secure_url) {
            return {
                url: data.secure_url,
                size: data.bytes,
                format: data.format,
                publicId: data.public_id
            };
        } else {
            throw new Error(data.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw error;
    }
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Format timestamp to relative time
function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diff < 31536000000 ? undefined : 'numeric'
    });
}

// Format date for chat headers
function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'short', 
        day: 'numeric'
    });
}

// Generate chat ID from two user IDs
function generateChatId(userId1, userId2) {
    const sorted = [userId1, userId2].sort();
    return sorted.join('_');
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Show toast notification
function showToast(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Set icon based on type
    let icon = 'info-circle';
    switch(type) {
        case 'success': icon = 'check-circle'; break;
        case 'error': icon = 'exclamation-circle'; break;
        case 'warning': icon = 'exclamation-triangle'; break;
    }
    
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Validate email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validate phone number
function isValidPhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Validate password strength
function isStrongPassword(password) {
    return password.length >= 6;
}

// Check if user is logged in
function checkAuthStatus() {
    const userData = localStorage.getItem('zynapse_user');
    if (!userData) {
        return false;
    }
    
    try {
        const user = JSON.parse(userData);
        return user && user.uid && user.userId;
    } catch (e) {
        return false;
    }
}

// Get current user
function getCurrentUser() {
    const userData = localStorage.getItem('zynapse_user');
    if (!userData) return null;
    
    try {
        return JSON.parse(userData);
    } catch (e) {
        return null;
    }
}

// Update user data in localStorage
function updateUserData(updates) {
    const userData = getCurrentUser();
    if (!userData) return;
    
    const updatedUser = { ...userData, ...updates };
    localStorage.setItem('zynapse_user', JSON.stringify(updatedUser));
    return updatedUser;
}

// Play notification sound
function playNotificationSound() {
    const audio = document.getElementById('notificationSound') || new Audio('notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
}

// Copy text to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard', 'success'))
        .catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showToast('Copied to clipboard', 'success');
        });
}

// Get user location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    });
}

// Reverse geocode coordinates to address
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Format duration in seconds to MM:SS
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Sanitize HTML input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Generate random color for avatars
function generateAvatarColor(userId) {
    const colors = [
        '#FF3B30', '#FF9500', '#FFCC00', '#34C759',
        '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'
    ];
    
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Check if device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if device is iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Add safe area insets for iOS devices
function applySafeAreaInsets() {
    if (!isIOS()) return;
    
    const style = document.createElement('style');
    style.textContent = `
        .safe-area-top {
            padding-top: env(safe-area-inset-top);
            padding-top: constant(safe-area-inset-top);
        }
        .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
            padding-bottom: constant(safe-area-inset-bottom);
        }
    `;
    document.head.appendChild(style);
}

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
    // Apply iOS safe area insets
    applySafeAreaInsets();
    
    // Add meta tags for mobile
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        const meta = document.createElement('meta');
        meta.name = 'viewport';
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        document.head.appendChild(meta);
    }
    
    // Prevent zoom on input focus on iOS
    if (isIOS()) {
        document.addEventListener('focus', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                document.body.style.zoom = '1';
            }
        }, true);
        
        document.addEventListener('blur', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    document.body.style.zoom = '';
                }, 100);
            }
        }, true);
    }
    
    // Add touch event polyfill for iOS
    if ('ontouchstart' in window) {
        document.documentElement.style.cursor = 'pointer';
    }
});

// Error handling for Firebase
function handleFirebaseError(error) {
    console.error('Firebase error:', error);
    
    let message = 'An error occurred';
    switch (error.code) {
        case 'auth/user-not-found':
            message = 'User not found';
            break;
        case 'auth/wrong-password':
            message = 'Incorrect password';
            break;
        case 'auth/email-already-in-use':
            message = 'Email already in use';
            break;
        case 'auth/invalid-email':
            message = 'Invalid email address';
            break;
        case 'auth/weak-password':
            message = 'Password is too weak';
            break;
        case 'auth/network-request-failed':
            message = 'Network error. Please check your connection';
            break;
        case 'permission-denied':
            message = 'Permission denied';
            break;
        default:
            message = error.message || 'Unknown error';
    }
    
    showToast(message, 'error');
    return message;
}

// Rate limiting utility
function createRateLimiter(limit, interval) {
    const calls = [];
    
    return function() {
        const now = Date.now();
        calls.push(now);
        
        // Remove calls outside the interval
        while (calls.length > 0 && calls[0] < now - interval) {
            calls.shift();
        }
        
        return calls.length <= limit;
    };
}

// Message rate limiter (5 messages per second)
const canSendMessage = createRateLimiter(5, 1000);

// Image compression helper
function compressImage(file, maxWidth = 1024, quality = 0.8) {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    }));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        uploadToCloudinary,
        generateId,
        formatTime,
        formatDate,
        generateChatId,
        debounce,
        showToast,
        formatFileSize,
        isValidEmail,
        isValidPhone,
        isStrongPassword,
        checkAuthStatus,
        getCurrentUser,
        updateUserData,
        playNotificationSound,
        copyToClipboard,
        getUserLocation,
        reverseGeocode,
        calculateDistance,
        formatDuration,
        sanitizeInput,
        generateAvatarColor,
        getInitials,
        isMobileDevice,
        isIOS,
        applySafeAreaInsets,
        handleFirebaseError,
        createRateLimiter,
        canSendMessage,
        compressImage
    };
}
