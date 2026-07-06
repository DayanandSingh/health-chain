const express = require("express");
const { body }           = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const validate           = require("../middleware/validate");
const {
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
} = require("../controllers/doctorController");

const Doctor = require("../models/Doctor");

const router = express.Router();

// All doctor routes require authentication + doctor role
router.use(protect, authorize("doctor"));

// Middleware: blocks patient-related features for unverified doctors
async function requireVerified(req, res, next) {
  const doctor = await Doctor.findOne({ user: req.user._id }).select("verificationStatus").lean();
  if (!doctor || doctor.verificationStatus !== "verified") {
    return res.status(403).json({ success: false, message: "Your account must be verified to access this feature." });
  }
  next();
}

// Dashboard
router.get("/doctor/dashboard", getDoctorDashboard);

// Patients
router.get("/doctor/patients", requireVerified, getDoctorPatients);

// Shared records
router.get("/doctor/shared-records", requireVerified, getDoctorSharedRecords);
router.get("/doctor/shared-records/:id/download/:filename", requireVerified, downloadSharedAttachment);
router.get("/doctor/shared-records/:id/preview/:filename", requireVerified, previewSharedAttachment);
router.post("/doctor/shared-records/:id/view", requireVerified, viewSharedRecord);

// Profile
router.get("/doctor/profile", getDoctorProfile);
router.post("/doctor/request-reverification", requestReverification);
router.put(
  "/doctor/profile",
  [
    body("fullName").optional().trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("mobileNumber").optional().trim(),
    body("specialization").optional().trim(),
    body("hospital").optional().trim(),
  ],
  validate,
  updateDoctorProfile,
);

// Notes (personal doctor notes per patient)
router.get("/doctor/notes", requireVerified, getDoctorNotes);
router.post(
  "/doctor/notes",
  requireVerified,
  [
    body("patientName").trim().isLength({ min: 1 }).withMessage("Patient name is required"),
    body("diagnosis").trim().isLength({ min: 1 }).withMessage("Diagnosis is required"),
    body("symptoms").optional().trim(),
    body("prescription").trim().isLength({ min: 1 }).withMessage("Prescription / Medicines is required"),
    body("recommendedTests").optional().trim(),
    body("advice").optional().trim(),
    body("followUpDate").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("Invalid follow-up date"),
  ],
  validate,
  createDoctorNote,
);
router.put("/doctor/notes/:id", requireVerified, updateDoctorNote);
router.delete("/doctor/notes/:id", requireVerified, deleteDoctorNote);

router.put(
  "/doctor/password",
  [
    body("currentPassword").notEmpty().withMessage("Current password is required."),
    body("newPassword").isLength({ min: 8 }).withMessage("Password must contain at least 8 characters."),
  ],
  validate,
  changeDoctorPassword
);

module.exports = router;
