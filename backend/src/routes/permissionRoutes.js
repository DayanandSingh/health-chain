const express = require("express");
const { body } = require("express-validator");
const {
  grantAccess,
  revokeAccess,
  listPermissions,
  searchDoctors,
  listMyPermissions,
  grantMyAccess,
  revokeMyAccess,
} = require("../controllers/permissionController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();

// ── Existing admin/system routes (unchanged) ────────────────────────────────
router.get("/permissions", protect, listPermissions);
router.post(
  "/grant-access",
  protect,
  authorize("patient", "system_admin"),
  [
    body("patient").isMongoId(),
    body("grantee").isMongoId(),
    body("record").optional().isMongoId(),
    body("permissionTypes").isArray({ min: 1 }),
    body("permissionTypes.*").isIn(["read", "write", "update", "revoke"]),
  ],
  validate,
  grantAccess,
);
router.post(
  "/revoke-access",
  protect,
  authorize("patient", "system_admin"),
  [body("permission").isMongoId()],
  validate,
  revokeAccess,
);

// ── Doctor search (any authenticated user can search) ────────────────────────
router.get("/doctors/search", protect, searchDoctors);

// ── Patient-facing permission management ─────────────────────────────────────
router.get("/my-permissions", protect, authorize("patient"), listMyPermissions);

router.post(
  "/my-permissions/grant",
  protect,
  authorize("patient"),
  [
    body("doctorUserId").isMongoId().withMessage("Valid doctor ID is required"),
    body("accessLevel")
      .isIn(["view_only", "view_download"])
      .withMessage("Access level must be view_only or view_download"),
    body("expiresAt").isISO8601().withMessage("Valid expiry date is required"),
  ],
  validate,
  grantMyAccess,
);

router.post("/my-permissions/:id/revoke", protect, authorize("patient"), revokeMyAccess);

module.exports = router;
