import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  RefreshCw,
  Search,
  Users,
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

function safeStr(val) {
  if (typeof val !== "string") return null;
  return val.trim() || null;
}

function fmtEmergencyContact(ec) {
  if (!ec || typeof ec !== "object") return null;
  const parts = [];
  if (ec.name?.trim())         parts.push(ec.name.trim());
  if (ec.relationship?.trim()) parts.push(`(${ec.relationship.trim()})`);
  if (ec.mobileNumber?.trim()) parts.push(ec.mobileNumber.trim());
  return parts.length ? parts.join(" · ") : null;
}

function fmtGender(val) {
  if (!val || typeof val !== "string") return null;
  const t = val.trim();
  if (!t) return null;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

const LOCALITY_SUFFIXES = new Set([
  "nagar", "colony", "road", "street", "lane", "sector", "phase", "block",
  "marg", "enclave", "vihar", "park", "garden", "chowk", "bazaar", "bazar",
  "puram", "ganj", "gunj", "extension", "avenue", "place", "square",
  "market", "complex", "layout", "township", "hills", "heights", "valley",
]);

function fmtAddress(val) {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  const titleWord = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

  // If commas already present, title-case each comma-separated segment
  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((seg) => seg.trim().split(/\s+/).filter(Boolean).map(titleWord).join(" "))
      .filter(Boolean)
      .join(", ");
  }

  // No commas: split into words, title-case, insert commas after locality suffix words
  // (skip split if the next word is purely numeric, e.g. "Sector 5")
  const words = trimmed.split(/\s+/).filter(Boolean);
  const segments = [];
  let current = [];

  for (let i = 0; i < words.length; i++) {
    current.push(titleWord(words[i]));
    const nextWord = words[i + 1];
    if (
      i < words.length - 1 &&
      LOCALITY_SUFFIXES.has(words[i].toLowerCase()) &&
      !/^\d+$/.test(nextWord)
    ) {
      segments.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) segments.push(current.join(" "));

  return segments.join(", ");
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

function PatientModal({ patient, onClose }) {
  const u = patient.user || {};
  const [copied, setCopied] = useState(false);

  function copyWallet() {
    if (!u.walletAddress) return;
    navigator.clipboard.writeText(u.walletAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const allergiesValue =
    (Array.isArray(patient.allergies) ? patient.allergies : [])
      .map((a) => a.trim())
      .filter(Boolean)
      .join(", ") || "No allergies recorded";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl" style={{ maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar
              name={patient.name}
              photo={u.profilePhoto}
              sizeCls="h-10 w-10"
              bgCls="bg-blue-100"
              textCls="text-sm font-bold text-blue-700"
            />
            <div>
              <h2 className="font-semibold text-slate-900">{patient.name || u.fullName}</h2>
              <p className="text-xs text-slate-400">Patient ID: {patient.patientId || "—"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <dl className="space-y-3 p-6">
          <DetailRow label="Patient ID" value={patient.patientId} />
          <DetailRow label="Full Name"  value={patient.name || u.fullName} />
          <DetailRow label="Email"      value={u.email} />
          <DetailRow label="Phone"      value={u.mobileNumber} />

          {/* Wallet Address — shortened with copy button */}
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

          {/* Optional patient information — hidden when missing/blank */}
          <DetailRow label="Date of Birth"      value={patient.dob ? fmtDate(patient.dob) : null} />
          <DetailRow label="Gender"             value={fmtGender(patient.gender)} />
          <DetailRow label="Blood Group"        value={safeStr(patient.bloodGroup)} />
          <DetailRow label="Allergies"          value={allergiesValue} />
          <DetailRow label="Emergency Contact"  value={fmtEmergencyContact(patient.emergencyContact)} />
          <DetailRow label="Address"            value={fmtAddress(patient.address)} />

          <DetailRow label="Account Status" value={u.isActive ? "Active" : "Inactive"} />
          <DetailRow label="Registered"     value={fmtDate(u.createdAt || patient.createdAt)} />
        </dl>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PER_PAGE = 10;

export default function AdminPatients() {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/admin/patients")
      .then((res) => setPatients(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset page when search/filter changes
  useEffect(() => { setPage(1); }, [search, filter]);

  const filtered = useMemo(() => {
    let data = patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.patientId?.toLowerCase().includes(q) ||
          p.user?.email?.toLowerCase().includes(q) ||
          p.user?.mobileNumber?.toLowerCase().includes(q)
      );
    }
    if (filter === "active")   data = data.filter((p) => p.user?.isActive);
    if (filter === "inactive") data = data.filter((p) => !p.user?.isActive);
    return data;
  }, [patients, search, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged      = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Patients</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-300">
            {loading ? "Loading…" : `${filtered.length} of ${patients.length} patients`}
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
          <span className="text-sm">Failed to load patients.</span>
          <button onClick={load} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, ID or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20"
          />
        </div>
        {/* Status filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/20 sm:w-36"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Patient ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Email</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Wallet</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Registered</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {[40, 80, 130, 90, 90, 60, 80, 32].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: w }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Users size={28} className="mx-auto mb-2 text-slate-200" />
                    <p className="text-sm text-slate-400">
                      {search || filter !== "all" ? "No patients match your search." : "No patients found."}
                    </p>
                  </td>
                </tr>
              ) : (
                paged.map((p) => {
                  const u = p.user || {};
                  return (
                    <tr key={p._id} className="transition hover:bg-slate-50">
                      {/* Avatar + Name */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={p.name || u.fullName}
                            photo={u.profilePhoto}
                            sizeCls="h-8 w-8"
                            bgCls="bg-blue-100"
                            textCls="text-xs font-semibold text-blue-700"
                          />
                          <span className="font-medium text-slate-900">{p.name || u.fullName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-600">{p.patientId || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{u.email || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-500">{u.mobileNumber || "—"}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{truncateWallet(u.walletAddress)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-400" : "bg-rose-400"}`} />
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{fmtDate(u.createdAt || p.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => setSelected(p)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-mint/50 hover:text-mint"
                        >
                          <Eye size={12} />
                          View
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
                      page === n
                        ? "bg-mint text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
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
      {selected && <PatientModal patient={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
