/**
 * NASADataSourceManager.ts
 * Singleton service for fetching, caching, validating, and supplying NASA datasets and live Horizons ephemerides
 * to the mission studio and useMissionStore consumption.
 */

import { NASADataRegistry, type DatasetRecord } from './NASADataRegistry';

interface CacheEntry<T> {
  timestamp: number;
  data: T;
  stale: boolean;
}

export class NASADataSourceManager {
  private static instance: NASADataSourceManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache TTL

  private constructor() {}

  public static getInstance(): NASADataSourceManager {
    if (!NASADataSourceManager.instance) {
      NASADataSourceManager.instance = new NASADataSourceManager();
    }
    return NASADataSourceManager.instance;
  }

  /**
   * Get a dataset record from registry with caching and stale-data indicators
   */
  public getDatasetWithCache<T = any>(id: string): { record: DatasetRecord<T> | undefined; isStale: boolean; source: string } {
    const record = NASADataRegistry.getDataset(id) as DatasetRecord<T> | undefined;
    if (!record) {
      return { record: undefined, isStale: false, source: 'not-found' };
    }

    const cached = this.cache.get(id);
    const now = Date.now();

    if (cached) {
      const age = now - cached.timestamp;
      const isStale = age > this.CACHE_TTL_MS;
      return {
        record: { ...record, dataPayload: cached.data },
        isStale,
        source: isStale ? 'cached-stale' : 'cached-fresh',
      };
    }

    // Populate cache
    this.cache.set(id, {
      timestamp: now,
      data: record.dataPayload,
      stale: false,
    });

    return {
      record,
      isStale: false,
      source: 'registry-direct',
    };
  }

  /**
   * Fetch live JPL Horizons vector via backend proxy with fallback to registry baseline
   */
  public async fetchEphemerisData(destinationId: string): Promise<{ data: any; isLive: boolean; provenance: string }> {
    try {
      const url = typeof window !== 'undefined' ? `/api/nasa/horizons?destination=${encodeURIComponent(destinationId)}` : `http://localhost:3000/api/nasa/horizons?destination=${encodeURIComponent(destinationId)}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Horizons proxy responded with status ${res.status}`);
      }
      const json = await res.json();
      if (json.ok && json.vector) {
        return {
          data: json.vector,
          isLive: true,
          provenance: 'NASA JPL Horizons (Live API)',
        };
      }
    } catch (err) {
      // Quietly fall back to registry baseline in test or offline environments
    }

    // Fallback to registry baseline
    const baseReg = NASADataRegistry.getDataset('jpl-horizons-ephemeris-base');
    return {
      data: baseReg?.dataPayload ?? null,
      isLive: false,
      provenance: 'NASA JPL Horizons (Registry Baseline / Simulated Fallback)',
    };
  }

  /**
   * Hydrate mission planner data for a target destination (combining ephemeris, MOLA/CTX datasets, and provenance)
   */
  public async hydrateMissionPlanner(destinationId: string): Promise<{
    ephemeris: any;
    terrainDataset: DatasetRecord | undefined;
    provenance: string;
    isLive: boolean;
  }> {
    const ephResult = await this.fetchEphemerisData(destinationId);
    const terrainDataset = this.getDatasetWithCache('jpl-horizons-ephemeris-base').record;

    return {
      ephemeris: ephResult.data,
      terrainDataset,
      provenance: ephResult.provenance,
      isLive: ephResult.isLive,
    };
  }

  public invalidateCache(): void {
    this.cache.clear();
  }

  // Static backward-compatible proxies for existing static calls
  public static getDatasetWithCache<T = any>(id: string) {
    return NASADataSourceManager.getInstance().getDatasetWithCache<T>(id);
  }

  public static async fetchEphemerisData(destinationId: string) {
    return NASADataSourceManager.getInstance().fetchEphemerisData(destinationId);
  }

  public static async hydrateMissionPlanner(destinationId: string) {
    return NASADataSourceManager.getInstance().hydrateMissionPlanner(destinationId);
  }

  public static invalidateCache() {
    NASADataSourceManager.getInstance().invalidateCache();
  }
}
