import { GEOPOLITICAL_CONFIG } from 'src/configs/mapConfig';
import { runMultiSourceExpansion } from 'src/services/map/core/expansionEngine';
import { clamp } from 'src/services/map/core/math';
import { sortStableDescByScore } from 'src/services/map/core/sort';
import { hashSeed } from 'src/services/map/seededRandom';
import { TMapCell } from 'src/types/map.types';
import { getProvinceSeedScore } from './costPolicies';
import { getBoundaryStepCost, isLand } from './geopoliticsShared';

function getMinimumProvinceCells(nationCellCount: number) {
  return Math.max(10, Math.floor(nationCellCount * 0.02));
}

function shouldForceSmallNationSplit(nationPopulation: number, nationCellCount: number) {
  return nationPopulation < 300000 && nationCellCount < 20;
}

function shouldIgnorePopulationConstraints(nationPopulation: number, nationCellCount: number) {
  return nationCellCount >= 30 && nationPopulation <= 150000;
}

function getMinimumProvincePopulation(nationPopulation: number) {
  if (nationPopulation <= 100000) return 0;
  if (nationPopulation < 300000) return 50000;
  return 100000;
}

const MANDATORY_MIN_PROVINCE_POPULATION = 500;

function getMinimumProvinceCountByPopulation(nationPopulation: number) {
  if (nationPopulation > 1000000) return 4;
  if (nationPopulation > 500000 && nationPopulation <= 1000000) return 3;
  if (nationPopulation >= 300000 && nationPopulation <= 500000) return 2;
  return 1;
}

function getRequiredMinimumProvinceCount(
  nationPopulation: number,
  nationCellCount: number,
  minProvinceCells: number,
  minProvincePopulation: number,
  forceSmallNationSplit: boolean,
  ignorePopulationConstraints: boolean
) {
  const minProvinceCount = Math.max(
    getMinimumProvinceCountByPopulation(nationPopulation),
    forceSmallNationSplit || ignorePopulationConstraints || nationPopulation >= 200000 ? 2 : 1
  );
  const maxByCells = Math.max(1, Math.floor(nationCellCount / Math.max(1, minProvinceCells)));
  const maxByPopulation =
    minProvincePopulation > 0
      ? Math.max(1, Math.floor(nationPopulation / minProvincePopulation))
      : Number.POSITIVE_INFINITY;
  return Math.min(minProvinceCount, Math.max(1, Math.min(maxByCells, maxByPopulation)));
}

function enforceMinimumProvinceCount(
  cells: TMapCell[],
  nationCellIds: number[],
  provinceOwner: Int32Array,
  requiredMinProvinceCount: number,
  nextProvinceIdRef: { value: number }
) {
  while (true) {
    const provinceIds = Array.from(
      new Set(nationCellIds.map((cellId) => provinceOwner[cellId]).filter((id) => id >= 0))
    );
    if (provinceIds.length >= requiredMinProvinceCount) break;
    if (provinceIds.length === 0) break;

    let largestProvinceId = provinceIds[0] as number;
    let largestCells = nationCellIds.filter(
      (cellId) => provinceOwner[cellId] === largestProvinceId
    );
    for (const provinceId of provinceIds) {
      const provinceCells = nationCellIds.filter((cellId) => provinceOwner[cellId] === provinceId);
      if (provinceCells.length > largestCells.length) {
        largestProvinceId = provinceId;
        largestCells = provinceCells;
      }
    }
    if (largestCells.length < 2) break;

    const seedA = largestCells[0] as number;
    let seedB = largestCells[0] as number;
    let bestDistance = -1;
    for (const cellId of largestCells) {
      const distance = Math.hypot(
        cells[cellId].site[0] - cells[seedA].site[0],
        cells[cellId].site[1] - cells[seedA].site[1]
      );
      if (distance > bestDistance) {
        bestDistance = distance;
        seedB = cellId;
      }
    }
    if (seedA === seedB) break;

    const newProvinceId = nextProvinceIdRef.value;
    nextProvinceIdRef.value += 1;
    provinceOwner[seedB] = newProvinceId;

    for (const cellId of largestCells) {
      if (cellId === seedA || cellId === seedB) continue;
      const distanceToA = Math.hypot(
        cells[cellId].site[0] - cells[seedA].site[0],
        cells[cellId].site[1] - cells[seedA].site[1]
      );
      const distanceToB = Math.hypot(
        cells[cellId].site[0] - cells[seedB].site[0],
        cells[cellId].site[1] - cells[seedB].site[1]
      );
      provinceOwner[cellId] = distanceToB < distanceToA ? newProvinceId : largestProvinceId;
    }
  }
}

function getProvinceTargetCount(
  cells: TMapCell[],
  minProvinceCells: number,
  maxProvinceCount: number
) {
  if (cells.length < 10) return 1;

  const totalPopulation = cells.reduce((sum, cell) => sum + cell.population, 0);
  const avgPopulation = totalPopulation / Math.max(1, cells.length);

  const pressureSum = cells.reduce((sum, cell) => {
    const populationFactor = clamp(cell.population / Math.max(1, avgPopulation), 0, 2.6);
    const ruggedPenalty =
      cell.terrain === 'mountains' || cell.terrain === 'desert' || cell.terrain === 'volcanic'
        ? 0.22
        : 0;
    const lowPopulation = cell.population < avgPopulation * 0.62;
    const remotePlain =
      (cell.terrain === 'plains' || cell.terrain === 'valley') &&
      cell.waterAccessibility < 0.38 &&
      !cell.isRiver &&
      !cell.isLake;
    const sparseLargeProvinceBias =
      lowPopulation &&
      (cell.terrain === 'mountains' ||
        cell.terrain === 'desert' ||
        cell.terrain === 'volcanic' ||
        remotePlain)
        ? 0.48
        : 0;
    const waterBonus =
      clamp(cell.waterAccessibility, 0, 1) * 0.24 + (cell.isRiver || cell.isLake ? 0.18 : 0);
    const pressure = clamp(
      1 + populationFactor * 0.58 + waterBonus - ruggedPenalty - sparseLargeProvinceBias,
      0.32,
      2.45
    );
    return sum + pressure;
  }, 0);

  const pressureAverage = pressureSum / Math.max(1, cells.length);
  const baseCount = cells.length / Math.max(1, minProvinceCells * 2.8);
  const pressureScaled = baseCount * (0.7 + pressureAverage * 0.9);
  const target = Math.max(1, Math.round(pressureScaled));
  return clamp(target, 1, maxProvinceCount);
}

function getMaxProvincePopulationShare(nationPopulation: number) {
  if (nationPopulation <= 1_000_000) return 0.5;
  if (nationPopulation <= 2_000_000) return 0.4;
  if (nationPopulation <= 5_000_000) return 0.35;
  return 0.3;
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
  const profile = GEOPOLITICAL_CONFIG.borderLevels.province;
  const localCost = new Float64Array(cells.length);
  localCost.fill(Number.POSITIVE_INFINITY);
  const seedStates: Array<{ cellId: number; provinceId: number; cost: number }> = [];

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const cellId = seeds[seedIndex];
    const provinceId = startProvinceId + seedIndex;
    provinceOwner[cellId] = provinceId;
    localCost[cellId] = 0;
    seedStates.push({ cellId, provinceId, cost: 0 });
  }

  runMultiSourceExpansion({
    seeds: seedStates,
    getPriority: (state) => state.cost,
    isStale: (state) => state.cost > localCost[state.cellId],
    expand: (current, push) => {
      for (const neighborId of cells[current.cellId].neighbors) {
        if (owner[neighborId] !== nationId) continue;
        if (!isLand(cells[neighborId])) continue;

        const step = getBoundaryStepCost(
          cells,
          provinceOwner,
          current.cellId,
          neighborId,
          current.provinceId,
          noiseHash,
          profile
        );

        const nextCost = current.cost + Math.max(0.25, step);
        if (nextCost < localCost[neighborId]) {
          localCost[neighborId] = nextCost;
          provinceOwner[neighborId] = current.provinceId;
          push({ cellId: neighborId, provinceId: current.provinceId, cost: nextCost });
        }
      }
    },
  });
}

export function buildNationProvinces(cells: TMapCell[], owner: Int32Array, seed: string) {
  const provinceOwner = new Int32Array(cells.length);
  provinceOwner.fill(-1);
  let nextProvinceId = 0;
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);

  for (const nationId of nationIds) {
    const nationCells = cells.filter((cell) => isLand(cell) && owner[cell.id] === nationId);
    if (nationCells.length === 0) continue;
    const nationPopulation = nationCells.reduce((sum, cell) => sum + cell.population, 0);
    const forceSmallNationSplit = shouldForceSmallNationSplit(nationPopulation, nationCells.length);
    const ignorePopulationConstraints = shouldIgnorePopulationConstraints(
      nationPopulation,
      nationCells.length
    );
    if (nationCells.length < 10 && !forceSmallNationSplit) {
      for (const cell of nationCells) provinceOwner[cell.id] = nextProvinceId;
      nextProvinceId += 1;
      continue;
    }

    const minProvinceCells = forceSmallNationSplit
      ? 1
      : getMinimumProvinceCells(nationCells.length);
    const minProvincePopulation = ignorePopulationConstraints
      ? 0
      : getMinimumProvincePopulation(nationPopulation);
    const minimumTarget = getRequiredMinimumProvinceCount(
      nationPopulation,
      nationCells.length,
      minProvinceCells,
      minProvincePopulation,
      forceSmallNationSplit,
      ignorePopulationConstraints
    );
    const maxByCells = Math.max(1, Math.floor(nationCells.length / Math.max(1, minProvinceCells)));
    const maxByPopulation =
      minProvincePopulation > 0
        ? Math.max(1, Math.floor(nationPopulation / minProvincePopulation))
        : Number.POSITIVE_INFINITY;
    const maxProvinceCount = Math.max(1, Math.min(maxByCells, maxByPopulation));
    const initialTarget = Math.max(
      minimumTarget,
      getProvinceTargetCount(nationCells, minProvinceCells, maxProvinceCount)
    );

    const scored = sortStableDescByScore(
      nationCells.map((cell) => ({ cellId: cell.id, score: getProvinceSeedScore(cell) }))
    );
    if (scored.length === 0) continue;

    const seeds: number[] = [];
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
    for (const entry of scored) {
      if (seeds.length >= minimumTarget) break;
      if (seeds.includes(entry.cellId)) continue;
      seeds.push(entry.cellId);
    }

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
      if (seeds.length < maxProvinceCount) {
        for (const [provinceId, provinceCells] of provinceToCells) {
          const share = provinceCells.length / nationCells.length;
          const provincePopulation = provinceCells.reduce(
            (sum, cellId) => sum + cells[cellId].population,
            0
          );
          const provincePopulationShare = provincePopulation / Math.max(1, nationPopulation);
          const maxProvincePopulationShare = getMaxProvincePopulationShare(nationPopulation);
          const plainsCount = provinceCells.filter((cellId) => {
            const terrain = cells[cellId].terrain;
            return terrain === 'plains' || terrain === 'valley' || terrain === 'coast';
          }).length;
          const plainsShare = plainsCount / Math.max(1, provinceCells.length);
          const maxShare = plainsShare >= 0.45 ? 0.15 : 0.25;
          const shouldSplitByArea = share > maxShare;
          const shouldSplitByPopulation = provincePopulationShare > maxProvincePopulationShare;
          if (!shouldSplitByArea && !shouldSplitByPopulation) continue;

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
      }
      if (!addedSeed) break;
    }
    nextProvinceId = nationStartProvinceId + seeds.length;
  }
  return provinceOwner;
}

export function enforceMinimumProvinceArea(
  cells: TMapCell[],
  owner: Int32Array,
  provinceOwner: Int32Array
) {
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  const nextProvinceIdRef = { value: Math.max(0, ...Array.from(provinceOwner)) + 1 };

  for (const nationId of nationIds) {
    const nationCellIds = cells
      .filter((cell) => isLand(cell) && owner[cell.id] === nationId)
      .map((cell) => cell.id);
    if (nationCellIds.length === 0) continue;
    const nationPopulation = nationCellIds.reduce(
      (sum, cellId) => sum + cells[cellId].population,
      0
    );
    const forceSmallNationSplit = shouldForceSmallNationSplit(
      nationPopulation,
      nationCellIds.length
    );
    const ignorePopulationConstraints = shouldIgnorePopulationConstraints(
      nationPopulation,
      nationCellIds.length
    );
    if (nationCellIds.length < 10 && !forceSmallNationSplit) {
      const provinceId = provinceOwner[nationCellIds[0] as number];
      for (const cellId of nationCellIds) provinceOwner[cellId] = provinceId;
      continue;
    }

    const minProvinceCells = forceSmallNationSplit
      ? 1
      : getMinimumProvinceCells(nationCellIds.length);
    const minProvincePopulation = ignorePopulationConstraints
      ? 0
      : getMinimumProvincePopulation(nationPopulation);
    const requiredMinimumProvinceCount = getRequiredMinimumProvinceCount(
      nationPopulation,
      nationCellIds.length,
      minProvinceCells,
      minProvincePopulation,
      forceSmallNationSplit,
      ignorePopulationConstraints
    );
    const assignedProvinceIds = Array.from(
      new Set(nationCellIds.map((cellId) => provinceOwner[cellId]).filter((id) => id >= 0))
    );
    if (assignedProvinceIds.length === 0) {
      const fallbackProvinceId = nextProvinceIdRef.value;
      nextProvinceIdRef.value += 1;
      for (const cellId of nationCellIds) provinceOwner[cellId] = fallbackProvinceId;
    }

    const provinceSize = new Map<number, number>();
    const provincePopulation = new Map<number, number>();
    for (const cellId of nationCellIds) {
      const provinceId = provinceOwner[cellId];
      if (provinceId < 0) continue;
      provinceSize.set(provinceId, (provinceSize.get(provinceId) || 0) + 1);
      provincePopulation.set(
        provinceId,
        (provincePopulation.get(provinceId) || 0) + cells[cellId].population
      );
    }

    const smallProvinceIds = Array.from(provinceSize.keys()).filter((provinceId) => {
      const size = provinceSize.get(provinceId) || 0;
      const population = provincePopulation.get(provinceId) || 0;
      const tooSmallByArea = size < minProvinceCells;
      const tooSmallByPopulation = minProvincePopulation > 0 && population < minProvincePopulation;
      const tooSmallByMandatoryPopulation = population < MANDATORY_MIN_PROVINCE_POPULATION;
      return tooSmallByArea || tooSmallByPopulation || tooSmallByMandatoryPopulation;
    });

    for (const provinceId of smallProvinceIds) {
      const provinceCells = nationCellIds.filter((cellId) => provinceOwner[cellId] === provinceId);
      for (const cellId of provinceCells) {
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

        let bestProvinceId = -1;
        let bestCount = 0;
        for (const [candidateProvinceId, count] of neighborCounts) {
          if (count > bestCount) {
            bestCount = count;
            bestProvinceId = candidateProvinceId;
          }
        }

        if (bestProvinceId < 0) {
          const point = cells[cellId].site;
          let bestDistance = Number.POSITIVE_INFINITY;
          for (const candidateCellId of nationCellIds) {
            const candidateProvinceId = provinceOwner[candidateCellId];
            if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
            const candidatePoint = cells[candidateCellId].site;
            const distance = Math.hypot(point[0] - candidatePoint[0], point[1] - candidatePoint[1]);
            if (distance < bestDistance) {
              bestDistance = distance;
              bestProvinceId = candidateProvinceId;
            }
          }
        }

        if (bestProvinceId >= 0) provinceOwner[cellId] = bestProvinceId;
      }
    }

    enforceMinimumProvinceCount(
      cells,
      nationCellIds,
      provinceOwner,
      requiredMinimumProvinceCount,
      nextProvinceIdRef
    );
  }
}

export function enforceProvinceContiguity(
  cells: TMapCell[],
  owner: Int32Array,
  provinceOwner: Int32Array
) {
  const provinceIds = Array.from(new Set(provinceOwner)).filter((provinceId) => provinceId >= 0);
  const stack: number[] = [];
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
      stack.length = 0;
      stack.push(cell.id);
      const component: number[] = [];
      visited.add(cell.id);
      while (stack.length > 0) {
        const current = stack.pop() as number;
        component.push(current);
        for (const neighborId of cells[current].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          if (provinceOwner[neighborId] !== provinceId) continue;
          if (visited.has(neighborId)) continue;
          visited.add(neighborId);
          stack.push(neighborId);
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
