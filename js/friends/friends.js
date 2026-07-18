// ═══════════════════════════════════════════════════════════
// FRIENDS — Firestore-backed friend requests + friend list
//
// Load as: <script type="module" src="js/friends/friends.js"></script>
// (after js/firebase/firebase-init.js in the HTML — though as a
// module it's fine either way; every function here awaits
// window.firebaseReady before touching Firestore).
//
// Exposes window.CALLN_FRIENDS with:
//   sendRequest(toUid, toDisplayName)   -> Promise<requestId>
//   acceptRequest(requestId)             -> Promise<void>
//   declineRequest(requestId)            -> Promise<void>
//   cancelRequest(requestId)             -> Promise<void>
//   listenIncomingRequests(callback)     -> unsubscribe function
//   listenOutgoingRequests(callback)     -> unsubscribe function
//   listenFriendsList(callback)          -> unsubscribe function
//
// NOT yet wired to any button/UI — that depends on the server
// relaying each side's Firebase UID during the 'matched' event
// (Track 2), so the "Add Friend" button knows who the partner is.
// This file is the ready-to-use API layer for whenever that's done.
// ═══════════════════════════════════════════════════════════

import {
    collection, doc, addDoc, updateDoc, deleteDoc, setDoc,
    query, where, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

async function getDbAndUid() {
    await window.firebaseReady;
    return { db: window.firebaseDb, uid: window.CALLN_UID };
}

// ── Send a friend request ────────────────────────────────────
// fromDisplayName: the sender's own display name, so the recipient
// can see who's requesting. toDisplayName: optional, if the sender
// already knows it (e.g. from the call they were just on).
async function sendRequest(toUid, fromDisplayName, toDisplayName = null) {
    const { db, uid } = await getDbAndUid();

    if (toUid === uid) {
        throw new Error('Cannot send a friend request to yourself.');
    }

    const docRef = await addDoc(collection(db, 'friend_requests'), {
        fromUid:          uid,
        toUid:            toUid,
        fromDisplayName:  fromDisplayName,
        toDisplayName:    toDisplayName,
        status:           'pending',
        createdAt:        serverTimestamp(),
        respondedAt:      null,
    });

    return docRef.id;
}

// ── Accept a pending request ─────────────────────────────────
// Writes the mutual friend-list entries AND updates the request
// status. Three separate writes (not a single atomic batch) —
// acceptable here since a partial failure just means retrying is
// safe (idempotent), but worth revisiting alongside the Cloud
// Function hardening noted in firestore.rules.
async function acceptRequest(requestId, request) {
    // `request` = the request doc's data, e.g. { fromUid, toDisplayName }
    // passed in by the caller (from the listenIncomingRequests callback)
    // so we don't need an extra read here.
    const { db, uid } = await getDbAndUid();

    const fromUid = request.fromUid;

    await updateDoc(doc(db, 'friend_requests', requestId), {
        status:      'accepted',
        respondedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'friends', uid, 'list', fromUid), {
        uid:         fromUid,
        displayName: request.fromDisplayName || null,
        addedAt:     serverTimestamp(),
    });

    await setDoc(doc(db, 'friends', fromUid, 'list', uid), {
        uid:         uid,
        displayName: request.toDisplayName || null,
        addedAt:     serverTimestamp(),
    });
}

// ── Decline a pending request ────────────────────────────────
async function declineRequest(requestId) {
    const { db } = await getDbAndUid();

    await updateDoc(doc(db, 'friend_requests', requestId), {
        status:      'declined',
        respondedAt: serverTimestamp(),
    });
}

// ── Cancel a request you sent ────────────────────────────────
async function cancelRequest(requestId) {
    const { db } = await getDbAndUid();
    await deleteDoc(doc(db, 'friend_requests', requestId));
}

// ── Listen: requests sent TO me, still pending ───────────────
async function listenIncomingRequests(callback) {
    const { db, uid } = await getDbAndUid();

    const q = query(
        collection(db, 'friend_requests'),
        where('toUid', '==', uid),
        where('status', '==', 'pending'),
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(requests);
    });
}

// ── Listen: requests I sent, still pending ───────────────────
async function listenOutgoingRequests(callback) {
    const { db, uid } = await getDbAndUid();

    const q = query(
        collection(db, 'friend_requests'),
        where('fromUid', '==', uid),
        where('status', '==', 'pending'),
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(requests);
    });
}

// ── Remove a friend ───────────────────────────────────────────
// Deletes the mutual entries on both sides. The existing security
// rule for friends/{ownerUid}/list/{friendUid} already permits this
// (allow write covers create/update/delete) for either the list
// owner or the friend referenced by the entry.
async function removeFriend(friendUid) {
    const { db, uid } = await getDbAndUid();

    await deleteDoc(doc(db, 'friends', uid, 'list', friendUid));
    await deleteDoc(doc(db, 'friends', friendUid, 'list', uid));
}

// ── Listen: my accepted friends list ─────────────────────────
async function listenFriendsList(callback) {
    const { db, uid } = await getDbAndUid();

    const q = collection(db, 'friends', uid, 'list');

    return onSnapshot(q, (snapshot) => {
        const friends = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(friends);
    });
}

window.CALLN_FRIENDS = {
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    listenIncomingRequests,
    listenOutgoingRequests,
    listenFriendsList,
};

// Lets classic scripts (which can't use `import`) know it's safe to
// use window.CALLN_FRIENDS, regardless of module- vs classic-script
// load-order timing (modules load deferred, independent of tag order).
window.dispatchEvent(new CustomEvent('calln-friends-ready'));