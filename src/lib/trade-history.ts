export interface TradeExecution {
  id: string;
  timestamp: Date;
  symbol: string;
  type: "CALL" | "PUT";
  stake: number;
  duration: number;
  entryPrice: number;
  exitPrice: number;
  result: "win" | "loss";
  profit: number;
  strategyName: string;
  botId: string;
}

export interface TradingSession {
  id: string;
  startTime: Date;
  endTime: Date | null;
  strategyName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  totalProfit: number;
  initialBalance: number;
  currentBalance: number;
  status: "running" | "completed" | "stopped";
}

// Mock trade history data
export const mockTradeHistory: TradeExecution[] = [
  {
    id: "trade-001",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    symbol: "R_100",
    type: "CALL",
    stake: 1.0,
    duration: 60,
    entryPrice: 1234.56,
    exitPrice: 1235.78,
    result: "win",
    profit: 0.95,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-002",
    timestamp: new Date(Date.now() - 1000 * 60 * 13),
    symbol: "R_100",
    type: "PUT",
    stake: 1.0,
    duration: 60,
    entryPrice: 1235.78,
    exitPrice: 1234.12,
    result: "win",
    profit: 0.95,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-003",
    timestamp: new Date(Date.now() - 1000 * 60 * 11),
    symbol: "R_100",
    type: "CALL",
    stake: 1.0,
    duration: 60,
    entryPrice: 1234.12,
    exitPrice: 1233.45,
    result: "loss",
    profit: -1.0,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-004",
    timestamp: new Date(Date.now() - 1000 * 60 * 9),
    symbol: "R_100",
    type: "CALL",
    stake: 2.0,
    duration: 60,
    entryPrice: 1233.45,
    exitPrice: 1235.67,
    result: "win",
    profit: 1.9,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-005",
    timestamp: new Date(Date.now() - 1000 * 60 * 7),
    symbol: "R_100",
    type: "PUT",
    stake: 1.0,
    duration: 60,
    entryPrice: 1235.67,
    exitPrice: 1236.89,
    result: "loss",
    profit: -1.0,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-006",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    symbol: "R_100",
    type: "CALL",
    stake: 2.0,
    duration: 60,
    entryPrice: 1236.89,
    exitPrice: 1238.45,
    result: "win",
    profit: 1.9,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-007",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    symbol: "R_100",
    type: "PUT",
    stake: 1.0,
    duration: 60,
    entryPrice: 1238.45,
    exitPrice: 1237.23,
    result: "win",
    profit: 0.95,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
  {
    id: "trade-008",
    timestamp: new Date(Date.now() - 1000 * 60 * 1),
    symbol: "R_100",
    type: "CALL",
    stake: 1.0,
    duration: 60,
    entryPrice: 1237.23,
    exitPrice: 1238.9,
    result: "win",
    profit: 0.95,
    strategyName: "Classic Martingale",
    botId: "bot-1",
  },
];

export const mockSessions: TradingSession[] = [
  {
    id: "session-001",
    startTime: new Date(Date.now() - 1000 * 60 * 60 * 2),
    endTime: new Date(Date.now() - 1000 * 60 * 30),
    strategyName: "Classic Martingale",
    totalTrades: 45,
    wins: 32,
    losses: 13,
    totalProfit: 28.5,
    initialBalance: 100.0,
    currentBalance: 128.5,
    status: "completed",
  },
  {
    id: "session-002",
    startTime: new Date(Date.now() - 1000 * 60 * 20),
    endTime: null,
    strategyName: "Classic Martingale",
    totalTrades: 8,
    wins: 6,
    losses: 2,
    totalProfit: 4.7,
    initialBalance: 128.5,
    currentBalance: 133.2,
    status: "running",
  },
];

export function calculateStats(trades: TradeExecution[]) {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === "win").length;
  const losses = trades.filter((t) => t.result === "loss").length;
  const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const avgProfit = totalTrades > 0 ? totalProfit / totalTrades : 0;

  return {
    totalTrades,
    wins,
    losses,
    totalProfit,
    winRate,
    avgProfit,
  };
}

export function getRecentTrades(limit: number = 10): TradeExecution[] {
  return mockTradeHistory.slice(0, limit);
}

export function getTradingSession(id: string): TradingSession | undefined {
  return mockSessions.find((s) => s.id === id);
}
