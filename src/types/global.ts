import type { Delaunay } from 'd3-delaunay';

export type TSiteMetadata = {
  title: string;
  description: string;
  url: string;
  siteName: string;
  twitterHandle: string;
  icon: string;
  image: string;
  keywords: string;
};

export type TTerrainBand =
  | 'deep-water'
  | 'shallow-water'
  | 'inland-sea'
  | 'coast'
  | 'lake'
  | 'plains'
  | 'plateau'
  | 'forest'
  | 'desert'
  | 'badlands'
  | 'swamp'
  | 'valley'
  | 'hills'
  | 'mountains'
  | 'volcanic'
  | 'tundra';

export type TTerrainPreset = 'balanced' | 'archipelago' | 'ranges' | 'rifted';
export type TZoneType = 'land' | 'internal-waters' | 'territorial-waters' | 'international-waters';

export type TMapDisplaySettings = {
  showTerrain: boolean;
  showRivers: boolean;
  showCountryBorders: boolean;
  showProvinceBorders: boolean;
  showEthnicRegions: boolean;
  showRegionNames: boolean;
};

export type TCustomCountryMode = 'dominant' | 'balanced';

export type TTerrainRatioKey =
  | 'plains'
  | 'forest'
  | 'swamp'
  | 'desert'
  | 'hills'
  | 'mountains'
  | 'plateau';

export type TTerrainRatioMap = Record<TTerrainRatioKey, number>;

export type TNation = {
  id: number;
  name: string;
  capitalCellId: number | null;
  capital_coords: TPoint | null;
  economicHubCellIds: number[];
  economic_hubs_coords: TPoint[];
};

export type TEthnicGroup = {
  id: number;
  name: string;
  coreCellId: number;
};

export type TTerrainPresetOption = {
  label: string;
  value: TTerrainPreset;
};

export interface TTopographyCellData {
  elevation: number;
  isWater: boolean;
  terrain: TTerrainBand;
}

export interface THydrologyCellData {
  flow: number;
  downstreamId: number | null;
  erosion: number;
  isRiver: boolean;
  isLake: boolean;
  biome: string;
  suitability: number;
  temperature: number;
  precipitation: number;
  rainShadow: number;
  population: number;
  nationId: number | null;
  zoneType: TZoneType;
}

export type TPoint = [number, number];

export interface TMapVertex {
  id: number;
  point: TPoint;
}

export interface TMapEdge {
  id: number;
  vertexIds: [number, number];
  cellIds: number[];
  isBoundary: boolean;
}

export interface TMapCell {
  id: number;
  site: TPoint;
  polygon: TPoint[];
  vertexIds: number[];
  edgeIds: number[];
  neighbors: number[];
  elevation: number;
  isWater: boolean;
  terrain: TTerrainBand;
  flow: number;
  downstreamId: number | null;
  erosion: number;
  isRiver: boolean;
  isLake: boolean;
  biome: string;
  suitability: number;
  temperature: number;
  precipitation: number;
  rainShadow: number;
  population: number;
  nationId: number | null;
  provinceId: number | null;
  ethnicGroupId: number | null;
  zoneType: TZoneType;
  isCapital: boolean;
  isEconomicHub: boolean;
}

export interface TMapMesh {
  width: number;
  height: number;
  cells: TMapCell[];
  edges: TMapEdge[];
  vertices: TMapVertex[];
  nations: TNation[];
  ethnicGroups: TEthnicGroup[];
}

export type TMapMeshWithDelaunay = TMapMesh & {
  delaunay: Delaunay<TPoint>;
};

export interface TMapExplorerState {
  seed: string;
  seedDraft: string;
  cellCount: number;
  seaLevel: number;
  seaLevelDraft: number;
  terrainPreset: TTerrainPreset;
  customCountryMode: TCustomCountryMode;
  customCountryCount: number;
  terrainRatios: TTerrainRatioMap;
  terrainRatiosDraft: TTerrainRatioMap;
  displaySettings: TMapDisplaySettings;
  hoverVisualizationEnabled: boolean;
  hoverIndex: number | null;
  hoverClientPoint: { x: number; y: number } | null;
}

export type TTerrainStatistic = {
  terrain: string;
  count: number;
  percent: number;
};

export type TEthnicStatistic = {
  ethnicId: number;
  name: string;
  count: number;
  percent: number;
  population: number;
  populationPercent: number;
};

export type TEthnicRegionRow = {
  id: number;
  name: string;
  coreCellId: number;
  landCells: number;
  nationCount: number;
  regionPopulation: number;
  nationPopulation: number;
  nationPopulationPercent: number;
  terrainStats: string;
};
