'use client';

import { useEffect, useRef } from 'react';
import { getTerrainColor } from 'src/features/map/core/getTerrainColor';
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

function drawPolygon(context: CanvasRenderingContext2D, polygon: TMapCell['polygon']) {
  if (polygon.length === 0) {
    return;
  }

  context.beginPath();
  context.moveTo(polygon[0][0], polygon[0][1]);

  for (let pointIndex = 1; pointIndex < polygon.length; pointIndex += 1) {
    context.lineTo(polygon[pointIndex][0], polygon[pointIndex][1]);
  }

  context.closePath();
}

export default function MapCanvas({
  cells,
  width,
  height,
  hoverIndex,
  selectedIndex,
  onPointerMove,
  onPointerLeave,
  onCellSelect,
}: TProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#09131f';
    context.fillRect(0, 0, width, height);

    for (const cell of cells) {
      const isHovered = hoverIndex === cell.id;
      const isSelected = selectedIndex === cell.id;

      drawPolygon(context, cell.polygon);
      context.fillStyle = isSelected
        ? '#f59e0b'
        : isHovered
          ? '#38bdf8'
          : getTerrainColor(cell.terrain);
      context.globalAlpha = isSelected ? 0.9 : isHovered ? 0.84 : 0.92;
      context.fill();
      context.globalAlpha = 1;
      context.strokeStyle = isSelected ? '#fef3c7' : isHovered ? '#e0f2fe' : '#16283c';
      context.lineWidth = isSelected ? 2.25 : isHovered ? 1.5 : 1;
      context.stroke();
    }

    for (const cell of cells) {
      if (!cell.isRiver || cell.downstreamId === null) {
        continue;
      }

      const downstreamCell = cells[cell.downstreamId];
      context.beginPath();
      context.moveTo(cell.site[0], cell.site[1]);
      context.lineTo(downstreamCell.site[0], downstreamCell.site[1]);
      context.strokeStyle = '#7dd3fc';
      context.lineWidth = Math.min(4, 0.8 + Math.log2(cell.flow + 1) * 0.45);
      context.lineCap = 'round';
      context.globalAlpha = 0.88;
      context.stroke();
      context.globalAlpha = 1;
    }

    for (const cell of cells) {
      context.beginPath();
      context.arc(
        cell.site[0],
        cell.site[1],
        selectedIndex === cell.id ? 3.5 : hoverIndex === cell.id ? 2.75 : 1.8,
        0,
        Math.PI * 2
      );
      context.fillStyle =
        selectedIndex === cell.id ? '#fff7ed' : cell.isWater ? '#dbeafe' : '#fef3c7';
      context.globalAlpha = selectedIndex === cell.id || hoverIndex === cell.id ? 0.95 : 0.65;
      context.fill();
      context.globalAlpha = 1;
    }
  }, [cells, height, hoverIndex, selectedIndex, width]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="h-auto w-full cursor-pointer"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onPointerMove(event.clientX - rect.left, event.clientY - rect.top);
      }}
      onMouseLeave={onPointerLeave}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onCellSelect(event.clientX - rect.left, event.clientY - rect.top);
      }}
    />
  );
}
