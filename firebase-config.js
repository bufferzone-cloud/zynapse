// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, remove, child, push, onValue, query, orderByChild, equalTo, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

// Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Generate ZYN-XXXX user ID
function generateUserID() {
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `ZYN-${randomNum}`;
}

// Check if user ID is unique
async function isUserIDUnique(userID) {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const users = snapshot.val();
      for (let uid in users) {
        if (users[uid].userID === userID) {
          return false;
        }
      }
    }
    return true;
  } catch (error) {
    console.error("Error checking user ID:", error);
    return false;
  }
}

// Get unique user ID
async function getUniqueUserID() {
  let userID;
  let isUnique = false;
  
  while (!isUnique) {
    userID = generateUserID();
    isUnique = await isUserIDUnique(userID);
  }
  
  return userID;
}

// Store user data in Firebase
async function storeUserData(userId, name, phone, email, userID, profilePicture = null) {
  try {
    const userData = {
      name: name,
      phone: phone,
      email: email,
      userID: userID,
      profilePicture: profilePicture,
      createdAt: Date.now(),
      status: 'online',
      lastSeen: Date.now(),
      contacts: {}
    };
    
    await set(ref(database, `users/${userId}`), userData);
    await set(ref(database, `userIDs/${userID}`), userId);
    
    return true;
  } catch (error) {
    console.error("Error storing user data:", error);
    return false;
  }
}

// Get user by ID
async function getUserByID(zynID) {
  try {
    const userIDRef = ref(database, `userIDs/${zynID}`);
    const userIDSnapshot = await get(userIDRef);
    
    if (!userIDSnapshot.exists()) {
      return null;
    }
    
    const uid = userIDSnapshot.val();
    const userRef = ref(database, `users/${uid}`);
    const userSnapshot = await get(userRef);
    
    if (userSnapshot.exists()) {
      return {
        uid: uid,
        ...userSnapshot.val()
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    return null;
  }
}

// Send chat request
async function sendChatRequest(senderUID, receiverZynID) {
  try {
    const receiver = await getUserByID(receiverZynID);
    if (!receiver) {
      return { success: false, message: "User not found" };
    }
    
    const requestId = push(ref(database, 'chatRequests')).key;
    const requestData = {
      id: requestId,
      from: senderUID,
      to: receiver.uid,
      fromZynID: (await getUserData(senderUID)).userID,
      status: 'pending',
      timestamp: Date.now(),
      seen: false
    };
    
    await set(ref(database, `chatRequests/${requestId}`), requestData);
    await set(ref(database, `users/${receiver.uid}/incomingRequests/${requestId}`), true);
    await set(ref(database, `users/${senderUID}/sentRequests/${requestId}`), true);
    
    return { success: true, requestId: requestId };
  } catch (error) {
    console.error("Error sending chat request:", error);
    return { success: false, message: error.message };
  }
}

// Get user data
async function getUserData(userId) {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

// Accept chat request
async function acceptChatRequest(requestId, currentUserUID) {
  try {
    const requestRef = ref(database, `chatRequests/${requestId}`);
    const requestSnapshot = await get(requestRef);
    
    if (!requestSnapshot.exists()) {
      return false;
    }
    
    const request = requestSnapshot.val();
    if (request.to !== currentUserUID) {
      return false;
    }
    
    // Update request status
    await update(requestRef, { status: 'accepted' });
    
    // Add to contacts both ways
    const senderData = await getUserData(request.from);
    const receiverData = await getUserData(request.to);
    
    await set(ref(database, `users/${request.from}/contacts/${request.to}`), {
      userID: receiverData.userID,
      name: receiverData.name,
      profilePicture: receiverData.profilePicture,
      addedAt: Date.now()
    });
    
    await set(ref(database, `users/${request.to}/contacts/${request.from}`), {
      userID: senderData.userID,
      name: senderData.name,
      profilePicture: senderData.profilePicture,
      addedAt: Date.now()
    });
    
    // Remove from pending requests
    await remove(ref(database, `users/${request.to}/incomingRequests/${requestId}`));
    await remove(ref(database, `users/${request.from}/sentRequests/${requestId}`));
    
    return true;
  } catch (error) {
    console.error("Error accepting chat request:", error);
    return false;
  }
}

// Reject chat request
async function rejectChatRequest(requestId, currentUserUID) {
  try {
    const requestRef = ref(database, `chatRequests/${requestId}`);
    const requestSnapshot = await get(requestRef);
    
    if (!requestSnapshot.exists()) {
      return false;
    }
    
    const request = requestSnapshot.val();
    if (request.to !== currentUserUID) {
      return false;
    }
    
    // Update request status
    await update(requestRef, { status: 'rejected' });
    
    // Remove from pending requests
    await remove(ref(database, `users/${request.to}/incomingRequests/${requestId}`));
    await remove(ref(database, `users/${request.from}/sentRequests/${requestId}`));
    
    // Delete request after 24 hours
    setTimeout(async () => {
      await remove(requestRef);
    }, 24 * 60 * 60 * 1000);
    
    return true;
  } catch (error) {
    console.error("Error rejecting chat request:", error);
    return false;
  }
}

// Create chat room
async function createChatRoom(user1UID, user2UID) {
  try {
    const chatId = [user1UID, user2UID].sort().join('_');
    const chatRef = ref(database, `chats/${chatId}`);
    
    const chatData = {
      participants: {
        [user1UID]: true,
        [user2UID]: true
      },
      lastMessage: '',
      lastMessageTime: Date.now(),
      createdAt: Date.now()
    };
    
    await set(chatRef, chatData);
    
    // Add chat reference to both users
    await set(ref(database, `users/${user1UID}/chats/${chatId}`), {
      with: user2UID,
      lastActive: Date.now()
    });
    
    await set(ref(database, `users/${user2UID}/chats/${chatId}`), {
      with: user1UID,
      lastActive: Date.now()
    });
    
    return chatId;
  } catch (error) {
    console.error("Error creating chat room:", error);
    return null;
  }
}

// Send message
async function sendMessage(chatId, senderUID, message, mediaUrl = null, mediaType = null) {
  try {
    const messageId = push(ref(database, `chats/${chatId}/messages`)).key;
    const messageData = {
      id: messageId,
      sender: senderUID,
      text: message,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: Date.now(),
      status: 'sent'
    };
    
    await set(ref(database, `chats/${chatId}/messages/${messageId}`), messageData);
    
    // Update chat last message
    await update(ref(database, `chats/${chatId}`), {
      lastMessage: message,
      lastMessageTime: Date.now(),
      lastMessageSender: senderUID
    });
    
    return messageId;
  } catch (error) {
    console.error("Error sending message:", error);
    return null;
  }
}

// Update message status
async function updateMessageStatus(chatId, messageId, status) {
  try {
    await update(ref(database, `chats/${chatId}/messages/${messageId}`), {
      status: status
    });
  } catch (error) {
    console.error("Error updating message status:", error);
  }
}

// Create group
async function createGroup(name, creatorUID, members = [], description = '', profilePicture = null) {
  try {
    const groupId = push(ref(database, 'groups')).key;
    
    // Add creator to members
    const allMembers = [...new Set([creatorUID, ...members])];
    
    const groupData = {
      id: groupId,
      name: name,
      description: description,
      creator: creatorUID,
      admins: [creatorUID],
      members: allMembers.reduce((acc, uid) => {
        acc[uid] = true;
        return acc;
      }, {}),
      profilePicture: profilePicture,
      createdAt: Date.now()
    };
    
    await set(ref(database, `groups/${groupId}`), groupData);
    
    // Add group to each member's groups
    for (const memberUID of allMembers) {
      await set(ref(database, `users/${memberUID}/groups/${groupId}`), true);
    }
    
    // Send welcome message
    const welcomeMessage = `Group "${name}" was created by ${(await getUserData(creatorUID)).name}`;
    await sendGroupMessage(groupId, creatorUID, welcomeMessage);
    
    return groupId;
  } catch (error) {
    console.error("Error creating group:", error);
    return null;
  }
}

// Send group message
async function sendGroupMessage(groupId, senderUID, message, mediaUrl = null, mediaType = null) {
  try {
    const messageId = push(ref(database, `groups/${groupId}/messages`)).key;
    const messageData = {
      id: messageId,
      sender: senderUID,
      text: message,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: Date.now()
    };
    
    await set(ref(database, `groups/${groupId}/messages/${messageId}`), messageData);
    
    // Update group last message
    await update(ref(database, `groups/${groupId}`), {
      lastMessage: message,
      lastMessageTime: Date.now(),
      lastMessageSender: senderUID
    });
    
    return messageId;
  } catch (error) {
    console.error("Error sending group message:", error);
    return null;
  }
}

// Add Zyne status
async function addZyne(userUID, text = null, mediaUrl = null, mediaType = null) {
  try {
    const zyneId = push(ref(database, 'zynes')).key;
    const zyneData = {
      id: zyneId,
      user: userUID,
      text: text,
      mediaUrl: mediaUrl,
      mediaType: mediaType,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    await set(ref(database, `zynes/${zyneId}`), zyneData);
    await set(ref(database, `users/${userUID}/zynes/${zyneId}`), true);
    
    // Schedule deletion after 24 hours
    setTimeout(async () => {
      await remove(ref(database, `zynes/${zyneId}`));
      await remove(ref(database, `users/${userUID}/zynes/${zyneId}`));
    }, 24 * 60 * 60 * 1000);
    
    return zyneId;
  } catch (error) {
    console.error("Error adding zyne:", error);
    return null;
  }
}

// Update user status
async function updateUserStatus(userUID, status) {
  try {
    await update(ref(database, `users/${userUID}`), {
      status: status,
      lastSeen: Date.now()
    });
  } catch (error) {
    console.error("Error updating user status:", error);
  }
}

export {
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
};
