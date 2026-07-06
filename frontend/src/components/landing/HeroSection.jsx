import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { landingPrimaryBtn, landingSecondaryBtn } from "./landingButtons";
import BlockchainHeroIllustration from "./BlockchainHeroIllustration";

const BADGES = [
  { icon: "🛡", label: "Secure" },
  { icon: "⛓", label: "Immutable" },
  { icon: "👥", label: "Role Based" },
  { icon: "📋", label: "Audit Trail" },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/40">
      {/* Radial accent blobs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.12),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.1),_transparent_50%)]" />
      {/* Very subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle, #1D4ED8 1px, transparent 1px)", backgroundSize: "30px 30px" }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:px-8 lg:py-24 xl:gap-16">

        {/* ── LEFT CONTENT ── */}
        <div className="order-2 lg:order-1">

          {/* Premium badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/90 px-4 py-1.5 text-sm font-semibold text-blue-700 shadow-sm">
            <span>🛡</span>
            <span>Blockchain Secured Healthcare</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.75rem]">
            <span className="text-blue-800">Health</span>
            <span className="text-emerald-600">Chain</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-xl text-lg font-semibold leading-snug text-slate-800 sm:text-xl">
            Secure Blockchain Based Electronic Health Record Management System
          </p>

          {/* Description */}
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            Patient-owned medical records with tamper-proof verification, role-based
            access, and a complete audit trail for trusted healthcare delivery.
          </p>

          {/* CTA buttons */}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/register" className={landingPrimaryBtn}>
              Get Started
              <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
            <a href="#features" className={landingSecondaryBtn}>
              Learn More
              <ChevronDown size={18} />
            </a>
          </div>

          {/* Feature badges */}
          <div className="mt-7 flex flex-wrap gap-2">
            {BADGES.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
              >
                <span>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT ILLUSTRATION ── */}
        <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
          <BlockchainHeroIllustration />
        </div>

      </div>
    </section>
  );
}
