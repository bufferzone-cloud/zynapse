// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyBrVtSAOckpj8_fRA3-0kI7vAzOpXDUqxs",
    authDomain: "zynapse-68181.firebaseapp.com",
    databaseURL: "https://zynapse-68181-default-rtdb.firebaseio.com",
    projectId: "zynapse-68181",
    storageBucket: "zynapse-68181.firebasestorage.app",
    messagingSenderId: "841353050519",
    appId: "1:841353050519:web:3b16d95d8f4cd3b9506cd2",
    measurementId: "G-4764XLL6WS"
};

// ===== CLOUDINARY ACCOUNT DETAILS =====
const CLOUDINARY_ACCOUNT = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    apiSecret: 'RHDQG1YP6jqvn4UADq3nJWHIeHQ',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse',
    environmentVariable: 'CLOUDINARY_URL=cloudinary://489857926297197:RHDQG1YP6jqvn4UADq3nJWHIeHQ@dd3lcymrk',
    accountType: 'cloudinary'
};

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let currentChat = null;
let currentGroup = null;
let currentZyne = null;
let contacts = new Map();
let chatRequests = new Map();
let groups = new Map();
let zynes = new Map();
let chats = new Map();
let typingUsers = new Map();
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingTime = 0;
let audioStream = null;

// ===== FIREBASE INITIALIZATION =====
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const auth = firebase.auth();
const database = firebase.database();

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <div class="toast-content">
            <div class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
    
    // Play notification sound for non-info toasts
    if (type !== 'info') {
        playNotificationSound();
    }
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toastContainer';
    document.body.appendChild(container);
    return container;
}

function playNotificationSound() {
    try {
        const audio = new Audio('notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log("Audio play failed:", e));
    } catch (error) {
        console.log("Notification sound error:", error);
    }
}

function generateUserID() {
    const numbers = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${numbers}`;
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const diffMinutes = Math.floor(diff / 60000);
    const diffHours = Math.floor(diff / 3600000);
    const diffDays = Math.floor(diff / 86400000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

function formatMessageTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else if (today.getFullYear() === date.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function isValidUserID(userID) {
    return /^ZYN-\d{4}$/.test(userID);
}

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

// ===== CLOUDINARY UPLOAD =====
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        if (!file || file.size > 50 * 1024 * 1024) {
            reject(new Error('File size must be less than 50MB'));
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_ACCOUNT.uploadPreset);
        formData.append('folder', CLOUDINARY_ACCOUNT.folder);
        
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_ACCOUNT.cloudName}/upload`;
        
        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                resolve({
                    url: data.secure_url,
                    publicId: data.public_id,
                    format: data.format,
                    type: data.resource_type
                });
            } else {
                reject(new Error('Upload failed'));
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

// ===== AUTHENTICATION FUNCTIONS =====
async function registerUser(name, phone, email, password, profileImage) {
    try {
        showToast('Creating your account...', 'info');
        
        // Create Firebase auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate unique user ID
        const userID = generateUserID();
        
        // Upload profile image if exists
        let profileUrl = '';
        if (profileImage) {
            const uploadResult = await uploadToCloudinary(profileImage);
            profileUrl = uploadResult.url;
        }
        
        // Create user data object
        const userData = {
            userId: userID,
            name: name,
            phone: phone,
            email: email,
            profileUrl: profileUrl,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            status: 'online',
            statusMessage: '',
            bio: '',
            contacts: {},
            chatRequests: {},
            groups: {},
            zynes: {},
            blockedUsers: {},
            settings: {
                notifications: true,
                sound: true,
                theme: 'light'
            }
        };
        
        // Save user data to database
        await database.ref(`users/${userID}`).set(userData);
        
        // Save email to userID mapping
        await database.ref(`emailToUserId/${email.replace(/\./g, '_')}`).set(userID);
        
        // Save phone to userID mapping
        await database.ref(`phoneToUserId/${phone.replace(/[^0-9]/g, '')}`).set(userID);
        
        showToast('Account created successfully!', 'success');
        return { user, userID };
        
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        showToast('Signing in...', 'info');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Get user ID from email mapping
        const emailKey = email.replace(/\./g, '_');
        const snapshot = await database.ref(`emailToUserId/${emailKey}`).once('value');
        const userID = snapshot.val();
        
        if (!userID) {
            throw new Error('User data not found');
        }
        
        // Update last seen
        await database.ref(`users/${userID}/lastSeen`).set(Date.now());
        await database.ref(`users/${userID}/status`).set('online');
        
        showToast('Welcome back!', 'success');
        return { user, userID };
        
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function logoutUser() {
    try {
        if (currentUser) {
            await database.ref(`users/${currentUser.userId}/status`).set('offline');
            await database.ref(`users/${currentUser.userId}/lastSeen`).set(Date.now());
        }
        
        await auth.signOut();
        currentUser = null;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// ===== USER MANAGEMENT FUNCTIONS =====
async function getUserData(userID) {
    try {
        const snapshot = await database.ref(`users/${userID}`).once('value');
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

async function searchUser(userID) {
    if (!isValidUserID(userID)) {
        return { error: 'Invalid User ID format. Use ZYN-XXXX' };
    }
    
    if (userID === currentUser.userId) {
        return { error: 'This is your own User ID' };
    }
    
    const userData = await getUserData(userID);
    if (!userData) {
        return { error: 'User not found' };
    }
    
    return { success: true, user: userData };
}

async function updateUserProfile(updates) {
    try {
        await database.ref(`users/${currentUser.userId}`).update(updates);
        showToast('Profile updated successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Failed to update profile', 'error');
        return false;
    }
}

// ===== CONTACT MANAGEMENT =====
async function sendContactRequest(toUserID) {
    try {
        const fromUserID = currentUser.userId;
        const requestId = `${fromUserID}_${toUserID}_${Date.now()}`;
        
        const requestData = {
            fromUserId: fromUserID,
            fromUserName: currentUser.name,
            fromUserProfile: currentUser.profileUrl,
            toUserId: toUserID,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        // Save request to recipient's requests
        await database.ref(`users/${toUserID}/chatRequests/${requestId}`).set(requestData);
        
        // Save request to sender's sent requests
        await database.ref(`users/${fromUserID}/sentRequests/${requestId}`).set({
            ...requestData,
            status: 'sent'
        });
        
        showToast('Contact request sent', 'success');
        return true;
    } catch (error) {
        console.error('Error sending contact request:', error);
        showToast('Failed to send request', 'error');
        return false;
    }
}

async function acceptContactRequest(requestId, fromUserID) {
    try {
        const toUserID = currentUser.userId;
        
        // Get request data
        const snapshot = await database.ref(`users/${toUserID}/chatRequests/${requestId}`).once('value');
        const requestData = snapshot.val();
        
        if (!requestData) {
            throw new Error('Request not found');
        }
        
        // Add each other to contacts
        await database.ref(`users/${toUserID}/contacts/${fromUserID}`).set({
            addedAt: Date.now(),
            isFavorite: false,
            nickname: ''
        });
        
        await database.ref(`users/${fromUserID}/contacts/${toUserID}`).set({
            addedAt: Date.now(),
            isFavorite: false,
            nickname: ''
        });
        
        // Remove the request
        await database.ref(`users/${toUserID}/chatRequests/${requestId}`).remove();
        
        // Update sender's sent request status
        await database.ref(`users/${fromUserID}/sentRequests/${requestId}`).update({
            status: 'accepted',
            acceptedAt: Date.now()
        });
        
        showToast('Contact added successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error accepting contact request:', error);
        showToast('Failed to accept request', 'error');
        return false;
    }
}

async function rejectContactRequest(requestId, fromUserID) {
    try {
        const toUserID = currentUser.userId;
        
        // Remove the request
        await database.ref(`users/${toUserID}/chatRequests/${requestId}`).remove();
        
        // Update sender's sent request status
        await database.ref(`users/${fromUserID}/sentRequests/${requestId}`).update({
            status: 'rejected',
            rejectedAt: Date.now()
        });
        
        showToast('Request rejected', 'info');
        return true;
    } catch (error) {
        console.error('Error rejecting contact request:', error);
        showToast('Failed to reject request', 'error');
        return false;
    }
}

async function removeContact(contactID) {
    try {
        await database.ref(`users/${currentUser.userId}/contacts/${contactID}`).remove();
        await database.ref(`users/${contactID}/contacts/${currentUser.userId}`).remove();
        
        showToast('Contact removed', 'success');
        return true;
    } catch (error) {
        console.error('Error removing contact:', error);
        showToast('Failed to remove contact', 'error');
        return false;
    }
}

// ===== CHAT FUNCTIONS =====
async function sendMessage(toUserID, message, type = 'text', mediaUrl = null, location = null) {
    try {
        const fromUserID = currentUser.userId;
        const chatId = [fromUserID, toUserID].sort().join('_');
        const messageId = `${chatId}_${Date.now()}`;
        
        const messageData = {
            messageId: messageId,
            from: fromUserID,
            to: toUserID,
            text: message,
            type: type,
            mediaUrl: mediaUrl,
            location: location,
            timestamp: Date.now(),
            read: false,
            delivered: false
        };
        
        // Save message to chat
        await database.ref(`chats/${chatId}/messages/${messageId}`).set(messageData);
        
        // Update chat metadata for both users
        const chatMetadata = {
            lastMessage: message,
            lastMessageType: type,
            lastMessageTime: Date.now(),
            lastMessageFrom: fromUserID,
            unreadCount: {
                [toUserID]: firebase.database.ServerValue.increment(1)
            }
        };
        
        await database.ref(`users/${fromUserID}/chats/${chatId}`).update({
            ...chatMetadata,
            unreadCount: 0
        });
        
        await database.ref(`users/${toUserID}/chats/${chatId}`).update(chatMetadata);
        
        // Stop typing indicator
        await database.ref(`typing/${chatId}/${fromUserID}`).remove();
        
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
        return false;
    }
}

async function loadChatMessages(chatId) {
    try {
        const messagesRef = database.ref(`chats/${chatId}/messages`).orderByChild('timestamp').limitToLast(50);
        const snapshot = await messagesRef.once('value');
        const messages = [];
        
        snapshot.forEach(childSnapshot => {
            messages.push(childSnapshot.val());
        });
        
        return messages;
    } catch (error) {
        console.error('Error loading messages:', error);
        return [];
    }
}

async function markMessagesAsRead(chatId) {
    try {
        const messagesRef = database.ref(`chats/${chatId}/messages`);
        const snapshot = await messagesRef.orderByChild('read').equalTo(false).once('value');
        
        const updates = {};
        snapshot.forEach(childSnapshot => {
            if (childSnapshot.val().to === currentUser.userId) {
                updates[`${childSnapshot.key}/read`] = true;
                updates[`${childSnapshot.key}/delivered`] = true;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await messagesRef.update(updates);
        }
        
        // Reset unread count
        await database.ref(`users/${currentUser.userId}/chats/${chatId}/unreadCount`).set(0);
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

async function startTyping(chatId) {
    try {
        await database.ref(`typing/${chatId}/${currentUser.userId}`).set({
            userId: currentUser.userId,
            timestamp: Date.now()
        });
        
        // Remove typing indicator after 3 seconds
        setTimeout(async () => {
            await database.ref(`typing/${chatId}/${currentUser.userId}`).remove();
        }, 3000);
    } catch (error) {
        console.error('Error setting typing indicator:', error);
    }
}

// ===== GROUP FUNCTIONS =====
async function createGroup(groupName, members, groupPhoto = null) {
    try {
        const groupId = `GRP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const adminId = currentUser.userId;
        
        // Upload group photo if exists
        let groupPhotoUrl = '';
        if (groupPhoto) {
            const uploadResult = await uploadToCloudinary(groupPhoto);
            groupPhotoUrl = uploadResult.url;
        }
        
        // Create members object
        const membersObj = {};
        members.forEach(memberId => {
            membersObj[memberId] = {
                joinedAt: Date.now(),
                role: memberId === adminId ? 'admin' : 'member',
                nickname: ''
            };
        });
        
        const groupData = {
            groupId: groupId,
            name: groupName,
            description: '',
            photoUrl: groupPhotoUrl,
            admin: adminId,
            members: membersObj,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        // Save group data
        await database.ref(`groups/${groupId}`).set(groupData);
        
        // Add group to each member's groups
        for (const memberId of members) {
            await database.ref(`users/${memberId}/groups/${groupId}`).set({
                joinedAt: Date.now(),
                role: memberId === adminId ? 'admin' : 'member',
                muted: false
            });
        }
        
        showToast('Group created successfully', 'success');
        return groupId;
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Failed to create group', 'error');
        return null;
    }
}

async function sendGroupMessage(groupId, message, type = 'text', mediaUrl = null) {
    try {
        const fromUserID = currentUser.userId;
        const messageId = `${groupId}_${Date.now()}`;
        
        const messageData = {
            messageId: messageId,
            groupId: groupId,
            from: fromUserID,
            text: message,
            type: type,
            mediaUrl: mediaUrl,
            timestamp: Date.now(),
            readBy: {
                [fromUserID]: true
            }
        };
        
        // Save message to group
        await database.ref(`groups/${groupId}/messages/${messageId}`).set(messageData);
        
        // Update group last activity
        await database.ref(`groups/${groupId}/lastActivity`).set(Date.now());
        
        // Update unread counts for all members except sender
        const groupSnapshot = await database.ref(`groups/${groupId}/members`).once('value');
        const members = groupSnapshot.val();
        
        for (const memberId in members) {
            if (memberId !== fromUserID) {
                await database.ref(`users/${memberId}/groups/${groupId}/unreadCount`).set(
                    firebase.database.ServerValue.increment(1)
                );
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error sending group message:', error);
        showToast('Failed to send message', 'error');
        return false;
    }
}

// ===== ZYNE FUNCTIONS =====
async function createZyne(text, media = null, duration = 86400000) {
    try {
        const userId = currentUser.userId;
        const zyneId = `ZYNE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Upload media if exists
        let mediaUrl = null;
        let mediaType = null;
        
        if (media) {
            const uploadResult = await uploadToCloudinary(media);
            mediaUrl = uploadResult.url;
            mediaType = uploadResult.type;
        }
        
        const zyneData = {
            zyneId: zyneId,
            userId: userId,
            text: text,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            likes: {},
            comments: {},
            createdAt: Date.now(),
            expiresAt: Date.now() + duration
        };
        
        // Save zyne
        await database.ref(`zynes/${zyneId}`).set(zyneData);
        
        // Add to user's zynes
        await database.ref(`users/${userId}/zynes/${zyneId}`).set({
            createdAt: Date.now(),
            expiresAt: Date.now() + duration
        });
        
        showToast('Zyne posted successfully', 'success');
        return zyneId;
    } catch (error) {
        console.error('Error creating zyne:', error);
        showToast('Failed to post zyne', 'error');
        return null;
    }
}

async function likeZyne(zyneId) {
    try {
        const userId = currentUser.userId;
        
        const snapshot = await database.ref(`zynes/${zyneId}/likes/${userId}`).once('value');
        const isLiked = snapshot.exists();
        
        if (isLiked) {
            // Unlike
            await database.ref(`zynes/${zyneId}/likes/${userId}`).remove();
        } else {
            // Like
            await database.ref(`zynes/${zyneId}/likes/${userId}`).set({
                userId: userId,
                timestamp: Date.now()
            });
        }
        
        return !isLiked;
    } catch (error) {
        console.error('Error liking zyne:', error);
        return false;
    }
}

async function addZyneComment(zyneId, comment) {
    try {
        const userId = currentUser.userId;
        const commentId = `${zyneId}_${Date.now()}`;
        
        const commentData = {
            commentId: commentId,
            zyneId: zyneId,
            userId: userId,
            text: comment,
            timestamp: Date.now()
        };
        
        await database.ref(`zynes/${zyneId}/comments/${commentId}`).set(commentData);
        return true;
    } catch (error) {
        console.error('Error adding comment:', error);
        return false;
    }
}

// ===== REAL-TIME LISTENERS =====
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    const userId = currentUser.userId;
    
    // Listen for new chat requests
    database.ref(`users/${userId}/chatRequests`).on('child_added', (snapshot) => {
        const request = snapshot.val();
        if (request) {
            chatRequests.set(snapshot.key, request);
            updateChatRequestsUI();
            playNotificationSound();
        }
    });
    
    database.ref(`users/${userId}/chatRequests`).on('child_removed', (snapshot) => {
        chatRequests.delete(snapshot.key);
        updateChatRequestsUI();
    });
    
    // Listen for contacts updates
    database.ref(`users/${userId}/contacts`).on('value', (snapshot) => {
        contacts.clear();
        const contactsData = snapshot.val();
        if (contactsData) {
            Object.keys(contactsData).forEach(contactId => {
                contacts.set(contactId, contactsData[contactId]);
            });
        }
        updateContactsUI();
    });
    
    // Listen for groups updates
    database.ref(`users/${userId}/groups`).on('value', (snapshot) => {
        groups.clear();
        const groupsData = snapshot.val();
        if (groupsData) {
            Object.keys(groupsData).forEach(groupId => {
                groups.set(groupId, groupsData[groupId]);
            });
        }
        updateGroupsUI();
    });
    
    // Listen for chats updates
    database.ref(`users/${userId}/chats`).on('value', (snapshot) => {
        chats.clear();
        const chatsData = snapshot.val();
        if (chatsData) {
            Object.keys(chatsData).forEach(chatId => {
                chats.set(chatId, chatsData[chatId]);
            });
        }
        updateRecentChatsUI();
    });
}

// ===== UI UPDATE FUNCTIONS =====
function updateChatRequestsUI() {
    const container = document.getElementById('requestsContainer');
    if (!container) return;
    
    if (chatRequests.size === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-clock"></i>
                <h3>No pending requests</h3>
                <p>You'll see chat requests here when people want to connect with you</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    chatRequests.forEach((request, requestId) => {
        html += `
            <div class="request-card" data-request-id="${requestId}">
                <img src="${request.fromUserProfile || 'default-avatar.png'}" alt="${request.fromUserName}" class="profile-pic">
                <div class="request-info">
                    <h4>${request.fromUserName}</h4>
                    <p>${request.fromUserId}</p>
                    <p class="time">${formatTime(new Date(request.timestamp))}</p>
                </div>
                <div class="request-actions">
                    <button class="action-btn accept-btn" onclick="handleAcceptRequest('${requestId}', '${request.fromUserId}')">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="action-btn reject-btn" onclick="handleRejectRequest('${requestId}', '${request.fromUserId}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Update badge count
    const badge = document.getElementById('requestBadge');
    if (badge) {
        badge.textContent = chatRequests.size;
        badge.style.display = chatRequests.size > 0 ? 'flex' : 'none';
    }
}

function updateContactsUI() {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    if (contacts.size === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-address-book"></i>
                <h3>No contacts yet</h3>
                <p>Add contacts to start chatting</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    contacts.forEach((contactData, contactId) => {
        html += `
            <div class="contact-card" data-contact-id="${contactId}">
                <img src="${contactData.profileUrl || 'default-avatar.png'}" alt="${contactData.name}" class="profile-pic">
                <div class="contact-info">
                    <h4>${contactData.name || contactId}</h4>
                    <p>${contactId}</p>
                    <p class="status ${contactData.status || 'offline'}">
                        <span class="status-dot ${contactData.status || 'offline'}"></span>
                        ${contactData.status || 'Offline'}
                    </p>
                </div>
                <div class="contact-actions">
                    <button class="action-btn chat-btn" onclick="startChatWithUser('${contactId}')">
                        <i class="fas fa-comment"></i> Chat
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateGroupsUI() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;
    
    if (groups.size === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No groups yet</h3>
                <p>Create a group to chat with multiple people at once</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    groups.forEach((groupData, groupId) => {
        html += `
            <div class="group-card" data-group-id="${groupId}">
                <img src="${groupData.photoUrl || 'default-group.png'}" alt="${groupData.name}" class="profile-pic">
                <div class="group-info">
                    <h4>${groupData.name || 'Unnamed Group'}</h4>
                    <p>${groupData.memberCount || Object.keys(groupData.members || {}).length} members</p>
                    <p class="time">Last active: ${formatTime(new Date(groupData.lastActivity || groupData.createdAt))}</p>
                </div>
                <div class="group-actions">
                    <button class="action-btn chat-btn" onclick="openGroupChat('${groupId}')">
                        <i class="fas fa-comment"></i> Open
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Update badge count
    const badge = document.getElementById('groupBadge');
    if (badge) {
        let unreadCount = 0;
        groups.forEach(group => {
            unreadCount += group.unreadCount || 0;
        });
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function updateRecentChatsUI() {
    const container = document.getElementById('recentChatsList');
    if (!container) return;
    
    if (chats.size === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comments"></i>
                <h3>No chats yet</h3>
                <p>Start a conversation by clicking the + button below</p>
            </div>
        `;
        return;
    }
    
    // Sort chats by last message time
    const sortedChats = Array.from(chats.entries()).sort((a, b) => {
        return (b[1].lastMessageTime || 0) - (a[1].lastMessageTime || 0);
    });
    
    let html = '';
    sortedChats.forEach(([chatId, chatData]) => {
        const otherUserId = chatId.split('_').find(id => id !== currentUser.userId);
        const unreadCount = chatData.unreadCount || 0;
        
        html += `
            <div class="chat-card" data-chat-id="${chatId}" onclick="openChat('${otherUserId}')">
                <img src="${chatData.otherUserProfile || 'default-avatar.png'}" alt="${chatData.otherUserName || 'User'}" class="profile-pic">
                <div class="chat-info">
                    <h4>${chatData.otherUserName || 'Unknown User'}</h4>
                    <p class="${unreadCount > 0 ? 'font-bold' : ''}">${chatData.lastMessage || 'No messages yet'}</p>
                    <p class="time">${formatTime(new Date(chatData.lastMessageTime || chatData.createdAt))}</p>
                </div>
                ${unreadCount > 0 ? `<span class="badge">${unreadCount}</span>` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ===== EVENT HANDLERS =====
async function handleAcceptRequest(requestId, fromUserID) {
    try {
        await acceptContactRequest(requestId, fromUserID);
        updateChatRequestsUI();
    } catch (error) {
        console.error('Error accepting request:', error);
    }
}

async function handleRejectRequest(requestId, fromUserID) {
    try {
        await rejectContactRequest(requestId, fromUserID);
        updateChatRequestsUI();
    } catch (error) {
        console.error('Error rejecting request:', error);
    }
}

async function startChatWithUser(userID) {
    try {
        // Check if user exists
        const userData = await getUserData(userID);
        if (!userData) {
            showToast('User not found', 'error');
            return;
        }
        
        // Check if already in contacts
        const isContact = contacts.has(userID);
        if (!isContact) {
            // Send contact request first
            const confirmed = confirm('You need to add this user to your contacts first. Send contact request?');
            if (confirmed) {
                await sendContactRequest(userID);
            }
            return;
        }
        
        // Open chat page
        window.location.href = `chat.html?user=${userID}`;
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast('Failed to start chat', 'error');
    }
}

async function openGroupChat(groupId) {
    // For now, just show a message
    showToast('Group chat feature coming soon', 'info');
    // In full implementation, this would open group chat interface
}

async function openChat(userID) {
    window.location.href = `chat.html?user=${userID}`;
}

// ===== MODAL MANAGEMENT =====
function showModal(modalId) {
    const modalOverlay = document.getElementById('modalOverlay');
    const modal = document.getElementById(modalId);
    
    if (!modalOverlay || !modal) return;
    
    // Hide all modals
    document.querySelectorAll('.modal-content').forEach(m => {
        m.style.display = 'none';
    });
    
    // Show selected modal
    modal.style.display = 'block';
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function hideModal() {
    const modalOverlay = document.getElementById('modalOverlay');
    if (!modalOverlay) return;
    
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset modal states
    document.querySelectorAll('.modal-content').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ===== INITIALIZATION =====
async function initializeHomePage() {
    try {
        // Check authentication
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            
            // Get user data
            const emailKey = user.email.replace(/\./g, '_');
            const snapshot = await database.ref(`emailToUserId/${emailKey}`).once('value');
            const userID = snapshot.val();
            
            if (!userID) {
                await logoutUser();
                return;
            }
            
            // Load user data
            const userData = await getUserData(userID);
            if (!userData) {
                await logoutUser();
                return;
            }
            
            currentUser = {
                ...userData,
                uid: user.uid,
                email: user.email
            };
            
            // Update UI with user data
            updateUserUI();
            
            // Setup real-time listeners
            setupRealtimeListeners();
            
            // Setup event listeners
            setupHomeEventListeners();
            
            // Update online status
            await database.ref(`users/${userID}/status`).set('online');
            await database.ref(`users/${userID}/lastSeen`).set(Date.now());
            
            // Handle page visibility change
            document.addEventListener('visibilitychange', async () => {
                if (document.hidden) {
                    await database.ref(`users/${userID}/status`).set('away');
                } else {
                    await database.ref(`users/${userID}/status`).set('online');
                    await database.ref(`users/${userID}/lastSeen`).set(Date.now());
                }
            });
        });
    } catch (error) {
        console.error('Home page initialization error:', error);
        showToast('Failed to load app', 'error');
    }
}

function updateUserUI() {
    if (!currentUser) return;
    
    // Update header
    const userNameElement = document.getElementById('userName');
    const userIDElement = document.getElementById('userID');
    const headerProfilePic = document.getElementById('headerProfilePic');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserID = document.getElementById('dropdownUserID');
    const dropdownProfilePic = document.getElementById('dropdownProfilePic');
    
    if (userNameElement) userNameElement.textContent = currentUser.name;
    if (userIDElement) userIDElement.textContent = currentUser.userId;
    if (headerProfilePic) {
        headerProfilePic.src = currentUser.profileUrl || 'default-avatar.png';
        headerProfilePic.onerror = () => { headerProfilePic.src = 'default-avatar.png'; };
    }
    if (dropdownUserName) dropdownUserName.textContent = currentUser.name;
    if (dropdownUserID) dropdownUserID.textContent = currentUser.userId;
    if (dropdownProfilePic) {
        dropdownProfilePic.src = currentUser.profileUrl || 'default-avatar.png';
        dropdownProfilePic.onerror = () => { dropdownProfilePic.src = 'default-avatar.png'; };
    }
    
    // Update status indicator
    const statusIndicator = document.getElementById('statusIndicator');
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${currentUser.status || 'online'}`;
    }
}

function setupHomeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(navItem => {
                navItem.classList.remove('active');
            });
            item.classList.add('active');
        });
    });
    
    // Copy User ID
    const copyBtn = document.getElementById('copyUserID');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(currentUser.userId)
                .then(() => showToast('User ID copied to clipboard', 'success'))
                .catch(() => showToast('Failed to copy User ID', 'error'));
        });
    }
    
    // Profile dropdown
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdownBtn && profileDropdown) {
        profileDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
        });
    }
    
    // Floating start chat button
    const startChatBtn = document.getElementById('startChatBtn');
    if (startChatBtn) {
        startChatBtn.addEventListener('click', () => {
            showModal('startChatModal');
        });
    }
    
    // Quick action buttons
    document.getElementById('newChatBtn')?.addEventListener('click', () => {
        showModal('startChatModal');
    });
    
    document.getElementById('newGroupBtn')?.addEventListener('click', () => {
        showModal('createGroupModal');
    });
    
    document.getElementById('newZyneBtn')?.addEventListener('click', () => {
        showModal('createZyneModal');
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', hideModal);
    });
    
    // Modal overlay click to close
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                hideModal();
            }
        });
    }
    
    // Search user in start chat modal
    const searchUserIDInput = document.getElementById('searchUserID');
    if (searchUserIDInput) {
        searchUserIDInput.addEventListener('input', debounce(async (e) => {
            const userID = e.target.value.trim().toUpperCase();
            const resultDiv = document.getElementById('userSearchResult');
            
            if (!userID || !isValidUserID(userID)) {
                resultDiv.innerHTML = `
                    <div class="search-placeholder">
                        <i class="fas fa-search"></i>
                        <p>Enter a valid User ID (ZYN-XXXX)</p>
                    </div>
                `;
                return;
            }
            
            resultDiv.innerHTML = `
                <div class="search-placeholder">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Searching for user...</p>
                </div>
            `;
            
            const result = await searchUser(userID);
            const sendBtn = document.getElementById('sendChatRequestBtn');
            
            if (result.error) {
                resultDiv.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>${result.error}</p>
                    </div>
                `;
                sendBtn.style.display = 'none';
            } else {
                const user = result.user;
                const isContact = contacts.has(userID);
                
                resultDiv.innerHTML = `
                    <div class="user-found">
                        <img src="${user.profileUrl || 'default-avatar.png'}" alt="${user.name}" class="profile-pic">
                        <div>
                            <h4>${user.name}</h4>
                            <p>${userID}</p>
                            ${isContact ? '<p class="already-contact"><i class="fas fa-check-circle"></i> Already in your contacts</p>' : ''}
                        </div>
                    </div>
                `;
                
                if (!isContact) {
                    sendBtn.style.display = 'flex';
                    sendBtn.onclick = async () => {
                        sendBtn.disabled = true;
                        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
                        await sendContactRequest(userID);
                        sendBtn.disabled = false;
                        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Chat Request';
                        hideModal();
                    };
                } else {
                    sendBtn.style.display = 'none';
                }
            }
        }, 500));
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                await logoutUser();
            }
        });
    }
    
    // Edit profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showEditProfileModal();
        });
    }
}

function switchPage(page) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    const targetPage = document.getElementById(`${page}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

function showEditProfileModal() {
    if (!currentUser) return;
    
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    // Populate form with current user data
    document.getElementById('editUserName').value = currentUser.name || '';
    document.getElementById('editUserPhone').value = currentUser.phone || '';
    document.getElementById('editUserEmail').value = currentUser.email || '';
    document.getElementById('editUserID').value = currentUser.userId || '';
    document.getElementById('editUserBio').value = currentUser.bio || '';
    
    // Update bio counter
    const bioCounter = document.getElementById('bioCounter');
    if (bioCounter) {
        bioCounter.textContent = `${currentUser.bio?.length || 0}/150`;
    }
    
    // Update profile preview
    const preview = document.getElementById('editProfilePreview');
    if (preview) {
        if (currentUser.profileUrl) {
            preview.innerHTML = `<img src="${currentUser.profileUrl}" alt="Profile Preview">`;
        } else {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-user-circle"></i>
                    <span>No image selected</span>
                    <p>Max 5MB</p>
                </div>
            `;
        }
    }
    
    // Setup bio counter
    const bioTextarea = document.getElementById('editUserBio');
    if (bioTextarea) {
        bioTextarea.addEventListener('input', () => {
            bioCounter.textContent = `${bioTextarea.value.length}/150`;
            if (bioTextarea.value.length > 150) {
                bioCounter.classList.add('error');
            } else if (bioTextarea.value.length > 130) {
                bioCounter.classList.add('warning');
            } else {
                bioCounter.classList.remove('error', 'warning');
            }
        });
    }
    
    // Setup profile picture upload
    const uploadBtn = document.getElementById('editProfileUploadBtn');
    const removeBtn = document.getElementById('removeEditProfileBtn');
    const fileInput = document.getElementById('editProfileUpload');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleProfileUpload);
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-user-circle"></i>
                    <span>No image selected</span>
                    <p>Max 5MB</p>
                </div>
            `;
            fileInput.value = '';
        });
    }
    
    // Setup save button
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.onclick = async () => {
            const name = document.getElementById('editUserName').value.trim();
            const phone = document.getElementById('editUserPhone').value.trim();
            const bio = document.getElementById('editUserBio').value.trim();
            
            if (!name) {
                showToast('Please enter your name', 'error');
                return;
            }
            
            const updates = {
                name: name,
                phone: phone,
                bio: bio
            };
            
            // Handle profile picture upload if changed
            if (fileInput.files[0]) {
                try {
                    const uploadResult = await uploadToCloudinary(fileInput.files[0]);
                    updates.profileUrl = uploadResult.url;
                } catch (error) {
                    showToast('Failed to upload profile picture', 'error');
                    return;
                }
            }
            
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const success = await updateUserProfile(updates);
            
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            
            if (success) {
                hideModal();
                updateUserUI();
            }
        };
    }
    
    showModal('editProfileModal');
}

async function handleProfileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }
    
    const preview = document.getElementById('editProfilePreview');
    if (!preview) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
    };
    reader.readAsDataURL(file);
}

// ===== CHAT PAGE INITIALIZATION =====
async function initializeChatPage() {
    try {
        // Check authentication
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }
            
            // Get current user data
            const emailKey = user.email.replace(/\./g, '_');
            const snapshot = await database.ref(`emailToUserId/${emailKey}`).once('value');
            const userID = snapshot.val();
            
            if (!userID) {
                window.location.href = 'index.html';
                return;
            }
            
            const userData = await getUserData(userID);
            if (!userData) {
                window.location.href = 'index.html';
                return;
            }
            
            currentUser = {
                ...userData,
                uid: user.uid,
                email: user.email
            };
            
            // Get chat user from URL
            const urlParams = new URLSearchParams(window.location.search);
            const chatUserId = urlParams.get('user');
            
            if (!chatUserId) {
                showToast('No user specified for chat', 'error');
                setTimeout(() => window.location.href = 'home.html', 2000);
                return;
            }
            
            // Load chat user data
            const chatUserData = await getUserData(chatUserId);
            if (!chatUserData) {
                showToast('User not found', 'error');
                setTimeout(() => window.location.href = 'home.html', 2000);
                return;
            }
            
            currentChat = {
                userId: chatUserId,
                ...chatUserData
            };
            
            // Update chat UI
            updateChatUI();
            
            // Load chat messages
            await loadAndDisplayMessages();
            
            // Setup event listeners
            setupChatEventListeners();
            
            // Setup real-time message listener
            setupChatListener();
            
            // Mark messages as read
            const chatId = [currentUser.userId, chatUserId].sort().join('_');
            await markMessagesAsRead(chatId);
        });
    } catch (error) {
        console.error('Chat page initialization error:', error);
        showToast('Failed to load chat', 'error');
    }
}

function updateChatUI() {
    if (!currentChat) return;
    
    // Update chat header
    const chatContactName = document.getElementById('chatContactName');
    const chatProfilePic = document.getElementById('chatProfilePic');
    const chatStatusDot = document.getElementById('chatStatusDot');
    const chatStatusText = document.getElementById('chatStatusText');
    
    if (chatContactName) chatContactName.textContent = currentChat.name;
    if (chatProfilePic) {
        chatProfilePic.src = currentChat.profileUrl || 'default-avatar.png';
        chatProfilePic.onerror = () => { chatProfilePic.src = 'default-avatar.png'; };
    }
    if (chatStatusDot) {
        chatStatusDot.className = `status-dot ${currentChat.status || 'offline'}`;
    }
    if (chatStatusText) {
        chatStatusText.textContent = currentChat.statusMessage || 
            (currentChat.status === 'online' ? 'Online' : 
             currentChat.status === 'away' ? 'Away' : 
             currentChat.status === 'busy' ? 'Busy' : 'Offline');
    }
}

async function loadAndDisplayMessages() {
    if (!currentChat || !currentUser) return;
    
    const chatId = [currentUser.userId, currentChat.userId].sort().join('_');
    const messages = await loadChatMessages(chatId);
    
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="empty-chat">
                <i class="fas fa-comments"></i>
                <h3>No messages yet</h3>
                <p>Say hello to start the conversation!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    let lastDate = null;
    
    messages.forEach(message => {
        const messageDate = new Date(message.timestamp);
        const currentDate = formatDate(messageDate);
        
        // Add date separator if date changed
        if (currentDate !== lastDate) {
            html += `<div class="message-date">${currentDate}</div>`;
            lastDate = currentDate;
        }
        
        const isSent = message.from === currentUser.userId;
        const messageTime = formatMessageTime(messageDate);
        
        let messageContent = '';
        switch (message.type) {
            case 'text':
                messageContent = `<p>${escapeHtml(message.text)}</p>`;
                break;
            case 'image':
                messageContent = `
                    <div class="media-message">
                        <img src="${message.mediaUrl}" alt="Image" class="chat-media" onclick="viewMedia('${message.mediaUrl}', 'image')">
                        ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ''}
                    </div>
                `;
                break;
            case 'video':
                messageContent = `
                    <div class="media-message">
                        <video src="${message.mediaUrl}" controls class="chat-media" onclick="viewMedia('${message.mediaUrl}', 'video')"></video>
                        ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ''}
                    </div>
                `;
                break;
            case 'audio':
                messageContent = `
                    <div class="media-message">
                        <div class="chat-media audio">
                            <i class="fas fa-play-circle" style="font-size: 24px;"></i>
                            <div class="audio-player">
                                <progress value="0" max="100"></progress>
                                <div class="audio-duration">0:00</div>
                            </div>
                        </div>
                        ${message.text ? `<p>${escapeHtml(message.text)}</p>` : ''}
                    </div>
                `;
                break;
            case 'location':
                messageContent = `
                    <div class="media-message">
                        <div class="location-message">
                            <div class="location-map-preview"></div>
                            <div class="location-details-preview">
                                <h5>Shared Location</h5>
                                <p>${message.text || 'Location shared'}</p>
                                <p>${message.location ? `Lat: ${message.location.lat}, Lng: ${message.location.lng}` : ''}</p>
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'document':
                messageContent = `
                    <div class="media-message">
                        <div class="document-message" onclick="downloadFile('${message.mediaUrl}')">
                            <div class="document-icon">
                                <i class="fas fa-file"></i>
                            </div>
                            <div class="document-info">
                                <h5>${message.text || 'Document'}</h5>
                                <p>Document File</p>
                            </div>
                            <div class="document-download">
                                <i class="fas fa-download"></i>
                            </div>
                        </div>
                    </div>
                `;
                break;
            default:
                messageContent = `<p>${escapeHtml(message.text)}</p>`;
        }
        
        html += `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble">
                    ${messageContent}
                    <span class="message-time">
                        ${messageTime}
                        ${isSent ? `<span class="message-status">${message.read ? '<i class="fas fa-check-double"></i>' : message.delivered ? '<i class="fas fa-check"></i>' : ''}</span>` : ''}
                    </span>
                </div>
            </div>
        `;
    });
    
    chatMessages.innerHTML = html;
    
    // Scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

function setupChatEventListeners() {
    // Back button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    
    if (messageInput) {
        // Typing indicator
        messageInput.addEventListener('input', throttle(() => {
            if (messageInput.value.trim() && currentChat) {
                const chatId = [currentUser.userId, currentChat.userId].sort().join('_');
                startTyping(chatId);
            }
        }, 1000));
        
        // Send message on Enter
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageHandler();
            }
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessageHandler);
    }
    
    // Attachment button
    const attachmentBtn = document.getElementById('attachmentBtn');
    const attachmentOptions = document.getElementById('attachmentOptions');
    
    if (attachmentBtn && attachmentOptions) {
        attachmentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            attachmentOptions.classList.toggle('show');
        });
        
        // Close attachment options when clicking outside
        document.addEventListener('click', () => {
            attachmentOptions.classList.remove('show');
        });
        
        // Stop propagation on attachment options
        attachmentOptions.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    
    // Attachment options
    setupAttachmentOptions();
    
    // Chat menu dropdown
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    const chatDropdown = document.getElementById('chatDropdown');
    
    if (chatMenuBtn && chatDropdown) {
        chatMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chatDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            chatDropdown.classList.remove('show');
        });
    }
    
    // Chat menu actions
    document.getElementById('viewProfileBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        showViewProfileModal();
    });
    
    document.getElementById('clearChatBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        clearChat();
    });
    
    document.getElementById('blockUserBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        blockUser();
    });
}

function setupAttachmentOptions() {
    // Photo attachment
    const attachPhotoBtn = document.getElementById('attachPhotoBtn');
    const photoUpload = document.getElementById('photoUpload');
    
    if (attachPhotoBtn && photoUpload) {
        attachPhotoBtn.addEventListener('click', () => {
            photoUpload.click();
        });
        
        photoUpload.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await handleMediaUpload(file, 'image');
            }
            photoUpload.value = '';
        });
    }
    
    // Video attachment
    const attachVideoBtn = document.getElementById('attachVideoBtn');
    const videoUpload = document.getElementById('videoUpload');
    
    if (attachVideoBtn && videoUpload) {
        attachVideoBtn.addEventListener('click', () => {
            videoUpload.click();
        });
        
        videoUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await handleMediaUpload(file, 'video');
                videoUpload.value = '';
            }
        });
    }
    
    // Audio attachment
    const attachAudioBtn = document.getElementById('attachAudioBtn');
    const audioUpload = document.getElementById('audioUpload');
    
    if (attachAudioBtn && audioUpload) {
        attachAudioBtn.addEventListener('click', () => {
            audioUpload.click();
        });
        
        audioUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await handleMediaUpload(file, 'audio');
                audioUpload.value = '';
            }
        });
    }
    
    // Document attachment
    const attachDocumentBtn = document.getElementById('attachDocumentBtn');
    const documentUpload = document.getElementById('documentUpload');
    
    if (attachDocumentBtn && documentUpload) {
        attachDocumentBtn.addEventListener('click', () => {
            documentUpload.click();
        });
        
        documentUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await handleMediaUpload(file, 'document');
                documentUpload.value = '';
            }
        });
    }
    
    // Location attachment
    const attachLocationBtn = document.getElementById('attachLocationBtn');
    if (attachLocationBtn) {
        attachLocationBtn.addEventListener('click', shareLocation);
    }
    
    // Voice recording
    const attachVoiceBtn = document.getElementById('attachAudioBtn');
    if (attachVoiceBtn) {
        attachVoiceBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            startVoiceRecording();
        });
    }
}

async function sendMessageHandler() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessageBtn');
    
    if (!messageInput || !sendBtn || !currentChat || !currentUser) return;
    
    const message = messageInput.value.trim();
    if (!message) return;
    
    messageInput.disabled = true;
    sendBtn.disabled = true;
    
    try {
        await sendMessage(currentChat.userId, message, 'text');
        messageInput.value = '';
        
        // Reload messages
        await loadAndDisplayMessages();
    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();
    }
}

async function handleMediaUpload(file, type) {
    if (!currentChat || !currentUser) return;
    
    try {
        showToast(`Uploading ${type}...`, 'info');
        
        const uploadResult = await uploadToCloudinary(file);
        
        let messageText = '';
        switch (type) {
            case 'image':
                messageText = 'Shared an image';
                break;
            case 'video':
                messageText = 'Shared a video';
                break;
            case 'audio':
                messageText = 'Shared an audio';
                break;
            case 'document':
                messageText = file.name;
                break;
        }
        
        await sendMessage(currentChat.userId, messageText, type, uploadResult.url);
        
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} sent`, 'success');
        
        // Reload messages
        await loadAndDisplayMessages();
    } catch (error) {
        console.error(`Error uploading ${type}:`, error);
        showToast(`Failed to send ${type}`, 'error');
    }
}

async function shareLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }
    
    showToast('Getting your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Get address using reverse geocoding
            let address = 'My Location';
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                if (data.address) {
                    const addr = data.address;
                    address = `${addr.road || ''} ${addr.suburb || ''} ${addr.city || ''} ${addr.country || ''}`.trim();
                }
            } catch (error) {
                console.error('Error getting address:', error);
            }
            
            if (!currentChat || !currentUser) return;
            
            await sendMessage(currentChat.userId, address, 'location', null, {
                lat: latitude,
                lng: longitude
            });
            
            showToast('Location shared', 'success');
            await loadAndDisplayMessages();
        },
        (error) => {
            console.error('Geolocation error:', error);
            showToast('Failed to get location', 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

async function startVoiceRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording is not supported', 'error');
        return;
    }
    
    try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(audioStream);
        audioChunks = [];
        recordingTime = 0;
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            const audioFile = new File([audioBlob], `recording_${Date.now()}.webm`, { type: 'audio/webm' });
            
            // Stop all tracks
            audioStream.getTracks().forEach(track => track.stop());
            
            // Hide recorder UI
            const recorder = document.getElementById('audioRecorder');
            if (recorder) recorder.style.display = 'none';
            
            // Clear timer
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = null;
            }
            
            // Send audio
            await handleMediaUpload(audioFile, 'audio');
        };
        
        // Show recorder UI
        const recorder = document.getElementById('audioRecorder');
        if (recorder) {
            recorder.style.display = 'block';
            
            // Setup timer
            const timerElement = document.getElementById('recordingTimer');
            recordingTimer = setInterval(() => {
                recordingTime++;
                const minutes = Math.floor(recordingTime / 60);
                const seconds = recordingTime % 60;
                if (timerElement) {
                    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
            }, 1000);
            
            // Setup cancel button
            document.getElementById('cancelRecordingBtn')?.addEventListener('click', () => {
                mediaRecorder.stop();
            });
            
            // Setup send button
            document.getElementById('sendRecordingBtn')?.addEventListener('click', () => {
                mediaRecorder.stop();
            });
        }
        
        // Start recording
        mediaRecorder.start();
        
    } catch (error) {
        console.error('Error starting recording:', error);
        showToast('Failed to start recording', 'error');
    }
}

function setupChatListener() {
    if (!currentChat || !currentUser) return;
    
    const chatId = [currentUser.userId, currentChat.userId].sort().join('_');
    
    // Listen for new messages
    database.ref(`chats/${chatId}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (message && message.from === currentChat.userId) {
            // Mark as read
            database.ref(`chats/${chatId}/messages/${snapshot.key}/read`).set(true);
            database.ref(`chats/${chatId}/messages/${snapshot.key}/delivered`).set(true);
            
            // Play notification sound
            playNotificationSound();
            
            // Reload messages
            loadAndDisplayMessages();
        }
    });
    
    // Listen for typing indicators
    database.ref(`typing/${chatId}`).on('child_added', (snapshot) => {
        const typingData = snapshot.val();
        if (typingData && typingData.userId === currentChat.userId) {
            showTypingIndicator();
        }
    });
    
    database.ref(`typing/${chatId}`).on('child_removed', (snapshot) => {
        hideTypingIndicator();
    });
}

function showTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'flex';
    }
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

function showViewProfileModal() {
    if (!currentChat) return;
    
    const modal = document.getElementById('viewProfileModal');
    if (!modal) return;
    
    // Populate profile data
    document.getElementById('viewProfileName').textContent = currentChat.name;
    document.getElementById('viewProfileID').textContent = currentChat.userId;
    document.getElementById('viewProfileBio').textContent = currentChat.bio || 'No bio yet';
    document.getElementById('viewProfilePhone').textContent = currentChat.phone || 'Not provided';
    document.getElementById('viewProfileEmail').textContent = currentChat.email || 'Not provided';
    document.getElementById('viewProfileStatus').textContent = currentChat.status || 'Offline';
    document.getElementById('viewProfileJoined').textContent = new Date(currentChat.createdAt).toLocaleDateString();
    
    const profilePic = document.getElementById('viewProfilePic');
    if (profilePic) {
        profilePic.src = currentChat.profileUrl || 'default-avatar.png';
        profilePic.onerror = () => { profilePic.src = 'default-avatar.png'; };
    }
    
    showModal('viewProfileModal');
}

async function clearChat() {
    if (!currentChat || !currentUser) return;
    
    if (!confirm('Are you sure you want to clear all messages in this chat? This action cannot be undone.')) {
        return;
    }
    
    try {
        const chatId = [currentUser.userId, currentChat.userId].sort().join('_');
        await database.ref(`chats/${chatId}/messages`).remove();
        showToast('Chat cleared', 'success');
        await loadAndDisplayMessages();
    } catch (error) {
        console.error('Error clearing chat:', error);
        showToast('Failed to clear chat', 'error');
    }
}

async function blockUser() {
    if (!currentChat || !currentUser) return;
    
    if (!confirm(`Are you sure you want to block ${currentChat.name}? You will no longer receive messages from them.`)) {
        return;
    }
    
    try {
        await database.ref(`users/${currentUser.userId}/blockedUsers/${currentChat.userId}`).set({
            blockedAt: Date.now(),
            reason: 'User blocked'
        });
        
        showToast('User blocked successfully', 'success');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    } catch (error) {
        console.error('Error blocking user:', error);
        showToast('Failed to block user', 'error');
    }
}

// ===== HELPER FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function viewMedia(url, type) {
    const modal = document.getElementById('mediaViewerModal');
    if (!modal) return;
    
    const mediaViewer = document.getElementById('mediaViewer');
    const mediaTitle = document.getElementById('mediaViewerTitle');
    
    if (!mediaViewer || !mediaTitle) return;
    
    if (type === 'image') {
        mediaViewer.innerHTML = `<img src="${url}" alt="Image">`;
        mediaTitle.textContent = 'Image';
    } else if (type === 'video') {
        mediaViewer.innerHTML = `<video src="${url}" controls autoplay></video>`;
        mediaTitle.textContent = 'Video';
    }
    
    showModal('mediaViewerModal');
}

function downloadFile(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== EXPORT FUNCTIONS FOR HTML USE =====
window.handleAcceptRequest = handleAcceptRequest;
window.handleRejectRequest = handleRejectRequest;
window.startChatWithUser = startChatWithUser;
window.openGroupChat = openGroupChat;
window.openChat = openChat;
window.initializeHomePage = initializeHomePage;
window.initializeChatPage = initializeChatPage;
window.viewMedia = viewMedia;
window.downloadFile = downloadFile;

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    const isHomePage = document.querySelector('.app-home');
    const isChatPage = document.querySelector('.chat-page');
    const isAuthPage = document.querySelector('.auth-page');
    
    if (isHomePage) {
        initializeHomePage();
    } else if (isChatPage) {
        initializeChatPage();
    }
});

// Handle window before unload
window.addEventListener('beforeunload', async () => {
    if (currentUser) {
        try {
            await database.ref(`users/${currentUser.userId}/status`).set('offline');
            await database.ref(`users/${currentUser.userId}/lastSeen`).set(Date.now());
        } catch (error) {
            console.error('Error updating status on unload:', error);
        }
    }
});
