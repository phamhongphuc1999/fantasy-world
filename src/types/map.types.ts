import type { Delaunay } from 'd3-delaunay';

// Mesh & Geometry
export type TPoint = [number, number];

export interface TMapVertex {
  id: number;
  point: TPoint;
}

export interface TMapEdge {
  id: number;
  vertexIds: TPoint;
  cellIds: number[];
  isBoundary: boolean;
}

// Topography & Terrain
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

export interface TTopographyCellData {
  elevation: number;
  isWater: boolean;
  terrain: TTerrainBand;
}

// Hydrology & Climate
export type TZoneType = 'land' | 'internal-waters' | 'territorial-waters' | 'international-waters';

// Geopolitics: Nation / Ethnic / Province flags on cells
export interface TNation {
  id: number;
  name: string;
  capitalCellId: number | null;
  capital_coords: TPoint | null;
  economicHubCellIds: number[];
  economic_hubs_coords: TPoint[];
}

export interface TEthnicGroup {
  id: number;
  name: string;
  coreCellId: number;
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
  waterAccessibility: number;
  nationId: number | null;
  provinceId: number | null;
  ethnicGroupId: number | null;
  zoneType: TZoneType;
  isCapital: boolean;
  isEconomicHub: boolean;
}

// Final Map / Mesh
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

// Map Configuration & UI state
export interface TMapDisplaySettings {
  terrain: boolean;
  populationHeatmap: boolean;
  rivers: boolean;
  countryBorders: boolean;
  countryFill: boolean;
  provinceBorders: boolean;
  ethnicBorders: boolean;
  ethnicFill: boolean;
  labels: boolean;
  cellData: boolean;
}

export type TTerrainRatioKey =
  | 'plains'
  | 'forest'
  | 'swamp'
  | 'desert'
  | 'hills'
  | 'mountains'
  | 'plateau';

export type TTerrainRatioMap = Record<TTerrainRatioKey, number>;

export interface TTerrainPresetOption {
  label: string;
  value: TTerrainPreset;
}

export interface TMapExplorerState {
  seed: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  nationCount: number;
  terrainRatios: TTerrainRatioMap;
  displaySettings: TMapDisplaySettings;
  hoverIndex: number | null;
  hoverClientPoint: { x: number; y: number } | null;
}

// Statistics & Tables
export interface TTerrainStatistic {
  terrain: string;
  count: number;
  percent: number;
}

export interface TProvinceStatistic {
  provinceId: number;
  population: number;
  cellCount: number;
}

export interface TEthnicStatistic {
  ethnicId: number;
  name: string;
  count: number;
  percent: number;
  population: number;
  populationPercent: number;
}

// Generation Pipeline
export interface TMapGenerationConfig {
  width: number;
  height: number;
  seed: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  terrainRatios: TTerrainRatioMap;
  nationCount: number;
}

export interface TMapGenerationStages {
  mesh: TMapMeshWithDelaunay;
  topography: TMapMeshWithDelaunay;
  hydrology: TMapMeshWithDelaunay;
  population: TMapMeshWithDelaunay;
  geopolitics: TMapMeshWithDelaunay;
}

// Hydrology Profiling
export interface THydrologyProfile {
  initAndDownstreamMs: number;
  flowAccumulationMs: number;
  erosionAndAdjustMs: number;
  climateAndTerrainMs: number;
  lakesAndEnclosedWaterMs: number;
  riversMs: number;
  terrainPostProcessMs: number;
  finalizeBiomeMs: number;
  totalMs: number;
}

// Cell Inspection
export interface TCellDescription {
  terrainType: string;
  elevation: string;
  biome: string;
  flow: string;
  suitability: string;
  population: string;
  riverState: string;
  temperature: string;
  precipitation: string;
  rainShadow: string;
  nationId: string;
  provinceId: string;
  ethnicGroupId: string;
  zoneType: string;
}

// Geopolitics Borders
export type TBorderLevelKey = 'country' | 'province';

export type TLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
