# Province Splitting Reimplementation Spec (Updated)

## Main File

`src/services/geopolitics/provinces.ts`

## Constants That Affect Exact Output

- `IDEAL_PROVINCE_POP = 500_000`
- `MAX_PROVINCE_POP = 1_500_000`
- `MERGE_POP_CAP = 800_000`
- `MIN_POP_PERCENT = 0.03`
- `MAX_POP_PERCENT = 0.12`
- `SMALL_NATION_POPULATION_THRESHOLD = 1_000`
- `SMALL_NATION_MIN_PROVINCE_POPULATION = 200`
- `DEFAULT_MIN_PROVINCE_POPULATION = 1_000`
- `PROVINCE_TUNING` object (all subfields must stay identical)

## Exact High-Level Flow

Per nation:

1. Gather nation cells.
2. Compute planning metrics via `getProvincePlanMetrics(...)`.
3. Select seeds and run province expansion.
4. Build aggregates and evaluate split/merge pressure.
5. Rebalance within iteration limits.

Global post-process later in geopolitics stage:

1. `limitMountainSplit(...)`
2. Two rounds of `enforceProvinceConnect(...)` + `minProvinceArea(...)`
3. `limitProvincePopulation(...)`

## Detailed Branching Rules

### Metric Computation

`getProvincePlanMetrics(...)` depends on:

- nation population
- nation cell count
- effective nation size
- flags: `isNationSplit`, `isIgnore`

Branches:

- `if nationPopulation > 1_000_000`: baseline by `ceil(pop / IDEAL_PROVINCE_POP)`.
- `if 500_000 < nationPopulation <= 1_000_000`: baseline is `3`.
- `if 300_000 <= nationPopulation <= 500_000`: baseline is `2`.
- else baseline is `1`.

Minimum province population:

- `max(getNationMinProvincePop(nationPopulation), floor(targetPopulation * 0.7))`

Required minimum province count uses:

- population-driven count
- cell-driven count
- configured floors/caps
- small-nation special cap

### Seed Selection

- Score uses suitability + province seed policy.
- Distance rule:
  - plains/valley use shorter seed spacing than rugged terrains.
- `if candidate violates min seed distance`: reject.

### Expansion

Ownership update condition:

- Candidate cell must belong to same nation.
- Compute transition cost (terrain-aware, distance-aware).
- `if nextCost < existingCost[cell]`: adopt new owner and enqueue.

### Split Trigger

A province is split candidate when one or more hold:

- population above dynamic hard/soft max,
- effective area above tuned factor,
- density pressure indicates oversized region.

Guard:

- `if splitting would exceed feasible province bounds`: skip/defer split.

### Merge Trigger

A province is merge candidate when one or more hold:

- below mandatory minimum population,
- below minimum effective size,
- connectivity/shape anomalies after previous operations.

Merge target rules:

1. Prefer same-terrain neighbors.
2. Reject target if merged pop exceeds `MERGE_POP_CAP` unless exception path allows.
3. Reject if merge breaks connectivity.
4. If all rejected, fallback to best valid mixed-terrain neighbor by score.

### Metropolis Exception

`isMetropolis(...)` may keep tiny-cell but very high-pop province unsplit under constrained cases.

### Loop Termination

- Rebalance loops stop when:
  - iteration cap reached, OR
  - no ownership changes in pass.

This is required to avoid infinite loops and keep deterministic stopping points.

## Exactness Requirements

- Keep all integer rounding (`Math.floor/ceil/round`) exactly as in source.
- Keep pass counts and loop limits exactly.
- Keep stable sorting behavior where used.
- Keep typed containers (`Map`, typed arrays) and insertion/traversal order semantics.
