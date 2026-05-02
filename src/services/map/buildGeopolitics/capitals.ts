import { MAP_GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { collectConnectedComponents } from 'src/services/map/core/graph';
import { TFifoQueue } from 'src/services/map/core/queue';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { TMapCell, TNation } from 'src/types/map.types';
import { CAPITAL_VIEWPORT_MARGIN, createRegionalName, isLand } from './shared';

function getLandDistanceMap(
  cells: TMapCell[],
  nationLandSet: Set<number>,
  sourcePredicate: (cellId: number) => boolean
) {
  const distances = new Int32Array(cells.length);
  distances.fill(-1);
  const queue = new TFifoQueue<number>();

  for (const cellId of nationLandSet) {
    if (!sourcePredicate(cellId)) continue;
    distances[cellId] = 0;
    queue.enqueue(cellId);
  }

  while (queue.size > 0) {
    const current = queue.dequeue() as number;
    const currentDistance = distances[current];
    for (const neighborId of cells[current].neighbors) {
      if (!nationLandSet.has(neighborId)) continue;
      if (distances[neighborId] >= 0) continue;
      distances[neighborId] = currentDistance + 1;
      queue.enqueue(neighborId);
    }
  }
  return distances;
}

function getNationComponents(cells: TMapCell[], owner: Int32Array, nationId: number) {
  return collectConnectedComponents(
    cells,
    (cell) => owner[cell.id] === nationId && isLand(cell),
    (_current, neighbor) => owner[neighbor.id] === nationId && isLand(neighbor),
    true
  );
}

function waterProximityScore(cell: TMapCell, cells: TMapCell[]) {
  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.isWater || neighbor.isRiver || neighbor.isLake) {
      return 1;
    }
  }

  let secondRingWater = 0;
  for (const neighborId of cell.neighbors) {
    for (const secondNeighborId of cells[neighborId].neighbors) {
      const secondNeighbor = cells[secondNeighborId];
      if (secondNeighbor.isWater || secondNeighbor.isRiver || secondNeighbor.isLake) {
        secondRingWater += 1;
      }
    }
  }
  return Math.min(0.85, secondRingWater * 0.08);
}

function flatnessScore(cell: TMapCell) {
  if (cell.terrain === 'plains') return 1;
  if (cell.terrain === 'valley') return 0.9;
  if (cell.terrain === 'coast') return 0.82;
  if (cell.terrain === 'forest') return 0.7;
  if (cell.terrain === 'plateau') return 0.64;
  if (cell.terrain === 'hills') return 0.45;
  return 0.2;
}

function strategicCapitalScore(
  cellId: number,
  cells: TMapCell[],
  borderDistanceMap: Int32Array,
  coastDistanceMap: Int32Array,
  hubCellIds: number[],
  mapWidth: number,
  mapHeight: number
) {
  const cell = cells[cellId];
  if (cell.terrain === 'mountains' || cell.terrain === 'desert' || cell.terrain === 'forest') {
    return -1000;
  }

  let score = 0;
  if (cell.terrain === 'plains') score += 50;
  else if (cell.terrain === 'valley') score += 42;
  else if (cell.terrain === 'coast') score += 28;
  else if (cell.terrain === 'plateau') score += 20;

  score += waterProximityScore(cell, cells) * 30;

  const borderDistance = borderDistanceMap[cellId];
  if (borderDistance >= 4) score += 20;
  else if (borderDistance <= 2) score -= 50;

  const coastDistance = coastDistanceMap[cellId];
  if (coastDistance >= 3) score += 15;
  else if (coastDistance <= 1) score -= 18;

  const edgeDistance = Math.min(
    cell.site[0],
    mapWidth - cell.site[0],
    cell.site[1],
    mapHeight - cell.site[1]
  );
  if (edgeDistance >= CAPITAL_VIEWPORT_MARGIN + 6) score += 16;
  else if (edgeDistance < CAPITAL_VIEWPORT_MARGIN) score -= 120;

  for (const hubCellId of hubCellIds) {
    const hubSite = cells[hubCellId].site;
    const distance = Math.hypot(cell.site[0] - hubSite[0], cell.site[1] - hubSite[1]);
    if (distance < 40) score -= 14;
    else if (distance < 70) score -= 6;
  }
  return score;
}

function isCellInSafeViewport(cell: TMapCell, mapWidth: number, mapHeight: number) {
  return (
    cell.site[0] >= CAPITAL_VIEWPORT_MARGIN &&
    cell.site[0] <= mapWidth - CAPITAL_VIEWPORT_MARGIN &&
    cell.site[1] >= CAPITAL_VIEWPORT_MARGIN &&
    cell.site[1] <= mapHeight - CAPITAL_VIEWPORT_MARGIN
  );
}

export function pickEconomicAndCapital(
  cells: TMapCell[],
  owner: Int32Array,
  seed: string,
  mapWidth: number,
  mapHeight: number
): TNation[] {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  return nationIds.map((nationId) => {
    const components = getNationComponents(cells, owner, nationId);
    const mainland = components[0] || [];
    const mainlandSet = new Set(mainland);
    const mainlandCells = mainland.map((cellId) => cells[cellId]);
    const safeMainlandCells = mainlandCells.filter((cell) =>
      isCellInSafeViewport(cell, mapWidth, mapHeight)
    );
    const capitalPool = safeMainlandCells.length > 0 ? safeMainlandCells : mainlandCells;
    const landSize = mainlandCells.length;
    const random = createSeededRandom(`${seed}:capital:${nationId}`);

    let hubCount = 1;
    if (landSize >= MAP_GEOPOLITICAL_CONFIG.hubCount.mediumNationMinLand) hubCount = 3;
    else if (landSize >= MAP_GEOPOLITICAL_CONFIG.hubCount.smallNationMinLand) hubCount = 2;
    hubCount = Math.min(hubCount, MAP_GEOPOLITICAL_CONFIG.hubCount.maxHubsPerNation);

    const scored = capitalPool
      .map((cell) => {
        const flatScore = flatnessScore(cell);
        const waterScore = waterProximityScore(cell, cells);
        const capitalScore = flatScore * 0.6 + waterScore * 0.4;
        return { cellId: cell.id, capitalScore };
      })
      .sort((a, b) => b.capitalScore - a.capitalScore);

    const hubCellIds: number[] = [];
    for (const entry of scored) {
      if (hubCellIds.length >= hubCount) break;
      const candidateSite = cells[entry.cellId].site;
      const tooClose = hubCellIds.some((hubCellId) => {
        const hubSite = cells[hubCellId].site;
        return Math.hypot(candidateSite[0] - hubSite[0], candidateSite[1] - hubSite[1]) < 60;
      });
      if (tooClose) continue;
      hubCellIds.push(entry.cellId);
    }

    if (hubCellIds.length === 0 && scored.length > 0) hubCellIds.push(scored[0].cellId);
    const borderDistanceMap = getLandDistanceMap(cells, mainlandSet, (cellId) => {
      for (const neighborId of cells[cellId].neighbors) {
        if (!mainlandSet.has(neighborId)) return true;
      }
      return false;
    });
    const coastDistanceMap = getLandDistanceMap(cells, mainlandSet, (cellId) => {
      for (const neighborId of cells[cellId].neighbors) {
        if (!isLand(cells[neighborId])) return true;
      }
      return false;
    });

    const capitalCandidates = mainland
      .filter((cellId) => isCellInSafeViewport(cells[cellId], mapWidth, mapHeight))
      .map((cellId) => ({
        cellId,
        score: strategicCapitalScore(
          cellId,
          cells,
          borderDistanceMap,
          coastDistanceMap,
          hubCellIds,
          mapWidth,
          mapHeight
        ),
      }))
      .filter((entry) => entry.score > -200)
      .sort((a, b) => b.score - a.score);

    const topCount = Math.max(1, Math.floor(capitalCandidates.length * 0.1));
    const topCandidates = capitalCandidates.slice(0, topCount);
    let capitalCellId: number | null = null;

    if (topCandidates.length > 0) {
      let totalWeight = 0;
      for (const candidate of topCandidates) {
        totalWeight += Math.max(1, candidate.score + 160);
      }
      let needle = random() * totalWeight;
      for (const candidate of topCandidates) {
        needle -= Math.max(1, candidate.score + 160);
        if (needle <= 0) {
          capitalCellId = candidate.cellId;
          break;
        }
      }
      if (capitalCellId === null) capitalCellId = topCandidates[topCandidates.length - 1].cellId;
    } else if (hubCellIds.length > 0) {
      const safeHubId = hubCellIds.find((cellId) =>
        isCellInSafeViewport(cells[cellId], mapWidth, mapHeight)
      );
      capitalCellId = safeHubId ?? hubCellIds[0];
    }

    if (capitalCellId === null && capitalPool.length > 0) {
      capitalCellId = capitalPool[0].id;
    }

    const nationName = createRegionalName(seed, 'nation', nationId);

    return {
      id: nationId,
      name: nationName,
      capitalCellId,
      capital_coords: capitalCellId !== null ? cells[capitalCellId].site : null,
      economicHubCellIds: hubCellIds,
      economic_hubs_coords: hubCellIds.map((cellId) => cells[cellId].site),
    };
  });
}
