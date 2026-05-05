'use client';

import { RefObject, useEffect } from 'react';
import { drawCellShape, drawSiteMarker, setupCanvas } from 'src/services/map/mapCanvas.service';
import { TMapCell } from 'src/types/map.types';

type TProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cells: TMapCell[];
  width: number;
  height: number;
  hoverIndex: number | null;
};

export default function useMapOverlayRendering({
  canvasRef,
  cells,
  width,
  height,
  hoverIndex,
}: TProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

    context.clearRect(0, 0, width, height);
    const hoveredCell = hoverIndex !== null ? cells[hoverIndex] : null;
    if (!hoveredCell) return;

    drawCellShape(context, hoveredCell, '#38bdf8', 0.84, '#e0f2fe', 1.5);
    drawSiteMarker(context, hoveredCell, 2.75, hoveredCell.isWater ? '#dbeafe' : '#fef3c7', 0.95);
  }, [canvasRef, cells, height, hoverIndex, width]);
}
