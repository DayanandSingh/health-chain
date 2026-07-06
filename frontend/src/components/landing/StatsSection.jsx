import { useEffect, useRef, useState } from "react";
import { FileText, ShieldCheck, Stethoscope, Users } from "lucide-react";
import SectionHeader from "./SectionHeader";

const stats = [
  {
    icon: Users,
    label: "Patients",
    value: "12,500+",
    numericValue: 12500,
    iconBg: "bg-blue-100 text-healthcare-blue",
  },
  {
    icon: Stethoscope,
    label: "Doctors",
    value: "3,200+",
    numericValue: 3200,
    iconBg: "bg-emerald-100 text-healthcare-emerald-dark",
  },
  {
    icon: FileText,
    label: "Medical Records",
    value: "48,000+",
    numericValue: 48000,
    iconBg: "bg-indigo-100 text-indigo-600",
  },
  {
    icon: ShieldCheck,
    label: "Verified Records",
    value: "47,950+",
    numericValue: 47950,
    iconBg: "bg-emerald-50 text-emerald-700",
  },
];

const ANIM_STYLES = `
  @keyframes stat-icon-in {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .stat-section-visible .stat-icon {
    animation-name: stat-icon-in;
    animation-duration: 0.4s;
    animation-timing-function: ease-out;
    animation-iteration-count: 1;
    animation-fill-mode: backwards;
  }
  @media (hover: hover) {
    .stat-card:hover {
      transform: translateY(-5px);
      border-color: rgb(147 197 253 / 0.6);
      box-shadow: 0 0 0 1px rgba(20, 184, 166, 0.2), 0 10px 28px -5px rgba(29, 78, 216, 0.12);
    }
  }
`;

function StatCard({ icon: Icon, label, numericValue, iconBg, triggered }) {
  const [count, setCount] = useState(0);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!triggered || hasRun.current) return;
    hasRun.current = true;
    let rafId;
    const duration = 1300;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * numericValue));
      if (progress < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [triggered, numericValue]);

  return (
    <article className="stat-card group rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-lg shadow-slate-200/60 transition duration-300">
      <span
        className={`stat-icon mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg} transition group-hover:scale-105`}
      >
        <Icon size={26} strokeWidth={1.75} />
      </span>
      <div className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900">
        {count.toLocaleString()}+
      </div>
      <div className="mt-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </article>
  );
}

export default function StatsSection() {
  const sectionRef = useRef(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add("stat-section-visible");
          setTriggered(true);
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
      id="impact"
      className="border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white py-14 sm:py-16 lg:py-20"
    >
      <style>{ANIM_STYLES}</style>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Impact"
          title="Platform at a Glance"
          description="Sample platform statistics demonstrating secure healthcare record management."
        />

        <div className="mt-10 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:mt-12 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} triggered={triggered} />
          ))}
        </div>
      </div>
    </section>
  );
}
