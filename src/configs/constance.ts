import type { TSiteMetadata } from 'src/types/global';
import type { TTerrain, TTerrainConfig, TTerrainPresetOption } from 'src/types/map.types';
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

export const TERRAIN_CONFIG: Record<TTerrain, TTerrainConfig> = {
  'deep-water': {
    label: 'Ocean',
    color: '#0a192f', // Navy rất đậm, tạo độ sâu tuyệt đối
    icon: '🌊',
    isWater: true,
    isHydrologyWater: true,
    isMarineWater: true,
    isRenderWater: true,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1.5,
    logisticsRisk: 0,
    baseSuitability: 0,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  'shallow-water': {
    label: 'Sea',
    color: '#1a3a6d', // Xanh biển đậm vừa phải
    icon: '🌊',
    isWater: true,
    isHydrologyWater: true,
    isMarineWater: true,
    isRenderWater: true,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1.5,
    logisticsRisk: 0,
    baseSuitability: 0,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  'inland-sea': {
    label: 'Inland Sea',
    color: '#255497', // Xanh rõ rệt, không bị đục
    icon: '🌊',
    isWater: true,
    isHydrologyWater: true,
    isMarineWater: true,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1.5,
    logisticsRisk: 0,
    baseSuitability: 0,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  lake: {
    label: 'Lake',
    color: '#1e81b0', // Màu hồ sâu, tương phản với đất liền
    icon: '🏞️',
    isWater: true,
    isHydrologyWater: true,
    isMarineWater: false,
    isRenderWater: true,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1.5,
    logisticsRisk: 0,
    baseSuitability: 0.12,
    baseWeight: 0,
    cityFactor: 0,
    flatness: 0,
  },
  coast: {
    label: 'Coast',
    color: '#f2d492', // Màu cát vàng rõ rệt
    icon: '🏖️',
    isHydrologyWater: true,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1.35,
    logisticsRisk: 0,
    baseSuitability: null,
    baseWeight: 0.5,
    cityFactor: 0.92,
    flatness: 0.82,
  },
  plains: {
    label: 'Plains',
    color: '#5eba7d', // Xanh lá tươi, sắc nét
    icon: '🌾',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1,
    logisticsRisk: 0,
    baseSuitability: null,
    baseWeight: 1,
    cityFactor: 1,
    flatness: 1,
  },
  valley: {
    label: 'Valley',
    color: '#8bc34a', // Xanh lá mạ sáng
    icon: '🌿',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1,
    logisticsRisk: 0,
    baseSuitability: null,
    clusterMin: 5,
    baseWeight: 0.7,
    cityFactor: 1,
    flatness: 0.9,
  },
  forest: {
    label: 'Forest',
    color: '#2d6a4f', // Xanh rừng rậm đậm đặc
    icon: '🌲',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1.2,
    logisticsMoveCost: 1.65,
    logisticsRisk: 0.7,
    baseSuitability: null,
    clusterMin: 10,
    baseWeight: 0.2,
    cityFactor: 0.7,
    flatness: 0.7,
  },
  swamp: {
    label: 'Swamp',
    color: '#4a7c59', // Xanh đục của đầm lầy nhưng vẫn rõ nét
    icon: '🐊',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1.5,
    logisticsMoveCost: 2.8,
    logisticsRisk: 1.2,
    baseSuitability: 0.34,
    clusterMin: 6,
    baseWeight: 0.3,
    cityFactor: 0.32,
    flatness: 0.5,
  },
  hills: {
    label: 'Hill',
    color: '#a47148', // Nâu đất đỏ
    icon: '⛰️',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1.2,
    logisticsMoveCost: 2.15,
    logisticsRisk: 0,
    baseSuitability: null,
    clusterMin: 7,
    baseWeight: 0.42,
    cityFactor: 0.45,
    flatness: 0.45,
  },
  plateau: {
    label: 'Plateau',
    color: '#c2936a', // Nâu vàng nhạt hơn hills
    icon: '🪨',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 1.35,
    logisticsRisk: 0,
    baseSuitability: null,
    clusterMin: 7,
    baseWeight: 0.38,
    cityFactor: 0.3,
    flatness: 0.64,
  },
  mountains: {
    label: 'Mountain',
    color: '#5d4037', // Nâu đen của đá núi
    icon: '🏔️',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1.5,
    logisticsMoveCost: 4.2,
    logisticsRisk: 1.4,
    baseSuitability: 0.14,
    clusterMin: 8,
    baseWeight: 0.1,
    cityFactor: 0.16,
    flatness: 0.2,
  },
  volcanic: {
    label: 'Volcanic',
    color: '#3e2723', // Đen đỏ của dung nham nguội
    icon: '🌋',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1.5,
    logisticsMoveCost: 4.8,
    logisticsRisk: 1.4,
    baseSuitability: 0.18,
    clusterMin: 4,
    baseWeight: 0.1,
    cityFactor: 0.16,
    flatness: 0.2,
  },
  desert: {
    label: 'Desert',
    color: '#ffb300', // Vàng cam rực rỡ
    icon: '🏜️',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 2.3,
    logisticsRisk: 0,
    baseSuitability: 0.22,
    clusterMin: 6,
    baseWeight: 0.04,
    cityFactor: 0.14,
    flatness: 0.6,
  },
  badlands: {
    label: 'Badlands',
    color: '#d84315', // Cam đất cháy
    icon: '🪨',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 2.3,
    logisticsRisk: 0,
    baseSuitability: 0.18,
    clusterMin: 5,
    baseWeight: 0.04,
    cityFactor: 0.14,
    flatness: 0.35,
  },
  tundra: {
    label: 'Tundra',
    color: '#eceff1', // Trắng xám xanh, rất nổi trên nền lục địa
    icon: '❄️',
    isHydrologyWater: false,
    isMarineWater: false,
    isRenderWater: false,
    provinceEffectiveSizeFactor: 1,
    logisticsMoveCost: 2.6,
    logisticsRisk: 0.7,
    baseSuitability: 0.14,
    baseWeight: 0.06,
    cityFactor: 0.2,
    flatness: 0.5,
  },
};

function validateTerrainConfigShape() {
  for (const [terrain, config] of Object.entries(TERRAIN_CONFIG)) {
    if (typeof config.baseWeight !== 'number')
      throw new Error(`Invalid terrain baseWeight: ${terrain}`);
    if (typeof config.cityFactor !== 'number')
      throw new Error(`Invalid terrain cityFactor: ${terrain}`);
    if (typeof config.flatness !== 'number')
      throw new Error(`Invalid terrain flatness: ${terrain}`);
    if (typeof config.logisticsMoveCost !== 'number')
      throw new Error(`Invalid terrain logisticsMoveCost: ${terrain}`);
    if (typeof config.logisticsRisk !== 'number')
      throw new Error(`Invalid terrain logisticsRisk: ${terrain}`);
    if (typeof config.provinceEffectiveSizeFactor !== 'number')
      throw new Error(`Invalid terrain provinceEffectiveSizeFactor: ${terrain}`);
    if (typeof config.isHydrologyWater !== 'boolean')
      throw new Error(`Invalid terrain isHydrologyWater: ${terrain}`);
    if (typeof config.isMarineWater !== 'boolean')
      throw new Error(`Invalid terrain isMarineWater: ${terrain}`);
    if (typeof config.isRenderWater !== 'boolean')
      throw new Error(`Invalid terrain isRenderWater: ${terrain}`);
  }
}

if (process.env.NODE_ENV !== 'production') {
  validateTerrainConfigShape();
}
