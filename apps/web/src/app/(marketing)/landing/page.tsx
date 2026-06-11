import { Nav } from "./_components/Nav";
import { Hero } from "./_components/Hero";
import { Features } from "./_components/Features";
import { Proof } from "./_components/Proof";
import { Testimonials } from "./_components/Testimonials";
import { Pricing } from "./_components/Pricing";
import { Faq } from "./_components/Faq";
import { FinalCta } from "./_components/FinalCta";
import { Footer } from "./_components/Footer";

export default function LandingPage() {
  return (
    <div className="lf-landing">
      <Nav />
      <main>
        <Hero />
        <Features />
        <Proof />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
