import { TCell } from 'src/types/map.types';
import { isLand } from './shared';

export function getNationSeedSuitability(cellId: number, cells: TCell[]) {
  const cell = cells[cellId];
  if (!isLand(cell)) return -1000;

  let score = 0;
  if (cell.landform === 'plain') score += 2.3;
  if (cell.landform === 'valley') score += 1.9;
  if (cell.biome === 'temperate_forest' || cell.biome === 'tropical_forest') score += 0.6;
  if (cell.landform === 'mountain' || cell.landform === 'volcanic_field') score -= 2.8;
  if (cell.biome === 'desert_hot' || cell.biome === 'desert_cold' || cell.biome === 'steppe')
    score -= 1.8;

  if (cell.isRiver) score += 1.8;
  if (cell.isLake) score += 1.3;

  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.isWater && !neighbor.isLake) score += 0.22;
    if (neighbor.isRiver || neighbor.isLake) score += 0.35;
  }
  score += cell.suitability * 1.1;
  return score;
}

export function getProvinceSeedScore(cell: TCell) {
  if (!isLand(cell)) return -1000;
  if (cell.landform === 'plain') return 7 + cell.suitability * 2;
  if (cell.landform === 'valley') return 6.5 + cell.suitability * 2;
  if (cell.landform === 'coast') return 5.2 + cell.suitability * 1.8;
  if (cell.biome === 'temperate_forest' || cell.biome === 'tropical_forest')
    return 3.5 + cell.suitability;
  if (cell.landform === 'hills' || cell.landform === 'plateau') return 1.8 + cell.suitability * 0.8;
  if (
    cell.landform === 'mountain' ||
    cell.landform === 'volcanic_field' ||
    cell.biome === 'desert_hot' ||
    cell.biome === 'desert_cold'
  )
    return -4;
  return 1.2 + cell.suitability * 0.8;
}
