# Nation Splitting Reimplementation Spec (Updated)

## Main File

`src/services/geopolitics/nations.ts`

## Inputs / Outputs

- Input: `cells: TCell[]`, `seed`, requested `nationCount`.
- Output: `owner: Int32Array` where each land cell owns a nation id (`>= 0`) or remains `-1` before repair.

## Core Components

The nation pipeline uses:

- Seed suitability: `getNationSeedSuitability(...)`
- Frontier expansion: `runMultiSourceExpansion(...)`
- Boundary cost: `getBoundaryStepCost(...)`
- Neighbor statistics: `getNationNeighborCounts(...)`
- Hash/noise: `makeFrontierHash(...)`

## Deterministic Rules That Must Match

1. Keep `Int32Array` for ownership.
2. Keep all loop orders (`for cellId = 0..N-1`).
3. Keep sorting comparators exactly (including tie-breakers).
4. Keep sentinel behavior (`-1` for unowned).
5. Keep every pass order unchanged.

## Implementation-Level Flow

### Step 1: Connectivity Context

`buildConnectivityContext(cells)`:

- DFS/BFS land components only (`isLand(cell)`).
- Per component compute:
  - `componentSizes`
  - `boundaryCells` (cells touching water)
- Large component condition:
  - `componentSize >= LARGE_LAND_COMPONENT_MIN_CELLS` => mark as large.

### Step 2: Initial Seeding

- Collect land candidates with suitability scores.
- Apply seed spacing and component coverage logic.
- Rules:
  - `if candidate component is large and unseeded`: strongly prioritize.
  - `if candidate too close to existing seed`: reject.

### Step 3: Multi-source Expansion

Expansion state contains at least:

- `cellId`
- `nationId`
- `cost`

For each frontier pop:

- `if state is stale (cost > current best cost)`: skip.
- For each neighbor:
  - `if neighbor is not land`: skip.
  - Compute `nextCost = current.cost + stepCost(...)`.
  - `if nextCost < cost[neighbor]`:
    - update best cost
    - assign `owner[neighbor] = current.nationId`
    - push next state

Step cost includes terrain, barriers, and seeded noise terms.

### Step 4: Repair Small Nations

Core helpers:

- `buildLandNationSizeMap(...)`
- `getSmallNationIds(...)`
- `tryGrowNation(...)`
- `borrowCellForNation(...)`
- `transferBorderCell(...)`

Decision pattern:

- `if nation size >= minimum`: skip.
- else try to borrow/grow from neighboring nations.
- Donor constraints:
  - `if donor would drop below minimum floor`: donor rejected.
  - `if candidate border cell does not touch target nation`: rejected.

### Step 5: Cross-Component / Foreign Nation Bridge

`findNearestForeignNation(...)`:

- Finds nearest land cell whose owner is different from source nation.
- Uses nearest-cell search with explicit predicate.
- `if no candidate`: return `-1` and skip transfer.

### Step 6: Contiguity and Border Stabilization

Passes include:

- `enforceMainlandContiguity(...)`
- `alignNaturalTerrainClusters(...)`
- `finalizeNationBorders(...)`
- `diversifySmallNationSizes(...)`

Typical local rule:

- `if cell has stronger neighbor support from another nation` AND change does not violate constraints => reassign.
- else keep current owner.

## Edge / Exception Cases

- Tiny map: effective nation count may be lower than requested due to feasibility constraints.
- Land components disconnected by water are handled separately first; cross-component balancing happens later.
- If no legal move exists in a repair pass, pass exits early.

## Reproduction Checklist

- Same constants from `GEOPOLITICAL_CONFIG` and `BORDER_CONFIG`.
- Same noise hash and seed strings.
- Same pass count for each stabilization routine.
- Same comparator tie-break order in all sorts.
