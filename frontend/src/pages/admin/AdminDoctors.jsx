import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureDrPrefix } from "../../utils/drName";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  RefreshCw,
  Search,
  Stethoscope,
  X,
} from "lucide-react";
import api from "../../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function truncateWallet(addr) {
  if (!addr) return "—";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Avatar (photo → initials fallback) ───────────────────────────────────────

function Avatar({ name, photo, sizeCls, bgCls, textCls }) {
  const [err, setErr] = useState(false);
  if (photo && !err) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${sizeCls} shrink-0 rounded-full object-cover`}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className={`${sizeCls} shrink-0 flex items-center justify-center rounded-full ${bgCls} ${textCls}`}>
      {initials(name)}
    </div>
  );
}

// ─── Revoke Reason Options ────────────────────────────────────────────────────

const REVOKE_REASONS = [
  "Invalid or unverifiable medical license",
  "False or misleading profile information",
  "Policy or compliance violation",
  "Suspicious account activity",
  "Duplicate doctor account",
  "Administrative decision",
  "Other",
];

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value && value !== false) return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="min-w-[140px] shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="break-all text-sm text-slate-800">{String(value)}</dd>
    </div>
  );
}

function DoctorModal({ doctor, onClose, onSuccess }) {
  const u = doctor.user || {};
  const [copied,      setCopied]      = useState(false);
  const [confirm,     setConfirm]     = useState(null); // "verify" | "reject" | "revoke" | null
  const [busy,        setBusy]        = useState(false);
  const [reason,      setReason]      = useState("");
  const [reasonOther, setReasonOther] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        if (confirm) setConfirm(null);
        else onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, confirm]);

  useEffect(() => {
    if (!confirm) { setReason(""); setReasonOther(""); }
  }, [confirm]);

  function copyWallet() {
    if (!u.walletAddress) return;
    navigator.clipboard.writeText(u.walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      if (confirm === "verify") {
        await api.patch(`/admin/doctors/${doctor._id}/verify`);
        onSuccess("Doctor verified successfully.");
      } else if (confirm === "reject") {
        const finalReason = reason === "Other" ? reasonOther.trim() : reason;
        await api.patch(`/admin/doctors/${doctor._id}/reject`, { reason: finalReason });
        onSuccess("Doctor rejected successfully.");
      } else if (confirm === "decline") {
        await api.patch(`/admin/doctors/${doctor._id}/reject-reverification`, { reason: reason.trim() || undefined });
        onSuccess("Re-verification request declined.");
      } else {
        // revoke — always sends a reason
        const finalReason = reason === "Other" ? reasonOther.trim() : reason;
        await api.patch(`/admin/doctors/${doctor._id}/reject`, { reason: finalReason });
        onSuccess("Doctor verification revoked successfully.");
      }
    } catch {
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  const revokeInvalid = (confirm === "revoke" || confirm === "reject") && (!reason || (reason === "Other" && !reasonOther.trim()));

  const displayName   = doctor.name || u.fullName;
  const vs            = doctor.verificationStatus || "pending";
  const effectiveType = doctor.rejectionType || (doctor.verificationReason ? "revoked" : "initial");
  const vsCfg = vs === "verified"
    ? { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700", label: "Verified Doctor"         }
    : vs === "rejected" && effectiveType === "revoked"
    ? { dot: "bg-red-400",     badge: "bg-red-50 text-red-700",         label: "Verification Revoked"    }
    : vs === "rejected"
    ? { dot: "bg-red-400",     badge: "bg-red-50 text-red-700",         label: "Verification Rejected"   }
    : { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",     label: "Pending Verification"    };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={confirm ? undefined : onClose}
        />
        <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={displayName}
                photo={u.profilePhoto}
                sizeCls="h-10 w-10"
                bgCls="bg-emerald-100"
                textCls="text-sm font-bold text-emerald-700"
              />
              <div>
                <h2 className="font-semibold text-slate-900">Doctor Verification</h2>
                <p className="text-xs text-slate-400">{ensureDrPrefix(displayName)} · {doctor.doctorId || "—"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Details */}
          <dl className="space-y-3 p-6">
            <DetailRow label="Doctor Name"       value={ensureDrPrefix(displayName)} />
            <DetailRow label="Doctor ID"         value={doctor.doctorId} />
            <DetailRow label="Email Address"     value={u.email} />
            <DetailRow label="Mobile Number"     value={u.mobileNumber} />
            <DetailRow label="Hospital / Clinic" value={doctor.hospital} />
            <DetailRow label="Specialization"    value={doctor.specialization} />
            <DetailRow label="License Number"    value={doctor.licenseNumber} />
            {u.walletAddress && (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                <dt className="min-w-[140px] shrink-0 text-xs font-medium text-slate-500">Wallet Address</dt>
                <dd className="flex items-center gap-2">
                  <span className="break-all font-mono text-sm text-slate-800">{truncateWallet(u.walletAddress)}</span>
                  <div className="relative shrink-0">
                    <button
                      onClick={copyWallet}
                      title="Copy full address"
                      className="flex items-center rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Copy size={13} />
                    </button>
                    {copied && (
                      <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-white">
                        Copied!
                      </span>
                    )}
                  </div>
                </dd>
              </div>
            )}
            <DetailRow label="Registration Date" value={fmtDate(u.createdAt || doctor.createdAt)} />
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
              <dt className="min-w-[140px] shrink-0 text-xs font-medium text-slate-500">Verification Status</dt>
              <dd>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${vsCfg.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${vsCfg.dot}`} />
                  {vsCfg.label}
                </span>
              </dd>
            </div>
            {(doctor.verificationReason || doctor.rejectionReason) && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="text-xs font-semibold text-slate-500">Verification Details</div>
                <DetailRow label="Current Status" value={vsCfg.label} />
                <DetailRow label="Reason"         value={doctor.verificationReason || doctor.rejectionReason} />
                <div className="text-xs text-slate-400 italic">This information is read-only.</div>
              </div>
            )}
            {vs === "rejected" && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="text-xs font-semibold text-slate-500">
                  {effectiveType === "initial" ? "Verification Request" : "Re-Verification Request"}
                </div>
                {doctor.reVerificationRequested ? (
                  <>
                    <DetailRow label="Status"       value="Pending Admin Review" />
                    <DetailRow label="Requested On" value={fmtDate(doctor.updatedAt)} />
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                      <dt className="min-w-[140px] shrink-0 text-xs font-medium text-slate-500">Status</dt>
                      <dd>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          Not Submitted
                        </span>
                      </dd>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      {effectiveType === "initial"
                        ? "This doctor has not submitted a new verification request yet. Verification can only be approved after the doctor submits a request."
                        : "This doctor has not requested re-verification yet. Verification can only be restored after the doctor submits a re-verification request."}
                    </p>
                  </>
                )}
              </div>
            )}
          </dl>

          {/* Action bar */}
          {vs === "pending" ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirm("reject")}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setConfirm("verify")}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Verify Doctor
              </button>
            </div>
          ) : vs === "verified" ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${vsCfg.badge}`}>
                <span className={`h-2 w-2 rounded-full ${vsCfg.dot}`} />
                {vsCfg.label}
              </span>
              <button
                type="button"
                onClick={() => setConfirm("revoke")}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Revoke Verification
              </button>
            </div>
          ) : doctor.reVerificationRequested ? (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirm("decline")}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
              >
                Reject Request
              </button>
              <button
                type="button"
                onClick={() => setConfirm("verify")}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Verify Doctor
              </button>
            </div>
          ) : (
            <div className="flex justify-center border-t border-slate-100 px-6 py-4">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${vsCfg.badge}`}>
                <span className={`h-2 w-2 rounded-full ${vsCfg.dot}`} />
                {vsCfg.label}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => !busy && setConfirm(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-semibold text-slate-900">
              {confirm === "verify" ? "Confirm Verification" : confirm === "revoke" ? "Revoke Doctor Verification" : confirm === "decline" ? "Decline Re-Verification Request" : "Confirm Doctor Rejection"}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {confirm === "verify"
                ? "Please confirm that you want to verify this doctor. The doctor's account status will be updated to \"Verified Doctor\" and access will be granted according to the system's permission rules."
                : confirm === "revoke"
                ? "Are you sure you want to revoke verification for this doctor? The account status will be updated and patient-related features will be disabled."
                : confirm === "decline"
                ? "Are you sure you want to decline this re-verification request? The account will remain revoked, and the doctor can submit another request later."
                : "Are you sure you want to reject this doctor?"}
            </p>

            {/* Optional reason — shown for decline */}
            {confirm === "decline" && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Reason for Declining <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter a reason for declining this request..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>
            )}

            {/* Reason selection — shown for reject (initial) and revoke */}
            {(confirm === "reject" || confirm === "revoke") && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    {confirm === "reject" ? "Reason for Rejecting" : "Reason for Revoking Verification"} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="">Select a reason…</option>
                    {REVOKE_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {reason === "Other" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-700">
                      Additional Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={reasonOther}
                      onChange={(e) => setReasonOther(e.target.value)}
                      placeholder="Enter the reason for revoking verification..."
                      rows={3}
                      className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={busy}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy || revokeInvalid}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  confirm === "verify"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {busy ? "…" : confirm === "verify" ? "Confirm Verification" : confirm === "revoke" ? "Revoke Verification" : confirm === "decline" ? "Decline Request" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PER_PAGE = 10;

export default function AdminDoctors() {
  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/admin/doctors")
      .then((res) => setDoctors(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  function handleSuccess(message) {
    setSelected(null);
    load();
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter]);

  const filtered = useMemo(() => {
    let data = doctors;
    if (search.trim()) {
      const norm = (s) => (s || "").toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
      const q     = search.toLowerCase();
      const qNorm = norm(search);
      data = data.filter((d) => {
        const rawName     = d.name || d.user?.fullName || "";
        const displayName = ensureDrPrefix(rawName);
        return (
          norm(rawName).includes(qNorm) ||
          norm(displayName).includes(qNorm) ||
          d.doctorId?.toLowerCase().includes(q) ||
          d.user?.email?.toLowerCase().includes(q) ||
          d.specialization?.toLowerCase().includes(q) ||
          d.hospital?.toLowerCase().includes(q)
        );
      });
    }
    if (filter !== "all") {
      data = data.filter((d) => {
        const vs = d.verificationStatus || "pending";
        const et = d.rejectionType || (d.verificationReason ? "revoked" : "initial");
        if (filter === "pending")  return vs === "pending";
        if (filter === "verified") return vs === "verified";
        if (filter === "rejected") return vs === "rejected" && et === "initial";
        if (filter === "revoked")  return vs === "rejected" && et === "revoked";
        if (filter === "reverify") return d.reVerificationRequested === true;
        return true;
      });
    }
    return data;
  }, [doctors, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Doctors</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">
            {loading ? "Loading…" : `${filtered.length} of ${doctors.length} doctors`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-rose-700">
          <AlertCircle size={16} />
          <span className="text-sm">Failed to load doctors.</span>
          <button onClick={load} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Success toast */}
      {toast && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-emerald-700">
          <CheckCircle size={16} />
          <span className="text-sm">{toast}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID, specialization or hospital…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20 sm:w-36"
        >
          <option value="all">All Doctors</option>
          <option value="pending">Pending Verification</option>
          <option value="verified">Verified Doctors</option>
          <option value="rejected">Verification Rejected</option>
          <option value="revoked">Verification Revoked</option>
          <option value="reverify">Re-Verification Requested</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[840px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="w-[200px] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Doctor ID</th>
                <th className="w-[180px] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Specialization</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Wallet</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Registered</th>
                <th className="sticky right-0 border-l border-slate-100 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[40, 80, 130, 90, 100, 90, 60, 80, 32].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <Stethoscope size={28} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      {search || filter !== "all" ? "No doctors match your search." : "No doctors found."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((d) => {
                  const u = d.user || {};
                  return (
                    <tr key={d._id} className="group transition hover:bg-slate-50">
                      <td className="max-w-[200px] overflow-hidden px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar
                            name={d.name || u.fullName}
                            photo={u.profilePhoto}
                            sizeCls="h-8 w-8 shrink-0"
                            bgCls="bg-emerald-100"
                            textCls="text-xs font-semibold text-emerald-700"
                          />
                          <span
                            className="truncate font-medium text-slate-900"
                            title={ensureDrPrefix(d.name || u.fullName || "")}
                          >
                            {ensureDrPrefix(d.name || u.fullName || "")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{d.doctorId || "—"}</td>
                      <td className="max-w-[180px] overflow-hidden px-4 py-3.5">
                        <span className="block truncate text-slate-500" title={u.email || ""}>{u.email || "—"}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500">{u.mobileNumber || "—"}</td>
                      <td className="px-4 py-3.5">
                        {d.specialization ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {d.specialization}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400" title={u.walletAddress || ""}>{truncateWallet(u.walletAddress)}</td>
                      <td className="px-4 py-3.5">
                        {(() => {
                          const vs  = d.verificationStatus || "pending";
                          const et  = d.rejectionType || (d.verificationReason ? "revoked" : "initial");
                          const cfg = vs === "verified"
                            ? { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700", label: "Verified Doctor"       }
                            : vs === "rejected" && et === "revoked"
                            ? { dot: "bg-red-400",     badge: "bg-red-50 text-red-700",         label: "Verification Revoked"  }
                            : vs === "rejected"
                            ? { dot: "bg-red-400",     badge: "bg-red-50 text-red-700",         label: "Verification Rejected" }
                            : { dot: "bg-amber-400",   badge: "bg-amber-50 text-amber-700",     label: "Pending Verification"  };
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{fmtDate(u.createdAt || d.createdAt)}</td>
                      <td className="sticky right-0 border-l border-slate-100 bg-white px-4 py-3.5 transition group-hover:bg-slate-50">
                        {d.reVerificationRequested && (
                          (d.rejectionType || (d.verificationReason ? "revoked" : "initial")) === "initial"
                            ? <p className="mb-1 text-[10px] font-semibold leading-tight text-blue-600">Verification<br />Requested</p>
                            : <p className="mb-1 text-[10px] font-semibold leading-tight text-blue-600">Re-Verification<br />Request</p>
                        )}
                        <button
                          onClick={() => setSelected(d)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-mint/50 hover:text-mint"
                        >
                          <Eye size={12} />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filtered.length > PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              Page {page} of {totalPages} · {filtered.length} results
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const n = i + 1;
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition ${
                      page === n ? "bg-mint text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && <DoctorModal doctor={selected} onClose={() => setSelected(null)} onSuccess={handleSuccess} />}
    </section>
  );
}
