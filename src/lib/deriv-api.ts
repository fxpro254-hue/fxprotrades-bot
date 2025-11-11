export const DERIV_APP_ID = "110104";
export const OAUTH_URL = "https://fxprotradesbot.vercel.app";
export const AFFILIATE_LINK =
  "https://deriv.partners/rx?sidc=1203792D-65EF-4B56-9795-E4FDF716DAEF&utm_campaign=dynamicworks&utm_medium=affiliate&utm_source=CU137432";

interface DerivResponse {
  req_id?: number;
  subscription?: {
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class DerivAPI {
  private ws: WebSocket | null = null;
  private requestId = 1;
  private callbacks: Map<number, (data: DerivResponse) => void> = new Map();
  private subscriptionCallbacks: Map<string, (data: DerivResponse) => void> =
    new Map();

  constructor() {
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?app_id=${DERIV_APP_ID}`,
    );

    this.ws.onopen = () => {
      console.log("Connected to Deriv API");
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

    this.ws.onclose = () => {
      console.log("Disconnected from Deriv API");
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
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

  authorize(token: string, callback: (data: DerivResponse) => void) {
    this.send({ authorize: token }, callback);
  }

  // One-off balance fetch (no subscription)
  getAccountBalance(callback: (data: DerivResponse) => void) {
    this.send({ balance: 1 }, callback);
  }

  // Subscribe to balance updates; resolves with subscription id
  subscribeBalance(
    onUpdate: (data: DerivResponse) => void,
    onReady?: (subId: string) => void,
  ) {
    this.send({ balance: 1, subscribe: 1 }, (data) => {
      const subId = data?.subscription?.id as string | undefined;
      if (subId) {
        this.subscriptionCallbacks.set(subId, onUpdate);
        if (onReady) onReady(subId);
      } else {
        // If no subscription (e.g., error), still call once
        onUpdate(data);
      }
    });
  }

  // Unsubscribe from a given subscription id
  unsubscribe(subId: string, callback?: (data: DerivResponse) => void) {
    this.subscriptionCallbacks.delete(subId);
    this.send({ forget: subId }, callback);
  }

  // Subscribe to ticks for a symbol; resolves with subscription id
  subscribeTicks(
    symbol: string,
    onUpdate: (data: DerivResponse) => void,
    onReady?: (subId: string) => void,
  ) {
    this.send({ ticks: symbol, subscribe: 1 }, (data) => {
      const subId = data?.subscription?.id as string | undefined;
      if (subId) {
        this.subscriptionCallbacks.set(subId, onUpdate);
        if (onReady) onReady(subId);
      } else {
        onUpdate(data);
      }
    });
  }

  getActiveSymbols(callback: (data: DerivResponse) => void) {
    this.send({ active_symbols: "brief", product_type: "basic" }, callback);
  }

  // Portfolio (open positions)
  getPortfolio(callback: (data: DerivResponse) => void) {
    this.send({ portfolio: 1 }, callback);
  }

  // Recent transactions / statement
  getTransactions(limit: number, callback: (data: DerivResponse) => void) {
    this.send({ statement: 1, limit }, callback);
  }

  // Propose contract (quote)
  getProposal(
    request: Record<string, unknown>,
    callback: (data: DerivResponse) => void,
  ) {
    this.send({ proposal: 1, ...request }, callback);
  }

  // Buy contract
  buy(
    contractId: number | string,
    price: number,
    callback: (data: DerivResponse) => void,
  ) {
    this.send({ buy: contractId, price }, callback);
  }

  // Sell contract
  sell(contractId: number | string, callback: (data: DerivResponse) => void) {
    this.send({ sell: contractId }, callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
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
