'use client';

import { useEffect, useRef, useState } from 'react';
import NationDetailDialog from 'src/components/AppDialog/NationDetailDialog';
import { useMapContext } from 'src/contexts/map.context';
import { getTerrainColor } from 'src/services';
import {
  drawCellShape,
  drawCountryFill,
  drawCurvedRiverSegment,
  drawEthnicFill,
  drawGrayBorders,
  drawLogisticsRouteOverlay,
  drawProvinceBorders,
  drawRegionNames,
  drawSiteMarker,
  drawUrbanHierarchy,
  getCanvasPoint,
  getCellDisplayColor,
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
  const [nationDialogOpen, setNationDialogOpen] = useState(false);
  const { displaySettings, hoverIndex, setHoverClientPoint, setHoverIndex } = useMapExplorerStore();
  const {
    enabled: logisticsEnabled,
    startCellId,
    goalCellId,
    routeCellIds,
    handleMapCellClick,
    recalculateRoute,
  } = useLogisticsGameStore();
  const { mesh, handlePointerMove } = useMapContext();
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
      !displaySettings.showTerrain &&
      !displaySettings.showCountryBorders &&
      !displaySettings.showEthnicRegions;

    if (displaySettings.showTerrain) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, getCellDisplayColor(cell), 0.95, 'transparent', 0);
      }
    }

    if (showUniformLand) {
      for (const cell of cells) {
        if (!isLandCell(cell)) continue;
        drawCellShape(context, cell, '#3f3f46', 1, 'transparent', 0);
      }
    }

    if (displaySettings.showCountryBorders)
      drawCountryFill(context, cells, displaySettings.showTerrain);
    if (displaySettings.showEthnicRegions) {
      drawEthnicFill(context, cells, displaySettings.showTerrain);
    }

    if (displaySettings.showRivers) {
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

    if (displaySettings.showCountryBorders) {
      drawGrayBorders(context, cells);
      drawUrbanHierarchy(context, cells);
    }

    if (displaySettings.showCountryBorders && displaySettings.showProvinceBorders) {
      drawProvinceBorders(context, cells);
    }

    if (displaySettings.showRegionNames) {
      if (displaySettings.showEthnicRegions) {
        drawRegionNames(context, cells, nations, ethnicGroups, 'ethnic');
      } else if (displaySettings.showCountryBorders) {
        drawRegionNames(context, cells, nations, ethnicGroups, 'nation');
      }
    }

    if (displaySettings.showTerrain && cells.length <= T_SITE_MARKER_LIMIT) {
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

            const nationId = cells[clickedId]?.nationId ?? null;
            if (nationId === null) return;
            setSelectedNationId(nationId);
            setNationDialogOpen(true);
          }}
        />
      </div>
      <NationDetailDialog
        open={nationDialogOpen}
        onOpenChange={setNationDialogOpen}
        nationId={selectedNationId}
        mesh={mesh}
      />
    </div>
  );
}
