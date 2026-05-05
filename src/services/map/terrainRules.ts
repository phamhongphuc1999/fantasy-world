import { TERRAIN_CONFIG } from 'src/configs/constance';
import { TTerrainBand } from 'src/types/map.types';

export function terrainLabel(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].label;
}

export function isHydrologyWaterTerrain(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].isHydrologyWater;
}

export function isMarineWaterTerrain(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].isMarineWater;
}

export function isRenderWaterTerrain(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].isRenderWater;
}

export function provinceEffectiveSizeFactor(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].provinceEffectiveSizeFactor;
}

export function logisticsMoveCost(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].logisticsMoveCost;
}

export function logisticsRisk(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].logisticsRisk;
}

export function terrainBaseSuitability(terrain: TTerrainBand) {
  return TERRAIN_CONFIG[terrain].baseSuitability;
}
