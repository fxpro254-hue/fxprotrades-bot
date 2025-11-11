'use client';

import { useState, useEffect } from 'react';
import LandingPage from '@/components/landing-page';
import Dashboard from '@/components/dashboard';
import { getStoredAuth, handleOAuthCallback } from '@/lib/deriv-api';

export default function Home() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for OAuth callback
        const authData = handleOAuthCallback();
        if (authData) {
            setIsAuthenticated(true);
            // Clean up URL
            window.history.replaceState({}, document.title, '/');
        } else {
            // Check for stored auth
            const stored = getStoredAuth();
            setIsAuthenticated(!!stored);
        }
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <LandingPage onAuthenticated={() => setIsAuthenticated(true)} />;
    }

    return <Dashboard />;
}
