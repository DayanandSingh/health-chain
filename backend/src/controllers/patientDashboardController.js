const Patient = require("../models/Patient");
const MedicalRecord = require("../models/MedicalRecord");
const Permission = require("../models/Permission");
const AuditLog = require("../models/AuditLog");
const DoctorNote = require("../models/DoctorNote");
const asyncHandler = require("../utils/asyncHandler");

/**
 * GET /api/patient-dashboard
 * Returns real statistics and recent activity for the logged-in patient.
 *
 * Activity now includes BOTH the patient's own actions AND actions other
 * users (doctors) performed that targeted this patient — e.g. a doctor
 * downloading a record appears in the patient's feed.
 */
const patientDashboard = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();

  if (!patient) {
    return res.status(200).json({
      success: true,
      data: {
        patientId: null,
        totalRecords: 0,
        sharedDoctors: 0,
        activePermissions: 0,
        medicalNotes: 0,
        recentActivity: [],
      },
    });
  }

  // Notes are linked to a patient via patientRef (ObjectId) OR patientId (string).
  // Mirror the same $or used by getMyNotes so the count is always consistent.
  const noteConditions = [];
  if (patient.patientId) noteConditions.push({ patientId: patient.patientId });
  if (patient._id)       noteConditions.push({ patientRef: patient._id });

  const [totalRecords, activePermissions, medicalNotes, recentLogs] =
    await Promise.all([
      MedicalRecord.countDocuments({ patient: patient._id }),

      Permission.countDocuments({
        patient: patient._id,
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
      }),

      // Count all notes ever written for this patient (created only; edits don't add a row).
      noteConditions.length > 0
        ? DoctorNote.countDocuments({ $or: noteConditions })
        : Promise.resolve(0),

      // Only the 7 meaningful clinical/permission action types appear in the patient
      // activity feed. Noisy events (LOGIN, RECORD_DELETE, VERIFY_RECORD, etc.) are
      // excluded by the whitelist. The two arms match: own actions (upload, download,
      // grant, revoke) and cross-user actions targeting this patient (notes, doctor
      // downloads, doctor views).
      AuditLog.find({
        action: { $in: ["RECORD_UPLOAD", "RECORD_DOWNLOAD", "RECORD_VIEW",
                         "NOTE_CREATED", "NOTE_UPDATED",
                         "ACCESS_GRANT",  "ACCESS_REVOKE"] },
        $or: [
          { user: req.user._id },
          { targetUserId: req.user._id },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

  const uniqueDoctorIds = await Permission.distinct("grantee", {
    patient: patient._id,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  });

  const recentActivity = recentLogs.map((log) => ({
    action:         log.action,
    actorUserId:    String(log.user),
    actorName:      log.actorName      || null,
    targetUserName: log.targetUserName || null,
    recordTitle:    log.recordTitle    || null,
    description:    log.description    || null,
    metadata:       log.metadata       || null,
    timestamp:      log.createdAt,
  }));

  return res.status(200).json({
    success: true,
    data: {
      patientId: patient.patientId,
      totalRecords,
      sharedDoctors: uniqueDoctorIds.length,
      activePermissions,
      medicalNotes,
      recentActivity,
    },
  });
});

module.exports = { patientDashboard };
