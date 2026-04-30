import { MAP_HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TMapMeshWithDelaunay, TTerrainBand, TTerrainRatioMap } from 'src/types/global';

import {
  buildWaterInfluence,
  getBiome,
  getRainShadow,
  getSuitability,
  getTerrainBand,
} from './hydrology/climateTerrain';
import { clamp, getNeighborAverageElevation, sortIndicesByElevation } from './hydrology/common';
import { classifyEnclosedWaterBodies, expandLakes, filterAndLimitLakes } from './hydrology/lakes';
import {
  addInlandPlainTributaries,
  extendRiversTowardHighlands,
  validateRivers,
} from './hydrology/rivers';
import {
  antiAliasTerrains,
  mergeSmallTerrainClusters,
  rebalanceTerrainDistribution,
  regionalizeLandTerrains,
  toTerrainBalance,
} from './hydrology/terrainProcessing';

interface TBuildHydrologyOptions {
  mesh: TMapMeshWithDelaunay;
  seaLevel: number;
  terrainRatios?: TTerrainRatioMap;
}

const T_COAST_OUTLET = MAP_HYDROLOGY_CONFIG.coastOutletId;

export function buildHydrology({
  mesh,
  seaLevel,
  terrainRatios,
}: TBuildHydrologyOptions): TMapMeshWithDelaunay {
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
      population: 0,
      terrain: 'plains' as TTerrainBand,
      biome: '',
      suitability: 0,
      nationId: null,
      provinceId: null,
      ethnicGroupId: null,
      zoneType: 'international-waters' as const,
      isCapital: false,
      isEconomicHub: false,
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
  classifyEnclosedWaterBodies(cells, mesh.width, mesh.height, seaLevel, downstream);

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
  const terrainBalance = terrainRatios
    ? toTerrainBalance(terrainRatios)
    : MAP_HYDROLOGY_CONFIG.terrainBalance;
  rebalanceTerrainDistribution(cells, terrainBalance);
  antiAliasTerrains(cells);
  mergeSmallTerrainClusters(cells, seaLevel);
  antiAliasTerrains(cells);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex];
    cell.biome = getBiome(cell.terrain);
    cell.suitability = getSuitability(cell.terrain, cell.precipitation, cell.temperature);
  }

  return { ...mesh, cells };
}
