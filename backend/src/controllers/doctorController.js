const path = require("path");
const fs   = require("fs");

const Doctor      = require("../models/Doctor");
const User        = require("../models/User");
const Patient     = require("../models/Patient");
const Permission  = require("../models/Permission");
const MedicalRecord = require("../models/MedicalRecord");
const AuditLog    = require("../models/AuditLog");
const DoctorNote  = require("../models/DoctorNote");
const asyncHandler  = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");
const { drName } = require("../utils/drName");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// ─── Shared helper: active-permission filter for a doctor ─────────────────────
function activePermFilter(doctorUserId) {
  const now = new Date();
  return {
    grantee: doctorUserId,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };
}

// ─── GET /api/doctor/dashboard ────────────────────────────────────────────────
const getDoctorDashboard = asyncHandler(async (req, res) => {
  const doctorId = req.user._id;
  const filter   = activePermFilter(doctorId);

  const [patientIds, activePermissions, recentLogsRaw, doctor] = await Promise.all([
    Permission.distinct("patient", filter),
    Permission.countDocuments(filter),
    // Clinical actions only — LOGIN is an auth event, not a clinical activity.
    // Cross-user: patient ACCESS_GRANT/REVOKE events land via targetUserId.
    // PERMISSION_EXPIRED has user=doctorId so it falls into the first arm naturally.
    AuditLog.find({
      $or: [
        { user: doctorId, action: { $nin: ["LOGIN", "DOCTOR_REGISTRATION"] } },
        { targetUserId: doctorId, action: { $in: ["ACCESS_GRANT", "ACCESS_REVOKE"] } },
      ],
    })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .lean(),
    Doctor.findOne({ user: doctorId }).lean(),
  ]);

  const [sharedRecords, viewedToday] = await Promise.all([
    MedicalRecord.countDocuments({ patient: { $in: patientIds } }),
    AuditLog.countDocuments({
      user: doctorId,
      action: "RECORD_VIEW",
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  const recentActivity = recentLogsRaw.map((log) => ({
    action:         log.action,
    actorUserId:    String(log.user),
    actorName:      log.actorName      || null,
    targetUserName: log.targetUserName || null,
    recordTitle:    log.recordTitle    || null,
    description:    log.description    || null,
    timestamp:      log.createdAt,
    metadata:       log.metadata       || null,
  }));

  res.json({
    success: true,
    data: {
      doctorId:        doctor?.doctorId,
      totalPatients:   patientIds.length,
      sharedRecords,
      activePermissions,
      viewedToday,
      recentActivity,
    },
  });
});

// ─── GET /api/doctor/patients ─────────────────────────────────────────────────
const getDoctorPatients = asyncHandler(async (req, res) => {
  const filter = activePermFilter(req.user._id);
  const perms  = await Permission.find(filter)
    .populate({
      path: "patient",
      populate: { path: "user", select: "fullName email walletAddress +profilePhoto" },
    })
    .sort({ grantedAt: -1, createdAt: -1 })
    .lean();

  const data = perms
    .filter((p) => p.patient) // skip orphaned permissions
    .map((p) => ({
      permissionId: p._id,
      patient:      p.patient,
      accessLevel:  p.accessLevel,
      grantedAt:    p.grantedAt || p.createdAt,
      expiresAt:    p.expiresAt,
    }));

  res.json({ success: true, data });
});

// ─── GET /api/doctor/shared-records ──────────────────────────────────────────
const getDoctorSharedRecords = asyncHandler(async (req, res) => {
  const filter     = activePermFilter(req.user._id);
  const patientIds = await Permission.distinct("patient", filter);

  const query = { patient: { $in: patientIds } };
  if (req.query.type)   query.recordType = req.query.type;
  if (req.query.search) {
    const safe = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re   = new RegExp(safe, "i");
    query.$or  = [{ title: re }, { diagnosis: re }, { hospitalName: re }];
  }

  const records = await MedicalRecord.find(query)
    .populate("patient", "name patientId")
    .sort({ createdAt: -1 })
    .lean();

  // attach permission info for expiry display
  const perms = await Permission.find(filter).lean();
  const permByPatient = {};
  for (const p of perms) permByPatient[String(p.patient)] = p;

  const data = records.map((r) => ({
    ...r,
    permission: permByPatient[String(r.patient?._id)] || null,
  }));

  res.json({ success: true, data });

  // After the response is sent, log RECORD_VIEW for each unique patient (1-hour deduplication).
  // The doctor "views" records by loading this page — log once per patient per hour to avoid noise.
  if (records.length > 0) {
    const oneHourAgo   = new Date(Date.now() - 3_600_000);
    const doctorName   = drName(req.user.fullName);
    const uniquePNames = [...new Set(records.map((r) => r.patient?.name).filter(Boolean))];

    const recentViews = await AuditLog.find({
      user:         req.user._id,
      action:       "RECORD_VIEW",
      createdAt:    { $gte: oneHourAgo },
    }).select("targetUserName").lean();
    const alreadyLogged = new Set(recentViews.map((v) => v.targetUserName));

    for (const pName of uniquePNames) {
      if (!alreadyLogged.has(pName)) {
        await writeAudit({
          user:           req.user._id,
          action:         "RECORD_VIEW",
          actorName:      doctorName,
          targetUserName: pName,
          // No description: meta.label ("Viewed Patient Record") is the title;
          // shortDescription() supplies "Viewed medical records of {name}".
          ipAddress:      req.ip,
        });
        alreadyLogged.add(pName); // prevent duplicates within the same iteration
      }
    }
  }
});

// ─── GET /api/doctor/shared-records/:id/download/:filename ───────────────────
const downloadSharedAttachment = asyncHandler(async (req, res) => {
  const filter     = activePermFilter(req.user._id);
  const patientIds = await Permission.distinct("patient", filter);

  const record = await MedicalRecord.findById(req.params.id).lean();
  if (!record) return res.status(404).json({ success: false, message: "Record not found." });

  const hasAccess = patientIds.some((id) => String(id) === String(record.patient));
  if (!hasAccess) return res.status(403).json({ success: false, message: "Access denied." });

  // Enforce access level — view_only permissions must not be able to download
  const perm = await Permission.findOne({ ...activePermFilter(req.user._id), patient: record.patient }).lean();
  if (!perm || perm.accessLevel !== "view_download") {
    return res.status(403).json({ success: false, message: "Your permission level does not allow downloading records." });
  }

  const att = record.attachments?.find((a) => a.cid === req.params.filename);
  if (!att) return res.status(404).json({ success: false, message: "Attachment not found." });

  if (att.cid.startsWith("mock-ipfs-")) {
    return res.status(410).json({ success: false, message: "File not available for download." });
  }

  const filePath = path.resolve(UPLOADS_DIR, path.basename(att.cid));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found on server." });
  }

  // Look up the patient's name so the event appears in the patient's activity feed.
  // Skip logging entirely if we can't resolve a real patient name — never log "a patient".
  const patientDoc  = await Patient.findById(record.patient).select("user name").lean();
  const patientName = patientDoc?.name;
  if (patientName) {
    await writeAudit({
      user:           req.user._id,
      action:         "RECORD_DOWNLOAD",
      ipAddress:      req.ip,
      record:         record._id,
      actorName:      drName(req.user.fullName),
      recordTitle:    record.title || record.diagnosis || att.fileName,
      targetUserId:   patientDoc.user,
      targetUserName: patientName,
      // No description: meta.label ("Downloaded Medical Record") is the title;
      // shortDescription() supplies "Downloaded medical records of {name}".
      metadata:       { fileName: att.fileName },
    });
  }

  res.download(filePath, att.fileName);
});

// ─── GET /api/doctor/shared-records/:id/preview/:filename ───────────────────
// Serves the attachment inline (browser PDF/image viewer). Requires any active
// permission — view_only is sufficient. Download endpoint remains restricted.
const previewSharedAttachment = asyncHandler(async (req, res) => {
  const filter     = activePermFilter(req.user._id);
  const patientIds = await Permission.distinct("patient", filter);

  const record = await MedicalRecord.findById(req.params.id).lean();
  if (!record) return res.status(404).json({ success: false, message: "Record not found." });

  const hasAccess = patientIds.some((id) => String(id) === String(record.patient));
  if (!hasAccess) return res.status(403).json({ success: false, message: "Access denied." });

  const att = record.attachments?.find((a) => a.cid === req.params.filename);
  if (!att) return res.status(404).json({ success: false, message: "Attachment not found." });

  if (att.cid.startsWith("mock-ipfs-")) {
    return res.status(410).json({ success: false, message: "File not available for preview." });
  }

  const filePath = path.resolve(UPLOADS_DIR, path.basename(att.cid));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found on server." });
  }

  const ext = path.extname(att.fileName || att.cid).toLowerCase();
  const MIME = { ".pdf": "application/pdf", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
  const contentType = MIME[ext] || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename="${att.fileName}"`);
  res.sendFile(filePath);
});

// ─── POST /api/doctor/shared-records/:id/view ────────────────────────────────
const viewSharedRecord = asyncHandler(async (req, res) => {
  const filter     = activePermFilter(req.user._id);
  const patientIds = await Permission.distinct("patient", filter);

  const record = await MedicalRecord.findById(req.params.id).lean();
  if (!record) return res.status(404).json({ success: false, message: "Record not found." });

  const hasAccess = patientIds.some((id) => String(id) === String(record.patient));
  if (!hasAccess) return res.status(403).json({ success: false, message: "Access denied." });

  const patientDoc  = await Patient.findById(record.patient).select("user name").lean();
  const patientName = patientDoc?.name;
  if (patientName) {
    await writeAudit({
      user:           req.user._id,
      action:         "RECORD_VIEW",
      ipAddress:      req.ip,
      record:         record._id,
      actorName:      drName(req.user.fullName),
      recordTitle:    record.title || record.diagnosis,
      targetUserId:   patientDoc.user,
      targetUserName: patientName,
    });
  }

  res.json({ success: true });
});

// ─── GET /api/doctor/profile ──────────────────────────────────────────────────
const getDoctorProfile = asyncHandler(async (req, res) => {
  const [user, doctor] = await Promise.all([
    User.findById(req.user._id).select("+profilePhoto").lean(),
    Doctor.findOne({ user: req.user._id }).lean(),
  ]);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  res.json({
    success: true,
    data: {
      user: {
        id:            user._id,
        fullName:      user.fullName,
        email:         user.email,
        mobileNumber:  user.mobileNumber,
        role:          user.role,
        walletAddress: user.walletAddress,
        isActive:      user.isActive,
        createdAt:     user.createdAt,
        profilePhoto:  user.profilePhoto || null,
      },
      doctor: doctor
        ? {
            _id:                doctor._id,
            doctorId:           doctor.doctorId,
            name:               doctor.name,
            specialization:     doctor.specialization,
            hospital:           doctor.hospital,
            licenseNumber:      doctor.licenseNumber,
            verificationStatus:         doctor.verificationStatus          || "pending",
            verificationReason:         doctor.verificationReason          || null,
            rejectionType:              doctor.rejectionType               || null,
            rejectionReason:            doctor.rejectionReason             || null,
            reVerificationRequested:    doctor.reVerificationRequested     || false,
            lastReverificationDeclined: doctor.lastReverificationDeclined  || false,
          }
        : null,
    },
  });
});

// ─── PUT /api/doctor/profile ──────────────────────────────────────────────────
const updateDoctorProfile = asyncHandler(async (req, res) => {
  const { fullName, email, mobileNumber, specialization, hospital } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  // email uniqueness check
  if (email !== undefined && email.trim()) {
    const normalized = email.toLowerCase().trim();
    if (normalized !== user.email) {
      const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
      if (taken) return res.status(400).json({ success: false, message: "Email is already in use by another account." });
      user.email = normalized;
    }
  }
  if (fullName     !== undefined && fullName.trim())     user.fullName     = fullName.trim();
  if (mobileNumber !== undefined && mobileNumber.trim()) user.mobileNumber = mobileNumber.trim();
  await user.save();

  const doctor = await Doctor.findOne({ user: req.user._id });
  if (doctor) {
    if (fullName       !== undefined && fullName.trim())       doctor.name           = fullName.trim();
    if (specialization !== undefined && specialization.trim()) doctor.specialization = specialization.trim();
    if (hospital       !== undefined)                          doctor.hospital       = hospital?.trim() || doctor.hospital;
    await doctor.save();
  }

  writeAudit({
    user:        req.user._id,
    action:      "PROFILE_UPDATE",
    ipAddress:   req.ip,
    actorName:   drName(user.fullName),
    description: `${drName(user.fullName)} updated their profile information`,
    metadata:    { role: req.user.role },
  });

  res.json({
    success: true,
    message: "Profile updated successfully.",
    data: { fullName: user.fullName, email: user.email, mobileNumber: user.mobileNumber },
  });
});

// ─── GET /api/doctor/notes ────────────────────────────────────────────────────
const getDoctorNotes = asyncHandler(async (req, res) => {
  const notes = await DoctorNote.find({ doctor: req.user._id })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: notes });
});

// ─── POST /api/doctor/notes ───────────────────────────────────────────────────
const createDoctorNote = asyncHandler(async (req, res) => {
  const {
    patientName, patientId, patientRef,
    diagnosis, symptoms, prescription, recommendedTests, advice, followUpDate,
  } = req.body;
  const note = await DoctorNote.create({
    doctor:           req.user._id,
    patientName:      patientName || "Unknown Patient",
    patientId:        patientId   || "",
    patientRef:       patientRef  || undefined,
    diagnosis:        diagnosis        || "",
    symptoms:         symptoms         || "",
    prescription:     prescription     || "",
    recommendedTests: recommendedTests || "",
    advice:           advice           || "",
    followUpDate:     followUpDate     || null,
  });

  // Resolve patient User ID for cross-user activity feed
  let notePatientUserId = null;
  if (note.patientRef) {
    const pt = await Patient.findById(note.patientRef).select("user").lean();
    notePatientUserId = pt?.user;
  } else if (note.patientId) {
    const pt = await Patient.findOne({ patientId: note.patientId }).select("user").lean();
    notePatientUserId = pt?.user;
  }
  await writeAudit({
    user:           req.user._id,
    action:         "NOTE_CREATED",
    actorName:      drName(req.user.fullName),
    targetUserId:   notePatientUserId,
    targetUserName: note.patientName,
    recordTitle:    note.diagnosis || "Doctor Note",
    description:    `${drName(req.user.fullName)} created a note for ${note.patientName || "patient"}`,
    metadata:       { noteId: String(note._id) },
  });

  res.status(201).json({ success: true, data: note });
});

// ─── PUT /api/doctor/notes/:id ────────────────────────────────────────────────
const updateDoctorNote = asyncHandler(async (req, res) => {
  const note = await DoctorNote.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });

  const { diagnosis, symptoms, prescription, recommendedTests, advice, followUpDate } = req.body;
  if (diagnosis        !== undefined) note.diagnosis        = diagnosis;
  if (symptoms         !== undefined) note.symptoms         = symptoms;
  if (prescription     !== undefined) note.prescription     = prescription;
  if (recommendedTests !== undefined) note.recommendedTests = recommendedTests;
  if (advice           !== undefined) note.advice           = advice;
  if (followUpDate     !== undefined) note.followUpDate     = followUpDate || null;
  await note.save();

  // Resolve patient User ID for cross-user activity feed
  let updNotePatientUserId = null;
  if (note.patientRef) {
    const pt = await Patient.findById(note.patientRef).select("user").lean();
    updNotePatientUserId = pt?.user;
  } else if (note.patientId) {
    const pt = await Patient.findOne({ patientId: note.patientId }).select("user").lean();
    updNotePatientUserId = pt?.user;
  }
  await writeAudit({
    user:           req.user._id,
    action:         "NOTE_UPDATED",
    actorName:      drName(req.user.fullName),
    targetUserId:   updNotePatientUserId,
    targetUserName: note.patientName,
    recordTitle:    note.diagnosis || "Doctor Note",
    description:    `${drName(req.user.fullName)} updated a note for ${note.patientName || "patient"}`,
    metadata:       { noteId: String(note._id) },
  });

  res.json({ success: true, data: note });
});

// ─── DELETE /api/doctor/notes/:id ─────────────────────────────────────────────
const deleteDoctorNote = asyncHandler(async (req, res) => {
  const note = await DoctorNote.findOne({ _id: req.params.id, doctor: req.user._id });
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });

  // Resolve patient User ID before deleting (same pattern as NOTE_CREATED / NOTE_UPDATED)
  let delNotePatientUserId = null;
  if (note.patientRef) {
    const pt = await Patient.findById(note.patientRef).select("user").lean();
    delNotePatientUserId = pt?.user;
  } else if (note.patientId) {
    const pt = await Patient.findOne({ patientId: note.patientId }).select("user").lean();
    delNotePatientUserId = pt?.user;
  }

  await note.deleteOne();

  await writeAudit({
    user:           req.user._id,
    action:         "NOTE_DELETED",
    actorName:      drName(req.user.fullName),
    targetUserId:   delNotePatientUserId,
    targetUserName: note.patientName,
    description:    `${drName(req.user.fullName)} deleted a note for ${note.patientName || "patient"}`,
    metadata:       { noteId: String(note._id) },
  });

  res.json({ success: true, message: "Note deleted." });
});

// ─── PUT /api/doctor/password ────────────────────────────────────────────────
// Verifies the current password then replaces it. Pre-save hook handles hashing.
const changeDoctorPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  const match = await user.comparePassword(currentPassword);
  if (!match) {
    return res.status(400).json({ success: false, message: "Current password is incorrect." });
  }

  user.password = newPassword;
  await user.save();

  writeAudit({
    user:        req.user._id,
    action:      "PROFILE_UPDATE",
    ipAddress:   req.ip,
    actorName:   drName(user.fullName),
    description: "Doctor changed account password.",
    metadata:    { role: req.user.role },
  });

  res.json({ success: true, message: "Password updated successfully." });
});

// ─── POST /api/doctor/request-reverification ─────────────────────────────────
const requestReverification = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findOne({ user: req.user._id });
  if (!doctor) return res.status(404).json({ success: false, message: "Doctor record not found." });
  if (doctor.verificationStatus !== "rejected") {
    return res.status(400).json({ success: false, message: "Only accounts with revoked verification can request re-verification." });
  }
  if (doctor.reVerificationRequested) {
    return res.status(400).json({ success: false, message: "A re-verification request has already been submitted." });
  }
  const effectiveType = doctor.rejectionType || (doctor.verificationReason ? "revoked" : "initial");
  doctor.reVerificationRequested    = true;
  doctor.lastReverificationDeclined = false;
  await doctor.save();
  writeAudit({
    user:      req.user._id,
    action:    effectiveType === "initial" ? "INITIAL_VERIFICATION_REQUESTED" : "REVERIFICATION_REQUESTED",
    ipAddress: req.ip,
    actorName: drName(doctor.name),
  });
  res.json({ success: true, message: "Re-verification request submitted successfully." });
});

module.exports = {
  getDoctorDashboard,
  getDoctorPatients,
  getDoctorSharedRecords,
  downloadSharedAttachment,
  previewSharedAttachment,
  viewSharedRecord,
  getDoctorProfile,
  updateDoctorProfile,
  getDoctorNotes,
  createDoctorNote,
  updateDoctorNote,
  deleteDoctorNote,
  changeDoctorPassword,
  requestReverification,
};
