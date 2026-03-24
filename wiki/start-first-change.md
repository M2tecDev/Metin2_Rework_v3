# Your First Change — The Complete Development Workflow

> **Who is this for:** A developer making their first change to the project.
> **Prerequisites:** A working server and client — see [start-server-setup](start-server-setup) and [start-client-setup](start-client-setup).
> **What you will learn:** The complete change-test cycle for three different types of changes, and The Golden Rule for knowing what to restart.

## Overview

Every change you make follows the same pattern: edit something, restart or repack the right things, then test. The hard part is knowing *which* things to restart. This guide walks through three complete examples end-to-end so you see the full cycle before you start customising anything.

---

## Example A — Spawn a New NPC

This is the simplest change: adding a mob to the world using only SQL and a config file.

### Step 1: Add a mob_proto entry in SQL

Connect to MariaDB and insert a row for your new mob:

```sql
INSERT INTO mob_proto (vnum, name, type, battle_type, level, size, exp, max_hp, ...)
VALUES (30001, 'Test Wolf', 1, 0, 10, 1, 50, 500, ...);
```

Choose a [vnum](concept-vnum) in the safe custom range (10000–65535 for mobs). The full column list is in the [mob_proto](topic-Item-System) table schema (see [guide-Database-Proto](guide-Database-Proto) and [Item Database](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/items.html)). For a first test, copying values from an existing nearby mob and changing the vnum and name is fine.

### Step 2: Add a regen.txt entry

Find the regen file for the map where you want the mob to spawn (e.g., `game/data/map/n_flame_01/regen.txt`). Add a line:

```
g	n_flame_01	358400	659200	0	30001	5	60
```

Fields (tab-separated):

| Field | Example | Meaning |
|-------|---------|---------|
| Type | `g` | `g` = group spawn |
| Map | `n_flame_01` | Map folder name |
| X | `358400` | X coordinate in **server units** (centimetres) |
| Y | `659200` | Y coordinate in server units |
| Direction | `0` | Spawn direction (0 = any) |
| vnum | `30001` | The mob vnum from mob_proto |
| Count | `5` | How many to spawn |
| Respawn | `60` | Seconds between respawns |

**Important:** Server coordinates are in centimetres. If the map editor shows (3584, 6592), multiply both values by 100 for regen.txt.

### Step 3: Restart the server

Only the game process needs to restart — regen.txt is read at game startup, and mob_proto is loaded by game, not db.

```bash
# Stop game process, then start it again
./game stop
./game start
```

db does not need to restart for this change.

### Step 4: Test in-game

- Log in and navigate to the spawn coordinates
- The mob should appear within the respawn interval (60 seconds in the example)
- If the mob does not appear, check `game/syserr` for a regen parse error or missing vnum

---

## Example B — Change an Existing Item

This change touches both the server SQL table and the client binary proto file.

### Step 1: Modify item_proto in SQL

```sql
UPDATE item_proto SET gold = 5000 WHERE vnum = 1;
```

This changes the sell price of item vnum 1 on the server side.

### Step 2: Export and regenerate the client binary proto

The client has its own copy of item_proto as a binary file packed into the assets. You must regenerate it to match the server SQL. Refer to [guide-Database-Proto](guide-Database-Proto) for the exact workflow — the steps involve exporting the SQL table to a text format, converting to binary, and placing it in the client-bin directory.

### Step 3: Restart game process and repack client

```bash
# Server side
./game stop && ./game start

# Client side
python pack.py    # repack assets including the new item_proto binary
# then restart the client
```

### Step 4: Test in-game

- Pick up or buy item vnum 1
- Sell it to an NPC — the price should be 5000 gold
- If the client shows the wrong price, the client binary proto was not updated correctly

---

## Example C — Change the Python UI (Move a Button)

This change only touches client-bin Python files — no server restart needed.

### Step 1: Find the right .py file

UI in client-bin is split into two places:
- **Layout** (where things are): `uiscript/uiscript/*.py`
- **Logic** (what happens): `root/*.py`

To move a button, you need the layout file. For example, to move a button in the inventory window, look in `uiscript/uiscript/inventory.py`. The file contains a Python dict describing positions and sizes.

### Step 2: Edit the position value

```python
# Before
{"type": "button", "x": 100, "y": 200, ...}

# After (moved 50 pixels to the right)
{"type": "button", "x": 150, "y": 200, ...}
```

### Step 3: Repack with pack.py

```bash
python pack.py
```

### Step 4: Restart only the client

No server restart needed. The server did not change. Launch `Metin2.exe` and the button should be in the new position.

If you still see the old position, you forgot to repack, or the client is loading from a cached pack. Delete `pack/` and rerun `pack.py`.

---

## The Golden Rule

> **Server-side change** (SQL, regen.txt, quest scripts, C++ server code)
> → Restart the **game process** (and db if schema changed)
>
> **Client-side change** (Python scripts, UI scripts, textures, sounds)
> → **Repack** with pack.py + restart the **client**
>
> **Proto change** (item_proto or mob_proto)
> → **BOTH**: restart game process + regenerate binary + repack client
>
> **Packet structure change** (packet_headers.h, packet_structs.h)
> → **Recompile EVERYTHING**: server-src + client-src + repack client

When in doubt, do more restarts. A missed restart costs a few seconds. A missed recompile costs a confusing debugging session.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Restarting db when only game changed | Wasted time, same result | db only needs restart for schema changes or db.conf changes |
| Not regenerating client binary after SQL proto change | Client shows wrong names/icons | See [guide-Database-Proto](guide-Database-Proto) |
| Using map editor metres in regen.txt | Mob spawns at wrong location | Multiply by 100 for server units |
| Not running qc before restarting game | Quest changes silently ignored | Always compile .quest files with qc first |
| Changing a packet struct without recompiling client | Client/server out of sync, crashes or disconnects | Packet changes require full recompile of both sides |

---

## Next Steps

- [Daily Development Workflow](start-workflow) — the master reference table for all change types
- [Adding a New System](guide-Adding-a-New-System) — a full end-to-end guide for a more complex feature
- [Database & Proto Workflow](guide-Database-Proto) — the complete proto regeneration workflow
