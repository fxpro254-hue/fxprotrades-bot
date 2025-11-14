/**
 * Official Deriv API SDK Integration - Fixed Version
 * This replaces the custom WebSocket implementation with the official @deriv/deriv-api
 * Fixed for Next.js SSR compatibility
 */

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
 * Fixed for Next.js compatibility
 */
class DerivAPIService {
  private static instance: DerivAPIService;
  private api: any = null;
  private subscriptions: Map<string, DerivSubscription> = new Map();
  private isConnected = false;
  private isAuthorized = false;
  private accountInfo: AccountInfo | null = null;
  private connectionPromise: Promise<void> | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeAPI();
    }
  }

  private async initializeAPI(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise(async (resolve, reject) => {
      try {
        // Dynamic import for Next.js compatibility
        const { default: DerivAPI } = await import('@deriv/deriv-api');

        // Initialize the official Deriv API
        this.api = new DerivAPI({
          endpoint: WS_ENDPOINT,
          app_id: DERIV_APP_ID,
        });

        this.setupEventListeners();
        resolve();
      } catch (error) {
        console.error('Failed to initialize Deriv API:', error);
        reject(error);
      }
    });

    return this.initPromise;
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
  private async ensureApiAvailable(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Deriv API is not available. This service only works on the client side.');
    }

    // Wait for API initialization
    if (this.initPromise) {
      await this.initPromise;
    }

    if (!this.api) {
      throw new Error('Deriv API failed to initialize.');
    }
  }

  /**
   * Ensure connection is established
   */
  private async ensureConnection(): Promise<void> {
    await this.ensureApiAvailable();
    
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
