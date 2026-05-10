'use client';

import BlurCard from 'src/components/BlurCard';
import TerrainStatistic from 'src/components/TerrainStatistic';
import { XIcon } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import useNationStatistic from 'src/hooks/useNationStatistic';
import { getNationColor } from 'src/services/rendering/colors';
import { formatPopulation } from 'src/services/utils/format';
import { TDelaunayMesh } from 'src/types/map.types';
import Ethnics from './Ethnics';
import Population from './Population';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nationId: number | null;
  mesh: TDelaunayMesh;
};

export default function NationDetailDialog({ open, onOpenChange, nationId, mesh }: TProps) {
  const { nation, data } = useNationStatistic(nationId, mesh);

  if (!open) return null;

  if (!nation || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
        <section className="relative h-dvh w-dvw border border-white/15 bg-slate-950/60 p-4 text-slate-100 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            className="absolute top-2 right-2"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
          <h2 className="text-base font-medium">Nation Detail</h2>
          <p className="mt-2 text-sm text-slate-300">No nation selected.</p>
        </section>
      </div>
    );
  }

  const populationRows = [
    `Total Population: ${data.totalPopulation.toLocaleString()} (${(
      data.totalPopulation / data.nationCells.length
    ).toFixed(2)} people per cell)`,
    `Total Economy: ${formatPopulation(data.totalEconomy)} (${(
      data.totalEconomy / Math.max(1, data.totalPopulation)
    ).toFixed(4)} per person)`,
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
      <section className="relative flex h-dvh min-h-0 w-dvw flex-col border border-white/15 bg-slate-950/60 p-4 text-slate-100 backdrop-blur-md">
        <Button
          type="button"
          variant="ghost"
          className="absolute top-2 right-2"
          size="icon-sm"
          onClick={() => onOpenChange(false)}
        >
          <XIcon />
          <span className="sr-only">Close</span>
        </Button>
        <header className="mb-3 flex flex-col gap-2">
          <h2 className="text-base font-bold" style={{ color: getNationColor(nation.id) }}>
            {nation.name}
          </h2>
          <p className="text-sm text-slate-300">
            Nation #{nation.id} · Land Cells: {data.nationCells.length} · Capital:{' '}
            {nation.capitalCellId !== null ? `#${nation.capitalCellId}` : 'None'}
          </p>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
          <BlurCard title="Population">
            {populationRows.map((row) => (
              <div key={row}>{row}</div>
            ))}
          </BlurCard>
          <TerrainStatistic title="Landform" terrains={data.landforms} />
          <TerrainStatistic title="Biome" terrains={data.biomes} />
          <Population provinces={data.provinces} />
          <Ethnics ethnics={data.ethnics} />
          <BlurCard title="Economic Hub">
            {nation.economicHubIds.length > 0
              ? nation.economicHubIds.map((cellId) => `#${cellId}`).join(', ')
              : 'No economic hubs'}
          </BlurCard>
        </div>
      </section>
    </div>
  );
}
