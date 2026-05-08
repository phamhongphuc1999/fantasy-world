import type { Delaunay } from 'd3-delaunay';

export type TPoint = [number, number];

export type TTerrainConfig = {
  label: string;
  color: string;
  icon: string;
  isWater?: boolean;
  isHydrologyWater: boolean;
  isMarineWater: boolean;
  isRenderWater: boolean;
  sizeFactor: number;
  logisticsCost: number;
  logisticsRisk: number;
  baseSuitability: number | null;
  clusterMin?: number;
  baseWeight: number;
  cityFactor: number;
  economyFactor: number;
  flatness: number;
  safetyScore: number;
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
  terrainPopMods: TNumRecordTerrain;
  terrainEcoMods: TNumRecordTerrain;
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
  terrain: TTerrain;
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
  biome: string;
  suitability: number;
  temperature: number;
  precipitation: number;
  rainShadow: number;
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
  terrain: boolean;
  terrainRelief: boolean;
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

export type TTerrainRatioKey =
  | 'plains'
  | 'forest'
  | 'swamp'
  | 'desert'
  | 'badlands'
  | 'volcanic'
  | 'hills'
  | 'mountains'
  | 'plateau';

export type TTerrainRatioMap = Record<TTerrainRatioKey, number>;

export interface TTerrainPresetOption {
  label: string;
  value: TTerrainPreset;
}

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

export interface THydrology {
  initDownstreamMs: number;
  flowAccumulationMs: number;
  erosionAdjustmentMs: number;
  climateAndTerrainMs: number;
  lakesMs: number;
  riversMs: number;
  terrainPostProcessMs: number;
  finalizeBiomeMs: number;
  totalMs: number;
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
