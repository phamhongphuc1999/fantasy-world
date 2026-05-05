# Province Splitting Logic (Current Implementation)

## Main File

`src/services/map/buildGeopolitics/provinces.ts`

## Current Core Constants / Constraints

- `IDEAL_PROVINCE_POP = 500_000`
- `MAX_PROVINCE_POP = 1_000_000`
- `MERGE_POP_CAP = 800_000`
- `MIN_POP_PERCENT = 0.03` (hard floor at 3% of nation population)
- `MAX_POP_PERCENT = 0.12` (soft upper ratio per nation)

## High-Level Partition Logic

1. Compute target province count from both population and cell-based signals.
2. Seed provinces within each nation, then expand through adjacency.
3. Apply split/merge with population-first prioritization.
4. Run post-processing for contiguity, minimum area, then enforce hard population floor.

## Terrain-Adjusted Effective Size

- Province size is not measured only by `cellCount`; it also uses `effectiveProvinceSize`.
- Terrain factor reflects administrative difficulty:
  - Plains/normal terrain: lower factor
  - Forest/hills: medium factor
  - Mountains/hard terrain: higher factor
- Goal: harder terrain can remain valid with fewer cells while still representing administrative burden.

## Population Bounds

Dynamic per-nation bounds are applied:

- Minimum population uses both hard floor (3% of nation population) and target-driven constraints.
- Maximum population is capped by `MAX_PROVINCE_POP` and nation-ratio ceiling.
- Provinces above max are marked for further split.

## Density-Adjusted Constraints

- `getCellCapByDensity(...)` adjusts province cell cap by density:
  - High density -> lower cell cap (smaller provinces)
  - Low density -> higher cell cap (larger provinces)

## Terrain Homogeneity During Expansion

- During expansion from a seed, moving into cells with terrain different from the seed terrain receives a penalty (currently a high multiplier, e.g. `*3`).
- Result: provinces tend to follow natural terrain bands and reduce unnecessary mountain/plain mixing.

## Merge Logic and Exceptions

Merges are conditional and constrained:

- Small provinces preferentially merge into same-terrain neighbors.
- No merge if resulting population would exceed `MERGE_POP_CAP`.
- Exceptions keep some small provinces when they are special cases (e.g., urban/economic/geographically isolated under current rules).

## Hard Floor Enforcement (Critical)

- Final pass forces reduction of provinces below `3%` nation population when possible.
- If no same-terrain candidate is viable, fallback picks the best neighboring merge target.
- Guards exist to avoid infinite loops for very small nations.

## Safety / Fallback

- Very small nations (population or cell count) may collapse to very few provinces (possibly 1) to avoid algorithmic failure.
- Gameplay stability is prioritized over geometrically perfect boundaries.
