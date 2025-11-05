// Firebase configuration
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let currentChat = null;
let users = {};
let chats = {};
let contacts = {};
let requests = {};
let emojiPicker = null;

// DOM Elements
document.addEventListener('DOMContent', function() {
    // Navigation elements
    const splashScreen = document.getElementById('splash-screen');
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const appScreen = document.getElementById('app');
    
    // Buttons
    const goToLoginBtn = document.getElementById('go-to-login-btn');
    const goToRegisterBtn = document.getElementById('go-to-register-btn');
    const backToSplashBtn = document.getElementById('back-to-splash');
    const backToSplash2Btn = document.getElementById('back-to-splash-2');
    const goToRegisterLink = document.getElementById('go-to-register');
    const goToLoginLink = document.getElementById('go-to-login');
    
    // Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    // App elements
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettings = document.getElementById('close-settings');
    const logoutBtn = document.getElementById('logout-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const newChatModal = document.getElementById('new-chat-modal');
    const closeNewChat = document.getElementById('close-new-chat');
    const emojiBtn = document.getElementById('emoji-btn');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const backToChats = document.getElementById('back-to-chats');
    const emptyChat = document.getElementById('empty-chat');
    const activeChat = document.getElementById('active-chat');
    
    // Initialize the app
    initApp();
    
    // Navigation event listeners
    if (goToLoginBtn) goToLoginBtn.addEventListener('click', () => showScreen('login'));
    if (goToRegisterBtn) goToRegisterBtn.addEventListener('click', () => showScreen('register'));
    if (backToSplashBtn) backToSplashBtn.addEventListener('click', () => showScreen('splash'));
    if (backToSplash2Btn) backToSplash2Btn.addEventListener('click', () => showScreen('splash'));
    if (goToRegisterLink) goToRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register');
    });
    if (goToLoginLink) goToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('login');
    });
    
    // Form submissions
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (registerForm) registerForm.addEventListener('submit', handleRegister);
    
    // App functionality
    if (menuToggle) menuToggle.addEventListener('click', toggleSidebar);
    if (settingsBtn) settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    if (closeSettings) closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (newChatBtn) newChatBtn.addEventListener('click', () => newChatModal.classList.remove('hidden'));
    if (closeNewChat) closeNewChat.addEventListener('click', () => newChatModal.classList.add('hidden'));
    if (backToChats) backToChats.addEventListener('click', showChatList);
    if (emojiBtn) emojiBtn.addEventListener('click', toggleEmojiPicker);
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (messageInput) {
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        messageInput.addEventListener('input', () => {
            // Handle typing indicator
            if (currentChat && messageInput.value.trim()) {
                updateTypingStatus(true);
            } else {
                updateTypingStatus(false);
            }
            
            // Toggle send button state
            sendBtn.disabled = !messageInput.value.trim();
        });
    }
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // Password strength indicator
    const registerPassword = document.getElementById('register-password');
    const passwordStrengthFill = document.getElementById('password-strength-fill');
    const passwordStrengthText = document.getElementById('password-strength-text');
    
    if (registerPassword) {
        registerPassword.addEventListener('input', checkPasswordStrength);
    }
    
    // Password confirmation check
    const confirmPassword = document.getElementById('register-confirm-password');
    const passwordMatchMessage = document.getElementById('password-match-message');
    
    if (confirmPassword) {
        confirmPassword.addEventListener('input', checkPasswordMatch);
    }
    
    // Password visibility toggles
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Forgot password functionality
    const forgotPasswordLink = document.getElementById('forgot-password');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const closeForgotPassword = document.getElementById('close-forgot-password');
    const cancelReset = document.getElementById('cancel-reset');
    const sendResetLink = document.getElementById('send-reset-link');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordModal.classList.remove('hidden');
        });
    }
    
    if (closeForgotPassword) {
        closeForgotPassword.addEventListener('click', () => forgotPasswordModal.classList.add('hidden'));
    }
    
    if (cancelReset) {
        cancelReset.addEventListener('click', () => forgotPasswordModal.classList.add('hidden'));
    }
    
    if (sendResetLink) {
        sendResetLink.addEventListener('click', handlePasswordReset);
    }
    
    // Settings functionality
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }
    
    // Initialize emoji picker
    initEmojiPicker();
});

// Initialize the application
function initApp() {
    // Check if user is logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadApp();
        } else {
            showScreen('splash');
        }
    });
}

// Show specific screen
function showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Show the requested screen
    document.getElementById(`${screenName}-screen`).classList.remove('hidden');
}

// Handle user login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
    submitBtn.disabled = true;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login successful
            currentUser = userCredential.user;
            loadApp();
        })
        .catch((error) => {
            // Handle errors
            console.error('Login error:', error);
            alert(`Login failed: ${error.message}`);
            
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// Handle user registration
function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const username = document.getElementById('register-username').value;
    const phone = document.getElementById('register-phone').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    // Validate passwords match
    const confirmPassword = document.getElementById('register-confirm-password').value;
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // User created successfully
            currentUser = userCredential.user;
            
            // Save user data to database
            return database.ref('users/' + currentUser.uid).set({
                name: name,
                username: username,
                phone: phone,
                email: email,
                status: 'online',
                lastSeen: Date.now(),
                createdAt: Date.now()
            });
        })
        .then(() => {
            // Registration complete
            loadApp();
        })
        .catch((error) => {
            // Handle errors
            console.error('Registration error:', error);
            alert(`Registration failed: ${error.message}`);
            
            // Reset button
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
}

// Load the main application
function loadApp() {
    // If we're on the splash/login/register pages, redirect to home.html
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/')) {
        window.location.href = 'home.html';
        return;
    }
    
    // We're already on home.html, initialize the app
    showAppScreen();
    loadUserData();
    loadChats();
    loadContacts();
    loadRequests();
    
    // Set up real-time listeners
    setupRealtimeListeners();
}

// Show the main app screen
function showAppScreen() {
    document.getElementById('app').classList.remove('hidden');
}

// Load current user data
function loadUserData() {
    if (!currentUser) return;
    
    database.ref('users/' + currentUser.uid).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (userData) {
                // Update UI with user data
                document.getElementById('current-user-name').textContent = userData.name;
                document.getElementById('profile-name').textContent = userData.name;
                document.getElementById('profile-username').textContent = `@${userData.username}`;
                
                // Update status
                updateUserStatus('online');
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
        });
}

// Load user chats
function loadChats() {
    if (!currentUser) return;
    
    database.ref('userChats/' + currentUser.uid).on('value', snapshot => {
        const userChats = snapshot.val();
        const chatList = document.getElementById('chat-list');
        
        // Clear existing chats (except empty state)
        const existingChats = chatList.querySelectorAll('.chat-item:not(.empty-state)');
        existingChats.forEach(chat => chat.remove());
        
        if (!userChats) {
            // Show empty state
            chatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No chats yet</p>
                    <button class="btn btn-primary" id="start-first-chat">Start a chat</button>
                </div>
            `;
            
            document.getElementById('start-first-chat').addEventListener('click', () => {
                document.getElementById('new-chat-modal').classList.remove('hidden');
            });
            
            return;
        }
        
        // Hide empty state if it exists
        const emptyState = chatList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        // Add chats to the list
        Object.keys(userChats).forEach(chatId => {
            database.ref('chats/' + chatId).once('value')
                .then(chatSnapshot => {
                    const chatData = chatSnapshot.val();
                    if (chatData) {
                        addChatToList(chatId, chatData);
                    }
                });
        });
    });
}

// Add a chat to the chat list
function addChatToList(chatId, chatData) {
    const chatList = document.getElementById('chat-list');
    
    // Determine the other user in the chat
    const participants = Object.keys(chatData.participants || {});
    const otherUserId = participants.find(id => id !== currentUser.uid);
    
    if (!otherUserId) return;
    
    // Get user data
    database.ref('users/' + otherUserId).once('value')
        .then(userSnapshot => {
            const userData = userSnapshot.val();
            if (!userData) return;
            
            // Get last message
            const messages = chatData.messages ? Object.values(chatData.messages) : [];
            const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
            
            // Create chat item
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.setAttribute('data-chat-id', chatId);
            chatItem.setAttribute('data-user-id', otherUserId);
            
            const lastMessageTime = lastMessage ? formatTime(lastMessage.timestamp) : '';
            const lastMessageText = lastMessage ? 
                (lastMessage.type === 'text' ? lastMessage.content : 
                 lastMessage.type === 'image' ? '📷 Image' : 
                 lastMessage.type === 'file' ? '📎 File' : 'Message') : 
                'No messages yet';
            
            const unreadCount = chatData.unreadCount && chatData.unreadCount[currentUser.uid] ? 
                chatData.unreadCount[currentUser.uid] : 0;
            
            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <div class="avatar-placeholder">${userData.name.charAt(0).toUpperCase()}</div>
                    <span class="presence-indicator ${userData.status || 'offline'}"></span>
                </div>
                <div class="chat-details">
                    <div class="chat-name">${userData.name}</div>
                    <div class="chat-preview">${lastMessageText}</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${lastMessageTime}</div>
                    ${unreadCount > 0 ? `<div class="unread-badge">${unreadCount}</div>` : ''}
                </div>
            `;
            
            // Add click event to open chat
            chatItem.addEventListener('click', () => openChat(chatId, userData));
            
            chatList.appendChild(chatItem);
        });
}

// Load user contacts
function loadContacts() {
    if (!currentUser) return;
    
    database.ref('userContacts/' + currentUser.uid).on('value', snapshot => {
        const userContacts = snapshot.val();
        const contactList = document.getElementById('contact-list');
        
        // Clear existing contacts (except empty state)
        const existingContacts = contactList.querySelectorAll('.contact-item:not(.empty-state)');
        existingContacts.forEach(contact => contact.remove());
        
        if (!userContacts) {
            // Show empty state
            contactList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>No contacts yet</p>
                    <button class="btn btn-primary" id="add-first-contact">Add a contact</button>
                </div>
            `;
            
            document.getElementById('add-first-contact').addEventListener('click', () => {
                // Implement add contact functionality
                alert('Add contact feature coming soon!');
            });
            
            return;
        }
        
        // Hide empty state if it exists
        const emptyState = contactList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        // Add contacts to the list
        Object.keys(userContacts).forEach(contactId => {
            database.ref('users/' + contactId).once('value')
                .then(userSnapshot => {
                    const userData = userSnapshot.val();
                    if (userData) {
                        addContactToList(contactId, userData);
                    }
                });
        });
    });
}

// Add a contact to the contact list
function addContactToList(contactId, userData) {
    const contactList = document.getElementById('contact-list');
    
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item';
    contactItem.setAttribute('data-user-id', contactId);
    
    contactItem.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-placeholder">${userData.name.charAt(0).toUpperCase()}</div>
            <span class="presence-indicator ${userData.status || 'offline'}"></span>
        </div>
        <div class="contact-details">
            <div class="contact-name">${userData.name}</div>
            <div class="contact-status">${userData.status || 'offline'}</div>
        </div>
    `;
    
    // Add click event to start chat with contact
    contactItem.addEventListener('click', () => startChatWithUser(contactId, userData));
    
    contactList.appendChild(contactItem);
}

// Load contact requests
function loadRequests() {
    if (!currentUser) return;
    
    database.ref('contactRequests/' + currentUser.uid).on('value', snapshot => {
        const userRequests = snapshot.val();
        const requestList = document.getElementById('request-list');
        
        // Clear existing requests (except empty state)
        const existingRequests = requestList.querySelectorAll('.request-item:not(.empty-state)');
        existingRequests.forEach(request => request.remove());
        
        if (!userRequests) {
            // Show empty state
            requestList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <p>No pending requests</p>
                </div>
            `;
            return;
        }
        
        // Hide empty state if it exists
        const emptyState = requestList.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        // Add requests to the list
        Object.keys(userRequests).forEach(requestId => {
            if (userRequests[requestId].status === 'pending') {
                database.ref('users/' + requestId).once('value')
                    .then(userSnapshot => {
                        const userData = userSnapshot.val();
                        if (userData) {
                            addRequestToList(requestId, userData);
                        }
                    });
            }
        });
    });
}

// Add a request to the request list
function addRequestToList(requestId, userData) {
    const requestList = document.getElementById('request-list');
    
    const requestItem = document.createElement('div');
    requestItem.className = 'request-item';
    requestItem.setAttribute('data-user-id', requestId);
    
    requestItem.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-placeholder">${userData.name.charAt(0).toUpperCase()}</div>
        </div>
        <div class="request-details">
            <div class="request-name">${userData.name}</div>
            <div class="request-info">Wants to connect with you</div>
            <div class="request-actions">
                <button class="request-btn accept">Accept</button>
                <button class="request-btn decline">Decline</button>
            </div>
        </div>
    `;
    
    // Add event listeners for accept/decline buttons
    const acceptBtn = requestItem.querySelector('.request-btn.accept');
    const declineBtn = requestItem.querySelector('.request-btn.decline');
    
    acceptBtn.addEventListener('click', () => handleContactRequest(requestId, 'accepted'));
    declineBtn.addEventListener('click', () => handleContactRequest(requestId, 'declined'));
    
    requestList.appendChild(requestItem);
}

// Handle contact request response
function handleContactRequest(requestId, response) {
    if (!currentUser) return;
    
    // Update request status
    database.ref('contactRequests/' + currentUser.uid + '/' + requestId).update({
        status: response
    });
    
    // If accepted, add to contacts
    if (response === 'accepted') {
        database.ref('userContacts/' + currentUser.uid + '/' + requestId).set(true);
        database.ref('userContacts/' + requestId + '/' + currentUser.uid).set(true);
        
        // Remove from requests list
        const requestItem = document.querySelector(`.request-item[data-user-id="${requestId}"]`);
        if (requestItem) requestItem.remove();
    }
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Toggle sidebar on mobile
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// Open a chat
function openChat(chatId, userData) {
    currentChat = chatId;
    
    // Update UI
    document.getElementById('empty-chat').classList.add('hidden');
    document.getElementById('active-chat').classList.remove('hidden');
    
    // Update chat header
    document.getElementById('chat-with-name').textContent = userData.name;
    document.getElementById('chat-status').textContent = userData.status || 'offline';
    document.getElementById('chat-status').className = `status ${userData.status || 'offline'}`;
    
    // Load messages
    loadMessages(chatId);
    
    // Mark messages as read
    markMessagesAsRead(chatId);
    
    // On mobile, hide sidebar after selecting a chat
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
    }
}

// Show chat list (mobile)
function showChatList() {
    document.getElementById('empty-chat').classList.remove('hidden');
    document.getElementById('active-chat').classList.add('hidden');
    currentChat = null;
    
    // On mobile, show sidebar
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.add('active');
    }
}

// Load messages for a chat
function loadMessages(chatId) {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';
    
    database.ref('chats/' + chatId + '/messages').on('value', snapshot => {
        const messagesData = snapshot.val();
        
        if (!messagesData) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <p>No messages yet</p>
                    <p>Start the conversation!</p>
                </div>
            `;
            return;
        }
        
        // Convert to array and sort by timestamp
        const messages = Object.values(messagesData).sort((a, b) => a.timestamp - b.timestamp);
        
        // Clear messages (except empty state)
        const existingMessages = messagesContainer.querySelectorAll('.message-group');
        existingMessages.forEach(msg => msg.remove());
        
        // Hide empty state if it exists
        const emptyState = messagesContainer.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        
        // Group messages by date and sender
        let currentDate = null;
        let currentSender = null;
        let messageGroup = null;
        
        messages.forEach(message => {
            const messageDate = new Date(message.timestamp).toDateString();
            
            // Add date divider if date changed
            if (messageDate !== currentDate) {
                currentDate = messageDate;
                const dateDivider = document.createElement('div');
                dateDivider.className = 'date-divider';
                dateDivider.innerHTML = `<span>${formatDate(message.timestamp)}</span>`;
                messagesContainer.appendChild(dateDivider);
            }
            
            // Check if we need a new message group
            if (message.senderId !== currentSender) {
                currentSender = message.senderId;
                messageGroup = document.createElement('div');
                messageGroup.className = `message-group ${message.senderId === currentUser.uid ? 'own' : 'other'}`;
                messagesContainer.appendChild(messageGroup);
                
                // Add sender name for group messages (if not own)
                if (message.senderId !== currentUser.uid) {
                    const senderName = document.createElement('div');
                    senderName.className = 'message-sender';
                    senderName.textContent = getSenderName(message.senderId);
                    messageGroup.appendChild(senderName);
                }
            }
            
            // Add message to group
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
            
            let messageContent = '';
            if (message.type === 'text') {
                messageContent = message.content;
            } else if (message.type === 'image') {
                messageContent = `<div class="message-image"><img src="${message.content}" alt="Image"></div>`;
            } else if (message.type === 'file') {
                messageContent = `<div class="message-file"><i class="fas fa-file"></i> ${message.fileName || 'File'}</div>`;
            }
            
            messageElement.innerHTML = `
                <div class="message-content">${messageContent}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
            
            messageGroup.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Send a message
function sendMessage() {
    if (!currentChat || !messageInput.value.trim()) return;
    
    const messageContent = messageInput.value.trim();
    const timestamp = Date.now();
    
    // Create message object
    const message = {
        senderId: currentUser.uid,
        content: messageContent,
        type: 'text',
        timestamp: timestamp,
        status: 'sent'
    };
    
    // Add message to database
    const messageRef = database.ref('chats/' + currentChat + '/messages').push();
    messageRef.set(message)
        .then(() => {
            // Clear input
            messageInput.value = '';
            sendBtn.disabled = true;
            
            // Update last message in chat
            database.ref('chats/' + currentChat).update({
                lastMessage: messageContent,
                lastMessageTime: timestamp
            });
            
            // Update unread count for other participants
            updateUnreadCount(currentChat, currentUser.uid);
        })
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        });
}

// Start a new chat with a user
function startChatWithUser(userId, userData) {
    // Check if chat already exists
    database.ref('userChats/' + currentUser.uid).once('value')
        .then(snapshot => {
            const userChats = snapshot.val();
            let existingChatId = null;
            
            if (userChats) {
                Object.keys(userChats).forEach(chatId => {
                    database.ref('chats/' + chatId + '/participants').once('value')
                        .then(participantsSnapshot => {
                            const participants = participantsSnapshot.val();
                            if (participants && participants[userId]) {
                                existingChatId = chatId;
                            }
                        });
                });
            }
            
            if (existingChatId) {
                // Open existing chat
                openChat(existingChatId, userData);
            } else {
                // Create new chat
                createNewChat(userId, userData);
            }
        });
    
    // Close new chat modal
    document.getElementById('new-chat-modal').classList.add('hidden');
}

// Create a new chat
function createNewChat(userId, userData) {
    const chatId = database.ref('chats').push().key;
    
    // Create chat object
    const chatData = {
        id: chatId,
        participants: {
            [currentUser.uid]: true,
            [userId]: true
        },
        createdAt: Date.now(),
        lastMessage: '',
        lastMessageTime: Date.now()
    };
    
    // Save chat to database
    database.ref('chats/' + chatId).set(chatData)
        .then(() => {
            // Add chat to user's chat list
            database.ref('userChats/' + currentUser.uid + '/' + chatId).set(true);
            database.ref('userChats/' + userId + '/' + chatId).set(true);
            
            // Open the new chat
            openChat(chatId, userData);
        })
        .catch(error => {
            console.error('Error creating chat:', error);
            alert('Failed to create chat. Please try again.');
        });
}

// Update typing status
function updateTypingStatus(isTyping) {
    if (!currentChat) return;
    
    database.ref('chats/' + currentChat + '/typing/' + currentUser.uid).set(isTyping ? true : null);
}

// Mark messages as read
function markMessagesAsRead(chatId) {
    if (!currentUser || !chatId) return;
    
    // Reset unread count for this user in this chat
    database.ref('chats/' + chatId + '/unreadCount/' + currentUser.uid).set(0);
}

// Update unread count for other participants
function updateUnreadCount(chatId, senderId) {
    database.ref('chats/' + chatId + '/participants').once('value')
        .then(snapshot => {
            const participants = snapshot.val();
            if (participants) {
                Object.keys(participants).forEach(userId => {
                    if (userId !== senderId) {
                        // Increment unread count for this user
                        database.ref('chats/' + chatId + '/unreadCount/' + userId).transaction(current => {
                            return (current || 0) + 1;
                        });
                    }
                });
            }
        });
}

// Update user status
function updateUserStatus(status) {
    if (!currentUser) return;
    
    database.ref('users/' + currentUser.uid).update({
        status: status,
        lastSeen: Date.now()
    });
}

// Initialize emoji picker
function initEmojiPicker() {
    // This would initialize a proper emoji picker library
    // For now, we'll create a simple one
    
    const emojiPicker = document.getElementById('emoji-picker');
    if (!emojiPicker) return;
    
    // Simple emoji list
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];
    
    emojiPicker.innerHTML = '';
    
    emojis.forEach(emoji => {
        const emojiElement = document.createElement('span');
        emojiElement.textContent = emoji;
        emojiElement.style.cssText = 'font-size: 1.5rem; padding: 0.5rem; cursor: pointer;';
        emojiElement.addEventListener('click', () => {
            insertEmoji(emoji);
        });
        emojiPicker.appendChild(emojiElement);
    });
}

// Toggle emoji picker visibility
function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    emojiPicker.classList.toggle('hidden');
}

// Insert emoji into message input
function insertEmoji(emoji) {
    const messageInput = document.getElementById('message-input');
    const cursorPos = messageInput.selectionStart;
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);
    
    messageInput.value = textBefore + emoji + textAfter;
    messageInput.focus();
    messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
    
    // Close emoji picker
    document.getElementById('emoji-picker').classList.add('hidden');
}

// Handle logout
function handleLogout() {
    // Update status to offline
    updateUserStatus('offline');
    
    // Sign out
    auth.signOut()
        .then(() => {
            currentUser = null;
            window.location.href = 'index.html';
        })
        .catch(error => {
            console.error('Logout error:', error);
        });
}

// Handle password reset
function handlePasswordReset() {
    const email = document.getElementById('reset-email').value;
    
    if (!email) {
        alert('Please enter your email address');
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            alert('Password reset email sent! Check your inbox.');
            document.getElementById('forgot-password-modal').classList.add('hidden');
        })
        .catch(error => {
            console.error('Password reset error:', error);
            alert(`Failed to send reset email: ${error.message}`);
        });
}

// Check password strength
function checkPasswordStrength() {
    const password = document.getElementById('register-password').value;
    const strengthFill = document.getElementById('password-strength-fill');
    const strengthText = document.getElementById('password-strength-text');
    
    // Simple password strength calculation
    let strength = 0;
    let feedback = '';
    
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
    
    // Update UI
    strengthFill.className = 'strength-fill';
    
    if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.textContent = 'Weak';
        strengthText.style.color = 'var(--primary-red)';
    } else if (strength <= 4) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Medium';
        strengthText.style.color = 'var(--warning)';
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Strong';
        strengthText.style.color = 'var(--success)';
    }
}

// Check if passwords match
function checkPasswordMatch() {
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
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

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    // In a real app, you would save this preference
}

// Set up real-time listeners
function setupRealtimeListeners() {
    // Listen for typing indicators
    if (currentChat) {
        database.ref('chats/' + currentChat + '/typing').on('value', snapshot => {
            const typingData = snapshot.val();
            const typingIndicator = document.getElementById('typing-indicator');
            
            if (typingData) {
                const typingUsers = Object.keys(typingData).filter(id => id !== currentUser.uid);
                if (typingUsers.length > 0) {
                    // Get typing user names
                    Promise.all(typingUsers.map(userId => 
                        database.ref('users/' + userId).once('value')
                    )).then(userSnapshots => {
                        const names = userSnapshots.map(snapshot => snapshot.val().name);
                        document.getElementById('typing-user').textContent = 
                            `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing...`;
                        typingIndicator.classList.remove('hidden');
                    });
                } else {
                    typingIndicator.classList.add('hidden');
                }
            } else {
                typingIndicator.classList.add('hidden');
            }
        });
    }
    
    // Listen for new messages to show notifications
    database.ref('userChats/' + currentUser.uid).on('child_added', snapshot => {
        const chatId = snapshot.key;
        
        database.ref('chats/' + chatId + '/messages').limitToLast(1).on('child_added', messageSnapshot => {
            const message = messageSnapshot.val();
            
            // Don't show notification for own messages or if chat is active
            if (message.senderId !== currentUser.uid && chatId !== currentChat) {
                showMessageNotification(chatId, message);
            }
        });
    });
}

// Show message notification
function showMessageNotification(chatId, message) {
    // Get sender info
    database.ref('users/' + message.senderId).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (!userData) return;
            
            const notification = document.getElementById('message-notification');
            document.getElementById('notif-sender').textContent = userData.name;
            
            let messageText = '';
            if (message.type === 'text') {
                messageText = message.content;
            } else if (message.type === 'image') {
                messageText = 'Sent an image';
            } else if (message.type === 'file') {
                messageText = 'Sent a file';
            }
            
            document.getElementById('notif-message').textContent = messageText;
            notification.classList.remove('hidden');
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 5000);
            
            // Add click event to open the chat
            notification.addEventListener('click', () => {
                openChat(chatId, userData);
                notification.classList.add('hidden');
            });
            
            // Add close button event
            const closeBtn = notification.querySelector('.notification-close');
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notification.classList.add('hidden');
            });
        });
}

// Utility functions
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString();
    }
}

function getSenderName(senderId) {
    // This would typically fetch from a users cache
    // For now, return a placeholder
    return 'User';
}

// Handle page visibility change (to update status)
document.addEventListener('visibilitychange', function() {
    if (currentUser) {
        if (document.hidden) {
            updateUserStatus('away');
        } else {
            updateUserStatus('online');
        }
    }
});

// Handle beforeunload to set status to offline
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        // Use sendBeacon or similar for reliable status update
        updateUserStatus('offline');
    }
});
