import { TMapCell } from 'src/types/global';

export type TLogisticsRouteResult = {
  pathCellIds: number[];
  totalCost: number;
  distance: number;
  riskScore: number;
  score: number;
};

export type TLogisticsRouteInput = {
  cells: TMapCell[];
  startCellId: number;
  goalCellId: number;
  roadEdges: Set<string>;
};

function edgeKey(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function terrainMoveCost(terrain: TMapCell['terrain']) {
  switch (terrain) {
    case 'plains':
    case 'valley':
      return 1;
    case 'coast':
    case 'plateau':
      return 1.35;
    case 'forest':
      return 1.65;
    case 'hills':
      return 2.15;
    case 'swamp':
      return 2.8;
    case 'mountains':
      return 4.2;
    case 'volcanic':
      return 4.8;
    case 'desert':
    case 'badlands':
      return 2.3;
    case 'tundra':
      return 2.6;
    default:
      return 1.5;
  }
}

function stepCost(from: TMapCell, to: TMapCell, hasRoad: boolean) {
  let cost = (terrainMoveCost(from.terrain) + terrainMoveCost(to.terrain)) * 0.5;

  if (from.isRiver || to.isRiver) {
    cost += 1.6;
  }
  if (from.nationId !== to.nationId) {
    cost += 1.2;
  }
  if (from.terrain === 'mountains' || to.terrain === 'mountains') {
    cost += 1;
  }
  if (from.terrain === 'swamp' || to.terrain === 'swamp') {
    cost += 0.8;
  }

  if (hasRoad) cost *= 0.55;

  return Math.max(0.25, cost);
}

function estimateRisk(pathCellIds: number[], cells: TMapCell[]) {
  let risk = 0;
  for (let index = 0; index < pathCellIds.length; index += 1) {
    const cell = cells[pathCellIds[index]];
    if (cell.terrain === 'mountains' || cell.terrain === 'volcanic') risk += 1.4;
    if (cell.terrain === 'swamp') risk += 1.2;
    if (cell.terrain === 'forest' || cell.terrain === 'tundra') risk += 0.7;
    if (index > 0) {
      const prev = cells[pathCellIds[index - 1]];
      if (prev.nationId !== cell.nationId) risk += 0.8;
    }
  }
  return Number(risk.toFixed(2));
}

function reconstructPath(previous: Int32Array, start: number, goal: number) {
  const path: number[] = [];
  let cursor = goal;
  while (cursor >= 0) {
    path.push(cursor);
    if (cursor === start) break;
    cursor = previous[cursor];
  }
  path.reverse();
  if (path[0] !== start) return [];
  return path;
}

export function findLogisticsRoute({
  cells,
  startCellId,
  goalCellId,
  roadEdges,
}: TLogisticsRouteInput): TLogisticsRouteResult | null {
  if (startCellId === goalCellId) {
    return { pathCellIds: [startCellId], totalCost: 0, distance: 0, riskScore: 0, score: 100 };
  }

  const distances = new Float64Array(cells.length);
  const previous = new Int32Array(cells.length);
  const visited = new Uint8Array(cells.length);
  distances.fill(Number.POSITIVE_INFINITY);
  previous.fill(-1);
  distances[startCellId] = 0;

  const frontier: Array<{ cellId: number; cost: number }> = [{ cellId: startCellId, cost: 0 }];

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift() as { cellId: number; cost: number };
    if (visited[current.cellId] === 1) continue;
    visited[current.cellId] = 1;

    if (current.cellId === goalCellId) break;

    const from = cells[current.cellId];
    for (const neighborId of from.neighbors) {
      const to = cells[neighborId];
      if (to.isWater) continue;

      const hasRoad = roadEdges.has(edgeKey(current.cellId, neighborId));
      const nextCost = distances[current.cellId] + stepCost(from, to, hasRoad);

      if (nextCost < distances[neighborId]) {
        distances[neighborId] = nextCost;
        previous[neighborId] = current.cellId;
        frontier.push({ cellId: neighborId, cost: nextCost });
      }
    }
  }

  if (!Number.isFinite(distances[goalCellId])) return null;

  const pathCellIds = reconstructPath(previous, startCellId, goalCellId);
  if (pathCellIds.length === 0) return null;

  const totalCost = Number(distances[goalCellId].toFixed(2));
  const distance = pathCellIds.length;
  const riskScore = estimateRisk(pathCellIds, cells);
  const score = Number(Math.max(0, 180 - totalCost * 7 - riskScore * 3).toFixed(1));

  return { pathCellIds, totalCost, distance, riskScore, score };
}

export function buildRoadEdgeKey(pathCellIds: number[]) {
  const keys: string[] = [];
  for (let index = 1; index < pathCellIds.length; index += 1) {
    keys.push(edgeKey(pathCellIds[index - 1], pathCellIds[index]));
  }
  return keys;
}
