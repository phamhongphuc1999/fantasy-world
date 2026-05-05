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
import { MapGenerator } from 'src/services/map/map.generator';
import { useMapExplorerStore } from 'src/store/mapExplorerStore';
import { TMapExportSnapshot } from 'src/types/mapExport';
import { TMapMeshWithDelaunay } from 'src/types/map.types';

interface TMapContextType {
  mesh: TMapMeshWithDelaunay;
  isGenerating: boolean;
  importFromSnapshot: (snapshot: TMapExportSnapshot) => { ok: true } | { ok: false; error: string };
  handlePointerMove: (x: number, y: number) => void;
  handleCellCountChange: (nextValue: number) => void;
}

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
  importFromSnapshot: () => ({ ok: false, error: 'Map context not ready' }),
  handlePointerMove: () => {},
  handleCellCountChange: () => {},
};

const MapContext = createContext<TMapContextType>(mapContextDefault);

interface TProps {
  children: ReactNode;
}

export default function MapProvider({ children }: TProps) {
  const generationIdRef = useRef(0);
  const {
    seed,
    cellCount,
    seaLevel,
    terrainPreset,
    terrainRatios,
    nationCount,
    setCellCount,
    setHoverIndex,
  } = useMapExplorerStore();

  const [mesh, setMesh] = useState<TMapMeshWithDelaunay>(mapContextDefault.mesh);
  const [isGenerating, setIsGenerating] = useState(true);

  const importFromSnapshot = useCallback(
    (snapshot: TMapExportSnapshot) => {
      if (snapshot.schemaVersion !== 1) {
        return { ok: false as const, error: 'Unsupported schema version' };
      }

      if (
        !snapshot.mesh ||
        !Array.isArray(snapshot.mesh.cells) ||
        snapshot.mesh.cells.length === 0
      ) {
        return { ok: false as const, error: 'Invalid mesh payload' };
      }

      const nextMesh: TMapMeshWithDelaunay = {
        ...snapshot.mesh,
        delaunay: Delaunay.from(snapshot.mesh.cells.map((cell) => cell.site)),
      };

      generationIdRef.current += 1;
      setMesh(nextMesh);
      setIsGenerating(false);
      setHoverIndex(null);
      return { ok: true as const };
    },
    [setHoverIndex]
  );

  useEffect(() => {
    generationIdRef.current += 1;
    const generationId = generationIdRef.current;
    setIsGenerating(true);

    const timer = window.setTimeout(() => {
      const generator = new MapGenerator({
        width: MAP_VIEWPORT_CONFIG.width,
        height: MAP_VIEWPORT_CONFIG.height,
        seed,
        cellCount,
        seaLevel,
        terrainPreset,
        terrainRatios,
        nationCount,
      });
      const nextMesh = generator.generate();
      if (generationId !== generationIdRef.current) return;
      setMesh(nextMesh);
      setIsGenerating(false);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cellCount, nationCount, seaLevel, seed, terrainPreset, terrainRatios]);

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      if (mesh.cells.length === 0) return;
      const i = mesh.delaunay.find(x, y);
      setHoverIndex(i);
    },
    [mesh.cells.length, mesh.delaunay, setHoverIndex]
  );

  const handleCellCountChange = useCallback(
    (nextValue: number) => {
      setCellCount(
        Math.min(MAP_VIEWPORT_CONFIG.maxCells, Math.max(MAP_VIEWPORT_CONFIG.minCells, nextValue))
      );
    },
    [setCellCount]
  );

  const contextData = useMemo<TMapContextType>(() => {
    return {
      mesh,
      isGenerating,
      importFromSnapshot,
      handlePointerMove,
      handleCellCountChange,
    };
  }, [mesh, isGenerating, importFromSnapshot, handlePointerMove, handleCellCountChange]);

  return <MapContext.Provider value={contextData}>{children}</MapContext.Provider>;
}

export function useMapContext() {
  return useContext(MapContext);
}
