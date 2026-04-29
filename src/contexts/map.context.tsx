'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef } from 'react';
import { MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { buildGeopolitics } from 'src/services/map/buildGeopolitics';
import { buildHydrology } from 'src/services/map/buildHydrology';
import { buildMesh } from 'src/services/map/buildMesh';
import { buildTopography } from 'src/services/map/buildTopography';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TMapMeshWithDelaunay } from 'src/types/global';

export type TMapContextType = {
  mesh: TMapMeshWithDelaunay;
  handlePointerMove: (x: number, y: number) => void;
  handleApplySeed: () => void;
  handleRandomizeSeed: () => void;
  handleCellCountChange: (nextValue: number) => void;
  handleSeaLevelDraftChange: (nextValue: number) => void;
};

const mapContextDefault: TMapContextType = {
  mesh: {} as TMapMeshWithDelaunay,
  handlePointerMove: () => {},
  handleApplySeed: () => {},
  handleRandomizeSeed: () => {},
  handleCellCountChange: () => {},
  handleSeaLevelDraftChange: () => {},
};

const MapContext = createContext<TMapContextType>(mapContextDefault);

interface TProps {
  children: ReactNode;
}

export default function MapProvider({ children }: TProps) {
  const randomizeCountRef = useRef(0);
  const {
    seed,
    seedDraft,
    cellCount,
    seaLevel,
    terrainPreset,
    terrainRatios,
    customCountryMode,
    customCountryCount,
    setSeed,
    setCellCount,
    setSeaLevelDraft,
    setHoverIndex,
  } = useMapExplorerStore();

  const mesh = useMemo(() => {
    const baseMesh = buildMesh({
      width: MAP_VIEWPORT_CONFIG.width,
      height: MAP_VIEWPORT_CONFIG.height,
      seed,
      cellCount,
    });
    const topographyMesh = buildTopography({ mesh: baseMesh, seed, seaLevel, terrainPreset });
    const hydrologyMesh = buildHydrology({ mesh: topographyMesh, seaLevel, terrainRatios });
    return buildGeopolitics({
      mesh: hydrologyMesh,
      seed,
      customCountryMode,
      customCountryCount,
    });
  }, [
    cellCount,
    customCountryCount,
    customCountryMode,
    seaLevel,
    seed,
    terrainPreset,
    terrainRatios,
  ]);

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      const i = mesh.delaunay.find(x, y);
      setHoverIndex(i);
    },
    [mesh.delaunay, setHoverIndex]
  );

  const handleApplySeed = useCallback(() => {
    const normalizedSeed = seedDraft.trim() || 'world000';
    setSeed(normalizedSeed);
  }, [seedDraft, setSeed]);

  const handleRandomizeSeed = useCallback(() => {
    randomizeCountRef.current += 1;
    const random = createSeededRandom(`${seed}:${randomizeCountRef.current}:seed-randomize`);
    const nextSeed = `world${Math.floor(random() * 1_000_000)
      .toString()
      .padStart(6, '0')}`;
    setSeed(nextSeed);
  }, [seed, setSeed]);

  const handleCellCountChange = useCallback(
    (nextValue: number) => {
      setCellCount(
        Math.min(MAP_VIEWPORT_CONFIG.maxCells, Math.max(MAP_VIEWPORT_CONFIG.minCells, nextValue))
      );
    },
    [setCellCount]
  );

  const handleSeaLevelDraftChange = useCallback(
    (nextValue: number) => {
      setSeaLevelDraft(nextValue);
    },
    [setSeaLevelDraft]
  );

  const contextData = useMemo<TMapContextType>(() => {
    return {
      mesh,
      handlePointerMove,
      handleApplySeed,
      handleRandomizeSeed,
      handleCellCountChange,
      handleSeaLevelDraftChange,
    };
  }, [
    mesh,
    handlePointerMove,
    handleApplySeed,
    handleRandomizeSeed,
    handleCellCountChange,
    handleSeaLevelDraftChange,
  ]);

  return <MapContext.Provider value={contextData}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  return useContext(MapContext);
}
