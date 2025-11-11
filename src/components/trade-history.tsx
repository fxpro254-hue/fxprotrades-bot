'use client';

import { Card } from '@/components/ui/card';
import { mockTradeHistory, mockSessions, calculateStats } from '@/lib/trade-history';

export default function TradeHistory() {
    const stats = calculateStats(mockTradeHistory);
    const currentSession = mockSessions.find(s => s.status === 'running');

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 border-yellow-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Trades</p>
                            <p className="text-3xl font-bold text-yellow-500">{stats.totalTrades}</p>
                        </div>
                        <svg className="w-12 h-12 text-yellow-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                </Card>

                <Card className="p-6 border-green-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Win Rate</p>
                            <p className="text-3xl font-bold text-green-500">{stats.winRate.toFixed(1)}%</p>
                        </div>
                        <svg className="w-12 h-12 text-green-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </Card>

                <Card className="p-6 border-yellow-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Profit</p>
                            <p className={`text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${stats.totalProfit.toFixed(2)}
                            </p>
                        </div>
                        <svg className="w-12 h-12 text-yellow-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </Card>

                <Card className="p-6 border-yellow-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Profit/Trade</p>
                            <p className={`text-3xl font-bold ${stats.avgProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${stats.avgProfit.toFixed(2)}
                            </p>
                        </div>
                        <svg className="w-12 h-12 text-yellow-500/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                </Card>
            </div>

            {/* Current Session */}
            {currentSession && (
                <Card className="p-6 border-yellow-500/30 bg-yellow-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-yellow-500">Active Trading Session</h3>
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-500 font-medium">Live</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Strategy</p>
                            <p className="font-medium">{currentSession.strategyName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Trades</p>
                            <p className="font-medium">{currentSession.totalTrades}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Win/Loss</p>
                            <p className="font-medium text-green-500">{currentSession.wins}</p>
                            <span className="text-muted-foreground">/</span>
                            <p className="font-medium text-red-500 inline">{currentSession.losses}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Session P/L</p>
                            <p className={`font-medium ${currentSession.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                ${currentSession.totalProfit.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Trade List */}
            <Card className="border-yellow-500/20">
                <div className="p-6 border-b border-border">
                    <h3 className="text-lg font-semibold">Recent Trades</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Symbol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Stake</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entry</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Exit</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Result</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {mockTradeHistory.map((trade) => (
                                <tr key={trade.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {trade.timestamp.toLocaleTimeString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {trade.symbol}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${trade.type === 'CALL'
                                                ? 'bg-green-500/20 text-green-500'
                                                : 'bg-red-500/20 text-red-500'
                                            }`}>
                                            {trade.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        ${trade.stake.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {trade.entryPrice.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {trade.exitPrice.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${trade.result === 'win'
                                                ? 'bg-green-500/20 text-green-500'
                                                : 'bg-red-500/20 text-red-500'
                                            }`}>
                                            {trade.result.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <span className={trade.profit >= 0 ? 'text-green-500' : 'text-red-500'}>
                                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
