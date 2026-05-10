import { TBiome, TLandform } from 'src/types/map.types';

export const LANDFORM_LABELS: Record<TLandform, string> = {
  marine_deep: 'Marine Deep',
  marine_shallow: 'Marine Shallow',
  coast: 'Coast',
  lake: 'Lake',
  plain: 'Plain',
  valley: 'Valley',
  hills: 'Hills',
  mountain: 'Mountain',
  plateau: 'Plateau',
  volcanic_field: 'Volcanic Field',
};

export const BIOME_LABELS: Record<TBiome, string> = {
  unknown: 'Unknown',
  plain: 'Settled Plain',
  ice: 'Ice',
  tundra: 'Tundra',
  boreal_forest: 'Boreal Forest',
  temperate_forest: 'Temperate Forest',
  tropical_forest: 'Tropical Forest',
  grassland: 'Grassland',
  savanna: 'Savanna',
  steppe: 'Steppe',
  desert_hot: 'Hot Desert',
  desert_cold: 'Cold Desert',
  wetland: 'Wetland',
  montane_shrub: 'Montane Shrub',
  freshwater: 'Freshwater',
  marine: 'Marine',
};

export const LANDFORM_COLORS: Record<TLandform, string> = {
  marine_deep: '#0a192f',
  marine_shallow: '#1a3a6d',
  coast: '#f2d492',
  lake: '#1e81b0',
  plain: '#72b76e',
  valley: '#2e8b57',
  hills: '#8d6e63',
  mountain: '#5d4037',
  plateau: '#c2936a',
  volcanic_field: '#3e2723',
};

export const BIOME_COLORS: Record<TBiome, string> = {
  unknown: '#64748b',
  plain: '#d9c7a1',
  ice: '#e2e8f0',
  tundra: '#cfd8dc',
  boreal_forest: '#2f5d3a',
  temperate_forest: '#3f8f4c',
  tropical_forest: '#1f7a3d',
  grassland: '#88b04b',
  savanna: '#c9a75c',
  steppe: '#b58b61',
  desert_hot: '#ffb300',
  desert_cold: '#d6c28a',
  wetland: '#4f9d69',
  montane_shrub: '#7b6d57',
  freshwater: '#3b9dd6',
  marine: '#1f4e8c',
};
