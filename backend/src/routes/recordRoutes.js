const express = require("express");
const multer = require("multer");
const { body } = require("express-validator");
const { createRecord, getRecord, updateRecord, verifyRecord } = require("../controllers/recordController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post(
  "/record",
  protect,
  authorize("doctor", "hospital_admin", "laboratory", "system_admin"),
  upload.array("reports", 8),
  [body("patient").isMongoId(), body("diagnosis").trim().notEmpty()],
  validate,
  createRecord
);
router.get("/record/:id", protect, getRecord);
router.put("/record/:id", protect, [body("diagnosis").optional().trim().notEmpty()], validate, updateRecord);
router.get("/record/:id/verify", protect, verifyRecord);

module.exports = router;

