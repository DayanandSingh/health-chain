import { useEffect, useRef } from "react";
import { Clock, History, Share2, ShieldCheck } from "lucide-react";
import SectionHeader from "./SectionHeader";

const benefits = [
  {
    icon: ShieldCheck,
    title: "No Record Tampering",
    text: "Hash verification on-chain detects any unauthorized change to stored medical record data.",
  },
  {
    icon: Clock,
    title: "Faster Healthcare",
    text: "Authorized doctors can instantly access verified medical records after receiving patient permission.",
  },
  {
    icon: Share2,
    title: "Secure Sharing",
    text: "Patients securely grant or revoke access so only authorized doctors can view shared medical records.",
  },
  {
    icon: History,
    title: "Verified Medical History",
    text: "Verified medical records with a complete audit trail improve trust and continuity of care.",
  },
];

const ANIM_STYLES = `
  @keyframes ben-icon-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .ben-section-visible .ben-icon {
    animation-name: ben-icon-in;
    animation-duration: 0.4s;
    animation-timing-function: ease-out;
    animation-iteration-count: 1;
    animation-fill-mode: backwards;
  }
  @media (hover: hover) {
    .ben-card:hover {
      transform: translateY(-5px);
      border-color: rgb(167 243 208 / 0.8);
      box-shadow: 0 8px 24px -4px rgba(16, 185, 129, 0.12), 0 2px 8px -2px rgba(15, 23, 42, 0.06);
    }
  }
`;

export default function BenefitsSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("ben-section-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="benefits" className="bg-white py-14 sm:py-16 lg:py-20">
      <style>{ANIM_STYLES}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Benefits"
          title="Key Benefits"
          description="HealthChain delivers measurable advantages for patients and healthcare providers alike."
        />

        <div className="mt-10 grid auto-rows-fr gap-5 sm:grid-cols-2 sm:gap-6 lg:mt-12 lg:grid-cols-4">
          {benefits.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="ben-card group flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-md shadow-slate-200/40 transition duration-300"
            >
              <span className="ben-icon inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-healthcare-emerald-dark transition duration-300 group-hover:scale-105 group-hover:bg-healthcare-emerald group-hover:text-white group-hover:shadow-md">
                <Icon size={26} strokeWidth={1.75} />
              </span>
              <h3 className="mt-5 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
