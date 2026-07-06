const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN", "LOGOUT", "REGISTER",
        "RECORD_VIEW", "RECORD_UPLOAD", "RECORD_UPDATE", "RECORD_DOWNLOAD", "RECORD_DELETE",
        "ACCESS_GRANT", "ACCESS_REVOKE", "PERMISSION_EXPIRED",
        "NOTE_CREATED", "NOTE_UPDATED", "NOTE_DELETED",
        "VERIFY_RECORD",
        "PROFILE_UPDATE", "PHOTO_UPDATE",
        "DOCTOR_REGISTRATION",
        "ACCOUNT_CREATED", "VERIFICATION_PENDING",
        "DOCTOR_VERIFIED", "ACCOUNT_VERIFIED",
        "DOCTOR_REVOKED", "VERIFICATION_REVOKED",
        "REVERIFICATION_REQUESTED",
        "DOCTOR_REVERIFIED",
        "REVERIFICATION_DECLINED",
        "REVERIFICATION_REQUEST_DECLINED",
        "DOCTOR_INITIAL_REJECTED",
        "VERIFICATION_REJECTED",
        "INITIAL_VERIFICATION_REQUESTED",
      ],
    },
    // Human-readable event description (neutral third-person)
    description:    { type: String },
    // Cached name of the actor (for display without populate)
    actorName:      { type: String },
    // The OTHER party involved in the event (doctor when patient acts, patient when doctor acts)
    targetUserId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    targetUserName: { type: String },
    // Cached record/note title for display
    recordTitle:    { type: String },
    // Original fields
    ipAddress:      { type: String },
    record:         { type: mongoose.Schema.Types.ObjectId, ref: "MedicalRecord" },
    metadata:       { type: mongoose.Schema.Types.Mixed },
    blockchainTxId: { type: String },
  },
  { timestamps: true }
);

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ targetUserId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
