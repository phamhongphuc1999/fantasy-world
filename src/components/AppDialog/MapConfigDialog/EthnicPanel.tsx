'use client';

import { useMemo } from 'react';
import { useMapContext } from 'src/contexts/map.context';
import { formatPopulation } from 'src/utils/mapPanelHelpers';

type TProps = Record<string, never>;

type TEthnicPopulationRow = {
  id: number;
  name: string;
  totalPopulation: number;
};

export default function EthnicPanel(_props: TProps) {
  const { mesh } = useMapContext();

  const rows = useMemo<TEthnicPopulationRow[]>(() => {
    return mesh.ethnicGroups
      .map((group) => {
        const cells = mesh.cells.filter((cell) => cell.ethnicGroupId === group.id && !cell.isWater);
        const nationPopulationMap = new Map<number, number>();
        let ethnicPopulation = 0;

        for (const cell of cells) {
          ethnicPopulation += cell.population;
          if (cell.nationId === null) continue;
          nationPopulationMap.set(
            cell.nationId,
            (nationPopulationMap.get(cell.nationId) || 0) + cell.population
          );
        }

        return { id: group.id, name: group.name, totalPopulation: ethnicPopulation };
      })
      .sort((a, b) => b.totalPopulation - a.totalPopulation);
  }, [mesh.cells, mesh.ethnicGroups]);

  return (
    <div>
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

            <div className="mt-1 text-[11px] text-slate-200">
              <span className="font-medium">Ethnic Population:</span>{' '}
              {formatPopulation(row.totalPopulation)}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-slate-400">No ethnic groups generated.</p>}
      </div>
    </div>
  );
}
