import { TPageMetadata, TTerrainBand, TTerrainPreset } from 'src/types/global';
import { ImageAsset } from './ImageAssets';

export const APP_NAME = 'Fantasy World';

export const siteMetadata: TPageMetadata = {
  title: APP_NAME,
  description: '',
  url: 'https://fantasy.peter-present.xyz/',
  siteName: APP_NAME,
  twitterHandle: 'PhamHon08928762',
  icon: ImageAsset.icon,
  image: ImageAsset.thumbnail,
  keywords: '',
};

export const TERRAIN_PRESET_OPTIONS: Array<{ label: string; value: TTerrainPreset }> = [
  { label: 'Balanced', value: 'balanced' },
  { label: 'Archipelago', value: 'archipelago' },
  { label: 'Ranges', value: 'ranges' },
  { label: 'Rifted', value: 'rifted' },
];

export const TERRAIN_COLORS: Record<TTerrainBand, string> = {
  'deep-water': '#0b1f33',
  'shallow-water': '#17567d',
  coast: '#d4c89d',
  plains: '#6f9959',
  highlands: '#6f7d4f',
  mountains: '#6e625a',
  peaks: '#e5e7eb',
};
