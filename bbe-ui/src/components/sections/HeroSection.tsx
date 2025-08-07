import { motion, type MotionValue, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import bbeLogo from '../../assets/bbe_logo.png';
import SimpleParallax from "simple-parallax-js";
import { generateDecorations } from '../../config/decorations.generator';
import { useMemo } from 'react';


// Animated Tagline Component
const AnimatedTagline = () => {
  const text = "AI-Powered FRC Scouting Platform";
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
  };
  const childVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      aria-label={text}
      className="inline-block px-4 py-2 bg-accent/20 text-accent rounded-full text-sm font-semibold mb-6"
    >
      {text.split("").map((char, index) => (
        <motion.span key={index} variants={childVariants} className="inline-block">
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.span>
  );
};

interface HeroSectionProps {
    scrollYProgress: MotionValue<number>;
  }
  
  export const HeroSection: React.FC<HeroSectionProps> = ({ scrollYProgress }) => {
    // ✅ New generator config for a denser, more intense, and more colorful field
    const decorations = useMemo(() => generateDecorations({
      layers: [
        { gridSize: [4, 3], speedRange: [120, 200], opacityRange: [0.1, 0.2] },  // Farthest
        { gridSize: [5, 4], speedRange: [200, 350], opacityRange: [0.2, 0.3] }, // Mid-ground
        { gridSize: [3, 3], speedRange: [350, 600], opacityRange: [0.3, 0.4] }, // Foreground
      ]
    }), []);
  
    const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  
  
    return (
        
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-background text-white">
        
        {/* Procedurally generated background decorations */}
        {decorations.map(deco => {
          const { id, component: DecorationComponent, className, style, speed } = deco;
          const y = useTransform(scrollYProgress, [0, 1], ["0%", `${speed}%`]);
          return <DecorationComponent key={id} y={y} className={className} style={style} />;
        })}
        
        {/* Main Content (with a high z-index to stay on top) */}
        <motion.div 
          style={{ y: contentY }}
          className="relative z-30 text-center flex flex-col items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <AnimatedTagline />
         
          {/* ✅ Bigger Logo */}
          <SimpleParallax>
            <img src={bbeLogo} alt="BBE Logo" className="w-48 md:w-80 pt-5 " />
          </SimpleParallax>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-4 leading-tight">
            Blue Banner Engine
          </h1>
          <p className="max-w-4xl mx-auto text-xl md:text-2xl text-text-muted font-light leading-relaxed">
            Transform data into <span className="text-accent font-semibold">actionable intelligence.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-10">
              <Link 
                to="/matchpoint" 
                className="px-8 py-3 bg-accent hover:bg-accent/90 text-white rounded-full font-bold text-lg transition-all duration-300 shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/40 transform hover:-translate-y-1"
              >
                Start Predicting
              </Link>
              <Link 
                to="/docs/api/v1" 
                className="px-8 py-3 border-2 border-accent/30 text-accent hover:bg-accent/10 rounded-full font-semibold text-lg transition-all duration-300 hover:border-accent"
              >
                View API Docs
              </Link>
            </div>
        </motion.div>
      </section>
    );
  };