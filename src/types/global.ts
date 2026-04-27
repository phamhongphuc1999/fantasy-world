export type TPageMetadata = Partial<{
  title: string;
  description: string;
  url: string;
  siteName: string;
  twitterHandle: string;
  icon: string;
  image: string;
  keywords: string;
}>;

export type TTerrainBand =
  | 'deep-water'
  | 'shallow-water'
  | 'coast'
  | 'plains'
  | 'highlands'
  | 'mountains'
  | 'peaks';

export type TTerrainPreset = 'balanced' | 'archipelago' | 'ranges' | 'rifted';

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
}

export interface TMapMesh {
  width: number;
  height: number;
  cells: TMapCell[];
  edges: TMapEdge[];
  vertices: TMapVertex[];
}
