import { describeCell } from 'src/services/map/describeCell';
import { TMapCell, TMapMesh } from 'src/types/global';

type TProps = {
  label: string;
  cell: TMapCell | null;
  mesh: TMapMesh;
  emptyMessage: string;
};

export default function MapCellInspector({ label, cell, mesh, emptyMessage }: TProps) {
  if (!cell) {
    return (
      <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">{label}</p>
        <p className="mt-2 text-lg font-semibold text-white">None</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">{emptyMessage}</p>
      </article>
    );
  }

  const description = describeCell(cell, mesh);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">#{cell.id}</p>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-slate-200">
        <span className="text-slate-400">Terrain</span>
        <span className="font-medium text-white">{description.terrainType}</span>
        <span className="text-slate-400">Elevation</span>
        <span>{description.elevation}</span>
        <span className="text-slate-400">Biome</span>
        <span>{description.biome}</span>
        <span className="text-slate-400">River</span>
        <span>{description.riverState}</span>
        <span className="text-slate-400">Flow</span>
        <span>{description.flow}</span>
        <span className="text-slate-400">Temperature</span>
        <span>{description.temperature}</span>
        <span className="text-slate-400">Precipitation</span>
        <span>{description.precipitation}</span>
        <span className="text-slate-400">Rain Shadow</span>
        <span>{description.rainShadow}</span>
        <span className="text-slate-400">Suitability</span>
        <span>{description.suitability}</span>
        <span className="text-slate-400">Nation ID</span>
        <span>{description.nationId}</span>
        <span className="text-slate-400">Province ID</span>
        <span>{description.provinceId}</span>
        <span className="text-slate-400">Zone Type</span>
        <span>{description.zoneType}</span>
      </div>
    </article>
  );
}
