const express = require("express");
const { stats, listUsers, dashboard, getAdminPatients, getAdminDoctors, getAdminDoctorNotes, getAdminMedicalRecords, downloadAdminAttachment, verifyDoctor, rejectDoctor, rejectReverification } = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

const ADMIN_ROLES = ["system_admin", "hospital_admin", "admin"];

const router = express.Router();

router.get("/admin/statistics",       protect, authorize(...ADMIN_ROLES), stats);
router.get("/admin/users",            protect, authorize(...ADMIN_ROLES), listUsers);
router.get("/admin/dashboard",        protect, authorize(...ADMIN_ROLES), dashboard);
router.get("/admin/patients",         protect, authorize(...ADMIN_ROLES), getAdminPatients);
router.get("/admin/doctors",          protect, authorize(...ADMIN_ROLES), getAdminDoctors);
router.get("/admin/doctor-notes",                             protect, authorize(...ADMIN_ROLES), getAdminDoctorNotes);
router.get("/admin/medical-records",                          protect, authorize(...ADMIN_ROLES), getAdminMedicalRecords);
router.get("/admin/medical-records/:id/download/:cid",        protect, authorize(...ADMIN_ROLES), downloadAdminAttachment);
router.patch("/admin/doctors/:id/verify",                     protect, authorize(...ADMIN_ROLES), verifyDoctor);
router.patch("/admin/doctors/:id/reject",                     protect, authorize(...ADMIN_ROLES), rejectDoctor);
router.patch("/admin/doctors/:id/reject-reverification",      protect, authorize(...ADMIN_ROLES), rejectReverification);

module.exports = router;
