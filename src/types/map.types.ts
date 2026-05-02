import type { Delaunay } from 'd3-delaunay';

// Mesh & Geometry
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
  waterAccessibility: number;
  nationId: number | null;
  zoneType: TZoneType;
}

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

export type TNationMode = 'dominant' | 'balanced';

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
  showTerrain: boolean;
  showRivers: boolean;
  showCountryBorders: boolean;
  showProvinceBorders: boolean;
  showEthnicRegions: boolean;
  showRegionNames: boolean;
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
  seedDraft: string;
  cellCount: number;
  seaLevel: number;
  seaLevelDraft: number;
  terrainPreset: TTerrainPreset;
  nationMode: TNationMode;
  nationCount: number;
  terrainRatios: TTerrainRatioMap;
  terrainRatiosDraft: TTerrainRatioMap;
  displaySettings: TMapDisplaySettings;
  hoverVisualizationEnabled: boolean;
  hoverIndex: number | null;
  hoverClientPoint: { x: number; y: number } | null;
}

export interface TMapContextType {
  mesh: TMapMeshWithDelaunay;
  isGenerating: boolean;
  handlePointerMove: (x: number, y: number) => void;
  handleApplySeed: () => void;
  handleRandomizeSeed: () => void;
  handleCellCountChange: (nextValue: number) => void;
  handleSeaLevelDraftChange: (nextValue: number) => void;
}

// Statistics & Tables
export interface TTerrainStatistic {
  terrain: string;
  count: number;
  percent: number;
}

export interface TEthnicStatistic {
  ethnicId: number;
  name: string;
  count: number;
  percent: number;
  population: number;
  populationPercent: number;
}

export interface TEthnicRegionRow {
  id: number;
  name: string;
  coreCellId: number;
  landCells: number;
  nationCount: number;
  regionPopulation: number;
  nationPopulation: number;
  nationPopulationPercent: number;
  terrainStats: string;
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
  nationMode: TNationMode;
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
