import { buildGeopolitics } from 'src/services/geopolitics';
import { buildPopulation } from 'src/services/geopolitics/population';
import { buildHydrology } from 'src/services/hydrology';
import { buildTopography } from 'src/services/terrain/buildTopography';
import { buildMesh } from 'src/services/terrain/mesh';
import { TDelaunayMesh, TGenerationConfig, TGenerationStages } from 'src/types/map.types';
import { CacheManager } from './CacheManager';

// ─── Shared cache instance ─────────────────────────────────────────────────────
// Using module-level singleton so all MapGenerator instances share the same cache.
let globalCache: CacheManager | null = null;

function getCache(): CacheManager {
  if (!globalCache) {
    globalCache = new CacheManager({ maxResults: 5 });
  }
  return globalCache;
}

// ─── Fast path for common cheap stages ─────────────────────────────────────────
// Keeps a reference to the last-generated mesh to avoid full mesh regen
// when only display settings change (same config reuses everything).
let lastMeshResult: { key: string; mesh: TDelaunayMesh } | null = null;

export { CacheManager };

export function clearGenerationCache(): void {
  getCache().clear();
  lastMeshResult = null;
}

export class MapGenerator {
  private readonly config: TGenerationConfig;
  /** If true, always re-generate (bypass cache). Useful for debugging. */
  private readonly forceRefresh: boolean;

  constructor(config: TGenerationConfig, forceRefresh = false) {
    this.config = config;
    this.forceRefresh = forceRefresh;
  }

  /**
   * Generate all stages of the map.
   *
   * With caching enabled:
   * - Identical config → instant return from cache
   * - Same config (new instance) → instant return from cache
   */
  generate(): TGenerationStages {
    const cache = getCache();

    // 1. Check full-result cache
    if (!this.forceRefresh) {
      const cached = cache.get(this.config);
      if (cached) return cached;
    }

    // 2. Generate pipeline
    const {
      width,
      height,
      seed,
      cellCount,
      seaLevel,
      topography: topographyPreset,
      climateControl,
      nationCount,
    } = this.config;

    const configKey = [seed, width, height, cellCount].join('|');

    // Mesh stage — can skip if mesh key matches (seed+dimensions same ⇒ mesh same)
    let mesh: TDelaunayMesh;
    if (!this.forceRefresh && lastMeshResult !== null && lastMeshResult.key === configKey) {
      mesh = lastMeshResult.mesh;
    } else {
      const newMesh = buildMesh({ width, height, seed, cellCount });
      mesh = newMesh;
      lastMeshResult = { key: configKey, mesh: newMesh };
    }

    // 3. Run stages sequentially
    const topography = buildTopography({ mesh, seed, seaLevel, topography: topographyPreset });
    const hydrology = buildHydrology({ mesh: topography, seaLevel, seed, climateControl });
    const population = buildPopulation({ mesh: hydrology, seed });
    const geopolitics = buildGeopolitics({ mesh: population, seed, nationCount });

    const result: TGenerationStages = {
      mesh,
      topography,
      hydrology,
      population,
      geopolitics,
    };

    // 4. Store in cache
    cache.set(this.config, result);

    return result;
  }

  /**
   * Get the generation config.
   */
  getConfig(): TGenerationConfig {
    return this.config;
  }

  /**
   * Pre-generate multiple configs and cache them.
   * Useful for prefetching seeds for the UI (e.g. gallery thumbnails).
   */
  static prefetchConfigs(configs: TGenerationConfig[]): void {
    for (const config of configs) {
      const generator = new MapGenerator(config);
      generator.generate();
    }
  }

  /**
   * Generate only up to a specific stage (lazy evaluation).
   * Returns the full generation result but stages after `stageIndex` may
   * contain stale/empty data from the previous stage.
   *
   * stageIndex:
   *   0 = mesh only
   *   1 = mesh + topography
   *   2 = mesh + topography + hydrology
   *   3 = mesh + topography + hydrology + population
   *   4 = all
   */
  generateUpTo(): TGenerationStages {
    const full = this.generate();
    // Return the full result — the caller can choose to ignore later stages.
    // This is a placeholder for a true lazy-evaluation implementation.
    return full;
  }
}
