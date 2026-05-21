# River Generation Reimplementation Spec (Updated v2)

## Scope

This document is an implementation-level specification for reproducing the current river behavior exactly.

Primary sources:

- `src/services/hydrology/river.ts` (main river generation — `runRiverGeneration()`)
- `src/services/hydrology/index.ts` (orchestration — `buildHydrology()`)
- `src/services/hydrology/lakes.ts` (lake expansion/filtering)
- `src/configs/map/hydrology.ts` (`HYDROLOGY_CONFIG`, `RIVER_CONFIG`, `LAKE_CONFIG`)
- `src/types/map.types.ts` (`TRiver`, `TRiverEndType`, `TRiverKind` types)

## Required Constants and Sentinels

You must keep these exactly:

- Coast outlet sentinel: `T_COAST_OUTLET = HYDROLOGY_CONFIG.coastOutletId` (currently `-2`).
- Land mask threshold: `RIVER_CONFIG.landWaterThreshold`.
- Depression settings: `RIVER_CONFIG.depression.{maxIterations, epsilon, coastLift}`.
- Candidate flux threshold: `RIVER_CONFIG.minFluxToFormRiver * pow(cells.length / 10000, RIVER_CONFIG.cellsNumberModifierExp)`.
- Minimum raw river chain length: `RIVER_CONFIG.minRiverCells`.

## Global Order (Must Not Change)

Within `buildHydrology(...)` in `src/services/hydrology/index.ts`, the internal function `runHydrologyInternal(...)` runs:

1. Initial elevation copy + basic flow calculation + downstream assignment.
2. Erosion simulation: compute `erosion` = `min(maxAmount, slope * slopeWeight + log2(flow+1) * flowWeight)`, with `deposit` forwarded downstream.
3. Lake detection: cells with `downstream == -1 && !cell.isWater && flow > sinkFlowMin` are marked as `isLake=1`.
4. `expandLakes(cells, flow, downstream)`
5. `filterAndLimitLakes(cells, flow)`
6. `classifyInlandWater(cells, width, height, seaLevel, downstream)`
7. Climate/terrain classification (temperature, precipitation, landforms, biomes).
8. `runRiverGeneration(cells, seaLevel, precipitation, seed)` — internally calls `prepareTerrain`, `fillDepressions`, `accumulateFlow`, `buildRiverGraph`.
9. Write `result` back to cells:
   - `flow`, `effectiveFlow`, `downstreamId`, `riverId`, `isRiver`, `riverWidth`
10. Build `isRiverSource` / `isRiverMouth` from final `result.rivers`
11. Compute `suitability` via `getSuitabilityByLandformBiome(...)`.

## Stage A: `prepareTerrain(...)`

Data:

- `elevation: Float32Array(cells.length)`
- `isLand: Uint8Array(cells.length)`

Loop `cellIndex = 0..N-1`:

1. `land = !cell.isWater && cell.elevation >= landWaterThreshold`
2. `isLand[cellIndex] = land ? 1 : 0`
3. `elevation[cellIndex] = cell.elevation`
4. `if !land: continue`
5. `hasWaterNeighbor = cell.neighbors.some(neighbor => cells[neighbor].isWater)`
6. `if hasWaterNeighbor: elevation[cellIndex] += coastLift`

No randomness here.

## Stage B: `fillDepressions(...)`

Inputs: `cells`, `elevation`, `isLand`.

Internal copy:

- `filled = new Float32Array(elevation)`

Main loop:

- For `iterations = 0 .. maxIterations-1`:
  - `changed = 0`
  - For each land cell:
    - `hasLower = false`
    - `minNeighbor = Infinity`
    - `hasOutlet = false`
    - For each neighbor:
      - `if isLand[neighbor] == 0`: `hasOutlet = true`; continue
      - `neighborElevation = filled[neighbor]`
      - `minNeighbor = min(minNeighbor, neighborElevation)`
      - `if neighborElevation < filled[current] - epsilon`: `hasLower = true`; break
    - `if hasLower || hasOutlet || !isFinite(minNeighbor)`: continue
    - `raised = minNeighbor + epsilon`
    - `if raised > filled[current]`:
      - `filled[current] = raised`
      - `changed += 1`
  - `if changed == 0: break`

Unresolved count pass:

- For each land cell:
  - `hasLowerOrOutlet = false`
  - For each neighbor:
    - `if isLand[neighbor] == 0 || filled[neighbor] < filled[current]`: `hasLowerOrOutlet = true`; break
  - `if !hasLowerOrOutlet`: unresolved++

Return:

- `filledElevation = filled`
- `iterations = loopIterations + 1` (same as source behavior)
- `unresolvedDepressions`

## Stage C: `accumulateFlow(...)`

Initialize:

- `downstream = Int32Array(N).fill(-1)`
- `flow = Float32Array(N)`
- `effectiveFlow = Float32Array(N)`
- `cellModifier = pow(N / 10000, cellsNumberModifierExp)`

Base flow:

- For each land cell:
  - `flow[i] = (8 + precipitation[i] * 12) * cellModifier`

Choose downstream:

- For each land cell:
  - `nextCell = -1`
  - `nextElevation = filledElevation[i]`
  - `hasWaterNeighbor = false`
  - For each neighbor:
    - `if isLand[neighbor] == 0`: `hasWaterNeighbor = true`; continue
    - `neighborElevation = filledElevation[neighbor]`
    - Replace next if:
      - `neighborElevation < nextElevation`, OR
      - `neighborElevation == nextElevation && neighborId < nextCell`
  - If `nextCell >= 0`: `downstream[i] = nextCell`
  - Else if `hasWaterNeighbor || cell.elevation <= seaLevel + 0.02`: `downstream[i] = T_COAST_OUTLET`

Flow accumulation order:

- `sorted = sortIndicesByElevation(filledElevation)`
- Sort comparator:
  - primary: higher elevation first (`right-left`)
  - tie: lower index first
- For each `i in sorted`:
  - if land and `downstream[i] >= 0`: `flow[downstream[i]] += flow[i]`

Effective flow:

- For each land cell:
  - `next = downstream[i]`
  - `slope = next >= 0 ? max(0, filledElevation[i] - filledElevation[next]) : 0`
  - `effectiveFlow[i] = flow[i] * (1 + slope * 2.5)`

## Stage D: `buildRiverGraph(...)`

### D1. Candidate sources

A cell is included iff all are true:

- `!cell.isWater`
- `downstream[i] >= 0 || downstream[i] == T_COAST_OUTLET`
- `flow[i] >= threshold`
- `upstreamCount[i] <= 1 || flow[i] >= threshold * 1.4`

Sort candidates by:

1. Higher `cell.elevation`
2. Higher `effectiveFlow`
3. Lower `cellIndex`

### D2. Trace each source

State per source:

- Skip if `riverByCell[source] >= 0`.
- Create new `riverId`.
- Walk `cursor` downstream with local `visited` set.

At each cursor step:

1. `if cursor already visited`: stop.
2. `existingRiver = riverByCell[cursor]`
3. `if existingRiver >= 0 && existingRiver != riverId`:
   - If `effectiveFlow[cursor] <= effectiveFlow[source]`:
     - existing becomes tributary of current (`riverParent[existing] = riverId`)
   - else:
     - current becomes tributary of existing (`riverParent[riverId] = existing`)
   - record confluence and stop
4. Else assign:
   - `riverByCell[cursor] = riverId`
   - append cursor to raw chain
5. Stop if:
   - `next == T_COAST_OUTLET`, OR
   - `next < 0`, OR
   - `cells[next].isWater`
6. Else `cursor = next`.

### D3. Tail extension to nearest water

For each built chain:

- If tail downstream is not water and not coast outlet:
  - BFS with `buildPathToWater(...)`.
  - BFS neighbor rules:
    - skip visited
    - skip water in traversal queue
    - skip cells already owned by another river (`riverByCell[neighbor] >= 0 && neighbor != start`)
  - If path found:
    - append each land step
    - rewired `downstream`
    - attenuate flow (`*0.985`) and effective flow (`*0.98`) along appended segment
    - final downstream points to found water cell

### D4. Chain pruning and river object construction

- If `chain.length < minRiverCells`:
  - clear ownership for all chain cells (`riverByCell[cell] = -1`)
  - skip river object

Else build `TRiver`:

- End type:
  - `offscreen` if tail downstream is coast outlet
  - `lake` if downstream water cell is lake
  - `sea` if downstream water cell is non-lake water
  - otherwise `inland-sink`
- River kind from `riverKindByPeakFlow(peakFlow)`:
  - `peakFlow >= 150` → `'river'`
  - `peakFlow >= 80` → `'fork'`
  - `peakFlow >= 45` → `'branch'`
  - otherwise → `'creek'`
- River name from `createRiverName(random, id, kind)` with prefix/suffix lists.
- Width profile:
  - Starting width: `min(maxFluxWidth, pow(max(0, startFlow), 0.7) / fluxFactor) + minWidth * 0.2`
  - Per-cell width: `fluxWidth + lengthWidth` where lengthWidth = `linearGrow + earlyProgression(ln2) + downstreamBoost(pow(t, 1.65)*1.55)`
  - `widthFactor = 1.12` for parent rivers, `0.78` for tributaries.
  - Two smoothing passes over `pointOffsets` (0.25/0.5/0.25 averaging).
  - Monotonic non-decreasing offset enforcement.
  - Final riverWidth: `min(maxWidth, max(0.45, pow(offset/1.5, 1.8)))`
- Bank geometry: `leftBank`/`rightBank` polyline with normal offset.
- Polygon: `[...leftBank, ...rightBank.reverse()]`.

## Stage E: `validateRivers(...)` (removed)

**Note**: The `validateRivers()` pass described in older specs has been **removed** from the current codebase. River selection and filtering now happens entirely within `buildRiverGraph()` in `src/services/hydrology/river.ts`. There is no second selection layer.

## Determinism Requirements

To get byte-identical behavior:

- Keep all array types (`Float32Array`, `Int32Array`, `Uint8Array`) unchanged.
- Keep loop direction and sort tie-breakers unchanged.
- Keep sentinel values (`-1`, `T_COAST_OUTLET`) unchanged.
- Keep seed strings and RNG call points unchanged.
- Do not reorder passes in `buildHydrology(...)`.
