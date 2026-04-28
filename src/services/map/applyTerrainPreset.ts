import {
  applyArchipelagoSeeds,
  applyEdgeShelf,
  applyRangeBands,
  applyValleyBands,
  smoothElevations,
} from 'src/services/map/terrainShapeUtils';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import { TMapMesh, TTerrainPreset } from 'src/types/global';

interface TApplyTerrainPresetOptions {
  mesh: TMapMesh;
  seed: string;
  preset: TTerrainPreset;
  elevations: Float32Array;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function applyGlobalScale(elevations: Float32Array, offset: number, scale: number) {
  for (let index = 0; index < elevations.length; index += 1) {
    elevations[index] = clamp(elevations[index] * scale + offset, 0, 1);
  }
}

export function applyTerrainPreset({ mesh, seed, preset, elevations }: TApplyTerrainPresetOptions) {
  const random = createSeededRandom(`${seed}:${preset}:terrain-tools`);
  const nextElevations = Float32Array.from(elevations);

  if (preset === 'balanced') {
    applyRangeBands(mesh, random, nextElevations, { count: 7, amplitude: 0.2, width: 0.11 });
    applyValleyBands(mesh, random, nextElevations, { count: 5, depth: 0.12, width: 0.12 });
    applyEdgeShelf(mesh, nextElevations, 0.24, hashSeed(`${seed}:${preset}:shelf`));
    smoothElevations(mesh, nextElevations, 0.2);
    return nextElevations;
  }

  if (preset === 'ranges') {
    applyRangeBands(mesh, random, nextElevations, { count: 10, amplitude: 0.24, width: 0.09 });
    applyValleyBands(mesh, random, nextElevations, { count: 4, depth: 0.1, width: 0.1 });
    applyEdgeShelf(mesh, nextElevations, 0.2, hashSeed(`${seed}:${preset}:shelf`));
    smoothElevations(mesh, nextElevations, 0.16);
    return nextElevations;
  }

  if (preset === 'rifted') {
    applyRangeBands(mesh, random, nextElevations, { count: 8, amplitude: 0.17, width: 0.1 });
    applyValleyBands(mesh, random, nextElevations, { count: 8, depth: 0.16, width: 0.08 });
    applyGlobalScale(nextElevations, -0.02, 0.98);
    applyEdgeShelf(mesh, nextElevations, 0.22, hashSeed(`${seed}:${preset}:shelf`));
    smoothElevations(mesh, nextElevations, 0.18);
    return nextElevations;
  }

  // Archipelago / island chain preset: many separated islands with varied sizes.
  applyArchipelagoSeeds(mesh, random, nextElevations, {
    majorIslandCount: random() > 0.35 ? 1 : 2,
    mediumIslandCount: 4 + Math.floor(random() * 3),
    smallIslandCount: 16 + Math.floor(random() * 8),
  });
  applyValleyBands(mesh, random, nextElevations, { count: 7, depth: 0.1, width: 0.1 });
  applyEdgeShelf(mesh, nextElevations, 0.3, hashSeed(`${seed}:${preset}:shelf`));
  smoothElevations(mesh, nextElevations, 0.14);

  return nextElevations;
}
