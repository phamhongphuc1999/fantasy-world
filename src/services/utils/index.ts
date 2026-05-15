import { NATION_COLORS } from 'src/configs/map/common';
import { TCell } from 'src/types/map.types';

export function toPercent(count: number, total: number) {
  return parseFloat(((count / Math.max(1, total)) * 100).toFixed(2));
}

export function sumCellPopulation(cells: TCell[]) {
  return cells.reduce((sum, cell) => sum + cell.population, 0);
}

export function getMetricRange(values: number[]) {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  return { min, max };
}

export function sortDescStable<T extends { score: number; cellId: number }>(items: T[]) {
  items.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.cellId - right.cellId;
  });
  return items;
}

export function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function getRiverStrokeWidth(cell: TCell) {
  return Math.min(4.8, Math.max(0.75, cell.riverWidth || 0.9));
}

export function getNationColor(nationId: number | null) {
  if (nationId === null) return '#334155';
  const paletteIndex = Math.abs(nationId) % NATION_COLORS.length;
  return NATION_COLORS[paletteIndex];
}
