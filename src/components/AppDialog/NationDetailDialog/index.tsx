'use client';

import { XIcon } from 'lucide-react';
import BlurCard from 'src/components/BlurCard';
import TerrainStatistic from 'src/components/TerrainStatistic';
import { Button } from 'src/components/ui/button';
import useNationStatistic from 'src/hooks/useNationStatistic';
import { formatPopulation, getNationColor } from 'src/services/utils';
import { TDelaunayMesh } from 'src/types/map.types';
import Ethnics from './Ethnics';
import Population from './Population';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nationId: number | null;
  mesh: TDelaunayMesh;
};

function EmptyDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm">
      <section className="relative w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-white/15 bg-slate-950/60 p-6 text-slate-100 backdrop-blur-md">
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
        <h2 className="text-lg font-medium">Nation Detail</h2>
        <p className="mt-2 text-sm text-slate-400">No nation selected.</p>
      </section>
    </div>
  );
}

export default function NationDetailDialog({ open, onOpenChange, nationId, mesh }: TProps) {
  const { nation, data } = useNationStatistic(nationId, mesh);

  if (!open) return null;

  if (!nation || !data) return <EmptyDialog onOpenChange={onOpenChange} />;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm">
      <section className="relative mx-auto flex h-dvh w-dvw flex-col border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md md:my-4 md:h-[calc(100dvh-2rem)] md:w-[min(72rem,calc(100dvw-2rem))] md:rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold" style={{ color: getNationColor(nation.id) }}>
              {nation.name}
            </h2>
            <p className="truncate text-sm text-slate-400">
              Nation #{nation.id} · {data.nationCells.length.toLocaleString()} cells ·{' '}
              {formatPopulation(data.totalPopulation)} people
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="ml-3 shrink-0"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm md:p-6">
          {/* Summary cards row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <BlurCard title="Population">
              <p className="mt-1 text-lg font-bold text-cyan-300">
                {formatPopulation(data.totalPopulation)}
              </p>
              <p className="text-xs text-slate-500">
                {(data.totalPopulation / data.nationCells.length).toFixed(1)} / cell
              </p>
            </BlurCard>
            <BlurCard title="Economy">
              <p className="mt-1 text-lg font-bold text-amber-300">
                {formatPopulation(data.totalEconomy)}
              </p>
              <p className="text-xs text-slate-500">
                {(data.totalEconomy / Math.max(1, data.totalPopulation)).toFixed(2)} / person
              </p>
            </BlurCard>
            <BlurCard title="Capital">
              <p className="mt-1 text-base font-medium">
                {nation.capitalCellId !== null ? `Cell #${nation.capitalCellId}` : 'None'}
              </p>
            </BlurCard>
            <BlurCard title="Economic Hubs">
              <p className="mt-1 text-base font-medium">
                {nation.economicHubIds.length > 0 ? nation.economicHubIds.length : 'None'}
              </p>
            </BlurCard>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TerrainStatistic title="Landform" data={data.landforms} />
            <TerrainStatistic title="Biome" data={data.biomes} />
          </div>

          <Population provinces={data.provinces} />
          <Ethnics ethnics={data.ethnics} />
        </div>
      </section>
    </div>
  );
}
