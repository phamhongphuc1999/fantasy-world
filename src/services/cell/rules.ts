import { TCell } from 'src/types/map.types';

export function isWaterOrRiverCell(cell: Pick<TCell, 'isWater' | 'isRiver' | 'isLake'>) {
  return cell.isWater || cell.isRiver || cell.isLake;
}
