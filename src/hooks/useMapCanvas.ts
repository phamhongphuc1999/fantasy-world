'use client';

import { RefObject, useEffect } from 'react';
import { BIOME_CONFIG, LANDFORM_CONFIG } from 'src/configs/MapConfig/landform-biome.config';
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
  drawLogisticsRoute,
  drawRegionNames,
  drawUrbanHierarchy,
} from 'src/services/rendering/canvas/overlays';
import {
  drawCellShape,
  drawRiverCurve,
  drawSiteMarker,
  setupCanvas,
} from 'src/services/rendering/canvas/primitives';
import { applyShadedRelief } from 'src/services/rendering/canvas/relief';
import { getRiverStrokeWidth } from 'src/services/rendering/rivers';
import { TCell, TDisplaySettings, TEthnic, TNation } from 'src/types/map.types';

const T_SITE_MARKER_LIMIT = 4000;

type TProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  cells: TCell[];
  width: number;
  height: number;
  nations: TNation[];
  ethnics: TEthnic[];
  displaySettings: TDisplaySettings;
  logisticsEnabled: boolean;
  routeCellIds: number[];
  startCellId: number | null;
  goalCellId: number | null;
};

export default function useMapCanvas(params: TProps) {
  const {
    canvasRef,
    cells,
    width,
    height,
    nations,
    ethnics,
    displaySettings,
    logisticsEnabled,
    routeCellIds,
    startCellId,
    goalCellId,
  } = params;
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
      drawCellShape(context, cell, LANDFORM_CONFIG[cell.landform].color, 1, 'transparent', 0);
    }

    const showUniformLand =
      !displaySettings.landform &&
      !displaySettings.landformRelief &&
      !displaySettings.biome &&
      !displaySettings.biomeRelief &&
      !displaySettings.population &&
      !displaySettings.temperature &&
      !displaySettings.precipitation &&
      !displaySettings.rainShadow &&
      !displaySettings.economy &&
      !displaySettings.nationFill &&
      !displaySettings.ethnicFill;

    const showLandformReliefBase =
      displaySettings.landformRelief &&
      !displaySettings.landform &&
      !displaySettings.biome &&
      !displaySettings.population &&
      !displaySettings.temperature &&
      !displaySettings.precipitation &&
      !displaySettings.rainShadow &&
      !displaySettings.economy &&
      !displaySettings.nationFill &&
      !displaySettings.ethnicFill;

    const showBiomeReliefBase =
      displaySettings.biomeRelief &&
      !displaySettings.biome &&
      !displaySettings.landform &&
      !displaySettings.population &&
      !displaySettings.temperature &&
      !displaySettings.precipitation &&
      !displaySettings.rainShadow &&
      !displaySettings.economy &&
      !displaySettings.nationFill &&
      !displaySettings.ethnicFill;

    let minPopulation = Number.POSITIVE_INFINITY;
    let maxPopulation = Number.NEGATIVE_INFINITY;
    let minTemperature = Number.POSITIVE_INFINITY;
    let maxTemperature = Number.NEGATIVE_INFINITY;
    let minEconomy = Number.POSITIVE_INFINITY;
    let maxEconomy = Number.NEGATIVE_INFINITY;

    if (displaySettings.population) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        if (cell.population < minPopulation) minPopulation = cell.population;
        if (cell.population > maxPopulation) maxPopulation = cell.population;
      }
    }

    if (displaySettings.temperature) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        if (cell.temperature < minTemperature) minTemperature = cell.temperature;
        if (cell.temperature > maxTemperature) maxTemperature = cell.temperature;
      }
    }

    if (displaySettings.economy) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        if (cell.economy < minEconomy) minEconomy = cell.economy;
        if (cell.economy > maxEconomy) maxEconomy = cell.economy;
      }
    }

    if (displaySettings.landform) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, LANDFORM_CONFIG[cell.landform].color, 1, 'transparent', 0);
      }
    }

    if (displaySettings.biome) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, BIOME_CONFIG[cell.biome].color, 1, 'transparent', 0);
      }
    }

    if (showLandformReliefBase) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, LANDFORM_CONFIG[cell.landform].color, 1, 'transparent', 0);
      }
    }

    if (showBiomeReliefBase) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, BIOME_CONFIG[cell.biome].color, 1, 'transparent', 0);
      }
    }

    if (displaySettings.population) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getPopulationColor(cell.population, minPopulation, maxPopulation),
          1,
          'transparent',
          0
        );
      }
    }

    if (displaySettings.precipitation) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getPrecipitationColor(cell.precipitation),
          1,
          'transparent',
          0
        );
      }
    }

    if (displaySettings.rainShadow) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, getRainShadowColor(cell.rainShadow), 1, 'transparent', 0);
      }
    }

    if (displaySettings.temperature) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getTemperatureColor(cell.temperature, minTemperature, maxTemperature),
          1,
          'transparent',
          0
        );
      }
    }

    if (displaySettings.economy) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(
          context,
          cell,
          getEconomyColor(cell.economy, minEconomy, maxEconomy),
          1,
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

    const showShadedRelief =
      (displaySettings.landformRelief || displaySettings.biomeRelief) &&
      (displaySettings.landform ||
        displaySettings.biome ||
        showLandformReliefBase ||
        showBiomeReliefBase) &&
      !displaySettings.population &&
      !displaySettings.temperature &&
      !displaySettings.precipitation &&
      !displaySettings.rainShadow &&
      !displaySettings.economy;
    if (showShadedRelief) {
      applyShadedRelief(context, cells, { intensity: 0.62, verticalExaggeration: 10.5 });
    }

    if (displaySettings.nationFill) drawCountryFill(context, cells);
    if (displaySettings.ethnicFill)
      drawEthnicFill(context, cells, displaySettings.landform || displaySettings.biome);

    if (displaySettings.rivers) {
      for (const cell of cells) {
        if (!cell.isRiver || cell.downstreamId === null) continue;
        const downstreamCell = cells[cell.downstreamId];
        if (!downstreamCell) continue;
        drawRiverCurve(context, cell, downstreamCell);
        context.strokeStyle = '#00f2ff';
        context.lineWidth = getRiverStrokeWidth(cell);
        context.lineCap = 'round';
        context.globalAlpha = 0.96;
        context.shadowColor = '#7dd3fc';
        context.shadowBlur = 4;
        context.stroke();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
      }
    }

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

    if (
      (displaySettings.landform || displaySettings.biome) &&
      !displaySettings.population &&
      !displaySettings.temperature &&
      !displaySettings.precipitation &&
      !displaySettings.rainShadow &&
      !displaySettings.economy &&
      cells.length <= T_SITE_MARKER_LIMIT
    ) {
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
  ]);
}
