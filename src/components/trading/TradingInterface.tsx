'use client';

import React, { useState, useEffect } from 'react';
import { useTrading } from '../../contexts/TradingContext';
import { ContractParams, ContractType, DurationUnit } from '../../lib/types/deriv-types';
import { ContractProposal } from '../../services/ContractManager';

interface TradingInterfaceProps {
  className?: string;
}

export function TradingInterface({ className = '' }: TradingInterfaceProps) {
  const {
    state,
    selectSymbol,
    createProposal,
    buyContract,
    calculatePositionSize,
    validateTrade,
    addNotification
  } = useTrading();

  const [contractParams, setContractParams] = useState<ContractParams>({
    contract_type: 'CALL',
    symbol: '',
    amount: 10,
    duration: 5,
    duration_unit: 'm',
    basis: 'stake'
  });

  const [proposal, setProposal] = useState<ContractProposal | null>(null);
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  // Auto-select first symbol if none selected
  useEffect(() => {
    if (state.symbols.length > 0 && !state.selectedSymbol) {
      const firstSymbol = state.symbols[0].symbol;
      selectSymbol(firstSymbol);
      setContractParams(prev => ({ ...prev, symbol: firstSymbol }));
    }
  }, [state.symbols, state.selectedSymbol, selectSymbol]);

  // Update contract params when symbol changes
  useEffect(() => {
    if (state.selectedSymbol) {
      setContractParams(prev => ({ ...prev, symbol: state.selectedSymbol! }));
    }
  }, [state.selectedSymbol]);

  // Auto-create proposal when params change
  useEffect(() => {
    if (contractParams.symbol && contractParams.amount > 0) {
      const debounceTimer = setTimeout(() => {
        handleCreateProposal();
      }, 500);

      return () => clearTimeout(debounceTimer);
    }
  }, [contractParams]);

  const handleCreateProposal = async () => {
    if (!contractParams.symbol) return;

    try {
      setIsCreatingProposal(true);
      const newProposal = await createProposal(contractParams);
      setProposal(newProposal);
    } catch (error) {
      console.error('Failed to create proposal:', error);
      setProposal(null);
    } finally {
      setIsCreatingProposal(false);
    }
  };

  const handleBuyContract = async () => {
    if (!proposal) return;

    try {
      setIsBuying(true);
      
      // Validate trade first
      const validation = validateTrade(contractParams);
      if (!validation.isValid) {
        addNotification({
          type: 'error',
          title: 'Trade Validation Failed',
          message: validation.reason || 'Trade validation failed'
        });
        return;
      }

      await buyContract(proposal.id, proposal.askPrice, {
        symbol: contractParams.symbol,
        contractType: contractParams.contract_type,
        amount: contractParams.amount,
        duration: contractParams.duration,
        durationUnit: contractParams.duration_unit,
        barrier: contractParams.barrier,
        barrier2: contractParams.barrier2
      });

      // Reset proposal after successful purchase
      setProposal(null);
    } catch (error) {
      console.error('Failed to buy contract:', error);
    } finally {
      setIsBuying(false);
    }
  };

  const handleSymbolChange = (symbol: string) => {
    selectSymbol(symbol);
  };

  const handleParamChange = (key: keyof ContractParams, value: any) => {
    setContractParams(prev => ({ ...prev, [key]: value }));
  };

  const positionSize = calculatePositionSize(contractParams.amount);
  const currentTick = state.selectedSymbol ? state.tickData.get(state.selectedSymbol) : null;

  return (
    <div className={`trading-interface ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Trading Interface
        </h2>

        {/* Symbol Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Symbol
          </label>
          <select
            value={contractParams.symbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Select Symbol</option>
            {state.symbols.map((symbol) => (
              <option key={symbol.symbol} value={symbol.symbol}>
                {symbol.display_name} ({symbol.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Current Price */}
        {currentTick && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Price:
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {currentTick.quote.toFixed(5)}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Last updated: {new Date(currentTick.epoch * 1000).toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Contract Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contract Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleParamChange('contract_type', 'CALL')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                contractParams.contract_type === 'CALL'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              Higher (Call)
            </button>
            <button
              onClick={() => handleParamChange('contract_type', 'PUT')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                contractParams.contract_type === 'PUT'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
              }`}
            >
              Lower (Put)
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Stake Amount ($)
          </label>
          <input
            type="number"
            min="1"
            max="10000"
            step="1"
            value={contractParams.amount}
            onChange={(e) => handleParamChange('amount', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
          {positionSize && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Recommended: ${positionSize.recommendedAmount} | 
              Risk: {positionSize.riskPercentage.toFixed(2)}%
            </div>
          )}
        </div>

        {/* Duration */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duration
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={contractParams.duration}
              onChange={(e) => handleParamChange('duration', Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={contractParams.duration_unit}
              onChange={(e) => handleParamChange('duration_unit', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="m">Minutes</option>
              <option value="h">Hours</option>
              <option value="d">Days</option>
              <option value="t">Ticks</option>
            </select>
          </div>
        </div>

        {/* Barriers (for barrier options) */}
        {(contractParams.contract_type === 'UPORDOWN' || contractParams.contract_type === 'RANGE') && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Barrier
            </label>
            <input
              type="number"
              step="0.00001"
              value={contractParams.barrier || ''}
              onChange={(e) => handleParamChange('barrier', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter barrier level"
            />
          </div>
        )}

        {/* Proposal Display */}
        {proposal && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Contract Proposal
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Ask Price:</span>
                <div className="font-semibold text-gray-900 dark:text-white">
                  ${proposal.askPrice.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Potential Payout:</span>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  ${proposal.payout.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Potential Profit:</span>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  ${(proposal.payout - proposal.askPrice).toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Return:</span>
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  {(((proposal.payout - proposal.askPrice) / proposal.askPrice) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              {proposal.longcode}
            </div>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuyContract}
          disabled={!proposal || isBuying || isCreatingProposal || !state.isAuthenticated}
          className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors ${
            !proposal || isBuying || isCreatingProposal || !state.isAuthenticated
              ? 'bg-gray-400 cursor-not-allowed'
              : contractParams.contract_type === 'CALL'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {isBuying ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Buying Contract...
            </div>
          ) : isCreatingProposal ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Getting Quote...
            </div>
          ) : !state.isAuthenticated ? (
            'Please Login to Trade'
          ) : !proposal ? (
            'No Quote Available'
          ) : (
            `Buy ${contractParams.contract_type === 'CALL' ? 'Higher' : 'Lower'} - $${proposal.askPrice.toFixed(2)}`
          )}
        </button>

        {/* Account Info */}
        {state.isAuthenticated && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Account Balance:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ${state.accountBalance.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span className="text-gray-600 dark:text-gray-400">Active Positions:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {state.activeContracts.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
