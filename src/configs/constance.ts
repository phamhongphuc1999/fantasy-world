import type { TSiteMetadata, TTopographyOption } from 'src/global';
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
    'fantasy map generator, procedural world generation, seeded map generation, world building tool, terrain and river simulation, nation borders, ethnic regions',
};

export const TOPOGRAPHY_OPTIONS: TTopographyOption[] = [
  { label: 'Balanced', value: 'balanced' },
  { label: 'Archipelago', value: 'archipelago' },
  { label: 'Ranges', value: 'ranges' },
  { label: 'Rifted', value: 'rifted' },
  { label: 'Volcanic', value: 'volcanic' },
  { label: 'Continental', value: 'continental' },
];
