const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    record: { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" },
    grantee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    permissionTypes: [{ type: String, enum: ["read", "write", "update", "revoke"], required: true }],
    isActive: { type: Boolean, default: true },
    blockchainTxId: String,
    expiresAt: Date,
    accessLevel: { type: String, enum: ["view_only", "view_download"] },
    grantedAt: { type: Date }
  },
  { timestamps: true }
);

permissionSchema.index({ patient: 1, grantee: 1, record: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);

