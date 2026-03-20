# Guide: Database & Proto Workflow

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [What are item_proto and mob_proto?](concept-proto)
> - [What is a vnum?](concept-vnum)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How to add items and mobs, sync proto files between server and client, and manage vnum ranges in Rework v3.

## Overview

Metin2 uses two binary-like "proto" tables as the single source of truth for all items and mobs:

| Table | Format | Owned by | Used by |
|-------|--------|----------|---------|
| `item_proto` | SQL table + `.txt` CSV | Server MariaDB | Server runtime + client binary file |
| `mob_proto` | SQL table + `.txt` CSV | Server MariaDB | Server runtime + client binary file |

The `db` process loads both tables at startup from the SQL database and broadcasts them to every connecting `game` process via `QUERY_BOOT / DG_BOOT`. The **client** also needs matching binary proto files to render names, icons, and stats correctly.

---

## 1. Adding a New Item — Full Workflow

### Step 1 — Server SQL

Insert a row into the `item_proto` table in MariaDB:

```sql
INSERT INTO item_proto (
    vnum, name, locale_name, type, subtype,
    weight, size, antiflag, flag, wearflag,
    immuneflag, gold, shop_buy_price,
    limittype0, limitvalue0, limittype1, limitvalue1,
    applytype0, applyvalue0, applytype1, applyvalue1, applytype2, applyvalue2,
    value0, value1, value2, value3, value4, value5,
    socket_pct, addon_type, icon_num, model_num
) VALUES (
    50001, 'Iron Sword', 'Iron Sword', 1, 0,
    50, 1, 0, 0, 2,
    0, 10000, 12000,
    1, 20, 0, 0,
    1, 50, 0, 0, 0, 0,
    10, 20, 0, 0, 0, 0,
    0, 0, 50001, 50001
);
```

Key columns:
- `type` — `EItemType` value (1 = weapon, 2 = armor, 4 = use, etc.)
- `subtype` — subtype within the type (0 = sword, 1 = dagger, etc.)
- `wearflag` — bit-mask of `EWearFlags` (which equipment slot)
- `applytype0-2` — `EApplyTypes` values (stat bonuses on the item)
- `applyvalue0-2` — corresponding stat bonus amounts
- `value0-5` — type-specific data (e.g. for weapons: ATT_MIN, ATT_MAX, MAGIC_ATT_MIN, MAGIC_ATT_MAX, ...)

### Step 2 — Export to item_proto.txt

Export the SQL table to the text proto format that the `db` process reads:

```bash
# In the server tools directory
./proto_exporter --table item_proto --output /srv/metin2/share/item_proto.txt
```

Or export directly from MySQL:
```sql
SELECT * FROM item_proto INTO OUTFILE '/tmp/item_proto.txt'
FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\n';
```

### Step 3 — Client Binary Proto

The client reads `item_proto` as a **binary packed file**, not the SQL table. Generate the client proto file using the proto packer tool:

```bash
./proto_packer item_proto.txt item_proto  # produces item_proto (binary)
```

Place the binary file in:
```
client-bin/assets/item_proto
```

> **Critical:** If the server's item_proto and client's item_proto are out of sync, the client will show wrong icons, names, or stats — and may kick the player with a CRC mismatch error.

### Step 4 — Item Icon and Model

1. Create the icon (`.tga` atlas + `.sub` file) — see [guide-Asset-Pipeline](guide-Asset-Pipeline).
2. Create or reuse the 3D model (`.gr2`) in the correct path.
3. The `icon_num` field in `item_proto` points to the icon VNUM (same as item VNUM by convention).
4. The `model_num` field points to the model VNUM.

### Step 5 — Restart db Process

The `db` process caches proto tables at startup. After changing `item_proto.txt`, restart `db` (and then `game`, since game receives proto at connect):

```bash
./stop.sh && ./start.sh
```

---

## 2. Adding a New Mob — Full Workflow

The workflow mirrors item_proto:

### Step 1 — Server SQL

```sql
INSERT INTO mob_proto (
    vnum, name, locale_name, type, rank,
    battle_type, level, size, ai_flag,
    mount_capacity, race_flag, immune_flag,
    emp, folder, st, dx, ht, iq,
    damage_min, damage_max, max_hp,
    regen_cycle, regen_percent, gold_min, gold_max,
    exp, def, attack_speed, move_speed,
    aggressive_hp_pct, aggressive_sight, attack_range,
    drop_item_group, resurrection_vnum, enchant_curse,
    enchant_slow, enchant_poison, enchant_stun,
    enchant_critical, enchant_penetrate,
    resist_sword, resist_twohand, resist_dagger,
    resist_bell, resist_fan, resist_bow,
    resist_fire, resist_elect, resist_magic,
    resist_wind, resist_poison, dam_multiply,
    summon_vnum, drain_sp, mob_color
) VALUES (
    101, 'Wolf', 'Wolf', 1, 0,
    0, 5, 1, 0,
    0, 1, 0,
    0, 'npc/', 8, 8, 8, 5,
    8, 12, 500,
    4, 50, 10, 50,
    30, 10, 110, 100,
    50, 300, 200,
    0, 0, 0,
    0, 0, 0,
    0, 0,
    0, 0, 0,
    0, 0, 0,
    0, 0, 0,
    0, 0, 1.0,
    0, 0, 0
);
```

### Step 2 — Export and Pack

Same process as item_proto — export to `mob_proto.txt`, pack to binary, place in `client-bin/assets/mob_proto`.

### Step 3 — Spawn the Mob

Add a spawn entry in the map's `regen.txt` (server-side):
```
# type  vnum    x       y       dir  count  regen_cycle  regen_percent
m       101     412800  268800  0    5      10           100
```

See [topic-Map-World-System](topic-Map-World-System) for the full regen.txt format.

---

## 3. Vnum Ranges

Vnum (Virtual Number) is the unique numeric ID for every item and mob. The following ranges are conventions in vanilla Metin2 and respected by Rework v3:

### Item Vnum Ranges

| Range | Category |
|-------|----------|
| 1 – 9999 | Weapons (tier 1–5 by type) |
| 10000 – 19999 | Armors |
| 20000 – 29999 | Helmets |
| 30000 – 34999 | Shields |
| 35000 – 39999 | Wristguards |
| 40000 – 44999 | Necklaces |
| 45000 – 49999 | Earrings |
| 50000 – 54999 | Boots/Shoes |
| 55000 – 59999 | Belts |
| 60000 – 69999 | Use items (potions, scrolls, etc.) |
| 70000 – 79999 | Rods/etc. |
| 80000 – 89999 | Metin stones |
| 90000 – 99999 | Quest/special items |
| 190000+ | Dragon Soul items |
| 700000+ | Costume items |
| **500000 – 599999** | **Recommended free range for Rework custom items** |

### Mob Vnum Ranges

| Range | Category |
|-------|----------|
| 1 – 999 | Field monsters |
| 1000 – 1999 | Boss monsters |
| 2000 – 2999 | Stone/environment entities |
| 3000 – 3999 | NPCs |
| 4000 – 4999 | Dungeon monsters |
| 5000 – 5999 | Warp/portal entities |
| 20000 – 29999 | Pet/mount entities |
| **50000 – 59999** | **Recommended free range for Rework custom mobs** |

> Always check `VnumHelper.h` in `server-src/src/common/` for any vnum range macros before using a new range.

---

## 4. Proto Sync Checklist

Use this checklist every time you add or modify a proto entry:

- [ ] Row inserted/updated in SQL database
- [ ] `item_proto.txt` / `mob_proto.txt` re-exported from SQL
- [ ] Client binary proto file regenerated with proto packer
- [ ] Binary proto placed in `client-bin/assets/`
- [ ] Icon `.sub` and atlas `.tga` created (items only)
- [ ] Model `.gr2` placed in correct path (if new model)
- [ ] `db` process restarted
- [ ] `game` process restarted (receives new proto at connect)
- [ ] Client tested with new proto file

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `src/common/tables.h` | server-src | `TItemTable`, `TMobTable` struct definitions |
| `src/common/length.h` | server-src | `EItemType`, `EApplyTypes`, `EWearPositions` enums |
| `src/common/item_length.h` | server-src | Socket/attr count constants |
| `src/common/VnumHelper.h` | server-src | Vnum range helper macros |
| `src/db/ProtoReader.h/.cpp` | server-src | Loads `item_proto.txt`/`mob_proto.txt` CSVs into table vectors |
| `src/db/ClientManagerBoot.cpp` | server-src | `InitializeTables()` — boots proto into memory and broadcasts via DG_BOOT |
| `assets/item_proto` | client-bin | Client-side binary item proto file |
| `assets/mob_proto` | client-bin | Client-side binary mob proto file |
