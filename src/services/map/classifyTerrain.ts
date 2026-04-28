import { TTerrainBand } from 'src/types/global';

export function classifyTerrain(elevation: number, seaLevel: number): TTerrainBand {
  if (elevation < seaLevel - 0.15) return 'deep-water';
  if (elevation < seaLevel) return 'shallow-water';
  if (elevation < seaLevel + 0.04) return 'coast';
  if (elevation < 0.62) return 'plains';
  if (elevation < 0.76) return 'hills';
  if (elevation < 0.9) return 'mountains';
  return 'tundra';
}
