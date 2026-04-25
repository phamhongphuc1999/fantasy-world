import { TTerrainBand } from 'src/types/global';

const TERRAIN_COLORS: Record<TTerrainBand, string> = {
  'deep-water': '#0b1f33',
  'shallow-water': '#17567d',
  coast: '#d4c89d',
  plains: '#6f9959',
  highlands: '#6f7d4f',
  mountains: '#6e625a',
  peaks: '#e5e7eb',
};

export function getTerrainColor(terrain: TTerrainBand) {
  return TERRAIN_COLORS[terrain];
}
