import { DerivAPI } from '../lib/deriv-api';
import { ContractManager, Contract, TradingStrategy } from './ContractManager';
import { AccountService, Account } from './AccountService';
import { MarketDataService } from './MarketDataService';
import { ContractParams, DerivError } from '../lib/types/deriv-types';

export interface RiskParameters {
  maxRiskPerTrade: number; // Percentage of account balance
  maxDailyLoss: number; // Maximum daily loss amount
  maxDrawdown: number; // Maximum drawdown percentage
  maxOpenPositions: number; // Maximum number of open positions
  maxRiskPerSymbol: number; // Maximum risk per symbol
  stopLossPercentage?: number; // Automatic stop loss percentage
  takeProfitPercentage?: number; // Automatic take profit percentage
  riskRewardRatio?: number; // Minimum risk-reward ratio
}

export interface PositionSize {
  recommendedAmount: number;
  maxAmount: number;
  riskAmount: number;
  riskPercentage: number;
  positionSizeRatio: number;
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  accountId?: string;
  contractId?: string;
  action?: 'reduce_position' | 'close_position' | 'stop_trading' | 'review_strategy';
}

export interface RiskMetrics {
  currentDrawdown: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalRiskExposure: number;
  openPositionsCount: number;
  riskPerSymbol: Map<string, number>;
  marginUtilization: number;
  sharpeRatio: number;
  maxDrawdownPeriod: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}

export interface RiskRule {
  id: string;
  name: string;
  condition: string;
  action: 'alert' | 'close_position' | 'reduce_position' | 'stop_trading';
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, unknown>;
}

export class RiskManager {
  private derivAPI: DerivAPI;
  private contractManager: ContractManager;
  private accountService: AccountService;
  private marketDataService: MarketDataService;
  private riskParameters: RiskParameters;
  private riskAlerts: Map<string, RiskAlert> = new Map();
  private riskRules: Map<string, RiskRule> = new Map();
  private dailyStats: Map<string, { date: string; pnl: number; trades: number }> = new Map();

  constructor(
    derivAPI: DerivAPI,
    contractManager: ContractManager,
    accountService: AccountService,
    marketDataService: MarketDataService,
    riskParameters: RiskParameters
  ) {
    this.derivAPI = derivAPI;
    this.contractManager = contractManager;
    this.accountService = accountService;
    this.marketDataService = marketDataService;
    this.riskParameters = riskParameters;
    
    this.initializeDefaultRiskRules();
  }

  // Position Sizing
  calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLossPrice?: number,
    symbol?: string
  ): PositionSize {
    const maxRiskAmount = (accountBalance * this.riskParameters.maxRiskPerTrade) / 100;
    
    let recommendedAmount = maxRiskAmount;
    let riskAmount = maxRiskAmount;
    let riskPercentage = this.riskParameters.maxRiskPerTrade;

    // If stop loss is provided, calculate based on risk
    if (stopLossPrice && entryPrice !== stopLossPrice) {
      const riskPerUnit = Math.abs(entryPrice - stopLossPrice);
      const maxUnits = maxRiskAmount / riskPerUnit;
      recommendedAmount = Math.min(maxUnits * entryPrice, maxRiskAmount);
      riskAmount = maxUnits * riskPerUnit;
      riskPercentage = (riskAmount / accountBalance) * 100;
    }

    // Apply symbol-specific risk limits
    if (symbol) {
      const symbolRiskLimit = (accountBalance * this.riskParameters.maxRiskPerSymbol) / 100;
      recommendedAmount = Math.min(recommendedAmount, symbolRiskLimit);
    }

    // Apply maximum position limits
    const maxAmount = Math.min(
      recommendedAmount * 2, // Allow up to 2x recommended for aggressive traders
      accountBalance * 0.1 // Never risk more than 10% on a single trade
    );

    return {
      recommendedAmount: Math.max(1, Math.floor(recommendedAmount)), // Minimum $1
      maxAmount: Math.max(1, Math.floor(maxAmount)),
      riskAmount,
      riskPercentage,
      positionSizeRatio: recommendedAmount / accountBalance
    };
  }

  // Risk Validation
  validateTradeRisk(
    contractParams: ContractParams,
    accountBalance: number,
    currentPositions: Contract[]
  ): { isValid: boolean; reason?: string; suggestedAmount?: number } {
    // Check maximum open positions
    if (currentPositions.length >= this.riskParameters.maxOpenPositions) {
      return {
        isValid: false,
        reason: `Maximum open positions limit reached (${this.riskParameters.maxOpenPositions})`
      };
    }

    // Check daily loss limit
    const todayPnL = this.getDailyPnL();
    if (todayPnL <= -this.riskParameters.maxDailyLoss) {
      return {
        isValid: false,
        reason: `Daily loss limit reached ($${this.riskParameters.maxDailyLoss})`
      };
    }

    // Check position size
    const positionSize = this.calculatePositionSize(accountBalance, contractParams.amount);
    if (contractParams.amount > positionSize.maxAmount) {
      return {
        isValid: false,
        reason: `Position size too large. Maximum allowed: $${positionSize.maxAmount}`,
        suggestedAmount: positionSize.recommendedAmount
      };
    }

    // Check symbol concentration
    const symbolExposure = this.getSymbolExposure(contractParams.symbol, currentPositions);
    const maxSymbolRisk = (accountBalance * this.riskParameters.maxRiskPerSymbol) / 100;
    if (symbolExposure + contractParams.amount > maxSymbolRisk) {
      return {
        isValid: false,
        reason: `Symbol risk limit exceeded. Current exposure: $${symbolExposure}, Max: $${maxSymbolRisk}`
      };
    }

    // Check current drawdown
    const currentDrawdown = this.getCurrentDrawdown();
    if (currentDrawdown >= this.riskParameters.maxDrawdown) {
      return {
        isValid: false,
        reason: `Maximum drawdown limit reached (${this.riskParameters.maxDrawdown}%)`
      };
    }

    return { isValid: true };
  }

  // Risk Monitoring
  async monitorRisk(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];
    
    try {
      const currentAccount = this.accountService.getCurrentAccount();
      if (!currentAccount) return alerts;

      const activeContracts = this.contractManager.getActiveContracts();
      const accountBalance = currentAccount.balance || 0;

      // Check drawdown
      const currentDrawdown = this.getCurrentDrawdown();
      if (currentDrawdown >= this.riskParameters.maxDrawdown * 0.8) {
        alerts.push(this.createAlert(
          'critical',
          `High drawdown detected: ${currentDrawdown.toFixed(2)}%`,
          'stop_trading'
        ));
      }

      // Check daily loss
      const dailyPnL = this.getDailyPnL();
      if (dailyPnL <= -this.riskParameters.maxDailyLoss * 0.8) {
        alerts.push(this.createAlert(
          'warning',
          `Approaching daily loss limit: $${Math.abs(dailyPnL).toFixed(2)}`,
          'reduce_position'
        ));
      }

      // Check position concentration
      const symbolExposure = this.getSymbolExposureMap(activeContracts);
      for (const [symbol, exposure] of symbolExposure) {
        const maxSymbolRisk = (accountBalance * this.riskParameters.maxRiskPerSymbol) / 100;
        if (exposure > maxSymbolRisk * 0.9) {
          alerts.push(this.createAlert(
            'warning',
            `High concentration in ${symbol}: $${exposure.toFixed(2)}`,
            'reduce_position'
          ));
        }
      }

      // Check margin utilization
      const marginUtilization = this.calculateMarginUtilization(activeContracts, accountBalance);
      if (marginUtilization > 80) {
        alerts.push(this.createAlert(
          'critical',
          `High margin utilization: ${marginUtilization.toFixed(1)}%`,
          'close_position'
        ));
      }

      // Store alerts
      alerts.forEach(alert => this.riskAlerts.set(alert.id, alert));

    } catch (error) {
      console.error('Risk monitoring error:', error);
    }

    return alerts;
  }

  // Automatic Risk Management
  async executeRiskManagement(): Promise<void> {
    const alerts = await this.monitorRisk();
    
    for (const alert of alerts) {
      if (alert.action === 'close_position' || alert.action === 'reduce_position') {
        await this.executeRiskAction(alert);
      }
    }
  }

  private async executeRiskAction(alert: RiskAlert): Promise<void> {
    try {
      const activeContracts = this.contractManager.getActiveContracts();
      
      switch (alert.action) {
        case 'close_position':
          // Close the most losing position
          const losingContracts = activeContracts
            .filter(c => c.profit !== undefined && c.profit < 0)
            .sort((a, b) => (a.profit || 0) - (b.profit || 0));
          
          if (losingContracts.length > 0) {
            await this.contractManager.sellContract(losingContracts[0].id);
            console.log(`Auto-closed position ${losingContracts[0].id} due to risk management`);
          }
          break;

        case 'reduce_position':
          // Close half of the positions
          const contractsToClose = activeContracts.slice(0, Math.ceil(activeContracts.length / 2));
          for (const contract of contractsToClose) {
            try {
              await this.contractManager.sellContract(contract.id);
            } catch (error) {
              console.error(`Failed to close position ${contract.id}:`, error);
            }
          }
          break;

        case 'stop_trading':
          // This would require integration with trading strategies to pause them
          console.log('Trading should be stopped due to risk limits');
          break;
      }
    } catch (error) {
      console.error('Failed to execute risk action:', error);
    }
  }

  // Risk Metrics Calculation
  calculateRiskMetrics(): RiskMetrics {
    const activeContracts = this.contractManager.getActiveContracts();
    const currentAccount = this.accountService.getCurrentAccount();
    const accountBalance = currentAccount?.balance || 0;

    const totalRiskExposure = activeContracts.reduce((sum, contract) => sum + contract.amount, 0);
    const currentDrawdown = this.getCurrentDrawdown();
    const dailyPnL = this.getDailyPnL();
    const weeklyPnL = this.getWeeklyPnL();
    const monthlyPnL = this.getMonthlyPnL();

    // Calculate performance metrics
    const performance = this.contractManager.getPerformanceStats();
    
    return {
      currentDrawdown,
      dailyPnL,
      weeklyPnL,
      monthlyPnL,
      totalRiskExposure,
      openPositionsCount: activeContracts.length,
      riskPerSymbol: this.getSymbolExposureMap(activeContracts),
      marginUtilization: this.calculateMarginUtilization(activeContracts, accountBalance),
      sharpeRatio: 0, // Would need historical returns to calculate
      maxDrawdownPeriod: 0, // Would need historical data
      winRate: performance.winRate,
      profitFactor: performance.totalPnL > 0 ? Math.abs(performance.totalPnL) / 1 : 0,
      averageWin: 0, // Would calculate from historical data
      averageLoss: 0 // Would calculate from historical data
    };
  }

  // Risk Rules Management
  addRiskRule(rule: RiskRule): void {
    this.riskRules.set(rule.id, rule);
  }

  removeRiskRule(ruleId: string): void {
    this.riskRules.delete(ruleId);
  }

  updateRiskRule(ruleId: string, updates: Partial<RiskRule>): void {
    const rule = this.riskRules.get(ruleId);
    if (rule) {
      this.riskRules.set(ruleId, { ...rule, ...updates });
    }
  }

  private initializeDefaultRiskRules(): void {
    const defaultRules: RiskRule[] = [
      {
        id: 'max_drawdown',
        name: 'Maximum Drawdown',
        condition: 'drawdown >= maxDrawdown',
        action: 'stop_trading',
        enabled: true,
        priority: 'critical',
        parameters: { threshold: this.riskParameters.maxDrawdown }
      },
      {
        id: 'daily_loss_limit',
        name: 'Daily Loss Limit',
        condition: 'dailyPnL <= -maxDailyLoss',
        action: 'stop_trading',
        enabled: true,
        priority: 'critical',
        parameters: { threshold: this.riskParameters.maxDailyLoss }
      },
      {
        id: 'position_limit',
        name: 'Position Limit',
        condition: 'openPositions >= maxOpenPositions',
        action: 'alert',
        enabled: true,
        priority: 'medium',
        parameters: { threshold: this.riskParameters.maxOpenPositions }
      }
    ];

    defaultRules.forEach(rule => this.riskRules.set(rule.id, rule));
  }

  // Utility Methods
  private createAlert(
    type: 'warning' | 'critical',
    message: string,
    action?: 'reduce_position' | 'close_position' | 'stop_trading' | 'review_strategy'
  ): RiskAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      action
    };
  }

  private getCurrentDrawdown(): number {
    // Simplified calculation - would need historical peak values
    const performance = this.contractManager.getPerformanceStats();
    return Math.abs(Math.min(0, performance.totalPnL));
  }

  private getDailyPnL(): number {
    const today = new Date().toISOString().split('T')[0];
    return this.dailyStats.get(today)?.pnl || 0;
  }

  private getWeeklyPnL(): number {
    // Simplified - would calculate from last 7 days
    return this.getDailyPnL() * 7;
  }

  private getMonthlyPnL(): number {
    // Simplified - would calculate from last 30 days
    return this.getDailyPnL() * 30;
  }

  private getSymbolExposure(symbol: string, contracts: Contract[]): number {
    return contracts
      .filter(c => c.symbol === symbol)
      .reduce((sum, contract) => sum + contract.amount, 0);
  }

  private getSymbolExposureMap(contracts: Contract[]): Map<string, number> {
    const exposureMap = new Map<string, number>();
    
    contracts.forEach(contract => {
      const currentExposure = exposureMap.get(contract.symbol) || 0;
      exposureMap.set(contract.symbol, currentExposure + contract.amount);
    });

    return exposureMap;
  }

  private calculateMarginUtilization(contracts: Contract[], accountBalance: number): number {
    const totalExposure = contracts.reduce((sum, contract) => sum + contract.amount, 0);
    return accountBalance > 0 ? (totalExposure / accountBalance) * 100 : 0;
  }

  // Public Getters
  getRiskParameters(): RiskParameters {
    return { ...this.riskParameters };
  }

  updateRiskParameters(updates: Partial<RiskParameters>): void {
    this.riskParameters = { ...this.riskParameters, ...updates };
  }

  getRiskAlerts(): RiskAlert[] {
    return Array.from(this.riskAlerts.values());
  }

  getActiveRiskAlerts(): RiskAlert[] {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return Array.from(this.riskAlerts.values())
      .filter(alert => now - alert.timestamp < oneHour);
  }

  clearRiskAlert(alertId: string): void {
    this.riskAlerts.delete(alertId);
  }

  clearAllRiskAlerts(): void {
    this.riskAlerts.clear();
  }

  // Cleanup
  cleanup(): void {
    this.riskAlerts.clear();
    this.dailyStats.clear();
  }
}
