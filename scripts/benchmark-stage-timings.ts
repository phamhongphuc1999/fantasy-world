import { DEFAULT_CONFIG } from 'src/configs/map/common';
import { MapGenerator } from 'src/services/pipeline/MapGenerator';

type TStage = 'mesh' | 'topography' | 'hydrology' | 'population' | 'geopolitics';

function measureMs<T>(fn: () => T): { ms: number; value: T } {
  const start = performance.now();
  const value = fn();
  return { ms: performance.now() - start, value };
}

function runStageTimed(
  generator: MapGenerator,
  stage: TStage,
  input?: unknown
): { ms: number; output: unknown } {
  const stageFnName = `build${stage[0].toUpperCase()}${stage.slice(1)}`;
  const stageFn = (generator as unknown as Record<string, (arg?: unknown) => unknown>)[stageFnName];
  if (typeof stageFn !== 'function') {
    throw new Error(`Missing stage function: ${stageFnName}`);
  }
  const { ms, value } = measureMs(() => stageFn.call(generator, input));
  return { ms, output: value };
}

function benchmark(iterations: number) {
  const totals: Record<TStage, number> = {
    mesh: 0,
    topography: 0,
    hydrology: 0,
    population: 0,
    geopolitics: 0,
  };
  const stageOrder: TStage[] = ['mesh', 'topography', 'hydrology', 'population', 'geopolitics'];

  for (let i = 0; i < iterations; i += 1) {
    const generator = new MapGenerator({
      ...DEFAULT_CONFIG,
      seed: `bench-stage-${i}`,
      width: 1200,
      height: 800,
      cellCount: 2000,
    });

    let stageInput: unknown = undefined;
    for (const stage of stageOrder) {
      const { ms, output } = runStageTimed(generator, stage, stageInput);
      totals[stage] += ms;
      stageInput = output;
    }
  }

  console.warn(`Iterations: ${iterations}`);
  for (const stage of stageOrder) {
    console.warn(`${stage}: avg ${(totals[stage] / iterations).toFixed(2)}ms`);
  }
}

const iterations = Number(process.argv[2] || 5);
benchmark(Number.isFinite(iterations) && iterations > 0 ? iterations : 5);
