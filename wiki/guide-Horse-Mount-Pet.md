# Guide: Horse, Mount, and Pet Systems

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [What is a vnum?](concept-vnum)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How to understand, configure, and extend the classic horse system, the modern costume-mount system, and the pet system in Metin2 Rework v3.

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

---

## Prerequisites

- Familiarity with the `CHARACTER` class and the point/stat system — see [Character System](topic-Character-System).
- Understanding of client-side actor types — see [GameLib Characters](client-src-GameLib-Characters).
- Access to `item_proto` and `mob_proto` data tables.
- The server game process source at `server-src/src/game/`.

---

## Overview

Metin2 Rework v3 provides three layered mount/companion mechanisms:

| Mechanism | How it works | Client actor type |
|-----------|-------------|------------------|
| **Classic Horse** | Horse is a separate `CHARACTER` instance (mob vnum) linked to the player via `CHorseRider`; three tiers with levelling | `TYPE_HORSE` |
| **Costume Mount** | `ITEM_COSTUME` / `COSTUME_MOUNT` item sets `POINT_MOUNT` on the player; client spawns a child instance | `TYPE_HORSE` |
| **Pet** | `CPetSystem` owns a separate actor instance that follows the player and applies buffs | Separate NPC-type instance |

All three systems share the same `CActorInstance` rendering pipeline on the client side and the `CHARACTER` / `CHorseRider` infrastructure on the server side.

---

## Step-by-Step

---

### Part 1 — Classic Horse System

#### 1.1 The Three Tiers

Vanilla Metin2 defines three horse tiers, each mapped to a distinct monster vnum range in `mob_proto`:

| Tier | Korean name | Typical vnum range | Notes |
|------|------------|-------------------|-------|
| Beginner | 새끼말 (Young Horse) | ~20100–20109 | Obtained from a quest around level 25 |
| Combat | 전투마 (Combat Horse) | ~20110–20119 | Promoted from Beginner tier |
| Military | 군마 (Military Horse) | ~20120–20129 | Top tier; unlocks horse combat skills |

> **Note:** Exact vnum ranges vary by server configuration. Confirm against your `mob_proto` table.

The tier is determined by the horse's vnum. The mapping from tier to model vnum is handled in `char_horse.cpp` (server) and resolved through `CRaceManager` on the client.

#### 1.2 How Horses Level Up

Horse progression uses two inputs:

1. **Riding time** — each minute spent mounted accumulates riding experience. The server tracks this through the pulse loop in `char_horse.cpp`.
2. **Feeding** — using a horse food item (`ITEM_USE_HORSE` subtype) on the horse grants an immediate experience boost.

When accumulated experience reaches a threshold the horse gains a level (0–30 within a tier). At level 30, a promotion quest or item use triggers the tier change: a new mob vnum is spawned at level 0 of the next tier.

Horse health (separate from the player's HP) is stored on the horse `CHARACTER` instance. If horse HP reaches 0 the player is dismounted and must heal the horse before riding again.

#### 1.3 Horse Skills

Military-tier horses unlock three combat skills usable while riding:

| Skill | Effect |
|-------|--------|
| Horse Kick (발차기) | AoE kick attack centred on the horse |
| Horse Charge (돌진) | Dash forward dealing damage to targets in the path |
| Horse Back Stab (후방공격) | Rear-attack variant dealing bonus damage |

These are defined as normal skill entries in `skill_proto` with a flag restricting use to the mounted state. The server validates `IsRiding()` in `char_skill.cpp` before allowing activation.

#### 1.4 `ITEM_USE_HORSE` Flow

When a player uses a horse-related item (food, summon whistle, etc.) with subtype `ITEM_USE_HORSE`:

1. `CInputMain` receives `HEADER_CG_ITEM_USE` and calls `CHARACTER::UseItem()` in `char_item.cpp`.
2. `UseItem()` checks the item's `bType` / `bSubType` combination.
3. For a **summon whistle**: the server calls `MountVnum(dwHorseVnum)`, which spawns the horse `CHARACTER` instance via `CHARACTER_MANAGER::SpawnMob()` and links it to the player through `CHorseRider`.
4. For **horse food**: experience is added to the horse's level counter. If a threshold is crossed, `SetHorseLevel()` is called and a `GC_POINT_CHANGE` packet notifies the client.
5. The client receives either a `GC_CHARACTER_ADD` packet (new horse entity entering the view-set) or a `GC_POINT_CHANGE` for horse health/level points.

---

### Part 2 — Modern Mount System (Costume Mount)

#### 2.1 Item Configuration

A costume mount is an `ITEM_COSTUME` item with subtype `COSTUME_MOUNT`. In `item_proto` the relevant fields are:

| Field | Value | Purpose |
|-------|-------|---------|
| `type` | `ITEM_COSTUME` | Item type constant |
| `subtype` | `COSTUME_MOUNT` | Identifies this costume as a mount |
| `value[0]` | Mount model vnum | The mob vnum whose race data the client loads for the mount model |

`value[0]` is the critical field: it tells the server which vnum to store in `POINT_MOUNT`, which the client resolves to a race model via `CRaceManager`.

> **Note:** Some Rework variants use a different value slot index. Verify the exact slot used in the `COSTUME_MOUNT` branch inside `char_item.cpp` `UseItem()`.

#### 2.2 Server-Side: `UseItem()` Flow

1. `CHARACTER::UseItem()` in `char_item.cpp` matches `ITEM_COSTUME` / `COSTUME_MOUNT`.
2. If no mount is currently active: reads `item->GetValue(0)` to obtain the mount vnum, then calls `PointChange(POINT_MOUNT, dwMountVnum)` (or the `MountVnum()` wrapper in `char_horse.cpp`).
3. If a mount is already active (toggle behaviour): calls `Mount_Unmount()`, which sets `POINT_MOUNT` back to 0.
4. A `GC_POINT_CHANGE` packet (type `POINT_MOUNT`) is sent to the owning client, and a `GC_CHARACTER_UPDATE` is broadcast to nearby players so they see the mount appear or disappear.

`POINT_MOUNT` is defined in `length.h` and lives in `CHARACTER_POINT_INSTANT` (session-only; not persisted to the DB — the mount is re-applied from the equipped item on login via `EquipItem()` → `ModifyPoints()`).

#### 2.3 Client-Side: Rendering the Mount

On the client, `CInstanceBase` (which wraps `CActorInstance` from GameLib) handles mount display:

1. A `GC_POINT_CHANGE` for `POINT_MOUNT` arrives; `PythonCharacterModule.cpp` routes it to the character's mount-vnum field.
2. `CInstanceBase` creates a child `CActorInstance` of type `TYPE_HORSE` using the received vnum.
3. `CRaceManager` looks up the race definition file (`.msm`) for that vnum and loads the corresponding Granny2 model.
4. The child instance is attached to the player instance's root bone; the player switches to the riding `TMotionModeData` (riding motion set).
5. On dismount (vnum → 0), the child instance is destroyed and the player reverts to the standing motion mode.

#### 2.4 Adding a New Costume Mount

Follow these steps to add a new mount without modifying C++ source code:

1. **Add the mob prototype** — add a new entry to `mob_proto` for the mount model vnum. The entry requires only the basic fields (name, type, level); no AI flags are needed because this mob is never independently spawned by the respawn system.
2. **Provide the client race data** — create a `.msm` race definition file for the new vnum referencing the model's Granny2 `.gr2` file. Register it in the `RaceManager` data pack so `CRaceManager` can resolve the vnum.
3. **Add the item** — insert an `ITEM_COSTUME` / `COSTUME_MOUNT` row in `item_proto` with a unique item vnum and `value[0]` set to the new mob vnum.
4. **Distribute the item** — add it to a shop, drop table, or quest reward as needed. No source code changes are required for a new mount entry if a `COSTUME_MOUNT` code path already exists.

---

### Part 3 — Pet System

The server-src wiki confirms `PetSystem.h` / `PetSystem.cpp` are present in the game server source (see [server-src-game](server-src-game), Additional Game Features table), implementing the `CPetSystem` class.

#### 3.1 How the Pet System Works

A pet is a separate `CActorInstance` (client) backed by a dedicated `CHARACTER` instance (server) that follows the owner and applies passive buffs. Unlike the classic horse, pets are managed by `CPetSystem` rather than `CHorseRider`.

High-level flow:

1. The player uses a pet summon item. `CHARACTER::UseItem()` delegates to the player's `CPetSystem` instance.
2. `CPetSystem` spawns a new `CHARACTER` via `CHARACTER_MANAGER::SpawnMob()` using the pet's mob vnum.
3. The pet character follows its owner using the same follow logic as monster AI (`CHARACTER::Follow()`).
4. Passive buffs defined for the pet are applied to the owner through `CHARACTER::AddAffect()`.
5. Pet experience and level are tracked within `CPetSystem` and persisted separately from the player's main stats.

#### 3.2 Pet Levelling

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

Pets gain experience from kills made while the pet is summoned (kills by the owner count). On level-up:
- The pet's stat bonuses increase.
- `CPetSystem` calls `RemoveAffect()` followed by `AddAffect()` to replace the owner's existing pet buffs with updated values.
- The new pet level is saved to the DB via the player's extended data mechanism.

#### 3.3 Pet Items

Pet summon items typically use `ITEM_UNIQUE` or a server-specific type. The item's `value[0]` holds the pet mob vnum. Using the item toggles the pet on/off, similarly to the costume mount toggle flow described in Part 2.

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

---

## Common Mistakes

1. **Wrong `value[0]` on the mount item** — if `value[0]` does not match a vnum in `mob_proto`, the server sends an invalid vnum to the client. `CRaceManager` finds no race data and renders nothing (or crashes the client). Always verify the `mob_proto` entry exists before testing.

2. **Missing client race data (`.msm` file)** — the server will set `POINT_MOUNT` to a valid vnum, but if `CRaceManager` has no race definition for that vnum, no visible mount appears on the client. Add the race data file and rebuild the client data pack.

3. **Horse HP reaching zero** — if the horse dies the summon whistle becomes unusable until a horse HP recovery item is used. Players unfamiliar with the system often do not notice the horse has its own health bar.

4. **Assuming `POINT_MOUNT` persists across sessions** — `POINT_MOUNT` is a session-only instant point. Do not attempt to save it in the player DB row. The equipped costume item re-applies it on login automatically via `EquipItem()` → `ModifyPoints()`.

5. **Tier promotion with mismatched vnum** — promoting a horse requires spawning the correct next-tier vnum. If the tier-to-vnum table in `char_horse.cpp` is out of sync with `mob_proto` entries, the promotion creates an invisible or broken horse.

6. **Pet buffs stacking on re-summon** — if `CPetSystem` applies buffs without first removing existing ones, duplicate affects accumulate across summon sessions. Ensure `RemoveAffect()` is called before re-applying pet stat bonuses.

---

## Key Files

| Path | Repository | Role |
|------|-----------|------|
| `server-src/src/game/char_horse.cpp` | server-src | Mount/horse system implementation: summon, riding stats, horse HP, `CHorseRider` methods |
| `server-src/src/game/char_horse.h` | server-src | `CHorseRider` class declaration; `MountVnum()`, `Mount_Unmount()`, `IsRiding()`, `SetHorseLevel()` |
| `server-src/src/game/char_item.cpp` | server-src | `CHARACTER::UseItem()` — dispatches `ITEM_USE_HORSE` and `COSTUME_MOUNT` branches |
| `server-src/src/game/PetSystem.h` | server-src | `CPetSystem` class declaration: pet summon, follow, buff application, levelling |
| `server-src/src/game/PetSystem.cpp` | server-src | `CPetSystem` implementation: spawn, experience tracking, affect management |
| `server-src/src/common/length.h` | server-src | `POINT_MOUNT`, `POINT_POLYMORPH`, and all `EPointTypes` constants |
| `server-src/src/common/tables.h` | server-src | `TItemTable` (item proto struct with `value[]` array), `TMonsterTable` |
| `client-src/GameLib/ActorInstance.h` | client-src | `CActorInstance::EType` including `TYPE_HORSE`; child-instance attachment API |
| `client-src/GameLib/RaceData.h` | client-src | `CRaceData` — race definition and motion mode data for riding animations |
| `client-src/GameLib/RaceManager.h` | client-src | `CRaceManager` singleton — resolves vnum to race data and Granny2 model |
| `client-src/PythonModules/PythonCharacterModule.cpp` | client-src | Python to C++ bridge; routes `POINT_MOUNT` changes to `CInstanceBase` mount display logic |
