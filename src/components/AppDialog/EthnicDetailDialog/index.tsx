'use client';

import BlurCard from 'src/components/BlurCard';
import PieChart from 'src/components/charts/PieChart';
import TerrainStatistic from 'src/components/TerrainStatistic';
import { XIcon } from 'lucide-react';
import { Button } from 'src/components/ui/button';
import useEthnicStatistic from 'src/hooks/useEthnicStatistic';
import { getNationColor } from 'src/services/rendering/colors';
import { formatPopulation } from 'src/services/utils/format';
import { TPieChartData } from 'src/types/global';
import { TDelaunayMesh } from 'src/types/map.types';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ethnicId: number | null;
  mesh: TDelaunayMesh;
};

export default function EthnicDetailDialog({ open, onOpenChange, ethnicId, mesh }: TProps) {
  const { data } = useEthnicStatistic(ethnicId, mesh);
  if (!open) return null;

  if (!data) {
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
          <h2 className="text-base font-medium">Ethnic Detail</h2>
          <p className="mt-2 text-sm text-slate-300">No ethnic group selected.</p>
        </section>
      </div>
    );
  }

  const nationPopulationPieData: Array<TPieChartData & { nationName: string }> = data.nations.map(
    (item) => ({
      label: item.nationName,
      value: item.population,
      color: getNationColor(item.nationId),
      nationName: item.nationName,
    })
  );
  const nationLegend = nationPopulationPieData.map((item) => ({
    label: item.nationName,
    color: item.color,
  }));

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
          <h2 className="text-base font-bold" style={{ color: getNationColor(data.ethnics.id) }}>
            {data.ethnics.name}
          </h2>
          <p className="text-sm text-slate-300">
            Ethnic #{data.ethnics.id} · Land Cells: {data.ethnicCells.length}
          </p>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-sm">
          <BlurCard title="Population">
            Total Population: {formatPopulation(data.totalPopulation)} (
            {(data.totalPopulation / Math.max(1, data.ethnicCells.length)).toFixed(2)} people per
            cell)
          </BlurCard>
          <BlurCard title="Population By Nation">
            {data.nations.length > 0 ? (
              <div className="mt-2 space-y-3">
                <div className="flex flex-wrap justify-center gap-2">
                  {nationLegend.map((item) => (
                    <div
                      key={`legend-shared-${item.label}`}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-slate-900/45 px-2 py-1 text-[11px] text-slate-200"
                    >
                      <span
                        className="inline-block size-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-start justify-center gap-4">
                  <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
                    <p className="mb-2 text-center text-xs font-bold text-slate-300">
                      Population (%)
                    </p>
                    <PieChart
                      width={320}
                      height={320}
                      data={nationPopulationPieData}
                      renderTooltip={(tooltip) => (
                        <>
                          <div className="font-bold">{tooltip.datum.nationName}</div>
                          <div>
                            <span className="font-bold">Population</span>:{' '}
                            {formatPopulation(tooltip.value)}
                          </div>
                          <div>
                            <span className="font-bold">Percent</span>: {tooltip.percent}%
                          </div>
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">No nation coverage</p>
            )}
          </BlurCard>
          <TerrainStatistic terrains={data.terrains} />
        </div>
      </section>
    </div>
  );
}
