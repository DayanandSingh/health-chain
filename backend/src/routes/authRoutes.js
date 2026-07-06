const express = require("express");
const { body } = require("express-validator");
const { register, login, me, logout, updateProfilePhoto, updateMyAdminProfile, changeAdminPassword } = require("../controllers/authController");
const validate = require("../middleware/validate");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/register",
  [
    body("fullName").trim().isLength({ min: 2 }).withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("mobileNumber").trim().isLength({ min: 8 }).withMessage("Mobile number is required"),
    body("role").isIn(["patient", "doctor"]).withMessage("Role must be patient or doctor"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
  ],
  validate,
  register
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  validate,
  login
);

router.get("/me", protect, me);
router.post("/logout", protect, logout);
router.put("/me/photo", protect, updateProfilePhoto);
router.put(
  "/my-admin-profile",
  protect,
  authorize("admin", "system_admin", "hospital_admin"),
  [
    body("fullName").optional().trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("mobileNumber").optional().trim().isLength({ min: 10 }).withMessage("Mobile number must be at least 10 digits"),
  ],
  validate,
  updateMyAdminProfile
);
router.put(
  "/my-admin-password",
  protect,
  authorize("admin", "system_admin", "hospital_admin"),
  [
    body("currentPassword").notEmpty().withMessage("Current password is required."),
    body("newPassword").isLength({ min: 8 }).withMessage("Password must contain at least 8 characters."),
  ],
  validate,
  changeAdminPassword
);

module.exports = router;

