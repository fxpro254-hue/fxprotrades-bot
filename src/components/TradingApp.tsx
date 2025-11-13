'use client';

import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import { TradingProvider } from '../contexts/TradingContext';
import { EnhancedDashboard } from './EnhancedDashboard';

export function TradingApp() {
  return (
    <AuthProvider>
      <TradingProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <EnhancedDashboard />
        </div>
      </TradingProvider>
    </AuthProvider>
  );
}
