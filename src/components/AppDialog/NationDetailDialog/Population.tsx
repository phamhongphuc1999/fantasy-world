import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/ui/tabs';
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
        <Tabs defaultValue="population-percent">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="population-percent">Population %</TabsTrigger>
            <TabsTrigger value="economy-percent">Economy %</TabsTrigger>
            <TabsTrigger value="population-per-cell">Avg Pop / Cell</TabsTrigger>
            <TabsTrigger value="economy-per-cell">Avg Eco / Cell</TabsTrigger>
          </TabsList>
          <TabsContent value="population-percent" className="mt-2 flex justify-center">
            <PieChart
              width={320}
              height={320}
              data={populationPieData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.label}</div>
                  <div>Population: {formatPopulation(tooltip.value)}</div>
                  <div>{tooltip.percent}%</div>
                  <div>Cells: {tooltip.datum.cellCount}</div>
                </>
              )}
            />
          </TabsContent>
          <TabsContent value="economy-percent" className="flex justify-center">
            <PieChart
              width={320}
              height={320}
              data={economyPieData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.label}</div>
                  <div>Economy: {formatPopulation(tooltip.value)}</div>
                  <div>{tooltip.percent}%</div>
                  <div>Cells: {tooltip.datum.cellCount}</div>
                </>
              )}
            />
          </TabsContent>
          <TabsContent value="population-per-cell" className="flex justify-center">
            <BarChart
              width={420}
              height={250}
              data={averagePopulationBarData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.label}</div>
                  <div>Avg Pop/Cell: {tooltip.value.toFixed(2)}</div>
                </>
              )}
            />
          </TabsContent>
          <TabsContent value="economy-per-cell" className="flex justify-center">
            <BarChart
              width={420}
              height={250}
              data={averageEconomyBarData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.label}</div>
                  <div>Avg Economy/Cell: {tooltip.value.toFixed(2)}</div>
                </>
              )}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <p className="text-slate-500">No provinces.</p>
      )}
    </BlurCard>
  );
}
