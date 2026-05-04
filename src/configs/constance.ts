import type { TSiteMetadata } from 'src/types/global';
import type { TTerrainBand, TTerrainConfig, TTerrainPresetOption } from 'src/types/map.types';
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

export const TERRAIN_CONFIG: Record<TTerrainBand, TTerrainConfig> = {
  'deep-water': {
    label: 'Ocean',
    color: '#0b2f6b',
    icon: '🌊',
    isWater: true,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  'shallow-water': {
    label: 'Sea',
    color: '#1e5fa8',
    icon: '🌊',
    isWater: true,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  'inland-sea': {
    label: 'Inland Sea',
    color: '#2f7fbe',
    icon: '🌊',
    isWater: true,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  lake: {
    label: 'Lake',
    color: '#63b3ed',
    icon: '🏞️',
    isWater: true,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  coast: {
    label: 'Coast',
    color: '#d9c89b',
    icon: '🏖️',
    baseWeight: 0.5,
    cityFactor: 0.92,
    flatness: 0.82,
  },
  plains: {
    label: 'Plains',
    color: '#63c64d',
    icon: '🌾',
    baseWeight: 1,
    cityFactor: 1,
    flatness: 1,
  },
  valley: {
    label: 'Valley',
    color: '#a6df5a',
    icon: '🌿',
    baseWeight: 0.7,
    cityFactor: 1,
    flatness: 0.9,
  },
  forest: {
    label: 'Forest',
    color: '#1f6b2f',
    icon: '🌲',
    baseWeight: 0.2,
    cityFactor: 0.7,
    flatness: 0.7,
  },
  swamp: {
    label: 'Swamp',
    color: '#2f6e5f',
    icon: '🐊',
    baseWeight: 0.3,
    cityFactor: 0.32,
    flatness: 0.5,
  },
  hills: {
    label: 'Hill',
    color: '#9a7b45',
    icon: '⛰️',
    baseWeight: 0.42,
    cityFactor: 0.45,
    flatness: 0.45,
  },
  plateau: {
    label: 'Plateau',
    color: '#b39b69',
    icon: '🪨',
    baseWeight: 0.38,
    cityFactor: 0.3,
    flatness: 0.64,
  },
  mountains: {
    label: 'Mountain',
    color: '#5f5148',
    icon: '🏔️',
    baseWeight: 0.1,
    cityFactor: 0.16,
    flatness: 0.2,
  },
  volcanic: {
    label: 'Volcanic',
    color: '#3b2f2a',
    icon: '🌋',
    baseWeight: 0.1,
    cityFactor: 0.16,
    flatness: 0.2,
  },
  desert: {
    label: 'Desert',
    color: '#d8bc6a',
    icon: '🏜️',
    baseWeight: 0.04,
    cityFactor: 0.14,
    flatness: 0.6,
  },
  badlands: {
    label: 'Badlands',
    color: '#a86f42',
    icon: '🪨',
    baseWeight: 0.04,
    cityFactor: 0.14,
    flatness: 0.35,
  },
  tundra: {
    label: 'Tundra',
    color: '#dfe7ef',
    icon: '❄️',
    baseWeight: 0.06,
    cityFactor: 0.2,
    flatness: 0.5,
  },
};
