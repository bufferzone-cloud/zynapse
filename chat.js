let currentChatId = null;
let chatWithUserId = null;

// Initialize Chat
async function initializeChat() {
    // Get chat ID and user ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    currentChatId = urlParams.get('chatId');
    chatWithUserId = urlParams.get('userId');
    
    if (!currentChatId || !chatWithUserId) {
        alert('Invalid chat link');
        window.location.href = 'home.html';
        return;
    }
    
    // Load user info
    const userSnap = await database.ref('users/' + chatWithUserId).once('value');
    const userData = userSnap.val();
    
    if (userData) {
        document.getElementById('chat-user-name').textContent = userData.name;
        document.getElementById('chat-user-profile').src = userData.profilePic || 'default-profile.png';
    }
    
    // Load messages
    loadMessages();
    
    // Set up real-time message listener
    database.ref(`chats/${currentChatId}/messages`).on('child_added', (snapshot) => {
        const message = snapshot.val();
        addMessageToUI(message, snapshot.key);
        
        // Play sound for received messages
        if (message.senderId !== auth.currentUser.uid) {
            playMessageSound();
        }
    });
}

// Load Messages
async function loadMessages() {
    try {
        const messagesRef = database.ref(`chats/${currentChatId}/messages`);
        const snapshot = await messagesRef.orderByChild('timestamp').once('value');
        const messages = snapshot.val() || {};
        
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';
        
        Object.entries(messages).forEach(([messageId, message]) => {
            addMessageToUI(message, messageId);
        });
        
        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
        
    } catch (error) {
        console.error('Load messages error:', error);
    }
}

// Add Message to UI
function addMessageToUI(message, messageId) {
    const messagesContainer = document.getElementById('chat-messages');
    const currentUser = auth.currentUser;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-content">
            ${message.text || ''}
            ${message.mediaUrl ? 
                `<br><img src="${message.mediaUrl}" style="max-width: 200px; border-radius: 10px; margin-top: 5px;">` : 
                ''}
            <div class="message-time">${time}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    
    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
async function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    const file = document.getElementById('file-upload').files[0];
    
    if (!text && !file) return;
    
    const currentUser = auth.currentUser;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
        let mediaUrl = '';
        
        // Upload media if exists
        if (file) {
            const uploadResult = await uploadToImageKit(file, `chat_${currentChatId}_${Date.now()}`);
            mediaUrl = uploadResult.url;
        }
        
        // Create message object
        const message = {
            messageId: messageId,
            senderId: currentUser.uid,
            text: text,
            mediaUrl: mediaUrl,
            timestamp: Date.now(),
            read: false
        };
        
        // Save message to Firebase
        await database.ref(`chats/${currentChatId}/messages/${messageId}`).set(message);
        
        // Update last message in user's chat list
        const lastMessage = text || (file ? (file.type.startsWith('image') ? '📷 Image' : '🎬 Video') : '');
        await database.ref(`users/${currentUser.uid}/chats/${currentChatId}/lastMessage`).set(lastMessage);
        await database.ref(`users/${chatWithUserId}/chats/${currentChatId}/lastMessage`).set(lastMessage);
        
        // Clear input
        input.value = '';
        document.getElementById('file-upload').value = '';
        
    } catch (error) {
        console.error('Send message error:', error);
        alert('Failed to send message');
    }
}

// Attach File
function attachFile() {
    document.getElementById('file-upload').click();
}

// Play Message Sound
function playMessageSound() {
    const sound = document.getElementById('message-sound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
}

// Chat Menu Functions
function toggleChatMenu() {
    const menu = document.getElementById('chat-menu');
    menu.classList.toggle('show');
}

function addNickname() {
    const nickname = prompt('Enter nickname for this contact:');
    if (nickname) {
        // Save nickname to Firebase
        const currentUser = auth.currentUser;
        database.ref(`users/${currentUser.uid}/contacts/${chatWithUserId}/nickname`).set(nickname);
        alert('Nickname added!');
    }
}

async function toggleFavorite() {
    const currentUser = auth.currentUser;
    const favRef = database.ref(`users/${currentUser.uid}/contacts/${chatWithUserId}/isFavorite`);
    const snapshot = await favRef.once('value');
    const isFavorite = snapshot.val() || false;
    
    await favRef.set(!isFavorite);
    alert(`${!isFavorite ? 'Added to' : 'Removed from'} favorites!`);
}

function blockUser() {
    if (confirm('Are you sure you want to block this user?')) {
        const currentUser = auth.currentUser;
        database.ref(`users/${currentUser.uid}/contacts/${chatWithUserId}/blocked`).set(true);
        alert('User blocked successfully');
        goBack();
    }
}

function clearChat() {
    if (confirm('Are you sure you want to clear all messages in this chat?')) {
        database.ref(`chats/${currentChatId}/messages`).remove();
        alert('Chat cleared');
    }
}

function goBack() {
    window.history.back();
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', initializeChat);
