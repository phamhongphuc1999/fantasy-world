import { Delaunay } from 'd3-delaunay';
import { clamp } from 'src/services';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { TMapCell, TMapEdge, TMapMeshWithDelaunay, TMapVertex, TPoint } from 'src/types/map.types';

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

function normalizePolygon(polygon: Iterable<TPoint> | null | undefined): TPoint[] {
  if (!polygon) return [];

  const points = Array.from(polygon, ([x, y]) => [x, y] as TPoint);

  if (points.length > 1) {
    const [firstX, firstY] = points[0];
    const [lastX, lastY] = points[points.length - 1];

    if (firstX === lastX && firstY === lastY) points.pop();
  }
  return points;
}

function createPointKey([x, y]: TPoint) {
  return `${x.toFixed(4)}:${y.toFixed(4)}`;
}

function createEdgeKey(vertexAId: number, vertexBId: number) {
  return vertexAId < vertexBId ? `${vertexAId}:${vertexBId}` : `${vertexBId}:${vertexAId}`;
}

export function buildMesh({
  width,
  height,
  seed,
  cellCount,
}: TBuildMeshOptions): TMapMeshWithDelaunay {
  const points = generateJitteredGridPoints(width, height, cellCount, seed);
  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, width, height]);
  const vertexIdByKey = new Map<string, number>();
  const vertices: TMapVertex[] = [];
  const edgeIdByKey = new Map<string, number>();
  const edges: TMapEdge[] = [];

  const cells: TMapCell[] = points.map((point, index) => {
    const polygon = normalizePolygon(voronoi.cellPolygon(index));
    const vertexIds = polygon.map((polygonPoint) => {
      const pointKey = createPointKey(polygonPoint);
      const existingVertexId = vertexIdByKey.get(pointKey);

      if (existingVertexId !== undefined) return existingVertexId;

      const nextVertexId = vertices.length;
      vertexIdByKey.set(pointKey, nextVertexId);
      vertices.push({ id: nextVertexId, point: polygonPoint });

      return nextVertexId;
    });

    const edgeIds: number[] = [];

    for (let vertexIndex = 0; vertexIndex < vertexIds.length; vertexIndex += 1) {
      const startVertexId = vertexIds[vertexIndex];
      const endVertexId = vertexIds[(vertexIndex + 1) % vertexIds.length];
      const edgeKey = createEdgeKey(startVertexId, endVertexId);
      const existingEdgeId = edgeIdByKey.get(edgeKey);

      if (existingEdgeId !== undefined) {
        const existingEdge = edges[existingEdgeId];

        if (!existingEdge.cellIds.includes(index)) {
          existingEdge.cellIds.push(index);
          existingEdge.isBoundary = existingEdge.cellIds.length === 1;
        }

        edgeIds.push(existingEdgeId);
        continue;
      }

      const nextEdgeId = edges.length;
      edgeIdByKey.set(edgeKey, nextEdgeId);
      edges.push({
        id: nextEdgeId,
        vertexIds: [startVertexId, endVertexId],
        cellIds: [index],
        isBoundary: true,
      });
      edgeIds.push(nextEdgeId);
    }

    return {
      id: index,
      site: point,
      polygon,
      vertexIds,
      edgeIds,
      neighbors: Array.from(delaunay.neighbors(index)),
      elevation: 0,
      isWater: false,
      terrain: 'plains',
      flow: 0,
      downstreamId: null,
      erosion: 0,
      isRiver: false,
      isLake: false,
      biome: 'Unassigned',
      suitability: 0,
      temperature: 0,
      precipitation: 0,
      rainShadow: 0,
      population: 0,
      waterAccessibility: 0,
      nationId: null,
      provinceId: null,
      ethnicGroupId: null,
      zoneType: 'international-waters',
      isCapital: false,
      isEconomicHub: false,
    };
  });

  return { width, height, cells, edges, vertices, nations: [], ethnicGroups: [], delaunay };
}
