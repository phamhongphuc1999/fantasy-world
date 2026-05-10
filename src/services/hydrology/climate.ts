import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TBiome, TCell, TLandform } from 'src/types/map.types';
import { clamp } from '../utils/math';

export type TClimateTerrainTag =
  | 'lake'
  | 'deep-water'
  | 'shallow-water'
  | 'coast'
  | 'tundra'
  | 'mountains'
  | 'hills'
  | 'plateau'
  | 'valley'
  | 'badlands'
  | 'desert'
  | 'swamp'
  | 'forest'
  | 'volcanic'
  | 'plains';

export function buildWaterInfluence(cells: TCell[]): Float32Array {
  let waterInfluence = new Float32Array(cells.length);
  let nextInfluence = new Float32Array(cells.length);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    waterInfluence[cellIndex] = cells[cellIndex].isWater ? 1 : 0;
  }

  for (let iteration = 0; iteration < HYDROLOGY_CONFIG.waterInfluenceIters; iteration += 1) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (cell.neighbors.length === 0) {
        nextInfluence[cellIndex] = waterInfluence[cellIndex] as number;
        continue;
      }

      let total = waterInfluence[cellIndex] * HYDROLOGY_CONFIG.waterInfluenceSelfW;
      for (const neighborId of cell.neighbors) {
        total += waterInfluence[neighborId];
      }

      nextInfluence[cellIndex] =
        total / (cell.neighbors.length + HYDROLOGY_CONFIG.waterInfluenceSelfW);
    }
    const tmp = waterInfluence;
    waterInfluence = nextInfluence;
    nextInfluence = tmp;
  }

  return waterInfluence;
}

export function getTerrain(
  cell: TCell,
  seaLevel: number,
  temperature: number,
  precipitation: number,
  rainShadow: number,
  relief: number
): TClimateTerrainTag {
  if (cell.isLake) return 'lake';
  if (cell.elevation < seaLevel - HYDROLOGY_CONFIG.deepWaterDepth) return 'deep-water';
  if (cell.elevation < seaLevel) return 'shallow-water';
  if (cell.elevation < seaLevel + HYDROLOGY_CONFIG.coastBand) return 'coast';

  const inValley =
    cell.isRiver ||
    (relief < HYDROLOGY_CONFIG.valleyReliefMax && precipitation > HYDROLOGY_CONFIG.valleyPrecipMin);

  if (
    temperature < HYDROLOGY_CONFIG.tundraTempMax ||
    cell.elevation > HYDROLOGY_CONFIG.tundraElevMin
  ) {
    return 'tundra';
  }

  const elevationAboveSea = cell.elevation - seaLevel;
  const isNewlyEmergedLand = elevationAboveSea < HYDROLOGY_CONFIG.newLandBand;

  if (
    relief > HYDROLOGY_CONFIG.mountainReliefMin &&
    (cell.elevation > HYDROLOGY_CONFIG.mountainElevMin || isNewlyEmergedLand)
  ) {
    return 'mountains';
  }

  if (
    relief > HYDROLOGY_CONFIG.hillReliefMin &&
    (cell.elevation > HYDROLOGY_CONFIG.hillElevMin || isNewlyEmergedLand)
  ) {
    return 'hills';
  }

  if (
    cell.elevation > HYDROLOGY_CONFIG.plateauElevMin &&
    relief < HYDROLOGY_CONFIG.plateauReliefCap &&
    precipitation > HYDROLOGY_CONFIG.plateauPrecipMin &&
    precipitation < HYDROLOGY_CONFIG.plateauPrecipMax
  ) {
    return 'plateau';
  }

  if (cell.elevation > HYDROLOGY_CONFIG.mountainElevMin) return 'mountains';
  if (cell.elevation > HYDROLOGY_CONFIG.hillElevMin) return 'hills';
  if (inValley) return 'valley';

  if (
    temperature > HYDROLOGY_CONFIG.desertTempMin &&
    precipitation < HYDROLOGY_CONFIG.desertPrecipMax &&
    rainShadow > HYDROLOGY_CONFIG.desertRainShadowMin
  ) {
    if (
      cell.elevation > seaLevel + HYDROLOGY_CONFIG.badlandsElevAboveSeaMin &&
      relief > HYDROLOGY_CONFIG.badlandsReliefMin
    ) {
      return 'badlands';
    }
    return 'desert';
  }

  if (
    precipitation > HYDROLOGY_CONFIG.swampPrecipMin &&
    cell.elevation < HYDROLOGY_CONFIG.swampElevMax &&
    relief < HYDROLOGY_CONFIG.swampReliefCap
  ) {
    return 'swamp';
  }

  if (
    precipitation > HYDROLOGY_CONFIG.forestPrecipMin &&
    temperature > HYDROLOGY_CONFIG.forestTempMin
  ) {
    return 'forest';
  }
  if (
    precipitation < HYDROLOGY_CONFIG.aridDesertPrecipMax &&
    temperature > HYDROLOGY_CONFIG.aridDesertTempMin &&
    rainShadow > HYDROLOGY_CONFIG.aridDesertRainShadowMin
  ) {
    return 'desert';
  }
  if (
    cell.elevation >
      HYDROLOGY_CONFIG.mountainElevMin - HYDROLOGY_CONFIG.volcanicElevNearMountainDelta &&
    precipitation < HYDROLOGY_CONFIG.volcanicPrecipMax &&
    temperature > HYDROLOGY_CONFIG.volcanicTempMin
  ) {
    return 'volcanic';
  }
  if (
    relief < HYDROLOGY_CONFIG.valleySecondaryReliefMax &&
    precipitation > HYDROLOGY_CONFIG.valleySecondaryPrecipMin
  ) {
    return 'valley';
  }
  if (
    relief > HYDROLOGY_CONFIG.hillsSecondaryReliefMin &&
    cell.elevation > seaLevel + HYDROLOGY_CONFIG.hillsSecondaryElevAboveSeaMin
  ) {
    return 'hills';
  }
  return 'plains';
}

function climateSuitability(precipitation: number, temperature: number) {
  const climateScore = 1 - Math.abs(temperature - 0.52) * 1.15;
  const moistureScore = 1 - Math.abs(precipitation - 0.52) * 0.95;
  return clamp(climateScore * 0.45 + moistureScore * 0.45 + 0.1, 0, 1);
}

export function getSuitabilityByLandformBiome(
  landform: TLandform,
  biome: TBiome,
  precipitation: number,
  temperature: number
): number {
  if (landform === 'marine_deep') return 0;
  if (landform === 'marine_shallow') return 0.02;
  if (landform === 'lake') return 0.12;
  if (biome === 'ice') return 0.03;
  if (biome === 'tundra') return 0.16;
  if (biome === 'desert_hot') return 0.22;
  if (biome === 'desert_cold') return 0.2;
  if (biome === 'wetland') return 0.5;

  const climate = climateSuitability(precipitation, temperature);
  let factor = 1;
  if (landform === 'plain') factor += 0.16;
  if (landform === 'valley') factor += 0.22;
  if (landform === 'coast') factor += 0.12;
  if (landform === 'hills') factor -= 0.05;
  if (landform === 'plateau') factor -= 0.08;
  if (landform === 'mountain' || landform === 'volcanic_field') factor -= 0.28;

  if (biome === 'plain') factor += 0.2;
  if (biome === 'temperate_forest') factor += 0.1;
  if (biome === 'grassland') factor += 0.08;
  if (biome === 'savanna') factor += 0.03;
  if (biome === 'boreal_forest') factor -= 0.04;
  if (biome === 'tropical_forest') factor -= 0.08;
  if (biome === 'steppe') factor -= 0.1;
  if (biome === 'montane_shrub') factor -= 0.14;

  return clamp(climate * factor, 0, 1);
}
