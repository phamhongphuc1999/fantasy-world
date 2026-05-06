# Geopolitics Flow (Current Implementation)

## Pipeline Overview

The main flow is implemented in `src/services/map/buildGeopolitics/index.ts`:

1. `assignNations(...)`
2. `postProcessNations(...)`
3. Build nation profiles and scale population/economy per nation
4. `assignProvinces(...)`
5. `postProcessProvinces(...)`
6. `assignEthnic(...)`
7. Project final results back to cells (`nationId`, `provinceId`, `ethnicity`)

## Current Design Goals

- Keep generation deterministic by seed.
- Separate responsibilities by layer: Nation -> Province -> Ethnic.
- Allow post-processing to fix geometric/administrative artifacts after initial assignment.

## Province Post-Processing Sequence (Current)

In `postProcessProvinces(...)`, the current order is:

1. `limitMountainSplit(...)`
2. `enforceProvinceConnect(...)`
3. `minProvinceArea(...)`
4. `enforceProvinceConnect(...)`
5. `minProvinceArea(...)`
6. `limitProvincePopulation(...)`

Meaning:

- Prevent excessive fragmentation of mountain regions.
- Enforce province contiguity.
- Enforce minimum area constraints.
- Enforce hard minimum population floor at the end of the province pipeline.

## Output Schema Invariance

- Do not change the output data schema.
- Only adjust internal nation/province/ethnic distribution according to current constraints.
