const mongoose = require("mongoose");
const path        = require("path");
const fs          = require("fs");
const User        = require("../models/User");
const Patient     = require("../models/Patient");
const Doctor      = require("../models/Doctor");
const DoctorNote  = require("../models/DoctorNote");
const MedicalRecord = require("../models/MedicalRecord");
const Permission  = require("../models/Permission");
const AuditLog    = require("../models/AuditLog");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");
const { drName } = require("../utils/drName");

// ─── Existing endpoints (unchanged) ──────────────────────────────────────────

const stats = asyncHandler(async (req, res) => {
  const [users, patients, doctors, records, permissions, auditLogs] = await Promise.all([
    User.countDocuments(),
    Patient.countDocuments(),
    Doctor.countDocuments(),
    MedicalRecord.countDocuments(),
    Permission.countDocuments({ isActive: true }),
    AuditLog.countDocuments(),
  ]);
  res.json({ success: true, data: { users, patients, doctors, records, permissions, auditLogs } });
});

const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

// ─── New admin dashboard endpoint ────────────────────────────────────────────

const dashboard = asyncHandler(async (req, res) => {
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Run all heavy queries in a single parallel batch
  const [
    totalPatients,
    totalDoctors,
    totalRecords,
    activePermissions,
    medicalNotes,
    activeUsers,
    recentActivityRaw,
    recentRegistrations,
    todayLoginLogs,
    lastLoginLog,
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    MedicalRecord.countDocuments(),
    Permission.countDocuments({ isActive: true }),
    DoctorNote.countDocuments(),
    User.countDocuments({ isActive: true }),

    // Latest 10 system-wide audit events — exclude user-personal notification entries
    AuditLog.find({ action: { $nin: ["ACCOUNT_CREATED", "VERIFICATION_PENDING", "ACCOUNT_VERIFIED", "VERIFICATION_REVOKED", "REVERIFICATION_REQUEST_DECLINED", "VERIFICATION_REJECTED"] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user", "fullName role")
      .lean(),

    // Latest 8 registered users
    User.find()
      .select("-password +profilePhoto")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),

    // All LOGIN events today (for the login summary breakdown)
    AuditLog.find({ action: "LOGIN", createdAt: { $gte: todayStart } })
      .populate("user", "role")
      .lean(),

    // The requesting admin's most recent login event
    AuditLog.findOne({ user: req.user._id, action: "LOGIN" })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // Login summary broken down by role
  const loginSummary = {
    todayTotal:    todayLoginLogs.length,
    patientLogins: todayLoginLogs.filter((l) => l.user?.role === "patient").length,
    doctorLogins:  todayLoginLogs.filter((l) => l.user?.role === "doctor").length,
    adminLogins:   todayLoginLogs.filter((l) =>
      ["admin", "system_admin", "hospital_admin"].includes(l.user?.role)
    ).length,
  };

  // Database health — ping the connection
  let dbStatus = "operational";
  try {
    await mongoose.connection.db.command({ ping: 1 });
  } catch {
    dbStatus = "degraded";
  }

  res.json({
    success: true,
    data: {
      stats: {
        totalPatients,
        totalDoctors,
        totalRecords,
        activePermissions,
        medicalNotes,
        activeUsers,
      },
      recentActivity: recentActivityRaw.map((log) => ({
        _id:            String(log._id),
        action:         log.action,
        actorName:      log.actorName || log.user?.fullName || "System",
        actorRole:      log.user?.role  || null,
        targetUserName: log.targetUserName || null,
        recordTitle:    log.recordTitle    || null,
        createdAt:      log.createdAt,
      })),
      recentRegistrations: recentRegistrations.map((u) => ({
        _id:           String(u._id),
        fullName:      u.fullName,
        email:         u.email,
        role:          u.role,
        isActive:      u.isActive,
        createdAt:     u.createdAt,
        walletAddress: u.walletAddress,
        profilePhoto:  u.profilePhoto  || null,
      })),
      loginSummary,
      lastLogin: lastLoginLog?.createdAt || null,
      systemHealth: {
        backend:       "operational",
        database:      dbStatus,
        blockchain:    "operational",
        api:           "operational",
        walletService: "operational",
      },
    },
  });
});

// ─── Admin: list all patients ─────────────────────────────────────────────────

const getAdminPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find()
    .populate("user", "fullName email mobileNumber walletAddress isActive createdAt profilePhoto")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: patients });
});

// ─── Admin: list all doctors ──────────────────────────────────────────────────

const getAdminDoctors = asyncHandler(async (req, res) => {
  const doctors = await Doctor.find()
    .populate("user", "fullName email mobileNumber walletAddress isActive createdAt profilePhoto")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: doctors });
});

// ─── Admin: list all doctor notes ────────────────────────────────────────────

const getAdminDoctorNotes = asyncHandler(async (req, res) => {
  const notes = await DoctorNote.find()
    .populate("doctor",     "fullName profilePhoto")
    .populate("patientRef", "name patientId")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: notes });
});

// ─── Admin: list all medical records ─────────────────────────────────────────

const getAdminMedicalRecords = asyncHandler(async (req, res) => {
  const records = await MedicalRecord.find()
    .populate("patient", "name patientId")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: records });
});

// ─── Admin: download an attachment ───────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

const downloadAdminAttachment = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id).lean();
  if (!record) return res.status(404).json({ success: false, message: "Record not found." });

  const att = record.attachments?.find((a) => a.cid === req.params.cid);
  if (!att) return res.status(404).json({ success: false, message: "Attachment not found." });

  if (att.cid.startsWith("mock-ipfs-")) {
    return res.status(410).json({ success: false, message: "File not available for download." });
  }

  const filePath = path.resolve(UPLOADS_DIR, path.basename(att.cid));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found on server." });
  }

  res.download(filePath, att.fileName);
});

// ─── Admin: verify a doctor ───────────────────────────────────────────────────

const verifyDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
  const isReverification = doctor.reVerificationRequested === true;
  doctor.verificationStatus          = "verified";
  doctor.reVerificationRequested     = false;
  doctor.lastReverificationDeclined  = false;
  doctor.rejectionType               = null;
  doctor.rejectionReason             = null;
  await doctor.save();
  const adminAction = isReverification ? "DOCTOR_REVERIFIED" : "DOCTOR_VERIFIED";
  const verb        = isReverification ? "re-verified"       : "verified";
  writeAudit({
    user:           req.user._id,
    action:         adminAction,
    ipAddress:      req.ip,
    actorName:      req.user.fullName,
    targetUserName: drName(doctor.name),
    description:    `Administrator ${verb} doctor account: ${drName(doctor.name)}. Status: Success`,
  });
  writeAudit({
    user:      doctor.user,
    action:    "ACCOUNT_VERIFIED",
    ipAddress: req.ip,
    actorName: drName(doctor.name),
  });
  res.json({ success: true, message: "Doctor verified successfully." });
});

// ─── Admin: reject a doctor ───────────────────────────────────────────────────

const rejectDoctor = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });

  const previousStatus    = doctor.verificationStatus;
  const isInitialRejection = previousStatus === "pending";
  const reason            = req.body?.reason;

  doctor.verificationStatus = "rejected";
  doctor.rejectionType      = isInitialRejection ? "initial" : "revoked";

  if (isInitialRejection) {
    if (reason) doctor.rejectionReason = reason;
    doctor.reVerificationRequested = false;
    await doctor.save();
    writeAudit({
      user:           req.user._id,
      action:         "DOCTOR_INITIAL_REJECTED",
      ipAddress:      req.ip,
      actorName:      req.user.fullName,
      targetUserName: drName(doctor.name),
      recordTitle:    reason || undefined,
      description:    `Administrator rejected verification request for ${drName(doctor.name)}.${reason ? ` Reason: ${reason}.` : ""}`,
    });
    writeAudit({
      user:      doctor.user,
      action:    "VERIFICATION_REJECTED",
      ipAddress: req.ip,
      actorName: drName(doctor.name),
      metadata:  { reason: reason || null },
    });
  } else {
    // Existing revoke flow — keeps verificationReason for backward compat
    if (reason) doctor.verificationReason = reason;
    await doctor.save();
    if (reason) {
      writeAudit({
        user:           req.user._id,
        action:         "DOCTOR_REVOKED",
        ipAddress:      req.ip,
        actorName:      req.user.fullName,
        targetUserName: drName(doctor.name),
        recordTitle:    reason,
        description:    `Administrator revoked verification for ${drName(doctor.name)}. Reason: ${reason}. Status: Success`,
      });
      writeAudit({
        user:      doctor.user,
        action:    "VERIFICATION_REVOKED",
        ipAddress: req.ip,
        actorName: drName(doctor.name),
        metadata:  { reason },
      });
    }
  }
  res.json({ success: true, message: "Doctor rejected successfully." });
});

// ─── Admin: decline a re-verification request ────────────────────────────────

const rejectReverification = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.params.id);
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found." });
  if (!doctor.reVerificationRequested) {
    return res.status(400).json({ success: false, message: "No pending re-verification request." });
  }
  doctor.reVerificationRequested    = false;
  doctor.lastReverificationDeclined = true;
  await doctor.save();
  const reason = req.body?.reason?.trim() || null;
  writeAudit({
    user:           req.user._id,
    action:         "REVERIFICATION_DECLINED",
    ipAddress:      req.ip,
    actorName:      req.user.fullName,
    targetUserName: drName(doctor.name),
    recordTitle:    reason || undefined,
    description:    `Administrator declined re-verification request for ${drName(doctor.name)}.${reason ? ` Reason: ${reason}.` : ""}`,
  });
  writeAudit({
    user:      doctor.user,
    action:    "REVERIFICATION_REQUEST_DECLINED",
    ipAddress: req.ip,
    actorName: drName(doctor.name),
    metadata:  { reason },
  });
  res.json({ success: true, message: "Re-verification request declined." });
});

module.exports = { stats, listUsers, dashboard, getAdminPatients, getAdminDoctors, getAdminDoctorNotes, getAdminMedicalRecords, downloadAdminAttachment, verifyDoctor, rejectDoctor, rejectReverification };
