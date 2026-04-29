'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMapContext } from 'src/contexts/map.context';
import { describeCell } from 'src/services/map/describeCell';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';

const PANEL_OFFSET = 16;
const PANEL_PADDING = 10;
const PANEL_ESTIMATED_WIDTH = 320;
const PANEL_ESTIMATED_HEIGHT = 360;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function HoverCellOverview() {
  const { hoverClientPoint, hoverIndex, hoverVisualizationEnabled } = useMapExplorerStore();
  const { mesh } = useMapContext();
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { cell, description } = useMemo(() => {
    const nextCell = hoverIndex !== null ? mesh.cells[hoverIndex] : null;
    if (nextCell) return { cell: nextCell, description: describeCell(nextCell, mesh) };
    return { cell: undefined, description: undefined };
  }, [hoverIndex, mesh]);

  const positionStyle = useMemo(() => {
    if (!hoverClientPoint) return { left: PANEL_PADDING, top: PANEL_PADDING };

    const shouldFlipX =
      hoverClientPoint.x + PANEL_OFFSET + PANEL_ESTIMATED_WIDTH >
      viewportSize.width - PANEL_PADDING;
    const shouldFlipY =
      hoverClientPoint.y + PANEL_OFFSET + PANEL_ESTIMATED_HEIGHT >
      viewportSize.height - PANEL_PADDING;

    const rawLeft = shouldFlipX
      ? hoverClientPoint.x - PANEL_ESTIMATED_WIDTH - PANEL_OFFSET
      : hoverClientPoint.x + PANEL_OFFSET;
    const rawTop = shouldFlipY
      ? hoverClientPoint.y - PANEL_ESTIMATED_HEIGHT - PANEL_OFFSET
      : hoverClientPoint.y + PANEL_OFFSET;

    const left = clamp(
      rawLeft,
      PANEL_PADDING,
      Math.max(PANEL_PADDING, viewportSize.width - PANEL_ESTIMATED_WIDTH - PANEL_PADDING)
    );
    const top = clamp(
      rawTop,
      PANEL_PADDING,
      Math.max(PANEL_PADDING, viewportSize.height - PANEL_ESTIMATED_HEIGHT - PANEL_PADDING)
    );

    return { left, top };
  }, [hoverClientPoint, viewportSize.height, viewportSize.width]);

  if (!hoverVisualizationEnabled || !description || !cell) return null;

  return (
    <div className="pointer-events-none fixed z-1000000" style={positionStyle}>
      <div className="max-h-[42vh] w-[min(20rem,calc(100vw-1.25rem))] overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3 text-white backdrop-blur-md">
        <p className="text-base font-semibold text-white">#{cell.id}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-200 sm:text-sm">
          <span className="text-slate-400">Terrain</span>
          <span className="font-medium text-white">{description.terrainType}</span>
          <span className="text-slate-400">Elevation</span>
          <span>{description.elevation}</span>
          <span className="text-slate-400">Biome</span>
          <span>{description.biome}</span>
          <span className="text-slate-400">River</span>
          <span>{description.riverState}</span>
          <span className="text-slate-400">Flow</span>
          <span>{description.flow}</span>
          <span className="text-slate-400">Temperature</span>
          <span>{description.temperature}</span>
          <span className="text-slate-400">Precipitation</span>
          <span>{description.precipitation}</span>
          <span className="text-slate-400">Rain Shadow</span>
          <span>{description.rainShadow}</span>
          <span className="text-slate-400">Suitability</span>
          <span>{description.suitability}</span>
          <span className="text-slate-400">Nation ID</span>
          <span>{description.nationId}</span>
          <span className="text-slate-400">Province ID</span>
          <span>{description.provinceId}</span>
          <span className="text-slate-400">Zone Type</span>
          <span>{description.zoneType}</span>
        </div>
      </div>
    </div>
  );
}
