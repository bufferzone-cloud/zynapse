// ===== GLOBAL VARIABLES =====
let currentUser = null;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDatabase = null;
let currentChat = null;
let typingTimeout = null;
let onlineInterval = null;
let notificationSound = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    initializeFirebase();
    
    // Initialize notification sound
    notificationSound = new Audio('notification.mp3');
    
    // Setup event listeners based on current page
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    switch(page) {
        case 'index.html':
        case '':
            setupAuthPage();
            break;
        case 'home.html':
            setupHomePage();
            break;
        case 'chat.html':
            setupChatPage();
            break;
    }
    
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }, 1000);
});

// ===== FIREBASE INITIALIZATION =====
function initializeFirebase() {
    try {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseDatabase = firebase.database();
        
        // Set up auth state listener
        firebaseAuth.onAuthStateChanged(handleAuthStateChange);
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
        showToast('Failed to initialize app. Please refresh.', 'error');
    }
}

// ===== AUTHENTICATION FUNCTIONS =====
function handleAuthStateChange(user) {
    const path = window.location.pathname;
    const page = path.split('/').pop();
    
    if (user) {
        // User is signed in
        currentUser = user;
        loadUserData(user.uid);
        
        if (page === 'index.html' || page === '') {
            // Redirect to home page
            window.location.href = 'home.html';
        }
    } else {
        // User is signed out
        currentUser = null;
        
        if (page !== 'index.html' && page !== '') {
            // Redirect to login page
            window.location.href = 'index.html';
        }
    }
}

// ===== USER MANAGEMENT =====
async function loadUserData(userId) {
    try {
        const userRef = firebaseDatabase.ref(`users/${userId}`);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            updateUIWithUserData(userData);
            
            // Set up real-time listeners
            setupRealtimeListeners(userId, userData.zynapseId);
        } else {
            // User data doesn't exist, create it
            await createUserData(userId);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

async function createUserData(userId) {
    try {
        // Generate unique Zynapse ID
        const zynapseId = generateZynapseId();
        
        const userData = {
            name: firebaseAuth.currentUser.displayName || '',
            email: firebaseAuth.currentUser.email,
            phone: '',
            profilePicture: firebaseAuth.currentUser.photoURL || '',
            zynapseId: zynapseId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            status: 'online',
            contacts: {},
            blockedUsers: {},
            settings: {
                notifications: true,
                privacy: 'contacts_only',
                theme: 'light'
            }
        };
        
        // Save to Firebase
        await firebaseDatabase.ref(`users/${userId}`).set(userData);
        await firebaseDatabase.ref(`userIds/${zynapseId}`).set(userId);
        
        updateUIWithUserData(userData);
        setupRealtimeListeners(userId, zynapseId);
        
        showToast('Account created successfully!', 'success');
    } catch (error) {
        console.error('Error creating user data:', error);
        showToast('Error creating user account', 'error');
    }
}

function generateZynapseId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNum}`;
}

// ===== SIGN UP FUNCTION =====
async function signUpUser(userData, profileImage) {
    try {
        showLoading('registerBtn');
        
        // 1. Create Firebase Auth user
        const userCredential = await firebaseAuth.createUserWithEmailAndPassword(
            userData.email,
            userData.password
        );
        
        // 2. Upload profile image to Cloudinary if provided
        let profileUrl = '';
        if (profileImage) {
            profileUrl = await uploadToCloudinary(profileImage);
        }
        
        // 3. Update user profile
        await userCredential.user.updateProfile({
            displayName: userData.name,
            photoURL: profileUrl
        });
        
        // 4. Create user data in Realtime Database
        const zynapseId = generateZynapseId();
        
        const userProfile = {
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            profilePicture: profileUrl,
            zynapseId: zynapseId,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            status: 'online',
            contacts: {},
            blockedUsers: {},
            settings: {
                notifications: true,
                privacy: 'contacts_only',
                theme: 'light'
            }
        };
        
        await firebaseDatabase.ref(`users/${userCredential.user.uid}`).set(userProfile);
        await firebaseDatabase.ref(`userIds/${zynapseId}`).set(userCredential.user.uid);
        
        showToast('Account created successfully!', 'success');
        
    } catch (error) {
        console.error('Sign up error:', error);
        hideLoading('registerBtn');
        
        let errorMessage = 'Sign up failed. ';
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email already in use.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak.';
                break;
            default:
                errorMessage += 'Please try again.';
        }
        
        showToast(errorMessage, 'error');
    }
}

// ===== CLOUDINARY UPLOAD =====
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        // Check file size
        if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
            reject(new Error('File size exceeds 50MB limit'));
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_ACCOUNT.uploadPreset);
        formData.append('folder', CLOUDINARY_ACCOUNT.folder);
        
        fetch(CLOUDINARY_ACCOUNT.uploadUrl, {
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
            reject(error);
        });
    });
}

// ===== CHAT FUNCTIONS =====
async function sendMessage(chatId, message, type = 'text', mediaUrl = null) {
    try {
        const userId = firebaseAuth.currentUser.uid;
        const messageId = firebaseDatabase.ref().child('messages').push().key;
        
        const messageData = {
            id: messageId,
            senderId: userId,
            chatId: chatId,
            content: message,
            type: type,
            mediaUrl: mediaUrl,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'sent'
        };
        
        // Save message
        await firebaseDatabase.ref(`messages/${chatId}/${messageId}`).set(messageData);
        
        // Update chat last message
        await firebaseDatabase.ref(`chats/${chatId}`).update({
            lastMessage: message,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            lastMessageType: type
        });
        
        // Play notification sound for sender
        playNotificationSound();
        
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
        return false;
    }
}

async function sendChatRequest(recipientId, senderData) {
    try {
        const requestId = firebaseDatabase.ref().child('chatRequests').push().key;
        
        const requestData = {
            id: requestId,
            senderId: senderData.userId,
            senderZynapseId: senderData.zynapseId,
            senderName: senderData.name,
            senderProfile: senderData.profilePicture,
            recipientId: recipientId,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await firebaseDatabase.ref(`chatRequests/${recipientId}/${requestId}`).set(requestData);
        
        showToast('Chat request sent successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error sending chat request:', error);
        showToast('Failed to send request', 'error');
        return false;
    }
}

// ===== STATUS MANAGEMENT =====
async function postZyne(content, mediaUrl = null, mediaType = null) {
    try {
        const userId = firebaseAuth.currentUser.uid;
        const zyneId = firebaseDatabase.ref().child('zynes').push().key;
        
        const zyneData = {
            id: zyneId,
            userId: userId,
            content: content,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            expiresAt: Date.now() + APP_CONFIG.STATUS_DURATION,
            views: 0,
            viewers: {}
        };
        
        await firebaseDatabase.ref(`zynes/${userId}/${zyneId}`).set(zyneData);
        
        showToast('Zyne posted successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error posting zyne:', error);
        showToast('Failed to post zyne', 'error');
        return false;
    }
}

// ===== GROUP MANAGEMENT =====
async function createGroup(groupName, members) {
    try {
        const userId = firebaseAuth.currentUser.uid;
        const groupId = firebaseDatabase.ref().child('groups').push().key;
        
        // Add creator to members
        const allMembers = [...members, userId];
        
        const groupData = {
            id: groupId,
            name: groupName,
            creator: userId,
            members: allMembers.reduce((acc, memberId) => {
                acc[memberId] = {
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    role: memberId === userId ? 'admin' : 'member'
                };
                return acc;
            }, {}),
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastActivity: firebase.database.ServerValue.TIMESTAMP
        };
        
        await firebaseDatabase.ref(`groups/${groupId}`).set(groupData);
        
        // Create initial group chat
        const chatData = {
            id: groupId,
            type: 'group',
            name: groupName,
            members: allMembers.reduce((acc, memberId) => {
                acc[memberId] = true;
                return acc;
            }, {}),
            createdAt: firebase.database.ServerValue.TIMESTAMP
        };
        
        await firebaseDatabase.ref(`chats/${groupId}`).set(chatData);
        
        showToast('Group created successfully', 'success');
        return groupId;
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Failed to create group', 'error');
        return null;
    }
}

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

function showLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('span');
        
        if (spinner) spinner.style.display = 'block';
        if (text) text.style.display = 'none';
        button.disabled = true;
    }
}

function hideLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        const spinner = button.querySelector('.spinner');
        const text = button.querySelector('span');
        
        if (spinner) spinner.style.display = 'none';
        if (text) text.style.display = 'block';
        button.disabled = false;
    }
}

function playNotificationSound() {
    if (notificationSound) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log('Audio play failed:', e));
    }
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

// ===== EVENT LISTENER SETUP FUNCTIONS =====
function setupAuthPage() {
    // Welcome screen buttons
    document.getElementById('signupBtn')?.addEventListener('click', () => {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('signupScreen').style.display = 'flex';
    });
    
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
    });
    
    // Back buttons
    document.getElementById('backToWelcome')?.addEventListener('click', () => {
        document.getElementById('signupScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';
    });
    
    document.getElementById('backToWelcomeFromLogin')?.addEventListener('click', () => {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'flex';
    });
    
    // Switch between signup and login
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
    });
    
    document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('signupScreen').style.display = 'flex';
    });
    
    // Profile image upload
    const profileImageInput = document.getElementById('profileImage');
    const uploadBtn = document.getElementById('uploadBtn');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const profilePreview = document.getElementById('profilePreview');
    
    if (uploadBtn && profileImageInput) {
        uploadBtn.addEventListener('click', () => profileImageInput.click());
    }
    
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                    removeImageBtn.style.display = 'inline-flex';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', function() {
            profilePreview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-user-circle"></i>
                    <span>No image selected</span>
                    <p>Max 5MB</p>
                </div>
            `;
            profileImageInput.value = '';
            removeImageBtn.style.display = 'none';
        });
    }
    
    // Password toggle
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
    
    // Signup form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('signupName').value.trim();
            const phone = document.getElementById('signupPhone').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            const profileImage = document.getElementById('profileImage').files[0];
            
            // Validation
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }
            
            const userData = {
                name,
                phone,
                email,
                password
            };
            
            await signUpUser(userData, profileImage);
        });
    }
    
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            try {
                showLoading('loginSubmitBtn');
                await firebaseAuth.signInWithEmailAndPassword(email, password);
                showToast('Login successful!', 'success');
            } catch (error) {
                hideLoading('loginSubmitBtn');
                console.error('Login error:', error);
                
                let errorMessage = 'Login failed. ';
                switch(error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage += 'Invalid email or password.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage += 'Account has been disabled.';
                        break;
                    default:
                        errorMessage += 'Please try again.';
                }
                
                showToast(errorMessage, 'error');
            }
        });
    }
}

function setupHomePage() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all nav items
            document.querySelectorAll('.nav-item').forEach(nav => {
                nav.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all pages
            document.querySelectorAll('.page').forEach(page => {
                page.classList.remove('active');
            });
            
            // Show selected page
            const pageId = this.getAttribute('data-page') + 'Page';
            const page = document.getElementById(pageId);
            if (page) {
                page.classList.add('active');
            }
        });
    });
    
    // Copy User ID
    document.getElementById('copyUserId')?.addEventListener('click', function() {
        const userId = document.getElementById('userId').textContent;
        navigator.clipboard.writeText(userId).then(() => {
            showToast('User ID copied to clipboard', 'success');
        });
    });
    
    // Start Chat Modal
    document.getElementById('floatingChatBtn')?.addEventListener('click', function() {
        document.getElementById('startChatModal').classList.add('active');
    });
    
    document.getElementById('closeStartChatModal')?.addEventListener('click', function() {
        document.getElementById('startChatModal').classList.remove('active');
        document.getElementById('searchUserId').value = '';
        document.getElementById('userSearchResult').innerHTML = `
            <div class="search-placeholder">
                <i class="fas fa-search"></i>
                <p>Enter a Zynapse ID to search</p>
            </div>
        `;
    });
    
    // Search User
    document.getElementById('searchUserBtn')?.addEventListener('click', async function() {
        const userId = document.getElementById('searchUserId').value.trim();
        
        if (!userId.match(/^ZYN-\d{4}$/)) {
            showToast('Please enter a valid Zynapse ID (ZYN-XXXX)', 'error');
            return;
        }
        
        try {
            const snapshot = await firebaseDatabase.ref(`userIds/${userId}`).once('value');
            
            if (snapshot.exists()) {
                const targetUserId = snapshot.val();
                const userSnapshot = await firebaseDatabase.ref(`users/${targetUserId}`).once('value');
                const userData = userSnapshot.val();
                
                const currentUserId = firebaseAuth.currentUser.uid;
                
                // Check if already a contact
                const contactsSnapshot = await firebaseDatabase.ref(`users/${currentUserId}/contacts`).once('value');
                const isContact = contactsSnapshot.exists() && contactsSnapshot.val()[targetUserId];
                
                document.getElementById('userSearchResult').innerHTML = `
                    <div class="user-found">
                        <img src="${userData.profilePicture || 'zynaps.png'}" alt="Profile" class="profile-pic">
                        <div class="user-info">
                            <h4>${userData.name}</h4>
                            <p>${userData.zynapseId}</p>
                            ${isContact ? '<p class="already-contact"><i class="fas fa-check-circle"></i> Already in contacts</p>' : ''}
                        </div>
                        <div class="request-actions">
                            ${!isContact ? `
                                <button class="action-btn accept-btn" id="sendRequestBtn" data-userid="${targetUserId}">
                                    <i class="fas fa-user-plus"></i> Send Request
                                </button>
                            ` : `
                                <button class="action-btn chat-btn" onclick="startChat('${targetUserId}')">
                                    <i class="fas fa-comment"></i> Start Chat
                                </button>
                            `}
                        </div>
                    </div>
                `;
                
                // Add event listener to send request button
                const sendRequestBtn = document.getElementById('sendRequestBtn');
                if (sendRequestBtn) {
                    sendRequestBtn.addEventListener('click', async function() {
                        const targetUserId = this.getAttribute('data-userid');
                        const currentUser = firebaseAuth.currentUser;
                        
                        const userSnapshot = await firebaseDatabase.ref(`users/${currentUser.uid}`).once('value');
                        const senderData = userSnapshot.val();
                        
                        const success = await sendChatRequest(targetUserId, {
                            userId: currentUser.uid,
                            zynapseId: senderData.zynapseId,
                            name: senderData.name,
                            profilePicture: senderData.profilePicture
                        });
                        
                        if (success) {
                            document.getElementById('startChatModal').classList.remove('active');
                            document.getElementById('searchUserId').value = '';
                        }
                    });
                }
                
            } else {
                document.getElementById('userSearchResult').innerHTML = `
                    <div class="error">
                        <i class="fas fa-user-slash"></i>
                        <p>User not found. Please check the Zynapse ID and try again.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error searching user:', error);
            showToast('Error searching for user', 'error');
        }
    });
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            // Update status to offline
            const userId = firebaseAuth.currentUser.uid;
            await firebaseDatabase.ref(`users/${userId}/status`).set('offline');
            await firebaseDatabase.ref(`users/${userId}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
            
            // Sign out
            await firebaseAuth.signOut();
            showToast('Logged out successfully', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showToast('Error during logout', 'error');
        }
    });
    
    // Profile dropdown
    document.getElementById('profileDropdownBtn')?.addEventListener('click', function() {
        const dropdown = document.getElementById('profileDropdown');
        dropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    window.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });
}

function setupChatPage() {
    // Get chat parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    const type = urlParams.get('type'); // 'direct' or 'group'
    
    if (chatId && type) {
        loadChat(chatId, type);
    } else {
        showToast('Invalid chat parameters', 'error');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    }
    
    // Back button
    document.getElementById('backBtn')?.addEventListener('click', function() {
        window.history.back();
    });
    
    // Send message
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    if (messageInput && sendMessageBtn) {
        // Send on button click
        sendMessageBtn.addEventListener('click', async function() {
            const message = messageInput.value.trim();
            if (message && currentChat) {
                const success = await sendMessage(currentChat.id, message);
                if (success) {
                    messageInput.value = '';
                }
            }
        });
        
        // Send on Enter key (but allow Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageBtn.click();
            }
        });
        
        // Typing indicator
        messageInput.addEventListener('input', function() {
            if (currentChat && currentChat.type === 'direct') {
                sendTypingIndicator(true);
                
                if (typingTimeout) {
                    clearTimeout(typingTimeout);
                }
                
                typingTimeout = setTimeout(() => {
                    sendTypingIndicator(false);
                }, 1000);
            }
        });
    }
    
    // Attachment options
    const attachmentBtn = document.getElementById('attachmentBtn');
    const attachmentOptions = document.getElementById('attachmentOptions');
    
    if (attachmentBtn && attachmentOptions) {
        attachmentBtn.addEventListener('click', function() {
            attachmentOptions.classList.toggle('show');
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.attachment-options') && !e.target.closest('#attachmentBtn')) {
                attachmentOptions.classList.remove('show');
            }
        });
        
        // Attachment type selection
        document.querySelectorAll('.attachment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.getAttribute('data-type');
                handleAttachment(type);
                attachmentOptions.classList.remove('show');
            });
        });
    }
}

// ===== CHAT FUNCTIONS =====
async function loadChat(chatId, type) {
    try {
        const userId = firebaseAuth.currentUser.uid;
        
        // Load chat info
        const chatSnapshot = await firebaseDatabase.ref(`chats/${chatId}`).once('value');
        if (!chatSnapshot.exists()) {
            showToast('Chat not found', 'error');
            window.location.href = 'home.html';
            return;
        }
        
        const chatData = chatSnapshot.val();
        currentChat = {
            id: chatId,
            type: type,
            ...chatData
        };
        
        // Load messages
        await loadMessages(chatId);
        
        // Set up real-time message listener
        firebaseDatabase.ref(`messages/${chatId}`).on('child_added', (snapshot) => {
            const message = snapshot.val();
            displayMessage(message);
        });
        
        // Update UI with chat info
        if (type === 'direct') {
            // For direct chat, get the other user's info
            const otherUserId = Object.keys(chatData.members).find(id => id !== userId);
            if (otherUserId) {
                const userSnapshot = await firebaseDatabase.ref(`users/${otherUserId}`).once('value');
                const userData = userSnapshot.val();
                
                document.getElementById('chatPartnerName').textContent = userData.name;
                document.getElementById('chatPartnerPic').src = userData.profilePicture || 'zynaps.png';
                
                // Set up online status listener
                firebaseDatabase.ref(`users/${otherUserId}/status`).on('value', (snapshot) => {
                    const status = snapshot.val();
                    const statusDot = document.getElementById('chatStatusDot');
                    const statusText = document.getElementById('chatStatusText');
                    
                    statusDot.className = 'status-dot ' + status;
                    statusText.textContent = status === 'online' ? 'Online' : 'Last seen recently';
                });
            }
        } else {
            // For group chat
            document.getElementById('chatPartnerName').textContent = chatData.name;
            document.getElementById('chatPartnerPic').src = chatData.groupPicture || 'zynaps.png';
            document.getElementById('chatStatusText').textContent = `${Object.keys(chatData.members).length} members`;
        }
        
        // Mark chat as read
        await markChatAsRead(chatId, userId);
        
        // Show chat container
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('chatContainer').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading chat:', error);
        showToast('Error loading chat', 'error');
    }
}

async function loadMessages(chatId) {
    try {
        const messagesRef = firebaseDatabase.ref(`messages/${chatId}`).orderByChild('timestamp').limitToLast(50);
        const snapshot = await messagesRef.once('value');
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        let lastDate = null;
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            
            // Group messages by date
            const messageDate = new Date(message.timestamp).toDateString();
            if (messageDate !== lastDate) {
                const dateDiv = document.createElement('div');
                dateDiv.className = 'message-date';
                dateDiv.textContent = formatMessageDate(message.timestamp);
                chatMessages.appendChild(dateDiv);
                lastDate = messageDate;
            }
            
            displayMessage(message);
        });
        
        // Scroll to bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function displayMessage(message) {
    const userId = firebaseAuth.currentUser?.uid;
    const isSent = message.senderId === userId;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    let contentHTML = '';
    if (message.type === 'text') {
        contentHTML = `<p>${escapeHtml(message.content)}</p>`;
    } else if (message.type === 'image') {
        contentHTML = `
            <div class="media-message">
                <img src="${message.mediaUrl}" alt="Image" class="chat-media" onclick="viewMedia('${message.mediaUrl}', 'image')">
                ${message.content ? `<p>${escapeHtml(message.content)}</p>` : ''}
            </div>
        `;
    } else if (message.type === 'video') {
        contentHTML = `
            <div class="media-message">
                <video src="${message.mediaUrl}" controls class="chat-media" onclick="viewMedia('${message.mediaUrl}', 'video')"></video>
                ${message.content ? `<p>${escapeHtml(message.content)}</p>` : ''}
            </div>
        `;
    } else if (message.type === 'file') {
        contentHTML = `
            <div class="file-message">
                <a href="${message.mediaUrl}" target="_blank" class="file-link">
                    <i class="fas fa-file"></i>
                    <span>${message.content || 'Download file'}</span>
                </a>
            </div>
        `;
    }
    
    const time = formatMessageTime(message.timestamp);
    const statusIcon = isSent ? getStatusIcon(message.status) : '';
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            ${contentHTML}
            <span class="message-time">${time}${statusIcon}</span>
        </div>
    `;
    
    const chatMessages = document.getElementById('chatMessages');
    const emptyChat = chatMessages.querySelector('.empty-chat');
    if (emptyChat) {
        emptyChat.remove();
    }
    
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}

function getStatusIcon(status) {
    switch(status) {
        case 'sent': return '<i class="fas fa-check message-status"></i>';
        case 'delivered': return '<i class="fas fa-check-double message-status"></i>';
        case 'read': return '<i class="fas fa-check-double message-status" style="color: #34c759;"></i>';
        default: return '';
    }
}

function formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function markChatAsRead(chatId, userId) {
    try {
        // Mark all messages as read
        const messagesRef = firebaseDatabase.ref(`messages/${chatId}`);
        const snapshot = await messagesRef.orderByChild('senderId').equalTo(userId).once('value');
        
        const updates = {};
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            if (message.status !== 'read' && message.senderId !== userId) {
                updates[`${childSnapshot.key}/status`] = 'read';
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await messagesRef.update(updates);
        }
    } catch (error) {
        console.error('Error marking chat as read:', error);
    }
}

function sendTypingIndicator(isTyping) {
    if (!currentChat || currentChat.type !== 'direct') return;
    
    const userId = firebaseAuth.currentUser.uid;
    const otherUserId = Object.keys(currentChat.members).find(id => id !== userId);
    
    if (otherUserId) {
        const typingRef = firebaseDatabase.ref(`typing/${currentChat.id}/${userId}`);
        typingRef.set(isTyping ? true : null);
    }
}

// ===== ATTACHMENT HANDLING =====
async function handleAttachment(type) {
    switch(type) {
        case 'photo':
            document.getElementById('photoUpload').click();
            break;
        case 'video':
            document.getElementById('videoUpload').click();
            break;
        case 'document':
            document.getElementById('documentUpload').click();
            break;
        case 'camera':
            openCamera();
            break;
        case 'location':
            shareLocation();
            break;
        case 'contact':
            shareContact();
            break;
    }
}

// Set up file upload listeners
document.addEventListener('DOMContentLoaded', function() {
    // Photo upload
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', async function(e) {
            const files = Array.from(e.target.files);
            for (const file of files) {
                await uploadAndSendFile(file, 'image');
            }
            photoUpload.value = '';
        });
    }
    
    // Video upload
    const videoUpload = document.getElementById('videoUpload');
    if (videoUpload) {
        videoUpload.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                await uploadAndSendFile(file, 'video');
                videoUpload.value = '';
            }
        });
    }
    
    // Document upload
    const documentUpload = document.getElementById('documentUpload');
    if (documentUpload) {
        documentUpload.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                await uploadAndSendFile(file, 'file');
                documentUpload.value = '';
            }
        });
    }
});

async function uploadAndSendFile(file, type) {
    try {
        showToast('Uploading...', 'info');
        
        // Upload to Cloudinary
        const mediaUrl = await uploadToCloudinary(file);
        
        // Send message with media
        let messageContent = '';
        if (type === 'image') messageContent = 'Shared a photo';
        else if (type === 'video') messageContent = 'Shared a video';
        else messageContent = file.name;
        
        const success = await sendMessage(currentChat.id, messageContent, type, mediaUrl);
        
        if (success) {
            showToast('File sent successfully', 'success');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Failed to upload file', 'error');
    }
}

function openCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                // Camera access granted
                // You would implement camera capture UI here
                showToast('Camera access granted', 'success');
                
                // For now, just open file picker
                document.getElementById('photoUpload').click();
            })
            .catch(function(error) {
                console.error('Camera error:', error);
                showToast('Camera access denied', 'error');
            });
    } else {
        showToast('Camera not available', 'error');
    }
}

function shareLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
                
                sendMessage(currentChat.id, 'Shared location', 'text', mapUrl);
                showToast('Location shared', 'success');
            },
            function(error) {
                console.error('Geolocation error:', error);
                showToast('Failed to get location', 'error');
            }
        );
    } else {
        showToast('Geolocation not supported', 'error');
    }
}

function shareContact() {
    // This would typically use the Contact Picker API
    // For now, show a message
    showToast('Contact sharing coming soon', 'info');
}

// ===== UI UPDATE FUNCTIONS =====
function updateUIWithUserData(userData) {
    // Update header
    const userNameElement = document.getElementById('userName');
    const userIdElement = document.getElementById('userId');
    const profilePicElement = document.getElementById('headerProfilePic');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserId = document.getElementById('dropdownUserId');
    const dropdownProfilePic = document.getElementById('dropdownProfilePic');
    
    if (userNameElement) userNameElement.textContent = userData.name;
    if (userIdElement) userIdElement.textContent = userData.zynapseId;
    if (profilePicElement) profilePicElement.src = userData.profilePicture || 'zynaps.png';
    if (dropdownUserName) dropdownUserName.textContent = userData.name;
    if (dropdownUserId) dropdownUserId.textContent = userData.zynapseId;
    if (dropdownProfilePic) dropdownProfilePic.src = userData.profilePicture || 'zynaps.png';
    
    // Update online status
    updateOnlineStatus();
}

function updateOnlineStatus() {
    if (!firebaseAuth.currentUser) return;
    
    const userId = firebaseAuth.currentUser.uid;
    
    // Set status to online
    firebaseDatabase.ref(`users/${userId}/status`).set('online');
    firebaseDatabase.ref(`users/${userId}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
    
    // Update periodically
    if (onlineInterval) clearInterval(onlineInterval);
    
    onlineInterval = setInterval(() => {
        if (firebaseAuth.currentUser) {
            firebaseDatabase.ref(`users/${userId}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
        }
    }, 30000);
    
    // Update on visibility change
    document.addEventListener('visibilitychange', function() {
        if (firebaseAuth.currentUser) {
            if (document.hidden) {
                firebaseDatabase.ref(`users/${userId}/status`).set('away');
            } else {
                firebaseDatabase.ref(`users/${userId}/status`).set('online');
                firebaseDatabase.ref(`users/${userId}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
            }
        }
    });
}

function setupRealtimeListeners(userId, zynapseId) {
    // Listen for chat requests
    firebaseDatabase.ref(`chatRequests/${userId}`).on('child_added', (snapshot) => {
        const request = snapshot.val();
        if (request.status === 'pending') {
            updateRequestsBadge();
            playNotificationSound();
            showToast(`New chat request from ${request.senderName}`, 'info');
        }
    });
    
    // Listen for new messages
    firebaseDatabase.ref(`users/${userId}/contacts`).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const contacts = snapshot.val();
            Object.keys(contacts).forEach(contactId => {
                setupMessageListener(userId, contactId);
            });
        }
    });
    
    // Listen for group updates
    firebaseDatabase.ref(`users/${userId}/groups`).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const groups = snapshot.val();
            Object.keys(groups).forEach(groupId => {
                setupGroupMessageListener(groupId);
            });
        }
    });
}

function setupMessageListener(userId, contactId) {
    const chatId = [userId, contactId].sort().join('_');
    
    firebaseDatabase.ref(`messages/${chatId}`).orderByChild('timestamp').limitToLast(1).on('child_added', (snapshot) => {
        const message = snapshot.val();
        if (message.senderId !== userId) {
            // New message from contact
            updateRecentChats();
            playNotificationSound();
        }
    });
}

function setupGroupMessageListener(groupId) {
    firebaseDatabase.ref(`messages/${groupId}`).orderByChild('timestamp').limitToLast(1).on('child_added', (snapshot) => {
        const message = snapshot.val();
        const userId = firebaseAuth.currentUser?.uid;
        
        if (message.senderId !== userId) {
            // New message in group
            updateRecentChats();
            playNotificationSound();
        }
    });
}

function updateRequestsBadge() {
    const badge = document.getElementById('requestsBadge');
    if (!badge) return;
    
    const userId = firebaseAuth.currentUser?.uid;
    if (!userId) return;
    
    firebaseDatabase.ref(`chatRequests/${userId}`).orderByChild('status').equalTo('pending').once('value')
        .then(snapshot => {
            const count = snapshot.numChildren();
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error updating requests badge:', error);
        });
}

function updateRecentChats() {
    // This would update the recent chats list on the home page
    // Implementation depends on your specific UI requirements
}

// ===== START CHAT FUNCTION (called from home page) =====
async function startChat(targetUserId) {
    try {
        const userId = firebaseAuth.currentUser.uid;
        
        // Check if chat already exists
        const chatId = [userId, targetUserId].sort().join('_');
        const chatSnapshot = await firebaseDatabase.ref(`chats/${chatId}`).once('value');
        
        if (!chatSnapshot.exists()) {
            // Create new chat
            const chatData = {
                id: chatId,
                type: 'direct',
                members: {
                    [userId]: true,
                    [targetUserId]: true
                },
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                lastMessage: '',
                lastMessageTime: null,
                lastMessageType: null
            };
            
            await firebaseDatabase.ref(`chats/${chatId}`).set(chatData);
            
            // Add to contacts for both users
            await firebaseDatabase.ref(`users/${userId}/contacts/${targetUserId}`).set(true);
            await firebaseDatabase.ref(`users/${targetUserId}/contacts/${userId}`).set(true);
        }
        
        // Redirect to chat page
        window.location.href = `chat.html?chatId=${chatId}&type=direct`;
        
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast('Error starting chat', 'error');
    }
}

// ===== MEDIA VIEWER =====
function viewMedia(url, type) {
    // Create modal for viewing media
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90vw; max-height: 90vh;">
            <div class="modal-header">
                <h3>View Media</h3>
                <button class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0; display: flex; align-items: center; justify-content: center;">
                ${type === 'image' ? 
                    `<img src="${url}" alt="Media" style="max-width: 100%; max-height: 70vh; object-fit: contain;">` :
                    `<video src="${url}" controls style="max-width: 100%; max-height: 70vh;"></video>`
                }
            </div>
            <div class="modal-actions">
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Close</button>
                    <a href="${url}" download class="btn-primary">
                        <i class="fas fa-download"></i> Download
                    </a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ===== CLEANUP ON UNLOAD =====
window.addEventListener('beforeunload', async function() {
    if (firebaseAuth.currentUser) {
        const userId = firebaseAuth.currentUser.uid;
        
        // Set status to offline
        await firebaseDatabase.ref(`users/${userId}/status`).set('offline');
        await firebaseDatabase.ref(`users/${userId}/lastSeen`).set(firebase.database.ServerValue.TIMESTAMP);
        
        // Clear intervals
        if (onlineInterval) clearInterval(onlineInterval);
        if (typingTimeout) clearTimeout(typingTimeout);
    }
});

// ===== ERROR HANDLING =====
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showToast('An error occurred. Please refresh the page.', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showToast('An error occurred. Please try again.', 'error');
});

// Export functions for global access
window.signUpUser = signUpUser;
window.startChat = startChat;
window.viewMedia = viewMedia;
