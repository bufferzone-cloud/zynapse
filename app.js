import { auth, database, storage } from './firebase-config.js';
import { uploadMedia } from './imagekit-config.js';

// Global variables
let currentUser = null;
let userData = null;
let chatRooms = new Map();
let activeChat = null;
let chatListeners = new Map();

// Toast notification function
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || document.createElement('div');
    if (!toastContainer.id) {
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Play notification sound
function playNotificationSound() {
    try {
        const audio = new Audio('notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Generate ZYN-XXXX user ID
function generateUserId() {
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNumbers}`;
}

// Check if user ID already exists
async function checkUserIdExists(userId) {
    try {
        const snapshot = await database.ref(`users/${userId}`).once('value');
        return snapshot.exists();
    } catch (error) {
        console.error('Error checking user ID:', error);
        return false;
    }
}

// Generate unique user ID
async function generateUniqueUserId() {
    let userId;
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 10) {
        userId = generateUserId();
        exists = await checkUserIdExists(userId);
        attempts++;
    }
    
    if (exists) {
        // Fallback to timestamp-based ID
        userId = `ZYN-${Date.now().toString().slice(-4)}`;
    }
    
    return userId;
}

// Update user status
function updateUserStatus(status = 'online') {
    if (!currentUser || !userData) return;
    
    const updates = {
        status: status,
        lastSeen: status === 'offline' ? Date.now() : null
    };
    
    database.ref(`users/${userData.userId}`).update(updates).catch(console.error);
}

// Initialize Firebase auth state listener
function initAuth() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            
            // Update user status to online
            updateUserStatus('online');
            
            // Redirect to home page if not already there
            if (!window.location.pathname.includes('home.html')) {
                window.location.href = 'home.html';
            }
        } else {
            currentUser = null;
            userData = null;
            
            // Redirect to index if not already there and not on auth pages
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.includes('home.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Load user data from database
async function loadUserData(firebaseUid) {
    try {
        // First, find the user by Firebase UID
        const usersSnapshot = await database.ref('users').orderByChild('firebaseUid').equalTo(firebaseUid).once('value');
        
        if (usersSnapshot.exists()) {
            const users = usersSnapshot.val();
            const userId = Object.keys(users)[0];
            userData = users[userId];
            userData.userId = userId;
            
            // Update last login time
            await database.ref(`users/${userId}`).update({
                lastLogin: Date.now()
            });
            
            return userData;
        }
        
        throw new Error('User data not found');
    } catch (error) {
        console.error('Error loading user data:', error);
        showToast('Error loading user data', 'error');
        await auth.signOut();
        return null;
    }
}

// Handle login
async function handleLogin(email, password) {
    try {
        showLoading('loginSpinner', true);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        showToast('Login successful!', 'success');
        
        // Wait a moment for auth state to update
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
        
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login failed';
        
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Account has been disabled';
                break;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        showLoading('loginSpinner', false);
    }
}

// Handle signup
async function handleSignup(name, phone, email, password, profileImage) {
    try {
        showLoading('signupSpinner', true);
        
        // Check if passwords match
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        // Create Firebase auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate unique Zynapse user ID
        const userId = await generateUniqueUserId();
        
        // Handle profile image upload if exists
        let profilePicUrl = '';
        if (profileImage && profileImage.files[0]) {
            try {
                const uploadResult = await uploadMedia(
                    profileImage.files[0],
                    `profile_${userId}.jpg`,
                    ['profile', userId]
                );
                profilePicUrl = uploadResult.url;
            } catch (uploadError) {
                console.error('Profile upload failed:', uploadError);
                // Continue without profile picture
            }
        }
        
        // Create user data in database
        const userData = {
            firebaseUid: user.uid,
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            userId: userId,
            profilePicUrl: profilePicUrl,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            status: 'online',
            contacts: {},
            chatRequests: {},
            groups: {},
            zynes: {},
            settings: {
                notifications: true,
                sound: true,
                theme: 'light'
            }
        };
        
        await database.ref(`users/${userId}`).set(userData);
        
        // Update Firebase user display name
        await user.updateProfile({
            displayName: name
        });
        
        showToast('Account created successfully! Your User ID: ' + userId, 'success');
        
        // Auto login
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        let errorMessage = 'Signup failed';
        
        switch (error.code || error.message) {
            case 'auth/email-already-in-use':
                errorMessage = 'Email already in use';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password should be at least 6 characters';
                break;
            case 'Passwords do not match':
                errorMessage = 'Passwords do not match';
                break;
        }
        
        showToast(errorMessage, 'error');
    } finally {
        showLoading('signupSpinner', false);
    }
}

// Handle password reset
async function handlePasswordReset(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        showToast('Password reset email sent!', 'success');
        document.getElementById('forgotPasswordModal').classList.remove('active');
    } catch (error) {
        console.error('Password reset error:', error);
        showToast('Error sending reset email', 'error');
    }
}

// Show/hide loading spinner
function showLoading(spinnerId, show) {
    const spinner = document.getElementById(spinnerId);
    const parentBtn = spinner.closest('button');
    
    if (show) {
        spinner.style.display = 'block';
        parentBtn.disabled = true;
        parentBtn.querySelector('span').style.opacity = '0.5';
    } else {
        spinner.style.display = 'none';
        parentBtn.disabled = false;
        parentBtn.querySelector('span').style.opacity = '1';
    }
}

// Load contacts for current user
async function loadContacts() {
    if (!userData) return [];
    
    try {
        const contacts = userData.contacts || {};
        const contactIds = Object.keys(contacts);
        
        if (contactIds.length === 0) return [];
        
        // Fetch contact details in parallel
        const contactPromises = contactIds.map(async (contactId) => {
            const snapshot = await database.ref(`users/${contactId}`).once('value');
            if (snapshot.exists()) {
                const contactData = snapshot.val();
                return {
                    userId: contactId,
                    name: contactData.name,
                    profilePicUrl: contactData.profilePicUrl,
                    status: contactData.status || 'offline',
                    lastSeen: contactData.lastSeen || null
                };
            }
            return null;
        });
        
        const contactsList = await Promise.all(contactPromises);
        return contactsList.filter(contact => contact !== null);
        
    } catch (error) {
        console.error('Error loading contacts:', error);
        return [];
    }
}

// Load chat requests
async function loadChatRequests() {
    if (!userData) return [];
    
    try {
        const requests = userData.chatRequests || {};
        const requestList = [];
        
        for (const requestId in requests) {
            const request = requests[requestId];
            if (request.status === 'pending') {
                const senderSnapshot = await database.ref(`users/${request.from}`).once('value');
                if (senderSnapshot.exists()) {
                    const senderData = senderSnapshot.val();
                    requestList.push({
                        requestId: requestId,
                        from: request.from,
                        name: senderData.name,
                        profilePicUrl: senderData.profilePicUrl,
                        timestamp: request.timestamp
                    });
                }
            }
        }
        
        return requestList;
        
    } catch (error) {
        console.error('Error loading chat requests:', error);
        return [];
    }
}

// Send chat request
async function sendChatRequest(recipientId) {
    if (!userData || !currentUser) {
        showToast('You must be logged in to send chat requests', 'error');
        return;
    }
    
    if (recipientId === userData.userId) {
        showToast('You cannot send a chat request to yourself', 'error');
        return;
    }
    
    try {
        // Check if recipient exists
        const recipientSnapshot = await database.ref(`users/${recipientId}`).once('value');
        if (!recipientSnapshot.exists()) {
            showToast('User not found', 'error');
            return;
        }
        
        const recipientData = recipientSnapshot.val();
        
        // Check if already in contacts
        if (userData.contacts && userData.contacts[recipientId]) {
            showToast('User is already in your contacts', 'info');
            return;
        }
        
        // Check if request already sent
        const existingRequests = recipientData.chatRequests || {};
        const existingRequest = Object.values(existingRequests).find(
            req => req.from === userData.userId && req.status === 'pending'
        );
        
        if (existingRequest) {
            showToast('Chat request already sent', 'info');
            return;
        }
        
        // Create chat request
        const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const requestData = {
            from: userData.userId,
            to: recipientId,
            status: 'pending',
            timestamp: Date.now()
        };
        
        // Add to recipient's chat requests
        await database.ref(`users/${recipientId}/chatRequests/${requestId}`).set(requestData);
        
        showToast(`Chat request sent to ${recipientData.name}`, 'success');
        
    } catch (error) {
        console.error('Error sending chat request:', error);
        showToast('Failed to send chat request', 'error');
    }
}

// Handle chat request response
async function handleChatRequest(requestId, action) {
    if (!userData) return;
    
    try {
        // Get request details
        const requestRef = database.ref(`users/${userData.userId}/chatRequests/${requestId}`);
        const requestSnapshot = await requestRef.once('value');
        
        if (!requestSnapshot.exists()) {
            showToast('Chat request not found', 'error');
            return;
        }
        
        const request = requestSnapshot.val();
        
        if (action === 'accept') {
            // Add to contacts both ways
            const updates = {};
            
            // Add sender to user's contacts
            updates[`users/${userData.userId}/contacts/${request.from}`] = {
                addedAt: Date.now(),
                chatId: `CHAT_${[userData.userId, request.from].sort().join('_')}`
            };
            
            // Add user to sender's contacts
            updates[`users/${request.from}/contacts/${userData.userId}`] = {
                addedAt: Date.now(),
                chatId: `CHAT_${[userData.userId, request.from].sort().join('_')}`
            };
            
            // Create chat room
            const chatId = `CHAT_${[userData.userId, request.from].sort().join('_')}`;
            updates[`chats/${chatId}`] = {
                participants: [userData.userId, request.from].sort(),
                created: Date.now(),
                lastMessage: null,
                lastMessageTime: null
            };
            
            // Update request status
            updates[`users/${userData.userId}/chatRequests/${requestId}/status`] = 'accepted';
            updates[`users/${request.from}/chatRequests/${requestId}/status`] = 'accepted';
            
            await database.ref().update(updates);
            
            showToast('Contact added successfully', 'success');
            
        } else if (action === 'reject') {
            // Update request status to rejected
            const updates = {};
            updates[`users/${userData.userId}/chatRequests/${requestId}/status`] = 'rejected';
            updates[`users/${request.from}/chatRequests/${requestId}/status`] = 'rejected';
            
            await database.ref().update(updates);
            
            showToast('Chat request rejected', 'info');
        }
        
        // Refresh requests list
        if (window.loadRequestsList) {
            window.loadRequestsList();
        }
        
    } catch (error) {
        console.error('Error handling chat request:', error);
        showToast('Failed to process request', 'error');
    }
}

// Send message
async function sendMessage(chatId, messageText, mediaUrl = null, mediaType = null) {
    if (!userData || !messageText.trim() && !mediaUrl) return;
    
    try {
        const messageId = `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const messageData = {
            id: messageId,
            sender: userData.userId,
            text: messageText || '',
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: Date.now(),
            read: false
        };
        
        // Add message to chat
        await database.ref(`chats/${chatId}/messages/${messageId}`).set(messageData);
        
        // Update chat last message
        await database.ref(`chats/${chatId}`).update({
            lastMessage: messageText || (mediaType === 'image' ? '📷 Image' : '🎥 Video'),
            lastMessageTime: Date.now(),
            lastSender: userData.userId
        });
        
        return messageId;
        
    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
        return null;
    }
}

// Listen to chat messages
function listenToChat(chatId, callback) {
    if (chatListeners.has(chatId)) {
        // Already listening
        return;
    }
    
    const messagesRef = database.ref(`chats/${chatId}/messages`);
    const listener = messagesRef.orderByChild('timestamp').limitToLast(100);
    
    const handleSnapshot = (snapshot) => {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        callback(messages);
    };
    
    listener.on('value', handleSnapshot);
    
    // Store listener for cleanup
    chatListeners.set(chatId, {
        ref: messagesRef,
        handler: handleSnapshot
    });
}

// Stop listening to chat
function stopListeningToChat(chatId) {
    if (chatListeners.has(chatId)) {
        const listener = chatListeners.get(chatId);
        listener.ref.off('value', listener.handler);
        chatListeners.delete(chatId);
    }
}

// Upload chat media
async function uploadChatMedia(file) {
    try {
        const fileType = file.type.startsWith('image') ? 'image' : 'video';
        const fileName = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileType === 'image' ? 'jpg' : 'mp4'}`;
        
        const uploadResult = await uploadMedia(file, fileName, ['chat', fileType]);
        
        return {
            url: uploadResult.url,
            type: fileType
        };
        
    } catch (error) {
        console.error('Error uploading chat media:', error);
        throw error;
    }
}

// Logout function
async function logout() {
    try {
        // Update status to offline
        if (userData) {
            await database.ref(`users/${userData.userId}`).update({
                status: 'offline',
                lastSeen: Date.now()
            });
        }
        
        // Stop all listeners
        chatListeners.forEach((listener, chatId) => {
            stopListeningToChat(chatId);
        });
        
        // Sign out from Firebase
        await auth.signOut();
        
        // Redirect to index
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// Format timestamp
function formatTime(timestamp) {
    if (!timestamp) return '';
    
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

// Format message timestamp
function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Initialize app based on page
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase auth
    initAuth();
    
    // Page-specific initializations
    if (window.location.pathname.includes('index.html')) {
        // Already handled in index.html inline script
    } else if (window.location.pathname.includes('home.html')) {
        initHomePage();
    } else if (window.location.pathname.includes('chat.html')) {
        initChatPage();
    }
});

// Export functions for use in HTML files
window.showToast = showToast;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handlePasswordReset = handlePasswordReset;
window.sendChatRequest = sendChatRequest;
window.handleChatRequest = handleChatRequest;
window.logout = logout;
window.formatTime = formatTime;
window.formatMessageTime = formatMessageTime;
window.playNotificationSound = playNotificationSound;

// Note: initHomePage and initChatPage functions would be in separate HTML files
// due to the multi-page nature of the application
