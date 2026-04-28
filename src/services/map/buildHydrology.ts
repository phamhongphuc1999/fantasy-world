import { TMapCell, TMapMeshWithDelaunay, TTerrainBand } from 'src/types/global';

interface TBuildHydrologyOptions {
  mesh: TMapMeshWithDelaunay;
  seaLevel: number;
}

const T_COAST_OUTLET = -2;

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

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const nextInfluence = Float32Array.from(waterInfluence);

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (cell.neighbors.length === 0) continue;

      let total = waterInfluence[cellIndex] * 1.2;
      for (const neighborId of cell.neighbors) {
        total += waterInfluence[neighborId];
      }

      nextInfluence[cellIndex] = total / (cell.neighbors.length + 1.2);
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
    if (elevationDelta > 0.03) {
      obstruction += elevationDelta;
    }
  }

  return clamp(obstruction * 2.8, 0, 1);
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
  if (cell.elevation < seaLevel - 0.14) return 'deep-water';
  if (cell.elevation < seaLevel) return 'shallow-water';
  if (cell.elevation < seaLevel + 0.03) return 'coast';

  const inValley = cell.isRiver || (relief < -0.012 && precipitation > 0.36);

  if (temperature < 0.18 || cell.elevation > 0.9) return 'tundra';
  if (cell.elevation > 0.78) return 'mountains';
  if (cell.elevation > 0.66) return 'hills';
  if (inValley) return 'valley';

  if (temperature > 0.52 && precipitation < 0.24 && rainShadow > 0.24) {
    return 'desert';
  }

  if (precipitation > 0.74 && cell.elevation < 0.62 && relief < 0.01) {
    return 'swamp';
  }

  if (precipitation > 0.5) return 'forest';
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
  const minRegionSize = Math.max(6, Math.floor(Math.sqrt(cells.length) * 0.35));
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

  for (let iteration = 0; iteration < 2; iteration += 1) {
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

      if (dominantCount < 3 || dominantTerrain === cell.terrain) continue;

      const relief = cell.elevation - getNeighborAverageElevation(cell, cells);
      const currentScore =
        getTerrainFitness(cell.terrain, cell, seaLevel, relief) +
        (counts.get(cell.terrain) || 0) * 0.15;
      const dominantScore =
        getTerrainFitness(dominantTerrain, cell, seaLevel, relief) + dominantCount * 0.24;

      if (dominantScore > currentScore + 0.2) {
        nextTerrains[cellIndex] = dominantTerrain;
      }
    }

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].terrain = nextTerrains[cellIndex];
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
        : Math.min(0.08, slope * 0.2 + Math.log2(flow[cellIndex] + 1) * 0.012);

    erosion[cellIndex] = erosionAmount;

    if (downstreamId >= 0) {
      deposit[downstreamId] += erosionAmount * 0.42;
    }

    if (isSink && flow[cellIndex] > 3.4) {
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

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    const downstreamId = downstream[cellIndex];
    const isCellWater = cell.isWater || isLake[cellIndex] === 1;

    if (isCellWater) continue;

    if (flow[cellIndex] >= 5.1 && (downstreamId >= 0 || downstreamId === T_COAST_OUTLET)) {
      isRiver[cellIndex] = 1;
    }
  }

  const baseCells = mesh.cells.map((cell, cellIndex) => {
    const nextCell = {
      ...cell,
      elevation: adjustedElevations[cellIndex],
      isWater: cell.isWater || isLake[cellIndex] === 1,
      flow: flow[cellIndex],
      downstreamId: downstream[cellIndex] >= 0 ? downstream[cellIndex] : null,
      erosion: erosion[cellIndex],
      isRiver: isRiver[cellIndex] === 1,
      isLake: isLake[cellIndex] === 1,
      temperature: 0,
      precipitation: 0,
      rainShadow: 0,
      terrain: 'plains' as TTerrainBand,
      biome: '',
      suitability: 0,
    };

    if (nextCell.isWater && !nextCell.isLake) {
      nextCell.terrain = nextCell.elevation < seaLevel - 0.14 ? 'deep-water' : 'shallow-water';
    }

    return nextCell;
  });

  const waterInfluence = buildWaterInfluence(baseCells);

  const cells = baseCells.map((cell, cellIndex) => {
    const latitude = Math.abs((cell.site[1] / mesh.height) * 2 - 1);
    const temperature = clamp(
      1 -
        latitude * 0.85 -
        Math.max(0, cell.elevation - seaLevel) * 0.72 +
        waterInfluence[cellIndex] * 0.08,
      0,
      1
    );
    const rainShadow = getRainShadow(cell, baseCells);
    const orographicRain = clamp(Math.max(0, cell.elevation - 0.6) * 0.25, 0, 0.25);
    const precipitation = clamp(
      waterInfluence[cellIndex] * 0.56 +
        (1 - latitude) * 0.18 +
        Math.log2(cell.flow + 1) * 0.08 +
        orographicRain -
        rainShadow * 0.38,
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

  regionalizeLandTerrains(cells, seaLevel);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    cell.biome = getBiome(cell.terrain);
    cell.suitability = getSuitability(cell.terrain, cell.precipitation, cell.temperature);
  }

  return { ...mesh, cells };
}
