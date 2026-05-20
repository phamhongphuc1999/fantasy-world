import { TOPOGRAPHY_CONFIG } from 'src/configs/map/topography';
import { createSeededRandom, clamp } from 'src/services/utils/math';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TErosionResult {
  elevations: Float32Array;
  erosionMap: Float32Array;
  depositionMap: Float32Array;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Simple slope calculation between two cells given their elevation difference
 * and the spatial distance between their sites.
 */
function slopeBetween(elevA: number, elevB: number, dx: number, dy: number): number {
  const dist = Math.hypot(dx, dy);
  if (dist < 0.0001) return 0;
  return (elevA - elevB) / dist;
}

// ─── Erosion simulation ──────────────────────────────────────────────────────

/**
 * Run a simplified hydraulic erosion simulation on the elevation map.
 *
 * Uses a particle-based approach:
 * 1. Drop water particles at random positions
 * 2. Move each particle downhill collecting sediment
 * 3. Erode when sediment capacity exceeded, deposit when below capacity
 * 4. Evaporate water over time
 *
 * This modifies elevations in-place and returns erosion/deposition intensity maps.
 *
 * @param elevations   Input/output elevation array (normalised [0, 1])
 * @param cellSites    Array of [x, y] cell site positions
 * @param neighborMap  For each cell, array of neighbour cell indices
 * @param width        Map width in pixels
 * @param height       Map height in pixels
 * @param seed         Deterministic seed
 * @param seaLevel     Sea level threshold (cells below this are not eroded)
 */
export function simulateHydraulicErosion(
  elevations: Float32Array,
  cellSites: ReadonlyArray<[number, number]>,
  neighborMap: ReadonlyArray<ReadonlyArray<number>>,
  width: number,
  height: number,
  seed: string,
  seaLevel: number
): TErosionResult {
  const cfg = TOPOGRAPHY_CONFIG.erosion;
  const random = createSeededRandom(`${seed}:erosion`);
  const cellCount = elevations.length;

  // Track total erosion and deposition per cell for mapping
  const erosionAccum = new Float32Array(cellCount);
  const depositionAccum = new Float32Array(cellCount);

  // Working copy — we modify this as we go
  const workingElev = Float32Array.from(elevations);

  for (let pass = 0; pass < cfg.passCount; pass += 1) {
    const particleCount = Math.floor(cellCount * 0.15); // ~15% of cells per pass

    for (let p = 0; p < particleCount; p += 1) {
      // 1. Random starting cell
      const startIdx = Math.floor(random() * cellCount);

      // Skip water cells (below sea level)
      if (elevations[startIdx] < seaLevel) continue;

      let currentIdx = startIdx;
      let waterVolume = cfg.initialWaterVolume;
      let sediment = 0;

      for (let step = 0; step < cfg.maxParticleSteps; step += 1) {
        const neighbors = neighborMap[currentIdx];
        if (neighbors.length === 0) break;

        // 2. Find steepest downhill neighbour
        let steepestIdx = -1;
        let steepestSlope = 0;
        const cx = cellSites[currentIdx][0];
        const cy = cellSites[currentIdx][1];

        for (const nid of neighbors) {
          // Only move downhill
          if (workingElev[nid] >= workingElev[currentIdx]) continue;

          const nx = cellSites[nid][0];
          const ny = cellSites[nid][1];
          const slp = slopeBetween(workingElev[currentIdx], workingElev[nid], cx - nx, cy - ny);

          if (slp > steepestSlope) {
            steepestSlope = slp;
            steepestIdx = nid;
          }
        }

        if (steepestIdx < 0 || steepestSlope < cfg.minSlope) {
          // No downhill neighbour or too flat
          // Deposit remaining sediment locally
          if (sediment > 0) {
            const deposit = sediment * cfg.depositionRate;
            workingElev[currentIdx] += deposit;
            depositionAccum[currentIdx] += deposit;
            sediment -= deposit;
          }
          break;
        }

        // 3. Calculate sediment capacity (higher slope → more capacity)
        const capacity = cfg.sedimentCapacityFactor * steepestSlope * waterVolume;

        // 4. Erode or deposit
        if (sediment > capacity) {
          // Deposit excess sediment
          const excess = sediment - capacity;
          const deposit = excess * cfg.depositionRate;
          workingElev[steepestIdx] += deposit;
          depositionAccum[steepestIdx] += deposit;
          sediment -= deposit;
        } else {
          // Erode the downhill cell
          const deficit = capacity - sediment;
          const erosionAmount = Math.min(deficit * cfg.erosionRate, workingElev[steepestIdx] * 0.1);
          workingElev[steepestIdx] -= erosionAmount;
          erosionAccum[steepestIdx] += erosionAmount;
          sediment += erosionAmount;
        }

        // 5. Move to next cell
        currentIdx = steepestIdx;

        // 6. Evaporate water
        waterVolume *= 1 - cfg.evaporationRate;
        if (waterVolume < 0.001) {
          // Deposit remaining sediment
          if (sediment > 0) {
            workingElev[currentIdx] += sediment * cfg.depositionRate;
            depositionAccum[currentIdx] += sediment * cfg.depositionRate;
          }
          break;
        }
      }
    }
  }

  // Normalise erosion/deposition maps for diagnostic use
  let maxErosion = 0;
  let maxDeposition = 0;
  for (let i = 0; i < cellCount; i += 1) {
    if (erosionAccum[i] > maxErosion) maxErosion = erosionAccum[i];
    if (depositionAccum[i] > maxDeposition) maxDeposition = depositionAccum[i];
  }

  const erosionMap = new Float32Array(cellCount);
  const depositionMap = new Float32Array(cellCount);
  for (let i = 0; i < cellCount; i += 1) {
    erosionMap[i] = maxErosion > 0 ? clamp(erosionAccum[i] / maxErosion, 0, 1) : 0;
    depositionMap[i] = maxDeposition > 0 ? clamp(depositionAccum[i] / maxDeposition, 0, 1) : 0;
  }

  return { elevations: workingElev, erosionMap, depositionMap };
}
