# Geopolitics Reimplementation Spec (Updated v2)

## Main File

`src/services/geopolitics/index.ts`

## Exact Pipeline Order

`buildGeopolitics(params)` must run exactly:

1. `assignNations(mesh, seed, nationCount)` — internally calls `buildLandNations(...)` directly
2. `postProcessNations(mesh.cells, owner, preserveNationCount, seed)`
3. `buildNationProfiles(owner, seed)`
4. `mapNationsToCells(mesh.cells, owner, nationProfiles)`
5. `limitNationPopulation(scaledCells, owner, seed)`
6. `assignProvinces(scaledMesh.cells, owner, seed)` — returns `{ provinceOwner }` (object, not array)
7. `postProcessProvinces({ cells: scaledMesh.cells, owner, provinceOwner })`
8. `buildEthnicRegions(scaledMesh.cells, owner, seed)` — returns `{ ethnicOwner, ethnics }`
9. `finalizeOwnershipProjection(...)`

**Note**: `validateProvinceAssignments` has been **removed** from the pipeline (step 8 in the old spec). The pipeline now goes directly from step 7 to ethnic regions.

Changing order changes results.

## Nation Profile and Scaling Logic

`buildNationProfiles(owner, seed)`:

- Enumerate nation ids from `owner` where `nationId >= 0`.
- For each nation id:
  - RNG seed: `${seed}:${nationId}:nation-profile` (format differs from old spec's `${seed}:nation-profile:${nationId}`)
  - Build two multipliers only via `randomBetween(random, min, max)`:
    - `populationMultiplier` in `T_NATION_POPULATION_MULTIPLIER_RANGE = [0.1, 5.0]`
    - `economyMultiplier` in `T_NATION_ECONOMY_MULTIPLIER_RANGE = [0.1, 20]`
  - **No per-landform/biome modifiers in profiles anymore.**

`mapNationsToCells(...)`:

- `if !isLand(cell)`: return cell unchanged.
- `nationId = owner[cell.id]`; `if nationId < 0`: unchanged.
- `if no profile`: unchanged.
- Uses **hardcoded** `populationModifier(landCode, biomeCode)` and `economyModifier(landCode, biomeCode)` functions (see below).
- `population = round(cell.population * populationMultiplier * terrainPopulationModifier)`
- `economy = round(cell.economy * economyMultiplier * terrainEconomyModifier)`
- Clamp both to `>= 0`.

### Hardcoded Modifier Functions

Landform codes:

- `PLAIN=1, VALLEY=2, MOUNTAIN=3, VOLCANIC_FIELD=4, COAST=5`

Biome codes:

- `WETLAND=1, DESERT_HOT=2, DESERT_COLD=3, TEMPERATE_FOREST=4, TROPICAL_FOREST=5, STEPPE=6`

```typescript
function populationModifier(landCode, biomeCode) {
  let factor = 1;
  if (landCode === 1 || landCode === 2) factor += 0.18; // plain/valley
  if (landCode === 3 || landCode === 4) factor -= 0.28; // mountain/volcanic
  if (biomeCode === 1) factor -= 0.14; // wetland
  if (biomeCode === 2 || biomeCode === 3) factor -= 0.2; // desert
  if (biomeCode === 4 || biomeCode === 5) factor += 0.08; // forest
  return Math.max(0.2, factor);
}

function economyModifier(landCode, biomeCode) {
  let factor = 1;
  if (landCode === 5 || landCode === 2) factor += 0.22; // coast/valley
  if (landCode === 3) factor -= 0.1; // mountain
  if (landCode === 4) factor += 0.08; // volcanic
  if (biomeCode === 6) factor += 0.05; // steppe
  if (biomeCode === 2) factor -= 0.08; // desert_hot
  return Math.max(0.25, factor);
}
```

## Nation Floor Logic

`limitNationPopulation(cells, owner, seed)`:

- `T_MIN_NATION_POPULATION = 500` (changed from 1000 in old spec).
- For each nation id (`>= 0`), collect land cells and sum population.
- Skip if no land cells.
- Skip if population already `>= T_MIN_NATION_POPULATION`.
- Else:
  - RNG seed: `${seed}:${nationId}:nation-pop-floor` (format differs from old spec's `${seed}:nation-pop-floor:${nationId}`)
  - `randomizedFloor = round(T_MIN_NATION_POPULATION * (1.02 + random()*0.86))`
  - `targetPopulation = max(T_MIN_NATION_POPULATION, randomizedFloor)`
  - `scale = targetPopulation / max(1, nationPopulation)`
  - For each nation cell: `scaledPopulation = max(1, round(cell.population * scale))`

## Post-Nation Passes

`postProcessNations(...)`:

1. `runNationStabilityPass(cells, owner, nationCount)`
2. `enforceMainlandContiguity(cells, owner)`
3. `runNationStabilityPass(cells, owner, nationCount)`
4. `finalizeNationBorders(cells, owner, nationCount)`
5. `diversifySmallNationSizes(cells, owner, seed)`
6. `finalizeNationBorders(cells, owner, nationCount)`

`runNationStabilityPass(...)` internals:

1. `alignNaturalTerrainClusters(cells, owner)`
2. `limitMountainSplit(cells, owner, 'nation')`
3. `enforceMinNationArea(cells, owner, preserveNationCount)`

## Province Stage

`assignProvinces(...)` returns `{ provinceOwner }` (an object wrapping the Int32Array). Internally calls `buildNationProvinces(cells, owner, seed)`.

`postProcessProvinces(...)` exact order:

1. `limitMountainSplit(cells, provinceOwner, 'province', owner)`
2. Repeat exactly 2 times:
   - `enforceProvinceConnect({ cells, owner, provinceOwner })`
   - `minProvinceArea({ cells, owner, provinceOwner })`
3. `limitProvincePopulation({ cells, owner, provinceOwner })`

## Ethnic Stage

- `buildEthnicRegions(scaledMesh.cells, owner, seed)` returns `{ ethnicOwner, ethnics }` (object with both Int32Array and TEthnic[]).
- This stage runs after province post-processing.

## Final Projection Logic

`finalizeOwnershipProjection(...)`:

1. Compute maritime owners and zone types with `assignMaritimeZones(mesh.cells)`.
2. Build nation metadata with `pickEconomicAndCapital(...)`.
3. Build `hubCellIds` and `capitalCellIds` sets.
4. For each cell:
   - `landNationId = owner[cell.id] >= 0 ? owner[cell.id] : null`
   - `waterNationId = waterOwner[cell.id] >= 0 ? waterOwner[cell.id] : null`
   - `nationId = zoneType[cell.id] === 'land' ? landNationId : waterNationId`
   - `provinceId = zoneType[cell.id] === 'land' ? (provinceOwner[cell.id] >= 0 ? provinceOwner[cell.id] : null) : null`
   - `ethnicId = zoneType[cell.id] === 'land' ? (ethnicOwner[cell.id] >= 0 ? ethnicOwner[cell.id] : null) : null`
   - `zoneType = zoneType[cell.id]`
   - `isEconomicHub = hubCellIds.has(cell.id)`
   - `isCapital = capitalCellIds.has(cell.id)`

## Reimplementation Constraints

To reproduce identical output:

- Keep map/stage order exactly as above.
- Keep null/negative-id handling exactly (`<0 => null`).
- Keep seed strings exactly (`${seed}:${nationId}:nation-profile` and `${seed}:${nationId}:nation-pop-floor`).
- Keep hardcoded modifier functions (populationModifier, economyModifier) and their constants exactly.
- `validateProvinceAssignments` has been removed; no longer applicable.
