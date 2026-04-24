'use client';

import { type MouseEvent, useMemo, useState } from 'react';
import MapSvg from 'src/features/map/components/MapSvg';
import { buildMesh } from 'src/features/map/core/buildMesh';
import { cn } from 'src/lib/utils';

const WIDTH = 1200;
const HEIGHT = 760;
const MIN_CELLS = 100;
const MAX_CELLS = 1800;
const DEFAULT_CELLS = 420;
const DEFAULT_SEED = 'world-001';

export default function HomeView() {
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [seedDraft, setSeedDraft] = useState(DEFAULT_SEED);
  const [cellCount, setCellCount] = useState(DEFAULT_CELLS);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const mesh = useMemo(
    () => buildMesh({ width: WIDTH, height: HEIGHT, seed, cellCount }),
    [cellCount, seed]
  );

  const hoveredCell = hoverIndex !== null ? mesh.cells[hoverIndex] : null;
  const selectedCell = selectedIndex !== null ? mesh.cells[selectedIndex] : null;

  function handleMouseMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    const i = mesh.delaunay.find(x * scaleX, y * scaleY);
    setHoverIndex(i);
  }

  function handleApplySeed() {
    const normalizedSeed = seedDraft.trim() || DEFAULT_SEED;
    setSeed(normalizedSeed);
    setSeedDraft(normalizedSeed);
    setHoverIndex(null);
    setSelectedIndex(null);
  }

  function handleRandomizeSeed() {
    const nextSeed = `world-${Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`;

    setSeed(nextSeed);
    setSeedDraft(nextSeed);
    setHoverIndex(null);
    setSelectedIndex(null);
  }

  function handleCellCountChange(nextValue: number) {
    setCellCount(nextValue);
    setHoverIndex(null);
    setSelectedIndex(null);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#16314c,#07111d_58%)] px-5 py-8 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-[0_24px_80px_rgba(3,7,18,0.45)] backdrop-blur sm:p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.28em] text-sky-300/80 uppercase">
                Phase 1
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Voronoi Mesh Explorer
              </h1>
              <p className="max-w-md text-sm leading-6 text-slate-300">
                Generate a deterministic cell mesh, inspect hover and selection states, and validate
                the interaction model before adding terrain simulation.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="block space-y-2">
                <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
                  Seed
                </span>
                <input
                  value={seedDraft}
                  onChange={(event) => setSeedDraft(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white ring-0 outline-none placeholder:text-slate-500"
                  placeholder="world-001"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleApplySeed}
                  className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-300"
                >
                  Apply seed
                </button>
                <button
                  type="button"
                  onClick={handleRandomizeSeed}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/10"
                >
                  Randomize
                </button>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-medium tracking-[0.18em] text-slate-300 uppercase">
                  Cells
                </span>
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-sm font-medium text-sky-100">
                  {cellCount}
                </span>
              </div>

              <input
                type="range"
                min={MIN_CELLS}
                max={MAX_CELLS}
                step={20}
                value={cellCount}
                onChange={(event) => handleCellCountChange(Number(event.target.value))}
                className="w-full accent-sky-400"
              />

              <input
                type="number"
                min={MIN_CELLS}
                max={MAX_CELLS}
                step={20}
                value={cellCount}
                onChange={(event) => {
                  const nextValue = Number(event.target.value);

                  if (Number.isNaN(nextValue)) {
                    return;
                  }

                  handleCellCountChange(Math.min(MAX_CELLS, Math.max(MIN_CELLS, nextValue)));
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <StatusCard
                label="Hovered Cell"
                value={hoveredCell ? `#${hoveredCell.id}` : 'None'}
                detail={
                  hoveredCell
                    ? `${hoveredCell.neighbors.length} neighbors`
                    : 'Move across the mesh to inspect cells.'
                }
              />
              <StatusCard
                label="Selected Cell"
                value={selectedCell ? `#${selectedCell.id}` : 'None'}
                detail={
                  selectedCell
                    ? `Site ${selectedCell.site[0].toFixed(1)}, ${selectedCell.site[1].toFixed(1)}`
                    : 'Click any polygon to pin its metadata.'
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
              <MapSvg
                cells={mesh.cells}
                width={mesh.width}
                height={mesh.height}
                hoverIndex={hoverIndex}
                selectedIndex={selectedIndex}
                onPointerMove={handleMouseMove}
                onPointerLeave={() => setHoverIndex(null)}
                onCellSelect={(cellId) =>
                  setSelectedIndex((currentSelected) =>
                    currentSelected === cellId ? null : cellId
                  )
                }
              />
            </div>

            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <MetricCard label="Seed" value={seed} />
              <MetricCard label="Rendered cells" value={String(mesh.cells.length)} />
              <MetricCard
                label="Selection mode"
                value={selectedCell ? `Pinned #${selectedCell.id}` : 'Hover only'}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

interface TCardProps {
  label: string;
  value: string;
  detail?: string;
}

function StatusCard({ label, value, detail }: TCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p> : null}
    </article>
  );
}

function MetricCard({ label, value }: TCardProps) {
  return (
    <article
      className={cn(
        'rounded-2xl border border-white/10 bg-white/5 px-4 py-3',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
      )}
    >
      <p className="text-xs font-medium tracking-[0.18em] text-slate-400 uppercase">{label}</p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-100">{value}</p>
    </article>
  );
}
