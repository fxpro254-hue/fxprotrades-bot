"use client";

import { useState, useEffect } from "react";
import LandingPage from "@/components/landing-page";
import Dashboard from "@/components/DashboardV2";
import LoadingScreen from "@/components/LoadingScreen";
import { DerivApiProvider } from "@/contexts/DerivApiContext";
import { getStoredAuth, handleOAuthCallback } from "@/services/derivApi";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for OAuth callback
    const authData = handleOAuthCallback();
    if (authData) {
      setIsAuthenticated(true);
      // Clean up URL
      window.history.replaceState({}, document.title, "/");
    } else {
      // Check for stored auth
      const stored = getStoredAuth();
      if (stored) {
        setIsAuthenticated(true);
      } else {
        // Allow bypass via "Skip login"
        const skip =
          typeof window !== "undefined"
            ? localStorage.getItem("skip_login") === "true"
            : false;
        setIsAuthenticated(skip);
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <LoadingScreen theme="dark" />;
  }

  if (!isAuthenticated) {
    return (
      <DerivApiProvider>
        <LandingPage onAuthenticated={() => setIsAuthenticated(true)} />
      </DerivApiProvider>
    );
  }

  return (
    <DerivApiProvider>
      <Dashboard />
    </DerivApiProvider>
  );
}
