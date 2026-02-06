// Main Application Controller
class ZynapseApp {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.currentChatId = null;
        this.currentPage = 'home';
        this.isTyping = false;
        this.typingTimeout = null;
        this.realtimeListeners = {};
        
        this.init();
    }

    // Initialize application
    async init() {
        this.bindEvents();
        this.checkAuthState();
        this.setupRealtimeListeners();
        this.updateOnlineStatus();
        
        // Play notification sound test
        this.playNotificationSound();
    }

    // Bind all event listeners
    bindEvents() {
        // Auth page events
        this.bindAuthEvents();
        
        // Home page events
        this.bindHomeEvents();
        
        // Chat page events
        this.bindChatEvents();
        
        // Navigation events
        this.bindNavigationEvents();
        
        // Modal events
        this.bindModalEvents();
        
        // Window events
        this.bindWindowEvents();
    }

    // Authentication events
    bindAuthEvents() {
        // Welcome screen buttons
        document.getElementById('signInBtn')?.addEventListener('click', () => this.showLoginForm());
        document.getElementById('signUpBtn')?.addEventListener('click', () => this.showSignupForm());
        
        // Back buttons
        document.getElementById('backToWelcome')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showWelcomeScreen();
        });
        
        document.getElementById('backToWelcome2')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showWelcomeScreen();
        });
        
        document.getElementById('haveAccount')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
        
        // Forgot password
        document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showForgotPassword();
        });
        
        // Toggle password visibility
        document.querySelectorAll('.toggle-password').forEach(icon => {
            icon.addEventListener('click', (e) => {
                const input = e.target.closest('.input-group').querySelector('input');
                const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                input.setAttribute('type', type);
                e.target.classList.toggle('fa-eye');
                e.target.classList.toggle('fa-eye-slash');
            });
        });
        
        // Profile picture upload
        document.getElementById('uploadProfileBtn')?.addEventListener('click', () => {
            document.getElementById('profileImage').click();
        });
        
        document.getElementById('profileImage')?.addEventListener('change', (e) => {
            this.handleProfileImageUpload(e.target.files[0]);
        });
        
        // Login form submission
        document.getElementById('loginFormFields')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        // Signup form submission
        document.getElementById('signupFormFields')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSignup();
        });
        
        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.handleLogout();
        });
    }

    // Home page events
    bindHomeEvents() {
        // Copy user ID button
        document.getElementById('copyUserIdBtn')?.addEventListener('click', () => {
            this.copyUserId();
        });
        
        // Start chat button
        document.getElementById('startChatBtn')?.addEventListener('click', () => {
            this.showStartChatPopup();
        });
        
        // Search user ID input
        document.getElementById('searchUserId')?.addEventListener('input', (e) => {
            this.searchUserById(e.target.value);
        });
        
        // Send request button
        document.getElementById('sendRequestBtn')?.addEventListener('click', () => {
            this.sendChatRequest();
        });
        
        // Add Zyne button
        document.getElementById('addZyneBtn')?.addEventListener('click', () => {
            this.showAddZyneModal();
        });
        
        // Create group button
        document.getElementById('createGroupBtn')?.addEventListener('click', () => {
            this.showCreateGroupModal();
        });
        
        // Add member button
        document.getElementById('addMemberBtn')?.addEventListener('click', () => {
            this.addGroupMember();
        });
        
        // Post Zyne button
        document.getElementById('postZyneBtn')?.addEventListener('click', () => {
            this.postZyne();
        });
        
        // Create group submit
        document.getElementById('createGroupSubmitBtn')?.addEventListener('click', () => {
            this.createGroup();
        });
        
        // Add photo/video to Zyne
        document.getElementById('addPhotoBtn')?.addEventListener('click', () => {
            document.getElementById('zynePhotoInput').click();
        });
        
        document.getElementById('addVideoBtn')?.addEventListener('click', () => {
            document.getElementById('zyneVideoInput').click();
        });
        
        document.getElementById('zynePhotoInput')?.addEventListener('change', (e) => {
            this.handleZyneMediaUpload(e.target.files[0], 'image');
        });
        
        document.getElementById('zyneVideoInput')?.addEventListener('change', (e) => {
            this.handleZyneMediaUpload(e.target.files[0], 'video');
        });
        
        // Upload group image
        document.getElementById('uploadGroupImageBtn')?.addEventListener('click', () => {
            document.getElementById('groupImageInput').click();
        });
        
        document.getElementById('groupImageInput')?.addEventListener('change', (e) => {
            this.handleGroupImageUpload(e.target.files[0]);
        });
    }

    // Chat page events
    bindChatEvents() {
        // Send message button
        document.getElementById('sendBtn')?.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Message input enter key
        document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Message input typing indicator
        document.getElementById('messageInput')?.addEventListener('input', () => {
            this.handleTyping();
        });
        
        // Attachment button
        document.getElementById('attachBtn')?.addEventListener('click', () => {
            this.toggleAttachmentOptions();
        });
        
        // Attachment options
        document.getElementById('attachPhotoBtn')?.addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });
        
        document.getElementById('attachVideoBtn')?.addEventListener('click', () => {
            document.getElementById('videoInput').click();
        });
        
        document.getElementById('attachDocumentBtn')?.addEventListener('click', () => {
            document.getElementById('documentInput').click();
        });
        
        // File inputs
        document.getElementById('photoInput')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files, 'image');
        });
        
        document.getElementById('videoInput')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files, 'video');
        });
        
        document.getElementById('documentInput')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files, 'document');
        });
        
        // Chat menu options
        document.getElementById('addNicknameBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showNicknameModal();
        });
        
        document.getElementById('blockUserBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.blockUser();
        });
        
        document.getElementById('addToFavoritesBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.addToFavorites();
        });
        
        document.getElementById('viewProfileBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.viewUserProfile();
        });
        
        document.getElementById('deleteChatBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.deleteChat();
        });
        
        document.getElementById('reportUserBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.reportUser();
        });
        
        // Save nickname
        document.getElementById('saveNicknameBtn')?.addEventListener('click', () => {
            this.saveNickname();
        });
        
        // Send media button
        document.getElementById('sendMediaBtn')?.addEventListener('click', () => {
            this.sendMediaMessage();
        });
    }

    // Navigation events
    bindNavigationEvents() {
        // Nav items click
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.switchPage(page);
            });
        });
        
        // Back button
        document.querySelector('.back-btn')?.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Modal events
    bindModalEvents() {
        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllModals();
            });
        });
        
        // Modal overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeAllModals();
                }
            });
        });
        
        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    // Window events
    bindWindowEvents() {
        // Online/offline status
        window.addEventListener('online', () => {
            this.updateOnlineStatus('online');
            this.showToast('You are back online', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.updateOnlineStatus('offline');
            this.showToast('You are offline', 'warning');
        });
        
        // Page visibility
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.updateOnlineStatus('away');
            } else {
                this.updateOnlineStatus('online');
            }
        });
        
        // Before unload
        window.addEventListener('beforeunload', () => {
            this.updateOnlineStatus('offline');
        });
    }

    // Show welcome screen
    showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'block';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'none';
    }

    // Show login form
    showLoginForm() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
    }

    // Show signup form
    showSignupForm() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('signupForm').style.display = 'block';
    }

    // Show forgot password
    showForgotPassword() {
        const email = prompt('Enter your email address to reset password:');
        if (email) {
            this.resetPassword(email);
        }
    }

    // Handle login
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        try {
            this.showLoading('#loginSubmitBtn', '#loginBtnText', '#loginSpinner');
            
            const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Get user data from database
            const userData = await firebaseHelpers.getUserData(user.uid);
            
            if (userData) {
                this.showToast('Login successful!', 'success');
                
                // Redirect to home page after short delay
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            } else {
                throw new Error('User data not found');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(this.getErrorMessage(error), 'error');
        } finally {
            this.hideLoading('#loginSubmitBtn', '#loginBtnText', '#loginSpinner');
        }
    }

    // Handle signup
    async handleSignup() {
        const name = document.getElementById('signupName').value;
        const phone = document.getElementById('signupPhone').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const profileImage = document.getElementById('profileImage').files[0];
        
        // Validation
        if (!name || !phone || !email || !password || !confirmPassword) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            this.showLoading('#signupSubmitBtn', '#signupBtnText', '#signupSpinner');
            
            // 1. Create Firebase auth user
            const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 2. Generate Zynapse ID
            const zynapseId = this.generateZynapseId();
            
            // 3. Upload profile picture if exists
            let profilePicUrl = '';
            let profilePicThumbnail = '';
            
            if (profileImage) {
                try {
                    const uploadResult = await imageKitHelpers.uploadProfilePicture(profileImage, user.uid);
                    profilePicUrl = uploadResult.originalUrl;
                    profilePicThumbnail = uploadResult.thumbnailUrl;
                } catch (uploadError) {
                    console.warn('Profile picture upload failed:', uploadError);
                    // Continue without profile picture
                }
            }
            
            // 4. Create user data object
            const userData = {
                uid: user.uid,
                name: name,
                phone: phone,
                email: email,
                zynapseId: zynapseId,
                profilePic: profilePicUrl,
                profilePicThumbnail: profilePicThumbnail || profilePicUrl,
                createdAt: firebaseHelpers.getTimestamp(),
                lastSeen: firebaseHelpers.getTimestamp(),
                status: {
                    online: true,
                    lastSeen: firebaseHelpers.getTimestamp()
                },
                settings: {
                    notifications: true,
                    sounds: true,
                    theme: 'light'
                }
            };
            
            // 5. Save user data to database
            await database.ref('users/' + user.uid).set(userData);
            
            // 6. Create index for Zynapse ID lookup
            await database.ref('zynapseIds/' + zynapseId).set(user.uid);
            
            this.showToast('Account created successfully! Your Zynapse ID: ' + zynapseId, 'success');
            
            // Auto login and redirect
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast(this.getErrorMessage(error), 'error');
        } finally {
            this.hideLoading('#signupSubmitBtn', '#signupBtnText', '#signupSpinner');
        }
    }

    // Handle profile image upload
    async handleProfileImageUpload(file) {
        if (!file) return;
        
        if (!imageKitHelpers.isImageFile(file)) {
            this.showToast('Please select an image file', 'error');
            return;
        }
        
        try {
            imageKitHelpers.validateFileSize(file, 5); // 5MB max
            
            const preview = await imageKitHelpers.createImagePreview(file);
            const previewElement = document.getElementById('profilePreview');
            
            previewElement.innerHTML = '';
            const img = document.createElement('img');
            img.src = preview;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            previewElement.appendChild(img);
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Handle logout
    async handleLogout() {
        try {
            await this.updateOnlineStatus('offline');
            await firebaseAuth.signOut();
            this.showToast('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Logout failed', 'error');
        }
    }

    // Copy user ID to clipboard
    copyUserId() {
        const userId = document.getElementById('userID').textContent;
        navigator.clipboard.writeText(userId).then(() => {
            this.showToast('Zynapse ID copied to clipboard', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showToast('Failed to copy ID', 'error');
        });
    }

    // Show start chat popup
    showStartChatPopup() {
        document.getElementById('startChatPopup').style.display = 'block';
        document.getElementById('searchUserId').focus();
    }

    // Search user by ID
    async searchUserById(zynapseId) {
        const searchResult = document.getElementById('userSearchResult');
        const sendRequestBtn = document.getElementById('sendRequestBtn');
        
        if (!zynapseId || zynapseId.length < 8) {
            searchResult.innerHTML = '';
            sendRequestBtn.style.display = 'none';
            return;
        }
        
        // Format: ZYN-XXXX
        const formattedId = zynapseId.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        
        try {
            const user = await firebaseHelpers.getUserByZynapseId(formattedId);
            
            if (user) {
                // Don't show current user
                if (user.id === this.currentUser?.uid) {
                    searchResult.innerHTML = '<p class="error">Cannot chat with yourself</p>';
                    sendRequestBtn.style.display = 'none';
                    return;
                }
                
                // Check if already in contacts
                const contacts = await firebaseHelpers.getContacts(this.currentUser.uid);
                const isContact = Object.values(contacts).some(contact => 
                    contact.zynapseId === formattedId);
                
                searchResult.innerHTML = `
                    <div class="user-found">
                        <img src="${user.profilePicThumbnail || user.profilePic || 'zynaps.png'}" 
                             alt="${user.name}" class="profile-pic">
                        <div>
                            <h4>${user.name}</h4>
                            <p>${user.zynapseId}</p>
                            ${isContact ? '<p class="already-contact">Already in contacts</p>' : ''}
                        </div>
                    </div>
                `;
                
                sendRequestBtn.style.display = isContact ? 'none' : 'block';
                sendRequestBtn.dataset.zynapseId = formattedId;
                
            } else {
                searchResult.innerHTML = '<p class="error">User not found</p>';
                sendRequestBtn.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Search error:', error);
            searchResult.innerHTML = '<p class="error">Error searching user</p>';
            sendRequestBtn.style.display = 'none';
        }
    }

    // Send chat request
    async sendChatRequest() {
        const sendRequestBtn = document.getElementById('sendRequestBtn');
        const zynapseId = sendRequestBtn.dataset.zynapseId;
        
        if (!zynapseId) return;
        
        try {
            sendRequestBtn.disabled = true;
            sendRequestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            const result = await firebaseHelpers.sendChatRequest(
                this.currentUser.uid,
                zynapseId,
                'Hello, I want to chat with you!'
            );
            
            if (result.success) {
                this.showToast('Chat request sent successfully', 'success');
                this.closeAllModals();
                
                // Play notification sound
                this.playNotificationSound();
                
                // Update requests badge
                this.updateRequestsBadge();
                
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Send request error:', error);
            this.showToast('Failed to send request: ' + error.message, 'error');
        } finally {
            sendRequestBtn.disabled = false;
            sendRequestBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Chat Request';
        }
    }

    // Switch page
    switchPage(page) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });
        
        // Update pages
        document.querySelectorAll('.page').forEach(pageElement => {
            pageElement.classList.remove('active');
        });
        
        const targetPage = document.getElementById(page + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
            
            // Load page data
            this.loadPageData(page);
        }
    }

    // Load page data
    async loadPageData(page) {
        if (!this.currentUser) return;
        
        switch(page) {
            case 'zynes':
                await this.loadZynes();
                break;
            case 'requests':
                await this.loadChatRequests();
                break;
            case 'contacts':
                await this.loadContacts();
                break;
            case 'groups':
                await this.loadGroups();
                break;
        }
    }

    // Load Zynes
    async loadZynes() {
        const container = document.getElementById('zynesList');
        if (!container) return;
        
        try {
            const zynes = await firebaseHelpers.getUserZynes(this.currentUser.uid);
            
            if (Object.keys(zynes).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-fire"></i>
                        <h3>No Zynes yet</h3>
                        <p>Share your status with friends</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            
            for (const zyneId in zynes) {
                const zyne = zynes[zyneId];
                const timeAgo = this.getTimeAgo(zyne.timestamp);
                
                const zyneElement = document.createElement('div');
                zyneElement.className = 'zyne-card';
                zyneElement.innerHTML = `
                    <div class="zyne-content">
                        ${zyne.mediaUrl ? `
                            ${zyne.type === 'image' ? 
                                `<img src="${imageKitHelpers.getOptimizedImage(zyne.mediaUrl, 400, 400)}" alt="Zyne">` :
                                `<video src="${zyne.mediaUrl}" controls></video>`
                            }
                        ` : ''}
                        ${zyne.content ? `<p>${this.escapeHtml(zyne.content)}</p>` : ''}
                        <div class="zyne-info">
                            <span class="time">${timeAgo}</span>
                            <span class="views">${zyne.views || 0} views</span>
                        </div>
                    </div>
                `;
                
                container.appendChild(zyneElement);
            }
            
        } catch (error) {
            console.error('Error loading zynes:', error);
            container.innerHTML = '<p class="error">Error loading zynes</p>';
        }
    }

    // Load chat requests
    async loadChatRequests() {
        const container = document.getElementById('requestsList');
        if (!container) return;
        
        try {
            const requests = await firebaseHelpers.getChatRequests(this.currentUser.uid, 'received');
            
            if (Object.keys(requests).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-user-clock"></i>
                        <h3>No pending requests</h3>
                        <p>When someone sends you a request, it will appear here</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            
            for (const requestId in requests) {
                const request = requests[requestId];
                const timeAgo = this.getTimeAgo(request.timestamp);
                
                const requestElement = document.createElement('div');
                requestElement.className = 'request-card';
                requestElement.innerHTML = `
                    <img src="${request.fromUserProfilePic || 'zynaps.png'}" 
                         alt="${request.fromUserName}" class="profile-pic">
                    <div class="request-info">
                        <h4>${this.escapeHtml(request.fromUserName)}</h4>
                        <p>${request.fromUserZynapseId}</p>
                        <p class="time">${timeAgo}</p>
                        ${request.message ? `<p class="message">${this.escapeHtml(request.message)}</p>` : ''}
                    </div>
                    <div class="request-actions">
                        <button class="action-btn accept-btn" data-request-id="${requestId}">
                            <i class="fas fa-check"></i> Accept
                        </button>
                        <button class="action-btn reject-btn" data-request-id="${requestId}">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                `;
                
                container.appendChild(requestElement);
            }
            
            // Add event listeners to action buttons
            container.querySelectorAll('.accept-btn').forEach(btn => {
                btn.addEventListener('click', () => this.handleRequestAction(btn.dataset.requestId, 'accepted'));
            });
            
            container.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', () => this.handleRequestAction(btn.dataset.requestId, 'rejected'));
            });
            
        } catch (error) {
            console.error('Error loading requests:', error);
            container.innerHTML = '<p class="error">Error loading requests</p>';
        }
    }

    // Handle request action (accept/reject)
    async handleRequestAction(requestId, action) {
        try {
            const result = await firebaseHelpers.updateChatRequest(
                requestId,
                this.currentUser.uid,
                action
            );
            
            if (result.success) {
                this.showToast(`Request ${action} successfully`, 'success');
                this.playNotificationSound();
                
                // Reload requests
                await this.loadChatRequests();
                
                // Update badge
                this.updateRequestsBadge();
                
                // If accepted, switch to contacts page
                if (action === 'accepted') {
                    this.switchPage('contacts');
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Request action error:', error);
            this.showToast('Failed to process request: ' + error.message, 'error');
        }
    }

    // Load contacts
    async loadContacts() {
        const container = document.getElementById('contactsList');
        if (!container) return;
        
        try {
            const contacts = await firebaseHelpers.getContacts(this.currentUser.uid);
            
            if (Object.keys(contacts).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-address-book"></i>
                        <h3>No contacts yet</h3>
                        <p>Start chatting with others to build your network</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            
            for (const contactId in contacts) {
                const contact = contacts[contactId];
                
                // Get user status
                const userData = await firebaseHelpers.getUserData(contactId);
                const isOnline = userData?.status?.online || false;
                const lastSeen = userData?.status?.lastSeen ? 
                    this.getTimeAgo(userData.status.lastSeen) : 'Offline';
                
                const contactElement = document.createElement('div');
                contactElement.className = 'contact-card';
                contactElement.innerHTML = `
                    <img src="${contact.profilePic || userData?.profilePic || 'zynaps.png'}" 
                         alt="${contact.name}" class="profile-pic">
                    <div class="contact-info">
                        <h4>${this.escapeHtml(contact.name)}</h4>
                        <p>${contact.zynapseId}</p>
                        <p class="status ${isOnline ? 'online' : 'offline'}">
                            ${isOnline ? 'Online' : `Last seen ${lastSeen}`}
                        </p>
                    </div>
                    <div class="contact-actions">
                        <button class="action-btn chat-btn" data-user-id="${contactId}">
                            <i class="fas fa-comment"></i> Chat
                        </button>
                    </div>
                `;
                
                container.appendChild(contactElement);
            }
            
            // Add event listeners to chat buttons
            container.querySelectorAll('.chat-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const userId = btn.dataset.userId;
                    this.startChat(userId);
                });
            });
            
        } catch (error) {
            console.error('Error loading contacts:', error);
            container.innerHTML = '<p class="error">Error loading contacts</p>';
        }
    }

    // Load groups
    async loadGroups() {
        const container = document.getElementById('groupsList');
        if (!container) return;
        
        try {
            const groups = await firebaseHelpers.getUserGroups(this.currentUser.uid);
            
            if (Object.keys(groups).length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>No groups yet</h3>
                        <p>Create a group to chat with multiple people</p>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = '';
            
            for (const groupId in groups) {
                const group = groups[groupId];
                const lastActive = this.getTimeAgo(group.lastMessageTime || group.createdAt);
                
                const groupElement = document.createElement('div');
                groupElement.className = 'group-card';
                groupElement.innerHTML = `
                    <img src="${group.profilePic || 'zynaps.png'}" 
                         alt="${group.name}" class="profile-pic">
                    <div class="group-info">
                        <h4>${this.escapeHtml(group.name)}</h4>
                        <p>${Object.keys(group.members || {}).length} members</p>
                        <p class="time">Last active ${lastActive}</p>
                    </div>
                    <div class="group-actions">
                        <button class="action-btn chat-btn" data-group-id="${groupId}">
                            <i class="fas fa-comment"></i> Chat
                        </button>
                    </div>
                `;
                
                container.appendChild(groupElement);
            }
            
        } catch (error) {
            console.error('Error loading groups:', error);
            container.innerHTML = '<p class="error">Error loading groups</p>';
        }
    }

    // Show add Zyne modal
    showAddZyneModal() {
        document.getElementById('addZyneModal').style.display = 'block';
        document.getElementById('zyneText').focus();
    }

    // Handle Zyne media upload
    async handleZyneMediaUpload(file, type) {
        if (!file) return;
        
        const previewContainer = document.getElementById('zyneMediaPreview');
        
        try {
            let previewUrl;
            
            if (type === 'image') {
                if (!imageKitHelpers.isImageFile(file)) {
                    throw new Error('Please select an image file');
                }
                imageKitHelpers.validateFileSize(file, 10);
                previewUrl = await imageKitHelpers.createImagePreview(file);
            } else if (type === 'video') {
                if (!imageKitHelpers.isVideoFile(file)) {
                    throw new Error('Please select a video file');
                }
                imageKitHelpers.validateFileSize(file, 50);
                const preview = await imageKitHelpers.createVideoPreview(file);
                previewUrl = preview.thumbnail;
            }
            
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                ${type === 'image' ? 
                    `<img src="${previewUrl}" alt="Preview">` :
                    `<div style="position: relative;">
                        <img src="${previewUrl}" alt="Video thumbnail">
                        <i class="fas fa-play" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 24px;"></i>
                    </div>`
                }
                <button class="remove-preview">&times;</button>
            `;
            
            previewItem.querySelector('.remove-preview').addEventListener('click', () => {
                previewItem.remove();
            });
            
            previewContainer.appendChild(previewItem);
            
            // Store file data
            previewItem.dataset.file = JSON.stringify({
                file: file,
                type: type
            });
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Post Zyne
    async postZyne() {
        const text = document.getElementById('zyneText').value;
        const previewItems = document.querySelectorAll('#zyneMediaPreview .preview-item');
        
        if (!text && previewItems.length === 0) {
            this.showToast('Please add text or media to post', 'error');
            return;
        }
        
        try {
            // Upload media if exists
            let mediaUrl = null;
            let mediaType = 'text';
            
            if (previewItems.length > 0) {
                const firstItem = previewItems[0];
                const fileData = JSON.parse(firstItem.dataset.file);
                const file = fileData.file;
                const type = fileData.type;
                
                const uploadResult = await imageKitHelpers.uploadZyneMedia(file, this.currentUser.uid, type);
                mediaUrl = uploadResult.originalUrl;
                mediaType = type;
            }
            
            // Create Zyne
            const result = await firebaseHelpers.createZyne(
                this.currentUser.uid,
                text,
                mediaType,
                mediaUrl
            );
            
            if (result.success) {
                this.showToast('Zyne posted successfully', 'success');
                this.closeAllModals();
                
                // Clear form
                document.getElementById('zyneText').value = '';
                document.getElementById('zyneMediaPreview').innerHTML = '';
                
                // Reload Zynes
                await this.loadZynes();
            }
            
        } catch (error) {
            console.error('Error posting zyne:', error);
            this.showToast('Failed to post zyne: ' + error.message, 'error');
        }
    }

    // Show create group modal
    showCreateGroupModal() {
        document.getElementById('createGroupModal').style.display = 'block';
        document.getElementById('groupName').focus();
    }

    // Handle group image upload
    async handleGroupImageUpload(file) {
        if (!file) return;
        
        if (!imageKitHelpers.isImageFile(file)) {
            this.showToast('Please select an image file', 'error');
            return;
        }
        
        try {
            imageKitHelpers.validateFileSize(file, 5);
            const preview = await imageKitHelpers.createImagePreview(file);
            const previewElement = document.getElementById('groupImagePreview');
            
            previewElement.innerHTML = '';
            const img = document.createElement('img');
            img.src = preview;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            previewElement.appendChild(img);
            
            // Store file
            previewElement.dataset.file = JSON.stringify(file);
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Add group member
    addGroupMember() {
        const input = document.getElementById('addMemberInput');
        const zynapseId = input.value.trim().toUpperCase();
        const membersList = document.getElementById('membersList');
        
        if (!zynapseId || !zynapseId.startsWith('ZYN-')) {
            this.showToast('Please enter a valid Zynapse ID', 'error');
            return;
        }
        
        // Check if already added
        const existing = membersList.querySelector(`[data-id="${zynapseId}"]`);
        if (existing) {
            this.showToast('Member already added', 'warning');
            return;
        }
        
        const memberElement = document.createElement('div');
        memberElement.className = 'member-tag';
        memberElement.innerHTML = `
            <span>${zynapseId}</span>
            <button class="remove-member" data-id="${zynapseId}">&times;</button>
        `;
        memberElement.dataset.id = zynapseId;
        
        membersList.appendChild(memberElement);
        input.value = '';
        
        // Add remove event
        memberElement.querySelector('.remove-member').addEventListener('click', (e) => {
            e.target.closest('.member-tag').remove();
        });
    }

    // Create group
    async createGroup() {
        const groupName = document.getElementById('groupName').value.trim();
        const membersList = document.getElementById('membersList');
        const memberTags = membersList.querySelectorAll('.member-tag');
        
        if (!groupName) {
            this.showToast('Please enter group name', 'error');
            return;
        }
        
        if (memberTags.length === 0) {
            this.showToast('Please add at least one member', 'error');
            return;
        }
        
        try {
            // Collect member Zynapse IDs
            const members = Array.from(memberTags).map(tag => tag.dataset.id);
            
            // Upload group image if exists
            let profilePic = null;
            const previewElement = document.getElementById('groupImagePreview');
            if (previewElement.dataset.file) {
                const file = JSON.parse(previewElement.dataset.file);
                const uploadResult = await imageKitHelpers.uploadGroupImage(file, 'temp');
                profilePic = uploadResult.originalUrl;
            }
            
            // Create group
            const result = await firebaseHelpers.createGroup(
                this.currentUser.uid,
                groupName,
                members,
                profilePic
            );
            
            if (result.success) {
                this.showToast('Group created successfully', 'success');
                this.closeAllModals();
                
                // Clear form
                document.getElementById('groupName').value = '';
                document.getElementById('groupImagePreview').innerHTML = 
                    '<i class="fas fa-users"></i><span>Group Photo</span>';
                document.getElementById('membersList').innerHTML = '';
                
                // Reload groups
                await this.loadGroups();
            }
            
        } catch (error) {
            console.error('Error creating group:', error);
            this.showToast('Failed to create group: ' + error.message, 'error');
        }
    }

    // Start chat with user
    async startChat(userId) {
        try {
            // Get chat between users
            const userChats = await firebaseHelpers.getUserChats(this.currentUser.uid);
            
            let chatId = null;
            for (const chat in userChats) {
                if (userChats[chat].withUserId === userId) {
                    chatId = chat;
                    break;
                }
            }
            
            // If no existing chat, create one
            if (!chatId) {
                // Create chat room
                chatId = firebaseHelpers.generateId();
                await database.ref(`chats/${chatId}`).set({
                    participants: {
                        [this.currentUser.uid]: true,
                        [userId]: true
                    },
                    lastMessage: 'Chat started',
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    createdAt: firebaseHelpers.getTimestamp()
                });
                
                // Update user chat lists
                await database.ref(`userChats/${this.currentUser.uid}/${chatId}`).set({
                    withUserId: userId,
                    lastMessage: 'Chat started',
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    unreadCount: 0
                });
                
                await database.ref(`userChats/${userId}/${chatId}`).set({
                    withUserId: this.currentUser.uid,
                    lastMessage: 'Chat started',
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    unreadCount: 0
                });
            }
            
            // Redirect to chat page with chat ID
            window.location.href = `chat.html?chatId=${chatId}&userId=${userId}`;
            
        } catch (error) {
            console.error('Error starting chat:', error);
            this.showToast('Failed to start chat: ' + error.message, 'error');
        }
    }

    // Send message
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || !this.currentChatId || !this.currentUser) return;
        
        try {
            // Send message
            const result = await firebaseHelpers.sendMessage(
                this.currentChatId,
                this.currentUser.uid,
                message,
                'text'
            );
            
            if (result.success) {
                // Clear input
                input.value = '';
                
                // Scroll to bottom
                this.scrollToBottom();
                
                // Play sent sound
                this.playSentSound();
            }
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Failed to send message', 'error');
        }
    }

    // Handle typing indicator
    handleTyping() {
        if (!this.currentChatId || !this.currentUser) return;
        
        if (!this.isTyping) {
            this.isTyping = true;
            // Send typing started event
            database.ref(`typing/${this.currentChatId}/${this.currentUser.uid}`).set(true);
        }
        
        // Clear previous timeout
        clearTimeout(this.typingTimeout);
        
        // Set timeout to stop typing indicator
        this.typingTimeout = setTimeout(() => {
            this.isTyping = false;
            database.ref(`typing/${this.currentChatId}/${this.currentUser.uid}`).remove();
        }, 1000);
    }

    // Toggle attachment options
    toggleAttachmentOptions() {
        const options = document.getElementById('attachmentOptions');
        options.classList.toggle('show');
    }

    // Handle file upload for chat
    async handleFileUpload(files, type) {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        
        try {
            // Validate file
            if (type === 'image' && !imageKitHelpers.isImageFile(file)) {
                throw new Error('Please select an image file');
            }
            if (type === 'video' && !imageKitHelpers.isVideoFile(file)) {
                throw new Error('Please select a video file');
            }
            
            // Validate size
            const maxSize = type === 'image' ? 10 : 50; // MB
            imageKitHelpers.validateFileSize(file, maxSize);
            
            // Create preview
            let previewUrl;
            if (type === 'image') {
                previewUrl = await imageKitHelpers.createImagePreview(file);
            } else if (type === 'video') {
                const preview = await imageKitHelpers.createVideoPreview(file);
                previewUrl = preview.thumbnail;
            }
            
            // Show preview modal
            const previewContent = document.getElementById('mediaPreviewContent');
            previewContent.innerHTML = type === 'image' ?
                `<img src="${previewUrl}" alt="Preview" style="max-width: 100%; border-radius: 10px;">` :
                `<div style="position: relative;">
                    <img src="${previewUrl}" alt="Video preview" style="max-width: 100%; border-radius: 10px;">
                    <i class="fas fa-play" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 48px;"></i>
                </div>`;
            
            // Store file for sending
            previewContent.dataset.file = JSON.stringify({
                file: file,
                type: type
            });
            
            // Show modal
            document.getElementById('mediaPreviewModal').style.display = 'block';
            this.toggleAttachmentOptions();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Send media message
    async sendMediaMessage() {
        const previewContent = document.getElementById('mediaPreviewContent');
        const fileData = JSON.parse(previewContent.dataset.file);
        
        if (!fileData || !this.currentChatId || !this.currentUser) return;
        
        try {
            // Upload to ImageKit
            const uploadResult = await imageKitHelpers.uploadChatMedia(
                fileData.file,
                this.currentChatId,
                fileData.type
            );
            
            // Send message with media
            const result = await firebaseHelpers.sendMessage(
                this.currentChatId,
                this.currentUser.uid,
                fileData.type === 'image' ? '📷 Photo' : '🎥 Video',
                fileData.type,
                uploadResult.optimizedUrl
            );
            
            if (result.success) {
                this.closeAllModals();
                this.scrollToBottom();
                this.playSentSound();
            }
            
        } catch (error) {
            console.error('Error sending media:', error);
            this.showToast('Failed to send media: ' + error.message, 'error');
        }
    }

    // Show nickname modal
    showNicknameModal() {
        document.getElementById('nicknameModal').style.display = 'block';
        document.getElementById('nicknameInput').focus();
    }

    // Save nickname
    async saveNickname() {
        const nickname = document.getElementById('nicknameInput').value.trim();
        
        if (!nickname) {
            this.showToast('Please enter a nickname', 'error');
            return;
        }
        
        // Get current chat info from URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (!userId) return;
        
        try {
            // Save nickname to user's contacts
            await database.ref(`contacts/${this.currentUser.uid}/${userId}/nickname`).set(nickname);
            
            this.showToast('Nickname saved', 'success');
            this.closeAllModals();
            
            // Update chat header
            document.getElementById('chatUserName').textContent = nickname;
            
        } catch (error) {
            console.error('Error saving nickname:', error);
            this.showToast('Failed to save nickname', 'error');
        }
    }

    // Block user
    async blockUser() {
        if (!confirm('Are you sure you want to block this user?')) return;
        
        // Get current chat info from URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (!userId) return;
        
        try {
            // Add to blocked list
            await database.ref(`blocked/${this.currentUser.uid}/${userId}`).set({
                blockedAt: firebaseHelpers.getTimestamp()
            });
            
            this.showToast('User blocked', 'success');
            
            // Redirect back to home
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
            
        } catch (error) {
            console.error('Error blocking user:', error);
            this.showToast('Failed to block user', 'error');
        }
    }

    // Add to favorites
    async addToFavorites() {
        // Get current chat info from URL
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (!userId) return;
        
        try {
            // Add to favorites
            await database.ref(`favorites/${this.currentUser.uid}/${userId}`).set({
                addedAt: firebaseHelpers.getTimestamp()
            });
            
            this.showToast('Added to favorites', 'success');
            
        } catch (error) {
            console.error('Error adding to favorites:', error);
            this.showToast('Failed to add to favorites', 'error');
        }
    }

    // View user profile
    viewUserProfile() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        
        if (userId) {
            // Show profile modal (to be implemented)
            alert('Profile view feature coming soon!');
        }
    }

    // Delete chat
    async deleteChat() {
        if (!confirm('Are you sure you want to delete this chat? All messages will be lost.')) return;
        
        const chatId = this.currentChatId;
        
        if (!chatId) return;
        
        try {
            // Remove from user's chat list
            await database.ref(`userChats/${this.currentUser.uid}/${chatId}`).remove();
            
            this.showToast('Chat deleted', 'success');
            
            // Redirect back to home
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
            
        } catch (error) {
            console.error('Error deleting chat:', error);
            this.showToast('Failed to delete chat', 'error');
        }
    }

    // Report user
    reportUser() {
        const reason = prompt('Please enter the reason for reporting this user:');
        if (reason) {
            // Get current chat info
            const urlParams = new URLSearchParams(window.location.search);
            const userId = urlParams.get('userId');
            
            if (userId) {
                // Save report to database
                database.ref(`reports/${Date.now()}`).set({
                    reporterId: this.currentUser.uid,
                    reportedUserId: userId,
                    reason: reason,
                    timestamp: firebaseHelpers.getTimestamp()
                });
                
                this.showToast('User reported. Thank you for keeping Zynapse safe.', 'success');
            }
        }
    }

    // Check authentication state
    checkAuthState() {
        firebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                
                // Get user data
                this.userData = await firebaseHelpers.getUserData(user.uid);
                
                // Update UI
                this.updateUserUI();
                
                // Start realtime listeners
                this.setupRealtimeListeners();
                
                // Update online status
                this.updateOnlineStatus('online');
                
            } else {
                this.currentUser = null;
                this.userData = null;
                
                // Redirect to login if not on auth page
                if (!window.location.pathname.includes('index.html') && 
                    window.location.pathname !== '/') {
                    window.location.href = 'index.html';
                }
            }
        });
    }

    // Update user UI
    updateUserUI() {
        if (!this.userData) return;
        
        // Update user info in header
        const userNameElement = document.getElementById('userName');
        const userIdElement = document.getElementById('userID');
        const profilePicElement = document.getElementById('headerProfilePic');
        const chatUserNameElement = document.getElementById('chatUserName');
        const headerProfilePicElement = document.getElementById('headerProfilePic');
        
        if (userNameElement) userNameElement.textContent = this.userData.name;
        if (userIdElement) userIdElement.textContent = this.userData.zynapseId;
        if (profilePicElement && this.userData.profilePicThumbnail) {
            profilePicElement.src = this.userData.profilePicThumbnail;
        }
        if (headerProfilePicElement && this.userData.profilePicThumbnail) {
            headerProfilePicElement.src = this.userData.profilePicThumbnail;
        }
        
        // Update chat page if needed
        if (window.location.pathname.includes('chat.html')) {
            this.loadChatData();
        }
    }

    // Load chat data
    async loadChatData() {
        const urlParams = new URLSearchParams(window.location.search);
        this.currentChatId = urlParams.get('chatId');
        const otherUserId = urlParams.get('userId');
        
        if (!this.currentChatId || !otherUserId) return;
        
        try {
            // Get other user data
            const otherUserData = await firebaseHelpers.getUserData(otherUserId);
            
            if (otherUserData) {
                // Update chat header
                const chatUserName = document.getElementById('chatUserName');
                const chatUserPic = document.getElementById('chatUserPic');
                const chatUserStatus = document.getElementById('chatUserStatus');
                
                if (chatUserName) chatUserName.textContent = otherUserData.name;
                if (chatUserPic && otherUserData.profilePicThumbnail) {
                    chatUserPic.src = otherUserData.profilePicThumbnail;
                }
                if (chatUserStatus) {
                    chatUserStatus.textContent = otherUserData.status?.online ? 'Online' : 'Offline';
                    chatUserStatus.style.color = otherUserData.status?.online ? '#34C759' : '#8E8E93';
                }
            }
            
            // Load messages
            await this.loadMessages();
            
            // Listen for new messages
            this.listenForNewMessages();
            
            // Listen for typing indicators
            this.listenForTyping();
            
            // Mark messages as read
            firebaseHelpers.markMessagesAsRead(this.currentChatId, otherUserId);
            
        } catch (error) {
            console.error('Error loading chat data:', error);
        }
    }

    // Load messages
    async loadMessages() {
        const container = document.getElementById('chatMessages');
        if (!container || !this.currentChatId) return;
        
        try {
            const messages = await firebaseHelpers.getChatMessages(this.currentChatId, 50);
            
            container.innerHTML = '<div class="message-date">Today</div>';
            
            let lastDate = null;
            
            for (const messageId in messages) {
                const message = messages[messageId];
                
                // Format date
                const messageDate = new Date(message.timestamp);
                const today = new Date();
                const dateStr = messageDate.toDateString();
                
                // Add date separator if date changed
                if (dateStr !== lastDate) {
                    const dateElement = document.createElement('div');
                    dateElement.className = 'message-date';
                    dateElement.textContent = this.formatDate(messageDate);
                    container.appendChild(dateElement);
                    lastDate = dateStr;
                }
                
                // Create message element
                const messageElement = document.createElement('div');
                messageElement.className = `message ${message.senderId === this.currentUser.uid ? 'sent' : 'received'}`;
                
                let messageContent = '';
                if (message.type === 'text') {
                    messageContent = `<p>${this.escapeHtml(message.message)}</p>`;
                } else if (message.type === 'image') {
                    messageContent = `
                        <div class="media-message">
                            <img src="${imageKitHelpers.getOptimizedImage(message.mediaUrl, 300, 300)}" 
                                 alt="Image" onclick="window.open('${message.mediaUrl}', '_blank')">
                        </div>
                    `;
                } else if (message.type === 'video') {
                    messageContent = `
                        <div class="media-message">
                            <video src="${message.mediaUrl}" controls></video>
                        </div>
                    `;
                }
                
                messageElement.innerHTML = `
                    <div class="message-bubble">
                        ${messageContent}
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                        ${message.senderId === this.currentUser.uid ? 
                            `<span class="message-status">${message.read ? '✓✓' : '✓'}</span>` : ''}
                    </div>
                `;
                
                container.appendChild(messageElement);
            }
            
            // Scroll to bottom
            this.scrollToBottom();
            
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    // Listen for new messages
    listenForNewMessages() {
        if (!this.currentChatId) return;
        
        database.ref(`messages/${this.currentChatId}`).on('child_added', (snapshot) => {
            const message = snapshot.val();
            
            // Skip if message is from current user (already added when sent)
            if (message.senderId === this.currentUser.uid) return;
            
            this.addMessageToChat(message);
            
            // Play notification sound if not focused
            if (document.hidden) {
                this.playNotificationSound();
            }
            
            // Mark as read
            database.ref(`messages/${this.currentChatId}/${snapshot.key}/read`).set(true);
        });
    }

    // Listen for typing indicators
    listenForTyping() {
        if (!this.currentChatId) return;
        
        database.ref(`typing/${this.currentChatId}`).on('child_added', (snapshot) => {
            if (snapshot.key !== this.currentUser.uid) {
                this.showTypingIndicator(snapshot.key);
            }
        });
        
        database.ref(`typing/${this.currentChatId}`).on('child_removed', () => {
            this.hideTypingIndicator();
        });
    }

    // Add message to chat
    addMessageToChat(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Remove typing indicator if exists
        this.hideTypingIndicator();
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === this.currentUser.uid ? 'sent' : 'received'}`;
        
        let messageContent = '';
        if (message.type === 'text') {
            messageContent = `<p>${this.escapeHtml(message.message)}</p>`;
        } else if (message.type === 'image') {
            messageContent = `
                <div class="media-message">
                    <img src="${imageKitHelpers.getOptimizedImage(message.mediaUrl, 300, 300)}" 
                         alt="Image" onclick="window.open('${message.mediaUrl}', '_blank')">
                </div>
            `;
        } else if (message.type === 'video') {
            messageContent = `
                <div class="media-message">
                    <video src="${message.mediaUrl}" controls></video>
                </div>
            `;
        }
        
        messageElement.innerHTML = `
            <div class="message-bubble">
                ${messageContent}
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
        `;
        
        container.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Show typing indicator
    async showTypingIndicator(userId) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Remove existing typing indicator
        this.hideTypingIndicator();
        
        // Get user name
        const userData = await firebaseHelpers.getUserData(userId);
        const userName = userData?.name || 'User';
        
        const typingElement = document.createElement('div');
        typingElement.className = 'message received';
        typingElement.id = 'typing-indicator';
        typingElement.innerHTML = `
            <div class="message-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span class="message-time">${userName} is typing...</span>
            </div>
        `;
        
        container.appendChild(typingElement);
        this.scrollToBottom();
    }

    // Hide typing indicator
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Scroll to bottom of chat
    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // Setup realtime listeners
    setupRealtimeListeners() {
        if (!this.currentUser) return;
        
        // Listen for new chat requests
        this.listenForNewRequests();
        
        // Listen for new messages in all chats
        this.listenForAllNewMessages();
        
        // Listen for user status changes
        this.listenForUserStatus();
    }

    // Listen for new chat requests
    listenForNewRequests() {
        if (!this.currentUser) return;
        
        database.ref(`chatRequests/${this.currentUser.uid}`).on('child_added', (snapshot) => {
            const request = snapshot.val();
            
            if (request.direction === 'received' && request.status === 'pending') {
                // Update badge
                this.updateRequestsBadge();
                
                // Play notification sound
                this.playNotificationSound();
                
                // Show notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('New Chat Request', {
                        body: `${request.fromUserName} sent you a chat request`,
                        icon: 'zynaps.png'
                    });
                }
                
                // Refresh requests page if active
                if (this.currentPage === 'requests') {
                    this.loadChatRequests();
                }
            }
        });
    }

    // Listen for all new messages
    listenForAllNewMessages() {
        if (!this.currentUser) return;
        
        database.ref(`userChats/${this.currentUser.uid}`).on('child_changed', (snapshot) => {
            const chat = snapshot.val();
            
            // Play notification sound if not in that chat
            if (chat.unreadCount > 0 && this.currentChatId !== snapshot.key) {
                this.playNotificationSound();
                
                // Update unread badge on nav if implemented
            }
        });
    }

    // Listen for user status changes
    listenForUserStatus() {
        if (!this.currentUser) return;
        
        // Listen for contacts status changes
        database.ref('users').on('child_changed', (snapshot) => {
            const user = snapshot.val();
            
            // Update contact status if on contacts page
            if (this.currentPage === 'contacts') {
                // This would require more specific implementation
                // For now, just note that status changed
            }
        });
    }

    // Update requests badge
    async updateRequestsBadge() {
        const badge = document.getElementById('requestsBadge');
        if (!badge) return;
        
        try {
            const requests = await firebaseHelpers.getChatRequests(this.currentUser.uid, 'received');
            const count = Object.keys(requests).length;
            
            badge.textContent = count > 0 ? count : '';
            badge.style.display = count > 0 ? 'flex' : 'none';
            
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    // Update online status
    async updateOnlineStatus(status = 'online') {
        if (!this.currentUser) return;
        
        try {
            await firebaseHelpers.updateUserStatus(this.currentUser.uid, status);
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }

    // Close all modals
    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Hide attachment options
        document.getElementById('attachmentOptions')?.classList.remove('show');
    }

    // Show loading state
    showLoading(buttonId, textId, spinnerId) {
        const button = document.querySelector(buttonId);
        const text = document.querySelector(textId);
        const spinner = document.querySelector(spinnerId);
        
        if (button) button.disabled = true;
        if (text) text.style.display = 'none';
        if (spinner) spinner.style.display = 'block';
    }

    // Hide loading state
    hideLoading(buttonId, textId, spinnerId) {
        const button = document.querySelector(buttonId);
        const text = document.querySelector(textId);
        const spinner = document.querySelector(spinnerId);
        
        if (button) button.disabled = false;
        if (text) text.style.display = 'block';
        if (spinner) spinner.style.display = 'none';
    }

    // Show toast notification
    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.toast').forEach(toast => toast.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Get toast icon
    getToastIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    // Play notification sound
    playNotificationSound() {
        const sound = document.getElementById('notificationSound');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    // Play sent sound
    playSentSound() {
        // You can add a different sound for sent messages
        // For now, use the same notification sound
        this.playNotificationSound();
    }

    // Generate Zynapse ID
    generateZynapseId() {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `ZYN-${randomNum}`;
    }

    // Reset password
    async resetPassword(email) {
        try {
            await firebaseAuth.sendPasswordResetEmail(email);
            this.showToast('Password reset email sent', 'success');
        } catch (error) {
            console.error('Reset password error:', error);
            this.showToast(this.getErrorMessage(error), 'error');
        }
    }

    // Get error message
    getErrorMessage(error) {
        switch(error.code) {
            case 'auth/email-already-in-use':
                return 'Email already in use';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/operation-not-allowed':
                return 'Operation not allowed';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/user-disabled':
                return 'User account is disabled';
            case 'auth/user-not-found':
                return 'User not found';
            case 'auth/wrong-password':
                return 'Wrong password';
            case 'auth/network-request-failed':
                return 'Network error. Please check your connection';
            default:
                return error.message || 'An error occurred';
        }
    }

    // Format time
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Format date
    formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    }

    // Get time ago
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        const week = 7 * day;
        const month = 30 * day;
        
        if (diff < minute) {
            return 'Just now';
        } else if (diff < hour) {
            const minutes = Math.floor(diff / minute);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diff < day) {
            const hours = Math.floor(diff / hour);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (diff < week) {
            const days = Math.floor(diff / day);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (diff < month) {
            const weeks = Math.floor(diff / week);
            return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
            const months = Math.floor(diff / month);
            return `${months} month${months > 1 ? 's' : ''} ago`;
        }
    }

    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.zynapseApp = new ZynapseApp();
});

// Export for use in other files
window.ZynapseApp = ZynapseApp;
