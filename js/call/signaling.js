// ═══════════════════════════════════════════════════════════
// WEBRTC SIGNALLING (receiving side)
// The sending side (creating/emitting the offer) lives in
// connection.js's initiatePeerConnection(). This file handles
// what happens when the *other* side's signals arrive.
// ═══════════════════════════════════════════════════════════

// Answerer: receives the caller's offer, replies with an answer
socket.on('offer', async (data) => {

    if (!peerConnection) {
        await initiatePeerConnection('answerer');
    }

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.offer)
    );

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socket.emit('answer', {
        roomId: currentRoomId,
        answer
    });
});

// Caller: receives the answerer's answer, completes handshake
socket.on('answer', async (data) => {

    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(
        new RTCSessionDescription(data.answer)
    );
});

// Both sides: exchange ICE candidates to establish the best path
socket.on('ice_candidate', async (data) => {

    if (!peerConnection || !data.candidate) return;

    try {
        await peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
        );
    } catch (err) {
        console.error("ICE error:", err);
    }
});
