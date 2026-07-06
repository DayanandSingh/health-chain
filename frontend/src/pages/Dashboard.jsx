import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Check,
  ClipboardCopy,
  ClipboardList,
  Download,
  FileText,
  KeyRound,
  Pencil,
  RefreshCw,
  ShieldOff,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// ─── Avatar helpers (mirrors Profile page — reads same localStorage key) ───────
const DASH_GRADIENTS = [
  "from-blue-500 to-blue-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-rose-500 to-rose-600",
  "from-amber-500 to-amber-600",
  "from-indigo-500 to-indigo-600",
  "from-teal-500 to-teal-600",
  "from-cyan-500 to-cyan-600",
];

function dashInitials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function dashGradient(name) {
  const code = (name || "?").charCodeAt(0);
  return DASH_GRADIENTS[code % DASH_GRADIENTS.length];
}

// ─── Action metadata — iconBg/iconFg give each action its own visual identity ──
const ACTION_META = {
  LOGIN:           { label: "Logged In",               icon: User,         iconBg: "from-slate-50 to-slate-100",     iconFg: "text-slate-400"   },
  RECORD_UPLOAD:   { label: "Medical Record Uploaded",  icon: Upload,       iconBg: "from-blue-50 to-blue-100",       iconFg: "text-blue-600"    },
  RECORD_DELETE:   { label: "Record Deleted",           icon: FileText,     iconBg: "from-rose-50 to-rose-100",       iconFg: "text-rose-600"    },
  RECORD_VIEW:     { label: "Medical Record Viewed",     icon: FileText,     iconBg: "from-blue-50 to-blue-100",       iconFg: "text-blue-500"    },
  RECORD_UPDATE:   { label: "Record Updated",           icon: FileText,     iconBg: "from-blue-50 to-blue-100",       iconFg: "text-blue-500"    },
  RECORD_DOWNLOAD: { label: "Medical Record Downloaded",icon: Download,     iconBg: "from-cyan-50 to-cyan-100",       iconFg: "text-cyan-600"    },
  PROFILE_UPDATE:  { label: "Profile Updated",          icon: User,         iconBg: "from-slate-50 to-slate-100",     iconFg: "text-slate-500"   },
  ACCESS_GRANT:    { label: "Access Granted",           icon: KeyRound,     iconBg: "from-emerald-50 to-emerald-100", iconFg: "text-emerald-600" },
  ACCESS_REVOKE:   { label: "Access Revoked",           icon: ShieldOff,    iconBg: "from-rose-50 to-rose-100",       iconFg: "text-rose-600"    },
  NOTE_CREATED:    { label: "Medical Note Created",      icon: ClipboardList,iconBg: "from-purple-50 to-purple-100",   iconFg: "text-purple-600"  },
  NOTE_UPDATED:    { label: "Medical Note Updated",     icon: Pencil,       iconBg: "from-orange-50 to-orange-100",   iconFg: "text-orange-500"  },
  NOTE_DELETED:    { label: "Note Deleted",             icon: FileText,     iconBg: "from-rose-50 to-rose-100",       iconFg: "text-rose-600"    },
  VERIFY_RECORD:   { label: "Blockchain Verified",      icon: CheckCircle,  iconBg: "from-teal-50 to-teal-100",       iconFg: "text-teal-600"    },
};

// Which module each action type navigates to when clicked
const ACTION_ROUTE = {
  RECORD_UPLOAD:   "/records",
  RECORD_DOWNLOAD: "/records",
  RECORD_DELETE:   "/records",
  RECORD_UPDATE:   "/records",
  RECORD_VIEW:     "/records",
  NOTE_CREATED:    "/medical-notes",
  NOTE_UPDATED:    "/medical-notes",
  NOTE_DELETED:    "/medical-notes",
  ACCESS_GRANT:    "/permissions",
  ACCESS_REVOKE:   "/permissions",
  VERIFY_RECORD:   "/records",
  PROFILE_UPDATE:  "/profile",
};

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

/** Returns the name/title to visually accent in the description line. */
function accentNameFor(event) {
  const { action, recordTitle, actorName, targetUserName, metadata } = event;
  switch (action) {
    case "RECORD_UPLOAD":   return sanitize(metadata?.fileName) || recordTitle || null;
    case "RECORD_DOWNLOAD": return sanitize(metadata?.fileName) || recordTitle || null;
    case "RECORD_VIEW":     return actorName || null;
    case "NOTE_CREATED":
    case "NOTE_UPDATED":
    case "NOTE_DELETED":    return actorName || null;
    case "ACCESS_GRANT":
    case "ACCESS_REVOKE":   return targetUserName || null;
    default:                return null;
  }
}

/**
 * Renders a description with the accent name bolded in blue.
 * Falls back to plain text if the name is not found in the string.
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

/** Short contextual description shown below the main activity title. */
function shortDescription(event, myId) {
  const { action, recordTitle, actorName, actorUserId, targetUserName, metadata } = event;
  switch (action) {
    case "RECORD_UPLOAD": {
      const name = sanitize(metadata?.fileName) || recordTitle;
      return name ? `Uploaded ${name}.` : "Uploaded a medical record.";
    }
    case "RECORD_DOWNLOAD": {
      const fileName = sanitize(metadata?.fileName) || recordTitle;
      if (actorUserId === myId) {
        return fileName ? `Downloaded ${fileName}.` : "Downloaded a medical record.";
      }
      // Doctor downloaded the patient's record
      return fileName
        ? `${actorName || "Your doctor"} downloaded ${fileName}.`
        : `${actorName || "Your doctor"} downloaded a record.`;
    }
    case "RECORD_VIEW":
      return actorName
        ? `${actorName} viewed your medical record.`
        : "Your doctor viewed a medical record.";
    case "RECORD_DELETE":
      return recordTitle ? `You deleted "${recordTitle}".` : "A record was removed.";
    case "RECORD_UPDATE":
      return recordTitle ? `"${recordTitle}" was updated.` : "A record was updated.";
    case "ACCESS_GRANT": {
      const doctor = targetUserName || "a doctor";
      return `You granted ${doctor} access to your medical records.`;
    }
    case "ACCESS_REVOKE": {
      const doctor = targetUserName || "a doctor";
      return `You revoked ${doctor}'s access to your medical records.`;
    }
    case "NOTE_CREATED":
      return actorName
        ? `${actorName} created a diagnosis note.`
        : "Medical note received.";
    case "NOTE_UPDATED":
      return actorName
        ? `${actorName} updated your diagnosis and prescription.`
        : "Medical note updated.";
    case "NOTE_DELETED":
      return actorName ? `${actorName} deleted a note.` : "A medical note was removed.";
    case "VERIFY_RECORD":
      return recordTitle
        ? `"${recordTitle}" verified on blockchain.`
        : "Record verified on blockchain.";
    case "PROFILE_UPDATE":
      return "Your profile information was updated.";
    case "LOGIN":
      return "Account session started.";
    default:
      return recordTitle || null;
  }
}

/**
 * Personalise an activity message.
 * If the current user performed the action, replace their name at the start
 * of the stored third-person description with "You".
 *
 * e.g. "Patient Vikua uploaded Blood Test" → "You uploaded Blood Test"
 */
function personaliseActivity(event, myId) {
  if (!event.description) return null;
  if (event.actorUserId !== myId || !event.actorName) return event.description;
  if (event.description.startsWith(event.actorName)) {
    return "You " + event.description.slice(event.actorName.length).trim();
  }
  return event.description;
}

// ─── Quick actions ─────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    label: "Upload Record",
    description: "Add a new medical record securely",
    to: "/records",
    icon: Upload,
    // Use standard Tailwind literals so Tailwind's purger always retains them
    color: "from-blue-700 to-blue-500",
  },
  {
    label: "View Records",
    description: "Browse and verify your medical records",
    to: "/records",
    icon: FileText,
    color: "from-blue-600 to-blue-400",
  },
  {
    label: "Manage Permissions",
    description: "Grant or revoke doctor access",
    to: "/permissions",
    icon: KeyRound,
    color: "from-emerald-600 to-emerald-400",
  },
  {
    label: "My Profile",
    description: "View your account details",
    to: "/profile",
    icon: User,
    color: "from-slate-700 to-slate-900",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatRole(role) {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncateWallet(address) {
  if (!address) return "";
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function formatTimestamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr ago`;
  // Calendar-day comparisons for Yesterday vs older
  const timeStr   = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const eventDay  = new Date(date); eventDay.setHours(0, 0, 0, 0);
  if (eventDay.getTime() === yesterday.getTime()) return `Yesterday • ${timeStr}`;
  const dateStr = date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  return `${dateStr} • ${timeStr}`;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

/** Animated skeleton pulse block */
function Skeleton({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-100 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Copy-to-clipboard button with visual feedback */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy wallet address"}
      className="ml-1.5 inline-flex items-center justify-center rounded p-0.5 text-white/70 transition hover:text-white focus:outline-none focus:ring-1 focus:ring-white/50"
    >
      {copied ? <Check size={13} /> : <ClipboardCopy size={13} />}
    </button>
  );
}

/** Four skeleton cards shown while loading */
function SkeletonCards() {
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
        >
          <Skeleton className="h-11 w-11" />
          <Skeleton className="mt-4 h-7 w-16" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Four skeleton activity rows shown while loading */
function SkeletonActivity() {
  return (
    <div className="mt-6 space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2 pt-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  // Load profile photo from localStorage (written by Profile page)
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
    api.get("/my-patient-profile")
      .then((res) => { if (res.data?.success) setProfileData(res.data.data); })
      .catch(() => {});
  }, [user?.id]);
  useEffect(() => {
    if (photoUrl) return;
    const serverPhoto = profileData?.user?.profilePhoto;
    if (serverPhoto) setPhotoUrl(serverPhoto);
  }, [profileData, photoUrl]);

  const avatarInitials = dashInitials(user?.fullName);
  const avatarGradient = dashGradient(user?.fullName);

  const fetchDashboard = useCallback(() => {
    if (user?.role !== "patient") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    api
      .get("/patient-dashboard")
      .then((res) => {
        // Backend always returns success:true with valid data — store it.
        if (res.data?.success && res.data?.data) {
          setDashData(res.data.data);
        } else {
          // Unexpected shape — treat as empty, not error
          setDashData(null);
        }
      })
      .catch((err) => {
        // Only show the error banner for genuine network failures (no response)
        // or 5xx server errors.  4xx responses (e.g. 401/403 during a JWT edge
        // case) fall back to the safe empty-data state so the dashboard still
        // renders cleanly — no error banner for a patient with zero records.
        const status = err?.response?.status;
        if (!status || status >= 500) {
          setError(true);
        } else {
          // 4xx — keep dashData null which shows zeros / empty states
          setDashData(null);
        }
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Re-fetch when the user returns to this tab after performing actions on other pages
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchDashboard();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDashboard]);

  // Safe stats — zeros when no data
  const stats = dashData ?? {
    patientId: null,
    totalRecords: 0,
    sharedDoctors: 0,
    activePermissions: 0,
    medicalNotes: 0,
    recentActivity: [],
  };

  const overviewCards = [
    {
      label: "Total Medical Records",
      value: stats.totalRecords,
      icon: FileText,
      accent: "text-healthcare-blue",
      to: "/records",
    },
    {
      label: "Shared Doctors",
      value: stats.sharedDoctors,
      icon: Users,
      accent: "text-healthcare-emerald",
      to: "/permissions",
    },
    {
      label: "Active Permissions",
      value: stats.activePermissions,
      icon: KeyRound,
      accent: "text-blue-600",
      to: "/permissions",
    },
    {
      label: "Medical Notes",
      value: stats.medicalNotes,
      icon: ClipboardList,
      accent: "text-emerald-600",
      to: "/medical-notes",
    },
  ];

  return (
    <section className="space-y-8">

      {/* ── Welcome banner ─────────────────────────────────────────────── */}
      {/*
        The banner always has a deep blue-to-emerald gradient background in
        BOTH light and dark mode, so white text is always readable on it.
        We use solid text-white for values and text-blue-100 for labels —
        never opacity-based classes, which degrade legibility.
      */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-500 to-emerald-500 p-6 shadow-card sm:p-8">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

          {/* Left: avatar + text info */}
          <div className="flex items-center gap-5">

            {/* Profile avatar — photo from Profile page or initials fallback */}
            <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-full border-2 border-white shadow-lg">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${avatarGradient} text-xl font-bold text-white`}
                >
                  {avatarInitials}
                </div>
              )}
            </div>

            {/* Text info */}
            <div>
              <p className="text-sm font-semibold text-blue-100">Welcome Back 👋</p>

              {/* Patient full name — largest, always pure white */}
              <h1 className="mt-0.5 text-2xl font-bold text-white sm:text-3xl">
                {user.fullName}
              </h1>

              {/* Detail rows */}
              <div className="mt-2.5 flex flex-col gap-1.5">
                {/* Patient ID */}
                {stats.patientId && (
                  <p className="text-sm text-white">
                    <span className="font-medium text-blue-100">Patient ID:&nbsp;</span>
                    <span className="font-semibold">{stats.patientId}</span>
                  </p>
                )}

                {/* Wallet address */}
                {user.walletAddress && (
                  <p className="flex items-center text-sm text-white">
                    <span className="font-medium text-blue-100">Wallet:&nbsp;</span>
                    <span className="font-mono font-semibold">{truncateWallet(user.walletAddress)}</span>
                    <CopyButton text={user.walletAddress} />
                  </p>
                )}

                {/* Role */}
                <p className="text-sm text-white">
                  <span className="font-medium text-blue-100">Role:&nbsp;</span>
                  <span className="font-semibold">{formatRole(user.role)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Role badge — white border + semi-transparent white fill, text always white */}
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-white/50 bg-white/25 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
            {formatRole(user.role)}
          </span>
        </div>
      </div>

      {/* ── Error state ─────────────────────────────────────────────────── */}
      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700">
              Unable to load dashboard data. Please try again.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDashboard}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:w-auto"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* ── Overview cards ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Overview</h2>

        {loading ? (
          <SkeletonCards />
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map(({ label, value, icon: Icon, accent, to }) => (
              <article
                key={label}
                role="button"
                tabIndex={0}
                aria-label={`${label}: ${value}. Go to ${label}`}
                onClick={() => navigate(to)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(to);
                  }
                }}
                className="group cursor-pointer rounded-2xl border border-slate-100 bg-white p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-blue-100 hover:shadow-card-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-emerald-50 ${accent}`}
                  >
                    <Icon size={20} />
                  </span>
                </div>
                <div className="mt-4 text-2xl font-bold text-slate-900">{value}</div>
                <div className="mt-1 text-sm text-slate-500">{label}</div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ── Activity + Quick Actions ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">

        {/* Recent activity */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            {!loading && !error && stats.recentActivity.length > 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-healthcare-emerald-dark">
                {Math.min(stats.recentActivity.length, 5)}&nbsp;event
                {Math.min(stats.recentActivity.length, 5) !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && <SkeletonActivity />}

          {/* Empty state */}
          {!loading && !error && stats.recentActivity.length === 0 && (
            <div className="mt-8 flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <Activity size={26} className="text-slate-300" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No recent activity</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
                  Your recent healthcare actions will appear here.
                </p>
              </div>
              <Link
                to="/records"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                <Upload size={14} />
                Upload Medical Record
              </Link>
            </div>
          )}

          {/* Activity timeline — capped at 5, newest first, each row navigates to the related module */}
          {!loading && !error && stats.recentActivity.length > 0 && (
            <div className="mt-6">
              {stats.recentActivity.slice(0, 5).map((event, i, arr) => {
                const meta   = ACTION_META[event.action] ?? { label: event.action, icon: Activity, iconBg: "from-slate-50 to-slate-100", iconFg: "text-slate-400" };
                const Icon   = meta.icon;
                const isLast = i === arr.length - 1;
                const msg    = personaliseActivity(event, user?.id) || meta.label;
                const detail = shortDescription(event, user?.id);
                const accent = accentNameFor(event);
                const route  = ACTION_ROUTE[event.action] ?? null;

                // Inner icon bubble — shared between link and plain variants
                const iconBubble = (
                  <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.iconBg} ${meta.iconFg}`}>
                    <Icon size={18} />
                  </span>
                );

                // Inner text block
                const textBlock = (
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-slate-900 transition-colors">{msg}</p>
                      <span className="text-xs tabular-nums text-slate-400">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    {detail && (
                      <p className="mt-0.5 text-sm text-slate-500">
                        <HighlightedDetail text={detail} name={accent} />
                      </p>
                    )}
                  </div>
                );

                return (
                  <div
                    key={`${event.action}-${event.timestamp}-${i}`}
                    className={`relative ${isLast ? "" : "pb-8"}`}
                  >
                    {/* Vertical connector between items */}
                    {!isLast && (
                      <span className="absolute left-5 top-10 h-full w-px bg-gradient-to-b from-slate-100 to-slate-50" />
                    )}

                    {/* Clickable row: Link if there is a target route, plain div otherwise */}
                    {route ? (
                      <Link
                        to={route}
                        className="group flex items-start gap-4 rounded-xl p-2 -m-2 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        {iconBubble}
                        {textBlock}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-4">
                        {iconBubble}
                        {textBlock}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {QUICK_ACTIONS.map(({ label, description, to, icon: Icon, color }) => (
              <Link
                key={label}
                to={to}
                className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-card-hover"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-soft`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 group-hover:text-healthcare-blue">
                    {label}
                  </p>
                  <p className="truncate text-xs text-slate-500">{description}</p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-slate-300 transition group-hover:text-healthcare-blue"
                />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
