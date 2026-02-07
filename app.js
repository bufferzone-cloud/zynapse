// ==================== ZYNAPSE CHAT APP - MAIN APPLICATION LOGIC ====================
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
    apiSecret: 'RHDQG1YP6jqvn4UADq3nJWHIeHQ',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse'
};

// Global Variables
let currentUser = null;
let currentUserData = null;
let currentChat = null;
let currentGroup = null;
let chatMessagesRef = null;
let contactsList = [];
let chatRequests = [];
let userStatus = {};
let activeListeners = [];
let typingTimeout = null;
let isTyping = false;
let notificationSound = new Audio('notification.mp3');

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Cloudinary instance
const cloudinary = cloudinary.Cloudinary.new({ cloud_name: CLOUDINARY_CONFIG.cloudName });

// ==================== AUTHENTICATION & INITIALIZATION ====================
function checkAuthState() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in
            await loadUserData(user.uid);
            await loadUserContacts();
            await loadChatRequests();
            await loadChatList();
            updateUserStatus(true);
            
            // Start presence monitoring
            startPresenceMonitoring();
            
            // Redirect to home if not already there
            if (!window.location.pathname.includes('home.html')) {
                window.location.href = 'home.html';
            }
        } else {
            // User is signed out
            if (window.location.pathname.includes('home.html') || 
                window.location.pathname.includes('chat.html')) {
                window.location.href = 'index.html';
            }
        }
    });
}

async function loadUserData(uid) {
    try {
        const userRef = database.ref('users/' + uid);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            currentUserData = snapshot.val();
            currentUserData.uid = uid;
            currentUser = auth.currentUser;
            
            // Update UI with user data
            updateUserUI();
            
            // Set up real-time listeners
            setupRealtimeListeners();
        } else {
            console.error('User data not found');
            await auth.signOut();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function updateUserUI() {
    if (!currentUserData) return;
    
    // Update header
    document.getElementById('userName').textContent = currentUserData.name;
    document.getElementById('userId').textContent = currentUserData.userId;
    
    // Update profile picture
    const profilePic = document.getElementById('profilePic');
    if (currentUserData.profileUrl) {
        profilePic.src = currentUserData.profileUrl;
        profilePic.style.display = 'block';
    }
    
    // Update profile dropdown
    document.getElementById('dropdownUserName').textContent = currentUserData.name;
    document.getElementById('dropdownUserId').textContent = currentUserData.userId;
    if (currentUserData.profileUrl) {
        document.getElementById('dropdownProfilePic').src = currentUserData.profileUrl;
    }
}

// ==================== CHAT FUNCTIONALITY ====================
async function startChat(userId) {
    try {
        // Find user by userId
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('userId').equalTo(userId).once('value');
        
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            const uid = Object.keys(snapshot.val())[0];
            
            // Check if chat already exists
            const chatId = generateChatId(currentUser.uid, uid);
            const chatRef = database.ref('chats/' + chatId);
            const chatSnapshot = await chatRef.once('value');
            
            if (!chatSnapshot.exists()) {
                // Create new chat
                const chatData = {
                    participants: {
                        [currentUser.uid]: true,
                        [uid]: true
                    },
                    lastMessage: '',
                    lastMessageTime: Date.now(),
                    unread: {
                        [uid]: 0
                    },
                    createdAt: Date.now()
                };
                
                await chatRef.set(chatData);
                
                // Add to user's chat list
                await database.ref('users/' + currentUser.uid + '/chats/' + chatId).set(true);
                await database.ref('users/' + uid + '/chats/' + chatId).set(true);
            }
            
            // Open chat
            window.location.href = `chat.html?chatId=${chatId}&userId=${uid}`;
        } else {
            showToast('User not found', 'error');
        }
    } catch (error) {
        console.error('Error starting chat:', error);
        showToast('Failed to start chat', 'error');
    }
}

function generateChatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

async function loadChatList() {
    try {
        if (!currentUserData?.chats) return;
        
        const chatList = document.getElementById('chatList');
        if (!chatList) return;
        
        chatList.innerHTML = '';
        const chatIds = Object.keys(currentUserData.chats);
        
        for (const chatId of chatIds) {
            const chatRef = database.ref('chats/' + chatId);
            const snapshot = await chatRef.once('value');
            
            if (snapshot.exists()) {
                const chatData = snapshot.val();
                
                // Get other participant
                const participants = Object.keys(chatData.participants);
                const otherUserId = participants.find(uid => uid !== currentUser.uid);
                
                if (otherUserId) {
                    const userRef = database.ref('users/' + otherUserId);
                    const userSnapshot = await userRef.once('value');
                    
                    if (userSnapshot.exists()) {
                        const userData = userSnapshot.val();
                        const chatItem = createChatItem(chatId, chatData, userData);
                        chatList.appendChild(chatItem);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error loading chat list:', error);
    }
}

function createChatItem(chatId, chatData, userData) {
    const div = document.createElement('div');
    div.className = 'chat-item';
    div.onclick = () => openChat(chatId, userData.userId);
    
    const lastMessage = chatData.lastMessage || 'No messages yet';
    const time = formatTime(chatData.lastMessageTime);
    const unread = chatData.unread?.[currentUser.uid] || 0;
    
    div.innerHTML = `
        <img src="${userData.profileUrl || 'zynaps.png'}" alt="${userData.name}" class="chat-avatar">
        <div class="chat-info">
            <h3>${userData.name}</h3>
            <p class="chat-preview">${lastMessage}</p>
        </div>
        <div class="chat-meta">
            <span class="chat-time">${time}</span>
            ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
    `;
    
    return div;
}

function openChat(chatId, userId) {
    window.location.href = `chat.html?chatId=${chatId}&userId=${userId}`;
}

// ==================== MESSAGING ====================
async function sendMessage(chatId, message, type = 'text', mediaUrl = null, metadata = null) {
    try {
        const messageId = database.ref().child('messages').push().key;
        const messageData = {
            id: messageId,
            chatId: chatId,
            senderId: currentUser.uid,
            senderName: currentUserData.name,
            senderUserId: currentUserData.userId,
            content: message,
            type: type,
            mediaUrl: mediaUrl,
            metadata: metadata,
            timestamp: Date.now(),
            readBy: {
                [currentUser.uid]: true
            }
        };
        
        // Save message
        await database.ref('messages/' + chatId + '/' + messageId).set(messageData);
        
        // Update chat
        await database.ref('chats/' + chatId).update({
            lastMessage: type === 'text' ? message : `Sent ${type}`,
            lastMessageTime: Date.now(),
            unread: {
                [currentUser.uid]: 0
            }
        });
        
        // Get other participant
        const chatRef = database.ref('chats/' + chatId + '/participants');
        const snapshot = await chatRef.once('value');
        const participants = snapshot.val();
        const otherUserId = Object.keys(participants).find(uid => uid !== currentUser.uid);
        
        if (otherUserId) {
            // Increment unread for other user
            await database.ref('chats/' + chatId + '/unread/' + otherUserId).transaction(current => (current || 0) + 1);
            
            // Send notification
            await sendNotification(otherUserId, {
                type: 'message',
                chatId: chatId,
                message: message,
                senderName: currentUserData.name
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error sending message:', error);
        return false;
    }
}

async function loadMessages(chatId) {
    try {
        const messagesRef = database.ref('messages/' + chatId);
        const messagesContainer = document.getElementById('chatMessages');
        
        if (!messagesContainer) return;
        
        messagesRef.orderByChild('timestamp').on('value', (snapshot) => {
            messagesContainer.innerHTML = '';
            
            if (snapshot.exists()) {
                const messages = snapshot.val();
                let lastDate = null;
                
                Object.values(messages).forEach(message => {
                    // Add date separator if needed
                    const messageDate = new Date(message.timestamp).toDateString();
                    if (messageDate !== lastDate) {
                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'message-date';
                        dateDiv.innerHTML = `<span class="date-label">${formatDate(message.timestamp)}</span>`;
                        messagesContainer.appendChild(dateDiv);
                        lastDate = messageDate;
                    }
                    
                    // Create message bubble
                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
                    
                    let contentHtml = '';
                    switch (message.type) {
                        case 'image':
                            contentHtml = `
                                <img src="${message.mediaUrl}" alt="Image" class="chat-media">
                                <div class="media-info">
                                    <i class="fas fa-image"></i>
                                    <span>Image</span>
                                </div>
                            `;
                            break;
                        case 'video':
                            contentHtml = `
                                <video src="${message.mediaUrl}" controls class="chat-media"></video>
                                <div class="media-info">
                                    <i class="fas fa-video"></i>
                                    <span>Video</span>
                                </div>
                            `;
                            break;
                        case 'document':
                            const fileName = message.metadata?.name || 'Document';
                            contentHtml = `
                                <div class="document-message">
                                    <div class="document-icon">
                                        <i class="fas fa-file"></i>
                                    </div>
                                    <div class="document-info">
                                        <div class="document-name">${fileName}</div>
                                        <div class="document-size">${formatFileSize(message.metadata?.size)}</div>
                                    </div>
                                    <a href="${message.mediaUrl}" download class="download-btn">
                                        <i class="fas fa-download"></i>
                                    </a>
                                </div>
                            `;
                            break;
                        case 'location':
                            contentHtml = `
                                <div class="location-message">
                                    <div class="location-map">
                                        <i class="fas fa-map-marker-alt"></i>
                                    </div>
                                    <div class="location-info">
                                        <div class="location-address">${message.metadata?.address || 'Location'}</div>
                                        <div class="location-details">
                                            <span>${message.metadata?.city || ''}</span>
                                            <span>${message.metadata?.country || ''}</span>
                                        </div>
                                    </div>
                                </div>
                            `;
                            break;
                        case 'voice':
                            contentHtml = `
                                <div class="voice-message">
                                    <button class="voice-play-btn" onclick="playVoiceMessage('${message.mediaUrl}')">
                                        <i class="fas fa-play"></i>
                                    </button>
                                    <div class="voice-waveform"></div>
                                    <span class="voice-duration">${message.metadata?.duration || '0:00'}</span>
                                </div>
                            `;
                            break;
                        default:
                            contentHtml = `<div class="message-text">${escapeHtml(message.content)}</div>`;
                    }
                    
                    messageDiv.innerHTML = `
                        <div class="message-bubble">
                            ${contentHtml}
                            <span class="message-time">${formatTime(message.timestamp)}</span>
                        </div>
                    `;
                    
                    messagesContainer.appendChild(messageDiv);
                });
                
                // Scroll to bottom
                setTimeout(() => {
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                }, 100);
                
                // Mark messages as read
                markMessagesAsRead(chatId);
            }
        });
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function markMessagesAsRead(chatId) {
    const messagesRef = database.ref('messages/' + chatId);
    messagesRef.orderByChild('timestamp').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((childSnapshot) => {
                const message = childSnapshot.val();
                if (message.senderId !== currentUser.uid && !message.readBy?.[currentUser.uid]) {
                    updates[`messages/${chatId}/${childSnapshot.key}/readBy/${currentUser.uid}`] = true;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                database.ref().update(updates);
                
                // Reset unread count
                database.ref('chats/' + chatId + '/unread/' + currentUser.uid).set(0);
            }
        }
    });
}

// ==================== FILE UPLOADS ====================
async function uploadToCloudinary(file, type) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
        formData.append('folder', `zynapse/${type}s`);
        
        // Set resource type based on file type
        let resourceType = 'auto';
        if (type === 'image') resourceType = 'image';
        if (type === 'video') resourceType = 'video';
        if (type === 'document') resourceType = 'raw';
        
        formData.append('resource_type', resourceType);
        
        fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`, {
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
        .catch(error => reject(error));
    });
}

async function uploadFile(file, type) {
    try {
        // Show progress
        showToast(`Uploading ${type}...`, 'info');
        
        // Upload to Cloudinary
        const result = await uploadToCloudinary(file, type);
        
        // Return result
        return {
            url: result.url,
            metadata: {
                name: file.name,
                size: file.size,
                type: file.type,
                format: result.format
            }
        };
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

async function captureLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    // Get address from coordinates
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                    );
                    const data = await response.json();
                    
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        address: data.display_name,
                        city: data.address?.city || data.address?.town || data.address?.village,
                        country: data.address?.country,
                        road: data.address?.road
                    });
                } catch (error) {
                    // Return coordinates even if address fails
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        address: `${position.coords.latitude}, ${position.coords.longitude}`
                    });
                }
            },
            (error) => {
                reject(error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

// ==================== CHAT REQUESTS ====================
async function sendChatRequest(receiverUserId) {
    try {
        // Find receiver by userId
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('userId').equalTo(receiverUserId).once('value');
        
        if (!snapshot.exists()) {
            showToast('User not found', 'error');
            return false;
        }
        
        const receiverData = snapshot.val();
        const receiverUid = Object.keys(receiverData)[0];
        
        // Check if request already exists
        const requestId = generateRequestId(currentUser.uid, receiverUid);
        const requestRef = database.ref('chatRequests/' + requestId);
        const requestSnapshot = await requestRef.once('value');
        
        if (requestSnapshot.exists()) {
            showToast('Request already sent', 'info');
            return false;
        }
        
        // Check if already contacts
        if (currentUserData.contacts?.[receiverUid]) {
            showToast('Already in contacts', 'info');
            return false;
        }
        
        // Create request
        const requestData = {
            id: requestId,
            senderId: currentUser.uid,
            senderUserId: currentUserData.userId,
            senderName: currentUserData.name,
            senderProfileUrl: currentUserData.profileUrl,
            receiverId: receiverUid,
            receiverUserId: receiverUserId,
            status: 'pending',
            timestamp: Date.now()
        };
        
        await requestRef.set(requestData);
        
        // Add to receiver's requests
        await database.ref(`users/${receiverUid}/chatRequests/${requestId}`).set(true);
        
        showToast('Chat request sent', 'success');
        return true;
    } catch (error) {
        console.error('Error sending chat request:', error);
        showToast('Failed to send request', 'error');
        return false;
    }
}

function generateRequestId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

async function loadChatRequests() {
    try {
        if (!currentUserData?.chatRequests) return;
        
        const requestIds = Object.keys(currentUserData.chatRequests);
        const requestsList = document.getElementById('requestsList');
        if (!requestsList) return;
        
        requestsList.innerHTML = '';
        
        for (const requestId of requestIds) {
            const requestRef = database.ref('chatRequests/' + requestId);
            const snapshot = await requestRef.once('value');
            
            if (snapshot.exists()) {
                const requestData = snapshot.val();
                
                // Only show pending requests where current user is receiver
                if (requestData.status === 'pending' && requestData.receiverId === currentUser.uid) {
                    const requestCard = createRequestCard(requestData);
                    requestsList.appendChild(requestCard);
                }
            }
        }
    } catch (error) {
        console.error('Error loading chat requests:', error);
    }
}

function createRequestCard(requestData) {
    const div = document.createElement('div');
    div.className = 'request-card';
    div.innerHTML = `
        <div class="request-header">
            <img src="${requestData.senderProfileUrl || 'zynaps.png'}" alt="${requestData.senderName}" class="request-avatar">
            <div class="request-info">
                <h4>${requestData.senderName}</h4>
                <p class="request-user-id">${requestData.senderUserId}</p>
            </div>
        </div>
        <div class="request-actions">
            <button class="action-btn accept-btn" onclick="handleChatRequest('${requestData.id}', 'accept')">
                <i class="fas fa-check"></i>
                Accept
            </button>
            <button class="action-btn reject-btn" onclick="handleChatRequest('${requestData.id}', 'reject')">
                <i class="fas fa-times"></i>
                Reject
            </button>
        </div>
    `;
    
    return div;
}

async function handleChatRequest(requestId, action) {
    try {
        const requestRef = database.ref('chatRequests/' + requestId);
        const snapshot = await requestRef.once('value');
        
        if (!snapshot.exists()) {
            showToast('Request not found', 'error');
            return;
        }
        
        const requestData = snapshot.val();
        
        if (action === 'accept') {
            // Update request status
            await requestRef.update({ status: 'accepted' });
            
            // Add to contacts both ways
            await database.ref(`users/${currentUser.uid}/contacts/${requestData.senderId}`).set(true);
            await database.ref(`users/${requestData.senderId}/contacts/${currentUser.uid}`).set(true);
            
            // Remove from requests
            await database.ref(`users/${currentUser.uid}/chatRequests/${requestId}`).remove();
            await database.ref(`users/${requestData.senderId}/chatRequests/${requestId}`).remove();
            
            showToast('Request accepted', 'success');
            
            // Start chat immediately
            setTimeout(() => {
                startChat(requestData.senderUserId);
            }, 1000);
            
        } else if (action === 'reject') {
            // Update request status
            await requestRef.update({ status: 'rejected' });
            
            // Remove from requests
            await database.ref(`users/${currentUser.uid}/chatRequests/${requestId}`).remove();
            await database.ref(`users/${requestData.senderId}/chatRequests/${requestId}`).remove();
            
            showToast('Request rejected', 'info');
        }
        
        // Reload requests
        await loadChatRequests();
        
    } catch (error) {
        console.error('Error handling chat request:', error);
        showToast('Failed to process request', 'error');
    }
}

// ==================== ZYNES (STATUS) ====================
async function createZyne(content, media = null, mediaType = null) {
    try {
        const zyneId = database.ref().child('zynes').push().key;
        const zyneData = {
            id: zyneId,
            userId: currentUser.uid,
            userUserId: currentUserData.userId,
            userName: currentUserData.name,
            userProfileUrl: currentUserData.profileUrl,
            content: content,
            mediaUrl: media,
            mediaType: mediaType,
            likes: {},
            comments: {},
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        // Save zyne
        await database.ref('zynes/' + zyneId).set(zyneData);
        
        // Add to user's zynes
        await database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).set(true);
        
        // Notify contacts
        if (currentUserData.contacts) {
            Object.keys(currentUserData.contacts).forEach(async (contactId) => {
                await sendNotification(contactId, {
                    type: 'zyne',
                    zyneId: zyneId,
                    userName: currentUserData.name
                });
            });
        }
        
        showToast('Zyne posted', 'success');
        return true;
    } catch (error) {
        console.error('Error creating zyne:', error);
        showToast('Failed to post zyne', 'error');
        return false;
    }
}

async function loadZynes() {
    try {
        const zynesRef = database.ref('zynes');
        const zynesList = document.getElementById('zynesList');
        if (!zynesList) return;
        
        zynesRef.orderByChild('timestamp').on('value', async (snapshot) => {
            zynesList.innerHTML = '';
            
            if (snapshot.exists()) {
                const zynes = snapshot.val();
                const currentTime = Date.now();
                
                // Filter zynes: only from contacts and not expired
                const filteredZynes = Object.values(zynes).filter(zyne => {
                    // Check if expired
                    if (zyne.expiresAt < currentTime) {
                        // Auto-delete expired zyne
                        database.ref('zynes/' + zyne.id).remove();
                        database.ref(`users/${zyne.userId}/zynes/${zyne.id}`).remove();
                        return false;
                    }
                    
                    // Show user's own zynes and zynes from contacts
                    return zyne.userId === currentUser.uid || 
                           currentUserData.contacts?.[zyne.userId];
                });
                
                // Sort by timestamp (newest first)
                filteredZynes.sort((a, b) => b.timestamp - a.timestamp);
                
                for (const zyne of filteredZynes) {
                    const zyneCard = await createZyneCard(zyne);
                    zynesList.appendChild(zyneCard);
                }
                
                if (filteredZynes.length === 0) {
                    zynesList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-images"></i>
                            <h3>No Zynes yet</h3>
                            <p>Share updates with your contacts</p>
                        </div>
                    `;
                }
            }
        });
    } catch (error) {
        console.error('Error loading zynes:', error);
    }
}

async function createZyneCard(zyne) {
    const div = document.createElement('div');
    div.className = 'zyne-card';
    
    // Check if liked
    const isLiked = zyne.likes?.[currentUser.uid] || false;
    const likeCount = Object.keys(zyne.likes || {}).length;
    const commentCount = Object.keys(zyne.comments || {}).length;
    
    let mediaHtml = '';
    if (zyne.mediaUrl) {
        if (zyne.mediaType === 'image') {
            mediaHtml = `<img src="${zyne.mediaUrl}" alt="Zyne" class="zyne-media">`;
        } else if (zyne.mediaType === 'video') {
            mediaHtml = `<video src="${zyne.mediaUrl}" controls class="zyne-media"></video>`;
        }
    }
    
    // Load comments
    let commentsHtml = '';
    if (zyne.comments) {
        const comments = Object.values(zyne.comments).slice(0, 3); // Show only 3
        commentsHtml = comments.map(comment => `
            <div class="comment-item">
                <img src="${comment.userProfileUrl || 'zynaps.png'}" alt="${comment.userName}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-text">${comment.content}</div>
                    <div class="comment-info">
                        <span>${comment.userName}</span>
                        <span>${formatTime(comment.timestamp)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    div.innerHTML = `
        <div class="zyne-header">
            <img src="${zyne.userProfileUrl || 'zynaps.png'}" alt="${zyne.userName}" class="zyne-avatar">
            <div class="zyne-user-info">
                <h4>${zyne.userName}</h4>
                <span class="zyne-time">${formatTime(zyne.timestamp)}</span>
            </div>
            ${zyne.userId === currentUser.uid ? `
            <button class="icon-btn" onclick="deleteZyne('${zyne.id}')">
                <i class="fas fa-trash"></i>
            </button>
            ` : ''}
        </div>
        <div class="zyne-content">
            ${zyne.content ? `<div class="zyne-text">${escapeHtml(zyne.content)}</div>` : ''}
            ${mediaHtml}
        </div>
        <div class="zyne-stats">
            <span>${likeCount} like${likeCount !== 1 ? 's' : ''}</span>
            <span>${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>
        </div>
        <div class="zyne-actions">
            <button class="zyne-action-btn ${isLiked ? 'liked' : ''}" onclick="likeZyne('${zyne.id}', ${!isLiked})">
                <i class="fas fa-heart"></i>
                <span>Like</span>
            </button>
            <button class="zyne-action-btn" onclick="showCommentInput('${zyne.id}')">
                <i class="fas fa-comment"></i>
                <span>Comment</span>
            </button>
        </div>
        <div class="zyne-comments">
            <input type="text" class="comment-input hidden" id="commentInput-${zyne.id}" placeholder="Write a comment...">
            <div class="comment-list">
                ${commentsHtml}
            </div>
        </div>
    `;
    
    return div;
}

async function likeZyne(zyneId, like) {
    try {
        const updatePath = `zynes/${zyneId}/likes/${currentUser.uid}`;
        
        if (like) {
            await database.ref(updatePath).set(true);
        } else {
            await database.ref(updatePath).remove();
        }
    } catch (error) {
        console.error('Error liking zyne:', error);
    }
}

async function addComment(zyneId, content) {
    try {
        const commentId = database.ref().child('comments').push().key;
        const commentData = {
            id: commentId,
            zyneId: zyneId,
            userId: currentUser.uid,
            userName: currentUserData.name,
            userProfileUrl: currentUserData.profileUrl,
            content: content,
            timestamp: Date.now()
        };
        
        await database.ref(`zynes/${zyneId}/comments/${commentId}`).set(commentData);
        
        // Notify zyne owner
        const zyneRef = database.ref('zynes/' + zyneId);
        const snapshot = await zyneRef.once('value');
        const zyne = snapshot.val();
        
        if (zyne.userId !== currentUser.uid) {
            await sendNotification(zyne.userId, {
                type: 'comment',
                zyneId: zyneId,
                userName: currentUserData.name
            });
        }
        
        return true;
    } catch (error) {
        console.error('Error adding comment:', error);
        return false;
    }
}

async function deleteZyne(zyneId) {
    try {
        await database.ref('zynes/' + zyneId).remove();
        await database.ref(`users/${currentUser.uid}/zynes/${zyneId}`).remove();
        showToast('Zyne deleted', 'info');
    } catch (error) {
        console.error('Error deleting zyne:', error);
        showToast('Failed to delete zyne', 'error');
    }
}

// ==================== GROUPS ====================
async function createGroup(name, members, photo = null) {
    try {
        const groupId = database.ref().child('groups').push().key;
        
        // Upload group photo if provided
        let groupPhotoUrl = photo;
        if (photo instanceof File) {
            const uploadResult = await uploadFile(photo, 'image');
            groupPhotoUrl = uploadResult.url;
        }
        
        // Create members object
        const membersObj = {};
        members.forEach(memberId => {
            membersObj[memberId] = {
                joinedAt: Date.now(),
                role: memberId === currentUser.uid ? 'admin' : 'member'
            };
        });
        
        const groupData = {
            id: groupId,
            name: name,
            photoUrl: groupPhotoUrl,
            createdBy: currentUser.uid,
            createdAt: Date.now(),
            members: membersObj,
            messages: {},
            lastMessage: '',
            lastMessageTime: Date.now()
        };
        
        // Save group
        await database.ref('groups/' + groupId).set(groupData);
        
        // Add group to each member's groups
        for (const memberId of members) {
            await database.ref(`users/${memberId}/groups/${groupId}`).set(true);
        }
        
        showToast('Group created', 'success');
        return groupId;
    } catch (error) {
        console.error('Error creating group:', error);
        showToast('Failed to create group', 'error');
        return null;
    }
}

async function loadGroups() {
    try {
        if (!currentUserData?.groups) return;
        
        const groupIds = Object.keys(currentUserData.groups);
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        groupsList.innerHTML = '';
        
        for (const groupId of groupIds) {
            const groupRef = database.ref('groups/' + groupId);
            const snapshot = await groupRef.once('value');
            
            if (snapshot.exists()) {
                const groupData = snapshot.val();
                const groupCard = createGroupCard(groupData);
                groupsList.appendChild(groupCard);
            }
        }
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

function createGroupCard(groupData) {
    const div = document.createElement('div');
    div.className = 'group-card';
    div.onclick = () => openGroup(groupData.id);
    
    const memberCount = Object.keys(groupData.members || {}).length;
    
    div.innerHTML = `
        <img src="${groupData.photoUrl || 'zynaps.png'}" alt="${groupData.name}" class="group-avatar">
        <div class="group-info">
            <h3>${groupData.name}</h3>
            <p class="group-members">
                <i class="fas fa-users"></i>
                ${memberCount} member${memberCount !== 1 ? 's' : ''}
            </p>
        </div>
    `;
    
    return div;
}

function openGroup(groupId) {
    window.location.href = `chat.html?groupId=${groupId}`;
}

// ==================== CONTACTS ====================
async function loadUserContacts() {
    try {
        if (!currentUserData?.contacts) return;
        
        const contactIds = Object.keys(currentUserData.contacts);
        contactsList = [];
        
        for (const contactId of contactIds) {
            const userRef = database.ref('users/' + contactId);
            const snapshot = await userRef.once('value');
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                contactsList.push({
                    uid: contactId,
                    ...userData
                });
            }
        }
        
        // Update contacts UI if on contacts page
        updateContactsUI();
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

function updateContactsUI() {
    const contactsListElem = document.getElementById('contactsList');
    if (!contactsListElem) return;
    
    contactsListElem.innerHTML = '';
    
    if (contactsList.length === 0) {
        contactsListElem.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No contacts yet</h3>
                <p>Start chatting to add contacts</p>
            </div>
        `;
        return;
    }
    
    contactsList.forEach(contact => {
        const contactCard = document.createElement('div');
        contactCard.className = 'contact-card';
        
        const isOnline = userStatus[contact.uid] === 'online';
        const lastSeen = contact.lastSeen ? formatTime(contact.lastSeen) : 'Never';
        
        contactCard.innerHTML = `
            <img src="${contact.profileUrl || 'zynaps.png'}" alt="${contact.name}" class="contact-avatar">
            <div class="contact-info">
                <h3>${contact.name}</h3>
                <div class="contact-status">
                    <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                    <span>${isOnline ? 'Online' : `Last seen ${lastSeen}`}</span>
                </div>
            </div>
            <div class="contact-actions">
                <button class="icon-btn" onclick="startChat('${contact.userId}')">
                    <i class="fas fa-comment"></i>
                </button>
            </div>
        `;
        
        contactsListElem.appendChild(contactCard);
    });
}

// ==================== PRESENCE & TYPING ====================
function startPresenceMonitoring() {
    // Set user as online
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val()) {
            // User is online
            const userStatusRef = database.ref('users/' + currentUser.uid + '/status');
            userStatusRef.set('online');
            userStatusRef.onDisconnect().set('offline');
            
            const lastSeenRef = database.ref('users/' + currentUser.uid + '/lastSeen');
            lastSeenRef.onDisconnect().set(Date.now());
        }
    });
    
    // Listen to contacts status
    if (currentUserData?.contacts) {
        Object.keys(currentUserData.contacts).forEach(contactId => {
            const statusRef = database.ref('users/' + contactId + '/status');
            statusRef.on('value', (snapshot) => {
                userStatus[contactId] = snapshot.val() || 'offline';
                
                // Update UI if on contacts page
                updateContactsUI();
            });
        });
    }
}

function updateUserStatus(online) {
    if (!currentUser || !currentUser.uid) return;
    
    const status = online ? 'online' : 'offline';
    const updates = {
        status: status,
        lastSeen: Date.now()
    };
    
    database.ref('users/' + currentUser.uid).update(updates);
}

async function sendTypingIndicator(chatId, typing) {
    if (!currentUser || !chatId) return;
    
    try {
        const typingRef = database.ref(`typing/${chatId}/${currentUser.uid}`);
        
        if (typing) {
            await typingRef.set({
                userId: currentUser.uid,
                userName: currentUserData.name,
                timestamp: Date.now()
            });
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                typingRef.remove();
            }, 3000);
        } else {
            await typingRef.remove();
        }
    } catch (error) {
        console.error('Error sending typing indicator:', error);
    }
}

function setupTypingListener(chatId) {
    const typingRef = database.ref(`typing/${chatId}`);
    typingRef.on('value', (snapshot) => {
        const typingContainer = document.getElementById('typingIndicator');
        if (!typingContainer) return;
        
        if (snapshot.exists()) {
            const typingData = snapshot.val();
            const typers = Object.values(typingData).filter(typer => 
                typer.userId !== currentUser.uid
            );
            
            if (typers.length > 0) {
                const names = typers.map(typer => typer.userName).join(', ');
                typingContainer.style.display = 'flex';
                typingContainer.querySelector('.typing-text').textContent = `${names} ${typers.length === 1 ? 'is' : 'are'} typing...`;
            } else {
                typingContainer.style.display = 'none';
            }
        } else {
            typingContainer.style.display = 'none';
        }
    });
}

// ==================== NOTIFICATIONS ====================
async function sendNotification(userId, notification) {
    try {
        const notificationId = database.ref().child('notifications').push().key;
        const notificationData = {
            id: notificationId,
            userId: userId,
            type: notification.type,
            data: notification,
            read: false,
            timestamp: Date.now()
        };
        
        await database.ref('notifications/' + notificationId).set(notificationData);
        
        // Play sound if notification sound is enabled
        const playSound = localStorage.getItem('notificationSound') !== 'false';
        if (playSound) {
            notificationSound.play().catch(() => {
                // Auto-play might be blocked, ignore
            });
        }
        
        // Update badge count
        updateNotificationBadge();
        
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
}

function updateNotificationBadge() {
    // Update chat request badge
    const requestBadge = document.querySelector('.nav-item:nth-child(4) .badge');
    if (requestBadge && currentUserData?.chatRequests) {
        const pendingCount = Object.keys(currentUserData.chatRequests || {}).length;
        if (pendingCount > 0) {
            requestBadge.textContent = pendingCount > 9 ? '9+' : pendingCount;
            requestBadge.style.display = 'flex';
        } else {
            requestBadge.style.display = 'none';
        }
    }
    
    // Update chat unread badges
    const chatBadge = document.querySelector('.nav-item:nth-child(1) .badge');
    if (chatBadge) {
        // Calculate total unread messages
        let totalUnread = 0;
        
        if (currentUserData?.chats) {
            Object.keys(currentUserData.chats).forEach(async (chatId) => {
                const chatRef = database.ref('chats/' + chatId + '/unread/' + currentUser.uid);
                const snapshot = await chatRef.once('value');
                const unread = snapshot.val() || 0;
                totalUnread += unread;
            });
        }
        
        if (totalUnread > 0) {
            chatBadge.textContent = totalUnread > 9 ? '9+' : totalUnread;
            chatBadge.style.display = 'flex';
        } else {
            chatBadge.style.display = 'none';
        }
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatTime(timestamp) {
    if (!timestamp) return '';
    
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
    
    // Return date in MM/DD format
    return `${date.getMonth() + 1}/${date.getDate()}`;
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
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || (() => {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    })();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Copied to clipboard', 'success');
    });
}

function setupRealtimeListeners() {
    // Listen for new chat requests
    if (currentUser.uid) {
        const requestsRef = database.ref('users/' + currentUser.uid + '/chatRequests');
        requestsRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                loadChatRequests();
                updateNotificationBadge();
            }
        });
        
        // Listen for new messages
        if (currentUserData?.chats) {
            Object.keys(currentUserData.chats).forEach(chatId => {
                const unreadRef = database.ref('chats/' + chatId + '/unread/' + currentUser.uid);
                unreadRef.on('value', () => {
                    updateNotificationBadge();
                });
            });
        }
    }
}

// ==================== EVENT HANDLERS ====================
function handleMessageInput(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendCurrentMessage();
    } else {
        // Handle typing indicator
        clearTimeout(typingTimeout);
        
        if (!isTyping && event.target.value.trim()) {
            isTyping = true;
            const chatId = getChatIdFromURL();
            if (chatId) sendTypingIndicator(chatId, true);
        }
        
        typingTimeout = setTimeout(() => {
            isTyping = false;
            const chatId = getChatIdFromURL();
            if (chatId) sendTypingIndicator(chatId, false);
        }, 1000);
    }
}

async function sendCurrentMessage() {
    const input = document.getElementById('messageInput');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    const chatId = getChatIdFromURL();
    if (!chatId) return;
    
    input.value = '';
    
    // Send message
    await sendMessage(chatId, message, 'text');
    
    // Stop typing indicator
    clearTimeout(typingTimeout);
    isTyping = false;
    await sendTypingIndicator(chatId, false);
}

function getChatIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('chatId') || urlParams.get('groupId');
}

function playVoiceMessage(url) {
    const audio = new Audio(url);
    audio.play().catch(error => {
        console.error('Error playing voice message:', error);
        showToast('Cannot play voice message', 'error');
    });
}

function showCommentInput(zyneId) {
    const input = document.getElementById(`commentInput-${zyneId}`);
    if (input) {
        input.classList.toggle('hidden');
        input.focus();
        
        input.onkeypress = async (event) => {
            if (event.key === 'Enter' && event.target.value.trim()) {
                await addComment(zyneId, event.target.value.trim());
                event.target.value = '';
                event.target.classList.add('hidden');
            }
        };
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Check auth state
    checkAuthState();
    
    // Initialize page specific functions
    if (window.location.pathname.includes('home.html')) {
        initHomePage();
    } else if (window.location.pathname.includes('chat.html')) {
        initChatPage();
    }
});

function initHomePage() {
    // Set up floating button
    const floatingBtn = document.getElementById('floatingBtn');
    if (floatingBtn) {
        floatingBtn.addEventListener('click', () => {
            showStartChatModal();
        });
    }
    
    // Set up navigation
    setupNavigation();
    
    // Set up profile dropdown
    setupProfileDropdown();
    
    // Load initial data
    updateNotificationBadge();
}

function initChatPage() {
    const chatId = getChatIdFromURL();
    if (chatId) {
        // Load messages
        loadMessages(chatId);
        
        // Set up typing listener
        setupTypingListener(chatId);
        
        // Set up message input
        const input = document.getElementById('messageInput');
        if (input) {
            input.addEventListener('keydown', handleMessageInput);
        }
        
        // Set up send button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', sendCurrentMessage);
        }
        
        // Set up attachment button
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', toggleAttachmentOptions);
        }
        
        // Set up attachment options
        setupAttachmentOptions();
    }
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            const page = item.getAttribute('data-page');
            if (page) {
                showPage(page);
            }
        });
    });
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(`${pageName}Page`);
    if (page) {
        page.classList.add('active');
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.nav-item[data-page="${pageName}"]`).classList.add('active');
        
        // Load page specific content
        switch(pageName) {
            case 'home':
                loadChatList();
                break;
            case 'zynes':
                loadZynes();
                break;
            case 'groups':
                loadGroups();
                break;
            case 'contacts':
                updateContactsUI();
                break;
            case 'requests':
                loadChatRequests();
                break;
        }
    }
}

function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');
    
    if (profileBtn && dropdown) {
        profileBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            dropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
        });
    }
}

function showStartChatModal() {
    const modal = document.getElementById('startChatModal');
    if (modal) {
        modal.classList.add('active');
        
        // Clear input
        const input = modal.querySelector('input');
        if (input) input.value = '';
        
        // Focus input
        setTimeout(() => {
            input.focus();
        }, 100);
    }
}

function closeModal() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
}

async function searchUser() {
    const input = document.getElementById('searchUserId');
    const resultDiv = document.getElementById('searchResult');
    
    if (!input || !resultDiv) return;
    
    const userId = input.value.trim().toUpperCase();
    if (!userId.startsWith('ZYN-')) {
        showToast('Enter a valid ZYN-XXXX ID', 'error');
        return;
    }
    
    try {
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('userId').equalTo(userId).once('value');
        
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            const uid = Object.keys(snapshot.val())[0];
            
            // Don't show current user
            if (uid === currentUser.uid) {
                resultDiv.innerHTML = `
                    <div class="user-found">
                        <div class="user-found-info">
                            <h4>That's you!</h4>
                            <p>You cannot chat with yourself</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Check if already in contacts
            const isContact = currentUserData.contacts?.[uid];
            
            resultDiv.innerHTML = `
                <div class="user-found">
                    <img src="${userData.profileUrl || 'zynaps.png'}" alt="${userData.name}" class="user-found-avatar">
                    <div class="user-found-info">
                        <h4>${userData.name}</h4>
                        <p>${userData.userId}</p>
                    </div>
                </div>
                <div class="modal-actions">
                    ${isContact ? `
                    <button class="action-btn" onclick="startChat('${userId}')">
                        <i class="fas fa-comment"></i>
                        Start Chat
                    </button>
                    ` : `
                    <button class="action-btn" onclick="sendChatRequest('${userId}')">
                        <i class="fas fa-user-plus"></i>
                        Send Request
                    </button>
                    `}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-times"></i>
                    <h3>User not found</h3>
                    <p>Check the User ID and try again</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error searching user:', error);
        showToast('Search failed', 'error');
    }
}

function toggleAttachmentOptions() {
    const options = document.getElementById('attachmentOptions');
    if (options) {
        options.classList.toggle('show');
    }
}

function setupAttachmentOptions() {
    const options = document.getElementById('attachmentOptions');
    if (!options) return;
    
    // Close when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#attachmentOptions') && !event.target.closest('#attachBtn')) {
            options.classList.remove('show');
        }
    });
    
    // Set up attachment buttons
    const buttons = options.querySelectorAll('.attachment-btn');
    buttons.forEach(button => {
        button.addEventListener('click', async () => {
            const type = button.getAttribute('data-type');
            await handleAttachment(type);
            options.classList.remove('show');
        });
    });
}

async function handleAttachment(type) {
    const chatId = getChatIdFromURL();
    if (!chatId) return;
    
    try {
        switch(type) {
            case 'image':
            case 'video':
            case 'document':
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = type === 'image' ? 'image/*' : 
                              type === 'video' ? 'video/*' : 
                              '*';
                input.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;
                    
                    // Validate file size (50MB max)
                    if (file.size > 50 * 1024 * 1024) {
                        showToast('File too large (max 50MB)', 'error');
                        return;
                    }
                    
                    const uploadResult = await uploadFile(file, type);
                    await sendMessage(
                        chatId, 
                        type === 'image' ? '📷 Image' : 
                        type === 'video' ? '🎥 Video' : 
                        '📄 Document',
                        type,
                        uploadResult.url,
                        uploadResult.metadata
                    );
                };
                input.click();
                break;
                
            case 'location':
                showToast('Getting location...', 'info');
                const location = await captureLocation();
                await sendMessage(
                    chatId,
                    '📍 Location',
                    'location',
                    null,
                    location
                );
                break;
                
            case 'voice':
                startVoiceRecording(chatId);
                break;
        }
    } catch (error) {
        console.error('Error handling attachment:', error);
        showToast('Failed to send attachment', 'error');
    }
}

function startVoiceRecording(chatId) {
    // Check if browser supports recording
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording not supported', 'error');
        return;
    }
    
    showToast('Recording... Click to stop', 'info');
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];
            
            mediaRecorder.start();
            
            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });
            
            // Stop recording when user clicks anywhere
            const stopRecording = () => {
                mediaRecorder.stop();
                stream.getTracks().forEach(track => track.stop());
                
                mediaRecorder.addEventListener("stop", async () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
                    
                    // Upload and send
                    const uploadResult = await uploadFile(audioFile, 'audio');
                    await sendMessage(
                        chatId,
                        '🎤 Voice message',
                        'voice',
                        uploadResult.url,
                        { duration: Math.round(audioBlob.size / 16000) } // Approximate duration
                    );
                });
                
                document.removeEventListener('click', stopRecording);
                showToast('Recording stopped', 'info');
            };
            
            document.addEventListener('click', stopRecording);
        })
        .catch(error => {
            console.error('Error recording voice:', error);
            showToast('Cannot access microphone', 'error');
        });
}

// ==================== SIGN OUT ====================
async function signOut() {
    try {
        // Update status to offline
        await updateUserStatus(false);
        
        // Sign out from Firebase
        await auth.signOut();
        
        // Clear local data
        currentUser = null;
        currentUserData = null;
        
        // Redirect to login
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Failed to sign out', 'error');
    }
}

// ==================== WINDOW EVENT HANDLERS ====================
window.addEventListener('beforeunload', () => {
    if (currentUser && currentUser.uid) {
        updateUserStatus(false);
    }
});

window.addEventListener('online', () => {
    if (currentUser && currentUser.uid) {
        updateUserStatus(true);
    }
});

window.addEventListener('offline', () => {
    if (currentUser && currentUser.uid) {
        updateUserStatus(false);
    }
});

// Export functions for HTML inline handlers
window.copyUserId = function() {
    if (currentUserData?.userId) {
        copyToClipboard(currentUserData.userId);
    }
};

window.togglePassword = function(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};
