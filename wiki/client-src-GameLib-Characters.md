# GameLib — Characters

> Character actor simulation: movement, skeletal animation, combat motions, race data, and physics.

[← Back to GameLib index](client-src-GameLib.md)

## Overview

The character sub-system centers on `CActorInstance`, which represents every living entity in the world (PCs, NPCs, monsters, and even environmental objects like doors). Each actor has a race (loaded from `CRaceData`), a set of motion data entries (`CRaceMotionData`), and at any given time is playing one or more animations via the Granny2 thing-instance system. Physics simulation (`CPhysicsObject`) handles gravity and ground-following. Weapon traces (`CWeaponTrace`) render sword-slash trails.

## Classes

### `CActorInstance`
**File:** `ActorInstance.h`
**Purpose:** The central runtime entity class. Extends `IActorInstance` (interface) and `IFlyTargetableObject`. Manages position, rotation, motion playback, combat, effects attachment, sound events, and synchronization with the server.

#### Actor Types (`EType`)
| Value | Meaning |
|-------|---------|
| `TYPE_ENEMY` | Monster/enemy NPC |
| `TYPE_NPC` | Friendly NPC |
| `TYPE_STONE` | Resource stone |
| `TYPE_WARP` | Warp portal |
| `TYPE_DOOR` | Door object |
| `TYPE_BUILDING` | Building/structure |
| `TYPE_PC` | Player character |
| `TYPE_POLY` | Polymorphed character |
| `TYPE_HORSE` | Mount |
| `TYPE_GOTO` | Navigation marker |

#### Render Modes (`ERenderMode`)
| Value | Meaning |
|-------|---------|
| `RENDER_MODE_NORMAL` | Standard opaque rendering |
| `RENDER_MODE_BLEND` | Alpha blended (semi-transparent) |
| `RENDER_MODE_ADD` | Additive blending |
| `RENDER_MODE_MODULATE` | Modulate blending |

#### Motion Queue (`TReservingMotionNode`)
Each queued motion carries: `iMotionType` (once/loop), `fStartTime`, `fBlendTime`, `fDuration`, `fSpeedRatio`, `dwMotionKey`.

#### Key Event Callbacks (`IEventHandler`)
Subclasses implement `IEventHandler` to receive game-logic notifications:

| Callback | Description |
|----------|-------------|
| `OnSyncing` | Actor receiving position synchronization from server |
| `OnMoving` | Actor started moving |
| `OnStop` | Actor stopped moving |
| `OnAttack` | Actor performed an attack motion |
| `OnUseSkill` | Actor used a skill |
| `OnHit` | Actor hit a target |
| `OnSetAffect` / `OnResetAffect` | Buff/debuff applied or removed |
| `OnChangeShape` | Actor's appearance changed (polymorph, costume) |

#### Source file breakdown
| File | Contents |
|------|----------|
| `ActorInstance.cpp` | Core setup, initialization, destroy |
| `ActorInstanceAttach.cpp` | Equipment/effect attachment to bones |
| `ActorInstanceBattle.cpp` | Combat hit processing, damage display |
| `ActorInstanceBlend.cpp` | Color and alpha blending effects |
| `ActorInstanceCollisionDetection.cpp` | Collision between actors |
| `ActorInstanceData.cpp` | Data loading (race/motion binding) |
| `ActorInstanceEvent.cpp` | Motion event processing (sounds, effects) |
| `ActorInstanceFly.cpp` | Flying projectile integration |
| `ActorInstanceMotion.cpp` | Motion state machine |
| `ActorInstanceMotionEvent.cpp` | Keyframe events during motion playback |
| `ActorInstancePosition.cpp` | Position update and terrain following |
| `ActorInstanceRender.cpp` | Rendering dispatch |
| `ActorInstanceRotation.cpp` | Rotation interpolation |
| `ActorInstanceSync.cpp` | Server synchronization handling |
| `ActorInstanceWeaponTrace.cpp` | Weapon trail effect update |

---

### `CRaceData`
**File:** `RaceData.h`
**Purpose:** Defines a "race" (character type). Stores the Granny model files for each body part, the motion data map (motion mode → motion vector), combo data, and collision/attachment information.

#### Body Parts (`EParts`)
| Part | Index |
|------|-------|
| `PART_MAIN` | 0 — body |
| `PART_WEAPON` | 1 — right-hand weapon |
| `PART_HEAD` | 2 — head attachment |
| `PART_WEAPON_LEFT` | 3 — left-hand weapon |
| `PART_HAIR` | 4 — hair |

#### Key Types
| Type | Description |
|------|-------------|
| `TMotion` | A motion entry: percentage, `CGraphicThing*`, `CRaceMotionData*` |
| `TMotionModeData` | All motion vectors for one motion mode (e.g., combat, riding) |
| `SComboAttackData` | Combo sequence data for attack chains |

---

### `CRaceManager`
**File:** `RaceManager.h`
**Purpose:** Singleton managing all race data. Loads race definition files (`.msm`), resolves character models to race-data objects, and provides lookup by race index.

---

### `CRaceMotionData`
**File:** `RaceMotionData.h`
**Purpose:** Holds per-motion metadata beyond the Granny animation: loop count, blend time, sound events (`NSound::TSoundInstanceVector`), effect attachment events, and collision/attack events fired at specific keyframe times.

---

### `IMobProto`
**File:** `ActorInstance.h`
**Purpose:** Singleton interface providing a virtual `FindRaceType(race, type)` lookup. The game module provides the concrete implementation to translate race numbers into `EType` values.

---

### `CPhysicsObject` / `IPhysicsWorld`
**File:** `PhysicsObject.h`
**Purpose:** `CPhysicsObject` provides simple Newtonian physics simulation (gravity, velocity, ground-following) for characters. `IPhysicsWorld` is an interface queried for ground height at a given position.

---

### `CWeaponTrace`
**File:** `WeaponTrace.h`
**Purpose:** Renders a trail behind a weapon as it moves during an attack animation. Captures successive bone positions over time and renders them as a ribbon of triangles with alpha fade.
