"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { connectWebSocket, disconnectWebSocket, loginWithDeriv, getAccountBalance, subscribeToBalance, unsubscribe } from "@/lib/deriv-api";
import { toast } from "sonner";

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

const DerivAuthContext = createContext<DerivAuthContextType | undefined>(undefined);

// --- DEVELOPMENT MODE FLAG ---
// Set to `true` to bypass Deriv login and directly access the dashboard with mock data.
// Remember to set this to `false` for production builds.
const DEV_MODE_BYPASS_AUTH = true;
// --- END DEVELOPMENT MODE FLAG ---

export const DerivAuthContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState<string | null>(null);
    const [balance, setBalance] = useState<number | null>(null);
    const [currency, setCurrency] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWsConnected, setIsWsConnected] = useState(false);
    const [balanceSubscriptionId, setBalanceSubscriptionId] = useState<string | null>(null);

    const handleWsOpen = useCallback(() => {
        setIsWsConnected(true);
        console.log("WebSocket connection established.");
    }, []);

    const handleWsClose = useCallback(() => {
        setIsWsConnected(false);
        console.log("WebSocket connection closed.");
    }, []);

    const handleWsError = useCallback((error: Event) => {
        console.error("WebSocket error:", error);
        toast.error("WebSocket connection failed. Please try again.");
    }, []);

    useEffect(() => {
        if (DEV_MODE_BYPASS_AUTH) {
            setIsAuthenticated(true);
            setToken("mock_dev_token"); // Provide a mock token
            setBalance(10000.00); // Provide a mock balance
            setCurrency("USD"); // Provide a mock currency
            setIsLoading(false);
            setIsWsConnected(true); // Assume WS is connected in dev mode
            console.log("Development mode: Authentication bypassed.");
        } else {
            const storedToken = localStorage.getItem("deriv_token");
            if (storedToken) {
                setToken(storedToken);
                setIsAuthenticated(true);
            }
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && token && !DEV_MODE_BYPASS_AUTH) { // Only connect WS if not in dev bypass mode
            connectWebSocket(handleWsOpen, handleWsClose, handleWsError);

            const fetchAndSubscribeBalance = async () => {
                try {
                    const initialBalanceResponse = await getAccountBalance(token);
                    setBalance(initialBalanceResponse.balance.balance);
                    setCurrency(initialBalanceResponse.balance.currency);

                    const subId = await subscribeToBalance(token, (newBalanceData) => {
                        setBalance(newBalanceData.balance);
                        setCurrency(newBalanceData.currency);
                        toast.info(`Balance updated: ${newBalanceData.currency} ${newBalanceData.balance}`);
                    });
                    setBalanceSubscriptionId(subId);
                } catch (error) {
                    console.error("Failed to fetch or subscribe to balance:", error);
                    toast.error("Failed to load account balance.");
                    logout(); // Log out if token is invalid or API fails
                }
            };

            fetchAndSubscribeBalance();

            return () => {
                if (balanceSubscriptionId) {
                    unsubscribe(balanceSubscriptionId);
                }
                disconnectWebSocket();
            };
        } else if (!isAuthenticated || DEV_MODE_BYPASS_AUTH) { // Disconnect if not authenticated or if in dev bypass mode (to prevent actual connection)
            disconnectWebSocket();
            if (!DEV_MODE_BYPASS_AUTH) { // Only clear balance if not in dev bypass mode
                setBalance(null);
                setCurrency(null);
            }
            if (balanceSubscriptionId) {
                unsubscribe(balanceSubscriptionId);
                setBalanceSubscriptionId(null);
            }
        }
    }, [isAuthenticated, token, handleWsOpen, handleWsClose, handleWsError, balanceSubscriptionId]);

    const login = useCallback(() => {
        if (DEV_MODE_BYPASS_AUTH) {
            toast.info("Login is bypassed in development mode.");
            setIsAuthenticated(true);
            setToken("mock_dev_token");
            setBalance(10000.00);
            setCurrency("USD");
            setIsLoading(false);
            setIsWsConnected(true);
        } else {
            loginWithDeriv();
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("deriv_token");
        setToken(null);
        setIsAuthenticated(false);
        setBalance(null);
        setCurrency(null);
        setIsWsConnected(false); // Ensure WS is marked as disconnected on logout
        toast.success("Logged out successfully.");
    }, []);

    return (
        <DerivAuthContext.Provider value={{ isAuthenticated, token, balance, currency, isLoading, login, logout, isWsConnected }}>
            {children}
        </DerivAuthContext.Provider>
    );
};

export const useDerivAuth = () => {
    const context = useContext(DerivAuthContext);
    if (context === undefined) {
        throw new Error("useDerivAuth must be used within a DerivAuthContextProvider");
    }
    return context;
};