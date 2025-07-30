import { useRef } from 'react';
import { useScroll } from 'framer-motion';
import { HeroSection } from '../components/sections/HeroSection';
import { ModulesSection } from '../components/sections/ModulesSection';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
  const targetRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start start", "end start"],
  });

  return (
    <main className="min-h-screen font-['Poppins'] bg-background" ref={targetRef}>
      <HeroSection scrollYProgress={scrollYProgress} />
      <ModulesSection />
      <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-accent/20 to-accent/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Revolutionize Your FRC Strategy?
          </h2>
          <p className="text-xl text-text-muted mb-8">
            Join the teams already using BBE to make data-driven decisions and win more matches.
          </p>
          <Link 
            to="/matchpoint" 
            className="inline-block px-10 py-5 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-xl transition-all duration-300 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transform hover:-translate-y-1"
          >
            Get Started Now
          </Link>
        </div>
      </section>

    </main>
  );
};

export default HomePage;