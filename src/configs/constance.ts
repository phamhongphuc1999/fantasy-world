import type { TSiteMetadata } from 'src/types/global';
import type { TTerrainBand, TTerrainPresetOption } from 'src/types/map.types';
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
  'inland-sea': '#2f7fbe',
  coast: '#d9c89b',
  lake: '#63b3ed',
  plains: '#63c64d',
  plateau: '#b39b69',
  forest: '#1f6b2f',
  desert: '#d8bc6a',
  badlands: '#a86f42',
  swamp: '#2f6e5f',
  valley: '#a6df5a',
  hills: '#9a7b45',
  mountains: '#5f5148',
  volcanic: '#3b2f2a',
  tundra: '#dfe7ef',
};
