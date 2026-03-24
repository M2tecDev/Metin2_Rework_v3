# GameLib — Map & World

> Outdoor map rendering and management: terrain chunk loading, area system, environment data, sky, water, snow, and the overall map manager.

[← Back to GameLib index](client-src-GameLib)

## Overview

The map sub-system is responsible for loading, streaming, and rendering the outdoor game world. It is organized in a hierarchy: `CMapManager` owns a single `CMapOutdoor` at runtime, which manages a grid of `CArea` chunks. Each area contains terrain patches (from [client-src-PRTerrainLib](client-src-PRTerrainLib) — the terrain rendering foundation for `CMapOutdoor`), static object instances (`CGraphicThingInstance`), and effect placements. Terrain rendering uses hardware-splatting textures for multi-layer blending. The environment system drives sky color, fog, ambient light, and weather.

## Classes

### `CMapManager`
**File:** `MapManager.h`
**Purpose:** Top-level singleton for the world. Owns the `CMapOutdoor` instance and the `CSpeedTreeForestDirectX` for vegetation. Provides height/normal/water queries, environment-data management, attribute queries, and portal visibility.

#### Methods
| Method | Description |
|--------|-------------|
| `LoadMap(name, x, y, z)` | Loads the map definition and terrain for the given map name |
| `UnloadMap(name)` | Unloads a previously loaded map |
| `UpdateMap(fx, fy, fz)` | Streams in/out terrain chunks based on the camera position |
| `GetHeight(fx, fy)` | Returns the terrain+object height at a world XY position |
| `GetTerrainHeight(fx, fy)` | Returns raw terrain height at a world XY position |
| `GetWaterHeight(iX, iY, plH)` | Returns water surface height at a cell position |
| `isAttrOn(fX, fY, byAttr)` | Returns true if the given attribute flag is set at a world position |
| `RegisterEnvironmentData(index, filename)` | Loads an environment-data definition by index |
| `SetEnvironmentData(index)` | Immediately applies an environment |
| `BlendEnvironmentData(pData, time)` | Begins a time-based transition to a new environment |
| `GetShadowMapColor(fx, fy)` | Returns shadow map color at a world position |
| `isPhysicalCollision(pos)` | Returns true if there is a block attribute at the given position |
| `SetTerrainRenderSort(mode)` | Switches between distance-sort and texture-sort terrain rendering |

---

### `CMapOutdoor`
**File:** `MapOutdoor.h`
**Purpose:** Manages the full outdoor map: loads terrain chunks into an area grid, renders terrain patches, water, sky, trees, and object instances. Implements a quadtree-based LOD system for terrain.

#### Render Parts (`EPart`)
| Part | Contents |
|------|----------|
| `PART_TERRAIN` | Terrain splatting geometry |
| `PART_OBJECT` | Static and dynamic world objects |
| `PART_CLOUD` | Cloud layer (part of sky) |
| `PART_WATER` | Water surface rendering |
| `PART_TREE` | SpeedTree vegetation |
| `PART_SKY` | Sky-box rendering |

#### Source file breakdown
| File | Contents |
|------|----------|
| `MapOutdoor.cpp` | Initialization and main lifecycle |
| `MapOutdoorLoad.cpp` | Area loading, chunk streaming |
| `MapOutdoorRender.cpp` | Main render dispatch |
| `MapOutdoorRenderHTP.cpp` | Hardware texture-pass splatting render |
| `MapOutdoorRenderSTP.cpp` | Software texture-pass splatting render |
| `MapOutdoorUpdate.cpp` | Per-frame area streaming update |
| `MapOutdoorWater.cpp` | Water surface rendering |
| `MapOutdoorIndexBuffer.cpp` | LOD index buffer generation |
| `MapOutdoorQuadtree.cpp` | Quadtree patch visibility/LOD |
| `MapOutdoorCharacterShadow.cpp` | Character shadow projection onto terrain |

---

### `CArea`
**File:** `Area.h`
**Purpose:** Represents a single map chunk (area). Contains a list of `CGraphicThingInstance` objects (static world objects), effect placements, and collision data. Areas are loaded asynchronously via `CAreaLoaderThread` and registered with `CMapOutdoor` on completion.

---

### `CAreaTerrain`
**File:** `AreaTerrain.h`
**Purpose:** Terrain-specific data for an area. Integrates `PRTerrainLib`'s `CTerrainImpl` with the area system, managing texture-set loading and splatting alpha creation.

---

### `CAreaLoaderThread`
**File:** `AreaLoaderThread.h`
**Purpose:** Background thread that asynchronously loads area terrain and object data to avoid hitching during gameplay as the camera moves across the world.

---

### `TerrainPatch / TerrainQuadtree`
**File:** `TerrainPatch.h`, `TerrainQuadtree.h`
**Purpose:** `CTerrainPatchProxy` manages the D3D vertex/index buffers for a single terrain patch with LOD levels. `CTerrainQuadtreeNode` organizes patches in a quadtree for view-frustum culling and LOD selection based on distance.

---

### `TerrainDecal`
**File:** `TerrainDecal.h`
**Purpose:** Projects a textured quad onto the terrain surface, used for footprints, spell indicators, selection circles, and other ground overlays.

---

### Environment Data (`TEnvironmentData`)
**File:** `MapType.h`
**Purpose:** Holds all parameters that define the visual environment: ambient and diffuse light colors, sky gradient colors, fog start/end distances, fog color, shadow settings, cloud configuration, and lens flare parameters. `CMapManager` can blend between two `TEnvironmentData` instances over time for day/night and weather transitions.

---

### `CSnowEnvironment` / `CSnowParticle`
**File:** `SnowEnvironment.h`, `SnowParticle.h`
**Purpose:** Implements a particle-based snow weather effect. `CSnowEnvironment` manages a pool of `CSnowParticle` instances around the camera, updating their fall velocities and rendering them as camera-facing billboards.

---

### `CProperty` / `CPropertyManager`
**File:** `Property.h`, `PropertyManager.h`
**Purpose:** The property system associates object placement files (`.prp`) with the outdoor map. Each `.prp` file defines static objects to place in a given area. `CPropertyManager` loads, caches, and looks up these property files.

---

### `CDungeonBlock`
**File:** `DungeonBlock.h`
**Purpose:** Handles placement of dungeon-specific geometry blocks that make up indoor dungeon maps. Manages tiled block placement and collision.

---

### `CGameEventManager`
**File:** `GameEventManager.h`
**Purpose:** Manages client-side game events triggered by the server (e.g., quest events, environment change commands). Events are queued and processed each frame.
