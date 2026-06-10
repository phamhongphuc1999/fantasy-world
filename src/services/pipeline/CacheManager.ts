import { TGenerationConfig, TGenerationStages } from 'src/global';

// ─── Config ────────────────────────────────────────────────────────────────────

interface TCacheOptions {
  /** Maximum number of complete generation results cached */
  maxResults: number;
  /** Whether to enable stage-level caching (mesh → cache → reuse for same config) */
  enableStageCaching: boolean;
  /** Whether to enable fingerprint-based dedup (identical seeds skip regeneration) */
  enableDedup: boolean;
}

const DEFAULT_CACHE_OPTIONS: TCacheOptions = {
  maxResults: 5,
  enableStageCaching: true,
  enableDedup: true,
};

// ─── Cache Key ─────────────────────────────────────────────────────────────────

/**
 * Deterministic fingerprint of a TGenerationConfig.
 * Ensures that two identical configs always produce the same key.
 */
function hashConfig(config: TGenerationConfig): string {
  const parts: string[] = [
    config.seed,
    String(config.width),
    String(config.height),
    String(config.cellCount),
    String(config.seaLevel),
    config.topography,
    String(config.nationCount),
    String(config.climateControl.temperatureOffset.toFixed(6)),
    String(config.climateControl.temperatureContrast.toFixed(6)),
    String(config.climateControl.precipitationScale.toFixed(6)),
    String(config.climateControl.precipitationOffset.toFixed(6)),
    String(config.climateControl.humanImpact.toFixed(6)),
  ];
  return parts.join('|');
}

// ─── LRU Cache Entry ───────────────────────────────────────────────────────────

interface TCacheEntry {
  key: string;
  result: TGenerationStages;
  /** Timestamp of last access (for LRU eviction) */
  lastAccess: number;
}

// ─── CacheManager ──────────────────────────────────────────────────────────────

/**
 * Manages generation result cache with LRU eviction.
 *
 * Use cases:
 * - User tweaks display settings → same config → instant reuse
 * - User switches seeds back and forth → cached results
 * - Same stage across different configs → stage-level cache
 */
export class CacheManager {
  private readonly cache: Map<string, TCacheEntry>;
  private readonly options: TCacheOptions;

  constructor(options?: Partial<TCacheOptions>) {
    this.cache = new Map();
    this.options = { ...DEFAULT_CACHE_OPTIONS, ...options };
  }

  /**
   * Get cached result by config key.
   * Updates LRU timestamp on access.
   */
  get(config: TGenerationConfig): TGenerationStages | null {
    if (!this.options.enableStageCaching) return null;

    const key = hashConfig(config);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // touch LRU
    entry.lastAccess = Date.now();
    return entry.result;
  }

  /**
   * Store a generation result in cache.
   * Evicts oldest entry if at capacity.
   */
  set(config: TGenerationConfig, result: TGenerationStages): void {
    if (!this.options.enableStageCaching) return;

    const key = hashConfig(config);

    // Already cached — just update
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.result = result;
      entry.lastAccess = Date.now();
      return;
    }

    // Evict LRU if full
    if (this.cache.size >= this.options.maxResults) {
      let oldestKey: string | null = null;
      let oldestTimestamp = Infinity;

      for (const [entryKey, entry] of this.cache) {
        if (entry.lastAccess < oldestTimestamp) {
          oldestTimestamp = entry.lastAccess;
          oldestKey = entryKey;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      key,
      result,
      lastAccess: Date.now(),
    });
  }

  /**
   * Check if a specific config is cached.
   */
  has(config: TGenerationConfig): boolean {
    if (!this.options.enableStageCaching) return false;
    return this.cache.has(hashConfig(config));
  }

  /**
   * Clear all cached results.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Number of cached entries.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Return cache statistics for debugging.
   */
  stats(): { size: number; maxResults: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxResults: this.options.maxResults,
      keys: Array.from(this.cache.keys()),
    };
  }
}
