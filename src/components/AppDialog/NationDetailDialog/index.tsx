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

  const populationRows = [
    `Total Population: ${data.totalPopulation.toLocaleString()} (${(
      data.totalPopulation / data.nationCells.length
    ).toFixed(2)} people per cell)`,
    `Total Economy: ${formatPopulation(data.totalEconomy)} (${(
      data.totalEconomy / Math.max(1, data.totalPopulation)
    ).toFixed(4)} per person)`,
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="supports-backdrop-filter:backdrop-blur-none"
        className="h-full w-full border border-white/15 bg-slate-950/60 text-slate-100 backdrop-blur-md"
      >
        <DialogHeader>
          <DialogTitle
            tabIndex={-1}
            className="font-bold outline-none"
            style={{ color: getNationColor(nation.id) }}
          >
            {nation.name}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            Nation #{nation.id} · Land Cells: {data.nationCells.length} · Capital:{' '}
            {nation.capitalCellId !== null ? `#${nation.capitalCellId}` : 'None'}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1 text-sm">
          <BlurCard title="Population">
            {populationRows.map((row) => (
              <div key={row}>{row}</div>
            ))}
          </BlurCard>
          <TerrainStatistic terrains={data.terrains} />
          <Population provinces={data.provinces} />
          <Ethnics ethnics={data.ethnics} />
          <BlurCard title="Economic Hub">
            {nation.economicHubIds.length > 0
              ? nation.economicHubIds.map((cellId) => `#${cellId}`).join(', ')
              : 'No economic hubs'}
          </BlurCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}
