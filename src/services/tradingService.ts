/**
 * Trading Service Layer
 * Handles all trading operations using the official Deriv API
 */

import { derivApiService, TradeParams, DerivSubscription } from './derivApi';

export interface ContractProposal {
  id: string;
  ask_price: number;
  display_value: string;
  payout: number;
  spot: number;
  spot_time: number;
}

export interface TradeResult {
  contract_id: string;
  buy_price: number;
  payout: number;
  start_time: number;
}

export interface PortfolioPosition {
  contract_id: string;
  symbol: string;
  contract_type: string;
  buy_price: number;
  current_spot: number;
  profit_loss: number;
  is_expired: boolean;
}

export interface TransactionRecord {
  transaction_id: string;
  action_type: string;
  amount: number;
  balance_after: number;
  contract_id?: string;
  transaction_time: number;
}

/**
 * Enhanced Trading Service using Official Deriv API
 */
class TradingService {
  private static instance: TradingService;
  private activeProposalSubscriptions: Map<string, DerivSubscription> = new Map();

  private constructor() {}

  public static getInstance(): TradingService {
    if (!TradingService.instance) {
      TradingService.instance = new TradingService();
    }
    return TradingService.instance;
  }

  /**
   * Get a single contract proposal
   */
  async getProposal(params: TradeParams): Promise<ContractProposal> {
    try {
      const proposal = await derivApiService.getProposal(params);
      
      return {
        id: proposal.id,
        ask_price: proposal.ask_price,
        display_value: proposal.display_value,
        payout: proposal.payout,
        spot: proposal.spot,
        spot_time: proposal.spot_time,
      };
    } catch (error) {
      console.error('❌ Failed to get proposal:', error);
      throw error;
    }
  }

  /**
   * Subscribe to live contract proposals
   */
  async subscribeToProposal(
    params: TradeParams,
    callback: (proposal: ContractProposal) => void
  ): Promise<DerivSubscription> {
    try {
      const subscription = await derivApiService.subscribeToProposal(params, (data) => {
        if (data.proposal) {
          const proposal: ContractProposal = {
            id: data.proposal.id,
            ask_price: data.proposal.ask_price,
            display_value: data.proposal.display_value,
            payout: data.proposal.payout,
            spot: data.proposal.spot,
            spot_time: data.proposal.spot_time,
          };
          callback(proposal);
        }
      });

      const subscriptionKey = `${params.symbol}_${params.contract_type}_${Date.now()}`;
      this.activeProposalSubscriptions.set(subscriptionKey, subscription);

      // Return enhanced subscription with cleanup
      return {
        ...subscription,
        unsubscribe: () => {
          subscription.unsubscribe();
          this.activeProposalSubscriptions.delete(subscriptionKey);
        },
      };
    } catch (error) {
      console.error('❌ Failed to subscribe to proposal:', error);
      throw error;
    }
  }

  /**
   * Place a trade (buy contract)
   */
  async placeTrade(proposalId: string, price: number): Promise<TradeResult> {
    try {
      const result = await derivApiService.buy(proposalId, price);
      
      return {
        contract_id: result.contract_id,
        buy_price: result.buy_price,
        payout: result.payout,
        start_time: result.start_time,
      };
    } catch (error) {
      console.error('❌ Failed to place trade:', error);
      throw error;
    }
  }

  /**
   * Get current portfolio (open positions)
   */
  async getPortfolio(): Promise<PortfolioPosition[]> {
    try {
      const portfolio = await derivApiService.getPortfolio();
      
      if (!portfolio.contracts) {
        return [];
      }

      return portfolio.contracts.map((contract: any): PortfolioPosition => ({
        contract_id: contract.contract_id,
        symbol: contract.symbol,
        contract_type: contract.contract_type,
        buy_price: contract.buy_price,
        current_spot: contract.current_spot,
        profit_loss: contract.profit_loss,
        is_expired: contract.is_expired === 1,
      }));
    } catch (error) {
      console.error('❌ Failed to get portfolio:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit = 50): Promise<TransactionRecord[]> {
    try {
      const statement = await derivApiService.getTransactionHistory(limit);
      
      if (!statement.transactions) {
        return [];
      }

      return statement.transactions.map((transaction: any): TransactionRecord => ({
        transaction_id: transaction.transaction_id,
        action_type: transaction.action_type,
        amount: transaction.amount,
        balance_after: transaction.balance_after,
        contract_id: transaction.contract_id,
        transaction_time: transaction.transaction_time,
      }));
    } catch (error) {
      console.error('❌ Failed to get transaction history:', error);
      throw error;
    }
  }

  /**
   * Get available symbols for trading
   */
  async getActiveSymbols(): Promise<any[]> {
    try {
      const symbols = await derivApiService.getActiveSymbols();
      return symbols || [];
    } catch (error) {
      console.error('❌ Failed to get active symbols:', error);
      throw error;
    }
  }

  /**
   * Calculate potential profit/loss for a trade
   */
  calculateProfitLoss(
    buyPrice: number,
    payout: number,
    currentSpot?: number,
    barrier?: number,
    contractType?: string
  ): { profit: number; loss: number; currentPL?: number } {
    const profit = payout - buyPrice;
    const loss = -buyPrice;
    
    let currentPL: number | undefined;
    
    if (currentSpot && barrier && contractType) {
      // Simple calculation for call/put contracts
      if (contractType.toLowerCase().includes('call')) {
        currentPL = currentSpot > barrier ? profit : loss;
      } else if (contractType.toLowerCase().includes('put')) {
        currentPL = currentSpot < barrier ? profit : loss;
      }
    }
    
    return { profit, loss, currentPL };
  }

  /**
   * Validate trade parameters
   */
  validateTradeParams(params: TradeParams): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!params.symbol) {
      errors.push('Symbol is required');
    }
    
    if (!params.contract_type) {
      errors.push('Contract type is required');
    }
    
    if (!params.amount || params.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (!params.duration || params.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }
    
    if (!params.duration_unit) {
      errors.push('Duration unit is required');
    }
    
    if (!params.basis) {
      errors.push('Basis is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get recommended stake amount based on balance and risk management
   */
  getRecommendedStake(
    balance: number,
    riskPercentage = 2, // 2% of balance by default
    maxStake = 100 // Maximum stake limit
  ): number {
    const calculatedStake = (balance * riskPercentage) / 100;
    return Math.min(calculatedStake, maxStake);
  }

  /**
   * Clean up all active subscriptions
   */
  cleanup(): void {
    this.activeProposalSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.activeProposalSubscriptions.clear();
    console.log('✅ Trading service cleaned up');
  }
}

// Export singleton instance
export const tradingService = TradingService.getInstance();

// Export common contract types
export const CONTRACT_TYPES = {
  CALL: 'CALL',
  PUT: 'PUT',
  TOUCH: 'ONETOUCH',
  NO_TOUCH: 'NOTOUCH',
  ENDS_BETWEEN: 'EXPIRYMISS',
  ENDS_OUTSIDE: 'EXPIRYRANGE',
  STAYS_BETWEEN: 'RANGE',
  GOES_OUTSIDE: 'UPORDOWN',
  ASIAN_UP: 'ASIANU',
  ASIAN_DOWN: 'ASIAND',
  DIGIT_MATCHES: 'DIGITMATCHES',
  DIGIT_DIFFERS: 'DIGITDIFF',
} as const;

// Export common duration units
export const DURATION_UNITS = {
  SECONDS: 's',
  MINUTES: 'm',
  HOURS: 'h',
  DAYS: 'd',
  TICKS: 't',
} as const;

// Export common basis types
export const BASIS_TYPES = {
  STAKE: 'stake',
  PAYOUT: 'payout',
} as const;

export default tradingService;
