const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const asyncHandler = require("../utils/asyncHandler");
const { writeAudit } = require("../services/auditService");
const { drName } = require("../utils/drName");

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    mobileNumber: user.mobileNumber,
    role: user.role,
    walletAddress: user.walletAddress,
    createdAt: user.createdAt,
  };
}

// Generates a unique Ethereum-style demo wallet address (0x + 40 hex chars) for
// a new account. Not connected to a live blockchain — it only provides a unique
// blockchain identity for the prototype. Re-rolls on the (astronomically rare)
// chance the generated address already belongs to an existing user.
async function generateUniqueWalletAddress() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const address = "0x" + crypto.randomBytes(20).toString("hex");
    const exists = await User.findOne({ walletAddress: address }).select("_id").lean();
    if (!exists) return address;
  }
  throw new Error("Unable to generate a unique wallet address.");
}

// Translates low-level Mongo/Mongoose errors thrown during registration into
// safe, meaningful HTTP responses. Never leaks internal details to the client.
function buildRegistrationError(err) {
  // Duplicate-key (unique index) violations.
  if (err && err.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : null;
    if (field === "email")         return { statusCode: 400, message: "Email already registered." };
    if (field === "walletAddress") return { statusCode: 400, message: "Wallet address already exists." };
    if (field === "licenseNumber") return { statusCode: 400, message: "This medical license number is already registered." };
    // patientId / doctorId / user collisions are transient — safe to retry.
    return { statusCode: 400, message: "Registration failed. Please try again." };
  }

  // Schema validation errors (normally caught upstream by express-validator).
  if (err && err.name === "ValidationError") {
    return { statusCode: 400, message: "Registration failed. Please try again." };
  }

  // Anything else is an unexpected server-side failure.
  return { statusCode: 500, message: "Internal server error while creating account." };
}

const register = asyncHandler(async (req, res) => {
  // Security: admin accounts cannot be created through public registration
  if (req.body.role && req.body.role.toLowerCase() === "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin accounts cannot be created through public registration.",
    });
  }

  // Fast pre-check so the common duplicate-email case returns a clean message.
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Email already registered.",
    });
  }

  // Auto-generate a unique blockchain wallet address for the new account.
  // Any wallet value in the request body is ignored — wallets are always
  // system-generated so every new user receives a unique blockchain identity.
  let walletAddress;
  try {
    walletAddress = await generateUniqueWalletAddress();
  } catch (err) {
    console.error("[register] Wallet address generation failed:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating account.",
    });
  }

  // ── Step 1: create the User account ───────────────────────────────────────
  let user;
  try {
    user = await User.create({ ...req.body, walletAddress });
  } catch (err) {
    console.error("[register] User creation failed:", err);
    const { statusCode, message } = buildRegistrationError(err);
    return res.status(statusCode).json({ success: false, message });
  }

  // ── Step 2: create the role-specific profile ──────────────────────────────
  // If this step fails, the User created in Step 1 would be left orphaned. We
  // delete it so registration is all-or-nothing: either a complete account
  // exists, or no record remains at all.
  try {
    if (user.role === "patient") {
      await Patient.create({
        user: user._id,
        patientId: `PAT-${Date.now()}`,
        name: user.fullName,
      });
    } else if (user.role === "doctor") {
      await Doctor.create({
        user: user._id,
        doctorId: `DOC-${Date.now()}`,
        name: user.fullName,
        specialization: req.body.specialization || "General Medicine",
        hospital: req.body.hospital || "Not assigned",
        licenseNumber: req.body.licenseNumber || `LIC-${Date.now()}`,
      });
    }
  } catch (err) {
    console.error("[register] Profile creation failed — rolling back user:", err);
    // Compensating action: remove the orphaned user so no partial record remains.
    await User.deleteOne({ _id: user._id }).catch((cleanupErr) =>
      console.error("[register] Failed to roll back orphaned user:", cleanupErr)
    );
    const { statusCode, message } = buildRegistrationError(err);
    return res.status(statusCode).json({ success: false, message });
  }

  // ── Step 3: audit logging ─────────────────────────────────────────────────
  // Runs only after the account is fully created. writeAudit is fire-and-forget
  // and never throws, so it can never turn a successful registration into a
  // reported failure.
  if (user.role === "patient") {
    writeAudit({
      user:        user._id,
      action:      "REGISTER",
      ipAddress:   req.ip,
      actorName:   user.fullName,
      description: `${user.fullName} created a new patient account`,
      metadata:    { role: user.role },
    });
  }

  if (user.role === "doctor") {
    writeAudit({
      user:        user._id,
      action:      "DOCTOR_REGISTRATION",
      ipAddress:   req.ip,
      actorName:   drName(user.fullName),
      description: `New doctor account registered: ${drName(user.fullName)}. Status: Pending Verification`,
      metadata:    { role: user.role, verificationStatus: "pending" },
    });
    // Doctor-dashboard default activity entries (created once at registration).
    // VERIFICATION_PENDING before ACCOUNT_CREATED so secondary _id sort puts
    // ACCOUNT_CREATED at top of the timeline.
    writeAudit({ user: user._id, action: "VERIFICATION_PENDING", ipAddress: req.ip, actorName: drName(user.fullName) });
    writeAudit({ user: user._id, action: "ACCOUNT_CREATED",      ipAddress: req.ip, actorName: drName(user.fullName) });
  }

  // ── Step 4: success — the account is fully and reliably created ───────────
  res.status(201).json({
    success: true,
    token: signToken(user),
    user: publicUser(user),
  });
});

const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+password");

  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: "Account is deactivated" });
  }

  const passwordMatches = await user.comparePassword(req.body.password);

  if (!passwordMatches) {
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  }

  const actorDisplayName = user.role === "doctor" ? drName(user.fullName) : user.fullName;
  await writeAudit({
    user:        user._id,
    action:      "LOGIN",
    ipAddress:   req.ip,
    actorName:   actorDisplayName,
    description: `${actorDisplayName} logged in`,
    metadata:    { role: user.role },
  });

  res.json({ success: true, token: signToken(user), user: publicUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

// ─── PUT /api/my-admin-profile ───────────────────────────────────────────────
// Updates User fields (fullName, email, mobileNumber) for the logged-in admin.
// Admin accounts have no Patient document, so only the User record is updated.
const updateMyAdminProfile = asyncHandler(async (req, res) => {
  const { fullName, email, mobileNumber } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  if (email !== undefined && email.trim()) {
    const normalized = email.toLowerCase().trim();
    if (normalized !== user.email) {
      const taken = await User.findOne({ email: normalized, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ success: false, message: "Email is already in use by another account." });
      }
      user.email = normalized;
    }
  }
  if (fullName !== undefined && fullName.trim()) user.fullName = fullName.trim();
  if (mobileNumber !== undefined && mobileNumber.trim()) user.mobileNumber = mobileNumber.trim();
  await user.save();

  writeAudit({
    user:        req.user._id,
    action:      "PROFILE_UPDATE",
    ipAddress:   req.ip,
    actorName:   user.fullName,
    description: `${user.fullName} updated their profile information`,
    metadata:    { role: req.user.role },
  });

  res.json({
    success: true,
    message: "Profile updated successfully.",
    data: {
      fullName:     user.fullName,
      email:        user.email,
      mobileNumber: user.mobileNumber,
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  writeAudit({
    user:        req.user._id,
    action:      "LOGOUT",
    ipAddress:   req.ip,
    actorName:   req.user.fullName,
    description: `${req.user.fullName} logged out`,
    metadata:    { role: req.user.role },
  });
  res.json({ success: true });
});

const updateProfilePhoto = asyncHandler(async (req, res) => {
  const { photo } = req.body;
  await User.findByIdAndUpdate(req.user._id, { profilePhoto: photo || "" });
  writeAudit({
    user:        req.user._id,
    action:      "PHOTO_UPDATE",
    ipAddress:   req.ip,
    actorName:   req.user.fullName,
    description: `${req.user.fullName} updated their profile photo`,
    metadata:    { role: req.user.role },
  });
  res.json({ success: true });
});

// ─── PUT /api/my-admin-password ──────────────────────────────────────────────
// Verifies the current password then replaces it. Pre-save hook handles hashing.
const changeAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select("+password");
  if (!user) return res.status(404).json({ success: false, message: "User not found." });

  const match = await user.comparePassword(currentPassword);
  if (!match) {
    return res.status(400).json({ success: false, message: "Current password is incorrect." });
  }

  user.password = newPassword;
  await user.save();

  writeAudit({
    user:        req.user._id,
    action:      "PROFILE_UPDATE",
    ipAddress:   req.ip,
    actorName:   user.fullName,
    description: "Administrator changed account password.",
    metadata:    { role: req.user.role },
  });

  res.json({ success: true, message: "Password updated successfully." });
});

module.exports = { register, login, me, logout, updateProfilePhoto, updateMyAdminProfile, changeAdminPassword };
