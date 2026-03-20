# Map & World System

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [What is a SECTREE?](concept-sectree)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

This page covers the complete map and world pipeline for Metin2 Rework v3, from the server-side spatial partitioning engine through client-side terrain rendering to the minimap UI.

---

## Table of Contents

1. [Overview](#1-overview)
2. [SECTREE System](#2-sectree-system)
3. [Map Loading](#3-map-loading)
4. [Spawn System](#4-spawn-system)
5. [Dungeon System](#5-dungeon-system)
6. [Warp & Portal System](#6-warp--portal-system)
7. [Client Map Rendering](#7-client-map-rendering)
8. [Minimap](#8-minimap)
9. [Network Packets](#9-network-packets)
10. [Key Files](#10-key-files)

---

## 1. Overview

### World Structure

The Metin2 world is divided into **named maps**, each identified by a unique integer **map index** (also called `lMapIndex` or `map_index` in the codebase). Each physical game server process (`game`) owns a fixed set of map indices. Multi-server setups route players between processes using the **map location** table.

Maps fall into two broad categories:

| Category | Description |
|---|---|
| **Field maps** | Persistent, shared outdoor zones (villages, hunting fields, boss maps). Always loaded at server start. |
| **Instanced maps** | Per-party/per-player copies, typically dungeons. Created dynamically and destroyed when empty. |

### Map Numbering

Map indices are stable integers registered in the server's `map_index` configuration and the database. Conventional ranges used in the base game:

| Range | Use |
|---|---|
| 1 – 99 | Core field maps (Mape, Zi, Sungzi, Chunjo kingdom maps, etc.) |
| 100 – 199 | Boss and event maps |
| 200 – 299 | Dungeon template maps (source geometry) |
| 300+ | Dynamically allocated instanced dungeon copies |

> The exact allocation for this project may differ; consult the server configuration files and the `sectree_manager` boot log.

### Coordinate System

All world positions are expressed as **integer centimetres** on a 2-D plane (the XY plane), with Z used for height in client rendering only. The server never uses Z for logic.

```
+Y (North)
  ^
  |
  |
  +---------> +X (East)
(0, 0) = north-west corner of map origin
```

Key facts:

- **1 tile = 200 units** (one terrain cell on the server attribute map is 200 × 200 units).
- **1 sector = 3200 × 3200 units** (16 × 16 tiles). This is the fundamental SECTREE cell size.
- A map's total size is expressed as `(width_sectors × 3200) × (height_sectors × 3200)` units.
- Player and monster positions are stored as `(long x, long y)` pairs in centimetres.
- Client rendering converts these to Direct3D world-space by dividing by 100 to obtain metres, then placing the camera accordingly.

---

## 2. SECTREE System

### Purpose

The SECTREE (sector tree) system is the server-side **spatial partitioning** structure. Rather than checking every entity against every other entity each tick, the server divides each map into a fixed grid of sectors. Only entities within the same sector or adjacent sectors need to interact, dramatically reducing the computational cost of proximity queries (aggro, view distance, AoE damage, packet broadcasting).

### Files

| File | Location |
|---|---|
| `sectree.h` / `sectree.cpp` | `server-src/src/game/` |
| `sectree_manager.h` / `sectree_manager.cpp` | `server-src/src/game/` |

### Data Structures

`SECTREE` represents a single sector cell. Key members (from the well-known vanilla source):

```cpp
// Conceptual structure of SECTREE
class SECTREE {
    SECTREEMAP      * m_pkMap;          // owning map
    DWORD             m_dwSerial;       // unique sector key: encodes (x_idx << 16 | y_idx)
    EntitySet         m_set_entity;     // all CEntity* in this sector
    AttributeGrid     m_attributes;     // 16×16 attribute bytes (passable, water, etc.)
};
```

`SECTREE_MANAGER` is a singleton that owns all loaded maps. It maps `lMapIndex -> LPSECTREE_MAP`, where `SECTREE_MAP` is a 2-D array of `SECTREE` pointers.

### Sector Key Encoding

A sector's identity within its map is packed into a 32-bit key:

```
DWORD key = (y_sector_index << 16) | x_sector_index;
```

This allows O(1) sector lookup given a world coordinate:

```cpp
int sx = x / SECTREE_SIZE;   // SECTREE_SIZE = 3200
int sy = y / SECTREE_SIZE;
DWORD key = (sy << 16) | sx;
LPSECTREE pSectree = m_pkMap->find(key);
```

### View Distance and Entity Broadcasting

The server defines a **view radius** constant (typically 5000–6000 units in vanilla, tunable per server). When an entity moves from one sector to another, the `entity_view.cpp` system:

1. Computes the set of sectors within view distance of the entity's new position.
2. Computes the delta (appeared / disappeared) relative to the previously visible set.
3. Sends `GC_CHARACTER_ADD` / `GC_CHARACTER_DEL` packets to the player for entities that entered or left view.
4. Sends `GC_ENTITY_VIEW` (see [Section 9](#9-network-packets)) to new observers of the entity.

The view system iterates over the **3 × 3** grid of sectors centred on the entity's current sector (the entity's own sector plus all 8 neighbours). For entities near sector boundaries, this extends one extra ring if the view radius demands it.

### Attribute Map

Each sector stores a 16 × 16 byte grid of **attribute flags** matching the 16 × 16 tiles it covers. Attribute bytes are bit-fields:

| Bit | Meaning |
|---|---|
| 0 | Blocked (impassable) |
| 1 | Water |
| 2 | Protect zone (safe area, no PvP) |
| 3 | Empire 1 / 2 / 3 territory bits |
| 4–5 | (reserved / extended) |

These attributes are loaded from the map's `.msa` (map settings/attribute) binary file at boot. The client uses a separate, client-side attribute texture for collision but the server attribute map is authoritative.

---

## 3. Map Loading

### Server-Side Boot Sequence

At game server startup, `SECTREE_MANAGER::LoadMap()` is called for each map index owned by this process. The sequence is:

1. **Locate the map directory** — maps are stored under the server's map data path, named by their text identifier (e.g. `n_flame_01`, `n_snowm_01`).
2. **Read `Setting.txt`** — a plain-text file in each map directory that specifies the map's size in sectors, the origin offset, and various flags (day/night cycle, safe zone flag, etc.).
3. **Load the attribute data (`.msa` file)** — the attribute binary is loaded and distributed into each `SECTREE` cell's attribute grid.
4. **Allocate the SECTREE grid** — `SECTREE_MAP` is populated with one `SECTREE` per cell.
5. **Load regen data** — `regen.cpp` reads the map's `regen.txt` / monster regen files and registers spawn timers (see [Section 4](#4-spawn-system)).
6. **Load buildings** — `building.cpp` instantiates map-static objects (guild halls, flags, etc.) within the sectree.
7. **Load portals/warps** — warp entries are registered into the sectree manager's warp table (see [Section 6](#6-warp--portal-system)).

### Map Location Resolution (`map_location`)

`map_location.h` / `map_location.cpp` implement the inter-server map routing table. When a player on server A needs to travel to a map owned by server B, the map location system provides the IP address and port of the target game server. This lookup is used by the warp/teleport code before sending the client a `GC_WARP` packet.

### Client-Side Map Loading

On the client, map loading is orchestrated by `CMapManager` (`MapManager.h` / `MapManager.cpp`):

1. The client receives a phase-change or warp packet containing the target map name and starting position.
2. `CMapManager::SetMapInfo()` is called with the map's directory name (e.g. `"map/n_flame_01"`).
3. `CMapOutdoor::Load()` (`MapOutdoorLoad.cpp`) reads `Setting.msm` (the client-side counterpart to the server's `Setting.txt`), which defines the number of `Area` cells and their positions.
4. The map is divided into **areas** — each area is a `CArea` instance (`Area.h`). Areas correspond to fixed-size sub-regions of the map and are loaded/unloaded from disk as the player moves (streaming).
5. For each area, `CAreaTerrain` (`AreaTerrain.h`) holds the terrain height-map, texture layers, and water data. Terrain geometry is built into Direct3D index and vertex buffers by `MapOutdoorIndexBuffer.cpp`.
6. Static objects (trees, rocks, buildings) are described in each area's `.amd` property file and instantiated as `CProperty` objects (`Property.h`).

#### Key Client Map Files (data)

| File | Where | Purpose |
|---|---|---|
| `Setting.msm` | `map/<name>/` | Map dimensions, area grid size, environment settings |
| `<area_x>_<area_y>/terrainXXX.raw` | `map/<name>/` | Raw height-map data per area |
| `<area_x>_<area_y>/attr.atr` | `map/<name>/` | Per-tile attribute flags (mirrors server `.msa`) |
| `<area_x>_<area_y>/objects.amd` | `map/<name>/` | Static object placement list |
| `TextureSet.dds` | `terrain/` | Splatmap/texture set for terrain blending |

---

## 4. Spawn System

### Overview

Monster and NPC spawning on the server is managed by `regen.cpp` (`regen.h` / `regen.cpp`) in conjunction with `mob_manager.cpp`. The spawn data is authored in plain-text regen files that live alongside each map's server data.

### Regen File Format

Each map directory contains one or more regen files (`regen.txt`, `boss.txt`, `stone.txt`, etc.):

```
# type  vnum  count  x        y        range  cycle_sec  leader_vnum
r       101   5      400000   600000   2000   300        0
```

Fields:

| Field | Meaning |
|---|---|
| Type | `r` = random regen, `g` = group regen, `e` = event regen |
| vnum | Monster or NPC virtual number |
| count | Number of individuals to maintain alive |
| x, y | Centre of the spawn area (map units) |
| range | Radius of the spawn circle |
| cycle_sec | Respawn timer in seconds |
| leader_vnum | If non-zero, this entry is a `SpawnGroup` led by this vnum |

### SpawnGroup

When a `SpawnGroup` is used, the leader and its followers are spawned as a unit. The group is registered via `CMobManager` and shares a single respawn event — when the leader dies, the entire group is flagged for respawn after `cycle_sec` seconds. Individual followers do not respawn independently.

### Respawn Timer

Respawn is implemented as a thecore `event` (timer callback). When the last member of a regen entry dies:

1. A `SECTREE`-scoped event is enqueued with a delay of `cycle_sec` seconds.
2. On expiry, `do_regen()` is called, which calls `CMobManager::SpawnMob()` for each member.
3. `SpawnMob()` selects a random position within the spawn range, finds the correct `SECTREE`, and calls `CHARACTER::Create()` to instantiate the entity, placing it into the sectree.

### NPC Spawning

Static NPCs (shop keepers, quest givers) are typically listed in `npc.txt` with `cycle_sec = 0`, meaning they are spawned once at boot and never re-created unless the process restarts.

---

## 5. Dungeon System

### Architecture

Instanced dungeons in Metin2 Rework v3 are managed by the `CDungeon` class (`dungeon.h` / `dungeon.cpp`) and the `CDungeonManager` singleton. Each party that enters a dungeon receives its own independent map copy (a dynamically allocated map index) so that parties do not interfere with each other.

### CDungeon Class

Key responsibilities of `CDungeon`:

- **Party reference** — a dungeon is always associated with a `CParty`. When the party disbands or all members leave, the dungeon is destroyed.
- **Map instance lifecycle** — `CDungeon::Create()` calls `SECTREE_MANAGER::CreateDungeonMap()` to clone the geometry of a template map into a new dynamic map index. The new map is pre-populated with sectrees and attribute data copied from the template.
- **Monster management** — `CDungeon` tracks all monsters spawned within the instance. Custom wave scripting (via `questlua_dungeon.cpp`) can call `dungeon.spawn_mob()` or `dungeon.spawn_group()` to populate the instance at runtime.
- **Event/stage management** — the dungeon exposes a stage counter and arbitrary flag storage (key/value pairs in a Lua table) used by quest scripts to track door states, boss kills, timer countdowns, etc.
- **Timeout and cleanup** — a dungeon expiry timer (`timeout_sec`) evicts all players and destroys the instance if they exceed the time limit.

### DragonLair

`DragonLair.h` / `DragonLair.cpp` implement a specialised dungeon variant for the Blue Dragon boss encounter. It follows the same CDungeon pattern but adds multi-stage wave logic and special map-wide effects that are scripted in `questlua_dragonlair.cpp`.

### DungeonBlock (Client)

On the client, dungeon-specific architectural pieces (walls, doors, pillars) that do not appear in ordinary outdoor maps are rendered via `CDungeonBlock` (`DungeonBlock.h` / `DungeonBlock.cpp`). These are loaded from `.dbl` property files referenced in the area's `objects.amd`.

### Lua Quest Interface

`questlua_dungeon.cpp` registers the `dungeon.*` Lua namespace. Key functions:

```lua
dungeon.create(template_map_index)     -- instantiate a dungeon copy
dungeon.set_stage(n)                   -- advance the dungeon stage
dungeon.spawn_mob(vnum, x, y)          -- spawn a single monster
dungeon.spawn_group(group_vnum, x, y)  -- spawn a mob group
dungeon.jump_to_exit()                 -- teleport all members to exit warp
dungeon.set_timeout(seconds)           -- configure instance expiry
```

---

## 6. Warp & Portal System

### Concepts

| Term | Meaning |
|---|---|
| **Warp** | A server-initiated teleport. The server sends `GC_WARP` to the client, which triggers map reload. Used for dungeon entry/exit, quest teleports, GM commands. |
| **Portal** | An in-world interactive trigger. The player walks over or interacts with a portal NPC/object, the server validates the condition and fires a warp. |

### Server-Side Warp Flow

1. A warp is triggered by quest script (`pc.warp(x, y)`), a portal collision event, or a GM command.
2. The server calls `CHARACTER::WarpSet(x, y, map_index)`.
3. `WarpSet` looks up `map_index` in the **map location table** (`map_location.cpp`). If the target map is on the same game server, the character is directly repositioned: the character is removed from its current `SECTREE`, moved to the new coordinates, and inserted into the destination `SECTREE`. If the target map is on a **different game server**, `WarpSet` stores the destination and sends a `GC_PHASE` (phase change) packet that routes the client through the login server to the correct game server, embedding the target coordinates.
4. The server sends `GC_WARP` to the client with the destination x, y, and map name.

### Portal NPC/Object Trigger

Static portal warp entries are registered at map load from the map's `warp.txt` file (or equivalent). Each entry specifies:

- Source position and radius (trigger zone)
- Destination map index and position
- Optional condition flag (e.g. minimum level, quest state)

The `SECTREE` collision system detects when a player's position falls within a portal trigger zone each movement event and fires the warp automatically.

### Cross-Server Warping

When the destination game server differs from the current one:

1. The current game server sends `CG_PONG` / handshake data to the login/channel server, forwarding the player's session.
2. The client receives `GC_PHASE` with `PHASE_HANDSHAKE` pointing to the new game server's IP and port.
3. The client disconnects and reconnects to the new game server.
4. On successful reconnect and authentication, the new game server positions the character at the target coordinates.

---

## 7. Client Map Rendering

### Layer Architecture

```
PythonBackground (Python C module)
        |
   CMapManager          -- selects and owns the active CMapOutdoor
        |
   CMapOutdoor          -- top-level outdoor map object
    /   |   \
Area  Area  Area ...    -- streaming sub-regions of the map
  |
  +-- CAreaTerrain      -- terrain mesh, height data, texture splatting
  +-- Static Objects    -- trees, rocks, buildings (CProperty / CPropertyManager)
  +-- Water             -- animated water planes (MapOutdoorWater.cpp)
  +-- Effects           -- area-attached effects (EffectLib)
```

### CMapOutdoor

`CMapOutdoor` (`MapOutdoor.h` / `MapOutdoor.cpp`) is the central client-side map object. Its responsibilities are divided across several split files:

| File | Responsibility |
|---|---|
| `MapOutdoorLoad.cpp` | Parse `Setting.msm`, instantiate `CArea` grid, kick off async area loads |
| `MapOutdoorUpdate.cpp` | Per-frame update: determine which areas need loading/unloading based on camera position |
| `MapOutdoorRender.cpp` | Main render dispatcher — calls terrain, object, water, and shadow render |
| `MapOutdoorRenderHTP.cpp` | Height-texture-projected (HTP) terrain rendering path |
| `MapOutdoorRenderSTP.cpp` | Splatmap-texture-projected (STP) terrain rendering path |
| `MapOutdoorIndexBuffer.cpp` | Build and manage shared terrain index buffers for the LOD quadtree |
| `MapOutdoorQuadtree.cpp` | Terrain quadtree for LOD selection |
| `MapOutdoorCharacterShadow.cpp` | Render blob shadows under characters onto the terrain |
| `MapOutdoorWater.cpp` | Animated water surface rendering |

### PRTerrainLib

`PRTerrainLib` (`client-src/src/PRTerrainLib/`) is a small, self-contained library responsible for the **raw terrain data format**:

| File | Role |
|---|---|
| `Terrain.h` / `Terrain.cpp` | Loads and exposes the raw height-map and attribute grid from disk |
| `TextureSet.h` / `TextureSet.cpp` | Manages the per-map texture set (up to 8 blend layers) used for terrain splatting |
| `TerrainType.h` | Type definitions and constants (tile size, patch size, etc.) |

`CMapOutdoor` / `CAreaTerrain` consume `PRTerrainLib` types to build Direct3D geometry.

### Area Streaming

The map is divided into a grid of **areas** (typically 16 × 16 tiles each, but configurable per map in `Setting.msm`). `CAreaLoaderThread` (`AreaLoaderThread.h` / `AreaLoaderThread.cpp`) runs as a background thread and loads area data from disk asynchronously. The main thread checks for completed loads each frame and promotes finished areas into the render list. Areas that fall outside a configurable streaming radius are evicted and their GPU resources released.

### Terrain LOD

`CTerrainQuadtree` (`TerrainQuadtree.h` / `TerrainQuadtree.cpp`) implements a quadtree LOD for terrain patches. Each terrain patch (`CTerrainPatch`) selects one of several pre-baked index buffer permutations based on camera distance and the LOD levels of neighbouring patches (to avoid T-junction cracks). The shared index buffers are managed by `MapOutdoorIndexBuffer.cpp`.

### Static Objects and Properties

Scene objects (rocks, trees, buildings, ambient deco) are described in `.epk`/`.eix` or `.amd` files. `CPropertyManager` (`PropertyManager.h`) loads and caches property descriptors. At runtime, each placed instance is a lightweight reference into the property cache — avoiding duplicated geometry data for repeated assets.

---

## 8. Minimap

### Overview

The minimap system has two layers:

1. **C++ backend** — `CPythonMiniMap` (`PythonMiniMap.h` / `PythonMiniMap.cpp`) manages the minimap texture, viewport, and entity icon rendering.
2. **Python frontend** — `uiminimap.py` (`client-bin/assets/root/`) constructs the visible minimap window, handles zoom controls, and overlays quest markers and party member icons.

### CPythonMiniMap

`CPythonMiniMap` is a Python-exposed C++ module (registered in `PythonMiniMapModule.cpp`). It:

- Loads the per-map minimap image from `minimap/<map_name>/minimap.dds` (or equivalent) on map transition.
- Maintains the minimap viewport rectangle relative to the player's world position.
- Provides functions to `uiminimap.py` for converting world coordinates to minimap pixel coordinates and vice versa.
- Draws icons for nearby entities (monsters, NPCs, party members, guild marks) at their minimap positions using Direct3D sprite blits within the Python render callback.

The Python module exposes functions such as:

```python
minimap.SetMiniMapSize(width, height)
minimap.WorldPositionToMiniMapPosition(x, y)  # -> (mx, my)
minimap.AddSignal(x, y, filename)             # overlay marker
minimap.Update()                              # called every frame
```

### uiminimap.py

`uiminimap.py` is the UI script that:

- Creates the minimap window widget and attaches it to the HUD.
- Calls `minimap.Update()` each frame.
- Handles zoom in/out input and computes the displayed area.
- Overlays party member position dots by querying `player.GetMainCharacterPosition()` and party member positions from the game module.
- Integrates with `uimapnameshower.py` to display the current map name banner when transitioning.

### Map Name Banner

`uimapnameshower.py` displays the animated zone-name notification (the sliding banner at the top of the screen) when the player enters a new map region. It is triggered from the background module's area change callback.

---

## 9. Network Packets

All packet definitions live in `server-src/src/common/packet_headers.h` and the game-level `packet_structs.h`. The game server packet writer is in `packet_writer.h`.

### Key Map-Related Packets (Server → Client)

| Packet | Header | Direction | Description |
|---|---|---|---|
| `GC_WARP` | `HEADER_GC_WARP` | S → C | Teleport the client to new coordinates and/or map. Contains target x, y, and map name string. |
| `GC_CHARACTER_ADD` | `HEADER_GC_CHARACTER_ADD` | S → C | Inform the client that a new entity has entered view range. Contains vid, race, position, motion. |
| `GC_CHARACTER_DEL` | `HEADER_GC_CHARACTER_DEL` | S → C | Inform the client that an entity has left view range. Contains vid only. |
| `GC_MOVE` | `HEADER_GC_MOVE` | S → C | Broadcast a character's movement to other players in view. Contains vid, func (move type), dir, x, y, time. |
| `GC_ENTITY_VIEW` | `HEADER_GC_ENTITY_VIEW` | S → C | Sent when the player enters the game or after warp — provides a snapshot of all entities currently in view. |
| `GC_PHASE` | `HEADER_GC_PHASE` | S → C | Change game phase (e.g. to `PHASE_HANDSHAKE` for cross-server redirect). |
| `GC_MAP_SIGNAL` | `HEADER_GC_MAP_SIGNAL` | S → C | Adds or removes an entity signal dot on the minimap (quest markers, boss indicators). |

### Key Map-Related Packets (Client → Server)

| Packet | Header | Direction | Description |
|---|---|---|---|
| `CG_CHARACTER_MOVE` | `HEADER_CG_CHARACTER_MOVE` | C → S | Player movement event. Contains func, dir, x, y, time. The server validates position and updates the character's sectree. |
| `CG_INTERACT` | `HEADER_CG_INTERACT` | C → S | Player interaction with a portal NPC or warp trigger. Server checks conditions and issues `GC_WARP` if valid. |

### Packet Flow for a Warp

```
[Client]                          [Game Server]
   |                                    |
   |-- CG_CHARACTER_MOVE (near portal)->|
   |                              (detect portal collision)
   |                              (validate conditions)
   |<-- GC_WARP (x, y, map_name) --------|
   |                                    |
   (fade out, load new map)
   |-- reconnect if cross-server ------>|
   |<-- GC_ENTITY_VIEW (snapshot) ------|
   (fade in at destination)
```

---

## 10. Key Files

### Server (`server-src/src/`)

| File | Repo Path | Role |
|---|---|---|
| `sectree.h` / `sectree.cpp` | `server-src/src/game/` | Single SECTREE cell — holds entity set, attribute grid |
| `sectree_manager.h` / `sectree_manager.cpp` | `server-src/src/game/` | Singleton owning all maps; map load, sectree lookup, view update |
| `map_location.h` / `map_location.cpp` | `server-src/src/game/` | Inter-server map index → IP:port routing table |
| `dungeon.h` / `dungeon.cpp` | `server-src/src/game/` | CDungeon — instanced dungeon lifecycle management |
| `DragonLair.h` / `DragonLair.cpp` | `server-src/src/game/` | Specialised Dragon Lair dungeon variant |
| `regen.h` / `regen.cpp` | `server-src/src/game/` | Spawn table loading and respawn event scheduling |
| `mob_manager.h` / `mob_manager.cpp` | `server-src/src/game/` | CMobManager — monster proto lookup, SpawnMob |
| `entity.h` / `entity.cpp` | `server-src/src/game/` | CEntity base — sectree membership, view-list management |
| `entity_view.cpp` | `server-src/src/game/` | View-distance delta computation and packet dispatch |
| `building.h` / `building.cpp` | `server-src/src/game/` | Static building objects within maps |
| `char.h` / `char.cpp` | `server-src/src/game/` | CHARACTER class — movement, warp, position update |
| `input_main.cpp` | `server-src/src/game/` | Main game-phase packet handler — processes CG_CHARACTER_MOVE |
| `questlua_dungeon.cpp` | `server-src/src/game/` | Lua `dungeon.*` API |
| `questlua_dragonlair.cpp` | `server-src/src/game/` | Lua `dragonlair.*` API |
| `packet_structs.h` | `server-src/src/game/` | Packet struct definitions |
| `packet_headers.h` | `server-src/src/common/` | Packet opcode constants |

### Client (`client-src/src/`)

| File | Repo Path | Role |
|---|---|---|
| `MapManager.h` / `MapManager.cpp` | `GameLib/` | Top-level client map manager — selects active CMapOutdoor |
| `MapBase.h` / `MapBase.cpp` | `GameLib/` | Abstract map base class |
| `MapOutdoor.h` / `MapOutdoor.cpp` | `GameLib/` | Outdoor map root — owns Area grid |
| `MapOutdoorLoad.cpp` | `GameLib/` | Map file parsing and area instantiation |
| `MapOutdoorRender.cpp` | `GameLib/` | Frame render dispatcher |
| `MapOutdoorRenderHTP.cpp` | `GameLib/` | HTP terrain render path |
| `MapOutdoorRenderSTP.cpp` | `GameLib/` | STP splatmap terrain render path |
| `MapOutdoorQuadtree.cpp` | `GameLib/` | Terrain quadtree LOD |
| `MapOutdoorIndexBuffer.cpp` | `GameLib/` | Shared terrain index buffer management |
| `MapOutdoorUpdate.cpp` | `GameLib/` | Per-frame area streaming update |
| `MapOutdoorWater.cpp` | `GameLib/` | Water surface rendering |
| `MapOutdoorCharacterShadow.cpp` | `GameLib/` | Character blob shadow projection |
| `Area.h` / `Area.cpp` | `GameLib/` | CArea — one streaming tile of the map |
| `AreaTerrain.h` / `AreaTerrain.cpp` | `GameLib/` | Terrain height/attribute data for an area |
| `AreaLoaderThread.h` / `AreaLoaderThread.cpp` | `GameLib/` | Background thread for async area loading |
| `TerrainPatch.h` / `TerrainPatch.cpp` | `GameLib/` | Single terrain render patch |
| `TerrainQuadtree.h` / `TerrainQuadtree.cpp` | `GameLib/` | Quadtree LOD for terrain patches |
| `TerrainDecal.h` / `TerrainDecal.cpp` | `GameLib/` | Terrain decals (footprints, spell marks) |
| `DungeonBlock.h` / `DungeonBlock.cpp` | `GameLib/` | Client dungeon block geometry loader |
| `Terrain.h` / `Terrain.cpp` | `PRTerrainLib/` | Raw terrain height-map and attribute loader |
| `TextureSet.h` / `TextureSet.cpp` | `PRTerrainLib/` | Terrain texture set / splatmap management |
| `TerrainType.h` | `PRTerrainLib/` | Terrain constants (tile size, patch dimensions) |
| `PythonMiniMap.h` / `PythonMiniMap.cpp` | `UserInterface/` | C++ minimap backend — texture, icon rendering |
| `PythonMiniMapModule.cpp` | `UserInterface/` | Python module registration for minimap |
| `PythonBackground.h` / `PythonBackground.cpp` | `UserInterface/` | Python-accessible background/map module |
| `PythonBackgroundModule.cpp` | `UserInterface/` | Python module registration for background |
| `PythonNetworkStreamPhaseGame.cpp` | `UserInterface/` | Game-phase packet dispatch (GC_WARP, GC_CHARACTER_ADD, etc.) |

### Client Scripts (`client-bin/assets/root/`)

| File | Role |
|---|---|
| `uiminimap.py` | Minimap window, zoom, quest/party markers |
| `uimapnameshower.py` | Map name banner animation on zone enter |
| `networkmodule.py` | Warp/phase-change event callbacks from C++ to Python |
| `game.py` | Main game loop script — ties background, minimap, and network modules together |
