# Fantasy World

Fantasy World is a procedural map engine built with Next.js 16, React 19, TypeScript, and `d3-delaunay`.

The project follows a layered world-generation pipeline:

1. Geometry
2. Topography
3. Hydrology
4. Rendering and interaction

The current app already implements the first three layers and renders the result through Canvas in the browser.

## Current Status

Implemented:

- deterministic Voronoi / Delaunay mesh generation
- explicit topology graph with cells, edges, and vertices
- seed-driven terrain generation
- elevation, land/water classification, and terrain bands
- downhill flow routing
- river detection
- sink lake detection
- lightweight erosion / deposition pass
- Canvas-based rendering
- hover and click selection
- centralized explorer state

Not implemented yet:

- biome simulation
- climate / moisture systems
- political borders
- settlements
- worker-based background simulation

## Tech Stack

- Next.js 16.2.4
- React 19.2.4
- TypeScript
- Tailwind CSS v4
- `d3-delaunay`

## Getting Started

Install dependencies and run the app:

```bash
bun install
bun run dev
```

Useful scripts:

```bash
bun run dev
bun run build
bun run start
bun run format
bun run eslint
```

## Project Structure

```text
app/
  layout.tsx
  page.tsx

documents/
  task.md

src/
  components/
  configs/
  features/
    map/
      components/
      core/
      store/
  styles/
  types/
  views/
```

Key files:

- `app/page.tsx`
  - route entrypoint
- `src/views/HomeView/index.tsx`
  - main screen orchestration
- `src/features/map/core/buildMesh.ts`
  - geometry layer
- `src/features/map/core/buildTopography.ts`
  - topography layer
- `src/features/map/core/buildHydrology.ts`
  - hydrology layer
- `src/features/map/components/MapCanvas.tsx`
  - Canvas renderer
- `src/features/map/store/mapExplorerStore.ts`
  - centralized explorer state
- `src/types/global.ts`
  - shared types

## Generation Pipeline

### 1. Geometry

`buildMesh()` creates a deterministic Voronoi mesh from a seed and cell count.

Output includes:

- `TMapCell`
- `TMapEdge`
- `TMapVertex`
- Delaunay lookup for interaction

### 2. Topography

`buildTopography()` applies a deterministic fBm-style value-noise heightmap over the mesh.

Output includes:

- `elevation`
- `isWater`
- `terrain`

### 3. Hydrology

`buildHydrology()` uses typed arrays to simulate downhill flow and derive water systems.

Output includes:

- `flow`
- `downstreamId`
- `erosion`
- `isRiver`
- `isLake`

### 4. Rendering

The app renders the current map state with Canvas for better scalability than SVG at higher cell counts.

Interaction currently supports:

- hover detection
- click selection
- live regeneration from seed
- cell count changes
- sea level changes

## Notes For Contributors

- Follow the rules in `AGENTS.md`.
- Keep `app/` routes thin.
- Put domain logic in `src/features/`.
- Keep generation deterministic and seed-driven.
- Shared types belong in `src/types/global.ts`.
- If you touch Next.js-specific behavior, check the local docs in `node_modules/next/dist/docs/`.

## Roadmap

Planned next layers:

1. Ecology and biome simulation
2. Political regions and borders
3. Settlements and world metadata
4. Worker-based heavy computation
5. Higher-density rendering and optimization

## Reference

The technical target and pipeline notes for this project are described in:

- `documents/task.md`
