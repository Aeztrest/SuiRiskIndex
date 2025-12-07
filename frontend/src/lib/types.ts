// Pool types
export interface Pool {
  id: number;
  sui_pool_id: string;
  dex_name: string;
  token0: string;
  token1: string;
}

// Metrics types
export interface PoolMetrics {
  pool_id: number;
  tvl_usd: string;
  volume_24h: string;
  price_var_24h: number;
  il_risk: number;
  utilization: number;
  risk_score: number;
  captured_at: string;
}

export interface PoolSummaryMetric {
  tvl_usd: number;
  volume_24h: number;
  risk_score: number;
  captured_at: string;
}

export interface PoolSummary {
  id: number;
  sui_pool_id: string;
  pool_name?: string | null;
  dex_name: string;
  token0: string | null;
  token1: string | null;
  metric: PoolSummaryMetric | null;
}

export interface WalletGraphNode {
  id: string;
  volume: number;
  trades: number;
  risk: number; // 0-1
}

export interface WalletGraphEdge {
  source: string;
  target: string;
  volume: number;
  trades: number;
}

export interface WalletGraphResponse {
  pool_id: number;
  pool_name: string;
  nodes: WalletGraphNode[];
  edges: WalletGraphEdge[];
  meta: {
    total_volume: number;
    total_trades: number;
  };
}

// Risk Identity types
export interface MintPayloadRequest {
  address: string;
}

export interface MintPayloadResponse {
  package_id: string;
  module: string;
  function: string;
  args: string[];
  score: number;
  level: number;
  timestamp_ms: number;
}

export interface WalletRiskScoreResponse {
  address: string;
  score: number;
  level: number;
}

export interface IdentityHistoryEntry {
  score: number;
  level: string;
  timestamp_ms: number;
  tx_digest: string;
}

export interface StoreIdentityRequest {
  address: string;
  score: number;
  level: string;
  timestamp_ms: number;
  tx_digest: string;
}

// Sync response types
export interface SyncPoolsResponse {
  message: string;
  new_pools_count?: number;
}

export interface SyncMetricsResponse {
  message: string;
  updated_count?: number;
}

// Risk level enum
export enum RiskLevel {
  LOW = 'Low Risk',
  MEDIUM = 'Medium Risk',
  HIGH = 'High Risk',
}

// Risk level for NFT
export enum IdentityLevel {
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
}

// Helper functions
export function getRiskLevel(score: number): RiskLevel {
  if (score <= 33) return RiskLevel.LOW;
  if (score <= 66) return RiskLevel.MEDIUM;
  return RiskLevel.HIGH;
}

export function getIdentityLevel(score: number): IdentityLevel {
  if (score <= 33) return IdentityLevel.BRONZE;
  if (score <= 66) return IdentityLevel.SILVER;
  return IdentityLevel.GOLD;
}

export function getRiskColor(score: number): string {
  if (score <= 33) return 'text-green-600 bg-green-50 border-green-200';
  if (score <= 66) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

export function getIdentityColor(score: number): string {
  if (score <= 33) return 'text-amber-700 bg-amber-50 border-amber-300';
  if (score <= 66) return 'text-gray-700 bg-gray-100 border-gray-300';
  return 'text-yellow-600 bg-yellow-50 border-yellow-300';
}
