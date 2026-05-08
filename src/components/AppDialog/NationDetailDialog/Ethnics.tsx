import BlurCard from 'src/components/BlurCard';
import BarChart from 'src/components/charts/BarChart';
import PieChart from 'src/components/charts/PieChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'src/components/ui/tabs';
import { getNationColor } from 'src/services/rendering/colors';
import { formatPopulation } from 'src/services/utils/format';
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
        <Tabs defaultValue="cells-percent">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="cells-percent">Cells %</TabsTrigger>
            <TabsTrigger value="population-percent">Population %</TabsTrigger>
            <TabsTrigger value="economy-percent">Economy %</TabsTrigger>
            <TabsTrigger value="population-per-cell">Pop / Cell</TabsTrigger>
            <TabsTrigger value="economy-per-person">Eco / Person</TabsTrigger>
          </TabsList>
          <TabsContent value="cells-percent" className="mt-2 flex justify-center">
            <PieChart
              width={320}
              height={320}
              data={cellPieData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.datum.ethnicName}</div>
                  <div>Cells: {tooltip.datum.cells}</div>
                  <div>{tooltip.percent}%</div>
                </>
              )}
            />
          </TabsContent>
          <TabsContent value="population-percent" className="flex justify-center">
            <PieChart
              width={320}
              height={320}
              data={populationPieData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.datum.ethnicName}</div>
                  <div>Population: {formatPopulation(tooltip.value)}</div>
                  <div>{tooltip.percent}%</div>
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
                  <div className="font-semibold">{tooltip.datum.ethnicName}</div>
                  <div>Economy: {formatPopulation(tooltip.value)}</div>
                  <div>{tooltip.percent}%</div>
                </>
              )}
            />
          </TabsContent>
          <TabsContent value="population-per-cell" className="flex justify-center">
            <BarChart
              width={420}
              height={250}
              data={populationPerCellData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.datum.ethnicName}</div>
                  <div>Population/Cell: {tooltip.value.toFixed(2)}</div>
                </>
              )}
            />
          </TabsContent>
          <TabsContent value="economy-per-person" className="flex justify-center">
            <BarChart
              width={420}
              height={250}
              data={economyPerPersonData}
              renderTooltip={(tooltip) => (
                <>
                  <div className="font-semibold">{tooltip.datum.ethnicName}</div>
                  <div>Economy/Person: {tooltip.value.toFixed(4)}</div>
                </>
              )}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-slate-400">No ethnic data in this nation.</div>
      )}
    </BlurCard>
  );
}
