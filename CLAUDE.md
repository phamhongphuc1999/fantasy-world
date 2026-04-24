# Next.js Framework Compliance

This project utilizes **Next.js 16.2.4** with the App Router. All framework-specific implementations (routing, rendering boundaries, metadata, layouts, or framework-specific behavior) must strictly follow the documentation located in `node_modules/next/dist/docs/` or current Next.js 16 documentation. Do not apply legacy conventions from versions prior to 15/16.

# Project Philosophy

This repository is dedicated to building a **procedural fantasy map generator**. The engine follows a layered approach where each system builds upon the output of the previous one. The goal is a deterministic, scalable, and modular world-generation engine.

# Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Library:** React 19
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS v4
- **Geometry:** `d3-delaunay` for mesh calculations

# Development & Coding Standards

To maintain a clean and scalable codebase, all contributors and AI agents must adhere to these strict rules:

### 1. Component Structure

- **Single Responsibility:** Each `.tsx` file should only contain the `export default` of the main component it represents.
- **File Length:** Components must be concise. Limit files to a maximum of **200 lines of code**. If a component exceeds this, refactor sub-components into separate files or move logic to hooks/utils.
- **Props Definition:** Define component parameters using the naming convention `TProps`. If the props do not need to be exported, define them locally within the file:
  `type TProps = { ... }` or `interface TProps { ... }`

### 2. TypeScript Naming Conventions & Management

- **Uniform Prefix:** All type definitions, whether using `type` or `interface`, must start with a capital **T**.
  - _Example (Interface):_ `interface TMapData { ... }`
  - _Example (Type):_ `type TCoordinate = [number, number]`
- **Centralized Type Management:** All types and interfaces intended for shared use across multiple files/modules **must** be located within the `src/types/` directory.
  - General shared types should be placed in `src/types/global.ts`.
  - If a group of types serves a specific, large-scale purpose (e.g., `mesh`, `biomes`), create a dedicated file: `src/types/[category].ts`.
  - Do not define shared types inside feature folders or component files.

### 3. Styling with Tailwind CSS

- **Utility First:** Prioritize standard Tailwind utility classes over arbitrary values.
- **Standard over Arbitrary:** Use standard scale classes (e.g., `mt-1`, `p-4`, `gap-2`) instead of arbitrary brackets (e.g., `mt-[4px]`, `p-[16px]`) unless a specific non-standard value is strictly required by the design spec.

### 4. Architecture Rules

- **View-Feature Split:** Keep `app/` routes thin. Delegate UI implementation to `src/views/` and domain logic to `src/features/`.
- **Logic Isolation:** Calculation logic (e.g., Voronoi, erosion, biomes) must reside in `src/features/[feature-name]/core/` and remain independent of React's render cycle where possible.
- **Determinism:** All generation steps must be seed-driven. Ensure `seededRandom.ts` is the single source of truth for randomness.

# Roadmap & Evolution

The development process is structured into sequential phases. Ensure new features do not bypass the established data flow:

1.  **Core Mesh:** Seed-based Voronoi/Delaunay structures.
2.  **Geology:** Elevation mapping, tectonic plates, and terrain shapes.
3.  **Hydrology:** Water flow, river systems, and thermal erosion.
4.  **Ecology & Culture:** Biomes, climate simulation, and political boundaries.

# Project Navigation

1. `app/`: Routing and Metadata.
2. `src/views/`: Page-level compositions and main UI layouts.
3. `src/features/`: Modular domain logic (Map generation, UI state, etc.).
4. `src/hooks/`: Shared React hooks.
5. `src/utils/`: Pure helper functions.
6. `src/types/`: **Canonical directory for all shared Type/Interface definitions.**
