// Zynapse Application Core Logic

// Global variables
let currentUser = null;
let currentUserId = null;
let currentChatId = null;

// Sound notification
const notificationSound = new Audio('notification.mp3');

// Initialize ImageKit
const imagekit = new ImageKit({
    publicKey: "public_ugkwxlGDdps1zlFIMABNqd+oNZw=",
    urlEndpoint: "https://ik.imagekit.io/48l5ydkzy",
    authenticationEndpoint: "https://imagekit-auth.onrender.com/auth"
});

// Authentication state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData();
    } else {
        window.location.href = 'index.html';
    }
});

// Load current user data
async function loadUserData() {
    try {
        const snapshot = await database.ref('users').orderByChild('email').equalTo(currentUser.email).once('value');
        if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            currentUserId = userData.userId;
            
            // Set user online
            await database.ref('users/' + currentUserId + '/status').set('online');
            
            // Set up disconnect handler
            database.ref('.info/connected').on('value', (snap) => {
                if (snap.val() === true) {
                    database.ref('users/' + currentUserId + '/lastSeen').onDisconnect().set(Date.now());
                    database.ref('users/' + currentUserId + '/status').onDisconnect().set('offline');
                }
            });
            
            // Start listening for real-time updates
            setupRealTimeListeners();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Setup real-time listeners
function setupRealTimeListeners() {
    if (!currentUserId) return;
    
    // Listen for new chat requests
    database.ref('chatRequests/' + currentUserId).on('child_added', (snapshot) => {
        const request = snapshot.val();
        if (request) {
            playNotificationSound();
            updateChatRequestsUI(request, snapshot.key);
        }
    });
    
    // Listen for new messages
    database.ref('userChats/' + currentUserId).on('child_added', (snapshot) => {
        loadContacts(); // Refresh contacts when new chat is added
    });
    
    // Listen for new zynes from contacts
    database.ref('zynes').on('child_added', (snapshot) => {
        const zyne = snapshot.val();
        if (zyne && zyne.userId !== currentUserId) {
            // Check if this user is in contacts
            checkAndAddZyne(zyne, snapshot.key);
        }
    });
}

// Play notification sound
function playNotificationSound() {
    try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}

// Load contacts
async function loadContacts() {
    try {
        const snapshot = await database.ref('userContacts/' + currentUserId).once('value');
        const contacts = snapshot.val() || {};
        
        const contactsList = document.getElementById('contactsList');
        if (!contactsList) return;
        
        contactsList.innerHTML = '';
        
        for (const userId in contacts) {
            const userSnapshot = await database.ref('users/' + userId).once('value');
            const userData = userSnapshot.val();
            
            if (userData) {
                const lastMessage = await getLastMessage(userId);
                const contactItem = createContactElement(userData, lastMessage);
                contactsList.appendChild(contactItem);
            }
        }
        
        if (Object.keys(contacts).length === 0) {
            contactsList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No contacts yet. Start a chat to add contacts!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

// Get last message with a user
async function getLastMessage(otherUserId) {
    try {
        const chatId = [currentUserId, otherUserId].sort().join('_');
        const snapshot = await database.ref('chats/' + chatId + '/messages')
            .orderByChild('timestamp')
            .limitToLast(1)
            .once('value');
        
        if (snapshot.exists()) {
            const messages = snapshot.val();
            return Object.values(messages)[0];
        }
    } catch (error) {
        console.error('Error getting last message:', error);
    }
    return null;
}

// Create contact element
function createContactElement(userData, lastMessage = null) {
    const div = document.createElement('div');
    div.className = 'contact-item';
    div.onclick = () => openChat(userData.userId);
    
    const statusClass = userData.status === 'online' ? 'online' : 'offline';
    const lastSeen = lastMessage ? formatTime(lastMessage.timestamp) : 'No messages yet';
    
    div.innerHTML = `
        <img src="${userData.profileUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23C7C7CC\'%3E%3Cpath d=\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\'/%3E%3C/svg%3E'}" 
             alt="${userData.name}" class="contact-avatar">
        <div class="contact-info">
            <div class="contact-name">${userData.name}</div>
            <div class="contact-last-seen">${lastMessage ? lastMessage.text : 'No messages yet'}</div>
        </div>
        <div class="contact-status ${statusClass}"></div>
    `;
    
    return div;
}

// Load chat requests
async function loadChatRequests() {
    try {
        const snapshot = await database.ref('chatRequests/' + currentUserId).once('value');
        const requests = snapshot.val() || {};
        
        const requestsList = document.getElementById('chatRequestsList');
        if (!requestsList) return;
        
        requestsList.innerHTML = '';
        
        for (const requestId in requests) {
            const request = requests[requestId];
            const userSnapshot = await database.ref('users/' + request.senderId).once('value');
            const userData = userSnapshot.val();
            
            if (userData && request.status === 'pending') {
                const requestCard = createRequestCard(userData, requestId);
                requestsList.appendChild(requestCard);
            }
        }
        
        if (Object.keys(requests).length === 0) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No pending chat requests</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading chat requests:', error);
    }
}

// Create chat request card
function createRequestCard(userData, requestId) {
    const div = document.createElement('div');
    div.className = 'request-card';
    
    div.innerHTML = `
        <img src="${userData.profileUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23C7C7CC\'%3E%3Cpath d=\'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z\'/%3E%3C/svg%3E'}" 
             alt="${userData.name}" class="request-avatar">
        <div class="request-info">
            <div class="request-name">${userData.name}</div>
            <div class="request-id">${userData.userId}</div>
        </div>
        <div class="request-actions">
            <button class="btn btn-primary btn-small" onclick="acceptChatRequest('${requestId}', '${userData.userId}')">
                Accept
            </button>
            <button class="btn btn-secondary btn-small" onclick="rejectChatRequest('${requestId}')">
                Reject
            </button>
        </div>
    `;
    
    return div;
}

// Load groups
async function loadGroups() {
    try {
        const snapshot = await database.ref('userGroups/' + currentUserId).once('value');
        const groups = snapshot.val() || {};
        
        const groupsList = document.getElementById('groupsList');
        if (!groupsList) return;
        
        groupsList.innerHTML = '';
        
        for (const groupId in groups) {
            const groupSnapshot = await database.ref('groups/' + groupId).once('value');
            const groupData = groupSnapshot.val();
            
            if (groupData) {
                const groupCard = createGroupCard(groupData, groupId);
                groupsList.appendChild(groupCard);
            }
        }
        
        if (Object.keys(groups).length === 0) {
            groupsList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No groups yet. Create one to get started!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

// Create group card
function createGroupCard(groupData, groupId) {
    const div = document.createElement('div');
    div.className = 'group-card';
    div.onclick = () => openGroupChat(groupId);
    
    div.innerHTML = `
        <img src="${groupData.photoUrl || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23C7C7CC\'%3E%3Cpath d=\'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\'/%3E%3C/svg%3E'}" 
             alt="${groupData.name}" class="group-avatar">
        <div class="group-name">${groupData.name}</div>
        <div class="group-members">${groupData.memberCount || 0} members</div>
    `;
    
    return div;
}

// Load zynes
async function loadZynes() {
    try {
        // Get contacts first
        const contactsSnapshot = await database.ref('userContacts/' + currentUserId).once('value');
        const contacts = contactsSnapshot.val() || {};
        
        const zynesList = document.getElementById('zynesList');
        if (!zynesList) return;
        
        zynesList.innerHTML = '';
        
        // Load zynes from contacts and self
        const allUserIds = [currentUserId, ...Object.keys(contacts)];
        
        for (const userId of allUserIds) {
            const zynesSnapshot = await database.ref('zynes').orderByChild('userId').equalTo(userId).once('value');
            const zynes = zynesSnapshot.val();
            
            if (zynes) {
                const userSnapshot = await database.ref('users/' + userId).once('value');
                const userData = userSnapshot.val();
                
                for (const zyneId in zynes) {
                    const zyne = zynes[zyneId];
                    if (Date.now() - zyne.timestamp < 24 * 60 * 60 * 1000) { // 24 hours
                        const zyneCard = createZyneCard(zyne, userData);
                        zynesList.appendChild(zyneCard);
                    } else {
                        // Remove expired zyne
                        database.ref('zynes/' + zyneId).remove();
                    }
                }
            }
        }
        
        if (zynesList.children.length === 0) {
            zynesList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No zynes available. Create one or wait for friends to post!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading zynes:', error);
    }
}

// Create zyne card
function createZyneCard(zyne, userData) {
    const div = document.createElement('div');
    div.className = 'zyne-card';
    
    let content = '';
    if (zyne.type === 'image' || zyne.type === 'video') {
        content = `<img src="${zyne.mediaUrl}" alt="Zyne" class="zyne-media">`;
    } else {
        content = `<div class="zyne-text">${zyne.text}</div>`;
    }
    
    div.innerHTML = `
        ${content}
        <div class="zyne-text">
            <strong>${userData.name}</strong><br>
            ${zyne.type === 'text' ? '' : zyne.text || ''}
        </div>
        <div class="zyne-time">${formatTime(zyne.timestamp)}</div>
    `;
    
    return div;
}

// Send chat request
async function sendChatRequest() {
    const recipientId = document.getElementById('recipientId').value.trim().toUpperCase();
    
    if (!recipientId || !recipientId.startsWith('ZYN-') || recipientId === currentUserId) {
        showError('Please enter a valid User ID');
        return;
    }
    
    try {
        // Check if user exists
        const userSnapshot = await database.ref('users/' + recipientId).once('value');
        if (!userSnapshot.exists()) {
            showError('User not found');
            return;
        }
        
        // Check if already in contacts
        const contactSnapshot = await database.ref('userContacts/' + currentUserId + '/' + recipientId).once('value');
        if (contactSnapshot.exists()) {
            showError('User is already in your contacts');
            return;
        }
        
        // Check if request already exists
        const requestsRef = database.ref('chatRequests/' + recipientId);
        const existingRequest = await requestsRef.orderByChild('senderId').equalTo(currentUserId).once('value');
        if (existingRequest.exists()) {
            showError('Request already sent');
            return;
        }
        
        // Create chat request
        const requestId = database.ref('chatRequests/' + recipientId).push().key;
        await database.ref('chatRequests/' + recipientId + '/' + requestId).set({
            senderId: currentUserId,
            recipientId: recipientId,
            status: 'pending',
            timestamp: Date.now()
        });
        
        showSuccess('Chat request sent successfully');
        closePopup('startChatPopup');
        
    } catch (error) {
        console.error('Error sending chat request:', error);
        showError('Failed to send request');
    }
}

// Accept chat request
async function acceptChatRequest(requestId, senderId) {
    try {
        // Update request status
        await database.ref('chatRequests/' + currentUserId + '/' + requestId).update({
            status: 'accepted',
            acceptedAt: Date.now()
        });
        
        // Add to contacts for both users
        const senderSnapshot = await database.ref('users/' + senderId).once('value');
        const senderData = senderSnapshot.val();
        
        await database.ref('userContacts/' + currentUserId + '/' + senderId).set({
            addedAt: Date.now()
        });
        
        await database.ref('userContacts/' + senderId + '/' + currentUserId).set({
            addedAt: Date.now()
        });
        
        // Create chat between users
        const chatId = [currentUserId, senderId].sort().join('_');
        await database.ref('chats/' + chatId).set({
            participants: [currentUserId, senderId],
            createdAt: Date.now(),
            lastMessage: {
                text: 'You are now connected on Zynapse!',
                senderId: 'system',
                timestamp: Date.now()
            }
        });
        
        // Add chat to user's chat list
        await database.ref('userChats/' + currentUserId + '/' + chatId).set(true);
        await database.ref('userChats/' + senderId + '/' + chatId).set(true);
        
        // Reload requests and contacts
        loadChatRequests();
        loadContacts();
        
        showSuccess('Chat request accepted');
        
    } catch (error) {
        console.error('Error accepting chat request:', error);
        showError('Failed to accept request');
    }
}

// Reject chat request
async function rejectChatRequest(requestId) {
    try {
        await database.ref('chatRequests/' + currentUserId + '/' + requestId).update({
            status: 'rejected',
            rejectedAt: Date.now()
        });
        
        loadChatRequests();
        showSuccess('Chat request rejected');
    } catch (error) {
        console.error('Error rejecting chat request:', error);
        showError('Failed to reject request');
    }
}

// Create group
async function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const membersInput = document.getElementById('groupMembers').value.trim();
    
    if (!groupName) {
        showError('Please enter a group name');
        return;
    }
    
    const memberIds = membersInput.split(',').map(id => id.trim().toUpperCase()).filter(id => id.startsWith('ZYN-'));
    memberIds.push(currentUserId); // Add creator to group
    
    try {
        // Verify all members exist
        for (const memberId of memberIds) {
            const memberSnapshot = await database.ref('users/' + memberId).once('value');
            if (!memberSnapshot.exists() && memberId !== currentUserId) {
                showError(`User ${memberId} not found`);
                return;
            }
        }
        
        // Create group
        const groupId = database.ref('groups').push().key;
        await database.ref('groups/' + groupId).set({
            name: groupName,
            createdBy: currentUserId,
            createdAt: Date.now(),
            members: memberIds.reduce((acc, id) => {
                acc[id] = true;
                return acc;
            }, {}),
            memberCount: memberIds.length
        });
        
        // Add group to each member's group list
        for (const memberId of memberIds) {
            await database.ref('userGroups/' + memberId + '/' + groupId).set(true);
        }
        
        // Create initial group message
        await database.ref('groupChats/' + groupId + '/messages').push().set({
            text: `${currentUser.displayName} created the group "${groupName}"`,
            senderId: 'system',
            timestamp: Date.now()
        });
        
        closePopup('createGroupPopup');
        loadGroups();
        showSuccess('Group created successfully');
        
    } catch (error) {
        console.error('Error creating group:', error);
        showError('Failed to create group');
    }
}

// Open chat with user
function openChat(userId) {
    window.location.href = `chat.html?type=personal&id=${userId}`;
}

// Open group chat
function openGroupChat(groupId) {
    window.location.href = `chat.html?type=group&id=${groupId}`;
}

// Show create group popup
function showCreateGroupPopup() {
    document.getElementById('groupName').value = '';
    document.getElementById('groupMembers').value = '';
    document.getElementById('createGroupPopup').classList.remove('hidden');
}

// Show create zyne popup
function showCreateZynePopup() {
    // Implementation for creating zynes
    alert('Zyne creation feature coming soon!');
}

// Check user ID input in real-time
document.addEventListener('DOMContentLoaded', () => {
    const recipientInput = document.getElementById('recipientId');
    if (recipientInput) {
        recipientInput.addEventListener('input', debounce(async (e) => {
            const userId = e.target.value.trim().toUpperCase();
            
            if (userId.startsWith('ZYN-') && userId.length === 8) {
                try {
                    const snapshot = await database.ref('users/' + userId).once('value');
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        
                        document.getElementById('recipientInfo').classList.remove('hidden');
                        document.getElementById('recipientName').textContent = userData.name;
                        document.getElementById('recipientUserId').textContent = userData.userId;
                        document.getElementById('recipientAvatar').src = userData.profileUrl || '';
                        
                        // Check if already in contacts
                        const contactSnapshot = await database.ref('userContacts/' + currentUserId + '/' + userId).once('value');
                        if (contactSnapshot.exists()) {
                            document.getElementById('sendRequestBtn').disabled = true;
                            document.getElementById('sendRequestBtn').textContent = 'Already in contacts';
                        } else {
                            document.getElementById('sendRequestBtn').disabled = false;
                            document.getElementById('sendRequestBtn').textContent = 'Send Request';
                        }
                    } else {
                        document.getElementById('recipientInfo').classList.add('hidden');
                        document.getElementById('sendRequestBtn').disabled = true;
                    }
                } catch (error) {
                    console.error('Error checking user:', error);
                }
            } else {
                document.getElementById('recipientInfo').classList.add('hidden');
                document.getElementById('sendRequestBtn').disabled = true;
            }
        }, 500));
    }
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

function showError(message) {
    alert(message); // Replace with toast notification
}

function showSuccess(message) {
    alert(message); // Replace with toast notification
}

// Update chat requests UI in real-time
function updateChatRequestsUI(request, requestId) {
    const requestsList = document.getElementById('chatRequestsList');
    if (!requestsList) return;
    
    // Fetch user data and add to list
    database.ref('users/' + request.senderId).once('value').then(snapshot => {
        const userData = snapshot.val();
        if (userData && request.status === 'pending') {
            const requestCard = createRequestCard(userData, requestId);
            
            // Remove empty state if present
            const emptyState = requestsList.querySelector('.empty-state');
            if (emptyState) {
                emptyState.remove();
            }
            
            requestsList.prepend(requestCard);
        }
    });
}

// Check and add zyne to UI
function checkAndAddZyne(zyne, zyneId) {
    // Check if zyne user is in contacts
    database.ref('userContacts/' + currentUserId + '/' + zyne.userId).once('value').then(snapshot => {
        if (snapshot.exists()) {
            // Fetch user data and add zyne
            database.ref('users/' + zyne.userId).once('value').then(userSnapshot => {
                const userData = userSnapshot.val();
                if (userData) {
                    const zynesList = document.getElementById('zynesList');
                    if (zynesList) {
                        const zyneCard = createZyneCard(zyne, userData);
                        
                        // Remove empty state if present
                        const emptyState = zynesList.querySelector('.empty-state');
                        if (emptyState) {
                            emptyState.remove();
                        }
                        
                        zynesList.prepend(zyneCard);
                    }
                }
            });
        }
    });
}

// Export functions for use in HTML
window.loadContacts = loadContacts;
window.loadChatRequests = loadChatRequests;
window.loadGroups = loadGroups;
window.loadZynes = loadZynes;
window.sendChatRequest = sendChatRequest;
window.acceptChatRequest = acceptChatRequest;
window.rejectChatRequest = rejectChatRequest;
window.createGroup = createGroup;
window.openChat = openChat;
window.openGroupChat = openGroupChat;
window.showCreateGroupPopup = showCreateGroupPopup;
window.showCreateZynePopup = showCreateZynePopup;
