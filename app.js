// Common utility functions for Zynapse

// Format timestamp to readable time
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // If less than 24 hours, show time
    if (diff < 86400000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If less than 7 days, show day name
    if (diff < 604800000) {
        return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Otherwise show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// Format message timestamp
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Generate chat ID for two users
function generateChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

// Check if user is online
function isUserOnline(status) {
    if (!status) return false;
    
    // Consider online if last seen less than 2 minutes ago
    const twoMinutesAgo = Date.now() - 120000;
    return status.online || (status.lastSeen && status.lastSeen > twoMinutesAgo);
}

// Debounce function
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

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Validate Zynapse ID format
function isValidZynapseId(id) {
    return /^ZYN-\d{4}$/.test(id);
}

// Sanitize user input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

// Get user initials for avatar
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Create data URL for initials avatar
function createInitialsAvatar(name, size = 100) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background color based on name hash
    const colors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5856d6'];
    const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    
    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(0, 0, size, size);
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size / 2}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const initials = getInitials(name);
    ctx.fillText(initials, size / 2, size / 2);
    
    return canvas.toDataURL();
}

// Check if file is image
function isImageFile(file) {
    return file && file.type.startsWith('image/');
}

// Check if file is video
function isVideoFile(file) {
    return file && file.type.startsWith('video/');
}

// Get file size in readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Create a unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Scroll to bottom of element
function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

// Check if element is at bottom
function isAtBottom(element, threshold = 100) {
    if (!element) return true;
    return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
}

// Play notification sound
function playNotificationSound() {
    const audio = new Audio('notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
}

// Show typing indicator
function showTypingIndicator(container, userId) {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = `typing-${userId}`;
    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    container.appendChild(typingDiv);
    scrollToBottom(container);
}

// Hide typing indicator
function hideTypingIndicator(container, userId) {
    const typingElement = document.getElementById(`typing-${userId}`);
    if (typingElement) {
        typingElement.remove();
    }
}

// Create message element
function createMessageElement(message, isSent) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble ${isSent ? 'message-sent' : 'message-received'}`;
    
    let content = '';
    
    if (message.type === 'text') {
        content = `<div class="message-text">${message.text}</div>`;
    } else if (message.type === 'image') {
        content = `
            <div class="message-media">
                <img src="${getOptimizedImageURL(message.content, 400, 400)}" 
                     alt="Image" 
                     style="max-width: 100%; border-radius: 12px; cursor: pointer;"
                     onclick="openMediaViewer('${message.content}')">
            </div>
        `;
    } else if (message.type === 'video') {
        content = `
            <div class="message-media">
                <video src="${message.content}" 
                       controls 
                       style="max-width: 100%; border-radius: 12px;"
                       onclick="openMediaViewer('${message.content}', 'video')">
                </video>
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        ${content}
        <div class="message-time">
            ${formatMessageTime(message.timestamp)}
            ${isSent ? '<i class="fas fa-check message-check"></i>' : ''}
        </div>
    `;
    
    return messageDiv;
}

// Open media viewer (to be implemented)
function openMediaViewer(url, type = 'image') {
    // Create modal for media viewing
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
    `;
    
    modal.innerHTML = `
        <div style="position: relative; max-width: 90vw; max-height: 90vh;">
            ${type === 'image' ? 
                `<img src="${url}" style="max-width: 100%; max-height: 90vh;">` : 
                `<video src="${url}" controls autoplay style="max-width: 100%; max-height: 90vh;"></video>`}
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="position: absolute; top: -40px; right: 0; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on ESC
    const closeModal = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', closeModal);
        }
    };
    document.addEventListener('keydown', closeModal);
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatTime,
        formatMessageTime,
        generateChatId,
        isUserOnline,
        debounce,
        throttle,
        isValidZynapseId,
        sanitizeInput,
        getInitials,
        createInitialsAvatar,
        isImageFile,
        isVideoFile,
        formatFileSize,
        generateId,
        scrollToBottom,
        isAtBottom,
        playNotificationSound,
        showTypingIndicator,
        hideTypingIndicator,
        createMessageElement,
        openMediaViewer
    };
}
