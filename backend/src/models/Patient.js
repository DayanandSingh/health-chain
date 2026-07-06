const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    patientId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"] },
    bloodGroup: { type: String, trim: true },
    allergies: [{ type: String, trim: true }],
    emergencyContact: {
      name: String,
      mobileNumber: String,
      relationship: String
    },
    address: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Patient", patientSchema);

