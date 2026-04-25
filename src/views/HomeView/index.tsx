'use client';

import { useMemo } from 'react';
import MapCanvasPanel from 'src/features/map/components/MapCanvasPanel';
import MapSidebar from 'src/features/map/components/MapSidebar';
import { buildHydrology } from 'src/features/map/core/buildHydrology';
import { buildMesh } from 'src/features/map/core/buildMesh';
import { buildTopography } from 'src/features/map/core/buildTopography';
import { useMapExplorerStore } from 'src/features/map/store/mapExplorerStore';

const T_VIEWPORT = {
  width: 1200,
  height: 760,
  minCells: 100,
  maxCells: 1800,
};

export default function HomeView() {
  const {
    seed,
    seedDraft,
    cellCount,
    seaLevel,
    hoverIndex,
    selectedIndex,
    setSeed,
    setSeedDraft,
    setCellCount,
    setSeaLevel,
    setHoverIndex,
    toggleSelectedIndex,
  } = useMapExplorerStore();

  const mesh = useMemo(() => {
    const baseMesh = buildMesh({
      width: T_VIEWPORT.width,
      height: T_VIEWPORT.height,
      seed,
      cellCount,
    });
    const topographyMesh = buildTopography({ mesh: baseMesh, seed, seaLevel });
    return buildHydrology({ mesh: topographyMesh, seaLevel });
  }, [cellCount, seaLevel, seed]);

  const hoveredCell = hoverIndex !== null ? mesh.cells[hoverIndex] : null;
  const selectedCell = selectedIndex !== null ? mesh.cells[selectedIndex] : null;

  function handlePointerMove(x: number, y: number) {
    const i = mesh.delaunay.find(x, y);
    setHoverIndex(i);
  }

  function handleApplySeed() {
    const normalizedSeed = seedDraft.trim() || 'world-001';
    setSeed(normalizedSeed);
  }

  function handleRandomizeSeed() {
    const nextSeed = `world-${Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`;
    setSeed(nextSeed);
  }

  function handleCellCountChange(nextValue: number) {
    setCellCount(Math.min(T_VIEWPORT.maxCells, Math.max(T_VIEWPORT.minCells, nextValue)));
  }

  function handleSeaLevelChange(nextValue: number) {
    setSeaLevel(nextValue);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#16314c,#07111d_58%)] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-[0_24px_80px_rgba(3,7,18,0.45)] backdrop-blur sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <MapSidebar
            seedDraft={seedDraft}
            cellCount={cellCount}
            seaLevel={seaLevel}
            minCells={T_VIEWPORT.minCells}
            maxCells={T_VIEWPORT.maxCells}
            hoveredCell={hoveredCell}
            selectedCell={selectedCell}
            mesh={mesh}
            onSeedDraftChange={setSeedDraft}
            onApplySeed={handleApplySeed}
            onRandomizeSeed={handleRandomizeSeed}
            onCellCountChange={handleCellCountChange}
            onSeaLevelChange={handleSeaLevelChange}
          />
          <MapCanvasPanel
            mesh={mesh}
            seed={seed}
            hoverIndex={hoverIndex}
            selectedIndex={selectedIndex}
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
            onCellSelect={(x, y) => toggleSelectedIndex(mesh.delaunay.find(x, y))}
          />
        </section>
      </div>
    </main>
  );
}
