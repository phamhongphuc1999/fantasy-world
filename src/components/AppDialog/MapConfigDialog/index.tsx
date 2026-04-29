'use client';

import { Settings2 } from 'lucide-react';
import TerrainPresetSelect from 'src/components/AppDialog/MapConfigDialog/TerrainPresetSelect';
import { Button } from 'src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'src/components/ui/dialog';
import { useMapContext } from 'src/contexts/map.context';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import MapCellInspector from 'src/views/HomeView/MapCellInspector';
import CountryModePanel from './CountryModePanel';
import DisplayModePanel from './DisplayModePanel';
import GeneratePanel from './GeneratePanel';
import SeaLevelPanel from './SeaLevelPanel';

export default function MapConfigDialog() {
  const { hoverIndex, selectedIndex, resetToDefaults } = useMapExplorerStore();
  const { mesh } = useMapContext();

  const hoveredCell = hoverIndex !== null ? mesh.cells[hoverIndex] : null;
  const selectedCell = selectedIndex !== null ? mesh.cells[selectedIndex] : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          className="pointer-events-auto h-10 border border-white/20 bg-slate-900/85 px-3 text-slate-100 shadow-lg backdrop-blur"
        >
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="h-dvh max-w-none translate-y-0 rounded-none border-none bg-slate-900/55 p-4 text-white backdrop-blur-md sm:max-w-none md:top-auto md:right-4 md:bottom-4 md:left-auto md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-95 md:translate-y-0 md:rounded-xl md:border md:border-white/15 md:bg-slate-950/45 md:p-5">
        <DialogHeader>
          <DialogTitle>Map Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pr-1 md:max-h-[calc(100dvh-9rem)]">
          <GeneratePanel />
          <SeaLevelPanel />
          <TerrainPresetSelect />
          <CountryModePanel />
          <DisplayModePanel />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <button
              type="button"
              onClick={resetToDefaults}
              className="w-full rounded-xl border border-rose-300/30 bg-rose-400/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/25"
            >
              Reset to Default Config
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <MapCellInspector
              label="Hovered Cell"
              cell={hoveredCell}
              mesh={mesh}
              emptyMessage="Move across the mesh to inspect cells."
            />
            <MapCellInspector
              label="Selected Cell"
              cell={selectedCell}
              mesh={mesh}
              emptyMessage="Click any polygon to pin its metadata."
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
