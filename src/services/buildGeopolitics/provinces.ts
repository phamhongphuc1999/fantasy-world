import { clamp, findNearestCellId } from 'src/services';
import { runMultiSourceExpansion } from 'src/services/core/expansionEngine';
import { sortStableDescByScore } from 'src/services/core/sort';
import { hashSeed } from 'src/services/seededRandom';
import { provinceEffectiveSizeFactor } from 'src/services/terrainRules';
import { TCell, TCellOwnerParams } from 'src/types/map.types';
import { getProvinceSeedScore } from './costPolicies';
import { getBoundaryStepCost, isLand } from './geopoliticsShared';

const IDEAL_PROVINCE_POP = 500_000;
const MAX_PROVINCE_POP = 1_500_000;
const MERGE_POP_CAP = 800_000;
const MIN_POP_PERCENT = 0.03;
const MAX_POP_PERCENT = 0.12;
const SMALL_NATION_POPULATION_THRESHOLD = 1_000;
const SMALL_NATION_MIN_PROVINCE_POPULATION = 200;
const DEFAULT_MIN_PROVINCE_POPULATION = 1_000;
const PROVINCE_TUNING = {
  seedDistance: { plainOrValley: 42, other: 72, minBetweenSeeds: 26 },
  split: { maxIterations: 20, maxProvinceAreaFactor: 3.4 },
  rebalance: { softPasses: 2, strictPasses: 12 },
  thresholds: {
    lowPopulationRatio: 0.62,
    remotePlainWaterAccessibilityMax: 0.38,
    ruggedPenalty: 0.22,
    sparseLargeProvinceBias: 0.48,
    pressure: { min: 0.32, max: 2.45, popFactor: 0.58, waterFactor: 0.24, waterNodeBonus: 0.18 },
    geography: { largeSparseFactor: 1.35, terrainAdjustedMinFactor: 0.9 },
    economySpecialFactor: 1.45,
  },
} as const;

function computeEffectiveSize(cellIds: number[], effectiveCellWeightById: Float32Array) {
  let sum = 0;
  for (const cellId of cellIds) sum += effectiveCellWeightById[cellId];
  return sum;
}

function getDistanceSquared(a: TCell, b: TCell) {
  const dx = a.site[0] - b.site[0];
  const dy = a.site[1] - b.site[1];
  return dx * dx + dy * dy;
}

function groupNationCellsByProvince(nationCellIds: number[], provinceOwner: Int32Array) {
  const provinceToCells = new Map<number, number[]>();
  for (const cellId of nationCellIds) {
    const provinceId = provinceOwner[cellId];
    if (provinceId < 0) continue;
    if (!provinceToCells.has(provinceId)) provinceToCells.set(provinceId, []);
    (provinceToCells.get(provinceId) as number[]).push(cellId);
  }
  return provinceToCells;
}

function buildProvinceAggregates(
  nationCellIds: number[],
  provinceOwner: Int32Array,
  cells: TCell[]
) {
  const provinceSize = new Map<number, number>();
  const provincePopulation = new Map<number, number>();
  const provinceEconomy = new Map<number, number>();
  for (const cellId of nationCellIds) {
    const provinceId = provinceOwner[cellId];
    if (provinceId < 0) continue;
    provinceSize.set(provinceId, (provinceSize.get(provinceId) || 0) + 1);
    provincePopulation.set(
      provinceId,
      (provincePopulation.get(provinceId) || 0) + cells[cellId].population
    );
    provinceEconomy.set(provinceId, (provinceEconomy.get(provinceId) || 0) + cells[cellId].economy);
  }
  return { provinceSize, provincePopulation, provinceEconomy };
}

function getMinimumProvinceEffectiveSize(
  totalEffectiveNationSize: number,
  nationCellCount: number
) {
  if (nationCellCount < 10) return totalEffectiveNationSize;
  return Math.max(6, Math.ceil(totalEffectiveNationSize * 0.02));
}

function shouldForceSmallNationSplit(
  nationPopulation: number,
  nationCellCount: number,
  totalEffectiveNationSize: number
) {
  const averagePopulationPerCell = nationPopulation / Math.max(1, nationCellCount);
  return averagePopulationPerCell < 2000 && nationCellCount < 20 && totalEffectiveNationSize < 26;
}

function shouldIgnorePopulationConstraints(
  nationPopulation: number,
  nationCellCount: number,
  totalEffectiveNationSize: number
) {
  const averagePopulationPerCell = nationPopulation / Math.max(1, nationCellCount);
  const ruggedSparseNation =
    nationCellCount >= 24 &&
    averagePopulationPerCell < 1300 &&
    totalEffectiveNationSize / Math.max(1, nationCellCount) > 1.35;
  return (nationCellCount >= 30 && averagePopulationPerCell < 1200) || ruggedSparseNation;
}

function isSmallNation(nationPopulation: number) {
  return nationPopulation <= SMALL_NATION_POPULATION_THRESHOLD;
}

function getAbsoluteMinimumProvincePopulation(nationPopulation: number) {
  return isSmallNation(nationPopulation)
    ? SMALL_NATION_MIN_PROVINCE_POPULATION
    : DEFAULT_MIN_PROVINCE_POPULATION;
}

function getRuleBasedMinimumProvinceCount(nationPopulation: number) {
  if (nationPopulation > SMALL_NATION_POPULATION_THRESHOLD) return 2;
  return 1;
}

function getMinimumProvincePopulation(targetProvincePopulation: number, nationPopulation: number) {
  return Math.max(
    getAbsoluteMinimumProvincePopulation(nationPopulation),
    Math.floor(targetProvincePopulation * 0.7)
  );
}

function getMinimumProvinceCountByPopulation(nationPopulation: number) {
  if (nationPopulation > 1_000_000) return Math.ceil(nationPopulation / IDEAL_PROVINCE_POP);
  if (nationPopulation > 500_000 && nationPopulation <= 1_000_000) return 3;
  if (nationPopulation >= 300_000 && nationPopulation <= 500_000) return 2;
  return 1;
}

function getRequiredMinimumProvinceCount(
  nationPopulation: number,
  nationCellCount: number,
  minProvincePopulation: number,
  forceSmallNationSplit: boolean,
  ignorePopulationConstraints: boolean
) {
  const ruleBasedMinimumProvinceCount = getRuleBasedMinimumProvinceCount(nationPopulation);
  const originalMinProvinceCount = Math.max(
    getMinimumProvinceCountByPopulation(nationPopulation),
    forceSmallNationSplit || ignorePopulationConstraints || nationPopulation >= 200000
      ? 2
      : ruleBasedMinimumProvinceCount
  );
  const populationDrivenMinProvinceCount = Math.ceil(nationPopulation / IDEAL_PROVINCE_POP);
  const cellDrivenMinProvinceCount = Math.floor(nationCellCount / 25);
  const minProvinceCount = Math.max(
    originalMinProvinceCount,
    populationDrivenMinProvinceCount,
    cellDrivenMinProvinceCount
  );
  const maxProvincesByHardFloor = Math.max(1, Math.floor(1 / MIN_POP_PERCENT));
  const maxByCells = Math.max(1, nationCellCount);
  const maxByPopulation =
    minProvincePopulation > 0
      ? Math.max(1, Math.floor(nationPopulation / minProvincePopulation))
      : Number.POSITIVE_INFINITY;
  const maxByRule = isSmallNation(nationPopulation) ? 3 : Number.POSITIVE_INFINITY;
  const cappedMaxByPopulation =
    ruleBasedMinimumProvinceCount >= 2 ? Number.POSITIVE_INFINITY : maxByPopulation;
  return Math.min(
    maxProvincesByHardFloor,
    Math.min(minProvinceCount, Math.max(1, Math.min(maxByCells, cappedMaxByPopulation, maxByRule)))
  );
}

function getProvincePlanningMetrics(
  nationPopulation: number,
  nationCellCount: number,
  totalEffectiveNationSize: number,
  forceSmallNationSplit: boolean,
  ignorePopulationConstraints: boolean
) {
  const minProvinceEffectiveSize = forceSmallNationSplit
    ? 1
    : getMinimumProvinceEffectiveSize(totalEffectiveNationSize, nationCellCount);
  const maxByEffectiveSize = Math.max(
    1,
    Math.floor(totalEffectiveNationSize / Math.max(1, minProvinceEffectiveSize))
  );
  const baselineByPopulation = getMinimumProvinceCountByPopulation(nationPopulation);
  let baselineTarget = Math.max(1, Math.min(maxByEffectiveSize, baselineByPopulation));
  if (nationPopulation > 1_000_000) {
    baselineTarget = clamp(
      baselineTarget,
      Math.floor(1 / MAX_POP_PERCENT),
      Math.floor(1 / MIN_POP_PERCENT)
    );
  }
  const targetPopPerProvince = nationPopulation / Math.max(1, baselineTarget);
  const minProvincePopulation = getMinimumProvincePopulation(
    targetPopPerProvince,
    nationPopulation
  );
  const requiredMinimumProvinceCount = getRequiredMinimumProvinceCount(
    nationPopulation,
    nationCellCount,
    minProvincePopulation,
    forceSmallNationSplit,
    ignorePopulationConstraints
  );
  const maxByCells = Math.max(
    1,
    Math.floor(totalEffectiveNationSize / Math.max(1, minProvinceEffectiveSize))
  );
  const maxByPopulation =
    minProvincePopulation > 0
      ? Math.max(1, Math.floor(nationPopulation / minProvincePopulation))
      : Number.POSITIVE_INFINITY;
  const maxByRule = isSmallNation(nationPopulation) ? 3 : Number.POSITIVE_INFINITY;
  const minProvinceCountByRule = getRuleBasedMinimumProvinceCount(nationPopulation);
  const cappedMaxByPopulation =
    minProvinceCountByRule >= 2 ? Number.POSITIVE_INFINITY : maxByPopulation;
  const maxProvinceCount = Math.max(
    minProvinceCountByRule,
    Math.min(maxByCells, cappedMaxByPopulation, maxByRule)
  );
  return {
    minProvinceEffectiveSize,
    baselineTarget,
    minProvincePopulation,
    requiredMinimumProvinceCount,
    maxProvinceCount,
  };
}

function getPopulationBounds(nationPopulation: number, targetProvinceCount: number) {
  const target = nationPopulation / Math.max(1, targetProvinceCount);
  return {
    target,
    min: Math.max(Math.floor(nationPopulation * MIN_POP_PERCENT), Math.floor(target * 0.7)),
    max: Math.min(
      MAX_PROVINCE_POP,
      Math.floor(nationPopulation * MAX_POP_PERCENT),
      Math.ceil(target * 1.2)
    ),
  };
}

function isMetropolisException(
  provinceCells: number[],
  provincePopulation: number,
  maxPopulation: number,
  minProvinceEffectiveSize: number,
  effectiveCellWeightById: Float32Array
) {
  if (provinceCells.length > 2) return false;
  if (provincePopulation <= maxPopulation) return false;
  const effectiveSize = computeEffectiveSize(provinceCells, effectiveCellWeightById);
  return effectiveSize <= minProvinceEffectiveSize;
}

function getAverageTerrainFactor(cellIds: number[], effectiveCellWeightById: Float32Array) {
  if (cellIds.length === 0) return 1;
  return computeEffectiveSize(cellIds, effectiveCellWeightById) / cellIds.length;
}

function getDominantTerrain(cellIds: number[], cells: TCell[]) {
  const counts = new Map<string, number>();
  for (const cellId of cellIds) {
    const terrain = cells[cellId].terrain;
    counts.set(terrain, (counts.get(terrain) || 0) + 1);
  }
  let dominant = 'plains';
  let best = -1;
  for (const [terrain, count] of counts) {
    if (count > best) {
      best = count;
      dominant = terrain;
    }
  }
  return dominant;
}

function getCellCapByDensity(population: number, cellCount: number) {
  const density = population / Math.max(1, cellCount);
  if (density > 10_000) return 20;
  if (density < 1_000) return 150;
  const t = (density - 1_000) / 9_000;
  return Math.round(150 - t * 130);
}

function enforceMinimumProvinceCount(
  cells: TCell[],
  nationCellIds: number[],
  provinceOwner: Int32Array,
  requiredMinProvinceCount: number,
  nationPopulation: number,
  nextProvinceIdRef: { value: number }
) {
  const hardFloorPopulation = Math.floor(nationPopulation * MIN_POP_PERCENT);
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
    const largestProvincePopulation = largestCells.reduce(
      (sum, cellId) => sum + cells[cellId].population,
      0
    );
    // Prevent creating new below-floor provinces during minimum-count splitting.
    if (largestProvincePopulation < hardFloorPopulation * 2) break;

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
  cells: TCell[],
  minProvinceEffectiveSize: number,
  totalEffectiveNationSize: number,
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
    const lowPopulation =
      cell.population < avgPopulation * PROVINCE_TUNING.thresholds.lowPopulationRatio;
    const remotePlain =
      (cell.terrain === 'plains' || cell.terrain === 'valley') &&
      cell.waterAccessibility < PROVINCE_TUNING.thresholds.remotePlainWaterAccessibilityMax &&
      !cell.isRiver &&
      !cell.isLake;
    const sparseLargeProvinceBias =
      lowPopulation &&
      (cell.terrain === 'mountains' ||
        cell.terrain === 'desert' ||
        cell.terrain === 'volcanic' ||
        remotePlain)
        ? PROVINCE_TUNING.thresholds.sparseLargeProvinceBias
        : 0;
    const waterBonus =
      clamp(cell.waterAccessibility, 0, 1) * PROVINCE_TUNING.thresholds.pressure.waterFactor +
      (cell.isRiver || cell.isLake ? PROVINCE_TUNING.thresholds.pressure.waterNodeBonus : 0);
    const pressure = clamp(
      1 +
        populationFactor * PROVINCE_TUNING.thresholds.pressure.popFactor +
        waterBonus -
        ruggedPenalty -
        sparseLargeProvinceBias,
      PROVINCE_TUNING.thresholds.pressure.min,
      PROVINCE_TUNING.thresholds.pressure.max
    );
    return sum + pressure;
  }, 0);

  const pressureAverage = pressureSum / Math.max(1, cells.length);
  const baseCount = totalEffectiveNationSize / Math.max(1, minProvinceEffectiveSize * 2.8);
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
  cells: TCell[],
  owner: Int32Array,
  nationId: number,
  seeds: number[],
  provinceOwner: Int32Array,
  startProvinceId: number,
  noiseHash: number
) {
  const localCost = new Float64Array(cells.length);
  localCost.fill(Number.POSITIVE_INFINITY);
  const seedStates: Array<{ cellId: number; provinceId: number; cost: number }> = [];
  const seedTerrainByProvinceId = new Map<number, string>();

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const cellId = seeds[seedIndex];
    const provinceId = startProvinceId + seedIndex;
    provinceOwner[cellId] = provinceId;
    localCost[cellId] = 0;
    seedTerrainByProvinceId.set(provinceId, cells[cellId].terrain);
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
          'province'
        );

        const seedTerrain = seedTerrainByProvinceId.get(current.provinceId);
        const terrainMismatchMultiplier =
          seedTerrain && cells[neighborId].terrain !== seedTerrain ? 3 : 1;
        const nextCost = current.cost + Math.max(0.25, step * terrainMismatchMultiplier);
        if (nextCost < localCost[neighborId]) {
          localCost[neighborId] = nextCost;
          provinceOwner[neighborId] = current.provinceId;
          push({ cellId: neighborId, provinceId: current.provinceId, cost: nextCost });
        }
      }
    },
  });
}

export function buildNationProvinces(cells: TCell[], owner: Int32Array, seed: string) {
  const provinceOwner = new Int32Array(cells.length);
  provinceOwner.fill(-1);
  // Compute terrain-adjusted management weight once for performance.
  const effectiveCellWeightById = new Float32Array(cells.length);
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    effectiveCellWeightById[cellId] = provinceEffectiveSizeFactor(cells[cellId].terrain);
  }
  let nextProvinceId = 0;
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);

  for (const nationId of nationIds) {
    const nationCells = cells.filter((cell) => isLand(cell) && owner[cell.id] === nationId);
    if (nationCells.length === 0) continue;
    const nationCellIds = nationCells.map((cell) => cell.id);
    const nationPopulation = nationCells.reduce((sum, cell) => sum + cell.population, 0);
    const totalEffectiveNationSize = computeEffectiveSize(nationCellIds, effectiveCellWeightById);
    const forceSmallNationSplit = shouldForceSmallNationSplit(
      nationPopulation,
      nationCells.length,
      totalEffectiveNationSize
    );
    const ignorePopulationConstraints = shouldIgnorePopulationConstraints(
      nationPopulation,
      nationCells.length,
      totalEffectiveNationSize
    );
    if (
      (nationCells.length < 10 || totalEffectiveNationSize < 10.5 || nationPopulation < 1200) &&
      !forceSmallNationSplit
    ) {
      for (const cell of nationCells) provinceOwner[cell.id] = nextProvinceId;
      nextProvinceId += 1;
      continue;
    }

    const { minProvinceEffectiveSize, requiredMinimumProvinceCount, maxProvinceCount } =
      getProvincePlanningMetrics(
        nationPopulation,
        nationCells.length,
        totalEffectiveNationSize,
        forceSmallNationSplit,
        ignorePopulationConstraints
      );
    const initialTarget = Math.max(
      requiredMinimumProvinceCount,
      getProvinceTargetCount(
        nationCells,
        minProvinceEffectiveSize,
        totalEffectiveNationSize,
        maxProvinceCount
      )
    );
    const basePopulationBounds = getPopulationBounds(nationPopulation, initialTarget);

    const scored = sortStableDescByScore(
      nationCells.map((cell) => ({ cellId: cell.id, score: getProvinceSeedScore(cell) }))
    );
    if (scored.length === 0) continue;

    const seeds: number[] = [];
    for (const entry of scored) {
      if (seeds.length >= initialTarget) break;
      const candidate = cells[entry.cellId];
      const requiredDistance =
        candidate.terrain === 'plains' || candidate.terrain === 'valley'
          ? PROVINCE_TUNING.seedDistance.plainOrValley
          : PROVINCE_TUNING.seedDistance.other;
      const minDistanceSquared = requiredDistance * requiredDistance;
      const tooClose = seeds.some(
        (seedCellId) => getDistanceSquared(candidate, cells[seedCellId]) < minDistanceSquared
      );
      if (tooClose) continue;
      seeds.push(entry.cellId);
    }
    if (seeds.length === 0) seeds.push(scored[0].cellId);
    for (const entry of scored) {
      if (seeds.length >= requiredMinimumProvinceCount) break;
      if (seeds.includes(entry.cellId)) continue;
      seeds.push(entry.cellId);
    }

    const nationStartProvinceId = nextProvinceId;
    const noiseHash = hashSeed(`${seed}:province:${nationId}`);
    let metropolisExceptionUsed = false;

    for (
      let splitIteration = 0;
      splitIteration < PROVINCE_TUNING.split.maxIterations;
      splitIteration += 1
    ) {
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

      const provinceToCells = groupNationCellsByProvince(nationCellIds, provinceOwner);

      const hasOverCapProvince = Array.from(provinceToCells.values()).some((provinceCells) => {
        const population = provinceCells.reduce((sum, cellId) => sum + cells[cellId].population, 0);
        return population > MAX_PROVINCE_POP;
      });

      let addedSeed = false;
      if (seeds.length < maxProvinceCount || hasOverCapProvince) {
        const dynamicPopulationBounds = getPopulationBounds(
          nationPopulation,
          Math.max(1, seeds.length)
        );
        const provincePopulationById = new Map<number, number>();
        for (const [provinceId, provinceCells] of provinceToCells) {
          provincePopulationById.set(
            provinceId,
            provinceCells.reduce((sum, cellId) => sum + cells[cellId].population, 0)
          );
        }
        const prioritizedByPopulation = Array.from(provinceToCells.entries()).sort(
          (left, right) =>
            (provincePopulationById.get(right[0]) || 0) - (provincePopulationById.get(left[0]) || 0)
        );
        for (const [provinceId, provinceCells] of prioritizedByPopulation) {
          const provincePopulation = provincePopulationById.get(provinceId) || 0;
          const cellCapByDensity = getCellCapByDensity(provincePopulation, provinceCells.length);
          const effectiveProvinceSize = computeEffectiveSize(
            provinceCells,
            effectiveCellWeightById
          );
          const maxProvincePopulationShare = getMaxProvincePopulationShare(nationPopulation);
          const provincePopulationShare = provincePopulation / Math.max(1, nationPopulation);
          const exceedsHardPopulationCap = provincePopulation > dynamicPopulationBounds.max;
          const canUseMetropolisException =
            !metropolisExceptionUsed &&
            isMetropolisException(
              provinceCells,
              provincePopulation,
              dynamicPopulationBounds.max,
              minProvinceEffectiveSize,
              effectiveCellWeightById
            );
          if (canUseMetropolisException) {
            metropolisExceptionUsed = true;
            continue;
          }

          const shouldSplitByPopulation =
            exceedsHardPopulationCap ||
            (provincePopulationShare > maxProvincePopulationShare &&
              provincePopulation > basePopulationBounds.target * 1.05);
          const shouldSplitByDensityArea = provinceCells.length > cellCapByDensity;
          const shouldSplitByArea =
            effectiveProvinceSize >
            minProvinceEffectiveSize * PROVINCE_TUNING.split.maxProvinceAreaFactor;
          if (!shouldSplitByPopulation && !shouldSplitByArea && !shouldSplitByDensityArea) continue;

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

          const minSeedDistanceSquared =
            PROVINCE_TUNING.seedDistance.minBetweenSeeds *
            PROVINCE_TUNING.seedDistance.minBetweenSeeds;
          const tooClose = seeds.some((existingSeedId) => {
            if (existingSeedId === seedCellId) return false;
            return (
              getDistanceSquared(cells[existingSeedId], cells[farthestCellId]) <
              minSeedDistanceSquared
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

export function minProvinceArea(params: TCellOwnerParams) {
  const { cells, owner, provinceOwner } = params;
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);
  // Compute terrain-adjusted management weight once for performance.
  const effectiveCellWeightById = new Float32Array(cells.length);
  for (let cellId = 0; cellId < cells.length; cellId += 1) {
    effectiveCellWeightById[cellId] = provinceEffectiveSizeFactor(cells[cellId].terrain);
  }
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
    const totalEffectiveNationSize = computeEffectiveSize(nationCellIds, effectiveCellWeightById);
    const forceSmallNationSplit = shouldForceSmallNationSplit(
      nationPopulation,
      nationCellIds.length,
      totalEffectiveNationSize
    );
    const ignorePopulationConstraints = shouldIgnorePopulationConstraints(
      nationPopulation,
      nationCellIds.length,
      totalEffectiveNationSize
    );
    if (
      (nationCellIds.length < 10 || totalEffectiveNationSize < 10.5 || nationPopulation < 1200) &&
      !forceSmallNationSplit
    ) {
      const provinceId = provinceOwner[nationCellIds[0] as number];
      for (const cellId of nationCellIds) provinceOwner[cellId] = provinceId;
      continue;
    }

    const {
      minProvinceEffectiveSize,
      baselineTarget,
      minProvincePopulation,
      requiredMinimumProvinceCount,
    } = getProvincePlanningMetrics(
      nationPopulation,
      nationCellIds.length,
      totalEffectiveNationSize,
      forceSmallNationSplit,
      ignorePopulationConstraints
    );
    const populationBounds = getPopulationBounds(nationPopulation, Math.max(1, baselineTarget));
    const assignedProvinceIds = Array.from(
      new Set(nationCellIds.map((cellId) => provinceOwner[cellId]).filter((id) => id >= 0))
    );
    if (assignedProvinceIds.length === 0) {
      const fallbackProvinceId = nextProvinceIdRef.value;
      nextProvinceIdRef.value += 1;
      for (const cellId of nationCellIds) provinceOwner[cellId] = fallbackProvinceId;
    }

    const { provinceSize, provincePopulation, provinceEconomy } = buildProvinceAggregates(
      nationCellIds,
      provinceOwner,
      cells
    );
    const nationAverageEconomyPerCell =
      nationCellIds.reduce((sum, cellId) => sum + cells[cellId].economy, 0) /
      Math.max(1, nationCellIds.length);

    const mandatoryMinProvincePopulation = getAbsoluteMinimumProvincePopulation(nationPopulation);
    const enforceMandatoryPopulationFloor = !ignorePopulationConstraints;
    const smallProvinceIds = Array.from(provinceSize.keys()).filter((provinceId) => {
      const population = provincePopulation.get(provinceId) || 0;
      const provinceCellIds = nationCellIds.filter(
        (cellId) => provinceOwner[cellId] === provinceId
      );
      const effectiveProvinceSize = computeEffectiveSize(provinceCellIds, effectiveCellWeightById);
      const averageTerrainFactor = getAverageTerrainFactor(
        provinceCellIds,
        effectiveCellWeightById
      );
      const terrainAdjustedPopulationMin =
        averageTerrainFactor >= 1.45
          ? Math.floor(
              minProvincePopulation * PROVINCE_TUNING.thresholds.geography.terrainAdjustedMinFactor
            )
          : minProvincePopulation;
      const tooSmallByArea = effectiveProvinceSize < minProvinceEffectiveSize;
      const tooSmallByPopulation =
        terrainAdjustedPopulationMin > 0 && population < terrainAdjustedPopulationMin;
      const tooSmallByMandatoryPopulation =
        enforceMandatoryPopulationFloor && population < mandatoryMinProvincePopulation;
      const isUnderpopulatedHardFloor = population < Math.floor(nationPopulation * MIN_POP_PERCENT);
      const isDenseUrbanProvince = population > populationBounds.target * 1.2;
      if (isDenseUrbanProvince) return false;
      const isAbovePopulationCap = population > populationBounds.max;
      if (isAbovePopulationCap) return false;
      const size = provinceSize.get(provinceId) || 0;
      const economy = provinceEconomy.get(provinceId) || 0;
      const economyPerCell = economy / Math.max(1, size);
      const isSpecialEconomyProvince =
        economyPerCell >
        nationAverageEconomyPerCell * PROVINCE_TUNING.thresholds.economySpecialFactor;
      if (isSpecialEconomyProvince) return false;
      const isGeographicallyLargeSparseProvince =
        effectiveProvinceSize >=
        minProvinceEffectiveSize * PROVINCE_TUNING.thresholds.geography.largeSparseFactor;
      if (isGeographicallyLargeSparseProvince && tooSmallByPopulation) return false;
      // Trade-off: accept around +/-30% population variance to preserve terrain-shaped provinces.
      return (
        isUnderpopulatedHardFloor ||
        (tooSmallByArea && tooSmallByPopulation) ||
        tooSmallByMandatoryPopulation
      );
    });

    for (const provinceId of smallProvinceIds) {
      const provinceCells = nationCellIds.filter((cellId) => provinceOwner[cellId] === provinceId);
      const dominantTerrain = getDominantTerrain(provinceCells, cells);
      const currentPopulation = provincePopulation.get(provinceId) || 0;
      const underPopulatedByHardFloor =
        currentPopulation < Math.floor(nationPopulation * MIN_POP_PERCENT);
      for (const cellId of provinceCells) {
        const sameTerrainNeighborCounts = new Map<number, number>();
        const mixedTerrainNeighborCounts = new Map<number, number>();
        for (const neighborId of cells[cellId].neighbors) {
          if (owner[neighborId] !== nationId) continue;
          const candidateProvinceId = provinceOwner[neighborId];
          if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
          const mergedPopulation =
            (provincePopulation.get(candidateProvinceId) || 0) +
            (provincePopulation.get(provinceId) || 0);
          if (mergedPopulation > MERGE_POP_CAP) continue;
          if (cells[neighborId].terrain === dominantTerrain) {
            sameTerrainNeighborCounts.set(
              candidateProvinceId,
              (sameTerrainNeighborCounts.get(candidateProvinceId) || 0) + 1
            );
          } else {
            mixedTerrainNeighborCounts.set(
              candidateProvinceId,
              (mixedTerrainNeighborCounts.get(candidateProvinceId) || 0) + 1
            );
          }
        }

        let bestProvinceId = -1;
        let bestCount = 0;
        const prioritizedCounts =
          underPopulatedByHardFloor && sameTerrainNeighborCounts.size > 0
            ? sameTerrainNeighborCounts
            : sameTerrainNeighborCounts.size > 0
              ? sameTerrainNeighborCounts
              : mixedTerrainNeighborCounts;
        for (const [candidateProvinceId, count] of prioritizedCounts) {
          if (count > bestCount) {
            bestCount = count;
            bestProvinceId = candidateProvinceId;
          }
        }

        if (bestProvinceId < 0) {
          const nearestCellId = findNearestCellId(
            cells,
            cells[cellId].site,
            nationCellIds,
            (id) => {
              const candidateProvinceId = provinceOwner[id];
              return candidateProvinceId >= 0 && candidateProvinceId !== provinceId;
            }
          );
          if (nearestCellId >= 0) {
            bestProvinceId = provinceOwner[nearestCellId];
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
      nationPopulation,
      nextProvinceIdRef
    );

    // FinalRebalance (soft): force-merge provinces below hard 3% floor, prioritizing terrain-homogeneous neighbors.
    for (
      let rebalancePass = 0;
      rebalancePass < PROVINCE_TUNING.rebalance.softPasses;
      rebalancePass += 1
    ) {
      const provinceToCells = groupNationCellsByProvince(nationCellIds, provinceOwner);

      let changed = false;
      for (const [provinceId, provinceCells] of provinceToCells) {
        const population = provinceCells.reduce((sum, cellId) => sum + cells[cellId].population, 0);
        if (population >= Math.floor(nationPopulation * MIN_POP_PERCENT)) continue;
        const dominantTerrain = getDominantTerrain(provinceCells, cells);

        for (const cellId of provinceCells) {
          let bestProvinceId = -1;
          let bestScore = -1;
          for (const neighborId of cells[cellId].neighbors) {
            if (owner[neighborId] !== nationId) continue;
            const candidateProvinceId = provinceOwner[neighborId];
            if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
            const mergedPopulation =
              (provinceToCells
                .get(candidateProvinceId)
                ?.reduce((sum, id) => sum + cells[id].population, 0) || 0) + population;
            if (mergedPopulation > MERGE_POP_CAP) continue;
            const terrainScore = cells[neighborId].terrain === dominantTerrain ? 2 : 1;
            if (terrainScore > bestScore) {
              bestScore = terrainScore;
              bestProvinceId = candidateProvinceId;
            }
          }
          if (bestProvinceId >= 0) {
            provinceOwner[cellId] = bestProvinceId;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }

    // StrictFloorEnforcement: ensure all provinces satisfy population >= 3% of national population.
    // If soft rebalance cannot satisfy the floor, we continue merging until the floor is met.
    const hardFloorPopulation = Math.floor(nationPopulation * MIN_POP_PERCENT);
    for (let strictPass = 0; strictPass < PROVINCE_TUNING.rebalance.strictPasses; strictPass += 1) {
      const provinceToCells = groupNationCellsByProvince(nationCellIds, provinceOwner);

      const provincePop = new Map<number, number>();
      for (const [provinceId, cellIds] of provinceToCells) {
        provincePop.set(
          provinceId,
          cellIds.reduce((sum, cellId) => sum + cells[cellId].population, 0)
        );
      }

      const underFloor = Array.from(provinceToCells.entries())
        .filter(([provinceId]) => (provincePop.get(provinceId) || 0) < hardFloorPopulation)
        .sort((left, right) => (provincePop.get(left[0]) || 0) - (provincePop.get(right[0]) || 0));
      if (underFloor.length === 0) break;

      let changed = false;
      for (const [provinceId, cellIds] of underFloor) {
        const currentPop = provincePop.get(provinceId) || 0;
        if (currentPop >= hardFloorPopulation) continue;
        const dominantTerrain = getDominantTerrain(cellIds, cells);

        const candidateScores = new Map<
          number,
          { touch: number; terrainMatch: number; mergedPop: number }
        >();
        for (const cellId of cellIds) {
          for (const neighborId of cells[cellId].neighbors) {
            if (owner[neighborId] !== nationId) continue;
            const candidateProvinceId = provinceOwner[neighborId];
            if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
            const mergedPop = (provincePop.get(candidateProvinceId) || 0) + currentPop;
            const prev = candidateScores.get(candidateProvinceId);
            const terrainMatch = cells[neighborId].terrain === dominantTerrain ? 1 : 0;
            if (!prev) {
              candidateScores.set(candidateProvinceId, { touch: 1, terrainMatch, mergedPop });
            } else {
              prev.touch += 1;
              prev.terrainMatch += terrainMatch;
              prev.mergedPop = mergedPop;
            }
          }
        }
        if (candidateScores.size === 0) continue;

        let bestProvinceId = -1;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const [candidateProvinceId, stat] of candidateScores) {
          const reachesFloor = stat.mergedPop >= hardFloorPopulation ? 1 : 0;
          const overshoot = Math.abs(stat.mergedPop - hardFloorPopulation);
          const score =
            reachesFloor * 1_000_000 +
            stat.terrainMatch * 10_000 +
            stat.touch * 100 -
            overshoot * 0.001;
          if (score > bestScore) {
            bestScore = score;
            bestProvinceId = candidateProvinceId;
          }
        }
        if (bestProvinceId < 0) continue;

        for (const cellId of cellIds) {
          provinceOwner[cellId] = bestProvinceId;
        }
        changed = true;
      }
      if (!changed) break;
    }
  }
}

export function limitProvincePopulation(params: TCellOwnerParams) {
  const { cells, owner, provinceOwner } = params;
  const nationIds = Array.from(new Set(owner)).filter((nationId) => nationId >= 0);

  for (const nationId of nationIds) {
    const nationCellIds = cells
      .filter((cell) => isLand(cell) && owner[cell.id] === nationId)
      .map((cell) => cell.id);
    if (nationCellIds.length === 0) continue;
    const nationPopulation = nationCellIds.reduce(
      (sum, cellId) => sum + cells[cellId].population,
      0
    );
    const hardFloorPopulation = Math.floor(nationPopulation * MIN_POP_PERCENT);

    for (let pass = 0; pass < 12; pass += 1) {
      const provinceToCells = new Map<number, number[]>();
      for (const cellId of nationCellIds) {
        const provinceId = provinceOwner[cellId];
        if (provinceId < 0) continue;
        if (!provinceToCells.has(provinceId)) provinceToCells.set(provinceId, []);
        (provinceToCells.get(provinceId) as number[]).push(cellId);
      }

      const provincePop = new Map<number, number>();
      for (const [provinceId, cellIds] of provinceToCells) {
        provincePop.set(
          provinceId,
          cellIds.reduce((sum, cellId) => sum + cells[cellId].population, 0)
        );
      }

      const underFloor = Array.from(provinceToCells.entries())
        .filter(([provinceId]) => (provincePop.get(provinceId) || 0) < hardFloorPopulation)
        .sort((left, right) => (provincePop.get(left[0]) || 0) - (provincePop.get(right[0]) || 0));
      if (underFloor.length === 0) break;

      let changed = false;
      for (const [provinceId, cellIds] of underFloor) {
        const dominantTerrain = getDominantTerrain(cellIds, cells);
        const currentPop = provincePop.get(provinceId) || 0;

        let bestProvinceId = -1;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const cellId of cellIds) {
          for (const neighborId of cells[cellId].neighbors) {
            if (owner[neighborId] !== nationId) continue;
            const candidateProvinceId = provinceOwner[neighborId];
            if (candidateProvinceId < 0 || candidateProvinceId === provinceId) continue;
            const mergedPop = (provincePop.get(candidateProvinceId) || 0) + currentPop;
            const terrainScore = cells[neighborId].terrain === dominantTerrain ? 1 : 0;
            const reachesFloor = mergedPop >= hardFloorPopulation ? 1 : 0;
            const score =
              reachesFloor * 1_000_000 +
              terrainScore * 10_000 -
              Math.abs(mergedPop - hardFloorPopulation) * 0.001;
            if (score > bestScore) {
              bestScore = score;
              bestProvinceId = candidateProvinceId;
            }
          }
        }

        if (bestProvinceId < 0) continue;
        for (const cellId of cellIds) provinceOwner[cellId] = bestProvinceId;
        changed = true;
      }
      if (!changed) break;
    }
  }
}

export function enforceProvinceConnect(params: TCellOwnerParams) {
  const { cells, owner, provinceOwner } = params;
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
