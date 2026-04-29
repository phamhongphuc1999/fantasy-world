'use client';

import { type MouseEvent, useEffect, useRef } from 'react';
import { getTerrainColor } from 'src/services';
import { TMapCell, TMapRenderMode } from 'src/types/global';

type TProps = {
  cells: TMapCell[];
  width: number;
  height: number;
  renderMode: TMapRenderMode;
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

function drawCurvedRiverSegment(context: CanvasRenderingContext2D, from: TMapCell, to: TMapCell) {
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

function getNationColor(nationId: number | null) {
  if (nationId === null) return '#64748b';
  const palette = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ];
  return palette[Math.abs(nationId) % palette.length];
}

function getProvinceTint(nationColor: string, provinceId: number | null) {
  if (provinceId === null) return nationColor;
  const base = hexToRgb(nationColor);
  const oscillation = Math.sin((provinceId + 1) * 1.73);
  const delta = Math.round(oscillation * 18);
  return rgbToHex(
    Math.max(0, Math.min(255, base.r + delta)),
    Math.max(0, Math.min(255, base.g + delta)),
    Math.max(0, Math.min(255, base.b + delta))
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function blendHex(base: string, overlay: string, alpha: number) {
  const baseRgb = hexToRgb(base);
  const overlayRgb = hexToRgb(overlay);
  return rgbToHex(
    Math.round(baseRgb.r * (1 - alpha) + overlayRgb.r * alpha),
    Math.round(baseRgb.g * (1 - alpha) + overlayRgb.g * alpha),
    Math.round(baseRgb.b * (1 - alpha) + overlayRgb.b * alpha)
  );
}

function getCellDisplayColor(cell: TMapCell, mode: TMapRenderMode) {
  const terrainColor = getTerrainColor(cell.terrain);
  const nationColor = getNationColor(cell.nationId);
  const provinceColor = getProvinceTint(nationColor, cell.provinceId);
  const isWater = isWaterCell(cell);

  if (mode === 'political-flat') {
    if (isWater) return terrainColor;
    return cell.nationId !== null ? provinceColor : terrainColor;
  }

  if (mode === 'political-tinted') {
    if (isWater) return terrainColor;
    return cell.nationId !== null ? blendHex(terrainColor, provinceColor, 0.3) : terrainColor;
  }

  return terrainColor;
}

function toPointKey(point: [number, number]) {
  return `${point[0].toFixed(3)}:${point[1].toFixed(3)}`;
}

function toEdgeKey(startPoint: [number, number], endPoint: [number, number]) {
  const startKey = toPointKey(startPoint);
  const endKey = toPointKey(endPoint);
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
}

function drawNationBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  const edgeOwner = new Map<
    string,
    { start: [number, number]; end: [number, number]; nationId: number | null; isLand: boolean }
  >();

  for (const cell of cells) {
    if (cell.polygon.length < 2) continue;

    for (let index = 0; index < cell.polygon.length; index += 1) {
      const start = cell.polygon[index];
      const end = cell.polygon[(index + 1) % cell.polygon.length];
      const edgeKey = toEdgeKey(start, end);
      const existing = edgeOwner.get(edgeKey);

      if (!existing) {
        edgeOwner.set(edgeKey, {
          start,
          end,
          nationId: cell.nationId,
          isLand: !cell.isWater,
        });
        continue;
      }

      const sharedOnLand = existing.isLand && !cell.isWater;
      const isNationBorder =
        sharedOnLand &&
        existing.nationId !== null &&
        cell.nationId !== null &&
        existing.nationId !== cell.nationId;
      if (!isNationBorder) continue;

      context.beginPath();
      context.moveTo(existing.start[0], existing.start[1]);
      context.lineTo(existing.end[0], existing.end[1]);
      context.strokeStyle = '#fef08a';
      context.lineWidth = 2.1;
      context.lineCap = 'round';
      context.globalAlpha = 0.95;
      context.shadowColor = '#fde047';
      context.shadowBlur = 3;
      context.stroke();
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    }
  }
}

function shouldDrawBorder(cellA: TMapCell, cellB: TMapCell) {
  const waterA = isWaterCell(cellA);
  const waterB = isWaterCell(cellB);

  if (waterA !== waterB) return true;

  const nationA = cellA.nationId;
  const nationB = cellB.nationId;
  if (nationA !== nationB && (nationA !== null || nationB !== null)) return true;

  const isEezA = cellA.zoneType === 'territorial-waters';
  const isEezB = cellB.zoneType === 'territorial-waters';
  const isIntlA = cellA.zoneType === 'international-waters';
  const isIntlB = cellB.zoneType === 'international-waters';
  if ((isEezA && isIntlB) || (isEezB && isIntlA)) return true;

  return false;
}

function drawGrayBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
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

      if (!shouldDrawBorder(existing.cell, cell)) continue;
      context.beginPath();
      context.moveTo(existing.start[0], existing.start[1]);
      context.lineTo(existing.end[0], existing.end[1]);
      context.strokeStyle = '#1f2937';
      context.lineWidth = 1;
      context.lineCap = 'round';
      context.globalAlpha = 0.98;
      context.stroke();
      context.globalAlpha = 1;
    }
  }
}

function drawProvinceBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
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

function isLandCell(cell: TMapCell) {
  return !isWaterCell(cell);
}

function drawUrbanHierarchy(context: CanvasRenderingContext2D, cells: TMapCell[]) {
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

export default function MapCanvas({
  cells,
  width,
  height,
  renderMode,
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

    const hasCellBorders = renderMode === 'cells';
    const isRiverMode = renderMode === 'rivers';
    const isPoliticalMode = renderMode === 'political-flat' || renderMode === 'political-tinted';
    const isNationMode = renderMode === 'nations';
    const strokeStyle = hasCellBorders ? '#16283c' : 'transparent';
    const strokeWidth = hasCellBorders ? 1 : 0;

    for (const cell of cells) {
      drawCellShape(
        context,
        cell,
        getCellDisplayColor(cell, renderMode),
        isRiverMode ? 0.55 : 0.95,
        strokeStyle,
        strokeWidth
      );
    }

    if (isRiverMode) {
      for (const cell of cells) {
        if (!cell.isRiver || cell.downstreamId === null) continue;

        const downstreamCell = cells[cell.downstreamId];
        if (!downstreamCell || downstreamCell.isWater) continue;
        drawCurvedRiverSegment(context, cell, downstreamCell);
        context.strokeStyle = '#38bdf8';
        context.lineWidth = Math.min(5, 1.3 + Math.log2(cell.flow + 1) * 0.55);
        context.lineCap = 'round';
        context.globalAlpha = 0.98;
        context.shadowColor = '#7dd3fc';
        context.shadowBlur = 6;
        context.stroke();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
      }
    }

    if (isNationMode) {
      drawNationBorders(context, cells);
    }

    if (isPoliticalMode) {
      for (const cell of cells) {
        if (!cell.isRiver || cell.downstreamId === null) continue;
        const downstreamCell = cells[cell.downstreamId];
        if (!downstreamCell) continue;
        drawCurvedRiverSegment(context, cell, downstreamCell);
        context.strokeStyle = '#38bdf8';
        context.lineWidth = Math.min(3.8, 1.2 + Math.log2(cell.flow + 1) * 0.45);
        context.lineCap = 'round';
        context.globalAlpha = 0.95;
        context.stroke();
        context.globalAlpha = 1;
      }
      drawProvinceBorders(context, cells);
      drawGrayBorders(context, cells);
      drawUrbanHierarchy(context, cells);
    }

    if (renderMode === 'cells' && cells.length <= T_SITE_MARKER_LIMIT) {
      for (const cell of cells) {
        drawSiteMarker(context, cell, 1.8, cell.isWater ? '#dbeafe' : '#fef3c7', 0.45);
      }
    }
  }, [cells, height, renderMode, width]);

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
