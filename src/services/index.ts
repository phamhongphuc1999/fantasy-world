import { Metadata } from 'next';
import { APP_NAME, TERRAIN_COLORS } from 'src/configs/constance';
import { TTerrainBand } from 'src/types/map.types';

export function generateAppMetadata(title: string): Metadata {
  return { title: `${APP_NAME} | ${title}`, openGraph: { title: `${APP_NAME} | ${title}` } };
}

export function getTerrainColor(terrain: TTerrainBand) {
  return TERRAIN_COLORS[terrain];
}

export function toPercent(count: number, total: number) {
  return parseFloat(((count / Math.max(1, total)) * 100).toFixed(2));
}
