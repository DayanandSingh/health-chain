const mongoose = require("mongoose");

const doctorNoteSchema = new mongoose.Schema(
  {
    doctor:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientRef:  { type: mongoose.Schema.Types.ObjectId, ref: "Patient" },
    patientId:   { type: String, default: "" },
    patientName: { type: String, required: true, trim: true },
    diagnosis:       { type: String, trim: true, default: "" },
    symptoms:        { type: String, trim: true, default: "" },
    prescription:    { type: String, trim: true, default: "" },
    recommendedTests:{ type: String, trim: true, default: "" },
    advice:          { type: String, trim: true, default: "" },
    status:        { type: String, enum: ["reviewed", "follow_up_required", "completed"], default: "reviewed" },
    followUpDate:  { type: Date },
    blockchainTxId:{ type: String },
  },
  { timestamps: true }
);

doctorNoteSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model("DoctorNote", doctorNoteSchema);
