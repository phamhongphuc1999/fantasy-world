/* eslint-disable no-console */
import { performance } from 'node:perf_hooks';
import { DEFAULT_CONFIG, MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { buildGeopolitics } from 'src/services/map/buildGeopolitics';
import { buildHydrologyProfiled } from 'src/services/map/buildHydrology';
import { buildMesh } from 'src/services/map/buildMesh';
import { buildPopulation } from 'src/services/map/buildPopulation';
import { buildTopography } from 'src/services/map/buildTopography';
import type { THydrologyProfile } from 'src/types/map.types';

const config = {
  width: MAP_VIEWPORT_CONFIG.width,
  height: MAP_VIEWPORT_CONFIG.height,
  seed: DEFAULT_CONFIG.seed,
  cellCount: DEFAULT_CONFIG.cellCount,
  seaLevel: DEFAULT_CONFIG.seaLevel,
  terrainPreset: DEFAULT_CONFIG.terrainPreset,
  terrainRatios: DEFAULT_CONFIG.terrainRatios,
  nationCount: DEFAULT_CONFIG.nationCount,
};

function timePhase<T>(name: string, run: () => T) {
  const start = performance.now();
  const result = run();
  const end = performance.now();
  return { name, durationMs: end - start, result };
}

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const rank = (sorted.length - 1) * p;
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return sorted[low] as number;
  const lowValue = sorted[low] as number;
  const highValue = sorted[high] as number;
  const factor = rank - low;
  return lowValue + (highValue - lowValue) * factor;
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

const iterations = Number.parseInt(process.argv[2] || '8', 10);
const rounds = Number.isFinite(iterations) && iterations > 0 ? iterations : 8;

const durationsByPhase = new Map<string, number[]>();
const hydrologyProfiles: THydrologyProfile[] = [];

for (let round = 0; round < rounds; round += 1) {
  const meshPhase = timePhase('buildMesh', () =>
    buildMesh({
      width: config.width,
      height: config.height,
      seed: config.seed,
      cellCount: config.cellCount,
    })
  );
  const topographyPhase = timePhase('buildTopography', () =>
    buildTopography({
      mesh: meshPhase.result,
      seed: config.seed,
      seaLevel: config.seaLevel,
      terrainPreset: config.terrainPreset,
    })
  );
  const hydrologyProfiled = buildHydrologyProfiled({
    mesh: topographyPhase.result,
    seaLevel: config.seaLevel,
    terrainRatios: config.terrainRatios,
  });
  const hydrologyDuration = hydrologyProfiled.profile.totalMs;
  const populationPhase = timePhase('buildPopulation', () =>
    buildPopulation({
      mesh: hydrologyProfiled.mesh,
      seed: config.seed,
    })
  );
  const geopoliticsPhase = timePhase('buildGeopolitics', () =>
    buildGeopolitics({
      mesh: populationPhase.result,
      seed: config.seed,
      nationCount: config.nationCount,
    })
  );

  const phaseDurations = [
    { name: 'buildMesh', durationMs: meshPhase.durationMs },
    { name: 'buildTopography', durationMs: topographyPhase.durationMs },
    { name: 'buildHydrology', durationMs: hydrologyDuration },
    { name: 'buildPopulation', durationMs: populationPhase.durationMs },
    { name: 'buildGeopolitics', durationMs: geopoliticsPhase.durationMs },
  ];
  const total = phaseDurations.reduce((sum, phase) => sum + phase.durationMs, 0);
  phaseDurations.push({ name: 'total', durationMs: total });

  for (const phase of phaseDurations) {
    const list = durationsByPhase.get(phase.name) || [];
    list.push(phase.durationMs);
    durationsByPhase.set(phase.name, list);
  }
  hydrologyProfiles.push(hydrologyProfiled.profile);
}

const phaseOrder = [
  'buildMesh',
  'buildTopography',
  'buildHydrology',
  'buildPopulation',
  'buildGeopolitics',
  'total',
];

console.log('Map generation benchmark');
console.log(
  `seed=${config.seed}, cells=${config.cellCount}, viewport=${config.width}x${config.height}, seaLevel=${config.seaLevel}, rounds=${rounds}`
);
for (const phaseName of phaseOrder) {
  const values = durationsByPhase.get(phaseName) || [];
  const med = median(values);
  const p95 = percentile(values, 0.95);
  console.log(`${phaseName.padEnd(16)} median=${med.toFixed(2)} ms  p95=${p95.toFixed(2)} ms`);
}

const hydrologyKeys: Array<keyof THydrologyProfile> = [
  'initAndDownstreamMs',
  'flowAccumulationMs',
  'erosionAndAdjustMs',
  'climateAndTerrainMs',
  'lakesAndEnclosedWaterMs',
  'riversMs',
  'terrainPostProcessMs',
  'finalizeBiomeMs',
];

console.log('\nHydrology sub-phase profile');
for (const key of hydrologyKeys) {
  const values = hydrologyProfiles.map((profile) => profile[key]);
  console.log(
    `${String(key).padEnd(26)} median=${median(values).toFixed(2)} ms  p95=${percentile(values, 0.95).toFixed(2)} ms`
  );
}
