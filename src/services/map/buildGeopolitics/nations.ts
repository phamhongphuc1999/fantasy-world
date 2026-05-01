import { MAP_GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { TCustomCountryMode, TMapCell } from 'src/types/global';
import {
  getBoundaryStepCost,
  getNationCount,
  getNationNeighborCounts,
  isLand,
  makeFrontierHash,
} from './shared';

const LARGE_LAND_COMPONENT_MIN_CELLS = 200;

type TConnectivityContext = {
  componentByCellId: Int32Array;
  componentCellIds: number[][];
  componentSizes: number[];
  largeComponentIds: Set<number>;
  boundaryCellsByComponentId: number[][];
};

function buildConnectivityContext(cells: TMapCell[]): TConnectivityContext {
  const componentByCellId = new Int32Array(cells.length);
  componentByCellId.fill(-1);
  const componentCellIds: number[][] = [];
  const componentSizes: number[] = [];
  const boundaryCellsByComponentId: number[][] = [];
  const visited = new Uint8Array(cells.length);

  let componentId = 0;
  for (const cell of cells) {
    if (!isLand(cell) || visited[cell.id] === 1) continue;

    const queue = [cell.id];
    const component: number[] = [];
    const boundaries: number[] = [];
    visited[cell.id] = 1;
    componentByCellId[cell.id] = componentId;

    while (queue.length > 0) {
      const currentId = queue.pop() as number;
      component.push(currentId);

      let touchesWater = false;
      for (const neighborId of cells[currentId].neighbors) {
        if (!isLand(cells[neighborId])) {
          touchesWater = true;
          continue;
        }
        if (visited[neighborId] === 1) continue;
        visited[neighborId] = 1;
        componentByCellId[neighborId] = componentId;
        queue.push(neighborId);
      }
      if (touchesWater) boundaries.push(currentId);
    }

    componentCellIds.push(component);
    componentSizes.push(component.length);
    boundaryCellsByComponentId.push(boundaries.length > 0 ? boundaries : [component[0] as number]);
    componentId += 1;
  }

  const largeComponentIds = new Set<number>();
  for (let id = 0; id < componentSizes.length; id += 1) {
    if (componentSizes[id] >= LARGE_LAND_COMPONENT_MIN_CELLS) largeComponentIds.add(id);
  }

  return {
    componentByCellId,
    componentCellIds,
    componentSizes,
    largeComponentIds,
    boundaryCellsByComponentId,
  };
}

function estimateWaterCellsBetweenComponents(
  cells: TMapCell[],
  context: TConnectivityContext,
  leftComponentId: number,
  rightComponentId: number
) {
  if (leftComponentId === rightComponentId) return 0;
  const leftBoundaries = context.boundaryCellsByComponentId[leftComponentId] || [];
  const rightBoundaries = context.boundaryCellsByComponentId[rightComponentId] || [];
  if (leftBoundaries.length === 0 || rightBoundaries.length === 0) return 0;

  const sampleLeft = leftBoundaries.slice(0, Math.min(24, leftBoundaries.length));
  const sampleRight = rightBoundaries.slice(0, Math.min(24, rightBoundaries.length));

  let minDistance = Number.POSITIVE_INFINITY;
  for (const leftId of sampleLeft) {
    for (const rightId of sampleRight) {
      const dx = cells[leftId].site[0] - cells[rightId].site[0];
      const dy = cells[leftId].site[1] - cells[rightId].site[1];
      const distance = Math.hypot(dx, dy);
      if (distance < minDistance) minDistance = distance;
    }
  }
  if (!Number.isFinite(minDistance)) return 0;

  const left = cells[sampleLeft[0] as number];
  const avgNeighborDistance =
    left.neighbors.length > 0
      ? left.neighbors.reduce((sum, neighborId) => {
          const neighbor = cells[neighborId];
          return sum + Math.hypot(left.site[0] - neighbor.site[0], left.site[1] - neighbor.site[1]);
        }, 0) / left.neighbors.length
      : 1;

  return Math.max(0, Math.round(minDistance / Math.max(1, avgNeighborDistance)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSeedSuitability(cellId: number, cells: TMapCell[]) {
  const cell = cells[cellId];
  if (!isLand(cell)) return -1000;

  let score = 0;
  if (cell.terrain === 'plains') score += 2.3;
  if (cell.terrain === 'valley') score += 1.9;
  if (cell.terrain === 'forest') score += 0.6;
  if (cell.terrain === 'mountains' || cell.terrain === 'volcanic') score -= 2.8;
  if (cell.terrain === 'desert' || cell.terrain === 'badlands') score -= 1.8;

  if (cell.isRiver) score += 1.8;
  if (cell.isLake) score += 1.3;

  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.isWater && !neighbor.isLake) score += 0.22;
    if (neighbor.isRiver || neighbor.isLake) score += 0.35;
  }
  score += cell.suitability * 1.1;
  return score;
}

function selectNationSeeds(
  cells: TMapCell[],
  nationCount: number,
  seed: string,
  connectivity: TConnectivityContext
) {
  const candidates = cells
    .map((_, cellId) => ({
      cellId,
      score: getSeedSuitability(cellId, cells),
      componentId: connectivity.componentByCellId[cellId],
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return [];
  const seeds: number[] = [candidates[0].cellId];
  const seededLargeComponentIds = new Set<number>();
  const firstComponentId = connectivity.componentByCellId[candidates[0].cellId];
  if (connectivity.largeComponentIds.has(firstComponentId)) {
    seededLargeComponentIds.add(firstComponentId);
  }
  const seedHash = makeFrontierHash(seed, 'nation-seed-soft-geo');

  while (seeds.length < nationCount) {
    let bestCellId = -1;
    let bestScore = -Infinity;
    let bestComponentId = -1;

    for (const candidate of candidates) {
      if (seeds.includes(candidate.cellId)) continue;
      if (candidate.componentId < 0) continue;

      const point = cells[candidate.cellId].site;
      let minDistance = Infinity;
      for (const seedCellId of seeds) {
        const seedPoint = cells[seedCellId].site;
        minDistance = Math.min(
          minDistance,
          Math.hypot(point[0] - seedPoint[0], point[1] - seedPoint[1])
        );
      }

      let totalScore = candidate.score * 1.15 + Math.sqrt(minDistance) * 0.18;

      const isLargeComponent = connectivity.largeComponentIds.has(candidate.componentId);
      const componentSize = connectivity.componentSizes[candidate.componentId] || 0;
      const alreadySeededInComponent = seeds.some(
        (seedCellId) => connectivity.componentByCellId[seedCellId] === candidate.componentId
      );

      let nearestSeededComponentId = -1;
      let nearestWaterGap = Number.POSITIVE_INFINITY;
      for (const seedCellId of seeds) {
        const seededComponentId = connectivity.componentByCellId[seedCellId];
        if (seededComponentId < 0 || seededComponentId === candidate.componentId) continue;
        const gap = estimateWaterCellsBetweenComponents(
          cells,
          connectivity,
          candidate.componentId,
          seededComponentId
        );
        if (gap < nearestWaterGap) {
          nearestWaterGap = gap;
          nearestSeededComponentId = seededComponentId;
        }
      }

      // Soft geography bias:
      // - Large + far disconnected components: moderately prefer separate seeds.
      // - Small + close/similar components: prefer sharing nations (fewer seeds across islands).
      if (isLargeComponent && !alreadySeededInComponent) {
        const gapFactor = Number.isFinite(nearestWaterGap)
          ? clamp((nearestWaterGap - 6) / 18, 0, 1)
          : 0.5;
        totalScore += 1.8 + gapFactor * 3.2;
      } else if (isLargeComponent && alreadySeededInComponent) {
        totalScore -= 0.7;
      }

      if (!isLargeComponent && !alreadySeededInComponent && nearestSeededComponentId >= 0) {
        const nearestSize = connectivity.componentSizes[nearestSeededComponentId] || 1;
        const sizeSimilarity =
          1 - Math.abs(componentSize - nearestSize) / Math.max(componentSize, nearestSize);
        const similarity = clamp(sizeSimilarity, 0, 1);
        const closeGapFactor = Number.isFinite(nearestWaterGap)
          ? clamp(1 - nearestWaterGap / 12, 0, 1)
          : 0;

        // Nearby and similarly-sized small islands should often stay under the same nation.
        const groupingBias = closeGapFactor * (0.55 + similarity * 0.45);
        totalScore -= groupingBias * 2.4;

        // If small island is far from existing seeded components, allow new nation seed more easily.
        if (nearestWaterGap > 16) totalScore += 0.65;
      }

      const noise = Math.sin((candidate.cellId * 2654435761 + seedHash) * 0.000001) * 0.35;
      totalScore += noise;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCellId = candidate.cellId;
        bestComponentId = candidate.componentId;
      }
    }
    if (bestCellId < 0) break;
    seeds.push(bestCellId);
    if (connectivity.largeComponentIds.has(bestComponentId)) {
      seededLargeComponentIds.add(bestComponentId);
    }
  }
  return seeds;
}

export function buildLandNations(
  cells: TMapCell[],
  seed: string,
  customCountryMode: TCustomCountryMode,
  customCountryCount: number
) {
  const profile = MAP_GEOPOLITICAL_CONFIG.borderLevels.country;
  const landCellCount = cells.filter(isLand).length;
  const nationCount = getNationCount(customCountryMode, customCountryCount, seed, landCellCount);
  const connectivity = buildConnectivityContext(cells);
  const seeds = selectNationSeeds(cells, nationCount, seed, connectivity);
  const owner = new Int32Array(cells.length);
  const cost = new Float64Array(cells.length);
  owner.fill(-1);
  cost.fill(Number.POSITIVE_INFINITY);

  const frontier: Array<{ cellId: number; nationId: number; cost: number }> = [];
  for (let nationId = 0; nationId < seeds.length; nationId += 1) {
    const cellId = seeds[nationId];
    owner[cellId] = nationId;
    cost[cellId] = 0;
    frontier.push({ cellId, nationId, cost: 0 });
  }

  const seedHash = makeFrontierHash(seed, 'geopolitics:frontier');

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift() as { cellId: number; nationId: number; cost: number };
    if (current.cost > cost[current.cellId]) continue;

    const currentCell = cells[current.cellId];
    for (const neighborId of currentCell.neighbors) {
      const neighbor = cells[neighborId];
      if (!isLand(neighbor)) continue;
      let stepCost = getBoundaryStepCost(
        cells,
        owner,
        current.cellId,
        neighborId,
        current.nationId,
        seedHash,
        profile
      );
      if (customCountryMode === 'dominant') {
        stepCost *= current.nationId === 0 ? 0.72 : 1.18;
      }
      stepCost += MAP_GEOPOLITICAL_CONFIG.frontierNoiseWeight * 0.15;
      const nextCost = current.cost + Math.max(0.2, stepCost);

      if (nextCost < cost[neighborId]) {
        cost[neighborId] = nextCost;
        owner[neighborId] = current.nationId;
        frontier.push({ cellId: neighborId, nationId: current.nationId, cost: nextCost });
      }
    }
  }
  return owner;
}

export function alignNaturalTerrainClusters(cells: TMapCell[], owner: Int32Array) {
  const targetTerrains = new Set(['mountains', 'hills', 'forest', 'swamp', 'tundra']);
  const passes = 2;

  for (let pass = 0; pass < passes; pass += 1) {
    const nextOwner = Int32Array.from(owner);

    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      const cell = cells[cellId];
      if (!isLand(cell)) continue;
      if (!targetTerrains.has(cell.terrain)) continue;
      if (owner[cellId] < 0) continue;

      const nationCounts = new Map<number, number>();
      let sameTerrainNeighbors = 0;
      for (const neighborId of cell.neighbors) {
        const neighbor = cells[neighborId];
        if (!isLand(neighbor)) continue;
        if (neighbor.terrain !== cell.terrain) continue;
        sameTerrainNeighbors += 1;
        const nationId = owner[neighborId];
        if (nationId < 0) continue;
        nationCounts.set(nationId, (nationCounts.get(nationId) || 0) + 1);
      }

      if (sameTerrainNeighbors < 3) continue;
      let bestNationId = owner[cellId];
      let bestCount = nationCounts.get(bestNationId) || 0;
      for (const [nationId, count] of nationCounts) {
        if (count > bestCount) {
          bestNationId = nationId;
          bestCount = count;
        }
      }
      if (bestNationId !== owner[cellId] && bestCount >= 3) {
        nextOwner[cellId] = bestNationId;
      }
    }

    owner.set(nextOwner);
  }
}

export function enforceMinimumNationArea(cells: TMapCell[], owner: Int32Array) {
  const landCellIds = cells.filter(isLand).map((cell) => cell.id);
  const minNationCells = Math.max(
    MAP_GEOPOLITICAL_CONFIG.minNationLandCells,
    Math.floor(landCellIds.length * MAP_GEOPOLITICAL_CONFIG.minNationLandRatio)
  );

  const sizeByNation = new Map<number, number>();
  for (const cellId of landCellIds) {
    if (owner[cellId] < 0) continue;
    sizeByNation.set(owner[cellId], (sizeByNation.get(owner[cellId]) || 0) + 1);
  }

  const smallNationIds = Array.from(sizeByNation.entries())
    .filter(([, size]) => size < minNationCells)
    .map(([nationId]) => nationId);

  for (const nationId of smallNationIds) {
    const nationCells = landCellIds.filter((cellId) => owner[cellId] === nationId);
    for (const cellId of nationCells) {
      const neighborCounts = getNationNeighborCounts(cells, owner, cellId);
      let bestNationId = -1;
      let bestCount = 0;

      for (const [candidateNationId, count] of neighborCounts) {
        if (candidateNationId === nationId) continue;
        if (count > bestCount) {
          bestCount = count;
          bestNationId = candidateNationId;
        }
      }
      if (bestNationId < 0) {
        const point = cells[cellId].site;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const candidateCellId of landCellIds) {
          const candidateNationId = owner[candidateCellId];
          if (candidateNationId < 0 || candidateNationId === nationId) continue;
          const candidatePoint = cells[candidateCellId].site;
          const distance = Math.hypot(point[0] - candidatePoint[0], point[1] - candidatePoint[1]);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestNationId = candidateNationId;
          }
        }
      }
      if (bestNationId >= 0) owner[cellId] = bestNationId;
    }
  }
}

export function enforceMainlandContiguity(cells: TMapCell[], owner: Int32Array) {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);

  for (const nationId of nationIds) {
    const nationCells = cells
      .filter((cell) => isLand(cell) && owner[cell.id] === nationId)
      .map((cell) => cell.id);
    if (nationCells.length === 0) continue;

    const visited = new Set<number>();
    const components: number[][] = [];

    for (const startCellId of nationCells) {
      if (visited.has(startCellId)) continue;
      const queue = [startCellId];
      const component: number[] = [];
      visited.add(startCellId);

      while (queue.length > 0) {
        const current = queue.pop() as number;
        component.push(current);

        for (const neighborId of cells[current].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          if (!isLand(cells[neighborId])) continue;
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
      components.push(component);
    }

    if (components.length <= 1) continue;
    components.sort((a, b) => b.length - a.length);

    for (let componentIndex = 1; componentIndex < components.length; componentIndex += 1) {
      for (const cellId of components[componentIndex]) {
        const neighborCounts = getNationNeighborCounts(cells, owner, cellId);
        let bestNationId = -1;
        let bestCount = 0;

        for (const [candidateNationId, count] of neighborCounts) {
          if (candidateNationId === nationId) continue;
          if (count > bestCount) {
            bestCount = count;
            bestNationId = candidateNationId;
          }
        }
        if (bestNationId >= 0) owner[cellId] = bestNationId;
      }
    }
  }
}

export function fillUnclaimedLand(cells: TMapCell[], owner: Int32Array) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      if (!isLand(cells[cellId]) || owner[cellId] >= 0) continue;
      const neighborCounts = getNationNeighborCounts(cells, owner, cellId);
      let bestNationId = -1;
      let bestCount = 0;
      for (const [nationId, count] of neighborCounts) {
        if (count > bestCount) {
          bestCount = count;
          bestNationId = nationId;
        }
      }
      if (bestNationId >= 0) {
        owner[cellId] = bestNationId;
        changed = true;
      }
    }
  }
}

export function ensureAllLandClaimed(cells: TMapCell[], owner: Int32Array) {
  const claimedLand = cells.filter((cell) => isLand(cell) && owner[cell.id] >= 0);
  if (claimedLand.length === 0) return;

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (!isLand(cells[cellId])) continue;
    if (owner[cellId] >= 0) continue;

    let bestNationId = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    const point = cells[cellId].site;

    for (const claimedCell of claimedLand) {
      const distance = Math.hypot(point[0] - claimedCell.site[0], point[1] - claimedCell.site[1]);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestNationId = owner[claimedCell.id];
      }
    }
    if (bestNationId >= 0) owner[cellId] = bestNationId;
  }
}
