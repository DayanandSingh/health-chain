require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const xss = require("xss-clean");

const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const recordRoutes = require("./routes/recordRoutes");
const myRecordsRoutes = require("./routes/myRecordsRoutes");
const permissionRoutes = require("./routes/permissionRoutes");
const auditRoutes = require("./routes/auditRoutes");
const adminRoutes  = require("./routes/adminRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(xss());
app.use(morgan("dev"));
// Rate limiting: enforced in production only; skipped locally so dev logins aren't blocked.
if (process.env.NODE_ENV === "production") {
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 150 }));
}

app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "healthchain-api",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", authRoutes);
app.use("/api", patientRoutes);
app.use("/api", recordRoutes);
app.use("/api/my-records", myRecordsRoutes);
app.use("/api", permissionRoutes);
app.use("/api", auditRoutes);
app.use("/api", adminRoutes);
app.use("/api", doctorRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
