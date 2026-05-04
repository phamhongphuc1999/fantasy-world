import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import {
  THydrologyProfile,
  TMapMeshWithDelaunay,
  TTerrainBand,
  TTerrainRatioMap,
} from 'src/types/map.types';
import {
  buildWaterInfluence,
  getBiome,
  getRainShadow,
  getSuitability,
  getTerrainBand,
} from 'src/services/map/hydrology/climateTerrain';
import {
  clamp,
  getNeighborAverageElevation,
  sortIndicesByElevation,
} from 'src/services/map/hydrology/hydrologyUtils';
import {
  classifyEnclosedWaterBodies,
  expandLakes,
  filterAndLimitLakes,
} from 'src/services/map/hydrology/lakes';
import {
  addInlandPlainTributaries,
  extendRiversTowardHighlands,
  validateRivers,
} from 'src/services/map/hydrology/rivers';
import {
  antiAliasTerrains,
  mergeSmallTerrainClusters,
  rebalanceTerrainDistribution,
  regionalizeLandTerrains,
  toTerrainBalance,
} from 'src/services/map/hydrology/terrainProcessing';

interface TBuildHydrologyOptions {
  mesh: TMapMeshWithDelaunay;
  seaLevel: number;
  terrainRatios?: TTerrainRatioMap;
}

const T_COAST_OUTLET = HYDROLOGY_CONFIG.coastOutletId;
function nowMs() {
  if (typeof globalThis !== 'undefined' && globalThis.performance?.now) {
    return globalThis.performance.now();
  }
  return Date.now();
}

function createEmptyHydrologyProfile(): THydrologyProfile {
  return {
    initAndDownstreamMs: 0,
    flowAccumulationMs: 0,
    erosionAndAdjustMs: 0,
    climateAndTerrainMs: 0,
    lakesAndEnclosedWaterMs: 0,
    riversMs: 0,
    terrainPostProcessMs: 0,
    finalizeBiomeMs: 0,
    totalMs: 0,
  };
}

function runHydrologyInternal(
  { mesh, seaLevel, terrainRatios }: TBuildHydrologyOptions,
  onProfile?: (profile: THydrologyProfile) => void
): TMapMeshWithDelaunay {
  const profile = createEmptyHydrologyProfile();
  const totalStart = nowMs();

  function measure<T>(key: keyof Omit<THydrologyProfile, 'totalMs'>, run: () => T) {
    const start = nowMs();
    const result = run();
    profile[key] += nowMs() - start;
    return result;
  }

  const cellCount = mesh.cells.length;
  const elevations = new Float32Array(cellCount);
  const adjustedElevations = new Float32Array(cellCount);
  const flow = new Float32Array(cellCount);
  const erosion = new Float32Array(cellCount);
  const deposit = new Float32Array(cellCount);
  const downstream = new Int32Array(cellCount);
  const isLake = new Uint8Array(cellCount);
  const isRiver = new Uint8Array(cellCount);

  measure('initAndDownstreamMs', () => {
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
  });

  measure('flowAccumulationMs', () => {
    const sortedIndices = sortIndicesByElevation(elevations);
    for (const cellIndex of sortedIndices) {
      const downstreamId = downstream[cellIndex];
      if (downstreamId >= 0) flow[downstreamId] += flow[cellIndex];
    }
  });

  measure('erosionAndAdjustMs', () => {
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
              HYDROLOGY_CONFIG.erosionMax,
              slope * HYDROLOGY_CONFIG.erosionSlopeWeight +
                Math.log2(flow[cellIndex] + 1) * HYDROLOGY_CONFIG.erosionFlowWeight
            );

      erosion[cellIndex] = erosionAmount;

      if (downstreamId >= 0) {
        deposit[downstreamId] += erosionAmount * HYDROLOGY_CONFIG.depositFactor;
      }

      if (isSink && flow[cellIndex] > HYDROLOGY_CONFIG.lakeSinkFlowMin) {
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
  });

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
      waterAccessibility: 0,
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
        nextCell.elevation < seaLevel - HYDROLOGY_CONFIG.deepWaterOffset
          ? 'deep-water'
          : 'shallow-water';
    }

    return nextCell;
  });

  const cells = measure('climateAndTerrainMs', () => {
    const waterInfluence = buildWaterInfluence(baseCells);
    return baseCells.map((cell, cellIndex) => {
      const latitude = Math.abs((cell.site[1] / mesh.height) * 2 - 1);
      const temperature = clamp(
        1 -
          latitude * HYDROLOGY_CONFIG.temperatureLatitudeWeight -
          Math.max(0, cell.elevation - seaLevel) * HYDROLOGY_CONFIG.temperatureElevationWeight +
          waterInfluence[cellIndex] * HYDROLOGY_CONFIG.temperatureWaterWeight,
        0,
        1
      );
      const rainShadow = getRainShadow(cell, baseCells);
      const orographicRain = clamp(
        Math.max(0, cell.elevation - HYDROLOGY_CONFIG.orographicElevationStart) *
          HYDROLOGY_CONFIG.orographicWeight,
        0,
        HYDROLOGY_CONFIG.orographicMax
      );
      const precipitation = clamp(
        waterInfluence[cellIndex] * HYDROLOGY_CONFIG.precipitationWaterWeight +
          (1 - latitude) * HYDROLOGY_CONFIG.precipitationLatitudeWeight +
          Math.log2(cell.flow + 1) * HYDROLOGY_CONFIG.precipitationFlowWeight +
          orographicRain -
          rainShadow * HYDROLOGY_CONFIG.precipitationRainShadowWeight,
        0,
        1
      );

      const neighborAverage = getNeighborAverageElevation(cell, baseCells);
      const relief = cell.elevation - neighborAverage;
      const terrain = getTerrainBand(
        cell,
        seaLevel,
        temperature,
        precipitation,
        rainShadow,
        relief
      );

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
  });

  measure('lakesAndEnclosedWaterMs', () => {
    expandLakes(cells, flow, downstream);
    filterAndLimitLakes(cells, flow);
    classifyEnclosedWaterBodies(cells, mesh.width, mesh.height, seaLevel, downstream);
  });

  measure('riversMs', () => {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      const downstreamId = downstream[cellIndex];

      if (cell.isWater) {
        cell.isRiver = false;
        continue;
      }

      const dryPenalty =
        cell.precipitation < HYDROLOGY_CONFIG.dryRiverPrecipitationMax &&
        cell.rainShadow > HYDROLOGY_CONFIG.dryRiverRainShadowMin
          ? HYDROLOGY_CONFIG.dryRiverFlowPenalty
          : 0;
      const riverThreshold = HYDROLOGY_CONFIG.riverFlowMin + dryPenalty;

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
  });

  measure('terrainPostProcessMs', () => {
    regionalizeLandTerrains(cells, seaLevel);
    const terrainBalance = terrainRatios
      ? toTerrainBalance(terrainRatios)
      : HYDROLOGY_CONFIG.terrainBalance;
    rebalanceTerrainDistribution(cells, terrainBalance);
    antiAliasTerrains(cells);
    mergeSmallTerrainClusters(cells, seaLevel);
    antiAliasTerrains(cells);
  });

  measure('finalizeBiomeMs', () => {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      cell.biome = getBiome(cell.terrain);
      cell.suitability = getSuitability(cell.terrain, cell.precipitation, cell.temperature);
    }
  });

  profile.totalMs = nowMs() - totalStart;
  onProfile?.(profile);
  return { ...mesh, cells };
}

export function buildHydrology({
  mesh,
  seaLevel,
  terrainRatios,
}: TBuildHydrologyOptions): TMapMeshWithDelaunay {
  return runHydrologyInternal({ mesh, seaLevel, terrainRatios });
}

export function buildHydrologyProfiled({ mesh, seaLevel, terrainRatios }: TBuildHydrologyOptions): {
  mesh: TMapMeshWithDelaunay;
  profile: THydrologyProfile;
} {
  let hydrologyProfile = createEmptyHydrologyProfile();
  const builtMesh = runHydrologyInternal({ mesh, seaLevel, terrainRatios }, (profile) => {
    hydrologyProfile = profile;
  });
  return { mesh: builtMesh, profile: hydrologyProfile };
}
