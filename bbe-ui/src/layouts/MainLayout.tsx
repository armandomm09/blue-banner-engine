import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

const MainLayout: React.FC = () => {
  const location = useLocation();

  const routesWithoutNavbar: string[] = ["/login", "/signup", "/verify"];
  const routesWithoutPadding: string[] = ["/"];

  const showNavbar = !routesWithoutNavbar.includes(location.pathname);

  const hasPadding = !routesWithoutPadding.includes(location.pathname);

  return (
    <div className="min-h-screen bg-background">
      {showNavbar && <Navbar />}

      <main className={hasPadding && showNavbar ? "pt-20" : ""}>
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
