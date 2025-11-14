"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDerivApi } from "@/contexts/DerivApiContext";
import { tradingService, CONTRACT_TYPES, DURATION_UNITS, BASIS_TYPES } from "@/services/tradingService";
import type { ContractProposal, PortfolioPosition, TransactionRecord } from "@/services/tradingService";

// Navigation items
const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "bot-builder", label: "Bot Builder" },
  { id: "dtrader", label: "DTrader" },
  { id: "smart-trading", label: "Smart Trading" },
  { id: "auto", label: "Auto" },
  { id: "analysis-tool", label: "Analysis Tool" },
  { id: "signals", label: "Signals" },
  { id: "portfolio", label: "Portfolio" },
  { id: "free-bots", label: "Free Bots" },
  { id: "enhanced-trading", label: "Enhanced Trading" },
];

export default function DashboardV2() {
  const {
    isConnected,
    isAuthorized,
    isLoading,
    accountInfo,
    balance,
    logout,
    error,
    clearError,
    subscribeToTicks,
  } = useDerivApi();

  const [activeNav, setActiveNav] = useState("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [ticks, setTicks] = useState<number[]>([]);
  const [botRunning, setBotRunning] = useState(false);
  
  // Trading state
  const [currentProposal, setCurrentProposal] = useState<ContractProposal | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState("R_100");
  const [tradeAmount, setTradeAmount] = useState(10);

  const handleNavClick = (id: string) => {
    setActiveNav(id);
  };

  const handleLogout = () => {
    logout();
    // Redirect logic can be added here
  };

  // Initialize theme
  useEffect(() => {
    const storedTheme =
      typeof window !== "undefined"
        ? (localStorage.getItem("theme") as "light" | "dark" | null)
        : null;
    const initial = storedTheme ?? "dark";
    setTheme(initial);

    if (typeof document !== "undefined") {
      if (initial === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  // Subscribe to ticks for chart
  useEffect(() => {
    if (isAuthorized) {
      const subscription = subscribeToTicks(selectedSymbol, (data) => {
        if (data.tick) {
          setTicks(prev => [...prev.slice(-49), data.tick.quote]);
        }
      });

      return () => {
        subscription.then(sub => sub?.unsubscribe());
      };
    }
  }, [isAuthorized, selectedSymbol, subscribeToTicks]);

  // Load portfolio and transactions
  useEffect(() => {
    if (isAuthorized) {
      loadPortfolio();
      loadTransactions();
    }
  }, [isAuthorized]);

  const loadPortfolio = async () => {
    try {
      const portfolioData = await tradingService.getPortfolio();
      setPortfolio(portfolioData);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const transactionData = await tradingService.getTransactionHistory(20);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  // Generate chart points
  const computePolylinePoints = (tickData: number[]): string => {
    if (tickData.length < 2) return "";
    
    const min = Math.min(...tickData);
    const max = Math.max(...tickData);
    const range = max - min || 1;
    
    return tickData
      .map((tick, index) => {
        const x = (index / (tickData.length - 1)) * 380 + 10;
        const normalized = (tick - min) / range;
        const y = 200 - normalized * 180;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const points = computePolylinePoints(ticks);

  // Show loading state while connecting with timeout
  if (isLoading || !isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold mb-2">Connecting to Deriv API...</h2>
          <p className="text-muted-foreground mb-4">
            {isLoading ? "Initializing connection..." : "Establishing WebSocket connection..."}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm"
            className="mt-2"
          >
            Skip Connection & Continue
          </Button>
        </Card>
      </div>
    );
  }

  // Show error if there's a connection issue
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 max-w-md">
          <h2 className="text-lg font-semibold text-red-500 mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={clearError} className="w-full">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header section with responsive navigation */}
        <header className="bg-card border-b border-border">
          {/* Mobile: Compact layout */}
          <div className="sm:hidden p-3">
            {/* Top row: Logo, Balance, Logout */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-sm font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">FX PRO</h1>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-xs font-semibold">
                    {balance ? `${balance.balance} ${balance.currency}` : "0.00 USD"}
                  </p>
                </div>
                <Button onClick={handleLogout} variant="outline" size="sm" className="text-xs px-3 py-1">
                  Logout
                </Button>
              </div>
            </div>
            
            {/* Navigation - horizontal scroll with arrow buttons */}
            <div className="w-full relative">
              <div 
                id="mobile-nav"
                className="flex gap-2 overflow-x-scroll pb-2 scrollbar-hide scroll-smooth"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                  touchAction: 'pan-x',
                  overscrollBehaviorX: 'contain'
                }}
              >
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`px-3 py-2 rounded-md text-xs whitespace-nowrap flex-shrink-0 transition-all ${
                      activeNav === item.id
                        ? "bg-yellow-500 text-black font-semibold"
                        : "text-foreground bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => handleNavClick("settings")}
                  className={`px-3 py-2 rounded-md text-xs whitespace-nowrap flex-shrink-0 transition-all ${
                    activeNav === "settings"
                      ? "bg-yellow-500 text-black font-semibold"
                      : "text-foreground bg-muted hover:bg-muted/80"
                  }`}
                >
                  Settings
                </button>
              </div>
              
              {/* Arrow buttons for scrolling */}
              <button
                onClick={() => {
                  const nav = document.getElementById('mobile-nav');
                  if (nav) nav.scrollBy({ left: -200, behavior: 'smooth' });
                }}
                className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-background to-transparent flex items-center justify-center text-foreground hover:text-yellow-500"
              >
                ←
              </button>
              <button
                onClick={() => {
                  const nav = document.getElementById('mobile-nav');
                  if (nav) nav.scrollBy({ left: 200, behavior: 'smooth' });
                }}
                className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent flex items-center justify-center text-foreground hover:text-yellow-500"
              >
                →
              </button>
            </div>
          </div>

          {/* Desktop: Two-row layout */}
          <div className="hidden sm:block px-6 py-4">
            {/* Top row: Logo and Account info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">FX PRO</h1>
              </div>
              <p className="text-xs text-muted-foreground">Trading Bot</p>
              <div className="flex items-center space-x-3">
                {/* Account summary and actions */}
                <div className="bg-muted rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground leading-none">Balance</p>
                  <p className="text-sm font-semibold text-yellow-500 leading-tight">
                    {balance ? `${balance.currency} ${balance.balance}` : "USD 0.00"}
                  </p>
                </div>
                <div className={`px-3 py-2 rounded-lg hidden lg:flex items-center space-x-2 ${botRunning ? "bg-green-500/20 text-green-500" : "bg-muted"}`}>
                  <div className={`w-2 h-2 rounded-full ${botRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
                  <span className="text-xs">{botRunning ? "Bot running" : "Bot stopped"}</span>
                </div>
                <Button
                  onClick={handleLogout}
                  size="sm"
                  variant="outline"
                  className="border-yellow-500/30 hover:bg-destructive hover:text-destructive-foreground"
                >
                  Logout
                </Button>
              </div>
            </div>

            {/* Bottom row: Navigation */}
            <div className="w-full">
              <nav className="overflow-x-auto overflow-y-hidden scroll-smooth whitespace-nowrap no-scrollbar">
                <div className="flex items-center space-x-2 min-w-max pb-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`px-4 py-2 rounded-md transition-all flex-shrink-0 ${
                        activeNav === item.id
                          ? "bg-yellow-500 text-black font-semibold"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => handleNavClick("settings")}
                    className={`px-4 py-2 rounded-md transition-all flex-shrink-0 ${
                      activeNav === "settings"
                        ? "bg-yellow-500 text-black font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    Settings
                  </button>
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          {/* Connection Status */}
          {!isConnected && (
            <Card className="p-4 mb-4 border-yellow-500/20 bg-yellow-500/10">
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                🔄 Connecting to Deriv API...
              </p>
            </Card>
          )}

          {activeNav === "dashboard" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                {/* Quick Actions */}
                <Card className="p-4 sm:p-6 border-yellow-500/20">
                  <h3 className="font-semibold text-lg mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Button 
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                      onClick={() => setActiveNav("dtrader")}
                    >
                      Start Trading
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-yellow-500/30"
                      onClick={() => setActiveNav("bot-builder")}
                    >
                      Build Bot
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full border-yellow-500/30"
                      onClick={() => setActiveNav("portfolio")}
                    >
                      View Portfolio
                    </Button>
                  </div>
                </Card>

                {/* Account Overview */}
                <Card className="p-4 sm:p-6 border-yellow-500/20">
                  <h3 className="font-semibold text-lg mb-4">Account Overview</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Balance</span>
                      <span className="font-semibold text-yellow-500">
                        {balance ? `${balance.balance} ${balance.currency}` : "0.00 USD"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Account ID</span>
                      <span className="font-semibold text-xs">
                        {accountInfo?.loginid || "Not connected"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span className={`text-xs font-semibold ${isAuthorized ? "text-green-500" : "text-red-500"}`}>
                        {isAuthorized ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Live Chart */}
                <Card className="p-4 sm:p-6 border-yellow-500/20">
                  <h3 className="font-semibold text-lg mb-4">
                    Live Market - {selectedSymbol}
                  </h3>
                  <div className="h-64 bg-black/50 rounded-lg p-4 relative overflow-hidden">
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 400 200"
                      style={{ background: "transparent" }}
                    >
                      {points && (
                        <polyline
                          fill="none"
                          stroke="#eab308"
                          strokeWidth="2"
                          points={points}
                        />
                      )}
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#eab308" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {ticks.length > 0 && (
                      <div className="absolute bottom-2 right-2 text-xs text-yellow-500 font-mono">
                        {ticks[ticks.length - 1]?.toFixed(4)}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="p-4 sm:p-6 border-yellow-500/20">
                <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {transactions.length > 0 ? (
                    transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.transaction_id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                        <div>
                          <p className="text-sm font-medium">{transaction.action_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.transaction_time * 1000).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${transaction.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {transaction.amount >= 0 ? "+" : ""}{transaction.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Balance: {transaction.balance_after}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  )}
                </div>
              </Card>
            </>
          )}

          {activeNav === "settings" && (
            <Card className="p-4 sm:p-6 border-yellow-500/20">
              <h3 className="font-semibold text-lg mb-4">Appearance</h3>
              <div className="bg-muted rounded-lg p-4">
                <div className="mb-4">
                  <p className="font-medium">Theme</p>
                  <p className="text-sm text-muted-foreground">Toggle application color scheme</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => {
                      setTheme("light");
                      if (typeof document !== "undefined") {
                        document.documentElement.classList.remove("dark");
                      }
                      try { localStorage.setItem("theme", "light"); } catch {}
                    }}
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => {
                      setTheme("dark");
                      if (typeof document !== "undefined") {
                        document.documentElement.classList.add("dark");
                      }
                      try { localStorage.setItem("theme", "dark"); } catch {}
                    }}
                  >
                    Dark
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Other navigation items can be implemented here */}
          {activeNav !== "dashboard" && activeNav !== "settings" && (
            <Card className="p-4 sm:p-6 border-yellow-500/20">
              <h3 className="font-semibold text-lg mb-4">{navItems.find(item => item.id === activeNav)?.label || "Coming Soon"}</h3>
              <p className="text-muted-foreground">This feature is under development and will be available soon.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
