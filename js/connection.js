async function initiatePeerConnection(role) {
    peerConnection = new RTCPeerConnection(CONFIG.ICE_SERVERS);

    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    peerConnection.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice_candidate', {
                roomId: currentRoomId,
                candidate: event.candidate
            });
        }
    };

    if (role === 'caller') {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit('offer', {
            roomId: currentRoomId,
            offer,
            role: 'caller'
        });
    }
}