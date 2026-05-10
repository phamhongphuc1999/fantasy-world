import { TBiome, TLandform } from 'src/types/map.types';

type TConfig = { label: string; color: string };

export const LANDFORM_CONFIG: Record<TLandform, TConfig> = {
  marine_deep: { label: 'Marine Deep', color: '#0a192f' },
  marine_shallow: { label: 'Marine Shallow', color: '#1a3a6d' },
  coast: { label: 'Coast', color: '#f2d492' },
  lake: { label: 'Lake', color: '#1e81b0' },
  plain: { label: 'Plain', color: '#72b76e' },
  valley: { label: 'Valley', color: '#2e8b57' },
  hills: { label: 'Hills', color: '#8d6e63' },
  mountain: { label: 'Mountain', color: '#5d4037' },
  plateau: { label: 'Plateau', color: '#c2936a' },
  volcanic_field: { label: 'Volcanic Field', color: '#3e2723' },
};

export const BIOME_CONFIG: Record<TBiome, TConfig> = {
  unknown: { label: 'Unknown', color: '#64748b' },
  plain: { label: 'Settled Plain', color: '#d9c7a1' },
  ice: { label: 'Ice', color: '#e2e8f0' },
  tundra: { label: 'Tundra', color: '#cfd8dc' },
  boreal_forest: { label: 'Boreal Forest', color: '#2f5d3a' },
  temperate_forest: { label: 'Temperate Forest', color: '#3f8f4c' },
  tropical_forest: { label: 'Tropical Forest', color: '#1f7a3d' },
  grassland: { label: 'Grassland', color: '#88b04b' },
  savanna: { label: 'Savanna', color: '#c9a75c' },
  steppe: { label: 'Steppe', color: '#b58b61' },
  desert_hot: { label: 'Hot Desert', color: '#ffb300' },
  desert_cold: { label: 'Cold Desert', color: '#d6c28a' },
  wetland: { label: 'Wetland', color: '#4f9d69' },
  montane_shrub: { label: 'Montane Shrub', color: '#7b6d57' },
  freshwater: { label: 'Freshwater', color: '#3b9dd6' },
  marine: { label: 'Marine', color: '#1f4e8c' },
};
