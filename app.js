import { 
  auth, 
  database, 
  storage,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getUniqueUserID,
  storeUserData,
  getUserData,
  getUserByID,
  sendChatRequest,
  acceptChatRequest,
  rejectChatRequest,
  createChatRoom,
  sendMessage,
  updateMessageStatus,
  createGroup,
  sendGroupMessage,
  addZyne,
  updateUserStatus,
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  query,
  orderByChild,
  equalTo,
  onChildAdded,
  onChildChanged,
  onChildRemoved
} from './firebase-config.js';

import imageKitService from './imagekit-config.js';

class ZynapseApp {
  constructor() {
    this.currentUser = null;
    this.currentChat = null;
    this.currentGroup = null;
    this.notificationSound = new Audio('./notification.mp3');
    this.isTyping = false;
    this.typingTimeout = null;
    
    this.init();
  }

  async init() {
    // Check authentication state
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData(user.uid);
        this.redirectToHome();
      } else {
        this.redirectToAuth();
      }
    });

    // Initialize event listeners
    this.initEventListeners();
  }

  async loadUserData(userId) {
    try {
      const userData = await getUserData(userId);
      if (userData) {
        this.currentUser.data = userData;
        // Update user status to online
        await updateUserStatus(userId, 'online');
        
        // Set up presence monitoring
        this.setupPresence(userId);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  setupPresence(userId) {
    // Update last seen on disconnect
    const presenceRef = ref(database, `.info/connected`);
    onValue(presenceRef, async (snapshot) => {
      if (snapshot.val() === false) {
        await updateUserStatus(userId, 'offline');
        return;
      }

      await updateUserStatus(userId, 'online');

      // Update status to away when user is idle
      let awayTimer;
      const resetAwayTimer = () => {
        clearTimeout(awayTimer);
        awayTimer = setTimeout(async () => {
          await updateUserStatus(userId, 'away');
        }, 5 * 60 * 1000); // 5 minutes
      };

      ['mousemove', 'keydown', 'click', 'scroll'].forEach(event => {
        document.addEventListener(event, resetAwayTimer);
      });

      resetAwayTimer();
    });
  }

  async signUp(name, phone, email, password, profilePicture) {
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Generate unique user ID
      const userID = await getUniqueUserID();
      
      // Upload profile picture if provided
      let profilePictureUrl = null;
      if (profilePicture) {
        profilePictureUrl = await imageKitService.uploadProfilePicture(profilePicture, user.uid);
      }
      
      // Store user data
      await storeUserData(user.uid, name, phone, email, userID, profilePictureUrl);
      
      return { success: true, user: user };
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, message: error.message };
    }
  }

  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, message: error.message };
    }
  }

  async logout() {
    try {
      if (this.currentUser) {
        await updateUserStatus(this.currentUser.uid, 'offline');
      }
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  async searchUser(zynID) {
    try {
      const user = await getUserByID(zynID);
      if (!user) {
        return { success: false, message: 'User not found' };
      }
      
      // Check if already in contacts
      const isContact = this.currentUser.data.contacts && this.currentUser.data.contacts[user.uid];
      
      return { 
        success: true, 
        user: user,
        isContact: !!isContact
      };
    } catch (error) {
      console.error("Search error:", error);
      return { success: false, message: error.message };
    }
  }

  async startChat(zynID) {
    try {
      const searchResult = await this.searchUser(zynID);
      if (!searchResult.success) {
        return searchResult;
      }
      
      const otherUser = searchResult.user;
      
      // Check if already in contacts
      if (!searchResult.isContact) {
        // Send chat request
        const requestResult = await sendChatRequest(this.currentUser.uid, zynID);
        if (!requestResult.success) {
          return requestResult;
        }
        
        return { 
          success: true, 
          requiresRequest: true,
          message: 'Chat request sent successfully'
        };
      }
      
      // Create or get existing chat room
      const chatId = await createChatRoom(this.currentUser.uid, otherUser.uid);
      if (!chatId) {
        return { success: false, message: 'Failed to create chat room' };
      }
      
      return { 
        success: true, 
        requiresRequest: false,
        chatId: chatId,
        otherUser: otherUser
      };
    } catch (error) {
      console.error("Start chat error:", error);
      return { success: false, message: error.message };
    }
  }

  async sendMessage(chatId, message, mediaFile = null) {
    try {
      let mediaUrl = null;
      let mediaType = null;
      
      if (mediaFile) {
        const uploadResult = await imageKitService.uploadChatMedia(mediaFile, chatId);
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.type;
      }
      
      const messageId = await sendMessage(chatId, this.currentUser.uid, message, mediaUrl, mediaType);
      
      if (messageId) {
        this.playNotificationSound();
        return { success: true, messageId: messageId };
      }
      
      return { success: false, message: 'Failed to send message' };
    } catch (error) {
      console.error("Send message error:", error);
      return { success: false, message: error.message };
    }
  }

  async createZyne(text, mediaFile = null) {
    try {
      let mediaUrl = null;
      let mediaType = null;
      
      if (mediaFile) {
        const uploadResult = await imageKitService.uploadZyneMedia(mediaFile, this.currentUser.uid);
        mediaUrl = uploadResult.url;
        mediaType = uploadResult.type;
      }
      
      const zyneId = await addZyne(this.currentUser.uid, text, mediaUrl, mediaType);
      
      return { success: !!zyneId, zyneId: zyneId };
    } catch (error) {
      console.error("Create zyne error:", error);
      return { success: false, message: error.message };
    }
  }

  async createGroup(name, description, members, profilePicture = null) {
    try {
      // Convert member Zyn IDs to UIDs
      const memberUIDs = [];
      for (const zynID of members) {
        const user = await getUserByID(zynID);
        if (user) {
          memberUIDs.push(user.uid);
        }
      }
      
      let profilePictureUrl = null;
      if (profilePicture) {
        profilePictureUrl = await imageKitService.uploadGroupMedia(profilePicture, 'temp');
      }
      
      const groupId = await createGroup(name, this.currentUser.uid, memberUIDs, description, profilePictureUrl);
      
      return { success: !!groupId, groupId: groupId };
    } catch (error) {
      console.error("Create group error:", error);
      return { success: false, message: error.message };
    }
  }

  playNotificationSound() {
    try {
      this.notificationSound.currentTime = 0;
      this.notificationSound.play().catch(e => console.log("Audio play failed:", e));
    } catch (error) {
      console.error("Play sound error:", error);
    }
  }

  showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || this.createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${this.getToastIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  getToastIcon(type) {
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    return icons[type] || 'info-circle';
  }

  createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  redirectToHome() {
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      window.location.href = 'home.html';
    }
  }

  redirectToAuth() {
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      window.location.href = 'index.html';
    }
  }

  initEventListeners() {
    // Global event listeners
    document.addEventListener('click', (e) => {
      // Close dropdowns when clicking outside
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-content.show').forEach(dropdown => {
          dropdown.classList.remove('show');
        });
      }
    });
  }

  // Utility functions
  formatTime(timestamp) {
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

  formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  truncateText(text, maxLength = 50) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

// Create global instance
const zynapseApp = new ZynapseApp();

export default zynapseApp;
