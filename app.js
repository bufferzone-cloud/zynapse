// Firebase Configuration
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Global Variables
let currentUser = null;
let currentChat = null;
let contacts = [];
let chatRooms = [];
let pendingRequests = [];
let typingTimeout = null;
let onlineUsers = {};

// DOM Elements
const screens = {
    splash: document.getElementById('splash-screen'),
    login: document.getElementById('login-screen'),
    register: document.getElementById('register-screen'),
    loading: document.getElementById('loading-screen')
};

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        showScreen('home');
        initializeRealtimeListeners();
    } else {
        currentUser = null;
        showScreen('splash');
    }
});

// Screen Management
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the requested screen
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    } else if (screenName === 'home') {
        document.getElementById('app').style.display = 'flex';
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    }
}

// User Registration
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const username = document.getElementById('register-username').value;
    const phone = document.getElementById('register-phone').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    const submitBtn = document.querySelector('#register-form .btn');
    submitBtn.classList.add('loading');
    
    try {
        // Create user with Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Save user data to Firebase Database
        await database.ref('users/' + user.uid).set({
            name: name,
            username: username,
            phone: phone,
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
        
        showNotification('Account created successfully!', 'success');
        showScreen('loading');
        
        // Automatically log in the user
        setTimeout(() => {
            showScreen('home');
        }, 2000);
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.classList.remove('loading');
    }
});

// User Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const submitBtn = document.querySelector('#login-form .btn');
    submitBtn.classList.add('loading');
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showScreen('loading');
        
        setTimeout(() => {
            showScreen('home');
        }, 2000);
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.classList.remove('loading');
    }
});

// Load User Data
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // Load user profile
        const userSnapshot = await database.ref('users/' + currentUser.uid).once('value');
        const userData = userSnapshot.val();
        
        if (userData) {
            updateUserProfile(userData);
        }
        
        // Load contacts
        await loadContacts();
        
        // Load chat rooms
        await loadChatRooms();
        
        // Load pending requests
        await loadPendingRequests();
        
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Update User Profile in UI
function updateUserProfile(userData) {
    document.getElementById('user-avatar').textContent = userData.name.charAt(0).toUpperCase();
    document.getElementById('settings-avatar').textContent = userData.name.charAt(0).toUpperCase();
    document.getElementById('settings-name').textContent = userData.name;
    document.getElementById('settings-username').textContent = `@${userData.username}`;
    document.getElementById('settings-phone').textContent = userData.phone;
    document.getElementById('settings-email').textContent = userData.email;
    document.getElementById('settings-user-id').textContent = currentUser.uid;
}

// Load Contacts
async function loadContacts() {
    try {
        const contactsSnapshot = await database.ref('userContacts/' + currentUser.uid).once('value');
        contacts = [];
        
        if (contactsSnapshot.exists()) {
            const contactsData = contactsSnapshot.val();
            
            for (const contactId in contactsData) {
                const userSnapshot = await database.ref('users/' + contactId).once('value');
                const userData = userSnapshot.val();
                
                if (userData) {
                    contacts.push({
                        id: contactId,
                        ...userData
                    });
                }
            }
            
            renderContacts();
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Render Contacts
function renderContacts() {
    const contactList = document.getElementById('contact-list');
    const contactsCount = document.getElementById('contacts-count');
    
    contactsCount.textContent = `${contacts.length} contacts`;
    
    if (contacts.length === 0) {
        contactList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-user-friends"></i>
                </div>
                <h4>No contacts yet</h4>
                <p>Add contacts to start chatting and sharing</p>
                <button class="btn btn-primary btn-glow" id="add-first-contact">
                    <i class="fas fa-user-plus"></i>
                    Add Your First Contact
                </button>
            </div>
        `;
        return;
    }
    
    contactList.innerHTML = contacts.map(contact => `
        <div class="contact-item" data-user-id="${contact.id}">
            <div class="contact-avatar">
                <div class="avatar-wrapper">
                    <div class="avatar-small">${contact.name.charAt(0).toUpperCase()}</div>
                    <span class="presence-indicator ${contact.status || 'offline'}"></span>
                </div>
            </div>
            <div class="contact-details">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-status">${contact.status || 'Offline'}</div>
            </div>
            <div class="contact-actions">
                <button class="icon-btn start-chat-btn" title="Start Chat">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for starting chats
    document.querySelectorAll('.start-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const contactItem = btn.closest('.contact-item');
            const userId = contactItem.dataset.userId;
            startChatWithUser(userId);
        });
    });
    
    // Add event listeners for contact items
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('click', () => {
            const userId = item.dataset.userId;
            startChatWithUser(userId);
        });
    });
}

// Load Chat Rooms
async function loadChatRooms() {
    try {
        const chatRoomsSnapshot = await database.ref('userChats/' + currentUser.uid).once('value');
        chatRooms = [];
        
        if (chatRoomsSnapshot.exists()) {
            const chatRoomsData = chatRoomsSnapshot.val();
            
            for (const chatId in chatRoomsData) {
                const chatSnapshot = await database.ref('chats/' + chatId).once('value');
                const chatData = chatSnapshot.val();
                
                if (chatData) {
                    // Get the other user's ID
                    const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
                    const userSnapshot = await database.ref('users/' + otherUserId).once('value');
                    const userData = userSnapshot.val();
                    
                    if (userData) {
                        // Get last message
                        const messagesSnapshot = await database.ref('messages/' + chatId)
                            .orderByChild('timestamp')
                            .limitToLast(1)
                            .once('value');
                        
                        let lastMessage = 'No messages yet';
                        let lastMessageTime = chatData.createdAt;
                        
                        if (messagesSnapshot.exists()) {
                            const messages = messagesSnapshot.val();
                            const lastMessageKey = Object.keys(messages)[0];
                            lastMessage = messages[lastMessageKey].text;
                            lastMessageTime = messages[lastMessageKey].timestamp;
                        }
                        
                        chatRooms.push({
                            id: chatId,
                            otherUser: {
                                id: otherUserId,
                                ...userData
                            },
                            lastMessage: lastMessage,
                            lastMessageTime: lastMessageTime,
                            unreadCount: 0 // You can implement unread count logic
                        });
                    }
                }
            }
            
            // Sort by last message time
            chatRooms.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            renderChatRooms();
        }
    } catch (error) {
        console.error('Error loading chat rooms:', error);
    }
}

// Render Chat Rooms
function renderChatRooms() {
    const chatList = document.getElementById('chat-list');
    const chatsCount = document.getElementById('chats-count');
    
    chatsCount.textContent = `${chatRooms.length} chats`;
    
    if (chatRooms.length === 0) {
        chatList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h4>No conversations yet</h4>
                <p>Start a new chat to connect with friends and colleagues</p>
                <button class="btn btn-primary btn-glow" id="start-first-chat">
                    <i class="fas fa-plus"></i>
                    Start Your First Chat
                </button>
            </div>
        `;
        return;
    }
    
    chatList.innerHTML = chatRooms.map(chat => `
        <div class="chat-item" data-chat-id="${chat.id}" data-user-id="${chat.otherUser.id}">
            <div class="chat-avatar">
                <div class="avatar-wrapper">
                    <div class="avatar-small">${chat.otherUser.name.charAt(0).toUpperCase()}</div>
                    <span class="presence-indicator ${chat.otherUser.status || 'offline'}"></span>
                </div>
            </div>
            <div class="chat-details">
                <div class="chat-name">${chat.otherUser.name}</div>
                <div class="chat-preview">${chat.lastMessage}</div>
            </div>
            <div class="chat-meta">
                <div class="chat-time">${formatTime(chat.lastMessageTime)}</div>
                ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
            </div>
        </div>
    `).join('');
    
    // Add event listeners for chat items
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', () => {
            const chatId = item.dataset.chatId;
            const userId = item.dataset.userId;
            openChat(chatId, userId);
        });
    });
}

// Load Pending Requests
async function loadPendingRequests() {
    try {
        const requestsSnapshot = await database.ref('contactRequests/' + currentUser.uid).once('value');
        pendingRequests = [];
        
        if (requestsSnapshot.exists()) {
            const requestsData = requestsSnapshot.val();
            
            for (const requestId in requestsData) {
                const request = requestsData[requestId];
                if (request.status === 'pending') {
                    const userSnapshot = await database.ref('users/' + request.senderId).once('value');
                    const userData = userSnapshot.val();
                    
                    if (userData) {
                        pendingRequests.push({
                            id: requestId,
                            senderId: request.senderId,
                            senderName: userData.name,
                            senderEmail: userData.email,
                            message: request.message,
                            timestamp: request.timestamp
                        });
                    }
                }
            }
            
            renderPendingRequests();
        }
    } catch (error) {
        console.error('Error loading pending requests:', error);
    }
}

// Render Pending Requests
function renderPendingRequests() {
    const requestList = document.getElementById('request-list');
    const requestsCount = document.getElementById('requests-count');
    const requestsBadge = document.getElementById('requests-badge');
    
    requestsCount.textContent = `${pendingRequests.length} pending`;
    requestsBadge.textContent = pendingRequests.length;
    
    if (pendingRequests.length === 0) {
        requestList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <h4>No pending requests</h4>
                <p>When someone sends you a contact request, it will appear here</p>
            </div>
        `;
        return;
    }
    
    requestList.innerHTML = pendingRequests.map(request => `
        <div class="request-item" data-request-id="${request.id}" data-sender-id="${request.senderId}">
            <div class="request-avatar">
                <div class="avatar-small">${request.senderName.charAt(0).toUpperCase()}</div>
            </div>
            <div class="request-details">
                <div class="request-name">${request.senderName}</div>
                <div class="request-info">${request.senderEmail}</div>
                ${request.message ? `<div class="request-message">"${request.message}"</div>` : ''}
            </div>
            <div class="request-actions">
                <button class="request-btn accept" data-action="accept">Accept</button>
                <button class="request-btn decline" data-action="decline">Decline</button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners for request actions
    document.querySelectorAll('.request-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const requestItem = btn.closest('.request-item');
            const requestId = requestItem.dataset.requestId;
            const senderId = requestItem.dataset.senderId;
            const action = btn.dataset.action;
            
            handleContactRequest(requestId, senderId, action);
        });
    });
}

// Handle Contact Request
async function handleContactRequest(requestId, senderId, action) {
    try {
        if (action === 'accept') {
            // Add to contacts for both users
            await database.ref('userContacts/' + currentUser.uid + '/' + senderId).set(true);
            await database.ref('userContacts/' + senderId + '/' + currentUser.uid).set(true);
            
            // Update request status
            await database.ref('contactRequests/' + currentUser.uid + '/' + requestId).update({
                status: 'accepted',
                respondedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            showNotification('Contact request accepted', 'success');
            
            // Create a chat room
            await createChatRoom(senderId);
            
        } else if (action === 'decline') {
            // Update request status
            await database.ref('contactRequests/' + currentUser.uid + '/' + requestId).update({
                status: 'declined',
                respondedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            showNotification('Contact request declined', 'info');
        }
        
        // Reload requests
        await loadPendingRequests();
        
    } catch (error) {
        console.error('Error handling contact request:', error);
        showNotification('Error processing request', 'error');
    }
}

// Search User by UID
async function searchUserByUID(uid) {
    try {
        const userSnapshot = await database.ref('users/' + uid).once('value');
        
        if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            return {
                id: uid,
                ...userData
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error searching user:', error);
        return null;
    }
}

// Send Contact Request
async function sendContactRequest(receiverId, message = '') {
    try {
        const requestId = database.ref('contactRequests/' + receiverId).push().key;
        
        await database.ref('contactRequests/' + receiverId + '/' + requestId).set({
            senderId: currentUser.uid,
            message: message,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        showNotification('Contact request sent successfully', 'success');
        return true;
        
    } catch (error) {
        console.error('Error sending contact request:', error);
        showNotification('Error sending contact request', 'error');
        return false;
    }
}

// Create Chat Room
async function createChatRoom(otherUserId) {
    try {
        const chatId = database.ref('chats').push().key;
        
        await database.ref('chats/' + chatId).set({
            participants: [currentUser.uid, otherUserId],
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastMessage: '',
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Add chat to both users' chat lists
        await database.ref('userChats/' + currentUser.uid + '/' + chatId).set(true);
        await database.ref('userChats/' + otherUserId + '/' + chatId).set(true);
        
        return chatId;
        
    } catch (error) {
        console.error('Error creating chat room:', error);
        return null;
    }
}

// Start Chat with User
async function startChatWithUser(userId) {
    try {
        // Check if chat already exists
        let chatId = null;
        
        for (const chat of chatRooms) {
            if (chat.otherUser.id === userId) {
                chatId = chat.id;
                break;
            }
        }
        
        // If no existing chat, create one
        if (!chatId) {
            chatId = await createChatRoom(userId);
        }
        
        if (chatId) {
            openChat(chatId, userId);
        }
        
    } catch (error) {
        console.error('Error starting chat:', error);
        showNotification('Error starting chat', 'error');
    }
}

// Open Chat
async function openChat(chatId, userId) {
    try {
        currentChat = {
            id: chatId,
            userId: userId
        };
        
        // Load user data for chat header
        const userSnapshot = await database.ref('users/' + userId).once('value');
        const userData = userSnapshot.val();
        
        if (userData) {
            document.getElementById('active-chat-name').textContent = userData.name;
            document.getElementById('active-chat-avatar').textContent = userData.name.charAt(0).toUpperCase();
            document.getElementById('active-chat-status-text').textContent = userData.status || 'Offline';
            document.getElementById('active-chat-status').className = `presence-indicator ${userData.status || 'offline'}`;
            
            // Format last seen
            if (userData.lastSeen) {
                const lastSeen = new Date(userData.lastSeen);
                document.getElementById('active-chat-last-seen').textContent = `Last seen ${formatTime(lastSeen)}`;
            }
        }
        
        // Show active chat and hide panels
        document.getElementById('active-chat').classList.remove('hidden');
        document.querySelectorAll('.content-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Load messages
        await loadMessages(chatId);
        
        // Set up real-time message listener
        setupMessageListener(chatId);
        
    } catch (error) {
        console.error('Error opening chat:', error);
    }
}

// Load Messages
async function loadMessages(chatId) {
    try {
        const messagesSnapshot = await database.ref('messages/' + chatId)
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');
        
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        if (messagesSnapshot.exists()) {
            const messages = messagesSnapshot.val();
            const messageArray = Object.keys(messages).map(key => ({
                id: key,
                ...messages[key]
            }));
            
            // Sort by timestamp
            messageArray.sort((a, b) => a.timestamp - b.timestamp);
            
            // Render messages
            messageArray.forEach(message => {
                renderMessage(message);
            });
            
            // Scroll to bottom
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Render Message
function renderMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const isOwnMessage = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message-group ${isOwnMessage ? 'own' : 'other'}`;
    
    if (!isOwnMessage) {
        messageElement.innerHTML = `
            <div class="message-sender">${message.senderName}</div>
        `;
    }
    
    messageElement.innerHTML += `
        <div class="message ${isOwnMessage ? 'sent' : 'received'}">
            ${message.text}
            <div class="message-time">${formatTime(message.timestamp)}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Setup Real-time Message Listener
function setupMessageListener(chatId) {
    database.ref('messages/' + chatId)
        .orderByChild('timestamp')
        .limitToLast(1)
        .on('child_added', (snapshot) => {
            const message = snapshot.val();
            
            // Only render if not our own message (we already rendered it when sending)
            if (message.senderId !== currentUser.uid) {
                renderMessage({
                    id: snapshot.key,
                    ...message
                });
                
                // Scroll to bottom
                const messagesContainer = document.getElementById('messages');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                
                // Play notification sound
                playNotificationSound();
            }
        });
}

// Send Message
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    
    if (!text || !currentChat) return;
    
    try {
        const messageId = database.ref('messages/' + currentChat.id).push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        await database.ref('messages/' + currentChat.id + '/' + messageId).set({
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'User',
            timestamp: timestamp,
            type: 'text'
        });
        
        // Update chat last message
        await database.ref('chats/' + currentChat.id).update({
            lastMessage: text,
            lastMessageTime: timestamp
        });
        
        // Clear input
        messageInput.value = '';
        updateSendButtonState();
        
        // Render message immediately
        renderMessage({
            id: messageId,
            text: text,
            senderId: currentUser.uid,
            senderName: currentUser.displayName || 'User',
            timestamp: Date.now(),
            type: 'text'
        });
        
        // Scroll to bottom
        const messagesContainer = document.getElementById('messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error sending message:', error);
        showNotification('Error sending message', 'error');
    }
}

// Initialize Realtime Listeners
function initializeRealtimeListeners() {
    if (!currentUser) return;
    
    // Listen for online status changes
    database.ref('users/' + currentUser.uid).update({
        status: 'online',
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Set up presence system
    const userStatusRef = database.ref('users/' + currentUser.uid);
    const userStatusDatabaseRef = database.ref('.info/connected');
    
    userStatusDatabaseRef.on('value', (snapshot) => {
        if (snapshot.val() === false) return;
        
        userStatusRef.onDisconnect().update({
            status: 'offline',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    });
    
    // Listen for contact requests
    database.ref('contactRequests/' + currentUser.uid).on('value', (snapshot) => {
        loadPendingRequests();
    });
    
    // Listen for new contacts
    database.ref('userContacts/' + currentUser.uid).on('value', (snapshot) => {
        loadContacts();
    });
    
    // Listen for new chats
    database.ref('userChats/' + currentUser.uid).on('value', (snapshot) => {
        loadChatRooms();
    });
}

// Format Time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    } else if (diff < 604800000) { // Less than 1 week
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Update Send Button State
function updateSendButtonState() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (messageInput.value.trim()) {
        sendBtn.disabled = false;
    } else {
        sendBtn.disabled = true;
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    const notificationId = 'notification-' + Date.now();
    
    const notification = document.createElement('div');
    notification.id = notificationId;
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-details">
                <div class="notification-header">
                    <div class="notification-title">
                        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                    <button class="notification-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-message">${message}</div>
            </div>
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        const notif = document.getElementById(notificationId);
        if (notif) {
            notif.classList.add('fade-out');
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.parentNode.removeChild(notif);
                }
            }, 300);
        }
    }, 5000);
    
    // Close button event
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

// Play Notification Sound
function playNotificationSound() {
    // You can implement notification sounds here
    // For now, we'll just log to console
    console.log('Notification sound would play here');
}

// Event Listeners Setup
function setupEventListeners() {
    // Screen navigation
    document.getElementById('go-to-login-btn').addEventListener('click', () => showScreen('login'));
    document.getElementById('go-to-register-btn').addEventListener('click', () => showScreen('register'));
    document.getElementById('go-to-login').addEventListener('click', () => showScreen('login'));
    document.getElementById('go-to-register').addEventListener('click', () => showScreen('register'));
    document.getElementById('back-to-splash').addEventListener('click', () => showScreen('splash'));
    document.getElementById('back-to-splash-2').addEventListener('click', () => showScreen('splash'));
    
    // Password toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                passwordInput.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
    
    // Password strength checker
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Update active tab
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding panel
            document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));
            document.getElementById(`${tabName}-panel`).classList.add('active');
        });
    });
    
    // New chat button
    document.getElementById('new-chat-btn').addEventListener('click', () => {
        document.getElementById('new-chat-modal').classList.add('active');
    });
    
    // Add contact button
    document.getElementById('add-contact-btn').addEventListener('click', () => {
        document.getElementById('add-contact-modal').classList.add('active');
    });
    
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('active');
    });
    
    // Back to chats
    document.getElementById('back-to-chats').addEventListener('click', () => {
        document.getElementById('active-chat').classList.add('hidden');
        document.getElementById('chats-panel').classList.add('active');
        currentChat = null;
    });
    
    // Send message
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    
    // Message input events
    const messageInput = document.getElementById('message-input');
    messageInput.addEventListener('input', updateSendButtonState);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // User menu
    document.getElementById('user-menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('user-menu-dropdown');
        dropdown.classList.toggle('hidden');
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Contact search
    document.getElementById('contact-search').addEventListener('input', async function() {
        const uid = this.value.trim();
        
        if (uid.length < 5) {
            document.getElementById('search-results').classList.add('hidden');
            return;
        }
        
        const user = await searchUserByUID(uid);
        const resultsContainer = document.getElementById('search-results');
        
        if (user) {
            resultsContainer.innerHTML = `
                <div class="search-result-item">
                    <div class="search-result-avatar">
                        <div class="avatar-small">${user.name.charAt(0).toUpperCase()}</div>
                    </div>
                    <div class="search-result-details">
                        <div class="search-result-name">${user.name}</div>
                        <div class="search-result-info">
                            <span>${user.email}</span>
                            <span>•</span>
                            <span>${user.phone}</span>
                        </div>
                        <div class="search-result-id">UID: ${user.id}</div>
                    </div>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>No user found with this UID</p>
                </div>
            `;
            resultsContainer.classList.remove('hidden');
        }
    });
    
    // Send contact request
    document.getElementById('send-contact-request').addEventListener('click', async function() {
        const uid = document.getElementById('contact-search').value.trim();
        const message = document.getElementById('contact-message').value.trim();
        
        if (!uid) {
            showNotification('Please enter a user UID', 'error');
            return;
        }
        
        const user = await searchUserByUID(uid);
        
        if (!user) {
            showNotification('User not found', 'error');
            return;
        }
        
        if (user.id === currentUser.uid) {
            showNotification('You cannot send a request to yourself', 'error');
            return;
        }
        
        // Check if already contacts
        const isContact = contacts.some(contact => contact.id === user.id);
        if (isContact) {
            showNotification('This user is already in your contacts', 'info');
            return;
        }
        
        // Check if request already sent
        const existingRequest = pendingRequests.find(req => req.senderId === user.id);
        if (existingRequest) {
            showNotification('Contact request already sent to this user', 'info');
            return;
        }
        
        this.classList.add('loading');
        
        const success = await sendContactRequest(user.id, message);
        
        if (success) {
            document.getElementById('add-contact-modal').classList.remove('active');
            document.getElementById('contact-search').value = '';
            document.getElementById('contact-message').value = '';
            document.getElementById('search-results').classList.add('hidden');
        }
        
        this.classList.remove('loading');
    });
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        try {
            // Update status to offline
            if (currentUser) {
                await database.ref('users/' + currentUser.uid).update({
                    status: 'offline',
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            }
            
            await auth.signOut();
            showScreen('splash');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    });
}

// Password Strength Checker
function checkPasswordStrength() {
    const password = this.value;
    const strengthText = document.getElementById('password-strength-text');
    const strengthFill = document.getElementById('password-strength-fill');
    const requirements = document.querySelectorAll('.requirement');
    
    let strength = 0;
    let fillWidth = 0;
    
    // Reset requirements
    requirements.forEach(req => {
        req.classList.remove('met');
    });
    
    // Check length
    if (password.length >= 8) {
        strength += 20;
        fillWidth += 20;
        document.querySelector('[data-requirement="length"]').classList.add('met');
    }
    
    // Check uppercase
    if (/[A-Z]/.test(password)) {
        strength += 20;
        fillWidth += 20;
        document.querySelector('[data-requirement="uppercase"]').classList.add('met');
    }
    
    // Check lowercase
    if (/[a-z]/.test(password)) {
        strength += 20;
        fillWidth += 20;
        document.querySelector('[data-requirement="lowercase"]').classList.add('met');
    }
    
    // Check numbers
    if (/[0-9]/.test(password)) {
        strength += 20;
        fillWidth += 20;
        document.querySelector('[data-requirement="number"]').classList.add('met');
    }
    
    // Check special characters
    if (/[^A-Za-z0-9]/.test(password)) {
        strength += 20;
        fillWidth += 20;
        document.querySelector('[data-requirement="special"]').classList.add('met');
    }
    
    // Update UI
    strengthFill.style.width = `${fillWidth}%`;
    
    if (strength < 40) {
        strengthText.textContent = 'Weak';
        strengthText.style.color = 'var(--danger)';
        strengthFill.style.background = 'var(--danger)';
    } else if (strength < 80) {
        strengthText.textContent = 'Medium';
        strengthText.style.color = 'var(--warning)';
        strengthFill.style.background = 'var(--warning)';
    } else {
        strengthText.textContent = 'Strong';
        strengthText.style.color = 'var(--success)';
        strengthFill.style.background = 'var(--success)';
    }
}

// Password Match Checker
function checkPasswordMatch() {
    const password = document.getElementById('register-password').value;
    const confirmPassword = this.value;
    const messageElement = document.getElementById('password-match-message');
    
    if (!confirmPassword) {
        messageElement.textContent = '';
        messageElement.className = 'validation-message';
        return;
    }
    
    if (password === confirmPassword) {
        messageElement.textContent = 'Passwords match';
        messageElement.className = 'validation-message success';
    } else {
        messageElement.textContent = 'Passwords do not match';
        messageElement.className = 'validation-message error';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
            showScreen('home');
            initializeRealtimeListeners();
        } else {
            showScreen('splash');
        }
    });
});

// Export functions for global access (if needed)
window.Zynapse = {
    showScreen,
    showNotification,
    searchUserByUID,
    sendContactRequest,
    startChatWithUser
};
