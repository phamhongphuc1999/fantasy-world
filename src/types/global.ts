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
export type TMapRenderMode =
  | 'cells'
  | 'seamless'
  | 'rivers'
  | 'nations'
  | 'political-flat'
  | 'political-tinted';
export type TZoneType = 'land' | 'internal-waters' | 'territorial-waters' | 'international-waters';

export type TNation = {
  id: number;
  name: string;
  capitalCellId: number | null;
  capital_coords: TPoint | null;
  economicHubCellIds: number[];
  economic_hubs_coords: TPoint[];
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
  nationId: number | null;
  provinceId: number | null;
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
  renderMode: TMapRenderMode;
  hoverIndex: number | null;
  selectedIndex: number | null;
}
