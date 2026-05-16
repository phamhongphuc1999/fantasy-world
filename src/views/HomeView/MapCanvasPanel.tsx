'use client';

import { MouseEvent, useRef, useState } from 'react';
import CellDetailDialog from 'src/components/AppDialog/CellDetailDialog';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setHoverIndex, setHoverClientPoint } = useMapExplorerStore();
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

    const clickedCell = cells[clickedId];
    if (!clickedCell) return;

    if (logisticsEnabled) {
      handleMapCellClick(clickedId);
      queueMicrotask(() => {
        recalculateRoute(mesh);
      });
      return;
    }

    const nationId = clickedCell.nationId ?? null;
    const ethnicId = clickedCell.ethnicId ?? null;
    if (nationId === null && ethnicId === null) return;
    setSelectedNationId(nationId);
    setSelectedEthnicId(ethnicId);
    setDialogOpen(true);
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
      <CellDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nationId={selectedNationId}
        ethnicId={selectedEthnicId}
        mesh={mesh}
      />
    </div>
  );
}
