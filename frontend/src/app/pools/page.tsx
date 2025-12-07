'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Pool, PoolMetrics } from '@/lib/types';
import { truncateAddress, formatCurrency } from '@/lib/utils';
import RiskBadge from '@/components/RiskBadge';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorAlert from '@/components/ErrorAlert';
import SuccessAlert from '@/components/SuccessAlert';
import { PoolsBubbleMap } from '@/components/PoolsBubbleMap';
import { WalletTradeBubbleMap } from '@/components/WalletTradeBubbleMap';

interface PoolWithMetrics extends Pool {
  metrics?: PoolMetrics;
  metricsLoading?: boolean;
}

export default function PoolsPage() {
  const [pools, setPools] = useState<PoolWithMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);

  const selectedPool = selectedPoolId ? pools.find((p) => p.id === selectedPoolId) ?? null : null;

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    try {
      setLoading(true);
      setError(null);
      const poolsData = await apiClient.getPools();
      setPools(poolsData.map(pool => ({ ...pool, metricsLoading: true })));
      
      // Load metrics for each pool
      const poolsWithMetrics = await Promise.all(
        poolsData.map(async (pool) => {
          try {
            const metrics = await apiClient.getPoolMetrics(pool.id);
            return { ...pool, metrics, metricsLoading: false };
          } catch {
            return { ...pool, metrics: undefined, metricsLoading: false };
          }
        })
      );
      
      setPools(poolsWithMetrics);
      if (!selectedPoolId && poolsWithMetrics.length > 0) {
        setSelectedPoolId(poolsWithMetrics[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pools');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPools = async () => {
    try {
      setError(null);
      await apiClient.syncPoolsFromDeepbook();
      setSuccessMessage('Pools synced successfully from Deepbook!');
      await loadPools();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync pools');
    }
  };

  const handleSyncAllMetrics = async () => {
    try {
      setError(null);
      await apiClient.syncAllMetrics();
      setSuccessMessage('All metrics synced successfully!');
      await loadPools();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync metrics');
    }
  };

  const handleSyncPoolMetrics = async (poolId: number) => {
    try {
      setError(null);
      setPools(pools.map(p => 
        p.id === poolId ? { ...p, metricsLoading: true } : p
      ));
      
      await apiClient.syncPoolMetrics(poolId);
      const metrics = await apiClient.getPoolMetrics(poolId);
      
      setPools(pools.map(p => 
        p.id === poolId ? { ...p, metrics, metricsLoading: false } : p
      ));
      
      setSuccessMessage(`Metrics synced for pool ${poolId}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync pool metrics');
      setPools(pools.map(p => 
        p.id === poolId ? { ...p, metricsLoading: false } : p
      ));
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <LoadingSpinner message="Loading pools..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Liquidity Pools</h1>
        <p className="text-gray-600">
          Monitor risk scores and metrics for Deepbook liquidity pools
        </p>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {successMessage && <SuccessAlert message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

      {/* Bubble map visualization */}
      <section className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Liquidity Pools Bubble Map</h2>
        <p className="text-sm text-gray-600 mb-4">
          Each bubble represents a pool. Size = TVL, color = risk score (green → yellow → red).
        </p>
        <PoolsBubbleMap />
      </section>

      {/* Toolbar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 flex flex-wrap gap-3">
        <Button onClick={handleSyncPools} variant="primary">
          Sync Pools from Deepbook
        </Button>
        <Button onClick={handleSyncAllMetrics} variant="secondary">
          Sync All Metrics
        </Button>
        <div className="ml-auto text-sm text-gray-600 flex items-center">
          {pools.length} pool{pools.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {pools.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-4">No pools found. Try syncing from Deepbook.</p>
          <Button onClick={handleSyncPools} variant="primary">
            Sync Pools
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pool ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pair
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DEX
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TVL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    24h Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pools.map((pool) => (
                  <tr
                    key={pool.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedPoolId === pool.id ? 'bg-blue-50/40' : ''}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('a')) return;
                      setSelectedPoolId(pool.id);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/pools/${pool.id}`}
                        className="text-sm font-mono text-blue-600 hover:text-blue-800"
                      >
                        {truncateAddress(pool.sui_pool_id)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {pool.token0} / {pool.token1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {pool.dex_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {pool.metricsLoading ? (
                        <span className="text-sm text-gray-400">Loading...</span>
                      ) : pool.metrics ? (
                        <RiskBadge score={pool.metrics.risk_score} size="sm" />
                      ) : (
                        <span className="text-sm text-gray-400">No metrics</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pool.metrics ? formatCurrency(pool.metrics.tvl_usd) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pool.metrics ? formatCurrency(pool.metrics.volume_24h) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!pool.metrics && !pool.metricsLoading && (
                        <Button
                          onClick={() => handleSyncPoolMetrics(pool.id)}
                          variant="secondary"
                          size="sm"
                        >
                          Sync
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            {pools.map((pool) => (
              <Link
                key={pool.id}
                href={`/pools/${pool.id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-medium text-gray-900 mb-1">
                      {pool.token0} / {pool.token1}
                    </div>
                    <div className="text-xs font-mono text-gray-500">
                      {truncateAddress(pool.sui_pool_id)}
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {pool.dex_name}
                  </span>
                </div>
                
                {pool.metrics && (
                  <div className="space-y-2">
                    <RiskBadge score={pool.metrics.risk_score} size="sm" />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVL:</span>
                      <span className="font-medium">{formatCurrency(pool.metrics.tvl_usd)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">24h Volume:</span>
                      <span className="font-medium">{formatCurrency(pool.metrics.volume_24h)}</span>
                    </div>
                  </div>
                )}
                
                {!pool.metrics && !pool.metricsLoading && (
                  <div className="mt-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleSyncPoolMetrics(pool.id);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Sync metrics for this pool →
                    </button>
                  </div>
                )}

                <div className="mt-3">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedPoolId(pool.id);
                    }}
                    className="text-sm text-gray-700 hover:text-gray-900 underline"
                  >
                    View wallet graph for this pool
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {selectedPoolId && (
        <section className="bg-white border border-gray-200 rounded-lg p-6 mt-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Pool Wallet Graph</h2>
              <p className="text-sm text-gray-600">Maker/taker interaction graph built from Surflux recent trades.</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <label htmlFor="pool-select" className="sr-only">Select pool</label>
              <select
                id="pool-select"
                value={selectedPoolId}
                onChange={(e) => setSelectedPoolId(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.token0} / {p.token1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedPool ? (
            <div className="space-y-2 mb-4 text-sm text-gray-700">
              <div className="font-medium">{selectedPool.token0} / {selectedPool.token1}</div>
              <div className="text-xs text-gray-500">Pool ID: {truncateAddress(selectedPool.sui_pool_id)}</div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">Select a pool to see its wallet interaction graph.</p>
          )}

          <WalletTradeBubbleMap poolId={selectedPoolId} />
        </section>
      )}
    </div>
  );
}
