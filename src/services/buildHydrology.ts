import { TERRAIN_CONFIG } from 'src/configs/constance';
import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import {
  buildWaterInfluence,
  getRainShadow,
  getSuitability,
  getTerrain,
} from 'src/services/hydrology/climateTerrain';
import {
  classifyInlandWater,
  expandLakes,
  filterAndLimitLakes,
} from 'src/services/hydrology/lakes';
import { runRiverGeneration } from 'src/services/hydrology/riverGeneration';
import {
  antiAliasTerrains,
  clusterLandTerrains,
  joinSmallZones,
  rebalanceTerrain,
  toTerrainBalance,
} from 'src/services/hydrology/terrain';
import { TCell, TDelaunayMesh, THydrology, TTerrain, TTerrainRatioMap } from 'src/types/map.types';
import { clamp, getAvgNeighbor } from '.';

interface TBuildHydrologyOptions {
  mesh: TDelaunayMesh;
  seaLevel: number;
  seed: string;
  terrainRatios?: TTerrainRatioMap;
}

const T_COAST_OUTLET = HYDROLOGY_CONFIG.coastOutlet;
function nowMs() {
  if (typeof globalThis !== 'undefined' && globalThis.performance?.now) {
    return globalThis.performance.now();
  }
  return Date.now();
}

function sortIndicesByElevation(elevations: Float32Array) {
  const indices = Array.from({ length: elevations.length }, (_, index) => index);
  indices.sort((left, right) => elevations[right] - elevations[left]);
  return indices;
}

function createEmptyHydrologyProfile(): THydrology {
  return {
    initDownstreamMs: 0,
    flowAccumulationMs: 0,
    erosionAdjustmentMs: 0,
    climateAndTerrainMs: 0,
    lakesMs: 0,
    riversMs: 0,
    terrainPostProcessMs: 0,
    finalizeBiomeMs: 0,
    totalMs: 0,
  };
}

function runHydrologyInternal(
  { mesh, seaLevel, seed, terrainRatios }: TBuildHydrologyOptions,
  onProfile?: (profile: THydrology) => void
): TDelaunayMesh {
  const profile = createEmptyHydrologyProfile();
  const totalStart = nowMs();

  function measure<T>(key: keyof Omit<THydrology, 'totalMs'>, run: () => T) {
    const start = nowMs();
    const result = run();
    profile[key] += nowMs() - start;
    return result;
  }

  const cellCount = mesh.cells.length;
  const elevations = new Float32Array(cellCount);
  const adjustedElevations = new Float32Array(cellCount);
  const flow = new Float32Array(cellCount);
  const effectiveFlow = new Float32Array(cellCount);
  const erosion = new Float32Array(cellCount);
  const deposit = new Float32Array(cellCount);
  const downstream = new Int32Array(cellCount);
  const isLake = new Uint8Array(cellCount);
  const isRiver = new Uint8Array(cellCount);

  measure('initDownstreamMs', () => {
    downstream.fill(-1);

    for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
      elevations[cellIndex] = mesh.cells[cellIndex].elevation;
      adjustedElevations[cellIndex] = mesh.cells[cellIndex].elevation;
      flow[cellIndex] = mesh.cells[cellIndex].isWater ? 0 : 1;
      effectiveFlow[cellIndex] = 0;
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

  measure('erosionAdjustmentMs', () => {
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
              slope * HYDROLOGY_CONFIG.erosionSlopeW +
                Math.log2(flow[cellIndex] + 1) * HYDROLOGY_CONFIG.erosionFlowW
            );

      erosion[cellIndex] = erosionAmount;

      if (downstreamId >= 0) {
        deposit[downstreamId] += erosionAmount * HYDROLOGY_CONFIG.depositRate;
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

  const cells = mesh.cells.map((cell, cellIndex) => {
    const nextCell: TCell = {
      ...cell,
      elevation: adjustedElevations[cellIndex],
      isWater: cell.isWater || isLake[cellIndex] === 1,
      flow: flow[cellIndex],
      effectiveFlow: effectiveFlow[cellIndex],
      riverWidth: 0,
      downstreamId: downstream[cellIndex] >= 0 ? downstream[cellIndex] : null,
      erosion: erosion[cellIndex],
      isRiver: false,
      riverId: null,
      riverOrder: 0,
      isRiverSource: false,
      isRiverMouth: false,
      isLake: isLake[cellIndex] === 1,
      temperature: 0,
      precipitation: 0,
      rainShadow: 0,
      population: 0,
      economy: 0,
      waterAccessScore: 0,
      terrain: 'plains' as TTerrain,
      biome: '',
      suitability: 0,
      nationId: null,
      provinceId: null,
      ethnicId: null,
      zoneType: 'international-waters' as const,
      isCapital: false,
      isEconomicHub: false,
    };

    if (nextCell.isWater && !nextCell.isLake) {
      nextCell.terrain =
        nextCell.elevation < seaLevel - HYDROLOGY_CONFIG.deepWaterDepth
          ? 'deep-water'
          : 'shallow-water';
    }

    return nextCell;
  });

  measure('climateAndTerrainMs', () => {
    const waterInfluence = buildWaterInfluence(cells);
    const rainShadowByCell = new Float32Array(cells.length);
    const reliefByCell = new Float32Array(cells.length);

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      rainShadowByCell[cellIndex] = getRainShadow(cell, cells);
      const neighborAverage = getAvgNeighbor(cell, cells);
      reliefByCell[cellIndex] = cell.elevation - neighborAverage;
    }

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      const latitude = Math.abs((cell.site[1] / mesh.height) * 2 - 1);
      const temperature = clamp(
        1 -
          latitude * HYDROLOGY_CONFIG.tempLatW -
          Math.max(0, cell.elevation - seaLevel) * HYDROLOGY_CONFIG.tempElevW +
          waterInfluence[cellIndex] * HYDROLOGY_CONFIG.tempWaterW,
        0,
        1
      );
      const rainShadow = rainShadowByCell[cellIndex];
      const orographicRain = clamp(
        Math.max(0, cell.elevation - HYDROLOGY_CONFIG.oroElevStart) * HYDROLOGY_CONFIG.oroW,
        0,
        HYDROLOGY_CONFIG.oroMax
      );
      const precipitation = clamp(
        waterInfluence[cellIndex] * HYDROLOGY_CONFIG.precipWaterW +
          (1 - latitude) * HYDROLOGY_CONFIG.precipLatW +
          Math.log2(cell.flow + 1) * HYDROLOGY_CONFIG.precipFlowW +
          orographicRain -
          rainShadow * HYDROLOGY_CONFIG.precipRainShadowW,
        0,
        1
      );

      const relief = reliefByCell[cellIndex];
      const terrain = getTerrain(cell, seaLevel, temperature, precipitation, rainShadow, relief);

      cell.terrain = terrain;
      cell.biome = TERRAIN_CONFIG[terrain].label;
      cell.suitability = getSuitability(terrain, precipitation, temperature);
      cell.temperature = temperature;
      cell.precipitation = precipitation;
      cell.rainShadow = rainShadow;
    }
  });

  measure('lakesMs', () => {
    expandLakes(cells, flow, downstream);
    filterAndLimitLakes(cells, flow);
    classifyInlandWater(cells, mesh.width, mesh.height, seaLevel, downstream);
  });

  measure('riversMs', () => {
    const precipitation = new Float32Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      precipitation[cellIndex] = cells[cellIndex].precipitation;
    }

    const result = runRiverGeneration(cells, seaLevel, precipitation, seed);

    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      flow[cellIndex] = result.flow[cellIndex];
      effectiveFlow[cellIndex] = result.effectiveFlow[cellIndex];
      downstream[cellIndex] = result.downstream[cellIndex];
      const cell = cells[cellIndex];
      const riverId = result.riverByCell[cellIndex];
      cell.flow = flow[cellIndex];
      cell.effectiveFlow = effectiveFlow[cellIndex];
      cell.downstreamId = downstream[cellIndex] >= 0 ? downstream[cellIndex] : null;
      cell.riverId = riverId >= 0 ? riverId : null;
      cell.isRiver = riverId >= 0;
      cell.riverWidth = riverId >= 0 ? result.riverWidthByCell[cellIndex] : 0;
      isRiver[cellIndex] = riverId >= 0 ? 1 : 0;
    }

    const riverSource = new Set<number>();
    const riverMouth = new Set<number>();
    for (const river of result.rivers) {
      riverSource.add(river.sourceCellId);
      riverMouth.add(river.mouthCellId);
    }
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].isRiverSource = riverSource.has(cellIndex);
      cells[cellIndex].isRiverMouth = riverMouth.has(cellIndex);
      cells[cellIndex].riverOrder = cells[cellIndex].isRiver ? 1 : 0;
    }

    mesh.rivers = result.rivers;
  });

  measure('terrainPostProcessMs', () => {
    clusterLandTerrains(cells, seaLevel);
    const terrainBalance = terrainRatios
      ? toTerrainBalance(terrainRatios)
      : HYDROLOGY_CONFIG.terrainBalance;
    rebalanceTerrain(cells, terrainBalance);
    antiAliasTerrains(cells);
    joinSmallZones(cells, seaLevel);
    antiAliasTerrains(cells);
  });

  measure('finalizeBiomeMs', () => {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      cell.biome = TERRAIN_CONFIG[cell.terrain].label;
      cell.suitability = getSuitability(cell.terrain, cell.precipitation, cell.temperature);
    }
  });

  profile.totalMs = nowMs() - totalStart;
  onProfile?.(profile);
  return { ...mesh, cells, rivers: mesh.rivers ?? [] };
}

export function buildHydrology({
  mesh,
  seaLevel,
  seed,
  terrainRatios,
}: TBuildHydrologyOptions): TDelaunayMesh {
  return runHydrologyInternal({ mesh, seaLevel, seed, terrainRatios });
}
