import { TERRAIN_CONFIG } from 'src/configs/mapConfig';
import { TTerrainBand } from 'src/types/map.types';

export function classifyTerrain(elevation: number, seaLevel: number): TTerrainBand {
  if (elevation < seaLevel - TERRAIN_CONFIG.deepWaterOffset) return 'deep-water';
  if (elevation < seaLevel) return 'shallow-water';
  if (elevation < seaLevel + TERRAIN_CONFIG.coastBand) return 'coast';
  if (elevation < TERRAIN_CONFIG.plainsMax) return 'plains';
  if (elevation < TERRAIN_CONFIG.hillsMax) return 'hills';
  if (elevation < TERRAIN_CONFIG.mountainsMax) return 'mountains';
  return 'tundra';
}
