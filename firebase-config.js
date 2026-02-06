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
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics();

// Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage();

// Export Firebase services
export { firebase, app, analytics, auth, database, storage };
