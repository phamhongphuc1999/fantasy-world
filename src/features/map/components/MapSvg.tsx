'use client';

import type { MouseEvent } from 'react';
import { cn } from 'src/lib/utils';
import { TMapCell } from 'src/types/global';

interface TMapSvgProps {
  cells: TMapCell[];
  width: number;
  height: number;
  hoverIndex: number | null;
  selectedIndex: number | null;
  onPointerMove: (event: MouseEvent<SVGSVGElement>) => void;
  onPointerLeave: () => void;
  onCellSelect: (cellId: number) => void;
}

function polygonToPath(points: TMapCell['polygon']) {
  if (points.length === 0) {
    return '';
  }

  const [first, ...rest] = points;
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
}

export default function MapSvg({
  cells,
  width,
  height,
  hoverIndex,
  selectedIndex,
  onPointerMove,
  onPointerLeave,
  onCellSelect,
}: TMapSvgProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="Procedural map mesh preview"
      onMouseMove={onPointerMove}
      onMouseLeave={onPointerLeave}
    >
      <rect width={width} height={height} fill="#09131f" />

      {cells.map((cell) => {
        const isHovered = hoverIndex === cell.id;
        const isSelected = selectedIndex === cell.id;

        return (
          <path
            key={cell.id}
            d={polygonToPath(cell.polygon)}
            className={cn('cursor-pointer transition-colors', isHovered && 'opacity-100')}
            fill={isSelected ? '#f59e0b' : isHovered ? '#38bdf8' : '#13283f'}
            fillOpacity={isSelected ? 0.9 : isHovered ? 0.82 : 0.7}
            stroke={isSelected ? '#fef3c7' : isHovered ? '#e0f2fe' : '#274765'}
            strokeWidth={isSelected ? 2.25 : isHovered ? 1.5 : 1}
            onClick={() => onCellSelect(cell.id)}
          />
        );
      })}

      {cells.map((cell) => (
        <circle
          key={`site-${cell.id}`}
          cx={cell.site[0]}
          cy={cell.site[1]}
          r={selectedIndex === cell.id ? 3.5 : hoverIndex === cell.id ? 2.75 : 1.8}
          fill={selectedIndex === cell.id ? '#fff7ed' : '#dbeafe'}
          opacity={selectedIndex === cell.id || hoverIndex === cell.id ? 0.95 : 0.65}
          pointerEvents="none"
        />
      ))}
    </svg>
  );
}
