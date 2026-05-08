'use client';

import { useMemo } from 'react';
import { useMapContext } from 'src/contexts/map.context';
import { getNationColor } from 'src/services/rendering/colors';
import { formatPopulation } from 'src/services/utils/format';
import { sumCellPopulation } from 'src/services/utils/stats';

type TProps = Record<string, never>;

type TNationPopulationRow = {
  id: number;
  name: string;
  totalPopulation: number;
};

export default function NationsPanel(_props: TProps) {
  const { mesh } = useMapContext();

  const totalPopulation = useMemo(() => {
    return sumCellPopulation(mesh.cells);
  }, [mesh.cells]);

  const nationRows = useMemo<TNationPopulationRow[]>(() => {
    return mesh.nations
      .map((nation) => {
        const nationLandCells = mesh.cells.filter(
          (cell) => cell.nationId === nation.id && !cell.isWater
        );

        let nationPopulation = 0;

        for (const cell of nationLandCells) {
          nationPopulation += cell.population;
        }
        return { id: nation.id, name: nation.name, totalPopulation: nationPopulation };
      })
      .sort((a, b) => b.totalPopulation - a.totalPopulation);
  }, [mesh.cells, mesh.nations]);

  return (
    <div>
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
        <span className="font-semibold text-emerald-200">Total Population:</span>{' '}
        {formatPopulation(totalPopulation)}
      </div>
      <div className="mt-2 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {nationRows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-200"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold" style={{ color: getNationColor(row.id) }}>
                {row.name}
              </span>
              <span className="text-slate-400">#{row.id}</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-200">
              <span className="font-medium">Nation Population:</span>{' '}
              {formatPopulation(row.totalPopulation)}
            </div>
          </div>
        ))}
        {nationRows.length === 0 && <p className="text-xs text-slate-400">No nations generated.</p>}
      </div>
    </div>
  );
}
