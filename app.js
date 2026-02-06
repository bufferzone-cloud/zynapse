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
const CLOUDINARY_ACCOUNT = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    apiSecret: 'RHDQG1YP6jqvn4UADq3nJWHIeHQ',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse/media',
    environmentVariable: 'CLOUDINARY_URL=cloudinary://489857926297197:RHDQG1YP6jqvn4UADq3nJWHIeHQ@dd3lcymrk',
    accountType: 'cloudinary'
};

// ===== INITIALIZE FIREBASE =====
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.log("Firebase already initialized");
}

const auth = firebase.auth();
const database = firebase.database();

// ===== GLOBAL VARIABLES =====
let currentUser = null;
let userData = null;
let chatPartnerId = null;
let chatPartnerData = null;
let chatId = null;
let typingTimeout = null;
let onlineStatusInterval = null;
let messageListeners = {};

// ===== UTILITY FUNCTIONS =====
function generateUserID() {
    return `ZYN-${Math.floor(1000 + Math.random() * 9000)}`;
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, duration);
}

function playNotificationSound() {
    const sound = document.getElementById('notificationSound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    
    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ===== CLOUDINARY UPLOAD =====
async function uploadToCloudinary(file, type = 'image') {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_ACCOUNT.uploadPreset);
        formData.append('folder', CLOUDINARY_ACCOUNT.folder);
        
        // Set resource type based on file type
        if (type === 'video') {
            formData.append('resource_type', 'video');
        } else if (file.type.startsWith('image/')) {
            formData.append('resource_type', 'image');
        } else {
            formData.append('resource_type', 'raw');
        }
        
        // File size validation (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            reject(new Error('File size exceeds 50MB limit'));
            return;
        }
        
        const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_ACCOUNT.cloudName}/upload`;
        
        fetch(url, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                reject(new Error(data.error.message));
            } else {
                resolve({
                    url: data.secure_url,
                    publicId: data.public_id,
                    type: data.resource_type,
                    format: data.format,
                    size: data.bytes
                });
            }
        })
        .catch(error => {
            reject(error);
        });
    });
}

// ===== AUTHENTICATION FUNCTIONS =====
function initializeAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            
            if (window.location.pathname.includes('home.html')) {
                initializeHomePage();
            } else if (window.location.pathname.includes('chat.html')) {
                initializeChatPage();
            } else {
                window.location.href = 'home.html';
            }
        } else {
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.endsWith('/')) {
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
        
        // Update online status
        await database.ref(`users/${uid}/status`).set('online');
        await database.ref(`users/${uid}/lastSeen`).set(Date.now());
        
        // Start online status heartbeat
        if (onlineStatusInterval) clearInterval(onlineStatusInterval);
        onlineStatusInterval = setInterval(async () => {
            if (currentUser) {
                await database.ref(`users/${currentUser.uid}/lastSeen`).set(Date.now());
            }
        }, 30000);
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
    }
}

async function registerUser(email, password, userData) {
    try {
        // Create auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        
        // Generate unique user ID
        let userId = generateUserID();
        let userIdExists = true;
        
        // Ensure unique user ID
        while (userIdExists) {
            const snapshot = await database.ref('userIDs').child(userId).once('value');
            if (!snapshot.exists()) {
                userIdExists = false;
            } else {
                userId = generateUserID();
            }
        }
        
        // Prepare user data for database
        const userProfile = {
            uid: uid,
            userId: userId,
            email: email,
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber,
            profilePicture: userData.profilePicture || '',
            status: 'online',
            lastSeen: Date.now(),
            createdAt: Date.now(),
            contacts: {},
            blockedUsers: {},
            chatRequests: {},
            groups: {},
            zynes: {}
        };
        
        // Save user data
        await database.ref(`users/${uid}`).set(userProfile);
        await database.ref(`userIDs/${userId}`).set(uid);
        await database.ref(`userEmails/${email.replace(/\./g, '_')}`).set(uid);
        
        return userCredential;
        
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

async function logout() {
    try {
        if (currentUser) {
            await database.ref(`users/${currentUser.uid}/status`).set('offline');
        }
        if (onlineStatusInterval) clearInterval(onlineStatusInterval);
        
        // Clear all message listeners
        Object.keys(messageListeners).forEach(chatId => {
            if (messageListeners[chatId]) {
                messageListeners[chatId]();
            }
        });
        messageListeners = {};
        
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ===== HOME PAGE FUNCTIONS =====
function initializeHomePage() {
    const loadingScreen = document.getElementById('loadingScreen');
    const appContainer = document.getElementById('appContainer');
    
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (appContainer) appContainer.style.display = 'flex';
    
    // Update user info in header
    updateUserInfo();
    
    // Initialize navigation
    initializeNavigation();
    
    // Initialize modals
    initializeModals();
    
    // Initialize event listeners
    initializeHomeEventListeners();
    
    // Load initial data
    loadInitialData();
    
    // Set up real-time listeners
    setupRealtimeListeners();
}

function updateUserInfo() {
    if (!userData) return;
    
    // Update header info
    const userNameElement = document.getElementById('userName');
    const userIDElement = document.getElementById('userID');
    const headerProfilePic = document.getElementById('headerProfilePic');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserID = document.getElementById('dropdownUserID');
    const dropdownProfilePic = document.getElementById('dropdownProfilePic');
    
    if (userNameElement) userNameElement.textContent = userData.fullName;
    if (userIDElement) userIDElement.textContent = userData.userId;
    if (dropdownUserName) dropdownUserName.textContent = userData.fullName;
    if (dropdownUserID) dropdownUserID.textContent = userData.userId;
    
    if (userData.profilePicture && headerProfilePic) {
        headerProfilePic.src = userData.profilePicture;
    }
    if (userData.profilePicture && dropdownProfilePic) {
        dropdownProfilePic.src = userData.profilePicture;
    }
}

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const pageId = item.getAttribute('data-page');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${pageId}Page`) {
                    page.classList.add('active');
                }
            });
            
            // Load page-specific data
            switch(pageId) {
                case 'zynes':
                    loadZynes();
                    break;
                case 'groups':
                    loadGroups();
                    break;
                case 'requests':
                    loadChatRequests();
                    break;
                case 'contacts':
                    loadContacts();
                    break;
            }
        });
    });
    
    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active tab
            tabButtons.forEach(tab => tab.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding tab content
            if (tabId === 'myZynes') {
                document.getElementById('myZynesTab').style.display = 'block';
                document.getElementById('viewZynesTab').style.display = 'none';
            } else if (tabId === 'viewZynes') {
                document.getElementById('myZynesTab').style.display = 'none';
                document.getElementById('viewZynesTab').style.display = 'block';
                loadContactsZynes();
            } else if (tabId === 'incomingRequests') {
                document.getElementById('incomingRequestsTab').style.display = 'block';
                document.getElementById('sentRequestsTab').style.display = 'none';
            } else if (tabId === 'sentRequests') {
                document.getElementById('incomingRequestsTab').style.display = 'none';
                document.getElementById('sentRequestsTab').style.display = 'block';
                loadSentRequests();
            }
        });
    });
}

function initializeModals() {
    // Start Chat Modal
    const startChatModal = document.getElementById('startChatModal');
    const startChatFloatingBtn = document.getElementById('startChatFloatingBtn');
    const closeStartChatModal = document.getElementById('closeStartChatModal');
    const cancelSearchBtn = document.getElementById('cancelSearchBtn');
    const searchUserIDInput = document.getElementById('searchUserID');
    
    if (startChatFloatingBtn) {
        startChatFloatingBtn.addEventListener('click', () => {
            if (startChatModal) startChatModal.classList.add('active');
            if (searchUserIDInput) searchUserIDInput.focus();
        });
    }
    
    if (closeStartChatModal) {
        closeStartChatModal.addEventListener('click', () => {
            if (startChatModal) startChatModal.classList.remove('active');
            resetSearchModal();
        });
    }
    
    if (cancelSearchBtn) {
        cancelSearchBtn.addEventListener('click', () => {
            if (startChatModal) startChatModal.classList.remove('active');
            resetSearchModal();
        });
    }
    
    // Add Contact Modal
    const addContactModal = document.getElementById('addContactModal');
    const addContactBtn = document.getElementById('addContactBtn');
    const closeAddContactModal = document.getElementById('closeAddContactModal');
    const cancelContactSearchBtn = document.getElementById('cancelContactSearchBtn');
    
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            if (addContactModal) addContactModal.classList.add('active');
        });
    }
    
    if (closeAddContactModal) {
        closeAddContactModal.addEventListener('click', () => {
            if (addContactModal) addContactModal.classList.remove('active');
            resetContactSearchModal();
        });
    }
    
    if (cancelContactSearchBtn) {
        cancelContactSearchBtn.addEventListener('click', () => {
            if (addContactModal) addContactModal.classList.remove('active');
            resetContactSearchModal();
        });
    }
    
    // User ID search functionality
    if (searchUserIDInput) {
        searchUserIDInput.addEventListener('input', handleUserIDSearch);
    }
    
    const contactUserIDInput = document.getElementById('contactUserID');
    if (contactUserIDInput) {
        contactUserIDInput.addEventListener('input', handleContactSearch);
    }
}

function initializeHomeEventListeners() {
    // Copy User ID
    const copyUserIDBtn = document.getElementById('copyUserIDBtn');
    if (copyUserIDBtn) {
        copyUserIDBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(userData.userId).then(() => {
                showToast('User ID copied to clipboard', 'success');
            });
        });
    }
    
    // Profile dropdown
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileDropdownBtn) {
        profileDropdownBtn.addEventListener('click', (e) => {
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
    
    // Edit Profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditProfileModal = document.getElementById('closeEditProfileModal');
    const cancelEditProfileBtn = document.getElementById('cancelEditProfileBtn');
    
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (editProfileModal) {
                populateEditProfileForm();
                editProfileModal.classList.add('active');
            }
        });
    }
    
    if (closeEditProfileModal) {
        closeEditProfileModal.addEventListener('click', () => {
            if (editProfileModal) editProfileModal.classList.remove('active');
        });
    }
    
    if (cancelEditProfileBtn) {
        cancelEditProfileBtn.addEventListener('click', () => {
            if (editProfileModal) editProfileModal.classList.remove('active');
        });
    }
    
    // Save Profile
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    
    // Quick action cards
    const startChatCard = document.getElementById('startChatCard');
    if (startChatCard) {
        startChatCard.addEventListener('click', () => {
            document.getElementById('startChatModal').classList.add('active');
        });
    }
    
    const createGroupCard = document.getElementById('createGroupCard');
    if (createGroupCard) {
        createGroupCard.addEventListener('click', () => {
            document.getElementById('createGroupModal').classList.add('active');
        });
    }
    
    const addContactCard = document.getElementById('addContactCard');
    if (addContactCard) {
        addContactCard.addEventListener('click', () => {
            document.getElementById('addContactModal').classList.add('active');
        });
    }
    
    const viewZynesCard = document.getElementById('viewZynesCard');
    if (viewZynesCard) {
        viewZynesCard.addEventListener('click', () => {
            document.querySelector('.nav-item[data-page="zynes"]').click();
        });
    }
    
    // Create Group Modal
    const createGroupBtn = document.getElementById('createGroupBtn');
    const createGroupModal = document.getElementById('createGroupModal');
    const closeCreateGroupModal = document.getElementById('closeCreateGroupModal');
    const cancelCreateGroupBtn = document.getElementById('cancelCreateGroupBtn');
    
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', () => {
            if (createGroupModal) createGroupModal.classList.add('active');
        });
    }
    
    if (closeCreateGroupModal) {
        closeCreateGroupModal.addEventListener('click', () => {
            if (createGroupModal) createGroupModal.classList.remove('active');
            resetGroupModal();
        });
    }
    
    if (cancelCreateGroupBtn) {
        cancelCreateGroupBtn.addEventListener('click', () => {
            if (createGroupModal) createGroupModal.classList.remove('active');
            resetGroupModal();
        });
    }
    
    // Create First Group Button
    const createFirstGroupBtn = document.getElementById('createFirstGroupBtn');
    if (createFirstGroupBtn) {
        createFirstGroupBtn.addEventListener('click', () => {
            if (createGroupModal) createGroupModal.classList.add('active');
        });
    }
    
    // Add Zyne Modal
    const addZyneBtn = document.getElementById('addZyneBtn');
    const addZyneModal = document.getElementById('addZyneModal');
    const closeAddZyneModal = document.getElementById('closeAddZyneModal');
    const cancelAddZyneBtn = document.getElementById('cancelAddZyneBtn');
    
    if (addZyneBtn) {
        addZyneBtn.addEventListener('click', () => {
            if (addZyneModal) addZyneModal.classList.add('active');
        });
    }
    
    if (closeAddZyneModal) {
        closeAddZyneModal.addEventListener('click', () => {
            if (addZyneModal) addZyneModal.classList.remove('active');
            resetZyneModal();
        });
    }
    
    if (cancelAddZyneBtn) {
        cancelAddZyneBtn.addEventListener('click', () => {
            if (addZyneModal) addZyneModal.classList.remove('active');
            resetZyneModal();
        });
    }
    
    // Create First Zyne Button
    const createFirstZyneBtn = document.getElementById('createFirstZyneBtn');
    if (createFirstZyneBtn) {
        createFirstZyneBtn.addEventListener('click', () => {
            if (addZyneModal) addZyneModal.classList.add('active');
        });
    }
}

async function loadInitialData() {
    // Load recent chats
    await loadRecentChats();
    
    // Load chat requests badge
    await updateChatRequestsBadge();
    
    // Load groups badge
    await updateGroupsBadge();
}

async function loadRecentChats() {
    try {
        const chatsContainer = document.getElementById('recentChatsList');
        if (!chatsContainer) return;
        
        // Clear existing content
        chatsContainer.innerHTML = '';
        
        // Get user's chats
        const snapshot = await database.ref(`userChats/${currentUser.uid}`).once('value');
        const chats = snapshot.val();
        
        if (!chats) {
            chatsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No chats yet</h3>
                    <p>Start a conversation by clicking the chat button below</p>
                </div>
            `;
            return;
        }
        
        // Get last message for each chat
        const chatPromises = Object.keys(chats).map(async (chatId) => {
            const chatData = chats[chatId];
            const lastMessageSnapshot = await database.ref(`messages/${chatId}`)
                .orderByChild('timestamp')
                .limitToLast(1)
                .once('value');
            
            let lastMessage = null;
            lastMessageSnapshot.forEach(childSnapshot => {
                lastMessage = childSnapshot.val();
            });
            
            return {
                chatId,
                chatData,
                lastMessage
            };
        });
        
        const chatResults = await Promise.all(chatPromises);
        
        // Sort by last message timestamp
        chatResults.sort((a, b) => {
            const timeA = a.lastMessage ? a.lastMessage.timestamp : 0;
            const timeB = b.lastMessage ? b.lastMessage.timestamp : 0;
            return timeB - timeA;
        });
        
        // Display recent chats (limit to 5)
        const recentChats = chatResults.slice(0, 5);
        
        if (recentChats.length === 0) {
            chatsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No chats yet</h3>
                    <p>Start a conversation by clicking the chat button below</p>
                </div>
            `;
            return;
        }
        
        recentChats.forEach(async (chat) => {
            const chatElement = await createChatElement(chat.chatId, chat.chatData, chat.lastMessage);
            if (chatElement) {
                chatsContainer.appendChild(chatElement);
            }
        });
        
    } catch (error) {
        console.error('Error loading recent chats:', error);
        showToast('Error loading chats', 'error');
    }
}

async function createChatElement(chatId, chatData, lastMessage) {
    try {
        let displayName = '';
        let profilePicture = '';
        let isGroup = chatData.type === 'group';
        
        if (isGroup) {
            // For groups, get group info
            const groupSnapshot = await database.ref(`groups/${chatId}`).once('value');
            const groupData = groupSnapshot.val();
            if (groupData) {
                displayName = groupData.name;
                profilePicture = groupData.profilePicture || '';
            }
        } else {
            // For individual chats, get other user's info
            const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
            if (otherUserId) {
                const userSnapshot = await database.ref(`users/${otherUserId}`).once('value');
                const userData = userSnapshot.val();
                if (userData) {
                    displayName = userData.fullName;
                    profilePicture = userData.profilePicture || '';
                }
            }
        }
        
        const chatElement = document.createElement('div');
        chatElement.className = 'contact-card';
        chatElement.dataset.chatId = chatId;
        
        const lastMessageText = lastMessage ? 
            (lastMessage.type === 'text' ? lastMessage.content : 
             lastMessage.type === 'image' ? '📷 Photo' :
             lastMessage.type === 'video' ? '🎥 Video' : '📎 File') : 
            'No messages yet';
        
        const time = lastMessage ? formatTime(lastMessage.timestamp) : '';
        
        chatElement.innerHTML = `
            <img src="${profilePicture}" alt="${displayName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
            <div class="contact-info">
                <h4>${displayName}</h4>
                <p>${lastMessageText}</p>
                <span class="time">${time}</span>
            </div>
            <div class="contact-actions">
                <button class="action-btn chat-btn" data-chat-id="${chatId}">
                    <i class="fas fa-comment"></i> Chat
                </button>
            </div>
        `;
        
        // Add click event to chat button
        const chatBtn = chatElement.querySelector('.chat-btn');
        if (chatBtn) {
            chatBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chatId = e.currentTarget.dataset.chatId;
                window.location.href = `chat.html?chatId=${chatId}`;
            });
        }
        
        // Add click event to entire card
        chatElement.addEventListener('click', () => {
            window.location.href = `chat.html?chatId=${chatId}`;
        });
        
        return chatElement;
        
    } catch (error) {
        console.error('Error creating chat element:', error);
        return null;
    }
}

async function handleUserIDSearch(e) {
    const userId = e.target.value.trim().toUpperCase();
    const searchResult = document.getElementById('userSearchResult');
    const sendRequestBtn = document.getElementById('sendRequestBtn');
    
    if (!searchResult) return;
    
    // Reset
    sendRequestBtn.style.display = 'none';
    searchResult.innerHTML = `
        <div class="search-placeholder">
            <i class="fas fa-search"></i>
            <p>Enter a User ID to search for users</p>
        </div>
    `;
    
    if (userId.length !== 8 || !userId.startsWith('ZYN-')) {
        return;
    }
    
    try {
        // Check if user exists
        const uidSnapshot = await database.ref(`userIDs/${userId}`).once('value');
        if (!uidSnapshot.exists()) {
            searchResult.innerHTML = `
                <div class="error">
                    <i class="fas fa-user-times"></i>
                    <p>User not found. Please check the User ID.</p>
                </div>
            `;
            return;
        }
        
        const uid = uidSnapshot.val();
        
        // Don't allow searching yourself
        if (uid === currentUser.uid) {
            searchResult.innerHTML = `
                <div class="error">
                    <i class="fas fa-user"></i>
                    <p>This is your own User ID.</p>
                </div>
            `;
            return;
        }
        
        // Get user data
        const userSnapshot = await database.ref(`users/${uid}`).once('value');
        const userData = userSnapshot.val();
        
        if (!userData) {
            searchResult.innerHTML = `
                <div class="error">
                    <i class="fas fa-user-times"></i>
                    <p>User not found.</p>
                </div>
            `;
            return;
        }
        
        // Check if already in contacts
        const isContact = userData.contacts && userData.contacts[currentUser.uid];
        
        searchResult.innerHTML = `
            <div class="user-found">
                <img src="${userData.profilePicture || ''}" alt="${userData.fullName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
                <div class="user-info">
                    <h4>${userData.fullName}</h4>
                    <p>${userData.userId}</p>
                    ${isContact ? '<p class="already-contact">✓ Already in your contacts</p>' : ''}
                </div>
            </div>
        `;
        
        // Show send request button if not already in contacts
        if (!isContact) {
            sendRequestBtn.style.display = 'flex';
            sendRequestBtn.dataset.targetUid = uid;
        }
        
    } catch (error) {
        console.error('Error searching user:', error);
        searchResult.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error searching for user. Please try again.</p>
            </div>
        `;
    }
}

async function handleContactSearch(e) {
    const userId = e.target.value.trim().toUpperCase();
    const searchResult = document.getElementById('contactSearchResult');
    const addContactConfirmBtn = document.getElementById('addContactConfirmBtn');
    
    if (!searchResult) return;
    
    // Reset
    addContactConfirmBtn.style.display = 'none';
    searchResult.innerHTML = `
        <div class="search-placeholder">
            <i class="fas fa-search"></i>
            <p>Enter a User ID to search for users</p>
        </div>
    `;
    
    if (userId.length !== 8 || !userId.startsWith('ZYN-')) {
        return;
    }
    
    try {
        // Check if user exists
        const uidSnapshot = await database.ref(`userIDs/${userId}`).once('value');
        if (!uidSnapshot.exists()) {
            searchResult.innerHTML = `
                <div class="error">
                    <i class="fas fa-user-times"></i>
                    <p>User not found. Please check the User ID.</p>
                </div>
            `;
            return;
        }
        
        const uid = uidSnapshot.val();
        
        // Don't allow adding yourself
        if (uid === currentUser.uid) {
            searchResult.innerHTML = `
                <div class="error">
                    <i class="fas fa-user"></i>
                    <p>This is your own User ID.</p>
                </div>
            `;
            return;
        }
        
        // Get user data
        const userSnapshot = await database.ref(`users/${uid}`).once('value');
        const userData = userSnapshot.val();
        
        if (!userData) {
            searchResult.innerHTML = `
                <div class="error">
                    <i class="fas fa-user-times"></i>
                    <p>User not found.</p>
                </div>
            `;
            return;
        }
        
        // Check if already in contacts
        const isContact = userData.contacts && userData.contacts[currentUser.uid];
        
        searchResult.innerHTML = `
            <div class="user-found">
                <img src="${userData.profilePicture || ''}" alt="${userData.fullName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
                <div class="user-info">
                    <h4>${userData.fullName}</h4>
                    <p>${userData.userId}</p>
                    ${isContact ? '<p class="already-contact">✓ Already in your contacts</p>' : ''}
                </div>
            </div>
        `;
        
        // Show add contact button if not already in contacts
        if (!isContact) {
            addContactConfirmBtn.style.display = 'flex';
            addContactConfirmBtn.dataset.targetUid = uid;
        }
        
    } catch (error) {
        console.error('Error searching user:', error);
        searchResult.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error searching for user. Please try again.</p>
            </div>
        `;
    }
}

function resetSearchModal() {
    const searchUserIDInput = document.getElementById('searchUserID');
    const searchResult = document.getElementById('userSearchResult');
    const sendRequestBtn = document.getElementById('sendRequestBtn');
    
    if (searchUserIDInput) searchUserIDInput.value = '';
    if (sendRequestBtn) {
        sendRequestBtn.style.display = 'none';
        delete sendRequestBtn.dataset.targetUid;
    }
    if (searchResult) {
        searchResult.innerHTML = `
            <div class="search-placeholder">
                <i class="fas fa-search"></i>
                <p>Enter a User ID to search for users</p>
            </div>
        `;
    }
}

function resetContactSearchModal() {
    const contactUserIDInput = document.getElementById('contactUserID');
    const searchResult = document.getElementById('contactSearchResult');
    const addContactConfirmBtn = document.getElementById('addContactConfirmBtn');
    
    if (contactUserIDInput) contactUserIDInput.value = '';
    if (addContactConfirmBtn) {
        addContactConfirmBtn.style.display = 'none';
        delete addContactConfirmBtn.dataset.targetUid;
    }
    if (searchResult) {
        searchResult.innerHTML = `
            <div class="search-placeholder">
                <i class="fas fa-search"></i>
                <p>Enter a User ID to search for users</p>
            </div>
        `;
    }
}

// ===== CHAT REQUEST FUNCTIONS =====
async function sendChatRequest(targetUid) {
    try {
        const requestId = `${currentUser.uid}_${Date.now()}`;
        
        const requestData = {
            from: currentUser.uid,
            to: targetUid,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        // Save request to both users
        await database.ref(`chatRequests/${requestId}`).set(requestData);
        await database.ref(`users/${targetUid}/chatRequests/${requestId}`).set(true);
        await database.ref(`users/${currentUser.uid}/sentRequests/${requestId}`).set(true);
        
        // Close modal and show success message
        document.getElementById('startChatModal').classList.remove('active');
        resetSearchModal();
        
        showToast('Chat request sent successfully', 'success');
        
        // Update requests badge
        await updateChatRequestsBadge();
        
    } catch (error) {
        console.error('Error sending chat request:', error);
        showToast('Error sending chat request', 'error');
    }
}

async function loadChatRequests() {
    try {
        const incomingContainer = document.getElementById('incomingRequestsTab');
        const sentContainer = document.getElementById('sentRequestsTab');
        
        if (!incomingContainer && !sentContainer) return;
        
        // Load incoming requests
        if (incomingContainer) {
            await loadIncomingRequests(incomingContainer);
        }
        
        // Load sent requests
        if (sentContainer) {
            await loadSentRequests();
        }
        
    } catch (error) {
        console.error('Error loading chat requests:', error);
        showToast('Error loading chat requests', 'error');
    }
}

async function loadIncomingRequests(container) {
    try {
        // Clear existing content
        container.innerHTML = '';
        
        // Get user's incoming requests
        const snapshot = await database.ref(`users/${currentUser.uid}/chatRequests`).once('value');
        const requestIds = snapshot.val();
        
        if (!requestIds) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-clock"></i>
                    <h3>No pending requests</h3>
                    <p>When someone sends you a chat request, it will appear here</p>
                </div>
            `;
            return;
        }
        
        // Get request details
        const requestPromises = Object.keys(requestIds).map(async (requestId) => {
            const requestSnapshot = await database.ref(`chatRequests/${requestId}`).once('value');
            const requestData = requestSnapshot.val();
            
            if (requestData && requestData.status === 'pending') {
                const userSnapshot = await database.ref(`users/${requestData.from}`).once('value');
                const userData = userSnapshot.val();
                return { requestId, requestData, userData };
            }
            return null;
        });
        
        const requests = await Promise.all(requestPromises);
        const validRequests = requests.filter(r => r !== null);
        
        if (validRequests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-clock"></i>
                    <h3>No pending requests</h3>
                    <p>When someone sends you a chat request, it will appear here</p>
                </div>
            `;
            return;
        }
        
        // Sort by timestamp (newest first)
        validRequests.sort((a, b) => b.requestData.timestamp - a.requestData.timestamp);
        
        // Display requests
        validRequests.forEach(request => {
            const requestElement = createRequestElement(request);
            container.appendChild(requestElement);
        });
        
    } catch (error) {
        console.error('Error loading incoming requests:', error);
        container.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading requests. Please try again.</p>
            </div>
        `;
    }
}

function createRequestElement(request) {
    const { requestId, requestData, userData } = request;
    
    const requestElement = document.createElement('div');
    requestElement.className = 'request-card';
    requestElement.dataset.requestId = requestId;
    
    requestElement.innerHTML = `
        <img src="${userData.profilePicture || ''}" alt="${userData.fullName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
        <div class="request-info">
            <h4>${userData.fullName}</h4>
            <p>${userData.userId}</p>
            <span class="time">${formatDate(requestData.timestamp)}</span>
        </div>
        <div class="request-actions">
            <button class="action-btn accept-btn" data-request-id="${requestId}">
                <i class="fas fa-check"></i> Accept
            </button>
            <button class="action-btn reject-btn" data-request-id="${requestId}">
                <i class="fas fa-times"></i> Reject
            </button>
        </div>
    `;
    
    // Add event listeners
    const acceptBtn = requestElement.querySelector('.accept-btn');
    const rejectBtn = requestElement.querySelector('.reject-btn');
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleRequestAction(requestId, 'accepted');
        });
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleRequestAction(requestId, 'rejected');
        });
    }
    
    return requestElement;
}

async function handleRequestAction(requestId, action) {
    try {
        // Update request status
        await database.ref(`chatRequests/${requestId}/status`).set(action);
        
        // Remove from user's pending requests
        await database.ref(`users/${currentUser.uid}/chatRequests/${requestId}`).remove();
        
        // Get request data
        const requestSnapshot = await database.ref(`chatRequests/${requestId}`).once('value');
        const requestData = requestSnapshot.val();
        
        if (action === 'accepted') {
            // Add each other to contacts
            await database.ref(`users/${currentUser.uid}/contacts/${requestData.from}`).set(true);
            await database.ref(`users/${requestData.from}/contacts/${currentUser.uid}`).set(true);
            
            // Create chat between users
            const chatId = [currentUser.uid, requestData.from].sort().join('_');
            const chatData = {
                participants: [currentUser.uid, requestData.from],
                type: 'individual',
                createdAt: Date.now(),
                lastActivity: Date.now()
            };
            
            await database.ref(`chats/${chatId}`).set(chatData);
            await database.ref(`userChats/${currentUser.uid}/${chatId}`).set({
                type: 'individual',
                participants: [currentUser.uid, requestData.from]
            });
            await database.ref(`userChats/${requestData.from}/${chatId}`).set({
                type: 'individual',
                participants: [currentUser.uid, requestData.from]
            });
            
            showToast('Contact added successfully', 'success');
            
            // Redirect to chat
            window.location.href = `chat.html?chatId=${chatId}`;
            
        } else {
            showToast('Request rejected', 'info');
        }
        
        // Reload requests
        await loadChatRequests();
        await updateChatRequestsBadge();
        
    } catch (error) {
        console.error(`Error ${action} request:`, error);
        showToast(`Error ${action} request`, 'error');
    }
}

async function loadSentRequests() {
    try {
        const sentContainer = document.getElementById('sentRequestsTab');
        if (!sentContainer) return;
        
        // Clear existing content
        sentContainer.innerHTML = '';
        
        // Get user's sent requests
        const snapshot = await database.ref(`users/${currentUser.uid}/sentRequests`).once('value');
        const requestIds = snapshot.val();
        
        if (!requestIds) {
            sentContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paper-plane"></i>
                    <h3>No sent requests</h3>
                    <p>Requests you've sent will appear here</p>
                </div>
            `;
            return;
        }
        
        // Get request details
        const requestPromises = Object.keys(requestIds).map(async (requestId) => {
            const requestSnapshot = await database.ref(`chatRequests/${requestId}`).once('value');
            const requestData = requestSnapshot.val();
            
            if (requestData) {
                const userSnapshot = await database.ref(`users/${requestData.to}`).once('value');
                const userData = userSnapshot.val();
                return { requestId, requestData, userData };
            }
            return null;
        });
        
        const requests = await Promise.all(requestPromises);
        const validRequests = requests.filter(r => r !== null);
        
        if (validRequests.length === 0) {
            sentContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paper-plane"></i>
                    <h3>No sent requests</h3>
                    <p>Requests you've sent will appear here</p>
                </div>
            `;
            return;
        }
        
        // Sort by timestamp (newest first)
        validRequests.sort((a, b) => b.requestData.timestamp - a.requestData.timestamp);
        
        // Display requests
        validRequests.forEach(request => {
            const requestElement = createSentRequestElement(request);
            sentContainer.appendChild(requestElement);
        });
        
    } catch (error) {
        console.error('Error loading sent requests:', error);
        const sentContainer = document.getElementById('sentRequestsTab');
        if (sentContainer) {
            sentContainer.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading sent requests. Please try again.</p>
                </div>
            `;
        }
    }
}

function createSentRequestElement(request) {
    const { requestId, requestData, userData } = request;
    
    const requestElement = document.createElement('div');
    requestElement.className = 'request-card';
    requestElement.dataset.requestId = requestId;
    
    const statusText = requestData.status === 'pending' ? 'Pending' :
                      requestData.status === 'accepted' ? 'Accepted' : 'Rejected';
    
    const statusClass = requestData.status === 'pending' ? '' :
                       requestData.status === 'accepted' ? 'status-online' : 'status-offline';
    
    requestElement.innerHTML = `
        <img src="${userData.profilePicture || ''}" alt="${userData.fullName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
        <div class="request-info">
            <h4>${userData.fullName}</h4>
            <p>${userData.userId}</p>
            <span class="status ${statusClass}">${statusText}</span>
            <span class="time">${formatDate(requestData.timestamp)}</span>
        </div>
    `;
    
    return requestElement;
}

async function updateChatRequestsBadge() {
    try {
        const badge = document.getElementById('requestsBadge');
        if (!badge) return;
        
        const snapshot = await database.ref(`users/${currentUser.uid}/chatRequests`).once('value');
        const requests = snapshot.val();
        
        if (requests) {
            // Count pending requests
            let pendingCount = 0;
            const requestIds = Object.keys(requests);
            
            for (const requestId of requestIds) {
                const requestSnapshot = await database.ref(`chatRequests/${requestId}`).once('value');
                const requestData = requestSnapshot.val();
                if (requestData && requestData.status === 'pending') {
                    pendingCount++;
                }
            }
            
            if (pendingCount > 0) {
                badge.textContent = pendingCount > 9 ? '9+' : pendingCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating requests badge:', error);
    }
}

// ===== CONTACTS FUNCTIONS =====
async function loadContacts() {
    try {
        const contactsContainer = document.getElementById('contactsList');
        if (!contactsContainer) return;
        
        // Clear existing content
        contactsContainer.innerHTML = '';
        
        // Get user's contacts
        const snapshot = await database.ref(`users/${currentUser.uid}/contacts`).once('value');
        const contactIds = snapshot.val();
        
        if (!contactIds) {
            contactsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-address-book"></i>
                    <h3>No contacts yet</h3>
                    <p>Add contacts to start chatting</p>
                    <button class="btn-primary" id="addFirstContactBtn" style="margin-top: 20px;">
                        <i class="fas fa-user-plus"></i> Add Your First Contact
                    </button>
                </div>
            `;
            
            // Re-add event listener for the button
            const addFirstContactBtn = document.getElementById('addFirstContactBtn');
            if (addFirstContactBtn) {
                addFirstContactBtn.addEventListener('click', () => {
                    document.getElementById('addContactModal').classList.add('active');
                });
            }
            
            return;
        }
        
        // Get contact details
        const contactPromises = Object.keys(contactIds).map(async (contactId) => {
            const userSnapshot = await database.ref(`users/${contactId}`).once('value');
            const userData = userSnapshot.val();
            return { contactId, userData };
        });
        
        const contacts = await Promise.all(contactPromises);
        
        // Sort by name
        contacts.sort((a, b) => a.userData.fullName.localeCompare(b.userData.fullName));
        
        // Display contacts
        contacts.forEach(contact => {
            const contactElement = createContactElement(contact);
            contactsContainer.appendChild(contactElement);
        });
        
        // Add search functionality
        const searchContactsInput = document.getElementById('searchContacts');
        if (searchContactsInput) {
            searchContactsInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const contactCards = contactsContainer.querySelectorAll('.contact-card');
                
                contactCards.forEach(card => {
                    const name = card.querySelector('h4').textContent.toLowerCase();
                    const userId = card.querySelector('.contact-info p').textContent.toLowerCase();
                    
                    if (name.includes(searchTerm) || userId.includes(searchTerm)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        showToast('Error loading contacts', 'error');
    }
}

function createContactElement(contact) {
    const { contactId, userData } = contact;
    
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-card';
    contactElement.dataset.contactId = contactId;
    
    const status = userData.status === 'online' ? 'Online' : 'Offline';
    const statusClass = userData.status === 'online' ? 'online' : 'offline';
    
    contactElement.innerHTML = `
        <img src="${userData.profilePicture || ''}" alt="${userData.fullName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
        <div class="contact-info">
            <h4>${userData.fullName}</h4>
            <p>${userData.userId}</p>
            <span class="status ${statusClass}">${status}</span>
        </div>
        <div class="contact-actions">
            <button class="action-btn chat-btn" data-contact-id="${contactId}">
                <i class="fas fa-comment"></i> Chat
            </button>
            <button class="action-btn reject-btn" data-contact-id="${contactId}">
                <i class="fas fa-user-times"></i> Remove
            </button>
        </div>
    `;
    
    // Add event listeners
    const chatBtn = contactElement.querySelector('.chat-btn');
    const removeBtn = contactElement.querySelector('.reject-btn');
    
    if (chatBtn) {
        chatBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await startChatWithContact(contactId);
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`Remove ${userData.fullName} from contacts?`)) {
                await removeContact(contactId);
            }
        });
    }
    
    // Click on card to view profile
    contactElement.addEventListener('click', () => {
        // Will implement profile viewing later
    });
    
    return contactElement;
}

async function startChatWithContact(contactId) {
    try {
        // Check if chat already exists
        const chatId = [currentUser.uid, contactId].sort().join('_');
        const chatSnapshot = await database.ref(`chats/${chatId}`).once('value');
        
        if (!chatSnapshot.exists()) {
            // Create new chat
            const chatData = {
                participants: [currentUser.uid, contactId],
                type: 'individual',
                createdAt: Date.now(),
                lastActivity: Date.now()
            };
            
            await database.ref(`chats/${chatId}`).set(chatData);
            await database.ref(`userChats/${currentUser.uid}/${chatId}`).set({
                type: 'individual',
                participants: [currentUser.uid, contactId]
            });
            await database.ref(`userChats/${contactId}/${chatId}`).set({
                type: 'individual',
                participants: [currentUser.uid, contactId]
            });
        }
        
        // Redirect to chat
        window.location.href = `chat.html?chatId=${chatId}`;
        
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast('Error starting chat', 'error');
    }
}

async function removeContact(contactId) {
    try {
        // Remove from both users' contacts
        await database.ref(`users/${currentUser.uid}/contacts/${contactId}`).remove();
        await database.ref(`users/${contactId}/contacts/${currentUser.uid}`).remove();
        
        showToast('Contact removed', 'success');
        
        // Reload contacts
        await loadContacts();
        
    } catch (error) {
        console.error('Error removing contact:', error);
        showToast('Error removing contact', 'error');
    }
}

async function addContact(targetUid) {
    try {
        // Check if already in contacts
        const contactSnapshot = await database.ref(`users/${currentUser.uid}/contacts/${targetUid}`).once('value');
        if (contactSnapshot.exists()) {
            showToast('User is already in your contacts', 'warning');
            return;
        }
        
        // Add to contacts (both ways)
        await database.ref(`users/${currentUser.uid}/contacts/${targetUid}`).set(true);
        await database.ref(`users/${targetUid}/contacts/${currentUser.uid}`).set(true);
        
        // Create chat between users
        const chatId = [currentUser.uid, targetUid].sort().join('_');
        const chatData = {
            participants: [currentUser.uid, targetUid],
            type: 'individual',
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        await database.ref(`chats/${chatId}`).set(chatData);
        await database.ref(`userChats/${currentUser.uid}/${chatId}`).set({
            type: 'individual',
            participants: [currentUser.uid, targetUid]
        });
        await database.ref(`userChats/${targetUid}/${chatId}`).set({
            type: 'individual',
            participants: [currentUser.uid, targetUid]
        });
        
        // Close modal and show success
        document.getElementById('addContactModal').classList.remove('active');
        resetContactSearchModal();
        
        showToast('Contact added successfully', 'success');
        
        // Reload contacts
        await loadContacts();
        
        // Optionally redirect to chat
        // window.location.href = `chat.html?chatId=${chatId}`;
        
    } catch (error) {
        console.error('Error adding contact:', error);
        showToast('Error adding contact', 'error');
    }
}

// ===== GROUPS FUNCTIONS =====
async function loadGroups() {
    try {
        const groupsContainer = document.getElementById('groupsList');
        if (!groupsContainer) return;
        
        // Clear existing content
        groupsContainer.innerHTML = '';
        
        // Get user's groups
        const snapshot = await database.ref(`users/${currentUser.uid}/groups`).once('value');
        const groupIds = snapshot.val();
        
        if (!groupIds) {
            groupsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No groups yet</h3>
                    <p>Create a group to chat with multiple people at once</p>
                    <button class="btn-primary" id="createFirstGroupBtn" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Create Your First Group
                    </button>
                </div>
            `;
            
            // Re-add event listener for the button
            const createFirstGroupBtn = document.getElementById('createFirstGroupBtn');
            if (createFirstGroupBtn) {
                createFirstGroupBtn.addEventListener('click', () => {
                    document.getElementById('createGroupModal').classList.add('active');
                });
            }
            
            return;
        }
        
        // Get group details
        const groupPromises = Object.keys(groupIds).map(async (groupId) => {
            const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
            const groupData = groupSnapshot.val();
            return { groupId, groupData };
        });
        
        const groups = await Promise.all(groupPromises);
        
        // Sort by last activity
        groups.sort((a, b) => b.groupData.lastActivity - a.groupData.lastActivity);
        
        // Display groups
        groups.forEach(group => {
            const groupElement = createGroupElement(group);
            groupsContainer.appendChild(groupElement);
        });
        
        // Add search functionality
        const searchGroupsInput = document.getElementById('searchGroups');
        if (searchGroupsInput) {
            searchGroupsInput.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const groupCards = groupsContainer.querySelectorAll('.group-card');
                
                groupCards.forEach(card => {
                    const name = card.querySelector('h4').textContent.toLowerCase();
                    if (name.includes(searchTerm)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
        
    } catch (error) {
        console.error('Error loading groups:', error);
        showToast('Error loading groups', 'error');
    }
}

function createGroupElement(group) {
    const { groupId, groupData } = group;
    
    const groupElement = document.createElement('div');
    groupElement.className = 'group-card';
    groupElement.dataset.groupId = groupId;
    
    const memberCount = groupData.members ? Object.keys(groupData.members).length : 0;
    const lastActivity = formatDate(groupData.lastActivity || groupData.createdAt);
    
    groupElement.innerHTML = `
        <img src="${groupData.profilePicture || ''}" alt="${groupData.name}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
        <div class="group-info">
            <h4>${groupData.name}</h4>
            <p>${memberCount} members</p>
            <span class="time">${lastActivity}</span>
        </div>
        <div class="group-actions">
            <button class="action-btn chat-btn" data-group-id="${groupId}">
                <i class="fas fa-comment"></i> Chat
            </button>
        </div>
    `;
    
    // Add event listener to chat button
    const chatBtn = groupElement.querySelector('.chat-btn');
    if (chatBtn) {
        chatBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `chat.html?chatId=${groupId}&type=group`;
        });
    }
    
    // Click on card to enter chat
    groupElement.addEventListener('click', () => {
        window.location.href = `chat.html?chatId=${groupId}&type=group`;
    });
    
    return groupElement;
}

function resetGroupModal() {
    const groupNameInput = document.getElementById('groupName');
    const addMemberInput = document.getElementById('addMemberInput');
    const groupMembersList = document.getElementById('groupMembersList');
    const memberCount = document.getElementById('memberCount');
    const groupPhotoPreview = document.getElementById('groupPhotoPreview');
    
    if (groupNameInput) groupNameInput.value = '';
    if (addMemberInput) addMemberInput.value = '';
    if (groupMembersList) {
        groupMembersList.innerHTML = `
            <div class="member-tag" id="currentUserMember">
                <span id="currentUserName">You</span>
            </div>
        `;
    }
    if (memberCount) memberCount.textContent = '1';
    if (groupPhotoPreview) {
        groupPhotoPreview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-users"></i>
                <span>No photo selected</span>
                <p>JPEG, PNG up to 5MB</p>
            </div>
        `;
    }
}

async function createGroup() {
    try {
        const groupName = document.getElementById('groupName').value.trim();
        
        if (!groupName) {
            showToast('Please enter a group name', 'warning');
            return;
        }
        
        // Get members from UI
        const memberTags = document.querySelectorAll('.member-tag');
        const members = [];
        
        memberTags.forEach(tag => {
            const memberId = tag.dataset.memberId;
            if (memberId && memberId !== currentUser.uid) {
                members.push(memberId);
            }
        });
        
        // Include current user
        members.push(currentUser.uid);
        
        // Create unique group ID
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Get group photo if uploaded
        const groupPhotoPreview = document.getElementById('groupPhotoPreview');
        let profilePicture = '';
        if (groupPhotoPreview.querySelector('img')) {
            profilePicture = groupPhotoPreview.querySelector('img').src;
        }
        
        // Create group data
        const groupData = {
            id: groupId,
            name: groupName,
            profilePicture: profilePicture,
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            members: {}
        };
        
        // Add all members to group
        members.forEach(memberId => {
            groupData.members[memberId] = true;
        });
        
        // Save group to database
        await database.ref(`groups/${groupId}`).set(groupData);
        
        // Add group to each member's groups list
        for (const memberId of members) {
            await database.ref(`users/${memberId}/groups/${groupId}`).set(true);
        }
        
        // Create chat for group
        const chatData = {
            participants: members,
            type: 'group',
            groupId: groupId,
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        await database.ref(`chats/${groupId}`).set(chatData);
        
        // Add chat to each member's userChats
        for (const memberId of members) {
            await database.ref(`userChats/${memberId}/${groupId}`).set({
                type: 'group',
                participants: members
            });
        }
        
        // Close modal and show success
        document.getElementById('createGroupModal').classList.remove('active');
        resetGroupModal();
        
        showToast('Group created successfully', 'success');
        
        // Reload groups
        await loadGroups();
        
        // Optionally redirect to group chat
        // window.location.href = `chat.html?chatId=${groupId}&type=group`;
        
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Error creating group', 'error');
    }
}

async function updateGroupsBadge() {
    try {
        const badge = document.getElementById('groupsBadge');
        if (!badge) return;
        
        // For now, we'll just show if there are new group messages
        // This can be enhanced later with actual unread counts
        const snapshot = await database.ref(`users/${currentUser.uid}/groups`).once('value');
        const groups = snapshot.val();
        
        if (groups) {
            const groupCount = Object.keys(groups).length;
            if (groupCount > 0) {
                badge.textContent = groupCount > 9 ? '9+' : groupCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        } else {
            badge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error updating groups badge:', error);
    }
}

// ===== ZYNES FUNCTIONS =====
async function loadZynes() {
    try {
        const myZynesContainer = document.getElementById('myZynesTab');
        if (!myZynesContainer) return;
        
        // Clear existing content
        myZynesContainer.innerHTML = '';
        
        // Get user's zynes
        const snapshot = await database.ref(`users/${currentUser.uid}/zynes`).once('value');
        const zynes = snapshot.val();
        
        if (!zynes) {
            myZynesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-circle"></i>
                    <h3>No Zynes yet</h3>
                    <p>Share a photo, video, or text that disappears after 24 hours</p>
                    <button class="btn-primary" id="createFirstZyneBtn" style="margin-top: 20px;">
                        <i class="fas fa-plus"></i> Create Your First Zyne
                    </button>
                </div>
            `;
            
            // Re-add event listener for the button
            const createFirstZyneBtn = document.getElementById('createFirstZyneBtn');
            if (createFirstZyneBtn) {
                createFirstZyneBtn.addEventListener('click', () => {
                    document.getElementById('addZyneModal').classList.add('active');
                });
            }
            
            return;
        }
        
        // Convert to array and sort by timestamp (newest first)
        const zynesArray = Object.entries(zynes).map(([id, zyne]) => ({ id, ...zyne }));
        zynesArray.sort((a, b) => b.timestamp - a.timestamp);
        
        // Display zynes
        zynesArray.forEach(zyne => {
            const zyneElement = createZyneElement(zyne, true);
            myZynesContainer.appendChild(zyneElement);
        });
        
    } catch (error) {
        console.error('Error loading zynes:', error);
        showToast('Error loading zynes', 'error');
    }
}

async function loadContactsZynes() {
    try {
        const viewZynesContainer = document.getElementById('viewZynesTab');
        if (!viewZynesContainer) return;
        
        // Clear existing content
        viewZynesContainer.innerHTML = '';
        
        // Get user's contacts
        const contactsSnapshot = await database.ref(`users/${currentUser.uid}/contacts`).once('value');
        const contacts = contactsSnapshot.val();
        
        if (!contacts) {
            viewZynesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye"></i>
                    <h3>No Zynes to view</h3>
                    <p>When your contacts post Zynes, they'll appear here</p>
                </div>
            `;
            return;
        }
        
        // Get zynes from each contact
        const contactPromises = Object.keys(contacts).map(async (contactId) => {
            const zynesSnapshot = await database.ref(`users/${contactId}/zynes`).once('value');
            const zynes = zynesSnapshot.val();
            
            if (zynes) {
                const userSnapshot = await database.ref(`users/${contactId}`).once('value');
                const userData = userSnapshot.val();
                
                // Convert to array and filter (only show zynes from last 24 hours)
                const now = Date.now();
                const zynesArray = Object.entries(zynes)
                    .map(([id, zyne]) => ({ id, ...zyne }))
                    .filter(zyne => (now - zyne.timestamp) < 24 * 60 * 60 * 1000)
                    .sort((a, b) => b.timestamp - a.timestamp);
                
                return { userData, zynes: zynesArray };
            }
            return null;
        });
        
        const contactsZynes = await Promise.all(contactPromises);
        const validContactsZynes = contactsZynes.filter(c => c !== null && c.zynes.length > 0);
        
        if (validContactsZynes.length === 0) {
            viewZynesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye"></i>
                    <h3>No Zynes to view</h3>
                    <p>When your contacts post Zynes, they'll appear here</p>
                </div>
            `;
            return;
        }
        
        // Display contacts' zynes
        validContactsZynes.forEach(contactZynes => {
            const contactElement = createContactZynesElement(contactZynes);
            viewZynesContainer.appendChild(contactElement);
        });
        
    } catch (error) {
        console.error('Error loading contacts zynes:', error);
        viewZynesContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading Zynes. Please try again.</p>
            </div>
        `;
    }
}

function createZyneElement(zyne, isOwn = false) {
    const zyneElement = document.createElement('div');
    zyneElement.className = 'contact-card';
    zyneElement.dataset.zyneId = zyne.id;
    
    const timeAgo = formatDate(zyne.timestamp);
    const expiresIn = Math.max(0, 24 - Math.floor((Date.now() - zyne.timestamp) / (60 * 60 * 1000)));
    
    let contentHtml = '';
    if (zyne.type === 'text') {
        contentHtml = `<p>${zyne.content}</p>`;
    } else if (zyne.type === 'image') {
        contentHtml = `<img src="${zyne.mediaUrl}" alt="Zyne image" style="width: 100%; border-radius: 10px; margin-bottom: 10px;">`;
    } else if (zyne.type === 'video') {
        contentHtml = `<video src="${zyne.mediaUrl}" controls style="width: 100%; border-radius: 10px; margin-bottom: 10px;"></video>`;
    }
    
    zyneElement.innerHTML = `
        <div class="zyne-info" style="flex: 1;">
            ${contentHtml}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span class="time">${timeAgo}</span>
                <span class="status ${expiresIn > 12 ? 'online' : expiresIn > 6 ? 'away' : 'offline'}">
                    Expires in ${expiresIn}h
                </span>
            </div>
        </div>
        ${isOwn ? `
            <div class="zyne-actions">
                <button class="action-btn reject-btn delete-zyne-btn" data-zyne-id="${zyne.id}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        ` : ''}
    `;
    
    // Add delete button event listener
    if (isOwn) {
        const deleteBtn = zyneElement.querySelector('.delete-zyne-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this Zyne?')) {
                    await deleteZyne(zyne.id);
                }
            });
        }
    }
    
    return zyneElement;
}

function createContactZynesElement(contactZynes) {
    const { userData, zynes } = contactZynes;
    
    const container = document.createElement('div');
    container.className = 'contact-card';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'flex-start';
    
    // Contact header
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px; width: 100%;">
            <img src="${userData.profilePicture || ''}" alt="${userData.fullName}" class="profile-pic" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjUwIiBoZWlnaHQ9IjUwIiByeD0iMjUiIGZpbGw9IiNlOWU5ZTkiLz4KPHBhdGggZD0iTTI1IDI4QzMyLjE3OTcgMjggMzggMjIuMTc5NyAzOCAxNUMzOCA3LjgyMDMgMzIuMTc5NyAyIDI1IDJDMTcuODIwMyAyIDEyIDcuODIwMyAxMiAxNUMxMiAyMi4xNzk3IDE3LjgyMDMgMjggMjUgMjhaIiBmaWxsPSIjYzBjMGMwIi8+CjxwYXRoIGQ9Ik0yNSAzMEMxNS41OSAzMCA4IDM3LjU5IDggNDdIMjVWMzBaIiBmaWxsPSIjYzBjMGMwIi8+Cjwvc3ZnPgo='">
            <div>
                <h4>${userData.fullName}</h4>
                <p>${zynes.length} Zyne${zynes.length !== 1 ? 's' : ''}</p>
            </div>
        </div>
    `;
    
    // Add each zyne
    zynes.forEach(zyne => {
        const zyneElement = createZyneElement(zyne, false);
        container.appendChild(zyneElement);
    });
    
    return container;
}

async function postZyne() {
    try {
        const text = document.getElementById('zyneText').value.trim();
        const mediaPreview = document.getElementById('zyneMediaPreview');
        const mediaFile = mediaPreview.querySelector('input[type="file"]');
        
        if (!text && !mediaFile) {
            showToast('Please add text or media to your Zyne', 'warning');
            return;
        }
        
        const zyneId = `zyne_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const zyneData = {
            id: zyneId,
            userId: currentUser.uid,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
        };
        
        // Handle text zyne
        if (text) {
            zyneData.type = 'text';
            zyneData.content = text;
        }
        
        // Handle media zyne
        if (mediaFile && mediaFile.files[0]) {
            const file = mediaFile.files[0];
            const fileType = file.type.startsWith('image/') ? 'image' : 
                           file.type.startsWith('video/') ? 'video' : 'file';
            
            // Upload to Cloudinary
            showToast('Uploading media...', 'info');
            const uploadResult = await uploadToCloudinary(file, fileType);
            
            zyneData.type = fileType;
            zyneData.mediaUrl = uploadResult.url;
            zyneData.mediaType = file.type;
        }
        
        // Save zyne to database
        await database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).set(zyneData);
        
        // Close modal and show success
        document.getElementById('addZyneModal').classList.remove('active');
        resetZyneModal();
        
        showToast('Zyne posted successfully', 'success');
        
        // Reload zynes
        await loadZynes();
        
    } catch (error) {
        console.error('Error posting zyne:', error);
        showToast('Error posting Zyne', 'error');
    }
}

async function deleteZyne(zyneId) {
    try {
        await database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).remove();
        showToast('Zyne deleted', 'success');
        await loadZynes();
    } catch (error) {
        console.error('Error deleting zyne:', error);
        showToast('Error deleting Zyne', 'error');
    }
}

function resetZyneModal() {
    const zyneText = document.getElementById('zyneText');
    const zyneCharCount = document.getElementById('zyneCharCount');
    const zyneMediaPreview = document.getElementById('zyneMediaPreview');
    
    if (zyneText) {
        zyneText.value = '';
        zyneCharCount.textContent = '0';
    }
    if (zyneMediaPreview) {
        zyneMediaPreview.innerHTML = '';
    }
}

// ===== PROFILE FUNCTIONS =====
function populateEditProfileForm() {
    if (!userData) return;
    
    const editFullName = document.getElementById('editFullName');
    const editPhoneNumber = document.getElementById('editPhoneNumber');
    const editEmail = document.getElementById('editEmail');
    const editProfilePreview = document.getElementById('editProfilePreview');
    
    if (editFullName) editFullName.value = userData.fullName;
    if (editPhoneNumber) editPhoneNumber.value = userData.phoneNumber;
    if (editEmail) editEmail.value = userData.email;
    
    if (editProfilePreview && userData.profilePicture) {
        editProfilePreview.innerHTML = `<img src="${userData.profilePicture}" alt="Profile">`;
    }
}

async function saveProfile() {
    try {
        const fullName = document.getElementById('editFullName').value.trim();
        const phoneNumber = document.getElementById('editPhoneNumber').value.trim();
        
        if (!fullName || !phoneNumber) {
            showToast('Please fill in all fields', 'warning');
            return;
        }
        
        // Update user data
        const updates = {
            fullName: fullName,
            phoneNumber: phoneNumber
        };
        
        // Handle profile picture update if changed
        const editProfilePreview = document.getElementById('editProfilePreview');
        const img = editProfilePreview.querySelector('img');
        if (img && img.src !== userData.profilePicture) {
            updates.profilePicture = img.src;
        }
        
        // Update in database
        await database.ref(`users/${currentUser.uid}`).update(updates);
        
        // Update local user data
        Object.assign(userData, updates);
        
        // Update UI
        updateUserInfo();
        
        // Close modal
        document.getElementById('editProfileModal').classList.remove('active');
        
        showToast('Profile updated successfully', 'success');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error updating profile', 'error');
    }
}

// ===== CHAT PAGE FUNCTIONS =====
function initializeChatPage() {
    const loadingScreen = document.getElementById('loadingScreen');
    const chatContainer = document.getElementById('chatContainer');
    
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (chatContainer) chatContainer.style.display = 'flex';
    
    // Get chat ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    chatId = urlParams.get('chatId');
    const chatType = urlParams.get('type') || 'individual';
    
    if (!chatId) {
        showToast('No chat selected', 'error');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
        return;
    }
    
    // Initialize chat
    initializeChat(chatId, chatType);
    
    // Initialize event listeners
    initializeChatEventListeners();
}

async function initializeChat(chatId, chatType) {
    try {
        // Load chat data
        const chatSnapshot = await database.ref(`chats/${chatId}`).once('value');
        const chatData = chatSnapshot.val();
        
        if (!chatData) {
            showToast('Chat not found', 'error');
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 2000);
            return;
        }
        
        if (chatType === 'individual') {
            // Get chat partner info
            const partnerId = chatData.participants.find(id => id !== currentUser.uid);
            if (!partnerId) {
                showToast('Error loading chat', 'error');
                return;
            }
            
            const partnerSnapshot = await database.ref(`users/${partnerId}`).once('value');
            chatPartnerData = partnerSnapshot.val();
            chatPartnerId = partnerId;
            
            // Update chat header
            updateChatHeader(chatPartnerData);
            
            // Setup typing indicator listener
            setupTypingIndicator(partnerId);
            
            // Setup online status listener
            setupOnlineStatus(partnerId);
            
        } else if (chatType === 'group') {
            // Get group info
            const groupSnapshot = await database.ref(`groups/${chatId}`).once('value');
            const groupData = groupSnapshot.val();
            
            if (!groupData) {
                showToast('Group not found', 'error');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 2000);
                return;
            }
            
            // Update chat header for group
            updateGroupChatHeader(groupData);
        }
        
        // Load messages
        await loadMessages(chatId);
        
        // Setup real-time message listener
        setupMessageListener(chatId);
        
        // Mark messages as read
        markMessagesAsRead(chatId);
        
    } catch (error) {
        console.error('Error initializing chat:', error);
        showToast('Error loading chat', 'error');
    }
}

function updateChatHeader(partnerData) {
    const chatPartnerName = document.getElementById('chatPartnerName');
    const chatPartnerPic = document.getElementById('chatPartnerPic');
    const chatStatusText = document.getElementById('chatStatusText');
    const chatStatusDot = document.getElementById('chatStatusDot');
    const blockUserName = document.getElementById('blockUserName');
    
    if (chatPartnerName) chatPartnerName.textContent = partnerData.fullName;
    if (chatPartnerPic && partnerData.profilePicture) {
        chatPartnerPic.src = partnerData.profilePicture;
    }
    if (blockUserName) blockUserName.textContent = partnerData.fullName;
    
    // Update status
    if (partnerData.status === 'online') {
        if (chatStatusText) chatStatusText.textContent = 'Online';
        if (chatStatusDot) {
            chatStatusDot.className = 'status-dot online';
            chatStatusDot.classList.remove('offline');
        }
    } else {
        if (chatStatusText) chatStatusText.textContent = 'Offline';
        if (chatStatusDot) {
            chatStatusDot.className = 'status-dot offline';
            chatStatusDot.classList.remove('online');
        }
    }
}

function updateGroupChatHeader(groupData) {
    const chatPartnerName = document.getElementById('chatPartnerName');
    const chatPartnerPic = document.getElementById('chatPartnerPic');
    const chatStatusText = document.getElementById('chatStatusText');
    const chatStatusDot = document.getElementById('chatStatusDot');
    const videoCallBtn = document.getElementById('videoCallBtn');
    const voiceCallBtn = document.getElementById('voiceCallBtn');
    
    if (chatPartnerName) chatPartnerName.textContent = groupData.name;
    if (chatPartnerPic && groupData.profilePicture) {
        chatPartnerPic.src = groupData.profilePicture;
    }
    if (chatStatusText) {
        const memberCount = groupData.members ? Object.keys(groupData.members).length : 0;
        chatStatusText.textContent = `${memberCount} members`;
    }
    if (chatStatusDot) chatStatusDot.style.display = 'none';
    
    // Hide call buttons for groups (for now)
    if (videoCallBtn) videoCallBtn.style.display = 'none';
    if (voiceCallBtn) voiceCallBtn.style.display = 'none';
}

function setupTypingIndicator(partnerId) {
    // Listen for typing status
    database.ref(`users/${partnerId}/typing`).on('value', (snapshot) => {
        const typingIndicator = document.getElementById('typingIndicator');
        const typingText = document.getElementById('typingText');
        
        if (snapshot.exists() && snapshot.val().chatId === chatId) {
            if (typingIndicator) typingIndicator.style.display = 'flex';
            if (typingText) typingText.textContent = `${chatPartnerData.fullName} is typing...`;
        } else {
            if (typingIndicator) typingIndicator.style.display = 'none';
        }
    });
}

function setupOnlineStatus(partnerId) {
    // Listen for online status
    database.ref(`users/${partnerId}/status`).on('value', (snapshot) => {
        const chatStatusText = document.getElementById('chatStatusText');
        const chatStatusDot = document.getElementById('chatStatusDot');
        const viewProfileStatusText = document.getElementById('viewProfileStatusText');
        const viewProfileStatusDot = document.getElementById('viewProfileStatusDot');
        
        if (snapshot.val() === 'online') {
            if (chatStatusText) chatStatusText.textContent = 'Online';
            if (chatStatusDot) {
                chatStatusDot.className = 'status-dot online';
                chatStatusDot.classList.remove('offline');
            }
            if (viewProfileStatusText) viewProfileStatusText.textContent = 'Online';
            if (viewProfileStatusDot) {
                viewProfileStatusDot.className = 'status-dot online';
                viewProfileStatusDot.classList.remove('offline');
            }
        } else {
            if (chatStatusText) chatStatusText.textContent = 'Offline';
            if (chatStatusDot) {
                chatStatusDot.className = 'status-dot offline';
                chatStatusDot.classList.remove('online');
            }
            if (viewProfileStatusText) viewProfileStatusText.textContent = 'Offline';
            if (viewProfileStatusDot) {
                viewProfileStatusDot.className = 'status-dot offline';
                viewProfileStatusDot.classList.remove('online');
            }
        }
    });
}

async function loadMessages(chatId) {
    try {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // Clear existing messages
        chatMessages.innerHTML = '';
        
        // Get messages
        const snapshot = await database.ref(`messages/${chatId}`)
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');
        
        const messages = snapshot.val();
        
        if (!messages) {
            chatMessages.innerHTML = `
                <div class="empty-chat">
                    <i class="fas fa-comment-slash"></i>
                    <h3>No messages yet</h3>
                    <p>Send a message to start the conversation</p>
                </div>
            `;
            return;
        }
        
        // Convert to array and sort by timestamp
        const messagesArray = Object.entries(messages).map(([id, message]) => ({ id, ...message }));
        messagesArray.sort((a, b) => a.timestamp - b.timestamp);
        
        // Display messages with date separators
        let lastDate = null;
        messagesArray.forEach(message => {
            const messageDate = new Date(message.timestamp).toDateString();
            
            // Add date separator if needed
            if (messageDate !== lastDate) {
                const dateElement = document.createElement('div');
                dateElement.className = 'message-date';
                dateElement.textContent = formatMessageDate(message.timestamp);
                chatMessages.appendChild(dateElement);
                lastDate = messageDate;
            }
            
            // Add message
            const messageElement = createMessageElement(message);
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom
        scrollToBottom();
        
    } catch (error) {
        console.error('Error loading messages:', error);
        showToast('Error loading messages', 'error');
    }
}

function createMessageElement(message) {
    const isSent = message.senderId === currentUser.uid;
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    messageElement.dataset.messageId = message.id;
    
    let contentHtml = '';
    if (message.type === 'text') {
        contentHtml = `<p>${message.content}</p>`;
    } else if (message.type === 'image') {
        contentHtml = `
            <div class="media-message">
                <img src="${message.mediaUrl}" alt="Image" class="chat-media" onclick="viewMedia('${message.mediaUrl}', 'image')">
                ${message.caption ? `<p style="margin-top: 8px;">${message.caption}</p>` : ''}
            </div>
        `;
    } else if (message.type === 'video') {
        contentHtml = `
            <div class="media-message">
                <video src="${message.mediaUrl}" controls class="chat-media" onclick="viewMedia('${message.mediaUrl}', 'video')"></video>
                ${message.caption ? `<p style="margin-top: 8px;">${message.caption}</p>` : ''}
            </div>
        `;
    } else if (message.type === 'file') {
        const fileName = message.fileName || 'File';
        const fileSize = message.fileSize ? ` (${formatFileSize(message.fileSize)})` : '';
        contentHtml = `
            <div class="media-message">
                <a href="${message.mediaUrl}" target="_blank" style="display: block; padding: 12px; background: ${isSent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)'}; border-radius: 10px; text-decoration: none; color: inherit;">
                    <i class="fas fa-file" style="margin-right: 8px;"></i>
                    <strong>${fileName}${fileSize}</strong>
                </a>
                ${message.caption ? `<p style="margin-top: 8px;">${message.caption}</p>` : ''}
            </div>
        `;
    }
    
    const time = formatTime(message.timestamp);
    const statusIcon = isSent ? 
        (message.read ? '✓✓' : message.delivered ? '✓' : '◷') : '';
    
    messageElement.innerHTML = `
        <div class="message-bubble">
            ${contentHtml}
            <span class="message-time">
                ${time}
                ${isSent ? `<span class="message-status">${statusIcon}</span>` : ''}
            </span>
        </div>
    `;
    
    return messageElement;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function setupMessageListener(chatId) {
    // Remove existing listener if any
    if (messageListeners[chatId]) {
        messageListeners[chatId]();
    }
    
    // Setup new listener
    const messageRef = database.ref(`messages/${chatId}`);
    const listener = messageRef.orderByChild('timestamp').limitToLast(1).on('child_added', (snapshot) => {
        const message = snapshot.val();
        
        // Don't show the message if it's from current user (already shown)
        if (message.senderId === currentUser.uid) return;
        
        // Check if message already exists in DOM
        const existingMessage = document.querySelector(`[data-message-id="${snapshot.key}"]`);
        if (existingMessage) return;
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        // Remove empty state if present
        const emptyChat = chatMessages.querySelector('.empty-chat');
        if (emptyChat) emptyChat.remove();
        
        // Add date separator if needed
        const lastDateElement = chatMessages.querySelector('.message-date:last-of-type');
        const messageDate = new Date(message.timestamp).toDateString();
        let lastDate = lastDateElement ? new Date(lastDateElement.dataset.date).toDateString() : null;
        
        if (messageDate !== lastDate) {
            const dateElement = document.createElement('div');
            dateElement.className = 'message-date';
            dateElement.textContent = formatMessageDate(message.timestamp);
            dateElement.dataset.date = message.timestamp;
            chatMessages.appendChild(dateElement);
        }
        
        // Add message
        const messageElement = createMessageElement(message);
        chatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        scrollToBottom();
        
        // Play notification sound
        playNotificationSound();
        
        // Mark as delivered
        markMessageAsDelivered(snapshot.key, chatId);
    });
    
    // Store listener for cleanup
    messageListeners[chatId] = () => {
        messageRef.off('child_added', listener);
    };
}

async function markMessageAsDelivered(messageId, chatId) {
    try {
        await database.ref(`messages/${chatId}/${messageId}/delivered`).set(true);
    } catch (error) {
        console.error('Error marking message as delivered:', error);
    }
}

async function markMessagesAsRead(chatId) {
    try {
        const snapshot = await database.ref(`messages/${chatId}`)
            .orderByChild('senderId')
            .equalTo(chatPartnerId)
            .once('value');
        
        const updates = {};
        snapshot.forEach(child => {
            updates[`${child.key}/read`] = true;
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref(`messages/${chatId}`).update(updates);
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

function initializeChatEventListeners() {
    // Back button
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            // Update send button state
            if (sendMessageBtn) {
                sendMessageBtn.disabled = messageInput.value.trim() === '';
            }
            
            // Send typing indicator
            sendTypingIndicator();
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
    
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessage);
    }
    
    // Attachment button
    const attachmentBtn = document.getElementById('attachmentBtn');
    const attachmentOptions = document.getElementById('attachmentOptions');
    
    if (attachmentBtn && attachmentOptions) {
        attachmentBtn.addEventListener('click', () => {
            attachmentOptions.classList.toggle('show');
        });
        
        // Close attachment options when clicking outside
        document.addEventListener('click', (e) => {
            if (!attachmentBtn.contains(e.target) && !attachmentOptions.contains(e.target)) {
                attachmentOptions.classList.remove('show');
            }
        });
    }
    
    // Attachment options
    const attachPhotoBtn = document.getElementById('attachPhotoBtn');
    const attachVideoBtn = document.getElementById('attachVideoBtn');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const chatPhotoInput = document.getElementById('chatPhotoInput');
    const chatVideoInput = document.getElementById('chatVideoInput');
    const chatFileInput = document.getElementById('chatFileInput');
    
    if (attachPhotoBtn && chatPhotoInput) {
        attachPhotoBtn.addEventListener('click', () => {
            chatPhotoInput.click();
            attachmentOptions.classList.remove('show');
        });
    }
    
    if (attachVideoBtn && chatVideoInput) {
        attachVideoBtn.addEventListener('click', () => {
            chatVideoInput.click();
            attachmentOptions.classList.remove('show');
        });
    }
    
    if (attachFileBtn && chatFileInput) {
        attachFileBtn.addEventListener('click', () => {
            chatFileInput.click();
            attachmentOptions.classList.remove('show');
        });
    }
    
    // Handle file selections
    if (chatPhotoInput) {
        chatPhotoInput.addEventListener('change', handleMediaSelection);
    }
    
    if (chatVideoInput) {
        chatVideoInput.addEventListener('change', handleMediaSelection);
    }
    
    if (chatFileInput) {
        chatFileInput.addEventListener('change', handleMediaSelection);
    }
    
    // Chat menu
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    const chatMenuDropdown = document.getElementById('chatMenuDropdown');
    
    if (chatMenuBtn && chatMenuDropdown) {
        chatMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chatMenuDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            chatMenuDropdown.classList.remove('show');
        });
    }
    
    // View profile
    const viewProfileBtn = document.getElementById('viewProfileBtn');
    const viewProfileModal = document.getElementById('viewProfileModal');
    
    if (viewProfileBtn && viewProfileModal) {
        viewProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatMenuDropdown.classList.remove('show');
            populateViewProfileModal();
            viewProfileModal.classList.add('active');
        });
    }
    
    // Close view profile modal
    const closeViewProfileModal = document.getElementById('closeViewProfileModal');
    const closeProfileModalBtn = document.getElementById('closeProfileModalBtn');
    
    if (closeViewProfileModal) {
        closeViewProfileModal.addEventListener('click', () => {
            viewProfileModal.classList.remove('active');
        });
    }
    
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', () => {
            viewProfileModal.classList.remove('active');
        });
    }
    
    // Start chat from profile
    const startChatFromProfileBtn = document.getElementById('startChatFromProfileBtn');
    if (startChatFromProfileBtn) {
        startChatFromProfileBtn.addEventListener('click', () => {
            viewProfileModal.classList.remove('active');
            // Already in chat, so just close the modal
        });
    }
    
    // Add nickname
    const addNicknameBtn = document.getElementById('addNicknameBtn');
    const addNicknameModal = document.getElementById('addNicknameModal');
    
    if (addNicknameBtn && addNicknameModal) {
        addNicknameBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatMenuDropdown.classList.remove('show');
            addNicknameModal.classList.add('active');
        });
    }
    
    // Nickname input
    const nicknameInput = document.getElementById('nicknameInput');
    const nicknameCharCount = document.getElementById('nicknameCharCount');
    
    if (nicknameInput && nicknameCharCount) {
        nicknameInput.addEventListener('input', () => {
            nicknameCharCount.textContent = nicknameInput.value.length;
        });
    }
    
    // Close nickname modal
    const closeNicknameModal = document.getElementById('closeNicknameModal');
    const cancelNicknameBtn = document.getElementById('cancelNicknameBtn');
    
    if (closeNicknameModal) {
        closeNicknameModal.addEventListener('click', () => {
            addNicknameModal.classList.remove('active');
            nicknameInput.value = '';
            nicknameCharCount.textContent = '0';
        });
    }
    
    if (cancelNicknameBtn) {
        cancelNicknameBtn.addEventListener('click', () => {
            addNicknameModal.classList.remove('active');
            nicknameInput.value = '';
            nicknameCharCount.textContent = '0';
        });
    }
    
    // Save nickname
    const saveNicknameBtn = document.getElementById('saveNicknameBtn');
    if (saveNicknameBtn) {
        saveNicknameBtn.addEventListener('click', saveNickname);
    }
    
    // Add to favorites
    const addToFavoritesBtn = document.getElementById('addToFavoritesBtn');
    if (addToFavoritesBtn) {
        addToFavoritesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatMenuDropdown.classList.remove('show');
            // Implement favorites functionality
            showToast('Added to favorites', 'success');
        });
    }
    
    // Block user
    const blockUserBtn = document.getElementById('blockUserBtn');
    const blockUserModal = document.getElementById('blockUserModal');
    
    if (blockUserBtn && blockUserModal) {
        blockUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatMenuDropdown.classList.remove('show');
            blockUserModal.classList.add('active');
        });
    }
    
    // Close block modal
    const cancelBlockBtn = document.getElementById('cancelBlockBtn');
    if (cancelBlockBtn) {
        cancelBlockBtn.addEventListener('click', () => {
            blockUserModal.classList.remove('active');
        });
    }
    
    // Confirm block
    const confirmBlockBtn = document.getElementById('confirmBlockBtn');
    if (confirmBlockBtn) {
        confirmBlockBtn.addEventListener('click', blockUser);
    }
    
    // Clear chat
    const clearChatBtn = document.getElementById('clearChatBtn');
    const clearChatModal = document.getElementById('clearChatModal');
    
    if (clearChatBtn && clearChatModal) {
        clearChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatMenuDropdown.classList.remove('show');
            clearChatModal.classList.add('active');
        });
    }
    
    // Close clear chat modal
    const cancelClearChatBtn = document.getElementById('cancelClearChatBtn');
    if (cancelClearChatBtn) {
        cancelClearChatBtn.addEventListener('click', () => {
            clearChatModal.classList.remove('active');
        });
    }
    
    // Confirm clear chat
    const confirmClearChatBtn = document.getElementById('confirmClearChatBtn');
    if (confirmClearChatBtn) {
        confirmClearChatBtn.addEventListener('click', clearChat);
    }
    
    // Report user
    const reportUserBtn = document.getElementById('reportUserBtn');
    const reportUserModal = document.getElementById('reportUserModal');
    
    if (reportUserBtn && reportUserModal) {
        reportUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chatMenuDropdown.classList.remove('show');
            reportUserModal.classList.add('active');
        });
    }
    
    // Report form
    const reportDetails = document.getElementById('reportDetails');
    const reportCharCount = document.getElementById('reportCharCount');
    
    if (reportDetails && reportCharCount) {
        reportDetails.addEventListener('input', () => {
            reportCharCount.textContent = reportDetails.value.length;
        });
    }
    
    // Close report modal
    const closeReportModal = document.getElementById('closeReportModal');
    const cancelReportBtn = document.getElementById('cancelReportBtn');
    
    if (closeReportModal) {
        closeReportModal.addEventListener('click', () => {
            reportUserModal.classList.remove('active');
            resetReportForm();
        });
    }
    
    if (cancelReportBtn) {
        cancelReportBtn.addEventListener('click', () => {
            reportUserModal.classList.remove('active');
            resetReportForm();
        });
    }
    
    // Submit report
    const submitReportBtn = document.getElementById('submitReportBtn');
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', submitReport);
    }
    
    // Media preview modal
    const closeMediaPreview = document.getElementById('closeMediaPreview');
    if (closeMediaPreview) {
        closeMediaPreview.addEventListener('click', () => {
            document.getElementById('mediaPreviewModal').classList.remove('active');
        });
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message && !currentMediaFile) return;
    
    try {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const messageData = {
            id: messageId,
            senderId: currentUser.uid,
            chatId: chatId,
            timestamp: Date.now(),
            delivered: false,
            read: false
        };
        
        // Handle text message
        if (message) {
            messageData.type = 'text';
            messageData.content = message;
        }
        
        // Handle media message
        if (currentMediaFile) {
            const file = currentMediaFile.file;
            const fileType = currentMediaFile.type;
            const caption = messageInput.value.trim();
            
            // Upload to Cloudinary
            showToast('Uploading media...', 'info');
            const uploadResult = await uploadToCloudinary(file, fileType);
            
            messageData.type = fileType;
            messageData.mediaUrl = uploadResult.url;
            messageData.fileName = file.name;
            messageData.fileSize = file.size;
            messageData.mediaType = file.type;
            
            if (caption) {
                messageData.caption = caption;
            }
            
            // Clear media preview
            clearMediaPreview();
        }
        
        // Save message to database
        await database.ref(`messages/${chatId}/${messageId}`).set(messageData);
        
        // Update chat last activity
        await database.ref(`chats/${chatId}/lastActivity`).set(Date.now());
        
        // Clear message input
        messageInput.value = '';
        
        // Reset send button
        const sendMessageBtn = document.getElementById('sendMessageBtn');
        if (sendMessageBtn) sendMessageBtn.disabled = true;
        
        // Clear typing indicator
        clearTypingIndicator();
        
        // Play sent sound
        const sentSound = document.getElementById('messageSentSound');
        if (sentSound) {
            sentSound.currentTime = 0;
            sentSound.play().catch(e => console.log("Audio play failed:", e));
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Error sending message', 'error');
    }
}

let currentMediaFile = null;

function handleMediaSelection(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const fileType = file.type.startsWith('image/') ? 'image' :
                    file.type.startsWith('video/') ? 'video' : 'file';
    
    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size exceeds 50MB limit', 'error');
        return;
    }
    
    currentMediaFile = { file, type: fileType };
    
    // Show preview
    showMediaPreview(file, fileType);
    
    // Clear file input
    e.target.value = '';
}

function showMediaPreview(file, type) {
    const messageInput = document.getElementById('messageInput');
    const chatMessages = document.getElementById('chatMessages');
    
    // Remove empty state if present
    const emptyChat = chatMessages.querySelector('.empty-chat');
    if (emptyChat) emptyChat.remove();
    
    // Create preview element
    const previewElement = document.createElement('div');
    previewElement.className = 'message sent';
    previewElement.style.opacity = '0.7';
    previewElement.style.marginBottom = '10px';
    
    if (type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewElement.innerHTML = `
                <div class="message-bubble">
                    <div class="media-message">
                        <img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 10px;">
                        <p style="margin-top: 8px; font-style: italic;">${messageInput.value || 'Add caption...'}</p>
                    </div>
                    <span class="message-time">Sending...</span>
                </div>
            `;
            chatMessages.appendChild(previewElement);
            scrollToBottom();
        };
        reader.readAsDataURL(file);
    } else if (type === 'video') {
        previewElement.innerHTML = `
            <div class="message-bubble">
                <div class="media-message">
                    <video controls style="max-width: 200px; border-radius: 10px;">
                        <source src="${URL.createObjectURL(file)}" type="${file.type}">
                    </video>
                    <p style="margin-top: 8px; font-style: italic;">${messageInput.value || 'Add caption...'}</p>
                </div>
                <span class="message-time">Sending...</span>
            </div>
        `;
        chatMessages.appendChild(previewElement);
        scrollToBottom();
    } else {
        const fileSize = formatFileSize(file.size);
        previewElement.innerHTML = `
            <div class="message-bubble">
                <div class="media-message">
                    <div style="padding: 12px; background: rgba(255,255,255,0.2); border-radius: 10px;">
                        <i class="fas fa-file" style="margin-right: 8px;"></i>
                        <strong>${file.name}</strong>
                        <span style="font-size: 12px; opacity: 0.8;"> (${fileSize})</span>
                    </div>
                    <p style="margin-top: 8px; font-style: italic;">${messageInput.value || 'Add caption...'}</p>
                </div>
                <span class="message-time">Sending...</span>
            </div>
        `;
        chatMessages.appendChild(previewElement);
        scrollToBottom();
    }
}

function clearMediaPreview() {
    currentMediaFile = null;
    
    // Remove preview messages
    const chatMessages = document.getElementById('chatMessages');
    const previewMessages = chatMessages.querySelectorAll('.message[style*="opacity: 0.7"]');
    previewMessages.forEach(msg => msg.remove());
    
    // Restore empty state if no messages
    const messages = chatMessages.querySelectorAll('.message:not([style*="opacity: 0.7"])');
    if (messages.length === 0) {
        chatMessages.innerHTML = `
            <div class="empty-chat">
                <i class="fas fa-comment-slash"></i>
                <h3>No messages yet</h3>
                <p>Send a message to start the conversation</p>
            </div>
        `;
    }
}

function sendTypingIndicator() {
    if (!chatPartnerId) return;
    
    // Send typing indicator
    database.ref(`users/${currentUser.uid}/typing`).set({
        chatId: chatId,
        timestamp: Date.now()
    });
    
    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Clear typing indicator after 2 seconds
    typingTimeout = setTimeout(() => {
        database.ref(`users/${currentUser.uid}/typing`).remove();
    }, 2000);
}

function clearTypingIndicator() {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
    database.ref(`users/${currentUser.uid}/typing`).remove();
}

function populateViewProfileModal() {
    if (!chatPartnerData) return;
    
    const viewProfileName = document.getElementById('viewProfileName');
    const viewProfileID = document.getElementById('viewProfileID');
    const viewProfilePic = document.getElementById('viewProfilePic');
    const viewProfileEmail = document.getElementById('viewProfileEmail');
    const viewProfilePhone = document.getElementById('viewProfilePhone');
    
    if (viewProfileName) viewProfileName.textContent = chatPartnerData.fullName;
    if (viewProfileID) viewProfileID.textContent = chatPartnerData.userId;
    if (viewProfilePic && chatPartnerData.profilePicture) {
        viewProfilePic.src = chatPartnerData.profilePicture;
    }
    if (viewProfileEmail) viewProfileEmail.value = chatPartnerData.email;
    if (viewProfilePhone) viewProfilePhone.value = chatPartnerData.phoneNumber;
}

async function saveNickname() {
    const nickname = document.getElementById('nicknameInput').value.trim();
    
    if (!nickname) {
        showToast('Please enter a nickname', 'warning');
        return;
    }
    
    try {
        // Save nickname to user's contacts
        await database.ref(`users/${currentUser.uid}/contactNicknames/${chatPartnerId}`).set(nickname);
        
        // Close modal
        document.getElementById('addNicknameModal').classList.remove('active');
        
        // Reset form
        document.getElementById('nicknameInput').value = '';
        document.getElementById('nicknameCharCount').textContent = '0';
        
        showToast('Nickname saved', 'success');
        
    } catch (error) {
        console.error('Error saving nickname:', error);
        showToast('Error saving nickname', 'error');
    }
}

async function blockUser() {
    try {
        // Add to blocked users
        await database.ref(`users/${currentUser.uid}/blockedUsers/${chatPartnerId}`).set(true);
        
        // Remove from contacts (both ways)
        await database.ref(`users/${currentUser.uid}/contacts/${chatPartnerId}`).remove();
        await database.ref(`users/${chatPartnerId}/contacts/${currentUser.uid}`).remove();
        
        // Close modal
        document.getElementById('blockUserModal').classList.remove('active');
        
        showToast('User blocked successfully', 'success');
        
        // Redirect to home
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Error blocking user:', error);
        showToast('Error blocking user', 'error');
    }
}

async function clearChat() {
    try {
        // Remove all messages from the chat
        await database.ref(`messages/${chatId}`).remove();
        
        // Close modal
        document.getElementById('clearChatModal').classList.remove('active');
        
        showToast('Chat cleared', 'success');
        
        // Reload messages (will show empty state)
        await loadMessages(chatId);
        
    } catch (error) {
        console.error('Error clearing chat:', error);
        showToast('Error clearing chat', 'error');
    }
}

async function submitReport() {
    const reason = document.getElementById('reportReason').value;
    const details = document.getElementById('reportDetails').value.trim();
    
    if (!reason) {
        showToast('Please select a reason', 'warning');
        return;
    }
    
    try {
        const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const reportData = {
            id: reportId,
            reporterId: currentUser.uid,
            reportedUserId: chatPartnerId,
            reason: reason,
            details: details,
            chatId: chatId,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        // Save report to database
        await database.ref(`reports/${reportId}`).set(reportData);
        
        // Close modal and reset form
        document.getElementById('reportUserModal').classList.remove('active');
        resetReportForm();
        
        showToast('Report submitted successfully', 'success');
        
    } catch (error) {
        console.error('Error submitting report:', error);
        showToast('Error submitting report', 'error');
    }
}

function resetReportForm() {
    const reportReason = document.getElementById('reportReason');
    const reportDetails = document.getElementById('reportDetails');
    const reportCharCount = document.getElementById('reportCharCount');
    
    if (reportReason) reportReason.value = '';
    if (reportDetails) reportDetails.value = '';
    if (reportCharCount) reportCharCount.textContent = '0';
}

function viewMedia(url, type) {
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    const mediaPreviewContent = document.getElementById('mediaPreviewContent');
    
    if (!mediaPreviewModal || !mediaPreviewContent) return;
    
    if (type === 'image') {
        mediaPreviewContent.innerHTML = `
            <img src="${url}" alt="Media" style="max-width: 100%; max-height: 100%; object-fit: contain;">
        `;
    } else if (type === 'video') {
        mediaPreviewContent.innerHTML = `
            <video src="${url}" controls autoplay style="max-width: 100%; max-height: 100%;"></video>
        `;
    }
    
    mediaPreviewModal.classList.add('active');
}

// ===== SETUP REAL-TIME LISTENERS =====
function setupRealtimeListeners() {
    // Listen for new chat requests
    database.ref(`users/${currentUser.uid}/chatRequests`).on('child_added', () => {
        updateChatRequestsBadge();
    });
    
    database.ref(`users/${currentUser.uid}/chatRequests`).on('child_removed', () => {
        updateChatRequestsBadge();
    });
    
    // Listen for new groups
    database.ref(`users/${currentUser.uid}/groups`).on('child_added', () => {
        updateGroupsBadge();
    });
    
    // Clean up old zynes (run once per session)
    cleanupOldZynes();
}

async function cleanupOldZynes() {
    try {
        const snapshot = await database.ref(`users/${currentUser.uid}/zynes`).once('value');
        const zynes = snapshot.val();
        
        if (!zynes) return;
        
        const now = Date.now();
        const updates = {};
        
        Object.entries(zynes).forEach(([id, zyne]) => {
            if (now - zyne.timestamp > 24 * 60 * 60 * 1000) {
                updates[id] = null; // Mark for deletion
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref(`users/${currentUser.uid}/zynes`).update(updates);
        }
    } catch (error) {
        console.error('Error cleaning up old zynes:', error);
    }
}

// ===== INITIALIZE APPLICATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize authentication
    initializeAuth();
    
    // Check which page we're on and initialize accordingly
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
        initializeAuthPage();
    }
});

function initializeAuthPage() {
    // Welcome screen buttons
    const getStartedBtn = document.getElementById('getStartedBtn');
    const loginBtn = document.getElementById('loginBtn');
    
    const welcomeScreen = document.getElementById('welcomeScreen');
    const signupScreen = document.getElementById('signupScreen');
    const loginScreen = document.getElementById('loginScreen');
    
    // Show loading screen initially
    const loadingScreen = document.getElementById('loadingScreen');
    setTimeout(() => {
        if (loadingScreen) loadingScreen.classList.add('hidden');
    }, 1000);
    
    // Get Started button
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (signupScreen) signupScreen.style.display = 'flex';
        });
    }
    
    // Login button
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            if (welcomeScreen) welcomeScreen.style.display = 'none';
            if (loginScreen) loginScreen.style.display = 'flex';
        });
    }
    
    // Back buttons
    const backToWelcome = document.getElementById('backToWelcome');
    const backToWelcomeFromLogin = document.getElementById('backToWelcomeFromLogin');
    
    if (backToWelcome) {
        backToWelcome.addEventListener('click', () => {
            if (signupScreen) signupScreen.style.display = 'none';
            if (welcomeScreen) welcomeScreen.style.display = 'flex';
        });
    }
    
    if (backToWelcomeFromLogin) {
        backToWelcomeFromLogin.addEventListener('click', () => {
            if (loginScreen) loginScreen.style.display = 'none';
            if (welcomeScreen) welcomeScreen.style.display = 'flex';
        });
    }
    
    // Switch between login and signup
    const switchToLogin = document.getElementById('switchToLogin');
    const switchToSignup = document.getElementById('switchToSignup');
    
    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupScreen) signupScreen.style.display = 'none';
            if (loginScreen) loginScreen.style.display = 'flex';
        });
    }
    
    if (switchToSignup) {
        switchToSignup.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginScreen) loginScreen.style.display = 'none';
            if (signupScreen) signupScreen.style.display = 'flex';
        });
    }
    
    // Password toggle functionality
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
    
    // Profile photo upload
    const uploadBtn = document.getElementById('uploadBtn');
    const profilePhoto = document.getElementById('profilePhoto');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const profilePreview = document.getElementById('profilePreview');
    
    if (uploadBtn && profilePhoto) {
        uploadBtn.addEventListener('click', () => {
            profilePhoto.click();
        });
    }
    
    if (profilePhoto) {
        profilePhoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    showToast('Please select an image file', 'error');
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showToast('Image size should be less than 5MB', 'error');
                    return;
                }
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                    removePhotoBtn.style.display = 'flex';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', () => {
            profilePreview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-user-circle"></i>
                    <span>No photo selected</span>
                    <p>JPEG, PNG up to 5MB</p>
                </div>
            `;
            removePhotoBtn.style.display = 'none';
            profilePhoto.value = '';
        });
    }
    
    // Signup form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value.trim();
            const phoneNumber = document.getElementById('phoneNumber').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsAgreement = document.getElementById('termsAgreement').checked;
            
            // Validation
            if (!fullName || !phoneNumber || !email || !password || !confirmPassword) {
                showToast('Please fill in all fields', 'error');
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
            
            if (!termsAgreement) {
                showToast('Please agree to the terms and conditions', 'error');
                return;
            }
            
            // Get profile picture
            let profilePicture = '';
            const profileImg = profilePreview.querySelector('img');
            if (profileImg) {
                profilePicture = profileImg.src;
            }
            
            // Show loading
            const signupSubmitBtn = document.getElementById('signupSubmitBtn');
            const btnText = signupSubmitBtn.querySelector('span');
            const spinner = signupSubmitBtn.querySelector('.spinner');
            
            if (btnText && spinner) {
                btnText.style.display = 'none';
                spinner.style.display = 'block';
                signupSubmitBtn.disabled = true;
            }
            
            try {
                // Register user
                await registerUser(email, password, {
                    fullName,
                    phoneNumber,
                    profilePicture
                });
                
                showToast('Account created successfully!', 'success');
                
                // Auto login will happen via auth state change
                
            } catch (error) {
                console.error('Signup error:', error);
                
                let errorMessage = 'Registration failed. ';
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
                
                // Reset button
                if (btnText && spinner) {
                    btnText.style.display = 'block';
                    spinner.style.display = 'none';
                    signupSubmitBtn.disabled = false;
                }
            }
        });
    }
    
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast('Please fill in all fields', 'error');
                return;
            }
            
            // Show loading
            const loginSubmitBtn = document.getElementById('loginSubmitBtn');
            const btnText = loginSubmitBtn.querySelector('span');
            const spinner = loginSubmitBtn.querySelector('.spinner');
            
            if (btnText && spinner) {
                btnText.style.display = 'none';
                spinner.style.display = 'block';
                loginSubmitBtn.disabled = true;
            }
            
            try {
                await loginUser(email, password);
                // Auto redirect will happen via auth state change
            } catch (error) {
                console.error('Login error:', error);
                
                let errorMessage = 'Login failed. ';
                switch(error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        errorMessage += 'Invalid email or password.';
                        break;
                    case 'auth/user-disabled':
                        errorMessage += 'Account is disabled.';
                        break;
                    default:
                        errorMessage += 'Please try again.';
                }
                
                showToast(errorMessage, 'error');
                
                // Reset button
                if (btnText && spinner) {
                    btnText.style.display = 'block';
                    spinner.style.display = 'none';
                    loginSubmitBtn.disabled = false;
                }
            }
        });
    }
    
    // Google signup/login (placeholder - needs Firebase Google Auth setup)
    const googleSignupBtn = document.getElementById('googleSignupBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', () => {
            showToast('Google signup coming soon', 'info');
        });
    }
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            showToast('Google login coming soon', 'info');
        });
    }
    
    // Forgot password
    const forgotPassword = document.getElementById('forgotPassword');
    if (forgotPassword) {
        forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Password reset feature coming soon', 'info');
        });
    }
}

// Make viewMedia function available globally
window.viewMedia = viewMedia;

// Handle window beforeunload for cleanup
window.addEventListener('beforeunload', async () => {
    if (currentUser) {
        await database.ref(`users/${currentUser.uid}/status`).set('offline');
        if (onlineStatusInterval) clearInterval(onlineStatusInterval);
    }
});
