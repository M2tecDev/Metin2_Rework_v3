# Guide: NPC & Spawning System

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [What is a vnum?](concept-vnum)
> - [What is a SECTREE?](concept-sectree)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How to add NPCs, register spawns, configure regen.txt, and control monster respawn behavior in Rework v3.

## Overview

> **Runtime location:** Regen and spawn configuration files (`regen.txt`, `mob_group.txt`, `npc_list.txt`) are located in `server/share/` in the server runtime submodule, under `server/share/data/map/<mapname>/`.

Every mob and NPC on a map is controlled by two systems:

| System | Files | What it controls |
|--------|-------|-----------------|
| **Proto** | `mob_proto` (SQL/text) | What the mob IS (stats, AI, race, behavior) |
| **Regen** | `regen.txt` (per-map, server-side) | Where it spawns, how many, and how fast it respawns |

The `db` process loads `mob_proto` at startup and broadcasts it to all `game` processes. The `game` process reads each map's `regen.txt` and calls `CHARACTER_MANAGER::SpawnMob()` to create the initial spawns.

---

## 1. mob_proto Essentials

See [guide-Database-Proto](guide-Database-Proto) for adding a new mob to SQL. Key fields that affect NPC behavior:

| Field | Effect on Behavior |
|-------|--------------------|
| `type` | `0` = monster, `1` = NPC (no aggro, has shop/quest), `2` = stone |
| `ai_flag` | Bit-field controlling AI: `AIFLAG_AGGRESSIVE` (attacks on sight), `AIFLAG_NOMOVE` (stationary), `AIFLAG_COWARD` (flees at low HP), `AIFLAG_REVIVE` (respawns after death) |
| `aggressive_sight` | View range in units at which an aggressive mob will start chasing |
| `aggressive_hp_pct` | HP percentage below which the mob becomes aggressive |
| `race_flag` | Race category (`RACE_FLAG_ANIMAL`, `RACE_FLAG_UNDEAD`, etc.) — affects ATTBONUS_* bonuses |
| `folder` | Path to the mob's model folder (client-side) |
| `mount_capacity` | Number of riders if this is a mount entity |
| `resurrection_vnum` | If non-zero: vnum of the mob that spawns when this mob dies |

---

## 2. regen.txt Format

Each map folder on the server contains a `regen.txt` that defines all spawns:

```
# type  vnum    x        y        dir  count  regen_cycle  regen_percent
m       101     412800   268800   0    5      10           100
e       2001    500000   300000   0    1      0            100
g       0       450000   280000   0    0      0            100   group_file.txt
```

### Column Reference

| Column | Meaning |
|--------|---------|
| `type` | `m` = mob, `e` = entity (stone/boss), `g` = group, `r` = rare/random |
| `vnum` | Mob vnum from `mob_proto` |
| `x`, `y` | Spawn center coordinates **(server units — see coordinate note below)** |
| `dir` | Facing direction (0–7, in 45° increments; 0 = south) |
| `count` | Number of mobs to maintain alive simultaneously |
| `regen_cycle` | Minutes between regen checks |
| `regen_percent` | Probability (0–100) of spawning on each regen check |

### ⚠️ Coordinate Note: The ×100 Factor

Server coordinates are in **centimeters**. Client coordinates (shown in editors and minimap) are in **meters × 100**.

```
Server coord = Client coord × 100
```

Example: A position shown as `(4128, 2688)` in the map editor is `(412800, 268800)` in `regen.txt`.

This is a **very common mistake** — always multiply by 100 when copying coordinates from client-side tools to server files.

---

## 3. Group Spawns

For spawning groups of mobs together (e.g. a boss with minions):

In `regen.txt`:
```
g    0    500000    300000    0    1    30    100    boss_group.txt
```

In `boss_group.txt`:
```
Group BossWithMinions
{
    Leader    1001    0    0       # boss at center
    Follow    101     100  0       # minion 1 offset
    Follow    101     -100 0       # minion 2 offset
    Follow    102     0    100     # minion 3 offset
}
```

- `Leader` is the main mob; its VID is used as the group leader.
- `Follow` mobs track the leader and assist in combat.
- Offsets are relative to the group spawn point.

---

## 4. Spawn Groups (mob_group.txt)

`mob_group.txt` defines groups of mobs that can be referenced by vnum in `regen.txt`. This allows a single regen entry to spawn one of several possible mob configurations:

```
Group 9001
{
    Mob    101    40    # wolf, 40% chance
    Mob    102    35    # bear, 35% chance
    Mob    103    25    # wolf chief, 25% chance
}
```

Reference it in `regen.txt` with the group vnum:
```
m    9001    412800    268800    0    3    10    100
```

---

## 5. Adding an NPC

NPCs (type = 1 in mob_proto) do not aggro but can have shops and quests.

### Step 1 — mob_proto entry

```sql
INSERT INTO mob_proto (vnum, name, locale_name, type, ...)
VALUES (3001, 'Blacksmith', 'Blacksmith', 1, ...);
```

Set `type = 1` (NPC) and `ai_flag = 0` (no AI behavior).

### Step 2 — npc_list (for minimap registration)

To show the NPC icon on the minimap (M key), add an entry to `npc_list.txt` in the map folder:

```
vnum  x        y        name
3001  412800   268800   Blacksmith
```

### Step 3 — Shop (optional)

If the NPC has a shop, add a shop entry in the `shop` SQL table and reference it in the NPC's AI script or quest:

```sql
INSERT INTO shop (shopid, name, npcvnum) VALUES (1001, 'Blacksmith Shop', 3001);
INSERT INTO shop_item (shopid, item_vnum, item_count, display_pos)
VALUES (1001, 1001, 1, 0), (1001, 1002, 1, 1);
```

### Step 4 — Quest trigger (optional)

```lua
quest blacksmith_quest begin
    state start begin
        when 3001.chat."Hello" begin
            say("Welcome to my shop!")
        end
    end
end
```

---

## 6. Respawn Behavior

Respawn is driven by the [SECTREE](concept-sectree) partitioning system and the regen event loop ([server-src-libgame](server-src-libgame) provides `CAttribute` for per-cell walkability checks):

1. A mob dies → `CHARACTER::Dead()` is called → a regen event is scheduled.
2. After `regen_cycle` minutes, the regen event fires.
3. The `regen_percent` roll is made.
4. If successful, `CHARACTER_MANAGER::SpawnMob()` creates a new instance at the same spawn point (± a random offset within the spawn area).

### Instant Respawn

Set `regen_cycle = 0` and `regen_percent = 100` for mobs that respawn immediately after death (e.g. dungeon mobs):

```
m    101    412800    268800    0    5    0    100
```

### No Respawn (one-time spawns)

Set `regen_percent = 0` — the mob spawns once at server start but never respawns:

```
m    1001    500000    300000    0    1    0    0
```

---

## 7. Registering a New Map for Minimap (Atlas)

When you create a new map, register it in the atlas for the minimap to show it:

1. **`atlas.txt`** (client-side, `client-bin/assets/`):
   ```
   map_name    x_start    y_start    x_size    y_size
   metin2_map_newzone    0    0    102400    102400
   ```

2. **`minimap.txt`** (client-side, per map folder):
   Contains the minimap image path and coordinate mappings.

3. **`npc_list.txt`** (server-side, per map folder):
   All NPCs and their world coordinates for minimap icon display.

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `src/game/mob_manager.h/.cpp` | server-src | `CMobManager` — loads `mob_group.txt`, manages spawn group definitions |
| `src/game/regen.h/.cpp` | server-src | `regen_load()`, regen event scheduling, `CHARACTER_MANAGER::SpawnMob` calls |
| `src/game/sectree_manager.h/.cpp` | server-src | `SECTREE_MANAGER` — loads maps, triggers regen on startup |
| `src/common/tables.h` | server-src | `TMobTable` struct — all mob_proto fields |
| `src/common/length.h` | server-src | `EAIFlags`, `ERaceFlags`, `ECharType` enums |
| `maps/<mapname>/regen.txt` | server-src | Per-map spawn definitions |
| `maps/<mapname>/npc_list.txt` | server-src | NPC minimap registration |
| `assets/atlas.txt` | client-bin | World map atlas for minimap system |
| `assets/mob_proto` | client-bin | Binary mob proto (must match server) |
