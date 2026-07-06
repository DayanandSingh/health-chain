import { useEffect, useRef } from "react";
import { Eye, Link2, Lock, Scale, Shield } from "lucide-react";
import SectionHeader from "./SectionHeader";

const points = [
  {
    icon: Shield,
    title: "Tamper Proof Records",
    text: "Cryptographic hashes ensure medical record integrity and detect unauthorized modifications instantly.",
  },
  {
    icon: Eye,
    title: "Transparency",
    text: "Permission grants, revocations, and blockchain verification provide transparent access control for patients, doctors, and administrators.",
  },
  {
    icon: Lock,
    title: "Security",
    text: "JWT authentication, role-based authorization, and encrypted off-chain storage protect sensitive health data.",
  },
  {
    icon: Link2,
    title: "Decentralized Verification",
    text: "Blockchain anchors record hashes to provide tamper-proof verification and independent integrity checks.",
  },
  {
    icon: Scale,
    title: "Trust",
    text: "Patients, doctors, and administrators rely on blockchain verification to build trust in shared medical records.",
  },
];

const ANIM_STYLES = `
  @keyframes bc-icon-in {
    from { transform: scale(0.95); }
    to   { transform: scale(1); }
  }
  .bc-grid-visible .bc-icon {
    animation: bc-icon-in 0.3s ease-out 1;
  }
  @media (hover: hover) {
    .bc-card:hover {
      transform: translateY(-5px);
      border-color: rgba(59, 130, 246, 0.35);
      box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.28), 0 12px 28px -6px rgba(20, 184, 166, 0.16);
      background-color: rgba(255, 255, 255, 0.10);
    }
  }
`;

export default function BlockchainSection() {
  const gridRef = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          grid.classList.add("bc-grid-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="blockchain"
      className="bg-gradient-to-br from-slate-900 via-healthcare-blue-dark to-slate-900 py-14 text-white sm:py-16 lg:py-20"
    >
      <style>{ANIM_STYLES}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          dark
          eyebrow="Technology"
          title="About Blockchain in HealthChain"
          description="Blockchain does not replace clinical systems — it strengthens them with immutable verification and transparent access control."
        />

        <div
          ref={gridRef}
          className="mt-10 grid auto-rows-fr gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-12 lg:grid-cols-6 lg:gap-5"
        >
          {points.map(({ icon: Icon, title, text }, index) => (
            <article
              key={title}
              className={`bc-card flex h-full flex-col rounded-2xl border border-white/[0.14] bg-white/[0.08] p-5 backdrop-blur-sm transition-all duration-300 ease-in-out sm:p-6 ${
                index < 3 ? "lg:col-span-2" : index === 3 ? "lg:col-span-3" : "lg:col-span-3"
              }`}
            >
              <span className="bc-icon inline-flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                <Icon size={25} strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-base font-semibold sm:text-lg">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-blue-100/85">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
