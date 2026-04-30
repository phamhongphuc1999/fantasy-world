'use client';

import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import CellPanel from 'src/components/AppDialog/MapConfigDialog/CellPanel';
import TerrainPresetSelect from 'src/components/AppDialog/MapConfigDialog/TerrainPresetSelect';
import { Button } from 'src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from 'src/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import CountryModePanel from './CountryModePanel';
import DisplayModePanel from './DisplayModePanel';
import GeneratePanel from './GeneratePanel';
import LogisticsGamePanel from './LogisticsGamePanel';
import NationsPanel from './NationsPanel';
import SeaLevelPanel from './SeaLevelPanel';
import TerrainRatioPanel from './TerrainRatioPanel';
import EthnicRegionsPanel from './EthnicRegionsPanel';

const T_MAP_CONFIG_ACTIVE_PANEL_KEY = 'map-config-active-panel';
const T_ALLOWED_PANELS = new Set(['terrain', 'generation', 'display', 'nations', 'ethnic']);

export default function MapConfigDialog() {
  const { resetToDefaults } = useMapExplorerStore();
  const [activePanel, setActivePanel] = useState('terrain');

  useEffect(() => {
    const stored = window.localStorage.getItem(T_MAP_CONFIG_ACTIVE_PANEL_KEY);
    if (!stored || !T_ALLOWED_PANELS.has(stored)) return;
    setActivePanel(stored);
  }, []);

  useEffect(() => {
    if (!T_ALLOWED_PANELS.has(activePanel)) return;
    window.localStorage.setItem(T_MAP_CONFIG_ACTIVE_PANEL_KEY, activePanel);
  }, [activePanel]);

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
      <DialogContent className="flex h-dvh max-w-none translate-y-0 flex-col rounded-none border-none bg-slate-900/55 p-4 text-white backdrop-blur-md sm:max-w-none md:top-auto md:right-4 md:bottom-4 md:left-auto md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-95 md:translate-y-0 md:rounded-xl md:border md:border-white/15 md:bg-slate-950/45 md:p-5">
        <DialogHeader>
          <DialogTitle>Map Configuration</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col">
          <Select value={activePanel} onValueChange={setActivePanel}>
            <SelectTrigger className="mt-1 w-full border-white/15 bg-slate-950/70 text-slate-100">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border border-white/15 bg-slate-950 text-slate-100">
              <SelectItem value="terrain">Terrain</SelectItem>
              <SelectItem value="generation">Generation</SelectItem>
              <SelectItem value="display">Display</SelectItem>
              <SelectItem value="nations">Nations</SelectItem>
              <SelectItem value="ethnic">Ethnic</SelectItem>
            </SelectContent>
          </Select>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            {activePanel === 'terrain' ? (
              <div className="space-y-4">
                <TerrainPresetSelect />
                <TerrainRatioPanel />
              </div>
            ) : null}

            {activePanel === 'generation' ? (
              <div className="space-y-4">
                <GeneratePanel />
                <CellPanel />
                <SeaLevelPanel />
                <CountryModePanel />
                <LogisticsGamePanel />
              </div>
            ) : null}

            {activePanel === 'display' ? (
              <div className="space-y-4">
                <DisplayModePanel />
                <Button
                  type="button"
                  onClick={resetToDefaults}
                  className="w-full rounded-xl border border-rose-300/30 bg-rose-400/15 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-400/25"
                >
                  Reset to Default Config
                </Button>
              </div>
            ) : null}

            {activePanel === 'nations' ? (
              <div className="space-y-4">
                <NationsPanel />
              </div>
            ) : null}

            {activePanel === 'ethnic' ? (
              <div className="space-y-4">
                <EthnicRegionsPanel />
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
