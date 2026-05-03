'use client';

import { useMemo } from 'react';
import BlurCard from 'src/components/BlurCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import { TERRAIN_COLORS, TERRAIN_ICONS } from 'src/configs/constance';
import { TMapMeshWithDelaunay, TTerrainBand } from 'src/types/map.types';
import { formatPopulation } from 'src/utils/mapPanelHelpers';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ethnicGroupId: number | null;
  mesh: TMapMeshWithDelaunay;
};

export default function EthnicDetailDialog({ open, onOpenChange, ethnicGroupId, mesh }: TProps) {
  const data = useMemo(() => {
    if (ethnicGroupId === null) return null;
    const ethnicGroup = mesh.ethnicGroups.find((group) => group.id === ethnicGroupId);
    if (!ethnicGroup) return null;

    const ethnicCells = mesh.cells.filter(
      (cell) => !cell.isWater && cell.ethnicGroupId === ethnicGroupId
    );
    const totalPopulation = ethnicCells.reduce(
      (sum, cell) => sum + Math.max(0, cell.population || 0),
      0
    );

    const nationNameById = new Map(mesh.nations.map((nation) => [nation.id, nation.name]));
    const populationByNation = new Map<number, number>();
    const terrainCount = new Map<string, number>();

    for (const cell of ethnicCells) {
      if (cell.nationId !== null) {
        populationByNation.set(
          cell.nationId,
          (populationByNation.get(cell.nationId) || 0) + Math.max(0, cell.population || 0)
        );
      }
      terrainCount.set(cell.terrain, (terrainCount.get(cell.terrain) || 0) + 1);
    }

    const nationPopulationStats = Array.from(populationByNation.entries())
      .map(([nationId, population]) => ({
        nationId,
        nationName: nationNameById.get(nationId) || `Nation #${nationId}`,
        population,
      }))
      .sort((a, b) => b.population - a.population);

    const terrainStats = Array.from(terrainCount.entries())
      .map(([terrain, count]) => ({
        terrain,
        count,
        percent: Number(((count / Math.max(1, ethnicCells.length)) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.count - a.count);

    return { ethnicGroup, ethnicCells, totalPopulation, nationPopulationStats, terrainStats };
  }, [ethnicGroupId, mesh.cells, mesh.ethnicGroups, mesh.nations]);

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
          <DialogTitle className="font-bold">{data.ethnicGroup.name}</DialogTitle>
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
            {data.nationPopulationStats.length > 0 ? (
              data.nationPopulationStats.map((item) => (
                <div key={item.nationId} className="flex items-center justify-between gap-2">
                  <span>{item.nationName}</span>
                  <span>{formatPopulation(item.population)}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No nation coverage</p>
            )}
          </BlurCard>
          <BlurCard title="Terrain">
            {data.terrainStats.map((item) => (
              <div key={item.terrain} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: TERRAIN_COLORS[item.terrain as TTerrainBand] }}
                  />
                  <span className="font-bold">
                    {item.terrain.replace('-', ' ')} {TERRAIN_ICONS[item.terrain as TTerrainBand]}
                  </span>
                </div>
                <span>
                  {item.count} cells ({item.percent}%)
                </span>
              </div>
            ))}
          </BlurCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}
