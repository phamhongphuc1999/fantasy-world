'use client';

import { useMemo } from 'react';
import { NATION_COLOR_PALETTE } from 'src/configs/mapConfig';
import { useMapContext } from 'src/contexts/map.context';
import { TMapCell } from 'src/types/global';

type TProps = Record<string, never>;

type TEthnicPopulationRow = {
  id: number;
  name: string;
  totalPopulation: number;
  terrainStats: Array<{
    terrain: string;
    percent: number;
    count: number;
  }>;
  nations: Array<{
    nationId: number;
    nationName: string;
    population: number;
  }>;
};

function formatPopulation(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function getNationColor(nationId: number) {
  const paletteIndex = Math.abs(nationId) % NATION_COLOR_PALETTE.length;
  return NATION_COLOR_PALETTE[paletteIndex];
}

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

export default function EthnicRegionsPanel(_props: TProps) {
  const { mesh } = useMapContext();

  const totalPopulation = useMemo(() => {
    return mesh.cells.reduce((sum, cell) => sum + Math.max(0, cell.population || 0), 0);
  }, [mesh.cells]);

  const rows = useMemo<TEthnicPopulationRow[]>(() => {
    const nationNameById = new Map(mesh.nations.map((nation) => [nation.id, nation.name]));

    return mesh.ethnicGroups
      .map((group) => {
        const cells = mesh.cells.filter((cell) => cell.ethnicGroupId === group.id && !cell.isWater);
        const nationPopulationMap = new Map<number, number>();
        let ethnicPopulation = 0;

        for (const cell of cells) {
          const cellPopulation = Math.max(0, cell.population || 0);
          ethnicPopulation += cellPopulation;
          if (cell.nationId === null) continue;
          nationPopulationMap.set(
            cell.nationId,
            (nationPopulationMap.get(cell.nationId) || 0) + cellPopulation
          );
        }

        const nations = Array.from(nationPopulationMap.entries())
          .map(([nationId, population]) => ({
            nationId,
            nationName: nationNameById.get(nationId) || `Nation #${nationId}`,
            population,
          }))
          .sort((a, b) => b.population - a.population);

        return {
          id: group.id,
          name: group.name,
          totalPopulation: ethnicPopulation,
          terrainStats: buildTerrainPercentages(cells),
          nations,
        };
      })
      .sort((a, b) => b.totalPopulation - a.totalPopulation);
  }, [mesh.cells, mesh.ethnicGroups, mesh.nations]);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <span className="block text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
        Ethnic Regions
      </span>

      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
        <span className="font-semibold text-emerald-200">Total Population:</span>{' '}
        {formatPopulation(totalPopulation)}
      </div>

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

            <div className="mt-1 text-[11px] text-slate-300">
              <span className="font-medium text-slate-200">Terrain:</span>{' '}
              {row.terrainStats.map((entry) => `${entry.terrain} ${entry.percent}%`).join(', ')}
            </div>

            <div className="mt-2 space-y-1 text-[11px] text-slate-300">
              <span className="font-medium text-slate-200">Population By Nation:</span>
              {row.nations.length > 0 ? (
                row.nations.map((nation) => (
                  <div
                    key={`${row.id}-${nation.nationId}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block size-2.5 rounded-full border border-white/25"
                        style={{ backgroundColor: getNationColor(nation.nationId) }}
                        title={getNationColor(nation.nationId)}
                      />
                      <span>{nation.nationName}</span>
                    </span>
                    <span>{formatPopulation(nation.population)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No nation coverage</p>
              )}
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
