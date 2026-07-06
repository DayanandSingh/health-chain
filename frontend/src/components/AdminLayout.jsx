import { Activity, ClipboardList, FileText, HeartPulse, Home, KeyRound, LogOut, Menu, Moon, Stethoscope, User, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Admin-specific navigation links
const ADMIN_NAV = [
  { to: "/admin",              label: "Dashboard",       icon: Home,        end: true },
  { to: "/admin/patients",     label: "Patients",        icon: Users                 },
  { to: "/admin/doctors",      label: "Doctors",         icon: Stethoscope           },
  { to: "/admin/records",      label: "Medical Records", icon: FileText              },
  { to: "/admin/doctor-notes", label: "Doctor Notes",    icon: ClipboardList         },
  { to: "/admin/permissions",  label: "Permissions",     icon: KeyRound              },
  { to: "/admin/audit",        label: "Audit Logs",      icon: Activity              },
  { to: "/admin/profile",      label: "Profile",         icon: User                  },
];

function formatRole(role) {
  if (!role) return "";
  if (role.includes("admin")) return "Administrator";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
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

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const stored = localStorage.getItem(`profilePhoto_${user.id}`);
    if (stored) setPhotoUrl(stored);
  }, [user?.id]);

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
          <div>
            <div className="text-xl font-bold leading-tight text-slate-900 dark:text-white">HealthChain</div>
            <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Admin Panel</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {ADMIN_NAV.map(({ to, label, icon, end }) => (
            <NavItem key={to} to={to} label={label} icon={icon} end={end} />
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
                <div>
                  <div className="text-xl font-bold leading-tight text-slate-900 dark:text-white">HealthChain</div>
                  <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Admin Panel</div>
                </div>
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
              {ADMIN_NAV.map(({ to, label, icon, end }) => (
                <NavItem key={to} to={to} label={label} icon={icon} end={end} onClick={() => setMobileOpen(false)} />
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
          <Outlet />
        </div>
      </main>
    </div>
  );
}
