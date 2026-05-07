import { TCell } from 'src/types/map.types';

export function getRiverStrokeWidth(cell: TCell) {
  return Math.min(4.8, Math.max(0.75, cell.riverWidth || 0.9));
}
