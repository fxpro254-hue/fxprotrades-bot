"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DerivAPI, logout } from "@/lib/deriv-api-enhanced";

type NavItem = {
  id: string;
  label: string;
  icon: string;
};

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    id: "bot-builder",
    label: "Bot Builder",
    icon: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  },
  {
    id: "trader",
    label: "DTrader",
    icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  },
  {
    id: "smart-trading",
    label: "Smart Trading",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  },
  { id: "auto", label: "Auto", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  {
    id: "analysis",
    label: "Analysis Tool",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    id: "signals",
    label: "Signals",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    id: "free-bots",
    label: "Free Bots",
    icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  },
  {
    id: "enhanced-trading",
    label: "Enhanced Trading",
    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  },
];

export default function Dashboard() {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [balance, setBalance] = useState<string>("0.00");
  const [currency, setCurrency] = useState<string>("USD");
  const [ticks, setTicks] = useState<number[]>([]);
  const [botRunning, setBotRunning] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [navOrder, setNavOrder] = useState([...navItems, { id: "settings", label: "Settings" }]);
  
  const handleNavClick = (id: string) => {
    setActiveNav(id);
    
    // Move clicked item to the front
    const allItems = [...navItems, { id: "settings", label: "Settings" }];
    const clickedItem = allItems.find(item => item.id === id);
    const otherItems = allItems.filter(item => item.id !== id);
    
    if (clickedItem) {
      setNavOrder([clickedItem, ...otherItems]);
    }
  };

  useEffect(() => {
    // Initialize theme from storage
    const storedTheme =
      typeof window !== "undefined"
        ? (localStorage.getItem("theme") as "light" | "dark" | null)
        : null;
    const initial = storedTheme ?? "dark";
    setTheme(initial);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", initial === "dark");
    }

    const api = new DerivAPI();
    let balanceSubId: string | null = null;
    let ticksSubId: string | null = null;

    // Authorize if token exists, then subscribe to balance
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("deriv_token")
        : null;
    if (token) {
      api.authorize(token).then(() => {
        api.subscribeBalance(
          (data) => {
            if (data.balance) {
              setBalance(data.balance.balance.toString());
              setCurrency(data.balance.currency);
            }
          },
          (subId) => {
            balanceSubId = subId;
          },
        );
      }).catch(console.error);
    } else {
      // No auth: perform a one-off public balance fetch (will likely be empty)
      api.getAccountBalance().then((data) => {
        if (data.balance) {
          setBalance(data.balance.balance.toString());
          setCurrency(data.balance.currency);
        }
      }).catch(console.error);
    }

    // Ticks subscription for chart
    api.subscribeTicks(
      "R_100",
      (data) => {
        if (data.tick) {
          setTicks((prev) => [...prev.slice(-50), data.tick.quote]);
        }
      },
      (subId) => {
        ticksSubId = subId;
      },
    );

    return () => {
      if (balanceSubId) api.unsubscribe(balanceSubId);
      if (ticksSubId) api.unsubscribe(ticksSubId);
      api.disconnect();
    };
  }, []);

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  // Helper to compute polyline points safely
  const computePolylinePoints = (arr: number[]) => {
    if (!arr || arr.length < 2) return "";
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const range = max - min || 1; // avoid division by zero
    return arr
      .map((tick, i) => {
        const x = i * (400 / arr.length);
        const normalized = (tick - min) / range; // 0..1
        const y = 200 - normalized * 180; // leave some padding
        return `${x},${y}`;
      })
      .join(" ");
  };

  const points = computePolylinePoints(ticks);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main container */}
      <div className="flex-1 flex flex-col">
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
                <h1 className="text-sm font-bold text-yellow-500">FxProTrades</h1>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <p className="text-xs font-semibold">{balance} {currency}</p>
                </div>
                <Button onClick={handleLogout} variant="outline" size="sm" className="text-xs px-2 py-1">
                  Out
                </Button>
              </div>
            </div>
            
            {/* Navigation - reordering system */}
            <div className="w-full">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {navOrder.map((item) => (
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
              </div>
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
                <div>
                  <h1 className="text-lg font-bold text-yellow-500">FxProTrades</h1>
                  <p className="text-xs text-muted-foreground">Trading Bot</p>
                </div>
              </div>

              {/* Account summary and actions */}
              <div className="flex items-center space-x-3">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <p className="text-[10px] text-muted-foreground leading-none">Balance</p>
                  <p className="text-sm font-semibold text-yellow-500 leading-tight">
                    {currency} {balance}
                  </p>
                </div>
                <div className={`px-3 py-2 rounded-lg hidden lg:flex items-center space-x-2 ${botRunning ? "bg-green-500/20 text-green-500" : "bg-muted"}`}>
                  <div className={`w-2 h-2 rounded-full ${botRunning ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
                  <span className="text-xs">{botRunning ? "Bot running" : "Bot stopped"}</span>
                </div>
                <Button
                  onClick={handleLogout}
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
                  {navOrder.map((item) => (
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
                </div>
              </nav>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          {activeNav === "dashboard" && (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Quick Actions */}
            <Card className="p-4 sm:p-6 border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-all">
                  <svg
                    className="w-6 h-6 text-yellow-500 group-hover:text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Import Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    Load your existing bot configuration
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-all">
                  <svg
                    className="w-6 h-6 text-yellow-500 group-hover:text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Build New Bot</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a bot from scratch
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-all">
                  <svg
                    className="w-6 h-6 text-yellow-500 group-hover:text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">Quick Strategy</h3>
                  <p className="text-sm text-muted-foreground">
                    Start with a pre-built template
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Live Chart */}
          <Card className="mt-6 p-6 border-yellow-500/20">
            <h3 className="font-semibold text-lg mb-4">
              Live Market - Volatility 100 Index
            </h3>
            <div className="h-64 bg-black/50 rounded-lg p-4 relative overflow-hidden">
              <svg
                className="w-full h-full"
                viewBox="0 0 400 200"
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="2"
                  points={points}
                />
                <defs>
                  <linearGradient
                    id="gradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#eab308" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              {ticks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">
                    Loading market data...
                  </p>
                </div>
              )}
            </div>
            {ticks.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {ticks[ticks.length - 1]?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Change</p>
                  <p
                    className={`text-2xl font-bold ${ticks[ticks.length - 1] > ticks[0] ? "text-green-500" : "text-red-500"}`}
                  >
                    {(
                      ((ticks[ticks.length - 1] - ticks[0]) / ticks[0]) *
                      100
                    ).toFixed(2)}
                    %
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Recent Activity */}
          <Card className="mt-6 p-6 border-yellow-500/20">
            <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Welcome to FxProTrades</p>
                    <p className="text-sm text-muted-foreground">
                      Get started by creating your first bot
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          </>
          )}

          {activeNav === "enhanced-trading" && (
            <div>
              <Card className="p-6 border-yellow-500/20 mb-6">
                <h3 className="text-xl font-semibold mb-2">Enhanced Trading Platform</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Access the new advanced trading features including real-time proposals, risk management, and portfolio analytics.
                </p>
                <div className="flex items-center space-x-3">
                  <Button 
                    onClick={() => window.open('/enhanced', '_blank')} 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black"
                  >
                    Open Enhanced Trading
                  </Button>
                  <Button onClick={() => setActiveNav("dashboard")} variant="outline">
                    Back to Dashboard
                  </Button>
                </div>
              </Card>
              
              <Card className="p-6 border-yellow-500/20">
                <h4 className="font-semibold text-lg mb-4">New Features Available</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">🎯 Advanced Trading Interface</h5>
                    <p className="text-sm text-muted-foreground">Real-time contract proposals with all parameters and instant execution</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">📊 Professional Portfolio</h5>
                    <p className="text-sm text-muted-foreground">Complete position management with P&L tracking and performance analytics</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">🛡️ Risk Management</h5>
                    <p className="text-sm text-muted-foreground">Intelligent position sizing and automated risk controls</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h5 className="font-medium mb-2">📈 Market Analysis</h5>
                    <p className="text-sm text-muted-foreground">Technical indicators, trend analysis, and price alerts</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeNav !== "dashboard" && activeNav !== "settings" && activeNav !== "enhanced-trading" && (
            <Card className="p-8 border-yellow-500/20">
              <h3 className="text-xl font-semibold mb-2">{navItems.find((n) => n.id === activeNav)?.label}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                This section is under active development. Core real-time data, portfolio, transactions and trading helpers
                are available in the API layer. UI workflows for "{navItems.find((n) => n.id === activeNav)?.label}" will be enabled here.
              </p>
              <div className="flex items-center space-x-3">
                <Button onClick={() => setActiveNav("dashboard")} variant="outline">
                  Back to Dashboard
                </Button>
              </div>
            </Card>
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
        </div>
      </div>
    </div>
  );
}
