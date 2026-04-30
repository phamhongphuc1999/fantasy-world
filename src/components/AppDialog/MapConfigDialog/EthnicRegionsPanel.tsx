'use client';

import { useMemo } from 'react';
import { useMapContext } from 'src/contexts/map.context';
import { TMapCell } from 'src/types/global';

type TProps = Record<string, never>;

export default function EthnicRegionsPanel(_props: TProps) {
  const { mesh } = useMapContext();

  function buildTerrainPercentages(cells: TMapCell[]) {
    const counts = new Map<string, number>();
    for (const cell of cells) {
      counts.set(cell.terrain, (counts.get(cell.terrain) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([terrain, count]) => ({
        terrain,
        count,
        percent: Math.round((count / Math.max(1, cells.length)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  const rows = useMemo(() => {
    return mesh.ethnicGroups
      .map((group) => {
        const cells = mesh.cells.filter((cell) => cell.ethnicGroupId === group.id && !cell.isWater);
        const nationIds = new Set<number>();
        for (const cell of cells) {
          if (cell.nationId !== null) nationIds.add(cell.nationId);
        }
        return {
          id: group.id,
          name: group.name,
          coreCellId: group.coreCellId,
          landCells: cells.length,
          nationCount: nationIds.size,
          terrainStats: buildTerrainPercentages(cells),
        };
      })
      .sort((a, b) => b.landCells - a.landCells);
  }, [mesh.cells, mesh.ethnicGroups]);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Ethnic Regions
      </span>
      <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100">{row.name}</span>
              <span className="text-slate-400">#{row.id}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span>Land Cells: {row.landCells}</span>
              <span>Core: #{row.coreCellId}</span>
            </div>
            <div className="mt-1">Countries Spanned: {row.nationCount}</div>
            <div className="mt-1 text-[11px] text-slate-300">
              <span className="font-medium text-slate-200">Terrain:</span>{' '}
              {row.terrainStats.map((entry) => `${entry.terrain} ${entry.percent}%`).join(', ')}
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">No ethnic groups generated.</p>
        ) : null}
      </div>
    </div>
  );
}
