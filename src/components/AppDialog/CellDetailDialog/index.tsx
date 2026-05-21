'use client';

import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import TerrainStatistic from 'src/components/TerrainStatistic';
import { Button } from 'src/components/ui/button';
import { ButtonGroup } from 'src/components/ui/button-group';
import useEthnicStatistic from 'src/hooks/useEthnicStatistic';
import useNationStatistic from 'src/hooks/useNationStatistic';
import { formatPopulation, getNationColor } from 'src/services/utils';
import { TDelaunayMesh } from 'src/types/map.types';
import EthnicGroups from './EthnicGroups';
import EthnicMiniMap from './EthnicMiniMap';
import EthnicNations from './EthnicNations';
import NationMiniMap from './NationMiniMap';
import NationPopulation from './NationPopulation';

type TView = 'nation' | 'ethnic';

type TProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nationId: number | null;
  ethnicId: number | null;
  mesh: TDelaunayMesh;
};

export default function CellDetailDialog({ open, onOpenChange, nationId, ethnicId, mesh }: TProps) {
  const { nation, data: nationData } = useNationStatistic(nationId, mesh);
  const { data: ethnicData } = useEthnicStatistic(ethnicId, mesh);
  const [view, setView] = useState<TView>('nation');

  const hasNation = nation !== undefined && nationData !== undefined;
  const hasEthnic = ethnicData !== null;

  // Set default view based on availability
  useEffect(() => {
    if (!hasNation && hasEthnic) {
      setView('ethnic');
    } else if (hasNation) {
      setView('nation');
    }
  }, [hasNation, hasEthnic]);

  if (!open) return null;

  if (!hasNation && !hasEthnic) {
    return (
      <div className="fantasy-glass-strong fixed inset-0 z-50 flex items-center justify-center">
        <section className="fantasy-panel relative w-[min(36rem,calc(100vw-2rem))] p-6">
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
          <h2 className="text-lg font-medium">Cell Detail</h2>
          <p className="fantasy-text-muted mt-2 text-sm">No data available for this cell.</p>
        </section>
      </div>
    );
  }

  const views: { key: TView; label: string; available: boolean }[] = [
    { key: 'nation', label: 'Nation', available: hasNation },
    { key: 'ethnic', label: 'Ethnic', available: hasEthnic },
  ];

  const availableViews = views.filter((v) => v.available);

  return (
    <div className="fantasy-glass-strong fixed inset-0 z-50">
      <section className="fantasy-glass-strong relative mx-auto flex h-dvh w-dvw flex-col md:my-4 md:h-[calc(100dvh-2rem)] md:w-[min(72rem,calc(100dvw-2rem))] md:rounded-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            {view === 'nation' && nation && nationData && (
              <>
                <h2
                  className="truncate text-lg font-bold"
                  style={{ color: getNationColor(nation.id) }}
                >
                  {nation.name}
                </h2>
                <p className="fantasy-text-muted truncate text-sm">
                  Nation #{nation.id} · {nationData.nationCells.length.toLocaleString()} cells ·{' '}
                  {formatPopulation(nationData.totalPopulation)} people
                </p>
              </>
            )}
            {view === 'ethnic' && ethnicData && (
              <>
                <h2
                  className="truncate text-lg font-bold"
                  style={{ color: getNationColor(ethnicData.ethnics.id) }}
                >
                  {ethnicData.ethnics.name}
                </h2>
                <p className="fantasy-text-muted truncate text-sm">
                  Ethnic #{ethnicData.ethnics.id} · {ethnicData.ethnicCells.length.toLocaleString()}{' '}
                  cells · {formatPopulation(ethnicData.totalPopulation)} people
                </p>
              </>
            )}
          </div>
          <div className="ml-3 flex shrink-0 items-center gap-2">
            {availableViews.length > 1 && (
              <ButtonGroup>
                {availableViews.map((v) => (
                  <Button
                    key={v.key}
                    size="xs"
                    variant={view === v.key ? 'default' : 'ghost'}
                    onClick={() => setView(v.key)}
                  >
                    {v.label}
                  </Button>
                ))}
              </ButtonGroup>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm md:p-6">
          {view === 'nation' && nationData && nation && (
            <>
              <NationMiniMap nationId={nation.id} mesh={mesh} />

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <BlurCard title="Population">
                  <p className="mt-1 text-lg font-bold text-cyan-300">
                    {formatPopulation(nationData.totalPopulation)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(nationData.totalPopulation / nationData.nationCells.length).toFixed(1)} / cell
                  </p>
                </BlurCard>
                <BlurCard title="Economy">
                  <p className="mt-1 text-lg font-bold text-amber-300">
                    {formatPopulation(nationData.totalEconomy)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(nationData.totalEconomy / Math.max(1, nationData.totalPopulation)).toFixed(2)}{' '}
                    / person
                  </p>
                </BlurCard>
                <BlurCard title="Capital">
                  <p className="mt-1 text-base font-medium">
                    {nation && nation.capitalCellId !== null
                      ? `Cell #${nation.capitalCellId}`
                      : 'None'}
                  </p>
                </BlurCard>
                <BlurCard title="Economic Hubs">
                  <p className="mt-1 text-base font-medium">
                    {nation && nation.economicHubIds.length > 0
                      ? nation.economicHubIds.length
                      : 'None'}
                  </p>
                </BlurCard>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TerrainStatistic title="Landform" data={nationData.landforms} />
                <TerrainStatistic title="Biome" data={nationData.biomes} />
              </div>

              <NationPopulation provinces={nationData.provinces} />
              <EthnicGroups ethnics={nationData.ethnics} />
            </>
          )}
          {view === 'ethnic' && ethnicData && (
            <>
              <EthnicMiniMap ethnicId={ethnicData.ethnics.id} mesh={mesh} />

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <BlurCard title="Population">
                  <p className="mt-1 text-lg font-bold text-cyan-300">
                    {formatPopulation(ethnicData.totalPopulation)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(
                      ethnicData.totalPopulation / Math.max(1, ethnicData.ethnicCells.length)
                    ).toFixed(1)}{' '}
                    / cell
                  </p>
                </BlurCard>
                <BlurCard title="Land Cells">
                  <p className="mt-1 text-lg font-bold text-sky-300">
                    {ethnicData.ethnicCells.length.toLocaleString()}
                  </p>
                </BlurCard>
                <BlurCard title="Nations Spanned">
                  <p className="mt-1 text-lg font-bold text-amber-300">
                    {ethnicData.nations.length}
                  </p>
                </BlurCard>
                <BlurCard title="Avg Pop / Cell">
                  <p className="mt-1 text-lg font-bold text-emerald-300">
                    {(
                      ethnicData.totalPopulation / Math.max(1, ethnicData.ethnicCells.length)
                    ).toFixed(0)}
                  </p>
                </BlurCard>
              </div>

              <EthnicNations nations={ethnicData.nations} />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TerrainStatistic title="Landform" data={ethnicData.landforms} />
                <TerrainStatistic title="Biome" data={ethnicData.biomes} />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
