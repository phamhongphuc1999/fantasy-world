import { TERRAIN_THRESHOLDS } from 'src/configs/mapConfig';
import { TTerrainBand } from 'src/types/map.types';

export function classifyTerrain(elevation: number, seaLevel: number): TTerrainBand {
  if (elevation < seaLevel - TERRAIN_THRESHOLDS.deepWaterOffset) return 'deep-water';
  if (elevation < seaLevel) return 'shallow-water';
  if (elevation < seaLevel + TERRAIN_THRESHOLDS.coastBand) return 'coast';
  if (elevation < TERRAIN_THRESHOLDS.plainsMax) return 'plains';
  if (elevation < TERRAIN_THRESHOLDS.hillsMax) return 'hills';
  if (elevation < TERRAIN_THRESHOLDS.mountainsMax) return 'mountains';
  return 'tundra';
}
