const MedicalRecord = require("../models/MedicalRecord");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const Permission = require("../models/Permission");
const asyncHandler = require("../utils/asyncHandler");
const { uploadBuffer, buildRecordHash } = require("../services/ipfsService");
const { storeRecordHash, updateRecordHash, verifyRecordHash } = require("../services/blockchainService");
const { writeAudit } = require("../services/auditService");
const { drName } = require("../utils/drName");

async function canAccessRecord(user, record, permission = "read") {
  if (["system_admin", "hospital_admin"].includes(user.role)) return true;
  if (user.role === "patient") {
    const patient = await Patient.findOne({ user: user._id });
    return patient && String(record.patient) === String(patient._id);
  }
  const grant = await Permission.findOne({
    patient: record.patient,
    grantee: user._id,
    isActive: true,
    permissionTypes: { $in: [permission] },
    $or: [{ record: record._id }, { record: null }],
  });
  return Boolean(grant);
}

const createRecord = asyncHandler(async (req, res) => {
  const attachments = [];

  for (const file of req.files || []) {
    const uploaded = await uploadBuffer({ buffer: file.buffer, fileName: file.originalname });
    attachments.push({
      fileName: file.originalname,
      mimeType: file.mimetype,
      cid: uploaded.cid,
      hash: uploaded.hash,
      size: file.size
    });
  }

  const doctor = req.user.role === "doctor" ? await Doctor.findOne({ user: req.user._id }) : null;
  const payload = {
    patient: req.body.patient,
    doctor: req.body.doctor || doctor?._id,
    hospital: req.body.hospital,
    diagnosis: req.body.diagnosis,
    prescription: req.body.prescription,
    attachments
  };
  const recordHash = buildRecordHash(payload);
  const record = await MedicalRecord.create({ ...payload, recordHash });
  const chain = await storeRecordHash({
    recordId: record._id,
    recordHash,
    owner: req.user.walletAddress
  });
  record.blockchainTxId = chain.txId;
  await record.save();

  const uploadActorName = req.user.role === "doctor" ? drName(req.user.fullName) : req.user.fullName;
  await writeAudit({
    user:           req.user._id,
    action:         "RECORD_UPLOAD",
    ipAddress:      req.ip,
    record:         record._id,
    blockchainTxId: chain.txId,
    actorName:      uploadActorName,
    recordTitle:    record.diagnosis || null,
  });

  res.status(201).json({ success: true, data: record });
});

const getRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id)
    .populate("patient")
    .populate("doctor")
    .populate("hospital");
  if (!record) return res.status(404).json({ success: false, message: "Record not found" });

  if (!(await canAccessRecord(req.user, record))) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const viewActorName = req.user.role === "doctor" ? drName(req.user.fullName) : req.user.fullName;
  await writeAudit({
    user:        req.user._id,
    action:      "RECORD_VIEW",
    ipAddress:   req.ip,
    record:      record._id,
    actorName:   viewActorName,
    recordTitle: record.title || record.diagnosis || null,
  });
  res.json({ success: true, data: record });
});

const updateRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "Record not found" });

  if (!(await canAccessRecord(req.user, record, "update"))) {
    return res.status(403).json({ success: false, message: "Update access denied" });
  }

  Object.assign(record, {
    diagnosis: req.body.diagnosis ?? record.diagnosis,
    prescription: req.body.prescription ?? record.prescription,
    status: req.body.status ?? record.status
  });

  record.recordHash = buildRecordHash({
    patient: record.patient,
    doctor: record.doctor,
    hospital: record.hospital,
    diagnosis: record.diagnosis,
    prescription: record.prescription,
    attachments: record.attachments
  });

  const chain = await updateRecordHash({
    recordId: record._id,
    recordHash: record.recordHash,
    owner: req.user.walletAddress
  });
  record.blockchainTxId = chain.txId;
  await record.save();

  const updateActorName = req.user.role === "doctor" ? drName(req.user.fullName) : req.user.fullName;
  await writeAudit({
    user:           req.user._id,
    action:         "RECORD_UPDATE",
    ipAddress:      req.ip,
    record:         record._id,
    blockchainTxId: chain.txId,
    actorName:      updateActorName,
    recordTitle:    record.title || record.diagnosis || null,
  });

  res.json({ success: true, data: record });
});

const verifyRecord = asyncHandler(async (req, res) => {
  const record = await MedicalRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: "Record not found" });

  if (!(await canAccessRecord(req.user, record))) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const currentHash = buildRecordHash({
    patient: record.patient,
    doctor: record.doctor,
    hospital: record.hospital,
    diagnosis: record.diagnosis,
    prescription: record.prescription,
    attachments: record.attachments
  });
  const result = await verifyRecordHash({ recordId: record._id, recordHash: currentHash, expectedHash: record.recordHash });
  record.status = result.verified ? "verified" : "tampered";
  await record.save();

  const verifyActorName = req.user.role === "doctor" ? drName(req.user.fullName) : req.user.fullName;
  await writeAudit({
    user:        req.user._id,
    action:      "VERIFY_RECORD",
    ipAddress:   req.ip,
    record:      record._id,
    actorName:   verifyActorName,
    recordTitle: record.title || record.diagnosis || null,
  });
  res.json({ success: true, data: result });
});

module.exports = { createRecord, getRecord, updateRecord, verifyRecord };
