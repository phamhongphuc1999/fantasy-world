import { CORE, ELEVATION_CONFIG, TERRAIN_RULES } from 'src/configs/MapConfig/hydrology.config';
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

  for (let iteration = 0; iteration < CORE.waterInfluence.iterations; iteration += 1) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (cell.neighbors.length === 0) {
        nextInfluence[cellIndex] = waterInfluence[cellIndex] as number;
        continue;
      }

      let total = waterInfluence[cellIndex] * CORE.waterInfluence.selfWeight;
      for (const neighborId of cell.neighbors) {
        total += waterInfluence[neighborId];
      }

      nextInfluence[cellIndex] = total / (cell.neighbors.length + CORE.waterInfluence.selfWeight);
    }
    const tmp = waterInfluence;
    waterInfluence = nextInfluence;
    nextInfluence = tmp;
  }
  return waterInfluence;
}

const RELIEF = TERRAIN_RULES.relief;
const AIRD = TERRAIN_RULES.arid;
const SEA = TERRAIN_RULES.sea;
const WET = TERRAIN_RULES.wet;
export function getTerrain(
  cell: TCell,
  seaLevel: number,
  temperature: number,
  precipitation: number,
  rainShadow: number,
  relief: number
): TClimateTerrainTag {
  if (cell.isLake) return 'lake';
  if (cell.elevation < seaLevel - SEA.deepSeaLevel) return 'deep-water';
  if (cell.elevation < seaLevel) return 'shallow-water';
  if (cell.elevation < seaLevel + SEA.coastBand) return 'coast';

  const inValley =
    cell.isRiver || (relief < RELIEF.valleyMax && precipitation > RELIEF.valleyPrecipMin);

  if (
    temperature < TERRAIN_RULES.cold.tundraMaxTemp ||
    cell.elevation > TERRAIN_RULES.cold.tundraElevMin
  ) {
    return 'tundra';
  }

  const elevationAboveSea = cell.elevation - seaLevel;
  const isNewLand = elevationAboveSea < SEA.newLandWidth;

  if (relief > RELIEF.mountainMin && (cell.elevation > RELIEF.mountainElevMin || isNewLand)) {
    return 'mountains';
  }

  if (relief > RELIEF.hillMin && (cell.elevation > RELIEF.hillElevMin || isNewLand)) {
    return 'hills';
  }

  if (
    cell.elevation > RELIEF.plateauElevMin &&
    relief < RELIEF.plateauCap &&
    precipitation > RELIEF.plateauPrecipMin &&
    precipitation < RELIEF.plateauPrecipMax
  ) {
    return 'plateau';
  }

  if (cell.elevation > RELIEF.mountainElevMin) return 'mountains';
  if (cell.elevation > RELIEF.hillElevMin) return 'hills';
  if (inValley) return 'valley';

  if (
    temperature > AIRD.desertTempMin &&
    precipitation < AIRD.desertPrecipMax &&
    rainShadow > AIRD.desertRainShadowMin
  ) {
    if (cell.elevation > seaLevel + ELEVATION_CONFIG.minBadland && relief > RELIEF.badlandsMin) {
      return 'badlands';
    }
    return 'desert';
  }

  if (
    precipitation > WET.swampPrecipMin &&
    cell.elevation < WET.swampElevMax &&
    relief < WET.swampReliefCap
  ) {
    return 'swamp';
  }

  if (precipitation > WET.forestPrecipMin && temperature > WET.forestTempMin) {
    return 'forest';
  }
  if (
    precipitation < AIRD.aridDesertPrecipMax &&
    temperature > AIRD.aridDesertTempMin &&
    rainShadow > AIRD.aridDesertRainShadowMin
  ) {
    return 'desert';
  }
  if (
    cell.elevation >
      RELIEF.mountainElevMin - TERRAIN_RULES.volcanic.elevationDeltaFromMountainMin &&
    precipitation < TERRAIN_RULES.volcanic.precipMax &&
    temperature > TERRAIN_RULES.volcanic.tempMin
  ) {
    return 'volcanic';
  }
  if (relief < RELIEF.valley2Max && precipitation > RELIEF.valley2PrecipMin) {
    return 'valley';
  }
  if (relief > RELIEF.hills2Min && cell.elevation > seaLevel + ELEVATION_CONFIG.minHill) {
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
