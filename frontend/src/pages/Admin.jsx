import { useCallback, useEffect, useState } from "react";
import { ensureDrPrefix } from "../utils/drName";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Calendar,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  Download,
  Eye,
  FileEdit,
  FileText,
  Globe,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  ShieldOff,
  Stethoscope,
  Trash2,
  Upload,
  User,
  UserCog,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { ADMIN_ID } from "../constants/adminConstants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

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

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtRegDate(iso) {
  if (!iso) return "—";
  const date          = new Date(iso);
  const now           = new Date();
  const todayStart    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);

  if (date >= todayStart) {
    const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `Today • ${time}`;
  }
  if (date >= yesterdayStart) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Activity meta map ────────────────────────────────────────────────────────

const ACTIVITY_META = {
  REGISTER:           { label: "Patient Registered",         Icon: UserPlus,     bg: "bg-teal-50",    fg: "text-teal-600"    },
  LOGIN:              { label: "User Logged In",             Icon: LogIn,        bg: "bg-blue-50",    fg: "text-blue-600"    },
  LOGOUT:             { label: "User Logged Out",            Icon: LogOut,       bg: "bg-slate-100",  fg: "text-slate-500"   },
  PROFILE_UPDATE:     { label: "Profile Updated",            Icon: UserCog,      bg: "bg-sky-50",     fg: "text-sky-600"     },
  PHOTO_UPDATE:       { label: "Profile Photo Updated",      Icon: Camera,       bg: "bg-sky-50",     fg: "text-sky-500"     },
  RECORD_UPLOAD:      { label: "Medical Record Uploaded",    Icon: Upload,       bg: "bg-indigo-50",  fg: "text-indigo-600"  },
  RECORD_DELETE:      { label: "Medical Record Deleted",     Icon: Trash2,       bg: "bg-rose-50",    fg: "text-rose-600"    },
  RECORD_VIEW:        { label: "Medical Record Viewed",      Icon: Eye,          bg: "bg-slate-100",  fg: "text-slate-500"   },
  RECORD_UPDATE:      { label: "Medical Record Updated",     Icon: FileEdit,     bg: "bg-violet-50",  fg: "text-violet-600"  },
  RECORD_DOWNLOAD:    { label: "Medical Record Downloaded",  Icon: Download,     bg: "bg-cyan-50",    fg: "text-cyan-600"    },
  ACCESS_GRANT:       { label: "Access Granted",             Icon: ShieldCheck,  bg: "bg-emerald-50", fg: "text-emerald-600" },
  ACCESS_REVOKE:      { label: "Access Revoked",             Icon: ShieldOff,    bg: "bg-rose-50",    fg: "text-rose-600"    },
  PERMISSION_EXPIRED: { label: "Permission Expired",         Icon: Clock,        bg: "bg-amber-50",   fg: "text-amber-600"   },
  NOTE_CREATED:       { label: "Medical Note Created",       Icon: ClipboardList,bg: "bg-purple-50",  fg: "text-purple-600"  },
  NOTE_UPDATED:       { label: "Medical Note Updated",       Icon: Pencil,       bg: "bg-orange-50",  fg: "text-orange-500"  },
  NOTE_DELETED:       { label: "Medical Note Deleted",       Icon: Trash2,       bg: "bg-rose-50",    fg: "text-rose-600"    },
  VERIFY_RECORD:        { label: "Record Verified on Chain",   Icon: BadgeCheck,   bg: "bg-teal-50",    fg: "text-teal-600"    },
  DOCTOR_REGISTRATION:  { label: "New Doctor Registration",    Icon: Stethoscope,  bg: "bg-emerald-50", fg: "text-emerald-600" },
  DOCTOR_VERIFIED:            { label: "Doctor Verified",              Icon: BadgeCheck,  bg: "bg-blue-50",    fg: "text-blue-600"    },
  DOCTOR_REVOKED:             { label: "Doctor Verification Revoked",  Icon: ShieldOff,   bg: "bg-rose-50",    fg: "text-rose-600"    },
  REVERIFICATION_REQUESTED:   { label: "Re-Verification Request",      Icon: RefreshCw,   bg: "bg-sky-50",     fg: "text-sky-600"     },
  DOCTOR_REVERIFIED:          { label: "Doctor Re-Verified",           Icon: BadgeCheck,  bg: "bg-blue-50",    fg: "text-blue-600"    },
  REVERIFICATION_DECLINED:    { label: "Re-Verification Declined",     Icon: ShieldOff,   bg: "bg-rose-50",    fg: "text-rose-600"    },
  DOCTOR_INITIAL_REJECTED:    { label: "Doctor Verification Rejected",  Icon: ShieldOff,   bg: "bg-rose-50",    fg: "text-rose-600"    },
  INITIAL_VERIFICATION_REQUESTED: { label: "Verification Request Received", Icon: RefreshCw, bg: "bg-sky-50",   fg: "text-sky-600"     },
};

function cleanDrName(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/Dr\. Dr\b/g, "Dr.").replace(/Dr\. Doctor\b/g, "Doctor");
}

function buildActivityDesc(ev) {
  const actor  = cleanDrName(ev.actorName || "Unknown");
  const role   = ev.actorRole;
  const target = cleanDrName(ev.targetUserName);
  const rec    = ev.recordTitle;

  // actor already carries "Dr. " prefix for doctors (stored at write time).
  // For patients, actorName is stored as plain fullName OR "Patient fullName".
  // pa normalises to always "Patient name" for patients, unchanged for others.
  const pa = (actor.startsWith("Patient ") || role !== "patient") ? actor : `Patient ${actor}`;

  switch (ev.action) {
    case "REGISTER":         return `${pa} created a new account`;
    case "LOGIN":
      if (role === "admin")  return `${actor} logged into the admin dashboard`;
      if (role === "doctor") return `${actor} logged into the doctor portal`;
      return `${pa} logged into the patient portal`;
    case "LOGOUT":
      if (role === "doctor") return `${actor} logged out from the doctor portal`;
      return `${pa} logged out from the patient portal`;
    case "PROFILE_UPDATE":   return `${pa} updated profile information`;
    case "PHOTO_UPDATE":     return `${pa} updated profile photo`;
    case "RECORD_UPLOAD":    return rec ? `${pa} uploaded "${rec}"` : `${pa} uploaded a medical record`;
    case "RECORD_DELETE":    return rec ? `${pa} deleted "${rec}"` : `${pa} deleted a medical record`;
    case "RECORD_VIEW":
      if (rec && target) return `${pa} viewed "${rec}" of Patient ${target}`;
      if (rec)           return `${pa} viewed "${rec}"`;
      if (target)        return `${pa} viewed a medical record of Patient ${target}`;
      return `${pa} viewed a medical record`;
    case "RECORD_UPDATE":    return rec ? `${pa} updated "${rec}"` : `${pa} updated a medical record`;
    case "RECORD_DOWNLOAD":
      if (rec && target) return `${pa} downloaded "${rec}" of Patient ${target}`;
      return rec ? `${pa} downloaded "${rec}"` : `${pa} downloaded a medical record`;
    case "ACCESS_GRANT":     return target ? `${pa} granted ${ensureDrPrefix(target)} access to medical records` : `${pa} granted record access`;
    case "ACCESS_REVOKE":    return target ? `${pa} revoked ${ensureDrPrefix(target)}'s access to medical records` : `${pa} revoked record access`;
    case "PERMISSION_EXPIRED": return target ? `Access for ${ensureDrPrefix(target)} has expired` : "A record access permission has expired";
    case "NOTE_CREATED":     return target ? `${actor} created a medical note for Patient ${target}` : `${actor} created a medical note`;
    case "NOTE_UPDATED":     return target ? `${actor} updated a medical note for Patient ${target}` : `${actor} updated a medical note`;
    case "NOTE_DELETED":     return target ? `${actor} deleted a medical note for Patient ${target}` : `${actor} deleted a medical note`;
    case "VERIFY_RECORD":        return rec ? `"${rec}" was verified on blockchain` : `${actor} verified a record on blockchain`;
    case "DOCTOR_REGISTRATION":  return `${actor} has registered a new doctor account. Please review the account for verification.`;
    case "DOCTOR_VERIFIED":            return target ? `${target} has been successfully verified.` : "Doctor has been successfully verified.";
    case "DOCTOR_REVOKED":             return target ? `${target}'s verification has been revoked.${rec ? ` Reason: ${rec}.` : ""}` : "Doctor verification revoked.";
    case "REVERIFICATION_REQUESTED":   return `${actor} has requested account re-verification. Review the request to restore account access.`;
    case "DOCTOR_REVERIFIED":          return target ? `${target} has been successfully re-verified.` : "Doctor has been successfully re-verified.";
    case "REVERIFICATION_DECLINED":         return target ? `Administrator declined the re-verification request for ${target}.` : "Re-verification request declined.";
    case "DOCTOR_INITIAL_REJECTED":         return target ? `Administrator rejected the verification request for ${target}.${rec ? ` Reason: ${rec}.` : ""}` : "Doctor verification request rejected.";
    case "INITIAL_VERIFICATION_REQUESTED":  return `${actor} has submitted a new verification request. Review the request to verify account access.`;
    default:                                return `${actor} performed a system action`;
  }
}

// ─── Stat card definitions ────────────────────────────────────────────────────

function buildStatCards(stats) {
  return [
    { label: "Total Patients",     subtitle: "Registered patients",    value: stats?.totalPatients     ?? "—", Icon: Users,        gradient: "from-blue-50 to-blue-100",      fg: "text-blue-600"    },
    { label: "Total Doctors",      subtitle: "Registered doctors",     value: stats?.totalDoctors      ?? "—", Icon: Stethoscope,  gradient: "from-emerald-50 to-emerald-100", fg: "text-emerald-600" },
    { label: "Medical Records",    subtitle: "Stored health records",  value: stats?.totalRecords      ?? "—", Icon: FileText,     gradient: "from-purple-50 to-purple-100",   fg: "text-purple-600"  },
    { label: "Active Permissions", subtitle: "Currently shared",       value: stats?.activePermissions ?? "—", Icon: KeyRound,     gradient: "from-amber-50 to-amber-100",     fg: "text-amber-600"   },
    { label: "Medical Notes",      subtitle: "Doctor-created notes",   value: stats?.medicalNotes      ?? "—", Icon: ClipboardList,gradient: "from-indigo-50 to-indigo-100",   fg: "text-indigo-600"  },
    { label: "Active Users",       subtitle: "Patients & Doctors",     value: stats?.activeUsers       ?? "—", Icon: User,         gradient: "from-teal-50 to-teal-100",       fg: "text-teal-600"    },
  ];
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Patients",        Icon: Users,       to: "/admin/patients",    desc: "View all registered patients"  },
  { label: "Doctors",         Icon: Stethoscope, to: "/admin/doctors",     desc: "View all registered doctors"   },
  { label: "Medical Records", Icon: FileText,       to: "/admin/records",       desc: "Browse all medical records"    },
  { label: "Doctor Notes",   Icon: ClipboardList, to: "/admin/doctor-notes",  desc: "Browse all doctor notes"       },
  { label: "Permissions",    Icon: KeyRound,      to: "/admin/permissions",   desc: "Review access permissions"     },
  { label: "Audit Logs",      Icon: Activity,    to: "/admin/audit",       desc: "View full system audit trail"  },
  { label: "Profile",         Icon: User,        to: "/admin/profile",     desc: "Manage admin account"          },
];

// ─── Small sub-components ─────────────────────────────────────────────────────

function Skeleton({ className, style }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} style={style} />;
}

function RoleBadge({ role }) {
  const cfg = {
    patient:        { cls: "bg-blue-50 text-blue-700",      label: "Patient"        },
    doctor:         { cls: "bg-emerald-50 text-emerald-700", label: "Doctor"         },
    admin:          { cls: "bg-purple-50 text-purple-700",   label: "Admin"          },
    system_admin:   { cls: "bg-purple-50 text-purple-700",   label: "System Admin"   },
    hospital_admin: { cls: "bg-indigo-50 text-indigo-700",   label: "Hospital Admin" },
  }[role] || { cls: "bg-slate-50 text-slate-700", label: role || "Unknown" };

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function HealthDot({ status }) {
  const dot   = status === "operational" ? "bg-emerald-400" : status === "degraded" ? "bg-amber-400" : "bg-rose-400";
  const text  = status === "operational" ? "text-emerald-600" : status === "degraded" ? "text-amber-600" : "text-rose-600";
  const label = status === "operational" ? "Operational" : status === "degraded" ? "Degraded" : "Down";
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${text}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useAuth();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(false);
  const [activities, setActivities] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .get("/admin/dashboard")
      .then((res) => {
        setData(res.data.data);
        setActivities(res.data.data?.recentActivity || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll only the activity feed every 15 s — no loading state, no flicker
  useEffect(() => {
    const id = setInterval(() => {
      api
        .get("/admin/dashboard")
        .then((res) => setActivities(res.data.data?.recentActivity || []))
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  // Profile photo — same localStorage key as Profile.jsx
  const uid      = user?.id;
  const photoUrl = uid ? localStorage.getItem(`profilePhoto_${uid}`) : null;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const stats         = data?.stats;
  const registrations = data?.recentRegistrations || [];
  const loginSummary  = data?.loginSummary        || {};
  const systemHealth  = data?.systemHealth        || {};
  const lastLogin     = data?.lastLogin;

  const statCards = buildStatCards(stats);

  // Distribution bars — relative to the highest stat value
  const statValues = stats
    ? [stats.totalPatients, stats.totalDoctors, stats.totalRecords,
       stats.activePermissions, stats.medicalNotes, stats.activeUsers]
    : [];
  const maxStat = statValues.length ? Math.max(...statValues, 1) : 1;

  const distItems = [
    { label: "Patients",     value: stats?.totalPatients,     bar: "bg-blue-400"    },
    { label: "Doctors",      value: stats?.totalDoctors,      bar: "bg-emerald-400" },
    { label: "Records",      value: stats?.totalRecords,      bar: "bg-purple-400"  },
    { label: "Permissions",  value: stats?.activePermissions, bar: "bg-amber-400"   },
    { label: "Notes",        value: stats?.medicalNotes,      bar: "bg-indigo-400"  },
    { label: "Active Users", value: stats?.activeUsers,       bar: "bg-teal-400"    },
  ];

  const healthItems = [
    { label: "Backend API",    Icon: Server,   key: "backend"       },
    { label: "Database",       Icon: Database, key: "database"      },
    { label: "Blockchain",     Icon: Zap,      key: "blockchain"    },
    { label: "API Gateway",    Icon: Globe,    key: "api"           },
    { label: "Wallet Service", Icon: Shield,   key: "walletService" },
  ];

  const allHealthy =
    !loading &&
    Object.keys(systemHealth).length > 0 &&
    healthItems.every((h) => systemHealth[h.key] === "operational");

  const adminRoleLabel = "Administrator";

  const adminId = ADMIN_ID;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <section className="space-y-6">

      {/* ── Welcome Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-slate-800 to-slate-700 p-6 text-white shadow-card">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 right-20 h-20 w-20 rounded-full bg-mint/10" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={user?.fullName}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mint/20 text-lg font-bold text-mint ring-2 ring-white/20">
                {initials(user?.fullName)}
              </div>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold">{user?.fullName || "Admin"}</h1>
                <span className="rounded-full bg-mint/20 px-2.5 py-0.5 text-xs font-semibold text-mint">
                  {adminRoleLabel}
                </span>
              </div>
              <div className="mt-2 space-y-0.5 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Role:&nbsp;</span>
                  {adminRoleLabel}
                </p>
                <p>
                  <span className="text-slate-500">Admin ID:&nbsp;</span>
                  {adminId}
                </p>
                <p>
                  <span className="text-slate-500">Email:&nbsp;</span>
                  {user?.email || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-300 sm:text-right">
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Calendar size={13} className="text-mint" />
              <span className="font-medium text-white">{today}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 sm:justify-end">
              <Clock size={13} className="text-slate-400" />
              <span>Last login:&nbsp;{loading ? "…" : fmtDateTime(lastLogin)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertCircle size={16} />
            <span className="text-sm font-medium">Failed to load dashboard data.</span>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {/* ── System Overview — 6 Stat Cards ──────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">System Overview</h2>
          {!loading && !error && (
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                  <div className="mb-3 flex items-start justify-between">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <Skeleton className="h-7 w-10" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            : statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient}`}>
                      <card.Icon size={20} className={card.fg} />
                    </div>
                    <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-600">{card.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{card.subtitle}</p>
                </div>
              ))}
        </div>
      </div>

      {/* ── Recent Activity + Compact Registrations ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Recent System Activity (timeline) */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Recent System Activity</h2>
            <span className="text-xs text-slate-400">Latest 10 events</span>
          </div>
          <div className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-4">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="mb-2 h-3.5 w-28" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <Skeleton className="h-3 w-12 shrink-0" />
                  </div>
                ))
              : activities.length === 0
              ? (
                  <div className="flex flex-col items-center gap-2 py-14 text-center">
                    <Activity size={28} className="text-slate-200" />
                    <p className="text-sm text-slate-400">No activity logged yet.</p>
                  </div>
                )
              : activities.map((ev) => {
                  const meta = ACTIVITY_META[ev.action] || ACTIVITY_META.LOGIN;
                  const { Icon } = meta;
                  return (
                    <div key={ev._id} className="flex items-start gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                        <Icon size={14} className={meta.fg} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">{meta.label}</p>
                          <span className="shrink-0 text-xs text-slate-400">{timeAgo(ev.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 line-clamp-4 text-xs text-slate-500">{buildActivityDesc(ev)}</p>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>

        {/* Compact Registrations list */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">New Registrations</h2>
            <span className="text-xs text-slate-400">Latest 8</span>
          </div>
          <div className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="mb-1.5 h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-14 shrink-0 rounded-full" />
                  </div>
                ))
              : registrations.length === 0
              ? (
                  <div className="flex flex-col items-center gap-2 py-14 text-center">
                    <Users size={28} className="text-slate-200" />
                    <p className="text-sm text-slate-400">No registrations yet.</p>
                  </div>
                )
              : registrations.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                    <Avatar
                      name={u.fullName}
                      photo={u.profilePhoto}
                      sizeCls="h-8 w-8"
                      bgCls="bg-slate-100"
                      textCls="text-xs font-semibold text-slate-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{u.fullName}</p>
                      <p className="text-xs text-slate-400">{fmtRegDate(u.createdAt)}</p>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                ))}
          </div>
        </div>
      </div>

      {/* ── Distribution Overview (Quick Statistics) ─────────────────────────── */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Distribution Overview</h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <div className="mb-1.5 flex justify-between">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3.5 w-5" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))
              : distItems.map((item) => {
                  const pct = maxStat > 0 ? Math.round(((item.value ?? 0) / maxStat) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">{item.label}</span>
                        <span className="text-xs font-bold text-slate-900">{item.value ?? 0}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${item.bar}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {QUICK_ACTIONS.map((action) => {
            const body = (
              <>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 transition group-hover:bg-mint/10">
                  <action.Icon size={20} className="text-slate-500 transition group-hover:text-mint" />
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{action.desc}</p>
                </div>
                {!action.to && (
                  <span className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Coming Soon
                  </span>
                )}
              </>
            );

            return action.to ? (
              <Link
                key={action.label}
                to={action.to}
                className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-mint/30 hover:shadow-card-hover"
              >
                {body}
              </Link>
            ) : (
              <div
                key={action.label}
                className="flex flex-col rounded-2xl border border-slate-100 bg-white/60 p-4 opacity-60"
              >
                {body}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Login Summary ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
        <h2 className="mb-4 font-semibold text-slate-900">Today's Login Summary</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Logins",   value: loginSummary.todayTotal    ?? 0, bg: "bg-slate-50",    text: "text-slate-900"   },
              { label: "Patient Logins", value: loginSummary.patientLogins ?? 0, bg: "bg-blue-50",     text: "text-blue-700"    },
              { label: "Doctor Logins",  value: loginSummary.doctorLogins  ?? 0, bg: "bg-emerald-50",  text: "text-emerald-700" },
              { label: "Admin Logins",   value: loginSummary.adminLogins   ?? 0, bg: "bg-purple-50",   text: "text-purple-700"  },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex flex-col items-center justify-center rounded-xl p-4 text-center ${item.bg}`}
              >
                <div className={`text-2xl font-bold ${item.text}`}>{item.value}</div>
                <div className="mt-1 text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </section>
  );
}
