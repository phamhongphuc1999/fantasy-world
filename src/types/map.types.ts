import type { Delaunay } from 'd3-delaunay';

export type TPoint = [number, number];

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

export type TNumRecordLandform = Record<TLandform, number>;
export type TNumRecordBiome = Record<TBiome, number>;

export type TLandform =
  | 'marine_deep'
  | 'marine_shallow'
  | 'coast'
  | 'lake'
  | 'plain'
  | 'valley'
  | 'hills'
  | 'mountain'
  | 'plateau'
  | 'volcanic_field';

export type TBiome =
  | 'unknown'
  | 'plain'
  | 'ice'
  | 'tundra'
  | 'boreal_forest'
  | 'temperate_forest'
  | 'tropical_forest'
  | 'grassland'
  | 'savanna'
  | 'steppe'
  | 'desert_hot'
  | 'desert_cold'
  | 'wetland'
  | 'montane_shrub'
  | 'freshwater'
  | 'marine';

export type TBorderType = 'country' | 'province';
export type TBorderConfig = {
  landformCost: TNumRecordLandform;
  biomeCost: TNumRecordBiome;
  penalty: { riverCross: number; lakeCross: number; ridgeCross: number; shorelineEdgeBias: number };
  fragmentation: {
    maxMountainOwnersPerCluster: number;
    largeMountainClusterMinCells: number;
    clusterSplitPenalty: number;
  };
  smoothness: { edgeNoiseWeight: number; jaggedPenalty: number };
};

export type TTopographyPreset = 'balanced' | 'archipelago' | 'ranges' | 'rifted';

export interface TTopographyCell {
  elevation: number;
  isWater: boolean;
}

export type TZoneType = 'land' | 'internal-waters' | 'territorial-waters' | 'international-waters';
export type TRiverEndType = 'sea' | 'offscreen' | 'lake' | 'inland-sink';
export type TRiverKind = 'river' | 'creek' | 'branch' | 'fork';

export type TRiver = {
  id: number;
  sourceCellId: number;
  mouthCellId: number;
  endType: TRiverEndType;
  parentRiverId: number | null;
  tributaryIds: number[];
  basinId: number;
  kind: TRiverKind;
  name: string;
  length: number;
  mouthWidth: number;
  peakFlow: number;
  cells: number[];
  polyline: Array<TPoint>;
  pointOffsets: number[];
  polygon: Array<TPoint>;
};

export interface TNation {
  id: number;
  name: string;
  populationMultiplier: number;
  economyMultiplier: number;
  capitalCellId: number | null;
  capitalCoords: TPoint | null;
  economicHubIds: number[];
  economicHubPoints: TPoint[];
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
  flow: number;
  effectiveFlow: number;
  riverWidth: number;
  downstreamId: number | null;
  erosion: number;
  isRiver: boolean;
  riverId: number | null;
  riverOrder: number;
  isRiverSource: boolean;
  isRiverMouth: boolean;
  isLake: boolean;
  landform: TLandform;
  biome: TBiome;
  suitability: number;
  temperature: number;
  precipitation: number;
  rainShadow: number;
  petProxy: number;
  aridityIndex: number;
  temperatureSeasonality: number;
  precipitationSeasonality: number;
  population: number;
  economy: number;
  waterAccessScore: number;
  nationId: number | null;
  provinceId: number | null;
  ethnicId: number | null;
  zoneType: TZoneType;
  isCapital: boolean;
  isEconomicHub: boolean;
}

export interface TMesh {
  width: number;
  height: number;
  cells: TCell[];
  edges: TEdge[];
  vertices: TVertex[];
  nations: TNation[];
  ethnics: TEthnic[];
  rivers: TRiver[];
}

export type TDelaunayMesh = TMesh & {
  delaunay: Delaunay<TPoint>;
};

export interface TDisplaySettings {
  landform: boolean;
  landformRelief: boolean;
  biome: boolean;
  biomeRelief: boolean;
  population: boolean;
  temperature: boolean;
  precipitation: boolean;
  rainShadow: boolean;
  economy: boolean;
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

export interface TTopographyPresetOption {
  label: string;
  value: TTopographyPreset;
}

export interface TGenerationConfig {
  width: number;
  height: number;
  seed: string;
  cellCount: number;
  seaLevel: number;
  topographyPreset: TTopographyPreset;
  nationCount: number;
  climateControl: {
    temperatureOffset: number;
    temperatureContrast: number;
    precipitationScale: number;
    precipitationOffset: number;
    humanImpact: number;
  };
}

export interface TGenerationStages {
  mesh: TDelaunayMesh;
  topography: TDelaunayMesh;
  hydrology: TDelaunayMesh;
  population: TDelaunayMesh;
  geopolitics: TDelaunayMesh;
}

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
  ethnicId: string;
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
