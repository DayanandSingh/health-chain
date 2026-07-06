const Patient = require("../models/Patient");
const User = require("../models/User");
const Doctor = require("../models/Doctor");
const DoctorNote = require("../models/DoctorNote");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");

const STAFF_ROLES = ["doctor", "hospital_admin", "laboratory", "pharmacist", "system_admin"];

function canViewPatient(user, patient) {
  if (STAFF_ROLES.includes(user.role)) return true;
  if (user.role === "patient") {
    const ownerId = patient.user?._id || patient.user;
    return String(ownerId) === String(user._id);
  }
  return false;
}

function canUpdatePatient(user, patient) {
  if (["system_admin", "hospital_admin"].includes(user.role)) return true;
  if (user.role === "patient") {
    const ownerId = patient.user?._id || patient.user;
    return String(ownerId) === String(user._id);
  }
  return false;
}

const listPatients = asyncHandler(async (req, res) => {
  const patients = await Patient.find().populate("user", "email walletAddress role");
  res.json({ success: true, data: patients });
});

const getPatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate("user", "email walletAddress role");
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

  if (!canViewPatient(req.user, patient)) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  res.json({ success: true, data: patient });
});

const updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id).populate("user", "email walletAddress role");
  if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

  if (!canUpdatePatient(req.user, patient)) {
    return res.status(403).json({ success: false, message: "Update access denied" });
  }

  Object.assign(patient, req.body);
  await patient.save();

  res.json({ success: true, data: patient });
});

// ─── GET /api/my-patient-profile ────────────────────────────────────────────
// Returns the logged-in patient's User + Patient data in a single response.
const getMyPatientProfile = asyncHandler(async (req, res) => {
  const [user, patient] = await Promise.all([
    User.findById(req.user._id).select("+profilePhoto").lean(),
    Patient.findOne({ user: req.user._id }).lean(),
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
      patient: patient
        ? {
            _id:        patient._id,
            patientId:  patient.patientId,
            name:       patient.name,
            dob:        patient.dob,
            gender:     patient.gender,
            bloodGroup: patient.bloodGroup,
            address:    patient.address,
          }
        : null,
    },
  });
});

// ─── PUT /api/my-patient-profile ────────────────────────────────────────────
// Updates User fields (fullName, email, mobileNumber) and Patient fields
// (name, dob, gender, bloodGroup, address) for the logged-in patient.
const updateMyPatientProfile = asyncHandler(async (req, res) => {
  const { fullName, email, mobileNumber, dob, gender, bloodGroup, address } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  // Email uniqueness check if email is being changed
  if (email !== undefined && email.trim()) {
    const normalized = email.toLowerCase().trim();
    if (normalized !== user.email) {
      const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ success: false, message: "Email is already in use by another account." });
      }
      user.email = normalized;
    }
  }
  if (fullName !== undefined && fullName.trim()) user.fullName = fullName.trim();
  if (mobileNumber !== undefined && mobileNumber.trim()) user.mobileNumber = mobileNumber.trim();
  await user.save();

  // Sync to Patient model
  const patient = await Patient.findOne({ user: req.user._id });
  if (patient) {
    if (fullName !== undefined && fullName.trim()) patient.name = fullName.trim();
    if (dob !== undefined) patient.dob = dob ? new Date(dob) : null;
    if (gender !== undefined) patient.gender = gender || undefined;
    if (bloodGroup !== undefined) patient.bloodGroup = bloodGroup;
    if (address !== undefined) patient.address = address;
    await patient.save();
  }

  writeAudit({
    user:        req.user._id,
    action:      "PROFILE_UPDATE",
    ipAddress:   req.ip,
    actorName:   user.fullName,
    description: `${user.fullName} updated their profile information`,
    metadata:    { role: req.user.role },
  });

  res.json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      fullName:     user.fullName,
      email:        user.email,
      mobileNumber: user.mobileNumber,
    },
  });
});

// ─── GET /api/my-notes ──────────────────────────────────────────────────────
// Returns all doctor notes written for the logged-in patient.
// Matches by patientId string (used by current doctor UI) and by patientRef ObjectId
// (forward-compatible if doctor form is ever updated to send it).
const getMyNotes = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) return res.json({ success: true, data: [] });

  // Build OR conditions: patientId string match + patientRef ObjectId match
  const conditions = [];
  if (patient.patientId) conditions.push({ patientId: patient.patientId });
  if (patient._id)       conditions.push({ patientRef: patient._id });
  if (!conditions.length) return res.json({ success: true, data: [] });

  const notes = await DoctorNote.find({ $or: conditions })
    .populate({ path: "doctor", select: "fullName email +profilePhoto" })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch doctor profiles (specialization, hospital, licenseNumber) for all unique doctors
  const doctorUserIds = [...new Set(notes.map((n) => n.doctor?._id?.toString()).filter(Boolean))];
  const doctorProfileMap = {};
  if (doctorUserIds.length) {
    const profiles = await Doctor.find({ user: { $in: doctorUserIds } })
      .select("user specialization hospital licenseNumber doctorId")
      .lean();
    for (const p of profiles) doctorProfileMap[p.user.toString()] = p;
  }

  const data = notes.map((note) => {
    const uid = note.doctor?._id?.toString();
    const dp  = doctorProfileMap[uid] || {};
    return {
      _id:              note._id,
      diagnosis:        note.diagnosis        || "",
      symptoms:         note.symptoms         || "",
      prescription:     note.prescription     || "",
      recommendedTests: note.recommendedTests || "",
      advice:           note.advice           || "",
      status:        note.status         || "reviewed",
      followUpDate:  note.followUpDate   || null,
      blockchainTxId: note.blockchainTxId || null,
      patientName:   note.patientName    || "",
      createdAt:     note.createdAt,
      updatedAt:     note.updatedAt,
      doctor: note.doctor ? {
        id:             note.doctor._id,
        fullName:       note.doctor.fullName,
        email:          note.doctor.email,
        profilePhoto:   note.doctor.profilePhoto   || null,
        specialization: dp.specialization          || "General Medicine",
        hospital:       dp.hospital                || "",
        doctorId:       dp.doctorId                || "",
        licenseNumber:  dp.licenseNumber           || "",
      } : null,
    };
  });

  res.json({ success: true, data });
});

// ─── PUT /api/my-patient-password ───────────────────────────────────────────
// Verifies the current password then replaces it. Pre-save hook handles hashing.
const changePatientPassword = asyncHandler(async (req, res) => {
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
    actorName:   user.fullName,
    description: "Patient changed account password.",
    metadata:    { role: req.user.role },
  });

  res.json({ success: true, message: "Password updated successfully." });
});

module.exports = { listPatients, getPatient, updatePatient, getMyPatientProfile, updateMyPatientProfile, getMyNotes, changePatientPassword };
