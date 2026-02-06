// Global variables
let currentUser = null;
let userData = null;

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    // Check which page we're on
    if (document.querySelector('.signup-page')) {
        initializeSignupPage();
    } else if (document.querySelector('.app-page')) {
        initializeHomePage();
    } else if (document.querySelector('.chat-page')) {
        initializeChatPage();
    }
}

// Sign Up Page Functions
function initializeSignupPage() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const profilePic = document.getElementById('profilePic').files[0];
    
    // Show loading state
    const registerBtn = document.getElementById('registerBtn');
    const originalText = registerBtn.innerHTML;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
    registerBtn.disabled = true;
    
    try {
        // Create Firebase auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate user ID
        const userId = generateUserId();
        
        // Upload profile picture if exists
        let profilePicUrl = '';
        if (profilePic) {
            const uploadResult = await uploadFile(profilePic, `profile_${userId}.jpg`);
            profilePicUrl = uploadResult.url;
        }
        
        // Save user data to database
        await database.ref('users/' + user.uid).set({
            name: name,
            phone: phone,
            email: email,
            userId: userId,
            profilePic: profilePicUrl,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            status: 'online'
        });
        
        // Show success message
        alert('Account created successfully! Your User ID is: ' + userId);
        
        // Auto login
        await auth.signInWithEmailAndPassword(email, password);
        
    } catch (error) {
        console.error('Signup error:', error);
        alert('Error: ' + error.message);
        registerBtn.innerHTML = originalText;
        registerBtn.disabled = false;
    }
}

function generateUserId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNum}`;
}

// Home Page Functions
function initializeHomePage() {
    // Set up event listeners
    setupNavigation();
    setupUserInfo();
    setupChatButton();
    setupModals();
    loadChatRequests();
    loadContacts();
    
    // Listen for chat requests
    listenForChatRequests();
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));
            
            // Add active class to clicked
            this.classList.add('active');
            const viewId = this.getAttribute('data-view') + 'View';
            document.getElementById(viewId).classList.add('active');
        });
    });
}

async function setupUserInfo() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Get user data from database
    const userRef = database.ref('users/' + user.uid);
    userRef.on('value', (snapshot) => {
        userData = snapshot.val();
        if (userData) {
            // Update UI
            document.getElementById('userName').textContent = userData.name;
            document.getElementById('mainUserName').textContent = userData.name;
            document.getElementById('userIdDisplay').textContent = userData.userId;
            document.getElementById('mainUserId').textContent = userData.userId;
            
            if (userData.profilePic) {
                document.getElementById('userProfilePic').src = userData.profilePic;
            }
        }
    });
}

function setupChatButton() {
    const floatingBtn = document.getElementById('floatingChatBtn');
    const modal = document.getElementById('startChatModal');
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = document.getElementById('cancelSearch');
    
    floatingBtn.addEventListener('click', function() {
        modal.classList.add('active');
    });
    
    function closeModal() {
        modal.classList.remove('active');
    }
    
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // Send request button
    const sendRequestBtn = document.getElementById('sendRequestBtn');
    const searchInput = document.getElementById('searchUserId');
    
    sendRequestBtn.addEventListener('click', async function() {
        const userId = searchInput.value.trim();
        if (!userId || !userId.startsWith('ZYN-')) {
            alert('Please enter a valid User ID (format: ZYN-XXXX)');
            return;
        }
        
        await sendChatRequest(userId);
        closeModal();
    });
}

async function sendChatRequest(receiverUserId) {
    const user = auth.currentUser;
    if (!user || !userData) return;
    
    try {
        // Find receiver by userId
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('userId').equalTo(receiverUserId).once('value');
        
        if (!snapshot.exists()) {
            alert('User not found');
            return;
        }
        
        const receiverData = Object.values(snapshot.val())[0];
        const receiverId = Object.keys(snapshot.val())[0];
        
        // Create chat request
        const requestId = database.ref().child('chatRequests').push().key;
        
        await database.ref('chatRequests/' + requestId).set({
            fromUserId: user.uid,
            fromUserName: userData.name,
            fromUserProfile: userData.profilePic || '',
            fromUserPhone: userData.phone,
            toUserId: receiverId,
            toUserName: receiverData.name,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            requestId: requestId
        });
        
        alert('Chat request sent to ' + receiverData.name);
        
    } catch (error) {
        console.error('Error sending chat request:', error);
        alert('Error sending request: ' + error.message);
    }
}

function listenForChatRequests() {
    const user = auth.currentUser;
    if (!user) return;
    
    const requestsRef = database.ref('chatRequests').orderByChild('toUserId').equalTo(user.uid);
    
    requestsRef.on('value', (snapshot) => {
        const requests = [];
        snapshot.forEach((childSnapshot) => {
            const request = childSnapshot.val();
            if (request.status === 'pending') {
                requests.push(request);
            }
        });
        
        updateRequestBadge(requests.length);
        displayChatRequests(requests);
    });
}

function updateRequestBadge(count) {
    const badge = document.getElementById('requestBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'block' : 'none';
    }
}

function displayChatRequests(requests) {
    const container = document.getElementById('requestsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No pending requests</p>';
        return;
    }
    
    requests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'request-item';
        requestElement.innerHTML = `
            <div class="request-info">
                <img src="${request.fromUserProfile || 'default-avatar.png'}" alt="${request.fromUserName}">
                <div>
                    <h4>${request.fromUserName}</h4>
                    <p>${request.fromUserPhone}</p>
                </div>
            </div>
            <div class="request-actions">
                <button class="btn-primary small accept-btn" data-request-id="${request.requestId}">
                    Accept
                </button>
                <button class="btn-secondary small reject-btn" data-request-id="${request.requestId}">
                    Reject
                </button>
            </div>
        `;
        container.appendChild(requestElement);
    });
    
    // Add event listeners
    document.querySelectorAll('.accept-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            handleChatRequest(this.dataset.requestId, 'accepted');
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            handleChatRequest(this.dataset.requestId, 'rejected');
        });
    });
}

async function handleChatRequest(requestId, action) {
    try {
        await database.ref('chatRequests/' + requestId).update({
            status: action,
            respondedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        if (action === 'accepted') {
            const requestRef = database.ref('chatRequests/' + requestId);
            requestRef.once('value').then(async (snapshot) => {
                const request = snapshot.val();
                
                // Create chat room
                const chatId = [auth.currentUser.uid, request.fromUserId].sort().join('_');
                
                await database.ref('chats/' + chatId).set({
                    participants: {
                        [auth.currentUser.uid]: true,
                        [request.fromUserId]: true
                    },
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    lastMessage: '',
                    lastMessageTime: firebase.database.ServerValue.TIMESTAMP
                });
                
                // Navigate to chat
                window.location.href = `chat.html?chatId=${chatId}`;
            });
        }
    } catch (error) {
        console.error('Error handling chat request:', error);
    }
}

function copyUserId() {
    const userId = document.getElementById('mainUserId').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        // Show copied message
        const btn = event.target.closest('.copy-btn');
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        }
    });
}

// Chat Page Functions
function initializeChatPage() {
    setupChatUI();
    loadMessages();
    setupMessageInput();
}

function setupChatUI() {
    // Get chat ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    
    if (!chatId) {
        window.location.href = 'home.html';
        return;
    }
    
    // Load chat info
    loadChatInfo(chatId);
    
    // Setup attachment menu
    const attachBtn = document.getElementById('attachBtn');
    const attachmentMenu = document.getElementById('attachmentMenu');
    
    attachBtn.addEventListener('click', function() {
        attachmentMenu.classList.toggle('active');
    });
    
    // Close attachment menu when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (!attachBtn.contains(e.target) && !attachmentMenu.contains(e.target)) {
            attachmentMenu.classList.remove('active');
        }
    });
}

async function loadChatInfo(chatId) {
    const chatRef = database.ref('chats/' + chatId);
    const snapshot = await chatRef.once('value');
    const chatData = snapshot.val();
    
    if (!chatData) return;
    
    // Get other participant's ID
    const participants = Object.keys(chatData.participants);
    const otherUserId = participants.find(id => id !== auth.currentUser.uid);
    
    // Load other user's info
    const userRef = database.ref('users/' + otherUserId);
    userRef.on('value', (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            document.getElementById('chatUserName').textContent = userData.name;
            if (userData.profilePic) {
                document.getElementById('chatUserImage').src = userData.profilePic;
            }
        }
    });
    
    // Listen for new messages
    database.ref('messages/' + chatId).on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

function displayMessage(message) {
    const container = document.getElementById('messagesContainer');
    const isSender = message.senderId === auth.currentUser.uid;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSender ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-content">${message.text}</div>
        <div class="message-time">${time}</div>
    `;
    
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
    
    // Play notification sound for received messages
    if (!isSender) {
        playNotificationSound();
    }
}

function setupMessageInput() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    
    function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        
        // Get chat ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get('chatId');
        
        if (!chatId) return;
        
        const messageId = database.ref().child('messages').child(chatId).push().key;
        
        database.ref('messages/' + chatId + '/' + messageId).set({
            text: text,
            senderId: auth.currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            messageId: messageId
        }).then(() => {
            messageInput.value = '';
            
            // Update chat last message
            database.ref('chats/' + chatId).update({
                lastMessage: text,
                lastMessageTime: firebase.database.ServerValue.TIMESTAMP
            });
        });
    }
    
    sendBtn.addEventListener('click', sendMessage);
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function playNotificationSound() {
    const audio = document.getElementById('notificationSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play failed:", e));
    }
}

function goBack() {
    window.location.href = 'home.html';
}

// Utility Functions
async function loadContacts() {
    const user = auth.currentUser;
    if (!user) return;
    
    const contactsRef = database.ref('contacts/' + user.uid);
    contactsRef.on('value', (snapshot) => {
        const contacts = snapshot.val() || {};
        displayContacts(Object.values(contacts));
    });
}

function displayContacts(contacts) {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (contacts.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No contacts yet</p>';
        return;
    }
    
    contacts.forEach(contact => {
        const contactElement = document.createElement('div');
        contactElement.className = 'contact-item';
        contactElement.innerHTML = `
            <img src="${contact.profilePic || 'default-avatar.png'}" alt="${contact.name}">
            <div>
                <h4>${contact.name}</h4>
                <p>${contact.userId}</p>
            </div>
            <button class="icon-btn" onclick="startChatWithContact('${contact.userId}')">
                <i class="fas fa-comment"></i>
            </button>
        `;
        container.appendChild(contactElement);
    });
}

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}

// Make logout function globally available
window.logout = logout;
window.copyUserId = copyUserId;
window.goBack = goBack;
