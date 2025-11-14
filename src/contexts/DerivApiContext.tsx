"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { derivApiService, AccountInfo, DerivSubscription } from '@/services/derivApi';

interface DerivApiContextType {
  // Connection state
  isConnected: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  
  // Account data
  accountInfo: AccountInfo | null;
  balance: { balance: number; currency: string } | null;
  
  // Methods
  authorize: (token: string) => Promise<void>;
  logout: () => void;
  refreshBalance: () => Promise<void>;
  
  // Subscriptions
  subscribeToBalance: (callback: (data: { balance: number; currency: string }) => void) => Promise<DerivSubscription | null>;
  subscribeToTicks: (symbol: string, callback: (data: any) => void) => Promise<DerivSubscription | null>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

const DerivApiContext = createContext<DerivApiContextType | undefined>(undefined);

interface DerivApiProviderProps {
  children: ReactNode;
}

export function DerivApiProvider({ children }: DerivApiProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balanceSubscription, setBalanceSubscription] = useState<DerivSubscription | null>(null);

  // Check connection status periodically
  useEffect(() => {
    const checkStatus = () => {
      const status = derivApiService.getConnectionStatus();
      setIsConnected(status.isConnected);
      setIsAuthorized(status.isAuthorized);
      
      const info = derivApiService.getAccountInfo();
      setAccountInfo(info);
    };

    // Initial check
    checkStatus();

    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-subscribe to balance when authorized
  useEffect(() => {
    if (isAuthorized && !balanceSubscription) {
      subscribeToBalanceInternal();
    } else if (!isAuthorized && balanceSubscription) {
      balanceSubscription.unsubscribe();
      setBalanceSubscription(null);
      setBalance(null);
    }
  }, [isAuthorized]);

  const authorize = async (token: string): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await derivApiService.authorize(token);
      setAccountInfo(info);
      setIsAuthorized(true);
      
      // Get initial balance
      await refreshBalance();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authorization failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (): void => {
    try {
      // Clear balance subscription
      if (balanceSubscription) {
        balanceSubscription.unsubscribe();
        setBalanceSubscription(null);
      }
      
      // Clear stored token
      if (typeof window !== 'undefined') {
        localStorage.removeItem('deriv_token');
      }
      
      // Reset state
      setIsAuthorized(false);
      setAccountInfo(null);
      setBalance(null);
      setError(null);
      
      console.log('✅ Logged out successfully');
    } catch (err) {
      console.error('❌ Logout error:', err);
    }
  };

  const refreshBalance = async (): Promise<void> => {
    try {
      const balanceData = await derivApiService.getBalance();
      setBalance(balanceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh balance';
      setError(errorMessage);
      console.error('❌ Failed to refresh balance:', err);
    }
  };

  const subscribeToBalanceInternal = async (): Promise<void> => {
    try {
      const subscription = await derivApiService.subscribeToBalance((data) => {
        setBalance(data);
      });
      setBalanceSubscription(subscription);
    } catch (err) {
      console.error('❌ Failed to subscribe to balance:', err);
    }
  };

  const subscribeToBalance = async (
    callback: (data: { balance: number; currency: string }) => void
  ): Promise<DerivSubscription | null> => {
    try {
      return await derivApiService.subscribeToBalance(callback);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to balance';
      setError(errorMessage);
      return null;
    }
  };

  const subscribeToTicks = async (
    symbol: string,
    callback: (data: any) => void
  ): Promise<DerivSubscription | null> => {
    try {
      return await derivApiService.subscribeToTicks(symbol, callback);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to ticks';
      setError(errorMessage);
      return null;
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const value: DerivApiContextType = {
    isConnected,
    isAuthorized,
    isLoading,
    accountInfo,
    balance,
    authorize,
    logout,
    refreshBalance,
    subscribeToBalance,
    subscribeToTicks,
    error,
    clearError,
  };

  return (
    <DerivApiContext.Provider value={value}>
      {children}
    </DerivApiContext.Provider>
  );
}

export function useDerivApi(): DerivApiContextType {
  const context = useContext(DerivApiContext);
  if (context === undefined) {
    throw new Error('useDerivApi must be used within a DerivApiProvider');
  }
  return context;
}

export default DerivApiContext;
