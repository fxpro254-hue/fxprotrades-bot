"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getOAuthURL, logout as derivLogout } from "@/lib/deriv-api";

interface DerivAuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  balance: number | null;
  currency: string | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isWsConnected: boolean;
}

const DerivAuthContext = createContext<DerivAuthContextType | undefined>(
  undefined,
);

export const DerivAuthContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWsConnected] = useState(false);

  useEffect(() => {
    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("deriv_token")
        : null;
    const skip =
      typeof window !== "undefined"
        ? localStorage.getItem("skip_login") === "true"
        : false;
    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
    } else if (skip) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(() => {
    window.location.href = getOAuthURL();
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("skip_login");
    } catch {}
    derivLogout();
    setToken(null);
    setIsAuthenticated(false);
    setBalance(null);
    setCurrency(null);
  }, []);

  return (
    <DerivAuthContext.Provider
      value={{
        isAuthenticated,
        token,
        balance,
        currency,
        isLoading,
        login,
        logout,
        isWsConnected,
      }}
    >
      {children}
    </DerivAuthContext.Provider>
  );
};

export const useDerivAuth = () => {
  const context = useContext(DerivAuthContext);
  if (context === undefined) {
    throw new Error(
      "useDerivAuth must be used within a DerivAuthContextProvider",
    );
  }
  return context;
};
