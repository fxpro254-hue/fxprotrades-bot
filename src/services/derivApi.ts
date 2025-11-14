/**
 * Official Deriv API SDK Integration
 * This replaces the custom WebSocket implementation with the official @deriv/deriv-api
 */

import DerivAPI from '@deriv/deriv-api';

// Configuration constants
export const DERIV_APP_ID = 110104; // Your registered app ID
export const WS_ENDPOINT = 'ws.binaryws.com'; // Production endpoint
export const OAUTH_URL = "https://fxprotradesbot.vercel.app";
export const AFFILIATE_LINK = "https://deriv.partners/rx?sidc=1203792D-65EF-4B56-9795-E4FDF716DAEF&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU137432";

// Types for better TypeScript support
export interface DerivSubscription {
  id: string;
  callback: (data: any) => void;
  unsubscribe: () => void;
}

export interface AccountInfo {
  balance: number;
  currency: string;
  loginid: string;
  email: string;
}

export interface TradeParams {
  symbol: string;
  contract_type: string;
  amount: number;
  duration: number;
  duration_unit: string;
  basis: string;
  barrier?: string;
}

/**
 * Enhanced Deriv API Service using Official SDK
 * Provides a singleton instance with improved error handling and subscription management
 */
class DerivAPIService {
  private static instance: DerivAPIService;
  private api?: DerivAPI;
  private subscriptions: Map<string, DerivSubscription> = new Map();
  private isConnected = false;
  private isAuthorized = false;
  private accountInfo: AccountInfo | null = null;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      // Initialize the official Deriv API
      this.api = new DerivAPI({
        endpoint: WS_ENDPOINT,
        app_id: DERIV_APP_ID,
      });

      this.setupEventListeners();
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DerivAPIService {
    if (!DerivAPIService.instance) {
      DerivAPIService.instance = new DerivAPIService();
    }
    return DerivAPIService.instance;
  }

  /**
   * Setup event listeners for connection state
   */
  private setupEventListeners(): void {
    if (!this.api) return;
    
    // Connection opened
    this.api.onOpen(() => {
      console.log('✅ Deriv API connection established');
      this.isConnected = true;
    });

    // Connection closed
    this.api.onClose(() => {
      console.log('❌ Deriv API connection closed');
      this.isConnected = false;
      this.isAuthorized = false;
    });

    // Connection error
    this.api.onError((error: any) => {
      console.error('🚨 Deriv API connection error:', error);
      this.isConnected = false;
    });
  }

  /**
   * Ensure API is available (client-side only)
   */
  private ensureApiAvailable(): void {
    if (!this.api) {
      throw new Error('Deriv API is not available. This service only works on the client side.');
    }
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    this.ensureApiAvailable();
    
    if (this.isConnected) return;

    if (!this.connectionPromise) {
      this.connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        const checkConnection = () => {
          if (this.isConnected) {
            clearTimeout(timeout);
            this.connectionPromise = null;
            resolve();
          } else {
            setTimeout(checkConnection, 100);
          }
        };

        checkConnection();
      });
    }

    return this.connectionPromise;
  }

  /**
   * Authenticate user with token
   */
  async authorize(token: string): Promise<AccountInfo> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const response = await this.api.authorize(token);
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      this.isAuthorized = true;
      this.accountInfo = {
        balance: response.authorize.balance,
        currency: response.authorize.currency,
        loginid: response.authorize.loginid,
        email: response.authorize.email,
      };

      console.log('✅ User authorized successfully:', this.accountInfo.loginid);
      return this.accountInfo;

    } catch (error) {
      console.error('❌ Authorization failed:', error);
      throw error;
    }
  }

  /**
   * Get current account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const response = await this.api.balance();
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      return {
        balance: response.balance.balance,
        currency: response.balance.currency,
      };

    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Subscribe to balance updates
   */
  async subscribeToBalance(callback: (data: { balance: number; currency: string }) => void): Promise<DerivSubscription> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const subscription = await this.api.subscribe({
        balance: 1,
        subscribe: 1,
      });

      const subscriptionId = `balance_${Date.now()}`;
      
      const derivSubscription: DerivSubscription = {
        id: subscriptionId,
        callback,
        unsubscribe: () => {
          subscription.unsubscribe();
          this.subscriptions.delete(subscriptionId);
        },
      };

      // Handle subscription updates
      subscription.onUpdate((data: any) => {
        if (data.balance) {
          callback({
            balance: data.balance.balance,
            currency: data.balance.currency,
          });
        }
      });

      this.subscriptions.set(subscriptionId, derivSubscription);
      return derivSubscription;

    } catch (error) {
      console.error('❌ Failed to subscribe to balance:', error);
      throw error;
    }
  }

  /**
   * Subscribe to tick data for a symbol
   */
  async subscribeToTicks(symbol: string, callback: (data: any) => void): Promise<DerivSubscription> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const subscription = await this.api.subscribe({
        ticks: symbol,
        subscribe: 1,
      });

      const subscriptionId = `ticks_${symbol}_${Date.now()}`;
      
      const derivSubscription: DerivSubscription = {
        id: subscriptionId,
        callback,
        unsubscribe: () => {
          subscription.unsubscribe();
          this.subscriptions.delete(subscriptionId);
        },
      };

      // Handle subscription updates
      subscription.onUpdate(callback);

      this.subscriptions.set(subscriptionId, derivSubscription);
      return derivSubscription;

    } catch (error) {
      console.error(`❌ Failed to subscribe to ticks for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get contract proposal
   */
  async getProposal(params: TradeParams): Promise<any> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const response = await this.api.proposal({
        proposal: 1,
        symbol: params.symbol,
        contract_type: params.contract_type,
        amount: params.amount,
        duration: params.duration,
        duration_unit: params.duration_unit,
        basis: params.basis,
        barrier: params.barrier,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.proposal;

    } catch (error) {
      console.error('❌ Failed to get proposal:', error);
      throw error;
    }
  }

  /**
   * Subscribe to contract proposals
   */
  async subscribeToProposal(params: TradeParams, callback: (data: any) => void): Promise<DerivSubscription> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const subscription = await this.api.subscribe({
        proposal: 1,
        subscribe: 1,
        symbol: params.symbol,
        contract_type: params.contract_type,
        amount: params.amount,
        duration: params.duration,
        duration_unit: params.duration_unit,
        basis: params.basis,
        barrier: params.barrier,
      });

      const subscriptionId = `proposal_${params.symbol}_${Date.now()}`;
      
      const derivSubscription: DerivSubscription = {
        id: subscriptionId,
        callback,
        unsubscribe: () => {
          subscription.unsubscribe();
          this.subscriptions.delete(subscriptionId);
        },
      };

      // Handle subscription updates
      subscription.onUpdate(callback);

      this.subscriptions.set(subscriptionId, derivSubscription);
      return derivSubscription;

    } catch (error) {
      console.error('❌ Failed to subscribe to proposal:', error);
      throw error;
    }
  }

  /**
   * Place a trade (buy contract)
   */
  async buy(proposalId: string, price: number): Promise<any> {
    try {
      await this.ensureConnection();
      
      if (!this.isAuthorized) {
        throw new Error('User must be authorized to place trades');
      }

      if (!this.api) {
        throw new Error('API not initialized');
      }

      const response = await this.api.buy({
        buy: proposalId,
        price: price,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      console.log('✅ Trade placed successfully:', response.buy.contract_id);
      return response.buy;

    } catch (error) {
      console.error('❌ Failed to place trade:', error);
      throw error;
    }
  }

  /**
   * Get portfolio (open positions)
   */
  async getPortfolio(): Promise<any> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const response = await this.api.portfolio();
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.portfolio;

    } catch (error) {
      console.error('❌ Failed to get portfolio:', error);
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit = 50): Promise<any> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const response = await this.api.statement({
        statement: 1,
        limit: limit,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.statement;

    } catch (error) {
      console.error('❌ Failed to get transaction history:', error);
      throw error;
    }
  }

  /**
   * Get active symbols
   */
  async getActiveSymbols(): Promise<any> {
    try {
      await this.ensureConnection();
      
      if (!this.api) {
        throw new Error('API not initialized');
      }
      
      const response = await this.api.activeSymbols();
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.active_symbols;

    } catch (error) {
      console.error('❌ Failed to get active symbols:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from all subscriptions
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    this.subscriptions.clear();
    console.log('✅ All subscriptions cleared');
  }

  /**
   * Disconnect from API
   */
  disconnect(): void {
    this.unsubscribeAll();
    if (this.api) {
      this.api.disconnect();
    }
    this.isConnected = false;
    this.isAuthorized = false;
    this.accountInfo = null;
    console.log('✅ Disconnected from Deriv API');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { isConnected: boolean; isAuthorized: boolean } {
    return {
      isConnected: this.isConnected,
      isAuthorized: this.isAuthorized,
    };
  }

  /**
   * Get current account info
   */
  getAccountInfo(): AccountInfo | null {
    return this.accountInfo;
  }
}

// Export singleton instance
export const derivApiService = DerivAPIService.getInstance();

// Export OAuth helper functions
export function getOAuthURL(): string {
  const params = new URLSearchParams({
    app_id: DERIV_APP_ID.toString(),
    l: 'en',
    brand: 'deriv',
  });
  
  return `https://oauth.deriv.com/oauth2/authorize?${params.toString()}`;
}

export function handleOAuthCallback(): { token: string } | null {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  const token1 = urlParams.get('token1');
  
  if (token1) {
    // Store token securely
    try {
      localStorage.setItem('deriv_token', token1);
      return { token: token1 };
    } catch (error) {
      console.error('Failed to store token:', error);
    }
  }
  
  return null;
}

export function getStoredAuth(): { token: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const token = localStorage.getItem('deriv_token');
    return token ? { token } : null;
  } catch (error) {
    console.error('Failed to retrieve stored token:', error);
    return null;
  }
}

export default derivApiService;
