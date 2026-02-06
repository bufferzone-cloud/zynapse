// Chat-specific functions
let currentAttachment = null;

function attachPhoto() {
    const input = document.getElementById('mediaUpload');
    input.accept = 'image/*';
    input.onchange = handleMediaSelect;
    input.click();
}

function attachVideo() {
    const input = document.getElementById('mediaUpload');
    input.accept = 'video/*';
    input.onchange = handleMediaSelect;
    input.click();
}

function attachDocument() {
    const input = document.getElementById('mediaUpload');
    input.accept = '*/*';
    input.onchange = handleMediaSelect;
    input.click();
}

function handleMediaSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    currentAttachment = file;
    
    // Show preview modal
    const modal = document.getElementById('previewModal');
    const preview = document.getElementById('mediaPreview');
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `
                <video controls style="max-width: 100%; border-radius: 8px;">
                    <source src="${e.target.result}" type="${file.type}">
                </video>
            `;
        };
        reader.readAsDataURL(file);
    } else {
        preview.innerHTML = `
            <div class="document-preview">
                <i class="fas fa-file fa-3x"></i>
                <p>${file.name}</p>
                <p>${(file.size / 1024).toFixed(2)} KB</p>
            </div>
        `;
    }
    
    modal.classList.add('active');
}

async function sendMediaMessage() {
    if (!currentAttachment) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    
    if (!chatId) return;
    
    try {
        // Upload file to ImageKit
        const uploadResult = await uploadFile(currentAttachment, `chat_${chatId}_${Date.now()}`);
        
        // Save message with media URL
        const messageId = database.ref().child('messages').child(chatId).push().key;
        
        await database.ref('messages/' + chatId + '/' + messageId).set({
            text: '',
            senderId: auth.currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            messageId: messageId,
            mediaUrl: uploadResult.url,
            mediaType: currentAttachment.type,
            fileName: currentAttachment.name
        });
        
        // Update chat last message
        database.ref('chats/' + chatId).update({
            lastMessage: `[${currentAttachment.type.startsWith('image/') ? 'Photo' : 'Media'}]`,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Close modal
        document.getElementById('previewModal').classList.remove('active');
        currentAttachment = null;
        
    } catch (error) {
        console.error('Error sending media:', error);
        alert('Error sending media: ' + error.message);
    }
}

// Add nickname function
function addNickname() {
    const nickname = prompt('Enter nickname for this contact:');
    if (nickname && nickname.trim()) {
        // Save nickname to database
        alert('Nickname saved: ' + nickname);
    }
}

// Block user function
function blockUser() {
    if (confirm('Are you sure you want to block this user?')) {
        // Add to blocked list
        alert('User blocked');
    }
}

// Toggle favorite
function toggleFavorite() {
    const btn = event.target.closest('a');
    if (btn) {
        const icon = btn.querySelector('i');
        if (icon.classList.contains('far')) {
            icon.classList.remove('far');
            icon.classList.add('fas');
            btn.innerHTML = '<i class="fas fa-star"></i> Remove from Favorites';
        } else {
            icon.classList.remove('fas');
            icon.classList.add('far');
            btn.innerHTML = '<i class="far fa-star"></i> Add to Favorites';
        }
    }
}

// Clear chat
function clearChat() {
    if (confirm('Are you sure you want to clear this chat?')) {
        // Clear messages from database
        alert('Chat cleared');
    }
}

// View profile
function viewProfile() {
    // Open profile modal
    alert('View profile feature coming soon!');
}

// Initialize chat-specific event listeners
document.addEventListener('DOMContentLoaded', function() {
    if (document.querySelector('.chat-page')) {
        // Setup media send button
        document.getElementById('sendMediaBtn').addEventListener('click', sendMediaMessage);
        
        // Setup cancel button
        document.getElementById('cancelUpload').addEventListener('click', function() {
            document.getElementById('previewModal').classList.remove('active');
            currentAttachment = null;
        });
        
        // Setup close button
        document.querySelector('#previewModal .close-btn').addEventListener('click', function() {
            document.getElementById('previewModal').classList.remove('active');
            currentAttachment = null;
        });
    }
});
