import { MAP_HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TMapCell, TTerrainBand } from 'src/types/global';

const T_COAST_OUTLET = MAP_HYDROLOGY_CONFIG.coastOutletId;
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
  return terrain === 'deep-water' || terrain === 'shallow-water' || terrain === 'inland-sea';
}

function touchesMapBoundary(cell: TMapCell, width: number, height: number) {
  const epsilon = 1;
  if (cell.site[0] <= epsilon || cell.site[0] >= width - epsilon) return true;
  if (cell.site[1] <= epsilon || cell.site[1] >= height - epsilon) return true;
  for (const [x, y] of cell.polygon) {
    if (x <= epsilon || x >= width - epsilon) return true;
    if (y <= epsilon || y >= height - epsilon) return true;
  }
  return false;
}

function buildOceanConnectedWaterMask(cells: TMapCell[], width: number, height: number) {
  const oceanConnected = new Uint8Array(cells.length);
  const queue: number[] = [];

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (!cells[cellIndex].isWater) continue;
    if (!touchesMapBoundary(cells[cellIndex], width, height)) continue;
    oceanConnected[cellIndex] = 1;
    queue.push(cellIndex);
  }
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === undefined) continue;
    for (const neighborId of cells[current].neighbors) {
      if (oceanConnected[neighborId] === 1) continue;
      if (!cells[neighborId].isWater) continue;
      oceanConnected[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  return oceanConnected;
}

function classifyEnclosedWaterBodies(
  cells: TMapCell[],
  width: number,
  height: number,
  seaLevel: number,
  downstream: Int32Array
) {
  const oceanConnected = buildOceanConnectedWaterMask(cells, width, height);
  const threshold = seaLevel + MAP_HYDROLOGY_CONFIG.enclosedWaterElevationBuffer;
  const visited = new Uint8Array(cells.length);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;
    if (oceanConnected[cellIndex] === 1) continue;
    const isEnclosedSeedCandidate =
      cells[cellIndex].isWater || cells[cellIndex].isLake || downstream[cellIndex] === -1;
    if (!isEnclosedSeedCandidate) continue;
    if (cells[cellIndex].elevation > threshold) continue;

    const queue = [cellIndex];
    const component: number[] = [];
    visited[cellIndex] = 1;
    let minElevation = cells[cellIndex].elevation;

    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) continue;
      const currentCell = cells[current];
      component.push(current);
      minElevation = Math.min(minElevation, currentCell.elevation);

      for (const neighborId of currentCell.neighbors) {
        if (visited[neighborId] === 1) continue;
        if (oceanConnected[neighborId] === 1) continue;
        if (cells[neighborId].elevation > threshold) continue;
        visited[neighborId] = 1;
        queue.push(neighborId);
      }
    }

    const basinDepth = seaLevel - minElevation;
    const shouldPersistWater =
      basinDepth >= MAP_HYDROLOGY_CONFIG.enclosedWaterPersistentDepthMin ||
      component.some((id) => cells[id].isWater);
    if (!shouldPersistWater) continue;

    const isLake = component.length <= MAP_HYDROLOGY_CONFIG.enclosedLakeMaxCells;
    const shorelineRise = Math.min(
      MAP_HYDROLOGY_CONFIG.enclosedWaterDepthShoreMax,
      basinDepth * MAP_HYDROLOGY_CONFIG.enclosedWaterDepthShoreFactor
    );
    const waterSurface = seaLevel + Math.max(0, shorelineRise);

    for (const waterCellId of component) {
      const waterCell = cells[waterCellId];
      if (waterCell.elevation > waterSurface) continue;
      waterCell.isWater = true;
      waterCell.isLake = isLake;
      waterCell.isRiver = false;
      waterCell.terrain = isLake ? 'lake' : 'inland-sea';
      waterCell.biome = isLake ? 'Freshwater Lake' : 'Inland Sea';
      waterCell.suitability = isLake ? 0.12 : 0;
    }
  }
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

export {
  buildLakeSizeMap,
  buildPlainsRegionSizeMap,
  classifyEnclosedWaterBodies,
  expandLakes,
  filterAndLimitLakes,
};
