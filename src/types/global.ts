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
  | 'forest'
  | 'desert'
  | 'swamp'
  | 'valley'
  | 'hills'
  | 'mountains'
  | 'tundra';

export type TTerrainPreset = 'balanced' | 'archipelago' | 'ranges' | 'rifted';

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
}

export interface TMapMesh {
  width: number;
  height: number;
  cells: TMapCell[];
  edges: TMapEdge[];
  vertices: TMapVertex[];
}

export type TMapMeshWithDelaunay = TMapMesh & {
  delaunay: Delaunay<TPoint>;
};

export interface TMapExplorerState {
  seed: string;
  seedDraft: string;
  cellCount: number;
  seaLevel: number;
  terrainPreset: TTerrainPreset;
  hoverIndex: number | null;
  selectedIndex: number | null;
}
