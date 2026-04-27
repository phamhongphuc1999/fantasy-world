import { TTerrainBand } from 'src/types/global';

export function classifyTerrain(elevation: number, seaLevel: number): TTerrainBand {
  if (elevation < seaLevel - 0.16) return 'deep-water';
  if (elevation < seaLevel) return 'shallow-water';
  if (elevation < seaLevel + 0.05) return 'coast';
  if (elevation < 0.58) return 'plains';
  if (elevation < 0.72) return 'highlands';
  if (elevation < 0.86) return 'mountains';
  return 'peaks';
}
