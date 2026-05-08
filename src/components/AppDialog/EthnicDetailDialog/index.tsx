'use client';

import BlurCard from 'src/components/BlurCard';
import PieChart from 'src/components/charts/PieChart';
import TerrainStatistic from 'src/components/TerrainStatistic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
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

  if (!data) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[min(52rem,calc(100vw-1rem))] border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md sm:max-w-[min(52rem,calc(100vw-1rem))]">
          <DialogHeader>
            <DialogTitle>Ethnic Detail</DialogTitle>
            <DialogDescription className="text-slate-300">
              No ethnic group selected.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md sm:max-w-[45vw]"
      >
        <DialogHeader>
          <DialogTitle className="font-bold" style={{ color: getNationColor(data.ethnics.id) }}>
            {data.ethnics.name}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Ethnic #{data.ethnics.id} · Land Cells: {data.ethnicCells.length}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <BlurCard title="Population">
            Total Population: {formatPopulation(data.totalPopulation)} (
            {(data.totalPopulation / Math.max(1, data.ethnicCells.length)).toFixed(2)} people per
            cell)
          </BlurCard>
          <BlurCard title="Population By Nation">
            {data.nations.length > 0 ? (
              <div className="flex justify-center">
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
            ) : (
              <p className="text-slate-500">No nation coverage</p>
            )}
          </BlurCard>
          <TerrainStatistic terrains={data.terrains} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
