import { TERRAIN_COLORS, TERRAIN_ICONS } from 'src/configs/constance';
import { TTerrainBand, TTerrainStatistic } from 'src/types/map.types';
import BlurCard from './BlurCard';

interface TProps {
  terrains: TTerrainStatistic[];
}

export default function TerrainStatistic({ terrains }: TProps) {
  return (
    <BlurCard title="Terrain">
      {terrains.map((item) => {
        return (
          <div key={item.terrain} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="font-bold"
                style={{ color: TERRAIN_COLORS[item.terrain as TTerrainBand] }}
              >
                {item.terrain.replace('-', ' ')} {TERRAIN_ICONS[item.terrain as TTerrainBand]}
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
