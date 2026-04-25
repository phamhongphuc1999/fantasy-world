'use client';

import MapCanvas from 'src/features/map/components/MapCanvas';
import { TMapCell } from 'src/types/global';

type TProps = {
  cells: TMapCell[];
  width: number;
  height: number;
  hoverIndex: number | null;
  selectedIndex: number | null;
  onPointerMove: (x: number, y: number) => void;
  onPointerLeave: () => void;
  onCellSelect: (x: number, y: number) => void;
};

export default function MapSvg(props: TProps) {
  return <MapCanvas {...props} />;
}
