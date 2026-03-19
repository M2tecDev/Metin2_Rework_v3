# SpeedTreeLib

> Vegetation and tree rendering library wrapping the SpeedTreeRT middleware for real-time rendering of procedural trees and ground-cover grass.

## Overview

SpeedTreeLib integrates the SpeedTreeRT third-party library into the client's rendering pipeline. It manages a forest of tree instances, handles LOD switching, and renders branches, leaves, fronds, and billboard imposters. A separate `SpeedGrass` system renders procedural ground-cover grass patches. The library is used by `GameLib::CMapOutdoor` to populate and render the outdoor environment.

## Dependencies

- `EterBase` — CRC32, singleton
- `EterLib` — `CGraphicBase`, D3D9 vertex/index buffers
- SpeedTreeRT (extern) — tree mesh generation and wind animation

## Files

| File | Purpose |
|------|---------|
| `SpeedTreeForest.h/.cpp` | `CSpeedTreeForest`: collection of unique tree species with CRC-based loading |
| `SpeedTreeForestDirectX.h/.cpp` | `CSpeedTreeForestDirectX`: D3D9 rendering of the forest (branches, leaves, billboards) |
| `SpeedTreeWrapper.h/.cpp` | `CSpeedTreeWrapper`: per-tree-species wrapper around `CSpeedTreeRT` |
| `SpeedGrassRT.h/.cpp` | `CSpeedGrassRT`: SpeedGrass procedural grass generation |
| `SpeedGrassWrapper.h/.cpp` | `CSpeedGrassWrapper`: per-patch grass wrapper |
| `SpeedTreeConfig.h` | Project-wide SpeedTree configuration constants |
| `SpeedTreeMaterial.h` | Material settings for SpeedTree geometry |
| `VertexShaders.h` | HLSL vertex shader source for SpeedTree branch/leaf rendering |
| `BoundaryShapeManager.h/.cpp` | `CBoundaryShapeManager`: manages boundary shapes for placing trees |
| `Constants.h` | SpeedTree render bit-vector constants (`Forest_RenderBranches`, etc.) |

## Render Bit Flags

| Flag | Meaning |
|------|---------|
| `Forest_RenderBranches` | Render branch geometry |
| `Forest_RenderLeaves` | Render leaf billboards |
| `Forest_RenderFronds` | Render frond geometry |
| `Forest_RenderBillboards` | Render camera-facing tree imposters |
| `Forest_RenderAll` | Render all components |
| `Forest_RenderToShadow` | Render into shadow map |
| `Forest_RenderToMiniMap` | Render into mini-map |

## Classes

### `CSpeedTreeForest`
**File:** `SpeedTreeForest.h`
**Purpose:** Manages a collection of unique tree species. Each species is identified by its CRC32 and represented by a `CSpeedTreeWrapper`. Tree placement instances (position, scale, rotation) are added to species wrappers.

#### Methods
| Method | Description |
|--------|-------------|
| `AddTree(filename, pos, rot, scale, ...)` | Loads or retrieves a tree species by CRC and adds an instance |
| `DeleteAll()` | Removes all tree instances and species data |
| `Update(pos, cameraDir)` | Updates LOD and wind for all visible trees |

---

### `CSpeedTreeForestDirectX`
**File:** `SpeedTreeForestDirectX.h`
**Purpose:** Extends `CSpeedTreeForest` with D3D9 rendering. Manages vertex declarations, renders each tree component type in the correct order, and supports shadow-map rendering.

#### Methods
| Method | Description |
|--------|-------------|
| `Render(renderBits, bFog)` | Renders the forest using the given render-bit mask |
| `RenderToShadow(...)` | Renders the forest into a shadow map |
| `RenderToMiniMap(...)` | Renders the forest into a mini-map texture |
| `CreateDeviceObjects()` | Creates vertex declarations and shaders |
| `DestroyDeviceObjects()` | Releases D3D resources |

---

### `CSpeedTreeWrapper`
**File:** `SpeedTreeWrapper.h`
**Purpose:** Per-species wrapper holding a `CSpeedTreeRT` instance, its placement instance list, LOD configuration, and branch/leaf geometry buffers.

---

### `CSpeedGrassRT` / `CSpeedGrassWrapper`
**File:** `SpeedGrassRT.h`, `SpeedGrassWrapper.h`
**Purpose:** Manage procedural ground-cover grass patches. `CSpeedGrassRT` generates the grass geometry using SpeedGrass algorithms; `CSpeedGrassWrapper` wraps individual grass patches with their world-space placement data.
