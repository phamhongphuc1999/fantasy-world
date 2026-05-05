# Ethnic Splitting Logic (Current Implementation)

## Main File

`src/services/map/buildGeopolitics/ethnic.ts`

## Role in Pipeline

- Runs after nation/province assignment is relatively stable.
- Assigns ethnicity per cell using nation context and local geographic adjacency.

## Core Logic

- Ethnic assignment prioritizes spatial continuity.
- Respects nation/province boundaries at gameplay-relevant level to avoid political noise.
- Uses neighborhood-based propagation/scoring instead of independent random assignment per cell.

## Conditions and Constraints

- Output schema remains unchanged (`ethnicity` field per cell).
- Favors clustered ethnic patterns over isolated single-cell noise.
- Preserves macro-level ethnic distribution characteristics by nation/region.

## Exceptions / Post-Processing

- Border pockets and tiny artifacts may be reassigned to avoid single-cell ethnic islands.
- Small local variation is allowed to preserve macro stability.

## Expected Behavior

- Ethnic map should appear naturally clustered with fewer topology artifacts.
- Pixel-perfect consistency across all seeds is not required, but overall behavior should remain consistent.
