import { useMemo } from 'react';
import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { formatPopulation } from 'src/services/utils';
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

const COLOR_STEP = 47;

function provinceColor(index: number) {
  return `hsl(${(index * COLOR_STEP) % 360} 72% 55%)`;
}

export default function Population({ provinces }: TProps) {
  const legend = useMemo(
    () =>
      provinces.map((p, i) => ({
        label: `P#${p.provinceId}`,
        color: provinceColor(i),
      })),
    [provinces]
  );

  const { populationPie, economyPie, cellPie, popBar, ecoBar } = useMemo(() => {
    const pp: Array<TPieChartData & { cellCount: number }> = [];
    const ep: Array<TPieChartData & { cellCount: number }> = [];
    const cp: Array<TPieChartData & { cellCount: number }> = [];
    const pb: TBarChartData[] = [];
    const eb: TBarChartData[] = [];

    provinces.forEach((p, i) => {
      const c = provinceColor(i);
      pp.push({
        label: `P#${p.provinceId}`,
        value: p.population,
        color: c,
        cellCount: p.cellCount,
      });
      ep.push({ label: `P#${p.provinceId}`, value: p.economy, color: c, cellCount: p.cellCount });
      cp.push({ label: `P#${p.provinceId}`, value: p.cellCount, color: c, cellCount: p.cellCount });
      pb.push({
        label: `P#${p.provinceId}`,
        value: p.population / Math.max(1, p.cellCount),
        color: c,
      });
      eb.push({
        label: `P#${p.provinceId}`,
        value: p.economy / Math.max(1, p.cellCount),
        color: c,
      });
    });

    return { populationPie: pp, economyPie: ep, cellPie: cp, popBar: pb, ecoBar: eb };
  }, [provinces]);

  if (provinces.length === 0) {
    return (
      <BlurCard title="Provinces">
        <p className="py-2 text-center text-slate-500">No provinces.</p>
      </BlurCard>
    );
  }

  return (
    <BlurCard title="Provinces" containerProps={{ className: 'space-y-4' }}>
      <div className="flex flex-wrap gap-1.5">
        {legend.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1 rounded border border-white/10 bg-slate-900/45 px-2 py-0.5 text-[11px] text-slate-200"
          >
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
          <p className="mb-2 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
            Population
          </p>
          <PieChart
            data={populationPie}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Population: {formatPopulation(t.value)}</div>
                <div className="text-slate-200">Share: {t.percent}%</div>
              </>
            )}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
          <p className="mb-2 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
            Economy
          </p>
          <PieChart
            data={economyPie}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Economy: {formatPopulation(t.value)}</div>
                <div className="text-slate-200">Share: {t.percent}%</div>
              </>
            )}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
          <p className="mb-2 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
            Cells
          </p>
          <PieChart
            data={cellPie}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Cells: {t.datum.cellCount}</div>
                <div className="text-slate-200">Share: {t.percent}%</div>
              </>
            )}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
          <p className="mb-2 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
            Avg Pop / Cell
          </p>
          <BarChart
            data={popBar}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Avg Pop/Cell: {t.value.toFixed(1)}</div>
              </>
            )}
          />
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-900/30 p-3">
          <p className="mb-2 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
            Avg Economy / Cell
          </p>
          <BarChart
            data={ecoBar}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Avg Economy/Cell: {t.value.toFixed(2)}</div>
              </>
            )}
          />
        </div>
      </div>
    </BlurCard>
  );
}
