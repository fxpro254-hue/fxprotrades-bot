/**
 * Type declarations for @deriv/deriv-api
 * Since the official package doesn't include TypeScript definitions
 */

declare module '@deriv/deriv-api' {
  interface DerivAPIConfig {
    endpoint: string;
    app_id: number;
  }

  interface DerivResponse {
    error?: {
      code: string;
      message: string;
    };
    [key: string]: any;
  }

  interface AuthorizeResponse extends DerivResponse {
    authorize: {
      balance: number;
      currency: string;
      loginid: string;
      email: string;
      [key: string]: any;
    };
  }

  interface BalanceResponse extends DerivResponse {
    balance: {
      balance: number;
      currency: string;
      [key: string]: any;
    };
  }

  interface ProposalResponse extends DerivResponse {
    proposal: {
      id: string;
      ask_price: number;
      display_value: string;
      [key: string]: any;
    };
  }

  interface BuyResponse extends DerivResponse {
    buy: {
      contract_id: string;
      buy_price: number;
      [key: string]: any;
    };
  }

  interface SubscriptionObject {
    unsubscribe(): void;
    onUpdate(callback: (data: any) => void): void;
  }

  class DerivAPI {
    constructor(config: DerivAPIConfig);
    
    // Connection methods
    onOpen(callback: () => void): void;
    onClose(callback: () => void): void;
    onError(callback: (error: any) => void): void;
    disconnect(): void;

    // Authentication
    authorize(token: string): Promise<AuthorizeResponse>;

    // Account methods
    balance(): Promise<BalanceResponse>;
    portfolio(): Promise<DerivResponse>;
    statement(params: { statement: number; limit?: number }): Promise<DerivResponse>;

    // Trading methods
    proposal(params: {
      proposal: number;
      symbol: string;
      contract_type: string;
      amount: number;
      duration: number;
      duration_unit: string;
      basis: string;
      barrier?: string;
    }): Promise<ProposalResponse>;

    buy(params: {
      buy: string;
      price: number;
    }): Promise<BuyResponse>;

    // Market data
    activeSymbols(): Promise<DerivResponse>;
    ticks(symbol: string): Promise<DerivResponse>;

    // Subscriptions
    subscribe(params: {
      [key: string]: any;
      subscribe?: number;
    }): Promise<SubscriptionObject>;
  }

  export default DerivAPI;
}
