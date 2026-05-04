/* eslint-disable quotes */
import { type MouseEvent } from 'react';
import { getNationColor, getTerrainColor } from 'src/services';
import { TEthnicGroup, TMapCell, TNation, TPoint } from 'src/types/map.types';

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

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function interpolateChannel(start: number, end: number, factor: number) {
  return Math.round(start + (end - start) * factor);
}

export function getPopulationHeatmapColor(
  population: number,
  minPopulation: number,
  maxPopulation: number
) {
  const light = { r: 224, g: 243, b: 255 }; // #e0f3ff
  const dark = { r: 8, g: 48, b: 107 }; // #08306b

  if (maxPopulation <= minPopulation) {
    return `rgb(${light.r}, ${light.g}, ${light.b})`;
  }

  const normalized = clamp01((population - minPopulation) / (maxPopulation - minPopulation));
  const r = interpolateChannel(light.r, dark.r, normalized);
  const g = interpolateChannel(light.g, dark.g, normalized);
  const b = interpolateChannel(light.b, dark.b, normalized);

  return `rgb(${r}, ${g}, ${b})`;
}

export function drawCountryFill(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  const fillOpacity = 0.86;
  for (const cell of cells) {
    if (!isLandCell(cell)) continue;
    const fillColor = getNationColor(cell.nationId);
    drawPolygon(context, cell.polygon);
    context.fillStyle = fillColor;
    context.globalAlpha = fillOpacity;
    context.fill();
    context.globalAlpha = 1;
  }
}

export function drawEthnicFill(
  context: CanvasRenderingContext2D,
  cells: TMapCell[],
  showTerrain: boolean
) {
  const fillOpacity = showTerrain ? 0.3 : 0.86;
  for (const cell of cells) {
    if (!isLandCell(cell)) continue;
    const fillColor = getNationColor(cell.ethnicGroupId);
    drawPolygon(context, cell.polygon);
    context.fillStyle = fillColor;
    context.globalAlpha = fillOpacity;
    context.fill();
    context.globalAlpha = 1;
  }
}

function toPointKey(point: TPoint) {
  return `${point[0].toFixed(3)}:${point[1].toFixed(3)}`;
}

function toEdgeKey(startPoint: TPoint, endPoint: TPoint) {
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
  start: TPoint,
  end: TPoint,
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

  const cp1: TPoint = [
    start[0] + dx * 0.33 + nx * cp1Amplitude,
    start[1] + dy * 0.33 + ny * cp1Amplitude,
  ];
  const cp2: TPoint = [
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

function shouldDrawEthnicLandBorder(cellA: TMapCell, cellB: TMapCell) {
  if (!isLandCell(cellA) || !isLandCell(cellB)) return false;
  if (cellA.ethnicGroupId === null || cellB.ethnicGroupId === null) return false;
  return cellA.ethnicGroupId !== cellB.ethnicGroupId;
}

export function drawGrayBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  const edgeOwner = new Map<string, { start: TPoint; end: TPoint; cell: TMapCell }>();

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

export function drawEthnicBorders(context: CanvasRenderingContext2D, cells: TMapCell[]) {
  const edgeOwner = new Map<string, { start: TPoint; end: TPoint; cell: TMapCell }>();

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

      if (!shouldDrawEthnicLandBorder(existing.cell, cell)) continue;
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
  const edgeOwner = new Map<string, { start: TPoint; end: TPoint; cell: TMapCell }>();

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
      const outerRadius = 4;
      const innerRadius = 1.6;
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

export function drawLogisticsRouteOverlay(
  context: CanvasRenderingContext2D,
  cells: TMapCell[],
  routeCellIds: number[],
  startCellId: number | null,
  goalCellId: number | null
) {
  if (routeCellIds.length > 1) {
    context.beginPath();
    const first = cells[routeCellIds[0]];
    context.moveTo(first.site[0], first.site[1]);
    for (let index = 1; index < routeCellIds.length; index += 1) {
      const prev = cells[routeCellIds[index - 1]];
      const curr = cells[routeCellIds[index]];
      const mx = (prev.site[0] + curr.site[0]) * 0.5;
      const my = (prev.site[1] + curr.site[1]) * 0.5;
      context.quadraticCurveTo(prev.site[0], prev.site[1], mx, my);
    }
    const last = cells[routeCellIds[routeCellIds.length - 1]];
    context.lineTo(last.site[0], last.site[1]);
    context.strokeStyle = '#f59e0b';
    context.lineWidth = 3;
    context.globalAlpha = 0.95;
    context.shadowColor = '#facc15';
    context.shadowBlur = 5;
    context.lineCap = 'round';
    context.stroke();
    context.shadowBlur = 0;
    context.globalAlpha = 1;
  }

  if (startCellId !== null && cells[startCellId]) {
    const startCell = cells[startCellId];
    context.beginPath();
    context.arc(startCell.site[0], startCell.site[1], 5.2, 0, Math.PI * 2);
    context.fillStyle = '#22c55e';
    context.globalAlpha = 0.95;
    context.fill();
    context.globalAlpha = 1;
  }

  if (goalCellId !== null && cells[goalCellId]) {
    const goalCell = cells[goalCellId];
    context.beginPath();
    context.arc(goalCell.site[0], goalCell.site[1], 5.2, 0, Math.PI * 2);
    context.fillStyle = '#ef4444';
    context.globalAlpha = 0.95;
    context.fill();
    context.globalAlpha = 1;
  }
}

type TLabelMode = 'nation' | 'ethnic';

export function drawRegionNames(
  context: CanvasRenderingContext2D,
  cells: TMapCell[],
  nations: TNation[],
  ethnicGroups: TEthnicGroup[],
  mode: TLabelMode
) {
  const regions = mode === 'nation' ? nations : ethnicGroups;
  const idKey = mode === 'nation' ? 'nationId' : 'ethnicGroupId';
  const positions = new Map<number, { x: number; y: number; count: number }>();

  for (const cell of cells) {
    if (!isLandCell(cell)) continue;
    const regionId = cell[idKey] as number | null;
    if (regionId === null || regionId < 0) continue;
    const current = positions.get(regionId);
    if (!current) {
      positions.set(regionId, { x: cell.site[0], y: cell.site[1], count: 1 });
      continue;
    }
    current.x += cell.site[0];
    current.y += cell.site[1];
    current.count += 1;
  }

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = "600 13px 'Trebuchet MS', 'Segoe UI', sans-serif";
  context.lineWidth = 3.2;
  context.strokeStyle = 'rgba(2, 6, 23, 0.82)';
  context.fillStyle = 'rgba(241, 245, 249, 0.95)';

  for (const region of regions) {
    const pos = positions.get(region.id);
    if (!pos || pos.count < 12) continue;
    const x = pos.x / pos.count;
    const y = pos.y / pos.count;
    const name = region.name;
    context.strokeText(name, x, y);
    context.fillText(name, x, y);
  }
}
