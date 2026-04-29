'use client';

import { MAP_EXPLORER_DEFAULT_CONFIG } from 'src/configs/mapConfig';
import {
  TCustomCountryMode,
  TMapDisplaySettings,
  TMapExplorerState,
  TTerrainPreset,
} from 'src/types/global';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  setHoverVisualizationEnabled: (enabled: boolean) => void;
  setHoverIndex: (hoverIndex: number | null) => void;
  setHoverClientPoint: (point: { x: number; y: number } | null) => void;
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
  hoverVisualizationEnabled: true,
  hoverIndex: null,
  hoverClientPoint: null,
};

export const useMapExplorerStore = create<TMapExplorerStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setSeed(seed: string) {
        set({ seed, seedDraft: seed, hoverIndex: null });
      },
      setSeedDraft(seedDraft: string) {
        set({ seedDraft });
      },
      setCellCount(cellCount: number) {
        set({ cellCount, hoverIndex: null });
      },
      setSeaLevel(seaLevel: number) {
        set({ seaLevel, seaLevelDraft: seaLevel, hoverIndex: null });
      },
      setSeaLevelDraft(seaLevelDraft: number) {
        set({ seaLevelDraft });
      },
      applySeaLevel() {
        const { seaLevel, seaLevelDraft } = get();
        if (seaLevel === seaLevelDraft) return;
        set({ seaLevel: seaLevelDraft, hoverIndex: null });
      },
      setTerrainPreset(terrainPreset: TTerrainPreset) {
        set({ terrainPreset, hoverIndex: null });
      },
      setCustomCountryMode(customCountryMode: TCustomCountryMode) {
        set({ customCountryMode, hoverIndex: null });
      },
      setCustomCountryCount(customCountryCount: number) {
        if (customCountryCount < 2 || customCountryCount > 40) return false;
        set({ customCountryCount, hoverIndex: null });
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
      setHoverVisualizationEnabled(enabled: boolean) {
        set({ hoverVisualizationEnabled: enabled });
      },
      setHoverIndex(hoverIndex: number | null) {
        if (get().hoverIndex === hoverIndex) return;
        set({ hoverIndex });
      },
      setHoverClientPoint(point: { x: number; y: number } | null) {
        set({ hoverClientPoint: point });
      },
      resetSelection() {
        set({ hoverIndex: null, hoverClientPoint: null });
      },
      resetToDefaults() {
        set({
          ...DEFAULT_STATE,
          hoverIndex: null,
          hoverClientPoint: null,
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
        hoverVisualizationEnabled: state.hoverVisualizationEnabled,
      }),
    }
  )
);
