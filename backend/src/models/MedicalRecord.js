const mongoose = require("mongoose");

const RECORD_TYPES = [
  "Prescription",
  "Blood Test",
  "X-Ray",
  "MRI",
  "CT Scan",
  "Vaccination",
  "Other",
];

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    doctor:  { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

    // ── Patient-facing descriptive fields ──────────────────────────────────
    title:        { type: String, trim: true },          // human-readable record name
    recordType:   { type: String, enum: RECORD_TYPES },  // category
    hospitalName: { type: String, trim: true },          // free-text hospital / clinic
    doctorName:   { type: String, trim: true },          // free-text doctor name
    visitDate:    { type: Date },                        // date of visit

    // ── Existing clinical fields ────────────────────────────────────────────
    diagnosis:    { type: String, required: true },
    prescription: { type: String },
    labReports:   [{ title: String, cid: String, hash: String }],
    scanReports:  [{ title: String, cid: String, hash: String }],
    attachments:  [{ fileName: String, mimeType: String, cid: String, hash: String, size: Number }],
    recordHash:   { type: String, required: true },
    blockchainTxId: String,
    status: {
      type: String,
      enum: ["draft", "active", "verified", "tampered", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);


