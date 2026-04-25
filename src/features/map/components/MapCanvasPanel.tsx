import MapMetricCard from 'src/features/map/components/MapMetricCard';
import MapSvg from 'src/features/map/components/MapSvg';
import { TMapMesh } from 'src/types/global';

type TProps = {
  mesh: TMapMesh;
  seed: string;
  hoverIndex: number | null;
  selectedIndex: number | null;
  onPointerMove: (x: number, y: number) => void;
  onPointerLeave: () => void;
  onCellSelect: (x: number, y: number) => void;
};

export default function MapCanvasPanel({
  mesh,
  seed,
  hoverIndex,
  selectedIndex,
  onPointerMove,
  onPointerLeave,
  onCellSelect,
}: TProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
        <MapSvg
          cells={mesh.cells}
          width={mesh.width}
          height={mesh.height}
          hoverIndex={hoverIndex}
          selectedIndex={selectedIndex}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
          onCellSelect={onCellSelect}
        />
      </div>

      <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-4">
        <MapMetricCard label="Seed" value={seed} />
        <MapMetricCard label="Cells" value={String(mesh.cells.length)} />
        <MapMetricCard
          label="Rivers"
          value={String(mesh.cells.filter((cell) => cell.isRiver).length)}
        />
        <MapMetricCard
          label="Lakes"
          value={String(mesh.cells.filter((cell) => cell.isLake).length)}
        />
      </div>
    </div>
  );
}
