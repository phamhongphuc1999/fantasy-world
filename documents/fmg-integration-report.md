# Fantasy-Map-Generator Integration Report

## Goal

Integrate the core world-generation logic from:

- `/Users/phuc/Documents/personal/Fantasy-Map-Generator`

into the current project:

- `/Users/phuc/Documents/personal/fantasy-world`

without copying the old code blindly, and while preserving the current project's architecture, rendering model, and deterministic pipeline.

## Executive Summary

The original project already contains a mature procedural generation system, but it is built around a different application model:

- Vite instead of Next.js
- global mutable state (`pack`, `grid`, `window.*`)
- D3-heavy rendering and utilities
- mixed generator / editor / renderer responsibilities

The current project is much smaller and cleaner:

- Next.js 16 + React 19
- modular `src/features/map/core/*` generation pipeline
- centralized explorer state
- Canvas rendering
- shared types in `src/types/global.ts`

This means the correct implementation strategy is **selective extraction and reinterpretation**, not direct porting.

## Current Project Baseline

The current project already has:

- deterministic mesh generation
- explicit topology graph
- topography generation
- hydrology generation
- Canvas rendering
- centralized explorer state

Key current files:

- `src/features/map/core/buildMesh.ts`
- `src/features/map/core/buildTopography.ts`
- `src/features/map/core/buildHydrology.ts`
- `src/features/map/components/MapCanvas.tsx`
- `src/features/map/store/mapExplorerStore.ts`
- `src/types/global.ts`

This is important because some logic from the original project has already been partially recreated in a simpler form.

## Original Project Analysis

### Core generator modules worth studying

#### 1. Terrain / heightmap generation

Primary files:

- `src/modules/heightmap-generator.ts`
- `src/modules/features.ts`
- `src/modules/voronoi.ts`

What they do:

- build and mutate a polygonal graph
- assign height values to cells
- derive land / water / coastline / lake / ocean features
- support multiple terrain shaping tools such as hills, pits, ranges, troughs, straits, smoothing

Important observations:

- `heightmap-generator.ts` is not a small reusable function. It is a stateful mutation module.
- It depends on:
  - global graph dimensions
  - random helpers
  - app-level graph structures
  - mutable typed arrays
- The useful part is the **terrain shaping strategy**, not the exact class structure.

#### 2. Biome assignment

Primary file:

- `src/modules/biomes.ts`

What it does:

- classifies each land cell into a biome based on:
  - temperature
  - precipitation / moisture
  - river presence
  - height

Important observations:

- This module is relatively portable conceptually.
- The biome matrix and threshold logic are valuable.
- However, it depends on:
  - `pack.cells`
  - `grid.cells`
  - a global `biomesData`
  - precipitation and temperature arrays that the current project does not have yet

This makes it a **good candidate for a later adaptation**, but not a direct drop-in today.

#### 3. Rivers / hydrology

Primary files:

- `src/modules/river-generator.ts`
- `src/modules/lakes.ts`
- `src/modules/features.ts`

What they do:

- accumulate precipitation into water flux
- route water downhill
- create lakes and outlets
- build river networks
- generate meandering render points and river metadata

Important observations:

- The original river system is significantly richer than the current one.
- It includes:
  - discharge
  - parent / basin relations
  - meandering geometry
  - mouth width and source width
  - lake outflow rules
- This logic is valuable for a future Step 3 refinement.

#### 4. Regions / political assignment

Primary files:

- `src/modules/states-generator.ts`
- `src/modules/provinces-generator.ts`
- `src/modules/cultures-generator.ts`
- `src/modules/religions-generator.ts`

What they do:

- expand states from capitals
- assign cells to regions using weighted traversal
- factor in:
  - biome cost
  - river cost
  - mountain / water crossing penalties
  - culture compatibility
  - population

Important observations:

- `states-generator.ts` is one of the strongest algorithmic modules in the original project.
- The weighted expansion model fits the current project well conceptually.
- It should be reused **later**, once biomes, temperature, precipitation, settlements, and population exist.

#### 5. Rendering logic

Primary files:

- `src/renderers/draw-heightmap.ts`
- `src/renderers/draw-features.ts`
- `src/renderers/draw-borders.ts`
- `src/renderers/draw-temperature.ts`

What they do:

- generate layered SVG paths from map state
- use D3 curves for contouring and stylistic rendering

Important observations:

- This renderer should **not** be ported directly.
- The current project already chose Canvas as its rendering path.
- The useful part here is:
  - visual layering ideas
  - contour grouping logic
  - data-to-visual mapping

The exact D3/SVG implementation should be left behind.

## Pure Logic vs UI / Framework Code

### Logic that is reusable in principle

- terrain shaping heuristics from `heightmap-generator.ts`
- feature classification from `features.ts`
- biome decision matrix from `biomes.ts`
- river hierarchy / flow ideas from `river-generator.ts`
- weighted regional expansion from `states-generator.ts`

### Code that should not be ported directly

- anything using `window.*`
- anything using `pack` / `grid` global state directly
- UI controllers under `src/controllers/*`
- D3/SVG renderer modules under `src/renderers/*`
- legacy DOM/editor behavior

## Mapping to the Current Architecture

The current project should keep using this structure:

- `src/features/map/core/`
  - pure generation logic
- `src/features/map/components/`
  - Canvas and UI components
- `src/features/map/store/`
  - centralized explorer state
- `src/types/global.ts`
  - shared types

### Recommended mapping

#### Original `voronoi.ts`

Map to:

- keep current `buildMesh.ts`

Reason:

- the current mesh builder already aligns with the current project better than the original implementation.
- no migration value in replacing it with the old global-style module.

#### Original `heightmap-generator.ts`

Map to:

- extend `buildTopography.ts`
- optionally add:
  - `src/features/map/core/terrainTools.ts`
  - `src/features/map/core/terrainPresets.ts`

Reason:

- the old module contains rich terrain-shaping ideas
- the current project needs those ideas rewritten as pure functions over `TMapMesh`

#### Original `features.ts`

Map to:

- new pure helper:
  - `src/features/map/core/buildFeatures.ts`

Reason:

- coast / lake / island / ocean classification belongs in the data pipeline, not in rendering

#### Original `biomes.ts`

Map to:

- `src/features/map/core/buildBiomes.ts`

Reason:

- the original biome matrix is valuable
- the current project will need:
  - temperature generation
  - precipitation / moisture generation
  - river-aware moisture boost

#### Original `river-generator.ts`

Map to:

- refactor current `buildHydrology.ts`
- optionally split into:
  - `buildFlow.ts`
  - `buildRivers.ts`
  - `buildLakes.ts`
  - `applyErosion.ts`

Reason:

- the current hydrology layer already exists, so this is an enhancement target, not a fresh import

#### Original `states-generator.ts`

Map to:

- later phase:
  - `src/features/map/core/buildStates.ts`
  - `src/features/map/core/buildRegions.ts`

Reason:

- this should only be integrated after ecology and settlements are in place

## Proposed Implementation Plan

### Phase A: Keep current geometry

Do not migrate the original Voronoi implementation.

Keep:

- current `buildMesh.ts`
- current topology model

Reason:

- already adapted
- already deterministic
- already integrated with Canvas and picking

### Phase B: Upgrade terrain generation from original concepts

Use the old project only as algorithm reference.

Implement in current project:

- richer terrain presets
- explicit hill / range / trough shaping
- stronger continent masks
- typed-array backed terrain buffers where appropriate

Target files:

- `src/features/map/core/buildTopography.ts`
- `src/features/map/core/terrainTools.ts`
- `src/features/map/core/terrainPresets.ts`

### Phase C: Upgrade hydrology from original concepts

Refactor the current hydrology system using ideas from:

- `river-generator.ts`
- `lakes.ts`
- `features.ts`

Implement:

- better sink / outlet handling
- explicit river objects
- basin hierarchy
- width / discharge metadata
- optional river meandering paths for rendering

Target files:

- `src/features/map/core/buildHydrology.ts`
- `src/features/map/core/buildRivers.ts`
- `src/features/map/core/buildLakes.ts`

### Phase D: Add climate and biomes

Implement:

- temperature field
- precipitation field
- moisture accumulation
- biome classification matrix

Target files:

- `src/features/map/core/buildClimate.ts`
- `src/features/map/core/buildBiomes.ts`

### Phase E: Add regions / states

Use the original `states-generator.ts` as the primary reference.

Implement:

- capitals / seeds
- weighted region growth
- terrain penalties
- river / biome / coastline costs

Target files:

- `src/features/map/core/buildStates.ts`
- `src/features/map/core/buildRegions.ts`

## What Should Be Kept

From the original project:

- conceptual pipeline
- weighted terrain / region heuristics
- biome classification strategy
- richer hydrology model
- feature classification ideas

From the current project:

- Next.js app structure
- Canvas rendering
- current modular core pipeline
- centralized state approach
- shared type system
- deterministic generation discipline

## What Should Be Changed

- remove all global state assumptions
- replace mutation-heavy classes with pure pipeline functions
- replace D3/SVG rendering with Canvas-native drawing
- replace legacy graph structures with current `TMapMesh` / `TMapCell`
- replace direct DOM coupling with current React components

## What Should Be Simplified

For the first integration pass:

- do not import the full editor system
- do not port old rendering modules
- do not port old save/load formats
- do not port advanced state/culture/religion generation immediately
- do not port every terrain tool one-to-one

The right strategy is to migrate **algorithms**, not **application surface area**.

## Risks and Trade-offs

### Risk 1: Over-porting legacy architecture

If you try to copy whole modules directly, the current project will inherit:

- global state coupling
- hidden dependencies
- mixed responsibilities
- brittle migration paths

### Risk 2: Losing determinism

The original project mixes seeded and non-seeded randomness in places. Every migrated algorithm in the current project must be routed through the current deterministic random utilities.

### Risk 3: Rendering mismatch

The original project is D3/SVG-oriented. Porting its renderer directly would conflict with the current Canvas direction and make interaction harder to keep consistent.

## Recommended First Implementation After This Report

The best next implementation step is:

1. Audit the current `buildTopography.ts` against `heightmap-generator.ts`
2. Upgrade terrain shaping first
3. Upgrade hydrology second
4. Add climate + biomes third
5. Add state / region growth last

This order gives the best reuse value from the original project while preserving the current architecture.

## Final Recommendation

Do not treat `Fantasy-Map-Generator` as a module to embed.

Treat it as a **reference implementation and algorithm source**.

The current project should:

- keep its own mesh, rendering, and state architecture
- selectively absorb proven procedural rules from the old project
- rewrite those rules into pure, typed, deterministic functions

That will produce a codebase that is easier to maintain, easier to extend, and less likely to break the current project’s structure.
