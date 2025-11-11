'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DerivAPI, logout, getOAuthURL } from '@/lib/deriv-api';

type NavItem = {
    id: string;
    label: string;
    icon: string;
};

const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'bot-builder', label: 'Bot Builder', icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z' },
    { id: 'trader', label: 'DTrader', icon: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' },
    { id: 'smart-trading', label: 'Smart Trading', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { id: 'auto', label: 'Auto', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 'analysis', label: 'Analysis Tool', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'signals', label: 'Signals', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'portfolio', label: 'Portfolio', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'free-bots', label: 'Free Bots', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
];

export default function Dashboard() {
    const [activeNav, setActiveNav] = useState('dashboard');
    const [balance, setBalance] = useState<string>('0.00');
    const [currency, setCurrency] = useState<string>('USD');
    const [ticks, setTicks] = useState<number[]>([]);
    const [botRunning, setBotRunning] = useState(false);

    useEffect(() => {
        const api = new DerivAPI();

        // Get account balance
        api.getAccountBalance((data) => {
            if (data.balance && typeof data.balance === 'object' && 'balance' in data.balance) {
                const balanceData = data.balance as { balance: string; currency: string };
                setBalance(balanceData.balance);
                setCurrency(balanceData.currency);
            }
        });

        // Get tick stream for chart
        api.getTicks('R_100', (data) => {
            if (data.tick && typeof data.tick === 'object' && 'quote' in data.tick) {
                const tickData = data.tick as { quote: number };
                setTicks((prev) => [...prev.slice(-50), tickData.quote]);
            }
        });

        return () => {
            api.disconnect();
        };
    }, []);

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    const handleLogin = () => {
        // Clear skip flag if present and redirect to Deriv OAuth
        try {
            localStorage.removeItem('skip_login');
        } catch {}
        window.location.href = getOAuthURL();
    };

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-card border-r border-border flex flex-col">
                {/* Logo */}
                <div className="p-6 border-b border-border">
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
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveNav(item.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeNav === item.id
                                ? 'bg-yellow-500 text-black font-semibold shadow-lg shadow-yellow-500/30'
                                : 'text-foreground hover:bg-muted'
                                }`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            <span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Account info */}
                <div className="p-4 border-t border-border space-y-2">
                    <div className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <p className="text-lg font-bold text-yellow-500">{currency} {balance}</p>
                    </div>
                    <Button
                        onClick={handleLogin}
                        className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black"
                    >
                        Login with Deriv
                    </Button>
                    <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full border-yellow-500/30 hover:bg-destructive hover:text-destructive-foreground"
                    >
                        Logout
                    </Button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="bg-card border-b border-border p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">DBot Dashboard</h2>
                            <p className="text-muted-foreground">Choose an action to get started with your trading bot</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${botRunning ? 'bg-green-500/20 text-green-500' : 'bg-muted'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${botRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                                <span className="text-sm font-medium">
                                    {botRunning ? 'Bot is running' : 'Bot is not running'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content area */}
                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Quick Actions */}
                        <Card className="p-6 border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-all">
                                    <svg className="w-6 h-6 text-yellow-500 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">Import Bot</h3>
                                    <p className="text-sm text-muted-foreground">Load your existing bot configuration</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-all">
                                    <svg className="w-6 h-6 text-yellow-500 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">Build New Bot</h3>
                                    <p className="text-sm text-muted-foreground">Create a bot from scratch</p>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6 border-yellow-500/20 hover:border-yellow-500/50 transition-all cursor-pointer group">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500 transition-all">
                                    <svg className="w-6 h-6 text-yellow-500 group-hover:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">Quick Strategy</h3>
                                    <p className="text-sm text-muted-foreground">Start with a pre-built template</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Live Chart */}
                    <Card className="mt-6 p-6 border-yellow-500/20">
                        <h3 className="font-semibold text-lg mb-4">Live Market - Volatility 100 Index</h3>
                        <div className="h-64 bg-black/50 rounded-lg p-4 relative overflow-hidden">
                            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                                <polyline
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="2"
                                    points={ticks.map((tick, i) => `${i * (400 / ticks.length)},${200 - (tick - Math.min(...ticks)) / (Math.max(...ticks) - Math.min(...ticks)) * 180}`).join(' ')}
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#eab308" />
                                        <stop offset="100%" stopColor="#f59e0b" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            {ticks.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-muted-foreground">Loading market data...</p>
                                </div>
                            )}
                        </div>
                        {ticks.length > 0 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Current Price</p>
                                    <p className="text-2xl font-bold text-yellow-500">{ticks[ticks.length - 1]?.toFixed(2)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Change</p>
                                    <p className={`text-2xl font-bold ${ticks[ticks.length - 1] > ticks[0] ? 'text-green-500' : 'text-red-500'}`}>
                                        {((ticks[ticks.length - 1] - ticks[0]) / ticks[0] * 100).toFixed(2)}%
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
                                        <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium">Welcome to FxProTrades</p>
                                        <p className="text-sm text-muted-foreground">Get started by creating your first bot</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
