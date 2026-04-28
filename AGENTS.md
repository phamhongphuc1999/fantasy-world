# Next.js 16.2.4 Agent Guidelines

This project uses **Next.js 16.2.4 (App Router)** with React 19 and TypeScript (strict). All framework features (routing, metadata, layouts, rendering) must follow official Next.js 16 documentation.

## Core Philosophy

Procedural fantasy map generator built with a **layered, deterministic, and modular** architecture.

**Tech Stack:**

- Next.js 16.2.4 (App Router)
- React 19 + TypeScript (Strict)
- Tailwind CSS v4
- d3-delaunay (geometry)

## Strict Coding Standards

### 1. Component & Code Organization Rules

- Each `.tsx` file must export **exactly one** default component.
- Each `.tsx` file should ideally be kept **≤ 200 lines** to maintain readability and ease of maintenance.
- If a file exceeds 200 lines, extract sub-components or move logic out to hooks, utils, or services.
- **Never** create trivial wrapper components that only forward props.
- Props interface/type must always be named `TProps`.

**Exceptions – Files are allowed to exceed 200 lines when:**

The file is **atomic** (self-contained with a single clear responsibility) and falls into one of the following cases:

- **Page-level views** (`src/views/[PageName]/index.tsx` or `src/views/MapView/index.tsx`) that contain the overall layout and orchestration of an entire page.
- **Core services or generators** with concentrated, focused logic (e.g. `src/services/map-service.ts`, `src/services/heightmap-generator.ts`, `src/services/river-generator.ts`).
- **Large feature components** that have a single, well-defined responsibility and cannot be reasonably split further (e.g. complex Canvas renderer, SVG map renderer, or main editor component).
- Files that primarily contain **closely related constants, configurations, or type definitions**.

**Important Guideline:**

- Regular UI components should almost never exceed 200 lines.
- Always prefer extracting logic into custom hooks, services, or utilities before allowing a component to grow too large.

### 2. File Placement Rules

- **Components**:
  - General/UI or share components → `src/components/` (group related components in subfolders when needed)
  - Page-specific → `src/views/[page-name]/[component-name].tsx`

- **Views (Recommended for Next.js)**:
  - All pages must remain thin in the `app/` directory.
  - `app/[route]/page.tsx` should **not** contain implementation logic.
  - Instead, import and render a View component from `src/views/`.
  - Example:

    ```tsx
    // app/page.tsx
    import HomeView from 'src/views/HomeView';

    export default function Home() {
      return <HomeView />;
    }
    ```

- **Logic & Services**:
  - All non-hook business logic and core calculations → `src/services/`
  - Example: Map generation logic → `src/services/map-service.ts`

- **Hooks**:
  - All custom React hooks → `src/hooks/`

- **State Management**:
  - Zustand stores → `src/store/`
  - React Context → `src/contexts/`

- **Style**
  - All style files (.css, .scss, .sass) store in `src/styles`

### 3. TypeScript Conventions

- All types and interfaces must be prefixed with **`T`**.
  - Example: `type TCoordinate = [number, number]`

- **Default Rule**: Most shared types should be placed in `src/types/global.ts`

- **When to create separate files**:
  - For types related to a specific domain or API group (e.g., user-related types) → create a dedicated file like `src/types/user.ts`
  - For types belonging to a large page or complex feature (e.g., types used in the Caro game page) → create a dedicated file like `src/types/caro.ts`

- Do **not** define shared types inside components or feature folders.

### 4. Styling

- Use **Tailwind utility classes** by default.
- Prefer standard scale values (`p-4`, `gap-2`, `mt-6`) over arbitrary values (`p-[17px]`) unless strictly necessary.

### 5. Architecture

- `app/` → thin routing + metadata only.
- UI composition → `src/views/`
- Domain logic → `src/features/[domain]/core/`
- All randomness must go through `seededRandom.ts` (deterministic generation).

## Development Flow (Roadmap Layers)

1. **Core Mesh** – Voronoi/Delaunay
2. **Geology** – Elevation, tectonics, terrain
3. **Hydrology** – Rivers, water flow, erosion
4. **Ecology & Culture** – Biomes, climate, politics

## Project Structure

- `app/` – Routes & metadata
- `src/views/` – Page compositions
- `src/features/` – Domain logic (core calculations)
- `src/hooks/` – React hooks
- `src/utils/` – Pure utilities
- `src/types/` – **Canonical location for all shared types**

---

**Follow these rules strictly.** They exist to keep the codebase clean, maintainable, and scalable.
