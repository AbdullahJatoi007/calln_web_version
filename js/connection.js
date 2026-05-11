async function initiatePeerConnection(role) {

    peerConnection = new RTCPeerConnection(
        CONFIG.ICE_SERVERS
    );

    // LOCAL AUDIO
    if (localStream) {

        localStream.getTracks().forEach(track => {

            peerConnection.addTrack(track, localStream);

        });
    }

    // REMOTE AUDIO
   peerConnection.ontrack = async (event) => {
    let remoteAudio = document.getElementById('remote-audio');
    if (!remoteAudio) {
        remoteAudio = document.createElement('audio');
        remoteAudio.id     = 'remote-audio';
        remoteAudio.autoplay = true;
        remoteAudio.muted  = false;
        remoteAudio.volume = 1.0;
        document.body.appendChild(remoteAudio);
    }
    remoteAudio.srcObject = event.streams[0];

    // REQUIRED on desktop — autoplay policy blocks audio without this
    try {
        await remoteAudio.play();
    } catch (err) {
        console.error('Audio play failed:', err);
    }
};

    // ICE
    peerConnection.onicecandidate = (event) => {

        if (event.candidate) {

            socket.emit('ice_candidate', {
                roomId: currentRoomId,
                candidate: event.candidate
            });
        }
    };

    // CALLER
    if (role === 'caller') {

        const offer =
            await peerConnection.createOffer();

        await peerConnection.setLocalDescription(
            offer
        );

        socket.emit('offer', {
            roomId: currentRoomId,
            offer
        });
    }
}