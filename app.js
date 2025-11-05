// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBrVtSAOckpj8_fRA3-0kI7vAzOpXDUqxs",
    authDomain: "zynapse-68181.firebaseapp.com",
    databaseURL: "https://zynapse-68181-default-rtdb.firebaseio.com",
    projectId: "zynapse-68181",
    storageBucket: "zynapse-68181.firebasestorage.app",
    messagingSenderId: "841353050519",
    appId: "1:841353050519:web:271e2709246067bc506cd2",
    measurementId: "G-J38CL5MRPF"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// App state
let currentUser = null;
let currentChat = null;
let users = {};
let chats = {};
let contacts = {};
let chatRequests = {};
let typingTimeout = null;

// DOM Elements
const splashScreen = document.getElementById('splash-screen');
const loginScreen = document.getElementById('login-screen');
const registerScreen = document.getElementById('register-screen');
const app = document.getElementById('app');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');
const backToSplash = document.getElementById('back-to-splash');
const backToSplash2 = document.getElementById('back-to-splash-2');
const logoutBtn = document.getElementById('logout-btn');
const themeToggle = document.getElementById('theme-toggle');
const settingsBtn = document.getElementById('settings-btn');
const closeSettings = document.getElementById('close-settings');
const settingsModal = document.getElementById('settings-modal');
const saveSettings = document.getElementById('save-settings');
const userSearch = document.getElementById('user-search');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');
const chatList = document.getElementById('chat-list');
const contactList = document.getElementById('contact-list');
const requestList = document.getElementById('request-list');
const emptyChat = document.getElementById('empty-chat');
const activeChat = document.getElementById('active-chat');
const currentUserName = document.getElementById('current-user-name');
const currentUserStatus = document.getElementById('current-user-status');
const chatWithName = document.getElementById('chat-with-name');
const chatStatus = document.getElementById('chat-status');
const typingIndicator = document.getElementById('typing-indicator');
const typingUser = document.getElementById('typing-user');
const messageNotification = document.getElementById('message-notification');
const notifSender = document.getElementById('notif-sender');
const notifMessage = document.getElementById('notif-message');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);

loginForm.addEventListener('submit', handleLogin);
registerForm.addEventListener('submit', handleRegister);
goToRegister.addEventListener('click', () => showScreen(registerScreen));
goToLogin.addEventListener('click', () => showScreen(loginScreen));
backToSplash.addEventListener('click', () => showScreen(splashScreen));
backToSplash2.addEventListener('click', () => showScreen(splashScreen));
logoutBtn.addEventListener('click', handleLogout);
themeToggle.addEventListener('click', toggleTheme);
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
saveSettings.addEventListener('click', saveUserSettings);
userSearch.addEventListener('input', handleUserSearch);
messageInput.addEventListener('input', handleTyping);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});
sendBtn.addEventListener('click', sendMessage);

// Tab switching
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding tab content
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tab}-tab`) {
                content.classList.add('active');
            }
        });
    });
});

// Initialize the app
function initApp() {
    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            setupUserData();
            showScreen(app);
            loadUserData();
        } else {
            showScreen(splashScreen);
        }
    });
}

// Show specific screen
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

// Handle user login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login successful
            currentUser = userCredential.user;
            showScreen(app);
            loadUserData();
        })
        .catch((error) => {
            alert(`Login failed: ${error.message}`);
        });
}

// Handle user registration
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const phone = document.getElementById('register-phone').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Registration successful
            currentUser = userCredential.user;
            
            // Generate a unique user ID (using Firebase UID)
            const userId = currentUser.uid;
            
            // Save user data to database
            return database.ref('users/' + userId).set({
                name: name,
                phone: phone,
                email: email,
                userId: userId,
                status: 'online',
                lastSeen: Date.now()
            });
        })
        .then(() => {
            showScreen(app);
            loadUserData();
        })
        .catch((error) => {
            alert(`Registration failed: ${error.message}`);
        });
}

// Handle user logout
function handleLogout() {
    if (currentUser) {
        // Update user status to offline
        database.ref('users/' + currentUser.uid).update({
            status: 'offline',
            lastSeen: Date.now()
        });
    }
    
    auth.signOut()
        .then(() => {
            currentUser = null;
            showScreen(splashScreen);
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

// Setup user data after login
function setupUserData() {
    if (!currentUser) return;
    
    // Update user status to online
    database.ref('users/' + currentUser.uid).update({
        status: 'online',
        lastSeen: Date.now()
    });
    
    // Set up real-time listeners
    setupRealtimeListeners();
}

// Load user data from Firebase
function loadUserData() {
    if (!currentUser) return;
    
    // Load current user info
    database.ref('users/' + currentUser.uid).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                currentUserName.textContent = userData.name;
                currentUserStatus.textContent = userData.status;
                currentUserStatus.className = `status ${userData.status}`;
            }
        });
}

// Set up real-time Firebase listeners
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Listen for user data changes
    database.ref('users').on('value', snapshot => {
        users = snapshot.val() || {};
        renderContacts();
    });
    
    // Listen for chat requests
    database.ref('chatRequests').orderByChild('toUserId').equalTo(currentUser.uid)
        .on('value', snapshot => {
            chatRequests = snapshot.val() || {};
            renderChatRequests();
        });
    
    // Listen for user chats
    database.ref('userChats/' + currentUser.uid).on('value', snapshot => {
        chats = snapshot.val() || {};
        renderChats();
    });
}

// Handle user search
function handleUserSearch() {
    const searchTerm = userSearch.value.trim();
    
    if (searchTerm.length > 0) {
        // Search for user by ID
        database.ref('users').orderByChild('userId').equalTo(searchTerm)
            .once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                
                if (userData) {
                    const userId = Object.keys(userData)[0];
                    const user = userData[userId];
                    
                    if (userId !== currentUser.uid) {
                        // Check if chat request already exists
                        database.ref('chatRequests')
                            .orderByChild('fromUserId_toUserId')
                            .equalTo(currentUser.uid + '_' + userId)
                            .once('value')
                            .then(requestSnapshot => {
                                if (!requestSnapshot.exists()) {
                                    // Send chat request
                                    sendChatRequest(userId, user);
                                } else {
                                    alert('Chat request already sent to this user');
                                }
                            });
                    } else {
                        alert('Cannot send request to yourself');
                    }
                } else {
                    alert('User not found');
                }
                
                userSearch.value = '';
            });
    }
}

// Send chat request to another user
function sendChatRequest(toUserId, userData) {
    const requestId = database.ref('chatRequests').push().key;
    
    const requestData = {
        requestId: requestId,
        fromUserId: currentUser.uid,
        toUserId: toUserId,
        fromUserName: currentUserName.textContent,
        fromUserPhone: userData.phone, // This should be the current user's phone
        status: 'pending',
        timestamp: Date.now()
    };
    
    database.ref('chatRequests/' + requestId).set(requestData)
        .then(() => {
            alert('Chat request sent successfully');
        })
        .catch(error => {
            console.error('Error sending chat request:', error);
        });
}

// Render chat requests
function renderChatRequests() {
    requestList.innerHTML = '';
    
    Object.values(chatRequests).forEach(request => {
        if (request.status === 'pending') {
            const requestItem = document.createElement('div');
            requestItem.className = 'request-item';
            
            requestItem.innerHTML = `
                <div class="avatar-placeholder">${request.fromUserName.charAt(0)}</div>
                <div class="request-details">
                    <div class="request-name">${request.fromUserName}</div>
                    <div class="request-info">Phone: ${request.fromUserPhone}</div>
                </div>
                <div class="request-actions">
                    <button class="request-btn accept" data-request-id="${request.requestId}">Accept</button>
                    <button class="request-btn decline" data-request-id="${request.requestId}">Decline</button>
                </div>
            `;
            
            requestList.appendChild(requestItem);
        }
    });
    
    // Add event listeners to request buttons
    document.querySelectorAll('.request-btn.accept').forEach(btn => {
        btn.addEventListener('click', () => handleChatRequest(btn.getAttribute('data-request-id'), 'accepted'));
    });
    
    document.querySelectorAll('.request-btn.decline').forEach(btn => {
        btn.addEventListener('click', () => handleChatRequest(btn.getAttribute('data-request-id'), 'declined'));
    });
}

// Handle chat request (accept or decline)
function handleChatRequest(requestId, action) {
    if (action === 'accepted') {
        const request = chatRequests[requestId];
        
        // Create a chat between the two users
        const chatId = database.ref('chats').push().key;
        
        const chatData = {
            chatId: chatId,
            participants: {
                [currentUser.uid]: true,
                [request.fromUserId]: true
            },
            createdAt: Date.now(),
            lastMessage: '',
            lastMessageTime: Date.now()
        };
        
        // Save chat to database
        database.ref('chats/' + chatId).set(chatData)
            .then(() => {
                // Add chat to both users' chat lists
                database.ref('userChats/' + currentUser.uid + '/' + chatId).set(true);
                database.ref('userChats/' + request.fromUserId + '/' + chatId).set(true);
                
                // Update request status
                database.ref('chatRequests/' + requestId).update({
                    status: 'accepted'
                });
            });
    } else {
        // Update request status to declined
        database.ref('chatRequests/' + requestId).update({
            status: 'declined'
        });
    }
}

// Render user chats
function renderChats() {
    chatList.innerHTML = '';
    
    if (Object.keys(chats).length === 0) {
        chatList.innerHTML = '<div class="no-chats">No chats yet. Search for users to start chatting!</div>';
        return;
    }
    
    // Get chat details for each chat
    Object.keys(chats).forEach(chatId => {
        database.ref('chats/' + chatId).once('value')
            .then(snapshot => {
                const chatData = snapshot.val();
                
                if (chatData) {
                    // Find the other participant
                    const participants = Object.keys(chatData.participants);
                    const otherUserId = participants.find(id => id !== currentUser.uid);
                    
                    if (otherUserId) {
                        database.ref('users/' + otherUserId).once('value')
                            .then(userSnapshot => {
                                const userData = userSnapshot.val();
                                
                                if (userData) {
                                    const chatItem = document.createElement('div');
                                    chatItem.className = 'chat-item';
                                    chatItem.setAttribute('data-chat-id', chatId);
                                    chatItem.setAttribute('data-user-id', otherUserId);
                                    
                                    // Format last message time
                                    const lastMessageTime = chatData.lastMessageTime ? 
                                        formatTime(chatData.lastMessageTime) : '';
                                    
                                    chatItem.innerHTML = `
                                        <div class="chat-avatar">
                                            <div class="avatar-placeholder">${userData.name.charAt(0)}</div>
                                            <span class="presence-indicator ${userData.status}"></span>
                                        </div>
                                        <div class="chat-details">
                                            <div class="chat-name">${userData.name}</div>
                                            <div class="chat-preview">${chatData.lastMessage || 'Start a conversation'}</div>
                                        </div>
                                        <div class="chat-meta">
                                            <div class="chat-time">${lastMessageTime}</div>
                                            <div class="unread-badge hidden">1</div>
                                        </div>
                                    `;
                                    
                                    chatList.appendChild(chatItem);
                                    
                                    // Add click event to open chat
                                    chatItem.addEventListener('click', () => openChat(chatId, otherUserId, userData));
                                }
                            });
                    }
                }
            });
    });
}

// Render contacts
function renderContacts() {
    contactList.innerHTML = '';
    
    Object.keys(users).forEach(userId => {
        if (userId !== currentUser.uid) {
            const user = users[userId];
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item';
            
            contactItem.innerHTML = `
                <div class="chat-avatar">
                    <div class="avatar-placeholder">${user.name.charAt(0)}</div>
                    <span class="presence-indicator ${user.status}"></span>
                </div>
                <div class="contact-details">
                    <div class="contact-name">${user.name}</div>
                    <div class="contact-status">${user.status}</div>
                </div>
            `;
            
            contactList.appendChild(contactItem);
        }
    });
}

// Open a chat
function openChat(chatId, userId, userData) {
    currentChat = {
        chatId: chatId,
        userId: userId,
        userData: userData
    };
    
    // Update UI
    emptyChat.classList.add('hidden');
    activeChat.classList.remove('hidden');
    chatWithName.textContent = userData.name;
    chatStatus.textContent = userData.status;
    chatStatus.className = `status ${userData.status}`;
    
    // Load chat messages
    loadChatMessages(chatId);
    
    // Mark messages as read
    markMessagesAsRead(chatId);
    
    // Set up typing indicator listener
    setupTypingListener(chatId, userId);
}

// Load chat messages
function loadChatMessages(chatId) {
    messagesContainer.innerHTML = '';
    
    database.ref('messages/' + chatId).orderByChild('timestamp').on('value', snapshot => {
        const messages = snapshot.val() || {};
        messagesContainer.innerHTML = '';
        
        let lastDate = null;
        let lastSender = null;
        
        Object.values(messages).forEach(message => {
            // Group by date
            const messageDate = new Date(message.timestamp).toDateString();
            if (messageDate !== lastDate) {
                const dateDivider = document.createElement('div');
                dateDivider.className = 'date-divider';
                dateDivider.innerHTML = `<span>${formatDate(message.timestamp)}</span>`;
                messagesContainer.appendChild(dateDivider);
                lastDate = messageDate;
            }
            
            // Group by sender
            const isOwnMessage = message.senderId === currentUser.uid;
            const messageGroup = document.createElement('div');
            messageGroup.className = `message-group ${isOwnMessage ? 'own' : ''}`;
            
            const messageElement = document.createElement('div');
            messageElement.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
            
            messageElement.innerHTML = `
                <div class="message-text">${message.text}</div>
                <div class="message-time">
                    ${formatTime(message.timestamp)}
                    ${isOwnMessage ? `<span class="message-status">${getMessageStatus(message)}</span>` : ''}
                </div>
            `;
            
            messageGroup.appendChild(messageElement);
            messagesContainer.appendChild(messageGroup);
            
            lastSender = message.senderId;
        });
        
        // Scroll to bottom
        scrollToBottom();
    });
}

// Set up typing indicator listener
function setupTypingListener(chatId, userId) {
    database.ref('typing/' + chatId + '/' + userId).on('value', snapshot => {
        if (snapshot.exists()) {
            typingIndicator.classList.remove('hidden');
            typingUser.textContent = `${users[userId].name} is typing...`;
        } else {
            typingIndicator.classList.add('hidden');
        }
    });
}

// Handle typing indicator
function handleTyping() {
    if (!currentChat) return;
    
    // Set typing status
    database.ref('typing/' + currentChat.chatId + '/' + currentUser.uid).set(true);
    
    // Clear previous timeout
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    
    // Set timeout to clear typing status
    typingTimeout = setTimeout(() => {
        database.ref('typing/' + currentChat.chatId + '/' + currentUser.uid).remove();
    }, 1000);
}

// Send a message
function sendMessage() {
    if (!currentChat || !messageInput.value.trim()) return;
    
    const messageText = messageInput.value.trim();
    const timestamp = Date.now();
    const messageId = database.ref('messages/' + currentChat.chatId).push().key;
    
    const messageData = {
        messageId: messageId,
        text: messageText,
        senderId: currentUser.uid,
        timestamp: timestamp,
        status: 'sent'
    };
    
    // Save message to database
    database.ref('messages/' + currentChat.chatId + '/' + messageId).set(messageData)
        .then(() => {
            // Update chat last message
            database.ref('chats/' + currentChat.chatId).update({
                lastMessage: messageText,
                lastMessageTime: timestamp
            });
            
            // Clear input
            messageInput.value = '';
            
            // Clear typing status
            database.ref('typing/' + currentChat.chatId + '/' + currentUser.uid).remove();
        })
        .catch(error => {
            console.error('Error sending message:', error);
        });
}

// Mark messages as read
function markMessagesAsRead(chatId) {
    if (!currentUser || !chatId) return;
    
    database.ref('messages/' + chatId).once('value')
        .then(snapshot => {
            const messages = snapshot.val() || {};
            const updates = {};
            
            Object.keys(messages).forEach(messageId => {
                const message = messages[messageId];
                if (message.senderId !== currentUser.uid && message.status !== 'read') {
                    updates[messageId + '/status'] = 'read';
                }
            });
            
            if (Object.keys(updates).length > 0) {
                database.ref('messages/' + chatId).update(updates);
            }
        });
}

// Show message notification
function showMessageNotification(senderId, messageText) {
    if (document.hidden || !currentChat || currentChat.userId !== senderId) {
        const sender = users[senderId];
        if (sender) {
            notifSender.textContent = sender.name;
            notifMessage.textContent = messageText;
            messageNotification.classList.remove('hidden');
            
            // Play notification sound if enabled
            if (document.getElementById('message-sounds').checked) {
                playNotificationSound();
            }
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                messageNotification.classList.add('hidden');
            }, 5000);
        }
    }
}

// Play notification sound
function playNotificationSound() {
    // Create a simple notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const icon = themeToggle.querySelector('i');
    
    if (document.body.classList.contains('light-theme')) {
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'dark');
    }
}

// Save user settings
function saveUserSettings() {
    const theme = document.getElementById('theme-select').value;
    const status = document.getElementById('user-status').value;
    
    // Apply theme
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    } else {
        document.body.classList.remove('light-theme');
        themeToggle.querySelector('i').className = 'fas fa-moon';
    }
    
    // Update user status
    if (currentUser) {
        database.ref('users/' + currentUser.uid).update({
            status: status
        });
        
        currentUserStatus.textContent = status;
        currentUserStatus.className = `status ${status}`;
    }
    
    // Close modal
    settingsModal.classList.add('hidden');
}

// Load user settings
function loadUserSettings() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.getElementById('theme-select').value = savedTheme;
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    if (today.toDateString() === messageDate.toDateString()) {
        return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (yesterday.toDateString() === messageDate.toDateString()) {
        return 'Yesterday';
    }
    
    return messageDate.toLocaleDateString();
}

function getMessageStatus(message) {
    switch (message.status) {
        case 'sent': return '✓';
        case 'delivered': return '✓✓';
        case 'read': return '✓✓ (Read)';
        default: return '';
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Initialize settings when app loads
loadUserSettings();
