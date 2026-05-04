import { TERRAIN_COLORS } from 'src/configs/constance';
import { NATION_COLOR } from 'src/configs/mapConfig';
import { TLine, TMapCell, TTerrainBand } from 'src/types/map.types';

export function toPercent(count: number, total: number) {
  return parseFloat(((count / Math.max(1, total)) * 100).toFixed(2));
}

export function getTerrainColor(terrain: TTerrainBand) {
  return TERRAIN_COLORS[terrain];
}

export function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function getNationColor(nationId: number | null) {
  if (nationId === null) return '#334155';
  const paletteIndex = Math.abs(nationId) % NATION_COLOR.length;
  return NATION_COLOR[paletteIndex];
}

export function sumCellPopulation(cells: TMapCell[]) {
  return cells.reduce((sum, cell) => sum + cell.population, 0);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function smoothStep(value: number) {
  const clamped = clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function getNeighborAverageElevation(cell: TMapCell, cells: TMapCell[]) {
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

  if (denominator === 0) {
    return Math.sqrt((x - line.x1) ** 2 + (y - line.y1) ** 2);
  }

  const t = clamp(((x - line.x1) * dx + (y - line.y1) * dy) / denominator, 0, 1);
  const projectionX = line.x1 + t * dx;
  const projectionY = line.y1 + t * dy;

  return Math.sqrt((x - projectionX) ** 2 + (y - projectionY) ** 2);
}
