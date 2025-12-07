import { API_BASE_URL } from './config';
import type {
  Pool,
  PoolMetrics,
  MintPayloadRequest,
  MintPayloadResponse,
  SyncPoolsResponse,
  SyncMetricsResponse,
  StoreIdentityRequest,
  IdentityHistoryEntry,
  WalletRiskScoreResponse,
} from './types';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  // Health check
  async healthCheck(): Promise<{ message: string }> {
    return this.request('/');
  }

  // Pool endpoints
  async getPools(): Promise<Pool[]> {
    return this.request('/pools');
  }

  async getPoolMetrics(poolId: number): Promise<PoolMetrics> {
    return this.request(`/pools/${poolId}/metrics/latest`);
  }

  // Sync endpoints
  async syncPoolsFromDeepbook(): Promise<SyncPoolsResponse> {
    return this.request('/sync/deepbook/pools', {
      method: 'POST',
    });
  }

  async syncAllMetrics(): Promise<SyncMetricsResponse> {
    return this.request('/sync/deepbook/metrics', {
      method: 'POST',
    });
  }

  async syncPoolMetrics(poolId: number): Promise<SyncMetricsResponse> {
    return this.request(`/sync/deepbook/metrics/${poolId}`, {
      method: 'POST',
    });
  }

  // Risk endpoints
  async getRiskLevelFromScore(score: number): Promise<{ level: number; level_name: string }> {
    return this.request(`/risk/level-from-score?score=${score}`);
  }

  async getMintPayload(request: MintPayloadRequest): Promise<MintPayloadResponse> {
    return this.request('/risk/identity/mint-payload', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getWalletRiskScore(address: string): Promise<WalletRiskScoreResponse> {
    return this.request(`/risk/identity/wallet-score/${address}`);
  }

  async storeIdentity(request: StoreIdentityRequest): Promise<{ status: string }> {
    return this.request('/risk/identity/store', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getIdentityHistory(address: string): Promise<IdentityHistoryEntry[]> {
    return this.request(`/risk/identity/history/${address}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);
