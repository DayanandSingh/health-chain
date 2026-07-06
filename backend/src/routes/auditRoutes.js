const express = require("express");
const { listAuditLogs } = require("../controllers/auditController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/audit-log", protect, listAuditLogs);

module.exports = router;

