# Guide: Economy Systems (Refine, Cube, Shops)

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [What are item_proto and mob_proto?](concept-proto)
> - [What is a vnum?](concept-vnum)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How to configure item upgrades via `refine_proto`, define crafting recipes via `cube.txt`, and create custom-currency NPC shops.

## Prerequisites

- Familiarity with `item_proto` and the item vnum convention — see [Item System](topic-Item-System).
- Basic understanding of the game and db server roles — see [server-src-game](server-src-game) and [server-src-db](server-src-db).
- Access to a running MariaDB instance with the Metin2 schema.
- Quest scripting knowledge for custom-currency shops (Lua-based quest scripts).

---

## Overview

The Metin2 economy is driven by three inter-related systems:

| System | Config location | Server component |
|--------|----------------|-----------------|
| **Refine / Upgrade** | `refine_proto` DB table + `item_proto` fields | `server-src/game/refine.cpp` |
| **Cube (Crafting)** | `cube.txt` flat file | `server-src/game/cube.cpp` |
| **NPC Shops** | `shop_item` DB table + optional quest script | `server-src/game/shop.cpp` |

All three systems share a common pattern: static data is loaded at server startup and referenced by item vnums. Refine probability formulas can use `CPoly` from [server-src-libpoly](server-src-libpoly) for complex expressions.

---

## 1. Refine / Upgrade System

### How it works

Each item in `item_proto` that can be upgraded carries two fields:

| `item_proto` field | Type | Meaning |
|--------------------|------|---------|
| `dwRefinedVnum` | `DWORD` | Vnum of the next upgrade tier; `0` = already at maximum |
| `wRefineSet` | `WORD` | Row ID in the `refine_proto` table that lists materials and cost |

When a player attempts to upgrade an item, the server:
1. Reads `wRefineSet` from the item prototype.
2. Looks up that row in `refine_proto` for materials, yang cost, and probability.
3. Checks the player's inventory for every required material.
4. Deducts yang and consumes materials.
5. Rolls `rand() % 100 < prob` for success.
6. On success: replaces the item's vnum with `dwRefinedVnum` (the same `CItem` object, new vnum).
7. Sends `GC_REFINE_INFORMATION` to the client.

### The `refine_proto` table

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

```sql
CREATE TABLE refine_proto (
    id          SMALLINT UNSIGNED NOT NULL,   -- matches item_proto.wRefineSet
    cost        INT UNSIGNED NOT NULL,         -- yang cost deducted on attempt
    prob        TINYINT UNSIGNED NOT NULL,     -- success chance: 0-100 (percent)
    -- up to 5 material slots:
    vnum0       INT UNSIGNED NOT NULL DEFAULT 0,
    count0      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    vnum1       INT UNSIGNED NOT NULL DEFAULT 0,
    count1      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    vnum2       INT UNSIGNED NOT NULL DEFAULT 0,
    count2      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    vnum3       INT UNSIGNED NOT NULL DEFAULT 0,
    count3      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    vnum4       INT UNSIGNED NOT NULL DEFAULT 0,
    count4      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
);
```

Field details:

| Field | Notes |
|-------|-------|
| `id` | Must match `wRefineSet` in `item_proto`. One `id` can be shared by multiple items that all share the same upgrade cost and materials. |
| `cost` | Yang deducted before the success roll. Deducted even on failure. |
| `prob` | Integer percent. `100` = always succeeds. `50` = 50% chance. |
| `vnumN` / `countN` | Vnum and quantity of a required material. Unused slots must be `0`. |

### Vnum convention for upgrade tiers

By vanilla convention, upgrade tiers are sequential vnums:

```
Base item (+0):  vnum = X      (e.g., 1  = Long Sword +0)
+1 tier:         vnum = X+1    (e.g., 2  = Long Sword +1)
+2 tier:         vnum = X+2    (e.g., 3  = Long Sword +2)
...
+9 tier:         vnum = X+9    (e.g., 10 = Long Sword +9)
```

`dwRefinedVnum` simply points to the next entry. Setting it to `0` on the highest tier tells the server no further refinement is possible.

---

## Step-by-Step: Adding a New Upgrade Path (Weapon +5 to +6)

**Scenario:** You have a weapon at vnum `1005` (+5) and want it to upgrade to vnum `1006` (+6) using 1x Iron Ore (vnum `30001`) and 5x Leather (vnum `30010`), costing 50,000 yang at 40% success.

**Step 1 — Ensure the +6 item exists in `item_proto`.**

Add (or verify) a row for vnum `1006` in `item_proto`. Its `wRefineSet` should point to whatever the next upgrade step is (or `dwRefinedVnum = 0` if it is the max tier).

**Step 2 — Set `dwRefinedVnum` on the +5 item.**

Update `item_proto` so that the row for vnum `1005` has:
- `dwRefinedVnum = 1006`
- `wRefineSet = <new_refine_id>` (pick an unused ID, e.g., `501`)

**Step 3 — Insert a row into `refine_proto`.**

```sql
INSERT INTO refine_proto
    (id,  cost,   prob, vnum0, count0, vnum1, count1)
VALUES
    (501, 50000,  40,   30001, 1,      30010, 5);
```

**Step 4 — Restart the db and game servers.**

The `db` process loads `refine_proto` at startup during `InitializeTables()` and distributes it to game servers via `QUERY_BOOT`. A live reload is not available in vanilla; a full restart is required.

**Step 5 — Test at a Blacksmith NPC.**

Right-click the +5 weapon at the blacksmith. Verify the UI shows Iron Ore x1 and Leather x5 as materials, and that the yang cost is 50,000.

---

## Common Mistakes: Refine

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `wRefineSet` in `item_proto` points to a non-existent `refine_proto.id` | Upgrade option does not appear at blacksmith | Add the corresponding row to `refine_proto` |
| `dwRefinedVnum` is `0` but upgrade should be possible | Blacksmith rejects the item as already at max level | Set `dwRefinedVnum` to the correct next-tier vnum |
| `prob` set to `0` | Upgrade always fails silently | Use a value between `1` and `100` |
| Material vnum does not exist in `item_proto` | Server logs an error; client may show empty material slot | Ensure all `vnumN` values are valid item vnums |
| Forgetting to restart after editing `refine_proto` | Old data is still in use | The db server caches `refine_proto` at boot; a restart is mandatory |

---

## 2. Cube (Crafting) System

### Overview

The Cube system allows players to combine items at a special Cube NPC to produce a result item. Recipes are defined in a plain-text file (`cube.txt`) rather than in the database. The server loads this file at startup through `cube.cpp`.

### `cube.txt` file format

Each recipe is a block starting with `CUBE` and ending with `END`:

```
CUBE <result_vnum> <result_count>
MATERIAL <ingredient_vnum> <ingredient_count>
MATERIAL <ingredient_vnum> <ingredient_count>
...
GOLD <gold_cost>
PROB <probability_percent>
END
```

| Keyword | Arguments | Notes |
|---------|-----------|-------|
| `CUBE` | `result_vnum result_count` | Opens a recipe block. `result_count` is how many of the result item are produced on success. |
| `MATERIAL` | `vnum count` | One ingredient line. Repeat for each ingredient. |
| `GOLD` | `amount` | Yang cost consumed before the success roll. |
| `PROB` | `0-100` | Success probability in percent. `100` = guaranteed success. |
| `END` | (none) | Closes the recipe block. |

### Example: Simple guaranteed recipe

Combine 3x Iron Ore (vnum `30001`) and 2x Coal (vnum `30002`) for 10,000 yang to craft 1x Steel Ingot (vnum `30050`, guaranteed):

```
CUBE 30050 1
MATERIAL 30001 3
MATERIAL 30002 2
GOLD 10000
PROB 100
END
```

### Example: Probabilistic recipe

Craft 1x Magic Sword (vnum `5001`) from 1x Sword Base (vnum `5000`) and 5x Mana Crystal (vnum `40010`), costing 100,000 yang with a 30% chance:

```
CUBE 5001 1
MATERIAL 5000 1
MATERIAL 40010 5
GOLD 100000
PROB 30
END
```

On failure the materials and gold are still consumed. There is no automatic refund in vanilla.

### Multiple recipes producing the same item

Define separate `CUBE ... END` blocks for each distinct input combination. The server registers all blocks independently.

### Where `cube.txt` lives and how it is loaded

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

The file is typically placed in the game server's data directory alongside other flat-file configs. The `cube.cpp` loader is called during the game server's initialisation sequence. The exact path is configured in `game.conf` or relative to the server binary — check `cube.cpp` for the `fopen` call to confirm the path in your build.

---

## Step-by-Step: Adding a New Cube Recipe

**Step 1 — Verify all vnums exist.**

Confirm that both result and material vnums are present in `item_proto`. An invalid vnum causes a silent failure at runtime.

**Step 2 — Edit `cube.txt`.**

Append a new block following the format above. Ensure there is no trailing whitespace on the `END` line and that each `CUBE` block is properly closed.

**Step 3 — Restart the game server.**

`cube.txt` is read once at startup; there is no live reload in vanilla.

**Step 4 — Test at a Cube NPC.**

Place the materials in your inventory, open the Cube interface, and verify the recipe appears and can be executed.

---

## Common Mistakes: Cube

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Wrong material vnum (typo or non-existent) | Recipe never activates; no error shown to player | Double-check all `MATERIAL` vnums against `item_proto` |
| `PROB` set to `0` | Cube interaction always fails | Set `PROB` to a value of `1` or higher |
| Missing `END` at block close | Parser silently skips or merges recipes | Ensure every `CUBE` has a matching `END` |
| `cube.txt` path mismatch | Server logs file-not-found; no recipes are loaded | Verify the path your build expects (see `cube.cpp`) |
| Editing `cube.txt` without restarting | Changes not reflected in-game | Restart the game server after any edit |

---

## 3. Custom Currency NPC Shops

### Standard NPC shop architecture

A standard NPC shop is linked to a mob via the `mob_proto` table (the `shop_id` field). The items for sale are rows in the `shop_item` table:

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

```sql
-- shop_item table (key fields)
shop_id     SMALLINT UNSIGNED  -- foreign key to the shop definition table
item_vnum   INT UNSIGNED       -- vnum of the item for sale
item_count  TINYINT UNSIGNED   -- stack size sold per purchase (usually 1)
price       INT UNSIGNED       -- yang cost per purchase
```

The `shop.cpp` module handles the buy/sell packet flow. The `price` field is always interpreted as **yang (gold)**. There is no built-in field for an alternate currency.

### Option A: Quest script workaround (token shop)

The simplest approach for a custom-currency shop is to bypass the shop system entirely and implement the exchange logic inside a quest script attached to the NPC. This requires no C++ changes.

**How it works:**

1. Player talks to the NPC (`QUEST_CLICK_EVENT`).
2. The quest presents a menu of items.
3. On selection, the script checks the player's token count, removes the token item, and gives the result item.

**Example quest script (token shop):**

```lua
-- Token Shop NPC (mob vnum 9001)
-- Token item vnum: 50001 (e.g., "Event Token")
quest token_shop begin
    state start begin
        when 9001.chat."[Token Shop] Browse items" begin
            say_title("Token Shop")
            local n = select(
                "Iron Sword +3 (3 tokens)",
                "Health Potion x10 (1 token)",
                "Leave"
            )

            if n == 1 then
                -- Iron Sword +3 costs 3 tokens
                if pc.count_item(50001) >= 3 then
                    pc.remove_item(50001, 3)
                    pc.give_item2(1003, 1)   -- Iron Sword +3
                    say("You received Iron Sword +3!")
                else
                    say("You do not have enough tokens.\nYou need 3 Event Tokens.")
                end
            elseif n == 2 then
                -- Health Potion x10 costs 1 token
                if pc.count_item(50001) >= 1 then
                    pc.remove_item(50001, 1)
                    pc.give_item2(27001, 10) -- Health Potion
                    say("You received 10 Health Potions!")
                else
                    say("You do not have enough tokens.\nYou need 1 Event Token.")
                end
            end
        end
    end
end
```

Key quest API functions used:

| Function | Description |
|----------|-------------|
| `pc.count_item(vnum)` | Returns how many of an item the player currently carries |
| `pc.remove_item(vnum, count)` | Removes `count` copies of the item from inventory |
| `pc.give_item2(vnum, count)` | Gives `count` copies of the item to the player |
| `select(...)` | Presents a choice menu; returns the selected index (1-based) |

### Option B: C++ shop modification

For a fully integrated shop UI (price shown in tokens, not yang), you must modify `shop.cpp` to accept a different currency. The relevant function is the buy handler, which calls `PointChange(POINT_GOLD, -price)` to deduct yang.

To use a custom currency instead:
- Add a currency type field to `shop_item` (or use a separate table).
- In the buy handler (`shop.cpp`), branch on the currency type: instead of deducting yang, call `RemoveSpecifyItem(currency_vnum, price)`.
- Update the client-side shop UI (`uishop.py`) to display the token icon and count rather than yang.

This approach provides the best user experience but requires rebuilding the game server and client.

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files. The exact function and packet names in `shop.cpp` may differ in Rework v3.

---

## Step-by-Step: Creating a Quest-Based Token Shop

**Step 1 — Define the token item in `item_proto`.**

Add an item with type `ITEM_TYPE_QUEST` (value `18`) or `ITEM_TYPE_USE` so it cannot be freely dropped or traded unless intended. Note its vnum (e.g., `50001`).

**Step 2 — Define the NPC in `mob_proto`.**

Add or identify the NPC mob vnum (e.g., `9001`). Set its `type` to `CHAR_TYPE_NPC`. No `shop_id` is needed for a quest-only shop.

**Step 3 — Write the quest script.**

Create the quest file in your quest source directory (e.g., `quest/token_shop.quest`). Follow the example script above, substituting your vnums.

**Step 4 — Compile and deploy the quest.**

Run the quest compiler (`qc`) against the quest source file. Place the compiled output in the game server's quest directory. Restart or reload quests.

**Step 5 — Spawn the NPC on a map.**

Add the NPC to a regen file (`.regen`) or spawn it via a GM command to test. Confirm the chat option appears when the player clicks the NPC.

**Step 6 — Test the full flow.**

Give yourself the token item via a GM command, then attempt each shop purchase. Verify that item counts decrease correctly and that the result items are delivered.

---

## Common Mistakes: Custom Currency Shops

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Using `pc.remove_item` before checking count | Player loses tokens without receiving the item if inventory is full | Always check `pc.count_item` before calling `pc.remove_item` |
| `pc.give_item2` fails silently when inventory is full | Player loses tokens but receives nothing | Check `pc.is_full_inven()` before giving, or refund the tokens on failure |
| Token vnum not in `item_proto` | `pc.count_item` always returns `0` | Verify the vnum exists and is loaded by the db server |
| Quest not reloaded after edit | Old quest logic still runs | Restart the game server or use the quest reload command |
| NPC mob has a `shop_id` that opens the standard shop | Standard shop UI opens instead of quest dialogue | Remove or zero out `shop_id` on the NPC in `mob_proto` |

---

## Key Files

| Path | Repository | Role |
|------|-----------|------|
| `server-src/game/refine.h` | game | `CRefineManager` declaration: upgrade flow, material validation, success roll |
| `server-src/game/refine.cpp` | game | `CRefineManager` implementation; reads `refine_proto` data distributed from db at boot |
| `server-src/game/cube.h` | game | Cube system declarations |
| `server-src/game/cube.cpp` | game | `cube.txt` parser and recipe execution logic |
| `server-src/game/shop.h` | game | `CShop` / `CShopManager` declarations |
| `server-src/game/shop.cpp` | game | NPC shop buy/sell handler; `POINT_GOLD` deduction per purchase |
| `server-src/game/char_item.cpp` | game | `CCharacter::RemoveSpecifyItem`, `CountSpecifyItem`, `AutoGiveItem` used by shop and quest systems |
| `server-src/common/item.h` | common | `TItemTable` struct: `dwRefinedVnum` and `wRefineSet` field definitions |
| `server-src/db/ClientManagerBoot.cpp` | db | `InitializeTables()`: loads `refine_proto`, `item_proto`, and `shop_item` tables at startup |
| `cube.txt` | game data dir | Flat-file crafting recipe definitions loaded by `cube.cpp` |
| `item_proto` (DB table) | DB | Item definitions including `dwRefinedVnum` and `wRefineSet` fields |
| `refine_proto` (DB table) | DB | Upgrade material lists, yang costs, and success probabilities |
| `shop_item` (DB table) | DB | NPC shop inventories with yang prices |

---

*Page generated 2026-03-19. Based on Metin2 Rework v3 source at commit `5d2878d`.*
