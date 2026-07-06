import { Link } from "react-router-dom";
import { Building2, GitBranch, HeartPulse, LayoutGrid, Link2, Mail, MapPin, Phone, Scale, ShieldCheck } from "lucide-react";

const footerLinks = {
  About: [
    { icon: LayoutGrid, label: "Features",     href: "/#features" },
    { icon: GitBranch,  label: "How It Works", href: "/#how-it-works" },
    { icon: Link2,      label: "Blockchain",   href: "/#blockchain" },
  ],
  Legal: [
    { icon: ShieldCheck, label: "Privacy Policy",   href: "/privacy-policy" },
    { icon: Scale,       label: "Terms of Service", href: "/terms-of-service" },
  ],
};

const contactItems = [
  { icon: Building2, label: "HealthChain Development Center" },
  { icon: MapPin,    label: "GV Mall, Boring Road, Patna" },
  { icon: Mail,      label: "support@healthchain.io" },
  { icon: Phone,     label: "+91 98765 43210" },
];

export default function LandingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-healthcare-blue to-healthcare-emerald">
                <HeartPulse size={18} />
              </span>
              <span className="text-lg font-bold">HealthChain</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed">
              Secure blockchain-based electronic health record management with role-based access, blockchain verification, and patient-controlled permissions.
            </p>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">About</h3>
            <ul className="mt-3 space-y-2">
              {footerLinks.About.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <a href={href} className="flex items-center gap-2 text-sm transition-colors duration-200 hover:text-emerald-400">
                    <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Contact</h3>
            <ul className="mt-3 space-y-2">
              {contactItems.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <div className="flex items-start gap-2 text-sm">
                    <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
                    <span>{label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Legal</h3>
            <ul className="mt-3 space-y-2">
              {footerLinks.Legal.map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <Link to={href} className="flex items-center gap-2 text-sm text-slate-400 transition-colors duration-200 hover:text-emerald-400">
                    <Icon size={16} strokeWidth={1.5} className="shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-800 pt-6 text-xs sm:flex-row sm:text-sm">
          <p>&copy; {new Date().getFullYear()} HealthChain. All rights reserved.</p>
          <p className="text-slate-500">Built for secure, transparent healthcare record management.</p>
        </div>
      </div>
    </footer>
  );
}
