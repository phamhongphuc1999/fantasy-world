'use client';

import { ListIcon, Table2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { Button } from 'src/components/ui/button';
import { ButtonGroup } from 'src/components/ui/button-group';
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

type TChartOption = 'cells' | 'population' | 'economy' | 'pop-per-cell' | 'eco-per-person';

const CHART_OPTIONS: { key: TChartOption; label: string }[] = [
  { key: 'cells', label: 'Cells' },
  { key: 'population', label: 'Population' },
  { key: 'economy', label: 'Economy' },
  { key: 'pop-per-cell', label: 'Pop / Cell' },
  { key: 'eco-per-person', label: 'Eco / Person' },
];

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
    case 'eco-per-person':
      return value.toFixed(4);
  }
}

export default function EthnicGroups({ ethnics }: TProps) {
  const [activeChart, setActiveChart] = useState<TChartOption>('cells');
  const [showData, setShowData] = useState(false);

  const legend = useMemo(
    () =>
      ethnics.map((item) => ({
        label: item.name,
        color: getNationColor(item.ethnicId),
      })),
    [ethnics]
  );

  const { cellPie, populationPie, economyPie, popPerCell, ecoPerPerson } = useMemo(() => {
    const cPie: Array<TPieChartData & { cells: number; ethnicName: string }> = [];
    const pPie: Array<TPieChartData & { ethnicName: string }> = [];
    const ePie: Array<TPieChartData & { ethnicName: string }> = [];
    const ppc: TBarChartData[] = [];
    const epp: TBarChartData[] = [];

    ethnics.forEach((item) => {
      const color = getNationColor(item.ethnicId);
      cPie.push({
        label: item.name,
        value: item.count,
        color,
        cells: item.count,
        ethnicName: item.name,
      });
      pPie.push({ label: item.name, value: item.population, color, ethnicName: item.name });
      ePie.push({ label: item.name, value: item.economy, color, ethnicName: item.name });
      ppc.push({ label: item.name, value: item.population / Math.max(1, item.count), color });
      epp.push({ label: item.name, value: item.economy / Math.max(1, item.population), color });
    });

    return {
      cellPie: cPie,
      populationPie: pPie,
      economyPie: ePie,
      popPerCell: ppc,
      ecoPerPerson: epp,
    };
  }, [ethnics]);

  const activeData = useMemo(() => {
    switch (activeChart) {
      case 'cells':
        return cellPie;
      case 'population':
        return populationPie;
      case 'economy':
        return economyPie;
      case 'pop-per-cell':
        return popPerCell;
      case 'eco-per-person':
        return ecoPerPerson;
    }
  }, [activeChart, cellPie, populationPie, economyPie, popPerCell, ecoPerPerson]);

  if (ethnics.length === 0) {
    return (
      <BlurCard title="Ethnic Groups">
        <p className="py-2 text-center text-slate-500">No ethnic data in this nation.</p>
      </BlurCard>
    );
  }

  return (
    <BlurCard title="Ethnic Groups" containerProps={{ className: 'space-y-4' }}>
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
        {activeChart === 'cells' && (
          <PieChart
            data={cellPie}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.datum.ethnicName}</div>
                <div className="text-slate-200">Cells: {t.datum.cells}</div>
                <div className="text-slate-200">Share: {t.percent}%</div>
              </>
            )}
          />
        )}
        {activeChart === 'population' && (
          <PieChart
            data={populationPie}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.datum.ethnicName}</div>
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
                <div className="font-semibold">{t.datum.ethnicName}</div>
                <div className="text-slate-200">Economy: {formatPopulation(t.value)}</div>
                <div className="text-slate-200">Share: {t.percent}%</div>
              </>
            )}
          />
        )}
        {activeChart === 'pop-per-cell' && (
          <BarChart
            data={popPerCell}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Population/Cell: {t.value.toFixed(1)}</div>
              </>
            )}
          />
        )}
        {activeChart === 'eco-per-person' && (
          <BarChart
            data={ecoPerPerson}
            renderTooltip={(t) => (
              <>
                <div className="font-semibold">{t.label}</div>
                <div className="text-slate-200">Economy/Person: {t.value.toFixed(4)}</div>
              </>
            )}
          />
        )}
      </div>
    </BlurCard>
  );
}
