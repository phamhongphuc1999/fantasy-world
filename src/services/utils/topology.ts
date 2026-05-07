import { TCell } from 'src/types/map.types';

export function getAvgNeighbor(cell: TCell, cells: TCell[]) {
  if (cell.neighbors.length === 0) return cell.elevation;

  let total = 0;
  for (const neighborId of cell.neighbors) {
    total += cells[neighborId].elevation;
  }
  return total / cell.neighbors.length;
}
