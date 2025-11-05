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

// Global variables
let currentUser = null;
let currentChat = null;
let users = {};
let chats = {};
let contacts = {};
let requests = {};
let onlineUsers = {};
let userStatus = 'online';
let notificationCount = 0;

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
function initializeApp() {
    // Check if user is logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            if (window.location.pathname.endsWith('index.html') || 
                window.location.pathname === '/' || 
                window.location.pathname.endsWith('/')) {
                window.location.href = 'home.html';
            } else {
                loadApp();
            }
        } else {
            if (window.location.pathname.endsWith('home.html')) {
                window.location.href = 'index.html';
            } else {
                setupAuthScreens();
            }
        }
    });
}

// Setup authentication screens
function setupAuthScreens() {
    // Navigation elements
    const splashScreen = document.getElementById('splash-screen');
    const loginScreen = document.getElementById('login-screen');
    const registerScreen = document.getElementById('register-screen');
    const loadingScreen = document.getElementById('loading-screen');
    
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
            showModal('forgot-password-modal');
        });
    }
    
    if (closeForgotPassword) {
        closeForgotPassword.addEventListener('click', () => hideModal('forgot-password-modal'));
    }
    
    if (cancelReset) {
        cancelReset.addEventListener('click', () => hideModal('forgot-password-modal'));
    }
    
    if (sendResetLink) {
        sendResetLink.addEventListener('click', handlePasswordReset);
    }
    
    showScreen('splash');
}

// Show specific screen
function showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the requested screen
    const screenElement = document.getElementById(`${screenName}-screen`);
    if (screenElement) {
        screenElement.classList.add('active');
    }
}

// Show modal
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

// Hide modal
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Handle user login
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (btnText) btnText.style.opacity = '0';
    if (btnLoading) btnLoading.style.display = 'block';
    submitBtn.disabled = true;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Login successful
            currentUser = userCredential.user;
            showScreen('loading');
            
            // Show success notification
            showNotification('success', 'Login Successful', 'Welcome back to Zynapse!', 3000);
        })
        .catch((error) => {
            // Handle errors
            console.error('Login error:', error);
            
            // Show error notification
            showNotification('error', 'Login Failed', error.message, 5000);
            
            // Reset button
            if (btnText) btnText.style.opacity = '1';
            if (btnLoading) btnLoading.style.display = 'none';
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
        showNotification('error', 'Registration Failed', 'Passwords do not match', 4000);
        return;
    }
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    if (btnText) btnText.style.opacity = '0';
    if (btnLoading) btnLoading.style.display = 'block';
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
                createdAt: Date.now(),
                profileComplete: true
            });
        })
        .then(() => {
            // Registration complete
            showScreen('loading');
            
            // Show success notification
            showNotification('success', 'Welcome to Zynapse!', 'Your account has been created successfully', 4000);
        })
        .catch((error) => {
            // Handle errors
            console.error('Registration error:', error);
            
            // Show error notification
            showNotification('error', 'Registration Failed', error.message, 5000);
            
            // Reset button
            if (btnText) btnText.style.opacity = '1';
            if (btnLoading) btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        });
}

// Load the main application
function loadApp() {
    setupAppEventListeners();
    loadUserData();
    setupRealtimeListeners();
    initializeEmojiPicker();
    
    // Update user status to online
    updateUserStatus('online');
    
    // Show welcome notification
    showNotification('success', 'Welcome Back!', 'You are now connected to Zynapse', 3000);
}

// Setup app event listeners
function setupAppEventListeners() {
    // Navigation buttons
    const chatsBtn = document.getElementById('chats-btn');
    const contactsBtn = document.getElementById('contacts-btn');
    const requestsBtn = document.getElementById('requests-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const userMenuBtn = document.getElementById('user-menu-btn');
    
    // Modal buttons
    const closeNewChat = document.getElementById('close-new-chat');
    const closeAddContact = document.getElementById('close-add-contact');
    const closeSettings = document.getElementById('close-settings');
    const cancelAddContact = document.getElementById('cancel-add-contact');
    
    // Form buttons
    const sendContactRequest = document.getElementById('send-contact-request');
    const addContactBtn = document.getElementById('add-contact-btn');
    const addFirstContact = document.getElementById('add-first-contact');
    const startFirstChat = document.getElementById('start-first-chat');
    
    // Chat buttons
    const backToChats = document.getElementById('back-to-chats');
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    const emojiBtn = document.getElementById('emoji-btn');
    
    // Settings buttons
    const logoutBtn = document.getElementById('logout-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const copyIdBtn = document.querySelector('.copy-id-btn');

    // Copy User ID functionality
    if (copyIdBtn) {
        copyIdBtn.addEventListener('click', copyUserIdToClipboard);
    }

    // Add contact search functionality
    const contactSearch = document.getElementById('contact-search');
    if (contactSearch) {
        let searchTimeout;
        contactSearch.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchUsers(this.value);
            }, 500);
        });
    }
    
    // Navigation
    if (chatsBtn) chatsBtn.addEventListener('click', () => switchPanel('chats'));
    if (contactsBtn) contactsBtn.addEventListener('click', () => switchPanel('contacts'));
    if (requestsBtn) requestsBtn.addEventListener('click', () => switchPanel('requests'));
    if (newChatBtn) newChatBtn.addEventListener('click', () => showModal('new-chat-modal'));
    if (settingsBtn) settingsBtn.addEventListener('click', () => showModal('settings-modal'));
    
    // User menu
    if (userMenuBtn) {
        userMenuBtn.addEventListener('click', toggleUserMenu);
    }
    
    // Modal controls
    if (closeNewChat) closeNewChat.addEventListener('click', () => hideModal('new-chat-modal'));
    if (closeAddContact) closeAddContact.addEventListener('click', () => hideModal('add-contact-modal'));
    if (closeSettings) closeSettings.addEventListener('click', () => hideModal('settings-modal'));
    if (cancelAddContact) cancelAddContact.addEventListener('click', () => hideModal('add-contact-modal'));
    
    // Contact management
    if (addContactBtn) addContactBtn.addEventListener('click', () => showModal('add-contact-modal'));
    if (addFirstContact) addFirstContact.addEventListener('click', () => showModal('add-contact-modal'));
    if (sendContactRequest) sendContactRequest.addEventListener('click', handleSendContactRequest);
    
    // Chat management
    if (startFirstChat) startFirstChat.addEventListener('click', () => showModal('new-chat-modal'));
    if (backToChats) backToChats.addEventListener('click', showChatList);
    
    // Message sending
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
            
            // Auto-resize textarea
            autoResizeTextarea(messageInput);
        });
    }
    
    // Emoji picker
    if (emojiBtn) emojiBtn.addEventListener('click', toggleEmojiPicker);
    
    // Settings
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (editProfileBtn) editProfileBtn.addEventListener('click', handleEditProfile);
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }
    
    // Status options
    const statusOptions = document.querySelectorAll('.status-option');
    statusOptions.forEach(option => {
        option.addEventListener('click', function() {
            const status = this.getAttribute('data-status');
            updateUserStatus(status);
            
            // Update UI
            statusOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update global status
            const globalStatus = document.getElementById('global-status');
            if (globalStatus) {
                globalStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                globalStatus.className = `status ${status}`;
            }
            
            // Show notification
            showNotification('info', 'Status Updated', `Your status is now set to ${status}`, 2000);
        });
    });
    
    // Settings tabs
    const settingsTabs = document.querySelectorAll('.settings-tab');
    settingsTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            
            // Update active tab
            settingsTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding content
            document.querySelectorAll('.settings-tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const tabContent = document.getElementById(`${tabName}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
    
    // Close modals when clicking outside
    document.addEventListener('click', function(e) {
        // User menu dropdown
        const userMenu = document.getElementById('user-menu-dropdown');
        if (userMenu && !userMenu.contains(e.target) && !e.target.closest('#user-menu-btn')) {
            userMenu.classList.add('hidden');
        }
        
        // Emoji picker
        const emojiPicker = document.getElementById('emoji-picker');
        if (emojiPicker && !emojiPicker.contains(e.target) && !e.target.closest('#emoji-btn')) {
            emojiPicker.classList.add('hidden');
        }
        
        // Modals
        if (e.target.classList.contains('modal-backdrop')) {
            hideAllModals();
        }
    });
    
    // Search functionality
    const chatsSearch = document.getElementById('chats-search');
    const contactsSearch = document.getElementById('contacts-search');
    const newChatSearch = document.getElementById('new-chat-search');
    
    if (chatsSearch) {
        chatsSearch.addEventListener('input', () => filterChats(chatsSearch.value));
    }
    
    if (contactsSearch) {
        contactsSearch.addEventListener('input', () => filterContacts(contactsSearch.value));
    }
    
    if (newChatSearch) {
        newChatSearch.addEventListener('input', () => filterUsers(newChatSearch.value));
    }
}

// Switch between panels
function switchPanel(panelName) {
    // Update nav buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const panelBtn = document.getElementById(`${panelName}-btn`);
    if (panelBtn) panelBtn.classList.add('active');
    
    // Update panels
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const panel = document.getElementById(`${panelName}-panel`);
    if (panel) panel.classList.add('active');
    
    // Hide active chat
    const activeChat = document.getElementById('active-chat');
    if (activeChat) activeChat.classList.remove('active');
}

// Toggle user menu
function toggleUserMenu() {
    const dropdown = document.getElementById('user-menu-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

// Load current user data - ENHANCED VERSION
function loadUserData() {
    if (!currentUser) return;
    
    // First, get user data from Firebase Authentication
    const user = auth.currentUser;
    
    if (user) {
        // Update basic info from Firebase Auth
        const userEmail = user.email;
        const userId = user.uid;
        
        // Now get additional user data from Realtime Database
        database.ref('users/' + currentUser.uid).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    // Update UI with user data
                    updateUserProfileUI(userData, userEmail, userId);
                } else {
                    // If no user data in database, create basic profile from auth data
                    const basicUserData = {
                        name: userEmail.split('@')[0], // Use email prefix as name
                        username: userEmail.split('@')[0],
                        email: userEmail,
                        phone: 'Not provided',
                        status: 'online'
                    };
                    updateUserProfileUI(basicUserData, userEmail, userId);
                }
            })
            .catch(error => {
                console.error('Error loading user data:', error);
                // Fallback to auth data only
                const userEmail = user.email;
                const userId = user.uid;
                const basicUserData = {
                    name: userEmail.split('@')[0],
                    username: userEmail.split('@')[0],
                    email: userEmail,
                    phone: 'Not provided',
                    status: 'online'
                };
                updateUserProfileUI(basicUserData, userEmail, userId);
                showNotification('error', 'Profile Error', 'Failed to load user data', 4000);
            });
    }
}

// Update user profile UI with data
function updateUserProfileUI(userData, userEmail, userId) {
    // Update avatar with first letter of name
    const userAvatar = document.getElementById('user-avatar');
    const settingsAvatar = document.getElementById('settings-avatar');
    
    if (userAvatar) {
        userAvatar.textContent = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
    }
    if (settingsAvatar) {
        settingsAvatar.textContent = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
    }
    
    // Update profile information in settings
    const settingsName = document.getElementById('settings-name');
    const settingsUsername = document.getElementById('settings-username');
    const settingsPhone = document.getElementById('settings-phone');
    const settingsEmail = document.getElementById('settings-email');
    const settingsUserId = document.getElementById('settings-user-id');
    
    if (settingsName) settingsName.textContent = userData.name || 'User';
    if (settingsUsername) settingsUsername.textContent = `@${userData.username || userEmail.split('@')[0]}`;
    if (settingsPhone) settingsPhone.textContent = userData.phone || 'Not provided';
    if (settingsEmail) settingsEmail.textContent = userData.email || userEmail;
    if (settingsUserId) settingsUserId.textContent = userId;
    
    // Update status
    userStatus = userData.status || 'online';
    const globalStatus = document.getElementById('global-status');
    if (globalStatus) {
        globalStatus.textContent = userStatus.charAt(0).toUpperCase() + userStatus.slice(1);
        globalStatus.className = `status ${userStatus}`;
    }
    
    // Update status options
    const statusOption = document.querySelector(`.status-option[data-status="${userStatus}"]`);
    if (statusOption) {
        document.querySelectorAll('.status-option').forEach(opt => opt.classList.remove('active'));
        statusOption.classList.add('active');
    }
}

// Copy User ID to clipboard
function copyUserIdToClipboard() {
    const userId = document.getElementById('settings-user-id');
    if (userId) {
        const userIdText = userId.textContent;
        
        navigator.clipboard.writeText(userIdText).then(() => {
            showNotification('success', 'Copied!', 'User ID copied to clipboard', 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showNotification('error', 'Copy Failed', 'Failed to copy User ID', 3000);
        });
    }
}

// Search for users by email, username, or ID
function searchUsers(searchTerm) {
    if (!searchTerm.trim()) {
        const searchResults = document.getElementById('search-results');
        if (searchResults) searchResults.classList.add('hidden');
        return;
    }

    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Searching users...</div>';
    searchResults.classList.remove('hidden');

    // Search by email
    database.ref('users').orderByChild('email').equalTo(searchTerm).once('value')
        .then(snapshot => {
            const usersData = snapshot.val();
            
            if (usersData) {
                displaySearchResults(usersData);
                return;
            }
            
            // If not found by email, search by username
            database.ref('users').orderByChild('username').equalTo(searchTerm.replace('@', '')).once('value')
                .then(usernameSnapshot => {
                    const usernameUsers = usernameSnapshot.val();
                    if (usernameUsers) {
                        displaySearchResults(usernameUsers);
                        return;
                    }
                    
                    // If still not found, search by user ID
                    database.ref('users/' + searchTerm).once('value')
                        .then(userSnapshot => {
                            if (userSnapshot.exists()) {
                                const userData = {};
                                userData[searchTerm] = userSnapshot.val();
                                displaySearchResults(userData);
                            } else {
                                // If still not found, search by name (partial match)
                                database.ref('users').orderByChild('name').startAt(searchTerm).endAt(searchTerm + '\uf8ff').once('value')
                                    .then(nameSnapshot => {
                                        const nameUsers = nameSnapshot.val();
                                        if (nameUsers) {
                                            displaySearchResults(nameUsers);
                                        } else {
                                            searchResults.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>No user found with that information</p></div>';
                                        }
                                    });
                            }
                        });
                });
        })
        .catch(error => {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="error-text"><i class="fas fa-exclamation-triangle"></i><p>Search failed. Please try again.</p></div>';
        });
}

// Display search results
function displaySearchResults(usersData) {
    const searchResults = document.getElementById('search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    Object.keys(usersData).forEach(userId => {
        const userData = usersData[userId];
        
        // Don't show current user in search results
        if (userId === currentUser.uid) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'search-result-item';
        userItem.innerHTML = `
            <div class="search-result-avatar">
                <div class="avatar-small">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
            </div>
            <div class="search-result-details">
                <div class="search-result-name">${userData.name || 'Unknown User'}</div>
                <div class="search-result-info">
                    <span class="search-result-username">@${userData.username || 'user'}</span>
                    <span class="search-result-email">${userData.email || 'No email'}</span>
                </div>
                <div class="search-result-id">ID: ${userId}</div>
            </div>
            <button class="btn btn-primary btn-small select-user" data-user-id="${userId}">Select</button>
        `;
        
        searchResults.appendChild(userItem);
    });
    
    // Add event listeners to select buttons
    document.querySelectorAll('.select-user').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const searchInput = document.getElementById('contact-search');
            
            // Get user data and populate search field
            database.ref('users/' + userId).once('value')
                .then(snapshot => {
                    const userData = snapshot.val();
                    if (searchInput) {
                        searchInput.value = userData.email || userData.username || userId;
                    }
                    searchResults.classList.add('hidden');
                    
                    // Show confirmation
                    showNotification('success', 'User Selected', `${userData.name || 'User'} has been selected`, 2000);
                });
        });
    });
    
    if (searchResults.innerHTML === '') {
        searchResults.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>No user found with that information</p></div>';
    }
}

// Setup real-time listeners
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Listen for user chats
    database.ref('userChats/' + currentUser.uid).on('value', snapshot => {
        const userChats = snapshot.val();
        const chatList = document.getElementById('chat-list');
        const chatsCount = document.getElementById('chats-count');
        
        if (chatList) {
            // Clear existing chats (except empty state)
            const existingChats = chatList.querySelectorAll('.chat-item:not(.empty-state)');
            existingChats.forEach(chat => chat.remove());
        }
        
        if (!userChats) {
            // Show empty state if no chats
            if (chatList && !chatList.querySelector('.empty-state')) {
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
                const startFirstChatBtn = document.getElementById('start-first-chat');
                if (startFirstChatBtn) {
                    startFirstChatBtn.addEventListener('click', () => showModal('new-chat-modal'));
                }
            }
            if (chatsCount) chatsCount.textContent = '0 chats';
            return;
        }
        
        // Hide empty state if it exists
        if (chatList) {
            const emptyState = chatList.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
        }
        
        const chatIds = Object.keys(userChats);
        if (chatsCount) chatsCount.textContent = `${chatIds.length} ${chatIds.length === 1 ? 'chat' : 'chats'}`;
        
        // Add chats to the list
        chatIds.forEach(chatId => {
            database.ref('chats/' + chatId).once('value')
                .then(chatSnapshot => {
                    const chatData = chatSnapshot.val();
                    if (chatData) {
                        addChatToList(chatId, chatData);
                    }
                });
        });
    });
    
    // Listen for contacts
    database.ref('userContacts/' + currentUser.uid).on('value', snapshot => {
        const userContacts = snapshot.val();
        const contactList = document.getElementById('contact-list');
        const contactsCount = document.getElementById('contacts-count');
        
        if (contactList) {
            // Clear existing contacts (except empty state)
            const existingContacts = contactList.querySelectorAll('.contact-item:not(.empty-state)');
            existingContacts.forEach(contact => contact.remove());
        }
        
        if (!userContacts) {
            // Show empty state if no contacts
            if (contactList && !contactList.querySelector('.empty-state')) {
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
                const addFirstContactBtn = document.getElementById('add-first-contact');
                if (addFirstContactBtn) {
                    addFirstContactBtn.addEventListener('click', () => showModal('add-contact-modal'));
                }
            }
            if (contactsCount) contactsCount.textContent = '0 contacts';
            return;
        }
        
        // Hide empty state if it exists
        if (contactList) {
            const emptyState = contactList.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
        }
        
        const contactIds = Object.keys(userContacts);
        if (contactsCount) contactsCount.textContent = `${contactIds.length} ${contactIds.length === 1 ? 'contact' : 'contacts'}`;
        
        // Add contacts to the list
        contactIds.forEach(contactId => {
            database.ref('users/' + contactId).once('value')
                .then(userSnapshot => {
                    const userData = userSnapshot.val();
                    if (userData) {
                        addContactToList(contactId, userData);
                    }
                });
        });
    });
    
    // Listen for contact requests
    database.ref('contactRequests/' + currentUser.uid).on('value', snapshot => {
        const userRequests = snapshot.val();
        const requestList = document.getElementById('request-list');
        const requestsBadge = document.getElementById('requests-badge');
        const requestsCount = document.getElementById('requests-count');
        
        if (requestList) {
            // Clear existing requests (except empty state)
            const existingRequests = requestList.querySelectorAll('.request-item:not(.empty-state)');
            existingRequests.forEach(request => request.remove());
        }
        
        let pendingCount = 0;
        
        if (!userRequests) {
            // Show empty state if no requests
            if (requestList && !requestList.querySelector('.empty-state')) {
                requestList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-user-plus"></i>
                        </div>
                        <h4>No pending requests</h4>
                        <p>When someone sends you a contact request, it will appear here</p>
                    </div>
                `;
            }
            // Update badge and count
            if (requestsBadge) requestsBadge.classList.add('hidden');
            if (requestsCount) requestsCount.textContent = '0 pending';
            return;
        }
        
        // Hide empty state if it exists
        if (requestList) {
            const emptyState = requestList.querySelector('.empty-state');
            if (emptyState) emptyState.remove();
        }
        
        // Add requests to the list and count pending ones
        Object.keys(userRequests).forEach(requestId => {
            if (userRequests[requestId].status === 'pending') {
                pendingCount++;
                database.ref('users/' + requestId).once('value')
                    .then(userSnapshot => {
                        const userData = userSnapshot.val();
                        if (userData) {
                            addRequestToList(requestId, userData, userRequests[requestId]);
                        }
                    });
            }
        });
        
        // Update badge and count
        if (pendingCount > 0) {
            if (requestsBadge) {
                requestsBadge.textContent = pendingCount;
                requestsBadge.classList.remove('hidden');
            }
            if (requestsCount) requestsCount.textContent = `${pendingCount} pending`;
            
            // Show notification for new requests
            if (pendingCount > Object.keys(requests).length) {
                showNotification('info', 'New Contact Request', `You have ${pendingCount} pending contact requests`, 4000);
            }
        } else {
            if (requestsBadge) requestsBadge.classList.add('hidden');
            if (requestsCount) requestsCount.textContent = '0 pending';
        }
        
        requests = userRequests;
    });
    
    // Listen for online users
    database.ref('users').orderByChild('status').equalTo('online').on('value', snapshot => {
        const onlineUsersData = snapshot.val();
        const onlineUsersList = document.getElementById('online-users-list');
        const onlineCount = document.getElementById('online-count');
        const onlineUsersPanel = document.getElementById('online-users');
        
        if (onlineUsersList) onlineUsersList.innerHTML = '';
        
        if (onlineUsersData) {
            let count = 0;
            Object.keys(onlineUsersData).forEach(userId => {
                if (userId !== currentUser.uid) {
                    count++;
                    const userData = onlineUsersData[userId];
                    const onlineUser = document.createElement('div');
                    onlineUser.className = 'online-user';
                    onlineUser.innerHTML = `
                        <div class="online-user-avatar">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
                        <span class="online-user-name">${userData.name || 'Unknown User'}</span>
                    `;
                    onlineUser.addEventListener('click', () => startChatWithUser(userId, userData));
                    if (onlineUsersList) onlineUsersList.appendChild(onlineUser);
                }
            });
            
            if (onlineCount) onlineCount.textContent = count;
            if (onlineUsersPanel) {
                if (count > 0) {
                    onlineUsersPanel.classList.remove('hidden');
                } else {
                    onlineUsersPanel.classList.add('hidden');
                }
            }
        } else {
            if (onlineUsersPanel) onlineUsersPanel.classList.add('hidden');
        }
    });
    
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

// Add a chat to the chat list
function addChatToList(chatId, chatData) {
    const chatList = document.getElementById('chat-list');
    if (!chatList) return;
    
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
                    <div class="avatar-small">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
                    <span class="presence-indicator ${userData.status || 'offline'}"></span>
                </div>
                <div class="chat-details">
                    <div class="chat-name">${userData.name || 'Unknown User'}</div>
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

// Add a contact to the contact list
function addContactToList(contactId, userData) {
    const contactList = document.getElementById('contact-list');
    if (!contactList) return;
    
    const contactItem = document.createElement('div');
    contactItem.className = 'contact-item';
    contactItem.setAttribute('data-user-id', contactId);
    
    contactItem.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-small">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
            <span class="presence-indicator ${userData.status || 'offline'}"></span>
        </div>
        <div class="contact-details">
            <div class="contact-name">${userData.name || 'Unknown User'}</div>
            <div class="contact-status">${userData.status || 'offline'}</div>
        </div>
    `;
    
    // Add click event to start chat with contact
    contactItem.addEventListener('click', () => startChatWithUser(contactId, userData));
    
    contactList.appendChild(contactItem);
}

// Add a request to the request list
function addRequestToList(requestId, userData, requestData) {
    const requestList = document.getElementById('request-list');
    if (!requestList) return;
    
    const requestItem = document.createElement('div');
    requestItem.className = 'request-item';
    requestItem.setAttribute('data-user-id', requestId);
    
    requestItem.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-small">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
        </div>
        <div class="request-details">
            <div class="request-name">${userData.name || 'Unknown User'}</div>
            <div class="request-info">${requestData.message || 'Wants to connect with you'}</div>
            <div class="request-actions">
                <button class="request-btn accept">Accept</button>
                <button class="request-btn decline">Decline</button>
            </div>
        </div>
    `;
    
    // Add event listeners for accept/decline buttons
    const acceptBtn = requestItem.querySelector('.request-btn.accept');
    const declineBtn = requestItem.querySelector('.request-btn.decline');
    
    if (acceptBtn) acceptBtn.addEventListener('click', () => handleContactRequest(requestId, 'accepted'));
    if (declineBtn) declineBtn.addEventListener('click', () => handleContactRequest(requestId, 'declined'));
    
    requestList.appendChild(requestItem);
}

// Load users for new chat modal
function loadUsersForNewChat() {
    if (!currentUser) return;
    
    database.ref('users').once('value')
        .then(snapshot => {
            const usersData = snapshot.val();
            const userListModal = document.getElementById('user-list-modal');
            if (!userListModal) return;
            
            userListModal.innerHTML = '';
            
            if (!usersData) {
                userListModal.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
                return;
            }
            
            Object.keys(usersData).forEach(userId => {
                if (userId !== currentUser.uid) {
                    const userData = usersData[userId];
                    const userItem = document.createElement('div');
                    userItem.className = 'contact-item';
                    userItem.innerHTML = `
                        <div class="chat-avatar">
                            <div class="avatar-small">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
                            <span class="presence-indicator ${userData.status || 'offline'}"></span>
                        </div>
                        <div class="contact-details">
                            <div class="contact-name">${userData.name || 'Unknown User'}</div>
                            <div class="contact-status">${userData.status || 'offline'}</div>
                        </div>
                    `;
                    
                    userItem.addEventListener('click', () => {
                        startChatWithUser(userId, userData);
                        hideModal('new-chat-modal');
                    });
                    
                    userListModal.appendChild(userItem);
                }
            });
        });
}

// Filter chats based on search input
function filterChats(searchTerm) {
    const chatItems = document.querySelectorAll('.chat-item');
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    chatItems.forEach(item => {
        const chatName = item.querySelector('.chat-name').textContent.toLowerCase();
        const chatPreview = item.querySelector('.chat-preview').textContent.toLowerCase();
        
        if (chatName.includes(lowerSearchTerm) || chatPreview.includes(lowerSearchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Filter contacts based on search input
function filterContacts(searchTerm) {
    const contactItems = document.querySelectorAll('.contact-item');
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    contactItems.forEach(item => {
        const contactName = item.querySelector('.contact-name').textContent.toLowerCase();
        const contactStatus = item.querySelector('.contact-status').textContent.toLowerCase();
        
        if (contactName.includes(lowerSearchTerm) || contactStatus.includes(lowerSearchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Filter users based on search input
function filterUsers(searchTerm) {
    const userItems = document.querySelectorAll('#user-list-modal .contact-item');
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    userItems.forEach(item => {
        const userName = item.querySelector('.contact-name').textContent.toLowerCase();
        const userStatus = item.querySelector('.contact-status').textContent.toLowerCase();
        
        if (userName.includes(lowerSearchTerm) || userStatus.includes(lowerSearchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Open a chat
function openChat(chatId, userData) {
    currentChat = chatId;
    
    // Update UI
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    const activeChat = document.getElementById('active-chat');
    if (activeChat) activeChat.classList.add('active');
    
    // Update chat header
    const activeChatName = document.getElementById('active-chat-name');
    const activeChatStatusText = document.getElementById('active-chat-status-text');
    const activeChatStatus = document.getElementById('active-chat-status');
    const activeChatAvatar = document.getElementById('active-chat-avatar');
    
    if (activeChatName) activeChatName.textContent = userData.name || 'Unknown User';
    if (activeChatStatusText) {
        activeChatStatusText.textContent = userData.status || 'offline';
        activeChatStatusText.className = `status ${userData.status || 'offline'}`;
    }
    if (activeChatStatus) activeChatStatus.className = `presence-indicator ${userData.status || 'offline'}`;
    if (activeChatAvatar) activeChatAvatar.textContent = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
    
    // Load messages
    loadMessages(chatId);
    
    // Mark messages as read
    markMessagesAsRead(chatId);
}

// Show chat list
function showChatList() {
    const activeChat = document.getElementById('active-chat');
    if (activeChat) activeChat.classList.remove('active');
    switchPanel('chats');
    currentChat = null;
}

// Load messages for a chat
function loadMessages(chatId) {
    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;
    
    messagesContainer.innerHTML = '';
    
    database.ref('chats/' + chatId + '/messages').on('value', snapshot => {
        const messagesData = snapshot.val();
        
        if (!messagesData) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-comment-slash"></i>
                    </div>
                    <h4>No messages yet</h4>
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
                messageContent = `<div class="message-image">📷 Image</div>`;
            } else if (message.type === 'file') {
                messageContent = `<div class="message-file">📎 File</div>`;
            }
            
            messageElement.innerHTML = `
                <div class="message-content">${messageContent}</div>
                <div class="message-time">${formatTime(message.timestamp)}</div>
            `;
            
            if (messageGroup) messageGroup.appendChild(messageElement);
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Listen for typing indicators
    database.ref('chats/' + currentChat + '/typing').on('value', snapshot => {
        const typingData = snapshot.val();
        const typingIndicator = document.getElementById('typing-indicator');
        
        if (typingData && typingIndicator) {
            const typingUsers = Object.keys(typingData).filter(id => id !== currentUser.uid);
            if (typingUsers.length > 0) {
                // Get typing user names
                Promise.all(typingUsers.map(userId => 
                    database.ref('users/' + userId).once('value')
                )).then(userSnapshots => {
                    const names = userSnapshots.map(snapshot => {
                        const userData = snapshot.val();
                        return userData ? userData.name : 'Unknown User';
                    });
                    const typingUser = document.getElementById('typing-user');
                    if (typingUser) {
                        typingUser.textContent = 
                            `${names.join(', ')} ${names.length > 1 ? 'are' : 'is'} typing...`;
                    }
                    typingIndicator.classList.remove('hidden');
                });
            } else {
                typingIndicator.classList.add('hidden');
            }
        } else if (typingIndicator) {
            typingIndicator.classList.add('hidden');
        }
    });
}

// Send a message
function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (!currentChat || !messageInput || !messageInput.value.trim()) return;
    
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
            if (sendBtn) sendBtn.disabled = true;
            
            // Update last message in chat
            database.ref('chats/' + currentChat).update({
                lastMessage: messageContent,
                lastMessageTime: timestamp
            });
            
            // Update unread count for other participants
            updateUnreadCount(currentChat, currentUser.uid);
            
            // Stop typing indicator
            updateTypingStatus(false);
        })
        .catch(error => {
            console.error('Error sending message:', error);
            showNotification('error', 'Message Failed', 'Failed to send message. Please try again.', 4000);
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
            
            // Show success notification
            showNotification('success', 'Chat Started', `You started a chat with ${userData.name || 'User'}`, 3000);
        })
        .catch(error => {
            console.error('Error creating chat:', error);
            showNotification('error', 'Chat Failed', 'Failed to create chat. Please try again.', 4000);
        });
}

// Handle contact request
function handleSendContactRequest() {
    const searchInput = document.getElementById('contact-search');
    const message = document.getElementById('contact-message');
    
    if (!searchInput || !searchInput.value) {
        showNotification('error', 'Missing Information', 'Please enter an email address or User ID', 4000);
        return;
    }
    
    // Find user by email or ID
    let searchPromise;
    
    if (searchInput.value.includes('@')) {
        // Search by email
        searchPromise = database.ref('users').orderByChild('email').equalTo(searchInput.value).once('value');
    } else {
        // Search by user ID
        searchPromise = database.ref('users/' + searchInput.value).once('value')
            .then(snapshot => {
                const result = {};
                if (snapshot.exists()) {
                    result[searchInput.value] = snapshot.val();
                }
                return { val: () => result };
            });
    }
    
    searchPromise.then(snapshot => {
        const usersData = snapshot.val();
        if (!usersData || Object.keys(usersData).length === 0) {
            showNotification('error', 'User Not Found', 'No user found with that email address or User ID', 4000);
            return;
        }
        
        const userId = Object.keys(usersData)[0];
        const userData = usersData[userId];
        
        if (userId === currentUser.uid) {
            showNotification('error', 'Invalid Request', 'You cannot send a contact request to yourself', 4000);
            return;
        }
        
        // Check if contact already exists
        database.ref('userContacts/' + currentUser.uid + '/' + userId).once('value')
            .then(contactSnapshot => {
                if (contactSnapshot.exists()) {
                    showNotification('info', 'Already Connected', 'This user is already in your contacts', 4000);
                    return;
                }
                
                // Check if request already exists
                database.ref('contactRequests/' + userId + '/' + currentUser.uid).once('value')
                    .then(requestSnapshot => {
                        if (requestSnapshot.exists()) {
                            const requestData = requestSnapshot.val();
                            if (requestData.status === 'pending') {
                                showNotification('info', 'Request Pending', 'You have already sent a pending request to this user', 4000);
                                return;
                            }
                        }
                        
                        // Create contact request
                        const requestData = {
                            from: currentUser.uid,
                            fromName: currentUser.displayName || 'Unknown User',
                            to: userId,
                            message: message ? message.value : '',
                            status: 'pending',
                            timestamp: Date.now()
                        };
                        
                        database.ref('contactRequests/' + userId + '/' + currentUser.uid).set(requestData)
                            .then(() => {
                                showNotification('success', 'Request Sent', `Contact request sent to ${userData.name || 'User'}`, 3000);
                                hideModal('add-contact-modal');
                                searchInput.value = '';
                                if (message) message.value = '';
                                const searchResults = document.getElementById('search-results');
                                if (searchResults) searchResults.classList.add('hidden');
                            })
                            .catch(error => {
                                console.error('Error sending contact request:', error);
                                showNotification('error', 'Request Failed', 'Failed to send contact request', 4000);
                            });
                    });
            });
    })
    .catch(error => {
        console.error('Error finding user:', error);
        showNotification('error', 'Search Error', 'Error finding user', 4000);
    });
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
        
        // Show success message
        showNotification('success', 'Contact Added', 'Contact added successfully', 3000);
        
        // Get user data for notification
        database.ref('users/' + requestId).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    showNotification('success', 'Contact Added', `${userData.name || 'User'} has been added to your contacts`, 3000);
                }
            });
    } else {
        // Show declined message
        showNotification('info', 'Request Declined', 'Contact request declined', 3000);
    }
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
    
    userStatus = status;
    
    database.ref('users/' + currentUser.uid).update({
        status: status,
        lastSeen: Date.now()
    });
}

// Initialize emoji picker
function initializeEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    if (!emojiPicker) return;
    
    // Simple emoji list
    const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];
    
    emojiPicker.innerHTML = '';
    
    emojis.forEach(emoji => {
        const emojiElement = document.createElement('span');
        emojiElement.textContent = emoji;
        emojiElement.addEventListener('click', () => {
            insertEmoji(emoji);
        });
        emojiPicker.appendChild(emojiElement);
    });
}

// Toggle emoji picker visibility
function toggleEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker) {
        emojiPicker.classList.toggle('hidden');
    }
}

// Insert emoji into message input
function insertEmoji(emoji) {
    const messageInput = document.getElementById('message-input');
    if (!messageInput) return;
    
    const cursorPos = messageInput.selectionStart;
    const textBefore = messageInput.value.substring(0, cursorPos);
    const textAfter = messageInput.value.substring(cursorPos);
    
    messageInput.value = textBefore + emoji + textAfter;
    messageInput.focus();
    messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
    
    // Close emoji picker
    const emojiPicker = document.getElementById('emoji-picker');
    if (emojiPicker) emojiPicker.classList.add('hidden');
}

// Enhanced Notification System
function showNotification(type, title, message, duration = 5000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return null;
    
    const notificationId = 'notification-' + Date.now();
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.id = notificationId;
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-details">
                <div class="notification-header">
                    <div class="notification-title">
                        <i class="${icons[type]}"></i>
                        ${title}
                    </div>
                    <div class="notification-time">${formatTime(new Date())}</div>
                </div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Add close event
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            removeNotification(notificationId);
        });
    }
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeNotification(notificationId);
        }, duration);
    }
    
    // Add click to dismiss
    notification.addEventListener('click', (e) => {
        if (!e.target.closest('.notification-close')) {
            removeNotification(notificationId);
        }
    });
    
    return notificationId;
}

function removeNotification(notificationId) {
    const notification = document.getElementById(notificationId);
    if (notification) {
        notification.classList.add('fade-out');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }
}

// Show message notification
function showMessageNotification(chatId, message) {
    // Get sender info
    database.ref('users/' + message.senderId).once('value')
        .then(snapshot => {
            const userData = snapshot.val();
            if (!userData) return;
            
            let messageText = '';
            if (message.type === 'text') {
                messageText = message.content;
            } else if (message.type === 'image') {
                messageText = 'Sent an image';
            } else if (message.type === 'file') {
                messageText = 'Sent a file';
            }
            
            const notificationId = showNotification('info', userData.name || 'User', messageText, 5000);
            
            // Add click event to open the chat
            const notification = document.getElementById(notificationId);
            if (notification) {
                notification.addEventListener('click', () => {
                    openChat(chatId, userData);
                    removeNotification(notificationId);
                });
            }
        });
}

// Handle logout
function handleLogout() {
    // Update status to offline
    updateUserStatus('offline');
    
    // Show loading state
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        const originalHTML = logoutBtn.innerHTML;
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;
        
        // Sign out
        auth.signOut()
            .then(() => {
                currentUser = null;
                showNotification('success', 'Logged Out', 'You have been successfully logged out', 2000);
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            })
            .catch(error => {
                console.error('Logout error:', error);
                showNotification('error', 'Logout Failed', 'Failed to logout. Please try again.', 4000);
                
                // Reset button
                logoutBtn.innerHTML = originalHTML;
                logoutBtn.disabled = false;
            });
    }
}

// Handle edit profile
function handleEditProfile() {
    showNotification('info', 'Coming Soon', 'Edit profile feature will be available in the next update', 4000);
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
    const isDarkMode = document.body.classList.contains('dark-theme');
    localStorage.setItem('darkMode', isDarkMode);
    
    showNotification('success', 'Theme Updated', 
        isDarkMode ? 'Dark mode activated' : 'Light mode activated', 2000);
}

// Handle password reset
function handlePasswordReset() {
    const emailInput = document.getElementById('reset-email');
    if (!emailInput) return;
    
    const email = emailInput.value;
    
    if (!email) {
        showNotification('error', 'Missing Email', 'Please enter your email address', 4000);
        return;
    }
    
    // Show loading state
    const sendBtn = document.getElementById('send-reset-link');
    if (sendBtn) {
        const btnText = sendBtn.querySelector('.btn-text');
        const btnLoading = sendBtn.querySelector('.btn-loading');
        
        if (btnText) btnText.style.opacity = '0';
        if (btnLoading) btnLoading.style.display = 'block';
        sendBtn.disabled = true;
        
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showNotification('success', 'Reset Email Sent', 'Password reset email sent! Check your inbox.', 5000);
                hideModal('forgot-password-modal');
                emailInput.value = '';
            })
            .catch(error => {
                console.error('Password reset error:', error);
                showNotification('error', 'Reset Failed', `Failed to send reset email: ${error.message}`, 5000);
            })
            .finally(() => {
                if (btnText) btnText.style.opacity = '1';
                if (btnLoading) btnLoading.style.display = 'none';
                sendBtn.disabled = false;
            });
    }
}

// Check password strength
function checkPasswordStrength() {
    const passwordInput = document.getElementById('register-password');
    if (!passwordInput) return;
    
    const password = passwordInput.value;
    const strengthFill = document.getElementById('password-strength-fill');
    const strengthText = document.getElementById('password-strength-text');
    const requirements = document.querySelectorAll('.requirement');
    
    // Reset requirements
    requirements.forEach(req => req.classList.remove('met'));
    
    if (!password) {
        if (strengthFill) strengthFill.style.width = '0%';
        if (strengthText) {
            strengthText.textContent = 'Weak';
            strengthText.style.color = 'var(--primary-red)';
        }
        return;
    }
    
    // Check requirements
    let strength = 0;
    const requirementsMet = {};
    
    // Length requirement
    if (password.length >= 8) {
        strength += 20;
        requirementsMet.length = true;
        const lengthReq = document.querySelector('.requirement[data-requirement="length"]');
        if (lengthReq) lengthReq.classList.add('met');
    }
    
    // Uppercase requirement
    if (/[A-Z]/.test(password)) {
        strength += 20;
        requirementsMet.uppercase = true;
        const uppercaseReq = document.querySelector('.requirement[data-requirement="uppercase"]');
        if (uppercaseReq) uppercaseReq.classList.add('met');
    }
    
    // Lowercase requirement
    if (/[a-z]/.test(password)) {
        strength += 20;
        requirementsMet.lowercase = true;
        const lowercaseReq = document.querySelector('.requirement[data-requirement="lowercase"]');
        if (lowercaseReq) lowercaseReq.classList.add('met');
    }
    
    // Number requirement
    if (/[0-9]/.test(password)) {
        strength += 20;
        requirementsMet.number = true;
        const numberReq = document.querySelector('.requirement[data-requirement="number"]');
        if (numberReq) numberReq.classList.add('met');
    }
    
    // Special character requirement
    if (/[^a-zA-Z0-9]/.test(password)) {
        strength += 20;
        requirementsMet.special = true;
        const specialReq = document.querySelector('.requirement[data-requirement="special"]');
        if (specialReq) specialReq.classList.add('met');
    }
    
    // Update UI
    if (strengthFill) strengthFill.style.width = strength + '%';
    
    if (strengthText) {
        if (strength <= 40) {
            strengthText.textContent = 'Weak';
            strengthText.style.color = 'var(--primary-red)';
        } else if (strength <= 80) {
            strengthText.textContent = 'Medium';
            strengthText.style.color = 'var(--warning)';
        } else {
            strengthText.textContent = 'Strong';
            strengthText.style.color = 'var(--success)';
        }
    }
}

// Check if passwords match
function checkPasswordMatch() {
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    if (!passwordInput || !confirmPasswordInput) return;
    
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const messageElement = document.getElementById('password-match-message');
    
    if (!messageElement) return;
    
    if (!confirmPassword) {
        messageElement.textContent = '';
        messageElement.className = 'validation-message';
        return;
    }
    
    if (password === confirmPassword) {
        messageElement.textContent = '✓ Passwords match';
        messageElement.className = 'validation-message success';
    } else {
        messageElement.textContent = '✗ Passwords do not match';
        messageElement.className = 'validation-message error';
    }
}

// Auto-resize textarea
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Hide all modals
function hideAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
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
            updateUserStatus(userStatus);
        }
    }
});

// Handle beforeunload to set status to offline
window.addEventListener('beforeunload', function() {
    if (currentUser) {
        // Use sendBeacon or similar for reliable status update
        navigator.sendBeacon = navigator.sendBeacon || function() { return true; };
        updateUserStatus('offline');
    }
});

// Load dark mode preference
window.addEventListener('DOMContentLoaded', function() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'false') {
        document.body.classList.remove('dark-theme');
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.checked = false;
        }
    }
});

// Initialize any animations or interactive elements
window.addEventListener('load', function() {
    // Add any initialization code for animations or other features
});

// NEW FUNCTIONALITY: Enhanced Chat Request System

// Enhanced New Chat Modal with User Search Form
function setupNewChatModal() {
    const newChatModal = document.getElementById('new-chat-modal');
    if (!newChatModal) return;
    
    // Clear existing content and add search form
    const modalBody = newChatModal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="search-container">
                <div class="form-group">
                    <label for="user-search-input">
                        <i class="fas fa-search"></i>
                        Find User by Email or UID
                    </label>
                    <input type="text" id="user-search-input" placeholder="Enter user's email address or User ID">
                    <div class="input-focus-line"></div>
                    <p class="input-hint">
                        <i class="fas fa-info-circle"></i>
                        Enter the exact email address or User ID of the person you want to chat with
                    </p>
                </div>
                <div id="user-search-results" class="search-results hidden">
                    <!-- Search results will appear here -->
                </div>
            </div>
            <div class="modal-section">
                <h4>Suggested Contacts</h4>
                <div class="user-list-modal" id="user-list-modal">
                    <!-- Existing contacts will be populated here -->
                </div>
            </div>
        `;
        
        // Add event listener for user search
        const userSearchInput = document.getElementById('user-search-input');
        if (userSearchInput) {
            let searchTimeout;
            userSearchInput.addEventListener('input', function() {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    searchUsersForChat(this.value);
                }, 500);
            });
        }
    }
}

// Search users for chat initiation
function searchUsersForChat(searchTerm) {
    if (!searchTerm.trim()) {
        const searchResults = document.getElementById('user-search-results');
        if (searchResults) searchResults.classList.add('hidden');
        return;
    }

    const searchResults = document.getElementById('user-search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '<div class="loading-text"><i class="fas fa-spinner fa-spin"></i> Searching users...</div>';
    searchResults.classList.remove('hidden');

    // Search by email
    database.ref('users').orderByChild('email').equalTo(searchTerm).once('value')
        .then(snapshot => {
            const usersData = snapshot.val();
            
            if (usersData) {
                displayUserSearchResults(usersData);
                return;
            }
            
            // If not found by email, search by user ID
            database.ref('users/' + searchTerm).once('value')
                .then(userSnapshot => {
                    if (userSnapshot.exists()) {
                        const userData = {};
                        userData[searchTerm] = userSnapshot.val();
                        displayUserSearchResults(userData);
                    } else {
                        searchResults.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>No user found with that email or User ID</p></div>';
                    }
                });
        })
        .catch(error => {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div class="error-text"><i class="fas fa-exclamation-triangle"></i><p>Search failed. Please try again.</p></div>';
        });
}

// Display user search results for chat
function displayUserSearchResults(usersData) {
    const searchResults = document.getElementById('user-search-results');
    if (!searchResults) return;
    
    searchResults.innerHTML = '';
    
    Object.keys(usersData).forEach(userId => {
        const userData = usersData[userId];
        
        // Don't show current user in search results
        if (userId === currentUser.uid) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'search-result-item';
        userItem.innerHTML = `
            <div class="search-result-avatar">
                <div class="avatar-small">${userData.name ? userData.name.charAt(0).toUpperCase() : 'U'}</div>
            </div>
            <div class="search-result-details">
                <div class="search-result-name">${userData.name || 'Unknown User'}</div>
                <div class="search-result-info">
                    <span class="search-result-username">@${userData.username || 'user'}</span>
                    <span class="search-result-email">${userData.email || 'No email'}</span>
                </div>
                <div class="search-result-phone">
                    <i class="fas fa-phone"></i>
                    ${userData.phone || 'No phone'}
                </div>
            </div>
            <button class="btn btn-primary btn-small send-chat-request" data-user-id="${userId}">
                <i class="fas fa-comment"></i>
                Start Chat
            </button>
        `;
        
        searchResults.appendChild(userItem);
    });
    
    // Add event listeners to start chat buttons
    document.querySelectorAll('.send-chat-request').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            sendChatRequest(userId);
        });
    });
    
    if (searchResults.innerHTML === '') {
        searchResults.innerHTML = '<div class="no-results"><i class="fas fa-search"></i><p>No user found with that information</p></div>';
    }
}

// Send chat request to user
function sendChatRequest(targetUserId) {
    if (!currentUser || !targetUserId) return;
    
    // Check if user exists
    database.ref('users/' + targetUserId).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) {
                showNotification('error', 'User Not Found', 'The specified user does not exist', 4000);
                return;
            }
            
            const targetUserData = snapshot.val();
            
            // Check if chat already exists
            database.ref('userChats/' + currentUser.uid).once('value')
                .then(userChatsSnapshot => {
                    const userChats = userChatsSnapshot.val();
                    let existingChatId = null;
                    
                    if (userChats) {
                        Object.keys(userChats).forEach(chatId => {
                            database.ref('chats/' + chatId + '/participants').once('value')
                                .then(participantsSnapshot => {
                                    const participants = participantsSnapshot.val();
                                    if (participants && participants[targetUserId]) {
                                        existingChatId = chatId;
                                    }
                                });
                        });
                    }
                    
                    if (existingChatId) {
                        // Open existing chat
                        hideModal('new-chat-modal');
                        openChat(existingChatId, targetUserData);
                        showNotification('info', 'Chat Exists', 'Opening existing chat', 2000);
                    } else {
                        // Create chat request
                        createChatRequest(targetUserId, targetUserData);
                    }
                });
        })
        .catch(error => {
            console.error('Error finding user:', error);
            showNotification('error', 'Error', 'Failed to find user', 4000);
        });
}

// Create chat request
function createChatRequest(targetUserId, targetUserData) {
    const requestId = database.ref('chatRequests').push().key;
    
    // Get current user data
    database.ref('users/' + currentUser.uid).once('value')
        .then(currentUserSnapshot => {
            const currentUserData = currentUserSnapshot.val();
            
            // Create chat request object
            const chatRequest = {
                id: requestId,
                fromUserId: currentUser.uid,
                fromUserName: currentUserData.name || 'Unknown User',
                fromUserEmail: currentUserData.email || 'No email',
                fromUserPhone: currentUserData.phone || 'No phone',
                toUserId: targetUserId,
                toUserName: targetUserData.name || 'Unknown User',
                status: 'pending',
                timestamp: Date.now(),
                message: 'Wants to start a chat with you'
            };
            
            // Save chat request to database
            database.ref('chatRequests/' + targetUserId + '/' + requestId).set(chatRequest)
                .then(() => {
                    showNotification('success', 'Chat Request Sent', 
                        `Chat request sent to ${targetUserData.name || 'User'}. They will be notified.`, 4000);
                    hideModal('new-chat-modal');
                    
                    // Clear search input
                    const userSearchInput = document.getElementById('user-search-input');
                    if (userSearchInput) userSearchInput.value = '';
                    
                    const searchResults = document.getElementById('user-search-results');
                    if (searchResults) searchResults.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Error sending chat request:', error);
                    showNotification('error', 'Request Failed', 'Failed to send chat request', 4000);
                });
        });
}

// Enhanced setup to include chat request listeners
function setupChatRequestListeners() {
    if (!currentUser) return;
    
    // Listen for incoming chat requests
    database.ref('chatRequests/' + currentUser.uid).on('value', snapshot => {
        const chatRequests = snapshot.val();
        const requestsBadge = document.getElementById('requests-badge');
        const requestsCount = document.getElementById('requests-count');
        
        let pendingChatRequests = 0;
        
        if (chatRequests) {
            Object.keys(chatRequests).forEach(requestId => {
                const request = chatRequests[requestId];
                if (request.status === 'pending') {
                    pendingChatRequests++;
                    
                    // Show notification for new chat requests
                    showChatRequestNotification(request);
                }
            });
        }
        
        // Update badge with total requests (contact + chat)
        const totalPending = pendingChatRequests + (Object.keys(requests || {}).filter(id => requests[id].status === 'pending').length);
        if (requestsBadge) {
            if (totalPending > 0) {
                requestsBadge.textContent = totalPending;
                requestsBadge.classList.remove('hidden');
            } else {
                requestsBadge.classList.add('hidden');
            }
        }
        if (requestsCount) {
            requestsCount.textContent = `${totalPending} pending`;
        }
    });
}

// Show chat request notification
function showChatRequestNotification(chatRequest) {
    const notificationId = showNotification('info', 
        'New Chat Request', 
        `${chatRequest.fromUserName} wants to chat with you`, 
        7000);
    
    // Add action buttons to notification
    const notification = document.getElementById(notificationId);
    if (notification) {
        const notificationDetails = notification.querySelector('.notification-details');
        if (notificationDetails) {
            const requestInfo = document.createElement('div');
            requestInfo.className = 'request-info';
            requestInfo.innerHTML = `
                <div class="request-details-small">
                    <div><i class="fas fa-envelope"></i> ${chatRequest.fromUserEmail}</div>
                    <div><i class="fas fa-phone"></i> ${chatRequest.fromUserPhone}</div>
                </div>
                <div class="notification-actions">
                    <button class="notification-action accept-chat" data-request-id="${chatRequest.id}">
                        <i class="fas fa-check"></i> Accept
                    </button>
                    <button class="notification-action decline-chat" data-request-id="${chatRequest.id}">
                        <i class="fas fa-times"></i> Decline
                    </button>
                </div>
            `;
            notificationDetails.appendChild(requestInfo);
            
            // Add event listeners
            const acceptBtn = notification.querySelector('.accept-chat');
            const declineBtn = notification.querySelector('.decline-chat');
            
            if (acceptBtn) {
                acceptBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleChatRequestResponse(chatRequest.id, 'accepted', chatRequest);
                    removeNotification(notificationId);
                });
            }
            
            if (declineBtn) {
                declineBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleChatRequestResponse(chatRequest.id, 'declined', chatRequest);
                    removeNotification(notificationId);
                });
            }
        }
    }
}

// Handle chat request response
function handleChatRequestResponse(requestId, response, chatRequest) {
    if (!currentUser) return;
    
    // Update request status
    database.ref('chatRequests/' + currentUser.uid + '/' + requestId).update({
        status: response
    });
    
    if (response === 'accepted') {
        // Create chat room
        createChatFromRequest(chatRequest);
        
        // Add to contacts automatically
        database.ref('userContacts/' + currentUser.uid + '/' + chatRequest.fromUserId).set(true);
        database.ref('userContacts/' + chatRequest.fromUserId + '/' + currentUser.uid).set(true);
        
        showNotification('success', 'Chat Request Accepted', 
            `You are now connected with ${chatRequest.fromUserName}`, 3000);
    } else {
        showNotification('info', 'Chat Request Declined', 
            `You declined chat request from ${chatRequest.fromUserName}`, 3000);
    }
}

// Create chat room from accepted request
function createChatFromRequest(chatRequest) {
    const chatId = database.ref('chats').push().key;
    
    // Create chat object
    const chatData = {
        id: chatId,
        participants: {
            [currentUser.uid]: true,
            [chatRequest.fromUserId]: true
        },
        createdAt: Date.now(),
        lastMessage: 'Chat started',
        lastMessageTime: Date.now(),
        createdFromRequest: true,
        requestId: chatRequest.id
    };
    
    // Save chat to database
    database.ref('chats/' + chatId).set(chatData)
        .then(() => {
            // Add chat to both users' chat lists
            database.ref('userChats/' + currentUser.uid + '/' + chatId).set(true);
            database.ref('userChats/' + chatRequest.fromUserId + '/' + chatId).set(true);
            
            // Add welcome message
            const welcomeMessage = {
                senderId: 'system',
                content: `Chat started between ${chatRequest.fromUserName} and ${chatRequest.toUserName}`,
                type: 'system',
                timestamp: Date.now(),
                status: 'sent'
            };
            
            database.ref('chats/' + chatId + '/messages').push().set(welcomeMessage);
            
            // Show success notification
            showNotification('success', 'Chat Started', 
                `You can now chat with ${chatRequest.fromUserName}`, 3000);
        })
        .catch(error => {
            console.error('Error creating chat:', error);
            showNotification('error', 'Chat Creation Failed', 
                'Failed to create chat room. Please try again.', 4000);
        });
}

// Enhanced loadApp function to include new functionality
const originalLoadApp = loadApp;
loadApp = function() {
    originalLoadApp();
    setupNewChatModal();
    setupChatRequestListeners();
};

// Enhanced requests panel to show both contact and chat requests
function enhanceRequestsPanel() {
    const requestsPanel = document.getElementById('requests-panel');
    if (!requestsPanel) return;
    
    const panelContent = requestsPanel.querySelector('.panel-content');
    if (panelContent) {
        const requestList = panelContent.querySelector('#request-list');
        if (requestList) {
            // Listen for both contact and chat requests
            database.ref('contactRequests/' + currentUser.uid).on('value', contactSnapshot => {
                database.ref('chatRequests/' + currentUser.uid).on('value', chatSnapshot => {
                    updateCombinedRequestsList(contactSnapshot.val(), chatSnapshot.val());
                });
            });
        }
    }
}

// Update combined requests list
function updateCombinedRequestsList(contactRequests, chatRequests) {
    const requestList = document.getElementById('request-list');
    if (!requestList) return;
    
    requestList.innerHTML = '';
    
    let hasRequests = false;
    
    // Add chat requests
    if (chatRequests) {
        Object.keys(chatRequests).forEach(requestId => {
            const request = chatRequests[requestId];
            if (request.status === 'pending') {
                hasRequests = true;
                addChatRequestToList(request);
            }
        });
    }
    
    // Add contact requests
    if (contactRequests) {
        Object.keys(contactRequests).forEach(userId => {
            const request = contactRequests[userId];
            if (request.status === 'pending') {
                hasRequests = true;
                // This will be handled by the existing contact request system
            }
        });
    }
    
    if (!hasRequests) {
        requestList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-user-plus"></i>
                </div>
                <h4>No pending requests</h4>
                <p>When someone sends you a chat or contact request, it will appear here</p>
            </div>
        `;
    }
}

// Add chat request to requests list
function addChatRequestToList(chatRequest) {
    const requestList = document.getElementById('request-list');
    if (!requestList) return;
    
    const requestItem = document.createElement('div');
    requestItem.className = 'request-item chat-request-item';
    requestItem.setAttribute('data-request-id', chatRequest.id);
    
    requestItem.innerHTML = `
        <div class="chat-avatar">
            <div class="avatar-small">${chatRequest.fromUserName ? chatRequest.fromUserName.charAt(0).toUpperCase() : 'U'}</div>
        </div>
        <div class="request-details">
            <div class="request-name">${chatRequest.fromUserName || 'Unknown User'}</div>
            <div class="request-type">Chat Request</div>
            <div class="request-info">
                <div class="request-contact-info">
                    <span><i class="fas fa-envelope"></i> ${chatRequest.fromUserEmail}</span>
                    <span><i class="fas fa-phone"></i> ${chatRequest.fromUserPhone}</span>
                </div>
            </div>
            <div class="request-actions">
                <button class="request-btn accept-chat-request" data-request-id="${chatRequest.id}">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button class="request-btn decline-chat-request" data-request-id="${chatRequest.id}">
                    <i class="fas fa-times"></i> Decline
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners
    const acceptBtn = requestItem.querySelector('.accept-chat-request');
    const declineBtn = requestItem.querySelector('.decline-chat-request');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            handleChatRequestResponse(chatRequest.id, 'accepted', chatRequest);
        });
    }
    
    if (declineBtn) {
        declineBtn.addEventListener('click', () => {
            handleChatRequestResponse(chatRequest.id, 'declined', chatRequest);
        });
    }
    
    requestList.appendChild(requestItem);
}

// Initialize enhanced functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Override the original initializeApp to include our enhancements
    const originalInitializeApp = initializeApp;
    initializeApp = function() {
        originalInitializeApp();
        enhanceRequestsPanel();
    };
});
