'use client';

import { RefObject, useEffect, useMemo } from 'react';
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
  drawLogisticsRoute,
  drawRegionNames,
  drawUrbanHierarchy,
} from 'src/services/rendering/canvas/overlays';
import { drawSiteMarker, setupCanvas } from 'src/services/rendering/canvas/primitives';
import { applyShadedRelief } from 'src/services/rendering/canvas/relief';
import { useLogisticsGameStore } from 'src/store/logisticsGameStore';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TCellStats } from 'src/types/map.types';

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

  const waterCells = useMemo(() => cells.filter((cell) => !isLandCell(cell)), [cells]);
  const landCells = useMemo(() => cells.filter((cell) => isLandCell(cell)), [cells]);

  const layerPlan = useMemo(
    () => createLayerPlan(displaySettings, cells.length),
    [cells.length, displaySettings]
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

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

    if (logisticsEnabled) drawLogisticsRoute(context, cells, routeCellIds, startCellId, goalCellId);
  }, [
    canvasRef,
    cells,
    displaySettings,
    ethnics,
    goalCellId,
    height,
    logisticsEnabled,
    nations,
    routeCellIds,
    startCellId,
    width,
    landCells,
    layerPlan,
    mapCellStats,
    waterCells,
  ]);
}
