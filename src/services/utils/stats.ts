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
