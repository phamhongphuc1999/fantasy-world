import {
  applyBlob,
  applyChain,
  applyMask,
  smoothElevations,
} from 'src/features/map/core/terrainShapeUtils';
import { createSeededRandom } from 'src/features/map/core/seededRandom';
import { TMapMesh, TTerrainPreset } from 'src/types/global';

interface TApplyTerrainPresetOptions {
  mesh: TMapMesh;
  seed: string;
  preset: TTerrainPreset;
  elevations: Float32Array;
}

export function applyTerrainPreset({ mesh, seed, preset, elevations }: TApplyTerrainPresetOptions) {
  const random = createSeededRandom(`${seed}:${preset}:terrain-tools`);
  const nextElevations = Float32Array.from(elevations);

  if (preset === 'balanced') {
    applyBlob(mesh, random, nextElevations, { amount: 0.16, count: 6, decay: 0.78 });
    applyChain(mesh, random, nextElevations, { amount: 0.14, count: 2, width: 4 });
    applyMask(mesh, nextElevations, 0.22);
    smoothElevations(mesh, nextElevations, 0.18);
  }

  if (preset === 'archipelago') {
    applyBlob(mesh, random, nextElevations, { amount: -0.1, count: 5, decay: 0.82 });
    applyBlob(mesh, random, nextElevations, { amount: 0.18, count: 10, decay: 0.74 });
    applyMask(mesh, nextElevations, 0.35);
    smoothElevations(mesh, nextElevations, 0.2);
  }

  if (preset === 'ranges') {
    applyChain(mesh, random, nextElevations, { amount: 0.22, count: 4, width: 5 });
    applyBlob(mesh, random, nextElevations, { amount: 0.08, count: 5, decay: 0.8 });
    smoothElevations(mesh, nextElevations, 0.16);
  }

  if (preset === 'rifted') {
    applyChain(mesh, random, nextElevations, { amount: -0.18, count: 3, width: 4 });
    applyBlob(mesh, random, nextElevations, { amount: 0.12, count: 7, decay: 0.78 });
    applyMask(mesh, nextElevations, 0.18);
    smoothElevations(mesh, nextElevations, 0.14);
  }

  return nextElevations;
}
