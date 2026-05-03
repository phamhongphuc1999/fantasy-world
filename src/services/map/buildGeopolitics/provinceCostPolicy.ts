import { TMapCell } from 'src/types/map.types';
import { isLand } from './shared';

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
