import { TPlate, TPlateBoundaryInfo } from './tectonics';

// ─── Config ────────────────────────────────────────────────────────────────────

interface TIsostasyConfig {
  /** Mantle density (g/cm³) */
  mantleDensity: number;
  /** Continental crust density (g/cm³) */
  crustDensityContinental: number;
  /** Oceanic crust density (g/cm³) */
  crustDensityOceanic: number;
  /** Base continental crust thickness (km) */
  crustThicknessContinental: number;
  /** Base oceanic crust thickness (km) */
  crustThicknessOceanic: number;
  /** Factor converting crust thickness difference to normalised elevation */
  thicknessToElevationScale: number;
  /** Thermal subsidence coefficient — older ocean floor sinks more */
  thermalSubsidenceRate: number;
  /** Max age for thermal subsidence normalisation */
  maxAge: number;
}

const ISOSTASY_CONFIG: TIsostasyConfig = {
  mantleDensity: 3.3,
  crustDensityContinental: 2.7,
  crustDensityOceanic: 3.0,
  crustThicknessContinental: 35,
  crustThicknessOceanic: 7,
  thicknessToElevationScale: 0.012,
  thermalSubsidenceRate: 0.035,
  maxAge: 10,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Seeded age approximation for oceanic crust based on distance from ridge.
 * Simulates plate cooling: young near divergent boundaries, old far from them.
 */
function estimateOceanCrustAge(
  distanceToDivergent: number,
  cellSeed: number,
  maxAge: number
): number {
  // Distance to nearest divergent boundary drives age
  // Close to ridge = young; far from ridge = old, up to maxAge
  const spread = Math.min(distanceToDivergent * 35, 1);
  // Add some noise for variation
  const noise = ((cellSeed % 1000) / 1000) * 0.2 - 0.1;
  return Math.max(0.1, spread + noise) * maxAge;
}

/**
 * Crustal thickness factor for continental collision zones.
 * Convergent boundaries thicken the crust (Himalayas).
 */
function continentalCollisionThickening(
  distanceToBoundary: number,
  convergenceRate: number
): number {
  const influence = Math.exp(-(distanceToBoundary * distanceToBoundary) / 0.008);
  return 1 + influence * convergenceRate * 18;
}

/**
 * Crustal thinning factor for continental rifts.
 * Divergent boundaries thin the crust (East African Rift).
 */
function continentalRiftThinning(distanceToBoundary: number, divergenceRate: number): number {
  const influence = Math.exp(-(distanceToBoundary * distanceToBoundary) / 0.01);
  return 1 - influence * divergenceRate * 12;
}

// ─── Isostatic elevation ──────────────────────────────────────────────────────

/**
 * Compute isostatic elevation adjustment for a cell based on crust type,
 * boundary proximity, and thermal subsidence.
 *
 * Uses Airy isostasy: E = H_crust * (ρ_mantle - ρ_crust) / ρ_mantle
 *
 * Returns a normalised elevation offset in [0, 1] space (same scale as noise layers).
 *
 * @param isContinental   Whether the cell belongs to a continental plate
 * @param boundaryInfo    Plate boundary classification result
 * @param cellIndex       Cell index for seeded noise
 * @param cellSeed        Derived seed hash for this cell
 * @param plates          Array of all tectonic plates
 * @param myPlateId       ID of the plate this cell belongs to
 */
export function computeIsostaticElevation(
  isContinental: boolean,
  boundaryInfo: TPlateBoundaryInfo,
  distanceToAnyBoundary: number,
  cellIndex: number,
  plates: ReadonlyArray<TPlate>,
  myPlateId: number
): number {
  const cfg = ISOSTASY_CONFIG;

  // 1. Determine base crust thickness
  let crustThickness: number;
  let crustDensity: number;

  if (isContinental) {
    crustThickness = cfg.crustThicknessContinental;
    crustDensity = cfg.crustDensityContinental;

    // Continental collision zones thicken crust
    if (
      boundaryInfo.boundaryKind === 'convergent' &&
      boundaryInfo.isContinental &&
      boundaryInfo.neighborPlateKind === 'continental'
    ) {
      const thickening = continentalCollisionThickening(
        boundaryInfo.distanceToBoundary,
        boundaryInfo.convergenceRate
      );
      crustThickness *= thickening;
    }

    // Continental rifts thin crust
    if (boundaryInfo.boundaryKind === 'divergent' && boundaryInfo.isContinental) {
      const thinning = continentalRiftThinning(
        boundaryInfo.distanceToBoundary,
        boundaryInfo.divergenceRate
      );
      crustThickness *= thinning;
    }
  } else {
    crustThickness = cfg.crustThicknessOceanic;
    crustDensity = cfg.crustDensityOceanic;

    // Oceanic crust near mid-ocean ridges is hotter → more buoyant → thinner but higher
    // Far from ridge → colder → denser → subsides (thermal subsidence)
    if (distanceToAnyBoundary < 0.15) {
      // Near a boundary — could be ridge or trench
      if (boundaryInfo.boundaryKind === 'divergent') {
        // Mid-ocean ridge: young crust, hot, expanded
        const ridgeInfluence = Math.exp(
          -(boundaryInfo.distanceToBoundary * boundaryInfo.distanceToBoundary) / 0.005
        );
        crustThickness *= 1 + ridgeInfluence * boundaryInfo.divergenceRate * 30;
      } else if (boundaryInfo.boundaryKind === 'convergent') {
        // Trench: crust bends and thickens slightly
        crustThickness *= 1.2;
      }
    }

    // Thermal subsidence: older ocean floor → colder → denser → lower elevation
    const age = estimateOceanCrustAge(
      distanceToAnyBoundary,
      cellIndex + myPlateId * 97,
      cfg.maxAge
    );
    const subsidence = cfg.thermalSubsidenceRate * age;
    crustThickness -= subsidence * 3; // thermal contraction reduces effective thickness
    crustThickness = Math.max(4, crustThickness); // Minimum crust thickness
  }

  // 2. Airy isostatic compensation
  // E = H_crust * (ρ_mantle - ρ_crust) / ρ_mantle
  const densityDiff = cfg.mantleDensity - crustDensity;
  const rawElevation = (crustThickness * densityDiff) / cfg.mantleDensity;

  // 3. Normalise to [0, 1] elevation scale
  // Continental: ~35 * 0.6 / 3.3 ≈ 6.36 km → normalise to ~0.06 elevation offset
  // Oceanic: ~7 * 0.3 / 3.3 ≈ 0.64 km → normalise to ~0.006 elevation offset
  const elevationOffset = rawElevation * cfg.thicknessToElevationScale;

  // Clamp to reasonable range
  return Math.min(0.15, Math.max(-0.02, elevationOffset));
}
