"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getOAuthURL, AFFILIATE_LINK } from "@/lib/deriv-api";

export default function LandingPage({
  onAuthenticated,
}: { onAuthenticated: () => void }) {
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  useEffect(() => {
    // Show welcome dialog on first visit
    const timer = setTimeout(() => setShowWelcomeDialog(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = () => {
    window.location.href = getOAuthURL();
  };

  const handleCreateAccount = () => {
    window.open(AFFILIATE_LINK, "_blank");
  };

  const handleSkipLogin = () => {
    try {
      localStorage.setItem("skip_login", "true");
    } catch {}
    onAuthenticated();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main content */}
      <Card className="w-full max-w-md mx-4 p-8 bg-card/95 backdrop-blur-sm border-2 border-yellow-500/20 shadow-2xl">
        <div className="text-center space-y-6">
          {/* Logo/Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/50 transform rotate-12">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center -rotate-12">
                <svg
                  className="w-10 h-10 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
              Welcome to FxProTrades
            </h1>
            <p className="text-muted-foreground mt-2">
              Sign in to access your trading workspace
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-semibold py-6 text-lg shadow-lg shadow-yellow-500/30 transition-all"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              Login with Deriv
            </Button>

            <Button
              onClick={handleCreateAccount}
              variant="outline"
              className="w-full border-yellow-500/50 hover:bg-yellow-500/10 hover:border-yellow-500 py-6 text-lg"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              Create Account
            </Button>

            <Button
              onClick={handleSkipLogin}
              variant="secondary"
              className="w-full bg-muted hover:bg-muted/80 py-6 text-lg"
            >
              Skip login
            </Button>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Powered by{" "}
              <span className="text-yellow-500 font-semibold">Deriv</span>
            </p>
            <button
              className="text-xs text-yellow-500 hover:text-yellow-400 mt-2 underline"
              onClick={() => setShowWelcomeDialog(true)}
            >
              Risk Disclaimer
            </button>
          </div>
        </div>
      </Card>

      {/* Welcome Dialog */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="bg-card border-yellow-500/20">
          <DialogHeader>
            <DialogTitle className="text-2xl text-yellow-500">
              Welcome to FxProTrades!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p>
              Ready to automate your trading strategy without writing any code?
              You've come to the right place.
            </p>
            <p>
              Check out these guides and FAQs to learn more about building your
              bot:
            </p>

            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-500">Guide</h3>
              <p className="text-muted-foreground">
                Deriv Bot - your automated trading partner
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-yellow-500">FAQs</h3>
              <ul className="text-muted-foreground space-y-1">
                <li>• What is Deriv Bot?</li>
                <li>• Where do I find the blocks I need?</li>
                <li>• How do I remove blocks from the workspace?</li>
              </ul>
            </div>

            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-xs">
              <p className="font-semibold text-destructive mb-2">
                Risk Warning:
              </p>
              <p className="text-muted-foreground">
                Deriv offers complex products, including options and CFDs, which
                carry significant risks. Trading CFDs involves leverage, which
                can amplify both profits and losses, potentially leading to the
                loss of your entire investment. Trade only with money you can
                afford to lose and never borrow to trade. Understand the risks
                before trading.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
