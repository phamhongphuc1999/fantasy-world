import { GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { runMultiSourceExpansion } from 'src/services/map/core/expansionEngine';
import { clamp } from 'src/services/map/core/math';
import { sortStableDescByScore } from 'src/services/map/core/sort';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { TMapCell } from 'src/types/map.types';
import { getNationSeedSuitability } from './costPolicies';
import {
  getBoundaryStepCost,
  getNationCount,
  getNationNeighborCounts,
  isLand,
  makeFrontierHash,
} from './geopoliticsShared';

const LARGE_LAND_COMPONENT_MIN_CELLS = 200;

type TConnectivityContext = {
  cellId: Int32Array;
  componentSizes: number[];
  largeComponentIds: Set<number>;
  boundaryCells: number[][];
};

function buildConnectivityContext(cells: TMapCell[]): TConnectivityContext {
  const cellId = new Int32Array(cells.length);
  cellId.fill(-1);
  const componentSizes: number[] = [];
  const boundaryCells: number[][] = [];
  const visited = new Uint8Array(cells.length);
  const stack: number[] = [];

  let componentId = 0;
  for (const cell of cells) {
    if (!isLand(cell) || visited[cell.id] === 1) continue;

    stack.length = 0;
    stack.push(cell.id);
    const component: number[] = [];
    const boundaries: number[] = [];
    visited[cell.id] = 1;
    cellId[cell.id] = componentId;

    while (stack.length > 0) {
      const currentId = stack.pop() as number;
      component.push(currentId);

      let touchesWater = false;
      for (const neighborId of cells[currentId].neighbors) {
        if (!isLand(cells[neighborId])) {
          touchesWater = true;
          continue;
        }
        if (visited[neighborId] === 1) continue;
        visited[neighborId] = 1;
        cellId[neighborId] = componentId;
        stack.push(neighborId);
      }
      if (touchesWater) boundaries.push(currentId);
    }

    componentSizes.push(component.length);
    boundaryCells.push(boundaries.length > 0 ? boundaries : [component[0] as number]);
    componentId += 1;
  }

  const largeComponentIds = new Set<number>();
  for (let id = 0; id < componentSizes.length; id += 1) {
    if (componentSizes[id] >= LARGE_LAND_COMPONENT_MIN_CELLS) largeComponentIds.add(id);
  }

  return { cellId, componentSizes, largeComponentIds, boundaryCells };
}

function estimateWaterCells(
  cells: TMapCell[],
  context: TConnectivityContext,
  leftComponentId: number,
  rightComponentId: number
) {
  if (leftComponentId === rightComponentId) return 0;
  const leftBoundaries = context.boundaryCells[leftComponentId] || [];
  const rightBoundaries = context.boundaryCells[rightComponentId] || [];
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

function tryGrowNationToMinimum(
  cells: TMapCell[],
  owner: Int32Array,
  nationId: number,
  sizeByNation: Map<number, number>,
  minNationCells: number
) {
  let currentSize = sizeByNation.get(nationId) || 0;
  if (currentSize >= minNationCells) return true;

  const nationCellIds = new Set<number>();
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (owner[cellId] === nationId && isLand(cells[cellId])) nationCellIds.add(cellId);
  }
  if (nationCellIds.size === 0) return false;

  while (currentSize < minNationCells) {
    let bestCandidateCellId = -1;
    let bestDonorNationId = -1;
    let bestScore = -Infinity;

    for (const nationCellId of nationCellIds) {
      for (const neighborId of cells[nationCellId].neighbors) {
        if (!isLand(cells[neighborId])) continue;
        if (owner[neighborId] === nationId) continue;
        const donorNationId = owner[neighborId];
        if (donorNationId < 0) continue;
        const donorSize = sizeByNation.get(donorNationId) || 0;
        if (donorSize <= minNationCells) continue;

        let sharedBorder = 0;
        for (const nearId of cells[neighborId].neighbors) {
          if (owner[nearId] === nationId) sharedBorder += 1;
        }
        const score = sharedBorder * 10 - cells[neighborId].elevation * 0.1;
        if (score > bestScore) {
          bestScore = score;
          bestCandidateCellId = neighborId;
          bestDonorNationId = donorNationId;
        }
      }
    }

    if (bestCandidateCellId < 0 || bestDonorNationId < 0) break;
    owner[bestCandidateCellId] = nationId;
    nationCellIds.add(bestCandidateCellId);
    currentSize += 1;
    sizeByNation.set(nationId, currentSize);
    sizeByNation.set(
      bestDonorNationId,
      Math.max(0, (sizeByNation.get(bestDonorNationId) || 0) - 1)
    );
  }

  return currentSize >= minNationCells;
}

function buildNationSizeMapForLandCells(landCellIds: number[], owner: Int32Array) {
  const sizeByNation = new Map<number, number>();
  for (const cellId of landCellIds) {
    if (owner[cellId] < 0) continue;
    sizeByNation.set(owner[cellId], (sizeByNation.get(owner[cellId]) || 0) + 1);
  }
  return sizeByNation;
}

function getSmallNationIds(sizeByNation: Map<number, number>, minNationCells: number) {
  return Array.from(sizeByNation.entries())
    .filter(([, size]) => size < minNationCells)
    .sort((a, b) => a[1] - b[1])
    .map(([nationId]) => nationId);
}

function findNearestForeignNationId(
  cells: TMapCell[],
  owner: Int32Array,
  landCellIds: number[],
  sourceCellId: number,
  sourceNationId: number
) {
  const point = cells[sourceCellId].site;
  let bestNationId = -1;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidateCellId of landCellIds) {
    const candidateNationId = owner[candidateCellId];
    if (candidateNationId < 0 || candidateNationId === sourceNationId) continue;
    const candidatePoint = cells[candidateCellId].site;
    const distance = Math.hypot(point[0] - candidatePoint[0], point[1] - candidatePoint[1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestNationId = candidateNationId;
    }
  }
  return bestNationId;
}

function getNeighborNationIds(cells: TMapCell[], owner: Int32Array, nationId: number) {
  const neighbors = new Set<number>();
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (!isLand(cells[cellId])) continue;
    if (owner[cellId] !== nationId) continue;
    for (const neighborId of cells[cellId].neighbors) {
      if (!isLand(cells[neighborId])) continue;
      const neighborNationId = owner[neighborId];
      if (neighborNationId >= 0 && neighborNationId !== nationId) neighbors.add(neighborNationId);
    }
  }
  return Array.from(neighbors);
}

function transferBorderCell(
  cells: TMapCell[],
  owner: Int32Array,
  sizeByNation: Map<number, number>,
  fromNationId: number,
  toNationId: number
) {
  let bestCellId = -1;
  let bestScore = -1;

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (!isLand(cells[cellId])) continue;
    if (owner[cellId] !== fromNationId) continue;

    let touchesTarget = false;
    let targetNeighborCount = 0;
    for (const neighborId of cells[cellId].neighbors) {
      if (!isLand(cells[neighborId])) continue;
      if (owner[neighborId] === toNationId) {
        touchesTarget = true;
        targetNeighborCount += 1;
      }
    }
    if (!touchesTarget) continue;

    if (targetNeighborCount > bestScore) {
      bestScore = targetNeighborCount;
      bestCellId = cellId;
    }
  }

  if (bestCellId < 0) return false;
  owner[bestCellId] = toNationId;
  sizeByNation.set(fromNationId, Math.max(0, (sizeByNation.get(fromNationId) || 0) - 1));
  sizeByNation.set(toNationId, (sizeByNation.get(toNationId) || 0) + 1);
  return true;
}

function borrowCellForNation(
  cells: TMapCell[],
  owner: Int32Array,
  sizeByNation: Map<number, number>,
  targetNationId: number,
  minNationCells: number,
  visited: Set<number>,
  donorFloor = minNationCells
): boolean {
  const neighborNationIds = getNeighborNationIds(cells, owner, targetNationId).sort(
    (left, right) => {
      return (sizeByNation.get(right) || 0) - (sizeByNation.get(left) || 0);
    }
  );

  for (const neighborNationId of neighborNationIds) {
    const neighborSize = sizeByNation.get(neighborNationId) || 0;
    if (neighborSize > donorFloor) {
      if (transferBorderCell(cells, owner, sizeByNation, neighborNationId, targetNationId))
        return true;
      continue;
    }
    if (visited.has(neighborNationId)) continue;
    visited.add(neighborNationId);
    const grown = borrowCellForNation(
      cells,
      owner,
      sizeByNation,
      neighborNationId,
      minNationCells,
      visited,
      donorFloor
    );
    if (grown && (sizeByNation.get(neighborNationId) || 0) > donorFloor) {
      if (transferBorderCell(cells, owner, sizeByNation, neighborNationId, targetNationId))
        return true;
    }
  }
  return false;
}

function selectNationSeeds(
  cells: TMapCell[],
  nationCount: number,
  seed: string,
  connectivity: TConnectivityContext,
  minComponentSize = 1
) {
  const allLandCandidates = sortStableDescByScore(
    cells
      .map((_, cellId) => ({
        cellId,
        score: getNationSeedSuitability(cellId, cells),
        componentId: connectivity.cellId[cellId],
      }))
      .filter((entry) => isLand(cells[entry.cellId]))
  );
  const candidates =
    minComponentSize > 1
      ? allLandCandidates.filter(
          (entry) => (connectivity.componentSizes[entry.componentId] || 0) >= minComponentSize
        )
      : allLandCandidates;
  const sourceCandidates =
    candidates.length >= nationCount || minComponentSize <= 1 ? candidates : allLandCandidates;

  if (sourceCandidates.length === 0) return [];
  const seeds: number[] = [sourceCandidates[0].cellId];
  const seededLargeComponentIds = new Set<number>();
  const firstComponentId = connectivity.cellId[sourceCandidates[0].cellId];
  if (connectivity.largeComponentIds.has(firstComponentId)) {
    seededLargeComponentIds.add(firstComponentId);
  }
  const seedHash = makeFrontierHash(seed, 'nation-seed-soft-geo');

  while (seeds.length < nationCount) {
    let bestCellId = -1;
    let bestScore = -Infinity;
    let bestComponentId = -1;

    for (const candidate of sourceCandidates) {
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
        (seedCellId) => connectivity.cellId[seedCellId] === candidate.componentId
      );

      let nearestSeededComponentId = -1;
      let nearestWaterGap = Number.POSITIVE_INFINITY;
      for (const seedCellId of seeds) {
        const seededComponentId = connectivity.cellId[seedCellId];
        if (seededComponentId < 0 || seededComponentId === candidate.componentId) continue;
        const gap = estimateWaterCells(
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

      // In balanced mode we still want seeds on small islands occasionally,
      // but avoid over-seeding tiny components which later collapse to min-size nations.
      if (minComponentSize > 1) {
        if (componentSize < minComponentSize + 4) {
          totalScore -= (minComponentSize + 4 - componentSize) * 0.45;
        } else if (componentSize < minComponentSize + 16) {
          totalScore -= (minComponentSize + 16 - componentSize) * 0.18;
        }
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

type TNationFrontierState = { cellId: number; nationId: number; cost: number };

function getNationStepCost(
  cells: TMapCell[],
  owner: Int32Array,
  current: TNationFrontierState,
  neighborId: number,
  seedHash: number,
  profile: (typeof GEOPOLITICAL_CONFIG.borderLevels)['country'],
  nationExpansionBias: number[]
) {
  let stepCost = getBoundaryStepCost(
    cells,
    owner,
    current.cellId,
    neighborId,
    current.nationId,
    seedHash,
    profile
  );
  stepCost *= nationExpansionBias[current.nationId] || 1;
  stepCost += GEOPOLITICAL_CONFIG.frontierNoiseWeight * 0.15;
  return Math.max(0.2, stepCost);
}

function runInitialFloorExpansion(
  cells: TMapCell[],
  owner: Int32Array,
  cost: Float64Array,
  nationExpansionBias: number[],
  seedHash: number
) {
  const minNationCells = GEOPOLITICAL_CONFIG.minNationLandCells;
  if (minNationCells <= 1) return;

  const profile = GEOPOLITICAL_CONFIG.borderLevels.country;
  const nationCount = nationExpansionBias.length;
  const nationCellCounts = new Int32Array(nationCount);
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    const nationId = owner[cellId];
    if (nationId >= 0 && isLand(cells[cellId])) nationCellCounts[nationId] += 1;
  }

  const maxIterations = Math.max(1, cells.length * 2);
  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;

    for (let nationId = 0; nationId < nationCount; nationId += 1) {
      if (nationCellCounts[nationId] >= minNationCells) continue;

      let bestCurrentCellId = -1;
      let bestNeighborId = -1;
      let bestNextCost = Number.POSITIVE_INFINITY;

      for (let cellId = 0; cellId < cells.length; cellId += 1) {
        if (owner[cellId] !== nationId) continue;
        if (!isLand(cells[cellId])) continue;

        const currentState = { cellId, nationId, cost: cost[cellId] };
        for (const neighborId of cells[cellId].neighbors) {
          if (!isLand(cells[neighborId])) continue;
          if (owner[neighborId] >= 0) continue;

          const nextCost =
            currentState.cost +
            getNationStepCost(
              cells,
              owner,
              currentState,
              neighborId,
              seedHash,
              profile,
              nationExpansionBias
            );

          if (nextCost < bestNextCost) {
            bestNextCost = nextCost;
            bestCurrentCellId = cellId;
            bestNeighborId = neighborId;
          }
        }
      }

      if (bestCurrentCellId < 0 || bestNeighborId < 0) continue;
      owner[bestNeighborId] = nationId;
      cost[bestNeighborId] = bestNextCost;
      nationCellCounts[nationId] += 1;
      changed = true;
    }

    if (!changed) break;
  }
}

function buildSeedStatesFromAssignedLand(owner: Int32Array, cost: Float64Array) {
  const seeds: TNationFrontierState[] = [];
  for (let cellId = 0; cellId < owner.length; cellId += 1) {
    if (owner[cellId] < 0 || !Number.isFinite(cost[cellId])) continue;
    seeds.push({ cellId, nationId: owner[cellId], cost: cost[cellId] });
  }
  return seeds;
}

export function buildLandNations(cells: TMapCell[], seed: string, nationCount: number) {
  const profile = GEOPOLITICAL_CONFIG.borderLevels.country;
  const landCellCount = cells.filter(isLand).length;
  const numOfNation = getNationCount(nationCount, landCellCount);
  const connectivity = buildConnectivityContext(cells);
  const minSeedComponentSize = GEOPOLITICAL_CONFIG.minNationLandCells + 6;
  const seeds = selectNationSeeds(cells, numOfNation, seed, connectivity, minSeedComponentSize);
  const owner = new Int32Array(cells.length);
  const cost = new Float64Array(cells.length);
  owner.fill(-1);
  cost.fill(Number.POSITIVE_INFINITY);
  const nationExpansionBias = Array.from({ length: seeds.length }, (_, nationId) => {
    const random = createSeededRandom(`${seed}:nation-expansion-bias:${nationId}`);
    const roll = random();
    if (roll < 0.2) return 0.7 + random() * 0.18;
    if (roll < 0.75) return 0.9 + random() * 0.22;
    return 1.12 + random() * 0.26;
  });

  const seedStates: Array<{ cellId: number; nationId: number; cost: number }> = [];
  for (let nationId = 0; nationId < seeds.length; nationId += 1) {
    const cellId = seeds[nationId];
    owner[cellId] = nationId;
    cost[cellId] = 0;
    seedStates.push({ cellId, nationId, cost: 0 });
  }

  const seedHash = makeFrontierHash(seed, 'geopolitics:frontier');
  // Stage A: grow nations toward minimum floor size before regular global expansion.
  runInitialFloorExpansion(cells, owner, cost, nationExpansionBias, seedHash);
  const initialStates = buildSeedStatesFromAssignedLand(owner, cost);

  // Stage B: regular cost-based multi-source expansion with the current frontier model.
  runMultiSourceExpansion({
    seeds: initialStates.length > 0 ? initialStates : seedStates,
    getPriority: (state) => state.cost,
    isStale: (state) => state.cost > cost[state.cellId],
    expand: (current, push) => {
      const currentCell = cells[current.cellId];
      for (const neighborId of currentCell.neighbors) {
        const neighbor = cells[neighborId];
        if (!isLand(neighbor)) continue;
        const nextCost =
          current.cost +
          getNationStepCost(
            cells,
            owner,
            current,
            neighborId,
            seedHash,
            profile,
            nationExpansionBias
          );

        if (nextCost < cost[neighborId]) {
          cost[neighborId] = nextCost;
          owner[neighborId] = current.nationId;
          push({ cellId: neighborId, nationId: current.nationId, cost: nextCost });
        }
      }
    },
  });
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

export function enforceMinimumNationArea(
  cells: TMapCell[],
  owner: Int32Array,
  minNationCountToPreserve = 0
) {
  const landCellIds = cells.filter(isLand).map((cell) => cell.id);
  const minNationCells = Math.max(
    GEOPOLITICAL_CONFIG.minNationLandCells,
    Math.floor(landCellIds.length * GEOPOLITICAL_CONFIG.minNationLandRatio)
  );

  const sizeByNation = buildNationSizeMapForLandCells(landCellIds, owner);

  let activeNationCount = sizeByNation.size;
  const maxRebalancePasses = Math.max(1, sizeByNation.size);

  for (let rebalancePass = 0; rebalancePass < maxRebalancePasses; rebalancePass += 1) {
    let changedInPass = false;
    const smallNationIds = getSmallNationIds(sizeByNation, minNationCells);

    if (smallNationIds.length === 0) break;

    for (const nationId of smallNationIds) {
      const reachedMinimum = tryGrowNationToMinimum(
        cells,
        owner,
        nationId,
        sizeByNation,
        minNationCells
      );
      if (reachedMinimum) {
        changedInPass = true;
        continue;
      }
      if (minNationCountToPreserve > 0) {
        let borrowed = false;
        while ((sizeByNation.get(nationId) || 0) < minNationCells) {
          const visited = new Set<number>([nationId]);
          const grew = borrowCellForNation(
            cells,
            owner,
            sizeByNation,
            nationId,
            minNationCells,
            visited
          );
          if (!grew) break;
          borrowed = true;
        }
        if ((sizeByNation.get(nationId) || 0) >= minNationCells) {
          if (borrowed) changedInPass = true;
          continue;
        }
      }

      if (activeNationCount <= minNationCountToPreserve) continue;

      const nationCells = landCellIds.filter((cellId) => owner[cellId] === nationId);
      let movedAnyCell = false;
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
          bestNationId = findNearestForeignNationId(cells, owner, landCellIds, cellId, nationId);
        }
        if (bestNationId >= 0) {
          owner[cellId] = bestNationId;
          movedAnyCell = true;
          changedInPass = true;
        }
      }
      if (movedAnyCell) {
        activeNationCount -= 1;
      }
    }
    if (!changedInPass) break;
  }
}

export function diversifySmallNationSizes(cells: TMapCell[], owner: Int32Array, seed: string) {
  const minNationCells = GEOPOLITICAL_CONFIG.minNationLandCells;
  const sizeByNation = new Map<number, number>();
  for (const cell of cells) {
    if (!isLand(cell)) continue;
    const nationId = owner[cell.id];
    if (nationId < 0) continue;
    sizeByNation.set(nationId, (sizeByNation.get(nationId) || 0) + 1);
  }

  let donorPool = 0;
  let totalLandCells = 0;
  for (const size of sizeByNation.values()) {
    totalLandCells += size;
    donorPool += Math.max(0, size - minNationCells);
  }
  if (donorPool <= 0) return;

  const random = createSeededRandom(`${seed}:nation-size-diversify:v3`);
  const nationCount = Math.max(1, sizeByNation.size);
  const averageSize = totalLandCells / nationCount;
  const hardCapTargetSize = Math.max(minNationCells + 12, Math.floor(averageSize * 1.85));
  const allNationIds = Array.from(sizeByNation.keys());
  const shuffledNationIds = allNationIds.sort(() => random() - 0.5);
  const smallNationIds = allNationIds
    .filter((nationId) => (sizeByNation.get(nationId) || 0) <= minNationCells + 3)
    .sort((leftId, rightId) => (sizeByNation.get(leftId) || 0) - (sizeByNation.get(rightId) || 0));

  // Phase 0: specifically reduce "stuck at exactly 10 cells" nations first.
  const exactFloorNationIds = shuffledNationIds.filter(
    (nationId) => (sizeByNation.get(nationId) || 0) === minNationCells
  );
  for (const nationId of exactFloorNationIds) {
    if (donorPool <= 0) break;
    const targetSize = Math.min(hardCapTargetSize, minNationCells + 2 + Math.floor(random() * 5));
    while ((sizeByNation.get(nationId) || 0) < targetSize && donorPool > 0) {
      const visited = new Set<number>([nationId]);
      const grew = borrowCellForNation(
        cells,
        owner,
        sizeByNation,
        nationId,
        minNationCells,
        visited
      );
      if (!grew) break;
      donorPool -= 1;
    }
  }

  // Phase 1: lift many tiny nations out of the 10-13 bucket.
  for (const nationId of smallNationIds) {
    if (donorPool <= 0) break;
    if (random() < 0.1) continue;
    // const startSize = sizeByNation.get(nationId) || minNationCells;
    const targetSize = Math.min(hardCapTargetSize, 13 + Math.floor(random() * 12));

    while ((sizeByNation.get(nationId) || 0) < targetSize && donorPool > 0) {
      const visited = new Set<number>([nationId]);
      const grew = borrowCellForNation(
        cells,
        owner,
        sizeByNation,
        nationId,
        minNationCells,
        visited
      );
      if (!grew) break;
      donorPool -= 1;
    }
  }

  // Phase 2: randomly pick some nations to become medium-sized (20+), without extreme outliers.
  for (const nationId of shuffledNationIds) {
    if (donorPool <= 0) break;
    if (random() < 0.7) continue;
    const currentSize = sizeByNation.get(nationId) || minNationCells;
    if (currentSize >= hardCapTargetSize) continue;

    const mediumTarget = 20 + Math.floor(random() * 30);
    const targetSize = Math.min(hardCapTargetSize, mediumTarget);
    if (targetSize <= currentSize) continue;

    while ((sizeByNation.get(nationId) || 0) < targetSize && donorPool > 0) {
      const visited = new Set<number>([nationId]);
      const grew = borrowCellForNation(
        cells,
        owner,
        sizeByNation,
        nationId,
        minNationCells,
        visited
      );
      if (!grew) break;
      donorPool -= 1;
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
    const stack: number[] = [];

    for (const startCellId of nationCells) {
      if (visited.has(startCellId)) continue;
      stack.length = 0;
      stack.push(startCellId);
      const component: number[] = [];
      visited.add(startCellId);

      while (stack.length > 0) {
        const current = stack.pop() as number;
        component.push(current);

        for (const neighborId of cells[current].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          if (!isLand(cells[neighborId])) continue;
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          stack.push(neighborId);
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

function getUnclaimedLandCount(cells: TMapCell[], owner: Int32Array) {
  let count = 0;
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (!isLand(cells[cellId])) continue;
    if (owner[cellId] >= 0) continue;
    count += 1;
  }
  return count;
}

function getSmallNationCount(cells: TMapCell[], owner: Int32Array) {
  const landCellIds = cells.filter(isLand).map((cell) => cell.id);
  const minNationCells = Math.max(
    GEOPOLITICAL_CONFIG.minNationLandCells,
    Math.floor(landCellIds.length * GEOPOLITICAL_CONFIG.minNationLandRatio)
  );
  const sizeByNation = buildNationSizeMapForLandCells(landCellIds, owner);
  return getSmallNationIds(sizeByNation, minNationCells).length;
}

export function reconcileNationClaims(
  cells: TMapCell[],
  owner: Int32Array,
  preserveNationCount: number,
  maxPasses = 3
) {
  const shouldLogMetrics = process.env.NODE_ENV !== 'production';

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const beforeUnclaimed = getUnclaimedLandCount(cells, owner);
    const beforeSmallNationCount = getSmallNationCount(cells, owner);

    fillUnclaimedLand(cells, owner);
    ensureAllLandClaimed(cells, owner);
    enforceMinimumNationArea(cells, owner, preserveNationCount);
    ensureAllLandClaimed(cells, owner);

    const afterUnclaimed = getUnclaimedLandCount(cells, owner);
    const afterSmallNationCount = getSmallNationCount(cells, owner);
    if (shouldLogMetrics) {
      console.debug('[nation:reconcile]', {
        pass,
        beforeUnclaimed,
        afterUnclaimed,
        beforeSmallNationCount,
        afterSmallNationCount,
      });
    }
    const stabilized =
      afterUnclaimed === beforeUnclaimed && afterSmallNationCount === beforeSmallNationCount;
    if (stabilized) break;
  }
}
