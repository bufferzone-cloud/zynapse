// ===== FIREBASE CONFIGURATION =====
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

// ===== CLOUDINARY ACCOUNT DETAILS =====
const CLOUDINARY_ACCOUNT = {
    cloudName: 'dd3lcymrk',
    apiKey: '489857926297197',
    apiSecret: 'RHDQG1YP6jqvn4UADq3nJWHIeHQ',
    uploadPreset: 'h3eyhc2o',
    folder: 'zynapse/users',
    environmentVariable: 'cloudinary://489857926297197:RHDQG1YP6jqvn4UADq3nJWHIeHQ@dd3lcymrk',
    uploadUrl: 'https://api.cloudinary.com/v1_1/dd3lcymrk/upload'
};

// ===== APP CONSTANTS =====
const APP_CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    MESSAGE_LIMIT: 50,
    STATUS_DURATION: 24 * 60 * 60 * 1000, // 24 hours
    TYPING_TIMEOUT: 3000,
    ONLINE_TIMEOUT: 30000
};
