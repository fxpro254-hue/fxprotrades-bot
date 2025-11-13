'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { getOAuthURL, handleOAuthCallback, getStoredAuth, logout } from '../lib/deriv-api';

// State Interface
interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  account: string | null;
  isLoading: boolean;
  error: string | null;
  skipLogin: boolean;
}

// Action Types
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_AUTHENTICATED'; payload: { token: string; account: string } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_SKIP_LOGIN'; payload: boolean };

// Initial State
const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  account: null,
  isLoading: false,
  error: null,
  skipLogin: false
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: true,
        token: action.payload.token,
        account: action.payload.account,
        error: null,
        isLoading: false
      };
    
    case 'SET_UNAUTHENTICATED':
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        account: null,
        error: null,
        isLoading: false
      };
    
    case 'SET_SKIP_LOGIN':
      return { ...state, skipLogin: action.payload };
    
    default:
      return state;
  }
}

// Context Interface
interface AuthContextType {
  state: AuthState;
  login: () => void;
  loginWithToken: (token: string) => void;
  logout: () => void;
  setSkipLogin: (skip: boolean) => void;
  clearError: () => void;
}

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored authentication on mount
  useEffect(() => {
    const checkStoredAuth = () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        // Check if user wants to skip login
        const skipLogin = localStorage.getItem('skip_login') === 'true';
        if (skipLogin) {
          dispatch({ type: 'SET_SKIP_LOGIN', payload: true });
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Check for stored credentials
        const storedAuth = getStoredAuth();
        if (storedAuth) {
          dispatch({
            type: 'SET_AUTHENTICATED',
            payload: {
              token: storedAuth.token,
              account: storedAuth.account
            }
          });
        } else {
          // Check for OAuth callback
          const callbackResult = handleOAuthCallback();
          if (callbackResult) {
            dispatch({
              type: 'SET_AUTHENTICATED',
              payload: {
                token: callbackResult.token,
                account: callbackResult.account
              }
            });
            
            // Clean up URL parameters
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('token1');
              url.searchParams.delete('acct1');
              window.history.replaceState({}, document.title, url.toString());
            }
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }
      } catch (error) {
        dispatch({
          type: 'SET_ERROR',
          payload: `Authentication check failed: ${(error as Error).message}`
        });
      }
    };

    checkStoredAuth();
  }, []);

  // Context Methods
  const login = (): void => {
    try {
      const oauthURL = getOAuthURL();
      if (typeof window !== 'undefined') {
        window.location.href = oauthURL;
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Login failed: ${(error as Error).message}`
      });
    }
  };

  const loginWithToken = (token: string): void => {
    try {
      if (!token || token.trim() === '') {
        throw new Error('Token is required');
      }

      // Store token temporarily (account will be determined after API call)
      localStorage.setItem('deriv_token', token);
      
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: {
          token,
          account: 'pending' // Will be updated after authentication
        }
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Token login failed: ${(error as Error).message}`
      });
    }
  };

  const logoutUser = (): void => {
    try {
      logout(); // Clear localStorage
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: `Logout failed: ${(error as Error).message}`
      });
    }
  };

  const setSkipLogin = (skip: boolean): void => {
    localStorage.setItem('skip_login', skip.toString());
    dispatch({ type: 'SET_SKIP_LOGIN', payload: skip });
    
    if (skip) {
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  };

  const clearError = (): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  };

  const contextValue: AuthContextType = {
    state,
    login,
    loginWithToken,
    logout: logoutUser,
    setSkipLogin,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
