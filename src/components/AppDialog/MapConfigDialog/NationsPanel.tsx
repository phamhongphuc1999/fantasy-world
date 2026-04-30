'use client';

import { useMemo } from 'react';
import { NATION_COLOR_PALETTE } from 'src/configs/mapConfig';
import { useMapContext } from 'src/contexts/map.context';

type TProps = Record<string, never>;

type TNationPopulationRow = {
  id: number;
  name: string;
  totalPopulation: number;
  provinces: Array<{
    provinceId: number;
    population: number;
    cellCount: number;
  }>;
};

function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function getNationColor(nationId: number) {
  const paletteIndex = Math.abs(nationId) % NATION_COLOR_PALETTE.length;
  return NATION_COLOR_PALETTE[paletteIndex];
}

export default function NationsPanel(_props: TProps) {
  const { mesh } = useMapContext();

  const totalPopulation = useMemo(() => {
    return mesh.cells.reduce((sum, cell) => sum + Math.max(0, cell.population || 0), 0);
  }, [mesh.cells]);

  const nationRows = useMemo<TNationPopulationRow[]>(() => {
    return mesh.nations
      .map((nation) => {
        const nationLandCells = mesh.cells.filter(
          (cell) => cell.nationId === nation.id && !cell.isWater
        );

        const provincePopulationMap = new Map<number, number>();
        const provinceCellCountMap = new Map<number, number>();
        let nationPopulation = 0;

        for (const cell of nationLandCells) {
          const cellPopulation = Math.max(0, cell.population || 0);
          nationPopulation += cellPopulation;
          if (cell.provinceId === null) continue;
          provincePopulationMap.set(
            cell.provinceId,
            (provincePopulationMap.get(cell.provinceId) || 0) + cellPopulation
          );
          provinceCellCountMap.set(
            cell.provinceId,
            (provinceCellCountMap.get(cell.provinceId) || 0) + 1
          );
        }

        const provinces = Array.from(provincePopulationMap.entries())
          .map(([provinceId, population]) => ({
            provinceId,
            population,
            cellCount: provinceCellCountMap.get(provinceId) || 0,
          }))
          .sort((a, b) => b.population - a.population);

        return {
          id: nation.id,
          name: nation.name,
          totalPopulation: nationPopulation,
          provinces,
        };
      })
      .sort((a, b) => b.totalPopulation - a.totalPopulation);
  }, [mesh.cells, mesh.nations]);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Nations
      </span>

      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
        <span className="font-semibold text-emerald-200">Total Population:</span>{' '}
        {formatPopulation(totalPopulation)}
      </div>

      <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
        {nationRows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-3 rounded-full border border-white/25"
                  style={{ backgroundColor: getNationColor(row.id) }}
                  title={getNationColor(row.id)}
                />
                <span className="font-semibold text-slate-100">{row.name}</span>
              </div>
              <span className="text-slate-400">#{row.id}</span>
            </div>

            <div className="mt-1 text-[11px] text-slate-200">
              <span className="font-medium">Nation Population:</span>{' '}
              {formatPopulation(row.totalPopulation)}
            </div>

            <div className="mt-2 space-y-1 text-[11px] text-slate-300">
              <span className="font-medium text-slate-200">Province Population:</span>
              {row.provinces.length > 0 ? (
                row.provinces.map((province) => (
                  <div
                    key={`${row.id}-${province.provinceId}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      Province #{province.provinceId} ({province.cellCount} cells)
                    </span>
                    <span>{formatPopulation(province.population)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No provinces</p>
              )}
            </div>
          </div>
        ))}

        {nationRows.length === 0 ? (
          <p className="text-xs text-slate-400">No nations generated.</p>
        ) : null}
      </div>
    </div>
  );
}
