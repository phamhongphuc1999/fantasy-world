# Ethnic Splitting Reimplementation Spec (Updated)

## Main File

`src/services/geopolitics/ethnic.ts`

## Constants and Configuration

- `T_MIN_ETHNIC_POPULATION = 1000`
- `GEOPOLITICAL_CONFIG.ethnic` fields:
  - `majorGroupMin`
  - `majorGroupCountMax`
  - `dominantShareMin`, `dominantShareMax`
  - `secondaryShareMin`, `secondaryShareMax`
  - `crossBorderBlend`
  - `fragmentationLevel`
  - `terrainInfluenceStrength` (landform-aware step cost via `Cost.ethnic`)
  - `distancePenalty`
  - `smoothingPasses`
  - `minorityClusterMinCells`

## Exact Stage Order

In `buildEthnicRegions(...)`:

1. Build components: `collectLandComponents(...)`
2. Per component:
   - decide target ethnic count
   - pick core seeds
   - run ethnic field expansion
3. Global correction passes in order:
   - `enforceNationEthnicDominance(...)`
   - `expandCrossBorderEthnics(...)`
   - `smoothCrossBorderEthnics(...)`
   - `addEthnicFragmentation(...)`
   - `expandCrossBorderEthnics(...)` (second time)
   - `smoothCrossBorderEthnics(...)` (second time)
   - `spreadEthnicsAcrossNations(...)`
   - `smoothEthnicRegions(...)`
   - `fillUnclaimedLand(...)`
   - `enforceEthnicMinPop(...)`

Pass order is part of behavior.

## Detailed Branching Rules

### Group Count

`getEthnicGroupCount(landCellCount, nationCount, config)`:

- `byLand = floor(landCellCount / 1300)`
- return `clamp(max(nationCount, byLand), majorGroupMin, majorGroupCountMax)`

### Seed Picking

Each candidate score uses:

- base: `suitability * 1.3`
- bonuses:
  - plains/valley `+1.1`
  - forest `+0.35`
  - mountains `+0.2`
  - river/lake `+0.35`
- random jitter from seeded RNG

Selection rule:

- sorted descending by score
- accept candidate iff distance to all accepted seeds is `>= 70`
- fallback: if none accepted and candidates exist, take top candidate

### Ethnic Field Expansion

State fields: `{ cellId, ethnicId, cost, distance }`.

Neighbor expansion rule:

- Skip when:
  - neighbor outside allowed component
  - neighbor is not land
- Step cost:
  1. `Cost.ethnic(neighbor, { strength: terrainInfluenceStrength })`
  2. `+ borderPenalty` if crossing nation boundary:
     - `1 - crossBorderBlend`
  3. `+ fragmentation term` for mountain-to-mountain transitions
  4. `+ river/lake transition penalties`
  5. `+ nextDistance * distancePenalty`
  6. `+ edgeNoise(seedHash, current, neighbor)` perturbation
- `nextCost = current.cost + max(0.2, step)`
- Update only if `nextCost < cost[neighbor]`

### Nation Dominance Enforcement

Per nation:

- Compute ethnic frequencies over nation land cells.
- `dominantId = highest count`, `secondaryId = second highest`.
- Compute target shares and required counts.

Dominant repaint:

- `if currentDominant < dominantNeed`:
  - collect outsider cells
  - rank by how many neighbors touch dominant ethnic
  - repaint until need is met

Secondary repaint:

- `if currentSecondary < secondaryNeed`:
  - collect candidates not dominant/secondary
  - rank by secondary-neighbor touches
  - repaint until need is met

Bridge exception (both dominant/secondary repaint):

- `if isCrossNationBridgeCell(cellId, oldEthnicId)`: do not repaint this cell.

### Fragmentation Pass

`addEthnicFragmentation(...)`:

- For each ethnic group:
  - if group size `< minorityClusterMinCells * 2`: skip
  - choose mountain anchor randomly
  - frontier spread over mountain/hill neighbors with probabilistic acceptance

### Cross-Border Smoothing/Expansion

Two paired rounds of:

- `expandCrossBorderEthnics(...)`
- `smoothCrossBorderEthnics(...)`

Both use weighted support from local and cross-border neighborhoods.

Switch condition:

- `if best candidate score > current score`: switch
- else keep current ethnic id

### Unclaimed and Minimum Population

`fillUnclaimedLand(...)`:

- For each land cell with invalid ethnic owner:
  - assign nearest claimed land ethnic

`enforceEthnicMinPop(...)`:

- Iterate up to fixed max iterations.
- Find under-threshold ethnic groups.
- Merge/reassign toward strongest border-vote targets.
- Stop early if no changes in pass.

## Determinism Requirements

- Keep seeded RNG keys exactly.
- Keep comparator and iteration order unchanged.
- Keep exact thresholds and multipliers.
- Keep pass duplication (cross-border passes run twice) unchanged.
