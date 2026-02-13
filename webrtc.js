// ---------- Fetch TURN credentials dynamically ----------
async function getIceServers() {
  try {
    const response = await fetch(
      "https://zynapse.metered.live/api/v1/turn/credentials?apiKey=3a22dab1c7aa03b20437df26936a41309718"
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const iceServers = await response.json();
    return iceServers;
  } catch (error) {
    console.error('TURN fetch failed, using fallback STUN:', error);
    // Fallback – at least STUN
    return [{ urls: "stun:stun.relay.metered.ca:80" }];
  }
}

// ---------- startCall – updated with dynamic TURN ----------
async function startCall(isVideo) {
  if (!currentChat || currentChat.type !== 'private') {
    showToast('Can only call private contacts', 'error');
    return;
  }
  if (!currentUser) {
    showToast('User not logged in', 'error');
    return;
  }

  try {
    // 1. Get dynamic ICE servers
    const iceServers = await getIceServers();

    // 2. Get user media
    const constraints = { audio: true, video: isVideo };
    currentCall.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('localVideo').srcObject = currentCall.localStream;

    // 3. Create peer connection
    currentCall.peerConnection = new RTCPeerConnection({ iceServers });
    currentCall.isVideo = isVideo;
    currentCall.isCaller = true;

    
    // Add tracks
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
    
    // ICE candidate handling (send to Firestore)
    currentCall.peerConnection.onicecandidate = (event) => {
      if (event.candidate && currentCall.id) {
        // Store candidate in receiverCandidates subcollection
        callsCollection.doc(currentCall.id).collection('receiverCandidates').add(event.candidate.toJSON());
      }
    };
    
    // Create offer
    const offer = await currentCall.peerConnection.createOffer();
    await currentCall.peerConnection.setLocalDescription(offer);
    
    // Create Firestore call document
    const callDoc = await callsCollection.add({
  callerId: currentUser.userId,        // ZYN-XXXX
  callerUid: currentUser.uid,          // Firebase UID (important!)
  callerName: currentUser.name,
  receiverId: currentChat.userId,
  receiverUid: currentChat.uid,
  receiverName: currentChat.userName,
  isVideo: isVideo,
  offer: { type: offer.type, sdp: offer.sdp },
  status: 'ringing',
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});
    
    currentCall.id = callDoc.id;
    
    // Show outgoing call UI
    showActiveCall(currentChat.userName, isVideo);
    
    // Listen for answer
    const answerListener = callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (data && data.answer && currentCall.peerConnection) {
        const answer = new RTCSessionDescription(data.answer);
        currentCall.peerConnection.setRemoteDescription(answer);
        answerListener(); // stop listening
      }
    });
    
    // Listen for caller candidates (we are caller, but receiver may send candidates)
    const candidateListener = callDoc.collection('callerCandidates').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && currentCall.peerConnection) {
          const candidate = new RTCIceCandidate(change.doc.data());
          currentCall.peerConnection.addIceCandidate(candidate);
        }
      });
    });
    
    // Store cleanup functions
    currentCall.cleanup = () => {
      answerListener();
      candidateListener();
    };
    
    } catch (error) {
    console.error('startCall detailed error:', error);
    // Show a clean user message – never display raw error objects
    showToast('Could not start call. Please check camera/microphone permissions and try again.', 'error');
    endCall();
  }
}

// ---------- Accept Call (Receiver side) ----------
async function acceptCall() {
  const callId = document.getElementById('incomingCallModal').dataset.callId;
  if (!callId) return;
  
  try {
    const callDoc = callsCollection.doc(callId);
    const callData = (await callDoc.get()).data();
    if (!callData) throw new Error('Call not found');
    
    // Get media stream (video depends on call type)
    const constraints = { audio: true, video: callData.isVideo };
    currentCall.localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('localVideo').srcObject = currentCall.localStream;
    
    // Create peer connection
    currentCall.peerConnection = new RTCPeerConnection(iceServers);
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
    
    // ICE candidates (send to caller's candidates subcollection)
    currentCall.peerConnection.onicecandidate = (event) => {
      if (event.candidate && callId) {
        callDoc.collection('callerCandidates').add(event.candidate.toJSON());
      }
    };
    
    // Set remote description (caller's offer)
    const offer = new RTCSessionDescription(callData.offer);
    await currentCall.peerConnection.setRemoteDescription(offer);
    
    // Create answer
    const answer = await currentCall.peerConnection.createAnswer();
    await currentCall.peerConnection.setLocalDescription(answer);
    
    // Update Firestore with answer
    await callDoc.update({
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected'
    });
    
    // Listen for receiver candidates (we are receiver, they are in receiverCandidates)
    const candidateListener = callDoc.collection('receiverCandidates').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && currentCall.peerConnection) {
          const candidate = new RTCIceCandidate(change.doc.data());
          currentCall.peerConnection.addIceCandidate(candidate);
        }
      });
    });
    
    currentCall.cleanup = () => {
      candidateListener();
    };
    
    // Update UI
    hideIncomingCall();
    showActiveCall(callData.callerName, callData.isVideo);
    
  } catch (error) {
    console.error('Error accepting call:', error);
    showToast('Failed to accept call', 'error');
    endCall();
  }
}

// ---------- Reject / End Call ----------
async function rejectCall() {
  const callId = document.getElementById('incomingCallModal').dataset.callId;
  if (callId) {
    await callsCollection.doc(callId).update({ status: 'rejected' });
  }
  hideIncomingCall();
  endCall();
}

async function endCall() {
  // Cleanup WebRTC
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
  if (currentCall.cleanup) currentCall.cleanup();
  
  // Update Firestore call status if still active
  if (currentCall.id) {
    await callsCollection.doc(currentCall.id).update({ status: 'ended' }).catch(() => {});
    currentCall.id = null;
  }
  
  // Hide UI
  hideActiveCall();
  hideIncomingCall();
  
  // Reset video elements
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
    const icon = btn.querySelector('i');
    if (audioTracks[0]?.enabled) {
      icon.className = 'fas fa-microphone';
    } else {
      icon.className = 'fas fa-microphone-slash';
    }
  }
}

function toggleSpeaker() {
  // Not implemented – can be done with audio output device selection
  showToast('Speaker toggled', 'info');
}

function toggleCamera() {
  if (currentCall.localStream && currentCall.isVideo) {
    const videoTracks = currentCall.localStream.getVideoTracks();
    videoTracks.forEach(track => track.enabled = !track.enabled);
  }
}

// ---------- Listen for Incoming Calls ----------
function setupIncomingCallListener() {
  if (!currentUser) return;
  
  incomingCallListener = callsCollection
    .where('receiverId', '==', currentUser.userId)
    .where('status', '==', 'ringing')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const call = change.doc.data();
          const callId = change.doc.id;
          
          // Don't show if we are the caller
          if (call.callerId === currentUser.userId) return;
          // Don't show if already on another call
          if (currentCall.id) return;
          
          // Fetch caller details
          usersRef.child(call.callerUid).once('value').then((snap) => {
            const caller = snap.val();
            if (caller) {
              showIncomingCall(callId, call.callerUid, caller.name, caller.profilePicture, call.isVideo);
            }
          });
        }
      });
    });
}

// Call this after currentUser is set (inside DOMContentLoaded)
document.addEventListener('DOMContentLoaded', () => {
  // Delay until currentUser is available
  const waitForUser = setInterval(() => {
    if (currentUser) {
      clearInterval(waitForUser);
      setupIncomingCallListener();
    }
  }, 100);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (incomingCallListener) incomingCallListener();
  endCall();
});

// Export to global scope
window.startCall = startCall;
window.acceptCall = acceptCall;
window.rejectCall = rejectCall;
window.endCall = endCall;
window.toggleMute = toggleMute;
window.toggleSpeaker = toggleSpeaker;
window.toggleCamera = toggleCamera;
