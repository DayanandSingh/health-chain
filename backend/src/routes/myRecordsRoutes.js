const express = require("express");
const multer = require("multer");
const { protect, authorize } = require("../middleware/auth");
const {
  listMyRecords,
  createMyRecord,
  deleteMyRecord,
  downloadMyAttachment,
} = require("../controllers/myRecordsController");

const router = express.Router();

// All routes require authentication + patient role
router.use(protect, authorize("patient"));

// multer — memory storage, 10 MB limit, max 5 files per upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// GET  /api/my-records         → list all records for the authenticated patient
// POST /api/my-records         → patient uploads a new record
// DELETE /api/my-records/:id   → patient deletes their own record
router.get("/", listMyRecords);
router.post("/", upload.array("reports", 5), createMyRecord);
router.get("/:id/download/:filename", downloadMyAttachment);
router.delete("/:id", deleteMyRecord);

module.exports = router;
