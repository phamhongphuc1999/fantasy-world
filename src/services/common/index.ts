import { NATION_COLORS } from 'src/configs/mapConfig';
import { TCell, TLine, TPoint } from 'src/types/map.types';

type TPointKeyOptions = {
  precision?: number;
  separator?: string;
};

type TUndirectedEdgeKeyOptions = {
  precision?: number;
  pointSeparator?: string;
  edgeSeparator?: string;
};

export function toPercent(count: number, total: number) {
  return parseFloat(((count / Math.max(1, total)) * 100).toFixed(2));
}

export function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function sumCellPopulation(cells: TCell[]) {
  return cells.reduce((sum, cell) => sum + cell.population, 0);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function smoothStep(value: number) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function getNationColor(nationId: number | null) {
  if (nationId === null) return '#334155';
  const paletteIndex = Math.abs(nationId) % NATION_COLORS.length;
  return NATION_COLORS[paletteIndex];
}

export function getAvgNeighbor(cell: TCell, cells: TCell[]) {
  if (cell.neighbors.length === 0) return cell.elevation;

  let total = 0;
  for (const neighborId of cell.neighbors) {
    total += cells[neighborId].elevation;
  }
  return total / cell.neighbors.length;
}

export function distanceToSegment(x: number, y: number, line: TLine): number {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const denominator = dx * dx + dy * dy;

  if (denominator === 0) return Math.sqrt((x - line.x1) ** 2 + (y - line.y1) ** 2);

  const t = clamp(((x - line.x1) * dx + (y - line.y1) * dy) / denominator, 0, 1);
  const projectionX = line.x1 + t * dx;
  const projectionY = line.y1 + t * dy;

  return Math.sqrt((x - projectionX) ** 2 + (y - projectionY) ** 2);
}

export function toPointKey(point: TPoint, options?: TPointKeyOptions) {
  const precision = options?.precision ?? 3;
  const separator = options?.separator ?? ':';
  return `${point[0].toFixed(precision)}${separator}${point[1].toFixed(precision)}`;
}

export function toEdgeKey(
  startPoint: TPoint,
  endPoint: TPoint,
  options?: TUndirectedEdgeKeyOptions
) {
  const precision = options?.precision ?? 3;
  const pointSeparator = options?.pointSeparator ?? ':';
  const edgeSeparator = options?.edgeSeparator ?? '|';
  const startKey = toPointKey(startPoint, { precision, separator: pointSeparator });
  const endKey = toPointKey(endPoint, { precision, separator: pointSeparator });
  return startKey < endKey
    ? `${startKey}${edgeSeparator}${endKey}`
    : `${endKey}${edgeSeparator}${startKey}`;
}

export function findNearestCell(
  cells: Pick<TCell, 'site'>[],
  sourcePoint: TPoint,
  candidateCellIds: number[],
  isEligible?: (cellId: number) => boolean
) {
  let nearestCellId = -1;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidateCellId of candidateCellIds) {
    if (isEligible && !isEligible(candidateCellId)) continue;
    const candidatePoint = cells[candidateCellId].site;
    const distance = Math.hypot(
      sourcePoint[0] - candidatePoint[0],
      sourcePoint[1] - candidatePoint[1]
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      nearestCellId = candidateCellId;
    }
  }
  return nearestCellId;
}

export function normalize(value: number, min: number, max: number) {
  return (value - min) / (max - min + 1e-9);
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

export function getRiverStrokeWidth(cell: TCell) {
  return Math.min(4.8, Math.max(0.75, cell.riverWidth || 0.9));
}

export function sortDescStable<T extends { score: number; cellId: number }>(items: T[]) {
  items.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.cellId - right.cellId;
  });
  return items;
}
