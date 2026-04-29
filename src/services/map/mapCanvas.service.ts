import { type MouseEvent } from 'react';
import { NATION_COLOR_PALETTE } from 'src/configs/mapConfig';
import { getTerrainColor } from 'src/services';
import { TMapCell } from 'src/types/global';

function drawPolygon(context: CanvasRenderingContext2D, polygon: TMapCell['polygon']) {
  if (polygon.length === 0) return;

  context.beginPath();
  context.moveTo(polygon[0][0], polygon[0][1]);

  for (let pointIndex = 1; pointIndex < polygon.length; pointIndex += 1) {
    context.lineTo(polygon[pointIndex][0], polygon[pointIndex][1]);
  }
  context.closePath();
}

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

export function drawSiteMarker(
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

export function drawCurvedRiverSegment(
  context: CanvasRenderingContext2D,
  from: TMapCell,
  to: TMapCell
) {
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

function isWaterCell(cell: TMapCell) {
  return (
    cell.isWater ||
    cell.terrain === 'deep-water' ||
    cell.terrain === 'shallow-water' ||
    cell.terrain === 'lake'
  );
}

export function getCellDisplayColor(cell: TMapCell) {
  const terrainColor = getTerrainColor(cell.terrain);
  return terrainColor;
}

function getNationPaletteColor(nationId: number | null) {
  if (nationId === null) return '#334155';
  const paletteIndex = Math.abs(nationId) % NATION_COLOR_PALETTE.length;
  return NATION_COLOR_PALETTE[paletteIndex];
}

export function drawCountryFill(
  context: CanvasRenderingContext2D,
  cells: TMapCell[],
  showTerrain: boolean
) {
  const fillOpacity = showTerrain ? 0 : 0.86;
  for (const cell of cells) {
    if (!isLandCell(cell)) continue;
    const fillColor = getNationPaletteColor(cell.nationId);
    drawPolygon(context, cell.polygon);
    context.fillStyle = fillColor;
    context.globalAlpha = fillOpacity;
    context.fill();
    context.globalAlpha = 1;
  }
}

function toPointKey(point: [number, number]) {
  return `${point[0].toFixed(3)}:${point[1].toFixed(3)}`;
}

function toEdgeKey(startPoint: [number, number], endPoint: [number, number]) {
  const startKey = toPointKey(startPoint);
  const endKey = toPointKey(endPoint);
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

function edgeNoiseValue(edgeKey: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < edgeKey.length; index += 1) {
    hash ^= edgeKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function drawNaturalBorderSegment(
  context: CanvasRenderingContext2D,
  start: [number, number],
  end: [number, number],
  edgeKey: string
) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) return;

  const nx = -dy / length;
  const ny = dx / length;
  const amplitudeBase = Math.min(8.5, Math.max(1.6, length * 0.2));
  const wobbleA = (edgeNoiseValue(edgeKey, 0x9e3779b9) - 0.5) * 2;
  const wobbleB = (edgeNoiseValue(edgeKey, 0x85ebca6b) - 0.5) * 2;
  const cp1Amplitude = amplitudeBase * wobbleA;
  const cp2Amplitude = amplitudeBase * wobbleB;

  const cp1: [number, number] = [
    start[0] + dx * 0.33 + nx * cp1Amplitude,
    start[1] + dy * 0.33 + ny * cp1Amplitude,
  ];
  const cp2: [number, number] = [
    start[0] + dx * 0.66 + nx * cp2Amplitude,
    start[1] + dy * 0.66 + ny * cp2Amplitude,
  ];

  context.beginPath();
  context.moveTo(start[0], start[1]);
  context.bezierCurveTo(cp1[0], cp1[1], cp2[0], cp2[1], end[0], end[1]);
}

function shouldDrawCountryLandBorder(cellA: TMapCell, cellB: TMapCell) {
  if (!isLandCell(cellA) || !isLandCell(cellB)) return false;
  if (cellA.nationId === null || cellB.nationId === null) return false;
  return cellA.nationId !== cellB.nationId;
}

export function drawGrayBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  const edgeOwner = new Map<
    string,
    { start: [number, number]; end: [number, number]; cell: TMapCell }
  >();

  for (const cell of cells) {
    if (cell.polygon.length < 2) continue;

    for (let index = 0; index < cell.polygon.length; index += 1) {
      const start = cell.polygon[index];
      const end = cell.polygon[(index + 1) % cell.polygon.length];
      const edgeKey = toEdgeKey(start, end);
      const existing = edgeOwner.get(edgeKey);

      if (!existing) {
        edgeOwner.set(edgeKey, { start, end, cell });
        continue;
      }

      if (!shouldDrawCountryLandBorder(existing.cell, cell)) continue;
      drawNaturalBorderSegment(context, existing.start, existing.end, edgeKey);
      context.strokeStyle = '#1f2937';
      context.lineWidth = 1;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.globalAlpha = 0.98;
      context.stroke();
      context.globalAlpha = 1;
    }
  }
}

export function drawProvinceBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  const edgeOwner = new Map<
    string,
    { start: [number, number]; end: [number, number]; cell: TMapCell }
  >();

  for (const cell of cells) {
    if (!isLandCell(cell)) continue;
    if (cell.polygon.length < 2) continue;

    for (let index = 0; index < cell.polygon.length; index += 1) {
      const start = cell.polygon[index];
      const end = cell.polygon[(index + 1) % cell.polygon.length];
      const edgeKey = toEdgeKey(start, end);
      const existing = edgeOwner.get(edgeKey);

      if (!existing) {
        edgeOwner.set(edgeKey, { start, end, cell });
        continue;
      }

      const sameNation =
        existing.cell.nationId !== null &&
        cell.nationId !== null &&
        existing.cell.nationId === cell.nationId;
      const differentProvince =
        existing.cell.provinceId !== null &&
        cell.provinceId !== null &&
        existing.cell.provinceId !== cell.provinceId;
      if (!(sameNation && differentProvince)) continue;

      context.beginPath();
      context.moveTo(existing.start[0], existing.start[1]);
      context.lineTo(existing.end[0], existing.end[1]);
      context.strokeStyle = '#1f2937';
      context.lineWidth = 0.5;
      context.setLineDash([3, 3]);
      context.globalAlpha = 1;
      context.shadowColor = '#030712';
      context.shadowBlur = 2.2;
      context.stroke();
      context.shadowBlur = 0;
      context.setLineDash([]);
      context.globalAlpha = 1;
    }
  }
}

export function isLandCell(cell: TMapCell) {
  return !isWaterCell(cell);
}

export function drawUrbanHierarchy(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  for (const cell of cells) {
    if (!cell.isEconomicHub && !cell.isCapital) continue;

    if (cell.isEconomicHub) {
      context.beginPath();
      context.arc(cell.site[0], cell.site[1], 3.1, 0, Math.PI * 2);
      context.fillStyle = '#111827';
      context.globalAlpha = 0.92;
      context.fill();
      context.globalAlpha = 1;
    }

    if (cell.isCapital) {
      const [x, y] = cell.site;
      const spikes = 5;
      const outerRadius = 7;
      const innerRadius = 3.2;
      let rotation = (Math.PI / 2) * 3;

      context.beginPath();
      context.moveTo(x, y - outerRadius);
      for (let index = 0; index < spikes; index += 1) {
        context.lineTo(x + Math.cos(rotation) * outerRadius, y + Math.sin(rotation) * outerRadius);
        rotation += Math.PI / spikes;
        context.lineTo(x + Math.cos(rotation) * innerRadius, y + Math.sin(rotation) * innerRadius);
        rotation += Math.PI / spikes;
      }
      context.closePath();
      context.fillStyle = '#fde047';
      context.strokeStyle = '#713f12';
      context.lineWidth = 1.2;
      context.globalAlpha = 0.97;
      context.fill();
      context.stroke();
      context.globalAlpha = 1;
    }
  }
}
