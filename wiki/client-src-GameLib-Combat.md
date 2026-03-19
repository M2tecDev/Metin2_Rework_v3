# GameLib — Combat & Flying Objects

> Projectile system: flying object data definitions, trajectory tracking, targeting, and the manager that drives all in-flight instances.

[← Back to GameLib index](client-src-GameLib.md)

## Overview

The flying-object sub-system handles all projectiles in the game — arrows, magic bolts, firecrackers, and server-triggered indexed flies. Each projectile is an instance of `CFlyingInstance`, which follows a trajectory toward a `CFlyTarget`. The `CFlyingManager` singleton registers projectile type definitions from files, creates instances, and drives their per-frame update and render.

## Classes

### `CFlyingManager`
**File:** `FlyingObjectManager.h`
**Purpose:** Singleton managing all active flying-object instances and their data definitions. Creates new instances given a starting position and target, drives per-frame update/render, and provides server-indexed creation for network-triggered projectiles.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_kMap_pkFlyData` | `TFlyingDataMap` | CRC → flying-object data definitions |
| `m_kLst_pkFlyInst` | `TFlyingInstanceList` | All currently active instances |
| `m_kMap_dwIndexFlyData` | `TIndexFlyDataMap` | Server-assigned index → fly data |
| `m_pMapManager` | `CMapManager*` | Back-pointer to the map for collision/height queries |
| `m_IDCounter` | `DWORD` | Auto-incrementing instance ID counter |

#### Fly Types (`EIndexFlyType`)
| Value | Meaning |
|-------|---------|
| `INDEX_FLY_TYPE_NORMAL` | Standard projectile |
| `INDEX_FLY_TYPE_FIRE_CRACKER` | Firecracker explosion projectile |
| `INDEX_FLY_TYPE_AUTO_FIRE` | Automatically fired projectile |

#### Methods
| Method | Description |
|--------|-------------|
| `RegisterFlyingData(filename)` | Loads a fly-data definition; CRC becomes ID |
| `RegisterFlyingData(filename, crc)` | Same; also returns the CRC |
| `CreateFlyingInstanceFlyTarget(id, startPos, target, canAttack)` | Creates a new projectile instance |
| `Update()` | Advances all active instances along their trajectories |
| `Render()` | Renders all active instances |
| `RegisterIndexedFlyData(index, type, filename)` | Registers a server-indexed projectile type |
| `CreateIndexedFly(index, pStart, pEnd)` | Creates a server-triggered indexed projectile |
| `DeleteAllInstances()` | Removes all active instances |

---

### `CFlyingInstance`
**File:** `FlyingInstance.h`
**Purpose:** Represents a single in-flight projectile. Tracks position, velocity, and a `CFlyTarget` destination. Updates position along its trajectory each frame and triggers hit/expire callbacks when it reaches the target.

---

### `CFlyingData`
**File:** `FlyingData.h`
**Purpose:** Data definition for a projectile type loaded from a file. Specifies the visual model (Granny thing), effect, sound, and trajectory parameters (speed, arc height, etc.).

---

### `CFlyTarget`
**File:** `FlyTarget.h`
**Purpose:** Describes the destination of a flying object. Can target a position, a bone on an actor, or track a moving actor. Implements `IFlyTargetableObject` (which `CActorInstance` also implements) to support actor-following targets.

---

### `CFlyTrace`
**File:** `FlyTrace.h`
**Purpose:** Stores the historical trajectory of a projectile for rendering a motion trail (similar to `CWeaponTrace` but for projectiles). Records successive positions and renders a fading ribbon.

---

### `IFlyEventHandler`
**File:** `FlyHandler.h`
**Purpose:** Interface for receiving flying-object lifecycle events. Implemented by game-level code (e.g., the actor instance) to respond when a projectile hits its target.

---

### `GameType` pixel-position types
**File:** `GameType.h`
**Purpose:** Defines `TPixelPosition` (`D3DXVECTOR3`) and related game coordinate types used consistently across actors, map queries, and the flying system.
