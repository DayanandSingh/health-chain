import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Mail,
  Search,
  Shield,
  ShieldCheck,
  ShieldOff,
  Stethoscope,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";
import { ensureDrPrefix } from "../utils/drName";
import { useAuth } from "../context/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACCESS_LEVELS = [
  { value: "view_only",     label: "View Only",       desc: "Doctor can view your records" },
  { value: "view_download", label: "View + Download", desc: "Doctor can view and download records" },
];

const DURATION_OPTIONS = [
  { value: "24h",    label: "24 Hours"    },
  { value: "7d",     label: "7 Days"      },
  { value: "30d",    label: "30 Days"     },
  { value: "custom", label: "Custom Date" },
];

const STATUS_STYLE = {
  active:  "border-emerald-200 bg-emerald-50 text-emerald-700",
  expired: "border-amber-200  bg-amber-50  text-amber-700",
  revoked: "border-slate-200  bg-slate-50  text-slate-500",
};

const ACCESS_STYLE = {
  view_only:     "border-blue-200 bg-blue-50 text-blue-700",
  view_download: "border-teal-200 bg-teal-50 text-teal-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function shortWallet(addr) {
  if (!addr || addr.length <= 14) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getExpiresAt(duration, customDate) {
  const now = Date.now();
  if (duration === "24h")    return new Date(now + 24 * 3600 * 1000).toISOString();
  if (duration === "7d")     return new Date(now + 7  * 86400 * 1000).toISOString();
  if (duration === "30d")    return new Date(now + 30 * 86400 * 1000).toISOString();
  if (duration === "custom" && customDate) return new Date(`${customDate}T23:59:59`).toISOString();
  return null;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {t.type === "success"
            ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
            : <AlertCircle  size={17} className="shrink-0 text-red-500" />}
          <span className="text-sm font-medium">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="ml-1 shrink-0 opacity-50 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Revoke Confirm Dialog ────────────────────────────────────────────────────
function RevokeDialog({ doctor, busy, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <ShieldOff size={20} className="text-red-500" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">Revoke Access</p>
            <p className="mt-1 text-sm text-slate-500">
              Remove access for <strong>{ensureDrPrefix(doctor?.fullName) || "this doctor"}</strong>?
              This action cannot be undone without re-granting.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Revoke Access
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Blocked Doctor Modal ─────────────────────────────────────────────────────
function BlockedDoctorModal({ doctor, onClose }) {
  const vs             = doctor?.verificationStatus;
  const rejectionType  = doctor?.rejectionType;
  const vReason        = doctor?.verificationReason;
  const effectiveType  = rejectionType || (vReason ? "revoked" : "initial");

  let title, badge, dotCls, badgeCls, description;
  if (vs === "pending") {
    title       = "Doctor Verification Required";
    badge       = "Pending Verification";
    dotCls      = "bg-amber-400";
    badgeCls    = "border-amber-200 bg-amber-50 text-amber-700";
    description = "This doctor's account is pending administrator verification. Only verified doctors can receive access to patient records.";
  } else if (vs === "rejected" && effectiveType === "revoked") {
    title       = "Doctor Not Eligible";
    badge       = "Verification Revoked";
    dotCls      = "bg-red-500";
    badgeCls    = "border-red-200 bg-red-50 text-red-700";
    description = "This doctor's verification was revoked by the administrator. They cannot receive access to patient records.";
  } else {
    title       = "Doctor Not Eligible";
    badge       = "Verification Rejected";
    dotCls      = "bg-red-500";
    badgeCls    = "border-red-200 bg-red-50 text-red-700";
    description = "This doctor's verification request was rejected by the administrator. They cannot receive access to patient records.";
  }

  const iconBg = vs === "pending" ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <ShieldOff size={20} className={vs === "pending" ? "text-amber-500" : "text-red-500"} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="mt-0.5 truncate text-sm text-slate-500">{ensureDrPrefix(doctor?.fullName)}</p>
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${badgeCls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
              {badge}
            </span>
            <p className="mt-3 text-sm text-slate-600">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Verified Doctor Confirmation Modal ───────────────────────────────────────
function VerifiedDoctorModal({ doctor, onCancel, onContinue }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <ShieldCheck size={20} className="text-emerald-600" />
          </span>
          <p className="font-semibold text-slate-900">Grant Medical Record Access</p>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Doctor</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">{ensureDrPrefix(doctor?.fullName)}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-0.5 text-sm text-slate-700">{doctor?.email}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Current Status</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Verified Doctor
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          This doctor has been verified by the system administrator and is eligible to access your medical records once permission is granted.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-800">Would you like to continue?</p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Search ────────────────────────────────────────────────────────────
function DoctorSearch({ selected, onSelect, onBlock, onConfirm }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [busy,    setBusy]    = useState(false);
  const timer  = useRef(null);
  const wrapEl = useRef(null);

  useEffect(() => {
    function close(e) {
      if (wrapEl.current && !wrapEl.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    if (selected) onSelect(null);
    clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        const normalized = val.trim().replace(/^(doctor|dr\.?)\s*/i, "").trim();
        const { data } = await api.get(`/doctors/search?q=${encodeURIComponent(normalized || val.trim())}`);
        setResults(data.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setBusy(false);
      }
    }, 300);
  }

  function pick(doc) {
    if (doc.verificationStatus && doc.verificationStatus !== "verified") {
      onBlock?.(doc);
      clear();
      return;
    }
    // Verified — show confirmation modal instead of immediate selection
    onConfirm?.(doc);
    clear();
  }

  function clear() {
    onSelect(null);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapEl} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <Search size={15} className="text-slate-400" />
        </span>
        <input
          className="field !pl-9 pr-8"
          placeholder="Search by name, email or wallet address…"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {busy && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            <Loader2 size={14} className="animate-spin text-slate-400" />
          </span>
        )}
      </div>

      {/* Selected doctor chip */}
      {selected && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-emerald-800">{ensureDrPrefix(selected.fullName)}</p>
            <p className="truncate text-xs text-emerald-600">{selected.email}</p>
          </div>
          <button type="button" onClick={clear} className="shrink-0 text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.map((doc) => {
            const verified = doc.verificationStatus === "verified";
            const rejType  = doc.rejectionType || (doc.verificationReason ? "revoked" : "initial");
            const statusBadge = verified
              ? { label: "Verified Doctor",        dot: "bg-emerald-500", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" }
              : doc.verificationStatus === "rejected" && rejType === "revoked"
              ? { label: "Verification Revoked",   dot: "bg-red-500",     cls: "border-red-200 bg-red-50 text-red-600" }
              : doc.verificationStatus === "rejected"
              ? { label: "Verification Rejected",  dot: "bg-red-500",     cls: "border-red-200 bg-red-50 text-red-600" }
              : { label: "Pending Verification",   dot: "bg-amber-400",   cls: "border-amber-200 bg-amber-50 text-amber-600" };
            return (
              <li
                key={doc._id}
                onClick={() => pick(doc)}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
              >
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${verified ? "bg-blue-50" : "bg-slate-100"}`}>
                  <Stethoscope size={16} className={verified ? "text-blue-600" : "text-slate-400"} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${verified ? "text-slate-900" : "text-slate-500"}`}>{ensureDrPrefix(doc.fullName)}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="truncate text-xs text-slate-400">{doc.email}</p>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusBadge.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
                      {statusBadge.label}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* No results */}
      {open && !busy && results.length === 0 && query.trim() && (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm text-slate-500">No doctors found matching &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}

// ─── Permission Card ──────────────────────────────────────────────────────────
function PermissionCard({ permission, onRevoke, readOnly }) {
  const doc    = permission.grantee;
  const status = permission.status ?? (permission.isActive ? "active" : "revoked");
  const statusCls = STATUS_STYLE[status] || STATUS_STYLE.revoked;

  let accessLabel = "View Only";
  let accessCls   = ACCESS_STYLE.view_only;
  if (permission.accessLevel === "view_download") {
    accessLabel = "View + Download";
    accessCls   = ACCESS_STYLE.view_download;
  }

  return (
    <article className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-blue-100 hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Doctor info */}
        <div className="flex min-w-0 items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <Stethoscope size={20} className="text-blue-600" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{ensureDrPrefix(doc?.fullName)}</p>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusCls}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
              <span className={`rounded border px-2 py-0.5 text-xs font-medium ${accessCls}`}>
                {accessLabel}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              {doc?.email && (
                <span className="flex items-center gap-1">
                  <Mail size={11} /> {doc.email}
                </span>
              )}
              {doc?.walletAddress && (
                <span className="flex items-center gap-1 font-mono">
                  <Wallet size={11} /> {shortWallet(doc.walletAddress)}
                </span>
              )}
            </div>

            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={11} /> Granted: {fmtDate(permission.grantedAt || permission.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> Expires: {fmtDate(permission.expiresAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Revoke button — only for active, patient-facing */}
        {status === "active" && !readOnly && (
          <button
            onClick={() => onRevoke(permission)}
            className="shrink-0 flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50"
          >
            <ShieldOff size={15} /> Revoke
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="h-3 w-2/5 rounded bg-slate-100" />
          <div className="h-3 w-1/4 rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

const ADMIN_ROLES = ["system_admin", "hospital_admin", "admin"];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Permissions() {
  const { user } = useAuth();

  // Form state
  const [doctor,     setDoctor]     = useState(null);
  const [accessLvl,  setAccessLvl]  = useState("view_only");
  const [duration,   setDuration]   = useState("7d");
  const [customDate, setCustomDate] = useState("");
  const [formErrs,   setFormErrs]   = useState({});
  const [granting,   setGranting]   = useState(false);

  // List state
  const [perms,    setPerms]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState("");

  // Revoke state
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking,     setRevoking]     = useState(false);

  // Blocked doctor modal state
  const [blockedDoctor,  setBlockedDoctor]  = useState(null);
  // Verified doctor confirmation modal state
  const [pendingDoctor,  setPendingDoctor]  = useState(null);

  // Filter state — null means "show all"
  const [statusFilter, setStatusFilter] = useState(null);
  const [permSearch,   setPermSearch]   = useState("");

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);
  const dismissToast = useCallback((id) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const fetchPerms = useCallback(async () => {
    setLoading(true);
    setFetchErr("");
    try {
      const endpoint = ADMIN_ROLES.includes(user?.role) ? "/permissions" : "/my-permissions";
      const { data } = await api.get(endpoint);
      setPerms(data.data || []);
    } catch {
      setFetchErr("Unable to load permissions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => { fetchPerms(); }, [fetchPerms]);

  // ── Grant ─────────────────────────────────────────────────────────────────
  async function handleGrant(e) {
    e.preventDefault();
    const errs = {};
    if (!doctor)                              errs.doctor     = "Please select a doctor.";
    if (!accessLvl)                           errs.accessLvl  = "Please select an access level.";
    if (!duration)                            errs.duration   = "Please select a duration.";
    if (duration === "custom" && !customDate) errs.customDate = "Please choose a custom expiry date.";
    if (Object.keys(errs).length) { setFormErrs(errs); return; }

    setGranting(true);
    setFormErrs({});
    try {
      await api.post("/my-permissions/grant", {
        doctorUserId: doctor._id,
        accessLevel:  accessLvl,
        expiresAt:    getExpiresAt(duration, customDate),
      });
      addToast("Access granted successfully.");
      setDoctor(null);
      setAccessLvl("view_only");
      setDuration("7d");
      setCustomDate("");
      fetchPerms();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to grant access. Please try again.";
      setFormErrs({ _server: msg });
    } finally {
      setGranting(false);
    }
  }

  // ── Revoke ────────────────────────────────────────────────────────────────
  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.post(`/my-permissions/${revokeTarget._id}/revoke`);
      addToast("Access revoked successfully.");
      setRevokeTarget(null);
      fetchPerms();
    } catch {
      addToast("Failed to revoke access. Please try again.", "error");
      setRevokeTarget(null);
    } finally {
      setRevoking(false);
    }
  }

  // Summary counts — always reflect total, regardless of active filter
  const activeCount  = perms.filter((p) => (p.status ?? (p.isActive ? "active" : "revoked")) === "active").length;
  const expiredCount = perms.filter((p) => p.status === "expired").length;
  const revokedCount = perms.filter((p) => (p.status ?? (!p.isActive ? "revoked" : "")) === "revoked").length;

  // Filtered + sorted list — newest grant first, frontend only
  const filteredPerms = (statusFilter
    ? perms.filter((p) => {
        const st = p.status ?? (p.isActive ? "active" : "revoked");
        return st === statusFilter;
      })
    : perms
  ).filter((p) => {
    if (!ADMIN_ROLES.includes(user?.role) || !permSearch.trim()) return true;
    const q       = permSearch.toLowerCase().trim();
    const nameQ   = q.replace(/^(doctor|dr\.?)\s*/i, "").trim(); // strip prefix from query
    const doc     = p.grantee;
    const rawName = (doc?.fullName || "").toLowerCase();
    const fmtName = ensureDrPrefix(doc?.fullName).toLowerCase();
    return (
      fmtName.includes(q) ||                                   // "dr. aditya" ⊇ "dr." / "dr. ad"
      (nameQ ? rawName.includes(nameQ) : /^(doctor|dr\.?)/.test(q)) || // stripped query OR bare "Dr"→all
      (doc?.email || "").toLowerCase().includes(q) ||
      (doc?.walletAddress || "").toLowerCase().includes(q)
    );
  }).slice().sort((a, b) =>
    new Date(b.grantedAt || b.createdAt || 0) - new Date(a.grantedAt || a.createdAt || 0)
  );

  return (
    <>
      <section className="space-y-6">
        {/* Page header */}
        {ADMIN_ROLES.includes(user?.role) ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Permissions</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
              View and monitor all patient-granted doctor permissions.
            </p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Permissions</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                Securely grant doctors access to your medical records. You stay in control.
              </p>
            </div>

            {/* ── Grant Access card ──────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                  <KeyRound size={18} className="text-blue-600" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">Grant Access</p>
                  <p className="text-xs text-slate-500">Share your records with a registered doctor</p>
                </div>
              </div>

              <form onSubmit={handleGrant} noValidate className="space-y-4">
                {/* Server error */}
                {formErrs._server && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle size={16} className="shrink-0" />
                    {formErrs._server}
                  </div>
                )}

                {/* Doctor selector */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Select Doctor <span className="text-red-500">*</span>
                  </label>
                  <DoctorSearch selected={doctor} onSelect={setDoctor} onBlock={setBlockedDoctor} onConfirm={setPendingDoctor} />
                  {formErrs.doctor && <p className="mt-1 text-xs text-red-600">{formErrs.doctor}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Access level */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Access Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="field"
                      value={accessLvl}
                      onChange={(e) => { setAccessLvl(e.target.value); setFormErrs((f) => ({ ...f, accessLvl: "" })); }}
                    >
                      {ACCESS_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-400">
                      {ACCESS_LEVELS.find((l) => l.value === accessLvl)?.desc}
                    </p>
                    {formErrs.accessLvl && <p className="mt-1 text-xs text-red-600">{formErrs.accessLvl}</p>}
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Duration <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="field"
                      value={duration}
                      onChange={(e) => {
                        setDuration(e.target.value);
                        setCustomDate("");
                        setFormErrs((f) => ({ ...f, duration: "", customDate: "" }));
                      }}
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {formErrs.duration && <p className="mt-1 text-xs text-red-600">{formErrs.duration}</p>}
                  </div>
                </div>

                {/* Custom date picker */}
                {duration === "custom" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Expiry Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="field"
                      min={tomorrowISO()}
                      value={customDate}
                      onChange={(e) => { setCustomDate(e.target.value); setFormErrs((f) => ({ ...f, customDate: "" })); }}
                    />
                    {formErrs.customDate && <p className="mt-1 text-xs text-red-600">{formErrs.customDate}</p>}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button type="submit" disabled={granting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-blue-800 active:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60">
                    {granting
                      ? <><Loader2 size={16} className="animate-spin" /> Granting…</>
                      : <><KeyRound size={16} /> Grant Access</>}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ── Summary chips — clickable to filter the list below ─── */}
        {!loading && perms.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === "active" ? null : "active")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                statusFilter === "active"
                  ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
              }`}
            >
              <ShieldCheck size={13} /> {activeCount} Active
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === "expired" ? null : "expired")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                statusFilter === "expired"
                  ? "border-amber-500 bg-amber-500 text-white shadow-sm"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100"
              }`}
            >
              <Clock size={13} /> {expiredCount} Expired
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === "revoked" ? null : "revoked")}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                statusFilter === "revoked"
                  ? "border-slate-500 bg-slate-600 text-white shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >
              <Shield size={13} /> {revokedCount} Revoked
            </button>
          </div>
        )}

        {/* ── Admin search ───────────────────────────────────────── */}
        {ADMIN_ROLES.includes(user?.role) && !loading && (
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by doctor name, email or wallet address…"
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
        )}

        {/* ── Fetch error ────────────────────────────────────────── */}
        {fetchErr && (
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <AlertCircle size={17} className="shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{fetchErr}</p>
            <button
              onClick={fetchPerms}
              className="ml-auto rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Permissions list ───────────────────────────────────── */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">Permission History</h2>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} />)}
            </div>
          ) : perms.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <KeyRound size={30} className="text-blue-400" />
              </span>
              <div>
                <p className="font-semibold text-slate-700">No permissions granted yet</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Use the form above to give a doctor access to your records.
                </p>
              </div>
            </div>
          ) : filteredPerms.length === 0 ? (
            permSearch.trim() ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                  <Search size={26} className="text-slate-300" />
                </span>
                <div>
                  <p className="font-semibold text-slate-600">No matching permissions found.</p>
                  <p className="mt-1 text-sm text-slate-400">Try a different name, email or wallet address.</p>
                </div>
              </div>
            ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50">
                {statusFilter === "active"  && <ShieldCheck size={26} className="text-slate-300" />}
                {statusFilter === "expired" && <Clock       size={26} className="text-slate-300" />}
                {statusFilter === "revoked" && <Shield      size={26} className="text-slate-300" />}
              </span>
              <div>
                <p className="font-semibold text-slate-600">
                  No {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : ""} Permissions
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  No permissions with this status found.
                </p>
              </div>
              <button
                onClick={() => setStatusFilter(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Show All
              </button>
            </div>
            )
          ) : (
            <div className="space-y-3">
              {filteredPerms.map((p) => (
                <PermissionCard
                  key={p._id}
                  permission={p}
                  onRevoke={setRevokeTarget}
                  readOnly={ADMIN_ROLES.includes(user?.role)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Revoke confirm dialog */}
      {revokeTarget && (
        <RevokeDialog
          doctor={revokeTarget.grantee}
          busy={revoking}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}

      {/* Blocked doctor modal */}
      {blockedDoctor && (
        <BlockedDoctorModal
          doctor={blockedDoctor}
          onClose={() => setBlockedDoctor(null)}
        />
      )}

      {/* Verified doctor confirmation modal */}
      {pendingDoctor && (
        <VerifiedDoctorModal
          doctor={pendingDoctor}
          onCancel={() => setPendingDoctor(null)}
          onContinue={() => { setDoctor(pendingDoctor); setPendingDoctor(null); }}
        />
      )}

      {/* Toasts */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
