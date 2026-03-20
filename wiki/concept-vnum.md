# What is a vnum? — Understanding the ID System

> **Who is this for:** A developer who needs to add, modify, or reference items, mobs, skills, maps, or effects.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — understand the client/server split first.
> **What you will learn:** What vnums are, which types of game objects use them, how the item upgrade chain works, and how to safely choose vnums for custom content.

## Overview

A **vnum** (Virtual Number) is the unique integer ID assigned to every "thing" in the game. Items, mobs, NPCs, skills, maps, and effects all have vnums. If you want to reference anything in a SQL query, a config file, a packet, or a quest script, you use its vnum. Understanding vnums is a prerequisite for almost every other task in this project.

---

## Why Numbers Instead of Names?

Names are for humans. Numbers are for computers.

**Performance:** Binary packets carry vnums as compact 4-byte integers. Sending `1` to say "this is a Sword" is faster and smaller than sending a string. The server processes millions of packets per minute — this matters.

**Uniqueness:** Names can be translated or have duplicates (`"Sword"` might exist in three languages). A vnum is always unique within its type.

**Referencing:** SQL queries, regen.txt spawn files, quest scripts, and refine recipes all reference game objects by vnum. The entire persistence layer is built around vnums as foreign keys.

**Stability:** You can rename an item without changing its vnum. The database, the pack files, and all spawn configs keep working.

---

## Which Types of Things Have vnums?

Each type of game object has its own vnum space — the same number can safely appear in both `item_proto` and `mob_proto` and they will not conflict.

| Type | vnum range | Example | Where defined |
|------|------------|---------|---------------|
| Items | 1 – 799999 | vnum 1 = Sword +0 | `item_proto` (SQL table + client binary) |
| Mobs / NPCs | 1 – 65535 | vnum 101 = Wolf | `mob_proto` (SQL table + client binary) |
| Skills | 1 – 255 | vnum 1 = Sword Skill | `skill_proto` (SQL table) |
| Effects | registered at startup | Hit particle effect | `CEffectManager` in the client |
| Maps | 1–299 (static), 300+ (dynamic) | 1 = n_flame_01 | Map config files |

---

## The Item Upgrade vnum Chain

When a player upgrades an item with a refine stone, the server does not add a `+1` counter to the item record. Instead, it replaces the item's vnum with the vnum of the next tier.

```
vnum 1 ─── Sword +0
  │
  │  dwRefinedVnum = 2
  ▼
vnum 2 ─── Sword +1
  │
  │  dwRefinedVnum = 3
  ▼
vnum 3 ─── Sword +2
  │
  │  dwRefinedVnum = 4
  ▼
vnum 4 ─── Sword +3
  │
  │  dwRefinedVnum = 0  (cannot be refined further)
  ▼
  (upgrade blocked)
```

Each tier is a completely separate `item_proto` row with its own vnum, its own stats, and its own icon. The `dwRefinedVnum` column in `item_proto` points to the next tier. If `dwRefinedVnum = 0`, the item cannot be upgraded.

**What this means in practice:**
- Adding a new weapon that can be upgraded to +9 requires 10 separate `item_proto` rows (vnums for +0 through +9)
- Each tier needs its own icon in the client
- The `wRefineSet` column points to the refine recipe (materials, success chance) — separate from the vnum chain itself

---

## What Happens When Two Things Share a vnum?

Never assign the same vnum to two different items (or two different mobs). The consequences depend on which layer finds the collision first:

**In `item_proto`:**
- The game process loads proto tables at startup; a duplicate vnum means one entry silently overwrites the other
- Players who have the overwritten item will see it transform into the surviving entry — wrong name, wrong icon, wrong stats
- The `item_proto` table has a `UNIQUE KEY` on `vnum` to prevent duplicates at the SQL level

**In `mob_proto`:**
- Same overwrite behaviour — the wrong mob model and stats are used
- regen.txt spawns using the overwritten vnum now spawn the wrong mob

**In packets:**
- No packet-level collision — packets carry vnums from specific tables (items send item vnums, mob spawns send mob vnums), so item vnum 1 and mob vnum 1 are unambiguous in context

---

## Choosing Safe vnums for Custom Content

Use ranges that do not conflict with base game content. The base content typically occupies the lower ranges; custom content should use the upper portions.

| Type | Safe custom range | Notes |
|------|------------------|-------|
| Items | 50000 – 799999 | Base content rarely exceeds 30000; 50000+ is safe |
| Mobs / NPCs | 10000 – 65535 | Base mobs are mostly below 5000 |
| Skills | Not recommended for custom content | Skill system is tightly coupled to server C++ |
| Maps | 300+ | Static maps are 1–299; dynamic maps start at 300 |

**Rule:** Check the existing SQL tables before assigning a new vnum. `SELECT vnum FROM item_proto ORDER BY vnum DESC LIMIT 1;` tells you the highest currently used vnum.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Two items with the same vnum in SQL | One item has wrong name/icon in-game | Add `UNIQUE KEY` constraint or check before inserting |
| Creating item upgrade chain with non-consecutive vnums | Upgrade chain works, but the association is confusing | vnums in a chain do not need to be consecutive — only `dwRefinedVnum` linkage matters |
| Forgetting to update the client binary proto after adding new vnums | New items show as "?" in the client | Regenerate binary proto and repack — see [concept-proto](concept-proto) |
| Using a vnum > 65535 for a mob | Server silently ignores it or crashes | `mob_proto` vnum is a `uint16_t` — max value 65535 |
| Referencing an item vnum in a mob spawn config | Wrong entity spawns or crash | Item vnums and mob vnums are separate spaces; use mob vnums in regen.txt |

---

## Next Steps

- [What are item_proto and mob_proto?](concept-proto) — how vnums are defined in the blueprint tables
- [Database & Proto Workflow](guide-Database-Proto) — how to add new vnums correctly across both SQL and client binary
- [NPC & Spawning](guide-NPC-and-Spawning) — using mob vnums in regen.txt
