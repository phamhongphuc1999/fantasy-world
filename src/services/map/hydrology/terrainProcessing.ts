import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TMapCell, TTerrainBand, TTerrainRatioMap } from 'src/types/map.types';
import { clamp, getNeighborAverageElevation, isWaterTerrain } from './hydrologyUtils';

type TTerrainBalance = typeof HYDROLOGY_CONFIG.terrainBalance;
function isLockedTerrain(cell: TMapCell, terrain: TTerrainBand) {
  if (isWaterTerrain(terrain)) return true;
  if (terrain === 'mountains' || terrain === 'tundra') return true;
  if (terrain === 'volcanic') return true;
  if (cell.isRiver && terrain === 'valley') return true;
  return false;
}

function getTerrainFitness(
  terrain: TTerrainBand,
  cell: TMapCell,
  seaLevel: number,
  relief: number
): number {
  if (terrain === 'valley') {
    if (cell.elevation > 0.72) return -10;
    return (cell.isRiver ? 1.2 : 0.5) + (relief < -0.01 ? 0.45 : 0) + cell.precipitation * 0.25;
  }

  if (terrain === 'desert') {
    if (cell.elevation > 0.72) return -10;
    return (
      (cell.temperature > 0.58 ? 0.78 : 0.04) +
      (cell.precipitation < 0.2 ? 0.95 : -0.45) +
      cell.rainShadow * 0.62
    );
  }

  if (terrain === 'badlands') {
    if (cell.elevation > 0.84) return -10;
    return (
      (cell.precipitation < 0.3 ? 0.9 : 0.2) +
      (cell.rainShadow > 0.3 ? 0.6 : 0) +
      (relief > 0.008 ? 0.35 : -0.1)
    );
  }

  if (terrain === 'swamp') {
    if (cell.elevation > 0.66) return -10;
    return (cell.precipitation > 0.76 ? 1.1 : 0.15) + (relief < 0.008 ? 0.5 : -0.15);
  }

  if (terrain === 'forest') {
    if (cell.elevation > 0.8) return -10;
    return (
      0.28 +
      (cell.precipitation > 0.56 ? 0.65 : -0.2) +
      (cell.temperature > 0.24 && cell.temperature < 0.7 ? 0.2 : -0.1)
    );
  }

  if (terrain === 'plateau') {
    if (cell.elevation < seaLevel + 0.12) return -10;
    return 0.58 + (relief < HYDROLOGY_CONFIG.plateauReliefMax ? 0.35 : -0.1);
  }

  if (terrain === 'plains') {
    if (cell.elevation > 0.78) return -10;
    return 0.62 + (cell.precipitation > 0.28 && cell.precipitation < 0.62 ? 0.5 : 0.14);
  }

  if (terrain === 'hills') {
    if (cell.elevation < seaLevel + 0.08) return -10;
    return 0.5 + clamp((cell.elevation - 0.62) * 1.8, 0, 0.7);
  }

  if (terrain === 'volcanic') {
    if (cell.elevation < seaLevel + 0.12) return -10;
    return (
      (cell.precipitation < 0.36 ? 0.5 : -0.2) +
      (cell.temperature > 0.42 ? 0.4 : 0) +
      (relief > 0.012 ? 0.25 : 0)
    );
  }

  return -10;
}

function getNeighborTerrainCounts(cell: TMapCell, cells: TMapCell[]) {
  const counts = new Map<TTerrainBand, number>();

  for (const neighborId of cell.neighbors) {
    const neighborTerrain = cells[neighborId].terrain;
    if (isWaterTerrain(neighborTerrain)) continue;

    counts.set(neighborTerrain, (counts.get(neighborTerrain) || 0) + 1);
  }

  return counts;
}

function findSmallTerrainRegions(cells: TMapCell[], minRegionSize: number) {
  const visited = new Uint8Array(cells.length);
  const regions: number[][] = [];
  const stack: number[] = [];

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;

    const seedCell = cells[cellIndex];
    if (isWaterTerrain(seedCell.terrain)) continue;

    stack.length = 0;
    stack.push(cellIndex);
    const region: number[] = [];
    visited[cellIndex] = 1;

    while (stack.length > 0) {
      const current = stack.pop() as number;
      region.push(current);

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (cells[neighborId].terrain !== seedCell.terrain) continue;
        if (isWaterTerrain(cells[neighborId].terrain)) continue;

        visited[neighborId] = 1;
        stack.push(neighborId);
      }
    }

    if (region.length < minRegionSize) {
      regions.push(region);
    }
  }
  return regions;
}

function regionalizeLandTerrains(cells: TMapCell[], seaLevel: number) {
  const minRegionSize = Math.max(
    HYDROLOGY_CONFIG.regionalization.minRegionBase,
    Math.floor(Math.sqrt(cells.length) * HYDROLOGY_CONFIG.regionalization.minRegionScale)
  );
  const smallRegions = findSmallTerrainRegions(cells, minRegionSize);

  for (const region of smallRegions) {
    const regionSet = new Set(region);
    const borderTerrains = new Set<TTerrainBand>();

    for (const cellId of region) {
      for (const neighborId of cells[cellId].neighbors) {
        const neighborTerrain = cells[neighborId].terrain;
        if (isWaterTerrain(neighborTerrain)) continue;
        if (regionSet.has(neighborId)) continue;
        borderTerrains.add(neighborTerrain);
      }
    }

    if (borderTerrains.size === 0) continue;

    for (const cellId of region) {
      const cell = cells[cellId];
      if (isLockedTerrain(cell, cell.terrain)) continue;

      const neighborAverage = getNeighborAverageElevation(cell, cells);
      const relief = cell.elevation - neighborAverage;
      let bestTerrain = cell.terrain;
      let bestScore = getTerrainFitness(cell.terrain, cell, seaLevel, relief);

      for (const candidate of borderTerrains) {
        const candidateScore = getTerrainFitness(candidate, cell, seaLevel, relief);
        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestTerrain = candidate;
        }
      }
      cell.terrain = bestTerrain;
    }
  }

  for (
    let iteration = 0;
    iteration < HYDROLOGY_CONFIG.regionalization.smoothingPasses;
    iteration += 1
  ) {
    const nextTerrains = cells.map((cell) => cell.terrain);

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (isLockedTerrain(cell, cell.terrain)) continue;

      const counts = getNeighborTerrainCounts(cell, cells);
      if (counts.size === 0) continue;

      let dominantTerrain = cell.terrain;
      let dominantCount = 0;

      for (const [terrain, count] of counts) {
        if (count > dominantCount) {
          dominantCount = count;
          dominantTerrain = terrain;
        }
      }

      if (
        dominantCount < HYDROLOGY_CONFIG.regionalization.dominantMinCount ||
        dominantTerrain === cell.terrain
      ) {
        continue;
      }

      const relief = cell.elevation - getNeighborAverageElevation(cell, cells);
      const currentScore =
        getTerrainFitness(cell.terrain, cell, seaLevel, relief) +
        (counts.get(cell.terrain) || 0) * HYDROLOGY_CONFIG.regionalization.currentScoreBonus;
      const dominantScore =
        getTerrainFitness(dominantTerrain, cell, seaLevel, relief) +
        dominantCount * HYDROLOGY_CONFIG.regionalization.dominantScoreBonus;

      if (dominantScore > currentScore + HYDROLOGY_CONFIG.regionalization.switchMargin) {
        nextTerrains[cellIndex] = dominantTerrain;
      }
    }

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].terrain = nextTerrains[cellIndex];
    }
  }
}

function toTerrainBalance(terrainRatios: TTerrainRatioMap): TTerrainBalance {
  const margin = 0.015;

  function withBand(value: number) {
    return { min: Math.max(0, value - margin), max: Math.min(1, value + margin) };
  }

  const plains = withBand(terrainRatios.plains);
  const forest = withBand(terrainRatios.forest);
  const swamp = withBand(terrainRatios.swamp);
  const desert = withBand(terrainRatios.desert);
  const hills = withBand(terrainRatios.hills);
  const mountains = withBand(terrainRatios.mountains);
  const plateau = withBand(terrainRatios.plateau);

  return {
    ...HYDROLOGY_CONFIG.terrainBalance,
    plainsMinShare: plains.min,
    plainsMaxShare: plains.max,
    forestMinShare: forest.min,
    forestMaxShare: forest.max,
    swampMinShare: swamp.min,
    swampMaxShare: swamp.max,
    desertMinShare: desert.min,
    desertMaxShare: desert.max,
    hillsMinShare: hills.min,
    hillsMaxShare: hills.max,
    mountainsMinShare: mountains.min,
    mountainsMaxShare: mountains.max,
    plateauMinShare: plateau.min,
    plateauMaxShare: plateau.max,
  };
}

function rebalanceTerrainDistribution(cells: TMapCell[], terrainBalance: TTerrainBalance) {
  const landCellIds = cells
    .map((cell, cellIndex) => ({ cell, cellIndex }))
    .filter(({ cell }) => !isWaterTerrain(cell.terrain))
    .map(({ cellIndex }) => cellIndex);
  const landCount = landCellIds.length;
  if (landCount === 0) return;

  const counts = new Map<TTerrainBand, number>();
  for (const cellId of landCellIds) {
    const terrain = cells[cellId].terrain;
    counts.set(terrain, (counts.get(terrain) || 0) + 1);
  }

  function getShare(terrain: TTerrainBand) {
    return (counts.get(terrain) || 0) / landCount;
  }

  function convertCells(
    source: TTerrainBand,
    target: TTerrainBand,
    maxConversions: number,
    score: (cell: TMapCell) => number
  ) {
    if (maxConversions <= 0) return 0;
    const candidates = landCellIds
      .filter((cellId) => cells[cellId].terrain === source)
      .filter((cellId) => !(cells[cellId].isRiver && source === 'valley'))
      .sort((left, right) => score(cells[right]) - score(cells[left]));
    const take = Math.min(maxConversions, candidates.length);

    for (let index = 0; index < take; index += 1) {
      cells[candidates[index]].terrain = target;
    }

    if (take > 0) {
      counts.set(source, Math.max(0, (counts.get(source) || 0) - take));
      counts.set(target, (counts.get(target) || 0) + take);
    }
    return take;
  }

  const target = terrainBalance;
  const desertExcess = Math.max(
    0,
    Math.floor((getShare('desert') - target.desertMaxShare) * landCount)
  );
  convertCells(
    'desert',
    'plains',
    desertExcess,
    (cell) => 1 - cell.rainShadow + cell.precipitation
  );

  const badlandsExcess = Math.max(
    0,
    Math.floor((getShare('badlands') - target.badlandsMaxShare) * landCount)
  );
  convertCells(
    'badlands',
    'hills',
    badlandsExcess,
    (cell) => 1 - cell.rainShadow + cell.precipitation
  );

  const volcanicExcess = Math.max(
    0,
    Math.floor((getShare('volcanic') - target.volcanicMaxShare) * landCount)
  );
  convertCells(
    'volcanic',
    'mountains',
    volcanicExcess,
    (cell) => 1 - cell.elevation + cell.precipitation
  );

  const swampExcess = Math.max(
    0,
    Math.floor((getShare('swamp') - target.swampMaxShare) * landCount)
  );
  convertCells('swamp', 'valley', swampExcess, (cell) => cell.precipitation + cell.flow * 0.01);

  const mountainExcess = Math.max(
    0,
    Math.floor((getShare('mountains') - target.mountainsMaxShare) * landCount)
  );
  convertCells(
    'mountains',
    'hills',
    mountainExcess,
    (cell) => 1 - cell.elevation + Math.abs(cell.temperature - 0.45)
  );

  const hillsExcess = Math.max(
    0,
    Math.floor((getShare('hills') - target.hillsMaxShare) * landCount)
  );
  convertCells('hills', 'plains', hillsExcess, (cell) => 1 - cell.elevation + cell.precipitation);

  const plateauExcess = Math.max(
    0,
    Math.floor((getShare('plateau') - target.plateauMaxShare) * landCount)
  );
  convertCells(
    'plateau',
    'plains',
    plateauExcess,
    (cell) => 1 - cell.elevation + cell.precipitation
  );

  const forestExcess = Math.max(
    0,
    Math.floor((getShare('forest') - target.forestMaxShare) * landCount)
  );
  convertCells(
    'forest',
    'plains',
    forestExcess,
    (cell) => 1 - cell.precipitation + Math.abs(cell.temperature - 0.5)
  );

  const forestDeficit = Math.max(
    0,
    Math.floor((target.forestMinShare - getShare('forest')) * landCount)
  );
  convertCells(
    'plains',
    'forest',
    forestDeficit,
    (cell) => cell.precipitation - Math.abs(cell.temperature - 0.52) - cell.rainShadow * 0.35
  );

  const mountainsDeficit = Math.max(
    0,
    Math.floor((target.mountainsMinShare - getShare('mountains')) * landCount)
  );
  if (mountainsDeficit > 0) {
    let remaining = mountainsDeficit;
    remaining -= convertCells(
      'hills',
      'mountains',
      remaining,
      (cell) => cell.elevation + Math.max(0, 0.7 - cell.precipitation) + cell.rainShadow * 0.3
    );
    if (remaining > 0) {
      convertCells(
        'plateau',
        'mountains',
        remaining,
        (cell) => cell.elevation + Math.max(0, 0.64 - cell.precipitation)
      );
    }
  }

  const swampDeficit = Math.max(
    0,
    Math.floor((target.swampMinShare - getShare('swamp')) * landCount)
  );
  if (swampDeficit > 0) {
    let remaining = swampDeficit;
    remaining -= convertCells(
      'valley',
      'swamp',
      remaining,
      (cell) => cell.precipitation + Math.max(0, 0.62 - cell.elevation) + cell.flow * 0.01
    );
    if (remaining > 0) {
      convertCells(
        'plains',
        'swamp',
        remaining,
        (cell) =>
          cell.precipitation +
          Math.max(0, 0.6 - cell.elevation) +
          Math.max(0, cell.flow - 2.5) * 0.02
      );
    }
  }

  const plainsDeficit = Math.max(
    0,
    Math.floor((target.plainsMinShare - getShare('plains')) * landCount)
  );
  if (plainsDeficit > 0) {
    let remaining = plainsDeficit;
    remaining -= convertCells('hills', 'plains', remaining, (cell) => 1 - cell.elevation);
    if (remaining > 0) {
      remaining -= convertCells('forest', 'plains', remaining, (cell) => 1 - cell.precipitation);
    }
    if (remaining > 0) {
      convertCells('valley', 'plains', remaining, (cell) => Math.max(0, cell.precipitation - 0.5));
    }
  }

  const plateauDeficit = Math.max(
    0,
    Math.floor((target.plateauMinShare - getShare('plateau')) * landCount)
  );
  convertCells(
    'hills',
    'plateau',
    plateauDeficit,
    (cell) => cell.elevation + Math.max(0, cell.precipitation - 0.26)
  );

  const plainsExcess = Math.max(
    0,
    Math.floor((getShare('plains') - target.plainsMaxShare) * landCount)
  );
  if (plainsExcess > 0) {
    let remaining = plainsExcess;
    remaining -= convertCells(
      'plains',
      'forest',
      remaining,
      (cell) => cell.precipitation - cell.rainShadow * 0.3
    );
    if (remaining > 0) {
      remaining -= convertCells(
        'plains',
        'hills',
        remaining,
        (cell) => cell.elevation - 0.55 + Math.max(0, cell.flow - 3) * 0.01
      );
    }
    if (remaining > 0) {
      convertCells(
        'plains',
        'swamp',
        remaining,
        (cell) => cell.precipitation + Math.max(0, 0.62 - cell.elevation)
      );
    }
  }

  // Final alignment pass:
  // Keep terrain shares close to requested ratios and avoid counter-intuitive drift
  // (e.g. increasing mountains but forests growing due to intermediate conversions).
  function convertDeficitFromDonors(
    targetTerrain: TTerrainBand,
    desiredMinShare: number,
    donors: TTerrainBand[],
    score: (cell: TMapCell) => number
  ) {
    let deficit = Math.max(0, Math.floor((desiredMinShare - getShare(targetTerrain)) * landCount));
    if (deficit <= 0) return;
    for (const donor of donors) {
      if (deficit <= 0) break;
      const converted = convertCells(donor, targetTerrain, deficit, score);
      deficit -= converted;
    }
  }

  function trimExcessToPlains(
    source: TTerrainBand,
    maxShare: number,
    score: (cell: TMapCell) => number
  ) {
    const excess = Math.max(0, Math.floor((getShare(source) - maxShare) * landCount));
    convertCells(source, 'plains', excess, score);
  }

  trimExcessToPlains(
    'forest',
    target.forestMaxShare,
    (cell) => 1 - cell.precipitation + Math.abs(cell.temperature - 0.5)
  );
  trimExcessToPlains(
    'swamp',
    target.swampMaxShare,
    (cell) => cell.precipitation + cell.flow * 0.01
  );
  trimExcessToPlains(
    'desert',
    target.desertMaxShare,
    (cell) => 1 - cell.rainShadow + cell.precipitation
  );

  convertDeficitFromDonors(
    'mountains',
    target.mountainsMinShare,
    ['hills', 'plateau', 'plains'],
    (cell) => cell.elevation + Math.max(0, 0.65 - cell.precipitation) + cell.rainShadow * 0.3
  );
  convertDeficitFromDonors(
    'hills',
    target.hillsMinShare,
    ['plains', 'forest'],
    (cell) => cell.elevation + Math.max(0, cell.flow - 2) * 0.02
  );
  convertDeficitFromDonors(
    'plateau',
    target.plateauMinShare,
    ['hills', 'plains'],
    (cell) => cell.elevation + Math.max(0, cell.precipitation - 0.22)
  );
  convertDeficitFromDonors(
    'forest',
    target.forestMinShare,
    ['plains', 'hills'],
    (cell) => cell.precipitation - Math.abs(cell.temperature - 0.52) - cell.rainShadow * 0.35
  );
  convertDeficitFromDonors(
    'swamp',
    target.swampMinShare,
    ['plains', 'valley', 'forest'],
    (cell) =>
      cell.precipitation + Math.max(0, 0.62 - cell.elevation) + Math.max(0, cell.flow - 2.5) * 0.02
  );
  convertDeficitFromDonors(
    'desert',
    target.desertMinShare,
    ['plains', 'hills', 'plateau', 'forest'],
    (cell) =>
      cell.temperature * 1.6 +
      cell.rainShadow * 1.25 +
      Math.max(0, 0.5 - cell.precipitation) * 1.4 +
      Math.max(0, cell.elevation - 0.35) * 0.35
  );
  convertDeficitFromDonors(
    'plains',
    target.plainsMinShare,
    ['hills', 'forest', 'plateau', 'valley', 'swamp'],
    (cell) => 1 - cell.elevation + cell.precipitation * 0.25
  );
}

function antiAliasTerrains(cells: TMapCell[]) {
  for (let pass = 0; pass < HYDROLOGY_CONFIG.antiAlias.passes; pass += 1) {
    const nextTerrains = cells.map((cell) => cell.terrain);

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (isWaterTerrain(cell.terrain)) continue;
      if (cell.isRiver && cell.terrain === 'valley') continue;

      const counts = getNeighborTerrainCounts(cell, cells);
      if (counts.size === 0) continue;

      const sameCount = counts.get(cell.terrain) || 0;
      if (sameCount > HYDROLOGY_CONFIG.antiAlias.isolatedNeighborMax) continue;

      let dominantTerrain = cell.terrain;
      let dominantCount = 0;
      for (const [terrain, count] of counts) {
        if (isWaterTerrain(terrain)) continue;
        if (count > dominantCount) {
          dominantCount = count;
          dominantTerrain = terrain;
        }
      }

      if (dominantTerrain === cell.terrain) continue;
      if (dominantCount < HYDROLOGY_CONFIG.antiAlias.dominantNeighborMin) continue;
      nextTerrains[cellIndex] = dominantTerrain;
    }

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].terrain = nextTerrains[cellIndex];
    }
  }
}

function mergeSmallTerrainClusters(cells: TMapCell[], seaLevel: number) {
  const visited = new Uint8Array(cells.length);
  const stack: number[] = [];

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;
    const terrain = cells[cellIndex].terrain;
    if (isWaterTerrain(terrain)) continue;

    stack.length = 0;
    stack.push(cellIndex);
    const region: number[] = [];
    visited[cellIndex] = 1;

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined) continue;
      region.push(current);

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (cells[neighborId].terrain !== terrain) continue;
        if (isWaterTerrain(cells[neighborId].terrain)) continue;
        visited[neighborId] = 1;
        stack.push(neighborId);
      }
    }

    const minSize =
      HYDROLOGY_CONFIG.terrainClusterMinCells[
        terrain as keyof typeof HYDROLOGY_CONFIG.terrainClusterMinCells
      ] || 0;
    if (region.length >= minSize) continue;

    const regionSet = new Set(region);
    for (const regionCellId of region) {
      const cell = cells[regionCellId];
      if (isLockedTerrain(cell, cell.terrain)) continue;

      const borderCounts = new Map<TTerrainBand, number>();
      for (const neighborId of cell.neighbors) {
        if (regionSet.has(neighborId)) continue;
        const neighborTerrain = cells[neighborId].terrain;
        if (isWaterTerrain(neighborTerrain)) continue;
        borderCounts.set(neighborTerrain, (borderCounts.get(neighborTerrain) || 0) + 1);
      }

      if (borderCounts.size === 0) continue;

      const relief = cell.elevation - getNeighborAverageElevation(cell, cells);
      let bestTerrain = cell.terrain;
      let bestScore = -Infinity;

      for (const [candidateTerrain, count] of borderCounts) {
        const score = getTerrainFitness(candidateTerrain, cell, seaLevel, relief) + count * 0.25;
        if (score > bestScore) {
          bestScore = score;
          bestTerrain = candidateTerrain;
        }
      }

      cells[regionCellId].terrain = bestTerrain;
    }
  }
}

export {
  antiAliasTerrains,
  mergeSmallTerrainClusters,
  rebalanceTerrainDistribution,
  regionalizeLandTerrains,
  toTerrainBalance,
};
