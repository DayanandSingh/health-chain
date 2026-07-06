import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, HeartPulse } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const roles = [
  ["patient", "Patient"],
  ["doctor", "Doctor"]
];

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function validateForm(form) {
  const errors = {};

  // Full Name
  if (!form.fullName.trim()) {
    errors.fullName = "Full Name is required.";
  } else if (form.fullName.trim().length < 3) {
    errors.fullName = "Full name must be at least 3 characters.";
  }

  // Email
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!form.email.trim()) {
    errors.email = "Email is required.";
  } else if (!emailRe.test(form.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  // Mobile Number — exactly 10 digits
  const mobileRe = /^\d{10}$/;
  if (!form.mobileNumber.trim()) {
    errors.mobileNumber = "Mobile Number is required.";
  } else if (!mobileRe.test(form.mobileNumber.trim())) {
    errors.mobileNumber = "Mobile number must contain exactly 10 digits.";
  }

  // Role
  if (!form.role) {
    errors.role = "Please select a role.";
  }

  // Doctor-only fields
  if (form.role === "doctor") {
    if (!form.hospital.trim())       errors.hospital       = "Please enter your hospital or clinic name.";
    if (!form.specialization.trim()) errors.specialization = "Please enter your specialization.";
    if (!form.licenseNumber.trim())  errors.licenseNumber  = "Please enter your medical license number.";
  }

  // Password
  if (!form.password) {
    errors.password = "Password is required.";
  } else if (form.password.length < 8) {
    errors.password = "Password must contain at least 8 characters.";
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Map backend / network errors to professional messages
// ---------------------------------------------------------------------------
function mapBackendError(err) {
  const status = err.response?.status;
  const serverMsg = err.response?.data?.message;
  const raw = (serverMsg || "").toLowerCase();

  if (!err.response) {
    return "Unable to connect to server. Please check your internet connection.";
  }

  if (raw.includes("email already")) return "Email already registered.";
  if (raw.includes("mobile") && raw.includes("already")) return "Mobile number already registered.";
  if (raw.includes("wallet")) return serverMsg;                          // e.g. "Wallet address already exists."
  if (raw.includes("license")) return serverMsg;                         // "This medical license number is already registered."
  if (raw.includes("internal server error while creating")) return serverMsg;
  if (raw.includes("admin")) return err.response.data.message; // safe — our own message
  if (status === 400) return "Registration failed. Please check your details and try again.";
  if (status === 409) return "An account with these details already exists.";
  if (status >= 500) return "Something went wrong. Please try again later.";

  return "Registration failed. Please try again.";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    role: "patient",
    hospital: "",
    specialization: "",
    licenseNumber: "",
    password: ""
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Refs for auto-focusing the first invalid field
  const refs = {
    fullName:       useRef(null),
    email:          useRef(null),
    mobileNumber:   useRef(null),
    role:           useRef(null),
    hospital:       useRef(null),
    specialization: useRef(null),
    licenseNumber:  useRef(null),
    password:       useRef(null),
  };

  // Field order used to find the first error
  const fieldOrder = ["fullName", "email", "mobileNumber", "role", "hospital", "specialization", "licenseNumber", "password"];

  // Build the input class, adding a red border highlight when the field has an error
  const inputClass = (name) => (fieldErrors[name] ? "field !border-coral" : "field");

  // Update a single field and clear its inline error on change
  function handleChange(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Clear doctor-only fields when switching back to patient
      if (field === "role" && value === "patient") {
        next.hospital = "";
        next.specialization = "";
        next.licenseNumber = "";
      }
      return next;
    });
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  async function submit(event) {
    event.preventDefault();
    setGlobalError("");
    setSuccessMsg("");

    // Client-side validation
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Auto-focus the first invalid field
      const firstInvalid = fieldOrder.find((f) => errors[f]);
      if (firstInvalid && refs[firstInvalid]?.current) {
        refs[firstInvalid].current.focus();
      }
      return;
    }

    setLoading(true);
    try {
      await register(form);
      setSuccessMsg("✅ Registration successful.\nPlease login to continue.");
      // Redirect to login after 1.5 s
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setGlobalError(mapBackendError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-2xl rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_8px_32px_-6px_rgba(15,23,42,0.10),0_2px_8px_-2px_rgba(15,23,42,0.05)] sm:p-8"
      >

        {/* ── Branding ──────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-emerald-600 text-white shadow-md">
            <HeartPulse size={22} strokeWidth={2.25} />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">HealthChain</span>
        </div>

        {/* ── Heading ───────────────────────────────────────────────────── */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Create Your HealthChain Account
          </h1>
          <p className="mt-2.5 text-sm text-slate-500">
            Register as a Patient or Doctor to securely manage healthcare records.
          </p>
        </div>

        {/* Global error banner */}
        {globalError && (
          <div className="mb-4 rounded-lg bg-coral/10 px-3 py-2.5 text-sm text-coral">
            {globalError}
          </div>
        )}

        {/* Success toast */}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-mint/10 px-3 py-2.5 text-sm text-mint" style={{ whiteSpace: "pre-line" }}>
            {successMsg}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">

          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Full Name <span className="text-coral">*</span></label>
            <input
              ref={refs.fullName}
              className={inputClass("fullName")}
              placeholder="e.g. Rahul Kumar"
              value={form.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
            />
            {fieldErrors.fullName && (
              <span className="text-xs text-coral">{fieldErrors.fullName}</span>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Email <span className="text-coral">*</span></label>
            <input
              ref={refs.email}
              className={inputClass("email")}
              placeholder="e.g. rahul@gmail.com"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
            {fieldErrors.email && (
              <span className="text-xs text-coral">{fieldErrors.email}</span>
            )}
          </div>

          {/* Mobile Number */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Mobile Number <span className="text-coral">*</span></label>
            <input
              ref={refs.mobileNumber}
              className={inputClass("mobileNumber")}
              placeholder="e.g. 9876543210"
              value={form.mobileNumber}
              onChange={(e) => handleChange("mobileNumber", e.target.value)}
            />
            {fieldErrors.mobileNumber && (
              <span className="text-xs text-coral">{fieldErrors.mobileNumber}</span>
            )}
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Role <span className="text-coral">*</span></label>
            <select
              ref={refs.role}
              className={inputClass("role")}
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
            >
              {roles.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            {fieldErrors.role && (
              <span className="text-xs text-coral">{fieldErrors.role}</span>
            )}
          </div>

          {/* Doctor-only fields */}
          {form.role === "doctor" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Hospital / Clinic</label>
                <input
                  ref={refs.hospital}
                  className="field"
                  placeholder="e.g. PMCH Patna"
                  value={form.hospital}
                  onChange={(e) => handleChange("hospital", e.target.value)}
                />
                {fieldErrors.hospital && (
                  <span className="text-xs text-coral">{fieldErrors.hospital}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Specialization</label>
                <input
                  ref={refs.specialization}
                  className="field"
                  placeholder="e.g. General Medicine"
                  value={form.specialization}
                  onChange={(e) => handleChange("specialization", e.target.value)}
                />
                {fieldErrors.specialization && (
                  <span className="text-xs text-coral">{fieldErrors.specialization}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm font-medium">Medical License Number</label>
                <input
                  ref={refs.licenseNumber}
                  className="field"
                  placeholder="e.g. NMC-2026-123456"
                  value={form.licenseNumber}
                  onChange={(e) => handleChange("licenseNumber", e.target.value)}
                />
                {fieldErrors.licenseNumber && (
                  <span className="text-xs text-coral">{fieldErrors.licenseNumber}</span>
                )}
              </div>
            </>
          )}

          {/* Password — full width */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-sm font-medium">Password <span className="text-coral">*</span></label>
            <div className="relative">
              <input
                ref={refs.password}
                className={inputClass("password")}
                style={{ paddingRight: "2.5rem" }}
                placeholder="Minimum 8 characters"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showPassword
                  ? <EyeOff size={16} strokeWidth={1.75} />
                  : <Eye size={16} strokeWidth={1.75} />
                }
              </button>
            </div>
            {fieldErrors.password && (
              <span className="text-xs text-coral">{fieldErrors.password}</span>
            )}
          </div>

        </div>

        {/* Submit button */}
        <button
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 py-3.5 text-base font-bold text-white shadow-[0_10px_28px_-6px_rgba(29,78,216,0.65)] ring-1 ring-blue-800/20 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-[0_14px_32px_-6px_rgba(29,78,216,0.7)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_10px_28px_-6px_rgba(29,78,216,0.65)]"
          disabled={loading}
          type="submit"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating Account...
            </span>
          ) : (
            "Register"
          )}
        </button>

        <p className="mt-4 text-center text-sm text-steel">
          Already registered?{" "}
          <Link className="font-semibold text-mint" to="/login">Login</Link>
        </p>
      </form>
    </main>
  );
}
