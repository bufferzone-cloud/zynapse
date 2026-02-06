// Firebase configuration for Zynapse
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
firebase.initializeApp(firebaseConfig);

// Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Firebase Auth state listener
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User logged in:", user.uid);
    updateUserOnlineStatus(user.uid, true);
  }
});

// Update user online status
function updateUserOnlineStatus(userId, isOnline) {
  if (!userId) return;
  
  const userStatusRef = database.ref(`users/${userId}/status`);
  userStatusRef.set({
    online: isOnline,
    lastSeen: firebase.database.ServerValue.TIMESTAMP
  });
  
  // Setup disconnect listener
  const userStatusDatabaseRef = database.ref(`users/${userId}/status`);
  userStatusDatabaseRef.onDisconnect().set({
    online: false,
    lastSeen: firebase.database.ServerValue.TIMESTAMP
  });
}

// Generate ZYN-XXXX user ID
function generateUserID() {
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `ZYN-${numbers}`;
}
