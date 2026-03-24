# What is a SECTREE? — Understanding Spatial Partitioning

> **Who is this for:** A developer working with maps, spawn configurations, NPC placement, or movement.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — understand the server structure first.
> **What you will learn:** Why the server uses spatial partitioning, what a SECTREE is, how entity lookup works, the coordinate system, and why attribute maps matter.

## Overview

When a player attacks, the server needs to find every entity within range to calculate effects. When a player moves, the server needs to know which other players and mobs are nearby enough to receive an update. Doing this naively — checking every entity against every other entity — becomes impossibly slow on a large map. SECTREEs are the solution.

---

## The Problem: O(n²) at 40 Pulses Per Second

Imagine a map with 500 players and 2000 mobs — 2500 entities total.

To find all entities within attack range of one player, a naive approach would check all 2499 other entities. With 500 players each checking 2499 others every pulse, that is 1.25 million checks per pulse, 40 times per second = **50 million checks per second** just for range queries.

This does not scale. The server needs a way to find nearby entities quickly without checking everyone.

---

## The Solution: Divide the Map into a Grid

The map is divided into a regular grid of cells. Each cell is one SECTREE. Instead of searching the whole map, the server only searches the cell the entity is in, plus the 8 surrounding cells.

```
Map (top-down view, divided into SECTREE cells)

┌────┬────┬────┬────┬────┐
│    │    │    │    │    │
├────┼────┼────┼────┼────┤
│    │    │ M  │    │    │   P = Player
├────┼────┼────┼────┼────┤   M = Monster
│    │ M  │ P  │ M  │    │
├────┼────┼────┼────┼────┤   Each cell = one SECTREE
│    │    │    │ M  │    │   Size = 3200 × 3200 world units
├────┼────┼────┼────┼────┤
│    │    │    │    │    │
└────┴────┴────┴────┴────┘

Player needs to check for nearby entities?
→ Only search the 3×3 block of cells centred on the player.
→ 9 cells instead of the whole map.
```

---

## What is a SECTREE?

A SECTREE is one cell in this grid. It is **3200 × 3200 world units** in size (3200 centimetres = 32 metres in game terms).

Each SECTREE maintains a list of all entities currently inside it: players, mobs, NPCs, items on the ground, and so on. When an entity moves into a new cell, it removes itself from the old SECTREE's list and adds itself to the new one.

---

## How Entity Lookup Works

```
1. Entity is at position (x, y)
2. Calculate sector:  sector_x = x / 3200
                      sector_y = y / 3200
3. Look up SECTREE at (sector_x, sector_y)
4. Check that SECTREE + its 8 neighbours
   (a 3×3 block of up to 9 SECTREEs)
5. Filter by distance within those 9 cells
```

Instead of checking 2500 entities, the server checks only those in 9 cells — typically a small fraction of the total population. For a map of 2500 entities spread across 100 cells, each range check touches roughly 225 entities instead of 2500.

---

## What Happens When a Player Moves Between Sectors

A player's **view range** covers roughly 2–3 SECTREEs in each direction. When a player crosses a SECTREE boundary, their view range shifts — some entities enter view, others leave.

```
Before move:             After move (one cell right):

Old visible area:        New visible area:
┌────┬────┬────┐         ┌────┬────┬────┐
│ A  │ B  │ C  │         │ B  │ C  │ D  │
├────┼────┼────┤    →    ├────┼────┼────┤
│ E  │[P] │ F  │         │ E  │[P] │ G  │
├────┼────┼────┤         ├────┼────┼────┤
│ H  │ I  │ J  │         │ I  │ J  │ K  │
└────┴────┴────┘         └────┴────┴────┘

Cells A, H no longer visible → server sends GC_CHARACTER_DEL for entities in A, H
Cells D, G, K now visible    → server sends GC_CHARACTER_ADD for entities in D, G, K
```

This is why you see mobs and players "pop in" at the edges of your screen in Metin2 — they are entering your view range as you cross sector boundaries.

---

## The Coordinate System

**1 world unit = 1 centimetre.**

```
Map editor coordinate system:    Server coordinate system:
Displays values in metres         Uses centimetres internally

Map editor shows: (3584, 6592)   Server value: (358400, 659200)
                                  (multiply by 100)
```

**This is the most common mistake in spawn configurations.** If you open a map in the editor and copy coordinates directly into `regen.txt`, your mob will spawn far from where you intended — 100× closer to the origin.

**Rule:** Always multiply map editor coordinates by 100 before using them in server configs.

### Coordinate example

```
Map editor position: x = 1234, y = 5678

regen.txt entry should use:
  X = 123400
  Y = 567800
```

---

## Why This Matters for Developers

### Spawn configuration (regen.txt)

All spawn coordinates in `regen.txt` use server units (centimetres). Always multiply map editor values by 100.

### Attribute map

Each SECTREE cell also stores **attribute data** — a per-tile bitmask describing the terrain:
- Passable vs impassable (walls, water)
- Water tiles (different movement)
- Safe zone (no PvP)
- No-mount zone

This attribute data comes from the `.atr` files generated by the map editor. If the attribute map is wrong:
- Players or mobs can walk through walls
- Players can PvP in safe zones
- Mount restrictions do not apply correctly

When you modify a map in the editor and regenerate the `.atr` file, you must redeploy the updated map data to the server and restart the game process.

### NPC shop placement

NPC position coordinates in the quest and shop configuration also use server units. An NPC defined at `(100, 200)` in a config file will appear at a map editor position of `(1, 2)` — probably not where you intended.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Using map editor coordinates directly in regen.txt | Mob spawns in the wrong location (100× closer to origin) | Multiply by 100: editor (100, 200) → regen (10000, 20000) |
| Forgetting to regenerate `.atr` after map edit | Characters walk through new walls; safe zone boundary wrong | Re-export map from editor; redeploy `.atr` files; restart game |
| Setting spawn coordinates outside the map bounds | Spawn silently fails; `game/syserr` shows "position out of bounds" | Verify coordinates are within the map's defined extents |
| Not understanding per-SECTREE attribute limits | A zone is not behaving as safe/no-mount | Check `.atr` file generation in the map editor |

---

## Next Steps

- [NPC & Spawning](guide-NPC-and-Spawning) — using SECTREE coordinates in practice with regen.txt; SECTREE partitioning also drives regen event scheduling
- [Map & World Blueprint](blueprint-Map-World-System) — deep-dive into the SECTREE C++ implementation
- [Your First Change](start-first-change) — a hands-on spawn example with coordinate conversion
