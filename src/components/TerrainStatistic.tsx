import { TERRAIN_CONFIG } from 'src/configs/constance';
import { TTerrain } from 'src/types/map.types';
import BlurCard from './BlurCard';

interface TTerrainStatistic {
  terrain: string;
  count: number;
  percent: number;
}

interface TProps {
  terrains: TTerrainStatistic[];
}

export default function TerrainStatistic({ terrains }: TProps) {
  return (
    <BlurCard title="Terrain">
      {terrains.map((item) => {
        const _key = item.terrain as TTerrain;

        return (
          <div key={item.terrain} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ color: TERRAIN_CONFIG[_key].color }}>
                {item.terrain.replace('-', ' ')} {TERRAIN_CONFIG[_key].icon}
              </span>
            </div>
            <span>
              {item.count} cells ({item.percent}%)
            </span>
          </div>
        );
      })}
    </BlurCard>
  );
}
