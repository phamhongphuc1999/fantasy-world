'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MAP_EXPLORER_DEFAULT_CONFIG } from 'src/configs/mapConfig';
import {
  TCustomCountryMode,
  TMapDisplaySettings,
  TMapExplorerState,
  TTerrainPreset,
} from 'src/types/global';

type TMapExplorerActions = {
  setSeed: (seed: string) => void;
  setSeedDraft: (seedDraft: string) => void;
  setCellCount: (cellCount: number) => void;
  setSeaLevel: (seaLevel: number) => void;
  setSeaLevelDraft: (seaLevelDraft: number) => void;
  applySeaLevel: () => void;
  setTerrainPreset: (terrainPreset: TTerrainPreset) => void;
  setCustomCountryMode: (customCountryMode: TCustomCountryMode) => void;
  setCustomCountryCount: (customCountryCount: number) => boolean;
  setDisplaySettings: (displaySettings: TMapDisplaySettings) => void;
  setDisplayLayer: <K extends keyof TMapDisplaySettings>(layer: K, enabled: boolean) => void;
  setHoverIndex: (hoverIndex: number | null) => void;
  toggleSelectedIndex: (selectedIndex: number) => void;
  resetSelection: () => void;
  resetToDefaults: () => void;
};

type TMapExplorerStore = TMapExplorerState & TMapExplorerActions;

const DEFAULT_STATE: TMapExplorerState = {
  seed: MAP_EXPLORER_DEFAULT_CONFIG.seed,
  seedDraft: MAP_EXPLORER_DEFAULT_CONFIG.seed,
  cellCount: MAP_EXPLORER_DEFAULT_CONFIG.cellCount,
  seaLevel: MAP_EXPLORER_DEFAULT_CONFIG.seaLevel,
  seaLevelDraft: MAP_EXPLORER_DEFAULT_CONFIG.seaLevel,
  terrainPreset: MAP_EXPLORER_DEFAULT_CONFIG.terrainPreset,
  customCountryMode: MAP_EXPLORER_DEFAULT_CONFIG.customCountryMode,
  customCountryCount: MAP_EXPLORER_DEFAULT_CONFIG.customCountryCount,
  displaySettings: MAP_EXPLORER_DEFAULT_CONFIG.displaySettings,
  hoverIndex: null,
  selectedIndex: null,
};

export const useMapExplorerStore = create<TMapExplorerStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setSeed(seed: string) {
        set({ seed, seedDraft: seed, hoverIndex: null, selectedIndex: null });
      },
      setSeedDraft(seedDraft: string) {
        set({ seedDraft });
      },
      setCellCount(cellCount: number) {
        set({ cellCount, hoverIndex: null, selectedIndex: null });
      },
      setSeaLevel(seaLevel: number) {
        set({ seaLevel, seaLevelDraft: seaLevel, hoverIndex: null, selectedIndex: null });
      },
      setSeaLevelDraft(seaLevelDraft: number) {
        set({ seaLevelDraft });
      },
      applySeaLevel() {
        const { seaLevel, seaLevelDraft } = get();
        if (seaLevel === seaLevelDraft) return;
        set({ seaLevel: seaLevelDraft, hoverIndex: null, selectedIndex: null });
      },
      setTerrainPreset(terrainPreset: TTerrainPreset) {
        set({ terrainPreset, hoverIndex: null, selectedIndex: null });
      },
      setCustomCountryMode(customCountryMode: TCustomCountryMode) {
        set({ customCountryMode, hoverIndex: null, selectedIndex: null });
      },
      setCustomCountryCount(customCountryCount: number) {
        if (customCountryCount < 2 || customCountryCount > 40) return false;
        set({ customCountryCount, hoverIndex: null, selectedIndex: null });
        return true;
      },
      setDisplaySettings(displaySettings: TMapDisplaySettings) {
        const normalizedSettings = displaySettings.showCountryBorders
          ? displaySettings
          : { ...displaySettings, showProvinceBorders: false };
        set({ displaySettings: normalizedSettings });
      },
      setDisplayLayer<K extends keyof TMapDisplaySettings>(layer: K, enabled: boolean) {
        const current = get().displaySettings;
        const nextSettings = { ...current, [layer]: enabled };
        if (!nextSettings.showCountryBorders) {
          nextSettings.showProvinceBorders = false;
        }
        set({ displaySettings: nextSettings });
      },
      setHoverIndex(hoverIndex: number | null) {
        if (get().hoverIndex === hoverIndex) return;
        set({ hoverIndex });
      },
      toggleSelectedIndex(selectedIndex: number) {
        const current = get().selectedIndex;
        set({ selectedIndex: current === selectedIndex ? null : selectedIndex });
      },
      resetSelection() {
        set({ hoverIndex: null, selectedIndex: null });
      },
      resetToDefaults() {
        set({
          ...DEFAULT_STATE,
          hoverIndex: null,
          selectedIndex: null,
        });
      },
    }),
    {
      name: 'map-explorer-store',
      partialize: (state) => ({
        seed: state.seed,
        seedDraft: state.seedDraft,
        cellCount: state.cellCount,
        seaLevel: state.seaLevel,
        seaLevelDraft: state.seaLevelDraft,
        terrainPreset: state.terrainPreset,
        customCountryMode: state.customCountryMode,
        customCountryCount: state.customCountryCount,
        displaySettings: state.displaySettings,
      }),
    }
  )
);
