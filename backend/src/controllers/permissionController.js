const Permission = require("../models/Permission");
const Patient = require("../models/Patient");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler");
const { grantPermission, revokePermission } = require("../services/blockchainService");
const { writeAudit } = require("../services/auditService");
const { drName } = require("../utils/drName");

const grantAccess = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.body.patient);
  const grantee = await User.findById(req.body.grantee);

  if (!patient || !grantee) {
    return res.status(404).json({ success: false, message: "Patient or grantee not found" });
  }

  if (req.user.role === "patient" && String(patient.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Only the patient can grant this access" });
  }

  const patientUser = await User.findById(patient.user);
  if (!patientUser) {
    return res.status(404).json({ success: false, message: "Patient account not found" });
  }

  const chain = await grantPermission({
    recordId: req.body.record || "ALL_RECORDS",
    patientWallet: patientUser.walletAddress,
    granteeWallet: grantee.walletAddress,
    permissionTypes: req.body.permissionTypes,
  });

  const permission = await Permission.findOneAndUpdate(
    { patient: patient._id, grantee: grantee._id, record: req.body.record || null },
    {
      patient: patient._id,
      grantee: grantee._id,
      record: req.body.record || null,
      permissionTypes: req.body.permissionTypes,
      isActive: true,
      expiresAt: req.body.expiresAt,
      blockchainTxId: chain.txId,
    },
    { upsert: true, new: true, runValidators: true },
  );

  await writeAudit({
    user:           req.user._id,
    action:         "ACCESS_GRANT",
    ipAddress:      req.ip,
    record:         req.body.record,
    targetUserId:   grantee._id,
    targetUserName: drName(grantee.fullName),
    metadata:       { grantee: grantee._id, permissionTypes: req.body.permissionTypes },
    blockchainTxId: chain.txId,
  });

  res.status(201).json({ success: true, data: permission });
});

const revokeAccess = asyncHandler(async (req, res) => {
  const permission = await Permission.findById(req.body.permission);
  if (!permission) return res.status(404).json({ success: false, message: "Permission not found" });

  const patient = await Patient.findById(permission.patient);
  const grantee = await User.findById(permission.grantee);

  if (!patient || !grantee) {
    return res.status(404).json({ success: false, message: "Patient or grantee not found" });
  }

  if (req.user.role === "patient" && String(patient.user) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Only the patient can revoke this access" });
  }

  const patientUser = await User.findById(patient.user);
  if (!patientUser) {
    return res.status(404).json({ success: false, message: "Patient account not found" });
  }

  const chain = await revokePermission({
    recordId: permission.record || "ALL_RECORDS",
    patientWallet: patientUser.walletAddress,
    granteeWallet: grantee.walletAddress,
  });

  permission.isActive = false;
  permission.blockchainTxId = chain.txId;
  await permission.save();

  await writeAudit({
    user:           req.user._id,
    action:         "ACCESS_REVOKE",
    ipAddress:      req.ip,
    record:         permission.record,
    targetUserId:   grantee._id,
    targetUserName: drName(grantee.fullName),
    metadata:       { grantee: grantee._id },
    blockchainTxId: chain.txId,
  });

  res.json({ success: true, data: permission });
});

const listPermissions = asyncHandler(async (req, res) => {
  const query = {};

  if (req.query.patient) {
    query.patient = req.query.patient;
  } else if (req.query.grantee) {
    query.grantee = req.query.grantee;
  } else if (req.user.role === "patient") {
    const patient = await Patient.findOne({ user: req.user._id });
    if (!patient) {
      return res.json({ success: true, data: [] });
    }
    query.patient = patient._id;
  } else if (!["system_admin", "hospital_admin", "admin"].includes(req.user.role)) {
    query.grantee = req.user._id;
  }

  const permissions = await Permission.find(query)
    .populate("patient")
    .populate("grantee", "fullName email role walletAddress");

  // Exclude orphans whose patient or grantee was deleted after the permission was created
  const valid = permissions.filter((p) => p.patient != null && p.grantee != null);

  res.json({ success: true, data: valid });
});

// ─── GET /api/doctors/search?q= ─────────────────────────────────────────────
// Returns users with role=doctor whose name, email, or wallet matches the query.
// Includes verificationStatus from the Doctor profile for frontend eligibility checks.
const searchDoctors = asyncHandler(async (req, res) => {
  const raw = (req.query.q || "").trim();
  const filter = { role: "doctor" };
  if (raw) {
    const safe = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(safe, "i");
    filter.$or = [{ fullName: re }, { email: re }, { walletAddress: re }];
  }
  const users = await User.find(filter)
    .select("fullName email walletAddress")
    .limit(10)
    .lean();

  const profiles = await Doctor.find({ user: { $in: users.map((u) => u._id) } })
    .select("user verificationStatus rejectionType verificationReason")
    .lean();
  const profileMap = Object.fromEntries(profiles.map((d) => [String(d.user), d]));

  const data = users.map((u) => {
    const p = profileMap[String(u._id)] || {};
    return {
      ...u,
      verificationStatus: p.verificationStatus || "pending",
      rejectionType:      p.rejectionType      || null,
      verificationReason: p.verificationReason || null,
    };
  });

  res.json({ success: true, data });
});

// ─── GET /api/my-permissions ─────────────────────────────────────────────────
// Lists all permissions the logged-in patient has granted.
// Auto-expires any permissions whose expiresAt has passed.
const listMyPermissions = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) return res.json({ success: true, data: [] });

  const now = new Date();
  const perms = await Permission.find({ patient: patient._id })
    .populate("grantee", "fullName email walletAddress")
    .sort({ createdAt: -1 })
    .lean();

  // Auto-expire: mark overdue active permissions as inactive in one batch
  const justExpiredPerms = perms.filter(
    (p) => p.isActive && p.expiresAt && new Date(p.expiresAt) < now,
  );
  const expiredIds = justExpiredPerms.map((p) => p._id);
  if (expiredIds.length > 0) {
    await Permission.updateMany({ _id: { $in: expiredIds } }, { isActive: false });

    // Log PERMISSION_EXPIRED for each affected doctor so the event appears in their activity feed
    const patientName = req.user.fullName;
    for (const perm of justExpiredPerms) {
      const doctorUserId = perm.grantee?._id ?? perm.grantee;
      writeAudit({
        user:           doctorUserId,
        action:         "PERMISSION_EXPIRED",
        targetUserName: patientName,
        // No description: meta.label ("Permission Expired") is the title;
        // shortDescription() supplies "Access to {name}'s records has expired".
      });
    }
  }

  // Exclude orphans whose doctor was deleted after the permission was created
  const validPerms = perms.filter((p) => p.grantee != null);

  const result = validPerms.map((p) => {
    let status;
    if (!p.isActive) {
      status = "revoked";
    } else if (p.expiresAt && new Date(p.expiresAt) < now) {
      status = "expired";
    } else {
      status = "active";
    }
    return { ...p, status };
  });

  res.json({ success: true, data: result });
});

// ─── POST /api/my-permissions/grant ─────────────────────────────────────────
// Patient grants a doctor access to all their records.
const grantMyAccess = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    return res.status(400).json({ success: false, message: "Patient profile not found." });
  }

  const { doctorUserId, accessLevel, expiresAt } = req.body;

  const doctorUser = await User.findById(doctorUserId);
  if (!doctorUser || doctorUser.role !== "doctor") {
    return res.status(404).json({ success: false, message: "Doctor not found." });
  }

  const doctorProfile = await Doctor.findOne({ user: doctorUserId }).select("verificationStatus").lean();
  if (!doctorProfile || doctorProfile.verificationStatus !== "verified") {
    return res.status(403).json({ success: false, message: "This doctor is not verified by the administrator and cannot receive access to patient records." });
  }

  const expiryDate = new Date(expiresAt);
  if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
    return res.status(400).json({ success: false, message: "Expiry date must be in the future." });
  }

  // Duplicate check: block if an active, non-expired permission already exists
  const existing = await Permission.findOne({
    patient: patient._id,
    grantee: doctorUserId,
    record: null,
    isActive: true,
  });
  if (existing) {
    const alreadyExpired = existing.expiresAt && new Date(existing.expiresAt) < new Date();
    if (!alreadyExpired) {
      return res.status(409).json({ success: false, message: "This doctor already has active access." });
    }
  }

  const patientUser = await User.findById(patient.user);
  const chain = await grantPermission({
    recordId: "ALL_RECORDS",
    patientWallet: patientUser.walletAddress,
    granteeWallet: doctorUser.walletAddress,
    permissionTypes: ["read"],
  });

  const permission = await Permission.findOneAndUpdate(
    { patient: patient._id, grantee: doctorUserId, record: null },
    {
      patient: patient._id,
      grantee: doctorUserId,
      record: null,
      permissionTypes: ["read"],
      accessLevel,
      isActive: true,
      grantedAt: new Date(),
      expiresAt: expiryDate,
      blockchainTxId: chain.txId,
    },
    { upsert: true, new: true, runValidators: true },
  );

  await writeAudit({
    user:           req.user._id,
    action:         "ACCESS_GRANT",
    ipAddress:      req.ip,
    blockchainTxId: chain.txId,
    actorName:      `Patient ${req.user.fullName}`,
    targetUserId:   doctorUserId,
    targetUserName: drName(doctorUser.fullName),
    recordTitle:    accessLevel === "view_download" ? "View + Download" : "View Only",
    description:    `Patient ${req.user.fullName} granted ${doctorUser.fullName} access`,
    metadata:       { grantee: doctorUserId, accessLevel },
  });

  res.status(201).json({ success: true, data: permission, message: "Access granted successfully." });
});

// ─── POST /api/my-permissions/:id/revoke ────────────────────────────────────
// Patient revokes a specific permission they own.
const revokeMyAccess = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  const permission = await Permission.findById(req.params.id);
  if (!permission) {
    return res.status(404).json({ success: false, message: "Permission not found." });
  }

  if (String(permission.patient) !== String(patient._id)) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  const doctorUser = await User.findById(permission.grantee);
  const patientUser = await User.findById(patient.user);

  const chain = await revokePermission({
    recordId: "ALL_RECORDS",
    patientWallet: patientUser?.walletAddress || "0x0",
    granteeWallet: doctorUser?.walletAddress || "0x0",
  });

  permission.isActive = false;
  permission.blockchainTxId = chain.txId;
  await permission.save();

  await writeAudit({
    user:           req.user._id,
    action:         "ACCESS_REVOKE",
    ipAddress:      req.ip,
    blockchainTxId: chain.txId,
    actorName:      `Patient ${req.user.fullName}`,
    targetUserId:   permission.grantee,
    targetUserName: doctorUser ? drName(doctorUser.fullName) : "",
    recordTitle:    permission.accessLevel === "view_download" ? "View + Download" : "View Only",
    description:    `Patient ${req.user.fullName} revoked ${doctorUser?.fullName || "doctor"} access`,
    metadata:       { grantee: String(permission.grantee) },
  });

  res.json({ success: true, message: "Access revoked successfully." });
});

module.exports = { grantAccess, revokeAccess, listPermissions, searchDoctors, listMyPermissions, grantMyAccess, revokeMyAccess };
