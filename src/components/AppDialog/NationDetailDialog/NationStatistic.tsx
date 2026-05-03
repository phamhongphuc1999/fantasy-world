import BlurCard from 'src/components/BlurCard';
import { TERRAIN_COLORS, TERRAIN_ICONS } from 'src/configs/constance';
import {
  TEthnicStatistic,
  TNation,
  TProvinceStatistic,
  TTerrainBand,
  TTerrainStatistic,
} from 'src/types/map.types';
import { formatPopulation } from 'src/utils/mapPanelHelpers';

interface TProps {
  nation: TNation;
  totalPopulation: number;
  numberOfCells: number;
  terrainStats: Array<TTerrainStatistic>;
  ethnicStats: Array<TEthnicStatistic>;
  provinceStats: Array<TProvinceStatistic>;
}

export default function NationStatistic(props: TProps) {
  const { nation, totalPopulation, numberOfCells, terrainStats, ethnicStats, provinceStats } =
    props;

  return (
    <>
      <BlurCard title="Population">
        Total Population: {totalPopulation.toLocaleString()} (
        {(totalPopulation / numberOfCells).toFixed(2)} people per cell)
      </BlurCard>
      <BlurCard title="Terrain">
        {terrainStats.map((item) => {
          return (
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
          );
        })}
      </BlurCard>
      <BlurCard title="Population">
        {provinceStats.length > 0 ? (
          provinceStats.map((province) => (
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
        {ethnicStats.map((item) => (
          <div key={item.ethnicId}>
            <span className="font-bold">{item.name}: </span>
            <span>
              {item.count} cells ({item.percent}%), <span className="font-bold">Pop</span>{' '}
              {item.population.toLocaleString()} ({item.populationPercent}%)
            </span>
          </div>
        ))}
        {ethnicStats.length === 0 && (
          <div className="text-slate-400">No ethnic data in this nation.</div>
        )}
      </BlurCard>
      <BlurCard title="Economic Hub">
        {nation.economicHubCellIds.length > 0
          ? nation.economicHubCellIds.map((cellId) => `#${cellId}`).join(', ')
          : 'No economic hubs'}
      </BlurCard>
    </>
  );
}
