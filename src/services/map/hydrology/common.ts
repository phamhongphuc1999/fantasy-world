import { TMapCell, TTerrainBand } from 'src/types/global';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function sortIndicesByElevation(elevations: Float32Array) {
  return Array.from({ length: elevations.length }, (_, index) => index).sort(
    (leftIndex, rightIndex) => elevations[rightIndex] - elevations[leftIndex]
  );
}

export function getNeighborAverageElevation(cell: TMapCell, cells: TMapCell[]) {
  if (cell.neighbors.length === 0) return cell.elevation;

  let total = 0;
  for (const neighborId of cell.neighbors) {
    total += cells[neighborId].elevation;
  }
  return total / cell.neighbors.length;
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
