import { TEthnicStatistic, TNation, TTerrainStatistic } from 'src/types/global';

interface TProps {
  nation: TNation;
  totalPopulation: number;
  terrainStats: Array<TTerrainStatistic>;
  ethnicStats: Array<TEthnicStatistic>;
}

export default function NationStatistic({
  nation,
  totalPopulation,
  terrainStats,
  ethnicStats,
}: TProps) {
  return (
    <>
      <section className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-slate-200">
        <h4 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Population</h4>
        <div className="mt-2">Total Population: {totalPopulation.toLocaleString()}</div>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
        <h4 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
          Terrain Mix
        </h4>
        <div className="mt-2 space-y-1 text-slate-200">
          {terrainStats.map((item) => (
            <div key={item.terrain} className="flex items-center justify-between gap-2">
              <span>{item.terrain}</span>
              <span>
                {item.count} cells · {item.percent}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
        <h4 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
          Ethnic Coverage
        </h4>
        <div className="mt-2 space-y-1 text-slate-200">
          {ethnicStats.map((item) => (
            <div key={item.ethnicId} className="flex items-center justify-between gap-2">
              <span>{item.name}</span>
              <span>
                {item.count} cells · {item.percent}% · Pop {item.population.toLocaleString()} (
                {item.populationPercent}%)
              </span>
            </div>
          ))}
          {ethnicStats.length === 0 ? (
            <div className="text-slate-400">No ethnic data in this nation.</div>
          ) : null}
        </div>
      </section>
      <section className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-slate-200">
        <h4 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">Hubs</h4>
        <div className="mt-2">
          {nation.economicHubCellIds.length > 0
            ? nation.economicHubCellIds.map((cellId) => `#${cellId}`).join(', ')
            : 'No economic hubs'}
        </div>
      </section>
    </>
  );
}
