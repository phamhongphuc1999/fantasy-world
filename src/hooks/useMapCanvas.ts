/* eslint-disable quotes */
'use client';

import { RefObject, useEffect, useMemo } from 'react';
import { BIOME_CONFIG, LANDFORM_CONFIG } from 'src/configs/map/landform-biome';
import { useMapContext } from 'src/contexts/map.context';
import {
  createLayerPlan,
  renderBackground,
  renderLandCells,
  renderRivers,
  renderWaterCells,
} from 'src/services/rendering/canvas';
import {
  drawCountryFill,
  drawEthnicBorders,
  drawEthnicFill,
  drawGrayBorders,
  drawProvinceBorders,
  isLandCell,
} from 'src/services/rendering/canvas/borders';
import {
  getEconomyColor,
  getPopulationColor,
  getPrecipitationColor,
  getRainShadowColor,
  getTemperatureColor,
} from 'src/services/rendering/canvas/heatmap';
import {
  DEFAULT_ELEV_SCALE,
  findSharedEdge,
  getIsoBoundingBox,
  sortByDepth,
} from 'src/services/rendering/canvas/isometric';
import {
  drawLogisticsRoute,
  drawRegionNames,
  drawUrbanHierarchy,
} from 'src/services/rendering/canvas/overlays';
import { drawSiteMarker, setupCanvas } from 'src/services/rendering/canvas/primitives';
import { drawPolygon } from 'src/services/rendering/canvas/shared';
import { applyShadedRelief } from 'src/services/rendering/canvas/relief';
import { useLogisticsGameStore } from 'src/store/logisticsGameStore';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TCellStats, TEthnic, TNation } from 'src/types/map.types';

const DEFAULT_CELL_STATS: TCellStats = {
  minPopulation: Number.POSITIVE_INFINITY,
  maxPopulation: Number.NEGATIVE_INFINITY,
  minTemperature: Number.POSITIVE_INFINITY,
  maxTemperature: Number.NEGATIVE_INFINITY,
  minEconomy: Number.POSITIVE_INFINITY,
  maxEconomy: Number.NEGATIVE_INFINITY,
};

type TProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
};

function isoProjectCellPolygon(
  polygon: [number, number][],
  elevation: number,
  offsetX: number,
  offsetY: number,
  elevScale: number
): [number, number][] {
  return polygon.map(([px, py]) => [offsetX + px, offsetY + py - elevation * elevScale]);
}

function isoProjectPoint(
  px: number,
  py: number,
  elevation: number,
  offsetX: number,
  offsetY: number,
  elevScale: number
): [number, number] {
  return [offsetX + px, offsetY + py - elevation * elevScale];
}

export default function useMapCanvas(params: TProps) {
  const { canvasRef } = params;
  const { displaySettings } = useMapExplorerStore();
  const {
    enabled: logisticsEnabled,
    startCellId,
    goalCellId,
    routeCellIds,
  } = useLogisticsGameStore();
  const { mesh } = useMapContext();
  const { cells, width, height, nations, ethnics } = mesh;
  const isIso = displaySettings.isometric;
  const isThree = displaySettings.threeDim;
  const elevScale = DEFAULT_ELEV_SCALE;

  const waterCells = useMemo(() => cells.filter((cell) => !isLandCell(cell)), [cells]);
  const landCells = useMemo(() => cells.filter((cell) => isLandCell(cell)), [cells]);

  const layerPlan = useMemo(
    () => createLayerPlan(displaySettings, cells.length),
    [cells.length, displaySettings]
  );

  const isoBbox = useMemo(
    () => (isIso ? getIsoBoundingBox(cells, elevScale) : null),
    [cells, elevScale, isIso]
  );
  const isoCanvasWidth = isoBbox ? Math.ceil(isoBbox.width) : width;
  const isoCanvasHeight = isoBbox ? Math.ceil(isoBbox.height) : height;
  const isoOffsetX = isoBbox ? -isoBbox.minX : 0;
  const isoOffsetY = isoBbox ? -isoBbox.minY : 0;

  const sortedLandCells = useMemo(
    () => (isIso ? sortByDepth(landCells) : landCells),
    [landCells, isIso]
  );
  const sortedWaterCells = useMemo(
    () => (isIso ? sortByDepth(waterCells) : waterCells),
    [waterCells, isIso]
  );

  const mapCellStats = useMemo<TCellStats>(() => {
    const shouldMeasurePopulation = displaySettings.population;
    const shouldMeasureTemperature = displaySettings.temperature;
    const shouldMeasureEconomy = displaySettings.economy;
    if (!shouldMeasurePopulation && !shouldMeasureTemperature && !shouldMeasureEconomy) {
      return DEFAULT_CELL_STATS;
    }
    const stats = { ...DEFAULT_CELL_STATS };
    for (const cell of landCells) {
      if (shouldMeasurePopulation) {
        if (cell.population < stats.minPopulation) stats.minPopulation = cell.population;
        if (cell.population > stats.maxPopulation) stats.maxPopulation = cell.population;
      }
      if (shouldMeasureTemperature) {
        if (cell.temperature < stats.minTemperature) stats.minTemperature = cell.temperature;
        if (cell.temperature > stats.maxTemperature) stats.maxTemperature = cell.temperature;
      }
      if (shouldMeasureEconomy) {
        if (cell.economy < stats.minEconomy) stats.minEconomy = cell.economy;
        if (cell.economy > stats.maxEconomy) stats.maxEconomy = cell.economy;
      }
    }
    return stats;
  }, [displaySettings.economy, displaySettings.population, displaySettings.temperature, landCells]);

  useEffect(() => {
    if (isThree) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, width, height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const canvasW = isIso ? isoCanvasWidth : width;
    const canvasH = isIso ? isoCanvasHeight : height;
    const context = setupCanvas(canvas, canvasW, canvasH, pixelRatio);
    if (!context) return;

    if (isIso) {
      const ox = isoOffsetX;
      const oy = isoOffsetY;
      const es = elevScale;
      const getPoly = (poly: [number, number][], elev: number) =>
        isoProjectCellPolygon(poly, elev, ox, oy, es);
      const getPt = (px: number, py: number, elev: number) =>
        isoProjectPoint(px, py, elev, ox, oy, es);

      context.fillStyle = '#09131f';
      context.fillRect(0, 0, canvasW, canvasH);

      for (const cell of sortedWaterCells) {
        const isoPoly = getPoly(cell.polygon, cell.elevation);
        drawPolygon(context, isoPoly);
        context.fillStyle = LANDFORM_CONFIG[cell.landform].color;
        context.fill();
      }

      for (const cell of sortedLandCells) {
        const isoPoly = getPoly(cell.polygon, cell.elevation);

        let fillColor = '#3f3f46';
        if (displaySettings.landform) fillColor = LANDFORM_CONFIG[cell.landform].color;
        else if (displaySettings.biome) fillColor = BIOME_CONFIG[cell.biome].color;
        else if (displaySettings.population) {
          fillColor = getPopulationColor(
            cell.population,
            mapCellStats.minPopulation,
            mapCellStats.maxPopulation
          );
        } else if (displaySettings.temperature) {
          fillColor = getTemperatureColor(
            cell.temperature,
            mapCellStats.minTemperature,
            mapCellStats.maxTemperature
          );
        } else if (displaySettings.precipitation)
          fillColor = getPrecipitationColor(cell.precipitation);
        else if (displaySettings.rainShadow) fillColor = getRainShadowColor(cell.rainShadow);
        else if (displaySettings.economy) {
          fillColor = getEconomyColor(
            cell.economy,
            mapCellStats.minEconomy,
            mapCellStats.maxEconomy
          );
        }

        for (const nbId of cell.neighbors) {
          const nb = cells[nbId];
          if (!nb || nb.isWater) continue;
          if (cell.elevation <= nb.elevation) continue;
          const sharedEdge = findSharedEdge(cell.polygon, nb.polygon);
          if (!sharedEdge) continue;
          const [a, b] = sharedEdge;
          const aTop = getPt(a[0], a[1], cell.elevation);
          const bTop = getPt(b[0], b[1], cell.elevation);
          const aBot = getPt(a[0], a[1], nb.elevation);
          const bBot = getPt(b[0], b[1], nb.elevation);
          context.beginPath();
          context.moveTo(aTop[0], aTop[1]);
          context.lineTo(bTop[0], bTop[1]);
          context.lineTo(bBot[0], bBot[1]);
          context.lineTo(aBot[0], aBot[1]);
          context.closePath();
          const darken = 0.2 + (cell.elevation - nb.elevation) * 0.2;
          context.fillStyle = `rgba(0, 0, 0, ${Math.min(darken, 0.5)})`;
          context.fill();
        }

        drawPolygon(context, isoPoly);
        context.fillStyle = fillColor;
        context.fill();
      }

      if (displaySettings.nationFill || displaySettings.ethnicFill) {
        const NATION_COLORS = [
          '#e6194b',
          '#3cb44b',
          '#ffe119',
          '#4363d8',
          '#f58231',
          '#911eb4',
          '#46f0f0',
          '#f032e6',
          '#bcf60c',
          '#ff8c00',
        ];
        for (const cell of sortedLandCells) {
          const isoPoly = getPoly(cell.polygon, cell.elevation);
          drawPolygon(context, isoPoly);
          if (displaySettings.nationFill) {
            context.fillStyle = NATION_COLORS[Math.abs(cell.nationId ?? 0) % NATION_COLORS.length];
          } else if (displaySettings.ethnicFill) {
            context.fillStyle = NATION_COLORS[Math.abs(cell.ethnicId ?? 0) % NATION_COLORS.length];
          }
          context.fill();
        }
      }

      if (displaySettings.nationBorders) {
        context.strokeStyle = 'rgba(255,255,255,0.5)';
        context.lineWidth = 1.0;
        for (const cell of landCells) {
          if (cell.nationId === null) continue;
          for (const nbId of cell.neighbors) {
            const nb = cells[nbId];
            if (!nb || nb.nationId === cell.nationId) continue;
            const edge = findSharedEdge(cell.polygon, nb.polygon);
            if (!edge) continue;
            const [a, b] = edge;
            const p1 = getPt(a[0], a[1], cell.elevation);
            const p2 = getPt(b[0], b[1], cell.elevation);
            context.beginPath();
            context.moveTo(p1[0], p1[1]);
            context.lineTo(p2[0], p2[1]);
            context.stroke();
          }
        }
        for (const cell of cells) {
          if (!cell.isEconomicHub && !cell.isCapital) continue;
          const [sx, sy] = getPt(cell.site[0], cell.site[1], cell.elevation);
          if (cell.isEconomicHub) {
            context.beginPath();
            context.arc(sx, sy, 3.1, 0, Math.PI * 2);
            context.fillStyle = '#111827';
            context.globalAlpha = 0.92;
            context.fill();
            context.globalAlpha = 1;
          }
          if (cell.isCapital) {
            const spikes = 5;
            const outerRadius = 4;
            const innerRadius = 1.6;
            let rotation = (Math.PI / 2) * 3;
            context.beginPath();
            context.moveTo(sx, sy - outerRadius);
            for (let index = 0; index < spikes; index++) {
              context.lineTo(
                sx + Math.cos(rotation) * outerRadius,
                sy + Math.sin(rotation) * outerRadius
              );
              rotation += Math.PI / spikes;
              context.lineTo(
                sx + Math.cos(rotation) * innerRadius,
                sy + Math.sin(rotation) * innerRadius
              );
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

      if (displaySettings.ethnicBorders) {
        context.strokeStyle = 'rgba(255,200,100,0.5)';
        context.lineWidth = 1.0;
        for (const cell of landCells) {
          if (cell.ethnicId === null) continue;
          for (const nbId of cell.neighbors) {
            const nb = cells[nbId];
            if (!nb || nb.ethnicId === cell.ethnicId) continue;
            const edge = findSharedEdge(cell.polygon, nb.polygon);
            if (!edge) continue;
            const [a, b] = edge;
            const p1 = getPt(a[0], a[1], cell.elevation);
            const p2 = getPt(b[0], b[1], cell.elevation);
            context.beginPath();
            context.moveTo(p1[0], p1[1]);
            context.lineTo(p2[0], p2[1]);
            context.stroke();
          }
        }
      }

      if (displaySettings.provinceBorders && displaySettings.nationBorders) {
        context.strokeStyle = 'rgba(255,255,255,0.2)';
        context.lineWidth = 0.6;
        for (const cell of landCells) {
          if (cell.provinceId === null || cell.nationId === null) continue;
          for (const nbId of cell.neighbors) {
            const nb = cells[nbId];
            if (!nb || nb.nationId !== cell.nationId || nb.provinceId === cell.provinceId) continue;
            const edge = findSharedEdge(cell.polygon, nb.polygon);
            if (!edge) continue;
            const [a, b] = edge;
            const p1 = getPt(a[0], a[1], cell.elevation);
            const p2 = getPt(b[0], b[1], cell.elevation);
            context.beginPath();
            context.moveTo(p1[0], p1[1]);
            context.lineTo(p2[0], p2[1]);
            context.stroke();
          }
        }
      }

      if (displaySettings.rivers) {
        context.strokeStyle = '#00f2ff';
        context.lineCap = 'round';
        context.globalAlpha = 0.96;
        context.shadowColor = '#7dd3fc';
        context.shadowBlur = 4;
        for (const cell of cells) {
          if (!cell.isRiver || cell.downstreamId === null) continue;
          const dc = cells[cell.downstreamId];
          if (!dc) continue;
          const from = getPt(cell.site[0], cell.site[1], cell.elevation);
          const to = getPt(dc.site[0], dc.site[1], dc.elevation);
          context.beginPath();
          context.moveTo(from[0], from[1]);
          context.lineTo(to[0], to[1]);
          context.lineWidth = Math.max(0.2, Math.min(cell.riverWidth * 0.35 + 0.3, 4.5));
          context.stroke();
        }
        context.shadowBlur = 0;
        context.globalAlpha = 1;
      }

      const shouldDrawLabels =
        displaySettings.ethnicLabels ||
        (displaySettings.labels &&
          (displaySettings.ethnicFill ||
            displaySettings.ethnicBorders ||
            displaySettings.nationBorders));
      if (shouldDrawLabels) {
        const labelMode =
          displaySettings.ethnicLabels ||
          displaySettings.ethnicFill ||
          displaySettings.ethnicBorders
            ? 'ethnic'
            : 'nation';
        const regions: (TNation | TEthnic)[] = labelMode === 'nation' ? nations : ethnics;
        const idKey = labelMode === 'nation' ? 'nationId' : 'ethnicId';
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
        context.font = "600 11px 'Trebuchet MS', 'Segoe UI', sans-serif";
        context.lineWidth = 3.2;
        context.strokeStyle = 'rgba(2, 6, 23, 0.82)';
        context.fillStyle = 'rgba(241, 245, 249, 0.95)';
        for (const region of regions) {
          const pos = positions.get(region.id);
          if (!pos || pos.count < 12) continue;
          const [lx, ly] = getPt(pos.x / pos.count, pos.y / pos.count, 0);
          const name = region.name;
          context.strokeText(name, lx, ly);
          context.fillText(name, lx, ly);
        }
      }

      if (logisticsEnabled) {
        if (routeCellIds.length > 1) {
          context.beginPath();
          const firstCell = cells[routeCellIds[0]];
          const [fx, fy] = getPt(firstCell.site[0], firstCell.site[1], firstCell.elevation);
          context.moveTo(fx, fy);
          for (let index = 1; index < routeCellIds.length; index++) {
            const prevCell = cells[routeCellIds[index - 1]];
            const currCell = cells[routeCellIds[index]];
            const [pmx, pmy] = getPt(prevCell.site[0], prevCell.site[1], prevCell.elevation);
            const [cmx, cmy] = getPt(currCell.site[0], currCell.site[1], currCell.elevation);
            context.quadraticCurveTo(pmx, pmy, (pmx + cmx) * 0.5, (pmy + cmy) * 0.5);
          }
          const lastCell = cells[routeCellIds[routeCellIds.length - 1]];
          const [lx, ly] = getPt(lastCell.site[0], lastCell.site[1], lastCell.elevation);
          context.lineTo(lx, ly);
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
          const sc = cells[startCellId];
          const [sx, sy] = getPt(sc.site[0], sc.site[1], sc.elevation);
          context.beginPath();
          context.arc(sx, sy, 5.2, 0, Math.PI * 2);
          context.fillStyle = '#22c55e';
          context.globalAlpha = 0.95;
          context.fill();
          context.globalAlpha = 1;
        }
        if (goalCellId !== null && cells[goalCellId]) {
          const gc = cells[goalCellId];
          const [gx, gy] = getPt(gc.site[0], gc.site[1], gc.elevation);
          context.beginPath();
          context.arc(gx, gy, 5.2, 0, Math.PI * 2);
          context.fillStyle = '#ef4444';
          context.globalAlpha = 0.95;
          context.fill();
          context.globalAlpha = 1;
        }
      }
    } else {
      renderBackground(context, width, height);
      renderWaterCells(context, waterCells);
      renderLandCells(context, landCells, displaySettings, layerPlan, mapCellStats);

      if (layerPlan.showShadedRelief) {
        applyShadedRelief(context, cells, { intensity: 0.62, verticalExaggeration: 10.5 });
      }

      if (displaySettings.nationFill) drawCountryFill(context, cells);
      if (displaySettings.ethnicFill)
        drawEthnicFill(context, cells, displaySettings.landform || displaySettings.biome);

      if (displaySettings.rivers) renderRivers(context, cells);

      if (displaySettings.nationBorders) {
        drawGrayBorders(context, cells);
        drawUrbanHierarchy(context, cells);
      }

      if (displaySettings.ethnicBorders) drawEthnicBorders(context, cells);
      if (displaySettings.nationBorders && displaySettings.provinceBorders)
        drawProvinceBorders(context, cells);

      if (displaySettings.ethnicLabels) {
        drawRegionNames(context, cells, nations, ethnics, 'ethnic');
      } else if (displaySettings.labels) {
        if (displaySettings.ethnicFill || displaySettings.ethnicBorders) {
          drawRegionNames(context, cells, nations, ethnics, 'ethnic');
        } else if (displaySettings.nationBorders) {
          drawRegionNames(context, cells, nations, ethnics, 'nation');
        }
      }

      if (layerPlan.showSiteMarkers) {
        for (const cell of cells) {
          drawSiteMarker(context, cell, 1.4, cell.isWater ? '#dbeafe' : '#fef3c7', 0.22);
        }
      }

      if (logisticsEnabled)
        drawLogisticsRoute(context, cells, routeCellIds, startCellId, goalCellId);
    }
  }, [
    canvasRef,
    cells,
    displaySettings,
    ethnics,
    goalCellId,
    height,
    width,
    isIso,
    isThree,
    isoCanvasWidth,
    isoCanvasHeight,
    isoOffsetX,
    isoOffsetY,
    elevScale,
    logisticsEnabled,
    nations,
    routeCellIds,
    startCellId,
    landCells,
    waterCells,
    sortedLandCells,
    sortedWaterCells,
    layerPlan,
    mapCellStats,
  ]);
}
