import { DerivAPI } from '../lib/deriv-api';
import {
  AuthorizeResponse,
  BalanceResponse,
  AccountInfo,
  StatementResponse,
  ProfitTableResponse,
  Transaction,
  ProfitTableTransaction,
  DerivError,
  SubscriptionCallback
} from '../lib/types/deriv-types';

export interface Account extends AccountInfo {
  balance?: number;
  isActive?: boolean;
  lastUpdated?: number;
  balanceSubscriptionId?: string;
}

export interface AccountSummary {
  totalBalance: number;
  totalEquity: number;
  totalPnL: number;
  accountCount: number;
  activeAccount: string | null;
  accounts: Account[];
}

export interface TransactionFilter {
  action_type?: string;
  date_from?: number;
  date_to?: number;
  limit?: number;
  offset?: number;
}

export interface ProfitTableFilter {
  contract_type?: string[];
  date_from?: number;
  date_to?: number;
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface AccountPerformance {
  loginid: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  roi: number;
}

export class AccountService {
  private derivAPI: DerivAPI;
  private accounts: Map<string, Account> = new Map();
  private currentAccount: string | null = null;
  private balanceSubscriptions: Map<string, string> = new Map();
  private transactionHistory: Map<string, Transaction[]> = new Map();
  private profitHistory: Map<string, ProfitTableTransaction[]> = new Map();

  constructor(derivAPI: DerivAPI) {
    this.derivAPI = derivAPI;
  }

  // Authentication & Account Setup
  async authenticate(token: string): Promise<AuthorizeResponse> {
    try {
      const response = await this.derivAPI.authorize(token);
      
      // Store all accounts
      response.authorize.account_list.forEach(accountInfo => {
        const account: Account = {
          ...accountInfo,
          balance: accountInfo.loginid === response.authorize.loginid ? response.authorize.balance : undefined,
          isActive: accountInfo.loginid === response.authorize.loginid,
          lastUpdated: Date.now()
        };
        
        this.accounts.set(accountInfo.loginid, account);
      });

      this.currentAccount = response.authorize.loginid;
      
      // Subscribe to balance updates for current account
      await this.subscribeToBalance(response.authorize.loginid);

      return response;
    } catch (error) {
      throw new Error(`Authentication failed: ${(error as DerivError).message}`);
    }
  }

  // Account Switching
  async switchAccount(loginid: string): Promise<void> {
    if (!this.accounts.has(loginid)) {
      throw new Error(`Account ${loginid} not found`);
    }

    try {
      // Unsubscribe from current account balance
      if (this.currentAccount) {
        await this.unsubscribeFromBalance(this.currentAccount);
      }

      // Switch to new account
      await this.derivAPI.switchAccount(loginid);
      
      // Update account states
      this.accounts.forEach((account, id) => {
        account.isActive = id === loginid;
        this.accounts.set(id, account);
      });

      this.currentAccount = loginid;

      // Subscribe to new account balance
      await this.subscribeToBalance(loginid);

      // Refresh account data
      await this.refreshAccountData(loginid);
    } catch (error) {
      throw new Error(`Failed to switch account: ${(error as DerivError).message}`);
    }
  }

  // Balance Management
  async getAccountBalance(loginid?: string): Promise<number> {
    const targetAccount = loginid || this.currentAccount;
    if (!targetAccount) {
      throw new Error('No account specified or active');
    }

    try {
      const response = await this.derivAPI.getAccountBalance();
      const balance = response.balance.balance;

      // Update stored account balance
      const account = this.accounts.get(targetAccount);
      if (account) {
        account.balance = balance;
        account.lastUpdated = Date.now();
        this.accounts.set(targetAccount, account);
      }

      return balance;
    } catch (error) {
      throw new Error(`Failed to get balance: ${(error as DerivError).message}`);
    }
  }

  private async subscribeToBalance(loginid: string): Promise<void> {
    const callback: SubscriptionCallback<BalanceResponse> = (response) => {
      const account = this.accounts.get(loginid);
      if (account) {
        account.balance = response.balance.balance;
        account.lastUpdated = Date.now();
        this.accounts.set(loginid, account);
      }
    };

    this.derivAPI.subscribeBalance(callback, (subId) => {
      this.balanceSubscriptions.set(loginid, subId);
    });
  }

  private async unsubscribeFromBalance(loginid: string): Promise<void> {
    const subId = this.balanceSubscriptions.get(loginid);
    if (subId) {
      await this.derivAPI.unsubscribe(subId);
      this.balanceSubscriptions.delete(loginid);
    }
  }

  // Account Information
  getAccount(loginid: string): Account | undefined {
    return this.accounts.get(loginid);
  }

  getCurrentAccount(): Account | undefined {
    return this.currentAccount ? this.accounts.get(this.currentAccount) : undefined;
  }

  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  getRealAccounts(): Account[] {
    return Array.from(this.accounts.values()).filter(account => !account.is_virtual);
  }

  getVirtualAccounts(): Account[] {
    return Array.from(this.accounts.values()).filter(account => account.is_virtual);
  }

  getAccountsByType(accountType: string): Account[] {
    return Array.from(this.accounts.values()).filter(account => account.account_type === accountType);
  }

  // Account Summary
  getAccountSummary(): AccountSummary {
    const accounts = Array.from(this.accounts.values());
    const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
    
    return {
      totalBalance,
      totalEquity: totalBalance, // For now, same as balance
      totalPnL: 0, // Will be calculated from profit table
      accountCount: accounts.length,
      activeAccount: this.currentAccount,
      accounts
    };
  }

  // Transaction History
  async getTransactionHistory(
    loginid?: string,
    filter: TransactionFilter = {}
  ): Promise<Transaction[]> {
    const targetAccount = loginid || this.currentAccount;
    if (!targetAccount) {
      throw new Error('No account specified or active');
    }

    try {
      const response = await this.derivAPI.getStatement({
        limit: filter.limit || 50,
        offset: filter.offset || 0,
        action_type: filter.action_type,
        date_from: filter.date_from,
        date_to: filter.date_to
      });

      const transactions = response.statement.transactions;
      this.transactionHistory.set(targetAccount, transactions);

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${(error as DerivError).message}`);
    }
  }

  // Profit Table
  async getProfitTable(
    loginid?: string,
    filter: ProfitTableFilter = {}
  ): Promise<ProfitTableTransaction[]> {
    const targetAccount = loginid || this.currentAccount;
    if (!targetAccount) {
      throw new Error('No account specified or active');
    }

    try {
      const response = await this.derivAPI.getProfitTable({
        limit: filter.limit || 50,
        offset: filter.offset || 0,
        contract_type: filter.contract_type,
        date_from: filter.date_from,
        date_to: filter.date_to,
        sort: filter.sort || 'DESC'
      });

      const profits = response.profit_table.transactions;
      this.profitHistory.set(targetAccount, profits);

      return profits;
    } catch (error) {
      throw new Error(`Failed to get profit table: ${(error as DerivError).message}`);
    }
  }

  // Performance Analysis
  async getAccountPerformance(loginid?: string): Promise<AccountPerformance> {
    const targetAccount = loginid || this.currentAccount;
    if (!targetAccount) {
      throw new Error('No account specified or active');
    }

    try {
      // Get profit table for analysis
      const profits = await this.getProfitTable(targetAccount, { limit: 1000 });
      
      const totalTrades = profits.length;
      const winningTrades = profits.filter(p => p.sell_price > p.buy_price).length;
      const losingTrades = totalTrades - winningTrades;
      
      const totalPnL = profits.reduce((sum, p) => {
        return sum + (p.sell_price - p.buy_price);
      }, 0);

      const wins = profits.filter(p => p.sell_price > p.buy_price);
      const losses = profits.filter(p => p.sell_price <= p.buy_price);

      const avgWin = wins.length > 0 
        ? wins.reduce((sum, p) => sum + (p.sell_price - p.buy_price), 0) / wins.length 
        : 0;

      const avgLoss = losses.length > 0 
        ? Math.abs(losses.reduce((sum, p) => sum + (p.sell_price - p.buy_price), 0) / losses.length)
        : 0;

      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

      // Calculate max drawdown
      let maxDrawdown = 0;
      let peak = 0;
      let runningPnL = 0;

      for (const profit of profits.reverse()) {
        runningPnL += profit.sell_price - profit.buy_price;
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        const drawdown = peak - runningPnL;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }

      // Simple ROI calculation
      const account = this.getAccount(targetAccount);
      const initialBalance = account?.balance || 1000; // Default if not available
      const roi = (totalPnL / initialBalance) * 100;

      // Simplified Sharpe ratio (would need risk-free rate for accurate calculation)
      const returns = profits.map(p => (p.sell_price - p.buy_price) / p.buy_price);
      const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
      const returnStdDev = Math.sqrt(
        returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
      );
      const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

      return {
        loginid: targetAccount,
        totalTrades,
        winningTrades,
        losingTrades,
        totalPnL,
        winRate,
        avgWin,
        avgLoss,
        profitFactor,
        maxDrawdown,
        sharpeRatio,
        roi
      };
    } catch (error) {
      throw new Error(`Failed to calculate performance: ${(error as DerivError).message}`);
    }
  }

  // Account Refresh
  async refreshAccountData(loginid?: string): Promise<void> {
    const targetAccount = loginid || this.currentAccount;
    if (!targetAccount) {
      throw new Error('No account specified or active');
    }

    try {
      // Refresh balance
      await this.getAccountBalance(targetAccount);
      
      // Refresh transaction history
      await this.getTransactionHistory(targetAccount, { limit: 100 });
      
      // Refresh profit table
      await this.getProfitTable(targetAccount, { limit: 100 });
    } catch (error) {
      console.error(`Failed to refresh account data: ${error}`);
    }
  }

  async refreshAllAccounts(): Promise<void> {
    const refreshPromises = Array.from(this.accounts.keys()).map(loginid =>
      this.refreshAccountData(loginid).catch(console.error)
    );
    
    await Promise.all(refreshPromises);
  }

  // Risk Management
  calculateAccountRisk(loginid?: string): {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    marginLevel: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const targetAccount = loginid || this.currentAccount;
    const account = targetAccount ? this.getAccount(targetAccount) : undefined;
    
    if (!account) {
      throw new Error('Account not found');
    }

    const balance = account.balance || 0;
    const equity = balance; // Simplified - would include unrealized P&L
    const margin = 0; // Would calculate based on open positions
    const freeMargin = equity - margin;
    const marginLevel = margin > 0 ? (equity / margin) * 100 : 100;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (marginLevel < 50) {
      riskLevel = 'critical';
    } else if (marginLevel < 100) {
      riskLevel = 'high';
    } else if (marginLevel < 200) {
      riskLevel = 'medium';
    }

    return {
      balance,
      equity,
      margin,
      freeMargin,
      marginLevel,
      riskLevel
    };
  }

  // Utility Methods
  getStoredTransactions(loginid: string): Transaction[] {
    return this.transactionHistory.get(loginid) || [];
  }

  getStoredProfits(loginid: string): ProfitTableTransaction[] {
    return this.profitHistory.get(loginid) || [];
  }

  isAccountActive(loginid: string): boolean {
    return this.currentAccount === loginid;
  }

  getAccountCurrency(loginid: string): string {
    const account = this.getAccount(loginid);
    return account?.currency || 'USD';
  }

  getAccountType(loginid: string): string {
    const account = this.getAccount(loginid);
    return account?.account_type || 'unknown';
  }

  isVirtualAccount(loginid: string): boolean {
    const account = this.getAccount(loginid);
    return account?.is_virtual === 1;
  }

  // Account Validation
  validateAccountAccess(loginid: string): boolean {
    const account = this.getAccount(loginid);
    return account ? account.is_disabled === 0 : false;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Unsubscribe from all balance subscriptions
    const unsubscribePromises = Array.from(this.balanceSubscriptions.keys()).map(loginid =>
      this.unsubscribeFromBalance(loginid)
    );

    await Promise.all(unsubscribePromises);

    // Clear all data
    this.accounts.clear();
    this.balanceSubscriptions.clear();
    this.transactionHistory.clear();
    this.profitHistory.clear();
    this.currentAccount = null;
  }
}
