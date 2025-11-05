// Firebase configuration
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project-default-rtdb.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Global variables
let currentUser = null;
let currentChat = null;
let contacts = [];
let chats = [];
let pendingRequests = [];
let userStatus = 'online';

// DOM Elements
const screens = {
    splash: document.getElementById('splash-screen'),
    login: document.getElementById('login-screen'),
    register: document.getElementById('register-screen'),
    loading: document.getElementById('loading-screen')
};

const authForms = {
    login: document.getElementById('login-form'),
    register: document.getElementById('register-form')
};

const modals = {
    newChat: document.getElementById('new-chat-modal'),
    addContact: document.getElementById('add-contact-modal'),
    settings: document.getElementById('settings-modal'),
    forgotPassword: document.getElementById('forgot-password-modal')
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    initializeEventListeners();
    checkAuthState();
});

// Authentication Functions
function initializeAuth() {
    // Navigation between screens
    document.getElementById('go-to-login-btn').addEventListener('click', () => showScreen('login'));
    document.getElementById('go-to-register-btn').addEventListener('click', () => showScreen('register'));
    document.getElementById('go-to-login').addEventListener('click', () => showScreen('login'));
    document.getElementById('go-to-register').addEventListener('click', () => showScreen('register'));
    document.getElementById('back-to-splash').addEventListener('click', () => showScreen('splash'));
    document.getElementById('back-to-splash-2').addEventListener('click', () => showScreen('splash'));

    // Form submissions
    authForms.login.addEventListener('submit', handleLogin);
    authForms.register.addEventListener('submit', handleRegister);

    // Password toggle
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const passwordInput = this.parentElement.querySelector('input');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });

    // Forgot password
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        showModal('forgotPassword');
    });

    document.getElementById('send-reset-link').addEventListener('click', handlePasswordReset);
    document.getElementById('cancel-reset').addEventListener('click', () => hideModal('forgotPassword'));
    document.getElementById('close-forgot-password').addEventListener('click', () => hideModal('forgotPassword'));

    // Password strength checker
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
}

function initializeEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Modal controls
    document.getElementById('new-chat-btn').addEventListener('click', () => showModal('newChat'));
    document.getElementById('close-new-chat').addEventListener('click', () => hideModal('newChat'));
    document.getElementById('cancel-new-chat').addEventListener('click', () => hideModal('newChat'));

    document.getElementById('add-contact-btn').addEventListener('click', () => showModal('addContact'));
    document.getElementById('add-first-contact').addEventListener('click', () => showModal('addContact'));
    document.getElementById('close-add-contact').addEventListener('click', () => hideModal('addContact'));
    document.getElementById('cancel-add-contact').addEventListener('click', () => hideModal('addContact'));

    document.getElementById('settings-btn').addEventListener('click', () => showModal('settings'));
    document.getElementById('close-settings').addEventListener('click', () => hideModal('settings'));

    // User menu
    document.getElementById('user-menu-btn').addEventListener('click', toggleUserMenu);
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleUserMenuAction(action);
        });
    });

    // Chat functionality
    document.getElementById('back-to-chats').addEventListener('click', showChatsPanel);
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('input', handleTyping);
    document.getElementById('message-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Contact search
    document.getElementById('contact-uid').addEventListener('input', debounce(searchUserByUID, 500));
    document.getElementById('send-contact-request').addEventListener('click', sendContactRequest);

    // New chat search
    document.getElementById('new-chat-search').addEventListener('input', debounce(searchUserForChat, 500));

    // Start first chat
    document.getElementById('start-first-chat').addEventListener('click', () => showModal('newChat'));

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Copy user ID
    document.querySelector('.copy-id-btn').addEventListener('click', copyUserId);

    // Close modals when clicking backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Theme toggle
    document.getElementById('dark-mode-toggle').addEventListener('change', toggleTheme);
}

// Utility Functions
function showScreen(screenName) {
    Object.values(screens).forEach(screen => screen.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function showModal(modalName) {
    modals[modalName].classList.add('active');
}

function hideModal(modalName) {
    modals[modalName].classList.remove('active');
}

function switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Show corresponding panel
    document.querySelectorAll('.content-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(`${tabName}-panel`).classList.add('active');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-menu-dropdown');
    dropdown.classList.toggle('hidden');
}

function handleUserMenuAction(action) {
    switch(action) {
        case 'profile':
            showModal('settings');
            break;
        case 'settings':
            showModal('settings');
            break;
        case 'logout':
            handleLogout();
            break;
    }
    toggleUserMenu();
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

// Authentication Handlers
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const button = e.target.querySelector('.btn-text');
    const loading = e.target.querySelector('.btn-loading');

    try {
        button.textContent = 'Logging in...';
        loading.style.display = 'block';
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        
        showScreen('loading');
        await initializeUserData();
        
    } catch (error) {
        showNotification('Login Error', error.message, 'error');
    } finally {
        button.textContent = 'Login to Zynapse';
        loading.style.display = 'none';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const phone = document.getElementById('register-phone').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const button = e.target.querySelector('.btn-text');
    const loading = e.target.querySelector('.btn-loading');

    try {
        button.textContent = 'Creating Account...';
        loading.style.display = 'block';

        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Save user data to Firebase Database
        await database.ref('users/' + user.uid).set({
            name: name,
            phone: phone,
            email: email,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'online',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });

        currentUser = user;
        showScreen('loading');
        await initializeUserData();

    } catch (error) {
        showNotification('Registration Error', error.message, 'error');
    } finally {
        button.textContent = 'Create Zynapse Account';
        loading.style.display = 'none';
    }
}

async function handlePasswordReset() {
    const email = document.getElementById('reset-email').value;
    const button = document.getElementById('send-reset-link');
    const loading = button.querySelector('.btn-loading');

    try {
        button.querySelector('.btn-text').textContent = 'Sending...';
        loading.style.display = 'block';

        await auth.sendPasswordResetEmail(email);
        showNotification('Success', 'Password reset email sent!', 'success');
        hideModal('forgotPassword');

    } catch (error) {
        showNotification('Error', error.message, 'error');
    } finally {
        button.querySelector('.btn-text').textContent = 'Send Reset Link';
        loading.style.display = 'none';
    }
}

function handleLogout() {
    if (currentUser) {
        // Update user status to offline
        database.ref('users/' + currentUser.uid).update({
            status: 'offline',
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
    
    auth.signOut();
    currentUser = null;
    showScreen('splash');
    hideModal('settings');
}

// Password Validation
function checkPasswordStrength() {
    const password = document.getElementById('register-password').value;
    const strengthText = document.getElementById('password-strength-text');
    const strengthFill = document.getElementById('password-strength-fill');
    const requirements = document.querySelectorAll('.requirement');

    let strength = 0;
    const checks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
    };

    requirements.forEach(req => {
        const type = req.getAttribute('data-requirement');
        if (checks[type]) {
            req.classList.add('met');
            strength++;
        } else {
            req.classList.remove('met');
        }
    });

    const percentage = (strength / 5) * 100;
    strengthFill.style.width = percentage + '%';

    if (password.length === 0) {
        strengthText.textContent = 'Weak';
        strengthFill.style.background = 'var(--danger)';
    } else if (strength < 3) {
        strengthText.textContent = 'Weak';
        strengthFill.style.background = 'var(--danger)';
    } else if (strength < 5) {
        strengthText.textContent = 'Good';
        strengthFill.style.background = 'var(--warning)';
    } else {
        strengthText.textContent = 'Strong';
        strengthFill.style.background = 'var(--success)';
    }
}

function checkPasswordMatch() {
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const message = document.getElementById('password-match-message');

    if (confirmPassword.length === 0) {
        message.textContent = '';
        message.className = 'validation-message';
    } else if (password === confirmPassword) {
        message.textContent = 'Passwords match';
        message.className = 'validation-message success';
    } else {
        message.textContent = 'Passwords do not match';
        message.className = 'validation-message error';
    }
}

// User Search and Contact Management
async function searchUserByUID() {
    const uid = document.getElementById('contact-uid').value.trim();
    const resultsContainer = document.getElementById('search-results');
    const sendButton = document.getElementById('send-contact-request');

    if (uid.length === 0) {
        resultsContainer.classList.add('hidden');
        sendButton.disabled = true;
        return;
    }

    if (uid === currentUser.uid) {
        showResults('You cannot add yourself as a contact.', 'error');
        sendButton.disabled = true;
        return;
    }

    try {
        showResults('Searching...', 'loading');
        
        const userSnapshot = await database.ref('users/' + uid).once('value');
        
        if (!userSnapshot.exists()) {
            showResults('No user found with this UID.', 'error');
            sendButton.disabled = true;
            return;
        }

        const userData = userSnapshot.val();
        showUserResult(userData, uid);
        sendButton.disabled = false;

    } catch (error) {
        showResults('Error searching for user.', 'error');
        sendButton.disabled = true;
    }
}

async function searchUserForChat() {
    const uid = document.getElementById('new-chat-search').value.trim();
    const resultsContainer = document.getElementById('new-chat-results');

    if (uid.length === 0) {
        showChatResults('Enter a UID to search for users.', 'info');
        return;
    }

    if (uid === currentUser.uid) {
        showChatResults('You cannot chat with yourself.', 'error');
        return;
    }

    try {
        showChatResults('Searching...', 'loading');
        
        const userSnapshot = await database.ref('users/' + uid).once('value');
        
        if (!userSnapshot.exists()) {
            showChatResults('No user found with this UID.', 'error');
            return;
        }

        const userData = userSnapshot.val();
        showChatUserResult(userData, uid);

    } catch (error) {
        showChatResults('Error searching for user.', 'error');
    }
}

function showResults(message, type) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = `
        <div class="${type === 'error' ? 'error-text' : type === 'loading' ? 'loading-text' : 'no-results'}">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'loading' ? 'spinner fa-spin' : 'info-circle'}"></i>
            ${message}
        </div>
    `;
    resultsContainer.classList.remove('hidden');
}

function showChatResults(message, type) {
    const resultsContainer = document.getElementById('new-chat-results');
    resultsContainer.innerHTML = `
        <div class="${type === 'error' ? 'error-text' : type === 'loading' ? 'loading-text' : 'no-results'}">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'loading' ? 'spinner fa-spin' : 'info-circle'}"></i>
            ${message}
        </div>
    `;
}

function showUserResult(userData, uid) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = `
        <div class="search-result-item" data-uid="${uid}">
            <div class="search-result-avatar">
                <div class="avatar-medium">${userData.name.charAt(0).toUpperCase()}</div>
            </div>
            <div class="search-result-details">
                <div class="search-result-name">${userData.name}</div>
                <div class="search-result-info">
                    <span><i class="fas fa-phone"></i> ${userData.phone}</span>
                    <span><i class="fas fa-envelope"></i> ${userData.email}</span>
                </div>
                <div class="search-result-id">UID: ${uid}</div>
            </div>
        </div>
    `;
    resultsContainer.classList.remove('hidden');
}

function showChatUserResult(userData, uid) {
    const resultsContainer = document.getElementById('new-chat-results');
    resultsContainer.innerHTML = `
        <div class="search-result-item" data-uid="${uid}">
            <div class="search-result-avatar">
                <div class="avatar-medium">${userData.name.charAt(0).toUpperCase()}</div>
            </div>
            <div class="search-result-details">
                <div class="search-result-name">${userData.name}</div>
                <div class="search-result-info">
                    <span><i class="fas fa-phone"></i> ${userData.phone}</span>
                    <span><i class="fas fa-envelope"></i> ${userData.email}</span>
                </div>
                <div class="search-result-id">UID: ${uid}</div>
            </div>
            <button class="btn btn-primary btn-small start-chat-btn" data-uid="${uid}">
                <i class="fas fa-comment"></i> Chat
            </button>
        </div>
    `;

    // Add event listener to start chat button
    resultsContainer.querySelector('.start-chat-btn').addEventListener('click', function() {
        const targetUid = this.getAttribute('data-uid');
        startChat(targetUid, userData.name);
    });
}

async function sendContactRequest() {
    const uid = document.getElementById('contact-uid').value.trim();
    const message = document.getElementById('contact-message').value;
    const sendButton = document.getElementById('send-contact-request');
    const loading = sendButton.querySelector('.btn-loading');

    if (!uid) {
        showNotification('Error', 'Please search for a user first.', 'error');
        return;
    }

    try {
        sendButton.querySelector('.btn-text').textContent = 'Sending...';
        loading.style.display = 'block';
        sendButton.disabled = true;

        // Check if contact already exists
        const contactSnapshot = await database.ref('contacts/' + currentUser.uid + '/' + uid).once('value');
        if (contactSnapshot.exists()) {
            showNotification('Error', 'This user is already in your contacts.', 'error');
            return;
        }

        // Check if request already sent
        const requestSnapshot = await database.ref('contact_requests/' + uid + '/' + currentUser.uid).once('value');
        if (requestSnapshot.exists()) {
            showNotification('Error', 'Contact request already sent.', 'error');
            return;
        }

        // Send contact request
        await database.ref('contact_requests/' + uid + '/' + currentUser.uid).set({
            from: currentUser.uid,
            fromName: currentUser.displayName || 'User',
            message: message,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending'
        });

        showNotification('Success', 'Contact request sent!', 'success');
        hideModal('addContact');
        document.getElementById('contact-uid').value = '';
        document.getElementById('contact-message').value = '';

    } catch (error) {
        showNotification('Error', error.message, 'error');
    } finally {
        sendButton.querySelector('.btn-text').textContent = 'Send Contact Request';
        loading.style.display = 'none';
        sendButton.disabled = false;
    }
}

// Chat Functions
function startChat(targetUid, targetName) {
    currentChat = {
        uid: targetUid,
        name: targetName
    };

    // Show active chat area
    document.getElementById('active-chat').classList.remove('hidden');
    document.getElementById('chats-panel').classList.remove('active');
    
    // Update chat header
    document.getElementById('active-chat-name').textContent = targetName;
    document.getElementById('active-chat-avatar').textContent = targetName.charAt(0).toUpperCase();
    
    // Clear messages
    document.getElementById('messages').innerHTML = '';
    
    // Load chat history
    loadChatHistory(targetUid);
    
    // Set up real-time listener for new messages
    setupChatListener(targetUid);
    
    hideModal('newChat');
}

function showChatsPanel() {
    document.getElementById('active-chat').classList.add('hidden');
    document.getElementById('chats-panel').classList.add('active');
    currentChat = null;
}

async function loadChatHistory(targetUid) {
    const chatId = getChatId(currentUser.uid, targetUid);
    const messagesRef = database.ref('chats/' + chatId + '/messages');
    
    try {
        const snapshot = await messagesRef.orderByChild('timestamp').once('value');
        const messages = [];
        
        snapshot.forEach(childSnapshot => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        displayMessages(messages);
        
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

function setupChatListener(targetUid) {
    const chatId = getChatId(currentUser.uid, targetUid);
    const messagesRef = database.ref('chats/' + chatId + '/messages');
    
    messagesRef.orderByChild('timestamp').on('child_added', (snapshot) => {
        const message = {
            id: snapshot.key,
            ...snapshot.val()
        };
        
        // Only add if not already displayed
        if (!document.querySelector(`[data-message-id="${message.id}"]`)) {
            displayMessage(message);
        }
    });
}

function displayMessages(messages) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';
    
    messages.forEach(message => {
        displayMessage(message);
    });
    
    // Scroll to bottom
    scrollToBottom();
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('messages');
    const messageElement = createMessageElement(message);
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

function createMessageElement(message) {
    const isOwnMessage = message.senderId === currentUser.uid;
    const messageTime = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-group ${isOwnMessage ? 'own' : 'other'}`;
    messageDiv.setAttribute('data-message-id', message.id);
    
    if (!isOwnMessage) {
        messageDiv.innerHTML = `
            <div class="message-sender">${message.senderName}</div>
        `;
    }
    
    const messageContent = document.createElement('div');
    messageContent.className = `message ${isOwnMessage ? 'sent' : 'received'}`;
    messageContent.textContent = message.text;
    
    const timeSpan = document.createElement('div');
    timeSpan.className = 'message-time';
    timeSpan.textContent = messageTime;
    
    messageContent.appendChild(timeSpan);
    messageDiv.appendChild(messageContent);
    
    return messageDiv;
}

async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const text = messageInput.value.trim();
    
    if (!text || !currentChat) return;
    
    const chatId = getChatId(currentUser.uid, currentChat.uid);
    const messageData = {
        text: text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'User',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        type: 'text'
    };
    
    try {
        // Add message to database
        await database.ref('chats/' + chatId + '/messages').push(messageData);
        
        // Update last message in chats list
        await database.ref('user_chats/' + currentUser.uid + '/' + currentChat.uid).update({
            lastMessage: text,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            unreadCount: 0
        });
        
        await database.ref('user_chats/' + currentChat.uid + '/' + currentUser.uid).update({
            lastMessage: text,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            unreadCount: firebase.database.ServerValue.increment(1)
        });
        
        // Clear input
        messageInput.value = '';
        updateSendButton();
        
    } catch (error) {
        showNotification('Error', 'Failed to send message.', 'error');
    }
}

function handleTyping() {
    updateSendButton();
    
    if (!currentChat) return;
    
    // Implement typing indicators if needed
    // This is a basic implementation
}

function updateSendButton() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-btn');
    sendButton.disabled = messageInput.value.trim().length === 0;
}

function scrollToBottom() {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function getChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

// User Data Management
async function initializeUserData() {
    if (!currentUser) return;
    
    try {
        // Load user profile
        await loadUserProfile();
        
        // Load contacts
        await loadContacts();
        
        // Load chats
        await loadChats();
        
        // Load pending requests
        await loadPendingRequests();
        
        // Set up real-time listeners
        setupRealtimeListeners();
        
        // Update user status
        await updateUserStatus('online');
        
        // Show home screen
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error initializing user data:', error);
        showNotification('Error', 'Failed to load user data.', 'error');
    }
}

async function loadUserProfile() {
    const userSnapshot = await database.ref('users/' + currentUser.uid).once('value');
    const userData = userSnapshot.val();
    
    if (userData) {
        // Update UI with user data
        document.getElementById('user-avatar').textContent = userData.name.charAt(0).toUpperCase();
        document.getElementById('settings-name').textContent = userData.name;
        document.getElementById('settings-phone').textContent = userData.phone;
        document.getElementById('settings-email').textContent = userData.email;
        document.getElementById('settings-user-id').textContent = currentUser.uid;
        document.getElementById('settings-avatar').textContent = userData.name.charAt(0).toUpperCase();
    }
}

async function loadContacts() {
    const contactsSnapshot = await database.ref('contacts/' + currentUser.uid).once('value');
    const contactsList = document.getElementById('contact-list');
    
    contacts = [];
    contactsList.innerHTML = '';
    
    if (!contactsSnapshot.exists()) {
        contactsList.innerHTML = `
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
        document.getElementById('add-first-contact').addEventListener('click', () => showModal('addContact'));
        return;
    }
    
    contactsSnapshot.forEach(contactSnapshot => {
        const contactData = contactSnapshot.val();
        contacts.push({
            uid: contactSnapshot.key,
            ...contactData
        });
        
        const contactElement = createContactElement(contactData, contactSnapshot.key);
        contactsList.appendChild(contactElement);
    });
    
    document.getElementById('contacts-count').textContent = `${contacts.length} contacts`;
}

function createContactElement(contactData, uid) {
    const contactDiv = document.createElement('div');
    contactDiv.className = 'contact-item';
    contactDiv.setAttribute('data-uid', uid);
    
    contactDiv.innerHTML = `
        <div class="contact-avatar">
            <div class="avatar-wrapper">
                <div class="avatar-medium">${contactData.name.charAt(0).toUpperCase()}</div>
                <span class="presence-indicator online"></span>
            </div>
        </div>
        <div class="contact-details">
            <div class="contact-name">${contactData.name}</div>
            <div class="contact-status">${contactData.phone}</div>
        </div>
        <div class="contact-actions">
            <button class="btn btn-primary btn-small start-chat-from-contact" data-uid="${uid}">
                <i class="fas fa-comment"></i> Chat
            </button>
        </div>
    `;
    
    // Add event listener to chat button
    contactDiv.querySelector('.start-chat-from-contact').addEventListener('click', function() {
        startChat(uid, contactData.name);
    });
    
    return contactDiv;
}

async function loadChats() {
    const chatsSnapshot = await database.ref('user_chats/' + currentUser.uid).once('value');
    const chatList = document.getElementById('chat-list');
    
    chats = [];
    chatList.innerHTML = '';
    
    if (!chatsSnapshot.exists()) {
        return; // Empty state is already shown in HTML
    }
    
    chatsSnapshot.forEach(chatSnapshot => {
        const chatData = chatSnapshot.val();
        chats.push({
            uid: chatSnapshot.key,
            ...chatData
        });
        
        // We'll need to get the other user's data to display the chat properly
        // This is a simplified version
        const chatElement = createChatElement(chatData, chatSnapshot.key);
        chatList.appendChild(chatElement);
    });
    
    document.getElementById('chats-count').textContent = `${chats.length} chats`;
}

function createChatElement(chatData, uid) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    chatDiv.setAttribute('data-uid', uid);
    
    // This is a simplified version - you'd need to fetch the other user's data
    chatDiv.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-wrapper">
                <div class="avatar-medium">U</div>
                <span class="presence-indicator online"></span>
            </div>
        </div>
        <div class="chat-details">
            <div class="chat-name">User</div>
            <div class="chat-preview">${chatData.lastMessage || 'No messages yet'}</div>
        </div>
        <div class="chat-meta">
            <div class="chat-time">${formatTime(chatData.lastMessageTime)}</div>
            ${chatData.unreadCount > 0 ? `<div class="unread-badge">${chatData.unreadCount}</div>` : ''}
        </div>
    `;
    
    chatDiv.addEventListener('click', () => {
        // This would need to be implemented to start chat with this user
    });
    
    return chatDiv;
}

async function loadPendingRequests() {
    const requestsSnapshot = await database.ref('contact_requests/' + currentUser.uid).once('value');
    const requestList = document.getElementById('request-list');
    
    pendingRequests = [];
    requestList.innerHTML = '';
    
    if (!requestsSnapshot.exists()) {
        return; // Empty state is already shown in HTML
    }
    
    requestsSnapshot.forEach(requestSnapshot => {
        const requestData = requestSnapshot.val();
        if (requestData.status === 'pending') {
            pendingRequests.push({
                from: requestSnapshot.key,
                ...requestData
            });
            
            const requestElement = createRequestElement(requestData, requestSnapshot.key);
            requestList.appendChild(requestElement);
        }
    });
    
    document.getElementById('requests-count').textContent = `${pendingRequests.length} pending`;
    document.getElementById('requests-badge').textContent = pendingRequests.length;
}

function createRequestElement(requestData, fromUid) {
    const requestDiv = document.createElement('div');
    requestDiv.className = 'request-item';
    requestDiv.setAttribute('data-from', fromUid);
    
    requestDiv.innerHTML = `
        <div class="request-avatar">
            <div class="avatar-medium">${requestData.fromName.charAt(0).toUpperCase()}</div>
        </div>
        <div class="request-details">
            <div class="request-name">${requestData.fromName}</div>
            <div class="request-info">${requestData.message || 'Wants to connect with you'}</div>
            <div class="request-actions">
                <button class="request-btn accept" data-from="${fromUid}">Accept</button>
                <button class="request-btn decline" data-from="${fromUid}">Decline</button>
            </div>
        </div>
    `;
    
    // Add event listeners to action buttons
    requestDiv.querySelector('.request-btn.accept').addEventListener('click', function() {
        handleContactRequest(fromUid, 'accepted');
    });
    
    requestDiv.querySelector('.request-btn.decline').addEventListener('click', function() {
        handleContactRequest(fromUid, 'declined');
    });
    
    return requestDiv;
}

async function handleContactRequest(fromUid, action) {
    try {
        if (action === 'accepted') {
            // Add to contacts for both users
            const fromUserSnapshot = await database.ref('users/' + fromUid).once('value');
            const fromUserData = fromUserSnapshot.val();
            
            await database.ref('contacts/' + currentUser.uid + '/' + fromUid).set({
                name: fromUserData.name,
                phone: fromUserData.phone,
                email: fromUserData.email,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            const currentUserSnapshot = await database.ref('users/' + currentUser.uid).once('value');
            const currentUserData = currentUserSnapshot.val();
            
            await database.ref('contacts/' + fromUid + '/' + currentUser.uid).set({
                name: currentUserData.name,
                phone: currentUserData.phone,
                email: currentUserData.email,
                addedAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            showNotification('Success', 'Contact added successfully!', 'success');
        }
        
        // Update request status
        await database.ref('contact_requests/' + currentUser.uid + '/' + fromUid).update({
            status: action,
            processedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Reload requests and contacts
        await loadPendingRequests();
        await loadContacts();
        
    } catch (error) {
        showNotification('Error', 'Failed to process contact request.', 'error');
    }
}

// Real-time Listeners
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Listen for new contact requests
    database.ref('contact_requests/' + currentUser.uid).on('child_added', (snapshot) => {
        const requestData = snapshot.val();
        if (requestData.status === 'pending') {
            loadPendingRequests(); // Reload requests
        }
    });
    
    // Listen for contact updates
    database.ref('contacts/' + currentUser.uid).on('child_added', (snapshot) => {
        loadContacts(); // Reload contacts
    });
    
    // Listen for user status changes
    database.ref('users/' + currentUser.uid).on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            updateUIWithUserData(userData);
        }
    });
}

async function updateUserStatus(status) {
    if (!currentUser) return;
    
    userStatus = status;
    await database.ref('users/' + currentUser.uid).update({
        status: status,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

function updateUIWithUserData(userData) {
    document.getElementById('global-status').textContent = userData.status;
    document.getElementById('global-status').className = `status ${userData.status}`;
    
    const statusDot = document.querySelector('.status-dot');
    statusDot.className = `status-dot ${userData.status}`;
}

// Utility Functions
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // Less than 1 minute
        return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
        return Math.floor(diff / 60000) + 'm ago';
    } else if (diff < 86400000) { // Less than 1 day
        return Math.floor(diff / 3600000) + 'h ago';
    } else {
        return date.toLocaleDateString();
    }
}

function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-details">
                <div class="notification-header">
                    <div class="notification-title">
                        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                        ${title}
                    </div>
                    <button class="notification-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="notification-message">${message}</div>
            </div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    });
}

function toggleTheme() {
    const body = document.body;
    const isDark = body.classList.contains('dark-theme');
    
    if (isDark) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
    }
}

function copyUserId() {
    const userId = document.getElementById('settings-user-id').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        showNotification('Success', 'User ID copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Error', 'Failed to copy User ID.', 'error');
    });
}

// Auth State Listener
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            // User is signed in
            if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
                showScreen('loading');
                initializeUserData();
            }
        } else {
            // User is signed out
            currentUser = null;
            if (window.location.pathname.endsWith('home.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (currentUser) {
        if (document.hidden) {
            updateUserStatus('away');
        } else {
            updateUserStatus('online');
        }
    }
});

// Handle beforeunload
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        updateUserStatus('offline');
    }
});
