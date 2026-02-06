// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBrVtSAOckpj8_fRA3-0kI7vAzOpXDUqxs",
    authDomain: "zynapse-68181.firebaseapp.com",
    databaseURL: "https://zynapse-68181-default-rtdb.firebaseio.com",
    projectId: "zynapse-68181",
    storageBucket: "zynapse-68181.firebasestorage.app",
    messagingSenderId: "841353050519",
    appId: "1:841353050519:web:271e2709246067bc506cd2",
    measurementId: "G-J38CL5MRPF"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Firebase Auth State Listener
let currentUser = null;

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("User authenticated:", user.uid);
        
        // Update UI based on authentication
        if (typeof updateAuthUI === 'function') {
            updateAuthUI(user);
        }
        
        // Start listening for real-time updates
        if (typeof startRealtimeListeners === 'function') {
            startRealtimeListeners(user.uid);
        }
    } else {
        currentUser = null;
        console.log("User signed out");
        
        // Redirect to login if not on auth page
        if (!window.location.pathname.includes('index.html') && 
            window.location.pathname !== '/') {
            window.location.href = 'index.html';
        }
    }
});

// Firebase Helper Functions
const firebaseHelpers = {
    // Generate unique ID
    generateId: () => {
        return database.ref().push().key;
    },

    // Get current timestamp
    getTimestamp: () => {
        return firebase.database.ServerValue.TIMESTAMP;
    },

    // Upload file to Firebase Storage
    uploadFile: async (file, path) => {
        return new Promise((resolve, reject) => {
            const storageRef = firebase.storage().ref();
            const fileRef = storageRef.child(`${path}/${Date.now()}_${file.name}`);
            
            const uploadTask = fileRef.put(file);
            
            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress monitoring
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                (error) => {
                    reject(error);
                },
                () => {
                    uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                        resolve(downloadURL);
                    });
                }
            );
        });
    },

    // Get user data by UID
    getUserData: async (userId) => {
        try {
            const snapshot = await database.ref('users/' + userId).once('value');
            return snapshot.val();
        } catch (error) {
            console.error("Error getting user data:", error);
            return null;
        }
    },

    // Update user profile
    updateUserProfile: async (userId, data) => {
        try {
            await database.ref('users/' + userId).update(data);
            return true;
        } catch (error) {
            console.error("Error updating user profile:", error);
            return false;
        }
    },

    // Check if user exists by Zynapse ID
    getUserByZynapseId: async (zynapseId) => {
        try {
            const snapshot = await database.ref('users')
                .orderByChild('zynapseId')
                .equalTo(zynapseId)
                .once('value');
            
            if (snapshot.exists()) {
                const userData = snapshot.val();
                const userId = Object.keys(userData)[0];
                return { id: userId, ...userData[userId] };
            }
            return null;
        } catch (error) {
            console.error("Error getting user by Zynapse ID:", error);
            return null;
        }
    },

    // Send chat request
    sendChatRequest: async (fromUserId, toZynapseId, message = '') => {
        try {
            // Get recipient user data
            const recipient = await firebaseHelpers.getUserByZynapseId(toZynapseId);
            if (!recipient) {
                throw new Error('User not found');
            }

            // Get sender user data
            const senderData = await firebaseHelpers.getUserData(fromUserId);
            
            // Generate request ID
            const requestId = firebaseHelpers.generateId();
            
            // Create request object
            const request = {
                id: requestId,
                fromUserId: fromUserId,
                fromUserName: senderData.name,
                fromUserZynapseId: senderData.zynapseId,
                fromUserProfilePic: senderData.profilePic || '',
                toUserId: recipient.id,
                toUserZynapseId: toZynapseId,
                message: message,
                status: 'pending', // pending, accepted, rejected
                timestamp: firebaseHelpers.getTimestamp(),
                read: false
            };

            // Save to both users' request lists
            await database.ref(`chatRequests/${fromUserId}/${requestId}`).set({
                ...request,
                direction: 'sent'
            });

            await database.ref(`chatRequests/${recipient.id}/${requestId}`).set({
                ...request,
                direction: 'received'
            });

            // Add to recipient's notifications
            await database.ref(`notifications/${recipient.id}/${requestId}`).set({
                type: 'chat_request',
                fromUserId: fromUserId,
                fromUserName: senderData.name,
                message: 'sent you a chat request',
                timestamp: firebaseHelpers.getTimestamp(),
                read: false
            });

            return { success: true, requestId };
        } catch (error) {
            console.error("Error sending chat request:", error);
            return { success: false, error: error.message };
        }
    },

    // Update chat request status
    updateChatRequest: async (requestId, userId, status) => {
        try {
            // Update request status
            await database.ref(`chatRequests/${userId}/${requestId}/status`).set(status);
            
            // Get request data
            const snapshot = await database.ref(`chatRequests/${userId}/${requestId}`).once('value');
            const request = snapshot.val();
            
            if (status === 'accepted') {
                // Add each other to contacts
                await database.ref(`contacts/${userId}/${request.fromUserId}`).set({
                    zynapseId: request.fromUserZynapseId,
                    name: request.fromUserName,
                    profilePic: request.fromUserProfilePic,
                    addedAt: firebaseHelpers.getTimestamp()
                });

                await database.ref(`contacts/${request.fromUserId}/${userId}`).set({
                    zynapseId: request.toUserZynapseId,
                    name: request.fromUserName, // This should be the other user's name
                    profilePic: '', // Get from user data
                    addedAt: firebaseHelpers.getTimestamp()
                });

                // Create chat room
                const chatId = firebaseHelpers.generateId();
                await database.ref(`chats/${chatId}`).set({
                    participants: {
                        [userId]: true,
                        [request.fromUserId]: true
                    },
                    lastMessage: 'Chat started',
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    createdAt: firebaseHelpers.getTimestamp()
                });

                // Update user's chat list
                await database.ref(`userChats/${userId}/${chatId}`).set({
                    withUserId: request.fromUserId,
                    lastMessage: 'Chat started',
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    unreadCount: 0
                });

                await database.ref(`userChats/${request.fromUserId}/${chatId}`).set({
                    withUserId: userId,
                    lastMessage: 'Chat started',
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    unreadCount: 0
                });
            }

            // Notify the sender about the status change
            await database.ref(`notifications/${request.fromUserId}/${requestId}_update`).set({
                type: 'chat_request_update',
                requestId: requestId,
                status: status,
                fromUserId: userId,
                timestamp: firebaseHelpers.getTimestamp(),
                read: false
            });

            return { success: true };
        } catch (error) {
            console.error("Error updating chat request:", error);
            return { success: false, error: error.message };
        }
    },

    // Send message
    sendMessage: async (chatId, senderId, message, type = 'text', mediaUrl = null) => {
        try {
            const messageId = firebaseHelpers.generateId();
            const messageData = {
                id: messageId,
                chatId: chatId,
                senderId: senderId,
                message: message,
                type: type,
                mediaUrl: mediaUrl,
                timestamp: firebaseHelpers.getTimestamp(),
                read: false,
                delivered: false
            };

            // Save message
            await database.ref(`messages/${chatId}/${messageId}`).set(messageData);
            
            // Update chat last message
            await database.ref(`chats/${chatId}`).update({
                lastMessage: type === 'text' ? message : `Sent a ${type}`,
                lastMessageTime: firebaseHelpers.getTimestamp()
            });

            // Update user chat lists
            const chatSnapshot = await database.ref(`chats/${chatId}/participants`).once('value');
            const participants = chatSnapshot.val();
            
            for (const participantId in participants) {
                if (participantId !== senderId) {
                    await database.ref(`userChats/${participantId}/${chatId}`).update({
                        lastMessage: type === 'text' ? message : `Sent a ${type}`,
                        lastMessageTime: firebaseHelpers.getTimestamp(),
                        unreadCount: firebase.database.ServerValue.increment(1)
                    });
                    
                    // Send notification
                    const senderData = await firebaseHelpers.getUserData(senderId);
                    await database.ref(`notifications/${participantId}/${messageId}`).set({
                        type: 'new_message',
                        chatId: chatId,
                        fromUserId: senderId,
                        fromUserName: senderData.name,
                        message: type === 'text' ? message : `Sent a ${type}`,
                        timestamp: firebaseHelpers.getTimestamp(),
                        read: false
                    });
                } else {
                    await database.ref(`userChats/${participantId}/${chatId}`).update({
                        lastMessage: type === 'text' ? message : `Sent a ${type}`,
                        lastMessageTime: firebaseHelpers.getTimestamp()
                    });
                }
            }

            return { success: true, messageId };
        } catch (error) {
            console.error("Error sending message:", error);
            return { success: false, error: error.message };
        }
    },

    // Mark messages as read
    markMessagesAsRead: async (chatId, userId) => {
        try {
            const snapshot = await database.ref(`messages/${chatId}`)
                .orderByChild('senderId')
                .equalTo(userId)
                .once('value');
            
            const updates = {};
            snapshot.forEach((childSnapshot) => {
                updates[`messages/${chatId}/${childSnapshot.key}/read`] = true;
            });
            
            await database.ref().update(updates);
            return true;
        } catch (error) {
            console.error("Error marking messages as read:", error);
            return false;
        }
    },

    // Create Zyne (status)
    createZyne: async (userId, content, type = 'text', mediaUrl = null) => {
        try {
            const zyneId = firebaseHelpers.generateId();
            const zyneData = {
                id: zyneId,
                userId: userId,
                content: content,
                type: type,
                mediaUrl: mediaUrl,
                timestamp: firebaseHelpers.getTimestamp(),
                expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours from now
                views: 0,
                viewers: {}
            };

            await database.ref(`zynes/${userId}/${zyneId}`).set(zyneData);
            return { success: true, zyneId };
        } catch (error) {
            console.error("Error creating zyne:", error);
            return { success: false, error: error.message };
        }
    },

    // Create group
    createGroup: async (userId, groupName, members, profilePic = null) => {
        try {
            const groupId = firebaseHelpers.generateId();
            const groupData = {
                id: groupId,
                name: groupName,
                createdBy: userId,
                profilePic: profilePic,
                members: {
                    [userId]: {
                        role: 'admin',
                        joinedAt: firebaseHelpers.getTimestamp()
                    }
                },
                createdAt: firebaseHelpers.getTimestamp(),
                lastMessageTime: firebaseHelpers.getTimestamp()
            };

            // Add members
            for (const memberZynapseId of members) {
                const member = await firebaseHelpers.getUserByZynapseId(memberZynapseId);
                if (member) {
                    groupData.members[member.id] = {
                        role: 'member',
                        joinedAt: firebaseHelpers.getTimestamp()
                    };
                }
            }

            await database.ref(`groups/${groupId}`).set(groupData);
            
            // Add group to user's group list
            for (const memberId in groupData.members) {
                await database.ref(`userGroups/${memberId}/${groupId}`).set({
                    name: groupName,
                    profilePic: profilePic,
                    lastMessageTime: firebaseHelpers.getTimestamp(),
                    unreadCount: 0
                });
            }

            return { success: true, groupId };
        } catch (error) {
            console.error("Error creating group:", error);
            return { success: false, error: error.message };
        }
    },

    // Get user's contacts
    getContacts: async (userId) => {
        try {
            const snapshot = await database.ref(`contacts/${userId}`).once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error("Error getting contacts:", error);
            return {};
        }
    },

    // Get user's chat requests
    getChatRequests: async (userId, direction = 'received') => {
        try {
            const snapshot = await database.ref(`chatRequests/${userId}`).once('value');
            const requests = snapshot.val() || {};
            
            // Filter by direction and status
            const filteredRequests = {};
            for (const requestId in requests) {
                const request = requests[requestId];
                if ((direction === 'all' || request.direction === direction) && request.status === 'pending') {
                    filteredRequests[requestId] = request;
                }
            }
            
            return filteredRequests;
        } catch (error) {
            console.error("Error getting chat requests:", error);
            return {};
        }
    },

    // Get user's chats
    getUserChats: async (userId) => {
        try {
            const snapshot = await database.ref(`userChats/${userId}`).once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error("Error getting user chats:", error);
            return {};
        }
    },

    // Get messages for a chat
    getChatMessages: async (chatId, limit = 50) => {
        try {
            const snapshot = await database.ref(`messages/${chatId}`)
                .orderByChild('timestamp')
                .limitToLast(limit)
                .once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error("Error getting chat messages:", error);
            return {};
        }
    },

    // Get user's Zynes
    getUserZynes: async (userId) => {
        try {
            const snapshot = await database.ref(`zynes/${userId}`)
                .orderByChild('timestamp')
                .limitToLast(20)
                .once('value');
            return snapshot.val() || {};
        } catch (error) {
            console.error("Error getting user zynes:", error);
            return {};
        }
    },

    // Get user's groups
    getUserGroups: async (userId) => {
        try {
            const snapshot = await database.ref(`userGroups/${userId}`).once('value');
            const groups = snapshot.val() || {};
            
            // Get full group data
            const groupsData = {};
            for (const groupId in groups) {
                const groupSnapshot = await database.ref(`groups/${groupId}`).once('value');
                groupsData[groupId] = {
                    ...groupSnapshot.val(),
                    ...groups[groupId]
                };
            }
            
            return groupsData;
        } catch (error) {
            console.error("Error getting user groups:", error);
            return {};
        }
    },

    // Update user status
    updateUserStatus: async (userId, status) => {
        try {
            await database.ref(`users/${userId}/status`).set({
                online: status === 'online',
                lastSeen: firebaseHelpers.getTimestamp()
            });
            return true;
        } catch (error) {
            console.error("Error updating user status:", error);
            return false;
        }
    },

    // Search users by name or Zynapse ID
    searchUsers: async (query) => {
        try {
            const snapshot = await database.ref('users')
                .orderByChild('name')
                .startAt(query)
                .endAt(query + '\uf8ff')
                .once('value');
            
            const users = snapshot.val() || {};
            
            // Also search by Zynapse ID
            const zynapseSnapshot = await database.ref('users')
                .orderByChild('zynapseId')
                .startAt(query)
                .endAt(query + '\uf8ff')
                .once('value');
            
            const zynapseUsers = zynapseSnapshot.val() || {};
            
            // Merge results
            return { ...users, ...zynapseUsers };
        } catch (error) {
            console.error("Error searching users:", error);
            return {};
        }
    }
};

// Export for use in other files
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDatabase = database;
window.firebaseHelpers = firebaseHelpers;
