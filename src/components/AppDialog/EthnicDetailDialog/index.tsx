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
import useEthnicStatistic from 'src/hooks/useEthnicStatistic';
import { TMapMeshWithDelaunay } from 'src/types/map.types';
import { formatPopulation, getNationColor } from 'src/utils/mapPanelHelpers';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ethnicGroupId: number | null;
  mesh: TMapMeshWithDelaunay;
};

export default function EthnicDetailDialog({ open, onOpenChange, ethnicGroupId, mesh }: TProps) {
  const { data } = useEthnicStatistic(ethnicGroupId, mesh);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md sm:max-w-[45vw]"
      >
        <DialogHeader>
          <DialogTitle className="font-bold" style={{ color: getNationColor(data.ethnicGroup.id) }}>
            {data.ethnicGroup.name}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Ethnic #{data.ethnicGroup.id} · Land Cells: {data.ethnicCells.length}
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
              data.nations.map((item) => (
                <div key={item.nationId} className="flex items-center justify-between gap-2">
                  <span className="font-bold" style={{ color: getNationColor(item.nationId) }}>
                    {item.nationName}
                  </span>
                  <span>
                    {formatPopulation(item.population)} (
                    {((item.population / data.totalPopulation) * 100).toFixed(2)}%)
                  </span>
                </div>
              ))
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
