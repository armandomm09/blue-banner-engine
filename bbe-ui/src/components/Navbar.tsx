import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (isHomePage) {
        // On HomePage: show navbar when scrolling down, hide when scrolling up
        // Also show if we're not in the hero section (scrollY > 100)
        const shouldShow = currentScrollY > 100 || currentScrollY > lastScrollY;
        setIsVisible(shouldShow);
      } else {
        // On other pages: always show navbar
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Set initial visibility based on current page
    if (isHomePage) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage, lastScrollY]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed top-0 left-0 right-0 z-50 w-full p-4 bg-background/95 backdrop-blur-sm border-b border-border shadow-lg"
        >
          <div className="container mx-auto max-w-7xl flex justify-between items-center">
            <Link 
              to="/" 
              className="text-2xl font-bold text-white hover:text-accent transition-colors"
            >
              BBE
            </Link>
            <div className="flex items-center space-x-6">
              <Link 
                to="/" 
                className="text-lg text-text-muted hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link 
                to="/matchpoint" 
                className="text-lg text-white bg-accent/80 hover:bg-accent px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Matchpoint
              </Link>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default Navbar; 