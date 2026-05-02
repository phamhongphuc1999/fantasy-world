import { performance } from 'node:perf_hooks';

import { DEFAULT_CONFIG, MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { buildGeopolitics } from 'src/services/map/buildGeopolitics';
import { buildHydrology } from 'src/services/map/buildHydrology';
import { buildMesh } from 'src/services/map/buildMesh';
import { buildPopulation } from 'src/services/map/buildPopulation';
import { buildTopography } from 'src/services/map/buildTopography';

const config = {
  width: MAP_VIEWPORT_CONFIG.width,
  height: MAP_VIEWPORT_CONFIG.height,
  seed: DEFAULT_CONFIG.seed,
  cellCount: DEFAULT_CONFIG.cellCount,
  seaLevel: DEFAULT_CONFIG.seaLevel,
  terrainPreset: DEFAULT_CONFIG.terrainPreset,
  terrainRatios: DEFAULT_CONFIG.terrainRatios,
  nationMode: DEFAULT_CONFIG.nationMode,
  nationCount: DEFAULT_CONFIG.nationCount,
};

function timePhase<T>(name: string, run: () => T) {
  const start = performance.now();
  const result = run();
  const end = performance.now();
  return { name, durationMs: end - start, result };
}

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
const hydrologyPhase = timePhase('buildHydrology', () =>
  buildHydrology({
    mesh: topographyPhase.result,
    seaLevel: config.seaLevel,
    terrainRatios: config.terrainRatios,
  })
);
const populationPhase = timePhase('buildPopulation', () =>
  buildPopulation({
    mesh: hydrologyPhase.result,
    seed: config.seed,
  })
);
const geopoliticsPhase = timePhase('buildGeopolitics', () =>
  buildGeopolitics({
    mesh: populationPhase.result,
    seed: config.seed,
    nationMode: config.nationMode,
    nationCount: config.nationCount,
  })
);

const phases = [meshPhase, topographyPhase, hydrologyPhase, populationPhase, geopoliticsPhase];
const total = phases.reduce((sum, phase) => sum + phase.durationMs, 0);

console.log('Map generation benchmark');
console.log(
  `seed=${config.seed}, cells=${config.cellCount}, viewport=${config.width}x${config.height}, seaLevel=${config.seaLevel}`
);
for (const phase of phases) {
  console.log(`${phase.name.padEnd(16)} ${phase.durationMs.toFixed(2)} ms`);
}
console.log(`${'total'.padEnd(16)} ${total.toFixed(2)} ms`);

