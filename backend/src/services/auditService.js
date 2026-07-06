const AuditLog = require("../models/AuditLog");

/**
 * Fire-and-forget audit writer. Never throws — a logging failure must never
 * crash the primary request handler.
 */
async function writeAudit({
  user, action, ipAddress, record, metadata, blockchainTxId,
  description, actorName, targetUserId, targetUserName, recordTitle,
}) {
  try {
    await AuditLog.create({
      user, action, ipAddress, record, metadata, blockchainTxId,
      description, actorName, targetUserId, targetUserName, recordTitle,
    });
  } catch (err) {
    console.error("[Audit] Failed to log event:", err.message);
  }
}

module.exports = { writeAudit };
