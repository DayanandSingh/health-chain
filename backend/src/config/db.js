const mongoose = require("mongoose");

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healthchain";
  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  try {
    await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    await seedAdminUser();
  } catch (error) {
    console.error(`MongoDB connection failed (${mongoUri}):`, error.message);
    throw error;
  }
}

/**
 * Seeds the default admin account if one does not already exist.
 * This function is idempotent — it is safe to call on every server start.
 */
async function seedAdminUser() {
  // Require User here (not at top-level) to avoid circular dependency issues
  // at module load time before mongoose models are registered.
  const User = require("../models/User");

  const existingAdmin = await User.findOne({ role: "admin" });
  if (existingAdmin) {
    console.log("Admin account already exists — skipping seed.");
    return;
  }

  await User.create({
    fullName: "System Admin",
    email: "admin@healthchain.com",
    mobileNumber: "0000000000",
    role: "admin",
    walletAddress: "0x0000000000000000000000000000000000000000",
    password: "Admin@123",
    isActive: true,
  });

  console.log("Default admin account created: admin@healthchain.com");
}

module.exports = connectDB;

