import { DerivAPI } from '../lib/deriv-api';
import {
  ContractParams,
  ProposalResponse,
  BuyResponse,
  ContractUpdate,
  PortfolioPosition,
  DerivError,
  ContractType,
  DurationUnit
} from '../lib/types/deriv-types';

export interface Contract {
  id: string;
  contractId?: number;
  symbol: string;
  contractType: string;
  amount: number;
  duration: number;
  durationUnit: string;
  barrier?: number;
  barrier2?: number;
  proposalId?: string;
  buyPrice?: number;
  payout?: number;
  currentPrice?: number;
  profit?: number;
  profitPercentage?: number;
  status: 'pending' | 'active' | 'won' | 'lost' | 'sold';
  purchaseTime?: number;
  expiryTime?: number;
  entrySpot?: number;
  exitSpot?: number;
  subscriptionId?: string;
}

export interface ContractProposal {
  id: string;
  askPrice: number;
  displayValue: string;
  payout: number;
  spot: number;
  spotTime: number;
  longcode: string;
  subscriptionId?: string;
}

export interface TradingStrategy {
  name: string;
  symbol: string;
  contractType: ContractType;
  amount: number;
  duration: number;
  durationUnit: DurationUnit;
  barrier?: number;
  barrier2?: number;
  maxLoss?: number;
  maxProfit?: number;
  stopLoss?: number;
  takeProfit?: number;
  enabled: boolean;
}

export class ContractManager {
  private derivAPI: DerivAPI;
  private activeContracts: Map<string, Contract> = new Map();
  private activeProposals: Map<string, ContractProposal> = new Map();
  private contractSubscriptions: Map<number, string> = new Map();
  private proposalSubscriptions: Map<string, string> = new Map();
  private strategies: Map<string, TradingStrategy> = new Map();

  constructor(derivAPI: DerivAPI) {
    this.derivAPI = derivAPI;
  }

  // Contract Proposal Management
  async createProposal(params: ContractParams): Promise<ContractProposal> {
    try {
      const response = await this.derivAPI.getContractProposal(params);
      
      const proposal: ContractProposal = {
        id: response.proposal.id,
        askPrice: response.proposal.ask_price,
        displayValue: response.proposal.display_value,
        payout: response.proposal.payout,
        spot: response.proposal.spot,
        spotTime: response.proposal.spot_time,
        longcode: response.proposal.longcode
      };

      this.activeProposals.set(proposal.id, proposal);
      return proposal;
    } catch (error) {
      throw new Error(`Failed to create proposal: ${(error as DerivError).message}`);
    }
  }

  // Subscribe to real-time proposal updates
  subscribeToProposal(
    params: ContractParams,
    onUpdate: (proposal: ContractProposal) => void,
    onError?: (error: DerivError) => void
  ): string {
    const proposalKey = this.generateProposalKey(params);
    
    this.derivAPI.subscribeProposal(
      params,
      (response) => {
        try {
          const proposal: ContractProposal = {
            id: response.proposal.id,
            askPrice: response.proposal.ask_price,
            displayValue: response.proposal.display_value,
            payout: response.proposal.payout,
            spot: response.proposal.spot,
            spotTime: response.proposal.spot_time,
            longcode: response.proposal.longcode
          };

          this.activeProposals.set(proposal.id, proposal);
          onUpdate(proposal);
        } catch (error) {
          if (onError) {
            onError(error as DerivError);
          }
        }
      },
      (subId) => {
        this.proposalSubscriptions.set(proposalKey, subId);
      }
    );

    return proposalKey;
  }

  // Buy Contract
  async buyContract(
    proposalId: string, 
    price: number,
    metadata?: Partial<Contract>
  ): Promise<Contract> {
    try {
      const response = await this.derivAPI.buyContract(proposalId, price);
      
      const contract: Contract = {
        id: `contract_${Date.now()}`,
        contractId: response.buy.contract_id,
        symbol: metadata?.symbol || '',
        contractType: metadata?.contractType || '',
        amount: metadata?.amount || price,
        duration: metadata?.duration || 0,
        durationUnit: metadata?.durationUnit || 'm',
        proposalId,
        buyPrice: response.buy.buy_price,
        payout: response.buy.payout,
        status: 'active',
        purchaseTime: response.buy.purchase_time,
        barrier: metadata?.barrier,
        barrier2: metadata?.barrier2
      };

      this.activeContracts.set(contract.id, contract);
      
      // Subscribe to contract updates
      if (contract.contractId) {
        this.subscribeToContractUpdates(contract.contractId, contract.id);
      }

      return contract;
    } catch (error) {
      throw new Error(`Failed to buy contract: ${(error as DerivError).message}`);
    }
  }

  // Subscribe to contract updates
  private subscribeToContractUpdates(contractId: number, contractKey: string): void {
    this.derivAPI.subscribeToContract(
      contractId,
      (update) => {
        const contract = this.activeContracts.get(contractKey);
        if (contract) {
          // Update contract with real-time data
          contract.currentPrice = update.proposal_open_contract.bid_price;
          contract.profit = update.proposal_open_contract.profit;
          contract.profitPercentage = update.proposal_open_contract.profit_percentage;
          contract.entrySpot = update.proposal_open_contract.entry_spot;
          contract.exitSpot = update.proposal_open_contract.exit_spot;
          
          // Update status based on contract state
          if (update.proposal_open_contract.is_expired) {
            contract.status = contract.profit && contract.profit > 0 ? 'won' : 'lost';
          } else if (update.proposal_open_contract.is_sold) {
            contract.status = 'sold';
          }

          this.activeContracts.set(contractKey, contract);
        }
      },
      (subId) => {
        this.contractSubscriptions.set(contractId, subId);
      }
    );
  }

  // Sell Contract
  async sellContract(contractKey: string): Promise<void> {
    const contract = this.activeContracts.get(contractKey);
    if (!contract || !contract.contractId) {
      throw new Error('Contract not found or invalid');
    }

    try {
      await this.derivAPI.sell(contract.contractId);
      contract.status = 'sold';
      this.activeContracts.set(contractKey, contract);
    } catch (error) {
      throw new Error(`Failed to sell contract: ${(error as DerivError).message}`);
    }
  }

  // Portfolio Management
  async getPortfolio(): Promise<Contract[]> {
    try {
      const response = await this.derivAPI.getPortfolio();
      const contracts: Contract[] = [];

      for (const position of response.portfolio.contracts) {
        const contract: Contract = {
          id: `portfolio_${position.contract_id}`,
          contractId: position.contract_id,
          symbol: position.symbol,
          contractType: position.contract_type,
          amount: position.buy_price,
          duration: 0, // Not available in portfolio response
          durationUnit: 'm',
          buyPrice: position.buy_price,
          payout: position.payout,
          status: 'active',
          purchaseTime: position.purchase_time
        };

        contracts.push(contract);
        this.activeContracts.set(contract.id, contract);
      }

      return contracts;
    } catch (error) {
      throw new Error(`Failed to get portfolio: ${(error as DerivError).message}`);
    }
  }

  // Strategy Management
  createStrategy(strategy: TradingStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  getStrategy(name: string): TradingStrategy | undefined {
    return this.strategies.get(name);
  }

  getAllStrategies(): TradingStrategy[] {
    return Array.from(this.strategies.values());
  }

  updateStrategy(name: string, updates: Partial<TradingStrategy>): void {
    const strategy = this.strategies.get(name);
    if (strategy) {
      this.strategies.set(name, { ...strategy, ...updates });
    }
  }

  deleteStrategy(name: string): void {
    this.strategies.delete(name);
  }

  // Execute strategy
  async executeStrategy(strategyName: string): Promise<Contract> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy || !strategy.enabled) {
      throw new Error('Strategy not found or disabled');
    }

    const contractParams: ContractParams = {
      contract_type: strategy.contractType,
      symbol: strategy.symbol,
      amount: strategy.amount,
      duration: strategy.duration,
      duration_unit: strategy.durationUnit,
      basis: 'stake',
      barrier: strategy.barrier,
      barrier2: strategy.barrier2
    };

    // Create proposal first
    const proposal = await this.createProposal(contractParams);
    
    // Buy the contract
    return await this.buyContract(proposal.id, proposal.askPrice, {
      symbol: strategy.symbol,
      contractType: strategy.contractType,
      amount: strategy.amount,
      duration: strategy.duration,
      durationUnit: strategy.durationUnit,
      barrier: strategy.barrier,
      barrier2: strategy.barrier2
    });
  }

  // Risk Management
  checkRiskLimits(contract: Contract, strategy?: TradingStrategy): boolean {
    if (!strategy) return true;

    // Check stop loss
    if (strategy.stopLoss && contract.profit !== undefined && contract.profit <= -strategy.stopLoss) {
      return false;
    }

    // Check take profit
    if (strategy.takeProfit && contract.profit !== undefined && contract.profit >= strategy.takeProfit) {
      return false;
    }

    // Check max loss
    if (strategy.maxLoss && contract.profit !== undefined && contract.profit <= -strategy.maxLoss) {
      return false;
    }

    // Check max profit
    if (strategy.maxProfit && contract.profit !== undefined && contract.profit >= strategy.maxProfit) {
      return false;
    }

    return true;
  }

  // Auto-manage contracts based on risk limits
  async autoManageContracts(): Promise<void> {
    for (const [contractKey, contract] of this.activeContracts) {
      if (contract.status !== 'active') continue;

      // Find associated strategy
      const strategy = Array.from(this.strategies.values()).find(s => 
        s.symbol === contract.symbol && s.contractType === contract.contractType
      );

      if (strategy && !this.checkRiskLimits(contract, strategy)) {
        try {
          await this.sellContract(contractKey);
          console.log(`Auto-sold contract ${contractKey} due to risk limits`);
        } catch (error) {
          console.error(`Failed to auto-sell contract ${contractKey}:`, error);
        }
      }
    }
  }

  // Utility methods
  getActiveContracts(): Contract[] {
    return Array.from(this.activeContracts.values()).filter(c => c.status === 'active');
  }

  getContractById(id: string): Contract | undefined {
    return this.activeContracts.get(id);
  }

  getActiveProposals(): ContractProposal[] {
    return Array.from(this.activeProposals.values());
  }

  getProposalById(id: string): ContractProposal | undefined {
    return this.activeProposals.get(id);
  }

  // Calculate total P&L
  getTotalPnL(): number {
    return Array.from(this.activeContracts.values())
      .reduce((total, contract) => total + (contract.profit || 0), 0);
  }

  // Get performance statistics
  getPerformanceStats(): {
    totalContracts: number;
    activeContracts: number;
    wonContracts: number;
    lostContracts: number;
    totalPnL: number;
    winRate: number;
  } {
    const contracts = Array.from(this.activeContracts.values());
    const totalContracts = contracts.length;
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const wonContracts = contracts.filter(c => c.status === 'won').length;
    const lostContracts = contracts.filter(c => c.status === 'lost').length;
    const totalPnL = this.getTotalPnL();
    const winRate = totalContracts > 0 ? (wonContracts / (wonContracts + lostContracts)) * 100 : 0;

    return {
      totalContracts,
      activeContracts,
      wonContracts,
      lostContracts,
      totalPnL,
      winRate
    };
  }

  // Helper methods
  private generateProposalKey(params: ContractParams): string {
    return `${params.symbol}_${params.contract_type}_${params.amount}_${params.duration}${params.duration_unit}`;
  }

  // Cleanup subscriptions
  async cleanup(): Promise<void> {
    // Unsubscribe from all contract subscriptions
    for (const [contractId, subId] of this.contractSubscriptions) {
      try {
        await this.derivAPI.unsubscribe(subId);
      } catch (error) {
        console.error(`Failed to unsubscribe from contract ${contractId}:`, error);
      }
    }

    // Unsubscribe from all proposal subscriptions
    for (const [proposalKey, subId] of this.proposalSubscriptions) {
      try {
        await this.derivAPI.unsubscribe(subId);
      } catch (error) {
        console.error(`Failed to unsubscribe from proposal ${proposalKey}:`, error);
      }
    }

    this.contractSubscriptions.clear();
    this.proposalSubscriptions.clear();
  }
}
