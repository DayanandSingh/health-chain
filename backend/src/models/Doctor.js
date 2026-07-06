const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    doctorId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    hospital: { type: String, trim: true },
    licenseNumber:      { type: String, required: true, unique: true, trim: true },
    verificationStatus:          { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
    verificationReason:          { type: String },
    rejectionType:               { type: String, enum: ["initial", "revoked"] },
    rejectionReason:             { type: String },
    reVerificationRequested:     { type: Boolean, default: false },
    lastReverificationDeclined:  { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);

