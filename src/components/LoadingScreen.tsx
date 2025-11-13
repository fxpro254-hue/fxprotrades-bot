"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  theme?: "light" | "dark";
}

export default function LoadingScreen({ theme = "dark" }: LoadingScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-6">
        {/* Animated Logo */}
        <div className="relative">
          <div className="w-32 h-32 animate-pulse">
            {theme === "dark" ? (
              <img 
                src="/logo-dark.svg" 
                alt="FX PRO" 
                className="w-full h-full animate-bounce"
                style={{
                  animation: "logoZoom 2s ease-in-out infinite, goldGlow 2s ease-in-out infinite"
                }}
              />
            ) : (
              <img 
                src="/logo-light.svg" 
                alt="FX PRO" 
                className="w-full h-full animate-bounce"
                style={{
                  animation: "logoZoom 2s ease-in-out infinite, goldGlow 2s ease-in-out infinite"
                }}
              />
            )}
          </div>
          
          {/* Gold highlight ring */}
          <div 
            className="absolute inset-0 rounded-full border-4 border-yellow-500/50"
            style={{
              animation: "ringPulse 2s ease-in-out infinite"
            }}
          />
        </div>

        {/* Loading text */}
        <div className="text-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            FX PRO
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Where Strategy Meets Success
          </p>
          <div className="flex items-center justify-center mt-3 space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes logoZoom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes goldGlow {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.3)); }
          50% { filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6)); }
        }
        
        @keyframes ringPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
