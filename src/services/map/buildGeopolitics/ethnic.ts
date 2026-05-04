import { GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { runMultiSourceExpansion } from 'src/services/map/core/expansionEngine';
import { collectConnectedComponents } from 'src/services/map/core/graph';
import { TFifoQueue } from 'src/services/map/core/queue';
import { sortStableDescByScore } from 'src/services/map/core/sort';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import { TEthnicGroup, TMapCell } from 'src/types/map.types';
import { ethnicTerrainCost } from './costPolicies';
import { createRegionalName, edgeNoise, isLand } from './geopoliticsShared';

type TEthnicConfig = typeof GEOPOLITICAL_CONFIG.ethnic;

function getEthnicGroupCount(landCellCount: number, nationCount: number, config: TEthnicConfig) {
  const byLand = Math.floor(landCellCount / 1300);
  return Math.max(
    config.majorGroupCountMin,
    Math.min(config.majorGroupCountMax, Math.max(nationCount, byLand))
  );
}

function collectLandComponents(cells: TMapCell[]) {
  return collectConnectedComponents(
    cells,
    (cell) => isLand(cell),
    (_current, neighbor) => isLand(neighbor),
    true
  );
}

function pickEthnicCoreSeeds(cells: TMapCell[], cellIds: number[], count: number, seed: string) {
  const random = createSeededRandom(`${seed}:ethnic:cores`);
  const candidates = sortStableDescByScore(
    cellIds
      .map((cellId) => cells[cellId])
      .map((cell) => {
        let score = cell.suitability * 1.3;
        if (cell.terrain === 'plains' || cell.terrain === 'valley') score += 1.1;
        if (cell.terrain === 'forest') score += 0.35;
        if (cell.terrain === 'mountains') score += 0.2;
        if (cell.isRiver || cell.isLake) score += 0.35;
        score += random() * 0.5;
        return { cellId: cell.id, score };
      })
  );

  const seeds: number[] = [];
  for (const candidate of candidates) {
    if (seeds.length >= count) break;
    const point = cells[candidate.cellId].site;
    const tooClose = seeds.some((seedCellId) => {
      const seedPoint = cells[seedCellId].site;
      return Math.hypot(point[0] - seedPoint[0], point[1] - seedPoint[1]) < 70;
    });
    if (tooClose) continue;
    seeds.push(candidate.cellId);
  }

  if (seeds.length === 0 && candidates.length > 0) seeds.push(candidates[0].cellId);
  return seeds;
}

function buildEthnicField(
  cells: TMapCell[],
  owner: Int32Array,
  seedCells: number[],
  seed: string,
  config: TEthnicConfig,
  ethnicOffset: number,
  allowedCellSet: Set<number>,
  ethnicOwner: Int32Array
) {
  const cost = new Float64Array(cells.length);
  cost.fill(Number.POSITIVE_INFINITY);
  const seedStates: Array<{ cellId: number; ethnicId: number; cost: number; distance: number }> =
    [];
  const seedHash = hashSeed(`${seed}:ethnic:frontier`);

  for (let localEthnicId = 0; localEthnicId < seedCells.length; localEthnicId += 1) {
    const cellId = seedCells[localEthnicId];
    const ethnicId = ethnicOffset + localEthnicId;
    ethnicOwner[cellId] = ethnicId;
    cost[cellId] = 0;
    seedStates.push({ cellId, ethnicId, cost: 0, distance: 0 });
  }

  runMultiSourceExpansion({
    seeds: seedStates,
    getPriority: (state) => state.cost,
    isStale: (state) => state.cost > cost[state.cellId],
    expand: (current, push) => {
      for (const neighborId of cells[current.cellId].neighbors) {
        const neighbor = cells[neighborId];
        if (!allowedCellSet.has(neighborId) || !isLand(neighbor)) continue;

        let step = ethnicTerrainCost(neighbor, config);
        const borderPenalty =
          owner[current.cellId] >= 0 &&
          owner[neighborId] >= 0 &&
          owner[current.cellId] !== owner[neighborId]
            ? 1 - config.crossBorderBlend
            : 0;
        step += borderPenalty;
        if (cells[current.cellId].terrain === 'mountains' && neighbor.terrain === 'mountains') {
          step += config.fragmentationLevel * 0.35;
        }
        if (cells[current.cellId].isRiver || neighbor.isRiver) step += 0.3;
        if (cells[current.cellId].isLake !== neighbor.isLake) step += 0.45;
        const nextDistance = current.distance + 1;
        step += nextDistance * config.distancePenalty;
        step += (edgeNoise(seedHash, current.cellId, neighborId) - 0.5) * 0.16;
        const nextCost = current.cost + Math.max(0.2, step);

        if (nextCost < cost[neighborId]) {
          cost[neighborId] = nextCost;
          ethnicOwner[neighborId] = current.ethnicId;
          push({
            cellId: neighborId,
            ethnicId: current.ethnicId,
            cost: nextCost,
            distance: nextDistance,
          });
        }
      }
    },
  });
}

function enforceCountryEthnicDominance(
  cells: TMapCell[],
  nationOwner: Int32Array,
  ethnicOwner: Int32Array,
  config: TEthnicConfig
) {
  function isTransnationalBridgeCell(cellId: number, ethnicId: number) {
    const nationId = nationOwner[cellId];
    if (nationId < 0) return false;
    for (const neighborId of cells[cellId].neighbors) {
      if (!isLand(cells[neighborId])) continue;
      if (nationOwner[neighborId] === nationId) continue;
      if (ethnicOwner[neighborId] === ethnicId) return true;
    }
    return false;
  }

  const nationIds = Array.from(new Set(nationOwner)).filter((nationId) => nationId >= 0);
  for (const nationId of nationIds) {
    const nationCells = cells
      .filter((cell) => isLand(cell) && nationOwner[cell.id] === nationId)
      .map((cell) => cell.id);
    if (nationCells.length === 0) continue;

    const ethnicCounts = new Map<number, number>();
    for (const cellId of nationCells) {
      const ethnicId = ethnicOwner[cellId];
      if (ethnicId < 0) continue;
      ethnicCounts.set(ethnicId, (ethnicCounts.get(ethnicId) || 0) + 1);
    }
    const ranked = Array.from(ethnicCounts.entries()).sort((a, b) => b[1] - a[1]);
    const dominantId = ranked[0]?.[0] ?? -1;
    const secondaryId = ranked[1]?.[0] ?? dominantId;
    if (dominantId < 0) continue;

    const dominantTarget = Math.max(
      config.dominantShareMin,
      Math.min(config.dominantShareMax, 0.54 + (nationCells.length > 700 ? 0.04 : 0))
    );
    const secondaryTarget = Math.max(
      config.secondaryShareMin,
      Math.min(config.secondaryShareMax, 0.2)
    );
    const dominantNeed = Math.floor(nationCells.length * dominantTarget);
    const secondaryNeed = Math.floor(nationCells.length * secondaryTarget);

    const currentDominant = ranked[0]?.[1] ?? 0;
    if (currentDominant < dominantNeed) {
      const outsiders = nationCells.filter((cellId) => ethnicOwner[cellId] !== dominantId);
      outsiders.sort((leftId, rightId) => {
        const leftTouches = cells[leftId].neighbors.filter(
          (n) => ethnicOwner[n] === dominantId
        ).length;
        const rightTouches = cells[rightId].neighbors.filter(
          (n) => ethnicOwner[n] === dominantId
        ).length;
        return rightTouches - leftTouches;
      });
      let need = dominantNeed - currentDominant;
      for (const cellId of outsiders) {
        if (need <= 0) break;
        if (isTransnationalBridgeCell(cellId, ethnicOwner[cellId])) continue;
        ethnicOwner[cellId] = dominantId;
        need -= 1;
      }
    }

    if (secondaryId >= 0 && secondaryId !== dominantId) {
      const currentSecondary = ethnicCounts.get(secondaryId) || 0;
      if (currentSecondary < secondaryNeed) {
        const secondaryCandidates = nationCells.filter(
          (cellId) => ethnicOwner[cellId] !== dominantId && ethnicOwner[cellId] !== secondaryId
        );
        secondaryCandidates.sort((leftId, rightId) => {
          const leftTouches = cells[leftId].neighbors.filter(
            (n) => ethnicOwner[n] === secondaryId
          ).length;
          const rightTouches = cells[rightId].neighbors.filter(
            (n) => ethnicOwner[n] === secondaryId
          ).length;
          return rightTouches - leftTouches;
        });
        let need = secondaryNeed - currentSecondary;
        for (const cellId of secondaryCandidates) {
          if (need <= 0) break;
          if (isTransnationalBridgeCell(cellId, ethnicOwner[cellId])) continue;
          ethnicOwner[cellId] = secondaryId;
          need -= 1;
        }
      }
    }
  }
}

function addEthnicFragmentation(
  cells: TMapCell[],
  ethnicOwner: Int32Array,
  ethnicGroups: TEthnicGroup[],
  seed: string,
  config: TEthnicConfig
) {
  const random = createSeededRandom(`${seed}:ethnic:fragments`);
  const fragmentSteps = Math.max(1, Math.floor(config.fragmentationLevel * 6));
  for (const group of ethnicGroups) {
    const groupCells = cells
      .filter((cell) => ethnicOwner[cell.id] === group.id && isLand(cell))
      .map((cell) => cell.id);
    if (groupCells.length < config.minorityClusterMinCells * 2) continue;
    const mountainCandidates = groupCells.filter((cellId) => cells[cellId].terrain === 'mountains');
    if (mountainCandidates.length === 0) continue;
    const anchorId = mountainCandidates[Math.floor(random() * mountainCandidates.length)] as number;
    let frontier = [anchorId];
    const painted = new Set<number>([anchorId]);
    for (let step = 0; step < fragmentSteps; step += 1) {
      const nextFrontier: number[] = [];
      for (const currentId of frontier) {
        for (const neighborId of cells[currentId].neighbors) {
          if (painted.has(neighborId) || !isLand(cells[neighborId])) continue;
          if (cells[neighborId].terrain !== 'mountains' && cells[neighborId].terrain !== 'hills')
            continue;
          if (random() > 0.62) continue;
          painted.add(neighborId);
          ethnicOwner[neighborId] = group.id;
          nextFrontier.push(neighborId);
        }
      }
      if (nextFrontier.length === 0) break;
      frontier = nextFrontier;
    }
  }
}

function smoothEthnicRegions(cells: TMapCell[], ethnicOwner: Int32Array, config: TEthnicConfig) {
  for (let pass = 0; pass < config.smoothingPasses; pass += 1) {
    const next = Int32Array.from(ethnicOwner);
    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      if (!isLand(cells[cellId])) continue;
      const counts = new Map<number, number>();
      for (const neighborId of cells[cellId].neighbors) {
        const ethnicId = ethnicOwner[neighborId];
        if (ethnicId < 0) continue;
        counts.set(ethnicId, (counts.get(ethnicId) || 0) + 1);
      }
      let bestId = ethnicOwner[cellId];
      let bestCount = counts.get(bestId) || 0;
      for (const [candidateId, count] of counts) {
        if (count > bestCount) {
          bestCount = count;
          bestId = candidateId;
        }
      }
      if (bestId !== ethnicOwner[cellId] && bestCount >= 3) {
        next[cellId] = bestId;
      }
    }
    ethnicOwner.set(next);
  }
}

function enforceCrossBorderEthnicContinuity(
  cells: TMapCell[],
  nationOwner: Int32Array,
  ethnicOwner: Int32Array,
  config: TEthnicConfig
) {
  const iterations = Math.max(2, Math.floor(2 + config.crossBorderBlend * 3));
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = Int32Array.from(ethnicOwner);
    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      if (!isLand(cells[cellId])) continue;
      const currentNationId = nationOwner[cellId];
      if (currentNationId < 0) continue;

      const crossBorderCounts = new Map<number, number>();
      const localCounts = new Map<number, number>();
      for (const neighborId of cells[cellId].neighbors) {
        if (!isLand(cells[neighborId])) continue;
        const ethnicId = ethnicOwner[neighborId];
        if (ethnicId < 0) continue;
        if (nationOwner[neighborId] === currentNationId) {
          localCounts.set(ethnicId, (localCounts.get(ethnicId) || 0) + 1);
        } else {
          crossBorderCounts.set(ethnicId, (crossBorderCounts.get(ethnicId) || 0) + 1);
        }
      }

      let bestEthnicId = ethnicOwner[cellId];
      let bestScore = -Infinity;
      const candidateIds = new Set<number>([
        ...Array.from(localCounts.keys()),
        ...Array.from(crossBorderCounts.keys()),
      ]);
      for (const ethnicId of candidateIds) {
        const localSupport = localCounts.get(ethnicId) || 0;
        const crossSupport = crossBorderCounts.get(ethnicId) || 0;
        const mountainBridge =
          cells[cellId].terrain === 'mountains' || cells[cellId].terrain === 'hills' ? 0.35 : 0;
        const score = localSupport + crossSupport * (1 + config.crossBorderBlend) + mountainBridge;
        if (score > bestScore) {
          bestScore = score;
          bestEthnicId = ethnicId;
        }
      }
      if (bestEthnicId !== ethnicOwner[cellId] && bestScore >= 2) {
        next[cellId] = bestEthnicId;
      }
    }
    ethnicOwner.set(next);
  }
}

function expandEthnicDeepCrossBorder(
  cells: TMapCell[],
  nationOwner: Int32Array,
  ethnicOwner: Int32Array,
  seed: string,
  config: TEthnicConfig
) {
  const random = createSeededRandom(`${seed}:ethnic:deep-cross-border`);
  const iterations = Math.max(2, Math.floor(3 + config.crossBorderBlend * 4));
  const maxDepth = Math.max(2, Math.floor(3 + config.crossBorderBlend * 3));

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = Int32Array.from(ethnicOwner);
    for (let cellId = 0; cellId < cells.length; cellId += 1) {
      if (!isLand(cells[cellId])) continue;
      const nationId = nationOwner[cellId];
      if (nationId < 0) continue;

      const borderEthnicCounts = new Map<number, number>();
      for (const neighborId of cells[cellId].neighbors) {
        if (!isLand(cells[neighborId])) continue;
        if (nationOwner[neighborId] === nationId) continue;
        const ethnicId = ethnicOwner[neighborId];
        if (ethnicId < 0) continue;
        borderEthnicCounts.set(ethnicId, (borderEthnicCounts.get(ethnicId) || 0) + 1);
      }
      if (borderEthnicCounts.size === 0) continue;

      let bestEthnicId = ethnicOwner[cellId];
      let bestScore = -Infinity;
      for (const [ethnicId, borderCount] of borderEthnicCounts) {
        let depthSupport = 0;
        const visited = new Set<number>([cellId]);
        let frontier = [cellId];
        for (let depth = 0; depth < maxDepth; depth += 1) {
          const nextFrontier: number[] = [];
          for (const currentId of frontier) {
            for (const localNeighborId of cells[currentId].neighbors) {
              if (visited.has(localNeighborId)) continue;
              if (!isLand(cells[localNeighborId])) continue;
              if (nationOwner[localNeighborId] !== nationId) continue;
              visited.add(localNeighborId);
              nextFrontier.push(localNeighborId);
              if (ethnicOwner[localNeighborId] === ethnicId) depthSupport += 1;
            }
          }
          frontier = nextFrontier;
          if (frontier.length === 0) break;
        }
        const terrainBias =
          cells[cellId].terrain === 'mountains' || cells[cellId].terrain === 'hills' ? 0.3 : 0;
        const noise = (random() - 0.5) * 0.35;
        const score =
          borderCount * (1.4 + config.crossBorderBlend) +
          depthSupport * (0.55 + config.crossBorderBlend * 0.4) +
          terrainBias +
          noise;
        if (score > bestScore) {
          bestScore = score;
          bestEthnicId = ethnicId;
        }
      }

      if (bestEthnicId !== ethnicOwner[cellId] && bestScore >= 2.1) {
        next[cellId] = bestEthnicId;
      }
    }
    ethnicOwner.set(next);
  }
}

function ensureEthnicMultiNationPresence(
  cells: TMapCell[],
  nationOwner: Int32Array,
  ethnicOwner: Int32Array,
  ethnicGroups: TEthnicGroup[]
) {
  for (const group of ethnicGroups) {
    const nationIds = new Set<number>();
    for (const cell of cells) {
      if (!isLand(cell)) continue;
      if (ethnicOwner[cell.id] !== group.id) continue;
      const nationId = nationOwner[cell.id];
      if (nationId >= 0) nationIds.add(nationId);
    }
    if (nationIds.size >= 2) continue;

    const candidateBorders: number[] = [];
    for (const cell of cells) {
      if (!isLand(cell)) continue;
      if (ethnicOwner[cell.id] !== group.id) continue;
      const cellNationId = nationOwner[cell.id];
      if (cellNationId < 0) continue;
      for (const neighborId of cell.neighbors) {
        if (!isLand(cells[neighborId])) continue;
        if (nationOwner[neighborId] === cellNationId) continue;
        candidateBorders.push(neighborId);
      }
    }
    if (candidateBorders.length === 0) continue;

    let painted = 0;
    const uniqueBorderCells = [...new Set(candidateBorders)];
    const queue = new TFifoQueue<number>();
    for (const cellId of uniqueBorderCells) {
      queue.enqueue(cellId);
    }
    const visited = new Set<number>(uniqueBorderCells);
    while (queue.size > 0 && painted < 18) {
      const currentId = queue.dequeue() as number;
      if (!isLand(cells[currentId])) continue;
      if (ethnicOwner[currentId] !== group.id) {
        ethnicOwner[currentId] = group.id;
        painted += 1;
      }
      for (const neighborId of cells[currentId].neighbors) {
        if (visited.has(neighborId)) continue;
        if (!isLand(cells[neighborId])) continue;
        if (nationOwner[neighborId] !== nationOwner[currentId]) continue;
        visited.add(neighborId);
        queue.enqueue(neighborId);
      }
    }
  }
}

function assignUnclaimedLandCells(cells: TMapCell[], ethnicOwner: Int32Array) {
  const claimedLand = cells.filter((cell) => isLand(cell) && ethnicOwner[cell.id] >= 0);
  if (claimedLand.length === 0) return;

  for (const cell of cells) {
    if (!isLand(cell) || ethnicOwner[cell.id] >= 0) continue;
    let bestEthnicId = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const claimedCell of claimedLand) {
      const distance = Math.hypot(
        cell.site[0] - claimedCell.site[0],
        cell.site[1] - claimedCell.site[1]
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        bestEthnicId = ethnicOwner[claimedCell.id];
      }
    }
    if (bestEthnicId >= 0) ethnicOwner[cell.id] = bestEthnicId;
  }
}

export function buildEthnicRegions(cells: TMapCell[], nationOwner: Int32Array, seed: string) {
  const config = GEOPOLITICAL_CONFIG.ethnic;
  const ethnicOwner = new Int32Array(cells.length);
  ethnicOwner.fill(-1);
  const ethnicGroups: TEthnicGroup[] = [];

  const components = collectLandComponents(cells);
  let ethnicOffset = 0;

  for (let componentIndex = 0; componentIndex < components.length; componentIndex += 1) {
    const componentCellIds = components[componentIndex] as number[];
    const componentSet = new Set(componentCellIds);
    const componentNationCount = new Set(
      componentCellIds.map((cellId) => nationOwner[cellId]).filter((nationId) => nationId >= 0)
    ).size;
    const targetEthnicCount = getEthnicGroupCount(
      componentCellIds.length,
      componentNationCount,
      config
    );
    const componentEthnicCount = Math.max(1, Math.min(targetEthnicCount, componentCellIds.length));
    const seedCells = pickEthnicCoreSeeds(
      cells,
      componentCellIds,
      componentEthnicCount,
      `${seed}:component:${componentIndex}`
    );

    buildEthnicField(
      cells,
      nationOwner,
      seedCells,
      `${seed}:component:${componentIndex}`,
      config,
      ethnicOffset,
      componentSet,
      ethnicOwner
    );

    for (let localId = 0; localId < seedCells.length; localId += 1) {
      const globalId = ethnicOffset + localId;
      ethnicGroups.push({
        id: globalId,
        name: createRegionalName(seed, 'ethnic', globalId),
        coreCellId: seedCells[localId] as number,
      });
    }

    ethnicOffset += seedCells.length;
  }

  enforceCountryEthnicDominance(cells, nationOwner, ethnicOwner, config);
  expandEthnicDeepCrossBorder(cells, nationOwner, ethnicOwner, seed, config);
  enforceCrossBorderEthnicContinuity(cells, nationOwner, ethnicOwner, config);
  addEthnicFragmentation(cells, ethnicOwner, ethnicGroups, seed, config);
  expandEthnicDeepCrossBorder(cells, nationOwner, ethnicOwner, seed, config);
  enforceCrossBorderEthnicContinuity(cells, nationOwner, ethnicOwner, config);
  ensureEthnicMultiNationPresence(cells, nationOwner, ethnicOwner, ethnicGroups);
  smoothEthnicRegions(cells, ethnicOwner, config);
  assignUnclaimedLandCells(cells, ethnicOwner);

  return { ethnicOwner, ethnicGroups };
}
