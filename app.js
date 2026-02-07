// ==================== ZYNAPSE CORE APPLICATION LOGIC ====================

// Firebase Configuration
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBrVtSAOckpj8_fRA3-0kI7vAzOpXDUqxs",
    authDomain: "zynapse-68181.firebaseapp.com",
    databaseURL: "https://zynapse-68181-default-rtdb.firebaseio.com",
    projectId: "zynapse-68181",
    storageBucket: "zynapse-68181.firebasestorage.app",
    messagingSenderId: "841353050519",
    appId: "1:841353050519:web:3b16d95d8f4cd3b9506cd2",
    measurementId: "G-4764XLL6WS"
};

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse'
};

// Application State
let appState = {
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    notifications: [],
    unreadCount: 0
};

// Initialize Firebase
function initializeFirebase() {
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    return {
        auth: firebase.auth(),
        database: firebase.database(),
        storage: firebase.storage()
    };
}

// Cloudinary Upload Function
async function uploadToCloudinary(file, resourceType = 'auto') {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        if (resourceType !== 'auto') {
            formData.append('resource_type', resourceType);
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`);
        
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                updateUploadProgress(percentComplete);
            }
        };
        
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                resolve({
                    url: response.secure_url,
                    publicId: response.public_id,
                    format: response.format,
                    bytes: response.bytes
                });
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };
        
        xhr.onerror = () => {
            reject(new Error('Network error during upload'));
        };
        
        xhr.send(formData);
    });
}

// User Authentication Functions
async function createFirebaseUser(email, password, userId) {
    try {
        const { auth } = initializeFirebase();
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update user profile with userId
        await user.updateProfile({
            displayName: userId
        });
        
        return user;
    } catch (error) {
        console.error('Error creating Firebase user:', error);
        throw error;
    }
}

async function authenticateFirebaseUser(email, password) {
    try {
        const { auth } = initializeFirebase();
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

async function saveUserToFirebase(userData, profileUrl) {
    try {
        const { database } = initializeFirebase();
        const userId = userData.userId;
        
        const userRecord = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            userId: userId,
            profileImage: profileUrl || '',
            status: userData.status || 'Hey there! I am using Zynapse',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            isOnline: true,
            contacts: [],
            chats: [],
            zynes: [],
            groups: []
        };
        
        // Save to Firebase
        await database.ref(`users/${userId}`).set(userRecord);
        
        // Also save to localStorage for demo
        localStorage.setItem(`user_${userId}`, JSON.stringify(userRecord));
        
        return userId;
    } catch (error) {
        console.error('Error saving user to Firebase:', error);
        throw error;
    }
}

// Database Operations
async function saveMessageToFirebase(message) {
    try {
        const { database } = initializeFirebase();
        
        const messageRef = database.ref('messages').push();
        const messageId = messageRef.key;
        
        const messageData = {
            ...message,
            id: messageId,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await messageRef.set(messageData);
        
        // Update chat reference
        const chatId = generateChatId(message.senderId, message.receiverId);
        await database.ref(`chats/${chatId}/lastMessage`).set(messageData);
        await database.ref(`chats/${chatId}/updatedAt`).set(firebase.database.ServerValue.TIMESTAMP);
        
        return messageId;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
}

async function getChatMessages(userId1, userId2) {
    try {
        const { database } = initializeFirebase();
        const chatId = generateChatId(userId1, userId2);
        
        const snapshot = await database.ref(`messages`)
            .orderByChild('chatId')
            .equalTo(chatId)
            .once('value');
        
        return snapshot.val() || {};
    } catch (error) {
        console.error('Error getting messages:', error);
        throw error;
    }
}

async function sendChatRequest(senderId, receiverId) {
    try {
        const { database } = initializeFirebase();
        
        const requestId = database.ref('chatRequests').push().key;
        const requestData = {
            id: requestId,
            fromUserId: senderId,
            toUserId: receiverId,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`chatRequests/${requestId}`).set(requestData);
        
        // Also add to receiver's notifications
        await database.ref(`notifications/${receiverId}/${requestId}`).set({
            type: 'chat_request',
            fromUserId: senderId,
            message: 'sent you a chat request',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        });
        
        return requestId;
    } catch (error) {
        console.error('Error sending chat request:', error);
        throw error;
    }
}

async function updateChatRequest(requestId, status) {
    try {
        const { database } = initializeFirebase();
        
        await database.ref(`chatRequests/${requestId}/status`).set(status);
        
        if (status === 'accepted') {
            // Get request data
            const snapshot = await database.ref(`chatRequests/${requestId}`).once('value');
            const request = snapshot.val();
            
            // Add users to each other's contacts
            await database.ref(`users/${request.fromUserId}/contacts/${request.toUserId}`).set(true);
            await database.ref(`users/${request.toUserId}/contacts/${request.fromUserId}`).set(true);
            
            // Create chat between users
            const chatId = generateChatId(request.fromUserId, request.toUserId);
            await database.ref(`chats/${chatId}`).set({
                participants: [request.fromUserId, request.toUserId],
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                type: 'private'
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error updating chat request:', error);
        throw error;
    }
}

// Zyne Functions
async function createZyne(userId, content, media) {
    try {
        const { database } = initializeFirebase();
        
        const zyneId = database.ref('zynes').push().key;
        const zyneData = {
            id: zyneId,
            userId: userId,
            content: content,
            media: media || null,
            likes: 0,
            comments: 0,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        await database.ref(`zynes/${zyneId}`).set(zyneData);
        
        // Add to user's zynes
        await database.ref(`users/${userId}/zynes/${zyneId}`).set(true);
        
        // Add to followers' feeds
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const user = userSnapshot.val();
        
        if (user.followers) {
            Object.keys(user.followers).forEach(followerId => {
                database.ref(`feeds/${followerId}/${zyneId}`).set(zyneData);
            });
        }
        
        return zyneId;
    } catch (error) {
        console.error('Error creating zyne:', error);
        throw error;
    }
}

async function likeZyne(zyneId, userId) {
    try {
        const { database } = initializeFirebase();
        
        await database.ref(`zynes/${zyneId}/likes/${userId}`).set(true);
        await database.ref(`zynes/${zyneId}/likeCount`).transaction(current => (current || 0) + 1);
        
        return true;
    } catch (error) {
        console.error('Error liking zyne:', error);
        throw error;
    }
}

async function addCommentToZyne(zyneId, userId, comment) {
    try {
        const { database } = initializeFirebase();
        
        const commentId = database.ref(`zynes/${zyneId}/comments`).push().key;
        const commentData = {
            id: commentId,
            userId: userId,
            comment: comment,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`zynes/${zyneId}/comments/${commentId}`).set(commentData);
        await database.ref(`zynes/${zyneId}/commentCount`).transaction(current => (current || 0) + 1);
        
        return commentId;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
}

// Group Functions
async function createGroup(creatorId, name, members, photoUrl) {
    try {
        const { database } = initializeFirebase();
        
        const groupId = database.ref('groups').push().key;
        const groupData = {
            id: groupId,
            name: name,
            creatorId: creatorId,
            photoUrl: photoUrl || '',
            members: members.reduce((acc, memberId) => {
                acc[memberId] = true;
                return acc;
            }, {}),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastActivity: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref(`groups/${groupId}`).set(groupData);
        
        // Add group to each member's groups
        members.forEach(memberId => {
            database.ref(`users/${memberId}/groups/${groupId}`).set(true);
        });
        
        // Create group chat
        await database.ref(`chats/${groupId}`).set({
            participants: members,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            type: 'group',
            groupId: groupId
        });
        
        return groupId;
    } catch (error) {
        console.error('Error creating group:', error);
        throw error;
    }
}

async function sendGroupMessage(groupId, senderId, message) {
    try {
        const { database } = initializeFirebase();
        
        const messageId = database.ref('messages').push().key;
        const messageData = {
            id: messageId,
            groupId: groupId,
            senderId: senderId,
            content: message.content,
            type: message.type,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'sent'
        };
        
        await database.ref(`messages/${messageId}`).set(messageData);
        
        // Update group last message
        await database.ref(`groups/${groupId}/lastMessage`).set(messageData);
        await database.ref(`groups/${groupId}/lastActivity`).set(firebase.database.ServerValue.TIMESTAMP);
        
        return messageId;
    } catch (error) {
        console.error('Error sending group message:', error);
        throw error;
    }
}

// Notification Functions
function playNotificationSound() {
    try {
        const audio = new Audio('notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Notification sound play failed:', e));
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

function showNotification(title, body, icon) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body, icon });
            }
        });
    }
}

function createToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Utility Functions
function generateChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
}

function generateUserId() {
    return 'ZYN-' + Math.floor(1000 + Math.random() * 9000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const re = /^[\+]?[1-9][\d]{0,15}$/;
    return re.test(phone);
}

function validatePassword(password) {
    return password.length >= 6;
}

// Real-time Listeners
function setupRealtimeListeners(userId) {
    const { database } = initializeFirebase();
    
    // Listen for new messages
    database.ref('messages')
        .orderByChild('receiverId')
        .equalTo(userId)
        .on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message.status === 'sent') {
                handleNewMessage(message);
            }
        });
    
    // Listen for chat requests
    database.ref('chatRequests')
        .orderByChild('toUserId')
        .equalTo(userId)
        .on('child_added', (snapshot) => {
            const request = snapshot.val();
            if (request.status === 'pending') {
                handleNewChatRequest(request);
            }
        });
    
    // Listen for zyne updates from contacts
    database.ref('feeds').child(userId).on('child_added', (snapshot) => {
        const zyne = snapshot.val();
        handleNewZyne(zyne);
    });
    
    // Listen for user status changes
    database.ref('users').on('child_changed', (snapshot) => {
        const user = snapshot.val();
        if (appState.currentUser?.contacts?.includes(user.userId)) {
            updateContactStatus(user.userId, user.isOnline, user.lastSeen);
        }
    });
}

function handleNewMessage(message) {
    playNotificationSound();
    createToast(`New message from ${message.senderName || 'Unknown'}`, 'info');
    
    // Update message status to delivered
    const { database } = initializeFirebase();
    database.ref(`messages/${message.id}/status`).set('delivered');
    
    // Update UI if chat is open
    if (window.app && window.app.currentChat && 
        (window.app.currentChat.userId === message.senderId || 
         window.app.currentChat.groupId === message.groupId)) {
        window.app.addMessageToUI(message);
    }
}

function handleNewChatRequest(request) {
    playNotificationSound();
    createToast(`New chat request from ${request.fromUserName || 'Unknown'}`, 'info');
    
    // Update UI
    if (window.app) {
        window.app.requests.unshift(request);
        window.app.renderRequests();
        window.app.updateBadge('requestBadge', window.app.requests.length);
    }
}

function handleNewZyne(zyne) {
    playNotificationSound();
    createToast(`New Zyne from ${zyne.userName || 'Unknown'}`, 'info');
    
    // Update UI
    if (window.app) {
        window.app.zynes.unshift(zyne);
        window.app.renderZynes();
    }
}

function updateContactStatus(userId, isOnline, lastSeen) {
    if (window.app) {
        const contact = window.app.contacts.find(c => c.userId === userId);
        if (contact) {
            contact.isOnline = isOnline;
            contact.lastSeen = lastSeen;
            window.app.renderContacts();
        }
    }
}

// File Upload Progress
function updateUploadProgress(percent) {
    const progressBar = document.getElementById('uploadProgress') || createProgressBar();
    const progressFill = progressBar.querySelector('.progress-fill');
    
    progressFill.style.width = `${percent}%`;
    
    if (percent >= 100) {
        setTimeout(() => {
            progressBar.remove();
        }, 500);
    }
}

function createProgressBar() {
    const progressBar = document.createElement('div');
    progressBar.id = 'uploadProgress';
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = '<div class="progress-fill"></div>';
    progressBar.style.position = 'fixed';
    progressBar.style.top = '0';
    progressBar.style.left = '0';
    progressBar.style.width = '100%';
    progressBar.style.zIndex = '99999';
    document.body.appendChild(progressBar);
    return progressBar;
}

// Location Services
async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        return {
            address: data.display_name,
            street: data.address.road || data.address.street,
            area: data.address.suburb || data.address.neighbourhood,
            city: data.address.city || data.address.town || data.address.village,
            country: data.address.country,
            postcode: data.address.postcode
        };
    } catch (error) {
        console.error('Reverse geocode error:', error);
        return {
            address: 'Unknown location',
            street: 'Unknown street',
            area: '',
            city: 'Unknown city',
            country: 'Unknown country'
        };
    }
}

// Voice Recording
function startVoiceRecording() {
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                const mediaRecorder = new MediaRecorder(stream);
                const audioChunks = [];
                
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    resolve(audioBlob);
                    
                    // Stop all tracks
                    stream.getTracks().forEach(track => track.stop());
                };
                
                mediaRecorder.start();
                
                // Return stop function
                resolve({
                    stop: () => mediaRecorder.stop(),
                    pause: () => mediaRecorder.pause(),
                    resume: () => mediaRecorder.resume()
                });
            })
            .catch(reject);
    });
}

// Export functions for use in HTML files
window.Zynapse = {
    // Firebase functions
    initializeFirebase,
    createFirebaseUser,
    authenticateFirebaseUser,
    saveUserToFirebase,
    
    // Message functions
    saveMessageToFirebase,
    getChatMessages,
    
    // Chat request functions
    sendChatRequest,
    updateChatRequest,
    
    // Zyne functions
    createZyne,
    likeZyne,
    addCommentToZyne,
    
    // Group functions
    createGroup,
    sendGroupMessage,
    
    // Utility functions
    generateUserId,
    formatDate,
    formatFileSize,
    escapeHtml,
    validateEmail,
    validatePhone,
    validatePassword,
    
    // Upload functions
    uploadToCloudinary,
    
    // Location functions
    getCurrentLocation,
    reverseGeocode,
    
    // Voice recording
    startVoiceRecording,
    
    // Notification functions
    playNotificationSound,
    showNotification,
    createToast,
    
    // Real-time functions
    setupRealtimeListeners
};

// Initialize when loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Zynapse Core initialized');
    
    // Check for service worker support
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
    
    // Handle offline/online status
    window.addEventListener('online', () => {
        createToast('You are back online', 'success');
    });
    
    window.addEventListener('offline', () => {
        createToast('You are offline', 'warning');
    });
});

// Error handling
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    createToast('An error occurred. Please try again.', 'error');
});

// Unhandled promise rejection
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    createToast('Something went wrong. Please refresh the page.', 'error');
});
