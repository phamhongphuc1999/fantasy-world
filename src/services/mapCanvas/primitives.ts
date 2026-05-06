import { type MouseEvent } from 'react';
import { TCell } from 'src/types/map.types';
import { drawPolygon } from './shared';

export function getCanvasPoint(
  event: MouseEvent<HTMLCanvasElement>,
  width: number,
  height: number
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;

  return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
}

export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixelRatio: number
) {
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext('2d');
  if (!context) return null;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return context;
}

export function drawCellShape(
  context: CanvasRenderingContext2D,
  cell: TCell,
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

export function drawSiteMarker(
  context: CanvasRenderingContext2D,
  cell: TCell,
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

export function drawCurvedRiverSegment(context: CanvasRenderingContext2D, from: TCell, to: TCell) {
  const dx = to.site[0] - from.site[0];
  const dy = to.site[1] - from.site[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) return;

  const nx = -dy / length;
  const ny = dx / length;
  const idHash = ((from.id * 73856093) ^ (to.id * 19349663)) >>> 0;
  const sign = (idHash & 1) === 0 ? 1 : -1;
  const bend = Math.min(14, Math.max(3, length * 0.22)) * sign;

  const cx = (from.site[0] + to.site[0]) * 0.5 + nx * bend;
  const cy = (from.site[1] + to.site[1]) * 0.5 + ny * bend;

  context.beginPath();
  context.moveTo(from.site[0], from.site[1]);
  context.quadraticCurveTo(cx, cy, to.site[0], to.site[1]);
}
