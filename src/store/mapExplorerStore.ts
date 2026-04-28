'use client';

import { useSyncExternalStore } from 'react';
import { TMapExplorerState, TTerrainPreset } from 'src/types/global';

type TMapExplorerListener = () => void;

const DEFAULT_STATE: TMapExplorerState = {
  seed: 'world-001',
  seedDraft: 'world-001',
  cellCount: 420,
  seaLevel: 0.46,
  terrainPreset: 'balanced',
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
  state = {
    ...state,
    ...nextState,
  };
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
      setState({ seaLevel, hoverIndex: null, selectedIndex: null });
    },
    setTerrainPreset(terrainPreset: TTerrainPreset) {
      setState({ terrainPreset, hoverIndex: null, selectedIndex: null });
    },
    setHoverIndex(hoverIndex: number | null) {
      if (state.hoverIndex === hoverIndex) {
        return;
      }

      setState({ hoverIndex });
    },
    toggleSelectedIndex(selectedIndex: number) {
      setState({
        selectedIndex: state.selectedIndex === selectedIndex ? null : selectedIndex,
      });
    },
    resetSelection() {
      setState({ hoverIndex: null, selectedIndex: null });
    },
  };
}
