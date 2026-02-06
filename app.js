/**
 * Zynapse Application Controller
 * Production Version
 * 
 * Features:
 * - Full user authentication
 * - Real-time chat with images/videos
 * - Status updates (Zynes)
 * - Group chats
 * - Image/video handling via ImageKit
 * - Firebase Realtime Database for text data
 */

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
        this.uploadQueue = [];
        this.isProcessingQueue = false;
        
        this.init();
    }

    // Initialize application
    async init() {
        console.log('Zynapse App Initializing...');
        
        try {
            this.bindEvents();
            this.checkAuthState();
            this.setupRealtimeListeners();
            this.updateOnlineStatus();
            
            // Initialize ImageKit
            if (window.imageKitHelpers && typeof window.imageKitHelpers.init === 'function') {
                await window.imageKitHelpers.init();
            }
            
            console.log('Zynapse App Initialized Successfully');
            
            // Play welcome sound
            this.playNotificationSound();
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showToast('App initialization failed. Please refresh.', 'error');
        }
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
        
        // Global click handler
        this.bindGlobalEvents();
    }

    // Authentication events
    bindAuthEvents() {
        // Welcome screen buttons
        const signInBtn = document.getElementById('signInBtn');
        const signUpBtn = document.getElementById('signUpBtn');
        
        if (signInBtn) {
            signInBtn.addEventListener('click', () => this.showLoginForm());
        }
        
        if (signUpBtn) {
            signUpBtn.addEventListener('click', () => this.showSignupForm());
        }
        
        // Back buttons
        const backToWelcome = document.getElementById('backToWelcome');
        const backToWelcome2 = document.getElementById('backToWelcome2');
        const haveAccount = document.getElementById('haveAccount');
        
        if (backToWelcome) {
            backToWelcome.addEventListener('click', (e) => {
                e.preventDefault();
                this.showWelcomeScreen();
            });
        }
        
        if (backToWelcome2) {
            backToWelcome2.addEventListener('click', (e) => {
                e.preventDefault();
                this.showWelcomeScreen();
            });
        }
        
        if (haveAccount) {
            haveAccount.addEventListener('click', (e) => {
                e.preventDefault();
                this.showLoginForm();
            });
        }
        
        // Forgot password
        const forgotPassword = document.getElementById('forgotPassword');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPassword();
            });
        }
        
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
        const uploadProfileBtn = document.getElementById('uploadProfileBtn');
        const profileImage = document.getElementById('profileImage');
        
        if (uploadProfileBtn) {
            uploadProfileBtn.addEventListener('click', () => {
                if (profileImage) profileImage.click();
            });
        }
        
        if (profileImage) {
            profileImage.addEventListener('change', (e) => {
                this.handleProfileImageUpload(e.target.files[0]);
            });
        }
        
        // Login form submission
        const loginForm = document.getElementById('loginFormFields');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Signup form submission
        const signupForm = document.getElementById('signupFormFields');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignup();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    // Home page events
    bindHomeEvents() {
        // Copy user ID button
        const copyUserIdBtn = document.getElementById('copyUserIdBtn');
        if (copyUserIdBtn) {
            copyUserIdBtn.addEventListener('click', () => {
                this.copyUserId();
            });
        }
        
        // Start chat button
        const startChatBtn = document.getElementById('startChatBtn');
        if (startChatBtn) {
            startChatBtn.addEventListener('click', () => {
                this.showStartChatPopup();
            });
        }
        
        // Search user ID input
        const searchUserId = document.getElementById('searchUserId');
        if (searchUserId) {
            searchUserId.addEventListener('input', (e) => {
                this.searchUserById(e.target.value);
            });
        }
        
        // Send request button
        const sendRequestBtn = document.getElementById('sendRequestBtn');
        if (sendRequestBtn) {
            sendRequestBtn.addEventListener('click', () => {
                this.sendChatRequest();
            });
        }
        
        // Add Zyne button
        const addZyneBtn = document.getElementById('addZyneBtn');
        if (addZyneBtn) {
            addZyneBtn.addEventListener('click', () => {
                this.showAddZyneModal();
            });
        }
        
        // Create group button
        const createGroupBtn = document.getElementById('createGroupBtn');
        if (createGroupBtn) {
            createGroupBtn.addEventListener('click', () => {
                this.showCreateGroupModal();
            });
        }
        
        // Add member button
        const addMemberBtn = document.getElementById('addMemberBtn');
        if (addMemberBtn) {
            addMemberBtn.addEventListener('click', () => {
                this.addGroupMember();
            });
        }
        
        // Post Zyne button
        const postZyneBtn = document.getElementById('postZyneBtn');
        if (postZyneBtn) {
            postZyneBtn.addEventListener('click', () => {
                this.postZyne();
            });
        }
        
        // Create group submit
        const createGroupSubmitBtn = document.getElementById('createGroupSubmitBtn');
        if (createGroupSubmitBtn) {
            createGroupSubmitBtn.addEventListener('click', () => {
                this.createGroup();
            });
        }
        
        // Add photo/video to Zyne
        const addPhotoBtn = document.getElementById('addPhotoBtn');
        const addVideoBtn = document.getElementById('addVideoBtn');
        const zynePhotoInput = document.getElementById('zynePhotoInput');
        const zyneVideoInput = document.getElementById('zyneVideoInput');
        
        if (addPhotoBtn) {
            addPhotoBtn.addEventListener('click', () => {
                if (zynePhotoInput) zynePhotoInput.click();
            });
        }
        
        if (addVideoBtn) {
            addVideoBtn.addEventListener('click', () => {
                if (zyneVideoInput) zyneVideoInput.click();
            });
        }
        
        if (zynePhotoInput) {
            zynePhotoInput.addEventListener('change', (e) => {
                this.handleZyneMediaUpload(e.target.files[0], 'image');
            });
        }
        
        if (zyneVideoInput) {
            zyneVideoInput.addEventListener('change', (e) => {
                this.handleZyneMediaUpload(e.target.files[0], 'video');
            });
        }
        
        // Upload group image
        const uploadGroupImageBtn = document.getElementById('uploadGroupImageBtn');
        const groupImageInput = document.getElementById('groupImageInput');
        
        if (uploadGroupImageBtn) {
            uploadGroupImageBtn.addEventListener('click', () => {
                if (groupImageInput) groupImageInput.click();
            });
        }
        
        if (groupImageInput) {
            groupImageInput.addEventListener('change', (e) => {
                this.handleGroupImageUpload(e.target.files[0]);
            });
        }
    }

    // Chat page events
    bindChatEvents() {
        // Send message button
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }
        
        // Message input enter key
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            // Message input typing indicator
            messageInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }
        
        // Attachment button
        const attachBtn = document.getElementById('attachBtn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                this.toggleAttachmentOptions();
            });
        }
        
        // Attachment options
        const attachPhotoBtn = document.getElementById('attachPhotoBtn');
        const attachVideoBtn = document.getElementById('attachVideoBtn');
        const attachDocumentBtn = document.getElementById('attachDocumentBtn');
        const photoInput = document.getElementById('photoInput');
        const videoInput = document.getElementById('videoInput');
        const documentInput = document.getElementById('documentInput');
        
        if (attachPhotoBtn) {
            attachPhotoBtn.addEventListener('click', () => {
                if (photoInput) photoInput.click();
            });
        }
        
        if (attachVideoBtn) {
            attachVideoBtn.addEventListener('click', () => {
                if (videoInput) videoInput.click();
            });
        }
        
        if (attachDocumentBtn) {
            attachDocumentBtn.addEventListener('click', () => {
                if (documentInput) documentInput.click();
            });
        }
        
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files, 'image');
            });
        }
        
        if (videoInput) {
            videoInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files, 'video');
            });
        }
        
        if (documentInput) {
            documentInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files, 'document');
            });
        }
        
        // Chat menu options
        const addNicknameBtn = document.getElementById('addNicknameBtn');
        const blockUserBtn = document.getElementById('blockUserBtn');
        const addToFavoritesBtn = document.getElementById('addToFavoritesBtn');
        const viewProfileBtn = document.getElementById('viewProfileBtn');
        const deleteChatBtn = document.getElementById('deleteChatBtn');
        const reportUserBtn = document.getElementById('reportUserBtn');
        
        if (addNicknameBtn) {
            addNicknameBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNicknameModal();
            });
        }
        
        if (blockUserBtn) {
            blockUserBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.blockUser();
            });
        }
        
        if (addToFavoritesBtn) {
            addToFavoritesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.addToFavorites();
            });
        }
        
        if (viewProfileBtn) {
            viewProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.viewUserProfile();
            });
        }
        
        if (deleteChatBtn) {
            deleteChatBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteChat();
            });
        }
        
        if (reportUserBtn) {
            reportUserBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.reportUser();
            });
        }
        
        // Save nickname
        const saveNicknameBtn = document.getElementById('saveNicknameBtn');
        if (saveNicknameBtn) {
            saveNicknameBtn.addEventListener('click', () => {
                this.saveNickname();
            });
        }
        
        // Send media button
        const sendMediaBtn = document.getElementById('sendMediaBtn');
        if (sendMediaBtn) {
            sendMediaBtn.addEventListener('click', () => {
                this.sendMediaMessage();
            });
        }
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
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                window.history.back();
            });
        }
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

    // Global events
    bindGlobalEvents() {
        // Click outside attachment options
        document.addEventListener('click', (e) => {
            const attachmentOptions = document.getElementById('attachmentOptions');
            const attachBtn = document.getElementById('attachBtn');
            
            if (attachmentOptions && attachmentOptions.classList.contains('show') && 
                !attachmentOptions.contains(e.target) && 
                attachBtn && !attachBtn.contains(e.target)) {
                attachmentOptions.classList.remove('show');
            }
        });
        
        // Handle clicks on dynamic elements
        document.addEventListener('click', (e) => {
            // Handle accept/reject request buttons
            if (e.target.closest('.accept-btn')) {
                const btn = e.target.closest('.accept-btn');
                this.handleRequestAction(btn.dataset.requestId, 'accepted');
            }
            
            if (e.target.closest('.reject-btn')) {
                const btn = e.target.closest('.reject-btn');
                this.handleRequestAction(btn.dataset.requestId, 'rejected');
            }
            
            // Handle chat buttons in contacts
            if (e.target.closest('.chat-btn')) {
                const btn = e.target.closest('.chat-btn');
                if (btn.dataset.userId) {
                    this.startChat(btn.dataset.userId);
                } else if (btn.dataset.groupId) {
                    this.startGroupChat(btn.dataset.groupId);
                }
            }
        });
    }

    // Show welcome screen
    showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (welcomeScreen) welcomeScreen.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'none';
    }

    // Show login form
    showLoginForm() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (signupForm) signupForm.style.display = 'none';
    }

    // Show signup form
    showSignupForm() {
        const welcomeScreen = document.getElementById('welcomeScreen');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
        if (signupForm) signupForm.style.display = 'block';
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
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;
        
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
                
                // Update online status
                await this.updateOnlineStatus('online');
                
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
        const name = document.getElementById('signupName')?.value;
        const phone = document.getElementById('signupPhone')?.value;
        const email = document.getElementById('signupEmail')?.value;
        const password = document.getElementById('signupPassword')?.value;
        const confirmPassword = document.getElementById('signupConfirmPassword')?.value;
        const profileImage = document.getElementById('profileImage')?.files[0];
        
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
                    // Upload to ImageKit server
                    const formData = new FormData();
                    formData.append('file', profileImage);
                    formData.append('fileName', `profile_${user.uid}_${Date.now()}.${profileImage.name.split('.').pop()}`);
                    formData.append('folder', '/zynapse/profiles');
                    
                    const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/upload', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        throw new Error('Profile picture upload failed');
                    }
                    
                    const result = await response.json();
                    profilePicUrl = result.url;
                    
                    // Generate thumbnail URL
                    if (window.imageKitHelpers && window.imageKitHelpers.getOptimizedImage) {
                        profilePicThumbnail = window.imageKitHelpers.getOptimizedImage(profilePicUrl, 150, 150);
                    } else {
                        profilePicThumbnail = profilePicUrl;
                    }
                    
                } catch (uploadError) {
                    console.warn('Profile picture upload failed:', uploadError);
                    // Continue without profile picture
                }
            }
            
            // 4. Create user data object
            const userData = {
                uid: user.uid,
                name: name.trim(),
                phone: phone.trim(),
                email: email.trim(),
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
            
            // Update online status
            await this.updateOnlineStatus('online');
            
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
        
        const previewElement = document.getElementById('profilePreview');
        if (!previewElement) return;
        
        try {
            // Check if file is image
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select an image file', 'error');
                return;
            }
            
            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image size must be less than 5MB', 'error');
                return;
            }
            
            // Create preview
            const preview = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
            
            previewElement.innerHTML = '';
            const img = document.createElement('img');
            img.src = preview;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            previewElement.appendChild(img);
            
        } catch (error) {
            console.error('Profile image preview error:', error);
            this.showToast('Failed to load image preview', 'error');
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
        const userId = document.getElementById('userID')?.textContent;
        if (!userId) return;
        
        navigator.clipboard.writeText(userId).then(() => {
            this.showToast('Zynapse ID copied to clipboard', 'success');
        }).catch(err => {
            console.error('Copy failed:', err);
            this.showToast('Failed to copy ID', 'error');
        });
    }

    // Show start chat popup
    showStartChatPopup() {
        const popup = document.getElementById('startChatPopup');
        if (popup) {
            popup.style.display = 'block';
            const searchInput = document.getElementById('searchUserId');
            if (searchInput) searchInput.focus();
        }
    }

    // Search user by ID
    async searchUserById(zynapseId) {
        const searchResult = document.getElementById('userSearchResult');
        const sendRequestBtn = document.getElementById('sendRequestBtn');
        
        if (!searchResult || !sendRequestBtn) return;
        
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
                            <h4>${this.escapeHtml(user.name)}</h4>
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
        if (!sendRequestBtn) return;
        
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
                
                let mediaContent = '';
                if (zyne.mediaUrl) {
                    if (zyne.type === 'image') {
                        mediaContent = `
                            <img src="${this.getOptimizedImageUrl(zyne.mediaUrl, 400, 400)}" 
                                 alt="Zyne" class="zyne-media">
                        `;
                    } else if (zyne.type === 'video') {
                        mediaContent = `
                            <video src="${zyne.mediaUrl}" 
                                   controls 
                                   class="zyne-media">
                            </video>
                        `;
                    }
                }
                
                zyneElement.innerHTML = `
                    <div class="zyne-content">
                        ${mediaContent}
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

    // Start group chat
    async startGroupChat(groupId) {
        try {
            // Redirect to chat page with group ID
            window.location.href = `chat.html?groupId=${groupId}`;
        } catch (error) {
            console.error('Error starting group chat:', error);
            this.showToast('Failed to start group chat', 'error');
        }
    }

    // Show add Zyne modal
    showAddZyneModal() {
        const modal = document.getElementById('addZyneModal');
        if (modal) {
            modal.style.display = 'block';
            const zyneText = document.getElementById('zyneText');
            if (zyneText) zyneText.focus();
        }
    }

    // Handle Zyne media upload
    async handleZyneMediaUpload(file, type) {
        if (!file) return;
        
        const previewContainer = document.getElementById('zyneMediaPreview');
        if (!previewContainer) return;
        
        try {
            // Validate file
            if (type === 'image' && !file.type.startsWith('image/')) {
                throw new Error('Please select an image file');
            }
            if (type === 'video' && !file.type.startsWith('video/')) {
                throw new Error('Please select a video file');
            }
            
            // Validate size
            const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for images, 50MB for videos
            if (file.size > maxSize) {
                throw new Error(`File size must be less than ${type === 'image' ? '10MB' : '50MB'}`);
            }
            
            // Create preview
            let previewUrl;
            if (type === 'image') {
                previewUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            } else if (type === 'video') {
                previewUrl = await new Promise((resolve, reject) => {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    
                    video.onloadedmetadata = () => {
                        URL.revokeObjectURL(video.src);
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg'));
                    };
                    
                    video.onerror = () => reject(new Error('Failed to load video'));
                    video.src = URL.createObjectURL(file);
                });
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
        const text = document.getElementById('zyneText')?.value || '';
        const previewItems = document.querySelectorAll('#zyneMediaPreview .preview-item');
        
        if (!text.trim() && previewItems.length === 0) {
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
                
                // Upload to ImageKit server
                const formData = new FormData();
                formData.append('file', file);
                formData.append('fileName', `zyne_${this.currentUser.uid}_${Date.now()}.${file.name.split('.').pop()}`);
                formData.append('folder', '/zynapse/zynes');
                
                const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Media upload failed');
                }
                
                const result = await response.json();
                mediaUrl = result.url;
                mediaType = type;
            }
            
            // Create Zyne
            const result = await firebaseHelpers.createZyne(
                this.currentUser.uid,
                text.trim(),
                mediaType,
                mediaUrl
            );
            
            if (result.success) {
                this.showToast('Zyne posted successfully', 'success');
                this.closeAllModals();
                
                // Clear form
                const zyneText = document.getElementById('zyneText');
                const zyneMediaPreview = document.getElementById('zyneMediaPreview');
                if (zyneText) zyneText.value = '';
                if (zyneMediaPreview) zyneMediaPreview.innerHTML = '';
                
                // Reload Zynes
                await this.loadZynes();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error posting zyne:', error);
            this.showToast('Failed to post zyne: ' + error.message, 'error');
        }
    }

    // Show create group modal
    showCreateGroupModal() {
        const modal = document.getElementById('createGroupModal');
        if (modal) {
            modal.style.display = 'block';
            const groupName = document.getElementById('groupName');
            if (groupName) groupName.focus();
        }
    }

    // Handle group image upload
    async handleGroupImageUpload(file) {
        if (!file) return;
        
        const previewElement = document.getElementById('groupImagePreview');
        if (!previewElement) return;
        
        try {
            if (!file.type.startsWith('image/')) {
                this.showToast('Please select an image file', 'error');
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('Image size must be less than 5MB', 'error');
                return;
            }
            
            const preview = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });
            
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
        const membersList = document.getElementById('membersList');
        
        if (!input || !membersList) return;
        
        const zynapseId = input.value.trim().toUpperCase();
        
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
        const groupName = document.getElementById('groupName')?.value.trim();
        const membersList = document.getElementById('membersList');
        const memberTags = membersList ? membersList.querySelectorAll('.member-tag') : [];
        
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
            if (previewElement && previewElement.dataset.file) {
                const file = JSON.parse(previewElement.dataset.file);
                
                // Upload to ImageKit server
                const formData = new FormData();
                formData.append('file', file);
                formData.append('fileName', `group_${Date.now()}.${file.name.split('.').pop()}`);
                formData.append('folder', '/zynapse/groups');
                
                const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    const result = await response.json();
                    profilePic = result.url;
                }
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
                const groupNameInput = document.getElementById('groupName');
                const groupImagePreview = document.getElementById('groupImagePreview');
                
                if (groupNameInput) groupNameInput.value = '';
                if (groupImagePreview) {
                    groupImagePreview.innerHTML = '<i class="fas fa-users"></i><span>Group Photo</span>';
                    delete groupImagePreview.dataset.file;
                }
                if (membersList) membersList.innerHTML = '';
                
                // Reload groups
                await this.loadGroups();
            } else {
                throw new Error(result.error);
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
        if (!input) return;
        
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
        if (options) {
            options.classList.toggle('show');
        }
    }

    // Handle file upload for chat
    async handleFileUpload(files, type) {
        if (!files || files.length === 0) return;
        
        const file = files[0];
        
        try {
            // Validate file
            if (type === 'image' && !file.type.startsWith('image/')) {
                throw new Error('Please select an image file');
            }
            if (type === 'video' && !file.type.startsWith('video/')) {
                throw new Error('Please select a video file');
            }
            
            // Validate size
            const maxSize = type === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error(`File size must be less than ${type === 'image' ? '10MB' : '50MB'}`);
            }
            
            // Create preview
            let previewUrl;
            if (type === 'image') {
                previewUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            } else if (type === 'video') {
                previewUrl = await new Promise((resolve, reject) => {
                    const video = document.createElement('video');
                    video.preload = 'metadata';
                    
                    video.onloadedmetadata = () => {
                        URL.revokeObjectURL(video.src);
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        context.drawImage(video, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg'));
                    };
                    
                    video.onerror = () => reject(new Error('Failed to load video'));
                    video.src = URL.createObjectURL(file);
                });
            }
            
            // Show preview modal
            const previewContent = document.getElementById('mediaPreviewContent');
            if (!previewContent) return;
            
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
            const modal = document.getElementById('mediaPreviewModal');
            if (modal) {
                modal.style.display = 'block';
            }
            this.toggleAttachmentOptions();
            
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Send media message
    async sendMediaMessage() {
        const previewContent = document.getElementById('mediaPreviewContent');
        if (!previewContent || !previewContent.dataset.file) return;
        
        const fileData = JSON.parse(previewContent.dataset.file);
        
        if (!fileData || !this.currentChatId || !this.currentUser) return;
        
        try {
            // Upload to ImageKit server
            const formData = new FormData();
            formData.append('file', fileData.file);
            formData.append('fileName', `${fileData.type}_${this.currentChatId}_${Date.now()}.${fileData.file.name.split('.').pop()}`);
            formData.append('folder', `/zynapse/chat/${fileData.type === 'image' ? 'images' : 'videos'}`);
            
            const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Media upload failed');
            }
            
            const result = await response.json();
            const mediaUrl = result.url;
            
            // Send message with media
            const sendResult = await firebaseHelpers.sendMessage(
                this.currentChatId,
                this.currentUser.uid,
                fileData.type === 'image' ? '📷 Photo' : '🎥 Video',
                fileData.type,
                mediaUrl
            );
            
            if (sendResult.success) {
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
        const modal = document.getElementById('nicknameModal');
        if (modal) {
            modal.style.display = 'block';
            const nicknameInput = document.getElementById('nicknameInput');
            if (nicknameInput) nicknameInput.focus();
        }
    }

    // Save nickname
    async saveNickname() {
        const nicknameInput = document.getElementById('nicknameInput');
        if (!nicknameInput) return;
        
        const nickname = nicknameInput.value.trim();
        
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
            const chatUserName = document.getElementById('chatUserName');
            if (chatUserName) {
                chatUserName.textContent = nickname;
            }
            
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
                
                try {
                    // Get user data
                    this.userData = await firebaseHelpers.getUserData(user.uid);
                    
                    // Update UI
                    this.updateUserUI();
                    
                    // Start realtime listeners
                    this.setupRealtimeListeners();
                    
                    // Update online status
                    await this.updateOnlineStatus('online');
                    
                    // Update requests badge
                    await this.updateRequestsBadge();
                    
                } catch (error) {
                    console.error('Error loading user data:', error);
                }
                
            } else {
                this.currentUser = null;
                this.userData = null;
                
                // Clear realtime listeners
                this.clearRealtimeListeners();
                
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
            await firebaseHelpers.markMessagesAsRead(this.currentChatId, otherUserId);
            
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
            
            // Sort messages by timestamp
            const sortedMessages = Object.values(messages).sort((a, b) => a.timestamp - b.timestamp);
            
            for (const message of sortedMessages) {
                // Format date
                const messageDate = new Date(message.timestamp);
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
                    const optimizedUrl = this.getOptimizedImageUrl(message.mediaUrl, 300, 300);
                    messageContent = `
                        <div class="media-message">
                            <img src="${optimizedUrl}" 
                                 alt="Image" 
                                 class="chat-media"
                                 onclick="window.open('${message.mediaUrl}', '_blank')">
                        </div>
                    `;
                } else if (message.type === 'video') {
                    messageContent = `
                        <div class="media-message">
                            <video src="${message.mediaUrl}" 
                                   controls 
                                   class="chat-media">
                            </video>
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
            container.innerHTML = '<p class="error">Error loading messages</p>';
        }
    }

    // Listen for new messages
    listenForNewMessages() {
        if (!this.currentChatId) return;
        
        const messageRef = database.ref(`messages/${this.currentChatId}`);
        
        // Store listener for cleanup
        this.realtimeListeners['messages'] = messageRef;
        
        messageRef.on('child_added', (snapshot) => {
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
        
        const typingRef = database.ref(`typing/${this.currentChatId}`);
        
        // Store listener for cleanup
        this.realtimeListeners['typing'] = typingRef;
        
        typingRef.on('child_added', (snapshot) => {
            if (snapshot.key !== this.currentUser.uid) {
                this.showTypingIndicator(snapshot.key);
            }
        });
        
        typingRef.on('child_removed', () => {
            this.hideTypingIndicator();
        });
    }

    // Add message to chat
    async addMessageToChat(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        // Remove typing indicator if exists
        this.hideTypingIndicator();
        
        // Check if message already exists
        const existingMessage = container.querySelector(`[data-message-id="${message.id}"]`);
        if (existingMessage) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.senderId === this.currentUser.uid ? 'sent' : 'received'}`;
        messageElement.dataset.messageId = message.id;
        
        let messageContent = '';
        if (message.type === 'text') {
            messageContent = `<p>${this.escapeHtml(message.message)}</p>`;
        } else if (message.type === 'image') {
            const optimizedUrl = this.getOptimizedImageUrl(message.mediaUrl, 300, 300);
            messageContent = `
                <div class="media-message">
                    <img src="${optimizedUrl}" 
                         alt="Image" 
                         class="chat-media"
                         onclick="window.open('${message.mediaUrl}', '_blank')">
                </div>
            `;
        } else if (message.type === 'video') {
            messageContent = `
                <div class="media-message">
                    <video src="${message.mediaUrl}" 
                           controls 
                           class="chat-media">
                    </video>
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
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
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

    // Clear realtime listeners
    clearRealtimeListeners() {
        Object.values(this.realtimeListeners).forEach(listener => {
            if (listener && typeof listener.off === 'function') {
                listener.off();
            }
        });
        this.realtimeListeners = {};
    }

    // Listen for new chat requests
    listenForNewRequests() {
        if (!this.currentUser) return;
        
        const requestsRef = database.ref(`chatRequests/${this.currentUser.uid}`);
        
        // Store listener for cleanup
        this.realtimeListeners['requests'] = requestsRef;
        
        requestsRef.on('child_added', (snapshot) => {
            const request = snapshot.val();
            
            if (request.direction === 'received' && request.status === 'pending') {
                // Update badge
                this.updateRequestsBadge();
                
                // Play notification sound
                this.playNotificationSound();
                
                // Show notification if permitted
                if ('Notification' in window && Notification.permission === 'granted') {
                    try {
                        new Notification('New Chat Request', {
                            body: `${request.fromUserName} sent you a chat request`,
                            icon: 'zynaps.png'
                        });
                    } catch (error) {
                        console.error('Notification error:', error);
                    }
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
        
        const userChatsRef = database.ref(`userChats/${this.currentUser.uid}`);
        
        // Store listener for cleanup
        this.realtimeListeners['userChats'] = userChatsRef;
        
        userChatsRef.on('child_changed', (snapshot) => {
            const chat = snapshot.val();
            
            // Play notification sound if not in that chat
            if (chat.unreadCount > 0 && this.currentChatId !== snapshot.key) {
                this.playNotificationSound();
                
                // Update unread badge
                this.updateUnreadBadges();
            }
        });
    }

    // Listen for user status changes
    listenForUserStatus() {
        if (!this.currentUser) return;
        
        const usersRef = database.ref('users');
        
        // Store listener for cleanup
        this.realtimeListeners['users'] = usersRef;
        
        usersRef.on('child_changed', (snapshot) => {
            const user = snapshot.val();
            
            // Update contact status if on contacts page
            if (this.currentPage === 'contacts') {
                // Trigger a UI update (could be optimized)
                this.loadContacts();
            }
            
            // Update chat header status if viewing that user's chat
            if (this.currentChatId) {
                const urlParams = new URLSearchParams(window.location.search);
                const userId = urlParams.get('userId');
                
                if (userId === snapshot.key) {
                    const chatUserStatus = document.getElementById('chatUserStatus');
                    if (chatUserStatus) {
                        chatUserStatus.textContent = user.status?.online ? 'Online' : 'Offline';
                        chatUserStatus.style.color = user.status?.online ? '#34C759' : '#8E8E93';
                    }
                }
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
            
            badge.textContent = count > 0 ? (count > 99 ? '99+' : count.toString()) : '';
            badge.style.display = count > 0 ? 'flex' : 'none';
            
        } catch (error) {
            console.error('Error updating badge:', error);
        }
    }

    // Update unread badges
    async updateUnreadBadges() {
        // Implementation for updating unread message badges
        // This would depend on your UI design
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
        const attachmentOptions = document.getElementById('attachmentOptions');
        if (attachmentOptions) {
            attachmentOptions.classList.remove('show');
        }
        
        // Clear any previews
        const mediaPreviewContent = document.getElementById('mediaPreviewContent');
        if (mediaPreviewContent) {
            mediaPreviewContent.innerHTML = '';
            delete mediaPreviewContent.dataset.file;
        }
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
        
        // Add animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
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
        try {
            const sound = document.getElementById('notificationSound');
            if (sound) {
                sound.currentTime = 0;
                sound.play().catch(e => {
                    console.log('Audio play failed:', e);
                    // Fallback: Create audio element dynamically
                    const audio = new Audio('notification.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log('Fallback audio also failed:', e));
                });
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);
        }
    }

    // Play sent sound
    playSentSound() {
        try {
            const sound = document.getElementById('sentSound') || document.getElementById('notificationSound');
            if (sound) {
                sound.currentTime = 0;
                sound.volume = 0.3;
                sound.play().catch(e => console.log('Sent sound play failed:', e));
            }
        } catch (error) {
            console.error('Error playing sent sound:', error);
        }
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
        const errorMessages = {
            'auth/email-already-in-use': 'Email already in use',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/weak-password': 'Password is too weak',
            'auth/user-disabled': 'User account is disabled',
            'auth/user-not-found': 'User not found',
            'auth/wrong-password': 'Wrong password',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'auth/too-many-requests': 'Too many requests. Please try again later',
            'auth/requires-recent-login': 'Please re-authenticate to continue',
            'auth/invalid-credential': 'Invalid credentials',
            'auth/invalid-verification-code': 'Invalid verification code',
            'auth/invalid-verification-id': 'Invalid verification ID'
        };
        
        return errorMessages[error.code] || error.message || 'An error occurred';
    }

    // Format time
    formatTime(timestamp) {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (error) {
            return '--:--';
        }
    }

    // Format date
    formatDate(date) {
        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (date.toDateString() === today.toDateString()) {
                return 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                return 'Yesterday';
            } else if (date.getFullYear() === today.getFullYear()) {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
            } else {
                return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            }
        } catch (error) {
            return 'Unknown date';
        }
    }

    // Get time ago
    getTimeAgo(timestamp) {
        try {
            const now = Date.now();
            const diff = now - timestamp;
            
            const minute = 60 * 1000;
            const hour = 60 * minute;
            const day = 24 * hour;
            const week = 7 * day;
            const month = 30 * day;
            const year = 365 * day;
            
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
            } else if (diff < year) {
                const months = Math.floor(diff / month);
                return `${months} month${months > 1 ? 's' : ''} ago`;
            } else {
                const years = Math.floor(diff / year);
                return `${years} year${years > 1 ? 's' : ''} ago`;
            }
        } catch (error) {
            return 'Unknown time';
        }
    }

    // Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Get optimized image URL
    getOptimizedImageUrl(url, width = 400, height = 400) {
        if (!url) return '';
        
        try {
            // Use ImageKit helpers if available
            if (window.imageKitHelpers && typeof window.imageKitHelpers.getOptimizedImage === 'function') {
                return window.imageKitHelpers.getOptimizedImage(url, width, height);
            }
            
            // Fallback: If it's already an ImageKit URL, we can add transformations
            if (url.includes('ik.imagekit.io')) {
                return `${url}?tr=w-${width},h-${height},c-at_max`;
            }
            
            return url;
        } catch (error) {
            console.error('Error optimizing image URL:', error);
            return url;
        }
    }

    // Queue upload for better performance
    addToUploadQueue(file, type, callback) {
        this.uploadQueue.push({ file, type, callback });
        
        if (!this.isProcessingQueue) {
            this.processUploadQueue();
        }
    }

    // Process upload queue
    async processUploadQueue() {
        if (this.uploadQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.uploadQueue.length > 0) {
            const upload = this.uploadQueue.shift();
            try {
                const result = await this.uploadToImageKit(upload.file, upload.type);
                upload.callback(null, result);
            } catch (error) {
                upload.callback(error, null);
            }
            
            // Small delay between uploads
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isProcessingQueue = false;
    }

    // Upload to ImageKit (generic method)
    async uploadToImageKit(file, folder = 'general') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', `${folder}_${Date.now()}_${file.name}`);
            formData.append('folder', `/zynapse/${folder}`);
            
            const response = await fetch('https://imagekit-auth-server-uafl.onrender.com/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Upload failed with status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.url) {
                throw new Error('No URL returned from server');
            }
            
            return {
                url: result.url,
                fileId: result.fileId,
                thumbnailUrl: result.thumbnailUrl || result.url
            };
            
        } catch (error) {
            console.error('ImageKit upload error:', error);
            throw error;
        }
    }

    // Handle network errors
    handleNetworkError(error) {
        console.error('Network error:', error);
        
        if (!navigator.onLine) {
            this.showToast('You are offline. Please check your connection.', 'error');
        } else {
            this.showToast('Network error. Please try again.', 'error');
        }
    }

    // Validate email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Validate phone number
    validatePhone(phone) {
        const re = /^[+]?[\d\s-]+$/;
        return re.test(phone);
    }

    // Debounce function for performance
    debounce(func, wait) {
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

    // Throttle function for performance
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for required dependencies
    if (typeof firebase === 'undefined') {
        console.error('Firebase is not loaded');
        return;
    }
    
    if (typeof firebaseHelpers === 'undefined') {
        console.error('Firebase helpers are not loaded');
        return;
    }
    
    // Initialize app
    try {
        window.zynapseApp = new ZynapseApp();
        console.log('Zynapse App instance created');
    } catch (error) {
        console.error('Failed to create Zynapse App:', error);
        
        // Show error to user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #dc3545;
            color: white;
            padding: 15px;
            text-align: center;
            z-index: 9999;
        `;
        errorDiv.textContent = 'Failed to initialize app. Please refresh the page.';
        document.body.appendChild(errorDiv);
    }
});

// Export for use in other files and debugging
window.ZynapseApp = ZynapseApp;

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    
    // Don't show error for missing audio files
    if (event.message && event.message.includes('audio')) {
        return;
    }
    
    // Show user-friendly error
    if (window.zynapseApp && typeof window.zynapseApp.showToast === 'function') {
        window.zynapseApp.showToast('An error occurred. Please try again.', 'error');
    }
});

// Global promise rejection handler
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Show user-friendly error
    if (window.zynapseApp && typeof window.zynapseApp.showToast === 'function') {
        window.zynapseApp.showToast('An error occurred. Please try again.', 'error');
    }
});
