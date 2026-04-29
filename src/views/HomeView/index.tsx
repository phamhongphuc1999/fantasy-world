'use client';

import MapConfigDialog from 'src/components/AppDialog/MapConfigDialog';
import MapProvider from 'src/contexts/map.context';
import MapCanvasPanel from 'src/views/HomeView/MapCanvasPanel';

function HomeViewLayout() {
  return (
    <main className="h-dvh w-full overflow-hidden bg-slate-950">
      <section className="relative h-full w-full">
        <MapCanvasPanel />
        <div className="pointer-events-none absolute top-3 right-3 z-30 md:top-4 md:right-4">
          <MapConfigDialog />
        </div>
      </section>
    </main>
  );
}

export default function HomeView() {
  return (
    <MapProvider>
      <HomeViewLayout />
    </MapProvider>
  );
}
