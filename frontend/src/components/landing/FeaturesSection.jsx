import { useEffect, useRef } from "react";
import {
  ClipboardList,
  Fingerprint,
  KeyRound,
  Lock,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import SectionHeader from "./SectionHeader";

const features = [
  {
    icon: Lock,
    title: "Secure Medical Records",
    text: "Medical data is protected with encryption, access controls, and secure off-chain storage for reports and attachments.",
  },
  {
    icon: ShieldCheck,
    title: "Blockchain Verification",
    text: "Record hashes are anchored on-chain so any unauthorized change can be detected during verification.",
  },
  {
    icon: Fingerprint,
    title: "Role Based Access",
    text: "Patients, doctors, and administrators access the platform through secure role-based permissions, ensuring controlled and authorized access to medical records.",
  },
  {
    icon: KeyRound,
    title: "Patient Controlled Permissions",
    text: "Patients grant and revoke read, write, and update access to their records at any time.",
  },
  {
    icon: ScrollText,
    title: "Audit Trail",
    text: "Every login, record view, upload, permission change, and verification is logged for accountability.",
  },
  {
    icon: ClipboardList,
    title: "Encrypted Storage",
    text: "Large medical files are stored off-chain with content identifiers while sensitive metadata stays protected.",
  },
];

const ANIM_STYLES = `
  @keyframes feat-fade-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes feat-icon-in {
    from { transform: scale(0.95); }
    to   { transform: scale(1); }
  }
  .feat-card { opacity: 0; }
  .feat-card.feat-visible {
    animation: feat-fade-up 0.45s ease-out forwards;
  }
  .feat-card.feat-visible .feat-icon {
    animation-name: feat-icon-in;
    animation-duration: 0.3s;
    animation-timing-function: ease-out;
    animation-delay: var(--feat-delay, 0s);
    animation-iteration-count: 1;
  }
  .feat-accent {
    opacity: 0.75;
    transition: opacity 0.3s ease-in-out;
  }
  @media (hover: hover) {
    .feat-card:hover {
      transform: translateY(-6px);
      border-color: rgb(191 219 254 / 0.7);
      box-shadow: 0 10px 32px -6px rgba(29, 78, 216, 0.13), 0 4px 12px -3px rgba(15, 23, 42, 0.07);
    }
    .feat-card:hover .feat-accent {
      opacity: 1;
    }
  }
`;

export default function FeaturesSection() {
  const gridRef = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          grid.querySelectorAll(".feat-card").forEach((card) => {
            card.classList.add("feat-visible");
          });
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="bg-white py-14 sm:py-16 lg:py-20">
      <style>{ANIM_STYLES}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Features"
          title="Platform Features"
          description="Everything you need for secure, patient-centric electronic health record management."
        />

        <div
          ref={gridRef}
          className="mt-10 grid auto-rows-fr gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:mt-12"
        >
          {features.map(({ icon: Icon, title, text }, i) => (
            <article
              key={title}
              className="feat-card group relative flex h-full flex-col overflow-hidden rounded-[18px] border border-slate-100 bg-white p-6 shadow-[0_2px_14px_-3px_rgba(15,23,42,0.07),0_1px_4px_-1px_rgba(15,23,42,0.04)] transition-all duration-300 ease-in-out"
              style={{ '--feat-delay': `${i * 0.08}s`, animationDelay: `${i * 0.08}s` }}
            >
              {/* Top accent line */}
              <div className="feat-accent absolute inset-x-0 top-0 h-[3px] rounded-t-[18px] bg-gradient-to-r from-blue-500 to-emerald-500" />

              {/* Icon container */}
              <span className="feat-icon inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 text-healthcare-blue shadow-sm ring-1 ring-slate-100/80 transition-all duration-300 group-hover:scale-105 group-hover:from-healthcare-blue group-hover:to-healthcare-emerald group-hover:text-white group-hover:shadow-md group-hover:ring-0">
                <Icon size={26} strokeWidth={1.75} />
              </span>

              {/* Title */}
              <h3 className="mt-5 text-[1.0625rem] font-semibold leading-snug text-slate-900">{title}</h3>

              {/* Description */}
              <p className="mt-2.5 flex-1 text-sm leading-[1.7] text-slate-500">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
