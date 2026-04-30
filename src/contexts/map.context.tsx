'use client';

import { Delaunay } from 'd3-delaunay';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MAP_VIEWPORT_CONFIG } from 'src/configs/mapConfig';
import { buildGeopolitics } from 'src/services/map/buildGeopolitics';
import { buildHydrology } from 'src/services/map/buildHydrology';
import { buildMesh } from 'src/services/map/buildMesh';
import { buildPopulation } from 'src/services/map/buildPopulation';
import { buildTopography } from 'src/services/map/buildTopography';
import { createSeededRandom } from 'src/services/map/seededRandom';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TMapMeshWithDelaunay } from 'src/types/global';

export type TMapContextType = {
  mesh: TMapMeshWithDelaunay;
  isGenerating: boolean;
  handlePointerMove: (x: number, y: number) => void;
  handleApplySeed: () => void;
  handleRandomizeSeed: () => void;
  handleCellCountChange: (nextValue: number) => void;
  handleSeaLevelDraftChange: (nextValue: number) => void;
};

const mapContextDefault: TMapContextType = {
  mesh: {
    width: MAP_VIEWPORT_CONFIG.width,
    height: MAP_VIEWPORT_CONFIG.height,
    cells: [],
    edges: [],
    vertices: [],
    nations: [],
    ethnicGroups: [],
    delaunay: Delaunay.from([[0, 0]]),
  },
  isGenerating: true,
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
  const generationIdRef = useRef(0);
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

  const [mesh, setMesh] = useState<TMapMeshWithDelaunay>(mapContextDefault.mesh);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    generationIdRef.current += 1;
    const generationId = generationIdRef.current;
    setIsGenerating(true);

    const timer = window.setTimeout(() => {
      const baseMesh = buildMesh({
        width: MAP_VIEWPORT_CONFIG.width,
        height: MAP_VIEWPORT_CONFIG.height,
        seed,
        cellCount,
      });
      const topographyMesh = buildTopography({ mesh: baseMesh, seed, seaLevel, terrainPreset });
      const hydrologyMesh = buildHydrology({ mesh: topographyMesh, seaLevel, terrainRatios });
      const populationMesh = buildPopulation({ mesh: hydrologyMesh, seed });
      const nextMesh = buildGeopolitics({
        mesh: populationMesh,
        seed,
        customCountryMode,
        customCountryCount,
      });
      if (generationId !== generationIdRef.current) return;
      setMesh(nextMesh);
      setIsGenerating(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
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
      if (mesh.cells.length === 0) return;
      const i = mesh.delaunay.find(x, y);
      setHoverIndex(i);
    },
    [mesh.cells.length, mesh.delaunay, setHoverIndex]
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
      isGenerating,
      handlePointerMove,
      handleApplySeed,
      handleRandomizeSeed,
      handleCellCountChange,
      handleSeaLevelDraftChange,
    };
  }, [
    mesh,
    isGenerating,
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
