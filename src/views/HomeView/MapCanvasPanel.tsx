'use client';

import { MouseEvent, useRef, useState } from 'react';
import EthnicDetailDialog from 'src/components/AppDialog/EthnicDetailDialog';
import NationDetailDialog from 'src/components/AppDialog/NationDetailDialog';
import { useMapContext } from 'src/contexts/map.context';
import useMapCanvas from 'src/hooks/useMapCanvas';
import useMapOverlay from 'src/hooks/useMapOverlay';
import { getCanvasPoint } from 'src/services/rendering/canvas/primitives';
import { useLogisticsGameStore } from 'src/store/logisticsGameStore';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

export default function MapCanvasPanel() {
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNationId, setSelectedNationId] = useState<number | null>(null);
  const [selectedEthnicId, setSelectedEthnicId] = useState<number | null>(null);
  const [nationDialogOpen, setNationDialogOpen] = useState(false);
  const [ethnicDialogOpen, setEthnicDialogOpen] = useState(false);
  const { displaySettings, setHoverIndex, setHoverClientPoint } = useMapExplorerStore();
  const {
    enabled: logisticsEnabled,
    handleMapCellClick,
    recalculateRoute,
  } = useLogisticsGameStore();
  const { mesh, isGenerating, handlePointerMove } = useMapContext();
  const { cells, width, height } = mesh;

  useMapCanvas({ canvasRef: baseCanvasRef });
  useMapOverlay({ canvasRef: overlayCanvasRef });

  function onCanvasPanelClick(event: MouseEvent<HTMLCanvasElement>) {
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
      !displaySettings.nationFill &&
      !displaySettings.nationBorders;
    if (shouldOpenEthnicDetail) {
      const ethnicId = cells[clickedId]?.ethnicId ?? null;
      if (ethnicId === null) return;
      setNationDialogOpen(false);
      setSelectedEthnicId(ethnicId);
      setEthnicDialogOpen(true);
      return;
    }

    const nationId = cells[clickedId]?.nationId ?? null;
    if (nationId === null) return;
    setEthnicDialogOpen(false);
    setSelectedNationId(nationId);
    setNationDialogOpen(true);
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden p-2 sm:p-0">
      <div
        className="relative max-h-full w-full max-w-full"
        style={{ aspectRatio: `${width}/${height}` }}
      >
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
          onPointerMove={(event) => {
            const point = getCanvasPoint(event, width, height);
            handlePointerMove(point.x, point.y);
          }}
          onPointerLeave={() => {
            setHoverIndex(null);
            setHoverClientPoint(null);
          }}
          onClick={onCanvasPanelClick}
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
        ethnicId={selectedEthnicId}
        mesh={mesh}
      />
    </div>
  );
}
