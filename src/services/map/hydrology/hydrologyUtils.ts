import { TTerrainBand } from 'src/types/map.types';

export { clamp, getNeighborAverageElevation } from 'src/services';

export function sortIndicesByElevation(elevations: Float32Array) {
  return Array.from({ length: elevations.length }, (_, index) => index).sort(
    (leftIndex, rightIndex) => elevations[rightIndex] - elevations[leftIndex]
  );
}

export function isWaterTerrain(terrain: TTerrainBand) {
  return (
    terrain === 'deep-water' ||
    terrain === 'shallow-water' ||
    terrain === 'inland-sea' ||
    terrain === 'coast' ||
    terrain === 'lake'
  );
}
