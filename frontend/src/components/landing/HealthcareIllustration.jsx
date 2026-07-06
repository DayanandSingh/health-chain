export default function HealthcareIllustration({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 480 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="img"
    >
      <rect x="40" y="60" width="400" height="280" rx="24" fill="url(#hcBgGrad)" />
      <rect
        x="60"
        y="90"
        width="160"
        height="120"
        rx="16"
        fill="white"
        fillOpacity="0.98"
        stroke="#E2E8F0"
        strokeWidth="1"
      />
      <rect x="80" y="110" width="80" height="8" rx="4" fill="#93C5FD" />
      <rect x="80" y="130" width="120" height="6" rx="3" fill="#DBEAFE" />
      <rect x="80" y="148" width="100" height="6" rx="3" fill="#DBEAFE" />
      <rect x="80" y="166" width="110" height="6" rx="3" fill="#DBEAFE" />
      <circle cx="320" cy="150" r="56" fill="white" fillOpacity="0.98" stroke="#E2E8F0" strokeWidth="1" />
      <path d="M320 118v64M288 150h64" stroke="#10B981" strokeWidth="10" strokeLinecap="round" />
      <rect
        x="240"
        y="220"
        width="180"
        height="96"
        rx="16"
        fill="white"
        fillOpacity="0.95"
        stroke="#E2E8F0"
        strokeWidth="1"
      />
      <circle cx="270" cy="268" r="16" fill="#DBEAFE" />
      <rect x="300" y="252" width="90" height="8" rx="4" fill="#93C5FD" />
      <rect x="300" y="272" width="70" height="6" rx="3" fill="#DBEAFE" />
      <path
        d="M60 320h360"
        stroke="#34D399"
        strokeWidth="2"
        strokeDasharray="8 6"
        strokeOpacity="0.7"
      />
      <circle cx="120" cy="320" r="10" fill="#10B981" />
      <circle cx="240" cy="320" r="10" fill="#3B82F6" />
      <circle cx="360" cy="320" r="10" fill="#10B981" />
      <defs>
        <linearGradient id="hcBgGrad" x1="40" y1="60" x2="440" y2="340" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EFF6FF" />
          <stop offset="1" stopColor="#ECFDF5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
