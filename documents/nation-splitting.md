# Nation Splitting Logic (Current Implementation)

## Main Flow

Primary file: `src/services/map/buildGeopolitics/nations.ts`

- Nations are seeded and expanded across adjacent land cells.
- Post-processing reduces border noise, preserves contiguity, and stabilizes terrain-aligned shapes.
- After nation assignment, `postProcessNations(...)` refines anomalous cells.

## Core Conditions

- Operates only on eligible land cells under geographic/political constraints in map context.
- Nation expansion is based on local scoring (adjacency + terrain/local constraints).
- Prioritizes contiguous regions instead of disconnected pockets.

## Exceptions / Guard Rails

- Does not force per-cell identity if that would significantly break contiguity.
- Post-processing may slightly adjust borders to improve overall stability.
- Minor border/shape variation is acceptable if gameplay behavior and statistical profile are preserved.

## Notes

- Small border/shape differences are expected across different seeds.
- The target is macro-level behavioral stability, not exact per-cell reproducibility.
