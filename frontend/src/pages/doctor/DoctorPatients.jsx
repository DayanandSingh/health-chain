import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  FileText,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  Users,
  Wallet,
} from "lucide-react";
import api from "../../services/api";

// ─── Avatar gradients (deterministic from name) ────────────────────────────────
const GRADIENTS = [
  ["from-blue-400   to-blue-600",   "bg-blue-500"],
  ["from-emerald-400 to-emerald-600","bg-emerald-500"],
  ["from-purple-400 to-purple-600", "bg-purple-500"],
  ["from-rose-400   to-rose-600",   "bg-rose-500"],
  ["from-amber-400  to-amber-600",  "bg-amber-500"],
  ["from-indigo-400 to-indigo-600", "bg-indigo-500"],
  ["from-teal-400   to-teal-600",   "bg-teal-500"],
  ["from-cyan-400   to-cyan-600",   "bg-cyan-500"],
];

function pickGradient(name) {
  return GRADIENTS[(name || "?").charCodeAt(0) % GRADIENTS.length];
}

function getInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortWallet(addr) {
  if (!addr || addr.length < 14) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Determine displayed permission status
function getStatus(item) {
  const now = new Date();
  if (item.isActive === false) return "revoked";
  if (item.expiresAt && new Date(item.expiresAt) < now) return "expired";
  return "active";
}

// Days until expiry (null if no expiry)
function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  return Math.ceil((new Date(expiresAt) - Date.now()) / 86_400_000);
}

// ─── Badge configs ─────────────────────────────────────────────────────────────
const STATUS_BADGE = {
  active:  { cls: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: ShieldCheck, label: "Active"  },
  expired: { cls: "border-amber-200  bg-amber-50  text-amber-700",    Icon: ShieldAlert, label: "Expired" },
  revoked: { cls: "border-red-200    bg-red-50    text-red-700",      Icon: ShieldOff,   label: "Revoked" },
};

const ACCESS_BADGE = {
  view_only:     { cls: "border-blue-200   bg-blue-50   text-blue-700",   label: "View Only"        },
  view_download: { cls: "border-teal-200   bg-teal-50   text-teal-700",   label: "View & Download"  },
  read_write:    { cls: "border-purple-200 bg-purple-50 text-purple-700", label: "Read & Write"     },
};

// ─── PatientAvatar ─────────────────────────────────────────────────────────────
// Shows a real photo if photoUrl is provided (with graceful onError fallback),
// otherwise shows a gradient-initials avatar.
function PatientAvatar({ name, photoUrl, size = 64 }) {
  const [imgError, setImgError] = useState(false);
  const [gradient, accent]      = pickGradient(name);
  const initials                = getInitials(name);

  const dimension = `h-[${size}px] w-[${size}px]`;

  const showPhoto = photoUrl && !imgError;

  return (
    <div
      className="shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-md"
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} font-bold text-white select-none`}
          style={{ fontSize: size * 0.32 }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* top strip */}
      <div className="h-1 w-full animate-pulse bg-slate-100" />
      <div className="p-5 space-y-4">
        {/* header row */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
        {/* divider */}
        <div className="h-px bg-slate-100" />
        {/* contact rows */}
        <div className="space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
        {/* meta box */}
        <div className="h-28 animate-pulse rounded-xl bg-slate-50" />
        {/* buttons */}
        <div className="grid grid-cols-2 gap-2">
          <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Info row inside the meta box ──────────────────────────────────────────────
function MetaRow({ label, value, valueClass = "font-medium text-slate-700" }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className={`min-w-0 truncate text-right text-xs ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── Patient Card ─────────────────────────────────────────────────────────────
function PatientCard({ item }) {
  const pat    = item.patient || {};
  const user   = pat.user    || {};
  const name   = pat.name    || user.fullName || "Unknown Patient";
  const patId  = pat.patientId           || "—";
  const email  = user.email              || "";
  const wallet = user.walletAddress      || "";

  const photoUrl = user.profilePhoto || null;

  const status   = getStatus(item);
  const statusCfg = STATUS_BADGE[status] || STATUS_BADGE.active;
  const StatusIcon = statusCfg.Icon;

  const accessCfg   = ACCESS_BADGE[item.accessLevel] || ACCESS_BADGE.view_only;

  const days        = daysUntilExpiry(item.expiresAt);
  const expirySoon  = days !== null && days <= 7 && days >= 0;
  const expiryValueClass = expirySoon
    ? "font-semibold text-amber-600"
    : status === "expired"
    ? "font-semibold text-red-600"
    : "font-medium text-slate-700";

  // Accent strip color per status
  const stripCls = {
    active:  "bg-emerald-400",
    expired: "bg-amber-400",
    revoked: "bg-red-400",
  }[status];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-lg">

      {/* Accent strip */}
      <div className={`h-1 w-full ${stripCls} transition-all duration-200 group-hover:h-1.5`} />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* ── Header: avatar + name + badges ──────────────────────────── */}
        <div className="flex items-start gap-4">
          <PatientAvatar name={name} photoUrl={photoUrl} size={60} />

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="truncate text-[15px] font-bold leading-snug text-slate-900">{name}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-400">#{patId}</p>

            {/* Badges row */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {/* Status badge */}
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${statusCfg.cls}`}>
                <StatusIcon size={10} />
                {statusCfg.label}
              </span>
              {/* Access level badge */}
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${accessCfg.cls}`}>
                {accessCfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* ── Divider ─────────────────────────────────────────────────── */}
        <div className="h-px bg-slate-100" />

        {/* ── Contact info ─────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          {email ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Mail size={11} className="shrink-0 text-slate-400" />
              <span className="min-w-0 truncate">{email}</span>
            </div>
          ) : null}
          {wallet ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Wallet size={11} className="shrink-0 text-slate-400" />
              <span className="font-mono tracking-tight">{shortWallet(wallet)}</span>
            </div>
          ) : null}
          {!email && !wallet && (
            <p className="text-xs italic text-slate-400">No contact info on file</p>
          )}
        </div>

        {/* ── Permission meta box ───────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 divide-y divide-slate-100">
          <MetaRow
            label="Access Level"
            value={accessCfg.label}
            valueClass="font-semibold text-slate-900"
          />
          <MetaRow
            label="Granted On"
            value={fmtDate(item.grantedAt)}
          />
          <MetaRow
            label="Expiry Date"
            value={
              item.expiresAt
                ? expirySoon
                  ? `${fmtDate(item.expiresAt)} · ${days}d left`
                  : fmtDate(item.expiresAt)
                : "No expiry"
            }
            valueClass={expiryValueClass}
          />
          <MetaRow
            label="Last Updated"
            value={fmtDate(item.grantedAt)}
          />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Link
            to="/doctor/shared-records"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-mint px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-mint/90 active:scale-95"
          >
            <FileText size={13} />
            View Records
          </Link>
          <Link
            to="/doctor/notes"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
          >
            <ClipboardList size={13} />
            Add Note
          </Link>
        </div>

      </div>
    </article>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DoctorPatients() {
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [search,   setSearch]   = useState("");

  const fetchPatients = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/doctor/patients")
      .then((res) => setPatients(res.data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q    = search.toLowerCase();
    const name = (p.patient?.name || p.patient?.user?.fullName || "").toLowerCase();
    const pid  = (p.patient?.patientId || "").toLowerCase();
    return name.includes(q) || pid.includes(q);
  });

  return (
    <section className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Patients</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Patients who have granted you secure access to their medical records.
          </p>
        </div>
        <button
          onClick={fetchPatients}
          disabled={loading}
          className="btn-secondary gap-2 self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={15} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
        <input
          type="text"
          placeholder="Search by patient name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="field !pl-9"
        />
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
            <AlertCircle size={30} className="text-red-300" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Unable to load patients</p>
            <p className="mt-1 text-sm text-slate-400">
              Please check your connection and try again.
            </p>
          </div>
          <button onClick={fetchPatients} className="btn-secondary gap-2">
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* ── Loading skeletons ────────────────────────────────────────────── */}
      {loading && !error && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-100 bg-white px-8 py-16 text-center shadow-sm">
          {/* Layered illustration */}
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-50">
              <Users size={44} className="text-slate-300" />
            </div>
            {/* decorative dots */}
            <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-white bg-mint/30" />
            <span className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full border-2 border-white bg-blue-200" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-700">
              {search ? "No Patients Found" : "No Patients Yet"}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
              {search
                ? `No patient matches "${search}". Try a different name or patient ID.`
                : "No patient has granted you access yet. Patients will appear here automatically once they share their records with you."}
            </p>
          </div>

          {!search && (
            <button onClick={fetchPatients} className="btn-secondary gap-2">
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      )}

      {/* ── Patient count label + cards ───────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span>{" "}
            patient{filtered.length !== 1 ? "s" : ""} with active access
          </p>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => (
              <PatientCard key={String(item.permissionId)} item={item} />
            ))}
          </div>
        </>
      )}

    </section>
  );
}
