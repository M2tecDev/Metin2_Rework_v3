# What are item_proto and mob_proto? — The Blueprint System

> **Who is this for:** A developer modifying or adding items, mobs, or NPCs.
> **Prerequisites:** [What is a vnum?](concept-vnum) — you need to understand the ID system before reading about the tables that use it.
> **What you will learn:** What proto tables are, why there are two copies (server + client), what breaks when they are out of sync, and the workflow to keep them in sync.

## Overview

`item_proto` and `mob_proto` are the **blueprint tables** for every item and mob in the game. They define what something *is* — its stats, type, appearance, and behaviour. They do not represent a specific instance; a single `item_proto` row for "Sword +0" is the blueprint for every Sword +0 in the game, regardless of who owns it.

The challenge is that these tables exist in **two places**: as a SQL table on the server, and as a binary file packed into the client assets. Both copies must stay in sync, or players see wrong data and get kicked.

---

## The Blueprint Analogy

A building blueprint tells a contractor what the building should look like. Every building constructed from that blueprint has the same structure.

`item_proto` is the blueprint for items. The "item in a player's inventory" is a row in the `item` table that says `vnum=1, count=1, owner_id=123`. The server looks up vnum 1 in `item_proto` to find its name, stats, type, and icon. The item row does not duplicate that data — it just references the blueprint by vnum.

---

## The Two-Version Problem

```
Server                                Client
┌─────────────────────────┐           ┌──────────────────────────┐
│  item_proto             │           │  item_proto.bin          │
│  (MariaDB SQL table)    │ ◄─ must ─►│  (packed into .eix/.epk) │
│                         │   match   │                          │
│  Used for:              │           │  Used for:               │
│  • Game logic           │           │  • Display names         │
│  • Drop rate calc       │           │  • Icons                 │
│  • Stat calculation     │           │  • Descriptions          │
│  • Item creation        │           │  • CRC validation        │
└─────────────────────────┘           └──────────────────────────┘
```

The server reads `item_proto` from MariaDB at startup. It knows each item's type, wearflag, stats, and upgrade chain.

The client reads `item_proto.bin` from the pack files. It uses this to display the item's name, icon, and tooltip in the UI.

When you change a row in the SQL table, the binary file in the client does not automatically update. You must regenerate it and repack. Until you do, the client and server have different definitions for the same vnum.

---

## What Happens When They Are Out of Sync?

| Symptom | Likely cause | How to check |
|---------|-------------|--------------|
| Item name shown as "?" or wrong name | Client `item_proto.bin` is outdated | Compare SQL vnum list with binary — missing or changed entries will differ |
| Kicked immediately on character select | Binary file CRC does not match server's expected value | Server logs `"CRC mismatch"` in `game/syserr` |
| Wrong mob model displayed | Client `mob_proto.bin` is outdated | Mob vnum appears in SQL but not (or differently) in binary |
| Server gives item but wrong icon shows | Client binary has old icon mapping for that vnum | Regenerate `item_proto.bin` and repack |
| New item appears as empty slot | vnum exists in SQL but not in client binary | Regenerate binary — new rows are invisible to the client until then |

---

## The Sync Workflow (Concept)

When you add or change a row in `item_proto` or `mob_proto`, follow these steps:

```
Step 1: Change the SQL table
  └─ INSERT or UPDATE the row in MariaDB

Step 2: Export to text format
  └─ Run the proto export tool to dump the SQL table to a tab-separated text file
     (tool is described in guide-Database-Proto)

Step 3: Convert text to binary
  └─ Run the binary conversion tool on the text file
     Output: item_proto.bin (or mob_proto.bin)

Step 4: Pack into client assets
  └─ Copy the .bin file into the appropriate directory in client-bin
     Run pack.py to rebuild the .eix/.epk archives

Step 5: Restart and repack
  └─ Restart the game process (reloads SQL proto)
     Repack client assets (client reads new binary)
     Restart the client
```

For the exact commands at each step, see [guide-Database-Proto](guide-Database-Proto).

---

## Key Fields in item_proto

Not every column matters equally. These are the ones you will encounter most often:

| Field | Meaning | Example |
|-------|---------|---------|
| `vnum` | Unique ID — the item's identity | `1` |
| `name` | Internal name — not displayed to players; used in logs and quest scripts | `"Sword"` |
| `type` | Item category — determines which game logic applies | `ITEM_WEAPON` |
| `wearflag` | Which equipment slot this item occupies | `WEAR_WEAPON` |
| `dwRefinedVnum` | vnum of the next upgrade tier — `0` means cannot be upgraded | `2` |
| `wRefineSet` | Which upgrade recipe to use (materials, probabilities) | `501` |
| `gold` | NPC sell price | `1000` |
| `anti_flags` | Restrictions: cannot be dropped, traded, stored in warehouse | bitmask |
| `apply_type` / `apply_value` | Stat bonuses the item gives when equipped | `APPLY_STR`, `10` |

For mob_proto the analogous key fields are `vnum`, `name`, `type`, `level`, `max_hp`, `battle_type`, `model_vnum` (the 3D model ID).

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Editing SQL but forgetting to regenerate the binary | Client shows old data; new items invisible | Always run the export + convert + pack steps after any SQL change |
| Regenerating binary but not repacking | Client still reads old binary from the old pack | Run `pack.py` after placing the new binary in client-bin |
| Wrong tab/space separator in the text export | Binary conversion fails or produces garbage | The text format uses tabs — do not substitute spaces |
| Editing the binary file directly | Changes lost on next export; corrupted format | Always edit the SQL table, then regenerate |
| Forgetting to restart game after SQL change | Server uses cached proto from startup | Restart the game process to reload SQL proto |

---

## Next Steps

- [Database & Proto Workflow](guide-Database-Proto) — the complete step-by-step guide with exact commands
- [What is a vnum?](concept-vnum) — understanding the ID system behind the proto tables
- [Fixing Database Problems](troubleshoot-db) — when proto loading fails
- [server-src-db](server-src-db) — the `db` process reads proto via `ProtoReader` and broadcasts via `DG::BOOT`
- [server-src-common](server-src-common) — `EItemType`, `EApplyTypes`, `EWearPositions` constants define proto fields
