import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { formatPopulation } from 'src/services/utils/format';
import { TBarChartData, TPieChartData } from 'src/types/global';

type TProvinceStatistic = {
  provinceId: number;
  population: number;
  economy: number;
  cellCount: number;
};

type TProps = {
  provinces: TProvinceStatistic[];
};

export default function Population({ provinces }: TProps) {
  const colorByIndex = (index: number) => `hsl(${(index * 47) % 360} 72% 55%)`;
  const provinceLegend = provinces.map((province, index) => ({
    label: `P#${province.provinceId}`,
    color: colorByIndex(index),
  }));

  const populationPieData: Array<TPieChartData & { cellCount: number }> = provinces.map(
    (province, index) => ({
      label: `P#${province.provinceId}`,
      value: province.population,
      color: colorByIndex(index),
      cellCount: province.cellCount,
    })
  );

  const economyPieData: Array<TPieChartData & { cellCount: number }> = provinces.map(
    (province, index) => ({
      label: `P#${province.provinceId}`,
      value: province.economy,
      color: colorByIndex(index),
      cellCount: province.cellCount,
    })
  );

  const averagePopulationBarData: TBarChartData[] = provinces.map((province, index) => ({
    label: `P#${province.provinceId}`,
    value: province.population / Math.max(1, province.cellCount),
    color: colorByIndex(index),
  }));

  const averageEconomyBarData: TBarChartData[] = provinces.map((province, index) => ({
    label: `P#${province.provinceId}`,
    value: province.economy / Math.max(1, province.cellCount),
    color: colorByIndex(index),
  }));

  return (
    <BlurCard title="Population" containerProps={{ className: 'flex flex-col gap-3' }}>
      {provinces.length > 0 ? (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            {provinceLegend.map((item) => (
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
              <p className="mb-2 text-center text-xs font-bold text-slate-300">Population (%)</p>
              <PieChart
                width={320}
                height={320}
                data={populationPieData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-semibold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Population</span>:{' '}
                      {formatPopulation(tooltip.value)}
                    </div>
                    <div>
                      <span className="font-bold">Percent</span>: {tooltip.percent}%
                    </div>
                    <div>
                      <span className="font-bold">Cells</span>: {tooltip.datum.cellCount}
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
                    <div>
                      <span className="font-bold">Cells</span>: {tooltip.datum.cellCount}
                    </div>
                  </>
                )}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">
                Average population per cell
              </p>
              <BarChart
                width={420}
                height={320}
                data={averagePopulationBarData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Avg Pop/Cell</span>: {tooltip.value.toFixed(2)}
                    </div>
                  </>
                )}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">
              <p className="mb-2 text-center text-xs font-bold text-slate-300">
                Average economy per cell
              </p>
              <BarChart
                width={420}
                height={320}
                data={averageEconomyBarData}
                renderTooltip={(tooltip) => (
                  <>
                    <div className="font-bold">{tooltip.label}</div>
                    <div>
                      <span className="font-bold">Avg Economy/Cell</span>:{' '}
                      {tooltip.value.toFixed(2)}
                    </div>
                  </>
                )}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-slate-500">No provinces.</p>
      )}
    </BlurCard>
  );
}
