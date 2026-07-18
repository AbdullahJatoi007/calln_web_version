// ═══════════════════════════════════════════════════════════
// FRIEND-RELATED CALL STATE
// Kept in its own file rather than added to connection.js, since
// that file has caused enough grief already — this way it's easy
// to find and nothing else needs touching to add this feature.
// ═══════════════════════════════════════════════════════════
let currentPartnerUid         = null;
let currentPartnerDisplayName = null;