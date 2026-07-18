// ═══════════════════════════════════════════════════════════
// MESSAGING — friend-to-friend text + photos, auto-expiring
// after 7 days
//
// One shared Firestore doc per message, in a deterministic thread
// (sorted uid pair) both sides always compute the same way. Each
// message gets an `expiresAt` timestamp 7 days in the future;
// Firestore's own TTL policy (configured once in the Firebase
// Console, not in code) automatically deletes documents once that
// time passes — no Cloud Function or manual cleanup needed.
// ═══════════════════════════════════════════════════════════

import {
    collection, doc, addDoc, deleteDoc, updateDoc, Timestamp,
    query, orderBy, onSnapshot, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getDbAndUid() {
    await window.firebaseReady;
    return { db: window.firebaseDb, uid: window.CALLN_UID };
}

function conversationId(myUid, otherUid) {
    return [myUid, otherUid].sort().join('_');
}

function expiryTimestamp() {
    return Timestamp.fromDate(new Date(Date.now() + MESSAGE_TTL_MS));
}

async function sendMessage(otherUid, text) {
    const { db, uid } = await getDbAndUid();
    const convId = conversationId(uid, otherUid);

    await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderUid: uid,
        text:      text,
        image:     null,
        read:      false,
        createdAt: serverTimestamp(),
        expiresAt: expiryTimestamp(),
    });
}

// `base64Image` should already be compressed (e.g. via
// CHAT_MANAGER.compressImage() — reused from the in-call chat,
// no need to reinvent compression).
async function sendImage(otherUid, base64Image) {
    const { db, uid } = await getDbAndUid();
    const convId = conversationId(uid, otherUid);

    await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderUid: uid,
        text:      null,
        image:     base64Image,
        read:      false,
        createdAt: serverTimestamp(),
        expiresAt: expiryTimestamp(),
    });
}

// Live-updating message list for one conversation, oldest first.
async function listenToConversation(otherUid, callback) {
    const { db, uid } = await getDbAndUid();
    const convId = conversationId(uid, otherUid);

    const q = query(
        collection(db, 'conversations', convId, 'messages'),
        orderBy('createdAt', 'asc'),
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(messages);
    });
}

// Marks specific incoming messages as read — the security rules only
// allow the NON-sender participant to flip this field, and only this
// field (see firestore.rules).
async function markRead(otherUid, messageIds) {
    const { db, uid } = await getDbAndUid();
    const convId = conversationId(uid, otherUid);

    await Promise.all(
        messageIds.map(id => updateDoc(doc(db, 'conversations', convId, 'messages', id), { read: true }))
    );
}

// Live unread count for one friend — messages sent BY them, not yet
// marked read. No orderBy here on purpose (keeps this to a simple
// single-field-equality query, no composite Firestore index needed).
async function listenUnreadCount(otherUid, callback) {
    const { db, uid } = await getDbAndUid();
    const convId = conversationId(uid, otherUid);

    const q = query(
        collection(db, 'conversations', convId, 'messages'),
        // NOTE: filtered further client-side (senderUid !== me) since
        // combining two equality filters here would need a composite
        // index; this collection is small per-conversation so it's cheap.
    );

    return onSnapshot(q, (snapshot) => {
        const unread = snapshot.docs
            .map(d => d.data())
            .filter(m => m.senderUid === otherUid && m.read === false);
        callback(unread.length);
    });
}

// Manual delete — kept available for a future "delete this message"
// button; not part of the normal flow (messages expire via TTL,
// unread state is tracked via `read` instead).
async function deleteMessage(otherUid, messageId) {
    const { db, uid } = await getDbAndUid();
    const convId = conversationId(uid, otherUid);
    await deleteDoc(doc(db, 'conversations', convId, 'messages', messageId));
}

window.CALLN_MESSAGING = {
    sendMessage,
    sendImage,
    listenToConversation,
    markRead,
    listenUnreadCount,
    deleteMessage,
};

window.dispatchEvent(new CustomEvent('calln-messaging-ready'));