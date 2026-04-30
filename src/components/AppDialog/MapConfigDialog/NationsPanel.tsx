'use client';

import { useMemo } from 'react';
import { useMapContext } from 'src/contexts/map.context';
import { TMapCell } from 'src/types/global';

type TProps = Record<string, never>;

export default function NationsPanel(_props: TProps) {
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
    const ethnicNameById = new Map(mesh.ethnicGroups.map((group) => [group.id, group.name]));
    return mesh.nations
      .map((nation) => {
        const nationCells = mesh.cells.filter(
          (cell) => cell.nationId === nation.id && !cell.isWater
        );
        const terrainStats = buildTerrainPercentages(nationCells);
        const ethnicCounts = new Map<number, number>();
        for (const cell of nationCells) {
          if (cell.ethnicGroupId === null) continue;
          ethnicCounts.set(cell.ethnicGroupId, (ethnicCounts.get(cell.ethnicGroupId) || 0) + 1);
        }
        const ethnicStats = Array.from(ethnicCounts.entries())
          .map(([ethnicId, count]) => ({
            ethnicId,
            name: ethnicNameById.get(ethnicId) || `Ethnic #${ethnicId}`,
            count,
            percent: Math.round((count / Math.max(1, nationCells.length)) * 100),
          }))
          .sort((a, b) => b.count - a.count);
        return {
          id: nation.id,
          name: nation.name,
          landCells: nationCells.length,
          capitalCellId: nation.capitalCellId,
          terrainStats,
          ethnicStats,
        };
      })
      .sort((a, b) => b.landCells - a.landCells);
  }, [mesh.cells, mesh.ethnicGroups, mesh.nations]);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Nations
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
              <span>Capital: {row.capitalCellId !== null ? `#${row.capitalCellId}` : 'None'}</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-300">
              <span className="font-medium text-slate-200">Terrain:</span>{' '}
              {row.terrainStats.map((entry) => `${entry.terrain} ${entry.percent}%`).join(', ')}
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              <span className="font-medium text-slate-200">Ethnic Coverage:</span>{' '}
              {row.ethnicStats
                .map((entry) => `${entry.name} (${entry.count} / ${entry.percent}%)`)
                .join(', ')}
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-xs text-slate-400">No nations generated.</p> : null}
      </div>
    </div>
  );
}
