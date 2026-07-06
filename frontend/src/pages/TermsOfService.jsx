import { useEffect } from "react";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import LandingNav from "../components/landing/LandingNav";
import LandingFooter from "../components/landing/LandingFooter";

const contact = [
  { icon: Building2, text: "HealthChain Development Center" },
  { icon: MapPin,    text: "GV Mall, Boring Road, Patna" },
  { icon: Mail,      text: "support@healthchain.io" },
  { icon: Phone,     text: "+91 98765 43210" },
];

export default function TermsOfService() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <LandingNav />

      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-10">
          <span className="inline-block rounded-full border border-blue-200/70 bg-blue-50 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-healthcare-blue">
            Legal
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
            Rules and responsibilities for using the HealthChain platform.
          </p>
          <div className="mt-6 h-px bg-slate-200" />
        </div>

        {/* Sections */}
        <div className="space-y-10">

          {/* 1 */}
          <section>
            <h2 className="border-l-4 border-healthcare-blue pl-3 text-lg font-semibold text-slate-900">
              1. Authorized Users
            </h2>
            <ul className="mt-3 space-y-2.5 pl-1">
              {["Patient", "Doctor", "Administrator"].map((role) => (
                <li key={role} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  {role}
                </li>
              ))}
            </ul>
          </section>

          {/* 2 */}
          <section>
            <h2 className="border-l-4 border-healthcare-blue pl-3 text-lg font-semibold text-slate-900">
              2. User Responsibilities
            </h2>
            <ul className="mt-3 space-y-2.5 pl-1">
              {[
                "Maintain accurate profile information.",
                "Protect login credentials.",
                "Upload only authentic medical records.",
                "Respect patient privacy.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="border-l-4 border-healthcare-blue pl-3 text-lg font-semibold text-slate-900">
              3. Medical Records
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Only authorized users may upload or access medical records according to granted permissions.
            </p>
          </section>

          {/* 4 */}
          <section>
            <h2 className="border-l-4 border-healthcare-blue pl-3 text-lg font-semibold text-slate-900">
              4. Blockchain Verification
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Uploaded medical records are protected using blockchain hash verification to maintain integrity and prevent tampering.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="border-l-4 border-healthcare-blue pl-3 text-lg font-semibold text-slate-900">
              5. Limitation
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              HealthChain is a secure electronic health record management platform intended for educational and demonstration purposes. It does not replace professional medical advice or hospital information systems.
            </p>
          </section>

          {/* 6 – Contact */}
          <section>
            <h2 className="border-l-4 border-healthcare-blue pl-3 text-lg font-semibold text-slate-900">
              6. Contact
            </h2>
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:p-6">
              <div className="space-y-3">
                {contact.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Icon size={16} strokeWidth={1.5} className="shrink-0 text-slate-400" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
        <div className="mt-16 border-t border-slate-200 pt-8 text-center">
          <p className="text-[13px] text-slate-400">Last Updated: July 2026</p>
        </div>

      </main>

      <LandingFooter />
    </div>
  );
}
