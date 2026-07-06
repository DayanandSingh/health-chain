import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, HeartPulse } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const FOCUS_STYLES = `
  .login-card .field {
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .login-card .field:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }
`;

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-50 via-white to-blue-50 px-4 py-10">
      <style>{FOCUS_STYLES}</style>
      <form
        onSubmit={submit}
        className="login-card w-full max-w-md rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_8px_32px_-6px_rgba(15,23,42,0.10),0_2px_8px_-2px_rgba(15,23,42,0.05)] sm:p-8"
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
            Welcome Back
          </h1>
          <p className="mt-2.5 text-sm text-slate-500">
            Sign in to securely access your HealthChain dashboard.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-coral/10 px-3 py-2.5 text-sm text-coral">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            className="field"
            type="email"
            placeholder="e.g. rahul@gmail.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>

        {/* Password */}
        <div className="mt-4 flex flex-col gap-1">
          <label className="text-sm font-medium">Password</label>
          <div className="relative">
            <input
              className="field"
              style={{ paddingRight: "2.5rem" }}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              Signing In...
            </span>
          ) : (
            "Login"
          )}
        </button>

        <p className="mt-4 text-center text-sm text-steel">
          Don't have an account?{" "}
          <Link className="font-semibold text-blue-700" to="/register">Create Account</Link>
        </p>
      </form>
    </main>
  );
}
