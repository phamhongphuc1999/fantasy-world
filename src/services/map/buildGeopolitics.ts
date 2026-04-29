import { MAP_GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { createSeededRandom, hashSeed } from 'src/services/map/seededRandom';
import { TMapCell, TMapMeshWithDelaunay, TNation, TZoneType } from 'src/types/global';

interface TBuildGeopoliticsOptions {
  mesh: TMapMeshWithDelaunay;
  seed: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function edgeNoise(seedHash: number, leftId: number, rightId: number) {
  const low = Math.min(leftId, rightId);
  const high = Math.max(leftId, rightId);
  const mix = (low * 73856093) ^ (high * 19349663) ^ seedHash;
  const s = Math.sin(mix * 0.000173) * 43758.5453;
  return Math.abs(s - Math.floor(s));
}

function isLand(cell: TMapCell) {
  return !cell.isWater;
}

function isRiverBarrier(left: TMapCell, right: TMapCell) {
  return left.isRiver || right.isRiver;
}

function isRidgeBarrier(left: TMapCell, right: TMapCell) {
  const ruggedLeft =
    left.terrain === 'mountains' || left.terrain === 'hills' || left.terrain === 'volcanic';
  const ruggedRight =
    right.terrain === 'mountains' || right.terrain === 'hills' || right.terrain === 'volcanic';
  return ruggedLeft && ruggedRight;
}

function getNationCount(landCount: number) {
  const estimated = Math.round(landCount / MAP_GEOPOLITICAL_CONFIG.targetLandCellsPerNation);
  return clamp(
    estimated,
    MAP_GEOPOLITICAL_CONFIG.nationCountMin,
    MAP_GEOPOLITICAL_CONFIG.nationCountMax
  );
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

function selectNationSeeds(cells: TMapCell[], nationCount: number) {
  const candidates = cells
    .map((_, cellId) => ({ cellId, score: getSeedSuitability(cellId, cells) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) return [];
  const seeds: number[] = [candidates[0].cellId];

  while (seeds.length < nationCount) {
    let bestCellId = -1;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      if (seeds.includes(candidate.cellId)) continue;

      const point = cells[candidate.cellId].site;
      let minDistance = Infinity;
      for (const seedCellId of seeds) {
        const seedPoint = cells[seedCellId].site;
        minDistance = Math.min(
          minDistance,
          Math.hypot(point[0] - seedPoint[0], point[1] - seedPoint[1])
        );
      }

      const totalScore = candidate.score * 1.15 + Math.sqrt(minDistance) * 0.18;
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestCellId = candidate.cellId;
      }
    }
    if (bestCellId < 0) break;
    seeds.push(bestCellId);
  }
  return seeds;
}

function buildLandNations(cells: TMapCell[], seed: string) {
  const nationCount = getNationCount(cells.filter(isLand).length);
  const seeds = selectNationSeeds(cells, nationCount);
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

  const seedHash = hashSeed(`${seed}:geopolitics:frontier`);

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift() as { cellId: number; nationId: number; cost: number };
    if (current.cost > cost[current.cellId]) continue;

    const currentCell = cells[current.cellId];
    for (const neighborId of currentCell.neighbors) {
      const neighbor = cells[neighborId];
      if (!isLand(neighbor)) continue;

      const terrainCost =
        MAP_GEOPOLITICAL_CONFIG.terrainCost[
          neighbor.terrain as keyof typeof MAP_GEOPOLITICAL_CONFIG.terrainCost
        ] || 1.2;
      let stepCost = terrainCost;

      if (isRiverBarrier(currentCell, neighbor)) {
        stepCost += MAP_GEOPOLITICAL_CONFIG.barrierCost.river;
      }
      if (isRidgeBarrier(currentCell, neighbor)) {
        stepCost += MAP_GEOPOLITICAL_CONFIG.barrierCost.ridge;
      }

      const noise = (edgeNoise(seedHash, current.cellId, neighborId) - 0.5) * 2;
      stepCost += noise * MAP_GEOPOLITICAL_CONFIG.frontierNoiseWeight;
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

function getNationNeighborCounts(cells: TMapCell[], owner: Int32Array, cellId: number) {
  const counts = new Map<number, number>();
  for (const neighborId of cells[cellId].neighbors) {
    if (!isLand(cells[neighborId])) continue;
    const neighborNationId = owner[neighborId];
    if (neighborNationId < 0) continue;
    counts.set(neighborNationId, (counts.get(neighborNationId) || 0) + 1);
  }
  return counts;
}

function enforceMinimumNationArea(cells: TMapCell[], owner: Int32Array) {
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
      if (bestNationId >= 0) owner[cellId] = bestNationId;
    }
  }
}

function enforceMainlandContiguity(cells: TMapCell[], owner: Int32Array) {
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

function fillUnclaimedLand(cells: TMapCell[], owner: Int32Array) {
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

function ensureAllLandClaimed(cells: TMapCell[], owner: Int32Array) {
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

function assignMaritimeZones(cells: TMapCell[], owner: Int32Array, seed: string) {
  void owner;
  void seed;
  const zoneType: TZoneType[] = Array.from({ length: cells.length }, () => 'international-waters');
  const waterOwner = new Int32Array(cells.length);
  waterOwner.fill(-1);

  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    if (isLand(cells[cellId])) zoneType[cellId] = 'land';
  }
  return { waterOwner, zoneType };
}

function getLandDistanceMap(
  cells: TMapCell[],
  nationLandSet: Set<number>,
  sourcePredicate: (cellId: number) => boolean
) {
  const distances = new Int32Array(cells.length);
  distances.fill(-1);
  const queue: number[] = [];

  for (const cellId of nationLandSet) {
    if (!sourcePredicate(cellId)) continue;
    distances[cellId] = 0;
    queue.push(cellId);
  }

  while (queue.length > 0) {
    const current = queue.shift() as number;
    const currentDistance = distances[current];
    for (const neighborId of cells[current].neighbors) {
      if (!nationLandSet.has(neighborId)) continue;
      if (distances[neighborId] >= 0) continue;
      distances[neighborId] = currentDistance + 1;
      queue.push(neighborId);
    }
  }
  return distances;
}

function getNationComponents(cells: TMapCell[], owner: Int32Array, nationId: number) {
  const visited = new Set<number>();
  const components: number[][] = [];
  const nationCellIds = cells
    .filter((cell) => owner[cell.id] === nationId && isLand(cell))
    .map((cell) => cell.id);

  for (const startCellId of nationCellIds) {
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
  components.sort((a, b) => b.length - a.length);
  return components;
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
  hubCellIds: number[]
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

  for (const hubCellId of hubCellIds) {
    const hubSite = cells[hubCellId].site;
    const distance = Math.hypot(cell.site[0] - hubSite[0], cell.site[1] - hubSite[1]);
    if (distance < 40) score -= 14;
    else if (distance < 70) score -= 6;
  }
  return score;
}

function pickEconomicAndCapital(cells: TMapCell[], owner: Int32Array, seed: string): TNation[] {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  const seedHash = hashSeed(`${seed}:nation-names`);

  return nationIds.map((nationId) => {
    const components = getNationComponents(cells, owner, nationId);
    const mainland = components[0] || [];
    const mainlandSet = new Set(mainland);
    const mainlandCells = mainland.map((cellId) => cells[cellId]);
    const landSize = mainlandCells.length;
    const random = createSeededRandom(`${seed}:capital:${nationId}`);

    let hubCount = 1;
    if (landSize >= MAP_GEOPOLITICAL_CONFIG.hubCount.mediumNationMinLand) hubCount = 3;
    else if (landSize >= MAP_GEOPOLITICAL_CONFIG.hubCount.smallNationMinLand) hubCount = 2;
    hubCount = Math.min(hubCount, MAP_GEOPOLITICAL_CONFIG.hubCount.maxHubsPerNation);

    const scored = mainlandCells
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
      .map((cellId) => ({
        cellId,
        score: strategicCapitalScore(
          cellId,
          cells,
          borderDistanceMap,
          coastDistanceMap,
          hubCellIds
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
    } else if (hubCellIds.length > 0) capitalCellId = hubCellIds[0];

    const nationName = `Nation ${String.fromCharCode(65 + ((nationId + seedHash) % 26))}-${nationId + 1}`;

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

function getProvinceTargetCount(cells: TMapCell[]) {
  const plainsCount = cells.filter(
    (cell) => cell.terrain === 'plains' || cell.terrain === 'valley'
  ).length;
  const base = Math.max(1, Math.floor(cells.length / 170));
  const plainsBonus = Math.floor((plainsCount / Math.max(1, cells.length)) * 9);
  return Math.max(1, base + plainsBonus);
}

function getProvinceSeedScore(cell: TMapCell) {
  if (!isLand(cell)) return -1000;
  if (cell.terrain === 'plains') return 7 + cell.suitability * 2;
  if (cell.terrain === 'valley') return 6.5 + cell.suitability * 2;
  if (cell.terrain === 'coast') return 5.2 + cell.suitability * 1.8;
  if (cell.terrain === 'forest') return 3.5 + cell.suitability;
  if (cell.terrain === 'hills' || cell.terrain === 'plateau') return 1.8 + cell.suitability * 0.8;
  if (cell.terrain === 'mountains' || cell.terrain === 'desert' || cell.terrain === 'volcanic')
    return -4;
  return 1.2 + cell.suitability * 0.8;
}

function terrainProvinceCost(cell: TMapCell) {
  if (cell.terrain === 'plains') return 1;
  if (cell.terrain === 'valley') return 1.2;
  if (cell.terrain === 'coast') return 1.6;
  if (cell.terrain === 'forest') return 2.8;
  if (cell.terrain === 'hills') return 7.5;
  if (cell.terrain === 'plateau') return 9.5;
  if (cell.terrain === 'swamp') return 14;
  if (cell.terrain === 'desert' || cell.terrain === 'badlands') return 18;
  if (cell.terrain === 'mountains') return 70;
  if (cell.terrain === 'volcanic') return 95;
  return 3.2;
}

function assignNationProvincesBySeeds(
  cells: TMapCell[],
  owner: Int32Array,
  nationId: number,
  seeds: number[],
  provinceOwner: Int32Array,
  startProvinceId: number,
  noiseHash: number
) {
  const localCost = new Float64Array(cells.length);
  localCost.fill(Number.POSITIVE_INFINITY);
  const frontier: Array<{ cellId: number; provinceId: number; cost: number }> = [];

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const cellId = seeds[seedIndex];
    const provinceId = startProvinceId + seedIndex;
    provinceOwner[cellId] = provinceId;
    localCost[cellId] = 0;
    frontier.push({ cellId, provinceId, cost: 0 });
  }

  while (frontier.length > 0) {
    frontier.sort((a, b) => a.cost - b.cost);
    const current = frontier.shift() as { cellId: number; provinceId: number; cost: number };
    if (current.cost > localCost[current.cellId]) continue;

    for (const neighborId of cells[current.cellId].neighbors) {
      if (owner[neighborId] !== nationId) continue;
      if (!isLand(cells[neighborId])) continue;

      let step = terrainProvinceCost(cells[neighborId]);
      if (cells[current.cellId].isRiver || cells[neighborId].isRiver || cells[neighborId].isLake) {
        step += 55;
      }
      if (isRidgeBarrier(cells[current.cellId], cells[neighborId])) {
        step += 68;
      }
      step += (edgeNoise(noiseHash, current.cellId, neighborId) - 0.5) * 0.2;

      const nextCost = current.cost + Math.max(0.25, step);
      if (nextCost < localCost[neighborId]) {
        localCost[neighborId] = nextCost;
        provinceOwner[neighborId] = current.provinceId;
        frontier.push({ cellId: neighborId, provinceId: current.provinceId, cost: nextCost });
      }
    }
  }
}

function buildNationProvinces(cells: TMapCell[], owner: Int32Array, seed: string) {
  const provinceOwner = new Int32Array(cells.length);
  provinceOwner.fill(-1);
  let nextProvinceId = 0;
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);

  for (const nationId of nationIds) {
    const nationCells = cells.filter((cell) => isLand(cell) && owner[cell.id] === nationId);
    if (nationCells.length === 0) continue;

    const scored = nationCells
      .map((cell) => ({ cellId: cell.id, score: getProvinceSeedScore(cell) }))
      .sort((a, b) => b.score - a.score);
    if (scored.length === 0) continue;

    const seeds: number[] = [];
    const initialTarget = getProvinceTargetCount(nationCells);
    for (const entry of scored) {
      if (seeds.length >= initialTarget) break;
      const candidate = cells[entry.cellId];
      const requiredDistance =
        candidate.terrain === 'plains' || candidate.terrain === 'valley' ? 42 : 72;
      const tooClose = seeds.some((seedCellId) => {
        const seedCell = cells[seedCellId];
        return (
          Math.hypot(candidate.site[0] - seedCell.site[0], candidate.site[1] - seedCell.site[1]) <
          requiredDistance
        );
      });
      if (tooClose) continue;
      seeds.push(entry.cellId);
    }
    if (seeds.length === 0) seeds.push(scored[0].cellId);

    const nationStartProvinceId = nextProvinceId;
    const noiseHash = hashSeed(`${seed}:province:${nationId}`);

    for (let splitIteration = 0; splitIteration < 8; splitIteration += 1) {
      for (const cell of nationCells) {
        provinceOwner[cell.id] = -1;
      }

      assignNationProvincesBySeeds(
        cells,
        owner,
        nationId,
        seeds,
        provinceOwner,
        nationStartProvinceId,
        noiseHash
      );

      const provinceToCells = new Map<number, number[]>();
      for (const cell of nationCells) {
        const provinceId = provinceOwner[cell.id];
        if (provinceId < 0) continue;
        if (!provinceToCells.has(provinceId)) provinceToCells.set(provinceId, []);
        (provinceToCells.get(provinceId) as number[]).push(cell.id);
      }

      let addedSeed = false;
      for (const [provinceId, provinceCells] of provinceToCells) {
        const share = provinceCells.length / nationCells.length;
        const plainsCount = provinceCells.filter((cellId) => {
          const terrain = cells[cellId].terrain;
          return terrain === 'plains' || terrain === 'valley' || terrain === 'coast';
        }).length;
        const plainsShare = plainsCount / Math.max(1, provinceCells.length);
        const maxShare = plainsShare >= 0.45 ? 0.15 : 0.25;
        if (share <= maxShare) continue;

        const seedCellId = seeds[provinceId - nationStartProvinceId];
        let farthestCellId = seedCellId;
        let farthestDistance = -1;
        for (const cellId of provinceCells) {
          const distance = Math.hypot(
            cells[cellId].site[0] - cells[seedCellId].site[0],
            cells[cellId].site[1] - cells[seedCellId].site[1]
          );
          if (distance > farthestDistance) {
            farthestDistance = distance;
            farthestCellId = cellId;
          }
        }

        const tooClose = seeds.some((existingSeedId) => {
          if (existingSeedId === seedCellId) return false;
          return (
            Math.hypot(
              cells[existingSeedId].site[0] - cells[farthestCellId].site[0],
              cells[existingSeedId].site[1] - cells[farthestCellId].site[1]
            ) < 26
          );
        });
        if (tooClose) continue;

        seeds.push(farthestCellId);
        addedSeed = true;
        break;
      }
      if (!addedSeed) break;
    }
    nextProvinceId = nationStartProvinceId + seeds.length;
  }
  return provinceOwner;
}

function enforceProvinceContiguity(
  cells: TMapCell[],
  owner: Int32Array,
  provinceOwner: Int32Array
) {
  const provinceIds = Array.from(new Set(provinceOwner)).filter((provinceId) => provinceId >= 0);
  for (const provinceId of provinceIds) {
    const provinceCells = cells.filter(
      (cell) => isLand(cell) && provinceOwner[cell.id] === provinceId
    );
    if (provinceCells.length <= 1) continue;
    const nationId = owner[provinceCells[0].id];

    const visited = new Set<number>();
    const components: number[][] = [];
    for (const cell of provinceCells) {
      if (visited.has(cell.id)) continue;
      const queue = [cell.id];
      const component: number[] = [];
      visited.add(cell.id);
      while (queue.length > 0) {
        const current = queue.pop() as number;
        component.push(current);
        for (const neighborId of cells[current].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          if (provinceOwner[neighborId] !== provinceId) continue;
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
      components.push(component);
    }

    if (components.length <= 1) continue;
    components.sort((a, b) => b.length - a.length);

    for (let index = 1; index < components.length; index += 1) {
      for (const cellId of components[index]) {
        const neighborCounts = new Map<number, number>();
        for (const neighborId of cells[cellId].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          const candidateProvinceId = provinceOwner[neighborId];
          if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
          neighborCounts.set(
            candidateProvinceId,
            (neighborCounts.get(candidateProvinceId) || 0) + 1
          );
        }
        let bestProvinceId = provinceId;
        let bestCount = -1;
        for (const [candidateProvinceId, count] of neighborCounts) {
          if (count > bestCount) {
            bestCount = count;
            bestProvinceId = candidateProvinceId;
          }
        }
        provinceOwner[cellId] = bestProvinceId;
      }
    }
  }
}

export function buildGeopolitics({ mesh, seed }: TBuildGeopoliticsOptions): TMapMeshWithDelaunay {
  const owner = buildLandNations(mesh.cells, seed);
  enforceMinimumNationArea(mesh.cells, owner);
  enforceMainlandContiguity(mesh.cells, owner);
  fillUnclaimedLand(mesh.cells, owner);
  ensureAllLandClaimed(mesh.cells, owner);

  const { waterOwner, zoneType } = assignMaritimeZones(mesh.cells, owner, seed);
  const provinceOwner = buildNationProvinces(mesh.cells, owner, seed);
  enforceProvinceContiguity(mesh.cells, owner, provinceOwner);
  const nations = pickEconomicAndCapital(mesh.cells, owner, seed);

  const hubCellIds = new Set<number>();
  const capitalCellIds = new Set<number>();
  for (const nation of nations) {
    for (const hubCellId of nation.economicHubCellIds) hubCellIds.add(hubCellId);
    if (nation.capitalCellId !== null) capitalCellIds.add(nation.capitalCellId);
  }

  const cells = mesh.cells.map((cell) => {
    const landNationId = owner[cell.id] >= 0 ? owner[cell.id] : null;
    const waterNationId = waterOwner[cell.id] >= 0 ? waterOwner[cell.id] : null;

    return {
      ...cell,
      nationId: zoneType[cell.id] === 'land' ? landNationId : waterNationId,
      provinceId:
        zoneType[cell.id] === 'land'
          ? provinceOwner[cell.id] >= 0
            ? provinceOwner[cell.id]
            : null
          : null,
      zoneType: zoneType[cell.id],
      isEconomicHub: hubCellIds.has(cell.id),
      isCapital: capitalCellIds.has(cell.id),
    };
  });
  return { ...mesh, cells, nations };
}
