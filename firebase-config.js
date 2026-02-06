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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
