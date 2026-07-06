export default function SectionHeader({ eyebrow, title, description, dark = false, className = "" }) {
  return (
    <div className={`mx-auto max-w-2xl text-center ${className}`}>
      {eyebrow && (
        <p
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
            dark ? "text-emerald-300" : "text-healthcare-blue"
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${
          dark ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className={`mt-3 text-base leading-relaxed ${dark ? "text-blue-100/90" : "text-slate-600"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
