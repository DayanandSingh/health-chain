import { ClipboardList, FileText, HeartPulse, Home, LogOut, Menu, Moon, User, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

// Doctor-specific navigation links
const DOCTOR_NAV = [
  { to: "/doctor/dashboard",      label: "Dashboard",      icon: Home          },
  { to: "/doctor/patients",       label: "My Patients",    icon: Users         },
  { to: "/doctor/shared-records", label: "Shared Records", icon: FileText      },
  { to: "/doctor/notes",          label: "Medical Notes",  icon: ClipboardList },
  { to: "/doctor/profile",        label: "Profile",        icon: User          },
];

function formatRole(role) {
  if (!role) return "";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function NavItem({ to, label, icon: Icon, onClick, onBlock }) {
  return (
    <NavLink
      to={to}
      onClick={(e) => {
        if (onBlock) { e.preventDefault(); onBlock(); }
        else if (onClick) onClick();
      }}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition duration-200 ${
          isActive
            ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
            : "font-medium text-slate-600 hover:bg-blue-50/40 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-y-[7px] left-0 w-[3px] rounded-full bg-blue-600 dark:bg-blue-500" />
          )}
          <Icon
            size={18}
            className={
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
            }
          />
          {label}
        </>
      )}
    </NavLink>
  );
}

function NavbarIdentity({ user, photoUrl }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={user?.fullName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 text-xs font-bold text-white">
            {getInitials(user?.fullName)}
          </div>
        )}
        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
      </div>
      <div className="hidden w-[180px] sm:block">
        <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900 dark:text-white">
          {user?.fullName}
        </p>
        <span className="mt-0.5 inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400">
          {formatRole(user?.role)}
        </span>
      </div>
    </div>
  );
}

export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`profilePhoto_${user.id}`);
    if (stored) setPhotoUrl(stored);
  }, [user?.id]);

  const location = useLocation();
  const navigate  = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationReason, setVerificationReason] = useState(null);
  const [rejectionType,      setRejectionType]      = useState(null);
  const [rejectionReason,    setRejectionReason]    = useState(null);
  const [showBlockModal,     setShowBlockModal]     = useState(false);

  useEffect(() => {
    api.get("/doctor/profile")
      .then((res) => {
        const doc = res.data.data.doctor || {};
        setVerificationStatus(doc.verificationStatus || "pending");
        setVerificationReason(doc.verificationReason || null);
        setRejectionType(doc.rejectionType     || null);
        setRejectionReason(doc.rejectionReason || null);
      })
      .catch(() => setVerificationStatus("pending"));
  }, []);

  const RESTRICTED     = ["/doctor/patients", "/doctor/shared-records", "/doctor/notes"];
  const isBlocked      = verificationStatus === "pending" || verificationStatus === "rejected";
  const isOnRestricted = RESTRICTED.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (isBlocked && isOnRestricted) setShowBlockModal(true);
  }, [isBlocked, isOnRestricted]);

  function toggleDark() {
    document.documentElement.classList.toggle("dark");
  }

  return (
    <div className="min-h-screen">
      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200/80 bg-[#FAFBFC] p-4 shadow-[2px_0_12px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-950 md:block">
        {/* Brand */}
        <div className="mb-7 flex items-center gap-2.5 pl-1.5 pt-1">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-emerald-600 text-white shadow-sm">
            <HeartPulse size={17} strokeWidth={2.25} />
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white">HealthChain</div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {DOCTOR_NAV.map(({ to, label, icon: Icon }) => (
            <NavItem
              key={to}
              to={to}
              label={label}
              icon={Icon}
              onBlock={isBlocked && RESTRICTED.includes(to) ? () => setShowBlockModal(true) : undefined}
            />
          ))}
        </nav>
      </aside>

      {/* ── Mobile Nav Drawer ──────────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-[#FAFBFC] p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950 md:hidden">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2.5 pl-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-700 to-emerald-600 text-white shadow-sm">
                  <HeartPulse size={17} strokeWidth={2.25} />
                </span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">HealthChain</div>
              </div>
              <button
                className="btn-secondary p-1"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1.5">
              {DOCTOR_NAV.map(({ to, label, icon: Icon }) => (
                <NavItem
                  key={to}
                  to={to}
                  label={label}
                  icon={Icon}
                  onClick={() => setMobileOpen(false)}
                  onBlock={isBlocked && RESTRICTED.includes(to) ? () => { setMobileOpen(false); setShowBlockModal(true); } : undefined}
                />
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="md:pl-64 pt-16">
        <header className="fixed top-0 left-0 right-0 z-20 md:left-64 flex items-center justify-between border-b border-slate-200/60 bg-white/95 px-4 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.05)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="btn-secondary shrink-0 p-1 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <NavbarIdentity user={user} photoUrl={photoUrl} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {/* Dark mode — circular icon button */}
            <button
              onClick={toggleDark}
              title="Toggle dark mode"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition duration-200 hover:bg-slate-50 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <Moon size={16} />
            </button>
            {/* Logout — white normal, red hover */}
            <button
              onClick={logout}
              className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-800/50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            >
              <LogOut size={16} className="transition duration-200 group-hover:text-red-500 dark:group-hover:text-red-400" />
              Logout
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6">
          {isBlocked && isOnRestricted ? null : <Outlet />}
        </div>
      </main>

      {/* Verification restriction modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBlockModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-slate-900">Account Verification Required</h2>
            {(() => {
              const effectiveType = rejectionType || (verificationReason ? "revoked" : "initial");
              const activeReason  = verificationStatus === "rejected"
                ? (effectiveType === "revoked" ? verificationReason : rejectionReason)
                : null;
              const isInitialRejected = verificationStatus === "rejected" && effectiveType === "initial";
              const isRevoked         = verificationStatus === "rejected" && effectiveType === "revoked";
              return (
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <p>
                    {isInitialRejected
                      ? "Your verification request was not approved by the administrator."
                      : isRevoked
                      ? "Your doctor verification has been revoked by the administrator."
                      : <>Your doctor account is currently <strong className="text-slate-800">Pending Verification</strong>.</>
                    }
                  </p>
                  {activeReason && <p>Reason: {activeReason}</p>}
                  <p>
                    {isInitialRejected
                      ? "Please update your profile information and submit a new verification request."
                      : isRevoked
                      ? "Patient-related features are currently unavailable."
                      : "Patient-related features are temporarily unavailable until your account is verified by a system administrator."
                    }
                  </p>
                  <div>
                    <p className="font-medium text-slate-700">
                      {isRevoked ? "Once your verification is restored by the administrator, you will be able to:" : "Once your account is verified, you will be able to:"}
                    </p>
                    <ul className="mt-1.5 space-y-1 pl-1">
                      {["View assigned patients", "Access shared medical records", "Create and manage medical notes"].map((item) => (
                        <li key={item} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() => { setShowBlockModal(false); navigate("/doctor/profile"); }}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
