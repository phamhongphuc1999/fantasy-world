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
    applyValleyBands(mesh, random, nextElevations, {
      ...ranges.valleyBands,
      count: ranges.valleyBands.count + 4,
      depth: ranges.valleyBands.depth * 1.28,
      width: ranges.valleyBands.width * 0.84,
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
    applyRangeBands(mesh, random, nextElevations, TOPOGRAPHY_PRESET_CONFIG.rifted.rangeBands);
    applyValleyBands(mesh, random, nextElevations, TOPOGRAPHY_PRESET_CONFIG.rifted.valleyBands);
    applyGlobalScale(
      nextElevations,
      TOPOGRAPHY_PRESET_CONFIG.rifted.globalScale.offset,
      TOPOGRAPHY_PRESET_CONFIG.rifted.globalScale.scale
    );
    applyEdgeShelf(
      mesh,
      nextElevations,
      TOPOGRAPHY_PRESET_CONFIG.rifted.edgeShelfStrength,
      hashSeed(`${seed}:${topography}:shelf`)
    );
    smoothElevations(mesh, nextElevations, TOPOGRAPHY_PRESET_CONFIG.rifted.smoothFactor);
    return nextElevations;
  }

  // Archipelago / island chain preset: many separated islands with varied sizes.
  applyArchipelagoSeeds(mesh, random, nextElevations, {
    majorIslandCount:
      TOPOGRAPHY_PRESET_CONFIG.archipelago.majorIslandMin +
      Math.floor(
        random() *
          (TOPOGRAPHY_PRESET_CONFIG.archipelago.majorIslandMax -
            TOPOGRAPHY_PRESET_CONFIG.archipelago.majorIslandMin +
            1)
      ),
    mediumIslandCount:
      TOPOGRAPHY_PRESET_CONFIG.archipelago.mediumIslandBase +
      Math.floor(random() * TOPOGRAPHY_PRESET_CONFIG.archipelago.mediumIslandExtra),
    smallIslandCount:
      TOPOGRAPHY_PRESET_CONFIG.archipelago.smallIslandBase +
      Math.floor(random() * TOPOGRAPHY_PRESET_CONFIG.archipelago.smallIslandExtra),
  });
  applyValleyBands(mesh, random, nextElevations, TOPOGRAPHY_PRESET_CONFIG.archipelago.valleyBands);
  applyEdgeShelf(
    mesh,
    nextElevations,
    TOPOGRAPHY_PRESET_CONFIG.archipelago.edgeShelfStrength,
    hashSeed(`${seed}:${topography}:shelf`)
  );
  smoothElevations(mesh, nextElevations, TOPOGRAPHY_PRESET_CONFIG.archipelago.smoothFactor);

  return nextElevations;
}
