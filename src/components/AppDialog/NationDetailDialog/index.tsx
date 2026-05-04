'use client';

import BlurCard from 'src/components/BlurCard';
import TerrainStatistic from 'src/components/TerrainStatistic';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import useNationStatistic from 'src/hooks/useNationStatistic';
import { formatPopulation, getNationColor } from 'src/services';
import { TMapMeshWithDelaunay } from 'src/types/map.types';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nationId: number | null;
  mesh: TMapMeshWithDelaunay;
};

export default function NationDetailDialog({ open, onOpenChange, nationId, mesh }: TProps) {
  const { nation, data } = useNationStatistic(nationId, mesh);

  if (!nation || !data) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[min(52rem,calc(100vw-1rem))] border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md sm:max-w-[min(52rem,calc(100vw-1rem))]">
          <DialogHeader>
            <DialogTitle>Nation Detail</DialogTitle>
            <DialogDescription className="text-slate-300">No nation selected.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md sm:max-w-[45vw]"
      >
        <DialogHeader>
          <DialogTitle className="font-bold" style={{ color: getNationColor(nation.id) }}>
            {nation.name}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Nation #{nation.id} · Land Cells: {data.nationCells.length} · Capital:{' '}
            {nation.capitalCellId !== null ? `#${nation.capitalCellId}` : 'None'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <BlurCard title="Population">
            Total Population: {data.totalPopulation.toLocaleString()} (
            {(data.totalPopulation / data.nationCells.length).toFixed(2)} people per cell)
          </BlurCard>
          <TerrainStatistic terrains={data.terrains} />
          <BlurCard title="Population">
            {data.provinces.length > 0 ? (
              data.provinces.map((province) => (
                <div key={province.provinceId} className="flex items-center justify-between gap-2">
                  <span>
                    Province #{province.provinceId} ({province.cellCount} cells)
                  </span>
                  <span>{formatPopulation(province.population)}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No provinces</p>
            )}
          </BlurCard>
          <BlurCard title="Ethnic">
            {data.ethnics.map((item) => (
              <div key={item.ethnicId}>
                <span className="font-bold" style={{ color: getNationColor(item.ethnicId) }}>
                  {item.name}:{' '}
                </span>
                <span>
                  {item.count} cells ({item.percent}%), <span className="font-bold">Pop</span>{' '}
                  {item.population.toLocaleString()} ({item.populationPercent}%)
                </span>
              </div>
            ))}
            {data.ethnics.length === 0 && (
              <div className="text-slate-400">No ethnic data in this nation.</div>
            )}
          </BlurCard>
          <BlurCard title="Economic Hub">
            {nation.economicHubCellIds.length > 0
              ? nation.economicHubCellIds.map((cellId) => `#${cellId}`).join(', ')
              : 'No economic hubs'}
          </BlurCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}
