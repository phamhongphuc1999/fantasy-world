import { useMapContext } from 'src/contexts/map.context';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import MapCanvas from 'src/views/HomeView/MapCanvas';

export default function MapCanvasPanel() {
  const { renderMode, hoverIndex, selectedIndex, setHoverIndex, toggleSelectedIndex } =
    useMapExplorerStore();

  const { mesh, handlePointerMove } = useMapContext();

  return (
    <div className="h-full w-full overflow-hidden">
      <MapCanvas
        cells={mesh.cells}
        width={mesh.width}
        height={mesh.height}
        renderMode={renderMode}
        hoverIndex={hoverIndex}
        selectedIndex={selectedIndex}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        onCellSelect={(x, y) => toggleSelectedIndex(mesh.delaunay.find(x, y))}
      />
    </div>
  );
}
