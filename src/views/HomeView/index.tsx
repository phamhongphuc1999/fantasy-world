'use client';

import MapConfigDialog from 'src/components/AppDialog/MapConfigDialog';
import MapCanvasPanel from 'src/views/HomeView/MapCanvasPanel';

export default function HomeView() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-slate-950">
      <section className="relative h-full w-full">
        <MapCanvasPanel />
        <div className="pointer-events-none absolute right-3 bottom-3 z-30 md:right-4 md:bottom-4">
          <MapConfigDialog />
        </div>
      </section>
    </main>
  );
}
