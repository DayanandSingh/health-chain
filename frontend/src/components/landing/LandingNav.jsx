import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HeartPulse, Menu, X } from "lucide-react";
import { landingGhostBtn, landingPrimaryBtnSm } from "./landingButtons";

const NAV_ITEMS = [
  { label: "Features",   id: "features" },
  { label: "Technology", id: "blockchain" },
  { label: "Workflow",   id: "how-it-works" },
  { label: "Benefits",   id: "benefits" },
  { label: "Impact",     id: "impact" },
];

export default function LandingNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isLanding = pathname === "/";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // Active section tracking — landing page only
  useEffect(() => {
    if (!isLanding) return;
    const onScroll = () => {
      const scrollY = window.scrollY + 200;
      let current = null;
      for (const { id } of NAV_ITEMS) {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) current = id;
      }
      setActiveId(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  // Close mobile menu when viewport grows to lg+
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function scrollToSection(id) {
    setMobileOpen(false);
    if (isLanding) {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${id}`);
    }
  }

  function handleLogo(e) {
    e.preventDefault();
    if (isLanding) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/");
    }
  }

  return (
    <>
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <a
          href="/"
          onClick={handleLogo}
          className="group flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-emerald-600 text-white shadow-md transition group-hover:shadow-lg">
            <HeartPulse size={20} strokeWidth={2.25} />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">HealthChain</span>
        </a>

        {/* Desktop nav items */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {NAV_ITEMS.map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollToSection(id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium transition duration-150 ${
                activeId === id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Login / Register — hidden on mobile (<sm), visible sm+ */}
        <div className="hidden items-center gap-2 sm:flex sm:gap-3">
          <Link className={landingGhostBtn} to="/login">Login</Link>
          <Link className={landingPrimaryBtnSm} to="/register">Register</Link>
        </div>

        {/* Hamburger — visible below lg */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, id }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className={`rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                  activeId === id
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Login / Register only shown in mobile menu on xs (< sm) */}
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:hidden">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileOpen(false)}
              className={landingPrimaryBtnSm}
            >
              Register
            </Link>
          </div>
        </div>
      )}
    </header>
    {/* Reserves the 64 px the fixed header no longer occupies in document flow */}
    <div className="h-16" aria-hidden="true" />
    </>
  );
}
