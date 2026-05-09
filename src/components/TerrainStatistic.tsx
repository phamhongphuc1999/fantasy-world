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
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {pieData.map((item) => (
          <div
            key={`terrain-legend-${item.type}`}
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
    </BlurCard>
  );
}
