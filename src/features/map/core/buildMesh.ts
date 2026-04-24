import { Delaunay } from 'd3-delaunay';
import { createSeededRandom } from 'src/features/map/core/seededRandom';
import { TMapCell, TMapMesh, TPoint } from 'src/types/global';

interface TBuildMeshOptions {
  width: number;
  height: number;
  seed: string;
  cellCount: number;
}

function generateJitteredGridPoints(
  width: number,
  height: number,
  cellCount: number,
  seed: string
): TPoint[] {
  const random = createSeededRandom(seed);
  const columns = Math.max(1, Math.ceil(Math.sqrt((cellCount * width) / height)));
  const rows = Math.max(1, Math.ceil(cellCount / columns));
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const points: TPoint[] = [];

  for (let row = 0; row < rows && points.length < cellCount; row += 1) {
    for (let column = 0; column < columns && points.length < cellCount; column += 1) {
      const jitterX = (random() - 0.5) * cellWidth * 0.72;
      const jitterY = (random() - 0.5) * cellHeight * 0.72;
      const x = clamp((column + 0.5) * cellWidth + jitterX, 0, width);
      const y = clamp((row + 0.5) * cellHeight + jitterY, 0, height);

      points.push([x, y]);
    }
  }

  return points;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePolygon(polygon: Iterable<[number, number]> | null | undefined): TPoint[] {
  if (!polygon) {
    return [];
  }

  const points = Array.from(polygon, ([x, y]) => [x, y] as TPoint);

  if (points.length > 1) {
    const [firstX, firstY] = points[0];
    const [lastX, lastY] = points[points.length - 1];

    if (firstX === lastX && firstY === lastY) {
      points.pop();
    }
  }

  return points;
}

export function buildMesh({ width, height, seed, cellCount }: TBuildMeshOptions): TMapMesh & {
  delaunay: Delaunay<TPoint>;
} {
  const points = generateJitteredGridPoints(width, height, cellCount, seed);
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, width, height]);

  const cells: TMapCell[] = points.map((point, index) => ({
    id: index,
    site: point,
    polygon: normalizePolygon(voronoi.cellPolygon(index)),
    neighbors: Array.from(delaunay.neighbors(index)),
  }));

  return { width, height, cells, delaunay };
}
