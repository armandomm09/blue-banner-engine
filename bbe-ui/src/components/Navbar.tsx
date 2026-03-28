import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../auth/AuthContext";

const Navbar: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isMobile = window.innerWidth < 768;

      if (isHomePage && !isMobile) {
        const shouldShow = currentScrollY > 100 || currentScrollY > lastScrollY;
        setIsVisible(shouldShow);
      } else {
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    const handleResize = () => {
      if (window.innerWidth < 768 || !isHomePage) {
        setIsVisible(true);
      } else if (window.scrollY <= 100) {
        setIsVisible(false);
      }
    };

    if (isHomePage && window.innerWidth >= 768) {
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [isHomePage, lastScrollY]);

  // Close menu when location changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    // { to: "/", label: "Home" },
    { to: "/matchpoint", label: "Matchpoint" },
    ...(user
      ? [
        { to: "/welcome", label: "Home" },
        { to: "/forms", label: "Forms" },
        { to: "/scout/pit", label: "Pit" },
        { to: "/scout/match", label: "Match" },
        { to: "/visualize/teams", label: "Visualize" },
        { to: "/strategy", label: "Strategy" },
        {
          to: "/forms/submissions",
          label: "Submissions",
          active:
            isActive("/forms/submissions") ||
            isActive("/dashboard/submissions"),
        },
        { to: "/admin/settings", label: "Settings" },
      ]
      : []),
  ];

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed top-0 left-0 right-0 z-50 w-full bg-background/90 backdrop-blur-md border-b border-border shadow-2xl"
          >
            <div className="container mx-auto max-w-7xl px-6 py-3 flex justify-between items-center">
              <div className="flex items-center gap-8">
                <Link
                  to="/"
                  className="text-2xl font-black text-white hover:text-accent transition-all tracking-tighter"
                >
                  BBE<span className="text-accent">.</span>
                </Link>

                <div className="hidden md:flex items-center gap-1">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      label={link.label}
                      active={
                        link.active !== undefined
                          ? link.active
                          : isActive(link.to)
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden p-2 text-text-muted hover:text-white transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                      <line x1="3" y1="6" x2="21" y2="6"></line>
                      <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                  )}
                </button>

                {!user ? (
                  <Link
                    to="/login"
                    className="px-5 py-2 rounded-xl bg-accent text-background font-bold text-sm hover:shadow-[0_0_20px_rgba(0,238,228,0.4)] transition-all"
                  >
                    Login
                  </Link>
                ) : (
                  <Link to="/welcome" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold text-xs group-hover:bg-accent group-hover:text-background transition-all">
                      {user.email?.[0].toUpperCase()}
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-[60] md:hidden"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[300px] bg-background border-r border-border z-[70] md:hidden p-6 flex flex-col gap-8 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <Link
                  to="/"
                  className="text-2xl font-black text-white tracking-tighter"
                  onClick={() => setIsMenuOpen(false)}
                >
                  BBE<span className="text-accent">.</span>
                </Link>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-text-muted hover:text-white transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsMenuOpen(false)}
                    className={`px-4 py-3 rounded-xl text-lg font-bold transition-all ${(
                      link.active !== undefined
                        ? link.active
                        : isActive(link.to)
                    )
                      ? "text-accent bg-accent/10"
                      : "text-text-muted hover:text-white hover:bg-white/5"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {user && (
                <div className="mt-auto pt-6 border-t border-border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent font-bold">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-text-muted">
                      Logged in as
                    </span>
                    <span className="text-sm font-medium text-white truncate max-w-[150px]">
                      {user.email}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const NavLink = ({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) => (
  <Link
    to={to}
    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${active
      ? "text-accent bg-accent/10"
      : "text-text-muted hover:text-white hover:bg-white/5"
      }`}
  >
    {label}
  </Link>
);

export default Navbar;
