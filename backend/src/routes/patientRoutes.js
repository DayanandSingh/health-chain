const express = require("express");
const { body } = require("express-validator");
const {
  listPatients,
  getPatient,
  updatePatient,
  getMyPatientProfile,
  updateMyPatientProfile,
  getMyNotes,
  changePatientPassword,
} = require("../controllers/patientController");
const { patientDashboard } = require("../controllers/patientDashboardController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

router.get("/patients", protect, authorize("doctor", "hospital_admin", "laboratory", "pharmacist", "system_admin"), listPatients);
router.get("/patient/:id", protect, getPatient);
router.put(
  "/patient/:id",
  protect,
  [
    body("gender").optional().isIn(["male", "female", "other", "prefer_not_to_say"]),
    body("bloodGroup").optional().trim(),
    body("address").optional().trim()
  ],
  validate,
  updatePatient
);

// Patient dashboard — real statistics and activity for the logged-in patient
router.get("/patient-dashboard", protect, authorize("patient"), patientDashboard);

// Patient: read doctor notes written for them
router.get("/my-notes", protect, authorize("patient"), getMyNotes);

// Patient self-service profile (read + update own User + Patient data)
router.get("/my-patient-profile", protect, authorize("patient"), getMyPatientProfile);
router.put(
  "/my-patient-profile",
  protect,
  authorize("patient"),
  [
    body("fullName").optional().trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("mobileNumber").optional().trim().isLength({ min: 10 }).withMessage("Mobile number must be at least 10 digits"),
    body("dob").optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage("Invalid date of birth"),
    body("gender").optional({ nullable: true, checkFalsy: true }).isIn(["male", "female", "other", "prefer_not_to_say"]).withMessage("Invalid gender"),
    body("bloodGroup").optional().trim(),
    body("address").optional().trim().isLength({ max: 250 }).withMessage("Address cannot exceed 250 characters"),
  ],
  validate,
  updateMyPatientProfile,
);

router.put(
  "/my-patient-password",
  protect,
  authorize("patient"),
  [
    body("currentPassword").notEmpty().withMessage("Current password is required."),
    body("newPassword").isLength({ min: 8 }).withMessage("Password must contain at least 8 characters."),
  ],
  validate,
  changePatientPassword
);

module.exports = router;
