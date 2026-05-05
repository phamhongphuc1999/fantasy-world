'use client';

import { useEffect, RefObject } from 'react';
import { TERRAIN_CONFIG } from 'src/configs/constance';
import {
  drawCellShape,
  drawCountryFill,
  drawCurvedRiverSegment,
  drawEthnicBorders,
  drawEthnicFill,
  drawGrayBorders,
  drawLogisticsRouteOverlay,
  drawProvinceBorders,
  drawRegionNames,
  drawSiteMarker,
  drawUrbanHierarchy,
  getPopulationHeatmapColor,
  getPrecipitationHeatmapColor,
  getRainShadowHeatmapColor,
  getTemperatureHeatmapColor,
  isLandCell,
  setupCanvas,
} from 'src/services/map/mapCanvas.service';
import { TMapCell, TMapDisplaySettings, TEthnicGroup, TNation } from 'src/types/map.types';

const T_SITE_MARKER_LIMIT = 4000;

type TProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cells: TMapCell[];
  width: number;
  height: number;
  nations: TNation[];
  ethnicGroups: TEthnicGroup[];
  displaySettings: TMapDisplaySettings;
  logisticsEnabled: boolean;
  routeCellIds: number[];
  startCellId: number | null;
  goalCellId: number | null;
};

export default function useMapCanvasRendering({
  canvasRef,
  cells,
  width,
  height,
  nations,
  ethnicGroups,
  displaySettings,
  logisticsEnabled,
  routeCellIds,
  startCellId,
  goalCellId,
}: TProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#09131f';
    context.fillRect(0, 0, width, height);

    for (const cell of cells) {
      if (isLandCell(cell)) continue;
      drawCellShape(context, cell, TERRAIN_CONFIG[cell.terrain].color, 0.95, 'transparent', 0);
    }

    const showUniformLand =
      !displaySettings.terrain &&
      !displaySettings.populationHeatmap &&
      !displaySettings.temperatureHeatmap &&
      !displaySettings.precipitationHeatmap &&
      !displaySettings.rainShadowHeatmap &&
      !displaySettings.countryFill &&
      !displaySettings.ethnicFill;

    let minPopulation = Number.POSITIVE_INFINITY;
    let maxPopulation = Number.NEGATIVE_INFINITY;
    let minTemperature = Number.POSITIVE_INFINITY;
    let maxTemperature = Number.NEGATIVE_INFINITY;

    if (displaySettings.populationHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        if (cell.population < minPopulation) minPopulation = cell.population;
        if (cell.population > maxPopulation) maxPopulation = cell.population;
      }
    }

    if (displaySettings.temperatureHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        if (cell.temperature < minTemperature) minTemperature = cell.temperature;
        if (cell.temperature > maxTemperature) maxTemperature = cell.temperature;
      }
    }

    if (displaySettings.terrain) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, TERRAIN_CONFIG[cell.terrain].color, 0.95, 'transparent', 0);
      }
    }

    if (displaySettings.populationHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getPopulationHeatmapColor(cell.population, minPopulation, maxPopulation),
          0.96,
          'transparent',
          0
        );
      }
    }

    if (displaySettings.precipitationHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getPrecipitationHeatmapColor(cell.precipitation),
          0.96,
          'transparent',
          0
        );
      }
    }

    if (displaySettings.rainShadowHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getRainShadowHeatmapColor(cell.rainShadow),
          0.96,
          'transparent',
          0
        );
      }
    }

    if (displaySettings.temperatureHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getTemperatureHeatmapColor(cell.temperature, minTemperature, maxTemperature),
          0.96,
          'transparent',
          0
        );
      }
    }

    if (showUniformLand) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, '#3f3f46', 1, 'transparent', 0);
      }
    }

    if (displaySettings.countryFill) drawCountryFill(context, cells);
    if (displaySettings.ethnicFill) drawEthnicFill(context, cells, displaySettings.terrain);

    if (displaySettings.rivers) {
      for (const cell of cells) {
        if (!cell.isRiver || cell.downstreamId === null) continue;
        const downstreamCell = cells[cell.downstreamId];
        if (!downstreamCell) continue;
        drawCurvedRiverSegment(context, cell, downstreamCell);
        context.strokeStyle = '#38bdf8';
        context.lineWidth = Math.min(4.4, 1.25 + Math.log2(cell.flow + 1) * 0.45);
        context.lineCap = 'round';
        context.globalAlpha = 0.96;
        context.shadowColor = '#7dd3fc';
        context.shadowBlur = 4;
        context.stroke();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
      }
    }

    if (displaySettings.countryBorders) {
      drawGrayBorders(context, cells);
      drawUrbanHierarchy(context, cells);
    }

    if (displaySettings.ethnicBorders) drawEthnicBorders(context, cells);
    if (displaySettings.countryBorders && displaySettings.provinceBorders)
      drawProvinceBorders(context, cells);

    if (displaySettings.labels) {
      if (displaySettings.ethnicFill || displaySettings.ethnicBorders) {
        drawRegionNames(context, cells, nations, ethnicGroups, 'ethnic');
      } else if (displaySettings.countryBorders) {
        drawRegionNames(context, cells, nations, ethnicGroups, 'nation');
      }
    }

    if (
      displaySettings.terrain &&
      !displaySettings.populationHeatmap &&
      !displaySettings.temperatureHeatmap &&
      !displaySettings.precipitationHeatmap &&
      !displaySettings.rainShadowHeatmap &&
      cells.length <= T_SITE_MARKER_LIMIT
    ) {
      for (const cell of cells) {
        drawSiteMarker(context, cell, 1.4, cell.isWater ? '#dbeafe' : '#fef3c7', 0.22);
      }
    }

    if (logisticsEnabled) {
      drawLogisticsRouteOverlay(context, cells, routeCellIds, startCellId, goalCellId);
    }
  }, [
    canvasRef,
    cells,
    displaySettings,
    ethnicGroups,
    goalCellId,
    height,
    logisticsEnabled,
    nations,
    routeCellIds,
    startCellId,
    width,
  ]);
}
