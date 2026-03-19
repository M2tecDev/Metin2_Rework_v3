# GameLib

> Game logic library — the largest library in the client, covering character actors, combat, items, skills, the world map, flying objects, and all supporting game-data types.

## Overview

GameLib is the central game-logic library that sits between the rendering engine and the Python scripting layer. It handles everything specific to Metin2 gameplay: character actor simulation (movement, animation, combat, effects), the outdoor map system (terrain cells, areas, environment), item and skill data loading, and flying projectile objects. Because of its size, detailed documentation is split across sub-pages.

## Sub-pages

| Sub-page | Covers |
|----------|--------|
| [GameLib — Characters](client-src-GameLib-Characters.md) | `CActorInstance`, `CRaceData`, `CRaceManager`, `CRaceMotionData`, `WeaponTrace`, physics |
| [GameLib — Combat & Flying](client-src-GameLib-Combat.md) | `CFlyingManager`, `CFlyingInstance`, `CFlyingData`, `CFlyTarget`, `FlyTrace`, `FlyHandler` |
| [GameLib — Items](client-src-GameLib-Items.md) | `CItemData`, `CItemManager`, item types, apply types, wear positions |
| [GameLib — Map & World](client-src-GameLib-Map.md) | `CMapManager`, `CMapOutdoor`, `CArea`, `CMapBase`, environment, terrain, snow, decals |

## Dependencies

- `EterBase` — singleton, pool allocator, utilities
- `EterLib` — `CScreen`, `CGraphicObjectInstance`, resource manager, text file loader
- `EterGrnLib` — `CGraphicThing`, `CGraphicThingInstance`
- `EterPythonLib` — Python graphic for effects
- `PRTerrainLib` — terrain data and splatting
- `SpeedTreeLib` — tree forest rendering in `CMapOutdoor`
- `EffectLib` — visual effects on actors and the map
- `AudioLib` — sound playback triggered by motion events

## Files (summary)

| File | Sub-system |
|------|-----------|
| `ActorInstance*.h/.cpp` | Character actors |
| `RaceData.h/.cpp`, `RaceManager.h/.cpp`, `RaceMotionData.h/.cpp` | Race definitions and motion data |
| `ItemData.h/.cpp`, `ItemManager.h/.cpp` | Item data |
| `MapManager.h/.cpp`, `MapOutdoor*.h/.cpp`, `MapBase.h/.cpp` | World map |
| `Area.h/.cpp`, `AreaTerrain.h/.cpp`, `AreaLoaderThread.h/.cpp` | Area/chunk system |
| `FlyingObjectManager.h/.cpp`, `FlyingInstance.h/.cpp`, `FlyingData.h/.cpp` | Projectiles |
| `FlyTarget.h/.cpp`, `FlyTrace.h/.cpp`, `FlyHandler.h` | Fly targeting and trajectory |
| `GameType.h/.cpp` | Shared game enumerations and pixel-position types |
| `GameUtil.h/.cpp` | Game coordinate and angle utility functions |
| `PhysicsObject.h/.cpp` | Physics simulation base (gravity, collision) |
| `WeaponTrace.h/.cpp` | Sword/weapon trail rendering |
| `SnowEnvironment.h/.cpp`, `SnowParticle.h/.cpp` | Snow weather effect |
| `TerrainDecal.h/.cpp` | Ground decal rendering |
| `TerrainPatch.h/.cpp`, `TerrainQuadtree.h/.cpp` | Terrain LOD patch system |
| `Property.h/.cpp`, `PropertyLoader.h/.cpp`, `PropertyManager.h/.cpp` | World object property system |
| `DungeonBlock.h/.cpp` | Dungeon block placement helper |
| `MonsterAreaInfo.h/.cpp` | Monster spawn zone information |
| `MapType.h/.cpp`, `MapUtil.h/.cpp` | Map coordinate types and utilities |
| `GameEventManager.h/.cpp` | Client-side game event queue |
| `Interface.h` | `IBackground` abstract interface for map queries |
