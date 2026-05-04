'use client';

import { useEffect, useRef, useState } from 'react';
import EthnicDetailDialog from 'src/components/AppDialog/EthnicDetailDialog';
import NationDetailDialog from 'src/components/AppDialog/NationDetailDialog';
import { useMapContext } from 'src/contexts/map.context';
import { getTerrainColor } from 'src/services';
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
  getCanvasPoint,
  getCellDisplayColor,
  getPopulationHeatmapColor,
  isLandCell,
  setupCanvas,
} from 'src/services/map/mapCanvas.service';
import { useLogisticsGameStore } from 'src/store/logisticsGameStore';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

const T_SITE_MARKER_LIMIT = 4000;

export default function MapCanvasPanel() {
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNationId, setSelectedNationId] = useState<number | null>(null);
  const [selectedEthnicGroupId, setSelectedEthnicGroupId] = useState<number | null>(null);
  const [nationDialogOpen, setNationDialogOpen] = useState(false);
  const [ethnicDialogOpen, setEthnicDialogOpen] = useState(false);
  const { displaySettings, hoverIndex, setHoverClientPoint, setHoverIndex } = useMapExplorerStore();
  const {
    enabled: logisticsEnabled,
    startCellId,
    goalCellId,
    routeCellIds,
    handleMapCellClick,
    recalculateRoute,
  } = useLogisticsGameStore();
  const { mesh, isGenerating, handlePointerMove } = useMapContext();
  const { cells, width, height, nations, ethnicGroups } = mesh;

  useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

    context.clearRect(0, 0, width, height);
    context.fillStyle = '#09131f';
    context.fillRect(0, 0, width, height);

    for (const cell of cells) {
      if (isLandCell(cell)) continue;
      drawCellShape(context, cell, getTerrainColor(cell.terrain), 0.95, 'transparent', 0);
    }

    const showUniformLand =
      !displaySettings.terrain &&
      !displaySettings.populationHeatmap &&
      !displaySettings.countryFill &&
      !displaySettings.ethnicFill;

    let minPopulation = Number.POSITIVE_INFINITY;
    let maxPopulation = Number.NEGATIVE_INFINITY;
    if (displaySettings.populationHeatmap) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        if (cell.population < minPopulation) minPopulation = cell.population;
        if (cell.population > maxPopulation) maxPopulation = cell.population;
      }
    }

    if (displaySettings.terrain) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, getCellDisplayColor(cell), 0.95, 'transparent', 0);
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
    if (displaySettings.ethnicBorders) {
      drawEthnicBorders(context, cells);
    }

    if (displaySettings.countryBorders && displaySettings.provinceBorders)
      drawProvinceBorders(context, cells);

    if (displaySettings.labels) {
      if (displaySettings.ethnicFill || displaySettings.ethnicBorders)
        drawRegionNames(context, cells, nations, ethnicGroups, 'ethnic');
      else if (displaySettings.countryBorders)
        drawRegionNames(context, cells, nations, ethnicGroups, 'nation');
    }

    if (
      displaySettings.terrain &&
      !displaySettings.populationHeatmap &&
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
    cells,
    displaySettings,
    goalCellId,
    height,
    logisticsEnabled,
    routeCellIds,
    startCellId,
    width,
    nations,
    ethnicGroups,
  ]);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const context = setupCanvas(canvas, width, height, pixelRatio);
    if (!context) return;

    context.clearRect(0, 0, width, height);
    const hoveredCell = hoverIndex !== null ? cells[hoverIndex] : null;

    if (hoveredCell) {
      drawCellShape(context, hoveredCell, '#38bdf8', 0.84, '#e0f2fe', 1.5);
      drawSiteMarker(context, hoveredCell, 2.75, hoveredCell.isWater ? '#dbeafe' : '#fef3c7', 0.95);
    }
  }, [cells, height, hoverIndex, width]);

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div className="relative max-h-full w-full" style={{ aspectRatio: `${width}/${height}` }}>
        <canvas
          ref={baseCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full"
        />
        <canvas
          ref={overlayCanvasRef}
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full cursor-pointer"
          onMouseMove={(event) => {
            const point = getCanvasPoint(event, width, height);
            handlePointerMove(point.x, point.y);
            setHoverClientPoint({ x: event.clientX, y: event.clientY });
          }}
          onMouseLeave={() => {
            setHoverIndex(null);
            setHoverClientPoint(null);
          }}
          onClick={(event) => {
            const point = getCanvasPoint(event, width, height);
            const clickedId = mesh.delaunay.find(point.x, point.y);
            if (clickedId < 0 || cells[clickedId]?.isWater) return;

            if (logisticsEnabled) {
              handleMapCellClick(clickedId);
              queueMicrotask(() => {
                recalculateRoute(mesh);
              });
              return;
            }

            const shouldOpenEthnicDetail =
              (displaySettings.ethnicFill || displaySettings.ethnicBorders) &&
              !displaySettings.countryFill &&
              !displaySettings.countryBorders;
            if (shouldOpenEthnicDetail) {
              const ethnicGroupId = cells[clickedId]?.ethnicGroupId ?? null;
              if (ethnicGroupId === null) return;
              setNationDialogOpen(false);
              setSelectedEthnicGroupId(ethnicGroupId);
              setEthnicDialogOpen(true);
              return;
            }

            const nationId = cells[clickedId]?.nationId ?? null;
            if (nationId === null) return;
            setEthnicDialogOpen(false);
            setSelectedNationId(nationId);
            setNationDialogOpen(true);
          }}
        />
        {isGenerating && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 backdrop-blur-[1px]">
            <div className="rounded-xl border border-white/15 bg-slate-900/85 px-4 py-2 text-sm text-slate-100">
              Generating map...
            </div>
          </div>
        )}
      </div>
      <NationDetailDialog
        open={nationDialogOpen}
        onOpenChange={setNationDialogOpen}
        nationId={selectedNationId}
        mesh={mesh}
      />
      <EthnicDetailDialog
        open={ethnicDialogOpen}
        onOpenChange={setEthnicDialogOpen}
        ethnicGroupId={selectedEthnicGroupId}
        mesh={mesh}
      />
    </div>
  );
}
