import { MAP_HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TMapCell, TTerrainBand } from 'src/types/global';
import { clamp } from './common';

export function buildWaterInfluence(cells: TMapCell[]): Float32Array {
  let waterInfluence = new Float32Array(cells.length);
  let nextInfluence = new Float32Array(cells.length);

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    waterInfluence[cellIndex] = cells[cellIndex].isWater ? 1 : 0;
  }

  for (
    let iteration = 0;
    iteration < MAP_HYDROLOGY_CONFIG.waterInfluenceIterations;
    iteration += 1
  ) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      if (cell.neighbors.length === 0) {
        nextInfluence[cellIndex] = waterInfluence[cellIndex] as number;
        continue;
      }

      let total = waterInfluence[cellIndex] * MAP_HYDROLOGY_CONFIG.waterInfluenceSelfWeight;
      for (const neighborId of cell.neighbors) {
        total += waterInfluence[neighborId];
      }

      nextInfluence[cellIndex] =
        total / (cell.neighbors.length + MAP_HYDROLOGY_CONFIG.waterInfluenceSelfWeight);
    }
    const tmp = waterInfluence;
    waterInfluence = nextInfluence;
    nextInfluence = tmp;
  }

  return waterInfluence;
}

export function getRainShadow(cell: TMapCell, cells: TMapCell[]) {
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

export function getTerrainBand(
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

  if (
    cell.elevation > MAP_HYDROLOGY_CONFIG.plateauElevationMin &&
    relief < MAP_HYDROLOGY_CONFIG.plateauReliefMax &&
    precipitation > 0.22 &&
    precipitation < 0.58
  ) {
    return 'plateau';
  }

  if (cell.elevation > MAP_HYDROLOGY_CONFIG.mountainElevationMin) return 'mountains';
  if (cell.elevation > MAP_HYDROLOGY_CONFIG.hillElevationMin) return 'hills';
  if (inValley) return 'valley';

  if (
    temperature > MAP_HYDROLOGY_CONFIG.desertTemperatureMin &&
    precipitation < MAP_HYDROLOGY_CONFIG.desertPrecipitationMax &&
    rainShadow > MAP_HYDROLOGY_CONFIG.desertRainShadowMin
  ) {
    if (cell.elevation > seaLevel + 0.12 && relief > 0.012) return 'badlands';
    return 'desert';
  }

  if (
    precipitation > MAP_HYDROLOGY_CONFIG.swampPrecipitationMin &&
    cell.elevation < MAP_HYDROLOGY_CONFIG.swampElevationMax &&
    relief < MAP_HYDROLOGY_CONFIG.swampReliefMax
  ) {
    return 'swamp';
  }

  if (precipitation > MAP_HYDROLOGY_CONFIG.forestPrecipitationMin && temperature > 0.22) {
    return 'forest';
  }
  if (precipitation < 0.2 && temperature > 0.56 && rainShadow > 0.35) return 'desert';
  if (
    cell.elevation > MAP_HYDROLOGY_CONFIG.mountainElevationMin - 0.04 &&
    precipitation < 0.34 &&
    temperature > 0.42
  ) {
    return 'volcanic';
  }
  if (relief < -0.008 && precipitation > 0.44) return 'valley';
  if (relief > 0.03 && cell.elevation > seaLevel + 0.08) return 'hills';
  return 'plains';
}

export function getBiome(terrain: TTerrainBand): string {
  switch (terrain) {
    case 'deep-water':
      return 'Deep Ocean';
    case 'shallow-water':
      return 'Sea Shelf';
    case 'inland-sea':
      return 'Inland Sea';
    case 'lake':
      return 'Freshwater Lake';
    case 'coast':
      return 'Coastal Littoral';
    case 'plateau':
      return 'High Plateau';
    case 'desert':
      return 'Arid Desert';
    case 'badlands':
      return 'Rocky Badlands';
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
    case 'volcanic':
      return 'Volcanic Wastes';
    case 'tundra':
      return 'Tundra';
    default:
      return 'Grassland';
  }
}

export function getSuitability(
  terrain: TTerrainBand,
  precipitation: number,
  temperature: number
): number {
  if (terrain === 'deep-water' || terrain === 'shallow-water' || terrain === 'inland-sea') return 0;
  if (terrain === 'lake') return 0.12;
  if (terrain === 'mountains' || terrain === 'tundra') return 0.14;
  if (terrain === 'volcanic' || terrain === 'badlands') return 0.18;
  if (terrain === 'desert') return 0.22;
  if (terrain === 'swamp') return 0.34;

  const climateScore = 1 - Math.abs(temperature - 0.52) * 1.15;
  const moistureScore = 1 - Math.abs(precipitation - 0.52) * 0.95;

  return clamp(climateScore * 0.45 + moistureScore * 0.45 + 0.1, 0, 1);
}
