'use client';

import { useMemo, useRef } from 'react';
import { MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { buildHydrology } from 'src/services/map/buildHydrology';
import { buildGeopolitics } from 'src/services/map/buildGeopolitics';
import { buildMesh } from 'src/services/map/buildMesh';
import { buildTopography } from 'src/services/map/buildTopography';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import MapCanvasPanel from 'src/views/HomeView/MapCanvasPanel';
import MapSidebar from 'src/views/HomeView/MapSidebar';

export default function HomeView() {
  const randomizeCountRef = useRef(0);
  const {
    seed,
    seedDraft,
    cellCount,
    seaLevel,
    seaLevelDraft,
    terrainPreset,
    renderMode,
    hoverIndex,
    selectedIndex,
    setSeed,
    setSeedDraft,
    setCellCount,
    setSeaLevelDraft,
    applySeaLevel,
    setTerrainPreset,
    setRenderMode,
    setHoverIndex,
    toggleSelectedIndex,
  } = useMapExplorerStore();

  const mesh = useMemo(() => {
    const baseMesh = buildMesh({
      width: MAP_VIEWPORT_CONFIG.width,
      height: MAP_VIEWPORT_CONFIG.height,
      seed,
      cellCount,
    });
    const topographyMesh = buildTopography({ mesh: baseMesh, seed, seaLevel, terrainPreset });
    const hydrologyMesh = buildHydrology({ mesh: topographyMesh, seaLevel });
    return buildGeopolitics({ mesh: hydrologyMesh, seed });
  }, [cellCount, seaLevel, seed, terrainPreset]);

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
    randomizeCountRef.current += 1;
    const random = createSeededRandom(`${seed}:${randomizeCountRef.current}:seed-randomize`);
    const nextSeed = `world-${Math.floor(random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`;
    setSeed(nextSeed);
  }

  function handleCellCountChange(nextValue: number) {
    setCellCount(
      Math.min(MAP_VIEWPORT_CONFIG.maxCells, Math.max(MAP_VIEWPORT_CONFIG.minCells, nextValue))
    );
  }

  function handleSeaLevelDraftChange(nextValue: number) {
    setSeaLevelDraft(nextValue);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#16314c,#07111d_58%)] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-[0_24px_80px_rgba(3,7,18,0.45)] backdrop-blur sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <MapSidebar
            seedDraft={seedDraft}
            cellCount={cellCount}
            seaLevel={seaLevel}
            seaLevelDraft={seaLevelDraft}
            terrainPreset={terrainPreset}
            renderMode={renderMode}
            minCells={MAP_VIEWPORT_CONFIG.minCells}
            maxCells={MAP_VIEWPORT_CONFIG.maxCells}
            hoveredCell={hoveredCell}
            selectedCell={selectedCell}
            mesh={mesh}
            onSeedDraftChange={setSeedDraft}
            onApplySeed={handleApplySeed}
            onRandomizeSeed={handleRandomizeSeed}
            onCellCountChange={handleCellCountChange}
            onSeaLevelDraftChange={handleSeaLevelDraftChange}
            onSeaLevelApply={applySeaLevel}
            onTerrainPresetChange={setTerrainPreset}
            onRenderModeChange={setRenderMode}
          />
          <MapCanvasPanel
            mesh={mesh}
            seed={seed}
            renderMode={renderMode}
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
