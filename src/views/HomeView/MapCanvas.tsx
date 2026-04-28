'use client';

import { type MouseEvent, useEffect, useRef } from 'react';
import { getTerrainColor } from 'src/services';
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

const T_SITE_MARKER_LIMIT = 4000;

function drawPolygon(context: CanvasRenderingContext2D, polygon: TMapCell['polygon']) {
  if (polygon.length === 0) return;

  context.beginPath();
  context.moveTo(polygon[0][0], polygon[0][1]);

  for (let pointIndex = 1; pointIndex < polygon.length; pointIndex += 1) {
    context.lineTo(polygon[pointIndex][0], polygon[pointIndex][1]);
  }
  context.closePath();
}

function getCanvasPoint(event: MouseEvent<HTMLCanvasElement>, width: number, height: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;

  return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}

function setupCanvas(canvas: HTMLCanvasElement, width: number, height: number, pixelRatio: number) {
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return context;
}

function drawCellShape(
  context: CanvasRenderingContext2D,
  cell: TMapCell,
  fillStyle: string,
  fillOpacity: number,
  strokeStyle: string,
  strokeWidth: number
) {
  drawPolygon(context, cell.polygon);
  context.fillStyle = fillStyle;
  context.globalAlpha = fillOpacity;
  context.fill();
  context.globalAlpha = 1;
  context.strokeStyle = strokeStyle;
  context.lineWidth = strokeWidth;
  context.stroke();
}

function drawSiteMarker(
  context: CanvasRenderingContext2D,
  cell: TMapCell,
  radius: number,
  fillStyle: string,
  opacity: number
) {
  context.beginPath();
  context.arc(cell.site[0], cell.site[1], radius, 0, Math.PI * 2);
  context.fillStyle = fillStyle;
  context.globalAlpha = opacity;
  context.fill();
  context.globalAlpha = 1;
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
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#09131f';
    context.fillRect(0, 0, width, height);

    for (const cell of cells) {
      drawCellShape(context, cell, getTerrainColor(cell.terrain), 0.92, '#16283c', 1);
    }

    for (const cell of cells) {
      if (!cell.isRiver || cell.downstreamId === null) continue;

      const downstreamCell = cells[cell.downstreamId];
      if (!downstreamCell || downstreamCell.isWater) continue;
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

    if (cells.length <= T_SITE_MARKER_LIMIT) {
      for (const cell of cells) {
        drawSiteMarker(context, cell, 1.8, cell.isWater ? '#dbeafe' : '#fef3c7', 0.45);
      }
    }
  }, [cells, height, width]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

    context.clearRect(0, 0, width, height);

    const hoveredCell = hoverIndex !== null ? cells[hoverIndex] : null;
    const selectedCell = selectedIndex !== null ? cells[selectedIndex] : null;

    if (hoveredCell && hoveredCell.id !== selectedCell?.id) {
      drawCellShape(context, hoveredCell, '#38bdf8', 0.84, '#e0f2fe', 1.5);
      drawSiteMarker(context, hoveredCell, 2.75, hoveredCell.isWater ? '#dbeafe' : '#fef3c7', 0.95);
    }

    if (selectedCell) {
      drawCellShape(context, selectedCell, '#f59e0b', 0.9, '#fef3c7', 2.25);
      drawSiteMarker(context, selectedCell, 3.5, '#fff7ed', 0.95);
    }
  }, [cells, height, hoverIndex, selectedIndex, width]);

  return (
    <div className="relative">
      <canvas ref={baseCanvasRef} width={width} height={height} className="block h-auto w-full" />
      <canvas
        ref={overlayCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 h-full w-full cursor-pointer"
        onMouseMove={(event) => {
          const point = getCanvasPoint(event, width, height);
          onPointerMove(point.x, point.y);
        }}
        onMouseLeave={onPointerLeave}
        onClick={(event) => {
          const point = getCanvasPoint(event, width, height);
          onCellSelect(point.x, point.y);
        }}
      />
    </div>
  );
}
