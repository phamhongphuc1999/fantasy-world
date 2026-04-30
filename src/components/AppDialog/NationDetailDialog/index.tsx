'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import useNationStatistic from 'src/hooks/useNationStatistic';
import { TMapMeshWithDelaunay } from 'src/types/global';
import NationStatistic from './NationStatistic';

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
      <DialogContent className="border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md sm:max-w-[45vw]">
        <DialogHeader>
          <DialogTitle className="font-bold">{nation.name}</DialogTitle>
          <DialogDescription className="text-slate-300">
            Nation #{nation.id} · Land Cells: {data.nationCells.length} · Capital:{' '}
            {nation.capitalCellId !== null ? `#${nation.capitalCellId}` : 'None'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <NationStatistic
            nation={nation}
            totalPopulation={data.totalPopulation}
            terrainStats={data.terrainStats}
            ethnicStats={data.ethnicStats}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
