import { TERRAIN_CONFIG } from 'src/configs/constance';
import { TCell, TTerrain } from 'src/types/map.types';

export function terrainLabel(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].label;
}

export function isHydrologyWaterTerrain(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].isHydrologyWater;
}

export function isMarineWaterTerrain(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].isMarineWater;
}

export function isRenderWaterTerrain(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].isRenderWater;
}

export function logisticsRisk(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].logisticsRisk;
}

export function terrainBaseSuitability(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].baseSuitability;
}

export function isWaterOrRiverCell(cell: Pick<TCell, 'isWater' | 'isRiver' | 'isLake'>) {
  return cell.isWater || cell.isRiver || cell.isLake;
}
