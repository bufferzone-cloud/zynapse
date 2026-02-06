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
const cloudinaryConfig = {
    cloudName: 'dd3lcymrk',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    resourceType: 'auto'
};

// ===== FIREBASE INITIALIZATION =====
let app, auth, database, storage;
try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    storage = firebase.storage();
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let currentChat = null;
let userData = null;
let notificationSound = null;

// ===== UTILITY FUNCTIONS =====
function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function generateUserId() {
    return 'ZYN-' + Math.floor(1000 + Math.random() * 9000);
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString();
}

function playNotificationSound() {
    if (!notificationSound) {
        notificationSound = new Audio('notification.mp3');
    }
    notificationSound.play().catch(e => console.log("Audio play failed:", e));
}

// ===== AUTHENTICATION FUNCTIONS =====
async function handleSignUp(formData) {
    try {
        const { email, password, fullName, phoneNumber, profileImage, gender, birthDate } = formData;
        
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const userId = generateUserId();
        
        // Upload profile picture to Cloudinary if exists
        let profileUrl = '';
        if (profileImage) {
            profileUrl = await uploadToCloudinary(profileImage);
        }
        
        // Save user data to Realtime Database
        await database.ref('users/' + userCredential.user.uid).set({
            userId: userId,
            fullName: fullName,
            phoneNumber: phoneNumber,
            email: email,
            profileUrl: profileUrl,
            gender: gender || '',
            birthDate: birthDate || '',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            status: 'online',
            contacts: {},
            blockedUsers: {}
        });
        
        // Save userId mapping
        await database.ref('userIds/' + userId).set({
            uid: userCredential.user.uid,
            email: email
        });
        
        showToast('Account created successfully!', 'success');
        return true;
    } catch (error) {
        console.error('Sign up error:', error);
        showToast(error.message, 'error');
        return false;
    }
}

async function handleLogin(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Update user status
        await database.ref('users/' + userCredential.user.uid + '/status').set('online');
        await database.ref('users/' + userCredential.user.uid + '/lastSeen').set(firebase.database.ServerValue.TIMESTAMP);
        
        return true;
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
        return false;
    }
}

async function logout() {
    try {
        if (currentUser) {
            await database.ref('users/' + currentUser.uid + '/status').set('offline');
            await database.ref('users/' + currentUser.uid + '/lastSeen').set(firebase.database.ServerValue.TIMESTAMP);
        }
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ===== CLOUDINARY FUNCTIONS =====
async function uploadToCloudinary(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('cloud_name', cloudinaryConfig.cloudName);
        formData.append('folder', cloudinaryConfig.folder);
        
        fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, {
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
            reject(error);
        });
    });
}

// ===== CHAT FUNCTIONS =====
async function sendMessage(receiverId, message, type = 'text', mediaUrl = '') {
    try {
        const messageId = database.ref().child('messages').push().key;
        const messageData = {
            id: messageId,
            senderId: currentUser.uid,
            receiverId: receiverId,
            message: message,
            type: type,
            mediaUrl: mediaUrl,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        };
        
        // Save message to database
        await database.ref('messages/' + messageId).set(messageData);
        
        // Update chat metadata for both users
        const chatId = [currentUser.uid, receiverId].sort().join('_');
        const chatData = {
            lastMessage: message,
            lastMessageType: type,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            participants: {
                [currentUser.uid]: true,
                [receiverId]: true
            }
        };
        
        await database.ref('chats/' + chatId).set(chatData);
        
        // Update user's recent chats
        await database.ref('userChats/' + currentUser.uid + '/' + chatId).set({
            with: receiverId,
            lastMessage: message,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        await database.ref('userChats/' + receiverId + '/' + chatId).set({
            with: currentUser.uid,
            lastMessage: message,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        return true;
    } catch (error) {
        console.error('Send message error:', error);
        return false;
    }
}

async function sendChatRequest(receiverUserId) {
    try {
        // Find receiver by Zynapse ID
        const receiverRef = await database.ref('userIds/' + receiverUserId).once('value');
        if (!receiverRef.exists()) {
            showToast('User not found', 'error');
            return false;
        }
        
        const receiverUid = receiverRef.val().uid;
        const requestId = database.ref().child('chatRequests').push().key;
        
        const requestData = {
            id: requestId,
            senderId: currentUser.uid,
            receiverId: receiverUid,
            senderUserId: userData.userId,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        await database.ref('chatRequests/' + requestId).set(requestData);
        await database.ref('userRequests/' + receiverUid + '/' + requestId).set(true);
        
        showToast('Chat request sent', 'success');
        return true;
    } catch (error) {
        console.error('Send chat request error:', error);
        showToast('Failed to send request', 'error');
        return false;
    }
}

// ===== USER MANAGEMENT FUNCTIONS =====
async function searchUserByUserId(userId) {
    try {
        const userRef = await database.ref('userIds/' + userId).once('value');
        if (!userRef.exists()) {
            return null;
        }
        
        const uid = userRef.val().uid;
        const userDataRef = await database.ref('users/' + uid).once('value');
        return userDataRef.val();
    } catch (error) {
        console.error('Search user error:', error);
        return null;
    }
}

async function addContact(contactUid) {
    try {
        await database.ref('users/' + currentUser.uid + '/contacts/' + contactUid).set(true);
        await database.ref('users/' + contactUid + '/contacts/' + currentUser.uid).set(true);
        return true;
    } catch (error) {
        console.error('Add contact error:', error);
        return false;
    }
}

// ===== EVENT LISTENERS FOR INDEX.HTML =====
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is logged in, redirect to home
            window.location.href = 'home.html';
        } else {
            // Show welcome screen
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    setTimeout(() => {
                        loadingScreen.style.display = 'none';
                        document.getElementById('welcomeScreen').style.display = 'flex';
                    }, 400);
                }, 1000);
            }
        }
    });
    
    // Welcome screen buttons
    const signUpBtn = document.getElementById('signUpBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    if (signUpBtn) {
        signUpBtn.addEventListener('click', () => {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('signUpPage').style.display = 'flex';
        });
    }
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            document.getElementById('welcomeScreen').style.display = 'none';
            document.getElementById('loginPage').style.display = 'flex';
        });
    }
    
    // Back buttons
    const backToWelcome = document.getElementById('backToWelcome');
    const backToWelcomeFromLogin = document.getElementById('backToWelcomeFromLogin');
    
    if (backToWelcome) {
        backToWelcome.addEventListener('click', () => {
            document.getElementById('signUpPage').style.display = 'none';
            document.getElementById('welcomeScreen').style.display = 'flex';
        });
    }
    
    if (backToWelcomeFromLogin) {
        backToWelcomeFromLogin.addEventListener('click', () => {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('welcomeScreen').style.display = 'flex';
        });
    }
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            const input = document.getElementById(target);
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });
    
    // Sign up form steps
    const nextToProfile = document.getElementById('nextToProfile');
    const backToStep1 = document.getElementById('backToStep1');
    
    if (nextToProfile) {
        nextToProfile.addEventListener('click', () => {
            // Validate step 1
            const fullName = document.getElementById('fullName').value;
            const phoneNumber = document.getElementById('phoneNumber').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const agreeTerms = document.getElementById('agreeTerms').checked;
            
            if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 8) {
                showToast('Password must be at least 8 characters', 'error');
                return;
            }
            
            if (!agreeTerms) {
                showToast('You must agree to the terms and conditions', 'error');
                return;
            }
            
            // Move to step 2
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
        });
    }
    
    if (backToStep1) {
        backToStep1.addEventListener('click', () => {
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step1').style.display = 'block';
        });
    }
    
    // Profile image upload
    const uploadProfileBtn = document.getElementById('uploadProfileBtn');
    const profileImageInput = document.getElementById('profileImage');
    const profilePreview = document.getElementById('profilePreview');
    const removeProfileBtn = document.getElementById('removeProfileBtn');
    let profileImageFile = null;
    
    if (uploadProfileBtn) {
        uploadProfileBtn.addEventListener('click', () => {
            profileImageInput.click();
        });
    }
    
    if (profileImageInput) {
        profileImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Image must be less than 5MB', 'error');
                    return;
                }
                
                profileImageFile = file;
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                    removeProfileBtn.style.display = 'inline-flex';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removeProfileBtn) {
        removeProfileBtn.addEventListener('click', () => {
            profileImageFile = null;
            profileImageInput.value = '';
            profilePreview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-user-circle"></i>
                    <span>No image selected</span>
                    <p>Click to upload</p>
                </div>
            `;
            removeProfileBtn.style.display = 'none';
        });
    }
    
    // Registration
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const fullName = document.getElementById('fullName').value;
            const phoneNumber = document.getElementById('phoneNumber').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const gender = document.getElementById('gender').value;
            const birthDate = document.getElementById('birthDate').value;
            const showProfilePublic = document.getElementById('showProfilePublic').checked;
            
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<div class="spinner"></div> Registering...';
            
            const success = await handleSignUp({
                fullName,
                phoneNumber,
                email,
                password,
                profileImage: profileImageFile,
                gender,
                birthDate,
                showProfilePublic
            });
            
            registerBtn.disabled = false;
            registerBtn.innerHTML = 'Register <i class="fas fa-check"></i>';
            
            if (success) {
                // Auto login after registration
                await handleLogin(email, password);
            }
        });
    }
    
    // Login form
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    if (loginSubmitBtn) {
        loginSubmitBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast('Please enter email and password', 'error');
                return;
            }
            
            loginSubmitBtn.disabled = true;
            const spinner = loginSubmitBtn.querySelector('.spinner');
            const btnText = loginSubmitBtn.querySelector('.btn-text');
            
            spinner.style.display = 'block';
            btnText.style.display = 'none';
            
            const success = await handleLogin(email, password);
            
            loginSubmitBtn.disabled = false;
            spinner.style.display = 'none';
            btnText.style.display = 'inline';
            
            if (!success) {
                showToast('Login failed. Please check your credentials.', 'error');
            }
        });
    }
    
    // Navigation between auth forms
    const goToSignUp = document.getElementById('goToSignUp');
    if (goToSignUp) {
        goToSignUp.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('signUpPage').style.display = 'flex';
        });
    }
});

// ===== EVENT LISTENERS FOR HOME.HTML =====
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = user;
        
        // Load user data
        const userRef = await database.ref('users/' + user.uid).once('value');
        userData = userRef.val();
        
        if (!userData) {
            await logout();
            return;
        }
        
        // Update UI with user data
        updateUserUI();
        
        // Show app
        const loadingScreen = document.getElementById('loadingScreen');
        const appHome = document.querySelector('.app-home');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (appHome) appHome.style.display = 'flex';
                }, 400);
            }, 1000);
        }
        
        // Set up real-time listeners
        setupRealtimeListeners();
    });
    
    function updateUserUI() {
        if (!userData) return;
        
        // Update header
        const userName = document.getElementById('userName');
        const userIdDisplay = document.getElementById('userIdDisplay');
        const headerProfilePic = document.getElementById('headerProfilePic');
        const dropdownProfilePic = document.getElementById('dropdownProfilePic');
        const dropdownUserName = document.getElementById('dropdownUserName');
        const dropdownUserId = document.getElementById('dropdownUserId');
        
        if (userName) userName.textContent = userData.fullName;
        if (userIdDisplay) userIdDisplay.textContent = userData.userId;
        if (headerProfilePic) {
            headerProfilePic.src = userData.profileUrl || 'zynaps.png';
            headerProfilePic.onerror = () => {
                headerProfilePic.src = 'zynaps.png';
            };
        }
        if (dropdownProfilePic) {
            dropdownProfilePic.src = userData.profileUrl || 'zynaps.png';
            dropdownProfilePic.onerror = () => {
                dropdownProfilePic.src = 'zynaps.png';
            };
        }
        if (dropdownUserName) dropdownUserName.textContent = userData.fullName;
        if (dropdownUserId) dropdownUserId.textContent = userData.userId;
    }
    
    function setupRealtimeListeners() {
        if (!currentUser) return;
        
        // Listen for chat requests
        database.ref('userRequests/' + currentUser.uid).on('value', (snapshot) => {
            updateRequestsBadge(snapshot.numChildren());
        });
        
        // Listen for new messages
        database.ref('userChats/' + currentUser.uid).on('value', (snapshot) => {
            updateUnreadMessages();
        });
    }
    
    function updateRequestsBadge(count) {
        const badge = document.getElementById('requestsBadge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }
    
    function updateUnreadMessages() {
        // Implement unread message count logic
    }
    
    // Copy User ID
    const copyUserIdBtn = document.getElementById('copyUserIdBtn');
    if (copyUserIdBtn) {
        copyUserIdBtn.addEventListener('click', () => {
            const userId = userData.userId;
            navigator.clipboard.writeText(userId).then(() => {
                showToast('User ID copied to clipboard', 'success');
            });
        });
    }
    
    // Profile dropdown
    const profileMenuBtn = document.getElementById('profileMenuBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileMenuBtn) {
        profileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
    }
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.classList.remove('show');
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding page
            pages.forEach(p => {
                p.classList.remove('active');
                if (p.id === page + 'Page') {
                    p.classList.add('active');
                }
            });
        });
    });
    
    // Floating chat button
    const floatingChatBtn = document.getElementById('floatingChatBtn');
    const startChatModal = document.getElementById('startChatModal');
    const closeStartChatModal = document.getElementById('closeStartChatModal');
    const searchUserId = document.getElementById('searchUserId');
    const searchResult = document.getElementById('searchResult');
    
    if (floatingChatBtn) {
        floatingChatBtn.addEventListener('click', () => {
            if (startChatModal) startChatModal.classList.add('active');
        });
    }
    
    if (closeStartChatModal) {
        closeStartChatModal.addEventListener('click', () => {
            if (startChatModal) startChatModal.classList.remove('active');
        });
    }
    
    // Search user by ID
    if (searchUserId) {
        let searchTimeout;
        searchUserId.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const userId = searchUserId.value.trim();
            
            if (userId.length === 8 && userId.startsWith('ZYN-')) {
                searchTimeout = setTimeout(async () => {
                    const user = await searchUserByUserId(userId);
                    if (user && user.uid !== currentUser.uid) {
                        displaySearchResult(user);
                    } else {
                        showSearchError('User not found');
                    }
                }, 500);
            } else if (userId.length > 0) {
                showSearchError('Invalid Zynapse ID format (ZYN-XXXX)');
            } else {
                clearSearchResult();
            }
        });
    }
    
    function displaySearchResult(user) {
        const searchPlaceholder = document.getElementById('searchPlaceholder');
        if (searchPlaceholder) searchPlaceholder.style.display = 'none';
        
        if (searchResult) {
            searchResult.innerHTML = `
                <div class="user-found">
                    <img src="${user.profileUrl || 'zynaps.png'}" alt="${user.fullName}" class="profile-pic">
                    <div class="user-info">
                        <h4>${user.fullName}</h4>
                        <p>${user.userId}</p>
                        ${user.status === 'online' ? '<p class="online-status"><i class="fas fa-circle"></i> Online</p>' : ''}
                    </div>
                    <button class="btn-primary" id="sendRequestBtn">Send Request</button>
                </div>
            `;
            searchResult.classList.add('active');
            
            // Add event listener to send request button
            setTimeout(() => {
                const sendRequestBtn = document.getElementById('sendRequestBtn');
                if (sendRequestBtn) {
                    sendRequestBtn.addEventListener('click', async () => {
                        const success = await sendChatRequest(user.userId);
                        if (success) {
                            startChatModal.classList.remove('active');
                            searchUserId.value = '';
                            clearSearchResult();
                        }
                    });
                }
            }, 100);
        }
    }
    
    function showSearchError(message) {
        const searchPlaceholder = document.getElementById('searchPlaceholder');
        if (searchPlaceholder) searchPlaceholder.style.display = 'none';
        
        if (searchResult) {
            searchResult.innerHTML = `<p class="error">${message}</p>`;
            searchResult.classList.add('active');
        }
    }
    
    function clearSearchResult() {
        const searchPlaceholder = document.getElementById('searchPlaceholder');
        if (searchPlaceholder) searchPlaceholder.style.display = 'block';
        
        if (searchResult) {
            searchResult.innerHTML = '';
            searchResult.classList.remove('active');
        }
    }
    
    // Quick action buttons
    const startNewChatBtn = document.getElementById('startNewChatBtn');
    const createGroupBtn = document.getElementById('createGroupBtn');
    const addZyneBtn = document.getElementById('addZyneBtn');
    
    if (startNewChatBtn) {
        startNewChatBtn.addEventListener('click', () => {
            if (floatingChatBtn) floatingChatBtn.click();
        });
    }
    
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            const createGroupModal = document.getElementById('createGroupModal');
            if (createGroupModal) createGroupModal.classList.add('active');
        });
    }
    
    if (addZyneBtn) {
        addZyneBtn.addEventListener('click', () => {
            const addZyneModal = document.getElementById('addZyneModal');
            if (addZyneModal) addZyneModal.classList.add('active');
        });
    }
    
    // Modal close buttons
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });
    
    // Character counter for Zyne text
    const zyneText = document.getElementById('zyneText');
    const zyneCharCount = document.getElementById('zyneCharCount');
    
    if (zyneText && zyneCharCount) {
        zyneText.addEventListener('input', () => {
            zyneCharCount.textContent = `${zyneText.value.length}/250`;
        });
    }
});

// ===== EVENT LISTENERS FOR CHAT.HTML =====
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = user;
        
        // Get chat partner from URL
        const urlParams = new URLSearchParams(window.location.search);
        const chatWith = urlParams.get('chat');
        
        if (!chatWith) {
            window.location.href = 'home.html';
            return;
        }
        
        // Load user data
        const userRef = await database.ref('users/' + user.uid).once('value');
        userData = userRef.val();
        
        // Load chat partner data
        const partnerRef = await database.ref('users/' + chatWith).once('value');
        const partnerData = partnerRef.val();
        
        if (!partnerData) {
            window.location.href = 'home.html';
            return;
        }
        
        currentChat = {
            partnerId: chatWith,
            partnerData: partnerData
        };
        
        // Update chat UI
        updateChatUI();
        
        // Load messages
        loadMessages();
        
        // Show chat page
        const loadingScreen = document.getElementById('loadingScreen');
        const chatPage = document.querySelector('.chat-page');
        
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (chatPage) chatPage.style.display = 'flex';
                }, 400);
            }, 1000);
        }
        
        // Set up real-time message listener
        setupMessageListener();
    });
    
    function updateChatUI() {
        if (!currentChat || !currentChat.partnerData) return;
        
        const chatUserName = document.getElementById('chatUserName');
        const chatUserPic = document.getElementById('chatUserPic');
        const chatUserStatus = document.getElementById('chatUserStatus');
        const chatUserStatusText = document.getElementById('chatUserStatusText');
        
        if (chatUserName) chatUserName.textContent = currentChat.partnerData.fullName;
        if (chatUserPic) {
            chatUserPic.src = currentChat.partnerData.profileUrl || 'zynaps.png';
            chatUserPic.onerror = () => {
                chatUserPic.src = 'zynaps.png';
            };
        }
        if (chatUserStatus) {
            chatUserStatus.className = 'status-dot ' + (currentChat.partnerData.status || 'offline');
        }
        if (chatUserStatusText) {
            chatUserStatusText.textContent = currentChat.partnerData.status === 'online' ? 'Online' : 'Last seen ' + formatTimestamp(currentChat.partnerData.lastSeen);
        }
    }
    
    async function loadMessages() {
        if (!currentUser || !currentChat) return;
        
        const chatId = [currentUser.uid, currentChat.partnerId].sort().join('_');
        const messagesRef = database.ref('messages').orderByChild('timestamp').limitToLast(50);
        
        messagesRef.on('value', (snapshot) => {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                if ((message.senderId === currentUser.uid && message.receiverId === currentChat.partnerId) ||
                    (message.senderId === currentChat.partnerId && message.receiverId === currentUser.uid)) {
                    messages.push(message);
                }
            });
            
            displayMessages(messages);
        });
    }
    
    function displayMessages(messages) {
        const chatMessages = document.getElementById('chatMessages');
        const emptyChatState = document.getElementById('emptyChatState');
        
        if (!chatMessages) return;
        
        if (messages.length === 0) {
            if (emptyChatState) emptyChatState.style.display = 'flex';
            return;
        }
        
        if (emptyChatState) emptyChatState.style.display = 'none';
        
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Group messages by date
        const groupedMessages = {};
        messages.forEach(message => {
            const date = new Date(message.timestamp).toDateString();
            if (!groupedMessages[date]) {
                groupedMessages[date] = [];
            }
            groupedMessages[date].push(message);
        });
        
        // Clear and display messages
        chatMessages.innerHTML = '';
        
        Object.keys(groupedMessages).forEach(date => {
            // Add date separator
            const dateElement = document.createElement('div');
            dateElement.className = 'message-date';
            dateElement.textContent = new Date(date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            chatMessages.appendChild(dateElement);
            
            // Add messages for this date
            groupedMessages[date].forEach(message => {
                const messageElement = createMessageElement(message);
                chatMessages.appendChild(messageElement);
            });
        });
        
        // Scroll to bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }
    
    function createMessageElement(message) {
        const isSent = message.senderId === currentUser.uid;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        
        let messageContent = '';
        if (message.type === 'text') {
            messageContent = `<p>${message.message}</p>`;
        } else if (message.type === 'image') {
            messageContent = `
                <div class="media-message">
                    <img src="${message.mediaUrl}" alt="Image" class="chat-media" onclick="previewMedia('${message.mediaUrl}', 'image')">
                    ${message.message ? `<p>${message.message}</p>` : ''}
                </div>
            `;
        } else if (message.type === 'video') {
            messageContent = `
                <div class="media-message">
                    <video src="${message.mediaUrl}" controls class="chat-media" onclick="previewMedia('${message.mediaUrl}', 'video')"></video>
                    ${message.message ? `<p>${message.message}</p>` : ''}
                </div>
            `;
        } else if (message.type === 'file') {
            const fileName = message.message || 'File';
            messageContent = `
                <div class="file-message">
                    <a href="${message.mediaUrl}" target="_blank" class="file-link">
                        <i class="fas fa-file"></i>
                        <span>${fileName}</span>
                    </a>
                </div>
            `;
        }
        
        messageDiv.innerHTML = `
            <div class="message-bubble">
                ${messageContent}
                <span class="message-time">
                    ${formatTimestamp(message.timestamp)}
                    ${isSent ? `<span class="message-status">${message.read ? '✓✓' : '✓'}</span>` : ''}
                </span>
            </div>
        `;
        
        return messageDiv;
    }
    
    function setupMessageListener() {
        if (!currentUser || !currentChat) return;
        
        const chatId = [currentUser.uid, currentChat.partnerId].sort().join('_');
        const messagesRef = database.ref('messages');
        
        messagesRef.orderByChild('timestamp').limitToLast(1).on('child_added', (snapshot) => {
            const message = snapshot.val();
            if ((message.senderId === currentUser.uid && message.receiverId === currentChat.partnerId) ||
                (message.senderId === currentChat.partnerId && message.receiverId === currentUser.uid)) {
                // Mark as read if received
                if (message.receiverId === currentUser.uid && !message.read) {
                    database.ref('messages/' + snapshot.key + '/read').set(true);
                }
                
                // Play notification sound for received messages
                if (message.senderId === currentChat.partnerId) {
                    playNotificationSound();
                }
            }
        });
    }
    
    // Back button
    const backToHome = document.getElementById('backToHome');
    if (backToHome) {
        backToHome.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    // Send message
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    if (sendMessageBtn && messageInput) {
        sendMessageBtn.addEventListener('click', async () => {
            const message = messageInput.value.trim();
            if (!message || !currentChat) return;
            
            const success = await sendMessage(currentChat.partnerId, message, 'text');
            if (success) {
                messageInput.value = '';
            }
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageBtn.click();
            }
        });
    }
    
    // Attachment functionality
    const attachBtn = document.getElementById('attachBtn');
    const attachmentOptions = document.getElementById('attachmentOptions');
    
    if (attachBtn) {
        attachBtn.addEventListener('click', () => {
            attachmentOptions.classList.toggle('show');
        });
    }
    
    // Close attachment options when clicking outside
    document.addEventListener('click', (e) => {
        if (!attachBtn.contains(e.target) && !attachmentOptions.contains(e.target)) {
            attachmentOptions.classList.remove('show');
        }
    });
    
    // Media attachment
    const attachPhoto = document.getElementById('attachPhoto');
    const attachVideo = document.getElementById('attachVideo');
    const attachFile = document.getElementById('attachFile');
    
    if (attachPhoto) {
        attachPhoto.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await sendMediaMessage(file, 'image');
                }
            };
            input.click();
            attachmentOptions.classList.remove('show');
        });
    }
    
    if (attachVideo) {
        attachVideo.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await sendMediaMessage(file, 'video');
                }
            };
            input.click();
            attachmentOptions.classList.remove('show');
        });
    }
    
    if (attachFile) {
        attachFile.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await sendMediaMessage(file, 'file');
                }
            };
            input.click();
            attachmentOptions.classList.remove('show');
        });
    }
    
    async function sendMediaMessage(file, type) {
        try {
            showToast('Uploading...', 'info');
            const mediaUrl = await uploadToCloudinary(file);
            
            const caption = type === 'image' || type === 'video' ? 
                prompt('Add a caption (optional):') || '' : 
                file.name;
            
            const success = await sendMessage(currentChat.partnerId, caption, type, mediaUrl);
            if (success) {
                showToast('Sent', 'success');
            }
        } catch (error) {
            console.error('Send media error:', error);
            showToast('Failed to send media', 'error');
        }
    }
    
    // Chat dropdown menu
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    const chatDropdown = document.getElementById('chatDropdown');
    
    if (chatMenuBtn) {
        chatMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chatDropdown.classList.toggle('show');
        });
    }
    
    document.addEventListener('click', () => {
        if (chatDropdown) chatDropdown.classList.remove('show');
    });
    
    // Block user functionality
    const blockUserBtn = document.getElementById('blockUserBtn');
    const blockUserModal = document.getElementById('blockUserModal');
    const confirmBlock = document.getElementById('confirmBlock');
    
    if (blockUserBtn) {
        blockUserBtn.addEventListener('click', () => {
            if (blockUserModal) blockUserModal.classList.add('active');
            if (chatDropdown) chatDropdown.classList.remove('show');
        });
    }
    
    if (confirmBlock) {
        confirmBlock.addEventListener('click', async () => {
            if (!currentChat) return;
            
            try {
                await database.ref('users/' + currentUser.uid + '/blockedUsers/' + currentChat.partnerId).set(true);
                showToast('User blocked', 'success');
                if (blockUserModal) blockUserModal.classList.remove('active');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } catch (error) {
                console.error('Block user error:', error);
                showToast('Failed to block user', 'error');
            }
        });
    }
    
    // Modal close handlers
    const modalCloseBtns = document.querySelectorAll('.close-modal');
    modalCloseBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-overlay');
            if (modal) modal.classList.remove('active');
        });
    });
});

// Global function for media preview
window.previewMedia = function(url, type) {
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    const mediaPreviewContent = document.getElementById('mediaPreviewContent');
    
    if (!mediaPreviewModal || !mediaPreviewContent) return;
    
    if (type === 'image') {
        mediaPreviewContent.innerHTML = `<img src="${url}" alt="Preview" style="width: 100%; border-radius: 10px;">`;
    } else if (type === 'video') {
        mediaPreviewContent.innerHTML = `
            <video src="${url}" controls style="width: 100%; border-radius: 10px;"></video>
        `;
    }
    
    mediaPreviewModal.classList.add('active');
};

// Make functions available globally for onclick handlers
window.logout = logout;
window.previewMedia = function(url, type) {
    // Implementation from above
};
