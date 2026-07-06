const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    contactEmail: String,
    contactPhone: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Hospital", hospitalSchema);

