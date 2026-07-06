const AuditLog = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");

// Actions that are personal user-facing notifications — not shown in admin audit logs
const ADMIN_EXCLUDED_ACTIONS = [
  "ACCOUNT_CREATED",
  "VERIFICATION_PENDING",
  "ACCOUNT_VERIFIED",
  "VERIFICATION_REVOKED",
  "REVERIFICATION_REQUEST_DECLINED",
  "VERIFICATION_REJECTED",
];

// ─── GET /api/audit-log ──────────────────────────────────────────────────────
// Admins see all events; other roles only see their own.
const listAuditLogs = asyncHandler(async (req, res) => {
  const isAdmin = ["system_admin", "hospital_admin", "admin"].includes(req.user.role);
  const query = {};

  if (req.query.user) {
    query.user = req.query.user;
  } else if (!isAdmin) {
    // Doctor / patient — show own events + events they were the target of
    query.$or = [
      { user: req.user._id },
      { targetUserId: req.user._id },
    ];
  }

  // Admins: exclude user-personal notification entries (they have admin-facing equivalents)
  if (isAdmin && !req.query.action) {
    query.action = { $nin: ADMIN_EXCLUDED_ACTIONS };
  }

  if (req.query.record) query.record = req.query.record;
  if (req.query.action) query.action = req.query.action;

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(Number(req.query.limit || 200))
    .populate("user",         "fullName email role")
    .populate("targetUserId", "fullName email role")
    .populate("record",       "title diagnosis recordType status");

  res.json({ success: true, data: logs });
});

module.exports = { listAuditLogs };
