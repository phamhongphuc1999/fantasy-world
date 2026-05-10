# Geopolitics Reimplementation Spec (Updated)

## Main File

`src/services/geopolitics/index.ts`

## Exact Pipeline Order

`buildGeopolitics(params)` must run exactly:

1. `assignNations(mesh, seed, nationCount)`
2. `postProcessNations(mesh.cells, owner, preserveNationCount, seed)`
3. `buildNationProfiles(owner, seed)`
4. `mapNationsToCells(mesh.cells, owner, nationProfiles)`
5. `limitNationPopulation(scaledCells, owner, seed)`
6. `assignProvinces(scaledMesh.cells, owner, seed)`
7. `postProcessProvinces({ cells: scaledMesh.cells, owner, provinceOwner })`
8. `validateProvinceAssignments(...)` only when `NODE_ENV !== 'production'`
9. `buildEthnicRegions(scaledMesh.cells, owner, seed)`
10. `finalizeOwnershipProjection(...)`

Changing order changes results.

## Nation Profile and Scaling Logic

`buildNationProfiles(owner, seed)`:

- Enumerate nation ids from `owner` where `nationId >= 0`.
- For each nation id:
  - RNG seed: `${seed}:nation-profile:${nationId}`
  - Build landform/biome modifiers from configured ranges (`src/configs/MapConfig/index.ts`) with `randomBetween(min, max)`.
  - Build two multipliers:
    - `populationMultiplier` in `T_NATION_POPULATION_MULTIPLIER_RANGE`
    - `economyMultiplier` in `T_NATION_ECONOMY_MULTIPLIER_RANGE`

`mapNationsToCells(...)`:

- `if !isLand(cell)`: return cell unchanged.
- `nationId = owner[cell.id]`; `if nationId < 0`: unchanged.
- `if no profile`: unchanged.
- `landformPopulationModifier = profile.landformPopMods[cell.landform] ?? 1`
- `landformEconomyModifier = profile.landformEcoMods[cell.landform] ?? 1`
- `population = round(cell.population * populationMultiplier * terrainPopulationModifier)`
- `economy = round(cell.economy * economyMultiplier * terrainEconomyModifier)`
- Clamp both to `>= 0`.

## Nation Floor Logic

`limitNationPopulation(cells, owner, seed)`:

- For each nation id (`>= 0`), collect land cells and sum population.
- Skip if no land cells.
- Skip if population already `>= T_MIN_NATION_POPULATION`.
- Else:
  - RNG seed: `${seed}:nation-pop-floor:${nationId}`
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

`assignProvinces(...)` returns `provinceOwner = buildNationProvinces(cells, owner, seed)`.

`postProcessProvinces(...)` exact order:

1. `limitMountainSplit(cells, provinceOwner, 'province', owner)`
2. Repeat exactly 2 times:
   - `enforceProvinceConnect({ cells, owner, provinceOwner })`
   - `minProvinceArea({ cells, owner, provinceOwner })`
3. `limitProvincePopulation({ cells, owner, provinceOwner })`

## Ethnic Stage

- `buildEthnicRegions(scaledMesh.cells, owner, seed)` returns `ethnicOwner`.
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
- Keep seed strings exactly.
- Keep production/dev branch around `validateProvinceAssignments`.
