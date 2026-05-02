import { TMapCell } from 'src/types/map.types';
import { isLand } from './shared';

export function getNationSeedSuitability(cellId: number, cells: TMapCell[]) {
  const cell = cells[cellId];
  if (!isLand(cell)) return -1000;

  let score = 0;
  if (cell.terrain === 'plains') score += 2.3;
  if (cell.terrain === 'valley') score += 1.9;
  if (cell.terrain === 'forest') score += 0.6;
  if (cell.terrain === 'mountains' || cell.terrain === 'volcanic') score -= 2.8;
  if (cell.terrain === 'desert' || cell.terrain === 'badlands') score -= 1.8;

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
