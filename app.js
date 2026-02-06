// User Management
let currentUser = null;
const notificationSound = document.getElementById('notification-sound');

// Generate ZYN-ID
function generateZynId() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `ZYN-${randomNum}`;
}

// Sign Up Step Navigation
function nextStep() {
    document.getElementById('welcome-step').classList.remove('active');
    document.getElementById('register-step').classList.add('active');
}

function prevStep() {
    document.getElementById('register-step').classList.remove('active');
    document.getElementById('welcome-step').classList.add('active');
}

// Profile Picture Preview
document.getElementById('profile-pic')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profile-preview');
            const previewContainer = document.querySelector('.preview-container');
            const uploadLabel = document.querySelector('.upload-label');
            
            preview.src = e.target.result;
            previewContainer.style.display = 'block';
            uploadLabel.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
});

// User Registration
async function registerUser(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const profilePic = document.getElementById('profile-pic').files[0];
    
    // Validate passwords
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('.btn-primary');
    const btnText = document.getElementById('register-text');
    const spinner = document.getElementById('register-spinner');
    
    btnText.style.display = 'none';
    spinner.style.display = 'block';
    
    try {
        // 1. Create Firebase user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. Generate ZYN-ID
        const zynId = generateZynId();
        
        // 3. Upload profile picture to ImageKit
        let profilePicUrl = '';
        if (profilePic) {
            const uploadResult = await uploadToImageKit(profilePic, `profile_${user.uid}`);
            profilePicUrl = uploadResult.url;
        }
        
        // 4. Save user data to Firebase
        await database.ref('users/' + user.uid).set({
            name: name,
            phone: phone,
            email: email,
            zynId: zynId,
            profilePic: profilePicUrl,
            createdAt: Date.now(),
            contacts: {},
            chatRequests: {},
            chats: {}
        });
        
        // 5. Save ZYN-ID mapping for quick lookup
        await database.ref('zynIds/' + zynId).set(user.uid);
        
        // 6. Redirect to home page
        window.location.href = 'home.html';
        
    } catch (error) {
        console.error('Registration error:', error);
        alert(error.message);
    } finally {
        // Reset button state
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }
}

// Copy User ID
function copyUserId() {
    const userId = document.getElementById('user-id').textContent;
    navigator.clipboard.writeText(userId).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i>';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
}

// Toggle Dropdown Menu
function toggleMenu() {
    const menu = document.getElementById('user-menu');
    menu.classList.toggle('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('user-menu');
    const iconBtn = document.querySelector('.icon-btn');
    
    if (menu && menu.classList.contains('show') && 
        !menu.contains(event.target) && 
        !iconBtn.contains(event.target)) {
        menu.classList.remove('show');
    }
});

// Switch Views
function switchView(view) {
    // Hide all views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected view
    document.getElementById(`${view}-view`).classList.add('active');
    
    // Activate corresponding nav button
    const navBtn = document.querySelector(`.nav-btn[onclick*="${view}"]`);
    if (navBtn) {
        navBtn.classList.add('active');
    }
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Start Chat - Search User
document.getElementById('search-user-id')?.addEventListener('input', async function(e) {
    const zynId = e.target.value.trim();
    const resultDiv = document.getElementById('user-search-result');
    
    if (zynId.length === 8 && zynId.startsWith('ZYN-')) {
        try {
            // Look up user by ZYN-ID
            const snapshot = await database.ref('zynIds/' + zynId).once('value');
            if (snapshot.exists()) {
                const userId = snapshot.val();
                const userSnap = await database.ref('users/' + userId).once('value');
                const userData = userSnap.val();
                
                resultDiv.innerHTML = `
                    <div class="user-found">
                        <img src="${userData.profilePic || 'default-profile.png'}" class="request-profile">
                        <div class="request-info">
                            <div class="request-name">${userData.name}</div>
                            <div class="request-phone">${userData.phone}</div>
                        </div>
                    </div>
                `;
                resultDiv.classList.add('show');
            } else {
                resultDiv.innerHTML = '<p>User not found</p>';
                resultDiv.classList.add('show');
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    } else {
        resultDiv.classList.remove('show');
    }
});

// Send Chat Request
async function sendChatRequest() {
    const zynId = document.getElementById('search-user-id').value.trim();
    
    if (!zynId) {
        alert('Please enter a ZYN-ID');
        return;
    }
    
    try {
        // Get current user
        const currentUser = auth.currentUser;
        const currentUserSnap = await database.ref('users/' + currentUser.uid).once('value');
        const currentUserData = currentUserSnap.val();
        
        // Find recipient user
        const recipientSnap = await database.ref('zynIds/' + zynId).once('value');
        if (!recipientSnap.exists()) {
            alert('User not found');
            return;
        }
        
        const recipientId = recipientSnap.val();
        
        // Create chat request
        const requestId = `req_${Date.now()}`;
        await database.ref(`users/${recipientId}/chatRequests/${requestId}`).set({
            fromUserId: currentUser.uid,
            fromZynId: currentUserData.zynId,
            fromName: currentUserData.name,
            fromPhone: currentUserData.phone,
            fromProfilePic: currentUserData.profilePic || '',
            timestamp: Date.now(),
            status: 'pending'
        });
        
        alert('Chat request sent!');
        closeModal('start-chat-modal');
        
    } catch (error) {
        console.error('Send request error:', error);
        alert('Failed to send request');
    }
}

// Play Notification Sound
function playNotification() {
    if (notificationSound) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log('Audio play failed:', e));
    }
}

// Load Chat Requests
async function loadChatRequests() {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    
    try {
        const requestsRef = database.ref(`users/${currentUser.uid}/chatRequests`);
        requestsRef.on('value', (snapshot) => {
            const requests = snapshot.val() || {};
            const requestsList = document.getElementById('chat-requests-list');
            
            if (Object.keys(requests).length === 0) {
                requestsList.innerHTML = '<p>No pending requests</p>';
                return;
            }
            
            requestsList.innerHTML = '';
            for (const [requestId, request] of Object.entries(requests)) {
                if (request.status === 'pending') {
                    const requestElement = document.createElement('div');
                    requestElement.className = 'chat-request-item';
                    requestElement.innerHTML = `
                        <img src="${request.fromProfilePic || 'default-profile.png'}" 
                             class="request-profile" 
                             onerror="this.src='default-profile.png'">
                        <div class="request-info">
                            <div class="request-name">${request.fromName}</div>
                            <div class="request-phone">${request.fromPhone}</div>
                        </div>
                        <div class="request-actions">
                            <button class="accept-btn" onclick="acceptChatRequest('${requestId}', '${request.fromUserId}')">
                                Accept
                            </button>
                            <button class="reject-btn" onclick="rejectChatRequest('${requestId}')">
                                Reject
                            </button>
                        </div>
                    `;
                    requestsList.appendChild(requestElement);
                    
                    // Play notification sound for new requests
                    if (request.timestamp > Date.now() - 5000) {
                        playNotification();
                    }
                }
            }
        });
    } catch (error) {
        console.error('Load requests error:', error);
    }
}

// Accept Chat Request
async function acceptChatRequest(requestId, fromUserId) {
    try {
        const currentUser = auth.currentUser;
        
        // Update request status
        await database.ref(`users/${currentUser.uid}/chatRequests/${requestId}`).update({
            status: 'accepted'
        });
        
        // Create chat room
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Add to current user's chats
        await database.ref(`users/${currentUser.uid}/chats/${chatId}`).set({
            withUserId: fromUserId,
            createdAt: Date.now(),
            lastMessage: ''
        });
        
        // Add to sender's chats
        await database.ref(`users/${fromUserId}/chats/${chatId}`).set({
            withUserId: currentUser.uid,
            createdAt: Date.now(),
            lastMessage: ''
        });
        
        // Create chat room data
        await database.ref(`chats/${chatId}`).set({
            participants: {
                [currentUser.uid]: true,
                [fromUserId]: true
            },
            createdAt: Date.now(),
            messages: {}
        });
        
        alert('Chat request accepted!');
        
    } catch (error) {
        console.error('Accept request error:', error);
        alert('Failed to accept request');
    }
}

// Reject Chat Request
async function rejectChatRequest(requestId) {
    try {
        const currentUser = auth.currentUser;
        await database.ref(`users/${currentUser.uid}/chatRequests/${requestId}`).update({
            status: 'rejected'
        });
    } catch (error) {
        console.error('Reject request error:', error);
        alert('Failed to reject request');
    }
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('Logout error:', error);
        });
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            
            // Load user data on home page
            if (window.location.pathname.includes('home.html')) {
                const userSnap = await database.ref('users/' + user.uid).once('value');
                const userData = userSnap.val();
                
                if (userData) {
                    document.getElementById('user-name').textContent = userData.name;
                    document.getElementById('user-id').textContent = userData.zynId;
                    
                    // Load chat requests
                    loadChatRequests();
                }
                
                // Setup floating button
                document.getElementById('floating-chat-btn').addEventListener('click', function() {
                    openModal('start-chat-modal');
                });
            }
        } else if (!window.location.pathname.includes('index.html')) {
            // Redirect to sign up page if not authenticated
            window.location.href = 'index.html';
        }
    });
    
    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
});
