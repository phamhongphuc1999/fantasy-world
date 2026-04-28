import { MAP_HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TMapCell, TMapMeshWithDelaunay, TTerrainBand } from 'src/types/global';

interface TBuildHydrologyOptions {
  mesh: TMapMeshWithDelaunay;
  seaLevel: number;
}

const T_COAST_OUTLET = MAP_HYDROLOGY_CONFIG.coastOutletId;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sortIndicesByElevation(elevations: Float32Array) {
  return Array.from({ length: elevations.length }, (_, index) => index).sort(
    (leftIndex, rightIndex) => elevations[rightIndex] - elevations[leftIndex]
  );
}

function getNeighborAverageElevation(cell: TMapCell, cells: TMapCell[]) {
  if (cell.neighbors.length === 0) return cell.elevation;

  let total = 0;
  for (const neighborId of cell.neighbors) {
    total += cells[neighborId].elevation;
  }

  return total / cell.neighbors.length;
}

function buildWaterInfluence(cells: TMapCell[]): Float32Array {
  const waterInfluence = new Float32Array(cells.length);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    waterInfluence[cellIndex] = cells[cellIndex].isWater ? 1 : 0;
  }

  for (
    let iteration = 0;
    iteration < MAP_HYDROLOGY_CONFIG.waterInfluenceIterations;
    iteration += 1
  ) {
    const nextInfluence = Float32Array.from(waterInfluence);

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (cell.neighbors.length === 0) continue;

      let total = waterInfluence[cellIndex] * MAP_HYDROLOGY_CONFIG.waterInfluenceSelfWeight;
      for (const neighborId of cell.neighbors) {
        total += waterInfluence[neighborId];
      }

      nextInfluence[cellIndex] =
        total / (cell.neighbors.length + MAP_HYDROLOGY_CONFIG.waterInfluenceSelfWeight);
    }

    waterInfluence.set(nextInfluence);
  }

  return waterInfluence;
}

function getRainShadow(cell: TMapCell, cells: TMapCell[]) {
  let obstruction = 0;

  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.site[0] >= cell.site[0]) continue;

    const elevationDelta = neighbor.elevation - cell.elevation;
    if (elevationDelta > MAP_HYDROLOGY_CONFIG.rainShadowMinElevationDelta) {
      obstruction += elevationDelta;
    }
  }

  return clamp(obstruction * MAP_HYDROLOGY_CONFIG.rainShadowScale, 0, 1);
}

function getTerrainBand(
  cell: TMapCell,
  seaLevel: number,
  temperature: number,
  precipitation: number,
  rainShadow: number,
  relief: number
): TTerrainBand {
  if (cell.isLake) return 'lake';
  if (cell.elevation < seaLevel - MAP_HYDROLOGY_CONFIG.deepWaterOffset) return 'deep-water';
  if (cell.elevation < seaLevel) return 'shallow-water';
  if (cell.elevation < seaLevel + MAP_HYDROLOGY_CONFIG.coastBand) return 'coast';

  const inValley =
    cell.isRiver ||
    (relief < MAP_HYDROLOGY_CONFIG.valleyReliefThreshold &&
      precipitation > MAP_HYDROLOGY_CONFIG.valleyPrecipitationMin);

  if (
    temperature < MAP_HYDROLOGY_CONFIG.tundraTemperatureMax ||
    cell.elevation > MAP_HYDROLOGY_CONFIG.tundraElevationMin
  ) {
    return 'tundra';
  }

  const elevationAboveSea = cell.elevation - seaLevel;
  const isNewlyEmergedLand = elevationAboveSea < MAP_HYDROLOGY_CONFIG.emergedLandBand;

  if (
    relief > MAP_HYDROLOGY_CONFIG.reliefMountainMin &&
    (cell.elevation > MAP_HYDROLOGY_CONFIG.mountainElevationMin || isNewlyEmergedLand)
  ) {
    return 'mountains';
  }

  if (
    relief > MAP_HYDROLOGY_CONFIG.reliefHillMin &&
    (cell.elevation > MAP_HYDROLOGY_CONFIG.hillElevationMin || isNewlyEmergedLand)
  ) {
    return 'hills';
  }

  if (cell.elevation > MAP_HYDROLOGY_CONFIG.mountainElevationMin) return 'mountains';
  if (cell.elevation > MAP_HYDROLOGY_CONFIG.hillElevationMin) return 'hills';
  if (inValley) return 'valley';

  if (
    temperature > MAP_HYDROLOGY_CONFIG.desertTemperatureMin &&
    precipitation < MAP_HYDROLOGY_CONFIG.desertPrecipitationMax &&
    rainShadow > MAP_HYDROLOGY_CONFIG.desertRainShadowMin
  ) {
    return 'desert';
  }

  if (
    precipitation > MAP_HYDROLOGY_CONFIG.swampPrecipitationMin &&
    cell.elevation < MAP_HYDROLOGY_CONFIG.swampElevationMax &&
    relief < MAP_HYDROLOGY_CONFIG.swampReliefMax
  ) {
    return 'swamp';
  }

  if (precipitation > MAP_HYDROLOGY_CONFIG.forestPrecipitationMin) return 'forest';
  return 'plains';
}

function getBiome(terrain: TTerrainBand): string {
  switch (terrain) {
    case 'deep-water':
      return 'Deep Ocean';
    case 'shallow-water':
      return 'Sea Shelf';
    case 'lake':
      return 'Freshwater Lake';
    case 'coast':
      return 'Coastal Littoral';
    case 'desert':
      return 'Arid Desert';
    case 'forest':
      return 'Woodland';
    case 'swamp':
      return 'Wetland';
    case 'valley':
      return 'River Valley';
    case 'hills':
      return 'Highland';
    case 'mountains':
      return 'Mountain Range';
    case 'tundra':
      return 'Tundra';
    default:
      return 'Grassland';
  }
}

function getSuitability(terrain: TTerrainBand, precipitation: number, temperature: number): number {
  if (terrain === 'deep-water' || terrain === 'shallow-water') return 0;
  if (terrain === 'lake') return 0.12;
  if (terrain === 'mountains' || terrain === 'tundra') return 0.14;
  if (terrain === 'desert') return 0.22;
  if (terrain === 'swamp') return 0.34;

  const climateScore = 1 - Math.abs(temperature - 0.52) * 1.15;
  const moistureScore = 1 - Math.abs(precipitation - 0.52) * 0.95;

  return clamp(climateScore * 0.45 + moistureScore * 0.45 + 0.1, 0, 1);
}

function isWaterTerrain(terrain: TTerrainBand) {
  return (
    terrain === 'deep-water' ||
    terrain === 'shallow-water' ||
    terrain === 'coast' ||
    terrain === 'lake'
  );
}

function isLockedTerrain(cell: TMapCell, terrain: TTerrainBand) {
  if (isWaterTerrain(terrain)) return true;
  if (terrain === 'mountains' || terrain === 'tundra') return true;
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
      (cell.temperature > 0.52 ? 0.8 : 0.1) +
      (cell.precipitation < 0.28 ? 0.75 : -0.25) +
      cell.rainShadow * 0.5
    );
  }

  if (terrain === 'swamp') {
    if (cell.elevation > 0.66) return -10;
    return (cell.precipitation > 0.65 ? 1 : 0.2) + (relief < 0.01 ? 0.4 : -0.1);
  }

  if (terrain === 'forest') {
    if (cell.elevation > 0.8) return -10;
    return (
      0.35 +
      (cell.precipitation > 0.48 ? 0.55 : -0.2) +
      (cell.temperature > 0.2 && cell.temperature < 0.72 ? 0.2 : -0.1)
    );
  }

  if (terrain === 'plains') {
    if (cell.elevation > 0.78) return -10;
    return 0.45 + (cell.precipitation > 0.28 && cell.precipitation < 0.62 ? 0.45 : 0);
  }

  if (terrain === 'hills') {
    if (cell.elevation < seaLevel + 0.08) return -10;
    return 0.5 + clamp((cell.elevation - 0.62) * 1.8, 0, 0.7);
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

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;

    const seedCell = cells[cellIndex];
    if (isWaterTerrain(seedCell.terrain)) continue;

    const queue = [cellIndex];
    const region: number[] = [];
    visited[cellIndex] = 1;

    while (queue.length > 0) {
      const current = queue.pop() as number;
      region.push(current);

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (cells[neighborId].terrain !== seedCell.terrain) continue;
        if (isWaterTerrain(cells[neighborId].terrain)) continue;

        visited[neighborId] = 1;
        queue.push(neighborId);
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
    MAP_HYDROLOGY_CONFIG.regionalization.minRegionBase,
    Math.floor(Math.sqrt(cells.length) * MAP_HYDROLOGY_CONFIG.regionalization.minRegionScale)
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
    iteration < MAP_HYDROLOGY_CONFIG.regionalization.smoothingPasses;
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
        dominantCount < MAP_HYDROLOGY_CONFIG.regionalization.dominantMinCount ||
        dominantTerrain === cell.terrain
      ) {
        continue;
      }

      const relief = cell.elevation - getNeighborAverageElevation(cell, cells);
      const currentScore =
        getTerrainFitness(cell.terrain, cell, seaLevel, relief) +
        (counts.get(cell.terrain) || 0) * MAP_HYDROLOGY_CONFIG.regionalization.currentScoreBonus;
      const dominantScore =
        getTerrainFitness(dominantTerrain, cell, seaLevel, relief) +
        dominantCount * MAP_HYDROLOGY_CONFIG.regionalization.dominantScoreBonus;

      if (dominantScore > currentScore + MAP_HYDROLOGY_CONFIG.regionalization.switchMargin) {
        nextTerrains[cellIndex] = dominantTerrain;
      }
    }

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].terrain = nextTerrains[cellIndex];
    }
  }
}

function expandLakes(cells: TMapCell[], flow: Float32Array, downstream: Int32Array) {
  const candidateLakeSeeds: number[] = [];

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    if (!cell.isLake) continue;
    if (cell.rainShadow > MAP_HYDROLOGY_CONFIG.lakeExpansionRainShadowMax) continue;
    if (cell.precipitation < MAP_HYDROLOGY_CONFIG.lakeExpansionPrecipitationMin) continue;
    candidateLakeSeeds.push(cellIndex);
  }

  for (const seedId of candidateLakeSeeds) {
    const seedCell = cells[seedId];
    const targetMax = Math.min(
      MAP_HYDROLOGY_CONFIG.lakeExpansionMaxCells,
      2 + Math.floor(Math.log2(flow[seedId] + 1) * 2)
    );
    let expanded = 1;
    const queue = [seedId];
    const visited = new Set<number>([seedId]);

    while (queue.length > 0 && expanded < targetMax) {
      const currentId = queue.shift() as number;
      const currentCell = cells[currentId];

      for (const neighborId of currentCell.neighbors) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighbor = cells[neighborId];
        if (neighbor.isWater || neighbor.isLake) continue;
        if (neighbor.rainShadow > MAP_HYDROLOGY_CONFIG.lakeExpansionRainShadowMax) continue;
        if (neighbor.precipitation < MAP_HYDROLOGY_CONFIG.lakeExpansionPrecipitationMin) continue;
        if (
          neighbor.elevation >
          seedCell.elevation + MAP_HYDROLOGY_CONFIG.lakeExpansionElevationSlack
        ) {
          continue;
        }
        if (downstream[neighborId] === T_COAST_OUTLET) continue;

        neighbor.isLake = true;
        neighbor.isWater = true;
        neighbor.terrain = 'lake';
        neighbor.biome = 'Freshwater Lake';
        neighbor.suitability = 0.12;
        expanded += 1;
        queue.push(neighborId);

        if (expanded >= targetMax) break;
      }
    }
  }

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    if (!cell.isLake) continue;
    cell.terrain = 'lake';
    cell.biome = 'Freshwater Lake';
    cell.suitability = 0.12;
  }
}

function buildLakeRegions(cells: TMapCell[]) {
  const visited = new Uint8Array(cells.length);
  const regions: number[][] = [];

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1 || !cells[cellIndex].isLake) continue;

    const queue = [cellIndex];
    const region: number[] = [];
    visited[cellIndex] = 1;

    while (queue.length > 0) {
      const current = queue.pop() as number;
      region.push(current);

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (!cells[neighborId].isLake) continue;

        visited[neighborId] = 1;
        queue.push(neighborId);
      }
    }

    regions.push(region);
  }

  return regions;
}

function isSeaTerrain(terrain: TTerrainBand) {
  return terrain === 'deep-water' || terrain === 'shallow-water';
}

function filterAndLimitLakes(cells: TMapCell[], flow: Float32Array) {
  const regions = buildLakeRegions(cells);
  const candidateRegions: number[][] = [];

  for (const region of regions) {
    let touchesSea = false;

    for (const cellId of region) {
      for (const neighborId of cells[cellId].neighbors) {
        if (isSeaTerrain(cells[neighborId].terrain)) {
          touchesSea = true;
          break;
        }
      }
      if (touchesSea) break;
    }

    if (touchesSea) {
      for (const cellId of region) {
        const cell = cells[cellId];
        cell.isLake = false;
        cell.isWater = false;
        cell.terrain = 'coast';
        cell.biome = 'Coastal Littoral';
        cell.suitability = 0.6;
      }
      continue;
    }

    candidateRegions.push(region);
  }

  const regionScore = candidateRegions.map((region) => {
    let maxFlow = 0;
    for (const cellId of region) {
      maxFlow = Math.max(maxFlow, flow[cellId]);
    }
    return { region, score: maxFlow + region.length * 0.8 };
  });

  regionScore.sort((a, b) => b.score - a.score);
  const keptRegions = new Set(
    regionScore.slice(0, MAP_HYDROLOGY_CONFIG.maxLakeCount).map((v) => v.region)
  );

  for (const entry of regionScore) {
    if (keptRegions.has(entry.region)) continue;
    for (const cellId of entry.region) {
      const cell = cells[cellId];
      cell.isLake = false;
      cell.isWater = false;
      cell.terrain = 'valley';
      cell.biome = 'River Valley';
      cell.suitability = 0.52;
    }
  }
}

function buildLakeSizeMap(cells: TMapCell[]) {
  const lakeSizeByCell = new Map<number, number>();
  const regions = buildLakeRegions(cells);

  for (const region of regions) {
    const size = region.length;
    for (const cellId of region) {
      lakeSizeByCell.set(cellId, size);
    }
  }

  return lakeSizeByCell;
}

function buildPlainsRegionSizeMap(cells: TMapCell[]) {
  const regionSizeByCell = new Int32Array(cells.length);
  const visited = new Uint8Array(cells.length);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;
    if (cells[cellIndex].terrain !== 'plains') continue;

    const queue: number[] = [cellIndex];
    const region: number[] = [];
    visited[cellIndex] = 1;

    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) continue;
      region.push(current);

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (cells[neighborId].terrain !== 'plains') continue;
        visited[neighborId] = 1;
        queue.push(neighborId);
      }
    }

    for (const id of region) {
      regionSizeByCell[id] = region.length;
    }
  }

  return regionSizeByCell;
}

function validateRivers(
  cells: TMapCell[],
  flow: Float32Array,
  downstream: Int32Array,
  isRiver: Uint8Array
) {
  const lakeSizeByCell = buildLakeSizeMap(cells);
  const validRiver = new Uint8Array(cells.length);
  const plainsRegionSizeByCell = buildPlainsRegionSizeMap(cells);
  const hasLargePlains = plainsRegionSizeByCell.some(
    (size) => size >= MAP_HYDROLOGY_CONFIG.largePlainMinCells
  );
  const hasVeryLargePlains = plainsRegionSizeByCell.some(
    (size) => size >= MAP_HYDROLOGY_CONFIG.veryLargePlainMinCells
  );
  const candidates: Array<{
    chain: number[];
    peakFlow: number;
    sourceId: number;
    plainCoverage: number;
    veryLargePlainCoverage: number;
    endType: 'sea' | 'large-lake' | 'plain' | 'invalid';
    joinsRiverCellId: number | null;
    score: number;
  }> = [];
  function addCandidates(
    mask: Uint8Array,
    minSourceElevation: number,
    minLength: number,
    minFlow: number
  ) {
    const upstreamCount = new Int32Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      if (mask[cellIndex] !== 1) continue;
      const downstreamId = downstream[cellIndex];
      if (downstreamId >= 0 && mask[downstreamId] === 1) {
        upstreamCount[downstreamId] += 1;
      }
    }

    const visited = new Uint8Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      if (mask[cellIndex] !== 1) continue;
      if (upstreamCount[cellIndex] > 0) continue;
      if (flow[cellIndex] < minFlow) continue;

      const chain: number[] = [];
      let cursor = cellIndex;
      let endType: 'sea' | 'large-lake' | 'plain' | 'invalid' = 'invalid';
      let joinsRiverCellId: number | null = null;

      while (cursor >= 0 && cursor < cells.length && visited[cursor] === 0 && mask[cursor] === 1) {
        visited[cursor] = 1;
        chain.push(cursor);
        const next = downstream[cursor];

        if (next === T_COAST_OUTLET) {
          endType = 'sea';
          break;
        }

        if (next < 0) {
          const tailCell = cells[cursor];
          endType = tailCell.terrain === 'plains' ? 'plain' : 'invalid';
          break;
        }

        if (cells[next].isLake) {
          const lakeSize = lakeSizeByCell.get(next) || 1;
          endType = lakeSize >= MAP_HYDROLOGY_CONFIG.largeLakeMinCells ? 'large-lake' : 'invalid';
          break;
        }

        if (cells[next].isWater) {
          endType = 'invalid';
          break;
        }

        if (isRiver[next] === 1 && visited[next] === 1) {
          joinsRiverCellId = next;
          endType = 'sea';
          break;
        }

        if (mask[next] === 0 && isRiver[next] === 1) {
          joinsRiverCellId = next;
          endType = 'sea';
          break;
        }

        cursor = next;
      }

      const sourceCell = cells[cellIndex];
      const sourceLakeSize = sourceCell.isLake ? lakeSizeByCell.get(cellIndex) || 1 : 0;
      const validPlainSource =
        sourceCell.terrain === 'plains' &&
        flow[cellIndex] >= MAP_HYDROLOGY_CONFIG.plainRiverSourceFlowMin;
      const validTundraSource =
        sourceCell.terrain === 'tundra' &&
        flow[cellIndex] >= MAP_HYDROLOGY_CONFIG.tundraRiverSourceFlowMin;
      const validSource =
        sourceCell.elevation >= minSourceElevation ||
        sourceLakeSize >= MAP_HYDROLOGY_CONFIG.largeLakeMinCells ||
        validPlainSource ||
        validTundraSource;
      const validEnd =
        endType === 'sea' ||
        endType === 'large-lake' ||
        (endType === 'plain' && sourceCell.terrain !== 'tundra');
      const validLength = chain.length >= minLength;

      if (!(validSource && validEnd && validLength)) continue;

      let peakFlow = 0;
      let plainsCells = 0;
      let veryLargePlainsCells = 0;
      for (const id of chain) {
        peakFlow = Math.max(peakFlow, flow[id]);
        if (plainsRegionSizeByCell[id] >= MAP_HYDROLOGY_CONFIG.largePlainMinCells) {
          plainsCells += 1;
        }
        if (plainsRegionSizeByCell[id] >= MAP_HYDROLOGY_CONFIG.veryLargePlainMinCells) {
          veryLargePlainsCells += 1;
        }
      }
      const plainCoverage = plainsCells / chain.length;
      const veryLargePlainCoverage = veryLargePlainsCells / chain.length;
      const score =
        peakFlow +
        plainCoverage * MAP_HYDROLOGY_CONFIG.largeRiverPlainPriorityBonus +
        veryLargePlainCoverage * MAP_HYDROLOGY_CONFIG.veryLargePlainRiverBonus +
        (endType === 'sea' && veryLargePlainCoverage > 0
          ? MAP_HYDROLOGY_CONFIG.veryLargePlainSeaOutletBonus
          : 0) +
        chain.length * MAP_HYDROLOGY_CONFIG.riverLengthPriorityWeight +
        (joinsRiverCellId !== null ? MAP_HYDROLOGY_CONFIG.tributaryJoinBonus : 0);
      candidates.push({
        chain,
        peakFlow,
        sourceId: cellIndex,
        plainCoverage,
        veryLargePlainCoverage,
        endType,
        joinsRiverCellId,
        score,
      });
    }
  }

  addCandidates(
    isRiver,
    MAP_HYDROLOGY_CONFIG.riverSourceElevationMin,
    MAP_HYDROLOGY_CONFIG.riverMinLength,
    MAP_HYDROLOGY_CONFIG.riverFlowMin
  );

  if (candidates.length < MAP_HYDROLOGY_CONFIG.minRiverCount) {
    const relaxedMask = new Uint8Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      const downstreamId = downstream[cellIndex];
      if (cell.isWater) continue;
      if (!(downstreamId >= 0 || downstreamId === T_COAST_OUTLET)) continue;
      if (flow[cellIndex] < MAP_HYDROLOGY_CONFIG.relaxedRiverFlowMin) continue;
      relaxedMask[cellIndex] = 1;
    }
    addCandidates(
      relaxedMask,
      MAP_HYDROLOGY_CONFIG.riverSourceElevationMin -
        MAP_HYDROLOGY_CONFIG.relaxedRiverSourceElevationDrop,
      MAP_HYDROLOGY_CONFIG.relaxedRiverMinLength,
      MAP_HYDROLOGY_CONFIG.relaxedRiverFlowMin
    );
  }

  if (candidates.length === 0) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].isRiver = false;
    }
    return;
  }

  const landCellCount = cells.filter((cell) => !cell.isWater).length;
  const isLargeLand = landCellCount >= MAP_HYDROLOGY_CONFIG.riverTargetLandThreshold;
  const targetLarge = isLargeLand
    ? MAP_HYDROLOGY_CONFIG.largeRiverMaxCountLargeLand
    : MAP_HYDROLOGY_CONFIG.largeRiverCountSmallLand;
  const minLargeBase = isLargeLand ? MAP_HYDROLOGY_CONFIG.largeRiverMinCountLargeLand : 1;
  const minLarge = hasLargePlains ? Math.max(2, minLargeBase) : minLargeBase;
  let targetSmall = isLargeLand
    ? MAP_HYDROLOGY_CONFIG.smallRiverTargetLargeLand
    : MAP_HYDROLOGY_CONFIG.smallRiverTargetSmallLand;
  if (hasVeryLargePlains) {
    targetSmall += 3;
  }
  const minimumRiverCount = MAP_HYDROLOGY_CONFIG.minRiverCount;

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.chain.length !== a.chain.length) return b.chain.length - a.chain.length;
    return b.peakFlow - a.peakFlow;
  });
  const selectedChains: number[][] = [];
  const selectedSource = new Set<number>();
  const usedCells = new Set<number>();

  if (hasVeryLargePlains) {
    const plainFocusedCandidates = sortedCandidates
      .filter((candidate) => candidate.veryLargePlainCoverage > 0 && candidate.endType === 'sea')
      .sort((a, b) => b.chain.length - a.chain.length)
      .slice(0, MAP_HYDROLOGY_CONFIG.veryLargePlainMinRiverCount);
    for (const candidate of plainFocusedCandidates) {
      if (selectedSource.has(candidate.sourceId)) continue;
      selectedChains.push(candidate.chain);
      selectedSource.add(candidate.sourceId);
      for (const cellId of candidate.chain) usedCells.add(cellId);
    }
  }

  const largeTake = Math.min(targetLarge, sortedCandidates.length);
  const forcedLargeTake = Math.min(minLarge, sortedCandidates.length);

  for (let index = 0; index < forcedLargeTake; index += 1) {
    const candidate = sortedCandidates[index];
    selectedChains.push(candidate.chain);
    selectedSource.add(candidate.sourceId);
    for (const cellId of candidate.chain) usedCells.add(cellId);
  }

  for (let index = forcedLargeTake; index < largeTake; index += 1) {
    const candidate = sortedCandidates[index];
    if (selectedSource.has(candidate.sourceId)) continue;
    selectedChains.push(candidate.chain);
    selectedSource.add(candidate.sourceId);
    for (const cellId of candidate.chain) usedCells.add(cellId);
  }

  const remaining = sortedCandidates.filter((candidate) => !selectedSource.has(candidate.sourceId));
  let selectedSmall = 0;

  for (const candidate of remaining) {
    if (selectedSmall >= targetSmall) break;

    let overlapCount = 0;
    for (const cellId of candidate.chain) {
      if (usedCells.has(cellId)) overlapCount += 1;
    }
    const overlapRatio = overlapCount / candidate.chain.length;
    const maxOverlapRatio =
      candidate.joinsRiverCellId !== null ? MAP_HYDROLOGY_CONFIG.tributaryMaxOverlapRatio : 0.8;
    if (overlapRatio > maxOverlapRatio) continue;

    selectedChains.push(candidate.chain);
    selectedSmall += 1;
    for (const cellId of candidate.chain) usedCells.add(cellId);
  }

  if (selectedChains.length < minimumRiverCount) {
    for (const candidate of remaining) {
      if (selectedSource.has(candidate.sourceId)) continue;
      selectedChains.push(candidate.chain);
      selectedSource.add(candidate.sourceId);
      if (selectedChains.length >= minimumRiverCount) break;
    }
  }

  for (const chain of selectedChains) {
    for (const cellId of chain) {
      validRiver[cellId] = 1;
    }
  }

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    cells[cellIndex].isRiver = validRiver[cellIndex] === 1;
  }
}

function addInlandPlainTributaries(cells: TMapCell[], flow: Float32Array, downstream: Int32Array) {
  const regionIdByCell = new Int32Array(cells.length);
  regionIdByCell.fill(-1);
  const regionSizes: number[] = [];
  const visited = new Uint8Array(cells.length);

  let regionId = 0;
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;
    if (cells[cellIndex].terrain !== 'plains' || cells[cellIndex].isWater) continue;

    const queue = [cellIndex];
    const regionCells: number[] = [];
    visited[cellIndex] = 1;

    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) continue;
      regionCells.push(current);
      regionIdByCell[current] = regionId;

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (cells[neighborId].terrain !== 'plains' || cells[neighborId].isWater) continue;
        visited[neighborId] = 1;
        queue.push(neighborId);
      }
    }

    regionSizes[regionId] = regionCells.length;
    regionId += 1;
  }

  const candidateSources = Array.from({ length: cells.length }, (_, cellIndex) => cellIndex)
    .filter((cellIndex) => {
      const cell = cells[cellIndex];
      if (cell.isWater || cell.isRiver) return false;
      if (cell.terrain !== 'plains') return false;
      const currentRegionId = regionIdByCell[cellIndex];
      if (currentRegionId < 0) return false;
      if (regionSizes[currentRegionId] < MAP_HYDROLOGY_CONFIG.veryLargePlainMinCells) return false;
      return flow[cellIndex] >= MAP_HYDROLOGY_CONFIG.inlandPlainTributaryMinFlow;
    })
    .sort((left, right) => flow[right] - flow[left]);

  const selectedByRegion = new Map<number, number>();
  const minLength = MAP_HYDROLOGY_CONFIG.inlandPlainTributaryMinLength;

  for (const sourceId of candidateSources) {
    const currentRegionId = regionIdByCell[sourceId];
    if (currentRegionId < 0) continue;
    const selectedCount = selectedByRegion.get(currentRegionId) || 0;
    if (selectedCount >= MAP_HYDROLOGY_CONFIG.inlandPlainTributaryMaxPerPlain) continue;

    const chain: number[] = [];
    const visited = new Set<number>();
    let cursor = sourceId;
    let connected = false;

    while (cursor >= 0 && cursor < cells.length && !visited.has(cursor)) {
      visited.add(cursor);
      chain.push(cursor);
      const next = downstream[cursor];

      if (next === T_COAST_OUTLET) {
        connected = true;
        break;
      }

      if (next < 0) break;
      if (cells[next].isWater) break;
      if (cells[next].isRiver) {
        connected = true;
        break;
      }

      cursor = next;
    }

    if (!connected || chain.length < minLength) continue;

    for (const cellId of chain) {
      cells[cellId].isRiver = true;
    }
    selectedByRegion.set(currentRegionId, selectedCount + 1);
  }
}

function extendRiversTowardHighlands(
  cells: TMapCell[],
  flow: Float32Array,
  downstream: Int32Array,
  seaLevel: number
) {
  const upstreamRiverCount = new Int32Array(cells.length);
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (!cells[cellIndex].isRiver) continue;
    const next = cells[cellIndex].downstreamId;
    if (next !== null && next >= 0 && cells[next].isRiver) {
      upstreamRiverCount[next] += 1;
    }
  }

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const head = cells[cellIndex];
    if (!head.isRiver) continue;
    if (upstreamRiverCount[cellIndex] > 0) continue;
    if (head.terrain !== 'plains' && head.terrain !== 'valley') continue;

    let cursor = cellIndex;
    let reachedHighland = false;
    const visited = new Set<number>();

    for (let step = 0; step < MAP_HYDROLOGY_CONFIG.highlandRiverExtensionMaxSteps; step += 1) {
      visited.add(cursor);
      let bestNeighborId = -1;
      let bestScore = -Infinity;

      for (const neighborId of cells[cursor].neighbors) {
        const neighbor = cells[neighborId];
        if (visited.has(neighborId)) continue;
        if (neighbor.isWater || neighbor.isRiver) continue;
        if (flow[neighborId] < MAP_HYDROLOGY_CONFIG.highlandRiverExtensionMinFlow) continue;
        if (neighbor.elevation <= cells[cursor].elevation) continue;

        const isHighland = neighbor.terrain === 'hills' || neighbor.terrain === 'mountains';
        const score =
          neighbor.elevation +
          (isHighland ? 0.35 : 0) +
          Math.max(0, neighbor.elevation - seaLevel) * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestNeighborId = neighborId;
        }
      }

      if (bestNeighborId < 0) break;

      downstream[bestNeighborId] = cursor;
      cells[bestNeighborId].downstreamId = cursor;
      cells[bestNeighborId].isRiver = true;

      if (
        cells[bestNeighborId].terrain === 'hills' ||
        cells[bestNeighborId].terrain === 'mountains' ||
        cells[bestNeighborId].elevation >= MAP_HYDROLOGY_CONFIG.highlandRiverTargetElevationMin
      ) {
        reachedHighland = true;
        break;
      }

      cursor = bestNeighborId;
    }

    if (!reachedHighland) {
      continue;
    }
  }
}

export function buildHydrology({ mesh, seaLevel }: TBuildHydrologyOptions): TMapMeshWithDelaunay {
  const cellCount = mesh.cells.length;
  const elevations = new Float32Array(cellCount);
  const adjustedElevations = new Float32Array(cellCount);
  const flow = new Float32Array(cellCount);
  const erosion = new Float32Array(cellCount);
  const deposit = new Float32Array(cellCount);
  const downstream = new Int32Array(cellCount);
  const isLake = new Uint8Array(cellCount);
  const isRiver = new Uint8Array(cellCount);

  downstream.fill(-1);

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    elevations[cellIndex] = mesh.cells[cellIndex].elevation;
    adjustedElevations[cellIndex] = mesh.cells[cellIndex].elevation;
    flow[cellIndex] = mesh.cells[cellIndex].isWater ? 0 : 1;
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    if (cell.isWater) continue;

    let nextCellId = -1;
    let nextElevation = elevations[cellIndex];
    let hasWaterNeighbor = false;

    for (const neighborId of cell.neighbors) {
      const neighbor = mesh.cells[neighborId];

      if (neighbor.isWater) {
        hasWaterNeighbor = true;
        continue;
      }

      if (elevations[neighborId] < nextElevation) {
        nextElevation = elevations[neighborId];
        nextCellId = neighborId;
      }
    }

    if (nextCellId >= 0) {
      downstream[cellIndex] = nextCellId;
    } else if (hasWaterNeighbor) {
      downstream[cellIndex] = T_COAST_OUTLET;
    }
  }

  const sortedIndices = sortIndicesByElevation(elevations);
  for (const cellIndex of sortedIndices) {
    const downstreamId = downstream[cellIndex];
    if (downstreamId >= 0) flow[downstreamId] += flow[cellIndex];
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    const downstreamId = downstream[cellIndex];
    const isSink = downstreamId === -1 && !cell.isWater;
    const slope =
      downstreamId >= 0 ? Math.max(0, elevations[cellIndex] - elevations[downstreamId]) : 0;

    const erosionAmount =
      cell.isWater || isSink
        ? 0
        : Math.min(
            MAP_HYDROLOGY_CONFIG.erosionMax,
            slope * MAP_HYDROLOGY_CONFIG.erosionSlopeWeight +
              Math.log2(flow[cellIndex] + 1) * MAP_HYDROLOGY_CONFIG.erosionFlowWeight
          );

    erosion[cellIndex] = erosionAmount;

    if (downstreamId >= 0) {
      deposit[downstreamId] += erosionAmount * MAP_HYDROLOGY_CONFIG.depositFactor;
    }

    if (isSink && flow[cellIndex] > MAP_HYDROLOGY_CONFIG.lakeSinkFlowMin) {
      isLake[cellIndex] = 1;
    }
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    adjustedElevations[cellIndex] = clamp(
      elevations[cellIndex] - erosion[cellIndex] + deposit[cellIndex],
      0,
      1
    );
  }

  const baseCells = mesh.cells.map((cell, cellIndex) => {
    const nextCell = {
      ...cell,
      elevation: adjustedElevations[cellIndex],
      isWater: cell.isWater || isLake[cellIndex] === 1,
      flow: flow[cellIndex],
      downstreamId: downstream[cellIndex] >= 0 ? downstream[cellIndex] : null,
      erosion: erosion[cellIndex],
      isRiver: false,
      isLake: isLake[cellIndex] === 1,
      temperature: 0,
      precipitation: 0,
      rainShadow: 0,
      terrain: 'plains' as TTerrainBand,
      biome: '',
      suitability: 0,
    };

    if (nextCell.isWater && !nextCell.isLake) {
      nextCell.terrain =
        nextCell.elevation < seaLevel - MAP_HYDROLOGY_CONFIG.deepWaterOffset
          ? 'deep-water'
          : 'shallow-water';
    }

    return nextCell;
  });

  const waterInfluence = buildWaterInfluence(baseCells);

  const cells = baseCells.map((cell, cellIndex) => {
    const latitude = Math.abs((cell.site[1] / mesh.height) * 2 - 1);
    const temperature = clamp(
      1 -
        latitude * MAP_HYDROLOGY_CONFIG.temperatureLatitudeWeight -
        Math.max(0, cell.elevation - seaLevel) * MAP_HYDROLOGY_CONFIG.temperatureElevationWeight +
        waterInfluence[cellIndex] * MAP_HYDROLOGY_CONFIG.temperatureWaterWeight,
      0,
      1
    );
    const rainShadow = getRainShadow(cell, baseCells);
    const orographicRain = clamp(
      Math.max(0, cell.elevation - MAP_HYDROLOGY_CONFIG.orographicElevationStart) *
        MAP_HYDROLOGY_CONFIG.orographicWeight,
      0,
      MAP_HYDROLOGY_CONFIG.orographicMax
    );
    const precipitation = clamp(
      waterInfluence[cellIndex] * MAP_HYDROLOGY_CONFIG.precipitationWaterWeight +
        (1 - latitude) * MAP_HYDROLOGY_CONFIG.precipitationLatitudeWeight +
        Math.log2(cell.flow + 1) * MAP_HYDROLOGY_CONFIG.precipitationFlowWeight +
        orographicRain -
        rainShadow * MAP_HYDROLOGY_CONFIG.precipitationRainShadowWeight,
      0,
      1
    );

    const neighborAverage = getNeighborAverageElevation(cell, baseCells);
    const relief = cell.elevation - neighborAverage;
    const terrain = getTerrainBand(cell, seaLevel, temperature, precipitation, rainShadow, relief);

    return {
      ...cell,
      terrain,
      biome: getBiome(terrain),
      suitability: getSuitability(terrain, precipitation, temperature),
      temperature,
      precipitation,
      rainShadow,
    };
  });

  expandLakes(cells, flow, downstream);
  filterAndLimitLakes(cells, flow);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    const downstreamId = downstream[cellIndex];

    if (cell.isWater) {
      cell.isRiver = false;
      continue;
    }

    const dryPenalty =
      cell.precipitation < MAP_HYDROLOGY_CONFIG.dryRiverPrecipitationMax &&
      cell.rainShadow > MAP_HYDROLOGY_CONFIG.dryRiverRainShadowMin
        ? MAP_HYDROLOGY_CONFIG.dryRiverFlowPenalty
        : 0;
    const riverThreshold = MAP_HYDROLOGY_CONFIG.riverFlowMin + dryPenalty;

    if (
      flow[cellIndex] >= riverThreshold &&
      (downstreamId >= 0 || downstreamId === T_COAST_OUTLET)
    ) {
      isRiver[cellIndex] = 1;
      cell.isRiver = true;
    } else {
      cell.isRiver = false;
    }
  }

  validateRivers(cells, flow, downstream, isRiver);
  addInlandPlainTributaries(cells, flow, downstream);
  extendRiversTowardHighlands(cells, flow, downstream, seaLevel);

  regionalizeLandTerrains(cells, seaLevel);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    cell.biome = getBiome(cell.terrain);
    cell.suitability = getSuitability(cell.terrain, cell.precipitation, cell.temperature);
  }

  return { ...mesh, cells };
}
