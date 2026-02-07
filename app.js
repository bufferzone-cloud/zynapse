/* ==================== ZYNAPSE PRODUCTION APP - FULLY FUNCTIONAL ==================== */

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

// ===== CLOUDINARY CONFIGURATION =====
const CLOUDINARY_CONFIG = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse'
};

// ===== APP STATE =====
let currentUser = null;
let currentChat = null;
let currentZyneMedia = [];
let unreadMessages = {};
let chatListeners = {};
let userData = null;

// ===== INITIALIZE FIREBASE =====
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.log("Firebase already initialized");
}

const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function generateUserId() {
    return 'ZYN-' + Math.floor(1000 + Math.random() * 9000);
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 86400000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 604800000) {
        return date.toLocaleDateString([], { weekday: 'short' });
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function playNotificationSound() {
    const sound = document.getElementById('notificationSound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
}

// ===== AUTHENTICATION FUNCTIONS =====
function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
        
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            
            // Check current page and redirect if needed
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage === 'index.html') {
                window.location.href = 'home.html';
            } else {
                initApp();
            }
        } else {
            if (window.location.pathname.includes('home.html') || 
                window.location.pathname.includes('chat.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

async function loadUserData(uid) {
    try {
        const snapshot = await database.ref(`users/${uid}`).once('value');
        userData = snapshot.val();
        
        if (!userData) {
            await logout();
            return;
        }
        
        updateUIWithUserData();
        initializeRealtimeListeners();
    } catch (error) {
        console.error("Error loading user data:", error);
        showToast("Error loading user data", "error");
    }
}

function updateUIWithUserData() {
    // Update home page elements
    const userNameEl = document.getElementById('userName');
    const userIdEl = document.getElementById('userId');
    const profilePicSmall = document.getElementById('profilePicSmall');
    
    if (userNameEl) userNameEl.textContent = userData.name || 'User';
    if (userIdEl) userIdEl.textContent = userData.userId || 'ZYN-0000';
    if (profilePicSmall && userData.profilePicture) {
        profilePicSmall.src = userData.profilePicture;
    }
    
    // Update chat page elements
    const chatUserNameEl = document.getElementById('chatUserName');
    const chatUserAvatarEl = document.getElementById('chatUserAvatar');
    
    if (chatUserNameEl && currentChat) {
        const chatUser = getChatUserData(currentChat);
        if (chatUser) {
            chatUserNameEl.textContent = chatUser.name;
            if (chatUserAvatarEl && chatUser.profilePicture) {
                chatUserAvatarEl.src = chatUser.profilePicture;
            }
        }
    }
}

// ===== SIGNUP FUNCTION =====
async function signup(name, phone, email, password, profileImage) {
    try {
        // Create Firebase auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate user ID
        const userId = generateUserId();
        
        // Upload profile picture to Cloudinary if exists
        let profilePictureUrl = '';
        if (profileImage) {
            profilePictureUrl = await uploadToCloudinary(profileImage);
        }
        
        // Create user data object
        const userData = {
            name,
            phone,
            email,
            userId,
            profilePicture: profilePictureUrl,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            status: 'online',
            contacts: {},
            chatRequests: {},
            blockedUsers: {}
        };
        
        // Save to Firebase
        await database.ref(`users/${user.uid}`).set(userData);
        await database.ref(`userIds/${userId}`).set(user.uid);
        
        showToast("Account created successfully!", "success");
        
        // Auto login after signup
        await auth.signInWithEmailAndPassword(email, password);
        
    } catch (error) {
        console.error("Signup error:", error);
        showToast(error.message, "error");
    }
}

// ===== LOGIN FUNCTION =====
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast("Logged in successfully!", "success");
    } catch (error) {
        console.error("Login error:", error);
        showToast(error.message, "error");
    }
}

// ===== LOGOUT FUNCTION =====
async function logout() {
    try {
        if (currentUser && userData) {
            // Update last seen
            await database.ref(`users/${currentUser.uid}`).update({
                lastSeen: Date.now(),
                status: 'offline'
            });
        }
        
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Logout error:", error);
        showToast(error.message, "error");
    }
}

// ===== CLOUDINARY UPLOAD =====
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                resolve(data.secure_url);
            } else {
                reject(new Error('Upload failed'));
            }
        })
        .catch(error => {
            console.error('Cloudinary upload error:', error);
            // Fallback to Firebase Storage
            uploadToFirebaseStorage(file).then(resolve).catch(reject);
        });
    });
}

async function uploadToFirebaseStorage(file) {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`zynapse/${Date.now()}_${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

// ===== CHAT FUNCTIONS =====
async function sendMessage(chatId, message, type = 'text', mediaUrl = null, metadata = {}) {
    if (!message.trim() && !mediaUrl) return;
    
    try {
        const messageId = database.ref().child('messages').push().key;
        const messageData = {
            id: messageId,
            senderId: currentUser.uid,
            chatId,
            content: message,
            type,
            mediaUrl,
            metadata,
            timestamp: Date.now(),
            read: false
        };
        
        await database.ref(`messages/${chatId}/${messageId}`).set(messageData);
        
        // Update last message in chat
        await database.ref(`chats/${chatId}`).update({
            lastMessage: message,
            lastMessageTime: Date.now(),
            lastMessageType: type
        });
        
        // Update unread count for recipient
        const chatData = await getChatData(chatId);
        const recipientId = chatData.participants.find(p => p !== currentUser.uid);
        if (recipientId) {
            await updateUnreadCount(chatId, recipientId);
        }
        
    } catch (error) {
        console.error("Error sending message:", error);
        showToast("Failed to send message", "error");
    }
}

async function createChatRequest(recipientUserId) {
    try {
        // Get recipient UID from userId mapping
        const recipientSnapshot = await database.ref(`userIds/${recipientUserId}`).once('value');
        const recipientUid = recipientSnapshot.val();
        
        if (!recipientUid) {
            showToast("User not found", "error");
            return;
        }
        
        if (recipientUid === currentUser.uid) {
            showToast("Cannot send request to yourself", "error");
            return;
        }
        
        // Check if already contacts
        const userSnapshot = await database.ref(`users/${currentUser.uid}/contacts`).once('value');
        if (userSnapshot.val() && userSnapshot.val()[recipientUid]) {
            showToast("Already in contacts", "error");
            return;
        }
        
        // Create request
        const requestId = database.ref().child('chatRequests').push().key;
        const requestData = {
            id: requestId,
            senderId: currentUser.uid,
            senderName: userData.name,
            senderUserId: userData.userId,
            senderProfile: userData.profilePicture || '',
            recipientId: recipientUid,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        await database.ref(`chatRequests/${recipientUid}/${requestId}`).set(requestData);
        showToast("Chat request sent!", "success");
        
    } catch (error) {
        console.error("Error sending chat request:", error);
        showToast(error.message, "error");
    }
}

async function handleChatRequest(requestId, action) {
    try {
        const requestRef = database.ref(`chatRequests/${currentUser.uid}/${requestId}`);
        const snapshot = await requestRef.once('value');
        const request = snapshot.val();
        
        if (!request) return;
        
        if (action === 'accept') {
            // Create chat
            const chatId = database.ref().child('chats').push().key;
            const chatData = {
                id: chatId,
                participants: [currentUser.uid, request.senderId],
                createdAt: Date.now(),
                lastMessage: '',
                lastMessageTime: Date.now(),
                type: 'private'
            };
            
            await database.ref(`chats/${chatId}`).set(chatData);
            
            // Add to contacts both ways
            await database.ref(`users/${currentUser.uid}/contacts/${request.senderId}`).set({
                chatId,
                addedAt: Date.now()
            });
            
            await database.ref(`users/${request.senderId}/contacts/${currentUser.uid}`).set({
                chatId,
                addedAt: Date.now()
            });
            
            showToast("Chat request accepted!", "success");
            
            // Open chat
            window.location.href = `chat.html?chatId=${chatId}`;
            
        } else if (action === 'reject') {
            // Notify sender
            await database.ref(`users/${request.senderId}/notifications`).push({
                type: 'request_rejected',
                fromUserId: userData.userId,
                fromName: userData.name,
                timestamp: Date.now()
            });
        }
        
        // Remove request
        await requestRef.remove();
        
    } catch (error) {
        console.error("Error handling chat request:", error);
        showToast(error.message, "error");
    }
}

// ===== ZYNES FUNCTIONS =====
async function postZyne(content, mediaFiles = []) {
    if (!content.trim() && mediaFiles.length === 0) return;
    
    try {
        const zyneId = database.ref().child('zynes').push().key;
        const mediaUrls = [];
        
        // Upload media files
        for (const file of mediaFiles) {
            const url = await uploadToCloudinary(file);
            mediaUrls.push({
                url,
                type: file.type.startsWith('image/') ? 'image' : 'video',
                filename: file.name
            });
        }
        
        const zyneData = {
            id: zyneId,
            userId: currentUser.uid,
            userName: userData.name,
            userProfile: userData.profilePicture || '',
            content,
            media: mediaUrls,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            likes: {},
            comments: {},
            viewCount: 0
        };
        
        await database.ref(`zynes/${zyneId}`).set(zyneData);
        
        // Add to user's zynes
        await database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).set(true);
        
        showToast("Zyne posted!", "success");
        currentZyneMedia = [];
        
    } catch (error) {
        console.error("Error posting zyne:", error);
        showToast("Failed to post zyne", "error");
    }
}

async function likeZyne(zyneId) {
    try {
        const likeRef = database.ref(`zynes/${zyneId}/likes/${currentUser.uid}`);
        const snapshot = await likeRef.once('value');
        
        if (snapshot.exists()) {
            await likeRef.remove();
        } else {
            await likeRef.set({
                userId: currentUser.uid,
                userName: userData.name,
                timestamp: Date.now()
            });
        }
    } catch (error) {
        console.error("Error liking zyne:", error);
    }
}

async function addComment(zyneId, comment) {
    if (!comment.trim()) return;
    
    try {
        const commentId = database.ref().child('comments').push().key;
        const commentData = {
            id: commentId,
            zyneId,
            userId: currentUser.uid,
            userName: userData.name,
            userProfile: userData.profilePicture || '',
            content: comment,
            timestamp: Date.now()
        };
        
        await database.ref(`zynes/${zyneId}/comments/${commentId}`).set(commentData);
        
    } catch (error) {
        console.error("Error adding comment:", error);
    }
}

// ===== GROUP FUNCTIONS =====
async function createGroup(name, description, members = []) {
    if (!name.trim()) return;
    
    try {
        const groupId = database.ref().child('groups').push().key;
        const allMembers = [currentUser.uid, ...members];
        
        const groupData = {
            id: groupId,
            name,
            description,
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            members: allMembers.reduce((acc, uid) => {
                acc[uid] = {
                    joinedAt: Date.now(),
                    role: uid === currentUser.uid ? 'admin' : 'member'
                };
                return acc;
            }, {}),
            lastMessage: '',
            lastMessageTime: Date.now()
        };
        
        await database.ref(`groups/${groupId}`).set(groupData);
        
        // Add group to users' group lists
        for (const uid of allMembers) {
            await database.ref(`users/${uid}/groups/${groupId}`).set({
                joinedAt: Date.now()
            });
        }
        
        showToast("Group created successfully!", "success");
        
    } catch (error) {
        console.error("Error creating group:", error);
        showToast("Failed to create group", "error");
    }
}

async function sendGroupMessage(groupId, message, type = 'text', mediaUrl = null) {
    if (!message.trim() && !mediaUrl) return;
    
    try {
        const messageId = database.ref().child('groupMessages').push().key;
        const messageData = {
            id: messageId,
            groupId,
            senderId: currentUser.uid,
            senderName: userData.name,
            content: message,
            type,
            mediaUrl,
            timestamp: Date.now()
        };
        
        await database.ref(`groupMessages/${groupId}/${messageId}`).set(messageData);
        
        // Update group last message
        await database.ref(`groups/${groupId}`).update({
            lastMessage: message,
            lastMessageTime: Date.now(),
            lastMessageType: type
        });
        
    } catch (error) {
        console.error("Error sending group message:", error);
        showToast("Failed to send message", "error");
    }
}

// ===== REALTIME LISTENERS =====
function initializeRealtimeListeners() {
    if (!currentUser) return;
    
    // Listen for chat requests
    database.ref(`chatRequests/${currentUser.uid}`).on('value', (snapshot) => {
        const requests = snapshot.val() || {};
        const requestCount = Object.keys(requests).length;
        
        const badge = document.getElementById('requestsBadge');
        if (badge) {
            if (requestCount > 0) {
                badge.textContent = requestCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
        
        // Update requests list if on requests page
        if (window.location.pathname.includes('home.html')) {
            updateRequestsList(requests);
        }
    });
    
    // Listen for new messages in user's chats
    database.ref(`users/${currentUser.uid}/contacts`).on('value', async (snapshot) => {
        const contacts = snapshot.val() || {};
        
        // Update contacts list
        updateContactsList(contacts);
        
        // Load chats for home page
        if (window.location.pathname.includes('home.html')) {
            await updateChatsList(contacts);
        }
    });
    
    // Listen for zynes from contacts
    database.ref('zynes').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        const zynes = snapshot.val() || {};
        
        // Filter zynes from contacts
        const contactZynes = Object.values(zynes).filter(zyne => {
            return isContact(zyne.userId);
        });
        
        // Update zynes list
        updateZynesList(contactZynes);
    });
    
    // Listen for groups
    database.ref(`users/${currentUser.uid}/groups`).on('value', async (snapshot) => {
        const groups = snapshot.val() || {};
        await updateGroupsList(groups);
    });
}

function isContact(userId) {
    return userData.contacts && userData.contacts[userId];
}

// ===== UI UPDATE FUNCTIONS =====
async function updateChatsList(contacts) {
    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;
    
    const chatPromises = Object.entries(contacts).map(async ([contactId, contactData]) => {
        const userSnapshot = await database.ref(`users/${contactId}`).once('value');
        const contactUser = userSnapshot.val();
        const chatSnapshot = await database.ref(`chats/${contactData.chatId}`).once('value');
        const chatData = chatSnapshot.val();
        
        return {
            contactId,
            contactUser,
            chatData,
            contactData
        };
    });
    
    const chats = await Promise.all(chatPromises);
    
    // Sort by last message time
    chats.sort((a, b) => (b.chatData?.lastMessageTime || 0) - (a.chatData?.lastMessageTime || 0));
    
    if (chats.length === 0) {
        chatsList.innerHTML = `
            <div class="empty-state">
                <i class="far fa-comments"></i>
                <h3>No chats yet</h3>
                <p>Start a new chat by tapping the button below</p>
            </div>
        `;
        return;
    }
    
    chatsList.innerHTML = chats.map(chat => `
        <div class="chat-item" data-chat-id="${chat.contactData.chatId}" data-user-id="${chat.contactId}">
            <img src="${chat.contactUser?.profilePicture || ''}" alt="${chat.contactUser?.name}" class="chat-avatar">
            <div class="chat-info">
                <h3>${chat.contactUser?.name || 'Unknown User'}</h3>
                <p class="chat-preview">${chat.chatData?.lastMessage || 'Start chatting...'}</p>
            </div>
            <div class="chat-meta">
                <span class="chat-time">${formatTime(chat.chatData?.lastMessageTime)}</span>
                ${unreadMessages[chat.contactData.chatId] ? 
                    `<div class="unread-badge">${unreadMessages[chat.contactData.chatId]}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.dataset.chatId;
            window.location.href = `chat.html?chatId=${chatId}`;
        });
    });
}

function updateRequestsList(requests) {
    const requestsList = document.getElementById('requestsList');
    if (!requestsList) return;
    
    const requestsArray = Object.entries(requests).map(([id, request]) => ({ id, ...request }));
    
    if (requestsArray.length === 0) {
        requestsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-plus"></i>
                <h3>No pending requests</h3>
                <p>When someone sends you a chat request, it will appear here</p>
            </div>
        `;
        return;
    }
    
    requestsList.innerHTML = requestsArray.map(request => `
        <div class="request-card" data-request-id="${request.id}">
            <div class="request-header">
                <img src="${request.senderProfile || ''}" alt="${request.senderName}" class="request-avatar">
                <div class="request-info">
                    <h4>${request.senderName}</h4>
                    <p class="request-user-id">${request.senderUserId}</p>
                </div>
            </div>
            <div class="request-actions">
                <button class="action-btn accept-btn" data-action="accept">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="action-btn reject-btn" data-action="reject">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.request-actions button').forEach(button => {
        button.addEventListener('click', (e) => {
            const requestCard = e.target.closest('.request-card');
            const requestId = requestCard.dataset.requestId;
            const action = e.target.closest('button').dataset.action;
            handleChatRequest(requestId, action);
        });
    });
}

async function updateContactsList(contacts) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;
    
    const contactPromises = Object.keys(contacts).map(async (contactId) => {
        const userSnapshot = await database.ref(`users/${contactId}`).once('value');
        return userSnapshot.val();
    });
    
    const contactUsers = (await Promise.all(contactPromises)).filter(Boolean);
    
    if (contactUsers.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-address-book"></i>
                <h3>No contacts yet</h3>
                <p>Add contacts by accepting chat requests</p>
            </div>
        `;
        return;
    }
    
    contactsList.innerHTML = contactUsers.map(user => `
        <div class="contact-card" data-user-id="${user.userId}">
            <img src="${user.profilePicture || ''}" alt="${user.name}" class="contact-avatar">
            <div class="contact-info">
                <h3>${user.name}</h3>
                <div class="contact-status">
                    <span class="status-dot ${user.status === 'online' ? 'online' : 'offline'}"></span>
                    <span>${user.status === 'online' ? 'Online' : 'Last seen ' + formatTime(user.lastSeen)}</span>
                </div>
            </div>
            <div class="contact-actions">
                <button class="icon-btn start-chat-btn" title="Start Chat">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.start-chat-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const contactCard = e.target.closest('.contact-card');
            const userId = contactCard.dataset.userId;
            
            // Find chat ID from contacts
            const contactId = Object.keys(contacts).find(id => {
                const contactUser = contactUsers.find(u => u.userId === userId);
                return contactUser && contactUser.uid === id;
            });
            
            if (contactId && contacts[contactId]) {
                window.location.href = `chat.html?chatId=${contacts[contactId].chatId}`;
            }
        });
    });
}

function updateZynesList(zynes) {
    const zynesList = document.getElementById('zynesList');
    if (!zynesList) return;
    
    // Filter expired zynes
    const activeZynes = zynes.filter(zyne => zyne.expiresAt > Date.now());
    
    if (activeZynes.length === 0) {
        zynesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bolt"></i>
                <h3>No Zynes yet</h3>
                <p>Share updates with your contacts</p>
            </div>
        `;
        return;
    }
    
    zynesList.innerHTML = activeZynes.map(zyne => `
        <div class="zyne-card" data-zyne-id="${zyne.id}">
            <div class="zyne-header">
                <img src="${zyne.userProfile || ''}" alt="${zyne.userName}" class="zyne-avatar">
                <div class="zyne-user-info">
                    <h4>${zyne.userName}</h4>
                    <span class="zyne-time">${formatTime(zyne.timestamp)}</span>
                </div>
            </div>
            <div class="zyne-content">
                ${zyne.content ? `<p class="zyne-text">${zyne.content}</p>` : ''}
                ${zyne.media && zyne.media.length > 0 ? zyne.media.map(media => 
                    media.type === 'image' ? 
                        `<img src="${media.url}" alt="Zyne media" class="zyne-media">` :
                        `<video src="${media.url}" controls class="zyne-media"></video>`
                ).join('') : ''}
            </div>
            <div class="zyne-actions">
                <button class="zyne-action-btn like-btn ${zyne.likes && zyne.likes[currentUser.uid] ? 'liked' : ''}">
                    <i class="fas fa-heart"></i> Like
                </button>
                <button class="zyne-action-btn comment-btn">
                    <i class="fas fa-comment"></i> Comment
                </button>
            </div>
            <div class="zyne-stats">
                <span>${Object.keys(zyne.likes || {}).length} likes</span>
                <span>${Object.keys(zyne.comments || {}).length} comments</span>
            </div>
            <div class="zyne-comments hidden">
                <input type="text" class="comment-input" placeholder="Add a comment...">
                <div class="comment-list"></div>
            </div>
        </div>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const zyneCard = e.target.closest('.zyne-card');
            const zyneId = zyneCard.dataset.zyneId;
            likeZyne(zyneId);
        });
    });
    
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const zyneCard = e.target.closest('.zyne-card');
            const commentsSection = zyneCard.querySelector('.zyne-comments');
            commentsSection.classList.toggle('hidden');
        });
    });
    
    document.querySelectorAll('.comment-input').forEach(input => {
        input.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                const zyneCard = e.target.closest('.zyne-card');
                const zyneId = zyneCard.dataset.zyneId;
                await addComment(zyneId, e.target.value.trim());
                e.target.value = '';
            }
        });
    });
}

async function updateGroupsList(userGroups) {
    const groupsList = document.getElementById('groupsList');
    if (!groupsList) return;
    
    const groupPromises = Object.keys(userGroups).map(async (groupId) => {
        const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
        return groupSnapshot.val();
    });
    
    const groups = (await Promise.all(groupPromises)).filter(Boolean);
    
    if (groups.length === 0) {
        groupsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No groups yet</h3>
                <p>Create a group to chat with multiple people</p>
            </div>
        `;
        return;
    }
    
    groupsList.innerHTML = groups.map(group => `
        <div class="group-card" data-group-id="${group.id}">
            <img src="${group.photo || ''}" alt="${group.name}" class="group-avatar">
            <div class="group-info">
                <h3>${group.name}</h3>
                <p>${group.description || 'No description'}</p>
                <div class="group-members">
                    <i class="fas fa-users"></i>
                    <span>${Object.keys(group.members || {}).length} members</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Add click listeners
    document.querySelectorAll('.group-card').forEach(card => {
        card.addEventListener('click', () => {
            const groupId = card.dataset.groupId;
            // For simplicity, using same chat page for groups
            window.location.href = `chat.html?groupId=${groupId}`;
        });
    });
}

// ===== INITIALIZE APP =====
function initApp() {
    // Index.html event listeners
    if (document.getElementById('loginBtn')) {
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('welcomeScreen').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        });
        
        document.getElementById('signupBtn').addEventListener('click', () => {
            document.getElementById('welcomeScreen').classList.add('hidden');
            document.getElementById('signupForm').classList.remove('hidden');
        });
        
        document.getElementById('backToWelcomeFromLogin').addEventListener('click', () => {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('welcomeScreen').classList.remove('hidden');
        });
        
        document.getElementById('backToWelcomeFromSignup').addEventListener('click', () => {
            document.getElementById('signupForm').classList.add('hidden');
            document.getElementById('welcomeScreen').classList.remove('hidden');
        });
        
        document.getElementById('switchToSignup').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('signupForm').classList.remove('hidden');
        });
        
        document.getElementById('switchToLogin').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signupForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        });
        
        // Toggle password visibility
        document.getElementById('toggleLoginPassword').addEventListener('click', function() {
            const passwordInput = document.getElementById('loginPassword');
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
        
        document.getElementById('toggleSignupPassword').addEventListener('click', function() {
            const passwordInput = document.getElementById('signupPassword');
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
        
        // Profile picture upload
        document.getElementById('uploadProfileBtn').addEventListener('click', () => {
            document.getElementById('profileImageInput').click();
        });
        
        document.getElementById('profileImageInput').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('profilePreview');
                    preview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">`;
                    document.getElementById('removeProfileBtn').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.getElementById('removeProfileBtn').addEventListener('click', () => {
            document.getElementById('profilePreview').innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-user-circle"></i>
                    <span>No image</span>
                </div>`;
            document.getElementById('removeProfileBtn').classList.add('hidden');
            document.getElementById('profileImageInput').value = '';
        });
        
        // Login form submission
        document.getElementById('submitLogin').addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast("Please fill in all fields", "error");
                return;
            }
            
            login(email, password);
        });
        
        // Signup form submission
        document.getElementById('submitSignup').addEventListener('click', async () => {
            const name = document.getElementById('signupName').value;
            const phone = document.getElementById('signupPhone').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            const profileInput = document.getElementById('profileImageInput');
            
            if (!name || !phone || !email || !password) {
                showToast("Please fill in all fields", "error");
                return;
            }
            
            if (!agreeTerms) {
                showToast("Please agree to the terms", "error");
                return;
            }
            
            const profileImage = profileInput.files[0];
            await signup(name, phone, email, password, profileImage);
        });
    }
    
    // Home.html event listeners
    if (document.getElementById('copyUserId')) {
        document.getElementById('copyUserId').addEventListener('click', () => {
            const userId = document.getElementById('userId').textContent;
            navigator.clipboard.writeText(userId)
                .then(() => showToast("User ID copied to clipboard", "success"))
                .catch(() => showToast("Failed to copy ID", "error"));
        });
        
        document.getElementById('profileBtn').addEventListener('click', () => {
            document.getElementById('profileDropdown').classList.toggle('show');
        });
        
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                this.classList.add('active');
                
                // Show corresponding page
                const page = this.dataset.page;
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById(`${page}Page`).classList.add('active');
            });
        });
        
        // Start chat button
        document.getElementById('startChatBtn').addEventListener('click', () => {
            showModal('Start New Chat', `
                <div class="search-input-group">
                    <input type="text" id="searchUserId" placeholder="Enter User ID (e.g., ZYN-1234)" maxlength="8">
                </div>
                <div class="search-result" id="searchResult"></div>
                <div class="modal-actions">
                    <button class="action-btn btn-primary" id="searchUserBtn">
                        <i class="fas fa-search"></i> Search
                    </button>
                </div>
            `);
            
            document.getElementById('searchUserBtn').addEventListener('click', async () => {
                const userId = document.getElementById('searchUserId').value.trim().toUpperCase();
                if (!userId.startsWith('ZYN-') || userId.length !== 8) {
                    showToast("Please enter a valid User ID", "error");
                    return;
                }
                
                // Search for user
                const snapshot = await database.ref(`userIds/${userId}`).once('value');
                const userUid = snapshot.val();
                
                if (!userUid) {
                    document.getElementById('searchResult').innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-user-slash"></i>
                            <h3>User not found</h3>
                            <p>Please check the User ID and try again</p>
                        </div>`;
                    return;
                }
                
                const userSnapshot = await database.ref(`users/${userUid}`).once('value');
                const user = userSnapshot.val();
                
                document.getElementById('searchResult').innerHTML = `
                    <div class="user-found">
                        <img src="${user.profilePicture || ''}" alt="${user.name}" class="user-found-avatar">
                        <div class="user-found-info">
                            <h4>${user.name}</h4>
                            <p>${user.userId}</p>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="action-btn btn-primary" id="sendRequestBtn">
                            <i class="fas fa-paper-plane"></i> Send Chat Request
                        </button>
                    </div>`;
                
                document.getElementById('sendRequestBtn').addEventListener('click', () => {
                    createChatRequest(userId);
                    closeModal();
                });
            });
        });
        
        // Create group button
        if (document.getElementById('createGroupBtn')) {
            document.getElementById('createGroupBtn').addEventListener('click', () => {
                showModal('Create New Group', `
                    <div class="input-group">
                        <i class="fas fa-users"></i>
                        <input type="text" id="groupName" placeholder="Group Name" required>
                    </div>
                    <div class="input-group">
                        <i class="fas fa-pen"></i>
                        <input type="text" id="groupDescription" placeholder="Description (optional)">
                    </div>
                    <div class="input-group">
                        <i class="fas fa-user-plus"></i>
                        <input type="text" id="addMemberInput" placeholder="Add members by User ID">
                        <button class="btn-secondary" id="addMemberBtn" style="margin-top: 10px;">Add Member</button>
                    </div>
                    <div id="membersList" style="margin-top: 15px;"></div>
                    <div class="modal-actions">
                        <button class="action-btn btn-primary" id="createGroupSubmit">
                            <i class="fas fa-plus"></i> Create Group
                        </button>
                    </div>
                `);
                
                const members = new Set();
                
                document.getElementById('addMemberBtn').addEventListener('click', async () => {
                    const userId = document.getElementById('addMemberInput').value.trim().toUpperCase();
                    if (!userId.startsWith('ZYN-')) {
                        showToast("Invalid User ID format", "error");
                        return;
                    }
                    
                    const snapshot = await database.ref(`userIds/${userId}`).once('value');
                    const userUid = snapshot.val();
                    
                    if (!userUid) {
                        showToast("User not found", "error");
                        return;
                    }
                    
                    if (userUid === currentUser.uid) {
                        showToast("Cannot add yourself", "error");
                        return;
                    }
                    
                    const userSnapshot = await database.ref(`users/${userUid}`).once('value');
                    const user = userSnapshot.val();
                    
                    members.add(userUid);
                    updateMembersList();
                    
                    function updateMembersList() {
                        const membersList = document.getElementById('membersList');
                        membersList.innerHTML = Array.from(members).map(uid => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; background: var(--gray-50); border-radius: var(--radius-md); margin-bottom: 5px;">
                                <span>${user.name} (${user.userId})</span>
                                <button class="icon-btn remove-member" data-uid="${uid}" style="color: var(--red);">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('');
                    }
                });
                
                document.getElementById('createGroupSubmit').addEventListener('click', async () => {
                    const name = document.getElementById('groupName').value.trim();
                    const description = document.getElementById('groupDescription').value.trim();
                    
                    if (!name) {
                        showToast("Group name is required", "error");
                        return;
                    }
                    
                    await createGroup(name, description, Array.from(members));
                    closeModal();
                });
            });
        }
        
        // Post zyne
        if (document.getElementById('postZyneBtn')) {
            document.getElementById('postZyneBtn').addEventListener('click', () => {
                const content = document.getElementById('zyneInput').value.trim();
                if (!content && currentZyneMedia.length === 0) {
                    showToast("Please add content or media", "error");
                    return;
                }
                
                postZyne(content, currentZyneMedia);
                document.getElementById('zyneInput').value = '';
                document.getElementById('zyneMediaPreview').innerHTML = '';
                currentZyneMedia = [];
            });
        }
    }
    
    // Chat.html event listeners
    if (document.getElementById('backBtn')) {
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'home.html';
        });
        
        // Get chat ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chatId');
        const groupId = urlParams.get('groupId');
        
        if (chatId) {
            currentChat = chatId;
            loadChat(chatId);
        } else if (groupId) {
            loadGroup(groupId);
        }
        
        // Message input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 100) + 'px';
            sendBtn.disabled = !this.value.trim();
        });
        
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.value.trim()) {
                    sendMessageHandler();
                }
            }
        });
        
        sendBtn.addEventListener('click', sendMessageHandler);
        
        function sendMessageHandler() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            if (chatId) {
                sendMessage(chatId, message);
            } else if (groupId) {
                sendGroupMessage(groupId, message);
            }
            
            messageInput.value = '';
            messageInput.style.height = 'auto';
            sendBtn.disabled = true;
        }
        
        // Attachment button
        document.getElementById('attachBtn').addEventListener('click', () => {
            document.getElementById('attachmentOptions').classList.toggle('show');
        });
        
        // Attachment options
        document.querySelectorAll('.attachment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.dataset.type;
                handleAttachment(type);
                document.getElementById('attachmentOptions').classList.remove('show');
            });
        });
        
        function handleAttachment(type) {
            switch(type) {
                case 'photo':
                    document.getElementById('photoInput').click();
                    break;
                case 'video':
                    document.getElementById('videoInput').click();
                    break;
                case 'document':
                    document.getElementById('documentInput').click();
                    break;
                case 'voice':
                    startVoiceRecording();
                    break;
                case 'location':
                    sendLocation();
                    break;
                case 'viewOnce':
                    sendViewOnceMessage();
                    break;
            }
        }
        
        // File input handlers
        document.getElementById('photoInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const url = await uploadToCloudinary(file);
                if (chatId) {
                    sendMessage(chatId, 'Photo', 'image', url, { filename: file.name });
                }
                this.value = '';
            }
        });
        
        document.getElementById('videoInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const url = await uploadToCloudinary(file);
                if (chatId) {
                    sendMessage(chatId, 'Video', 'video', url, { filename: file.name });
                }
                this.value = '';
            }
        });
        
        document.getElementById('documentInput').addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                const url = await uploadToCloudinary(file);
                if (chatId) {
                    sendMessage(chatId, file.name, 'document', url, { 
                        filename: file.name,
                        size: file.size,
                        type: file.type 
                    });
                }
                this.value = '';
            }
        });
        
        // Chat menu
        document.getElementById('chatMenuBtn').addEventListener('click', () => {
            document.getElementById('chatMenuDropdown').classList.toggle('show');
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        // Close dropdowns
        if (!e.target.matches('.profile-btn, .profile-btn *')) {
            const dropdown = document.getElementById('profileDropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
        
        if (!e.target.matches('.chat-menu-btn, .chat-menu-btn *')) {
            const dropdown = document.getElementById('chatMenuDropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
        
        // Close attachment options
        if (!e.target.matches('.attach-btn, .attach-btn *, .attachment-options, .attachment-options *')) {
            const options = document.getElementById('attachmentOptions');
            if (options) options.classList.remove('show');
        }
        
        // Close modal
        if (e.target.classList.contains('modal-overlay')) {
            closeModal();
        }
    });
}

// ===== MODAL FUNCTIONS =====
function showModal(title, content) {
    const modal = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.classList.remove('active');
}

// ===== CHAT LOADING =====
async function loadChat(chatId) {
    try {
        // Get chat data
        const chatSnapshot = await database.ref(`chats/${chatId}`).once('value');
        const chatData = chatSnapshot.val();
        
        if (!chatData) {
            showToast("Chat not found", "error");
            setTimeout(() => window.location.href = 'home.html', 1000);
            return;
        }
        
        // Get other participant
        const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
        if (!otherUserId) return;
        
        // Load user data
        const userSnapshot = await database.ref(`users/${otherUserId}`).once('value');
        const otherUser = userSnapshot.val();
        
        // Update UI
        const userNameEl = document.getElementById('chatUserName');
        const userAvatarEl = document.getElementById('chatUserAvatar');
        const statusDot = document.getElementById('userStatusDot');
        const statusText = document.getElementById('userStatusText');
        
        if (userNameEl) userNameEl.textContent = otherUser.name;
        if (userAvatarEl && otherUser.profilePicture) {
            userAvatarEl.src = otherUser.profilePicture;
        }
        
        // Update status
        if (otherUser.status === 'online') {
            statusDot.classList.add('online');
            statusText.textContent = 'Online';
        } else {
            statusDot.classList.remove('online');
            statusText.textContent = `Last seen ${formatTime(otherUser.lastSeen)}`;
        }
        
        // Load messages
        loadMessages(chatId);
        
        // Mark messages as read
        markMessagesAsRead(chatId);
        
    } catch (error) {
        console.error("Error loading chat:", error);
        showToast("Error loading chat", "error");
    }
}

async function loadMessages(chatId) {
    const messagesRef = database.ref(`messages/${chatId}`).orderByChild('timestamp').limitToLast(50);
    
    messagesRef.on('value', (snapshot) => {
        const messages = snapshot.val() || {};
        const messagesArray = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);
        
        displayMessages(messagesArray);
        
        // Scroll to bottom
        setTimeout(() => {
            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 100);
    });
}

function displayMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="far fa-comments"></i>
                <h3>No messages yet</h3>
                <p>Send a message to start the conversation</p>
            </div>`;
        return;
    }
    
    container.innerHTML = messages.map(msg => {
        const isSent = msg.senderId === currentUser.uid;
        
        let messageContent = '';
        switch(msg.type) {
            case 'image':
                messageContent = `
                    <div class="media-message">
                        <img src="${msg.mediaUrl}" alt="Photo" class="chat-media">
                        <div class="media-info">
                            <i class="fas fa-image"></i>
                            <span>Photo</span>
                        </div>
                    </div>`;
                break;
            case 'video':
                messageContent = `
                    <div class="media-message">
                        <video src="${msg.mediaUrl}" controls class="chat-media"></video>
                        <div class="media-info">
                            <i class="fas fa-video"></i>
                            <span>Video</span>
                        </div>
                    </div>`;
                break;
            case 'document':
                messageContent = `
                    <div class="document-message">
                        <div class="document-icon">
                            <i class="fas fa-file"></i>
                        </div>
                        <div class="document-info">
                            <div class="document-name">${msg.metadata?.filename || 'Document'}</div>
                            <div class="document-size">${formatFileSize(msg.metadata?.size)}</div>
                        </div>
                    </div>`;
                break;
            default:
                messageContent = `<div class="message-text">${msg.content}</div>`;
        }
        
        return `
            <div class="message ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble">
                    ${messageContent}
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                </div>
            </div>`;
    }).join('');
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function markMessagesAsRead(chatId) {
    try {
        const messagesRef = database.ref(`messages/${chatId}`);
        const snapshot = await messagesRef.orderByChild('read').equalTo(false).once('value');
        
        const updates = {};
        snapshot.forEach((childSnapshot) => {
            const msg = childSnapshot.val();
            if (msg.senderId !== currentUser.uid) {
                updates[`${childSnapshot.key}/read`] = true;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await messagesRef.update(updates);
        }
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
}

// ===== VOICE RECORDING =====
let mediaRecorder = null;
let audioChunks = [];

function startVoiceRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
            
            mediaRecorder.addEventListener('stop', async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioFile = new File([audioBlob], `voice_message_${Date.now()}.wav`, { type: 'audio/wav' });
                
                const url = await uploadToCloudinary(audioFile);
                if (currentChat) {
                    sendMessage(currentChat, 'Voice message', 'audio', url, {
                        duration: Math.floor(audioBlob.size / 16000) // Rough estimate
                    });
                }
                
                stream.getTracks().forEach(track => track.stop());
            });
            
            mediaRecorder.start();
            
            // Show recording UI
            showToast("Recording... Click to stop", "info");
            
            // Stop recording on click
            document.addEventListener('click', stopRecording, { once: true });
        })
        .catch(error => {
            console.error("Error accessing microphone:", error);
            showToast("Microphone access denied", "error");
        });
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        showToast("Voice message recorded", "success");
    }
}

// ===== LOCATION =====
function sendLocation() {
    if (!navigator.geolocation) {
        showToast("Geolocation not supported", "error");
        return;
    }
    
    showToast("Getting your location...", "info");
    
    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Get address using reverse geocoding
        let address = 'Unknown location';
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            if (data.address) {
                const { road, suburb, city, town, village } = data.address;
                address = [road, suburb, city || town || village].filter(Boolean).join(', ');
            }
        } catch (error) {
            console.error("Error getting address:", error);
        }
        
        // Send location message
        if (currentChat) {
            sendMessage(currentChat, 'Location shared', 'location', null, {
                latitude,
                longitude,
                address,
                timestamp: Date.now()
            });
        }
        
        showToast("Location sent", "success");
    }, (error) => {
        console.error("Geolocation error:", error);
        showToast("Failed to get location", "error");
    });
}

// ===== VIEW ONCE MESSAGE =====
function sendViewOnceMessage() {
    showModal("Send View Once Message", `
        <div class="input-group">
            <i class="fas fa-eye"></i>
            <textarea id="viewOnceMessage" placeholder="Enter view once message..." rows="3"></textarea>
        </div>
        <div class="modal-actions">
            <button class="action-btn btn-primary" id="sendViewOnceBtn">
                <i class="fas fa-paper-plane"></i> Send
            </button>
        </div>
    `);
    
    document.getElementById('sendViewOnceBtn').addEventListener('click', () => {
        const message = document.getElementById('viewOnceMessage').value.trim();
        if (!message) {
            showToast("Please enter a message", "error");
            return;
        }
        
        if (currentChat) {
            sendMessage(currentChat, message, 'view_once');
            closeModal();
            showToast("View once message sent", "success");
        }
    });
}

// ===== HELPER FUNCTIONS =====
async function getChatData(chatId) {
    const snapshot = await database.ref(`chats/${chatId}`).once('value');
    return snapshot.val();
}

async function getChatUserData(chatId) {
    const chatData = await getChatData(chatId);
    if (!chatData) return null;
    
    const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
    if (!otherUserId) return null;
    
    const snapshot = await database.ref(`users/${otherUserId}`).once('value');
    return snapshot.val();
}

async function updateUnreadCount(chatId, userId) {
    const snapshot = await database.ref(`messages/${chatId}`)
        .orderByChild('read').equalTo(false)
        .once('value');
    
    const unreadMessages = [];
    snapshot.forEach(child => {
        const msg = child.val();
        if (msg.senderId !== userId) {
            unreadMessages.push(msg);
        }
    });
    
    await database.ref(`users/${userId}/unread/${chatId}`).set(unreadMessages.length);
}

// ===== INITIALIZE =====
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    
    // Close loading screen after 2 seconds max
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }, 2000);
});

// Close modal with ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        
        // Also close dropdowns
        document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    }
});

// Prevent drag and drop file uploads (for simplicity)
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden && currentUser && userData) {
        // Update last seen when tab becomes hidden
        database.ref(`users/${currentUser.uid}`).update({
            lastSeen: Date.now(),
            status: 'offline'
        });
    } else if (!document.hidden && currentUser && userData) {
        // Update status when tab becomes visible
        database.ref(`users/${currentUser.uid}`).update({
            status: 'online'
        });
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', () => {
    if (currentUser && userData) {
        // Use synchronous XHR to ensure data is sent before page closes
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'https://zynapse-68181-default-rtdb.firebaseio.com/users.json', false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({
            [`${currentUser.uid}/lastSeen`]: Date.now(),
            [`${currentUser.uid}/status`]: 'offline'
        }));
    }
});
