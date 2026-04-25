import { Delaunay } from 'd3-delaunay';
import { classifyTerrain } from 'src/features/map/core/classifyTerrain';
import { TMapMesh, TPoint } from 'src/types/global';

interface TBuildHydrologyOptions {
  mesh: TMapMesh & { delaunay: Delaunay<TPoint> };
  seaLevel: number;
}

function sortIndicesByElevation(elevations: Float32Array) {
  return Array.from({ length: elevations.length }, (_, index) => index).sort(
    (leftIndex, rightIndex) => elevations[rightIndex] - elevations[leftIndex]
  );
}

export function buildHydrology({
  mesh,
  seaLevel,
}: TBuildHydrologyOptions): TMapMesh & { delaunay: Delaunay<TPoint> } {
  const cellCount = mesh.cells.length;
  const elevations = new Float32Array(cellCount);
  const adjustedElevations = new Float32Array(cellCount);
  const flow = new Float32Array(cellCount);
  const erosion = new Float32Array(cellCount);
  const deposit = new Float32Array(cellCount);
  const downstream = new Int32Array(cellCount);
  const isLake = new Uint8Array(cellCount);
  const isRiver = new Uint8Array(cellCount);

  downstream.fill(-1);

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    elevations[cellIndex] = mesh.cells[cellIndex].elevation;
    adjustedElevations[cellIndex] = mesh.cells[cellIndex].elevation;
    flow[cellIndex] = mesh.cells[cellIndex].isWater ? 0 : 1;
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    if (mesh.cells[cellIndex].isWater) {
      continue;
    }

    let nextCellId = -1;
    let nextElevation = elevations[cellIndex];

    for (const neighborId of mesh.cells[cellIndex].neighbors) {
      if (elevations[neighborId] < nextElevation) {
        nextElevation = elevations[neighborId];
        nextCellId = neighborId;
      }
    }

    downstream[cellIndex] = nextCellId;
  }

  const sortedIndices = sortIndicesByElevation(elevations);

  for (const cellIndex of sortedIndices) {
    const downstreamId = downstream[cellIndex];

    if (downstreamId >= 0) {
      flow[downstreamId] += flow[cellIndex];
    }
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const cell = mesh.cells[cellIndex];
    const downstreamId = downstream[cellIndex];
    const isSink = downstreamId === -1 && !cell.isWater;
    const localFlow = flow[cellIndex];
    const slope =
      downstreamId >= 0 ? Math.max(0, elevations[cellIndex] - elevations[downstreamId]) : 0;
    const erosionAmount =
      cell.isWater || isSink ? 0 : Math.min(0.08, slope * 0.2 + Math.log2(localFlow + 1) * 0.012);

    erosion[cellIndex] = erosionAmount;

    if (downstreamId >= 0) {
      deposit[downstreamId] += erosionAmount * 0.42;
    }

    if (isSink && localFlow > 3.5) {
      isLake[cellIndex] = 1;
    }
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    adjustedElevations[cellIndex] = Math.min(
      1,
      Math.max(0, elevations[cellIndex] - erosion[cellIndex] + deposit[cellIndex])
    );
  }

  for (let cellIndex = 0; cellIndex < cellCount; cellIndex += 1) {
    const downstreamId = downstream[cellIndex];
    const cell = mesh.cells[cellIndex];
    const isCellWater = cell.isWater || isLake[cellIndex] === 1;
    const riverThreshold = cell.isWater ? 0 : 5.5;

    if (!isCellWater && downstreamId >= 0 && flow[cellIndex] >= riverThreshold) {
      isRiver[cellIndex] = 1;
    }
  }

  const cells = mesh.cells.map((cell, cellIndex) => {
    const elevation = adjustedElevations[cellIndex];
    const isCellWater = cell.isWater || isLake[cellIndex] === 1;
    const terrain = isCellWater
      ? classifyTerrain(Math.min(elevation, seaLevel - 0.01), seaLevel)
      : classifyTerrain(elevation, seaLevel);

    return {
      ...cell,
      elevation,
      isWater: isCellWater,
      terrain,
      flow: flow[cellIndex],
      downstreamId: downstream[cellIndex] >= 0 ? downstream[cellIndex] : null,
      erosion: erosion[cellIndex],
      isRiver: isRiver[cellIndex] === 1,
      isLake: isLake[cellIndex] === 1,
    };
  });

  return {
    ...mesh,
    cells,
  };
}
