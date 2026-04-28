import clsx, { ClassValue } from 'clsx';
import { Metadata } from 'next';
import { APP_NAME, TERRAIN_COLORS } from 'src/configs/constance';
import { TTerrainBand } from 'src/types/global';
import { twMerge } from 'tailwind-merge';

export function generateAppMetadata(title: string): Metadata {
  return { title: `${APP_NAME} | ${title}`, openGraph: { title: `${APP_NAME} | ${title}` } };
}

export function getTerrainColor(terrain: TTerrainBand) {
  return TERRAIN_COLORS[terrain];
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
