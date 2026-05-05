import { TERRAIN_CONFIG } from 'src/configs/constance';
import { TTerrain } from 'src/types/map.types';

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

export function provinceEffectiveSizeFactor(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].provinceEffectiveSizeFactor;
}

export function logisticsRisk(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].logisticsRisk;
}

export function terrainBaseSuitability(terrain: TTerrain) {
  return TERRAIN_CONFIG[terrain].baseSuitability;
}

export function isHighlandTerrain(terrain: TTerrain) {
  return terrain === 'mountains' || terrain === 'hills' || terrain === 'volcanic';
}

export function isHarshTerrain(terrain: TTerrain) {
  return terrain === 'mountains' || terrain === 'desert' || terrain === 'volcanic';
}
