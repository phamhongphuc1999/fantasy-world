'use client';

import { useRef, useState } from 'react';
import EthnicDetailDialog from 'src/components/AppDialog/EthnicDetailDialog';
import NationDetailDialog from 'src/components/AppDialog/NationDetailDialog';
import { useMapContext } from 'src/contexts/map.context';
import useMapCanvasRendering from 'src/hooks/useMapCanvasRendering';
import useMapOverlayRendering from 'src/hooks/useMapOverlayRendering';
import { getCanvasPoint } from 'src/services/map/mapCanvas.service';
import { useLogisticsGameStore } from 'src/store/logisticsGameStore';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

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

  useMapCanvasRendering({
    canvasRef: baseCanvasRef,
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
  });

  useMapOverlayRendering({ canvasRef: overlayCanvasRef, cells, width, height, hoverIndex });

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden">
      <div className="relative max-h-full w-full" style={{ aspectRatio: `${width}/${height}` }}>
        <canvas
          id="map-base-canvas"
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
