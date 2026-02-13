// ==================== webrtc.js – Robust version ====================
let firestore, callsCollection;

try {
  // Firestore may not be enabled – we degrade gracefully
  firestore = firebase.firestore();
  callsCollection = firestore.collection('calls');
  console.log('Firestore ready for calls');
} catch (e) {
  console.warn('Firestore not available – calling disabled', e);
  // Calls will be unavailable, but the rest of the script still loads
}
// WebRTC Calling Module – Zynapse

const firestore = firebase.firestore();
const callsCollection = firestore.collection('calls');

// ---------- ICE Servers (fallback) ----------
const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.relay.metered.ca:80" },
  { urls: "turn:global.relay.metered.ca:80", username: "ff9b5e603d75447bba6ebc9c", credential: "XMFx6MoZrP/NB3wb" },
  { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: "ff9b5e603d75447bba6ebc9c", credential: "XMFx6MoZrP/NB3wb" },
  { urls: "turn:global.relay.metered.ca:443", username: "ff9b5e603d75447bba6ebc9c", credential: "XMFx6MoZrP/NB3wb" },
  { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: "ff9b5e603d75447bba6ebc9c", credential: "XMFx6MoZrP/NB3wb" }
];

let iceServers = DEFAULT_ICE_SERVERS;

// ---------- Fetch fresh TURN credentials (async) ----------
async function fetchTurnCredentials() {
  try {
    const response = await fetch(
      "https://zynapse.metered.live/api/v1/turn/credentials?apiKey=3a22dab1c7aa03b20437df26936a41309718"
    );
    if (response.ok) {
      iceServers = await response.json();
      console.log("TURN credentials updated", iceServers);
    }
  } catch (e) {
    console.warn("Could not fetch TURN credentials, using default STUN/TURN", e);
  }
}
// Call it immediately (no await at top level)
fetchTurnCredentials();

// ---------- Global Call State ----------
let currentCall = {
  id: null,
  peerConnection: null,
  localStream: null,
  remoteStream: null,
  isVideo: false,
  isCaller: false,
  status: null,
  cleanup: null
};

let incomingCallListener = null;

// ---------- UI Helpers ----------
function showIncomingCall(callId, callerId, callerName, callerAvatar, isVideo) {
  document.getElementById('incomingCallAvatar').src = callerAvatar || 'https://via.placeholder.com/150';
  document.getElementById('incomingCallName').innerText = callerName;
  document.getElementById('incomingCallType').innerHTML = isVideo ? '📹 Video call' : '📞 Voice call';
  document.getElementById('incomingCallModal').dataset.callId = callId;
  openModal('incomingCallModal');

  if (window.notificationSound) {
    window.notificationSound.loop = true;
    window.notificationSound.play().catch(e => console.log('Ringtone error:', e));
  }
}

function hideIncomingCall() {
  closeModal('incomingCallModal');
  if (window.notificationSound) {
    window.notificationSound.loop = false;
    window.notificationSound.pause();
    window.notificationSound.currentTime = 0;
  }
}

function showActiveCall(callerName, isVideo) {
  document.getElementById('callStatusHeader').innerText = `📱 ${callerName}`;
  const remoteVideo = document.getElementById('remoteVideo');
  const localVideo = document.getElementById('localVideo');
  if (remoteVideo) remoteVideo.style.display = isVideo ? 'block' : 'none';
  if (localVideo) localVideo.style.display = isVideo ? 'block' : 'none';
  openModal('activeCallModal');
}

function hideActiveCall() {
  closeModal('activeCallModal');
}

// ---------- Core WebRTC ----------
async function startCall(isVideo) {
  // 1. Guard clauses
  if (!window.currentChat || window.currentChat.type !== 'private') {
    window.showToast?.('Can only call private contacts', 'error');
    return;
  }
  if (!window.currentUser || !window.currentUser.userId) {
    window.showToast?.('You must be logged in', 'error');
    return;
  }
  if (currentCall.peerConnection) {
    window.showToast?.('Call already in progress', 'error');
    return;
  }

  try {
    // 2. Get user media
    const constraints = { audio: true, video: isVideo };
    currentCall.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('localVideo').srcObject = currentCall.localStream;

    // 3. Create RTCPeerConnection with current ICE servers
    currentCall.peerConnection = new RTCPeerConnection({ iceServers });
    currentCall.isVideo = isVideo;
    currentCall.isCaller = true;

    // Add local tracks
    currentCall.localStream.getTracks().forEach(track => {
      currentCall.peerConnection.addTrack(track, currentCall.localStream);
    });

    // Handle remote stream
    currentCall.peerConnection.ontrack = (event) => {
      if (!currentCall.remoteStream) {
        currentCall.remoteStream = new MediaStream();
        document.getElementById('remoteVideo').srcObject = currentCall.remoteStream;
      }
      event.streams[0].getTracks().forEach(track => {
        currentCall.remoteStream.addTrack(track);
      });
    };

    // ICE candidate handling
    currentCall.peerConnection.onicecandidate = (event) => {
      if (event.candidate && currentCall.id) {
        callsCollection.doc(currentCall.id)
          .collection('receiverCandidates')
          .add(event.candidate.toJSON());
      }
    };

    // Create SDP offer
    const offer = await currentCall.peerConnection.createOffer();
    await currentCall.peerConnection.setLocalDescription(offer);

    // Create Firestore call document
    const callDoc = await callsCollection.add({
      callerId: window.currentUser.userId,
      callerUid: window.currentUser.uid,
      callerName: window.currentUser.name,
      receiverId: window.currentChat.userId,
      receiverUid: window.currentChat.uid,
      isVideo: isVideo,
      offer: { type: offer.type, sdp: offer.sdp },
      status: 'ringing',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    currentCall.id = callDoc.id;

    // Show outgoing UI
    showActiveCall(window.currentChat.userName, isVideo);

    // Listen for answer
    const unsubscribeAnswer = callDoc.onSnapshot((snap) => {
      const data = snap.data();
      if (data && data.answer && currentCall.peerConnection) {
        const answer = new RTCSessionDescription(data.answer);
        currentCall.peerConnection.setRemoteDescription(answer);
        unsubscribeAnswer(); // stop listening
      }
    });

    // Listen for remote ICE candidates (receiver → caller)
    const unsubscribeCandidates = callDoc.collection('callerCandidates').onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added' && currentCall.peerConnection) {
          const candidate = new RTCIceCandidate(change.doc.data());
          currentCall.peerConnection.addIceCandidate(candidate);
        }
      });
    });

    // Save cleanup function
    currentCall.cleanup = () => {
      unsubscribeAnswer();
      unsubscribeCandidates();
    };

  } catch (error) {
    console.error('Failed to start call:', error);
    window.showToast?.('Could not start call', 'error');
    endCall();
  }
}

// ---------- Accept Call ----------
async function acceptCall() {
  const callId = document.getElementById('incomingCallModal').dataset.callId;
  if (!callId) return;

  try {
    const callDoc = callsCollection.doc(callId);
    const callSnap = await callDoc.get();
    if (!callSnap.exists) throw new Error('Call not found');
    const callData = callSnap.data();

    // Get media stream
    const constraints = { audio: true, video: callData.isVideo };
    currentCall.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('localVideo').srcObject = currentCall.localStream;

    // Create peer connection
    currentCall.peerConnection = new RTCPeerConnection({ iceServers });
    currentCall.isVideo = callData.isVideo;
    currentCall.isCaller = false;
    currentCall.id = callId;

    // Add tracks
    currentCall.localStream.getTracks().forEach(track => {
      currentCall.peerConnection.addTrack(track, currentCall.localStream);
    });

    // Remote stream
    currentCall.peerConnection.ontrack = (event) => {
      if (!currentCall.remoteStream) {
        currentCall.remoteStream = new MediaStream();
        document.getElementById('remoteVideo').srcObject = currentCall.remoteStream;
      }
      event.streams[0].getTracks().forEach(track => {
        currentCall.remoteStream.addTrack(track);
      });
    };

    // ICE candidate sender
    currentCall.peerConnection.onicecandidate = (event) => {
      if (event.candidate && callId) {
        callDoc.collection('callerCandidates').add(event.candidate.toJSON());
      }
    };

    // Set remote description (offer)
    const offer = new RTCSessionDescription(callData.offer);
    await currentCall.peerConnection.setRemoteDescription(offer);

    // Create answer
    const answer = await currentCall.peerConnection.createAnswer();
    await currentCall.peerConnection.setLocalDescription(answer);

    // Send answer
    await callDoc.update({
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected'
    });

    // Listen for receiver candidates
    const unsubscribeCandidates = callDoc.collection('receiverCandidates').onSnapshot((snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === 'added' && currentCall.peerConnection) {
          const candidate = new RTCIceCandidate(change.doc.data());
          currentCall.peerConnection.addIceCandidate(candidate);
        }
      });
    });

    currentCall.cleanup = () => unsubscribeCandidates();

    // Update UI
    hideIncomingCall();
    showActiveCall(callData.callerName, callData.isVideo);

  } catch (error) {
    console.error('Error accepting call:', error);
    window.showToast?.('Failed to accept call', 'error');
    endCall();
  }
}

// ---------- Reject / End ----------
async function rejectCall() {
  const callId = document.getElementById('incomingCallModal').dataset.callId;
  if (callId) {
    await callsCollection.doc(callId).update({ status: 'rejected' }).catch(() => {});
  }
  hideIncomingCall();
  endCall();
}

async function endCall() {
  // WebRTC cleanup
  if (currentCall.peerConnection) {
    currentCall.peerConnection.close();
    currentCall.peerConnection = null;
  }
  if (currentCall.localStream) {
    currentCall.localStream.getTracks().forEach(t => t.stop());
    currentCall.localStream = null;
  }
  if (currentCall.remoteStream) {
    currentCall.remoteStream.getTracks().forEach(t => t.stop());
    currentCall.remoteStream = null;
  }
  if (currentCall.cleanup) {
    currentCall.cleanup();
    currentCall.cleanup = null;
  }

  // Update Firestore call status
  if (currentCall.id) {
    await callsCollection.doc(currentCall.id).update({ status: 'ended' }).catch(() => {});
    currentCall.id = null;
  }

  // Hide UI
  hideActiveCall();
  hideIncomingCall();

  // Clear video elements
  const remoteVideo = document.getElementById('remoteVideo');
  const localVideo = document.getElementById('localVideo');
  if (remoteVideo) remoteVideo.srcObject = null;
  if (localVideo) localVideo.srcObject = null;
}

// ---------- Call Controls ----------
function toggleMute() {
  if (currentCall.localStream) {
    const audioTracks = currentCall.localStream.getAudioTracks();
    audioTracks.forEach(track => track.enabled = !track.enabled);
    const btn = document.getElementById('muteAudioBtn');
    const icon = btn?.querySelector('i');
    if (icon) {
      icon.className = audioTracks[0]?.enabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
    }
  }
}

function toggleSpeaker() {
  // Could be extended to change audio output device
  window.showToast?.('Speaker toggled (not implemented)', 'info');
}

function toggleCamera() {
  if (currentCall.localStream && currentCall.isVideo) {
    const videoTracks = currentCall.localStream.getVideoTracks();
    videoTracks.forEach(track => track.enabled = !track.enabled);
  }
}

// ---------- Listen for Incoming Calls ----------
function setupIncomingCallListener() {
  if (!window.currentUser) return;

  incomingCallListener = callsCollection
    .where('receiverUid', '==', window.currentUser.uid)
    .where('status', '==', 'ringing')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const call = change.doc.data();
          const callId = change.doc.id;

          // Don't show if we are the caller or already in a call
          if (call.callerUid === window.currentUser.uid) return;
          if (currentCall.id) return;

          window.showIncomingCall?.(
            callId,
            call.callerUid,
            call.callerName,
            call.callerAvatar,
            call.isVideo
          );
        }
      });
    });
}

// Start listening when currentUser becomes available
function initWebRTC() {
  if (window.currentUser) {
    setupIncomingCallListener();
  } else {
    const checkUser = setInterval(() => {
      if (window.currentUser) {
        clearInterval(checkUser);
        setupIncomingCallListener();
      }
    }, 100);
  }
}
initWebRTC();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (incomingCallListener) incomingCallListener();
  endCall();
});

// Export to global scope (for inline onclick handlers)
window.startCall = startCall;
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.endCall = endCall;
window.toggleMute = toggleMute;
window.toggleSpeaker = toggleSpeaker;
window.toggleCamera = toggleCamera;
