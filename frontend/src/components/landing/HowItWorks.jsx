import { useEffect, useRef } from "react";
import { Blocks, FileUp, Hash, Share2, UserPlus } from "lucide-react";
import SectionHeader from "./SectionHeader";

const steps = [
  {
    step: "01",
    icon: UserPlus,
    title: "Register",
    text: "Create a secure patient or doctor account with verified credentials and a blockchain wallet address.",
  },
  {
    step: "02",
    icon: FileUp,
    title: "Upload Record",
    text: "Authorized users upload medical reports and clinical data with diagnosis and prescription details.",
  },
  {
    step: "03",
    icon: Hash,
    title: "Generate Hash",
    text: "The system generates a SHA256 hash of the record payload for tamper-evident verification.",
  },
  {
    step: "04",
    icon: Blocks,
    title: "Store Blockchain Hash",
    text: "The generated record hash is securely stored on the blockchain for integrity verification.",
  },
  {
    step: "05",
    icon: Share2,
    title: "Share Secure Access",
    text: "Patients securely grant or revoke access so authorized doctors can view shared medical records.",
  },
];

const ANIM_STYLES = `
  @keyframes hw-icon-in {
    from { transform: scale(0.95); }
    to   { transform: scale(1); }
  }
  .hw-section-visible .hw-icon {
    animation: hw-icon-in 0.3s ease-out 1;
  }
  @media (hover: hover) {
    .hw-card:hover {
      transform: translateY(-5px);
      border-color: rgb(147 197 253 / 0.55);
      box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.25), 0 10px 28px -5px rgba(29, 78, 216, 0.12);
    }
  }
`;

function StepCard({ step, icon: Icon, title, text }) {
  return (
    <article className="hw-card group relative flex flex-1 flex-col items-center rounded-[18px] border border-slate-100 bg-white px-4 py-5 text-center shadow-[0_2px_14px_-3px_rgba(15,23,42,0.07),0_1px_4px_-1px_rgba(15,23,42,0.04)] transition-all duration-300 ease-in-out">
      <div className="hw-icon relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 shadow-sm">
        <Icon className="text-healthcare-blue" size={28} strokeWidth={1.75} />
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-healthcare-blue to-healthcare-emerald text-[11px] font-bold text-white shadow-[0_3px_8px_rgba(29,78,216,0.35)]">
          {step}
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-[240px] text-sm leading-relaxed text-slate-600">{text}</p>
    </article>
  );
}

function StepConnector({ vertical = false }) {
  if (vertical) {
    return (
      <div className="flex flex-col items-center py-1">
        <div className="h-6 w-px bg-gradient-to-b from-blue-400/40 to-emerald-400/40" />
        <svg width="10" height="7" viewBox="0 0 10 7" fill="none">
          <path d="M1 1 L5 6 L9 1" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="hidden shrink-0 items-center self-start pt-14 lg:flex">
      <div className="flex items-center">
        <div className="h-px w-6 bg-gradient-to-r from-blue-400/45 to-emerald-400/45" />
        <svg width="8" height="10" viewBox="0 0 8 10" fill="none">
          <path d="M1 1.5 L6.5 5 L1 8.5" stroke="rgba(16,185,129,0.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("hw-section-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="bg-slate-50 py-14 sm:py-16 lg:py-20"
    >
      <style>{ANIM_STYLES}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Workflow"
          title="How It Works"
          description="From registration to secure sharing — a clear workflow for trusted healthcare records."
        />

        {/* Desktop: horizontal flow with connectors */}
        <div className="mt-10 hidden lg:mt-14 lg:flex lg:items-start lg:justify-between lg:gap-0">
          {steps.map((item, index) => (
            <div key={item.title} className="flex flex-1 items-start">
              <StepCard {...item} />
              {index < steps.length - 1 && <StepConnector />}
            </div>
          ))}
        </div>

        {/* Mobile / tablet: vertical timeline */}
        <div className="mt-10 lg:hidden">
          {steps.map((item, index) => (
            <div key={item.title}>
              <StepCard {...item} />
              {index < steps.length - 1 && <StepConnector vertical />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
