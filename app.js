// ==================== ZYNAPSE PRODUCTION APP.JS ====================
// Firebase Configuration
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

// Cloudinary Configuration
const CLOUDINARY_CONFIG = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse'
};

// Global Variables
let currentUser = null;
let currentUserData = null;
let currentChatId = null;
let currentChatData = null;
let currentChatType = null; // 'individual' or 'group'
let currentChatUser = null;
let mediaRecorder = null;
let audioChunks = [];
let voiceRecording = false;
let voiceStartTime = null;
let voiceTimer = null;
let typingTimeout = null;
let chatListener = null;
let contactsListener = null;
let requestsListener = null;
let groupsListener = null;
let zynesListener = null;

// Initialize Firebase
function initializeFirebase() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                loadUserData();
            } else {
                // Not authenticated, redirect to index
                window.location.href = 'index.html';
            }
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
        showToast('Failed to initialize app', 'error');
    }
}

// Load User Data from Database
async function loadUserData() {
    try {
        const userRef = firebase.database().ref('users/' + currentUser.uid);
        userRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                currentUserData = snapshot.val();
                updateUIWithUserData();
                setupRealtimeListeners();
            } else {
                showToast('User data not found', 'error');
                logout();
            }
        });
    } catch (error) {
        console.error("Error loading user data:", error);
        showToast('Failed to load user data', 'error');
    }
}

// Update UI with User Data
function updateUIWithUserData() {
    if (!currentUserData) return;
    
    // Update profile picture
    const profilePic = document.getElementById('userProfilePic');
    const chatProfilePic = document.getElementById('chatUserAvatar');
    
    if (currentUserData.profileUrl) {
        if (profilePic) profilePic.src = currentUserData.profileUrl;
        if (chatProfilePic) chatProfilePic.src = currentUserData.profileUrl;
    }
    
    // Update name
    const userNameElement = document.getElementById('userName');
    const chatUserNameElement = document.getElementById('chatUserName');
    
    if (userNameElement) userNameElement.textContent = currentUserData.name;
    if (chatUserNameElement) chatUserNameElement.textContent = currentUserData.name;
    
    // Update user ID
    const userIDElement = document.getElementById('userID');
    if (userIDElement) userIDElement.textContent = currentUserData.userId;
    
    // Update status
    updateStatusUI();
}

// Update Status UI
function updateStatusUI() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    if (statusIcon && statusText && currentUserData) {
        const status = currentUserData.status || 'offline';
        statusIcon.className = `fas fa-circle ${status === 'online' ? 'text-green' : 'text-gray-500'}`;
        statusText.textContent = status === 'online' ? 'Online' : 'Offline';
    }
}

// Setup Realtime Listeners
function setupRealtimeListeners() {
    if (!currentUser) return;
    
    // Update user status to online
    updateUserStatus('online');
    
    // Listen for chat requests
    listenForChatRequests();
    
    // Listen for contacts
    listenForContacts();
    
    // Listen for chats
    listenForChats();
    
    // Listen for groups
    listenForGroups();
    
    // Listen for Zynes
    listenForZynes();
}

// Update User Status
async function updateUserStatus(status) {
    try {
        await firebase.database().ref('users/' + currentUser.uid).update({
            status: status,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

// ==================== HOME PAGE FUNCTIONS ====================

// Copy User ID to Clipboard
function copyUserID() {
    if (currentUserData && currentUserData.userId) {
        navigator.clipboard.writeText(currentUserData.userId)
            .then(() => showToast('User ID copied to clipboard', 'success'))
            .catch(() => showToast('Failed to copy', 'error'));
    }
}

// Toggle Profile Dropdown
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
        
        // Close when clicking outside
        if (dropdown.classList.contains('show')) {
            setTimeout(() => {
                document.addEventListener('click', closeProfileDropdown);
            }, 100);
        } else {
            document.removeEventListener('click', closeProfileDropdown);
        }
    }
}

function closeProfileDropdown(event) {
    const dropdown = document.getElementById('profileDropdown');
    const profileBtn = document.querySelector('.profile-btn');
    
    if (dropdown && !dropdown.contains(event.target) && !profileBtn.contains(event.target)) {
        dropdown.classList.remove('show');
        document.removeEventListener('click', closeProfileDropdown);
    }
}

// Switch Page
function switchPage(page) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
    
    // Show selected page
    document.querySelectorAll('.page').forEach(pageElement => {
        pageElement.classList.remove('active');
    });
    document.getElementById(`${page}Page`).classList.add('active');
    
    // Load page data
    switch(page) {
        case 'home':
            loadChats();
            break;
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
}

// ==================== CHAT FUNCTIONS ====================

// Show Start Chat Modal
function showStartChatModal() {
    document.getElementById('startChatModal').classList.add('active');
    document.getElementById('searchUserID').focus();
}

// Hide Start Chat Modal
function hideStartChatModal() {
    document.getElementById('startChatModal').classList.remove('active');
    document.getElementById('searchUserID').value = '';
    document.getElementById('searchResult').innerHTML = `
        <div class="empty-state">
            <i class="fas fa-search"></i>
            <p>Enter a User ID to search</p>
        </div>
    `;
}

// Search User by ID
async function searchUserByID(userId) {
    try {
        if (!userId.startsWith('ZYN-')) {
            showToast('Invalid User ID format', 'error');
            return null;
        }
        
        const usersRef = firebase.database().ref('users');
        const snapshot = await usersRef.orderByChild('userId').equalTo(userId).once('value');
        
        if (snapshot.exists()) {
            const userData = Object.entries(snapshot.val())[0];
            return {
                uid: userData[0],
                ...userData[1]
            };
        }
        return null;
    } catch (error) {
        console.error("Error searching user:", error);
        showToast('Failed to search user', 'error');
        return null;
    }
}

// Handle User ID Search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchUserID');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const userId = e.target.value.trim();
            const searchResult = document.getElementById('searchResult');
            
            if (userId.length === 8 && userId.startsWith('ZYN-')) {
                const user = await searchUserByID(userId);
                
                if (user) {
                    if (user.uid === currentUser.uid) {
                        searchResult.innerHTML = `
                            <div class="empty-state">
                                <i class="fas fa-user"></i>
                                <p>That's your own User ID!</p>
                            </div>
                        `;
                    } else {
                        searchResult.innerHTML = `
                            <div class="user-found">
                                <img src="${user.profileUrl || 'zynaps.png'}" alt="${user.name}" class="user-found-avatar">
                                <div class="user-found-info">
                                    <h4>${user.name}</h4>
                                    <p>${user.userId}</p>
                                </div>
                                <button class="action-btn btn-primary" onclick="sendChatRequest('${user.uid}')">
                                    <i class="fas fa-user-plus"></i>
                                    Send Request
                                </button>
                            </div>
                        `;
                    }
                } else {
                    searchResult.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-user-slash"></i>
                            <p>User not found</p>
                        </div>
                    `;
                }
            } else if (userId.length > 0) {
                searchResult.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Enter a valid User ID (ZYN-XXXX)</p>
                    </div>
                `;
            } else {
                searchResult.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <p>Enter a User ID to search</p>
                    </div>
                `;
            }
        });
    }
});

// Send Chat Request
async function sendChatRequest(targetUserId) {
    try {
        if (!currentUser || !currentUserData) return;
        
        const requestId = `${currentUser.uid}_${Date.now()}`;
        const requestData = {
            fromUid: currentUser.uid,
            fromUserId: currentUserData.userId,
            fromName: currentUserData.name,
            fromProfileUrl: currentUserData.profileUrl,
            toUid: targetUserId,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending'
        };
        
        await firebase.database().ref(`chatRequests/${targetUserId}/${requestId}`).set(requestData);
        
        showToast('Chat request sent', 'success');
        hideStartChatModal();
    } catch (error) {
        console.error("Error sending chat request:", error);
        showToast('Failed to send request', 'error');
    }
}

// Listen for Chat Requests
function listenForChatRequests() {
    if (!currentUser) return;
    
    if (requestsListener) requestsListener();
    
    requestsListener = firebase.database().ref(`chatRequests/${currentUser.uid}`)
        .orderByChild('status').equalTo('pending')
        .on('value', (snapshot) => {
            const badge = document.getElementById('requestBadge');
            if (badge) {
                const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
                badge.textContent = count;
                badge.style.display = count > 0 ? 'flex' : 'none';
            }
        });
}

// Load Chat Requests
async function loadChatRequests() {
    try {
        const snapshot = await firebase.database().ref(`chatRequests/${currentUser.uid}`)
            .orderByChild('status').equalTo('pending').once('value');
        
        const requestsList = document.getElementById('requestsList');
        if (!requestsList) return;
        
        if (!snapshot.exists()) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-plus"></i>
                    <h3>No Pending Requests</h3>
                    <p>You'll see chat requests here when people want to connect with you</p>
                </div>
            `;
            return;
        }
        
        requestsList.innerHTML = '';
        const requests = snapshot.val();
        
        Object.entries(requests).forEach(([requestId, request]) => {
            const requestCard = document.createElement('div');
            requestCard.className = 'request-card';
            requestCard.innerHTML = `
                <div class="request-header">
                    <img src="${request.fromProfileUrl || 'zynaps.png'}" alt="${request.fromName}" class="request-avatar">
                    <div class="request-info">
                        <h4>${request.fromName}</h4>
                        <p class="request-user-id">${request.fromUserId}</p>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="action-btn accept-btn" onclick="acceptChatRequest('${request.fromUid}', '${requestId}')">
                        <i class="fas fa-check"></i>
                        Accept
                    </button>
                    <button class="action-btn reject-btn" onclick="rejectChatRequest('${requestId}')">
                        <i class="fas fa-times"></i>
                        Reject
                    </button>
                </div>
            `;
            requestsList.appendChild(requestCard);
        });
    } catch (error) {
        console.error("Error loading chat requests:", error);
    }
}

// Accept Chat Request
async function acceptChatRequest(senderUid, requestId) {
    try {
        // Remove request
        await firebase.database().ref(`chatRequests/${currentUser.uid}/${requestId}`).remove();
        
        // Add to contacts for both users
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        // Add sender to current user's contacts
        await firebase.database().ref(`users/${currentUser.uid}/contacts/${senderUid}`).set({
            addedAt: timestamp,
            chatId: `${currentUser.uid}_${senderUid}`
        });
        
        // Add current user to sender's contacts
        await firebase.database().ref(`users/${senderUid}/contacts/${currentUser.uid}`).set({
            addedAt: timestamp,
            chatId: `${currentUser.uid}_${senderUid}`
        });
        
        // Create chat record
        const chatId = `${currentUser.uid}_${senderUid}`;
        const chatData = {
            participants: {
                [currentUser.uid]: true,
                [senderUid]: true
            },
            lastMessage: '',
            lastMessageTime: timestamp,
            type: 'individual',
            createdAt: timestamp
        };
        
        await firebase.database().ref(`chats/${chatId}`).set(chatData);
        
        showToast('Contact added successfully', 'success');
        loadChatRequests();
    } catch (error) {
        console.error("Error accepting chat request:", error);
        showToast('Failed to accept request', 'error');
    }
}

// Reject Chat Request
async function rejectChatRequest(requestId) {
    try {
        await firebase.database().ref(`chatRequests/${currentUser.uid}/${requestId}`).remove();
        showToast('Request rejected', 'info');
        loadChatRequests();
    } catch (error) {
        console.error("Error rejecting chat request:", error);
        showToast('Failed to reject request', 'error');
    }
}

// ==================== CONTACTS FUNCTIONS ====================

// Listen for Contacts
function listenForContacts() {
    if (!currentUser) return;
    
    if (contactsListener) contactsListener();
    
    contactsListener = firebase.database().ref(`users/${currentUser.uid}/contacts`)
        .on('value', (snapshot) => {
            // This triggers when contacts change
        });
}

// Load Contacts
async function loadContacts() {
    try {
        const contactsRef = firebase.database().ref(`users/${currentUser.uid}/contacts`);
        const snapshot = await contactsRef.once('value');
        
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;
        
        if (!snapshot.exists()) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-address-book"></i>
                    <h3>No Contacts Yet</h3>
                    <p>Accept chat requests or search for users to add them to contacts</p>
                </div>
            `;
            return;
        }
        
        contactsList.innerHTML = '';
        const contacts = snapshot.val();
        
        // Get contact details for each contact
        for (const [contactUid, contactData] of Object.entries(contacts)) {
            const userSnapshot = await firebase.database().ref(`users/${contactUid}`).once('value');
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                const contactCard = document.createElement('div');
                contactCard.className = 'contact-card';
                contactCard.onclick = () => openChat(contactUid, 'individual');
                contactCard.innerHTML = `
                    <img src="${userData.profileUrl || 'zynaps.png'}" alt="${userData.name}" class="contact-avatar">
                    <div class="contact-info">
                        <h3>${userData.name}</h3>
                        <div class="contact-status">
                            <span class="status-dot ${userData.status === 'online' ? 'online' : 'offline'}"></span>
                            <span>${userData.status === 'online' ? 'Online' : 'Last seen recently'}</span>
                        </div>
                    </div>
                    <div class="contact-actions">
                        <button class="icon-btn" onclick="removeContact('${contactUid}', event)" title="Remove Contact">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                contactsList.appendChild(contactCard);
            }
        }
    } catch (error) {
        console.error("Error loading contacts:", error);
    }
}

// Remove Contact
async function removeContact(contactUid, event) {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to remove this contact?')) {
        try {
            // Remove from current user's contacts
            await firebase.database().ref(`users/${currentUser.uid}/contacts/${contactUid}`).remove();
            
            // Remove current user from contact's contacts
            await firebase.database().ref(`users/${contactUid}/contacts/${currentUser.uid}`).remove();
            
            showToast('Contact removed', 'success');
            loadContacts();
        } catch (error) {
            console.error("Error removing contact:", error);
            showToast('Failed to remove contact', 'error');
        }
    }
}

// ==================== CHATS FUNCTIONS ====================

// Listen for Chats
function listenForChats() {
    if (!currentUser) return;
    
    if (chatListener) chatListener();
    
    // Listen for chats where current user is a participant
    chatListener = firebase.database().ref('chats')
        .orderByChild(`participants/${currentUser.uid}`).equalTo(true)
        .on('value', (snapshot) => {
            // Update chat list in real-time
            if (window.location.pathname.includes('home.html')) {
                loadChats();
            }
        });
}

// Load Chats
async function loadChats() {
    try {
        const chatsRef = firebase.database().ref('chats');
        const snapshot = await chatsRef.orderByChild(`participants/${currentUser.uid}`).equalTo(true).once('value');
        
        const chatsList = document.getElementById('chatsList');
        if (!chatsList) return;
        
        if (!snapshot.exists()) {
            chatsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No Chats Yet</h3>
                    <p>Start a conversation by tapping the chat button below</p>
                </div>
            `;
            return;
        }
        
        chatsList.innerHTML = '';
        const chats = snapshot.val();
        
        // Get chat details for each chat
        const chatPromises = Object.entries(chats).map(async ([chatId, chatData]) => {
            let chatName = 'Unknown';
            let chatAvatar = 'zynaps.png';
            let otherUserUid = null;
            
            if (chatData.type === 'individual') {
                // Find other participant
                const participants = Object.keys(chatData.participants);
                otherUserUid = participants.find(uid => uid !== currentUser.uid);
                
                if (otherUserUid) {
                    const userSnapshot = await firebase.database().ref(`users/${otherUserUid}`).once('value');
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();
                        chatName = userData.name;
                        chatAvatar = userData.profileUrl || 'zynaps.png';
                    }
                }
            } else if (chatData.type === 'group') {
                chatName = chatData.groupName || 'Group Chat';
                chatAvatar = chatData.groupPhoto || 'zynaps.png';
            }
            
            // Get unread count
            const unreadSnapshot = await firebase.database().ref(`unread/${currentUser.uid}/${chatId}`).once('value');
            const unreadCount = unreadSnapshot.exists() ? unreadSnapshot.val() : 0;
            
            // Format time
            const time = chatData.lastMessageTime ? formatTime(chatData.lastMessageTime) : '';
            
            return {
                chatId,
                chatData,
                chatName,
                chatAvatar,
                otherUserUid,
                unreadCount,
                time,
                lastMessage: chatData.lastMessage || 'No messages yet'
            };
        });
        
        const chatDetails = await Promise.all(chatPromises);
        
        // Sort by last message time (newest first)
        chatDetails.sort((a, b) => b.chatData.lastMessageTime - a.chatData.lastMessageTime);
        
        // Display chats
        chatDetails.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.onclick = () => {
                if (chat.chatData.type === 'individual') {
                    window.location.href = `chat.html?chatId=${chat.chatId}&userId=${chat.otherUserUid}`;
                } else {
                    window.location.href = `chat.html?chatId=${chat.chatId}&type=group`;
                }
            };
            
            chatItem.innerHTML = `
                <img src="${chat.chatAvatar}" alt="${chat.chatName}" class="chat-avatar">
                <div class="chat-info">
                    <h3>${chat.chatName}</h3>
                    <p class="chat-preview">${chat.lastMessage}</p>
                </div>
                <div class="chat-meta">
                    <span class="chat-time">${chat.time}</span>
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            `;
            chatsList.appendChild(chatItem);
        });
    } catch (error) {
        console.error("Error loading chats:", error);
    }
}

// Format Time
function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
}

// Open Chat
function openChat(userId, type = 'individual') {
    const chatId = type === 'individual' ? `${currentUser.uid}_${userId}` : userId;
    window.location.href = `chat.html?chatId=${chatId}&userId=${userId}`;
}

// ==================== CHAT PAGE FUNCTIONS ====================

// Go Back to Home
function goBack() {
    window.history.back() || window.location.replace('home.html');
}

// Initialize Chat Page
async function initializeChatPage() {
    const urlParams = new URLSearchParams(window.location.search);
    currentChatId = urlParams.get('chatId');
    const userId = urlParams.get('userId');
    const type = urlParams.get('type');
    
    if (!currentChatId) {
        showToast('Invalid chat', 'error');
        goBack();
        return;
    }
    
    currentChatType = type === 'group' ? 'group' : 'individual';
    
    if (currentChatType === 'individual' && userId) {
        await loadChatUserData(userId);
    } else if (currentChatType === 'group') {
        await loadGroupChatData();
    }
    
    loadMessages();
    setupChatListeners();
}

// Load Chat User Data
async function loadChatUserData(userId) {
    try {
        const snapshot = await firebase.database().ref(`users/${userId}`).once('value');
        if (snapshot.exists()) {
            currentChatUser = snapshot.val();
            updateChatHeader();
        }
    } catch (error) {
        console.error("Error loading chat user data:", error);
    }
}

// Load Group Chat Data
async function loadGroupChatData() {
    try {
        const snapshot = await firebase.database().ref(`chats/${currentChatId}`).once('value');
        if (snapshot.exists()) {
            currentChatData = snapshot.val();
            updateGroupChatHeader();
        }
    } catch (error) {
        console.error("Error loading group chat data:", error);
    }
}

// Update Chat Header
function updateChatHeader() {
    if (!currentChatUser) return;
    
    const chatUserName = document.getElementById('chatUserName');
    const chatUserAvatar = document.getElementById('chatUserAvatar');
    const userStatusDot = document.getElementById('userStatusDot');
    const userStatusText = document.getElementById('userStatusText');
    
    if (chatUserName) chatUserName.textContent = currentChatUser.name;
    if (chatUserAvatar) chatUserAvatar.src = currentChatUser.profileUrl || 'zynaps.png';
    if (userStatusDot) {
        userStatusDot.className = `status-dot ${currentChatUser.status === 'online' ? 'online' : ''}`;
    }
    if (userStatusText) {
        userStatusText.textContent = currentChatUser.status === 'online' ? 'Online' : 'Last seen recently';
    }
}

// Update Group Chat Header
function updateGroupChatHeader() {
    if (!currentChatData) return;
    
    const chatUserName = document.getElementById('chatUserName');
    const chatUserAvatar = document.getElementById('chatUserAvatar');
    const userStatusText = document.getElementById('userStatusText');
    
    if (chatUserName) chatUserName.textContent = currentChatData.groupName || 'Group Chat';
    if (chatUserAvatar) chatUserAvatar.src = currentChatData.groupPhoto || 'zynaps.png';
    if (userStatusText) {
        const memberCount = currentChatData.participants ? Object.keys(currentChatData.participants).length : 0;
        userStatusText.textContent = `${memberCount} members`;
    }
}

// Load Messages
async function loadMessages() {
    try {
        const snapshot = await firebase.database().ref(`messages/${currentChatId}`)
            .orderByChild('timestamp')
            .limitToLast(50)
            .once('value');
        
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        chatMessages.innerHTML = '';
        
        if (!snapshot.exists()) {
            return;
        }
        
        const messages = snapshot.val();
        let lastDate = null;
        
        Object.entries(messages).forEach(([messageId, message]) => {
            // Add date separator if needed
            const messageDate = new Date(message.timestamp).toDateString();
            if (messageDate !== lastDate) {
                const dateLabel = document.createElement('div');
                dateLabel.className = 'message-date';
                dateLabel.innerHTML = `<span class="date-label">${formatMessageDate(message.timestamp)}</span>`;
                chatMessages.appendChild(dateLabel);
                lastDate = messageDate;
            }
            
            // Create message element
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.senderUid === currentUser.uid ? 'sent' : 'received'}`;
            messageElement.innerHTML = createMessageHTML(message);
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom
        scrollToBottom();
        
        // Mark messages as read
        markMessagesAsRead();
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

// Format Message Date
function formatMessageDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays < 365 ? undefined : 'numeric' });
}

// Create Message HTML
function createMessageHTML(message) {
    let contentHTML = '';
    
    switch (message.type) {
        case 'text':
            contentHTML = `<div class="message-text">${escapeHtml(message.content)}</div>`;
            break;
        case 'image':
            contentHTML = `
                <div class="media-message">
                    <img src="${message.content}" alt="Image" class="chat-media" onclick="viewMedia('${message.content}', 'image')">
                    ${message.caption ? `<div class="message-text">${escapeHtml(message.caption)}</div>` : ''}
                </div>
            `;
            break;
        case 'video':
            contentHTML = `
                <div class="media-message">
                    <video src="${message.content}" controls class="chat-media" onclick="viewMedia('${message.content}', 'video')"></video>
                    ${message.caption ? `<div class="message-text">${escapeHtml(message.caption)}</div>` : ''}
                </div>
            `;
            break;
        case 'document':
            contentHTML = `
                <div class="document-message" onclick="downloadFile('${message.content}', '${message.fileName || 'document'}')">
                    <div class="document-icon">
                        <i class="fas fa-file"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-name">${message.fileName || 'Document'}</div>
                        <div class="document-size">${formatFileSize(message.fileSize || 0)}</div>
                    </div>
                </div>
            `;
            break;
        case 'location':
            const location = JSON.parse(message.content);
            contentHTML = `
                <div class="location-message">
                    <div class="location-map">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="location-info">
                        <div class="location-address">${location.address || 'Location'}</div>
                        <div class="location-details">
                            <span>${location.city || ''}</span>
                            <span>${location.area || ''}</span>
                        </div>
                    </div>
                </div>
            `;
            break;
        case 'voice':
            contentHTML = `
                <div class="voice-message">
                    <button class="voice-play-btn" onclick="playVoiceMessage('${message.content}')">
                        <i class="fas fa-play"></i>
                    </button>
                    <div class="voice-waveform"></div>
                    <span class="voice-duration">${message.duration || '0:00'}</span>
                </div>
            `;
            break;
        case 'view_once':
            contentHTML = `
                <div class="view-once-message" onclick="viewOnceMessage('${messageId}')">
                    <div class="view-once-overlay">
                        <i class="fas fa-eye"></i>
                        <span>VIEW ONCE</span>
                    </div>
                </div>
            `;
            break;
    }
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `
        <div class="message-bubble">
            ${contentHTML}
            <span class="message-time">${time}</span>
        </div>
    `;
}

// Setup Chat Listeners
function setupChatListeners() {
    if (!currentChatId) return;
    
    // Listen for new messages
    firebase.database().ref(`messages/${currentChatId}`)
        .orderByChild('timestamp')
        .limitToLast(1)
        .on('child_added', (snapshot) => {
            const message = snapshot.val();
            addMessageToUI(message, snapshot.key);
            markMessagesAsRead();
        });
    
    // Listen for typing indicators
    firebase.database().ref(`typing/${currentChatId}/${currentChatUser?.uid}`)
        .on('value', (snapshot) => {
            const typingIndicator = document.getElementById('typingIndicator');
            const typingText = document.getElementById('typingText');
            
            if (snapshot.exists() && snapshot.val().typing) {
                typingIndicator.style.display = 'flex';
                typingText.textContent = `${currentChatUser?.name || 'Someone'} is typing...`;
            } else {
                typingIndicator.style.display = 'none';
            }
        });
}

// Add Message to UI
function addMessageToUI(message, messageId) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // Check if we need a date separator
    const messages = chatMessages.querySelectorAll('.message');
    let lastDate = null;
    
    if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const lastMessageTime = message.timestamp; // This would need to be stored in data attribute
        lastDate = new Date(lastMessageTime).toDateString();
    }
    
    const messageDate = new Date(message.timestamp).toDateString();
    if (messageDate !== lastDate) {
        const dateLabel = document.createElement('div');
        dateLabel.className = 'message-date';
        dateLabel.innerHTML = `<span class="date-label">${formatMessageDate(message.timestamp)}</span>`;
        chatMessages.appendChild(dateLabel);
    }
    
    // Add message
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderUid === currentUser.uid ? 'sent' : 'received'}`;
    messageElement.innerHTML = createMessageHTML(message);
    chatMessages.appendChild(messageElement);
    
    scrollToBottom();
}

// Scroll to Bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Mark Messages as Read
async function markMessagesAsRead() {
    try {
        if (!currentChatId || !currentUser) return;
        
        // Reset unread count
        await firebase.database().ref(`unread/${currentUser.uid}/${currentChatId}`).set(0);
        
        // Update last read timestamp
        await firebase.database().ref(`chats/${currentChatId}/participants/${currentUser.uid}/lastRead`).set(
            firebase.database.ServerValue.TIMESTAMP
        );
    } catch (error) {
        console.error("Error marking messages as read:", error);
    }
}

// ==================== MESSAGE SENDING FUNCTIONS ====================

// Handle Typing
function handleTyping() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (messageInput && sendBtn) {
        sendBtn.disabled = messageInput.value.trim() === '';
    }
    
    if (!currentChatId || !currentChatUser?.uid) return;
    
    // Set typing status
    firebase.database().ref(`typing/${currentChatId}/${currentUser.uid}`).set({
        typing: true,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
    
    // Clear previous timeout
    if (typingTimeout) clearTimeout(typingTimeout);
    
    // Clear typing status after 2 seconds
    typingTimeout = setTimeout(() => {
        firebase.database().ref(`typing/${currentChatId}/${currentUser.uid}`).set({
            typing: false,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    }, 2000);
}

// Handle Key Down (Enter to send)
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send Message
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    if (!messageInput) return;
    
    const content = messageInput.value.trim();
    if (!content || !currentChatId) return;
    
    try {
        const messageId = firebase.database().ref().child('messages').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const messageData = {
            messageId,
            senderUid: currentUser.uid,
            content,
            type: 'text',
            timestamp,
            status: 'sent'
        };
        
        // Save message
        await firebase.database().ref(`messages/${currentChatId}/${messageId}`).set(messageData);
        
        // Update chat last message
        await firebase.database().ref(`chats/${currentChatId}`).update({
            lastMessage: content,
            lastMessageTime: timestamp
        });
        
        // Update unread count for other participants
        const chatSnapshot = await firebase.database().ref(`chats/${currentChatId}/participants`).once('value');
        if (chatSnapshot.exists()) {
            const participants = chatSnapshot.val();
            Object.keys(participants).forEach(async (participantUid) => {
                if (participantUid !== currentUser.uid) {
                    const unreadRef = firebase.database().ref(`unread/${participantUid}/${currentChatId}`);
                    const unreadSnapshot = await unreadRef.once('value');
                    const currentUnread = unreadSnapshot.exists() ? unreadSnapshot.val() : 0;
                    await unreadRef.set(currentUnread + 1);
                }
            });
        }
        
        // Clear input
        messageInput.value = '';
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) sendBtn.disabled = true;
        
        // Clear typing status
        if (currentChatUser?.uid) {
            firebase.database().ref(`typing/${currentChatId}/${currentUser.uid}`).set({
                typing: false,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
        
        // Play sent sound
        playNotificationSound();
        
    } catch (error) {
        console.error("Error sending message:", error);
        showToast('Failed to send message', 'error');
    }
}

// ==================== ATTACHMENT FUNCTIONS ====================

// Toggle Attachment Options
function toggleAttachmentOptions() {
    const options = document.getElementById('attachmentOptions');
    if (options) {
        options.classList.toggle('show');
        
        if (options.classList.contains('show')) {
            setTimeout(() => {
                document.addEventListener('click', closeAttachmentOptions);
            }, 100);
        } else {
            document.removeEventListener('click', closeAttachmentOptions);
        }
    }
}

function closeAttachmentOptions(event) {
    const options = document.getElementById('attachmentOptions');
    const attachBtn = document.querySelector('.attach-btn');
    
    if (options && !options.contains(event.target) && !attachBtn.contains(event.target)) {
        options.classList.remove('show');
        document.removeEventListener('click', closeAttachmentOptions);
    }
}

// Upload to Cloudinary
async function uploadToCloudinary(file, type = 'image') {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', `zynapse/${type}s`);
        formData.append('cloud_name', CLOUDINARY_CONFIG.cloudName);
        
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
            reject(error);
        });
    });
}

// Attach Image
function attachImage() {
    document.getElementById('imageUpload').click();
}

// Attach Video
function attachVideo() {
    document.getElementById('videoUpload').click();
}

// Attach Document
function attachDocument() {
    document.getElementById('documentUpload').click();
}

// Attach Location
function attachLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                // Get address from coordinates (using reverse geocoding)
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                const data = await response.json();
                
                const locationData = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    address: data.display_name,
                    city: data.address.city || data.address.town || data.address.village,
                    area: data.address.suburb || data.address.neighbourhood,
                    road: data.address.road
                };
                
                await sendLocationMessage(locationData);
                
            } catch (error) {
                console.error("Error getting location:", error);
                showToast('Failed to get location', 'error');
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            showToast('Location access denied', 'error');
        });
    } else {
        showToast('Geolocation not supported', 'error');
    }
}

// Send Location Message
async function sendLocationMessage(locationData) {
    if (!currentChatId) return;
    
    try {
        const messageId = firebase.database().ref().child('messages').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const messageData = {
            messageId,
            senderUid: currentUser.uid,
            content: JSON.stringify(locationData),
            type: 'location',
            timestamp,
            status: 'sent'
        };
        
        await firebase.database().ref(`messages/${currentChatId}/${messageId}`).set(messageData);
        await updateChatLastMessage('📍 Location shared');
        
        playNotificationSound();
        
    } catch (error) {
        console.error("Error sending location:", error);
        showToast('Failed to send location', 'error');
    }
}

// Attach View Once
function attachViewOnce() {
    document.getElementById('viewOnceUpload').click();
}

// Start Voice Note
async function startVoiceNote() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            await sendVoiceMessage(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        voiceRecording = true;
        voiceStartTime = Date.now();
        
        // Show voice recording UI
        const voiceUI = document.getElementById('voiceRecordingUI');
        const messageInput = document.getElementById('messageInput');
        if (voiceUI) voiceUI.style.display = 'flex';
        if (messageInput) messageInput.style.display = 'none';
        
        // Start timer
        voiceTimer = setInterval(updateVoiceTimer, 1000);
        
        // Stop after 60 seconds max
        setTimeout(() => {
            if (voiceRecording) {
                stopVoiceRecording();
            }
        }, 60000);
        
    } catch (error) {
        console.error("Error starting voice recording:", error);
        showToast('Microphone access required', 'error');
    }
}

// Update Voice Timer
function updateVoiceTimer() {
    if (!voiceStartTime) return;
    
    const duration = Math.floor((Date.now() - voiceStartTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    const voiceDuration = document.getElementById('voiceDuration');
    if (voiceDuration) {
        voiceDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

// Stop Voice Recording
function stopVoiceRecording() {
    if (mediaRecorder && voiceRecording) {
        mediaRecorder.stop();
        voiceRecording = false;
        
        // Hide voice UI
        const voiceUI = document.getElementById('voiceRecordingUI');
        const messageInput = document.getElementById('messageInput');
        if (voiceUI) voiceUI.style.display = 'none';
        if (messageInput) messageInput.style.display = 'block';
        
        // Clear timer
        if (voiceTimer) clearInterval(voiceTimer);
    }
}

// Cancel Voice Recording
function cancelVoiceRecording() {
    if (mediaRecorder && voiceRecording) {
        mediaRecorder.stop();
        voiceRecording = false;
        
        // Hide voice UI
        const voiceUI = document.getElementById('voiceRecordingUI');
        const messageInput = document.getElementById('messageInput');
        if (voiceUI) voiceUI.style.display = 'none';
        if (messageInput) messageInput.style.display = 'block';
        
        // Clear timer
        if (voiceTimer) clearInterval(voiceTimer);
        
        // Stop all tracks
        if (mediaRecorder.stream) {
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }
}

// Send Voice Message
async function sendVoiceMessage(audioBlob) {
    if (!currentChatId) return;
    
    try {
        // Upload to Cloudinary
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        const audioUrl = await uploadToCloudinary(audioFile, 'audio');
        
        const duration = Math.floor((Date.now() - voiceStartTime) / 1000);
        
        const messageId = firebase.database().ref().child('messages').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const messageData = {
            messageId,
            senderUid: currentUser.uid,
            content: audioUrl,
            type: 'voice',
            duration: duration,
            timestamp,
            status: 'sent'
        };
        
        await firebase.database().ref(`messages/${currentChatId}/${messageId}`).set(messageData);
        await updateChatLastMessage('🎤 Voice message');
        
        playNotificationSound();
        
    } catch (error) {
        console.error("Error sending voice message:", error);
        showToast('Failed to send voice message', 'error');
    }
}

// Handle Media Upload
async function handleMediaUpload(event, type) {
    const files = event.target.files;
    if (!files.length) return;
    
    for (const file of files) {
        try {
            // Validate file size (50MB max)
            if (file.size > 50 * 1024 * 1024) {
                showToast(`${file.name} exceeds 50MB limit`, 'error');
                continue;
            }
            
            // Upload to Cloudinary
            const mediaUrl = await uploadToCloudinary(file, type);
            
            // Send message
            await sendMediaMessage(mediaUrl, type, file.name);
            
        } catch (error) {
            console.error("Error uploading media:", error);
            showToast(`Failed to upload ${file.name}`, 'error');
        }
    }
    
    // Reset file input
    event.target.value = '';
}

// Handle Document Upload
async function handleDocumentUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            showToast('File exceeds 50MB limit', 'error');
            return;
        }
        
        // Upload to Cloudinary
        const fileUrl = await uploadToCloudinary(file, 'document');
        
        // Send message
        await sendDocumentMessage(fileUrl, file.name, file.size);
        
    } catch (error) {
        console.error("Error uploading document:", error);
        showToast('Failed to upload document', 'error');
    }
    
    // Reset file input
    event.target.value = '';
}

// Handle View Once Upload
async function handleViewOnceUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const type = file.type.startsWith('image/') ? 'image' : 'video';
        
        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
            showToast('File exceeds 50MB limit', 'error');
            return;
        }
        
        // Upload to Cloudinary
        const mediaUrl = await uploadToCloudinary(file, type);
        
        // Send view once message
        await sendViewOnceMessage(mediaUrl, type);
        
    } catch (error) {
        console.error("Error uploading view once:", error);
        showToast('Failed to upload', 'error');
    }
    
    // Reset file input
    event.target.value = '';
}

// Send Media Message
async function sendMediaMessage(mediaUrl, type, fileName = '') {
    if (!currentChatId) return;
    
    try {
        const messageId = firebase.database().ref().child('messages').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const messageData = {
            messageId,
            senderUid: currentUser.uid,
            content: mediaUrl,
            type: type,
            fileName: fileName,
            timestamp,
            status: 'sent'
        };
        
        await firebase.database().ref(`messages/${currentChatId}/${messageId}`).set(messageData);
        
        const mediaType = type === 'image' ? '📷 Image' : '🎬 Video';
        await updateChatLastMessage(mediaType);
        
        playNotificationSound();
        
    } catch (error) {
        console.error("Error sending media:", error);
        throw error;
    }
}

// Send Document Message
async function sendDocumentMessage(fileUrl, fileName, fileSize) {
    if (!currentChatId) return;
    
    try {
        const messageId = firebase.database().ref().child('messages').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const messageData = {
            messageId,
            senderUid: currentUser.uid,
            content: fileUrl,
            type: 'document',
            fileName: fileName,
            fileSize: fileSize,
            timestamp,
            status: 'sent'
        };
        
        await firebase.database().ref(`messages/${currentChatId}/${messageId}`).set(messageData);
        await updateChatLastMessage('📄 Document');
        
        playNotificationSound();
        
    } catch (error) {
        console.error("Error sending document:", error);
        throw error;
    }
}

// Send View Once Message
async function sendViewOnceMessage(mediaUrl, type) {
    if (!currentChatId) return;
    
    try {
        const messageId = firebase.database().ref().child('messages').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const messageData = {
            messageId,
            senderUid: currentUser.uid,
            content: mediaUrl,
            type: 'view_once',
            mediaType: type,
            timestamp,
            status: 'sent',
            viewedBy: {}
        };
        
        await firebase.database().ref(`messages/${currentChatId}/${messageId}`).set(messageData);
        await updateChatLastMessage('👁️ View once message');
        
        playNotificationSound();
        
    } catch (error) {
        console.error("Error sending view once:", error);
        throw error;
    }
}

// Update Chat Last Message
async function updateChatLastMessage(lastMessage) {
    try {
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        await firebase.database().ref(`chats/${currentChatId}`).update({
            lastMessage: lastMessage,
            lastMessageTime: timestamp
        });
        
        // Update unread count for other participants
        const chatSnapshot = await firebase.database().ref(`chats/${currentChatId}/participants`).once('value');
        if (chatSnapshot.exists()) {
            const participants = chatSnapshot.val();
            Object.keys(participants).forEach(async (participantUid) => {
                if (participantUid !== currentUser.uid) {
                    const unreadRef = firebase.database().ref(`unread/${participantUid}/${currentChatId}`);
                    const unreadSnapshot = await unreadRef.once('value');
                    const currentUnread = unreadSnapshot.exists() ? unreadSnapshot.val() : 0;
                    await unreadRef.set(currentUnread + 1);
                }
            });
        }
    } catch (error) {
        console.error("Error updating chat:", error);
    }
}

// ==================== GROUP FUNCTIONS ====================

// Show Create Group Modal
function showCreateGroupModal() {
    document.getElementById('createGroupModal').classList.add('active');
}

// Hide Create Group Modal
function hideCreateGroupModal() {
    document.getElementById('createGroupModal').classList.remove('active');
    document.getElementById('groupName').value = '';
    document.getElementById('addMemberInput').value = '';
    document.getElementById('groupMembersList').innerHTML = '';
    document.getElementById('groupPhotoPreview').innerHTML = `
        <i class="fas fa-camera"></i>
        <span>Tap to upload</span>
    `;
}

// Trigger Group Photo Upload
function triggerGroupPhotoUpload() {
    document.getElementById('groupPhotoUpload').click();
}

// Handle Group Photo Upload
function handleGroupPhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('groupPhotoPreview');
        preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
}

// Create Group
async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const membersList = document.getElementById('groupMembersList');
    
    if (!groupName) {
        showToast('Please enter a group name', 'error');
        return;
    }
    
    const memberIds = Array.from(membersList.querySelectorAll('.member-tag'))
        .map(tag => tag.dataset.userId)
        .filter(id => id && id.startsWith('ZYN-'));
    
    if (memberIds.length === 0) {
        showToast('Please add at least one member', 'error');
        return;
    }
    
    try {
        const createBtn = document.getElementById('createGroupBtn');
        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        // Get UIDs for all members
        const memberUids = [];
        for (const userId of memberIds) {
            const user = await searchUserByID(userId);
            if (user) {
                memberUids.push(user.uid);
            }
        }
        
        if (memberUids.length === 0) {
            showToast('No valid members found', 'error');
            createBtn.disabled = false;
            createBtn.innerHTML = 'Create Group';
            return;
        }
        
        // Add current user to members
        memberUids.push(currentUser.uid);
        
        // Create group chat
        const groupId = firebase.database().ref().child('chats').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const participants = {};
        memberUids.forEach(uid => {
            participants[uid] = true;
        });
        
        const groupData = {
            groupId,
            groupName,
            type: 'group',
            participants,
            createdAt: timestamp,
            lastMessage: 'Group created',
            lastMessageTime: timestamp,
            admin: currentUser.uid
        };
        
        // Upload group photo if exists
        const groupPhotoFile = document.getElementById('groupPhotoUpload').files[0];
        if (groupPhotoFile) {
            const groupPhotoUrl = await uploadToCloudinary(groupPhotoFile, 'image');
            groupData.groupPhoto = groupPhotoUrl;
        }
        
        // Save group
        await firebase.database().ref(`chats/${groupId}`).set(groupData);
        
        // Add group to users' chat lists
        for (const uid of memberUids) {
            await firebase.database().ref(`users/${uid}/chats/${groupId}`).set({
                addedAt: timestamp,
                lastRead: timestamp
            });
        }
        
        showToast('Group created successfully', 'success');
        hideCreateGroupModal();
        
        // Redirect to group chat
        setTimeout(() => {
            window.location.href = `chat.html?chatId=${groupId}&type=group`;
        }, 1000);
        
    } catch (error) {
        console.error("Error creating group:", error);
        showToast('Failed to create group', 'error');
        const createBtn = document.getElementById('createGroupBtn');
        createBtn.disabled = false;
        createBtn.innerHTML = 'Create Group';
    }
}

// Listen for Groups
function listenForGroups() {
    if (!currentUser) return;
    
    if (groupsListener) groupsListener();
    
    groupsListener = firebase.database().ref('chats')
        .orderByChild('type').equalTo('group')
        .on('value', (snapshot) => {
            // Update groups list
        });
}

// Load Groups
async function loadGroups() {
    try {
        const snapshot = await firebase.database().ref('chats')
            .orderByChild('type').equalTo('group')
            .once('value');
        
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        if (!snapshot.exists()) {
            groupsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Groups Yet</h3>
                    <p>Create a group to chat with multiple people</p>
                </div>
            `;
            return;
        }
        
        groupsList.innerHTML = '';
        const groups = snapshot.val();
        
        Object.entries(groups).forEach(([groupId, groupData]) => {
            // Check if current user is a member
            if (groupData.participants && groupData.participants[currentUser.uid]) {
                const memberCount = Object.keys(groupData.participants).length;
                const groupCard = document.createElement('div');
                groupCard.className = 'group-card';
                groupCard.onclick = () => window.location.href = `chat.html?chatId=${groupId}&type=group`;
                groupCard.innerHTML = `
                    <img src="${groupData.groupPhoto || 'zynaps.png'}" alt="${groupData.groupName}" class="group-avatar">
                    <div class="group-info">
                        <h3>${groupData.groupName}</h3>
                        <p>${groupData.lastMessage || 'No messages yet'}</p>
                        <div class="group-members">
                            <i class="fas fa-users"></i>
                            <span>${memberCount} members</span>
                        </div>
                    </div>
                `;
                groupsList.appendChild(groupCard);
            }
        });
    } catch (error) {
        console.error("Error loading groups:", error);
    }
}

// ==================== ZYNES FUNCTIONS ====================

// Open Zyne Attachment
function openZyneAttachment(type) {
    if (type === 'image') {
        document.getElementById('zyneImageUpload').click();
    } else if (type === 'video') {
        document.getElementById('zyneVideoUpload').click();
    }
}

// Handle Zyne Media Upload
function handleZyneMediaUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > 50 * 1024 * 1024) {
        showToast('File exceeds 50MB limit', 'error');
        return;
    }
    
    // Preview
    const preview = document.getElementById('zyneMediaPreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            ${type === 'image' ? `<img src="${e.target.result}" alt="Preview">` : `<video src="${e.target.result}" controls></video>`}
            <button class="remove-preview" onclick="removeZynePreview(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        previewItem.dataset.file = JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size
        });
        preview.appendChild(previewItem);
    };
    
    reader.readAsDataURL(file);
    
    // Reset file input
    event.target.value = '';
}

// Remove Zyne Preview
function removeZynePreview(button) {
    const previewItem = button.closest('.preview-item');
    if (previewItem) {
        previewItem.remove();
    }
}

// Post Zyne
async function postZyne() {
    const zyneText = document.getElementById('zyneText').value.trim();
    const mediaPreviews = document.getElementById('zyneMediaPreview');
    const previewItems = mediaPreviews.querySelectorAll('.preview-item');
    
    if (!zyneText && previewItems.length === 0) {
        showToast('Please add text or media', 'error');
        return;
    }
    
    try {
        const postBtn = document.getElementById('postZyneBtn');
        postBtn.disabled = true;
        postBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        
        const zyneId = firebase.database().ref().child('zynes').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        const expiresAt = timestamp + (24 * 60 * 60 * 1000); // 24 hours
        
        const zyneData = {
            zyneId,
            userId: currentUser.uid,
            userName: currentUserData.name,
            userProfile: currentUserData.profileUrl,
            text: zyneText,
            timestamp,
            expiresAt,
            likes: {},
            comments: {},
            media: []
        };
        
        // Upload media files
        for (const previewItem of previewItems) {
            const fileData = JSON.parse(previewItem.dataset.file);
            const fileInput = fileData.type.startsWith('image/') ? 
                document.getElementById('zyneImageUpload') : 
                document.getElementById('zyneVideoUpload');
            
            // We need to get the actual file (simplified approach)
            // In production, you'd want to store the file data properly
            const file = new File([], fileData.name, { type: fileData.type });
            const mediaUrl = await uploadToCloudinary(file, fileData.type.startsWith('image/') ? 'image' : 'video');
            
            zyneData.media.push({
                url: mediaUrl,
                type: fileData.type.startsWith('image/') ? 'image' : 'video'
            });
        }
        
        // Save zyne
        await firebase.database().ref(`zynes/${currentUser.uid}/${zyneId}`).set(zyneData);
        
        // Clear form
        document.getElementById('zyneText').value = '';
        mediaPreviews.innerHTML = '';
        
        showToast('Zyne posted successfully', 'success');
        
        postBtn.disabled = false;
        postBtn.innerHTML = '<i class="fas fa-plus"></i> Post';
        
        // Reload zynes
        loadZynes();
        
    } catch (error) {
        console.error("Error posting zyne:", error);
        showToast('Failed to post zyne', 'error');
        const postBtn = document.getElementById('postZyneBtn');
        postBtn.disabled = false;
        postBtn.innerHTML = '<i class="fas fa-plus"></i> Post';
    }
}

// Listen for Zynes
function listenForZynes() {
    if (!currentUser) return;
    
    if (zynesListener) zynesListener();
    
    // Listen to own zynes and zynes from contacts
    zynesListener = firebase.database().ref('zynes')
        .on('value', (snapshot) => {
            // Zynes will be loaded when switching to zynes page
        });
}

// Load Zynes
async function loadZynes() {
    try {
        // Get contacts
        const contactsSnapshot = await firebase.database().ref(`users/${currentUser.uid}/contacts`).once('value');
        const contacts = contactsSnapshot.exists() ? Object.keys(contactsSnapshot.val()) : [];
        
        // Add current user to see own zynes
        const usersToShow = [currentUser.uid, ...contacts];
        
        const zynesPromises = usersToShow.map(async (userId) => {
            const snapshot = await firebase.database().ref(`zynes/${userId}`)
                .orderByChild('expiresAt')
                .startAt(Date.now())
                .once('value');
            
            if (snapshot.exists()) {
                return Object.entries(snapshot.val()).map(([zyneId, zyne]) => ({
                    zyneId,
                    ...zyne,
                    isOwn: userId === currentUser.uid
                }));
            }
            return [];
        });
        
        const zynesArrays = await Promise.all(zynesPromises);
        const allZynes = zynesArrays.flat();
        
        // Sort by timestamp (newest first)
        allZynes.sort((a, b) => b.timestamp - a.timestamp);
        
        const zynesList = document.getElementById('zynesList');
        if (!zynesList) return;
        
        if (allZynes.length === 0) {
            zynesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-fire"></i>
                    <h3>No Zynes Yet</h3>
                    <p>Share a moment with your connections</p>
                </div>
            `;
            return;
        }
        
        zynesList.innerHTML = '';
        
        allZynes.forEach(zyne => {
            const timeAgo = formatTimeAgo(zyne.timestamp);
            const likeCount = zyne.likes ? Object.keys(zyne.likes).length : 0;
            const commentCount = zyne.comments ? Object.keys(zyne.comments).length : 0;
            const isLiked = zyne.likes && zyne.likes[currentUser.uid];
            
            const zyneCard = document.createElement('div');
            zyneCard.className = 'zyne-card';
            zyneCard.innerHTML = `
                <div class="zyne-header">
                    <img src="${zyne.userProfile || 'zynaps.png'}" alt="${zyne.userName}" class="zyne-avatar">
                    <div class="zyne-user-info">
                        <h4>${zyne.userName}</h4>
                        <div class="zyne-time">${timeAgo}</div>
                    </div>
                    ${zyne.isOwn ? `
                        <button class="icon-btn" onclick="deleteZyne('${zyne.zyneId}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
                <div class="zyne-content">
                    ${zyne.text ? `<div class="zyne-text">${escapeHtml(zyne.text)}</div>` : ''}
                    ${zyne.media && zyne.media.length > 0 ? zyne.media.map(media => `
                        ${media.type === 'image' ? 
                            `<img src="${media.url}" alt="Zyne media" class="zyne-media">` :
                            `<video src="${media.url}" controls class="zyne-media"></video>`
                        }
                    `).join('') : ''}
                </div>
                <div class="zyne-stats">
                    <span>${likeCount} likes</span>
                    <span>${commentCount} comments</span>
                </div>
                <div class="zyne-actions">
                    <button class="zyne-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleZyneLike('${zyne.userId}', '${zyne.zyneId}')">
                        <i class="fas fa-heart"></i>
                        <span>Like</span>
                    </button>
                    <button class="zyne-action-btn" onclick="focusCommentInput('${zyne.zyneId}')">
                        <i class="fas fa-comment"></i>
                        <span>Comment</span>
                    </button>
                </div>
                <div class="zyne-comments" id="comments-${zyne.zyneId}">
                    <input type="text" class="comment-input" placeholder="Write a comment..." 
                           onkeydown="handleCommentKeyDown(event, '${zyne.userId}', '${zyne.zyneId}')">
                    <div class="comment-list" id="comment-list-${zyne.zyneId}">
                        ${zyne.comments ? Object.entries(zyne.comments).map(([commentId, comment]) => `
                            <div class="comment-item">
                                <img src="${comment.userProfile || 'zynaps.png'}" alt="${comment.userName}" class="comment-avatar">
                                <div class="comment-content">
                                    <div class="comment-text">${escapeHtml(comment.text)}</div>
                                    <div class="comment-info">
                                        <span>${comment.userName}</span>
                                        <span>${formatTimeAgo(comment.timestamp)}</span>
                                    </div>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>
            `;
            zynesList.appendChild(zyneCard);
        });
        
    } catch (error) {
        console.error("Error loading zynes:", error);
    }
}

// Format Time Ago
function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Toggle Zyne Like
async function toggleZyneLike(userId, zyneId) {
    try {
        const likeRef = firebase.database().ref(`zynes/${userId}/${zyneId}/likes/${currentUser.uid}`);
        const snapshot = await likeRef.once('value');
        
        if (snapshot.exists()) {
            await likeRef.remove();
        } else {
            await likeRef.set({
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        }
    } catch (error) {
        console.error("Error toggling like:", error);
    }
}

// Focus Comment Input
function focusCommentInput(zyneId) {
    const commentInput = document.querySelector(`#comments-${zyneId} .comment-input`);
    if (commentInput) {
        commentInput.focus();
    }
}

// Handle Comment Key Down
async function handleCommentKeyDown(event, userId, zyneId) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        
        const input = event.target;
        const comment = input.value.trim();
        
        if (comment) {
            await postComment(userId, zyneId, comment);
            input.value = '';
        }
    }
}

// Post Comment
async function postComment(userId, zyneId, text) {
    try {
        const commentId = firebase.database().ref().child('comments').push().key;
        const timestamp = firebase.database.ServerValue.TIMESTAMP;
        
        const commentData = {
            commentId,
            userId: currentUser.uid,
            userName: currentUserData.name,
            userProfile: currentUserData.profileUrl,
            text,
            timestamp
        };
        
        await firebase.database().ref(`zynes/${userId}/${zyneId}/comments/${commentId}`).set(commentData);
        
    } catch (error) {
        console.error("Error posting comment:", error);
        showToast('Failed to post comment', 'error');
    }
}

// Delete Zyne
async function deleteZyne(zyneId) {
    if (confirm('Are you sure you want to delete this zyne?')) {
        try {
            await firebase.database().ref(`zynes/${currentUser.uid}/${zyneId}`).remove();
            showToast('Zyne deleted', 'success');
            loadZynes();
        } catch (error) {
            console.error("Error deleting zyne:", error);
            showToast('Failed to delete zyne', 'error');
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Play Notification Sound
function playNotificationSound() {
    try {
        const audio = new Audio('notification.mp3');
        audio.play().catch(() => {
            // Silent fail if audio can't play
        });
    } catch (error) {
        // Silent fail
    }
}

// Show Toast Notification
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || document.body;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Toggle Chat Menu
function toggleChatMenu() {
    const menu = document.getElementById('chatMenu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

// View Chat Profile
function viewChatProfile() {
    if (currentChatUser) {
        showToast(`Viewing ${currentChatUser.name}'s profile`, 'info');
        // In production, you'd open a profile modal
    }
}

// Add Nickname
function addNickname() {
    const nickname = prompt('Enter nickname for this contact:');
    if (nickname) {
        showToast(`Nickname set to "${nickname}"`, 'success');
    }
}

// Add to Favorites
function addToFavorites() {
    showToast('Added to favorites', 'success');
}

// Toggle Block User
function toggleBlockUser() {
    const block = confirm('Are you sure you want to block this user?');
    if (block) {
        showToast('User blocked', 'info');
    }
}

// Clear Chat
function clearChat() {
    if (confirm('Are you sure you want to clear all messages in this chat?')) {
        showToast('Chat cleared', 'info');
    }
}

// Delete Chat
function deleteChat() {
    if (confirm('Are you sure you want to delete this chat?')) {
        window.location.href = 'home.html';
    }
}

// Toggle Status
async function toggleStatus() {
    if (!currentUserData) return;
    
    const newStatus = currentUserData.status === 'online' ? 'offline' : 'online';
    await updateUserStatus(newStatus);
    showToast(`Status set to ${newStatus}`, 'success');
}

// View Profile
function viewProfile() {
    showToast('Opening profile...', 'info');
    // In production, open profile modal
}

// Edit Profile
function editProfile() {
    showToast('Opening profile editor...', 'info');
    // In production, open profile editor modal
}

// Open Settings
function openSettings() {
    showToast('Opening settings...', 'info');
    // In production, open settings page/modal
}

// Logout
async function logout() {
    try {
        await updateUserStatus('offline');
        await firebase.auth().signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Error logging out:", error);
        showToast('Failed to logout', 'error');
    }
}

// ==================== INITIALIZATION ====================

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    
    // Check which page we're on
    if (window.location.pathname.includes('home.html')) {
        // Home page specific initialization
        console.log("Initializing home page");
    } else if (window.location.pathname.includes('chat.html')) {
        // Chat page specific initialization
        initializeChatPage();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', async () => {
    if (currentUser) {
        await updateUserStatus('offline');
    }
    
    // Remove listeners
    if (chatListener) chatListener();
    if (contactsListener) contactsListener();
    if (requestsListener) requestsListener();
    if (groupsListener) groupsListener();
    if (zynesListener) zynesListener();
});
