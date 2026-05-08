import { TERRAIN_CONFIG } from 'src/configs/constance';
import { TPieChartData } from 'src/types/global';
import { TTerrain } from 'src/types/map.types';
import BlurCard from './BlurCard';
import PieChart from './charts/PieChart';

interface TTerrainStatistic {
  terrain: string;
  count: number;
  percent: number;
}

interface TProps {
  terrains: TTerrainStatistic[];
}

export default function TerrainStatistic({ terrains }: TProps) {
  const pieData: Array<TPieChartData & { type: TTerrain; cellCount: number }> = terrains.map(
    (item) => {
      const _key = item.terrain as TTerrain;

      return {
        type: item.terrain as TTerrain,
        label: item.terrain.replace('-', ' '),
        value: item.percent,
        color: TERRAIN_CONFIG[_key].color,
        cellCount: item.count,
      };
    }
  );

  return (
    <BlurCard title="Terrain">
      <div className="mt-2 flex justify-center">
        <PieChart
          data={pieData}
          renderTooltip={(tooltip) => (
            <div className="w-25">
              <div className="font-semibold">
                {tooltip.label} {TERRAIN_CONFIG[tooltip.datum.type].icon}
              </div>
              <div>Cells: {tooltip.datum.cellCount}</div>
              <div>Percent: {tooltip.percent}%</div>
            </div>
          )}
        />
      </div>
    </BlurCard>
  );
}
