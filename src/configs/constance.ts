import { TSiteMetadata, TTerrainBand, TTerrainPresetOption } from 'src/types/global';
import { ImageAsset } from './ImageAssets';

export const APP_NAME = 'Fantasy World';

export const siteMetadata: TSiteMetadata = {
  title: APP_NAME,
  description: '',
  url: 'https://fantasy.peter-present.xyz/',
  siteName: APP_NAME,
  twitterHandle: 'PhamHon08928762',
  icon: ImageAsset.icon,
  image: ImageAsset.thumbnail,
  keywords: '',
};

export const TERRAIN_PRESET_OPTIONS: TTerrainPresetOption[] = [
  { label: 'Balanced', value: 'balanced' },
  { label: 'Archipelago', value: 'archipelago' },
  { label: 'Ranges', value: 'ranges' },
  { label: 'Rifted', value: 'rifted' },
];

export const TERRAIN_COLORS: Record<TTerrainBand, string> = {
  'deep-water': '#0b2f6b',
  'shallow-water': '#1e5fa8',
  coast: '#d9c89b',
  lake: '#63b3ed',
  plains: '#6fbf4b',
  forest: '#1f6b2f',
  desert: '#d8bc6a',
  swamp: '#3c6d62',
  valley: '#8fd451',
  hills: '#8a9f48',
  mountains: '#5f5148',
  tundra: '#dfe7ef',
};
