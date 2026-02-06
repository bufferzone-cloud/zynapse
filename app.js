// Global Variables
let currentUser = null;
let userData = null;
let chatWithUser = null;
let currentChatId = null;
let listeners = [];

// Toast Notification System
class Toast {
    static show(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer') || document.createElement('div');
        if (!document.getElementById('toastContainer')) {
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        }[type] || 'info-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Remove toast after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);

        return toast;
    }
}

// Utility Functions
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays >= 365 ? 'numeric' : undefined
    });
}

function generateZYNID() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNum}`;
}

function playNotificationSound() {
    try {
        const audio = new Audio('notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
        console.log('Notification sound error:', e);
    }
}

// Cloudinary Upload Function
async function uploadToCloudinary(file, type = 'image') {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', window.cloudinaryConfig.uploadPreset);
        formData.append('folder', window.cloudinaryConfig.folder);

        const endpoint = `https://api.cloudinary.com/v1_1/${window.cloudinaryConfig.cloudName}/${
            type === 'video' ? 'video' : 'image'
        }/upload`;

        fetch(endpoint, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.secure_url) {
                resolve({
                    url: data.secure_url,
                    publicId: data.public_id,
                    format: data.format,
                    bytes: data.bytes
                });
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

// Firebase Database Functions
async function getUserData(userId) {
    try {
        const db = window.firebaseDatabase;
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);
        return snapshot.val();
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

async function updateUserData(userId, data) {
    try {
        const db = window.firebaseDatabase;
        const userRef = ref(db, `users/${userId}`);
        await update(userRef, data);
        return true;
    } catch (error) {
        console.error('Error updating user data:', error);
        return false;
    }
}

async function checkZYNIDExists(zynId) {
    try {
        const db = window.firebaseDatabase;
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();
        
        if (users) {
            for (const userId in users) {
                if (users[userId].zynId === zynId) {
                    return { exists: true, userId };
                }
            }
        }
        return { exists: false, userId: null };
    } catch (error) {
        console.error('Error checking ZYN-ID:', error);
        return { exists: false, userId: null };
    }
}

// Auth State Management
function setupAuthStateListener() {
    const auth = window.firebaseAuth;
    
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // Get user data from database
            const db = window.firebaseDatabase;
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            userData = snapshot.val();
            
            if (!userData) {
                // User data doesn't exist, redirect to signup
                window.location.href = 'index.html';
                return;
            }
            
            // Update user status to online
            await updateUserData(user.uid, {
                status: 'online',
                lastSeen: new Date().toISOString()
            });
            
            // Show appropriate page
            if (window.location.pathname.includes('home.html')) {
                showHomePage();
            } else if (window.location.pathname.includes('chat.html')) {
                const urlParams = new URLSearchParams(window.location.search);
                const chatWith = urlParams.get('chatWith');
                if (chatWith) {
                    await loadChat(chatWith);
                }
            }
        } else {
            // User not logged in, redirect to index
            if (!window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

// Page Navigation
function navigateTo(page) {
    if (page === 'home') {
        window.location.href = 'home.html';
    } else if (page === 'chat') {
        window.location.href = 'chat.html';
    }
}

function showHomePage() {
    const loadingScreen = document.getElementById('loadingScreen');
    const appHome = document.getElementById('appHome');
    
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (appHome) appHome.style.display = 'flex';
    
    // Update user info
    if (userData) {
        document.getElementById('userName').textContent = userData.fullName || 'User';
        document.getElementById('userID').textContent = userData.zynId || 'ZYN-0000';
        document.getElementById('dropdownUserName').textContent = userData.fullName || 'User';
        document.getElementById('dropdownUserID').textContent = userData.zynId || 'ZYN-0000';
        
        if (userData.profilePic) {
            const profilePics = document.querySelectorAll('#headerProfilePic, #dropdownProfilePic');
            profilePics.forEach(pic => {
                pic.src = userData.profilePic;
                pic.onerror = () => {
                    pic.src = 'zynaps.png';
                };
            });
        }
    }
    
    setupHomeListeners();
    loadRecentChats();
}

async function loadRecentChats() {
    if (!currentUser || !userData) return;
    
    const db = window.firebaseDatabase;
    const chatsRef = ref(db, `chats/${currentUser.uid}`);
    
    // Listen for chat updates
    const unsubscribe = onValue(chatsRef, (snapshot) => {
        const chats = snapshot.val();
        const recentChatsList = document.getElementById('recentChats');
        
        if (!recentChatsList) return;
        
        if (!chats) {
            recentChatsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment-slash"></i>
                    <h3>No Recent Chats</h3>
                    <p>Start a conversation by clicking the chat button below</p>
                </div>
            `;
            return;
        }
        
        // Convert chats to array and sort by last message time
        const chatArray = Object.entries(chats).map(([chatId, chat]) => {
            return { chatId, ...chat };
        }).sort((a, b) => {
            return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
        }).slice(0, 5); // Show only 5 recent chats
        
        recentChatsList.innerHTML = '';
        
        chatArray.forEach(chat => {
            const chatCard = document.createElement('div');
            chatCard.className = 'contact-card';
            chatCard.innerHTML = `
                <img src="${chat.userPic || 'zynaps.png'}" alt="${chat.userName}" class="profile-pic">
                <div class="contact-info">
                    <h4>${chat.userName}</h4>
                    <p class="last-message">${chat.lastMessage || 'Start chatting'}</p>
                    <p class="time">${formatTimestamp(chat.lastMessageTime)}</p>
                </div>
            `;
            
            chatCard.addEventListener('click', () => {
                navigateToChat(chat.userId);
            });
            
            recentChatsList.appendChild(chatCard);
        });
        
        // Store unsubscribe function
        listeners.push(unsubscribe);
    });
}

function navigateToChat(userId) {
    window.location.href = `chat.html?chatWith=${userId}`;
}

async function loadChat(userId) {
    if (!currentUser) return;
    
    chatWithUser = await getUserData(userId);
    if (!chatWithUser) {
        Toast.show('User not found', 'error');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
        return;
    }
    
    // Generate chat ID (sorted to ensure consistency)
    const participants = [currentUser.uid, userId].sort();
    currentChatId = participants.join('_');
    
    // Update chat UI
    const chatPage = document.getElementById('chatPage');
    const loadingScreen = document.getElementById('loadingScreen');
    
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (chatPage) chatPage.style.display = 'flex';
    
    document.getElementById('chatUserName').textContent = chatWithUser.fullName || 'User';
    document.getElementById('chatUserStatusText').textContent = chatWithUser.status || 'Offline';
    document.getElementById('blockUserName').textContent = chatWithUser.fullName || 'User';
    
    const statusDot = document.getElementById('chatUserStatus');
    if (chatWithUser.status === 'online') {
        statusDot.className = 'status-dot online';
    } else {
        statusDot.className = 'status-dot offline';
    }
    
    if (chatWithUser.profilePic) {
        const chatUserPic = document.getElementById('chatUserPic');
        chatUserPic.src = chatWithUser.profilePic;
        chatUserPic.onerror = () => {
            chatUserPic.src = 'zynaps.png';
        };
    }
    
    // Set current date
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    document.getElementById('currentDate').textContent = currentDate;
    
    // Load messages
    loadMessages();
    setupChatListeners();
}

async function loadMessages() {
    if (!currentChatId) return;
    
    const db = window.firebaseDatabase;
    const messagesRef = ref(db, `messages/${currentChatId}`);
    
    const unsubscribe = onValue(messagesRef, (snapshot) => {
        const messages = snapshot.val();
        const chatMessages = document.getElementById('chatMessages');
        
        if (!chatMessages) return;
        
        // Clear existing messages except date and typing indicator
        const dateDiv = document.getElementById('currentDate');
        const typingIndicator = document.getElementById('typingIndicator');
        chatMessages.innerHTML = '';
        if (dateDiv) chatMessages.appendChild(dateDiv);
        
        if (!messages) {
            const emptyChat = document.createElement('div');
            emptyChat.className = 'empty-chat';
            emptyChat.innerHTML = `
                <i class="fas fa-comment"></i>
                <h3>No messages yet</h3>
                <p>Say hello to start the conversation!</p>
            `;
            chatMessages.appendChild(emptyChat);
            if (typingIndicator) chatMessages.appendChild(typingIndicator);
            return;
        }
        
        // Convert messages to array and sort by timestamp
        const messageArray = Object.entries(messages).map(([messageId, message]) => {
            return { messageId, ...message };
        }).sort((a, b) => {
            return new Date(a.timestamp) - new Date(b.timestamp);
        });
        
        // Group messages by date
        const groupedMessages = {};
        messageArray.forEach(message => {
            const date = new Date(message.timestamp).toDateString();
            if (!groupedMessages[date]) {
                groupedMessages[date] = [];
            }
            groupedMessages[date].push(message);
        });
        
        // Display messages
        Object.entries(groupedMessages).forEach(([date, dateMessages]) => {
            // Add date separator
            const dateElement = document.createElement('div');
            dateElement.className = 'message-date';
            dateElement.textContent = new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
            });
            chatMessages.appendChild(dateElement);
            
            // Add messages for this date
            dateMessages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
                
                let content = '';
                if (message.type === 'text') {
                    content = `<p>${message.content}</p>`;
                } else if (message.type === 'image') {
                    content = `
                        <div class="media-message">
                            <img src="${message.content}" alt="Image" class="chat-media" onclick="openMediaPreview('${message.content}', 'image')">
                            ${message.caption ? `<p>${message.caption}</p>` : ''}
                        </div>
                    `;
                } else if (message.type === 'video') {
                    content = `
                        <div class="media-message">
                            <video src="${message.content}" controls class="chat-media" onclick="openMediaPreview('${message.content}', 'video')"></video>
                            ${message.caption ? `<p>${message.caption}</p>` : ''}
                        </div>
                    `;
                } else if (message.type === 'file') {
                    const fileName = message.fileName || 'File';
                    const fileSize = message.fileSize ? ` (${formatFileSize(message.fileSize)})` : '';
                    content = `
                        <div class="file-message">
                            <i class="fas fa-file"></i>
                            <div>
                                <strong>${fileName}${fileSize}</strong>
                                <a href="${message.content}" download="${fileName}" class="link">Download</a>
                            </div>
                        </div>
                    `;
                }
                
                messageElement.innerHTML = `
                    <div class="message-bubble">
                        ${content}
                        <span class="message-time">
                            ${formatTimestamp(message.timestamp)}
                            ${message.senderId === currentUser.uid ? 
                                `<span class="message-status">${message.status || 'sent'}</span>` : ''}
                        </span>
                    </div>
                `;
                
                chatMessages.appendChild(messageElement);
            });
        });
        
        // Add typing indicator at the end
        if (typingIndicator) chatMessages.appendChild(typingIndicator);
        
        // Scroll to bottom
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    });
    
    listeners.push(unsubscribe);
}

// Event Listeners Setup
function setupHomeListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show page
            document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
            document.getElementById(`${page}Page`).classList.add('active');
        });
    });
    
    // Floating chat button
    const floatingChatBtn = document.getElementById('floatingChatBtn');
    if (floatingChatBtn) {
        floatingChatBtn.addEventListener('click', () => {
            document.getElementById('startChatModal').classList.add('active');
        });
    }
    
    // Quick actions
    const quickChat = document.getElementById('quickChat');
    if (quickChat) {
        quickChat.addEventListener('click', () => {
            document.getElementById('startChatModal').classList.add('active');
        });
    }
    
    const quickGroup = document.getElementById('quickGroup');
    if (quickGroup) {
        quickGroup.addEventListener('click', () => {
            document.getElementById('createGroupModal').classList.add('active');
        });
    }
    
    const quickStatus = document.getElementById('quickStatus');
    if (quickStatus) {
        quickStatus.addEventListener('click', () => {
            document.getElementById('createZyneModal').classList.add('active');
        });
    }
    
    // Profile dropdown
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    if (profileDropdownBtn && profileDropdown) {
        profileDropdownBtn.addEventListener('click', () => {
            profileDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileDropdownBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }
    
    // Edit profile
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('editProfileModal').classList.add('active');
            loadEditProfileData();
        });
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const auth = window.firebaseAuth;
            
            // Update status to offline
            if (currentUser) {
                await updateUserData(currentUser.uid, {
                    status: 'offline',
                    lastSeen: new Date().toISOString()
                });
            }
            
            // Sign out
            await signOut(auth);
            window.location.href = 'index.html';
        });
    }
    
    // Start chat modal
    const closeStartChatModal = document.getElementById('closeStartChatModal');
    if (closeStartChatModal) {
        closeStartChatModal.addEventListener('click', () => {
            document.getElementById('startChatModal').classList.remove('active');
        });
    }
    
    // Search user for chat
    const searchUserID = document.getElementById('searchUserID');
    if (searchUserID) {
        searchUserID.addEventListener('input', async (e) => {
            const zynId = e.target.value.trim().toUpperCase();
            const sendChatRequestBtn = document.getElementById('sendChatRequestBtn');
            const userSearchResult = document.getElementById('userSearchResult');
            
            if (zynId.length === 8 && zynId.startsWith('ZYN-')) {
                const { exists, userId } = await checkZYNIDExists(zynId);
                
                if (exists && userId !== currentUser.uid) {
                    const user = await getUserData(userId);
                    userSearchResult.innerHTML = `
                        <div class="user-found">
                            <img src="${user.profilePic || 'zynaps.png'}" alt="${user.fullName}" class="profile-pic">
                            <div>
                                <h4>${user.fullName}</h4>
                                <p>${zynId}</p>
                                <p class="status">${user.status || 'Offline'}</p>
                            </div>
                        </div>
                    `;
                    sendChatRequestBtn.style.display = 'block';
                    sendChatRequestBtn.onclick = () => sendChatRequest(userId, zynId);
                } else if (userId === currentUser.uid) {
                    userSearchResult.innerHTML = `
                        <div class="error">
                            <p>You cannot send a chat request to yourself</p>
                        </div>
                    `;
                    sendChatRequestBtn.style.display = 'none';
                } else {
                    userSearchResult.innerHTML = `
                        <div class="error">
                            <p>User with ZYN-ID ${zynId} not found</p>
                        </div>
                    `;
                    sendChatRequestBtn.style.display = 'none';
                }
            } else if (zynId.length > 0) {
                userSearchResult.innerHTML = `
                    <div class="error">
                        <p>Please enter a valid ZYN-ID (format: ZYN-1234)</p>
                    </div>
                `;
                sendChatRequestBtn.style.display = 'none';
            } else {
                userSearchResult.innerHTML = `
                    <div class="search-placeholder">
                        <i class="fas fa-search"></i>
                        <p>Enter a ZYN-ID to find a user</p>
                    </div>
                `;
                sendChatRequestBtn.style.display = 'none';
            }
        });
    }
}

function setupChatListeners() {
    // Back button
    const backToHome = document.getElementById('backToHome');
    if (backToHome) {
        backToHome.addEventListener('click', () => {
            // Clean up listeners
            listeners.forEach(unsubscribe => {
                if (typeof unsubscribe === 'function') {
                    unsubscribe();
                }
            });
            listeners = [];
            
            window.location.href = 'home.html';
        });
    }
    
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    if (messageInput && sendMessageBtn) {
        messageInput.addEventListener('input', () => {
            sendMessageBtn.disabled = messageInput.value.trim() === '';
        });
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
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
    if (attachPhotoBtn) {
        attachPhotoBtn.addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });
    }
    
    const attachVideoBtn = document.getElementById('attachVideoBtn');
    if (attachVideoBtn) {
        attachVideoBtn.addEventListener('click', () => {
            document.getElementById('videoInput').click();
        });
    }
    
    const attachFileBtn = document.getElementById('attachFileBtn');
    if (attachFileBtn) {
        attachFileBtn.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }
    
    // File inputs
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files[0], 'image');
        });
    }
    
    const videoInput = document.getElementById('videoInput');
    if (videoInput) {
        videoInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files[0], 'video');
        });
    }
    
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFileUpload(e.target.files[0], 'file');
        });
    }
    
    // Chat menu
    const chatMenuBtn = document.getElementById('chatMenuBtn');
    const chatMenuDropdown = document.getElementById('chatMenuDropdown');
    
    if (chatMenuBtn && chatMenuDropdown) {
        chatMenuBtn.addEventListener('click', () => {
            chatMenuDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!chatMenuBtn.contains(e.target) && !chatMenuDropdown.contains(e.target)) {
                chatMenuDropdown.classList.remove('show');
            }
        });
    }
    
    // Block user
    const blockUserBtn = document.getElementById('blockUserBtn');
    if (blockUserBtn) {
        blockUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('blockUserModal').classList.add('active');
        });
    }
    
    // Report user
    const reportUserBtn = document.getElementById('reportUserBtn');
    if (reportUserBtn) {
        reportUserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('reportUserModal').classList.add('active');
        });
    }
    
    // Clear chat
    const clearChatBtn = document.getElementById('clearChatBtn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('clearChatModal').classList.add('active');
        });
    }
    
    // Delete chat
    const deleteChatBtn = document.getElementById('deleteChatBtn');
    if (deleteChatBtn) {
        deleteChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('deleteChatModal').classList.add('active');
        });
    }
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal-overlay').classList.remove('active');
        });
    });
    
    // Confirm block
    const confirmBlockBtn = document.getElementById('confirmBlockBtn');
    if (confirmBlockBtn) {
        confirmBlockBtn.addEventListener('click', async () => {
            if (!currentUser || !chatWithUser) return;
            
            const db = window.firebaseDatabase;
            const blockRef = ref(db, `blocks/${currentUser.uid}/${chatWithUser.userId}`);
            await set(blockRef, {
                blockedAt: new Date().toISOString(),
                blockedUserId: chatWithUser.userId,
                blockedUserName: chatWithUser.fullName
            });
            
            Toast.show(`${chatWithUser.fullName} has been blocked`, 'success');
            document.getElementById('blockUserModal').classList.remove('active');
            
            // Go back to home
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        });
    }
    
    // Cancel block
    const cancelBlockBtn = document.getElementById('cancelBlockBtn');
    if (cancelBlockBtn) {
        cancelBlockBtn.addEventListener('click', () => {
            document.getElementById('blockUserModal').classList.remove('active');
        });
    }
    
    // Submit report
    const submitReportBtn = document.getElementById('submitReportBtn');
    if (submitReportBtn) {
        submitReportBtn.addEventListener('click', async () => {
            const reason = document.getElementById('reportReason').value;
            const details = document.getElementById('reportDetails').value;
            
            if (!reason) {
                Toast.show('Please select a reason for reporting', 'error');
                return;
            }
            
            if (!currentUser || !chatWithUser) return;
            
            const db = window.firebaseDatabase;
            const reportRef = ref(db, `reports/${chatWithUser.userId}/${Date.now()}`);
            await set(reportRef, {
                reporterId: currentUser.uid,
                reportedUserId: chatWithUser.userId,
                reason: reason,
                details: details,
                timestamp: new Date().toISOString()
            });
            
            Toast.show('Report submitted successfully', 'success');
            document.getElementById('reportUserModal').classList.remove('active');
            
            // Clear form
            document.getElementById('reportReason').value = '';
            document.getElementById('reportDetails').value = '';
        });
    }
    
    // Cancel report
    const cancelReportBtn = document.getElementById('cancelReportBtn');
    if (cancelReportBtn) {
        cancelReportBtn.addEventListener('click', () => {
            document.getElementById('reportUserModal').classList.remove('active');
        });
    }
    
    // Confirm clear chat
    const confirmClearChatBtn = document.getElementById('confirmClearChatBtn');
    if (confirmClearChatBtn) {
        confirmClearChatBtn.addEventListener('click', async () => {
            if (!currentChatId) return;
            
            const db = window.firebaseDatabase;
            const messagesRef = ref(db, `messages/${currentChatId}`);
            await remove(messagesRef);
            
            Toast.show('Chat cleared successfully', 'success');
            document.getElementById('clearChatModal').classList.remove('active');
        });
    }
    
    // Cancel clear chat
    const cancelClearChatBtn = document.getElementById('cancelClearChatBtn');
    if (cancelClearChatBtn) {
        cancelClearChatBtn.addEventListener('click', () => {
            document.getElementById('clearChatModal').classList.remove('active');
        });
    }
    
    // Confirm delete chat
    const confirmDeleteChatBtn = document.getElementById('confirmDeleteChatBtn');
    if (confirmDeleteChatBtn) {
        confirmDeleteChatBtn.addEventListener('click', async () => {
            if (!currentUser || !currentChatId) return;
            
            const db = window.firebaseDatabase;
            
            // Remove chat from user's chat list
            const chatRef = ref(db, `chats/${currentUser.uid}/${chatWithUser.userId}`);
            await remove(chatRef);
            
            Toast.show('Chat deleted successfully', 'success');
            document.getElementById('deleteChatModal').classList.remove('active');
            
            // Go back to home
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        });
    }
    
    // Cancel delete chat
    const cancelDeleteChatBtn = document.getElementById('cancelDeleteChatBtn');
    if (cancelDeleteChatBtn) {
        cancelDeleteChatBtn.addEventListener('click', () => {
            document.getElementById('deleteChatModal').classList.remove('active');
        });
    }
}

// Message Functions
async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || !currentChatId || !currentUser || !chatWithUser) return;
    
    const db = window.firebaseDatabase;
    const messageRef = ref(db, `messages/${currentChatId}/${Date.now()}`);
    
    const messageData = {
        senderId: currentUser.uid,
        content: message,
        type: 'text',
        timestamp: new Date().toISOString(),
        status: 'sent'
    };
    
    try {
        await set(messageRef, messageData);
        messageInput.value = '';
        
        // Update chat list for both users
        await updateChatList(currentUser.uid, chatWithUser.userId, message, 'text');
        await updateChatList(chatWithUser.userId, currentUser.uid, message, 'text');
        
        // Play sent sound
        playNotificationSound();
    } catch (error) {
        console.error('Error sending message:', error);
        Toast.show('Failed to send message', 'error');
    }
}

async function updateChatList(userId, otherUserId, lastMessage, type) {
    const db = window.firebaseDatabase;
    const chatRef = ref(db, `chats/${userId}/${otherUserId}`);
    
    // Get other user's data
    const otherUserData = await getUserData(otherUserId);
    
    const chatData = {
        userId: otherUserId,
        userName: otherUserData?.fullName || 'User',
        userPic: otherUserData?.profilePic || null,
        lastMessage: lastMessage,
        lastMessageType: type,
        lastMessageTime: new Date().toISOString(),
        unreadCount: userId === currentUser.uid ? 0 : 1 // Increment if receiving
    };
    
    await set(chatRef, chatData);
}

async function handleFileUpload(file, type) {
    if (!file || !currentChatId || !currentUser || !chatWithUser) return;
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
        Toast.show('File size must be less than 50MB', 'error');
        return;
    }
    
    // Show loading
    const sendMediaBtn = document.getElementById('sendMediaBtn');
    const originalText = sendMediaBtn ? sendMediaBtn.innerHTML : '';
    if (sendMediaBtn) {
        sendMediaBtn.innerHTML = '<div class="spinner"></div>';
        sendMediaBtn.disabled = true;
    }
    
    try {
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(file, type);
        
        // Prepare message data
        const db = window.firebaseDatabase;
        const messageRef = ref(db, `messages/${currentChatId}/${Date.now()}`);
        
        const messageData = {
            senderId: currentUser.uid,
            content: uploadResult.url,
            type: type,
            timestamp: new Date().toISOString(),
            status: 'sent',
            fileName: file.name,
            fileSize: file.size,
            format: uploadResult.format
        };
        
        // Send message
        await set(messageRef, messageData);
        
        // Update chat lists
        const caption = type === 'image' ? '📷 Photo' : type === 'video' ? '🎬 Video' : '📄 File';
        await updateChatList(currentUser.uid, chatWithUser.userId, caption, type);
        await updateChatList(chatWithUser.userId, currentUser.uid, caption, type);
        
        // Close modal and show success
        document.getElementById('mediaPreviewModal').classList.remove('active');
        Toast.show(`${type === 'image' ? 'Photo' : type === 'video' ? 'Video' : 'File'} sent successfully`, 'success');
        playNotificationSound();
        
    } catch (error) {
        console.error('Error uploading file:', error);
        Toast.show('Failed to upload file', 'error');
    } finally {
        // Reset button
        if (sendMediaBtn) {
            sendMediaBtn.innerHTML = originalText;
            sendMediaBtn.disabled = false;
        }
    }
}

// Helper Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function openMediaPreview(url, type) {
    const mediaPreviewContent = document.getElementById('mediaPreviewContent');
    const mediaPreviewTitle = document.getElementById('mediaPreviewTitle');
    const mediaPreviewModal = document.getElementById('mediaPreviewModal');
    
    if (!mediaPreviewContent || !mediaPreviewTitle || !mediaPreviewModal) return;
    
    mediaPreviewContent.innerHTML = '';
    
    if (type === 'image') {
        mediaPreviewTitle.textContent = 'Photo Preview';
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.borderRadius = 'var(--border-radius-medium)';
        mediaPreviewContent.appendChild(img);
    } else if (type === 'video') {
        mediaPreviewTitle.textContent = 'Video Preview';
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.maxWidth = '100%';
        video.style.borderRadius = 'var(--border-radius-medium)';
        mediaPreviewContent.appendChild(video);
    }
    
    mediaPreviewModal.classList.add('active');
}

// Load edit profile data
function loadEditProfileData() {
    if (!userData) return;
    
    document.getElementById('editFullName').value = userData.fullName || '';
    document.getElementById('editPhoneNumber').value = userData.phoneNumber || '';
    document.getElementById('editStatus').value = userData.status || 'Available';
    
    const editProfilePreview = document.getElementById('editProfilePreview');
    if (userData.profilePic) {
        editProfilePreview.innerHTML = `<img src="${userData.profilePic}" alt="Profile">`;
    }
}

// Send chat request
async function sendChatRequest(userId, zynId) {
    if (!currentUser || !userData) return;
    
    const db = window.firebaseDatabase;
    const requestRef = ref(db, `requests/${userId}/${currentUser.uid}`);
    
    const requestData = {
        fromUserId: currentUser.uid,
        fromUserName: userData.fullName,
        fromUserPic: userData.profilePic,
        fromUserZYN: userData.zynId,
        toUserId: userId,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    try {
        await set(requestRef, requestData);
        Toast.show(`Chat request sent to ${zynId}`, 'success');
        document.getElementById('startChatModal').classList.remove('active');
        document.getElementById('searchUserID').value = '';
    } catch (error) {
        console.error('Error sending chat request:', error);
        Toast.show('Failed to send chat request', 'error');
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const auth = window.firebaseAuth;
    
    // Setup auth state listener
    setupAuthStateListener();
    
    // Index page specific listeners
    if (window.location.pathname.includes('index.html')) {
        setupIndexListeners();
    }
    
    // Handle page visibility change (update online status)
    document.addEventListener('visibilitychange', async () => {
        if (currentUser) {
            const status = document.hidden ? 'away' : 'online';
            await updateUserData(currentUser.uid, {
                status: status,
                lastSeen: new Date().toISOString()
            });
        }
    });
    
    // Handle beforeunload (update offline status)
    window.addEventListener('beforeunload', async () => {
        if (currentUser) {
            await updateUserData(currentUser.uid, {
                status: 'offline',
                lastSeen: new Date().toISOString()
            });
        }
        
        // Clean up listeners
        listeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
    });
});

// Index Page Listeners
function setupIndexListeners() {
    // Show/hide password
    document.getElementById('togglePassword')?.addEventListener('click', function() {
        const passwordInput = document.getElementById('password');
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
    
    document.getElementById('toggleLoginPassword')?.addEventListener('click', function() {
        const passwordInput = document.getElementById('loginPassword');
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
    
    // Navigation between welcome, signup, and login
    document.getElementById('getStartedBtn')?.addEventListener('click', () => {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });
    
    document.getElementById('loginBtn')?.addEventListener('click', () => {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });
    
    document.getElementById('backToWelcome')?.addEventListener('click', () => {
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
    });
    
    document.getElementById('backToWelcomeLogin')?.addEventListener('click', () => {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
    });
    
    document.getElementById('switchToLogin')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
    });
    
    document.getElementById('switchToSignup')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    });
    
    // Profile image upload
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
        document.getElementById('profileImage').click();
    });
    
    document.getElementById('profileImage')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                Toast.show('Image must be less than 5MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('profilePreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview">`;
                document.getElementById('removeBtn').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
    
    document.getElementById('removeBtn')?.addEventListener('click', () => {
        const preview = document.getElementById('profilePreview');
        preview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-user-circle"></i>
                <span>No image selected</span>
                <p>Max 5MB</p>
            </div>
        `;
        document.getElementById('profileImage').value = '';
        document.getElementById('removeBtn').style.display = 'none';
    });
    
    // Sign up form submission
    document.getElementById('signupFormElement')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAgreement = document.getElementById('termsAgreement').checked;
        
        // Validation
        if (password !== confirmPassword) {
            Toast.show('Passwords do not match', 'error');
            return;
        }
        
        if (!termsAgreement) {
            Toast.show('You must agree to the terms and conditions', 'error');
            return;
        }
        
        // Show loading
        const signupBtnText = document.getElementById('signupBtnText');
        const signupSpinner = document.getElementById('signupSpinner');
        if (signupBtnText && signupSpinner) {
            signupBtnText.style.display = 'none';
            signupSpinner.style.display = 'block';
        }
        
        try {
            const auth = window.firebaseAuth;
            
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Generate ZYN-ID
            const zynId = generateZYNID();
            
            // Upload profile picture if exists
            let profilePicUrl = null;
            const profileImage = document.getElementById('profileImage').files[0];
            if (profileImage) {
                const uploadResult = await uploadToCloudinary(profileImage, 'image');
                profilePicUrl = uploadResult.url;
            }
            
            // Save user data to Firebase Database
            const db = window.firebaseDatabase;
            const userRef = ref(db, `users/${user.uid}`);
            
            const userData = {
                uid: user.uid,
                fullName: fullName,
                phoneNumber: phoneNumber,
                email: email,
                zynId: zynId,
                profilePic: profilePicUrl,
                status: 'online',
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString()
            };
            
            await set(userRef, userData);
            
            // Update auth profile
            await updateProfile(user, {
                displayName: fullName,
                photoURL: profilePicUrl
            });
            
            Toast.show('Account created successfully!', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
            
        } catch (error) {
            console.error('Sign up error:', error);
            let message = 'Sign up failed';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    message = 'Email already in use';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address';
                    break;
                case 'auth/weak-password':
                    message = 'Password should be at least 6 characters';
                    break;
            }
            
            Toast.show(message, 'error');
        } finally {
            // Hide loading
            if (signupBtnText && signupSpinner) {
                signupBtnText.style.display = 'block';
                signupSpinner.style.display = 'none';
            }
        }
    });
    
    // Login form submission
    document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Show loading
        const loginBtnText = document.getElementById('loginBtnText');
        const loginSpinner = document.getElementById('loginSpinner');
        if (loginBtnText && loginSpinner) {
            loginBtnText.style.display = 'none';
            loginSpinner.style.display = 'block';
        }
        
        try {
            const auth = window.firebaseAuth;
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Get user data
            const db = window.firebaseDatabase;
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(userRef);
            
            if (!snapshot.exists()) {
                Toast.show('User data not found', 'error');
                await signOut(auth);
                return;
            }
            
            // Update status to online
            await update(ref(db, `users/${user.uid}`), {
                status: 'online',
                lastSeen: new Date().toISOString()
            });
            
            Toast.show('Login successful!', 'success');
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            let message = 'Login failed';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    message = 'User not found';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address';
                    break;
                case 'auth/user-disabled':
                    message = 'Account disabled';
                    break;
            }
            
            Toast.show(message, 'error');
        } finally {
            // Hide loading
            if (loginBtnText && loginSpinner) {
                loginBtnText.style.display = 'block';
                loginSpinner.style.display = 'none';
            }
        }
    });
    
    // Google sign in
    document.getElementById('googleSignupBtn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleSignIn);
    
    // Forgot password
    document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
        e.preventDefault();
        Toast.show('Password reset feature coming soon', 'info');
    });
    
    // Hide loading screen after 2 seconds
    setTimeout(() => {
        const loadingScreen = document.getElementById('loadingScreen');
        const authPage = document.getElementById('authPage');
        
        if (loadingScreen) loadingScreen.classList.add('hidden');
        if (authPage) authPage.style.display = 'flex';
    }, 2000);
}

async function handleGoogleSignIn() {
    try {
        const auth = window.firebaseAuth;
        const provider = window.firebaseGoogleProvider;
        
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if user exists in database
        const db = window.firebaseDatabase;
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
            // New user - create record
            const zynId = generateZYNID();
            const userData = {
                uid: user.uid,
                fullName: user.displayName || 'Google User',
                email: user.email,
                zynId: zynId,
                profilePic: user.photoURL,
                status: 'online',
                createdAt: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                isGoogleUser: true
            };
            
            await set(userRef, userData);
            Toast.show('Account created successfully!', 'success');
        } else {
            // Existing user - update status
            await update(userRef, {
                status: 'online',
                lastSeen: new Date().toISOString()
            });
            Toast.show('Login successful!', 'success');
        }
        
        // Redirect to home page
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1000);
        
    } catch (error) {
        console.error('Google sign in error:', error);
        Toast.show('Google sign in failed', 'error');
    }
}

// Make functions available globally for HTML event handlers
window.openMediaPreview = openMediaPreview;
window.navigateToChat = navigateToChat;
