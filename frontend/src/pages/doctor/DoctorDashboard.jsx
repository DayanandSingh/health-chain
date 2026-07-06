import { Link, useNavigate } from "react-router-dom";
import { ensureDrPrefix } from "../../utils/drName";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Check,
  ClipboardCopy,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Pencil,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Stethoscope,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

// ─── Avatar helpers ────────────────────────────────────────────────────────────
const GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-rose-500 to-rose-600",
  "from-amber-500 to-amber-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
  "from-cyan-500 to-cyan-600",
];
function docInitials(name) {
  return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
function docGradient(name) {
  return GRADIENTS[(name || "?").charCodeAt(0) % GRADIENTS.length];
}
function truncateWallet(addr) {
  if (!addr) return "";
  return addr.length <= 14 ? addr : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Fix Latin-1 mojibake: multer decodes UTF-8 filenames as Latin-1, turning
// each UTF-8 multi-byte sequence into C1 control characters. For example,
// UTF-8 em dash (bytes E2 80 94) becomes U+00E2 U+0080 U+0094 in JS strings.
// All patterns use \uXXXX escapes so source-file encoding is irrelevant.
function sanitize(str) {
  if (!str) return str;
  return str
    .replace(/\u00e2\u0080\u0094/g, "-")  // em dash
    .replace(/\u00e2\u0080\u0093/g, "-")  // en dash
    .replace(/\u00e2\u0080\u0099/g, "'")  // right single quote
    .replace(/\u00e2\u0080\u0098/g, "'")  // left single quote
    .replace(/\u00e2\u0080\u009c/g, '"')  // left double quote
    .replace(/\u00e2\u0080\u009d/g, '"')  // right double quote
    .replace(/\u00e2\u0080[\s\S]/g, ""); // remove any remaining fragments
}
function cleanDrName(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/Dr\. Dr\b/g, "Dr.").replace(/Dr\. Doctor\b/g, "Doctor");
}
function formatTimestamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m} min ago`;
  const timeStr  = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const eventDay  = new Date(date); eventDay.setHours(0, 0, 0, 0);
  if (eventDay.getTime() === today.getTime())     return `Today • ${timeStr}`;
  if (eventDay.getTime() === yesterday.getTime()) return `Yesterday • ${timeStr}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// iconBg / iconFg give each action type its own visual identity in the timeline.
const ACTION_META = {
  LOGIN:              { label: "Logged In",                 icon: User,         iconBg: "from-slate-50 to-slate-100",     iconFg: "text-slate-500"   },
  RECORD_VIEW:        { label: "Viewed Patient Record",     icon: Eye,          iconBg: "from-blue-50 to-blue-100",       iconFg: "text-blue-600"    },
  RECORD_UPLOAD:      { label: "Record Uploaded",           icon: Upload,       iconBg: "from-blue-50 to-blue-100",       iconFg: "text-blue-600"    },
  RECORD_DELETE:      { label: "Record Deleted",            icon: FileText,     iconBg: "from-rose-50 to-rose-100",       iconFg: "text-rose-600"    },
  RECORD_DOWNLOAD:    { label: "Downloaded Medical Record", icon: Download,     iconBg: "from-emerald-50 to-emerald-100", iconFg: "text-emerald-600" },
  RECORD_UPDATE:      { label: "Record Updated",            icon: FileText,     iconBg: "from-blue-50 to-blue-100",       iconFg: "text-blue-600"    },
  ACCESS_GRANT:       { label: "Access Granted",            icon: ShieldCheck,  iconBg: "from-teal-50 to-teal-100",       iconFg: "text-teal-600"    },
  ACCESS_REVOKE:      { label: "Access Revoked",            icon: ShieldOff,    iconBg: "from-rose-50 to-rose-100",       iconFg: "text-rose-600"    },
  PERMISSION_EXPIRED: { label: "Permission Expired",        icon: ShieldAlert,  iconBg: "from-orange-50 to-orange-100",   iconFg: "text-orange-500"  },
  NOTE_CREATED:       { label: "Medical Note Created",      icon: ClipboardList,iconBg: "from-purple-50 to-purple-100",   iconFg: "text-purple-600"  },
  NOTE_UPDATED:       { label: "Medical Note Updated",      icon: Pencil,       iconBg: "from-amber-50 to-amber-100",     iconFg: "text-amber-600"   },
  NOTE_DELETED:       { label: "Medical Note Deleted",      icon: FileText,     iconBg: "from-rose-50 to-rose-100",       iconFg: "text-rose-600"    },
  VERIFY_RECORD:        { label: "Record Verified",           icon: Stethoscope,  iconBg: "from-indigo-50 to-indigo-100",   iconFg: "text-indigo-600"  },
  ACCOUNT_CREATED:      { label: "Account Created",           icon: Check,        iconBg: "from-emerald-50 to-emerald-100", iconFg: "text-emerald-600" },
  VERIFICATION_PENDING: { label: "Verification Pending",      icon: Shield,       iconBg: "from-amber-50 to-amber-100",     iconFg: "text-amber-600"   },
  ACCOUNT_VERIFIED:           { label: "Account Verified",           icon: ShieldCheck, iconBg: "from-blue-50 to-blue-100",   iconFg: "text-blue-600"  },
  VERIFICATION_REVOKED:       { label: "Verification Revoked",       icon: ShieldOff,   iconBg: "from-rose-50 to-rose-100",   iconFg: "text-rose-600"  },
  REVERIFICATION_REQUESTED:   { label: "Re-Verification Requested",  icon: RefreshCw,   iconBg: "from-sky-50 to-sky-100",     iconFg: "text-sky-600"   },
  REVERIFICATION_DECLINED:            { label: "Re-Verification Declined",   icon: ShieldOff,   iconBg: "from-rose-50 to-rose-100",   iconFg: "text-rose-600"  },
  REVERIFICATION_REQUEST_DECLINED:    { label: "Re-Verification Declined",   icon: ShieldOff,   iconBg: "from-rose-50 to-rose-100",   iconFg: "text-rose-600"  },
  VERIFICATION_REJECTED:              { label: "Verification Rejected",       icon: ShieldOff,   iconBg: "from-rose-50 to-rose-100",   iconFg: "text-rose-600"  },
  INITIAL_VERIFICATION_REQUESTED:     { label: "Verification Requested",      icon: RefreshCw,   iconBg: "from-sky-50 to-sky-100",     iconFg: "text-sky-600"   },
};

function personaliseActivity(event, myId) {
  if (!event.description) return null;
  const desc      = cleanDrName(event.description);
  const actorName = cleanDrName(event.actorName);
  if (event.actorUserId !== myId || !actorName) return desc;
  if (desc.startsWith(actorName)) {
    return "You " + desc.slice(actorName.length).trim();
  }
  return desc;
}

/** Returns the patient name to highlight in the detail line. */
function patientNameFor(event) {
  const { action, targetUserName, actorName } = event;
  if (action === "ACCESS_GRANT" || action === "ACCESS_REVOKE") {
    // actorName is stored as "Patient Vikua" — strip the prefix
    const raw = actorName || "";
    return raw.startsWith("Patient ") ? raw.slice(8) : raw || null;
  }
  return targetUserName || null;
}

/** Short contextual description shown below the main activity title. */
function shortDescription(event) {
  const { action, actorName, targetUserName, description, metadata } = event;
  const recordTitle = sanitize(event.recordTitle);
  const fileName    = sanitize(metadata?.fileName);
  switch (action) {
    case "RECORD_VIEW":
      return targetUserName ? `Viewed medical records of ${targetUserName}` : null;
    case "RECORD_DOWNLOAD":
      if (targetUserName) {
        return fileName
          ? `Downloaded ${fileName} for ${targetUserName}`
          : `Downloaded medical records of ${targetUserName}`;
      }
      return "Downloaded medical record";
    case "RECORD_UPLOAD":
      return recordTitle ? `${recordTitle} uploaded` : "New record uploaded";
    case "RECORD_DELETE":
      return recordTitle ? `${recordTitle} deleted` : "Record deleted";
    case "RECORD_UPDATE":
      return recordTitle ? `${recordTitle} updated` : "Record updated";
    case "ACCESS_GRANT":
      return actorName ? `${actorName} granted you access to medical records` : "Patient granted access";
    case "ACCESS_REVOKE":
      return actorName ? `${actorName} revoked your access` : "Patient revoked access";
    case "PERMISSION_EXPIRED":
      return targetUserName
        ? `Access to ${targetUserName}'s records has expired`
        : "Permission has expired";
    case "NOTE_CREATED":
      return targetUserName ? `Created diagnosis note for ${targetUserName}` : "Medical note created";
    case "NOTE_UPDATED":
      return targetUserName ? `Updated diagnosis note for ${targetUserName}` : "Medical note updated";
    case "NOTE_DELETED":
      return targetUserName ? `Deleted diagnosis note for ${targetUserName}` : "Medical note deleted";
    case "VERIFY_RECORD":
      return recordTitle ? `${recordTitle} verified on blockchain` : "Record verified";
    case "LOGIN":
      return "Doctor session started";
    case "ACCOUNT_CREATED":
      return "Your doctor account has been created successfully.";
    case "VERIFICATION_PENDING":
      return "Your account is awaiting administrator verification. Patient-related features will become available after approval.";
    case "ACCOUNT_VERIFIED":
      return "Your account has been verified by the administrator. Patient-related features are now available according to granted patient permissions.";
    case "VERIFICATION_REVOKED": {
      const r = metadata?.reason;
      return (
        <>
          Your account verification has been revoked by the administrator.
          {r && <><br />{"Reason: " + r}</>}
          <br />Patient-related features have been disabled until your verification is restored.
          <br />Please contact the system administrator for further assistance.
        </>
      );
    }
    case "REVERIFICATION_REQUESTED":
      return "Your request for account re-verification has been submitted successfully. Please wait for administrator review.";
    case "REVERIFICATION_DECLINED":
    case "REVERIFICATION_REQUEST_DECLINED": {
      const r = metadata?.reason;
      return (
        <>
          Your request for account re-verification was reviewed but could not be approved.
          {r && <><br />{"Reason: " + r}</>}
          <br />Please update your profile information if required before submitting another request.
        </>
      );
    }
    case "VERIFICATION_REJECTED": {
      const r = metadata?.reason;
      return (
        <>
          Your verification request was not approved by the administrator.
          {r && <><br />{"Reason: " + r}</>}
          <br />Please update your profile information and submit a new verification request.
        </>
      );
    }
    case "INITIAL_VERIFICATION_REQUESTED":
      return "Your new verification request has been submitted successfully. Please wait for administrator review.";
    default:
      return cleanDrName(description) || recordTitle || null;
  }
}

/**
 * Renders a detail string with the patient name visually highlighted.
 * Falls back to plain text if the name isn't found in the string.
 */
function HighlightedDetail({ text, name }) {
  if (!text) return null;
  if (!name) return <>{text}</>;
  const idx = text.indexOf(name);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-blue-700">{name}</span>
      {text.slice(idx + name.length)}
    </>
  );
}

const QUICK_ACTIONS = [
  { label: "My Patients",       description: "View patients who shared access", to: "/doctor/patients",       icon: Users,         color: "from-blue-700 to-blue-500"     },
  { label: "Shared Records",    description: "Browse accessible medical records", to: "/doctor/shared-records", icon: FileText,      color: "from-emerald-600 to-emerald-400"},
  { label: "Medical Notes",     description: "Manage your clinical notes",      to: "/doctor/notes",          icon: ClipboardList, color: "from-purple-600 to-purple-400" },
  { label: "My Profile",        description: "Update your doctor profile",      to: "/doctor/profile",        icon: User,          color: "from-slate-700 to-slate-900"   },
];

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} aria-hidden="true" />;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function handle() {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={handle}
      title={copied ? "Copied!" : "Copy wallet address"}
      className="ml-1.5 inline-flex items-center justify-center rounded p-0.5 text-white/70 transition hover:text-white focus:outline-none"
    >
      {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
    </button>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dash,    setDash]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    const stored = localStorage.getItem(`profilePhoto_${uid}`);
    if (stored) setPhotoUrl(stored);
  }, [user?.id]);

  // Server fallback: if localStorage is empty (new browser / incognito),
  // load profilePhoto from the profile API so the dashboard shows the correct avatar.
  const [profileData, setProfileData] = useState(null);
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    api.get("/doctor/profile")
      .then((res) => { if (res.data?.success) setProfileData(res.data.data); })
      .catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (photoUrl) return;
    const serverPhoto = profileData?.user?.profilePhoto;
    if (serverPhoto) setPhotoUrl(serverPhoto);
  }, [profileData, photoUrl]);

  const fetchDash = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get("/doctor/dashboard")
      .then((res) => {
        if (res.data?.success) setDash(res.data.data);
        else setDash(null);
      })
      .catch((err) => {
        const s = err?.response?.status;
        if (!s || s >= 500) setError(true);
        else setDash(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDash(); }, [fetchDash]);

  // Re-fetch when the doctor returns to this tab after performing actions elsewhere
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchDash();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDash]);

  const stats     = dash ?? { totalPatients: 0, sharedRecords: 0, activePermissions: 0, viewedToday: 0, recentActivity: [] };
  const initials  = docInitials(user?.fullName);
  const gradient  = docGradient(user?.fullName);

  const vStatus   = profileData?.doctor?.verificationStatus;
  const showStats = !vStatus || vStatus === "verified";

  const cards = [
    { label: "Total Patients",       value: showStats ? stats.totalPatients     : "—", icon: Users,    accent: "text-blue-600",    bg: "from-blue-50 to-blue-100",      to: "/doctor/patients"       },
    { label: "Shared Records",       value: showStats ? stats.sharedRecords      : "—", icon: FileText, accent: "text-emerald-600", bg: "from-emerald-50 to-emerald-100", to: "/doctor/shared-records" },
    { label: "Active Permissions",   value: showStats ? stats.activePermissions  : "—", icon: Shield,   accent: "text-purple-600",  bg: "from-purple-50 to-purple-100",   to: "/doctor/patients"       },
    { label: "Records Viewed Today", value: showStats ? stats.viewedToday        : "—", icon: Eye,      accent: "text-amber-600",   bg: "from-amber-50 to-amber-100",     to: "/doctor/shared-records" },
  ];

  return (
    <section className="space-y-8">

      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-500 to-emerald-500 p-6 shadow-card sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full border-2 border-white shadow-lg">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient} text-xl font-bold text-white`}>
                  {initials}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-blue-100">Welcome Back 👋</p>
              <h1 className="mt-0.5 text-2xl font-bold text-white sm:text-3xl">{ensureDrPrefix(user?.fullName)}</h1>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {dash?.doctorId && (
                  <p className="text-sm text-white">
                    <span className="font-medium text-blue-100">Doctor ID:&nbsp;</span>
                    <span className="font-semibold">{dash.doctorId}</span>
                  </p>
                )}
                {user?.walletAddress && (
                  <p className="flex items-center text-sm text-white">
                    <span className="font-medium text-blue-100">Wallet:&nbsp;</span>
                    <span className="font-mono font-semibold">{truncateWallet(user.walletAddress)}</span>
                    <CopyButton text={user.walletAddress} />
                  </p>
                )}
                <p className="text-sm text-white">
                  <span className="font-medium text-blue-100">Role:&nbsp;</span>
                  <span className="font-semibold">Doctor</span>
                </p>
                {vStatus && (() => {
                  const vReason = profileData?.doctor?.verificationReason || null;
                  const rejType = profileData?.doctor?.rejectionType      || null;
                  const effType = rejType || (vReason ? "revoked" : "initial");
                  const cfg = vStatus === "verified"
                    ? { label: "Verified Doctor",       dot: "bg-emerald-400", cls: "border-emerald-300/50 bg-emerald-400/20 text-emerald-100" }
                    : vStatus === "rejected" && effType === "revoked"
                    ? { label: "Verification Revoked",  dot: "bg-red-400",     cls: "border-red-300/50 bg-red-400/20 text-red-100"             }
                    : vStatus === "rejected"
                    ? { label: "Verification Rejected", dot: "bg-red-400",     cls: "border-red-300/50 bg-red-400/20 text-red-100"             }
                    : { label: "Pending Verification",  dot: "bg-amber-400",   cls: "border-amber-300/50 bg-amber-400/20 text-amber-100"       };
                  return (
                    <p className="text-sm text-white">
                      <span className="font-medium text-blue-100">Account Status:&nbsp;</span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>

          <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-white/50 bg-white/25 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            <Stethoscope size={14} />
            Doctor
          </span>
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">Unable to load dashboard data. Please try again.</p>
          </div>
          <button
            type="button"
            onClick={fetchDash}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:w-auto"
          >
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {/* ── Overview cards ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overview</h2>
        {loading ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0,1,2,3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <Skeleton className="h-11 w-11" />
                <Skeleton className="mt-4 h-7 w-16" />
                <Skeleton className="mt-2 h-4 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon, accent, bg, to }) => (
              <article
                key={label}
                role="button"
                tabIndex={0}
                aria-label={`${label}: ${value}`}
                onClick={() => navigate(to)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(to); } }}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${bg} ${accent}`}>
                  <Icon size={20} />
                </span>
                <div className="mt-4 text-2xl font-bold text-slate-900">{value}</div>
                <div className="mt-1 text-sm text-slate-500">{label}</div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ── Activity + Quick Actions ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            {!loading && !error && stats.recentActivity.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {Math.min(stats.recentActivity.length, 5)} event{Math.min(stats.recentActivity.length, 5) !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading && (
            <div className="mt-6 space-y-6">
              {[0,1,2].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && stats.recentActivity.length === 0 && (
            <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
              <Activity size={36} className="text-slate-200" />
              <p className="text-sm font-semibold text-slate-600">No recent activity</p>
              <p className="max-w-xs text-xs leading-relaxed text-slate-400">
                Your recent doctor activities will appear here.
              </p>
            </div>
          )}

          {/* Activity timeline — capped at 5, newest first */}
          {!loading && !error && stats.recentActivity.length > 0 && (
            <div className="mt-6 space-y-0">
              {stats.recentActivity.slice(0, 5).map((event, i, arr) => {
                const meta    = ACTION_META[event.action] ?? { label: event.action, icon: Activity, iconBg: "from-slate-50 to-slate-100", iconFg: "text-slate-500" };
                const Icon    = meta.icon;
                const isLast  = i === arr.length - 1;
                const message = personaliseActivity(event, user?.id) || meta.label;
                const detail  = shortDescription(event);
                const patient = patientNameFor(event);
                return (
                  <div key={`${event.action}-${event.timestamp}-${i}`} className="relative flex gap-4 pb-8 last:pb-0">
                    {!isLast && (
                      <span className="absolute left-5 top-10 h-full w-px bg-gradient-to-b from-slate-100 to-slate-50" />
                    )}
                    <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.iconBg} ${meta.iconFg}`}>
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{message}</p>
                        <span className="text-xs tabular-nums text-slate-400">{formatTimestamp(event.timestamp)}</span>
                      </div>
                      {detail && (
                        <p className="mt-0.5 text-sm text-slate-500">
                          <HighlightedDetail text={detail} name={patient} />
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {QUICK_ACTIONS.map(({ label, description, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-soft`}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 group-hover:text-blue-600">{label}</p>
                  <p className="truncate text-xs text-slate-500">{description}</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-slate-300 transition group-hover:text-blue-500" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
