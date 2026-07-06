const path = require("path");
const fs = require("fs");
const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const asyncHandler = require("../utils/asyncHandler");
const { uploadBuffer, buildRecordHash } = require("../services/ipfsService");
const { storeRecordHash } = require("../services/blockchainService");
const { writeAudit } = require("../services/auditService");

const UPLOADS_DIR = path.join(__dirname, "../../uploads");

// ─── Allowed MIME types for patient uploads ────────────────────────────────
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB (enforced by multer, double-checked here)

// ─── GET /api/my-records ─────────────────────────────────────────────────────
// Returns all medical records belonging to the authenticated patient.
// Only the patient who owns the records can call this.
const listMyRecords = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) {
    // New patient account — no records yet, return empty list
    return res.status(200).json({ success: true, data: [] });
  }

  const records = await MedicalRecord.find({ patient: patient._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: records });
});

// ─── POST /api/my-records ────────────────────────────────────────────────────
// Patients upload their own medical record.
// The frontend sends multipart/form-data with optional file attachments.
const createMyRecord = asyncHandler(async (req, res) => {
  // ── 1. Find patient profile ──────────────────────────────────────────────
  const patient = await Patient.findOne({ user: req.user._id });
  if (!patient) {
    return res
      .status(400)
      .json({ success: false, message: "Patient profile not found." });
  }

  // ── 2. Validate required body fields ────────────────────────────────────
  const { title, recordType, hospitalName, doctorName, visitDate, description } =
    req.body;

  if (!title || !title.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Record title is required." });
  }
  if (!recordType) {
    return res
      .status(400)
      .json({ success: false, message: "Record type is required." });
  }

  // ── 3. Validate & process uploaded files ────────────────────────────────
  const attachments = [];
  for (const file of req.files || []) {
    // MIME check
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only PDF, JPG and PNG files are allowed.",
      });
    }
    // Size guard (multer already limits, but we confirm)
    if (file.size > MAX_FILE_BYTES) {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 10 MB limit.",
      });
    }

    const uploaded = await uploadBuffer({
      buffer: file.buffer,
      fileName: file.originalname,
    });
    attachments.push({
      fileName: file.originalname,
      mimeType: file.mimetype,
      cid: uploaded.cid,
      hash: uploaded.hash,
      size: file.size,
    });
  }

  // ── 4. Build payload & record hash ────────────────────────────────────────
  // `diagnosis` is required by the existing schema — we use title as its value
  // so both old and new code remain compatible.
  const payload = {
    patient: patient._id,
    diagnosis: title.trim(),       // backward-compat required field
    prescription: description || "",
    attachments,
  };
  const recordHash = buildRecordHash(payload);

  // ── 5. Persist to DB ─────────────────────────────────────────────────────
  const record = await MedicalRecord.create({
    ...payload,
    title: title.trim(),
    recordType,
    hospitalName: hospitalName?.trim() || "",
    doctorName: doctorName?.trim() || "",
    visitDate: visitDate ? new Date(visitDate) : undefined,
    recordHash,
  });

  // ── 6. Anchor hash on-chain (mock or live) ───────────────────────────────
  const chain = await storeRecordHash({
    recordId: record._id,
    recordHash,
    owner: req.user.walletAddress,
  });
  record.blockchainTxId = chain.txId;
  await record.save();

  // ── 7. Audit log ─────────────────────────────────────────────────────────
  const uploadTitle = record.title || record.diagnosis || "Medical record";
  await writeAudit({
    user:          req.user._id,
    action:        "RECORD_UPLOAD",
    ipAddress:     req.ip,
    record:        record._id,
    blockchainTxId: chain.txId,
    actorName:     req.user.fullName,
    recordTitle:   uploadTitle,
    metadata:      { fileName: attachments[0]?.fileName || null },
  });

  return res.status(201).json({ success: true, data: record });
});

// ─── DELETE /api/my-records/:id ──────────────────────────────────────────────
// Patients may delete only their own records.
const deleteMyRecord = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) {
    return res
      .status(403)
      .json({ success: false, message: "Access denied." });
  }

  const record = await MedicalRecord.findById(req.params.id);
  if (!record) {
    return res
      .status(404)
      .json({ success: false, message: "Record not found." });
  }

  // Ownership check — patient can only delete their own record
  if (String(record.patient) !== String(patient._id)) {
    return res
      .status(403)
      .json({ success: false, message: "Access denied." });
  }

  await record.deleteOne();

  const deleteTitle = record.title || record.diagnosis || "Medical record";
  await writeAudit({
    user:        req.user._id,
    action:      "RECORD_DELETE",
    ipAddress:   req.ip,
    record:      record._id,
    actorName:   req.user.fullName,
    recordTitle: deleteTitle,
    description: `${req.user.fullName} deleted ${deleteTitle}`,
  });

  return res.status(200).json({ success: true, message: "Record deleted." });
});

// ─── GET /api/my-records/:id/download/:filename ──────────────────────────────
// Streams the stored file back to the patient who owns the record.
const downloadMyAttachment = asyncHandler(async (req, res) => {
  const patient = await Patient.findOne({ user: req.user._id }).lean();
  if (!patient) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  const record = await MedicalRecord.findById(req.params.id).lean();
  if (!record || String(record.patient) !== String(patient._id)) {
    return res.status(404).json({ success: false, message: "Record not found." });
  }

  // Match by cid (which is the disk filename in mock mode)
  const att = record.attachments?.find((a) => a.cid === req.params.filename);
  if (!att) {
    return res.status(404).json({ success: false, message: "Attachment not found." });
  }

  // Records uploaded before disk storage was enabled stored a mock hash as the cid,
  // not a real filename. The original bytes were never persisted.
  if (att.cid.startsWith("mock-ipfs-")) {
    return res.status(410).json({
      success: false,
      message:
        "This file was uploaded before download storage was enabled and cannot be retrieved. " +
        "Please delete this record and re-upload the file.",
    });
  }

  // path.resolve + path.basename prevents path-traversal attacks
  const filePath = path.resolve(UPLOADS_DIR, path.basename(att.cid));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: "File not found on server." });
  }

  await writeAudit({
    user:        req.user._id,
    action:      "RECORD_DOWNLOAD",
    ipAddress:   req.ip,
    record:      record._id,
    actorName:   req.user.fullName,
    recordTitle: record.title || record.diagnosis || att.fileName,
    description: `${req.user.fullName} downloaded ${record.title || record.diagnosis || att.fileName}`,
    metadata:    { fileName: att.fileName },
  });

  res.download(filePath, att.fileName);
});

module.exports = { listMyRecords, createMyRecord, deleteMyRecord, downloadMyAttachment };
