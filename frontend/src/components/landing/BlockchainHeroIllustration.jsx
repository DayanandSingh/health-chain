const KEYFRAMES = `
  /* Shield: vertical-only, 7px, 4.8s — no rotation, no scale */
  @keyframes hc-shield-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-7px); }
  }
  /* Cards: 3px max, two phase variants for stagger */
  @keyframes hc-card-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-3px); }
  }
  @keyframes hc-card-float-alt {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(3px); }
  }
  /* Glow: opacity-only, no scale */
  @keyframes hc-glow-pulse {
    0%, 100% { opacity: 0.45; }
    50%       { opacity: 0.85; }
  }
  @keyframes hc-fade-up {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0px); }
  }
  .hc-shield { animation: hc-shield-float 4.8s ease-in-out infinite; }
  .hc-glow   { animation: hc-glow-pulse 3.5s ease-in-out infinite; }
  /* Cards: 6–7s, 2–3px, staggered delays so they never move in sync */
  .hc-card-1 { animation: hc-fade-up .5s ease-out .2s both, hc-card-float     6.5s ease-in-out 1.0s infinite; }
  .hc-card-2 { animation: hc-fade-up .5s ease-out .4s both, hc-card-float-alt 7.0s ease-in-out 1.8s infinite; }
  .hc-card-3 { animation: hc-fade-up .5s ease-out .6s both, hc-card-float-alt 6.2s ease-in-out 2.5s infinite; }
  .hc-card-4 { animation: hc-fade-up .5s ease-out .8s both, hc-card-float     7.2s ease-in-out 0.5s infinite; }
`;

export default function BlockchainHeroIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      <style>{KEYFRAMES}</style>

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/3 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute right-1/3 bottom-1/3 h-56 w-56 translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-300/20 blur-3xl" />
      </div>

      {/* Background SVG — hex grid, cubes, connection lines, shield glow */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 440 440"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="hcShieldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#3B82F6" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
          {/* Motion paths for animateMotion dots — invisible, used as travel rails */}
          <path id="hc-mp1" d="M 126 80  L 197 197" />
          <path id="hc-mp2" d="M 314 80  L 243 197" />
          <path id="hc-mp3" d="M 126 360 L 197 243" />
          <path id="hc-mp4" d="M 314 360 L 243 243" />
        </defs>

        {/* Hex outlines — very subtle */}
        <polygon points="110,80 95,106 65,106 50,80 65,54 95,54"              fill="none" stroke="#3B82F6" strokeWidth="0.8" strokeOpacity="0.14" />
        <polygon points="390,80 375,106 345,106 330,80 345,54 375,54"         fill="none" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.14" />
        <polygon points="105,360 92.5,381.7 67.5,381.7 55,360 67.5,338.3 92.5,338.3"   fill="none" stroke="#10B981" strokeWidth="0.8" strokeOpacity="0.14" />
        <polygon points="385,360 372.5,381.7 347.5,381.7 335,360 347.5,338.3 372.5,338.3" fill="none" stroke="#3B82F6" strokeWidth="0.8" strokeOpacity="0.14" />
        <polygon points="240,60 230,77.3 210,77.3 200,60 210,42.7 230,42.7"   fill="none" stroke="#3B82F6" strokeWidth="0.6" strokeOpacity="0.1" />
        <polygon points="260,220 240,254.6 200,254.6 180,220 200,185.4 240,185.4" fill="none" stroke="#10B981" strokeWidth="0.6" strokeOpacity="0.1" />

        {/* Small blockchain cube decorations */}
        <rect x="42"  y="155" width="20" height="20" rx="4" fill="#DBEAFE" fillOpacity="0.7" stroke="#93C5FD" strokeWidth="1" transform="rotate(15 52 165)" />
        <rect x="378" y="145" width="18" height="18" rx="4" fill="#D1FAE5" fillOpacity="0.7" stroke="#6EE7B7" strokeWidth="1" transform="rotate(-10 387 154)" />
        <rect x="48"  y="285" width="16" height="16" rx="3" fill="#D1FAE5" fillOpacity="0.6" stroke="#6EE7B7" strokeWidth="1" transform="rotate(20 56 293)" />
        <rect x="380" y="275" width="20" height="20" rx="4" fill="#DBEAFE" fillOpacity="0.6" stroke="#93C5FD" strokeWidth="1" transform="rotate(-12 390 285)" />
        <rect x="196" y="385" width="16" height="16" rx="3" fill="#DBEAFE" fillOpacity="0.5" stroke="#93C5FD" strokeWidth="1" transform="rotate(8 204 393)" />
        <rect x="216" y="40"  width="14" height="14" rx="3" fill="#D1FAE5" fillOpacity="0.5" stroke="#6EE7B7" strokeWidth="1" transform="rotate(-5 223 47)" />

        {/* Static dashed guide lines — reduced opacity, no movement */}
        <line x1="126" y1="80"  x2="197" y2="197" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="6 5" />
        <line x1="314" y1="80"  x2="243" y2="197" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="6 5" />
        <line x1="126" y1="360" x2="197" y2="243" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="6 5" />
        <line x1="314" y1="360" x2="243" y2="243" stroke="#3B82F6" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="6 5" />

        {/* Traveling data-flow dots via SVG animateMotion.
            Each line gets two dots staggered by half the duration
            so the flow feels continuous with no flashing. */}

        {/* Line 1 (blue) card-1 top-left → shield */}
        <circle r="2.5" fill="#3B82F6" fillOpacity="0.58">
          <animateMotion dur="5.5s" repeatCount="indefinite" begin="0s"><mpath href="#hc-mp1" /></animateMotion>
        </circle>
        <circle r="1.8" fill="#3B82F6" fillOpacity="0.28">
          <animateMotion dur="5.5s" repeatCount="indefinite" begin="-2.75s"><mpath href="#hc-mp1" /></animateMotion>
        </circle>

        {/* Line 2 (green) card-2 top-right → shield */}
        <circle r="2.5" fill="#10B981" fillOpacity="0.52">
          <animateMotion dur="6.0s" repeatCount="indefinite" begin="-1.0s"><mpath href="#hc-mp2" /></animateMotion>
        </circle>
        <circle r="1.8" fill="#10B981" fillOpacity="0.26">
          <animateMotion dur="6.0s" repeatCount="indefinite" begin="-4.0s"><mpath href="#hc-mp2" /></animateMotion>
        </circle>

        {/* Line 3 (green) card-3 bottom-left → shield */}
        <circle r="2.5" fill="#10B981" fillOpacity="0.52">
          <animateMotion dur="5.8s" repeatCount="indefinite" begin="-0.5s"><mpath href="#hc-mp3" /></animateMotion>
        </circle>
        <circle r="1.8" fill="#10B981" fillOpacity="0.26">
          <animateMotion dur="5.8s" repeatCount="indefinite" begin="-3.4s"><mpath href="#hc-mp3" /></animateMotion>
        </circle>

        {/* Line 4 (blue) card-4 bottom-right → shield */}
        <circle r="2.5" fill="#3B82F6" fillOpacity="0.58">
          <animateMotion dur="5.2s" repeatCount="indefinite" begin="-1.5s"><mpath href="#hc-mp4" /></animateMotion>
        </circle>
        <circle r="1.8" fill="#3B82F6" fillOpacity="0.28">
          <animateMotion dur="5.2s" repeatCount="indefinite" begin="-4.1s"><mpath href="#hc-mp4" /></animateMotion>
        </circle>

        {/* Junction dots on card side */}
        <circle cx="126" cy="80"  r="3" fill="#3B82F6" fillOpacity="0.55" />
        <circle cx="314" cy="80"  r="3" fill="#10B981" fillOpacity="0.55" />
        <circle cx="126" cy="360" r="3" fill="#10B981" fillOpacity="0.55" />
        <circle cx="314" cy="360" r="3" fill="#3B82F6" fillOpacity="0.55" />
        {/* Junction dot at shield center */}
        <circle cx="220" cy="220" r="4" fill="#3B82F6" fillOpacity="0.7" />

        {/* Shield ambient glow circle */}
        <circle cx="220" cy="220" r="82" fill="url(#hcShieldGlow)" className="hc-glow" />

        {/* Tiny floating particles */}
        <circle cx="168" cy="138" r="2.5" fill="#3B82F6" fillOpacity="0.38" />
        <circle cx="278" cy="128" r="2"   fill="#10B981" fillOpacity="0.38" />
        <circle cx="154" cy="305" r="2.5" fill="#10B981" fillOpacity="0.38" />
        <circle cx="282" cy="316" r="2"   fill="#3B82F6" fillOpacity="0.38" />
        <circle cx="220" cy="128" r="1.5" fill="#3B82F6" fillOpacity="0.3" />
        <circle cx="220" cy="312" r="1.5" fill="#10B981" fillOpacity="0.3" />
      </svg>

      {/* Central floating shield */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="hc-shield relative">
          {/* Glow ring behind shield */}
          <div className="hc-glow absolute -inset-5 rounded-full bg-gradient-to-br from-blue-400/25 to-emerald-400/20 blur-xl" />

          <svg width="112" height="132" viewBox="0 0 112 132" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hcShieldBody" x1="0" y1="0" x2="112" y2="132" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1D4ED8" />
                <stop offset="1" stopColor="#059669" />
              </linearGradient>
              <linearGradient id="hcShieldSheen" x1="56" y1="0" x2="56" y2="132" gradientUnits="userSpaceOnUse">
                <stop stopColor="white" stopOpacity="0.18" />
                <stop offset="0.65" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Shield body */}
            <path
              d="M56 4L8 24V65C8 94 30 117 56 128C82 117 104 94 104 65V24L56 4Z"
              fill="url(#hcShieldBody)"
            />
            {/* Sheen overlay */}
            <path
              d="M56 4L8 24V65C8 94 30 117 56 128C82 117 104 94 104 65V24L56 4Z"
              fill="url(#hcShieldSheen)"
            />
            {/* Border */}
            <path
              d="M56 4L8 24V65C8 94 30 117 56 128C82 117 104 94 104 65V24L56 4Z"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.22"
              fill="none"
            />
            {/* Lock body */}
            <rect x="39" y="68" width="34" height="26" rx="5.5" fill="white" fillOpacity="0.93" />
            {/* Lock shackle */}
            <path
              d="M47 68V61C47 54 65 54 65 61V68"
              stroke="white"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeOpacity="0.93"
              fill="none"
            />
            {/* Keyhole circle */}
            <circle cx="56" cy="80" r="4.5" fill="url(#hcShieldBody)" />
            {/* Keyhole stem */}
            <rect x="54.5" y="80" width="3" height="6" rx="1" fill="url(#hcShieldBody)" />
          </svg>
        </div>
      </div>

      {/* Four floating glassmorphism role cards */}
      <div className="hc-card-1 absolute left-0 top-[8%]">
        <RoleCard icon="👤" title="Patient"    sub="Owns Medical Records"    accent="blue" />
      </div>
      <div className="hc-card-2 absolute right-0 top-[8%]">
        <RoleCard icon="👨‍⚕️" title="Doctor"    sub="Secure Access"          accent="green" />
      </div>
      <div className="hc-card-3 absolute bottom-[8%] left-0">
        <RoleCard icon="🛡"  title="Admin"     sub="System Management"      accent="blue" />
      </div>
      <div className="hc-card-4 absolute bottom-[8%] right-0">
        <RoleCard icon="🔗" title="Blockchain" sub="Tamper-Proof Verification" accent="green" wider />
      </div>
    </div>
  );
}

function RoleCard({ icon, title, sub, accent, wider = false }) {
  return (
    <div
      className={[
        "flex items-start gap-2 rounded-2xl border p-2.5 shadow-md backdrop-blur-sm",
        wider ? "w-[144px] sm:w-[150px]" : "w-[112px] sm:w-[126px]",
        accent === "blue"
          ? "border-blue-200/70  bg-white/88 shadow-blue-100/70"
          : "border-emerald-200/70 bg-white/88 shadow-emerald-100/70",
      ].join(" ")}
    >
      {/* Icon chip */}
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm",
          accent === "blue" ? "bg-blue-50" : "bg-emerald-50",
        ].join(" ")}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-0.5">
          {/* wider cards have enough room; others keep truncate as safety */}
          <span className={`text-[11px] font-bold text-slate-800 ${wider ? "" : "truncate"}`}>{title}</span>
          {/* Green verification tick */}
          <svg className="ml-0.5 h-3 w-3 shrink-0 text-emerald-500" viewBox="0 0 12 12" fill="currentColor">
            <path d="M10.28 2.28a1 1 0 0 0-1.414 0L4.5 6.647 3.134 5.28a1 1 0 0 0-1.414 1.414l2.072 2.072a1 1 0 0 0 1.414 0l5.074-5.073a1 1 0 0 0 0-1.414Z" />
          </svg>
        </div>
        <p className="mt-0.5 text-[9px] leading-tight text-slate-500">{sub}</p>
      </div>
    </div>
  );
}
