import type { TSiteMetadata } from 'src/types/global';
import type { TTerrainPresetOption } from 'src/types/map.types';
import { ImageAsset } from './ImageAssets';

export const APP_NAME = 'Fantasy World';

export const siteMetadata: TSiteMetadata = {
  title: APP_NAME,
  description:
    'Procedural fantasy world map generator with deterministic seeds, terrain simulation, hydrology, nations, and ethnic regions.',
  url: 'https://fantasy.peter-present.xyz/',
  siteName: APP_NAME,
  twitterHandle: 'PhamHon08928762',
  icon: ImageAsset.icon,
  image: ImageAsset.thumbnail,
  keywords:
    'fantasy map generator, procedural world generation, seeded map generation, worldbuilding tool, terrain and river simulation, nation borders, ethnic regions',
};

export const TERRAIN_PRESET_OPTIONS: TTerrainPresetOption[] = [
  { label: 'Balanced', value: 'balanced' },
  { label: 'Archipelago', value: 'archipelago' },
  { label: 'Ranges', value: 'ranges' },
  { label: 'Rifted', value: 'rifted' },
];
