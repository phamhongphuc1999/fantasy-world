'use client';

import BlurCard from 'src/components/BlurCard';
import TerrainStatistic from 'src/components/TerrainStatistic';
import useNationStatistic from 'src/hooks/useNationStatistic';
import { formatPopulation } from 'src/services/utils';
import { TDelaunayMesh, TNation } from 'src/types/map.types';
import EthnicGroups from './EthnicGroups';
import NationMiniMap from './NationMiniMap';
import NationPopulation from './NationPopulation';

type TNationData = NonNullable<ReturnType<typeof useNationStatistic>['data']>;

type TProps = {
  nation: TNation;
  data: TNationData;
  mesh: TDelaunayMesh;
};

export default function NationDetail({ nation, data, mesh }: TProps) {
  return (
    <>
      <NationMiniMap nationId={nation.id} mesh={mesh} />

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

      <NationPopulation provinces={data.provinces} />
      <EthnicGroups ethnics={data.ethnics} />
    </>
  );
}
