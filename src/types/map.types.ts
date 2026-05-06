import type { Delaunay } from 'd3-delaunay';

// Mesh & Geometry
export type TPoint = [number, number];

export type TTerrainConfig = {
  label: string;
  color: string;
  icon: string;
  isWater?: boolean;
  isHydrologyWater: boolean;
  isMarineWater: boolean;
  isRenderWater: boolean;
  provinceEffectiveSizeFactor: number;
  logisticsMoveCost: number;
  logisticsRisk: number;
  baseSuitability: number | null;
  clusterMin?: number;
  baseWeight: number;
  cityFactor: number;
  flatness: number;
};

export interface TVertex {
  id: number;
  point: TPoint;
}

export interface TEdge {
  id: number;
  vertexIds: TPoint;
  cellIds: number[];
  isBoundary: boolean;
}

// Topography & Terrain
export type TSoilTerrain =
  | 'coast'
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

export type TTerrain = TSoilTerrain | 'lake' | 'deep-water' | 'shallow-water' | 'inland-sea';

export type TNumRecordTerrain = Record<TTerrain, number>;

export type TBorderType = 'country' | 'province';
export type TBorderConfig = {
  cost: TNumRecordTerrain;
  penalty: { riverCross: number; lakeCross: number; ridgeCross: number; shorelineEdgeBias: number };
  fragmentation: {
    maxMountainOwnersPerCluster: number;
    largeMountainClusterMinCells: number;
    clusterSplitPenalty: number;
  };
  smoothness: { edgeNoiseWeight: number; jaggedPenalty: number };
};

export type TTerrainPreset = 'balanced' | 'archipelago' | 'ranges' | 'rifted';

export interface TTopographyCell {
  elevation: number;
  isWater: boolean;
  terrain: TTerrain;
}

// Hydrology & Climate
export type TZoneType = 'land' | 'internal-waters' | 'territorial-waters' | 'international-waters';

// Geopolitics: Nation / Ethnic / Province flags on cells
export interface TNation {
  id: number;
  name: string;
  populationMultiplier: number;
  economyMultiplier: number;
  terrainPopulationModifiers: TNumRecordTerrain;
  terrainEconomyModifiers: TNumRecordTerrain;
  capitalCellId: number | null;
  capital_coords: TPoint | null;
  economicHubCellIds: number[];
  economic_hubs_coords: TPoint[];
}

export interface TEthnic {
  id: number;
  name: string;
  coreCellId: number;
}

export interface TCell {
  id: number;
  site: TPoint;
  polygon: TPoint[];
  vertexIds: number[];
  edgeIds: number[];
  neighbors: number[];
  elevation: number;
  isWater: boolean;
  terrain: TTerrain;
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
  economy: number;
  waterAccessibility: number;
  nationId: number | null;
  provinceId: number | null;
  ethnicGroupId: number | null;
  zoneType: TZoneType;
  isCapital: boolean;
  isEconomicHub: boolean;
}

// Final Map / Mesh
export interface TMesh {
  width: number;
  height: number;
  cells: TCell[];
  edges: TEdge[];
  vertices: TVertex[];
  nations: TNation[];
  ethnicGroups: TEthnic[];
}

export type TDelaunayMesh = TMesh & {
  delaunay: Delaunay<TPoint>;
};

// Map Configuration & UI state
export interface TDisplaySettings {
  terrain: boolean;
  populationHeatmap: boolean;
  temperatureHeatmap: boolean;
  precipitationHeatmap: boolean;
  rainShadowHeatmap: boolean;
  economyHeatmap: boolean;
  rivers: boolean;
  countryBorders: boolean;
  countryFill: boolean;
  provinceBorders: boolean;
  ethnicBorders: boolean;
  ethnicFill: boolean;
  ethnicLabels: boolean;
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

// Generation Pipeline
export interface TGenerationConfig {
  width: number;
  height: number;
  seed: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  terrainRatios: TTerrainRatioMap;
  nationCount: number;
}

export interface TGenerationStages {
  mesh: TDelaunayMesh;
  topography: TDelaunayMesh;
  hydrology: TDelaunayMesh;
  population: TDelaunayMesh;
  geopolitics: TDelaunayMesh;
}

// Hydrology Profiling
export interface THydrology {
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

export type TLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export interface TExportSnapshot {
  schemaVersion: 1;
  exportedAt: string;
  config: TGenerationConfig;
  displaySettings: TDisplaySettings;
  mesh: TMesh;
}

export type TCellOwnerParams = {
  cells: TCell[];
  owner: Int32Array;
  provinceOwner: Int32Array;
};
