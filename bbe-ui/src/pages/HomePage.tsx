import { useRef } from "react";
import { useScroll, motion } from "framer-motion";
import { HeroSection } from "../components/sections/HeroSection";
import { FeatureShowcase } from "../components/sections/FeatureShowcase";
import { Link } from "react-router-dom";

const HomePage: React.FC = () => {
  const targetRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  return (
    <main
      className="min-h-screen font-['Poppins'] bg-background"
      ref={targetRef}
    >
      <HeroSection scrollYProgress={scrollYProgress} />
      <FeatureShowcase />

      {/* Premium CTA Section */}
      <section className="py-20 sm:py-24 md:py-32 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/5 to-background pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-3xl sm:rounded-[40px] p-6 sm:p-8 md:p-16 text-center shadow-2xl overflow-hidden relative"
          >
            {/* Decorative glow */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-snug md:leading-tight">
              Elevate Your Team Beyond the <br />
              <span className="text-accent italic font-black">Blue Banner</span>
            </h2>

            <p className="text-base sm:text-lg md:text-xl text-text-muted mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed px-2 sm:px-0">
              BBE isn't just a tool, it's your team's tactical edge. Join elite teams
              using data-driven intelligence to dominate the field.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 sm:gap-6 mt-4">
              <Link
                to="/signup"
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-accent hover:bg-accent/90 text-background font-black text-base sm:text-lg rounded-2xl transition-all duration-300 shadow-[0_0_30px_rgba(0,238,228,0.3)] hover:shadow-[0_0_50px_rgba(0,238,228,0.5)] transform hover:-translate-y-1 active:scale-95"
              >
                START YOUR JOURNEY
              </Link>

              <Link
                to="/matchpoint"
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white/5 hover:bg-white/10 text-white font-bold text-base sm:text-lg rounded-2xl transition-all duration-300 border border-white/10 backdrop-blur-md"
              >
                Explore Matchpoint
              </Link>
            </div>

            <div className="mt-8 sm:mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-8 opacity-40 grayscale transition-all">
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-white uppercase">
                Data Precision
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:block" />
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-white uppercase">
                Real-Time Sync
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-white/20 hidden sm:block" />
              <span className="text-[10px] sm:text-xs font-black tracking-widest text-white uppercase">
                IA Powered
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );

};

export default HomePage;
