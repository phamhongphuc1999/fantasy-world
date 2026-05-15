import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { formatPopulation, getNationColor } from 'src/services/utils';
import { TBarChartData, TPieChartData } from 'src/types/global';

type TEthnicStatistic = {
  ethnicId: number;
  name: string;
  count: number;
  percent: number;
  population: number;
  economy: number;
  populationPercent: number;
};

type TProps = {
  ethnics: TEthnicStatistic[];
};

export default function Ethnics({ ethnics }: TProps) {
  const ethnicLegend = ethnics.map((item) => ({
    label: item.name,
    color: getNationColor(item.ethnicId),
  }));

  const cellPieData: Array<TPieChartData & { cells: number; ethnicName: string }> = ethnics.map(
    (item) => ({
      label: item.name,
      value: item.count,
      color: getNationColor(item.ethnicId),
      cells: item.count,
      ethnicName: item.name,
    })
  );

  const populationPieData: Array<TPieChartData & { ethnicName: string }> = ethnics.map((item) => ({
    label: item.name,
    value: item.population,
    color: getNationColor(item.ethnicId),
    ethnicName: item.name,
  }));

  const economyPieData: Array<TPieChartData & { ethnicName: string }> = ethnics.map((item) => ({
    label: item.name,
    value: item.economy,
    color: getNationColor(item.ethnicId),
    ethnicName: item.name,
  }));

  const economyPerPersonData: Array<TBarChartData & { ethnicName: string }> = ethnics.map(
    (item) => ({
      label: item.name,
      value: item.economy / Math.max(1, item.population),
      color: getNationColor(item.ethnicId),
      ethnicName: item.name,
    })
  );

  const populationPerCellData: Array<TBarChartData & { ethnicName: string }> = ethnics.map(
    (item) => ({
      label: item.name,
      value: item.population / Math.max(1, item.count),
      color: getNationColor(item.ethnicId),
      ethnicName: item.name,
    })
  );

  return (
    <BlurCard title="Ethnic" containerProps={{ className: 'flex flex-col gap-3' }}>
      {ethnics.length > 0 ? (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            {ethnicLegend.map((item) => (
              <div
                key={`legend-shared-${item.label}`}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-slate-900/45 px-2 py-1 text-[11px] text-slate-200"
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-start gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">Cells (%)</p>
              <PieChart
                width={320}
                height={320}
                data={cellPieData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Cells</span>: {tooltip.datum.cells}
                    </div>
                    <div>
                      <span className="font-bold">Percent</span>: {tooltip.percent}%
                    </div>
                  </>
                )}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">Population (%)</p>
              <PieChart
                width={320}
                height={320}
                data={populationPieData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
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
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">Economy (%)</p>
              <PieChart
                width={320}
                height={320}
                data={economyPieData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Economy</span>: {formatPopulation(tooltip.value)}
                    </div>
                    <div>
                      <span className="font-bold">Percent</span>: {tooltip.percent}%
                    </div>
                  </>
                )}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">Population / Cell</p>
              <BarChart
                width={420}
                height={320}
                data={populationPerCellData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Population/Cell</span>: {tooltip.value.toFixed(2)}
                    </div>
                  </>
                )}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">Economy / Person</p>
              <BarChart
                width={420}
                height={320}
                data={economyPerPersonData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Economy/Person</span>: {tooltip.value.toFixed(4)}
                    </div>
                  </>
                )}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-400">No ethnic data in this nation.</div>
      )}
    </BlurCard>
  );
}
