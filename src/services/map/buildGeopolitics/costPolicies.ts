import { TMapCell } from 'src/types/map.types';
import { isLand } from './geopoliticsShared';

type TEthnicConfig = {
  terrainInfluenceStrength: number;
};

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

export function getProvinceSeedScore(cell: TMapCell) {
  if (!isLand(cell)) return -1000;
  if (cell.terrain === 'plains') return 7 + cell.suitability * 2;
  if (cell.terrain === 'valley') return 6.5 + cell.suitability * 2;
  if (cell.terrain === 'coast') return 5.2 + cell.suitability * 1.8;
  if (cell.terrain === 'forest') return 3.5 + cell.suitability;
  if (cell.terrain === 'hills' || cell.terrain === 'plateau') return 1.8 + cell.suitability * 0.8;
  if (cell.terrain === 'mountains' || cell.terrain === 'desert' || cell.terrain === 'volcanic')
    return -4;
  return 1.2 + cell.suitability * 0.8;
}

export function ethnicTerrainCost(cell: TMapCell, config: TEthnicConfig) {
  const strength = config.terrainInfluenceStrength;
  if (cell.terrain === 'plains' || cell.terrain === 'valley' || cell.terrain === 'coast')
    return strength;
  if (cell.terrain === 'forest') return 1.35 * strength;
  if (cell.terrain === 'swamp') return 1.75 * strength;
  if (cell.terrain === 'hills') return 1.5 * strength;
  if (cell.terrain === 'plateau') return 1.6 * strength;
  if (cell.terrain === 'mountains' || cell.terrain === 'volcanic') return 2.45 * strength;
  if (cell.terrain === 'desert' || cell.terrain === 'badlands') return 1.65 * strength;
  if (cell.terrain === 'tundra') return 1.55 * strength;
  return 1.3 * strength;
}
