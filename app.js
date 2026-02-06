// Main application JavaScript
import { 
    auth, 
    database, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    ref, 
    set, 
    get, 
    push, 
    child, 
    update, 
    onValue, 
    remove, 
    query, 
    orderByChild, 
    equalTo,
    serverTimestamp 
} from './firebase-config.js';

import { initImageKit, uploadToImageKit, getImageKitUrl } from './imagekit-config.js';

// Initialize ImageKit
initImageKit();

// DOM Elements
let currentUser = null;
let currentUserId = null;
let currentUserData = null;
let chatRequestsListener = null;
let contactsListener = null;
let activeChatId = null;
let activeChatListener = null;

// Notification sound
const notificationSound = new Audio('./notification.mp3');

// Toast notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Generate ZYN user ID
function generateZynId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNum}`;
}

// Copy to clipboard
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
    }).catch(err => {
        showToast('Failed to copy', 'error');
    });
}

// Format timestamp
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
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

// Load profile image
function loadProfileImage(imageUrl, elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        if (imageUrl) {
            element.src = imageUrl;
            element.onerror = () => {
                element.src = 'zynaps.png';
            };
        } else {
            element.src = 'zynaps.png';
        }
    }
}

// Authentication functions
async function registerUser(email, password, userData) {
    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate ZYN ID
        const zynId = generateZynId();
        
        // Prepare user data for database
        const userProfile = {
            ...userData,
            zynId: zynId,
            email: email,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            status: 'online'
        };
        
        // Save user data to database
        await set(ref(database, `users/${user.uid}`), userProfile);
        
        // Also save reference by ZYN ID for quick lookup
        await set(ref(database, `zynIds/${zynId}`), user.uid);
        
        showToast('Registration successful!', 'success');
        return user;
    } catch (error) {
        console.error('Registration error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update user status
        await update(ref(database, `users/${user.uid}`), {
            lastSeen: serverTimestamp(),
            status: 'online'
        });
        
        showToast('Login successful!', 'success');
        return user;
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
        throw error;
    }
}

async function logoutUser() {
    try {
        if (currentUser) {
            // Update status to offline
            await update(ref(database, `users/${currentUser.uid}`), {
                lastSeen: serverTimestamp(),
                status: 'offline'
            });
        }
        
        await signOut(auth);
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast(error.message, 'error');
    }
}

// User data functions
async function getUserData(uid) {
    try {
        const snapshot = await get(ref(database, `users/${uid}`));
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

async function getUserByZynId(zynId) {
    try {
        // First get the user UID from zynIds index
        const zynIdSnapshot = await get(ref(database, `zynIds/${zynId}`));
        const uid = zynIdSnapshot.val();
        
        if (!uid) {
            return null;
        }
        
        // Then get user data
        const userSnapshot = await get(ref(database, `users/${uid}`));
        return {
            uid: uid,
            ...userSnapshot.val()
        };
    } catch (error) {
        console.error('Error getting user by ZYN ID:', error);
        return null;
    }
}

// Chat request functions
async function sendChatRequest(recipientZynId, senderData) {
    try {
        const recipient = await getUserByZynId(recipientZynId);
        
        if (!recipient) {
            throw new Error('User not found');
        }
        
        // Check if already in contacts
        const contactCheck = await get(ref(database, `users/${currentUser.uid}/contacts/${recipient.uid}`));
        if (contactCheck.exists()) {
            throw new Error('User is already in your contacts');
        }
        
        // Check if request already exists
        const existingRequest = await get(ref(database, `chatRequests/${recipient.uid}/${currentUser.uid}`));
        if (existingRequest.exists()) {
            throw new Error('Request already sent');
        }
        
        // Create chat request
        const requestData = {
            senderId: currentUser.uid,
            senderZynId: currentUserData.zynId,
            senderName: currentUserData.name,
            senderProfilePic: currentUserData.profilePic || '',
            recipientId: recipient.uid,
            status: 'pending',
            timestamp: serverTimestamp()
        };
        
        // Save to recipient's requests
        await set(ref(database, `chatRequests/${recipient.uid}/${currentUser.uid}`), requestData);
        
        // Also save to sender's sent requests
        await set(ref(database, `sentRequests/${currentUser.uid}/${recipient.uid}`), {
            ...requestData,
            status: 'sent'
        });
        
        showToast('Chat request sent!', 'success');
        return true;
    } catch (error) {
        console.error('Error sending chat request:', error);
        showToast(error.message, 'error');
        return false;
    }
}

async function respondToChatRequest(requestId, accept = true) {
    try {
        const requestSnapshot = await get(ref(database, `chatRequests/${currentUser.uid}/${requestId}`));
        const request = requestSnapshot.val();
        
        if (!request) {
            throw new Error('Request not found');
        }
        
        if (accept) {
            // Add each other to contacts
            await update(ref(database, `users/${currentUser.uid}/contacts/${requestId}`), {
                addedAt: serverTimestamp()
            });
            
            await update(ref(database, `users/${requestId}/contacts/${currentUser.uid}`), {
                addedAt: serverTimestamp()
            });
            
            // Create chat room
            const chatId = [currentUser.uid, requestId].sort().join('_');
            await set(ref(database, `chats/${chatId}`), {
                participants: {
                    [currentUser.uid]: true,
                    [requestId]: true
                },
                createdAt: serverTimestamp(),
                type: 'private'
            });
            
            // Add chat to users' chat list
            await set(ref(database, `users/${currentUser.uid}/chats/${chatId}`), {
                otherUserId: requestId,
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp()
            });
            
            await set(ref(database, `users/${requestId}/chats/${chatId}`), {
                otherUserId: currentUser.uid,
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp()
            });
            
            showToast('Contact added!', 'success');
        }
        
        // Remove the request
        await remove(ref(database, `chatRequests/${currentUser.uid}/${requestId}`));
        
        // Update sent request status
        await update(ref(database, `sentRequests/${requestId}/${currentUser.uid}`), {
            status: accept ? 'accepted' : 'rejected',
            respondedAt: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Error responding to chat request:', error);
        showToast(error.message, 'error');
        return false;
    }
}

// Message functions
async function sendMessage(chatId, message, type = 'text', mediaUrl = '') {
    try {
        const messageId = push(child(ref(database), 'messages')).key;
        const messageData = {
            messageId: messageId,
            chatId: chatId,
            senderId: currentUser.uid,
            content: message,
            type: type,
            mediaUrl: mediaUrl,
            timestamp: serverTimestamp(),
            status: 'sent'
        };
        
        // Save message
        await set(ref(database, `messages/${chatId}/${messageId}`), messageData);
        
        // Update chat last message
        await update(ref(database, `chats/${chatId}`), {
            lastMessage: type === 'text' ? message : `Sent a ${type}`,
            lastMessageTime: serverTimestamp(),
            lastMessageSender: currentUser.uid
        });
        
        // Update users' chat list
        const chatSnapshot = await get(ref(database, `chats/${chatId}`));
        const chat = chatSnapshot.val();
        const participants = Object.keys(chat.participants || {});
        
        for (const participantId of participants) {
            if (participantId !== currentUser.uid) {
                await update(ref(database, `users/${participantId}/chats/${chatId}`), {
                    lastMessage: type === 'text' ? message : `Sent a ${type}`,
                    lastMessageTime: serverTimestamp(),
                    unreadCount: (await get(ref(database, `users/${participantId}/chats/${chatId}/unreadCount`))).val() || 0 + 1
                });
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        showToast(error.message, 'error');
        return false;
    }
}

// Group functions
async function createGroup(groupName, members = []) {
    try {
        const groupId = push(child(ref(database), 'groups')).key;
        const groupData = {
            groupId: groupId,
            name: groupName,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            members: {
                [currentUser.uid]: {
                    role: 'admin',
                    addedAt: serverTimestamp()
                }
            },
            lastMessage: 'Group created',
            lastMessageTime: serverTimestamp()
        };
        
        // Add members
        for (const memberZynId of members) {
            const member = await getUserByZynId(memberZynId);
            if (member) {
                groupData.members[member.uid] = {
                    role: 'member',
                    addedAt: serverTimestamp()
                };
                
                // Add group to member's groups
                await set(ref(database, `users/${member.uid}/groups/${groupId}`), {
                    groupName: groupName,
                    joinedAt: serverTimestamp()
                });
            }
        }
        
        // Save group
        await set(ref(database, `groups/${groupId}`), groupData);
        
        // Add to creator's groups
        await set(ref(database, `users/${currentUser.uid}/groups/${groupId}`), {
            groupName: groupName,
            joinedAt: serverTimestamp(),
            role: 'admin'
        });
        
        showToast('Group created successfully!', 'success');
        return groupId;
    } catch (error) {
        console.error('Error creating group:', error);
        showToast(error.message, 'error');
        return null;
    }
}

// Status (Zynes) functions
async function postStatus(content, type = 'text', mediaUrl = '') {
    try {
        const statusId = push(child(ref(database), 'statuses')).key;
        const statusData = {
            statusId: statusId,
            userId: currentUser.uid,
            content: content,
            type: type,
            mediaUrl: mediaUrl,
            postedAt: serverTimestamp(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        };
        
        await set(ref(database, `statuses/${statusId}`), statusData);
        await set(ref(database, `users/${currentUser.uid}/statuses/${statusId}`), statusData);
        
        showToast('Status posted!', 'success');
        return true;
    } catch (error) {
        console.error('Error posting status:', error);
        showToast(error.message, 'error');
        return false;
    }
}

// Initialize app based on current page
document.addEventListener('DOMContentLoaded', async function() {
    const path = window.location.pathname;
    
    // Check auth state
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            currentUserData = await getUserData(user.uid);
            
            if (path.includes('index.html') || path === '/') {
                // Redirect to home if already logged in
                window.location.href = 'home.html';
            } else if (path.includes('home.html')) {
                initializeHomePage();
            } else if (path.includes('chat.html')) {
                initializeChatPage();
            }
        } else {
            // Not logged in
            if (!path.includes('index.html') && path !== '/') {
                window.location.href = 'index.html';
            } else if (path.includes('index.html') || path === '/') {
                initializeAuthPage();
            }
        }
    });
});

// Initialize authentication page
function initializeAuthPage() {
    console.log('Initializing auth page');
    
    // Show welcome screen initially
    showWelcomeScreen();
    
    // Handle welcome screen continue button
    document.getElementById('continueBtn')?.addEventListener('click', () => {
        document.querySelector('.welcome-screen').style.display = 'none';
        document.querySelector('.auth-form').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });
    
    // Handle login link
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });
    
    // Handle signup link
    document.getElementById('showSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });
    
    // Handle back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.welcome-screen').style.display = 'block';
            document.querySelector('.auth-form').style.display = 'none';
        });
    });
    
    // Handle profile picture upload
    const profilePicInput = document.getElementById('profilePic');
    const profilePreview = document.getElementById('profilePreview');
    const removeProfileBtn = document.getElementById('removeProfile');
    let profileFile = null;
    
    if (profilePicInput) {
        profilePicInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showToast('File size should be less than 5MB', 'error');
                    return;
                }
                
                if (!file.type.match('image.*')) {
                    showToast('Please select an image file', 'error');
                    return;
                }
                
                profileFile = file;
                const reader = new FileReader();
                reader.onload = function(e) {
                    profilePreview.src = e.target.result;
                    profilePreview.style.display = 'block';
                    document.querySelector('.preview-placeholder').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    if (removeProfileBtn) {
        removeProfileBtn.addEventListener('click', function() {
            profileFile = null;
            profilePreview.src = '';
            profilePreview.style.display = 'none';
            document.querySelector('.preview-placeholder').style.display = 'flex';
            profilePicInput.value = '';
        });
    }
    
    // Handle signup form submission
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            // Validation
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            if (password.length < 6) {
                showToast('Password must be at least 6 characters', 'error');
                return;
            }
            
            // Show loading
            const submitBtn = signupForm.querySelector('.btn-primary');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="spinner"></div> Registering...';
            submitBtn.disabled = true;
            
            try {
                let profilePicUrl = '';
                
                // Upload profile picture if exists
                if (profileFile) {
                    try {
                        const result = await uploadToImageKit(profileFile, `profile_${Date.now()}.jpg`, ['profile']);
                        profilePicUrl = result.url;
                    } catch (uploadError) {
                        console.error('Profile upload error:', uploadError);
                        showToast('Profile picture upload failed, continuing without it', 'warning');
                    }
                }
                
                // Create user data object
                const userData = {
                    name: name,
                    phone: phone,
                    profilePic: profilePicUrl,
                    createdAt: serverTimestamp(),
                    lastSeen: serverTimestamp(),
                    status: 'online',
                    contacts: {},
                    chats: {},
                    groups: {}
                };
                
                // Register user
                await registerUser(email, password, userData);
                
                // Auto login
                await loginUser(email, password);
                
            } catch (error) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Handle login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            // Show loading
            const submitBtn = loginForm.querySelector('.btn-primary');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<div class="spinner"></div> Logging in...';
            submitBtn.disabled = true;
            
            try {
                await loginUser(email, password);
            } catch (error) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}

// Show welcome screen
function showWelcomeScreen() {
    const welcomeScreen = document.querySelector('.welcome-screen');
    const authForm = document.querySelector('.auth-form');
    
    if (welcomeScreen && authForm) {
        welcomeScreen.style.display = 'block';
        authForm.style.display = 'none';
    }
}

// Initialize home page
function initializeHomePage() {
    console.log('Initializing home page');
    
    if (!currentUserData) {
        window.location.href = 'index.html';
        return;
    }
    
    // Update UI with user data
    updateUserUI();
    
    // Set up navigation
    setupNavigation();
    
    // Set up floating chat button
    setupFloatingButton();
    
    // Set up modals
    setupModals();
    
    // Load initial data
    loadHomeData();
    
    // Set up event listeners
    setupEventListeners();
}

// Update UI with user data
function updateUserUI() {
    // Update header
    const userNameElement = document.querySelector('.user-info h2');
    const userIdElement = document.querySelector('.user-id');
    const profilePicElement = document.querySelector('.profile-pic-small');
    
    if (userNameElement) userNameElement.textContent = currentUserData.name || 'User';
    if (userIdElement) userIdElement.textContent = currentUserData.zynId || '';
    if (profilePicElement) loadProfileImage(currentUserData.profilePic, 'headerProfilePic');
    
    // Set up copy button
    document.querySelector('.copy-btn')?.addEventListener('click', () => {
        copyToClipboard(currentUserData.zynId || '');
    });
}

// Set up navigation
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            
            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding page
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `${pageId}Page`) {
                    page.classList.add('active');
                }
            });
            
            // Load page data
            loadPageData(pageId);
        });
    });
    
    // Set home as active by default
    document.querySelector('.nav-item[data-page="home"]')?.classList.add('active');
    document.getElementById('homePage')?.classList.add('active');
}

// Load page data
function loadPageData(pageId) {
    switch (pageId) {
        case 'home':
            loadHomeData();
            break;
        case 'zynes':
            loadZynesData();
            break;
        case 'groups':
            loadGroupsData();
            break;
        case 'requests':
            loadChatRequests();
            break;
        case 'contacts':
            loadContacts();
            break;
    }
}

// Set up floating button
function setupFloatingButton() {
    const floatingBtn = document.querySelector('.floating-btn');
    if (floatingBtn) {
        floatingBtn.addEventListener('click', () => {
            showStartChatModal();
        });
    }
}

// Set up modals
function setupModals() {
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.modal-overlay').forEach(modal => {
                modal.classList.remove('active');
            });
        });
    });
    
    // Click outside to close
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Show start chat modal
function showStartChatModal() {
    const modal = document.getElementById('startChatModal');
    if (modal) {
        modal.classList.add('active');
        document.getElementById('searchUserId').focus();
    }
}

// Set up event listeners
function setupEventListeners() {
    // Profile dropdown
    const profileBtn = document.querySelector('.profile-btn');
    const profileDropdown = document.getElementById('profileDropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            profileDropdown.classList.remove('show');
        });
    }
    
    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', logoutUser);
}

// Load home data
async function loadHomeData() {
    // Load recent chats
    await loadRecentChats();
    
    // Load unread counts
    await loadUnreadCounts();
}

// Load recent chats
async function loadRecentChats() {
    const chatsContainer = document.getElementById('recentChatsList');
    if (!chatsContainer) return;
    
    try {
        const chatsRef = ref(database, `users/${currentUser.uid}/chats`);
        onValue(chatsRef, async (snapshot) => {
            const chats = snapshot.val() || {};
            const chatsArray = Object.entries(chats);
            
            // Sort by last message time
            chatsArray.sort((a, b) => {
                return (b[1].lastMessageTime || 0) - (a[1].lastMessageTime || 0);
            });
            
            // Clear container
            chatsContainer.innerHTML = '';
            
            if (chatsArray.length === 0) {
                chatsContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-comments"></i>
                        <h3>No Chats Yet</h3>
                        <p>Start a chat with someone to see it here</p>
                    </div>
                `;
                return;
            }
            
            // Load each chat
            for (const [chatId, chatData] of chatsArray.slice(0, 10)) {
                const otherUserId = chatData.otherUserId;
                const otherUserData = await getUserData(otherUserId);
                
                if (otherUserData) {
                    const chatElement = document.createElement('div');
                    chatElement.className = 'contact-card';
                    chatElement.innerHTML = `
                        <img src="${otherUserData.profilePic || 'zynaps.png'}" alt="${otherUserData.name}" class="profile-pic" onerror="this.src='zynaps.png'">
                        <div class="contact-info">
                            <h4>${otherUserData.name}</h4>
                            <p>${chatData.lastMessage || 'No messages yet'}</p>
                            <span class="time">${formatTime(chatData.lastMessageTime)}</span>
                        </div>
                        ${chatData.unreadCount ? `<div class="badge">${chatData.unreadCount}</div>` : ''}
                    `;
                    
                    chatElement.addEventListener('click', () => {
                        window.location.href = `chat.html?chatId=${chatId}`;
                    });
                    
                    chatsContainer.appendChild(chatElement);
                }
            }
        });
    } catch (error) {
        console.error('Error loading recent chats:', error);
    }
}

// Load unread counts
async function loadUnreadCounts() {
    // Load chat requests count
    const requestsRef = ref(database, `chatRequests/${currentUser.uid}`);
    onValue(requestsRef, (snapshot) => {
        const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
        updateBadge('requests', count);
    });
}

// Update badge count
function updateBadge(page, count) {
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) {
        let badge = navItem.querySelector('.badge');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('div');
                badge.className = 'badge';
                navItem.appendChild(badge);
            }
            badge.textContent = count > 99 ? '99+' : count;
        } else if (badge) {
            badge.remove();
        }
    }
}

// Load chat requests
async function loadChatRequests() {
    const container = document.getElementById('requestsContainer');
    if (!container) return;
    
    try {
        const requestsRef = ref(database, `chatRequests/${currentUser.uid}`);
        onValue(requestsRef, async (snapshot) => {
            const requests = snapshot.val() || {};
            container.innerHTML = '';
            
            if (Object.keys(requests).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-plus"></i>
                        <h3>No Requests</h3>
                        <p>You don't have any pending chat requests</p>
                    </div>
                `;
                return;
            }
            
            for (const [senderId, requestData] of Object.entries(requests)) {
                if (requestData.status === 'pending') {
                    const senderData = await getUserData(senderId);
                    
                    if (senderData) {
                        const requestElement = document.createElement('div');
                        requestElement.className = 'request-card';
                        requestElement.innerHTML = `
                            <img src="${senderData.profilePic || 'zynaps.png'}" alt="${senderData.name}" class="profile-pic" onerror="this.src='zynaps.png'">
                            <div class="request-info">
                                <h4>${senderData.name}</h4>
                                <p>ZYN ID: ${requestData.senderZynId}</p>
                                <span class="time">${formatTime(requestData.timestamp)}</span>
                            </div>
                            <div class="request-actions">
                                <button class="action-btn accept-btn" data-request-id="${senderId}">
                                    <i class="fas fa-check"></i> Accept
                                </button>
                                <button class="action-btn reject-btn" data-request-id="${senderId}">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        `;
                        
                        container.appendChild(requestElement);
                    }
                }
            }
            
            // Add event listeners to buttons
            container.querySelectorAll('.accept-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const requestId = btn.getAttribute('data-request-id');
                    await respondToChatRequest(requestId, true);
                });
            });
            
            container.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const requestId = btn.getAttribute('data-request-id');
                    await respondToChatRequest(requestId, false);
                });
            });
        });
    } catch (error) {
        console.error('Error loading chat requests:', error);
    }
}

// Load contacts
async function loadContacts() {
    const container = document.getElementById('contactsContainer');
    if (!container) return;
    
    try {
        const contactsRef = ref(database, `users/${currentUser.uid}/contacts`);
        onValue(contactsRef, async (snapshot) => {
            const contacts = snapshot.val() || {};
            container.innerHTML = '';
            
            if (Object.keys(contacts).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No Contacts</h3>
                        <p>Add people to start chatting</p>
                    </div>
                `;
                return;
            }
            
            const contactsArray = await Promise.all(
                Object.keys(contacts).map(async (contactId) => {
                    const contactData = await getUserData(contactId);
                    return { id: contactId, ...contactData };
                })
            );
            
            // Sort by name
            contactsArray.sort((a, b) => a.name?.localeCompare(b.name));
            
            for (const contact of contactsArray) {
                if (contact) {
                    const contactElement = document.createElement('div');
                    contactElement.className = 'contact-card';
                    contactElement.innerHTML = `
                        <img src="${contact.profilePic || 'zynaps.png'}" alt="${contact.name}" class="profile-pic" onerror="this.src='zynaps.png'">
                        <div class="contact-info">
                            <h4>${contact.name}</h4>
                            <p>ZYN ID: ${contact.zynId}</p>
                            <span class="status ${contact.status || 'offline'}">${contact.status === 'online' ? 'Online' : 'Offline'}</span>
                        </div>
                        <div class="contact-actions">
                            <button class="action-btn chat-btn" data-user-id="${contact.id}">
                                <i class="fas fa-comment"></i> Chat
                            </button>
                        </div>
                    `;
                    
                    container.appendChild(contactElement);
                }
            }
            
            // Add event listeners to chat buttons
            container.querySelectorAll('.chat-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const userId = btn.getAttribute('data-user-id');
                    await startChatWithUser(userId);
                });
            });
        });
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Start chat with user
async function startChatWithUser(userId) {
    try {
        // Check if chat already exists
        const chatId = [currentUser.uid, userId].sort().join('_');
        const chatSnapshot = await get(ref(database, `chats/${chatId}`));
        
        if (!chatSnapshot.exists()) {
            // Create new chat
            await set(ref(database, `chats/${chatId}`), {
                participants: {
                    [currentUser.uid]: true,
                    [userId]: true
                },
                createdAt: serverTimestamp(),
                type: 'private'
            });
            
            // Add chat to users' chat list
            await set(ref(database, `users/${currentUser.uid}/chats/${chatId}`), {
                otherUserId: userId,
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp()
            });
            
            const otherUserData = await getUserData(userId);
            await set(ref(database, `users/${userId}/chats/${chatId}`), {
                otherUserId: currentUser.uid,
                lastMessage: 'Chat started',
                lastMessageTime: serverTimestamp()
            });
        }
        
        // Navigate to chat
        window.location.href = `chat.html?chatId=${chatId}`;
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast(error.message, 'error');
    }
}

// Load groups data
async function loadGroupsData() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;
    
    try {
        const groupsRef = ref(database, `users/${currentUser.uid}/groups`);
        onValue(groupsRef, async (snapshot) => {
            const groups = snapshot.val() || {};
            container.innerHTML = '';
            
            if (Object.keys(groups).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No Groups</h3>
                        <p>Create or join a group to get started</p>
                    </div>
                `;
                return;
            }
            
            for (const [groupId, groupData] of Object.entries(groups)) {
                const groupSnapshot = await get(ref(database, `groups/${groupId}`));
                const fullGroupData = groupSnapshot.val();
                
                if (fullGroupData) {
                    const groupElement = document.createElement('div');
                    groupElement.className = 'group-card';
                    groupElement.innerHTML = `
                        <img src="${fullGroupData.profilePic || 'zynaps.png'}" alt="${fullGroupData.name}" class="profile-pic" onerror="this.src='zynaps.png'">
                        <div class="group-info">
                            <h4>${fullGroupData.name}</h4>
                            <p>${fullGroupData.lastMessage || 'Group created'}</p>
                            <span class="time">${formatTime(fullGroupData.lastMessageTime)}</span>
                        </div>
                        <div class="group-actions">
                            <button class="action-btn chat-btn" data-group-id="${groupId}">
                                <i class="fas fa-comment"></i> Chat
                            </button>
                        </div>
                    `;
                    
                    container.appendChild(groupElement);
                }
            }
            
            // Add event listeners to chat buttons
            container.querySelectorAll('.chat-btn[data-group-id]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const groupId = btn.getAttribute('data-group-id');
                    window.location.href = `chat.html?groupId=${groupId}`;
                });
            });
        });
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// Load Zynes data
async function loadZynesData() {
    const container = document.getElementById('zynesContainer');
    if (!container) return;
    
    try {
        // First get all contacts
        const contactsSnapshot = await get(ref(database, `users/${currentUser.uid}/contacts`));
        const contacts = contactsSnapshot.val() || {};
        
        // Get statuses from contacts
        const statusesPromises = Object.keys(contacts).map(async (contactId) => {
            const statusSnapshot = await get(ref(database, `users/${contactId}/statuses`));
            const statuses = statusSnapshot.val();
            
            if (statuses) {
                const contactData = await getUserData(contactId);
                return Object.entries(statuses).map(([statusId, statusData]) => ({
                    ...statusData,
                    user: contactData,
                    statusId
                }));
            }
            return [];
        });
        
        const allStatuses = (await Promise.all(statusesPromises)).flat();
        
        // Filter expired statuses and sort by time
        const currentTime = Date.now();
        const activeStatuses = allStatuses
            .filter(status => status.expiresAt > currentTime)
            .sort((a, b) => b.postedAt - a.postedAt);
        
        container.innerHTML = '';
        
        if (activeStatuses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-eye"></i>
                    <h3>No Status Updates</h3>
                    <p>Your contacts haven't posted any status updates</p>
                </div>
            `;
            return;
        }
        
        for (const status of activeStatuses) {
            const statusElement = document.createElement('div');
            statusElement.className = 'request-card';
            
            let contentHTML = '';
            if (status.type === 'image') {
                contentHTML = `<img src="${status.mediaUrl}" alt="Status" class="chat-media">`;
            } else if (status.type === 'video') {
                contentHTML = `<video src="${status.mediaUrl}" controls class="chat-media"></video>`;
            } else {
                contentHTML = `<p>${status.content}</p>`;
            }
            
            statusElement.innerHTML = `
                <img src="${status.user.profilePic || 'zynaps.png'}" alt="${status.user.name}" class="profile-pic" onerror="this.src='zynaps.png'">
                <div class="request-info">
                    <h4>${status.user.name}</h4>
                    ${contentHTML}
                    <span class="time">${formatTime(status.postedAt)} • Expires in ${Math.ceil((status.expiresAt - currentTime) / (60 * 60 * 1000))}h</span>
                </div>
            `;
            
            container.appendChild(statusElement);
        }
    } catch (error) {
        console.error('Error loading Zynes:', error);
    }
}

// Initialize chat page
function initializeChatPage() {
    console.log('Initializing chat page');
    
    // Get chat ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    const groupId = urlParams.get('groupId');
    
    if (!chatId && !groupId) {
        window.location.href = 'home.html';
        return;
    }
    
    activeChatId = chatId || groupId;
    const isGroup = !!groupId;
    
    // Set up UI
    setupChatUI(isGroup);
    
    // Load chat data
    loadChatData(activeChatId, isGroup);
    
    // Set up message input
    setupMessageInput(activeChatId, isGroup);
    
    // Set up event listeners
    setupChatEventListeners(activeChatId, isGroup);
    
    // Mark as read
    markChatAsRead(activeChatId);
}

// Set up chat UI
async function setupChatUI(isGroup) {
    const backBtn = document.querySelector('.back-btn');
    const chatUserName = document.querySelector('.chat-user-details h3');
    const chatUserPic = document.querySelector('.chat-user-info img');
    
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'home.html';
        });
    }
    
    if (isGroup) {
        // Load group info
        const groupSnapshot = await get(ref(database, `groups/${activeChatId}`));
        const groupData = groupSnapshot.val();
        
        if (groupData && chatUserName) {
            chatUserName.textContent = groupData.name;
            loadProfileImage(groupData.profilePic, 'chatUserPic');
        }
    } else {
        // Load user info
        const chatParticipants = activeChatId.split('_');
        const otherUserId = chatParticipants.find(id => id !== currentUser.uid);
        
        if (otherUserId) {
            const otherUserData = await getUserData(otherUserId);
            if (otherUserData && chatUserName) {
                chatUserName.textContent = otherUserData.name;
                loadProfileImage(otherUserData.profilePic, 'chatUserPic');
                
                // Update status
                const statusElement = document.querySelector('.chat-status');
                if (statusElement) {
                    statusElement.innerHTML = `
                        <span class="status-dot ${otherUserData.status || 'offline'}"></span>
                        <span>${otherUserData.status === 'online' ? 'Online' : 'Last seen ' + formatTime(otherUserData.lastSeen)}</span>
                    `;
                }
            }
        }
    }
}

// Load chat data
function loadChatData(chatId, isGroup) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    // Clear container
    messagesContainer.innerHTML = '';
    
    // Listen for messages
    const messagesRef = ref(database, `messages/${chatId}`);
    let lastDate = null;
    
    activeChatListener = onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val() || {};
        const messagesArray = Object.values(messages)
            .filter(msg => msg !== null)
            .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
        messagesContainer.innerHTML = '';
        lastDate = null;
        
        if (messagesArray.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-chat">
                    <i class="fas fa-comment-slash"></i>
                    <h3>No Messages Yet</h3>
                    <p>Send a message to start the conversation</p>
                </div>
            `;
            return;
        }
        
        for (const message of messagesArray) {
            // Add date separator if needed
            const messageDate = formatDate(message.timestamp);
            if (messageDate !== lastDate) {
                const dateElement = document.createElement('div');
                dateElement.className = 'message-date';
                dateElement.textContent = messageDate;
                messagesContainer.appendChild(dateElement);
                lastDate = messageDate;
            }
            
            const messageElement = document.createElement('div');
            messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
            
            let messageContent = '';
            if (message.type === 'image') {
                messageContent = `<img src="${message.mediaUrl}" alt="Image" class="chat-media">`;
            } else if (message.type === 'video') {
                messageContent = `<video src="${message.mediaUrl}" controls class="chat-media"></video>`;
            } else {
                messageContent = `<p>${message.content}</p>`;
            }
            
            messageElement.innerHTML = `
                <div class="message-bubble">
                    ${messageContent}
                    <span class="message-time">${formatTime(message.timestamp)}</span>
                </div>
            `;
            
            messagesContainer.appendChild(messageElement);
        }
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Play notification for new messages
        if (messagesArray.length > 0) {
            const lastMessage = messagesArray[messagesArray.length - 1];
            if (lastMessage.senderId !== currentUser.uid) {
                notificationSound.play().catch(e => console.log('Audio play failed:', e));
            }
        }
    });
}

// Set up message input
function setupMessageInput(chatId, isGroup) {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendMessage');
    const attachBtn = document.getElementById('attachBtn');
    const attachmentOptions = document.querySelector('.attachment-options');
    
    if (messageInput && sendBtn) {
        // Send message on Enter (but allow Shift+Enter for new line)
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessageHandler(chatId, isGroup);
            }
        });
        
        // Send button click
        sendBtn.addEventListener('click', () => {
            sendMessageHandler(chatId, isGroup);
        });
        
        // Typing indicator
        let typingTimeout;
        messageInput.addEventListener('input', () => {
            // Show typing indicator
            // (In a real app, you would send a typing indicator to the server)
            
            clearTimeout(typingTimeout);
            typingTimeout = setTimeout(() => {
                // Hide typing indicator
            }, 1000);
        });
    }
    
    if (attachBtn && attachmentOptions) {
        attachBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            attachmentOptions.classList.toggle('show');
        });
        
        // Close attachment options when clicking outside
        document.addEventListener('click', () => {
            attachmentOptions.classList.remove('show');
        });
        
        // Set up attachment buttons
        setupAttachmentHandlers(chatId, isGroup);
    }
}

// Send message handler
async function sendMessageHandler(chatId, isGroup) {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    try {
        await sendMessage(chatId, message, 'text');
        messageInput.value = '';
        messageInput.focus();
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

// Set up attachment handlers
function setupAttachmentHandlers(chatId, isGroup) {
    // Image attachment
    const imageInput = document.getElementById('imageInput');
    const imageBtn = document.querySelector('[data-attach="image"]');
    
    if (imageBtn && imageInput) {
        imageBtn.addEventListener('click', () => {
            imageInput.click();
        });
        
        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await uploadAndSendMedia(chatId, file, 'image');
                imageInput.value = '';
            }
        });
    }
    
    // Video attachment
    const videoInput = document.getElementById('videoInput');
    const videoBtn = document.querySelector('[data-attach="video"]');
    
    if (videoBtn && videoInput) {
        videoBtn.addEventListener('click', () => {
            videoInput.click();
        });
        
        videoInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                await uploadAndSendMedia(chatId, file, 'video');
                videoInput.value = '';
            }
        });
    }
}

// Upload and send media
async function uploadAndSendMedia(chatId, file, type) {
    try {
        const result = await uploadToImageKit(file, `${type}_${Date.now()}.${file.name.split('.').pop()}`, [type]);
        await sendMessage(chatId, '', type, result.url);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} sent!`, 'success');
    } catch (error) {
        console.error(`Error sending ${type}:`, error);
        showToast(`Failed to send ${type}`, 'error');
    }
}

// Set up chat event listeners
function setupChatEventListeners(chatId, isGroup) {
    // Chat menu
    const chatMenuBtn = document.querySelector('.icon-btn[data-menu="chat"]');
    const chatDropdown = document.getElementById('chatDropdown');
    
    if (chatMenuBtn && chatDropdown) {
        chatMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chatDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            chatDropdown.classList.remove('show');
        });
    }
}

// Mark chat as read
async function markChatAsRead(chatId) {
    try {
        await update(ref(database, `users/${currentUser.uid}/chats/${chatId}`), {
            unreadCount: 0
        });
    } catch (error) {
        console.error('Error marking chat as read:', error);
    }
}

// Clean up when leaving page
window.addEventListener('beforeunload', () => {
    if (activeChatListener) {
        // Detach Firebase listeners (pseudo-code - actual implementation depends on Firebase version)
        // In real Firebase, you would store the unsubscribe function and call it
    }
});

// Make functions available globally for inline event handlers
window.copyToClipboard = copyToClipboard;
window.showStartChatModal = showStartChatModal;

// Handle search user for chat
document.addEventListener('click', async function(e) {
    if (e.target && e.target.id === 'searchUserBtn') {
        const userIdInput = document.getElementById('searchUserId');
        const searchResult = document.getElementById('searchResult');
        const userFound = document.getElementById('userFound');
        
        const zynId = userIdInput.value.trim().toUpperCase();
        
        if (!zynId.startsWith('ZYN-')) {
            showToast('Please enter a valid ZYN ID (format: ZYN-XXXX)', 'error');
            return;
        }
        
        try {
            const user = await getUserByZynId(zynId);
            
            if (user) {
                // Check if already in contacts
                const contactCheck = await get(ref(database, `users/${currentUser.uid}/contacts/${user.uid}`));
                const isContact = contactCheck.exists();
                
                userFound.innerHTML = `
                    <img src="${user.profilePic || 'zynaps.png'}" alt="${user.name}" class="profile-pic" onerror="this.src='zynaps.png'">
                    <div>
                        <h4>${user.name}</h4>
                        <p>ZYN ID: ${user.zynId}</p>
                        ${isContact ? '<p class="already-contact"><i class="fas fa-check-circle"></i> Already in contacts</p>' : ''}
                    </div>
                `;
                
                searchResult.classList.add('active');
                
                // Set up send request button
                const sendRequestBtn = document.getElementById('sendRequestBtn');
                if (sendRequestBtn) {
                    sendRequestBtn.onclick = async () => {
                        if (isContact) {
                            showToast('User is already in your contacts', 'warning');
                            return;
                        }
                        
                        await sendChatRequest(zynId, currentUserData);
                        document.getElementById('startChatModal').classList.remove('active');
                    };
                }
            } else {
                showToast('User not found', 'error');
            }
        } catch (error) {
            console.error('Error searching user:', error);
            showToast('Error searching user', 'error');
        }
    }
});

// Handle create group
document.addEventListener('click', async function(e) {
    if (e.target && e.target.id === 'createGroupBtn') {
        const groupName = document.getElementById('groupName').value.trim();
        const membersInput = document.getElementById('groupMembers').value.trim();
        
        if (!groupName) {
            showToast('Please enter a group name', 'error');
            return;
        }
        
        const memberZynIds = membersInput.split(',').map(id => id.trim().toUpperCase()).filter(id => id);
        
        try {
            await createGroup(groupName, memberZynIds);
            document.getElementById('createGroupModal').classList.remove('active');
        } catch (error) {
            console.error('Error creating group:', error);
        }
    }
});

// Handle post status
document.addEventListener('click', async function(e) {
    if (e.target && e.target.id === 'postStatusBtn') {
        const statusContent = document.getElementById('statusContent').value.trim();
        const statusType = document.getElementById('statusType').value;
        const statusFileInput = document.getElementById('statusFile');
        
        if (!statusContent && statusType === 'text') {
            showToast('Please enter status content', 'error');
            return;
        }
        
        if ((statusType === 'image' || statusType === 'video') && !statusFileInput.files[0]) {
            showToast(`Please select a ${statusType} file`, 'error');
            return;
        }
        
        try {
            let mediaUrl = '';
            
            if (statusFileInput.files[0]) {
                const file = statusFileInput.files[0];
                const result = await uploadToImageKit(
                    file, 
                    `status_${Date.now()}.${file.name.split('.').pop()}`, 
                    ['status', statusType]
                );
                mediaUrl = result.url;
            }
            
            await postStatus(statusContent, statusType, mediaUrl);
            document.getElementById('postStatusModal').classList.remove('active');
        } catch (error) {
            console.error('Error posting status:', error);
        }
    }
});
