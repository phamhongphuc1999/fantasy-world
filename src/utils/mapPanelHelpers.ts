import { NATION_COLOR } from 'src/configs/mapConfig';
import { TMapCell } from 'src/types/map.types';

export function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function getNationColor(nationId: number) {
  const paletteIndex = Math.abs(nationId) % NATION_COLOR.length;
  return NATION_COLOR[paletteIndex];
}

export function sumCellPopulation(cells: TMapCell[]) {
  return cells.reduce((sum, cell) => sum + cell.population, 0);
}
