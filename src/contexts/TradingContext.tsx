'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { DerivAPI } from '../lib/deriv-api';
import { ContractManager, Contract, TradingStrategy, ContractProposal } from '../services/ContractManager';
import { MarketDataService, MarketSymbol } from '../services/MarketDataService';
import { AccountService, Account } from '../services/AccountService';
import { RiskManager, RiskParameters, RiskAlert } from '../services/RiskManager';
import { ContractParams, TickData, DerivError } from '../lib/types/deriv-types';

// State Interface
interface TradingState {
  // Connection
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;

  // Account
  currentAccount: Account | null;
  accounts: Account[];
  accountBalance: number;

  // Market Data
  symbols: MarketSymbol[];
  selectedSymbol: string | null;
  tickData: Map<string, TickData>;

  // Contracts
  activeContracts: Contract[];
  contractHistory: Contract[];
  strategies: TradingStrategy[];

  // Risk Management
  riskParameters: RiskParameters;
  riskAlerts: RiskAlert[];
  riskMetrics: Record<string, unknown> | null;

  // UI State
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

// Action Types
type TradingAction =
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_AUTHENTICATION_STATUS'; payload: boolean }
  | { type: 'SET_CONNECTION_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_ACCOUNT'; payload: Account | null }
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'SET_ACCOUNT_BALANCE'; payload: number }
  | { type: 'SET_SYMBOLS'; payload: MarketSymbol[] }
  | { type: 'SET_SELECTED_SYMBOL'; payload: string | null }
  | { type: 'UPDATE_TICK_DATA'; payload: { symbol: string; tick: TickData } }
  | { type: 'SET_ACTIVE_CONTRACTS'; payload: Contract[] }
  | { type: 'ADD_CONTRACT'; payload: Contract }
  | { type: 'UPDATE_CONTRACT'; payload: Contract }
  | { type: 'REMOVE_CONTRACT'; payload: string }
  | { type: 'SET_STRATEGIES'; payload: TradingStrategy[] }
  | { type: 'ADD_STRATEGY'; payload: TradingStrategy }
  | { type: 'UPDATE_STRATEGY'; payload: TradingStrategy }
  | { type: 'REMOVE_STRATEGY'; payload: string }
  | { type: 'SET_RISK_PARAMETERS'; payload: RiskParameters }
  | { type: 'SET_RISK_ALERTS'; payload: RiskAlert[] }
  | { type: 'ADD_RISK_ALERT'; payload: RiskAlert }
  | { type: 'CLEAR_RISK_ALERT'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

// Initial State
const initialState: TradingState = {
  isConnected: false,
  isAuthenticated: false,
  connectionError: null,
  currentAccount: null,
  accounts: [],
  accountBalance: 0,
  symbols: [],
  selectedSymbol: null,
  tickData: new Map(),
  activeContracts: [],
  contractHistory: [],
  strategies: [],
  riskParameters: {
    maxRiskPerTrade: 2,
    maxDailyLoss: 100,
    maxDrawdown: 10,
    maxOpenPositions: 5,
    maxRiskPerSymbol: 5,
    stopLossPercentage: 5,
    takeProfitPercentage: 10,
    riskRewardRatio: 2
  },
  riskAlerts: [],
  riskMetrics: null,
  isLoading: false,
  error: null,
  notifications: []
};

// Reducer
function tradingReducer(state: TradingState, action: TradingAction): TradingState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    
    case 'SET_AUTHENTICATION_STATUS':
      return { ...state, isAuthenticated: action.payload };
    
    case 'SET_CONNECTION_ERROR':
      return { ...state, connectionError: action.payload };
    
    case 'SET_CURRENT_ACCOUNT':
      return { ...state, currentAccount: action.payload };
    
    case 'SET_ACCOUNTS':
      return { ...state, accounts: action.payload };
    
    case 'SET_ACCOUNT_BALANCE':
      return { ...state, accountBalance: action.payload };
    
    case 'SET_SYMBOLS':
      return { ...state, symbols: action.payload };
    
    case 'SET_SELECTED_SYMBOL':
      return { ...state, selectedSymbol: action.payload };
    
    case 'UPDATE_TICK_DATA':
      const newTickData = new Map(state.tickData);
      newTickData.set(action.payload.symbol, action.payload.tick);
      return { ...state, tickData: newTickData };
    
    case 'SET_ACTIVE_CONTRACTS':
      return { ...state, activeContracts: action.payload };
    
    case 'ADD_CONTRACT':
      return {
        ...state,
        activeContracts: [...state.activeContracts, action.payload]
      };
    
    case 'UPDATE_CONTRACT':
      return {
        ...state,
        activeContracts: state.activeContracts.map(contract =>
          contract.id === action.payload.id ? action.payload : contract
        )
      };
    
    case 'REMOVE_CONTRACT':
      return {
        ...state,
        activeContracts: state.activeContracts.filter(contract => contract.id !== action.payload),
        contractHistory: [...state.contractHistory, 
          ...state.activeContracts.filter(contract => contract.id === action.payload)
        ]
      };
    
    case 'SET_STRATEGIES':
      return { ...state, strategies: action.payload };
    
    case 'ADD_STRATEGY':
      return { ...state, strategies: [...state.strategies, action.payload] };
    
    case 'UPDATE_STRATEGY':
      return {
        ...state,
        strategies: state.strategies.map(strategy =>
          strategy.name === action.payload.name ? action.payload : strategy
        )
      };
    
    case 'REMOVE_STRATEGY':
      return {
        ...state,
        strategies: state.strategies.filter(strategy => strategy.name !== action.payload)
      };
    
    case 'SET_RISK_PARAMETERS':
      return { ...state, riskParameters: action.payload };
    
    case 'SET_RISK_ALERTS':
      return { ...state, riskAlerts: action.payload };
    
    case 'ADD_RISK_ALERT':
      return { ...state, riskAlerts: [...state.riskAlerts, action.payload] };
    
    case 'CLEAR_RISK_ALERT':
      return {
        ...state,
        riskAlerts: state.riskAlerts.filter(alert => alert.id !== action.payload)
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(notification => notification.id !== action.payload)
      };
    
    default:
      return state;
  }
}

// Context Interface
interface TradingContextType {
  state: TradingState;
  
  // Connection & Authentication
  connect: () => Promise<void>;
  authenticate: (token: string) => Promise<void>;
  disconnect: () => void;
  
  // Account Management
  switchAccount: (loginid: string) => Promise<void>;
  refreshAccountData: () => Promise<void>;
  
  // Market Data
  loadSymbols: () => Promise<void>;
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
  selectSymbol: (symbol: string) => void;
  
  // Trading
  createProposal: (params: ContractParams) => Promise<ContractProposal>;
  buyContract: (proposalId: string, price: number, metadata?: Partial<Contract>) => Promise<Contract>;
  sellContract: (contractId: string) => Promise<void>;
  
  // Strategy Management
  createStrategy: (strategy: TradingStrategy) => void;
  updateStrategy: (name: string, updates: Partial<TradingStrategy>) => void;
  deleteStrategy: (name: string) => void;
  executeStrategy: (strategyName: string) => Promise<Contract>;
  
  // Risk Management
  updateRiskParameters: (params: Partial<RiskParameters>) => void;
  calculatePositionSize: (entryPrice: number, stopLoss?: number) => { recommendedAmount: number; maxAmount: number; riskAmount: number; riskPercentage: number; positionSizeRatio: number };
  validateTrade: (params: ContractParams) => { isValid: boolean; reason?: string; suggestedAmount?: number };
  
  // Notifications
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Create Context
const TradingContext = createContext<TradingContextType | undefined>(undefined);

// Services
let derivAPI: DerivAPI;
let contractManager: ContractManager;
let marketDataService: MarketDataService;
let accountService: AccountService;
let riskManager: RiskManager;

// Provider Component
interface TradingProviderProps {
  children: ReactNode;
}

export function TradingProvider({ children }: TradingProviderProps) {
  const [state, dispatch] = useReducer(tradingReducer, initialState);

  // Initialize services
  useEffect(() => {
    derivAPI = new DerivAPI();
    contractManager = new ContractManager(derivAPI);
    marketDataService = new MarketDataService(derivAPI);
    accountService = new AccountService(derivAPI);
    riskManager = new RiskManager(
      derivAPI,
      contractManager,
      accountService,
      marketDataService,
      state.riskParameters
    );

    // Monitor connection state
    const checkConnection = setInterval(() => {
      const isConnected = derivAPI.isConnected();
      const isAuthenticated = derivAPI.getIsAuthorized();
      
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: isConnected });
      dispatch({ type: 'SET_AUTHENTICATION_STATUS', payload: isAuthenticated });
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      derivAPI.disconnect();
    };
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (state.isAuthenticated) {
      const refreshInterval = setInterval(async () => {
        try {
          await refreshAccountData();
          const contracts = contractManager.getActiveContracts();
          dispatch({ type: 'SET_ACTIVE_CONTRACTS', payload: contracts });
          
          // Monitor risk
          const alerts = await riskManager.monitorRisk();
          dispatch({ type: 'SET_RISK_ALERTS', payload: alerts });
        } catch (error) {
          console.error('Auto-refresh error:', error);
        }
      }, 5000);

      return () => clearInterval(refreshInterval);
    }
  }, [state.isAuthenticated]);

  // Context Methods
  const connect = async (): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: null });
      
      // Connection is automatic in DerivAPI constructor
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for connection
      
      if (!derivAPI.isConnected()) {
        throw new Error('Failed to connect to Deriv API');
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch({ type: 'SET_CONNECTION_ERROR', payload: errorMessage });
      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: errorMessage
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const authenticate = async (token: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      const response = await accountService.authenticate(token);
      
      dispatch({ type: 'SET_AUTHENTICATION_STATUS', payload: true });
      dispatch({ type: 'SET_ACCOUNTS', payload: accountService.getAllAccounts() });
      dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: accountService.getCurrentAccount() || null });
      dispatch({ type: 'SET_ACCOUNT_BALANCE', payload: response.authorize.balance });

      addNotification({
        type: 'success',
        title: 'Authentication Successful',
        message: `Welcome back, ${response.authorize.fullname}`
      });

      // Load initial data
      await loadSymbols();
    } catch (error) {
      const errorMessage = (error as Error).message;
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      addNotification({
        type: 'error',
        title: 'Authentication Failed',
        message: errorMessage
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const disconnect = (): void => {
    derivAPI.disconnect();
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
    dispatch({ type: 'SET_AUTHENTICATION_STATUS', payload: false });
    dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: null });
    dispatch({ type: 'SET_ACCOUNTS', payload: [] });
  };

  const switchAccount = async (loginid: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      await accountService.switchAccount(loginid);
      
      const currentAccount = accountService.getCurrentAccount();
      dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: currentAccount || null });
      
      if (currentAccount?.balance) {
        dispatch({ type: 'SET_ACCOUNT_BALANCE', payload: currentAccount.balance });
      }

      addNotification({
        type: 'success',
        title: 'Account Switched',
        message: `Switched to account ${loginid}`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Account Switch Failed',
        message: (error as Error).message
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const refreshAccountData = async (): Promise<void> => {
    try {
      await accountService.refreshAccountData();
      const currentAccount = accountService.getCurrentAccount();
      
      if (currentAccount) {
        dispatch({ type: 'SET_CURRENT_ACCOUNT', payload: currentAccount });
        if (currentAccount.balance) {
          dispatch({ type: 'SET_ACCOUNT_BALANCE', payload: currentAccount.balance });
        }
      }
    } catch (error) {
      console.error('Failed to refresh account data:', error);
    }
  };

  const loadSymbols = async (): Promise<void> => {
    try {
      const symbols = await marketDataService.loadActiveSymbols();
      dispatch({ type: 'SET_SYMBOLS', payload: symbols });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to Load Symbols',
        message: (error as Error).message
      });
    }
  };

  const subscribeToSymbol = (symbol: string): void => {
    marketDataService.subscribeToTicks(symbol, (tick) => {
      dispatch({ type: 'UPDATE_TICK_DATA', payload: { symbol, tick } });
    });
  };

  const unsubscribeFromSymbol = (symbol: string): void => {
    marketDataService.unsubscribeFromTicks(symbol);
  };

  const selectSymbol = (symbol: string): void => {
    dispatch({ type: 'SET_SELECTED_SYMBOL', payload: symbol });
    subscribeToSymbol(symbol);
  };

  const createProposal = async (params: ContractParams) => {
    try {
      return await contractManager.createProposal(params);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Proposal Failed',
        message: (error as Error).message
      });
      throw error;
    }
  };

  const buyContract = async (
    proposalId: string, 
    price: number, 
    metadata?: Partial<Contract>
  ): Promise<Contract> => {
    try {
      // Validate trade first
      if (metadata) {
        const validation = riskManager.validateTradeRisk(
          metadata as ContractParams,
          state.accountBalance,
          state.activeContracts
        );
        
        if (!validation.isValid) {
          throw new Error(validation.reason);
        }
      }

      const contract = await contractManager.buyContract(proposalId, price, metadata);
      dispatch({ type: 'ADD_CONTRACT', payload: contract });

      addNotification({
        type: 'success',
        title: 'Contract Purchased',
        message: `Contract ${contract.id} purchased for $${price}`
      });

      return contract;
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Purchase Failed',
        message: (error as Error).message
      });
      throw error;
    }
  };

  const sellContract = async (contractId: string): Promise<void> => {
    try {
      await contractManager.sellContract(contractId);
      dispatch({ type: 'REMOVE_CONTRACT', payload: contractId });

      addNotification({
        type: 'success',
        title: 'Contract Sold',
        message: `Contract ${contractId} sold successfully`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sale Failed',
        message: (error as Error).message
      });
      throw error;
    }
  };

  const createStrategy = (strategy: TradingStrategy): void => {
    contractManager.createStrategy(strategy);
    dispatch({ type: 'ADD_STRATEGY', payload: strategy });
    
    addNotification({
      type: 'success',
      title: 'Strategy Created',
      message: `Strategy "${strategy.name}" created successfully`
    });
  };

  const updateStrategy = (name: string, updates: Partial<TradingStrategy>): void => {
    contractManager.updateStrategy(name, updates);
    const updatedStrategy = contractManager.getStrategy(name);
    
    if (updatedStrategy) {
      dispatch({ type: 'UPDATE_STRATEGY', payload: updatedStrategy });
    }
  };

  const deleteStrategy = (name: string): void => {
    contractManager.deleteStrategy(name);
    dispatch({ type: 'REMOVE_STRATEGY', payload: name });
    
    addNotification({
      type: 'success',
      title: 'Strategy Deleted',
      message: `Strategy "${name}" deleted successfully`
    });
  };

  const executeStrategy = async (strategyName: string): Promise<Contract> => {
    try {
      const contract = await contractManager.executeStrategy(strategyName);
      dispatch({ type: 'ADD_CONTRACT', payload: contract });

      addNotification({
        type: 'success',
        title: 'Strategy Executed',
        message: `Strategy "${strategyName}" executed successfully`
      });

      return contract;
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Strategy Execution Failed',
        message: (error as Error).message
      });
      throw error;
    }
  };

  const updateRiskParameters = (params: Partial<RiskParameters>): void => {
    const newParams = { ...state.riskParameters, ...params };
    riskManager.updateRiskParameters(newParams);
    dispatch({ type: 'SET_RISK_PARAMETERS', payload: newParams });
  };

  const calculatePositionSize = (entryPrice: number, stopLoss?: number) => {
    return riskManager.calculatePositionSize(state.accountBalance, entryPrice, stopLoss);
  };

  const validateTrade = (params: ContractParams) => {
    return riskManager.validateTradeRisk(params, state.accountBalance, state.activeContracts);
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>): void => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remove after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: newNotification.id });
    }, 5000);
  };

  const removeNotification = (id: string): void => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  };

  const clearAllNotifications = (): void => {
    state.notifications.forEach(notification => {
      dispatch({ type: 'REMOVE_NOTIFICATION', payload: notification.id });
    });
  };

  const contextValue: TradingContextType = {
    state,
    connect,
    authenticate,
    disconnect,
    switchAccount,
    refreshAccountData,
    loadSymbols,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    selectSymbol,
    createProposal,
    buyContract,
    sellContract,
    createStrategy,
    updateStrategy,
    deleteStrategy,
    executeStrategy,
    updateRiskParameters,
    calculatePositionSize,
    validateTrade,
    addNotification,
    removeNotification,
    clearAllNotifications
  };

  return (
    <TradingContext.Provider value={contextValue}>
      {children}
    </TradingContext.Provider>
  );
}

// Custom Hook
export function useTrading() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}
