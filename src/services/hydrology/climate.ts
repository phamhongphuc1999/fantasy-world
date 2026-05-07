import { HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TCell, TTerrain } from 'src/types/map.types';
import { clamp } from '../utils/math';
import { terrainBaseSuitability } from '../terrain/rules';

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

export function getRainShadow(cell: TCell, cells: TCell[]) {
  let obstruction = 0;

  for (const neighborId of cell.neighbors) {
    const neighbor = cells[neighborId];
    if (neighbor.site[0] >= cell.site[0]) continue;

    const elevationDelta = neighbor.elevation - cell.elevation;
    if (elevationDelta > HYDROLOGY_CONFIG.rainShadowMinDiff) {
      obstruction += elevationDelta;
    }
  }
  return clamp(obstruction * HYDROLOGY_CONFIG.rainShadowScale, 0, 1);
}

export function getTerrain(
  cell: TCell,
  seaLevel: number,
  temperature: number,
  precipitation: number,
  rainShadow: number,
  relief: number
): TTerrain {
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
    precipitation > 0.22 &&
    precipitation < 0.58
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
    if (cell.elevation > seaLevel + 0.12 && relief > 0.012) return 'badlands';
    return 'desert';
  }

  if (
    precipitation > HYDROLOGY_CONFIG.swampPrecipMin &&
    cell.elevation < HYDROLOGY_CONFIG.swampElevMax &&
    relief < HYDROLOGY_CONFIG.swampReliefCap
  ) {
    return 'swamp';
  }

  if (precipitation > HYDROLOGY_CONFIG.forestPrecipMin && temperature > 0.22) {
    return 'forest';
  }
  if (precipitation < 0.2 && temperature > 0.56 && rainShadow > 0.35) return 'desert';
  if (
    cell.elevation > HYDROLOGY_CONFIG.mountainElevMin - 0.04 &&
    precipitation < 0.34 &&
    temperature > 0.42
  ) {
    return 'volcanic';
  }
  if (relief < -0.008 && precipitation > 0.44) return 'valley';
  if (relief > 0.03 && cell.elevation > seaLevel + 0.08) return 'hills';
  return 'plains';
}

export function getSuitability(
  terrain: TTerrain,
  precipitation: number,
  temperature: number
): number {
  const baseSuitability = terrainBaseSuitability(terrain);
  if (baseSuitability !== null) return baseSuitability;

  const climateScore = 1 - Math.abs(temperature - 0.52) * 1.15;
  const moistureScore = 1 - Math.abs(precipitation - 0.52) * 0.95;

  return clamp(climateScore * 0.45 + moistureScore * 0.45 + 0.1, 0, 1);
}
