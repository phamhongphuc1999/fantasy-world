import { TOPOGRAPHY_PRESET_CONFIG } from 'src/configs/map/topography';
import { TMesh, TTopography } from 'src/types/map.types';
import { createSeededRandom, hashSeed } from '../core/seededRandom';
import { clamp } from '../utils/math';
import {
  applyArchipelagoSeeds,
  applyEdgeShelf,
  applyRangeBands,
  applyRangeChains,
  applyValleyBands,
  smoothElevations,
} from './shape';

interface TApplyTopographyParams {
  mesh: TMesh;
  seed: string;
  topography: TTopography;
  elevations: Float32Array;
}

function applyGlobalScale(elevations: Float32Array, offset: number, scale: number) {
  for (let index = 0; index < elevations.length; index += 1) {
    elevations[index] = clamp(elevations[index] * scale + offset, 0, 1);
  }
}

const ranges = TOPOGRAPHY_PRESET_CONFIG.ranges;
const balanced = TOPOGRAPHY_PRESET_CONFIG.balanced;
const rifted = TOPOGRAPHY_PRESET_CONFIG.rifted;
const archipelago = TOPOGRAPHY_PRESET_CONFIG.archipelago;
export function applyTopography({ mesh, seed, topography, elevations }: TApplyTopographyParams) {
  const random = createSeededRandom(`${seed}:${topography}:terrain-tools`);
  const nextElevations = Float32Array.from(elevations);

  if (topography === 'balanced') {
    applyRangeBands(mesh, random, nextElevations, balanced.rangeBands);
    applyValleyBands(mesh, random, nextElevations, balanced.valleyBands);
    applyEdgeShelf(
      mesh,
      nextElevations,
      balanced.edgeShelfStrength,
      hashSeed(`${seed}:${topography}:shelf`)
    );
    smoothElevations(mesh, nextElevations, balanced.smoothFactor);
    return nextElevations;
  }

  if (topography === 'ranges') {
    applyRangeChains(mesh, random, nextElevations, ranges.rangeBands);
    applyRangeBands(mesh, random, nextElevations, {
      ...ranges.rangeBands,
      count: Math.max(4, Math.floor(ranges.rangeBands.count * 0.45)),
      amplitude: ranges.rangeBands.amplitude * 0.62,
      width: ranges.rangeBands.width * 0.82,
    });
    const { count, depth, width } = ranges.valleyBands;
    applyValleyBands(mesh, random, nextElevations, {
      ...ranges.valleyBands,
      count: count + 4,
      depth: depth * 1.28,
      width: width * 0.84,
    });
    applyEdgeShelf(
      mesh,
      nextElevations,
      ranges.edgeShelfStrength,
      hashSeed(`${seed}:${topography}:shelf`)
    );
    smoothElevations(mesh, nextElevations, ranges.smoothFactor);
    return nextElevations;
  }

  if (topography === 'rifted') {
    applyRangeBands(mesh, random, nextElevations, rifted.rangeBands);
    applyValleyBands(mesh, random, nextElevations, rifted.valleyBands);
    applyGlobalScale(nextElevations, rifted.globalScale.offset, rifted.globalScale.scale);
    applyEdgeShelf(
      mesh,
      nextElevations,
      rifted.edgeShelfStrength,
      hashSeed(`${seed}:${topography}:shelf`)
    );
    smoothElevations(mesh, nextElevations, rifted.smoothFactor);
    return nextElevations;
  }

  // Archipelago / island chain preset: many separated islands with varied sizes.
  applyArchipelagoSeeds(mesh, random, nextElevations, {
    majorIslandCount:
      archipelago.majorIslandMin +
      Math.floor(random() * (archipelago.majorIslandMax - archipelago.majorIslandMin + 1)),
    mediumIslandCount:
      archipelago.mediumIslandBase + Math.floor(random() * archipelago.mediumIslandExtra),
    smallIslandCount:
      archipelago.smallIslandBase + Math.floor(random() * archipelago.smallIslandExtra),
  });
  applyValleyBands(mesh, random, nextElevations, archipelago.valleyBands);
  applyEdgeShelf(
    mesh,
    nextElevations,
    archipelago.edgeShelfStrength,
    hashSeed(`${seed}:${topography}:shelf`)
  );
  smoothElevations(mesh, nextElevations, archipelago.smoothFactor);

  return nextElevations;
}
