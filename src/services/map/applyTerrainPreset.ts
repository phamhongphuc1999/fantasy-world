import { PRESET_CONFIG } from 'src/configs/mapConfig';
import { clamp } from 'src/services';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import {
  applyArchipelagoSeeds,
  applyEdgeShelf,
  applyRangeBands,
  applyRangeChains,
  applyValleyBands,
  smoothElevations,
} from 'src/services/map/terrainShapeUtils';
import { TMapMesh, TTerrainPreset } from 'src/types/map.types';

interface TApplyTerrainPresetOptions {
  mesh: TMapMesh;
  seed: string;
  preset: TTerrainPreset;
  elevations: Float32Array;
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
    applyRangeBands(mesh, random, nextElevations, PRESET_CONFIG.balanced.rangeBands);
    applyValleyBands(mesh, random, nextElevations, PRESET_CONFIG.balanced.valleyBands);
    applyEdgeShelf(
      mesh,
      nextElevations,
      PRESET_CONFIG.balanced.edgeShelfStrength,
      hashSeed(`${seed}:${preset}:shelf`)
    );
    smoothElevations(mesh, nextElevations, PRESET_CONFIG.balanced.smoothFactor);
    return nextElevations;
  }

  if (preset === 'ranges') {
    applyRangeChains(mesh, random, nextElevations, PRESET_CONFIG.ranges.rangeBands);
    applyRangeBands(mesh, random, nextElevations, {
      ...PRESET_CONFIG.ranges.rangeBands,
      count: Math.max(4, Math.floor(PRESET_CONFIG.ranges.rangeBands.count * 0.45)),
      amplitude: PRESET_CONFIG.ranges.rangeBands.amplitude * 0.62,
      width: PRESET_CONFIG.ranges.rangeBands.width * 0.82,
    });
    applyValleyBands(mesh, random, nextElevations, {
      ...PRESET_CONFIG.ranges.valleyBands,
      count: PRESET_CONFIG.ranges.valleyBands.count + 4,
      depth: PRESET_CONFIG.ranges.valleyBands.depth * 1.28,
      width: PRESET_CONFIG.ranges.valleyBands.width * 0.84,
    });
    applyEdgeShelf(
      mesh,
      nextElevations,
      PRESET_CONFIG.ranges.edgeShelfStrength,
      hashSeed(`${seed}:${preset}:shelf`)
    );
    smoothElevations(mesh, nextElevations, PRESET_CONFIG.ranges.smoothFactor);
    return nextElevations;
  }

  if (preset === 'rifted') {
    applyRangeBands(mesh, random, nextElevations, PRESET_CONFIG.rifted.rangeBands);
    applyValleyBands(mesh, random, nextElevations, PRESET_CONFIG.rifted.valleyBands);
    applyGlobalScale(
      nextElevations,
      PRESET_CONFIG.rifted.globalScale.offset,
      PRESET_CONFIG.rifted.globalScale.scale
    );
    applyEdgeShelf(
      mesh,
      nextElevations,
      PRESET_CONFIG.rifted.edgeShelfStrength,
      hashSeed(`${seed}:${preset}:shelf`)
    );
    smoothElevations(mesh, nextElevations, PRESET_CONFIG.rifted.smoothFactor);
    return nextElevations;
  }

  // Archipelago / island chain preset: many separated islands with varied sizes.
  applyArchipelagoSeeds(mesh, random, nextElevations, {
    majorIslandCount:
      PRESET_CONFIG.archipelago.majorIslandMin +
      Math.floor(
        random() *
          (PRESET_CONFIG.archipelago.majorIslandMax - PRESET_CONFIG.archipelago.majorIslandMin + 1)
      ),
    mediumIslandCount:
      PRESET_CONFIG.archipelago.mediumIslandBase +
      Math.floor(random() * PRESET_CONFIG.archipelago.mediumIslandExtra),
    smallIslandCount:
      PRESET_CONFIG.archipelago.smallIslandBase +
      Math.floor(random() * PRESET_CONFIG.archipelago.smallIslandExtra),
  });
  applyValleyBands(mesh, random, nextElevations, PRESET_CONFIG.archipelago.valleyBands);
  applyEdgeShelf(
    mesh,
    nextElevations,
    PRESET_CONFIG.archipelago.edgeShelfStrength,
    hashSeed(`${seed}:${preset}:shelf`)
  );
  smoothElevations(mesh, nextElevations, PRESET_CONFIG.archipelago.smoothFactor);

  return nextElevations;
}
