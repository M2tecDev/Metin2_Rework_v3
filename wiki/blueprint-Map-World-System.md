# Blueprint: Map & World System

> Full-stack architecture blueprint for the map and world pipeline — SECTREE spatial partitioning, server attribute map, spawn/regen system, dungeon instancing, warp/portal flow, client terrain rendering, and minimap. Companion to [Map & World System](topic-Map-World-System).

---

## 1. Full-Stack Architecture

The world system spans from binary map attribute files on disk through the server's O(1) sector grid to the client's streamed terrain renderer.

### Layer 1 — Map Data Files (on-disk)

| File | Format | Role |
|------|--------|------|
| `<mapname>/setting.txt` | Text key-value | Map size (width × height in sectors), start position, map name string |
| `<mapname>/attr.atr` | Binary attribute grid | 16 × 16 tile attribute bytes per sector: passable, water, fire, safe-zone, PK-ban |
| `<mapname>/regen.txt` | Text | Spawn definitions: vnum, count, coordinates, regen cycle time |
| `<mapname>/group.txt` | Text | Named group spawn definitions (boss groups, linked mobs) |
| `server-src/src/game/` `map_config` or `map_index` config | Text | Assigns map index → server process ownership; lists which maps each game process loads |
| `client-bin/assets/data/map/<mapname>/` | Binary terrain, textures, height maps, effect scripts | Client-side map geometry: terrain tiles, texture sets, tree placement, height map, sky config |

### Layer 2 — Server Spatial System (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/sectree.h` / `sectree.cpp` | `SECTREE` | Single sector cell (3200 × 3200 units): entity set, 16 × 16 attribute grid, ForEachAround() broadcast |
| `server-src/src/game/sectree_manager.h` / `sectree_manager.cpp` | `SECTREE_MANAGER::LoadMap()`, `::Find(mapIndex, x, y)` | Singleton: owns all loaded `SECTREE_MAP`s; O(1) sector lookup by world coordinates |
| `server-src/src/game/sectree_manager.cpp` | `SECTREE_MANAGER::ForEachEntity()`, `::ForEachAround()` | Iterates the 3 × 3 sector neighbourhood; used for view-set update and broadcast |
| `server-src/src/game/entity.h` / `entity.cpp` | `CEntity::SetPosition()`, `::UpdateSectree()` | Base class for all world objects; updates SECTREE registration when position changes |
| `server-src/src/game/entity_view.cpp` | `CEntity::UpdateViewSet()` | Computes symmetric difference of old and new 3 × 3 neighbourhood; sends CHARACTER_ADD/DEL to entering/leaving DESC objects |
| `server-src/src/libgame/` | Attribute grid loader | Loads `.atr` binary files into per-SECTREE attribute byte arrays |
| `server-src/src/game/char_manager.cpp` | `CHARACTER_MANAGER::SpawnMob()`, `::SpawnGroup()` | Creates `CHARACTER` objects from `mob_proto` entries; registers in SECTREE |
| `server-src/src/game/regen.cpp` | `REGEN_MANAGER::LoadRegenFile()`, regen events | Parses `regen.txt`; schedules periodic respawn events via the pulse event system |
| `server-src/src/game/dungeon.h` / `dungeon.cpp` | `CDungeon`, `CDungeonManager` | Per-party instanced dungeon: creates copy of a template map index, manages lifecycle, destroys when party leaves |
| `server-src/src/game/warp.cpp` | `CHARACTER::WarpSet()`, portal trigger logic | Teleports a character to (x, y, mapIndex); sends `GC::WARP` to client |

### Layer 3 — Network

| Packet | Header | Direction | Payload Summary |
|--------|--------|-----------|----------------|
| `GC::CHARACTER_ADD` | `0x0205` | Server→Client | Actor entered view range: VID, type, x, y, raceNum, speed, name |
| `GC::CHARACTER_DEL` | `0x0208` | Server→Client | Actor left view range: VID |
| `GC::MOVE` | `0x0302` | Server→Client | Actor position update: VID, func, rot, x, y, time |
| `GC::WARP` | `0x0306` | Server→Client | Teleport: destination x, y, server addr, port |
| `GC::LAND_LIST` | `0x0B12` | Server→Client | Building/land ownership data for the map |
| `GC::DUNGEON` | `0x0B11` | Server→Client | Dungeon state update: sub-header (time_attack_start, destination_position) |
| `GC::TIME` | `0x0B13` | Server→Client | Server-time broadcast (Unix timestamp; used for day/night cycle) |
| `GC::NPC_POSITION` | `0x0A50` | Server→Client | NPC positions for minimap markers |
| `CG::WARP` | `0x0305` | Client→Server | Warp request: lX, lY, lMapIndex (GM command or portal) |
| `CG::DUNGEON` | `0x0B02` | Client→Server | Dungeon action request |

### Layer 4 — Client Rendering (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/GameLib/MapManager.h` / `MapManager.cpp` | `CMapManager::LoadMap()`, `::Update()` | Loads map data files; drives terrain, background, object streaming |
| `client-src/src/PRTerrainLib/` | `CTerrainPatch`, `CTerrain` | Terrain mesh generation, LOD, texture splatting from tile data |
| `client-src/src/PRTerrainLib/TerrainQuadTree.h` | `CTerrainQuadTree` | Quad-tree spatial structure for terrain patch culling and LOD selection |
| `client-src/src/GameLib/MapOutdoor.h` / `MapOutdoor.cpp` | `CMapOutdoor::Render()` | Renders outdoor terrain tiles, height map, sky, water |
| `client-src/src/GameLib/MapIndoor.h` | `CMapIndoor` | Renders indoor dungeon/building interiors |
| `client-src/src/GameLib/MapObject.h` | `CMapObject` | Static world objects (rocks, trees, signs); placed from map object files |
| `client-src/src/SpeedTreeLib/` | `CSpeedTreeForest` | Tree and vegetation rendering using SpeedTree |
| `client-src/src/EffectLib/` | `CEffectManager` | Ambient effects attached to map objects (fire pits, light sources) |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvWarpPacket()`, `RecvCharacterAddPacket()`, `RecvCharacterDelPacket()` | Handle map-related GC packets; trigger map load/unload |

### Layer 5 — Python UI (Minimap)

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/uiminimap.py` | `MiniMap` | Minimap widget: renders atlas texture, player arrow, NPC markers, party positions |
| `client-src/src/UserInterface/PythonMiniMapModule.cpp` | `miniMap.Update()`, `miniMap.Render()`, `miniMap.AddArrow()` | C extension backing the `miniMap` Python module |
| `client-bin/assets/root/gameevent.py` | `OnWarp()` | Triggered by `GC::WARP`; causes the client to reload the map and reinitialise the minimap |

---

## 2. Causal Chain

### Chain A: Player moves into a new SECTREE sector

```
[Trigger]  Player's movement update crosses a 3200-unit sector boundary
    │
    ▼  (game/input_main.cpp : CInputMain::Move)
[1] ch->Move(x, y) called with the new position
    │
    ▼  (game/entity.cpp : CEntity::SetPosition)
[2] old_sectree = m_pkSectree
    new_sectree = SECTREE_MANAGER::Find(mapIndex, newX, newY)
    if old_sectree != new_sectree:
      old_sectree->RemoveEntity(ch)
      new_sectree->AddEntity(ch)
      ch->UpdateViewSet()
    │
    ▼  (game/entity_view.cpp : CEntity::UpdateViewSet)
[3] old_neighbours = 3×3 sectors around old_sectree
    new_neighbours = 3×3 sectors around new_sectree
    entered = new_neighbours − old_neighbours
    left    = old_neighbours − new_neighbours
    │
    ▼  For each entity in sectors that entered view:
    Sends GC::CHARACTER_ADD to ch's DESC (entity becomes visible to player)
    Sends GC::CHARACTER_ADD to entity's DESC (player becomes visible to entity)
    │
    ▼  For each entity in sectors that left view:
    Sends GC::CHARACTER_DEL to ch's DESC (entity disappears)
    Sends GC::CHARACTER_DEL to entity's DESC (player disappears)
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvCharacterAddPacket)
[4] CNetworkActorManager::AppendActor() → new CInstanceBase in scene
    ▼  RecvCharacterDelPacket() → CNetworkActorManager::RemoveActor(VID)
    │
    ▼  [End] Client shows newly visible actors; removes out-of-range actors
```

### Chain B: Server warps player to a dungeon

```
[Trigger]  Player clicks a dungeon portal NPC or GM uses warp command
    │
    ▼  (game/warp.cpp : CHARACTER::WarpSet(mapIndex, x, y))
[1] If target map is instanced: CDungeonManager::CreateDungeon(party) → allocates new map index ≥ 300
    │
    ▼  Teleport within same process:
[2] ch->Hide()     → CHARACTER removed from current SECTREE
    ch->SetMap(newMapIndex)
    ch->Show(x, y) → CHARACTER inserted into new map's SECTREE at (x, y)
    │
    ▼  Warp to different process (cross-server):
[3] Game sends GG::WARP_CHARACTER to peer game server
    Peer receives player and calls Show() there
    │
    ▼  packet: GC::WARP (0x0306)
    payload: x, y, server_ip, port
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvWarpPacket)
[4] Stores destination; closes current map's actors
    Connects new TCP socket to server_ip:port (if cross-server)
    Re-runs loading-phase sequence
    │
    ▼  (GameLib/MapManager.cpp : CMapManager::LoadMap(newMapIndex))
[5] Loads terrain files, textures, objects for new map
    CMapOutdoor::Render() begins rendering new terrain
    │
    ▼  gameevent.py : OnWarp() → MiniMap.LoadAtlas(newMapIndex)
[6] Minimap atlas image loaded; player arrow placed at new position
    │
    ▼  [End] Player is in new map; dungeon instance running; minimap updated
```

### Chain C: Regen cycle fires — monster spawns

```
[Trigger]  Server pulse fires regen event (e.g. every 300 seconds)
    │
    ▼  (game/regen.cpp : regen event fires)
[1] Reads regen entry: vnum=101, count=5, x=12000, y=8000, radius=500
    │
    ▼  (game/char_manager.cpp : CHARACTER_MANAGER::SpawnMob(vnum, mapIndex, x, y))
[2] Allocates new CHARACTER object; assigns unique VID
    Loads TMonsterTable from mob_proto cache
    Calls ch->Show(mapIndex, x + rand(-radius, +radius), y + rand(-radius, +radius))
    │
    ▼  (game/char.cpp : CHARACTER::Show → SECTREE insertion)
[3] CHARACTER inserted into SECTREE at spawn position
    SECTREE::ForEachAround() sends GC::CHARACTER_ADD to all DESC in view range
    │
    ▼  All nearby clients receive GC::CHARACTER_ADD
[4] CNetworkActorManager::AppendActor() → monster appears on screen
    AI FSM enters STATE_IDLE; begins wander/aggro logic
    │
    ▼  [End] Monster visible in the world; begins normal AI behaviour
```

---

## 3. Dependency Matrix

### Sync Points

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `SECTREE_SIZE = 3200` (sector cell size in world units) | `game/sectree.h` define | `GameLib/MapManager.cpp` (client tile size factor) | Server sector boundaries misalign with client tile grid; safe-zone checks fire in wrong areas |
| Map coordinate scale: 1 unit = 1 cm; client divides by 100 for world-space metres | `game/char.cpp` (server stores lX, lY as int cm) | `GameLib/MapOutdoor.cpp` (client divides by 100) | Actors render at ×100 or ÷100 wrong scale; character model appears at wrong position |
| Map index assignment (which process owns which map index) | Server `map_index` config file | `root/serverinfo.py` channel-to-map routing | Cross-server warp sends player to wrong process; player ends up on wrong channel |
| `GC::WARP` payload layout (x:4, y:4, addr:4 or string, port:2) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client reads wrong destination coordinates; appears at (0,0) after warp |
| `GC::CHARACTER_ADD` bType values (PLAYER=1, NPC=2, MONSTER=3) | `game/packet_structs.h` (`CHAR_TYPE_*`) | `UserInterface/PythonNetworkStreamPhaseGame.cpp` (AppendActor type switch) | Wrong model or behaviour class created for actor; NPC displayed with monster AI |
| `.atr` attribute file cell size (200 × 200 units per attribute byte) | `libgame/` attribute loader | (client uses same attr files from data directory) | Passability check fires in wrong cell; characters walk through walls |
| Sector key encoding `(y_idx << 16) | x_idx` | `game/sectree_manager.cpp` | (client doesn't compute sector keys — server-only) | Sector lookup returns wrong SECTREE; entities never broadcast to each other |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| `SECTREE_SIZE` | 3200 units | `game/sectree.h` | Changing this requires re-exporting all `.atr` attribute files; sector key encoding changes; all server/client must be recompiled |
| Sector key 16-bit field | Max 65535 sectors per dimension | `game/sectree_manager.h` (key encoding) | A map wider than `65535 × 3200 = ~209 million units` (~2000 km) overflows the sector key |
| Map index range (static ≤ 299) | 1–299 static, 300+ dynamic | Convention / `dungeon.cpp` allocation start | Dynamic dungeon allocation starting at 300 collides if static maps use indices ≥ 300 |
| `GC::NPC_POSITION` NPC count per packet | `uint16_t` count field | `game/packet_structs.h` | Very large numbers of NPCs on a map (> ~32768 entries) would overflow the count |
| `DG::MAP_LOCATIONS` packet | sent once on `DG::BOOT` | `game/input.h` | Map location table is fixed at boot; re-routing requires server restart |
| View range | ~5000–6000 units | `game/sectree.h` / `entity_view.cpp` | Increasing view range dramatically increases `GC::CHARACTER_ADD` / `GC::MOVE` broadcast volume per tick |
| Attribute byte bits | 8 bits per 200×200 cell | `libgame/` attribute loader | Only 8 distinct attribute flags per cell; adding a 9th requires changing `.atr` format and all tools that export it |

---

## 4. Extension How-To

### How to add a new map attribute flag (e.g. "lava zone")

1. **`server-src/src/libgame/`** — Add a new bit constant to the attribute flags enum:
   ```cpp
   ATTR_LAVA = (1 << 7),   // was the last unused bit
   ```
2. **Map export tool** — Set the `ATTR_LAVA` bit in the relevant `.atr` cells for the lava area.
3. **`server-src/src/game/char.cpp`** — In the server tick loop or in `CHARACTER::Move()`, check:
   ```cpp
   if (pSectree->IsAttr(ch->GetX(), ch->GetY(), ATTR_LAVA))
       ch->AddAffect(AFFECT_LAVA_BURN, APPLY_HP_REGEN, -50, 0, 3);
   ```
4. No client-side changes needed unless a visual effect is desired — the client uses the same `.atr` data for rendering only (shadows, footstep sounds, etc.).

### How to create a new instanced dungeon

1. **Build the dungeon map** — Assign it a static template map index (e.g. 250).
2. **`server-src/src/game/dungeon.h`** — Define the dungeon's wave/boss event sequence in a new `CDungeon` subclass.
3. **`server-src/src/game/dungeon.cpp`** — Register the dungeon:
   ```cpp
   CDungeonManager::instance().RegisterDungeon(templateMapIndex=250, MyDungeonFactory);
   ```
4. **`regen.txt` for the template map** — Define monster spawn entries. These are applied to the instanced copy.
5. **Portal NPC quest script** — Trigger `pc.warp(x, y)` to the dynamic instance, or call `pc.dungeon_enter(templateMapIndex)` if such a quest API exists.
6. **Destruction** — `CDungeon::Destroy()` is called when the last player leaves; dynamic map index is recycled.

### How to add a new portal (warp between fixed points)

1. **`server-src/src/game/regen.txt` or warp config** — Add a warp entry: `TYPE_WARP vnum x y target_mapindex target_x target_y`.
2. **`server-src/src/game/char_manager.cpp`** — `SpawnMob` handles `CHAR_TYPE_WARP` characters; they trigger `CHARACTER::WarpSet()` when a player enters their collision radius.
3. **`server-src/src/game/warp.cpp`** — Ensure the target map index is loaded on the target process.
4. **`client-bin/assets/data/map/<mapname>/`** — Add the portal visual effect object at the correct coordinates.

### Controlling Constants

| Constant | File | Controls |
|----------|------|---------|
| `SECTREE_SIZE` | `game/sectree.h` | Sector cell size (3200 units); affects key encoding and all proximity queries |
| `VIEW_RANGE` | `game/entity_view.cpp` or `sectree.h` define | Character view radius for `GC::CHARACTER_ADD` / `GC::CHARACTER_DEL` broadcasting |
| `ATTR_*` flags | `libgame/` attribute loader header | Passability, safe-zone, PK-ban, water, fire attribute bits |
| Dungeon index start (≥ 300) | `game/dungeon.cpp` | Dynamic map index allocation floor |
| `SPAWN_RADIUS_DEFAULT` | `game/regen.cpp` | Default scatter radius for mob spawn positions |
| `RESPAWN_CYCLE_DEFAULT` | `game/regen.cpp` | Default respawn timer for killed mobs |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| Monsters never respawn after being killed | Regen event not scheduled; `regen.txt` parse error | `game/regen.cpp` : `LoadRegenFile()` — check `sys_err` for parse errors; verify regen time > 0 |
| Players can walk through walls | `.atr` attribute file missing `ATTR_BLOCK` cells; attribute file not loaded | `game/sectree_manager.cpp` : `LoadMap()` — confirm `attr.atr` is loaded; check `sys_log` for "load attribute failed" |
| Actor positions desynchronised (jitter or teleporting) | `GC::MOVE` broadcast delay; sector key lookup returning wrong sector | `game/sectree_manager.cpp` : `Find(mapIndex, x, y)` — add debug print of sector key; verify no off-by-one in coordinate division |
| Cross-server warp fails (player disconnected) | Target map index not owned by the target game process; peer not connected via GG | `game/p2p.cpp` : `P2PManager::FindByMapIndex()` — verify DG::MAP_LOCATIONS table lists the target index on the correct peer |
| Dungeon instance never created | `CDungeonManager` not registered for the template map index | `game/dungeon.cpp` : `CDungeonManager::RegisterDungeon()` — confirm registration; check `sys_err` for "dungeon: no factory for mapIndex X" |
| Minimap shows wrong position after warp | `GC::WARP` coordinates not received or atlas not reloaded | `root/gameevent.py` : `OnWarp()` — confirm `MiniMap.LoadAtlas()` is called with the new map index |
| `sys_log: SECTREE_MANAGER: cannot find map X` | Map data files not in the expected path; `map_index` config not listing this map | `game/sectree_manager.cpp` : `LoadMap(X)` — check `setting.txt` exists in the map data directory |
| New map shows solid black on client minimap | Atlas image missing in `client-bin/assets/ui/map/` directory | Check for `<mapname>.sub` or equivalent atlas file; pack it into the correct `.pck` archive |
| Safe zone attribute check not working | `ATTR_BANPK` bit position changed in server but `.atr` files still use old bit | Compare `libgame/` attribute flag definition with the map export tool's attribute encoding |

---

## Related

- **Topic page:** [Map & World System](topic-Map-World-System) — complete spawn system, dungeon lifecycle, terrain rendering, minimap details
- **Blueprint:** [blueprint-Character-System](blueprint-Character-System) — `CHARACTER::Show()`, SECTREE insertion, `UpdateViewSet()`
- **Blueprint:** [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) — `GC::CHARACTER_ADD`, `GC::WARP`, `GC::MOVE` wire format
- **Blueprint:** [blueprint-Quest-System](blueprint-Quest-System) — `npc.spawn()`, `pc.warp()` quest API calls that trigger map actions
