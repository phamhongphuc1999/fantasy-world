'use client';

import { DEFAULT_CONFIG } from 'src/configs/mapConfig';
import {
  normalizeTerrainRatios,
  rebalanceTerrainRatioAfterChange,
} from 'src/services/map/terrainRatios';
import {
  TNationMode,
  TMapDisplaySettings,
  TMapExplorerState,
  TTerrainRatioKey,
  TTerrainPreset,
} from 'src/types/map.types';
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
  setNationMode: (nationMode: TNationMode) => void;
  setNationCount: (nationCount: number) => boolean;
  setTerrainRatioDraft: (terrain: TTerrainRatioKey, ratio: number) => void;
  applyTerrainRatios: () => void;
  cancelTerrainRatios: () => void;
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
  seed: DEFAULT_CONFIG.seed,
  seedDraft: DEFAULT_CONFIG.seed,
  cellCount: DEFAULT_CONFIG.cellCount,
  seaLevel: DEFAULT_CONFIG.seaLevel,
  seaLevelDraft: DEFAULT_CONFIG.seaLevel,
  terrainPreset: DEFAULT_CONFIG.terrainPreset,
  nationMode: DEFAULT_CONFIG.nationMode,
  nationCount: DEFAULT_CONFIG.nationCount,
  terrainRatios: DEFAULT_CONFIG.terrainRatios,
  terrainRatiosDraft: DEFAULT_CONFIG.terrainRatios,
  displaySettings: DEFAULT_CONFIG.displaySettings,
  hoverVisualizationEnabled: true,
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
      setNationMode(nationMode: TNationMode) {
        set({ nationMode, hoverIndex: null });
      },
      setNationCount(nationCount: number) {
        if (nationCount < 2 || nationCount > 40) return false;
        set({ nationCount, hoverIndex: null });
        return true;
      },
      setTerrainRatioDraft(terrain: TTerrainRatioKey, ratio: number) {
        const current = normalizeTerrainRatios(get().terrainRatiosDraft);
        const next = rebalanceTerrainRatioAfterChange(current, terrain, ratio);
        set({ terrainRatiosDraft: next });
      },
      applyTerrainRatios() {
        const terrainRatios = normalizeTerrainRatios(get().terrainRatios);
        const terrainRatiosDraft = normalizeTerrainRatios(get().terrainRatiosDraft);
        const changed = Object.keys(terrainRatios).some((key) => {
          const terrainKey = key as TTerrainRatioKey;
          return Math.abs(terrainRatios[terrainKey] - terrainRatiosDraft[terrainKey]) > 0.0001;
        });
        if (!changed) return;
        set({ terrainRatios: terrainRatiosDraft, hoverIndex: null });
      },
      cancelTerrainRatios() {
        const terrainRatios = normalizeTerrainRatios(get().terrainRatios);
        set({ terrainRatiosDraft: terrainRatios });
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
        set({ ...DEFAULT_STATE, hoverIndex: null, hoverClientPoint: null });
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
        nationMode: state.nationMode,
        nationCount: state.nationCount,
        terrainRatios: state.terrainRatios,
        terrainRatiosDraft: state.terrainRatiosDraft,
        displaySettings: state.displaySettings,
        hoverVisualizationEnabled: state.hoverVisualizationEnabled,
      }),
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as Partial<TMapExplorerState> | undefined;
        if (!state) return DEFAULT_STATE;
        const displaySettings = {
          ...DEFAULT_STATE.displaySettings,
          ...(state.displaySettings ?? {}),
        };
        const terrainRatios = migrateLegacyTerrainRatios(
          state.terrainRatios as unknown as Partial<Record<string, number>> | undefined
        );
        const terrainRatiosDraft = migrateLegacyTerrainRatios(
          state.terrainRatiosDraft as unknown as Partial<Record<string, number>> | undefined
        );
        return { ...DEFAULT_STATE, ...state, displaySettings, terrainRatios, terrainRatiosDraft };
      },
    }
  )
);
