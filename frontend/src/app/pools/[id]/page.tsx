'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Pool, PoolMetrics } from '@/lib/types';
import { truncateAddress, formatCurrency, formatPercentage, formatRelativeTime } from '@/lib/utils';
import RiskBadge from '@/components/RiskBadge';
import IdentityBadge from '@/components/IdentityBadge';
import Button from '@/components/Button';
import MetricCard from '@/components/MetricCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import SuccessAlert from '@/components/SuccessAlert';

export default function PoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = parseInt(params.id as string);

  const [pool, setPool] = useState<Pool | null>(null);
  const [metrics, setMetrics] = useState<PoolMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPoolData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId]);

  const loadPoolData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all pools to find this one
      const pools = await apiClient.getPools();
      const foundPool = pools.find(p => p.id === poolId);

      if (!foundPool) {
        setError('Pool not found');
        setLoading(false);
        return;
      }

      setPool(foundPool);

      // Try to get metrics
      try {
        const metricsData = await apiClient.getPoolMetrics(poolId);
        setMetrics(metricsData);
      } catch {
        setMetrics(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pool data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshMetrics = async () => {
    try {
      setError(null);
      await apiClient.syncPoolMetrics(poolId);
      const metricsData = await apiClient.getPoolMetrics(poolId);
      setMetrics(metricsData);
      setSuccessMessage('Metrics refreshed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metrics');
    }
  };

  const handleCopyAddress = () => {
    if (pool) {
      navigator.clipboard.writeText(pool.sui_pool_id);
      setSuccessMessage('Pool address copied to clipboard!');
      setTimeout(() => setSuccessMessage(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <LoadingSpinner message="Loading pool details..." />
      </div>
    );
  }

  if (error || !pool) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorAlert message={error || 'Pool not found'} />
        <Button onClick={() => router.push('/pools')} variant="secondary">
          ← Back to Pools
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push('/pools')}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center text-sm"
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Pools
        </button>
        
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {pool.token0} / {pool.token1}
            </h1>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded">
                {pool.dex_name}
              </span>
            </div>
          </div>
          
          {metrics && (
            <Button onClick={handleRefreshMetrics} variant="secondary">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Metrics
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      {/* Pool ID Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">Pool Address</p>
            <p className="text-sm font-mono text-gray-900 break-all">{pool.sui_pool_id}</p>
          </div>
          <button
            onClick={handleCopyAddress}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy address"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {!metrics ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-4">No metrics available for this pool yet.</p>
          <Button onClick={handleRefreshMetrics} variant="primary">
            Sync Metrics
          </Button>
        </div>
      ) : (
        <>
          {/* Risk Score Section */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Risk Score</h2>
                <div className="flex items-center gap-4">
                  <span className="text-5xl font-bold text-gray-900">{metrics.risk_score}</span>
                  <span className="text-2xl text-gray-400">/ 100</span>
                </div>
                <div className="mt-4">
                  <RiskBadge score={metrics.risk_score} size="lg" showScore={false} />
                </div>
              </div>
              
              <div className="border-l border-gray-300 pl-6">
                <p className="text-sm text-gray-600 mb-2">Identity Level</p>
                <IdentityBadge score={metrics.risk_score} size="lg" />
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <MetricCard
              title="Total Value Locked"
              value={formatCurrency(metrics.tvl_usd)}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            
            <MetricCard
              title="24h Volume"
              value={formatCurrency(metrics.volume_24h)}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              }
            />
            
            <MetricCard
              title="Price Volatility (24h)"
              value={formatPercentage(metrics.price_var_24h)}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              }
            />
            
            <MetricCard
              title="Impermanent Loss Risk"
              value={formatPercentage(metrics.il_risk)}
              subtitle="Proxy estimation"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              }
            />
            
            <MetricCard
              title="Utilization"
              value={formatPercentage(metrics.utilization)}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />
            
            <MetricCard
              title="Last Updated"
              value={formatRelativeTime(metrics.captured_at)}
              subtitle={new Date(metrics.captured_at).toLocaleString()}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>

          {/* Explanation Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              How Risk Score is Calculated
            </h3>
            <div className="prose prose-sm text-gray-600">
              <p className="mb-3">
                Our risk scoring system analyzes multiple metrics from Deepbook liquidity pools 
                through the Surflux API to generate a normalized 0-100 risk score:
              </p>
              <ul className="space-y-2 mb-3">
                <li>
                  <strong>Spread Analysis:</strong> We measure the bid-ask spread to assess 
                  liquidity depth and trading efficiency.
                </li>
                <li>
                  <strong>Price Volatility:</strong> 24-hour price variance indicates market 
                  stability and potential for sudden moves.
                </li>
                <li>
                  <strong>TVL & Volume:</strong> Higher liquidity and trading volume generally 
                  correlate with lower risk.
                </li>
                <li>
                  <strong>Impermanent Loss Risk:</strong> Proxy calculation based on price 
                  correlation and volatility between paired assets.
                </li>
                <li>
                  <strong>Utilization Rate:</strong> Measures how actively the pool&apos;s liquidity 
                  is being used.
                </li>
              </ul>
              <p>
                This score can be used by DeFi protocols to implement risk-based guards, 
                lending limits, or dynamic fee structures. Users can mint a Risk Identity NFT 
                that encodes their risk profile on-chain for protocol composability.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
