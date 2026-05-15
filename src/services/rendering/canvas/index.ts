import { TCell, TCellStats, TDisplaySettings } from 'src/types/map.types';
import { drawCellShape, drawRiverCurve } from './primitives';
import { BIOME_CONFIG, LANDFORM_CONFIG } from 'src/configs/map/landform-biome';
import {
  getEconomyColor,
  getPopulationColor,
  getPrecipitationColor,
  getRainShadowColor,
  getTemperatureColor,
} from './heatmap';
import { getRiverStrokeWidth } from '../rivers';

const T_SITE_MARKER_LIMIT = 4000;
const T_UNIFORM_LAND_COLOR = '#3f3f46';
const T_TRANSPARENT_STROKE = 'transparent';

type TLayerPlan = {
  showUniformLand: boolean;
  showLandformReliefBase: boolean;
  showBiomeReliefBase: boolean;
  showShadedRelief: boolean;
  showSiteMarkers: boolean;
};

export function createLayerPlan(displaySettings: TDisplaySettings, totalCells: number): TLayerPlan {
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

  const showSiteMarkers =
    (displaySettings.landform || displaySettings.biome) &&
    !displaySettings.population &&
    !displaySettings.temperature &&
    !displaySettings.precipitation &&
    !displaySettings.rainShadow &&
    !displaySettings.economy &&
    totalCells <= T_SITE_MARKER_LIMIT;

  return {
    showUniformLand,
    showLandformReliefBase,
    showBiomeReliefBase,
    showShadedRelief,
    showSiteMarkers,
  };
}

export function renderBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#09131f';
  context.fillRect(0, 0, width, height);
}

export function renderWaterCells(context: CanvasRenderingContext2D, waterCells: TCell[]) {
  for (const cell of waterCells) {
    drawCellShape(context, cell, LANDFORM_CONFIG[cell.landform].color, 1, T_TRANSPARENT_STROKE, 0);
  }
}

export function renderLandCells(
  context: CanvasRenderingContext2D,
  landCells: TCell[],
  displaySettings: TDisplaySettings,
  layerPlan: TLayerPlan,
  mapCellStats: TCellStats
) {
  if (displaySettings.landform || layerPlan.showLandformReliefBase) {
    for (const cell of landCells) {
      drawCellShape(
        context,
        cell,
        LANDFORM_CONFIG[cell.landform].color,
        1,
        T_TRANSPARENT_STROKE,
        0
      );
    }
  }

  if (displaySettings.biome || layerPlan.showBiomeReliefBase) {
    for (const cell of landCells) {
      drawCellShape(context, cell, BIOME_CONFIG[cell.biome].color, 1, T_TRANSPARENT_STROKE, 0);
    }
  }

  if (displaySettings.population) {
    for (const cell of landCells) {
      drawCellShape(
        context,
        cell,
        getPopulationColor(cell.population, mapCellStats.minPopulation, mapCellStats.maxPopulation),
        1,
        T_TRANSPARENT_STROKE,
        0
      );
    }
  }

  if (displaySettings.precipitation) {
    for (const cell of landCells) {
      drawCellShape(
        context,
        cell,
        getPrecipitationColor(cell.precipitation),
        1,
        T_TRANSPARENT_STROKE,
        0
      );
    }
  }

  if (displaySettings.rainShadow) {
    for (const cell of landCells) {
      drawCellShape(context, cell, getRainShadowColor(cell.rainShadow), 1, T_TRANSPARENT_STROKE, 0);
    }
  }

  if (displaySettings.temperature) {
    for (const cell of landCells) {
      drawCellShape(
        context,
        cell,
        getTemperatureColor(
          cell.temperature,
          mapCellStats.minTemperature,
          mapCellStats.maxTemperature
        ),
        1,
        T_TRANSPARENT_STROKE,
        0
      );
    }
  }

  if (displaySettings.economy) {
    for (const cell of landCells) {
      drawCellShape(
        context,
        cell,
        getEconomyColor(cell.economy, mapCellStats.minEconomy, mapCellStats.maxEconomy),
        1,
        T_TRANSPARENT_STROKE,
        0
      );
    }
  }

  if (layerPlan.showUniformLand) {
    for (const cell of landCells) {
      drawCellShape(context, cell, T_UNIFORM_LAND_COLOR, 1, T_TRANSPARENT_STROKE, 0);
    }
  }
}

export function renderRivers(context: CanvasRenderingContext2D, cells: TCell[]) {
  context.strokeStyle = '#00f2ff';
  context.lineCap = 'round';
  context.globalAlpha = 0.96;
  context.shadowColor = '#7dd3fc';
  context.shadowBlur = 4;

  for (const cell of cells) {
    if (!cell.isRiver || cell.downstreamId === null) continue;
    const downstreamCell = cells[cell.downstreamId];
    if (!downstreamCell) continue;
    drawRiverCurve(context, cell, downstreamCell);
    context.lineWidth = getRiverStrokeWidth(cell);
    context.stroke();
  }

  context.shadowBlur = 0;
  context.globalAlpha = 1;
}
