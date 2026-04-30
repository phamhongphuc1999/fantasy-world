import { MAP_HYDROLOGY_CONFIG } from 'src/configs/mapConfig';
import { TMapCell } from 'src/types/global';
import { buildLakeSizeMap, buildPlainsRegionSizeMap } from './lakes';

const T_COAST_OUTLET = MAP_HYDROLOGY_CONFIG.coastOutletId;
function validateRivers(
  cells: TMapCell[],
  flow: Float32Array,
  downstream: Int32Array,
  isRiver: Uint8Array
) {
  const lakeSizeByCell = buildLakeSizeMap(cells);
  const validRiver = new Uint8Array(cells.length);
  const plainsRegionSizeByCell = buildPlainsRegionSizeMap(cells);
  const hasLargePlains = plainsRegionSizeByCell.some(
    (size) => size >= MAP_HYDROLOGY_CONFIG.largePlainMinCells
  );
  const hasVeryLargePlains = plainsRegionSizeByCell.some(
    (size) => size >= MAP_HYDROLOGY_CONFIG.veryLargePlainMinCells
  );
  const candidates: Array<{
    chain: number[];
    peakFlow: number;
    sourceId: number;
    plainCoverage: number;
    veryLargePlainCoverage: number;
    endType: 'sea' | 'large-lake' | 'plain' | 'invalid';
    joinsRiverCellId: number | null;
    score: number;
  }> = [];
  function addCandidates(
    mask: Uint8Array,
    minSourceElevation: number,
    minLength: number,
    minFlow: number
  ) {
    const upstreamCount = new Int32Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      if (mask[cellIndex] !== 1) continue;
      const downstreamId = downstream[cellIndex];
      if (downstreamId >= 0 && mask[downstreamId] === 1) {
        upstreamCount[downstreamId] += 1;
      }
    }

    const visited = new Uint8Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      if (mask[cellIndex] !== 1) continue;
      if (upstreamCount[cellIndex] > 0) continue;
      if (flow[cellIndex] < minFlow) continue;

      const chain: number[] = [];
      let cursor = cellIndex;
      let endType: 'sea' | 'large-lake' | 'plain' | 'invalid' = 'invalid';
      let joinsRiverCellId: number | null = null;

      while (cursor >= 0 && cursor < cells.length && visited[cursor] === 0 && mask[cursor] === 1) {
        visited[cursor] = 1;
        chain.push(cursor);
        const next = downstream[cursor];

        if (next === T_COAST_OUTLET) {
          endType = 'sea';
          break;
        }

        if (next < 0) {
          const tailCell = cells[cursor];
          endType = tailCell.terrain === 'plains' ? 'plain' : 'invalid';
          break;
        }

        if (cells[next].isLake) {
          const lakeSize = lakeSizeByCell.get(next) || 1;
          endType = lakeSize >= MAP_HYDROLOGY_CONFIG.largeLakeMinCells ? 'large-lake' : 'invalid';
          break;
        }

        if (cells[next].isWater) {
          endType = 'invalid';
          break;
        }

        if (isRiver[next] === 1 && visited[next] === 1) {
          joinsRiverCellId = next;
          endType = 'sea';
          break;
        }

        if (mask[next] === 0 && isRiver[next] === 1) {
          joinsRiverCellId = next;
          endType = 'sea';
          break;
        }
        cursor = next;
      }

      const sourceCell = cells[cellIndex];
      const sourceLakeSize = sourceCell.isLake ? lakeSizeByCell.get(cellIndex) || 1 : 0;
      const validPlainSource =
        sourceCell.terrain === 'plains' &&
        flow[cellIndex] >= MAP_HYDROLOGY_CONFIG.plainRiverSourceFlowMin;
      const validTundraSource =
        sourceCell.terrain === 'tundra' &&
        flow[cellIndex] >= MAP_HYDROLOGY_CONFIG.tundraRiverSourceFlowMin;
      const validSource =
        sourceCell.elevation >= minSourceElevation ||
        sourceLakeSize >= MAP_HYDROLOGY_CONFIG.largeLakeMinCells ||
        validPlainSource ||
        validTundraSource;
      const validEnd =
        endType === 'sea' ||
        endType === 'large-lake' ||
        (endType === 'plain' && sourceCell.terrain !== 'tundra');
      const validLength = chain.length >= minLength;

      if (!(validSource && validEnd && validLength)) continue;

      let peakFlow = 0;
      let plainsCells = 0;
      let veryLargePlainsCells = 0;
      for (const id of chain) {
        peakFlow = Math.max(peakFlow, flow[id]);
        if (plainsRegionSizeByCell[id] >= MAP_HYDROLOGY_CONFIG.largePlainMinCells) {
          plainsCells += 1;
        }
        if (plainsRegionSizeByCell[id] >= MAP_HYDROLOGY_CONFIG.veryLargePlainMinCells) {
          veryLargePlainsCells += 1;
        }
      }
      const plainCoverage = plainsCells / chain.length;
      const veryLargePlainCoverage = veryLargePlainsCells / chain.length;
      const score =
        peakFlow +
        plainCoverage * MAP_HYDROLOGY_CONFIG.largeRiverPlainPriorityBonus +
        veryLargePlainCoverage * MAP_HYDROLOGY_CONFIG.veryLargePlainRiverBonus +
        (endType === 'sea' && veryLargePlainCoverage > 0
          ? MAP_HYDROLOGY_CONFIG.veryLargePlainSeaOutletBonus
          : 0) +
        chain.length * MAP_HYDROLOGY_CONFIG.riverLengthPriorityWeight +
        (joinsRiverCellId !== null ? MAP_HYDROLOGY_CONFIG.tributaryJoinBonus : 0);
      candidates.push({
        chain,
        peakFlow,
        sourceId: cellIndex,
        plainCoverage,
        veryLargePlainCoverage,
        endType,
        joinsRiverCellId,
        score,
      });
    }
  }

  addCandidates(
    isRiver,
    MAP_HYDROLOGY_CONFIG.riverSourceElevationMin,
    MAP_HYDROLOGY_CONFIG.riverMinLength,
    MAP_HYDROLOGY_CONFIG.riverFlowMin
  );

  if (candidates.length < MAP_HYDROLOGY_CONFIG.minRiverCount) {
    const relaxedMask = new Uint8Array(cells.length);
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      const cell = cells[cellIndex];
      const downstreamId = downstream[cellIndex];
      if (cell.isWater) continue;
      if (!(downstreamId >= 0 || downstreamId === T_COAST_OUTLET)) continue;
      if (flow[cellIndex] < MAP_HYDROLOGY_CONFIG.relaxedRiverFlowMin) continue;
      relaxedMask[cellIndex] = 1;
    }
    addCandidates(
      relaxedMask,
      MAP_HYDROLOGY_CONFIG.riverSourceElevationMin -
        MAP_HYDROLOGY_CONFIG.relaxedRiverSourceElevationDrop,
      MAP_HYDROLOGY_CONFIG.relaxedRiverMinLength,
      MAP_HYDROLOGY_CONFIG.relaxedRiverFlowMin
    );
  }

  if (candidates.length === 0) {
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
      cells[cellIndex].isRiver = false;
    }
    return;
  }

  const landCellCount = cells.filter((cell) => !cell.isWater).length;
  const isLargeLand = landCellCount >= MAP_HYDROLOGY_CONFIG.riverTargetLandThreshold;
  const targetLarge = isLargeLand
    ? MAP_HYDROLOGY_CONFIG.largeRiverMaxCountLargeLand
    : MAP_HYDROLOGY_CONFIG.largeRiverCountSmallLand;
  const minLargeBase = isLargeLand ? MAP_HYDROLOGY_CONFIG.largeRiverMinCountLargeLand : 1;
  const minLarge = hasLargePlains ? Math.max(2, minLargeBase) : minLargeBase;
  let targetSmall = isLargeLand
    ? MAP_HYDROLOGY_CONFIG.smallRiverTargetLargeLand
    : MAP_HYDROLOGY_CONFIG.smallRiverTargetSmallLand;
  if (hasVeryLargePlains) {
    targetSmall += 3;
  }
  const minimumRiverCount = MAP_HYDROLOGY_CONFIG.minRiverCount;

  const sortedCandidates = [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.chain.length !== a.chain.length) return b.chain.length - a.chain.length;
    return b.peakFlow - a.peakFlow;
  });
  const preferredMinLength = Math.max(
    MAP_HYDROLOGY_CONFIG.riverMinLength + 3,
    MAP_HYDROLOGY_CONFIG.relaxedRiverMinLength + 4
  );
  const selectedChains: number[][] = [];
  const selectedSource = new Set<number>();
  const usedCells = new Set<number>();

  if (hasVeryLargePlains) {
    const plainFocusedCandidates = sortedCandidates
      .filter((candidate) => candidate.veryLargePlainCoverage > 0 && candidate.endType === 'sea')
      .sort((a, b) => b.chain.length - a.chain.length)
      .slice(0, MAP_HYDROLOGY_CONFIG.veryLargePlainMinRiverCount);
    for (const candidate of plainFocusedCandidates) {
      if (selectedSource.has(candidate.sourceId)) continue;
      selectedChains.push(candidate.chain);
      selectedSource.add(candidate.sourceId);
      for (const cellId of candidate.chain) usedCells.add(cellId);
    }
  }

  const largeTake = Math.min(targetLarge, sortedCandidates.length);
  const forcedLargeTake = Math.min(minLarge, sortedCandidates.length);

  for (let index = 0; index < forcedLargeTake; index += 1) {
    const candidate = sortedCandidates[index];
    selectedChains.push(candidate.chain);
    selectedSource.add(candidate.sourceId);
    for (const cellId of candidate.chain) usedCells.add(cellId);
  }

  for (let index = forcedLargeTake; index < largeTake; index += 1) {
    const candidate = sortedCandidates[index];
    if (selectedSource.has(candidate.sourceId)) continue;
    selectedChains.push(candidate.chain);
    selectedSource.add(candidate.sourceId);
    for (const cellId of candidate.chain) usedCells.add(cellId);
  }

  const remaining = sortedCandidates.filter((candidate) => !selectedSource.has(candidate.sourceId));
  const preferredRemaining = remaining.filter(
    (candidate) => candidate.chain.length >= preferredMinLength
  );
  const shortRemaining = remaining.filter(
    (candidate) => candidate.chain.length < preferredMinLength
  );
  let selectedSmall = 0;

  for (const candidate of preferredRemaining) {
    if (selectedSmall >= targetSmall) break;

    let overlapCount = 0;
    for (const cellId of candidate.chain) {
      if (usedCells.has(cellId)) overlapCount += 1;
    }
    const overlapRatio = overlapCount / candidate.chain.length;
    const maxOverlapRatio =
      candidate.joinsRiverCellId !== null ? MAP_HYDROLOGY_CONFIG.tributaryMaxOverlapRatio : 0.8;
    if (overlapRatio > maxOverlapRatio) continue;

    selectedChains.push(candidate.chain);
    selectedSmall += 1;
    for (const cellId of candidate.chain) usedCells.add(cellId);
  }

  if (selectedSmall < targetSmall) {
    for (const candidate of shortRemaining) {
      if (selectedSmall >= targetSmall) break;

      let overlapCount = 0;
      for (const cellId of candidate.chain) {
        if (usedCells.has(cellId)) overlapCount += 1;
      }
      const overlapRatio = overlapCount / candidate.chain.length;
      const maxOverlapRatio =
        candidate.joinsRiverCellId !== null ? MAP_HYDROLOGY_CONFIG.tributaryMaxOverlapRatio : 0.8;
      if (overlapRatio > maxOverlapRatio) continue;

      selectedChains.push(candidate.chain);
      selectedSmall += 1;
      for (const cellId of candidate.chain) usedCells.add(cellId);
    }
  }

  if (selectedChains.length < minimumRiverCount) {
    for (const candidate of remaining) {
      if (selectedSource.has(candidate.sourceId)) continue;
      selectedChains.push(candidate.chain);
      selectedSource.add(candidate.sourceId);
      if (selectedChains.length >= minimumRiverCount) break;
    }
  }

  for (const chain of selectedChains) {
    for (const cellId of chain) {
      validRiver[cellId] = 1;
    }
  }

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    cells[cellIndex].isRiver = validRiver[cellIndex] === 1;
  }
}

function addInlandPlainTributaries(cells: TMapCell[], flow: Float32Array, downstream: Int32Array) {
  const regionIdByCell = new Int32Array(cells.length);
  regionIdByCell.fill(-1);
  const regionSizes: number[] = [];
  const visited = new Uint8Array(cells.length);

  let regionId = 0;
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (visited[cellIndex] === 1) continue;
    if (cells[cellIndex].terrain !== 'plains' || cells[cellIndex].isWater) continue;

    const queue = [cellIndex];
    const regionCells: number[] = [];
    visited[cellIndex] = 1;

    while (queue.length > 0) {
      const current = queue.pop();
      if (current === undefined) continue;
      regionCells.push(current);
      regionIdByCell[current] = regionId;

      for (const neighborId of cells[current].neighbors) {
        if (visited[neighborId] === 1) continue;
        if (cells[neighborId].terrain !== 'plains' || cells[neighborId].isWater) continue;
        visited[neighborId] = 1;
        queue.push(neighborId);
      }
    }
    regionSizes[regionId] = regionCells.length;
    regionId += 1;
  }

  const candidateSources = Array.from({ length: cells.length }, (_, cellIndex) => cellIndex)
    .filter((cellIndex) => {
      const cell = cells[cellIndex];
      if (cell.isWater || cell.isRiver) return false;
      if (cell.terrain !== 'plains') return false;
      const currentRegionId = regionIdByCell[cellIndex];
      if (currentRegionId < 0) return false;
      if (regionSizes[currentRegionId] < MAP_HYDROLOGY_CONFIG.veryLargePlainMinCells) return false;
      return flow[cellIndex] >= MAP_HYDROLOGY_CONFIG.inlandPlainTributaryMinFlow;
    })
    .sort((left, right) => flow[right] - flow[left]);

  const selectedByRegion = new Map<number, number>();
  const minLength = MAP_HYDROLOGY_CONFIG.inlandPlainTributaryMinLength;

  for (const sourceId of candidateSources) {
    const currentRegionId = regionIdByCell[sourceId];
    if (currentRegionId < 0) continue;
    const selectedCount = selectedByRegion.get(currentRegionId) || 0;
    if (selectedCount >= MAP_HYDROLOGY_CONFIG.inlandPlainTributaryMaxPerPlain) continue;

    const chain: number[] = [];
    const visited = new Set<number>();
    let cursor = sourceId;
    let connected = false;

    while (cursor >= 0 && cursor < cells.length && !visited.has(cursor)) {
      visited.add(cursor);
      chain.push(cursor);
      const next = downstream[cursor];

      if (next === T_COAST_OUTLET) {
        connected = true;
        break;
      }
      if (next < 0) break;
      if (cells[next].isWater) break;
      if (cells[next].isRiver) {
        connected = true;
        break;
      }
      cursor = next;
    }
    if (!connected || chain.length < minLength) continue;
    for (const cellId of chain) {
      cells[cellId].isRiver = true;
    }
    selectedByRegion.set(currentRegionId, selectedCount + 1);
  }
}

function extendRiversTowardHighlands(
  cells: TMapCell[],
  flow: Float32Array,
  downstream: Int32Array,
  seaLevel: number
) {
  const upstreamRiverCount = new Int32Array(cells.length);
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    if (!cells[cellIndex].isRiver) continue;
    const next = cells[cellIndex].downstreamId;
    if (next !== null && next >= 0 && cells[next].isRiver) {
      upstreamRiverCount[next] += 1;
    }
  }

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const head = cells[cellIndex];
    if (!head.isRiver) continue;
    if (upstreamRiverCount[cellIndex] > 0) continue;
    if (head.terrain !== 'plains' && head.terrain !== 'valley') continue;

    let cursor = cellIndex;
    let reachedHighland = false;
    const visited = new Set<number>();

    for (let step = 0; step < MAP_HYDROLOGY_CONFIG.highlandRiverExtensionMaxSteps; step += 1) {
      visited.add(cursor);
      let bestNeighborId = -1;
      let bestScore = -Infinity;

      for (const neighborId of cells[cursor].neighbors) {
        const neighbor = cells[neighborId];
        if (visited.has(neighborId)) continue;
        if (neighbor.isWater || neighbor.isRiver) continue;
        if (flow[neighborId] < MAP_HYDROLOGY_CONFIG.highlandRiverExtensionMinFlow) continue;
        if (neighbor.elevation <= cells[cursor].elevation) continue;

        const isHighland = neighbor.terrain === 'hills' || neighbor.terrain === 'mountains';
        const score =
          neighbor.elevation +
          (isHighland ? 0.35 : 0) +
          Math.max(0, neighbor.elevation - seaLevel) * 0.5;
        if (score > bestScore) {
          bestScore = score;
          bestNeighborId = neighborId;
        }
      }
      if (bestNeighborId < 0) break;

      downstream[bestNeighborId] = cursor;
      cells[bestNeighborId].downstreamId = cursor;
      cells[bestNeighborId].isRiver = true;

      if (
        cells[bestNeighborId].terrain === 'hills' ||
        cells[bestNeighborId].terrain === 'mountains' ||
        cells[bestNeighborId].elevation >= MAP_HYDROLOGY_CONFIG.highlandRiverTargetElevationMin
      ) {
        reachedHighland = true;
        break;
      }
      cursor = bestNeighborId;
    }
    if (!reachedHighland) continue;
  }
}

export { addInlandPlainTributaries, extendRiversTowardHighlands, validateRivers };
