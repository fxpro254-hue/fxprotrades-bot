export const DERIV_APP_ID = "110104";
export const OAUTH_URL = "https://fxprotradesbot.vercel.app";
export const AFFILIATE_LINK =
  "https://deriv.partners/rx?sidc=1203792D-65EF-4B56-9795-E4FDF716DAEF&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU137432";

import {
  DerivResponse,
  AuthorizeResponse,
  BalanceResponse,
  ContractParams,
  ProposalResponse,
  BuyResponse,
  ContractUpdate,
  TicksResponse,
  HistoryResponse,
  ActiveSymbolsResponse,
  PortfolioResponse,
  StatementResponse,
  ProfitTableResponse,
  AssetIndexResponse,
  TradingTimesResponse,
  ServerTimeResponse,
  PingResponse,
  SubscriptionCallback,
  SubscriptionInfo,
  ConnectionState,
  ContractType,
  DurationUnit
} from './types/deriv-types';

export class DerivAPI {
  private ws: WebSocket | null = null;
  private requestId = 1;
  private callbacks: Map<number, (data: DerivResponse) => void> = new Map();
  private subscriptionCallbacks: Map<string, SubscriptionCallback> = new Map();
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isAuthorized = false;
  private currentAccount: string | null = null;

  constructor() {
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`,
    );

    this.ws.onopen = () => {
      console.log("Connected to Deriv API");
      this.connectionState = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;
      this.startKeepAlive();
    };

    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.req_id && this.callbacks.has(data.req_id)) {
        const callback = this.callbacks.get(data.req_id);
        if (callback) {
          callback(data);
          this.callbacks.delete(data.req_id);
        }
      }

      // Route subscription messages
      if (data.subscription && data.subscription.id) {
        const subId = String(data.subscription.id);
        const subCb = this.subscriptionCallbacks.get(subId);
        if (subCb) {
          subCb(data);
        }
      }
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = (event) => {
      console.log("Disconnected from Deriv API", event.code, event.reason);
      this.connectionState = ConnectionState.DISCONNECTED;
      this.isAuthorized = false;
      this.stopKeepAlive();
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.connectionState = ConnectionState.RECONNECTING;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, delay);
      } else {
        this.connectionState = ConnectionState.ERROR;
        console.error('Max reconnection attempts reached');
      }
    };
  }

  send(
    request: Record<string, unknown>,
    callback?: (data: DerivResponse) => void,
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not connected");
      return;
    }

    const reqId = this.requestId++;
    const requestWithId = { ...request, req_id: reqId };

    if (callback) {
      this.callbacks.set(reqId, callback);
    }

    this.ws.send(JSON.stringify(requestWithId));
  }

  // Keep alive mechanism
  private startKeepAlive() {
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  // Connection state getters
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getIsAuthorized(): boolean {
    return this.isAuthorized;
  }

  getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  // Enhanced authorization
  authorize(token: string): Promise<AuthorizeResponse> {
    return new Promise((resolve, reject) => {
      this.send({ authorize: token }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          this.isAuthorized = true;
          this.currentAccount = (data as AuthorizeResponse).authorize.loginid;
          resolve(data as AuthorizeResponse);
        }
      });
    });
  }

  // Account switching
  switchAccount(loginid: string): Promise<AuthorizeResponse> {
    return new Promise((resolve, reject) => {
      this.send({ loginid }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          this.currentAccount = loginid;
          resolve(data as AuthorizeResponse);
        }
      });
    });
  }

  // Balance methods
  getAccountBalance(): Promise<BalanceResponse> {
    return new Promise((resolve, reject) => {
      this.send({ balance: 1 }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as BalanceResponse);
        }
      });
    });
  }

  subscribeBalance(
    onUpdate: SubscriptionCallback<BalanceResponse>,
    onReady?: (subId: string) => void,
  ): void {
    this.send({ balance: 1, subscribe: 1 }, (data) => {
      const subId = data?.subscription?.id as string | undefined;
      if (subId) {
        this.subscriptionCallbacks.set(subId, onUpdate as SubscriptionCallback);
        this.subscriptions.set(subId, {
          id: subId,
          callback: onUpdate as SubscriptionCallback,
          type: 'balance'
        });
        if (onReady) onReady(subId);
      } else {
        onUpdate(data as BalanceResponse);
      }
    });
  }

  // Tick subscription
  subscribeTicks(
    symbol: string,
    onUpdate: SubscriptionCallback<TicksResponse>,
    onReady?: (subId: string) => void,
  ): void {
    this.send({ ticks: symbol, subscribe: 1 }, (data) => {
      const subId = data?.subscription?.id as string | undefined;
      if (subId) {
        this.subscriptionCallbacks.set(subId, onUpdate as SubscriptionCallback);
        this.subscriptions.set(subId, {
          id: subId,
          callback: onUpdate as SubscriptionCallback,
          type: 'ticks'
        });
        if (onReady) onReady(subId);
      } else {
        onUpdate(data as TicksResponse);
      }
    });
  }

  // Enhanced contract proposal with full parameters
  getContractProposal(params: ContractParams): Promise<ProposalResponse> {
    return new Promise((resolve, reject) => {
      this.send({ 
        proposal: 1, 
        ...params
      }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as ProposalResponse);
        }
      });
    });
  }

  // Subscribe to proposal updates
  subscribeProposal(
    params: ContractParams,
    onUpdate: SubscriptionCallback<ProposalResponse>,
    onReady?: (subId: string) => void
  ): void {
    this.send({ 
      proposal: 1, 
      ...params,
      subscribe: 1 
    }, (data) => {
      const subId = data?.subscription?.id as string | undefined;
      if (subId) {
        this.subscriptionCallbacks.set(subId, onUpdate as SubscriptionCallback);
        this.subscriptions.set(subId, {
          id: subId,
          callback: onUpdate as SubscriptionCallback,
          type: 'proposal'
        });
        if (onReady) onReady(subId);
      } else {
        onUpdate(data as ProposalResponse);
      }
    });
  }

  // Enhanced buy method
  buyContract(proposalId: string, price: number): Promise<BuyResponse> {
    return new Promise((resolve, reject) => {
      this.send({ buy: proposalId, price }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as BuyResponse);
        }
      });
    });
  }

  // Legacy buy method for compatibility
  buy(contractId: number | string, price: number): Promise<BuyResponse> {
    return this.buyContract(String(contractId), price);
  }

  // Sell contract
  sell(contractId: number | string): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      this.send({ sell: contractId }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
      });
    });
  }

  // Subscribe to contract updates
  subscribeToContract(
    contractId: number,
    onUpdate: SubscriptionCallback<ContractUpdate>,
    onReady?: (subId: string) => void
  ): void {
    this.send({ 
      proposal_open_contract: 1, 
      contract_id: contractId,
      subscribe: 1 
    }, (data) => {
      const subId = data?.subscription?.id as string | undefined;
      if (subId) {
        this.subscriptionCallbacks.set(subId, onUpdate as SubscriptionCallback);
        this.subscriptions.set(subId, {
          id: subId,
          callback: onUpdate as SubscriptionCallback,
          type: 'contract'
        });
        if (onReady) onReady(subId);
      } else {
        onUpdate(data as ContractUpdate);
      }
    });
  }

  // Historical data
  getHistory(params: {
    ticks_history: string;
    end: string;
    start?: number;
    count?: number;
    granularity?: number;
    style?: 'ticks' | 'candles';
  }): Promise<HistoryResponse> {
    return new Promise((resolve, reject) => {
      this.send(params, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as HistoryResponse);
        }
      });
    });
  }

  // Get active symbols
  getActiveSymbols(productType: string = 'basic'): Promise<ActiveSymbolsResponse> {
    return new Promise((resolve, reject) => {
      this.send({ active_symbols: 'brief', product_type: productType }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as ActiveSymbolsResponse);
        }
      });
    });
  }

  // Enhanced portfolio
  getPortfolio(): Promise<PortfolioResponse> {
    return new Promise((resolve, reject) => {
      this.send({ portfolio: 1 }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as PortfolioResponse);
        }
      });
    });
  }

  // Enhanced transactions
  getTransactions(limit: number = 50): Promise<StatementResponse> {
    return this.getStatement({ limit });
  }

  getStatement(params: {
    limit?: number;
    offset?: number;
    action_type?: string;
    date_from?: number;
    date_to?: number;
  } = {}): Promise<StatementResponse> {
    return new Promise((resolve, reject) => {
      this.send({ statement: 1, ...params }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as StatementResponse);
        }
      });
    });
  }

  // Profit table
  getProfitTable(params: {
    description?: number;
    limit?: number;
    offset?: number;
    sort?: string;
    contract_type?: string[];
    date_from?: number;
    date_to?: number;
  } = {}): Promise<ProfitTableResponse> {
    return new Promise((resolve, reject) => {
      this.send({ profit_table: 1, ...params }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as ProfitTableResponse);
        }
      });
    });
  }

  // Asset index
  getAssetIndex(): Promise<AssetIndexResponse> {
    return new Promise((resolve, reject) => {
      this.send({ asset_index: 1 }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as AssetIndexResponse);
        }
      });
    });
  }

  // Trading times
  getTradingTimes(date: string): Promise<TradingTimesResponse> {
    return new Promise((resolve, reject) => {
      this.send({ trading_times: date }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as TradingTimesResponse);
        }
      });
    });
  }

  // Server time
  getServerTime(): Promise<ServerTimeResponse> {
    return new Promise((resolve, reject) => {
      this.send({ time: 1 }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as ServerTimeResponse);
        }
      });
    });
  }

  // Ping
  ping(): Promise<PingResponse> {
    return new Promise((resolve, reject) => {
      this.send({ ping: 1 }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data as PingResponse);
        }
      });
    });
  }

  // Enhanced unsubscribe
  unsubscribe(subId: string): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      this.subscriptionCallbacks.delete(subId);
      this.subscriptions.delete(subId);
      this.send({ forget: subId }, (data) => {
        if (data.error) {
          reject(data.error);
        } else {
          resolve(data);
        }
      });
    });
  }

  // Unsubscribe all
  async unsubscribeAll(): Promise<void> {
    const promises = Array.from(this.subscriptions.keys()).map(subId => 
      this.unsubscribe(subId).catch(console.error)
    );
    await Promise.all(promises);
  }

  // Get all active subscriptions
  getActiveSubscriptions(): SubscriptionInfo[] {
    return Array.from(this.subscriptions.values());
  }

  disconnect() {
    this.stopKeepAlive();
    this.unsubscribeAll();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
    this.connectionState = ConnectionState.DISCONNECTED;
    this.isAuthorized = false;
    this.currentAccount = null;
  }
}

export function getOAuthURL() {
  const redirect = encodeURIComponent(OAUTH_URL);
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${DERIV_APP_ID}&l=EN&brand=deriv&redirect_uri=${redirect}`;
}

export function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const token1 = params.get("token1");
  const acct1 = params.get("acct1");

  if (token1 && acct1) {
    localStorage.setItem("deriv_token", token1);
    localStorage.setItem("deriv_account", acct1);
    return { token: token1, account: acct1 };
  }

  return null;
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("deriv_token");
  const account = localStorage.getItem("deriv_account");

  if (token && account) {
    return { token, account };
  }

  return null;
}

export function logout() {
  localStorage.removeItem("deriv_token");
  localStorage.removeItem("deriv_account");
  localStorage.removeItem("skip_login");
}
