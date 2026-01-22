import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";

const DEFAULT_ACCENT_COLOR = "#00eee4";

export const ThemeManager = ({ children }: { children: React.ReactNode }) => {
  const { team } = useAuth();

  useEffect(() => {
    const accentColor = team?.accent_color || DEFAULT_ACCENT_COLOR;

    document.documentElement.style.setProperty("--color-accent", accentColor);

    return () => {
      document.documentElement.style.setProperty(
        "--color-accent",
        DEFAULT_ACCENT_COLOR
      );
    };
  }, [team]);

  return <>{children}</>;
};

export default ThemeManager;
