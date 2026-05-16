import { TCell, TPoint } from 'src/types/map.types';

// Oblique (2.5D) projection constants
// Keeps world X/Y unchanged — only shifts Y upward based on elevation.
export const DEFAULT_ELEV_SCALE = 3.5;

/**
 * Project world (x, y, elevation) to oblique canvas coordinates.
 * X/Y remain unchanged (no rotation), only Y shifts for elevation.
 * This gives a top-down view with visible height via side walls.
 */
export function projectToIso(
  x: number,
  y: number,
  elevation: number,
  elevScale: number = DEFAULT_ELEV_SCALE
): [number, number] {
  return [x, y - elevation * elevScale];
}

/**
 * Project an entire polygon to oblique coordinates.
 * Uses the cell's elevation uniformly for all vertices.
 */
export function projectPolygonToIso(
  polygon: TPoint[],
  elevation: number,
  elevScale: number = DEFAULT_ELEV_SCALE
): TPoint[] {
  return polygon.map(([px, py]) => projectToIso(px, py, elevation, elevScale));
}

/**
 * Calculate the bounding box of all cells in oblique space.
 * Returns { minX, minY, maxX, maxY, width, height }.
 */
export function getIsoBoundingBox(
  cells: TCell[],
  elevScale: number = DEFAULT_ELEV_SCALE
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const cell of cells) {
    const isoPoly = projectPolygonToIso(cell.polygon, cell.elevation, elevScale);
    for (const [ix, iy] of isoPoly) {
      if (ix < minX) minX = ix;
      if (iy < minY) minY = iy;
      if (ix > maxX) maxX = ix;
      if (iy > maxY) maxY = iy;
    }
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Compute depth value for sorting (Painter's algorithm).
 * Cells with larger depth are rendered first (behind).
 * In oblique projection, depth is purely based on Y + elevation.
 */
export function getCellDepth(cell: TCell): number {
  return cell.site[1] + cell.elevation;
}

/**
 * Sort cells from back to front (Painter's algorithm).
 */
export function sortByDepth(cells: TCell[]): TCell[] {
  return [...cells].sort((a, b) => getCellDepth(a) - getCellDepth(b));
}

/**
 * Find shared edge vertices between two cells' polygons.
 * Returns the two shared vertices as [TPoint, TPoint] or null.
 */
export function findSharedEdge(polyA: TPoint[], polyB: TPoint[]): [TPoint, TPoint] | null {
  const EPS = 0.5;
  const shared: TPoint[] = [];

  for (const a of polyA) {
    const found = polyB.some((b) => Math.hypot(b[0] - a[0], b[1] - a[1]) < EPS);
    if (found) shared.push(a);
  }

  if (shared.length >= 2) {
    return [shared[0], shared[1]];
  }
  return null;
}
