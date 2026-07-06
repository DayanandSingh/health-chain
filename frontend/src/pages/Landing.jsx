import { useEffect } from "react";
import LandingNav from "../components/landing/LandingNav";
import HeroSection from "../components/landing/HeroSection";
import FeaturesSection from "../components/landing/FeaturesSection";
import BlockchainSection from "../components/landing/BlockchainSection";
import HowItWorks from "../components/landing/HowItWorks";
import BenefitsSection from "../components/landing/BenefitsSection";
import StatsSection from "../components/landing/StatsSection";
import LandingFooter from "../components/landing/LandingFooter";

export default function Landing() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const t = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen scroll-smooth bg-white text-slate-900 antialiased">
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <BlockchainSection />
        <HowItWorks />
        <BenefitsSection />
        <StatsSection />
      </main>
      <LandingFooter />
    </div>
  );
}
