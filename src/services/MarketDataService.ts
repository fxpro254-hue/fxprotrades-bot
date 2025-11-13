import { DerivAPI } from '../lib/deriv-api';
import {
  TickData,
  TicksResponse,
  HistoryResponse,
  ActiveSymbol,
  ActiveSymbolsResponse,
  TradingTimesResponse,
  ServerTimeResponse,
  DerivError,
  SubscriptionCallback
} from '../lib/types/deriv-types';

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketSymbol extends ActiveSymbol {
  lastTick?: TickData;
  priceChange?: number;
  priceChangePercent?: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  isSubscribed?: boolean;
}

export interface MarketAnalysis {
  symbol: string;
  trend: 'bullish' | 'bearish' | 'sideways';
  support: number[];
  resistance: number[];
  volatility: number;
  momentum: number;
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  movingAverages?: {
    sma20: number;
    sma50: number;
    ema12: number;
    ema26: number;
  };
}

export interface PriceAlert {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below';
  targetPrice: number;
  currentPrice?: number;
  isActive: boolean;
  createdAt: number;
  triggeredAt?: number;
  callback?: (alert: PriceAlert) => void;
}

export class MarketDataService {
  private derivAPI: DerivAPI;
  private tickSubscriptions: Map<string, string> = new Map();
  private marketSymbols: Map<string, MarketSymbol> = new Map();
  private priceHistory: Map<string, TickData[]> = new Map();
  private candleHistory: Map<string, CandleData[]> = new Map();
  private priceAlerts: Map<string, PriceAlert> = new Map();
  private marketAnalysis: Map<string, MarketAnalysis> = new Map();

  constructor(derivAPI: DerivAPI) {
    this.derivAPI = derivAPI;
  }

  // Symbol Management
  async loadActiveSymbols(productType: string = 'basic'): Promise<MarketSymbol[]> {
    try {
      const response = await this.derivAPI.getActiveSymbols(productType);
      const symbols: MarketSymbol[] = response.active_symbols.map(symbol => ({
        ...symbol,
        isSubscribed: false
      }));

      // Store symbols in map for quick access
      symbols.forEach(symbol => {
        this.marketSymbols.set(symbol.symbol, symbol);
      });

      return symbols;
    } catch (error) {
      throw new Error(`Failed to load active symbols: ${(error as DerivError).message}`);
    }
  }

  getSymbol(symbol: string): MarketSymbol | undefined {
    return this.marketSymbols.get(symbol);
  }

  getAllSymbols(): MarketSymbol[] {
    return Array.from(this.marketSymbols.values());
  }

  getSymbolsByMarket(market: string): MarketSymbol[] {
    return Array.from(this.marketSymbols.values()).filter(s => s.market === market);
  }

  getSymbolsBySubmarket(submarket: string): MarketSymbol[] {
    return Array.from(this.marketSymbols.values()).filter(s => s.submarket === submarket);
  }

  // Real-time Tick Data
  subscribeToTicks(
    symbol: string,
    onTick: (tick: TickData) => void,
    onError?: (error: DerivError) => void
  ): string {
    const callback: SubscriptionCallback<TicksResponse> = (response) => {
      try {
        const tick = response.tick;
        
        // Update symbol with latest tick
        const marketSymbol = this.marketSymbols.get(symbol);
        if (marketSymbol) {
          const previousTick = marketSymbol.lastTick;
          marketSymbol.lastTick = tick;
          marketSymbol.isSubscribed = true;

          // Calculate price change
          if (previousTick) {
            marketSymbol.priceChange = tick.quote - previousTick.quote;
            marketSymbol.priceChangePercent = (marketSymbol.priceChange / previousTick.quote) * 100;
          }

          this.marketSymbols.set(symbol, marketSymbol);
        }

        // Store tick in history
        this.addTickToHistory(symbol, tick);

        // Check price alerts
        this.checkPriceAlerts(symbol, tick.quote);

        onTick(tick);
      } catch (error) {
        if (onError) {
          onError(error as DerivError);
        }
      }
    };

    this.derivAPI.subscribeTicks(symbol, callback, (subId) => {
      this.tickSubscriptions.set(symbol, subId);
    });

    return symbol;
  }

  unsubscribeFromTicks(symbol: string): Promise<void> {
    const subId = this.tickSubscriptions.get(symbol);
    if (subId) {
      this.tickSubscriptions.delete(symbol);
      
      // Update symbol subscription status
      const marketSymbol = this.marketSymbols.get(symbol);
      if (marketSymbol) {
        marketSymbol.isSubscribed = false;
        this.marketSymbols.set(symbol, marketSymbol);
      }

      return this.derivAPI.unsubscribe(subId).then(() => {});
    }
    return Promise.resolve();
  }

  // Historical Data
  async getHistoricalTicks(
    symbol: string,
    count: number = 1000,
    end: string = 'latest'
  ): Promise<TickData[]> {
    try {
      const response = await this.derivAPI.getHistory({
        ticks_history: symbol,
        end,
        count,
        style: 'ticks'
      });

      const ticks: TickData[] = [];
      if (response.history.prices && response.history.times) {
        for (let i = 0; i < response.history.prices.length; i++) {
          ticks.push({
            epoch: response.history.times[i],
            quote: response.history.prices[i],
            symbol
          });
        }
      }

      // Store in history
      this.priceHistory.set(symbol, ticks);
      return ticks;
    } catch (error) {
      throw new Error(`Failed to get historical ticks: ${(error as DerivError).message}`);
    }
  }

  async getHistoricalCandles(
    symbol: string,
    granularity: number = 60, // 1 minute
    count: number = 1000,
    end: string = 'latest'
  ): Promise<CandleData[]> {
    try {
      const response = await this.derivAPI.getHistory({
        ticks_history: symbol,
        end,
        count,
        granularity,
        style: 'candles'
      });

      const candles: CandleData[] = [];
      if (response.history.candles) {
        response.history.candles.forEach(candle => {
          candles.push({
            timestamp: candle.epoch,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close
          });
        });
      }

      // Store in history
      this.candleHistory.set(symbol, candles);
      return candles;
    } catch (error) {
      throw new Error(`Failed to get historical candles: ${(error as DerivError).message}`);
    }
  }

  // Technical Analysis
  calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // First EMA is SMA
    ema[0] = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = 1; i < prices.length - period + 1; i++) {
      ema[i] = (prices[i + period - 1] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    
    if (ema12.length === 0 || ema26.length === 0) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const macd = ema12[ema12.length - 1] - ema26[ema26.length - 1];
    
    // For simplicity, using a basic signal calculation
    const signal = macd * 0.9; // This should be EMA of MACD
    const histogram = macd - signal;

    return { macd, signal, histogram };
  }

  // Market Analysis
  async analyzeMarket(symbol: string): Promise<MarketAnalysis> {
    try {
      // Get historical data for analysis
      const candles = await this.getHistoricalCandles(symbol, 300, 100); // 5-minute candles
      if (candles.length === 0) {
        throw new Error('No historical data available');
      }

      const prices = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);

      // Calculate technical indicators
      const sma20 = this.calculateSMA(prices, 20);
      const sma50 = this.calculateSMA(prices, 50);
      const ema12 = this.calculateEMA(prices, 12);
      const ema26 = this.calculateEMA(prices, 26);
      const rsi = this.calculateRSI(prices);
      const macd = this.calculateMACD(prices);

      // Determine trend
      let trend: 'bullish' | 'bearish' | 'sideways' = 'sideways';
      if (sma20.length > 0 && sma50.length > 0) {
        const currentSMA20 = sma20[sma20.length - 1];
        const currentSMA50 = sma50[sma50.length - 1];
        
        if (currentSMA20 > currentSMA50 && prices[prices.length - 1] > currentSMA20) {
          trend = 'bullish';
        } else if (currentSMA20 < currentSMA50 && prices[prices.length - 1] < currentSMA20) {
          trend = 'bearish';
        }
      }

      // Calculate support and resistance levels
      const support = this.findSupportLevels(lows);
      const resistance = this.findResistanceLevels(highs);

      // Calculate volatility (standard deviation of returns)
      const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const volatility = Math.sqrt(
        returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
      );

      // Calculate momentum (rate of change)
      const momentum = prices.length > 10 
        ? (prices[prices.length - 1] - prices[prices.length - 11]) / prices[prices.length - 11]
        : 0;

      const analysis: MarketAnalysis = {
        symbol,
        trend,
        support,
        resistance,
        volatility,
        momentum,
        rsi,
        macd,
        movingAverages: {
          sma20: sma20[sma20.length - 1] || 0,
          sma50: sma50[sma50.length - 1] || 0,
          ema12: ema12[ema12.length - 1] || 0,
          ema26: ema26[ema26.length - 1] || 0
        }
      };

      this.marketAnalysis.set(symbol, analysis);
      return analysis;
    } catch (error) {
      throw new Error(`Failed to analyze market: ${(error as DerivError).message}`);
    }
  }

  private findSupportLevels(lows: number[]): number[] {
    const levels: number[] = [];
    const window = 5;

    for (let i = window; i < lows.length - window; i++) {
      const isSupport = lows.slice(i - window, i + window + 1).every((low, idx) => 
        idx === window || low >= lows[i]
      );
      
      if (isSupport) {
        levels.push(lows[i]);
      }
    }

    return levels.sort((a, b) => b - a).slice(0, 3); // Top 3 support levels
  }

  private findResistanceLevels(highs: number[]): number[] {
    const levels: number[] = [];
    const window = 5;

    for (let i = window; i < highs.length - window; i++) {
      const isResistance = highs.slice(i - window, i + window + 1).every((high, idx) => 
        idx === window || high <= highs[i]
      );
      
      if (isResistance) {
        levels.push(highs[i]);
      }
    }

    return levels.sort((a, b) => a - b).slice(0, 3); // Top 3 resistance levels
  }

  // Price Alerts
  createPriceAlert(
    symbol: string,
    condition: 'above' | 'below' | 'crosses_above' | 'crosses_below',
    targetPrice: number,
    callback?: (alert: PriceAlert) => void
  ): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: PriceAlert = {
      id: alertId,
      symbol,
      condition,
      targetPrice,
      isActive: true,
      createdAt: Date.now(),
      callback
    };

    this.priceAlerts.set(alertId, alert);
    return alertId;
  }

  private checkPriceAlerts(symbol: string, currentPrice: number): void {
    for (const [alertId, alert] of this.priceAlerts) {
      if (alert.symbol !== symbol || !alert.isActive) continue;

      let shouldTrigger = false;
      const previousPrice = alert.currentPrice || currentPrice;

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentPrice > alert.targetPrice;
          break;
        case 'below':
          shouldTrigger = currentPrice < alert.targetPrice;
          break;
        case 'crosses_above':
          shouldTrigger = previousPrice <= alert.targetPrice && currentPrice > alert.targetPrice;
          break;
        case 'crosses_below':
          shouldTrigger = previousPrice >= alert.targetPrice && currentPrice < alert.targetPrice;
          break;
      }

      alert.currentPrice = currentPrice;

      if (shouldTrigger) {
        alert.isActive = false;
        alert.triggeredAt = Date.now();
        
        if (alert.callback) {
          alert.callback(alert);
        }
      }

      this.priceAlerts.set(alertId, alert);
    }
  }

  getPriceAlert(alertId: string): PriceAlert | undefined {
    return this.priceAlerts.get(alertId);
  }

  getAllPriceAlerts(): PriceAlert[] {
    return Array.from(this.priceAlerts.values());
  }

  getActivePriceAlerts(): PriceAlert[] {
    return Array.from(this.priceAlerts.values()).filter(alert => alert.isActive);
  }

  removePriceAlert(alertId: string): void {
    this.priceAlerts.delete(alertId);
  }

  // Trading Times
  async getTradingTimes(date?: string): Promise<TradingTimesResponse> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return await this.derivAPI.getTradingTimes(targetDate);
  }

  // Server Time
  async getServerTime(): Promise<Date> {
    const response = await this.derivAPI.getServerTime();
    return new Date(response.time * 1000);
  }

  // Utility Methods
  private addTickToHistory(symbol: string, tick: TickData): void {
    const history = this.priceHistory.get(symbol) || [];
    history.push(tick);
    
    // Keep only last 1000 ticks
    if (history.length > 1000) {
      history.shift();
    }
    
    this.priceHistory.set(symbol, history);
  }

  getTickHistory(symbol: string): TickData[] {
    return this.priceHistory.get(symbol) || [];
  }

  getCandleHistory(symbol: string): CandleData[] {
    return this.candleHistory.get(symbol) || [];
  }

  getMarketAnalysis(symbol: string): MarketAnalysis | undefined {
    return this.marketAnalysis.get(symbol);
  }

  getSubscribedSymbols(): string[] {
    return Array.from(this.tickSubscriptions.keys());
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Unsubscribe from all tick subscriptions
    const unsubscribePromises = Array.from(this.tickSubscriptions.keys()).map(symbol =>
      this.unsubscribeFromTicks(symbol)
    );

    await Promise.all(unsubscribePromises);
    
    // Clear all data
    this.tickSubscriptions.clear();
    this.priceHistory.clear();
    this.candleHistory.clear();
    this.priceAlerts.clear();
    this.marketAnalysis.clear();
  }
}
