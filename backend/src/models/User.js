const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const roles = ["patient", "doctor", "admin"];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: roles },
    walletAddress: { type: String, required: true, lowercase: true, trim: true },
    password:     { type: String, required: true, minlength: 8, select: false },
    profilePhoto: { type: String, select: false },
    isActive:     { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);

