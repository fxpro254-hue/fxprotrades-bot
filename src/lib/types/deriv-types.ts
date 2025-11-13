// Comprehensive TypeScript interfaces for Deriv API

export interface DerivResponse {
  req_id?: number;
  subscription?: {
    id?: string;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

// Authentication & Account Types
export interface AuthorizeResponse extends DerivResponse {
  authorize: {
    account_list: AccountInfo[];
    balance: number;
    country: string;
    currency: string;
    email: string;
    fullname: string;
    is_virtual: number;
    landing_company_fullname: string;
    landing_company_name: string;
    loginid: string;
    preferred_language: string;
    scopes: string[];
    user_id: number;
  };
}

export interface AccountInfo {
  account_category?: string;
  account_type: string;
  broker?: string;
  created_at: number;
  currency: string;
  currency_type?: string;
  is_disabled: number;
  is_virtual: number;
  landing_company_name: string;
  loginid: string;
  trading?: Record<string, unknown>;
  linked_to?: string[];
}

// Balance Types
export interface BalanceResponse extends DerivResponse {
  balance: {
    balance: number;
    currency: string;
    loginid: string;
  };
}

// Contract & Trading Types
export interface ContractParams {
  contract_type: string;
  symbol: string;
  amount: number;
  duration: number;
  duration_unit: string;
  basis: 'stake' | 'payout';
  barrier?: number;
  barrier2?: number;
  currency?: string;
  trading_period_start?: number;
  product_type?: string;
}

export interface ProposalResponse extends DerivResponse {
  proposal: {
    ask_price: number;
    date_start: number;
    display_value: string;
    id: string;
    longcode: string;
    payout: number;
    spot: number;
    spot_time: number;
  };
}

export interface BuyResponse extends DerivResponse {
  buy: {
    balance_after: number;
    buy_price: number;
    contract_id: number;
    longcode: string;
    payout: number;
    purchase_time: number;
    shortcode: string;
    start_time: number;
    transaction_id: number;
  };
}

export interface ContractUpdate extends DerivResponse {
  proposal_open_contract: {
    account_id: number;
    barrier?: number;
    barrier2?: number;
    bid_price: number;
    buy_price: number;
    contract_id: number;
    contract_type: string;
    currency: string;
    current_spot?: number;
    current_spot_time?: number;
    date_expiry: number;
    date_settlement: number;
    date_start: number;
    display_name: string;
    entry_spot?: number;
    entry_spot_time?: number;
    exit_spot?: number;
    exit_spot_time?: number;
    exit_tick?: number;
    exit_tick_time?: number;
    expiry_type: string;
    id_ref: number;
    is_expired: number;
    is_forward_starting: number;
    is_intraday: number;
    is_path_dependent: number;
    is_settleable: number;
    is_sold: number;
    is_valid_to_cancel: number;
    is_valid_to_sell: number;
    longcode: string;
    payout: number;
    profit: number;
    profit_percentage: number;
    purchase_time: number;
    shortcode: string;
    status: string;
    tick_count?: number;
    tick_stream?: TickData[];
    transaction_ids: {
      buy: number;
      sell?: number;
    };
    underlying: string;
    validation_error?: string;
  };
}

// Market Data Types
export interface TickData {
  epoch: number;
  quote: number;
  symbol: string;
}

export interface TicksResponse extends DerivResponse {
  tick: TickData;
}

export interface HistoricalData {
  candles?: Array<{
    close: number;
    epoch: number;
    high: number;
    low: number;
    open: number;
  }>;
  prices?: number[];
  times?: number[];
}

export interface HistoryResponse extends DerivResponse {
  history: HistoricalData;
}

export interface ActiveSymbol {
  allow_forward_starting: number;
  display_name: string;
  exchange_is_open: number;
  is_trading_suspended: number;
  market: string;
  market_display_name: string;
  pip: number;
  submarket: string;
  submarket_display_name: string;
  symbol: string;
  symbol_type: string;
}

export interface ActiveSymbolsResponse extends DerivResponse {
  active_symbols: ActiveSymbol[];
}

// Portfolio Types
export interface PortfolioPosition {
  app_id: number;
  buy_price: number;
  contract_id: number;
  contract_type: string;
  currency: string;
  date_start: number;
  expiry_time: number;
  longcode: string;
  payout: number;
  purchase_time: number;
  shortcode: string;
  symbol: string;
  transaction_id: number;
}

export interface PortfolioResponse extends DerivResponse {
  portfolio: {
    contracts: PortfolioPosition[];
  };
}

// Transaction Types
export interface Transaction {
  action_type: string;
  amount: number;
  balance_after: number;
  contract_id?: number;
  currency: string;
  date: string;
  display_name: string;
  longcode?: string;
  payout?: number;
  purchase_time?: number;
  reference_id: number;
  shortcode?: string;
  transaction_id: number;
  transaction_time: number;
}

export interface StatementResponse extends DerivResponse {
  statement: {
    count: number;
    transactions: Transaction[];
  };
}

// Profit Table Types
export interface ProfitTableTransaction {
  app_id: number;
  buy_price: number;
  contract_id: number;
  currency: string;
  duration_type: string;
  longcode: string;
  payout: number;
  purchase_time: string;
  sell_price: number;
  sell_time: string;
  shortcode: string;
  transaction_id: number;
}

export interface ProfitTableResponse extends DerivResponse {
  profit_table: {
    count: number;
    transactions: ProfitTableTransaction[];
  };
}

// Asset Index Types
export interface AssetIndexItem {
  display_name: string;
  symbol: string;
}

export interface AssetIndexResponse extends DerivResponse {
  asset_index: AssetIndexItem[];
}

// Trading Times Types
export interface TradingTimesResponse extends DerivResponse {
  trading_times: {
    markets: Array<{
      name: string;
      submarkets: Array<{
        name: string;
        symbols: Array<{
          name: string;
          symbol: string;
          times: {
            open: string[];
            close: string[];
          };
        }>;
      }>;
    }>;
  };
}

// Server Time Types
export interface ServerTimeResponse extends DerivResponse {
  time: number;
}

// Ping Response
export interface PingResponse extends DerivResponse {
  ping: 'pong';
}

// Error Types
export interface DerivError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Subscription Types
export interface SubscriptionCallback<T = DerivResponse> {
  (data: T): void;
}

export interface SubscriptionInfo {
  id: string;
  callback: SubscriptionCallback;
  type: 'ticks' | 'balance' | 'proposal' | 'contract';
}

// Connection States
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Contract Types Enum
export enum ContractType {
  CALL = 'CALL',
  PUT = 'PUT',
  DIGITDIFF = 'DIGITDIFF',
  DIGITEVEN = 'DIGITEVEN',
  DIGITODD = 'DIGITODD',
  DIGITOVER = 'DIGITOVER',
  DIGITUNDER = 'DIGITUNDER',
  EXPIRYMISS = 'EXPIRYMISS',
  EXPIRYRANGE = 'EXPIRYRANGE',
  NOTOUCH = 'NOTOUCH',
  ONETOUCH = 'ONETOUCH',
  RANGE = 'RANGE',
  UPORDOWN = 'UPORDOWN'
}

// Duration Units
export enum DurationUnit {
  SECONDS = 's',
  MINUTES = 'm',
  HOURS = 'h',
  DAYS = 'd',
  TICKS = 't'
}

// Market Categories
export enum MarketCategory {
  FOREX = 'forex',
  INDICES = 'indices',
  COMMODITIES = 'commodities',
  SYNTHETIC_INDICES = 'synthetic_index',
  CRYPTOCURRENCIES = 'cryptocurrencies'
}
