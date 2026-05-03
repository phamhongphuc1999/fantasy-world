'use client';

import { DEFAULT_CONFIG } from 'src/configs/mapConfig';
import { normalizeTerrainRatios } from 'src/services/map/terrainRatios';
import {
  TMapDisplaySettings,
  TMapExplorerState,
  TTerrainPreset,
  TTerrainRatioKey,
  TTerrainRatioMap,
} from 'src/types/map.types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TMapExplorerActions = {
  setSeed: (seed: string) => void;
  setCellCount: (cellCount: number) => void;
  setSeaLevel: (seaLevel: number) => void;
  setTerrainPreset: (terrainPreset: TTerrainPreset) => void;
  setNationCount: (nationCount: number) => boolean;
  applyTerrainRatios: (terrainRatiosDraft: TTerrainRatioMap) => void;
  setDisplaySettings: (displaySettings: TMapDisplaySettings) => void;
  setDisplayLayer: <K extends keyof TMapDisplaySettings>(layer: K, enabled: boolean) => void;
  setHoverIndex: (hoverIndex: number | null) => void;
  setHoverClientPoint: (point: { x: number; y: number } | null) => void;
  resetSelection: () => void;
  resetToDefaults: () => void;
};

type TMapExplorerStore = TMapExplorerState & TMapExplorerActions;

const DEFAULT_STATE: TMapExplorerState = {
  seed: DEFAULT_CONFIG.seed,
  cellCount: DEFAULT_CONFIG.cellCount,
  seaLevel: DEFAULT_CONFIG.seaLevel,
  terrainPreset: DEFAULT_CONFIG.terrainPreset,
  nationCount: DEFAULT_CONFIG.nationCount,
  terrainRatios: DEFAULT_CONFIG.terrainRatios,
  displaySettings: DEFAULT_CONFIG.displaySettings,
  hoverIndex: null,
  hoverClientPoint: null,
};

function migrateLegacyTerrainRatios(raw?: Partial<Record<string, number>>) {
  if (!raw) return DEFAULT_CONFIG.terrainRatios;
  const plainValue = raw.plains ?? raw.plain;
  return normalizeTerrainRatios({
    plains: plainValue,
    forest: raw.forest,
    swamp: raw.swamp,
    desert: raw.desert,
    hills: raw.hills,
    mountains: raw.mountains,
    plateau: raw.plateau,
  });
}

export const useMapExplorerStore = create<TMapExplorerStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      setSeed(seed: string) {
        set({ seed, hoverIndex: null });
      },
      setCellCount(cellCount: number) {
        set({ cellCount, hoverIndex: null });
      },
      setSeaLevel(seaLevelDraft: number) {
        const { seaLevel } = get();
        if (seaLevel === seaLevelDraft) return;
        set({ seaLevel: seaLevelDraft, hoverIndex: null });
      },
      setTerrainPreset(terrainPreset: TTerrainPreset) {
        set({ terrainPreset, hoverIndex: null });
      },
      setNationCount(nationCount: number) {
        if (nationCount < 2 || nationCount > 40) return false;
        set({ nationCount, hoverIndex: null });
        return true;
      },
      applyTerrainRatios(terrainRatiosDraft: TTerrainRatioMap) {
        const terrainRatios = normalizeTerrainRatios(get().terrainRatios);
        const changed = Object.keys(terrainRatios).some((key) => {
          const terrainKey = key as TTerrainRatioKey;
          return Math.abs(terrainRatios[terrainKey] - terrainRatiosDraft[terrainKey]) > 0.0001;
        });
        if (!changed) return;
        set({ terrainRatios: terrainRatiosDraft, hoverIndex: null });
      },
      setDisplaySettings(displaySettings: TMapDisplaySettings) {
        const normalizedSettings = displaySettings.countryBorders
          ? displaySettings
          : { ...displaySettings, provinceBorders: false };
        set({ displaySettings: normalizedSettings });
      },
      setDisplayLayer<K extends keyof TMapDisplaySettings>(layer: K, enabled: boolean) {
        const current = get().displaySettings;
        const nextSettings = { ...current, [layer]: enabled };
        if (!nextSettings.countryBorders) nextSettings.provinceBorders = false;
        set({ displaySettings: nextSettings });
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
        set({ ...DEFAULT_STATE, hoverIndex: null, hoverClientPoint: null });
      },
    }),
    {
      name: 'map-explorer',
      partialize: (state) => ({
        seed: state.seed,
        cellCount: state.cellCount,
        seaLevel: state.seaLevel,
        terrainPreset: state.terrainPreset,
        nationCount: state.nationCount,
        terrainRatios: state.terrainRatios,
        displaySettings: state.displaySettings,
      }),
      version: 4,
      migrate: (persistedState) => {
        const state = persistedState as Partial<TMapExplorerState> | undefined;
        if (!state) return DEFAULT_STATE;
        const terrainRatios = migrateLegacyTerrainRatios(
          state.terrainRatios as unknown as Partial<Record<string, number>> | undefined
        );
        return { ...DEFAULT_STATE, ...state, terrainRatios };
      },
    }
  )
);
