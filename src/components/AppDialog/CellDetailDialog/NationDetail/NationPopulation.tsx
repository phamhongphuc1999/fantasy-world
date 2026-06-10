'use client';

import { ListIcon, Table2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { Button } from 'src/components/ui/button';
import { ButtonGroup } from 'src/components/ui/button-group';
import { TBarChartData, TPieChartData } from 'src/global';
import { TNationProvinceData } from 'src/hooks/useNationStatistic';
import { formatPopulation } from 'src/services/utils';

type TProps = {
  provinces: TNationProvinceData[];
};

type TChartOption = 'population' | 'economy' | 'cells' | 'pop-per-cell' | 'eco-per-cell';

const COLOR_STEP = 47;

const CHART_OPTIONS: { key: TChartOption; label: string }[] = [
  { key: 'population', label: 'Population' },
  { key: 'economy', label: 'Economy' },
  { key: 'cells', label: 'Cells' },
  { key: 'pop-per-cell', label: 'Pop / Cell' },
  { key: 'eco-per-cell', label: 'Eco / Cell' },
];

function provinceColor(index: number) {
  return `hsl(${(index * COLOR_STEP) % 360} 72% 55%)`;
}

function formatValue(key: TChartOption, value: number): string {
  switch (key) {
    case 'population':
      return formatPopulation(value);
    case 'economy':
      return formatPopulation(value);
    case 'cells':
      return value.toLocaleString();
    case 'pop-per-cell':
      return value.toFixed(1);
    case 'eco-per-cell':
      return value.toFixed(2);
  }
}

export default function NationPopulation({ provinces }: TProps) {
  const [activeChart, setActiveChart] = useState<TChartOption>('population');
  const [showData, setShowData] = useState(false);

  const legend = useMemo(
    () => provinces.map((p, i) => ({ label: `P#${p.id}`, color: provinceColor(i) })),
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
        label: `P#${p.id}`,
        value: p.population,
        color: c,
        cellCount: p.cellCount,
      });
      ep.push({ label: `P#${p.id}`, value: p.economy, color: c, cellCount: p.cellCount });
      cp.push({ label: `P#${p.id}`, value: p.cellCount, color: c, cellCount: p.cellCount });
      pb.push({ label: `P#${p.id}`, value: p.population / Math.max(1, p.cellCount), color: c });
      eb.push({ label: `P#${p.id}`, value: p.economy / Math.max(1, p.cellCount), color: c });
    });

    return { populationPie: pp, economyPie: ep, cellPie: cp, popBar: pb, ecoBar: eb };
  }, [provinces]);

  const activeData = useMemo(() => {
    switch (activeChart) {
      case 'population':
        return populationPie;
      case 'economy':
        return economyPie;
      case 'cells':
        return cellPie;
      case 'pop-per-cell':
        return popBar;
      case 'eco-per-cell':
        return ecoBar;
    }
  }, [activeChart, populationPie, economyPie, cellPie, popBar, ecoBar]);

  if (provinces.length === 0) {
    return (
      <BlurCard title="Provinces">
        <p className="py-2 text-center text-slate-500">No provinces.</p>
      </BlurCard>
    );
  }

  return (
    <BlurCard title="Provinces" containerProps={{ className: 'space-y-4' }}>
      {/* Legend / Data rows */}
      <div className="flex flex-wrap gap-1.5">
        {showData
          ? activeData.map((item) => (
              <span
                key={item.label}
                className="inline-flex items-center gap-1 rounded border border-white/10 bg-slate-900/45 px-2 py-0.5 text-[11px] text-slate-200"
              >
                <span
                  className="inline-block size-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
                <span className="ml-1 font-medium text-slate-100 tabular-nums">
                  {formatValue(activeChart, item.value)}
                </span>
              </span>
            ))
          : legend.map((item) => (
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

      {/* Chart selector + data toggle */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonGroup>
          {CHART_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="xs"
              variant={activeChart === opt.key ? 'default' : 'ghost'}
              onClick={() => setActiveChart(opt.key)}
            >
              {opt.label}
            </Button>
          ))}
        </ButtonGroup>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => setShowData((v) => !v)}
          className={showData ? 'text-sky-300' : ''}
        >
          {showData ? <Table2Icon className="size-3.5" /> : <ListIcon className="size-3.5" />}
        </Button>
      </div>

      {/* Active chart */}
      <div className="flex justify-center rounded-lg border border-white/10 bg-slate-900/30 p-4">
        {activeChart === 'population' && (
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
        )}
        {activeChart === 'economy' && (
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
        )}
        {activeChart === 'cells' && (
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
        )}
        {activeChart === 'pop-per-cell' && (
          <BarChart
            data={popBar}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Avg Pop/Cell: {t.value.toFixed(1)}</div>
              </>
            )}
          />
        )}
        {activeChart === 'eco-per-cell' && (
          <BarChart
            data={ecoBar}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Avg Economy/Cell: {t.value.toFixed(2)}</div>
              </>
            )}
          />
        )}
      </div>
    </BlurCard>
  );
}
