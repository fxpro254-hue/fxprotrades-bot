'use client';

import React, { useState } from 'react';
import { useTrading } from '../../contexts/TradingContext';
import { Contract } from '../../services/ContractManager';

interface PortfolioProps {
  className?: string;
}

export function Portfolio({ className = '' }: PortfolioProps) {
  const { state, sellContract } = useTrading();
  const [sellLoading, setSellLoading] = useState<string | null>(null);

  const handleSellContract = async (contractId: string) => {
    try {
      setSellLoading(contractId);
      await sellContract(contractId);
    } catch (error) {
      console.error('Failed to sell contract:', error);
    } finally {
      setSellLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'active':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'won':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'lost':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'sold':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getProfitColor = (profit?: number) => {
    if (profit === undefined) return 'text-gray-600 dark:text-gray-400';
    return profit >= 0 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const totalPnL = state.activeContracts.reduce((sum, contract) => sum + (contract.profit || 0), 0);
  const totalInvestment = state.activeContracts.reduce((sum, contract) => sum + contract.amount, 0);

  return (
    <div className={`portfolio ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Portfolio
          </h2>
          <div className="text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total P&L
            </div>
            <div className={`text-lg font-bold ${getProfitColor(totalPnL)}`}>
              {formatCurrency(totalPnL)}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Active Positions
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {state.activeContracts.length}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Total Investment
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalInvestment)}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Return %
            </div>
            <div className={`text-2xl font-bold ${getProfitColor(totalPnL)}`}>
              {totalInvestment > 0 ? ((totalPnL / totalInvestment) * 100).toFixed(2) : '0.00'}%
            </div>
          </div>
        </div>

        {/* Contracts Table */}
        {state.activeContracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
              No active positions
            </div>
            <div className="text-gray-400 dark:text-gray-500 text-sm">
              Start trading to see your positions here
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600">
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Symbol
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Type
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Current Price
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    P&L
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Status
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Purchase Time
                  </th>
                  <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.activeContracts.map((contract) => (
                  <tr 
                    key={contract.id} 
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-2">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {contract.symbol}
                      </div>
                    </td>
                    
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        contract.contractType === 'CALL' 
                          ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
                          : 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
                      }`}>
                        {contract.contractType === 'CALL' ? 'Higher' : 'Lower'}
                      </span>
                    </td>
                    
                    <td className="py-3 px-2 text-gray-900 dark:text-white">
                      {formatCurrency(contract.amount)}
                    </td>
                    
                    <td className="py-3 px-2 text-gray-900 dark:text-white">
                      {contract.currentPrice ? formatCurrency(contract.currentPrice) : '-'}
                    </td>
                    
                    <td className="py-3 px-2">
                      <div className={getProfitColor(contract.profit)}>
                        {contract.profit !== undefined ? formatCurrency(contract.profit) : '-'}
                      </div>
                      {contract.profitPercentage !== undefined && (
                        <div className={`text-xs ${getProfitColor(contract.profit)}`}>
                          {contract.profitPercentage.toFixed(2)}%
                        </div>
                      )}
                    </td>
                    
                    <td className="py-3 px-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </span>
                    </td>
                    
                    <td className="py-3 px-2 text-sm text-gray-600 dark:text-gray-400">
                      {contract.purchaseTime ? formatDateTime(contract.purchaseTime) : '-'}
                    </td>
                    
                    <td className="py-3 px-2">
                      {contract.status === 'active' && (
                        <button
                          onClick={() => handleSellContract(contract.id)}
                          disabled={sellLoading === contract.id}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sellLoading === contract.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                              Selling...
                            </>
                          ) : (
                            'Sell'
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Performance Summary */}
        {state.activeContracts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Performance Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Winning Positions</div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {state.activeContracts.filter(c => (c.profit || 0) > 0).length}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Losing Positions</div>
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {state.activeContracts.filter(c => (c.profit || 0) < 0).length}
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Best Performer</div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {Math.max(...state.activeContracts.map(c => c.profit || 0)) > 0 
                    ? formatCurrency(Math.max(...state.activeContracts.map(c => c.profit || 0)))
                    : '-'
                  }
                </div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Worst Performer</div>
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {Math.min(...state.activeContracts.map(c => c.profit || 0)) < 0 
                    ? formatCurrency(Math.min(...state.activeContracts.map(c => c.profit || 0)))
                    : '-'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
