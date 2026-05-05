import { TERRAIN_CONFIG } from 'src/configs/constance';
import { GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { collectConnectedComponents } from 'src/services/core/graph';
import { TFifoQueue } from 'src/services/core/queue';
import { createSeededRandom } from 'src/services/seededRandom';
import { TCell, TNation } from 'src/types/map.types';
import { CAPITAL_VIEWPORT_MARGIN, createRegionalName, isLand } from './geopoliticsShared';

type TNationProfile = Pick<
  TNation,
  | 'populationMultiplier'
  | 'economyMultiplier'
  | 'terrainPopulationModifiers'
  | 'terrainEconomyModifiers'
>;

const defaultTerrainConfig = {
  'deep-water': 0,
  'shallow-water': 0,
  'inland-sea': 0,
  coast: 1,
  lake: 1,
  plains: 1,
  plateau: 1,
  forest: 1,
  desert: 1,
  badlands: 1,
  swamp: 1,
  valley: 1,
  hills: 1,
  mountains: 1,
  volcanic: 1,
  tundra: 1,
};

function getDistanceMap(
  cells: TCell[],
  nationLand: Set<number>,
  sourcePredicate: (cellId: number) => boolean
) {
  const distances = new Int32Array(cells.length);
  distances.fill(-1);
  const queue = new TFifoQueue<number>();

  for (const cellId of nationLand) {
    if (!sourcePredicate(cellId)) continue;
    distances[cellId] = 0;
    queue.enqueue(cellId);
  }

  while (queue.size > 0) {
    const current = queue.dequeue() as number;
    const currentDistance = distances[current];
    for (const neighborId of cells[current].neighbors) {
      if (!nationLand.has(neighborId)) continue;
      if (distances[neighborId] >= 0) continue;
      distances[neighborId] = currentDistance + 1;
      queue.enqueue(neighborId);
    }
  }
  return distances;
}

function getNationComponents(cells: TCell[], owner: Int32Array, nationId: number) {
  return collectConnectedComponents(
    cells,
    (cell) => owner[cell.id] === nationId && isLand(cell),
    (_current, neighbor) => owner[neighbor.id] === nationId && isLand(neighbor),
    true
  );
}

function waterProximityScore(cell: TCell, cells: TCell[]) {
  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.isWater || neighbor.isRiver || neighbor.isLake) return 1;
  }

  const visitedWater = new Set<number>();
  for (const neighborId of cell.neighbors) {
    for (const secondNeighborId of cells[neighborId].neighbors) {
      const secondNeighbor = cells[secondNeighborId];
      if (secondNeighbor.isWater || secondNeighbor.isRiver || secondNeighbor.isLake) {
        visitedWater.add(secondNeighborId);
      }
    }
  }
  return Math.min(0.85, visitedWater.size * 0.08);
}

function normalize(value: number, min: number, max: number) {
  return (value - min) / (max - min + 1e-9);
}

function getMetricRange(values: number[]) {
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

function distanceScore(
  distance: number,
  thresholds: { nearMax: number; farMin: number; nearPenalty: number; farBonus: number }
) {
  if (distance === -1) return 0;
  if (distance <= thresholds.nearMax) return -thresholds.nearPenalty;
  if (distance >= thresholds.farMin) return thresholds.farBonus;
  return 0;
}

function terrainSafetyScore(cell: TCell) {
  if (cell.terrain === 'mountains' || cell.terrain === 'desert' || cell.terrain === 'forest') {
    return -0.7;
  }
  if (cell.terrain === 'badlands' || cell.terrain === 'volcanic' || cell.terrain === 'swamp') {
    return -0.35;
  }
  if (cell.terrain === 'hills' || cell.terrain === 'tundra') return -0.1;
  if (cell.terrain === 'coast') return -0.08;
  if (cell.terrain === 'plains') return 0.2;
  if (cell.terrain === 'valley') return 0.16;
  if (cell.terrain === 'plateau') return 0.08;
  return 0;
}

function scoreCapital(
  cell: TCell,
  populationNorm: number,
  economyNorm: number,
  borderDistanceMap: Int32Array,
  coastDistanceMap: Int32Array,
  mapWidth: number,
  mapHeight: number
) {
  const borderDistance = borderDistanceMap[cell.id];
  const coastDistance = coastDistanceMap[cell.id];

  const borderCentrality = distanceScore(borderDistance, {
    nearMax: 2,
    farMin: 4,
    nearPenalty: 0.35,
    farBonus: 0.14,
  });
  const coastCentrality = distanceScore(coastDistance, {
    nearMax: 1,
    farMin: 3,
    nearPenalty: 0.12,
    farBonus: 0.1,
  });

  const edgeDistance = Math.min(
    cell.site[0],
    mapWidth - cell.site[0],
    cell.site[1],
    mapHeight - cell.site[1]
  );
  const edgeSafety =
    edgeDistance < CAPITAL_VIEWPORT_MARGIN
      ? -0.9
      : edgeDistance >= CAPITAL_VIEWPORT_MARGIN + 6
        ? 0.1
        : 0;

  const centralityScore = borderCentrality + coastCentrality + edgeSafety;
  const safetyScore = terrainSafetyScore(cell);

  return populationNorm * 0.34 + economyNorm * 0.28 + centralityScore * 0.23 + safetyScore * 0.15;
}

function economicHubScore(
  cell: TCell,
  cells: TCell[],
  populationNorm: number,
  economyNorm: number
) {
  const geoScore = TERRAIN_CONFIG[cell.terrain].flatness;
  const waterScore = waterProximityScore(cell, cells);
  return populationNorm * 0.35 + economyNorm * 0.4 + geoScore * 0.15 + waterScore * 0.1;
}

function isInBounds(cell: TCell, mapWidth: number, mapHeight: number) {
  return (
    cell.site[0] >= CAPITAL_VIEWPORT_MARGIN &&
    cell.site[0] <= mapWidth - CAPITAL_VIEWPORT_MARGIN &&
    cell.site[1] >= CAPITAL_VIEWPORT_MARGIN &&
    cell.site[1] <= mapHeight - CAPITAL_VIEWPORT_MARGIN
  );
}

export function pickEconomicAndCapital(
  cells: TCell[],
  owner: Int32Array,
  seed: string,
  mapWidth: number,
  mapHeight: number,
  nationProfiles: Map<number, TNationProfile>
): TNation[] {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  return nationIds.map((nationId) => {
    const components = getNationComponents(cells, owner, nationId);
    const mainland = components[0] || [];
    const mainlandSet = new Set(mainland);
    const mainlandCells = mainland.map((cellId) => cells[cellId]);
    const safeMainlandCells = mainlandCells.filter((cell) => isInBounds(cell, mapWidth, mapHeight));
    const candidateMainlandCells = safeMainlandCells.length > 0 ? safeMainlandCells : mainlandCells;
    const landSize = mainlandCells.length;
    const random = createSeededRandom(`${seed}:capital:${nationId}`);

    let hubCount = 1;
    if (landSize >= GEOPOLITICAL_CONFIG.hubCount.mediumNationMinLand) hubCount = 3;
    else if (landSize >= GEOPOLITICAL_CONFIG.hubCount.smallNationMinLand) hubCount = 2;
    hubCount = Math.min(hubCount, GEOPOLITICAL_CONFIG.hubCount.maxHubsPerNation);

    const borderDistanceMap = getDistanceMap(cells, mainlandSet, (cellId) => {
      for (const neighborId of cells[cellId].neighbors) {
        if (!mainlandSet.has(neighborId)) return true;
      }
      return false;
    });
    const coastDistanceMap = getDistanceMap(cells, mainlandSet, (cellId) => {
      for (const neighborId of cells[cellId].neighbors) {
        if (!isLand(cells[neighborId])) return true;
      }
      return false;
    });

    const populationValues = candidateMainlandCells.map((cell) => Math.max(0, cell.population));
    const economyValues = candidateMainlandCells.map((cell) => Math.max(0, cell.economy));
    const populationRange = getMetricRange(populationValues);
    const economyRange = getMetricRange(economyValues);

    const capitalCandidates = candidateMainlandCells
      .map((cell) => {
        const populationNorm = normalize(
          Math.max(0, cell.population),
          populationRange.min,
          populationRange.max
        );
        const economyNorm = normalize(
          Math.max(0, cell.economy),
          economyRange.min,
          economyRange.max
        );
        return {
          cellId: cell.id,
          score: scoreCapital(
            cell,
            populationNorm,
            economyNorm,
            borderDistanceMap,
            coastDistanceMap,
            mapWidth,
            mapHeight
          ),
        };
      })
      .sort((a, b) => b.score - a.score);

    const topCount = Math.max(1, Math.floor(capitalCandidates.length * 0.1));
    const topCandidates = capitalCandidates.slice(0, topCount);
    let capitalCellId: number | null = null;

    if (topCandidates.length > 0) {
      let totalWeight = 0;
      for (const candidate of topCandidates) {
        totalWeight += Math.max(
          1e-6,
          candidate.score - (topCandidates[topCandidates.length - 1]?.score ?? 0) + 1e-6
        );
      }
      let needle = random() * totalWeight;
      for (const candidate of topCandidates) {
        needle -= Math.max(
          1e-6,
          candidate.score - (topCandidates[topCandidates.length - 1]?.score ?? 0) + 1e-6
        );
        if (needle <= 0) {
          capitalCellId = candidate.cellId;
          break;
        }
      }
      if (capitalCellId === null) capitalCellId = topCandidates[topCandidates.length - 1].cellId;
    }

    if (capitalCellId === null && capitalCandidates.length > 0) {
      capitalCellId = capitalCandidates[0].cellId;
    }

    const hubScored = candidateMainlandCells
      .map((cell) => {
        const populationNorm = normalize(
          Math.max(0, cell.population),
          populationRange.min,
          populationRange.max
        );
        const economyNorm = normalize(
          Math.max(0, cell.economy),
          economyRange.min,
          economyRange.max
        );
        let score = economicHubScore(cell, cells, populationNorm, economyNorm);

        if (capitalCellId !== null) {
          const capitalSite = cells[capitalCellId].site;
          const distToCapital = Math.hypot(
            cell.site[0] - capitalSite[0],
            cell.site[1] - capitalSite[1]
          );
          if (distToCapital < 45) score -= 0.12;
          else if (distToCapital < 70) score -= 0.05;
        }

        return { cellId: cell.id, score };
      })
      .sort((a, b) => b.score - a.score);

    const hubCellIds: number[] = [];
    for (const entry of hubScored) {
      if (hubCellIds.length >= hubCount) break;
      const candidateSite = cells[entry.cellId].site;
      const tooClose = hubCellIds.some((hubCellId) => {
        const hubSite = cells[hubCellId].site;
        return Math.hypot(candidateSite[0] - hubSite[0], candidateSite[1] - hubSite[1]) < 60;
      });
      if (tooClose) continue;
      hubCellIds.push(entry.cellId);
    }

    if (hubCellIds.length === 0 && hubScored.length > 0) hubCellIds.push(hubScored[0].cellId);

    if (capitalCellId === null && candidateMainlandCells.length > 0) {
      capitalCellId = candidateMainlandCells[0].id;
    }
    const nationName = createRegionalName(seed, 'nation', nationId);
    const profile = nationProfiles.get(nationId);

    return {
      id: nationId,
      name: nationName,
      populationMultiplier: profile?.populationMultiplier ?? 1,
      economyMultiplier: profile?.economyMultiplier ?? 1,
      terrainPopulationModifiers: profile?.terrainPopulationModifiers ?? defaultTerrainConfig,
      terrainEconomyModifiers: profile?.terrainEconomyModifiers ?? defaultTerrainConfig,
      capitalCellId,
      capital_coords: capitalCellId !== null ? cells[capitalCellId].site : null,
      economicHubCellIds: hubCellIds,
      economic_hubs_coords: hubCellIds.map((cellId) => cells[cellId].site),
    };
  });
}
