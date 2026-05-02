import { MAP_TERRAIN_CLASSIFICATION_CONFIG } from 'src/configs/mapConfig';
import { TTerrainBand } from 'src/types/map.types';

export function classifyTerrain(elevation: number, seaLevel: number): TTerrainBand {
  if (elevation < seaLevel - MAP_TERRAIN_CLASSIFICATION_CONFIG.deepWaterOffset) {
    return 'deep-water';
  }
  if (elevation < seaLevel) return 'shallow-water';
  if (elevation < seaLevel + MAP_TERRAIN_CLASSIFICATION_CONFIG.coastBand) return 'coast';
  if (elevation < MAP_TERRAIN_CLASSIFICATION_CONFIG.plainsMax) return 'plains';
  if (elevation < MAP_TERRAIN_CLASSIFICATION_CONFIG.hillsMax) return 'hills';
  if (elevation < MAP_TERRAIN_CLASSIFICATION_CONFIG.mountainsMax) return 'mountains';
  return 'tundra';
}
