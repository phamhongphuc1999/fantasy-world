'use client';

import { useSyncExternalStore } from 'react';
import { MAP_EXPLORER_DEFAULT_CONFIG } from 'src/configs/mapConfig';
import { TMapExplorerState, TMapRenderMode, TTerrainPreset } from 'src/types/global';

type TMapExplorerListener = () => void;

const DEFAULT_STATE: TMapExplorerState = {
  seed: MAP_EXPLORER_DEFAULT_CONFIG.seed,
  seedDraft: MAP_EXPLORER_DEFAULT_CONFIG.seed,
  cellCount: MAP_EXPLORER_DEFAULT_CONFIG.cellCount,
  seaLevel: MAP_EXPLORER_DEFAULT_CONFIG.seaLevel,
  seaLevelDraft: MAP_EXPLORER_DEFAULT_CONFIG.seaLevel,
  terrainPreset: MAP_EXPLORER_DEFAULT_CONFIG.terrainPreset,
  renderMode: MAP_EXPLORER_DEFAULT_CONFIG.renderMode,
  hoverIndex: null,
  selectedIndex: null,
};

let state: TMapExplorerState = DEFAULT_STATE;
const listeners = new Set<TMapExplorerListener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: TMapExplorerListener) {
  listeners.add(listener);

  return function unsubscribe() {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function setState(nextState: Partial<TMapExplorerState>) {
  state = { ...state, ...nextState };
  emitChange();
}

export function useMapExplorerStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setSeed(seed: string) {
      setState({ seed, seedDraft: seed, hoverIndex: null, selectedIndex: null });
    },
    setSeedDraft(seedDraft: string) {
      setState({ seedDraft });
    },
    setCellCount(cellCount: number) {
      setState({ cellCount, hoverIndex: null, selectedIndex: null });
    },
    setSeaLevel(seaLevel: number) {
      setState({ seaLevel, seaLevelDraft: seaLevel, hoverIndex: null, selectedIndex: null });
    },
    setSeaLevelDraft(seaLevelDraft: number) {
      setState({ seaLevelDraft });
    },
    applySeaLevel() {
      if (state.seaLevel === state.seaLevelDraft) return;
      setState({ seaLevel: state.seaLevelDraft, hoverIndex: null, selectedIndex: null });
    },
    setTerrainPreset(terrainPreset: TTerrainPreset) {
      setState({ terrainPreset, hoverIndex: null, selectedIndex: null });
    },
    setRenderMode(renderMode: TMapRenderMode) {
      setState({ renderMode });
    },
    setHoverIndex(hoverIndex: number | null) {
      if (state.hoverIndex === hoverIndex) return;
      setState({ hoverIndex });
    },
    toggleSelectedIndex(selectedIndex: number) {
      setState({ selectedIndex: state.selectedIndex === selectedIndex ? null : selectedIndex });
    },
    resetSelection() {
      setState({ hoverIndex: null, selectedIndex: null });
    },
  };
}
