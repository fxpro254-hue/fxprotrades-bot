export interface StrategyBlock {
  id: string;
  type: "trade" | "condition" | "action" | "indicator";
  category: string;
  label: string;
  description: string;
  config: Record<string, unknown>;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  author: string;
  category: "scalping" | "trend" | "breakout" | "martingale" | "custom";
  difficulty: "beginner" | "intermediate" | "advanced";
  profitability: number;
  blocks: StrategyBlock[];
  stats: {
    trades: number;
    winRate: number;
    avgProfit: number;
  };
}

export const strategyTemplates: Strategy[] = [
  {
    id: "martingale-classic",
    name: "Classic Martingale",
    description:
      "Double your stake after each loss to recover losses with a single win",
    author: "FxProTrades",
    category: "martingale",
    difficulty: "beginner",
    profitability: 72,
    blocks: [
      {
        id: "start",
        type: "action",
        category: "start",
        label: "Start Trading",
        description: "Initialize bot",
        config: { initialStake: 1 },
      },
      {
        id: "check-result",
        type: "condition",
        category: "logic",
        label: "Check Last Trade",
        description: "Was the last trade a win?",
        config: {},
      },
      {
        id: "double-stake",
        type: "action",
        category: "stake",
        label: "Double Stake",
        description: "Multiply stake by 2",
        config: { multiplier: 2 },
      },
      {
        id: "reset-stake",
        type: "action",
        category: "stake",
        label: "Reset Stake",
        description: "Return to initial stake",
        config: { stake: 1 },
      },
    ],
    stats: {
      trades: 1250,
      winRate: 72,
      avgProfit: 15.5,
    },
  },
  {
    id: "trend-follower",
    name: "Trend Following Strategy",
    description:
      "Trade in the direction of the market trend using moving averages",
    author: "FxProTrades",
    category: "trend",
    difficulty: "intermediate",
    profitability: 65,
    blocks: [
      {
        id: "ma-fast",
        type: "indicator",
        category: "technical",
        label: "Fast MA",
        description: "10-period moving average",
        config: { period: 10 },
      },
      {
        id: "ma-slow",
        type: "indicator",
        category: "technical",
        label: "Slow MA",
        description: "50-period moving average",
        config: { period: 50 },
      },
      {
        id: "crossover",
        type: "condition",
        category: "signal",
        label: "MA Crossover",
        description: "Detect when fast MA crosses slow MA",
        config: {},
      },
      {
        id: "trade-up",
        type: "trade",
        category: "execute",
        label: "Buy/Rise",
        description: "Open long position",
        config: { direction: "CALL" },
      },
      {
        id: "trade-down",
        type: "trade",
        category: "execute",
        label: "Sell/Fall",
        description: "Open short position",
        config: { direction: "PUT" },
      },
    ],
    stats: {
      trades: 980,
      winRate: 65,
      avgProfit: 12.3,
    },
  },
  {
    id: "scalper-pro",
    name: "Quick Scalper",
    description: "Fast trades with small profits using RSI and quick exits",
    author: "FxProTrades",
    category: "scalping",
    difficulty: "advanced",
    profitability: 68,
    blocks: [
      {
        id: "rsi",
        type: "indicator",
        category: "technical",
        label: "RSI Indicator",
        description: "Relative Strength Index",
        config: { period: 14 },
      },
      {
        id: "oversold",
        type: "condition",
        category: "signal",
        label: "RSI < 30",
        description: "Market oversold",
        config: { threshold: 30 },
      },
      {
        id: "overbought",
        type: "condition",
        category: "signal",
        label: "RSI > 70",
        description: "Market overbought",
        config: { threshold: 70 },
      },
      {
        id: "quick-trade",
        type: "trade",
        category: "execute",
        label: "Quick Trade",
        description: "1-minute trade",
        config: { duration: 60 },
      },
    ],
    stats: {
      trades: 2150,
      winRate: 68,
      avgProfit: 8.7,
    },
  },
  {
    id: "breakout-trader",
    name: "Breakout Hunter",
    description: "Capture price breakouts from support and resistance levels",
    author: "FxProTrades",
    category: "breakout",
    difficulty: "intermediate",
    profitability: 70,
    blocks: [
      {
        id: "support-level",
        type: "indicator",
        category: "technical",
        label: "Support Level",
        description: "Detect support zones",
        config: { lookback: 50 },
      },
      {
        id: "resistance-level",
        type: "indicator",
        category: "technical",
        label: "Resistance Level",
        description: "Detect resistance zones",
        config: { lookback: 50 },
      },
      {
        id: "breakout-check",
        type: "condition",
        category: "signal",
        label: "Breakout Detected",
        description: "Price breaks key level",
        config: {},
      },
      {
        id: "momentum-trade",
        type: "trade",
        category: "execute",
        label: "Momentum Trade",
        description: "Trade in breakout direction",
        config: { duration: 300 },
      },
    ],
    stats: {
      trades: 650,
      winRate: 70,
      avgProfit: 18.2,
    },
  },
  {
    id: "anti-martingale",
    name: "Anti-Martingale (Reverse)",
    description:
      "Increase stake after wins, reduce after losses - safer approach",
    author: "FxProTrades",
    category: "martingale",
    difficulty: "beginner",
    profitability: 64,
    blocks: [
      {
        id: "start",
        type: "action",
        category: "start",
        label: "Start Trading",
        description: "Initialize bot",
        config: { initialStake: 1 },
      },
      {
        id: "win-check",
        type: "condition",
        category: "logic",
        label: "Check Win",
        description: "Did last trade win?",
        config: {},
      },
      {
        id: "increase-stake",
        type: "action",
        category: "stake",
        label: "Increase Stake",
        description: "Multiply stake by 1.5",
        config: { multiplier: 1.5 },
      },
      {
        id: "decrease-stake",
        type: "action",
        category: "stake",
        label: "Decrease Stake",
        description: "Reset to base stake",
        config: { stake: 1 },
      },
    ],
    stats: {
      trades: 890,
      winRate: 64,
      avgProfit: 11.8,
    },
  },
];

export function getStrategyById(id: string): Strategy | undefined {
  return strategyTemplates.find((s) => s.id === id);
}

export function getStrategiesByCategory(
  category: Strategy["category"],
): Strategy[] {
  return strategyTemplates.filter((s) => s.category === category);
}

export function getStrategiesByDifficulty(
  difficulty: Strategy["difficulty"],
): Strategy[] {
  return strategyTemplates.filter((s) => s.difficulty === difficulty);
}
