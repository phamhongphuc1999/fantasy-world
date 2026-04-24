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

export type TPoint = [number, number];

export interface TMapCell {
  id: number;
  site: TPoint;
  polygon: TPoint[];
  neighbors: number[];
}

export interface TMapMesh {
  width: number;
  height: number;
  cells: TMapCell[];
}
