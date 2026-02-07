// ==================== CONFIGURATION ====================
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

const CLOUDINARY_CONFIG = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse/media',
    apiUrl: 'https://api.cloudinary.com/v1_1/dd3lcymrk/upload'
};

// ==================== FIREBASE INITIALIZATION ====================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// ==================== GLOBAL VARIABLES ====================
let currentUser = null;
let currentChat = null;
let contacts = new Map();
let chats = new Map();
let groups = new Map();
let pendingRequests = [];
let onlineUsers = new Set();
let voiceRecorder = null;
let audioContext = null;
let analyser = null;
let recordingInterval = null;
let recordingTime = 0;
let mediaStream = null;

// ==================== UTILITY FUNCTIONS ====================
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function generateUserId() {
    return `ZYN-${Math.floor(1000 + Math.random() * 9000)}`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function uploadToCloudinary(file, type = 'image') {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', CLOUDINARY_CONFIG.folder);
        
        fetch(CLOUDINARY_CONFIG.apiUrl, {
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
                    size: data.bytes
                });
            } else {
                reject(new Error('Upload failed'));
            }
        })
        .catch(reject);
    });
}

// ==================== AUTHENTICATION ====================
async function registerUser(email, password, userData) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = generateUserId();
        
        // Upload profile picture if exists
        let profileUrl = '';
        const profileInput = document.getElementById('profileImageInput');
        if (profileInput.files && profileInput.files[0]) {
            const uploadResult = await uploadToCloudinary(profileInput.files[0]);
            profileUrl = uploadResult.url;
        }
        
        // Create user in database
        await database.ref(`users/${userCredential.user.uid}`).set({
            ...userData,
            userId: userId,
            profileUrl: profileUrl,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            status: 'offline',
            contacts: [],
            blockedUsers: [],
            favoriteChats: []
        });
        
        // Store user ID reference
        await database.ref(`userIds/${userId}`).set(userCredential.user.uid);
        
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        await updateUserStatus(userCredential.user.uid, 'online');
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

async function updateUserStatus(uid, status) {
    await database.ref(`users/${uid}/status`).set(status);
    await database.ref(`users/${uid}/lastSeen`).set(Date.now());
}

// ==================== DOM ELEMENT REFERENCES ====================
function getElements() {
    return {
        // Auth elements
        loadingScreen: document.getElementById('loadingScreen'),
        authContainer: document.getElementById('authContainer'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        signupForm: document.getElementById('signupForm'),
        loginForm: document.getElementById('loginForm'),
        
        // App elements
        appContainer: document.getElementById('appContainer'),
        userNameDisplay: document.getElementById('userNameDisplay'),
        userIdDisplay: document.getElementById('userIdDisplay'),
        userProfilePic: document.getElementById('userProfilePic'),
        
        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        
        // Pages
        homePage: document.getElementById('homePage'),
        zynesPage: document.getElementById('zynesPage'),
        groupsPage: document.getElementById('groupsPage'),
        requestsPage: document.getElementById('requestsPage'),
        contactsPage: document.getElementById('contactsPage'),
        chatPage: document.getElementById('chatPage'),
        
        // Chat elements
        chatsList: document.getElementById('chatsList'),
        emptyChatsState: document.getElementById('emptyChatsState'),
        chatMessages: document.getElementById('chatMessages'),
        messageInput: document.getElementById('messageInput'),
        sendMessageBtn: document.getElementById('sendMessageBtn'),
        attachBtn: document.getElementById('attachBtn'),
        attachmentOptions: document.getElementById('attachmentOptions'),
        
        // Modals
        modals: document.querySelectorAll('.modal-overlay'),
        startChatModal: document.getElementById('startChatModal'),
        createZyneModal: document.getElementById('createZyneModal'),
        createGroupModal: document.getElementById('createGroupModal'),
        
        // Buttons
        startChatBtn: document.getElementById('startChatBtn'),
        copyUserIdBtn: document.getElementById('copyUserIdBtn'),
        logoutBtn: document.getElementById('logoutBtn')
    };
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    const elements = getElements();
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
    
    // Auth navigation
    document.getElementById('showSignupBtn')?.addEventListener('click', () => {
        elements.welcomeScreen.style.display = 'none';
        elements.signupForm.style.display = 'block';
    });
    
    document.getElementById('showLoginBtn')?.addEventListener('click', () => {
        elements.welcomeScreen.style.display = 'none';
        elements.loginForm.style.display = 'block';
    });
    
    document.getElementById('backToWelcomeFromSignup')?.addEventListener('click', () => {
        elements.signupForm.style.display = 'none';
        elements.welcomeScreen.style.display = 'block';
    });
    
    document.getElementById('backToWelcomeFromLogin')?.addEventListener('click', () => {
        elements.loginForm.style.display = 'none';
        elements.welcomeScreen.style.display = 'block';
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        elements.signupForm.style.display = 'none';
        elements.loginForm.style.display = 'block';
    });
    
    document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        elements.loginForm.style.display = 'none';
        elements.signupForm.style.display = 'block';
    });
    
    // Profile picture upload
    document.getElementById('uploadProfileBtn')?.addEventListener('click', () => {
        document.getElementById('profileImageInput').click();
    });
    
    document.getElementById('profileImageInput')?.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const preview = document.getElementById('profilePreview');
                preview.innerHTML = `<img src="${event.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">`;
                document.getElementById('removeProfileBtn').style.display = 'block';
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
    
    // Signup form submission
    document.getElementById('signupFormElement')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value.trim();
        const phone = document.getElementById('signupPhone').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }
        
        if (!document.getElementById('agreeTerms').checked) {
            showToast('Please agree to the terms', 'error');
            return;
        }
        
        try {
            document.getElementById('signupSubmitBtn').disabled = true;
            document.getElementById('signupSubmitBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            
            await registerUser(email, password, {
                name: name,
                phone: phone,
                email: email
            });
            
            showToast('Account created successfully!', 'success');
            // Auto login will happen via auth state change
        } catch (error) {
            showToast(error.message, 'error');
            document.getElementById('signupSubmitBtn').disabled = false;
            document.getElementById('signupSubmitBtn').innerHTML = '<i class="fas fa-user-plus"></i> Create Account';
        }
    });
    
    // Login form submission
    document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        try {
            document.getElementById('loginSubmitBtn').disabled = true;
            document.getElementById('loginSubmitBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
            
            await loginUser(email, password);
            // Auto redirect will happen via auth state change
        } catch (error) {
            showToast(error.message, 'error');
            document.getElementById('loginSubmitBtn').disabled = false;
            document.getElementById('loginSubmitBtn').innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    });
    
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            switchPage(page);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Start chat button
    elements.startChatBtn?.addEventListener('click', () => {
        openModal('startChatModal');
    });
    
    // Copy user ID
    elements.copyUserIdBtn?.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.userIdDisplay.textContent)
            .then(() => showToast('User ID copied to clipboard', 'success'));
    });
    
    // Message input
    elements.messageInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        elements.sendMessageBtn.disabled = this.value.trim() === '';
    });
    
    elements.messageInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send message
    elements.sendMessageBtn?.addEventListener('click', sendMessage);
    
    // Attachment button
    elements.attachBtn?.addEventListener('click', () => {
        elements.attachmentOptions.classList.toggle('show');
    });
    
    // Attachment options
    document.querySelectorAll('.attachment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.getAttribute('data-type');
            handleAttachment(type);
            elements.attachmentOptions.classList.remove('show');
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            closeModal(modalId);
        });
    });
    
    // Back to home from chat
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => {
        switchPage('home');
        currentChat = null;
        stopListeningToMessages();
    });
    
    // Search user for chat
    document.getElementById('searchUserIdInput')?.addEventListener('input', async function() {
        const userId = this.value.trim().toUpperCase();
        if (userId.match(/^ZYN-\d{4}$/)) {
            await searchUser(userId);
        }
    });
    
    // Send chat request
    document.getElementById('sendRequestBtn')?.addEventListener('click', sendChatRequest);
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Profile dropdown
    document.getElementById('profileBtn')?.addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('profileDropdown').classList.toggle('show');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
            dropdown.classList.remove('show');
        });
    });
}

// ==================== PAGE MANAGEMENT ====================
function switchPage(page) {
    const elements = getElements();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    switch(page) {
        case 'home':
            elements.homePage.classList.add('active');
            elements.startChatBtn.style.display = 'flex';
            loadChats();
            break;
        case 'zynes':
            elements.zynesPage.classList.add('active');
            elements.startChatBtn.style.display = 'none';
            loadZynes();
            break;
        case 'groups':
            elements.groupsPage.classList.add('active');
            elements.startChatBtn.style.display = 'none';
            loadGroups();
            break;
        case 'requests':
            elements.requestsPage.classList.add('active');
            elements.startChatBtn.style.display = 'none';
            loadRequests();
            break;
        case 'contacts':
            elements.contactsPage.classList.add('active');
            elements.startChatBtn.style.display = 'none';
            loadContacts();
            break;
        case 'chat':
            elements.chatPage.classList.add('active');
            elements.startChatBtn.style.display = 'none';
            break;
    }
}

// ==================== MODAL MANAGEMENT ====================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = 'auto';
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// ==================== USER MANAGEMENT ====================
async function searchUser(userId) {
    try {
        const snapshot = await database.ref(`userIds/${userId}`).once('value');
        if (snapshot.exists()) {
            const uid = snapshot.val();
            const userSnapshot = await database.ref(`users/${uid}`).once('value');
            const user = userSnapshot.val();
            
            document.getElementById('searchResult').style.display = 'block';
            document.getElementById('userNotFound').style.display = 'none';
            
            document.getElementById('foundUserName').textContent = user.name;
            document.getElementById('foundUserId').textContent = user.userId;
            document.getElementById('foundUserAvatar').src = user.profileUrl || 'default-avatar.png';
            document.getElementById('sendRequestBtn').dataset.userId = uid;
        } else {
            document.getElementById('searchResult').style.display = 'none';
            document.getElementById('userNotFound').style.display = 'block';
        }
    } catch (error) {
        showToast('Error searching user', 'error');
    }
}

async function sendChatRequest() {
    const targetUserId = document.getElementById('sendRequestBtn').dataset.userId;
    if (!targetUserId) return;
    
    try {
        const requestId = database.ref().child('chatRequests').push().key;
        const requestData = {
            id: requestId,
            from: currentUser.uid,
            to: targetUserId,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        await database.ref(`chatRequests/${requestId}`).set(requestData);
        
        // Also add to recipient's pending requests
        await database.ref(`users/${targetUserId}/pendingRequests/${requestId}`).set(true);
        
        showToast('Chat request sent', 'success');
        closeModal('startChatModal');
    } catch (error) {
        showToast('Error sending request', 'error');
    }
}

// ==================== CHAT MANAGEMENT ====================
async function loadChats() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/chats`).once('value');
        const chatIds = snapshot.val() || {};
        
        const chatsList = document.getElementById('chatsList');
        chatsList.innerHTML = '';
        
        if (Object.keys(chatIds).length === 0) {
            document.getElementById('emptyChatsState').style.display = 'flex';
            return;
        }
        
        document.getElementById('emptyChatsState').style.display = 'none';
        
        for (const chatId in chatIds) {
            const chatSnapshot = await database.ref(`chats/${chatId}`).once('value');
            const chatData = chatSnapshot.val();
            
            if (chatData) {
                const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
                const userSnapshot = await database.ref(`users/${otherUserId}`).once('value');
                const userData = userSnapshot.val();
                
                const lastMessage = chatData.lastMessage || {};
                const unreadCount = chatData.unreadCount?.[currentUser.uid] || 0;
                
                const chatElement = document.createElement('div');
                chatElement.className = `chat-item ${unreadCount > 0 ? 'unread' : ''}`;
                chatElement.dataset.chatId = chatId;
                chatElement.dataset.userId = otherUserId;
                chatElement.innerHTML = `
                    <img src="${userData.profileUrl || 'default-avatar.png'}" alt="${userData.name}" class="chat-avatar">
                    <div class="chat-info">
                        <h3>${userData.name}</h3>
                        <p class="chat-preview">${lastMessage.text || 'No messages yet'}</p>
                    </div>
                    <div class="chat-meta">
                        <span class="chat-time">${formatTime(lastMessage.timestamp || chatData.createdAt)}</span>
                        ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                    </div>
                `;
                
                chatElement.addEventListener('click', () => openChat(chatId, otherUserId));
                chatsList.appendChild(chatElement);
            }
        }
    } catch (error) {
        console.error('Error loading chats:', error);
    }
}

async function openChat(chatId, otherUserId) {
    currentChat = { chatId, otherUserId };
    switchPage('chat');
    
    try {
        const userSnapshot = await database.ref(`users/${otherUserId}`).once('value');
        const userData = userSnapshot.val();
        
        document.getElementById('chatUserName').textContent = userData.name;
        document.getElementById('chatUserAvatar').src = userData.profileUrl || 'default-avatar.png';
        document.getElementById('chatUserStatus').className = `status-dot ${userData.status === 'online' ? 'online' : ''}`;
        document.getElementById('chatStatusText').textContent = userData.status === 'online' ? 'online' : 'last seen ' + formatTime(userData.lastSeen);
        
        loadChatMessages(chatId);
        listenToMessages(chatId);
        
        // Mark messages as read
        await markMessagesAsRead(chatId);
    } catch (error) {
        console.error('Error opening chat:', error);
    }
}

async function loadChatMessages(chatId) {
    const messagesContainer = document.getElementById('chatMessages');
    messagesContainer.innerHTML = '';
    
    try {
        const snapshot = await database.ref(`chats/${chatId}/messages`).orderByChild('timestamp').limitToLast(50).once('value');
        const messages = [];
        
        snapshot.forEach(childSnapshot => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Display messages
        messages.forEach(message => {
            displayMessage(message);
        });
        
        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    const isSent = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    messageElement.dataset.messageId = message.id;
    
    let contentHTML = '';
    
    switch (message.type) {
        case 'text':
            contentHTML = `
                <div class="message-text">${message.text}</div>
                <span class="message-time">${formatMessageTime(message.timestamp)}</span>
            `;
            break;
            
        case 'image':
            contentHTML = `
                <div class="media-message">
                    <img src="${message.url}" alt="Image" class="chat-media" onclick="viewMedia('${message.url}', 'image')">
                    ${message.text ? `<div class="message-text">${message.text}</div>` : ''}
                    <span class="message-time">${formatMessageTime(message.timestamp)}</span>
                </div>
            `;
            break;
            
        case 'video':
            contentHTML = `
                <div class="media-message">
                    <video src="${message.url}" controls class="chat-media" onclick="viewMedia('${message.url}', 'video')"></video>
                    ${message.text ? `<div class="message-text">${message.text}</div>` : ''}
                    <span class="message-time">${formatMessageTime(message.timestamp)}</span>
                </div>
            `;
            break;
            
        case 'document':
            contentHTML = `
                <div class="document-message" onclick="viewMedia('${message.url}', 'document', '${message.fileName}', '${message.fileSize}')">
                    <div class="document-icon">
                        <i class="fas fa-file"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-name">${message.fileName}</div>
                        <div class="document-size">${formatFileSize(message.fileSize)}</div>
                    </div>
                    <span class="message-time">${formatMessageTime(message.timestamp)}</span>
                </div>
            `;
            break;
            
        case 'location':
            contentHTML = `
                <div class="location-message" onclick="viewMedia('', 'location', '', '', ${JSON.stringify(message.location)})">
                    <div class="location-map">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="location-info">
                        <div class="location-address">${message.location.address || 'Location'}</div>
                        <div class="location-details">
                            <span>${message.location.city || ''}</span>
                            <span>${message.location.country || ''}</span>
                        </div>
                    </div>
                    <span class="message-time">${formatMessageTime(message.timestamp)}</span>
                </div>
            `;
            break;
            
        case 'voice':
            contentHTML = `
                <div class="voice-message" onclick="playVoiceMessage('${message.url}')">
                    <button class="voice-play-btn">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="voice-waveform"></div>
                    <div class="voice-duration">${message.duration || '0:00'}</div>
                    <span class="message-time">${formatMessageTime(message.timestamp)}</span>
                </div>
            `;
            break;
    }
    
    messageElement.innerHTML = `
        <div class="message-bubble">
            ${contentHTML}
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChat) return;
    
    try {
        const messageId = database.ref().child('messages').push().key;
        const messageData = {
            id: messageId,
            chatId: currentChat.chatId,
            senderId: currentUser.uid,
            text: text,
            type: 'text',
            timestamp: Date.now(),
            status: 'sent'
        };
        
        await database.ref(`chats/${currentChat.chatId}/messages/${messageId}`).set(messageData);
        
        // Update last message
        await database.ref(`chats/${currentChat.chatId}/lastMessage`).set({
            text: text,
            timestamp: Date.now(),
            senderId: currentUser.uid
        });
        
        // Increment unread count for receiver
        await database.ref(`chats/${currentChat.chatId}/unreadCount/${currentChat.otherUserId}`).transaction(count => (count || 0) + 1);
        
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('sendMessageBtn').disabled = true;
        
    } catch (error) {
        showToast('Error sending message', 'error');
    }
}

async function handleAttachment(type) {
    switch(type) {
        case 'photo':
            await sendPhoto();
            break;
        case 'video':
            await sendVideo();
            break;
        case 'document':
            await sendDocument();
            break;
        case 'location':
            await sendLocation();
            break;
        case 'viewOnce':
            await sendViewOnce();
            break;
        case 'voice':
            await sendVoiceMessage();
            break;
    }
}

async function sendPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        if (e.target.files[0]) {
            try {
                showToast('Uploading photo...', 'info');
                const result = await uploadToCloudinary(e.target.files[0], 'image');
                
                const messageId = database.ref().child('messages').push().key;
                const messageData = {
                    id: messageId,
                    chatId: currentChat.chatId,
                    senderId: currentUser.uid,
                    url: result.url,
                    type: 'image',
                    timestamp: Date.now(),
                    status: 'sent',
                    fileSize: result.size,
                    format: result.format
                };
                
                await database.ref(`chats/${currentChat.chatId}/messages/${messageId}`).set(messageData);
                await updateLastMessage('📷 Photo', currentChat.chatId);
                
                showToast('Photo sent', 'success');
            } catch (error) {
                showToast('Error sending photo', 'error');
            }
        }
    };
    input.click();
}

async function sendLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation not supported', 'error');
        return;
    }
    
    openModal('locationPickerModal');
    
    // Initialize map
    const map = L.map('locationPickerMap').setView([0, 0], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Get current location
    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        map.setView([lat, lng], 13);
        const marker = L.marker([lat, lng]).addTo(map);
        
        // Reverse geocode to get address
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            const address = data.display_name || 'Unknown location';
            const city = data.address.city || data.address.town || data.address.village || '';
            const country = data.address.country || '';
            
            document.getElementById('selectedLocationName').textContent = 'Current Location';
            document.getElementById('selectedLocationAddress').textContent = address;
            
            // Store location data for sending
            document.getElementById('sendLocationBtn').dataset.location = JSON.stringify({
                lat: lat,
                lng: lng,
                address: address,
                city: city,
                country: country
            });
        } catch (error) {
            console.error('Error getting address:', error);
        }
    });
    
    // Send location button
    document.getElementById('sendLocationBtn').onclick = async () => {
        const locationData = JSON.parse(document.getElementById('sendLocationBtn').dataset.location || '{}');
        
        const messageId = database.ref().child('messages').push().key;
        const messageData = {
            id: messageId,
            chatId: currentChat.chatId,
            senderId: currentUser.uid,
            type: 'location',
            location: locationData,
            timestamp: Date.now(),
            status: 'sent'
        };
        
        await database.ref(`chats/${currentChat.chatId}/messages/${messageId}`).set(messageData);
        await updateLastMessage('📍 Location', currentChat.chatId);
        
        closeModal('locationPickerModal');
        showToast('Location sent', 'success');
    };
}

async function sendVoiceMessage() {
    openModal('voiceRecorderModal');
    
    let mediaRecorder;
    let audioChunks = [];
    
    document.getElementById('startRecordingBtn').onclick = async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(mediaStream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                audioChunks = [];
                
                // Upload to Cloudinary
                const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                showToast('Uploading voice message...', 'info');
                
                try {
                    const result = await uploadToCloudinary(file, 'raw');
                    
                    const duration = Math.round(recordingTime / 1000);
                    const messageId = database.ref().child('messages').push().key;
                    const messageData = {
                        id: messageId,
                        chatId: currentChat.chatId,
                        senderId: currentUser.uid,
                        url: result.url,
                        type: 'voice',
                        duration: `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
                        timestamp: Date.now(),
                        status: 'sent',
                        fileSize: result.size
                    };
                    
                    await database.ref(`chats/${currentChat.chatId}/messages/${messageId}`).set(messageData);
                    await updateLastMessage('🎤 Voice message', currentChat.chatId);
                    
                    closeModal('voiceRecorderModal');
                    showToast('Voice message sent', 'success');
                } catch (error) {
                    showToast('Error uploading voice message', 'error');
                }
            };
            
            mediaRecorder.start();
            recordingTime = 0;
            
            // Update UI
            document.getElementById('startRecordingBtn').style.display = 'none';
            document.getElementById('stopRecordingBtn').style.display = 'block';
            document.getElementById('recordingStatus').textContent = 'Recording...';
            
            // Update timer
            recordingInterval = setInterval(() => {
                recordingTime += 1000;
                const seconds = Math.floor(recordingTime / 1000);
                document.getElementById('recordingTime').textContent = 
                    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
            }, 1000);
            
        } catch (error) {
            showToast('Error accessing microphone', 'error');
        }
    };
    
    document.getElementById('stopRecordingBtn').onclick = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            clearInterval(recordingInterval);
            
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            
            document.getElementById('stopRecordingBtn').style.display = 'none';
            document.getElementById('playRecordingBtn').style.display = 'block';
            document.getElementById('sendRecordingBtn').style.display = 'block';
            document.getElementById('recordingStatus').textContent = 'Recording stopped';
        }
    };
}

// ==================== ZYNES MANAGEMENT ====================
async function loadZynes() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref('zynes').orderByChild('timestamp').limitToLast(50).once('value');
        const zynesList = document.getElementById('zynesList');
        zynesList.innerHTML = '';
        
        snapshot.forEach(childSnapshot => {
            const zyne = childSnapshot.val();
            if (zyne.privacy === 'public' || zyne.userId === currentUser.uid || 
                (zyne.privacy === 'contacts' && contacts.has(zyne.userId))) {
                displayZyne(zyne);
            }
        });
    } catch (error) {
        console.error('Error loading zynes:', error);
    }
}

function displayZyne(zyne) {
    const zynesList = document.getElementById('zynesList');
    const zyneElement = document.createElement('div');
    zyneElement.className = 'zyne-card';
    zyneElement.innerHTML = `
        <div class="zyne-header">
            <img src="${zyne.userProfile || 'default-avatar.png'}" alt="${zyne.userName}" class="zyne-avatar">
            <div class="zyne-user-info">
                <h4>${zyne.userName}</h4>
                <div class="zyne-time">${formatTime(zyne.timestamp)}</div>
            </div>
        </div>
        <div class="zyne-content">
            ${zyne.text ? `<div class="zyne-text">${zyne.text}</div>` : ''}
            ${zyne.mediaUrl ? `
                ${zyne.mediaType === 'image' ? 
                    `<img src="${zyne.mediaUrl}" alt="Zyne media" class="zyne-media" onclick="viewMedia('${zyne.mediaUrl}', 'image')">` :
                    `<video src="${zyne.mediaUrl}" controls class="zyne-media" onclick="viewMedia('${zyne.mediaUrl}', 'video')"></video>`
                }
            ` : ''}
        </div>
        <div class="zyne-actions">
            <button class="zyne-action-btn like-btn" data-zyne-id="${zyne.id}">
                <i class="fas fa-heart"></i> Like
            </button>
            <button class="zyne-action-btn comment-btn" data-zyne-id="${zyne.id}">
                <i class="fas fa-comment"></i> Comment
            </button>
            ${zyne.userId === currentUser.uid ? `
                <button class="zyne-action-btn delete-btn" data-zyne-id="${zyne.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            ` : ''}
        </div>
        <div class="zyne-stats">
            <span>${zyne.likes || 0} likes</span>
            <span>${zyne.comments || 0} comments</span>
        </div>
    `;
    
    zynesList.appendChild(zyneElement);
}

// ==================== GROUPS MANAGEMENT ====================
async function loadGroups() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref('groups').orderByChild('lastActivity').limitToLast(20).once('value');
        const groupsList = document.getElementById('groupsList');
        groupsList.innerHTML = '';
        
        snapshot.forEach(childSnapshot => {
            const group = childSnapshot.val();
            if (group.members && group.members[currentUser.uid]) {
                displayGroup(group);
            }
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

function displayGroup(group) {
    const groupsList = document.getElementById('groupsList');
    const groupElement = document.createElement('div');
    groupElement.className = 'group-card';
    groupElement.innerHTML = `
        <img src="${group.photoUrl || 'default-group.png'}" alt="${group.name}" class="group-avatar">
        <div class="group-info">
            <h3>${group.name}</h3>
            <p>${group.lastMessage || 'No messages yet'}</p>
            <div class="group-members">
                <i class="fas fa-users"></i>
                <span>${Object.keys(group.members || {}).length} members</span>
            </div>
        </div>
    `;
    
    groupElement.addEventListener('click', () => openGroupChat(group.id));
    groupsList.appendChild(groupElement);
}

// ==================== REQUESTS MANAGEMENT ====================
async function loadRequests() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/pendingRequests`).once('value');
        const requestsList = document.getElementById('requestsList');
        requestsList.innerHTML = '';
        
        pendingRequests = [];
        
        for (const requestId in snapshot.val()) {
            const requestSnapshot = await database.ref(`chatRequests/${requestId}`).once('value');
            const request = requestSnapshot.val();
            
            if (request && request.status === 'pending' && request.to === currentUser.uid) {
                pendingRequests.push(request);
                
                const userSnapshot = await database.ref(`users/${request.from}`).once('value');
                const userData = userSnapshot.val();
                
                displayRequest(request, userData);
            }
        }
        
        updateBadge('requests', pendingRequests.length);
    } catch (error) {
        console.error('Error loading requests:', error);
    }
}

function displayRequest(request, userData) {
    const requestsList = document.getElementById('requestsList');
    const requestElement = document.createElement('div');
    requestElement.className = 'request-card';
    requestElement.innerHTML = `
        <div class="request-header">
            <img src="${userData.profileUrl || 'default-avatar.png'}" alt="${userData.name}" class="request-avatar">
            <div class="request-info">
                <h4>${userData.name}</h4>
                <p class="request-user-id">${userData.userId}</p>
            </div>
        </div>
        <div class="request-actions">
            <button class="action-btn accept-btn" data-request-id="${request.id}" data-from-id="${request.from}">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="action-btn reject-btn" data-request-id="${request.id}">
                <i class="fas fa-times"></i> Reject
            </button>
        </div>
    `;
    
    requestsList.appendChild(requestElement);
    
    // Add event listeners
    requestElement.querySelector('.accept-btn').addEventListener('click', () => handleRequest(request.id, request.from, 'accepted'));
    requestElement.querySelector('.reject-btn').addEventListener('click', () => handleRequest(request.id, null, 'rejected'));
}

async function handleRequest(requestId, fromId, action) {
    try {
        // Update request status
        await database.ref(`chatRequests/${requestId}/status`).set(action);
        
        // Remove from user's pending requests
        await database.ref(`users/${currentUser.uid}/pendingRequests/${requestId}`).remove();
        
        if (action === 'accepted') {
            // Create chat
            const chatId = database.ref().child('chats').push().key;
            const chatData = {
                id: chatId,
                participants: [currentUser.uid, fromId],
                createdAt: Date.now(),
                lastMessage: null,
                unreadCount: {
                    [currentUser.uid]: 0,
                    [fromId]: 0
                }
            };
            
            await database.ref(`chats/${chatId}`).set(chatData);
            
            // Add chat reference to both users
            await database.ref(`users/${currentUser.uid}/chats/${chatId}`).set(true);
            await database.ref(`users/${fromId}/chats/${chatId}`).set(true);
            
            // Add to contacts
            await database.ref(`users/${currentUser.uid}/contacts/${fromId}`).set(true);
            await database.ref(`users/${fromId}/contacts/${currentUser.uid}`).set(true);
            
            showToast('Chat request accepted', 'success');
            
            // Open the new chat
            setTimeout(() => {
                openChat(chatId, fromId);
            }, 500);
        } else {
            showToast('Chat request rejected', 'info');
        }
        
        // Reload requests
        loadRequests();
    } catch (error) {
        showToast('Error processing request', 'error');
    }
}

// ==================== CONTACTS MANAGEMENT ====================
async function loadContacts() {
    if (!currentUser) return;
    
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/contacts`).once('value');
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        
        contacts.clear();
        
        for (const contactId in snapshot.val()) {
            const userSnapshot = await database.ref(`users/${contactId}`).once('value');
            const userData = userSnapshot.val();
            
            if (userData) {
                contacts.set(contactId, userData);
                displayContact(contactId, userData);
            }
        }
        
        updateBadge('contacts', Object.keys(snapshot.val() || {}).length);
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function displayContact(contactId, userData) {
    const contactsList = document.getElementById('contactsList');
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-card';
    contactElement.innerHTML = `
        <div class="contact-info">
            <img src="${userData.profileUrl || 'default-avatar.png'}" alt="${userData.name}" class="contact-avatar">
            <div>
                <h3>${userData.name}</h3>
                <div class="contact-status">
                    <span class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></span>
                    <span>${userData.status === 'online' ? 'Online' : 'Last seen ' + formatTime(userData.lastSeen)}</span>
                </div>
            </div>
        </div>
        <div class="contact-actions">
            <button class="icon-btn" onclick="startChatWithContact('${contactId}')">
                <i class="fas fa-comment"></i>
            </button>
            <button class="icon-btn" onclick="viewContactProfile('${contactId}')">
                <i class="fas fa-user"></i>
            </button>
        </div>
    `;
    
    contactsList.appendChild(contactElement);
}

async function startChatWithContact(contactId) {
    try {
        // Check if chat already exists
        const userChatsSnapshot = await database.ref(`users/${currentUser.uid}/chats`).once('value');
        let existingChatId = null;
        
        for (const chatId in userChatsSnapshot.val()) {
            const chatSnapshot = await database.ref(`chats/${chatId}`).once('value');
            const chatData = chatSnapshot.val();
            
            if (chatData.participants.includes(contactId)) {
                existingChatId = chatId;
                break;
            }
        }
        
        if (existingChatId) {
            openChat(existingChatId, contactId);
        } else {
            // Create new chat
            const chatId = database.ref().child('chats').push().key;
            const chatData = {
                id: chatId,
                participants: [currentUser.uid, contactId],
                createdAt: Date.now(),
                lastMessage: null,
                unreadCount: {
                    [currentUser.uid]: 0,
                    [contactId]: 0
                }
            };
            
            await database.ref(`chats/${chatId}`).set(chatData);
            await database.ref(`users/${currentUser.uid}/chats/${chatId}`).set(true);
            await database.ref(`users/${contactId}/chats/${chatId}`).set(true);
            
            openChat(chatId, contactId);
        }
    } catch (error) {
        showToast('Error starting chat', 'error');
    }
}

// ==================== REAL-TIME LISTENERS ====================
function listenToMessages(chatId) {
    // Remove previous listeners
    stopListeningToMessages();
    
    // Listen for new messages
    database.ref(`chats/${chatId}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (message.senderId !== currentUser.uid) {
            displayMessage(message);
            
            // Mark as read
            markMessageAsRead(chatId, message.id);
            
            // Scroll to bottom
            setTimeout(() => {
                document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            }, 100);
        }
    });
}

function stopListeningToMessages() {
    if (currentChat) {
        database.ref(`chats/${currentChat.chatId}/messages`).off();
    }
}

function listenToPresence() {
    if (!currentUser) return;
    
    // Update user status
    database.ref(`users/${currentUser.uid}/status`).onDisconnect().set('offline');
    database.ref(`users/${currentUser.uid}/lastSeen`).onDisconnect().set(Date.now());
    
    // Listen for online users
    database.ref('users').on('value', (snapshot) => {
        onlineUsers.clear();
        snapshot.forEach(childSnapshot => {
            const user = childSnapshot.val();
            if (user.status === 'online') {
                onlineUsers.add(childSnapshot.key);
            }
        });
    });
}

// ==================== HELPER FUNCTIONS ====================
async function markMessagesAsRead(chatId) {
    if (!currentUser || !chatId) return;
    
    try {
        // Reset unread count
        await database.ref(`chats/${chatId}/unreadCount/${currentUser.uid}`).set(0);
        
        // Update message status
        const messagesSnapshot = await database.ref(`chats/${chatId}/messages`).orderByChild('senderId').equalTo(currentChat.otherUserId).once('value');
        
        const updates = {};
        messagesSnapshot.forEach(childSnapshot => {
            if (childSnapshot.val().status !== 'read') {
                updates[`chats/${chatId}/messages/${childSnapshot.key}/status`] = 'read';
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

async function markMessageAsRead(chatId, messageId) {
    try {
        await database.ref(`chats/${chatId}/messages/${messageId}/status`).set('read');
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

async function updateLastMessage(text, chatId) {
    try {
        await database.ref(`chats/${chatId}/lastMessage`).set({
            text: text,
            timestamp: Date.now(),
            senderId: currentUser.uid
        });
        
        // Update chat activity timestamp
        await database.ref(`chats/${chatId}/lastActivity`).set(Date.now());
    } catch (error) {
        console.error('Error updating last message:', error);
    }
}

function updateBadge(type, count) {
    const badge = document.getElementById(`${type}Badge`);
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ==================== MEDIA VIEWER FUNCTIONS ====================
function viewMedia(url, type, fileName = '', fileSize = '', locationData = null) {
    openModal('mediaViewerModal');
    
    const imageViewer = document.getElementById('mediaViewerImage');
    const videoViewer = document.getElementById('mediaViewerVideo');
    const locationViewer = document.getElementById('locationViewer');
    const documentViewer = document.getElementById('documentViewer');
    
    // Hide all viewers
    imageViewer.style.display = 'none';
    videoViewer.style.display = 'none';
    locationViewer.style.display = 'none';
    documentViewer.style.display = 'none';
    
    switch(type) {
        case 'image':
            imageViewer.src = url;
            imageViewer.style.display = 'block';
            document.getElementById('mediaViewerTitle').textContent = 'Photo';
            break;
            
        case 'video':
            videoViewer.src = url;
            videoViewer.style.display = 'block';
            document.getElementById('mediaViewerTitle').textContent = 'Video';
            break;
            
        case 'location':
            locationViewer.style.display = 'block';
            document.getElementById('mediaViewerTitle').textContent = 'Location';
            
            // Initialize map
            setTimeout(() => {
                if (locationData) {
                    const map = L.map('locationViewer').setView([locationData.lat, locationData.lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                    L.marker([locationData.lat, locationData.lng]).addTo(map)
                        .bindPopup(locationData.address)
                        .openPopup();
                }
            }, 100);
            break;
            
        case 'document':
            documentViewer.style.display = 'block';
            document.getElementById('mediaViewerTitle').textContent = 'Document';
            document.getElementById('documentName').textContent = fileName;
            document.getElementById('documentSize').textContent = formatFileSize(parseInt(fileSize));
            
            document.getElementById('downloadDocumentBtn').onclick = () => {
                window.open(url, '_blank');
            };
            break;
    }
}

function playVoiceMessage(url) {
    const audio = new Audio(url);
    audio.play();
}

// ==================== AUTH STATE MANAGEMENT ====================
function onAuthStateChanged(user) {
    const elements = getElements();
    
    if (user) {
        // User is signed in
        currentUser = user;
        
        // Load user data
        database.ref(`users/${user.uid}`).once('value').then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                // Update UI
                elements.userNameDisplay.textContent = userData.name;
                elements.userIdDisplay.textContent = userData.userId;
                elements.userProfilePic.src = userData.profileUrl || 'default-avatar.png';
                
                // Show app
                elements.loadingScreen.classList.add('hidden');
                elements.authContainer.style.display = 'none';
                elements.appContainer.style.display = 'flex';
                
                // Setup real-time listeners
                listenToPresence();
                updateUserStatus(user.uid, 'online');
                loadChats();
                loadZynes();
                loadGroups();
                loadRequests();
                loadContacts();
                
                // Start listening for incoming messages
                setupMessageListeners();
            }
        });
    } else {
        // User is signed out
        currentUser = null;
        
        // Show auth screen
        elements.loadingScreen.classList.add('hidden');
        elements.authContainer.style.display = 'flex';
        elements.appContainer.style.display = 'none';
        
        // Reset forms
        elements.welcomeScreen.style.display = 'block';
        elements.signupForm.style.display = 'none';
        elements.loginForm.style.display = 'none';
        
        // Clear form values
        document.getElementById('signupFormElement')?.reset();
        document.getElementById('loginFormElement')?.reset();
        document.getElementById('profilePreview').innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-user-circle"></i>
                <span>No image</span>
            </div>
        `;
        document.getElementById('removeProfileBtn').style.display = 'none';
    }
}

function setupMessageListeners() {
    if (!currentUser) return;
    
    // Listen for new chat requests
    database.ref(`users/${currentUser.uid}/pendingRequests`).on('child_added', () => {
        loadRequests();
        playNotificationSound();
        showToast('New chat request received', 'info');
    });
    
    // Listen for new messages in all chats
    database.ref(`users/${currentUser.uid}/chats`).on('value', (snapshot) => {
        const chatIds = snapshot.val() || {};
        
        for (const chatId in chatIds) {
            database.ref(`chats/${chatId}/lastMessage`).on('value', (msgSnapshot) => {
                if (msgSnapshot.exists() && !currentChat) {
                    loadChats();
                    playNotificationSound();
                    
                    const message = msgSnapshot.val();
                    if (message.senderId !== currentUser.uid) {
                        const userSnapshot = database.ref(`users/${message.senderId}`).once('value').then(userSnap => {
                            const userData = userSnap.val();
                            showToast(`New message from ${userData.name}`, 'info');
                        });
                    }
                }
            });
        }
    });
}

function playNotificationSound() {
    const audio = new Audio('notification.mp3');
    audio.play().catch(e => console.log('Audio play failed:', e));
}

async function logout() {
    try {
        if (currentUser) {
            await updateUserStatus(currentUser.uid, 'offline');
            await auth.signOut();
        }
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    // Initialize auth state listener
    auth.onAuthStateChanged(onAuthStateChanged);
    
    // Hide loading screen after 2 seconds max
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
    }, 2000);
});

// Global functions for HTML onclick handlers
window.viewMedia = viewMedia;
window.playVoiceMessage = playVoiceMessage;
window.startChatWithContact = startChatWithContact;
window.viewContactProfile = async (contactId) => {
    try {
        const userSnapshot = await database.ref(`users/${contactId}`).once('value');
        const userData = userSnapshot.val();
        
        document.getElementById('viewProfilePic').src = userData.profileUrl || 'default-avatar.png';
        document.getElementById('viewProfileName').textContent = userData.name;
        document.getElementById('viewProfileId').textContent = userData.userId;
        document.getElementById('viewProfileEmail').textContent = userData.email;
        document.getElementById('viewProfilePhone').textContent = userData.phone;
        
        openModal('viewProfileModal');
    } catch (error) {
        showToast('Error loading profile', 'error');
    }
};
