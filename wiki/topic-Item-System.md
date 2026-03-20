# Item System

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [What is a vnum?](concept-vnum)
> - [What are item_proto and mob_proto?](concept-proto)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> **Scope:** Server (`server-src/game/`, `server-src/common/`) and client (`client-src/GameLib/`, `client-src/PythonModules/`, `client-bin/assets/root/`).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Item Data Structure](#2-item-data-structure)
3. [Item Types & Subtypes](#3-item-types--subtypes)
4. [Item Attributes System](#4-item-attributes-system)
5. [Inventory System](#5-inventory-system)
6. [Item Operations](#6-item-operations)
7. [Refine / Upgrade System](#7-refine--upgrade-system)
8. [Client-Server Sync](#8-client-server-sync)
9. [Key Files](#9-key-files)

---

## 1. Overview

Every tangible object a player interacts with — from a sword to a quest scroll — is an **item**. Items live in one of three states at any point in time:

```
[Definition in item_proto]
        │
        ▼
  ITEM_MANAGER::CreateItem()        ← spawned on map or given to player
        │
        ├──► Ground (CItem in world, visible as ground object)
        │         pickup → CCharacter::PickupItem()
        │
        ├──► Inventory (CItem owned by CCharacter, stored in DB)
        │         equip  → CCharacter::WearItem()
        │         use    → CItem::UseItem()  /  quest hooks
        │         move   → CCharacter::MoveItem()
        │         drop   → CCharacter::DropItem()
        │
        └──► Destroyed (ITEM_MANAGER::DestroyItem())
                  triggered by use, drop, deletion, or server shutdown
```

### Lifecycle summary

| Stage | Server trigger | Client notification |
|-------|---------------|---------------------|
| **Creation** | `ITEM_MANAGER::CreateItem(vnum, count)` | `GC_ITEM_SET` (for inventory) / ground entity spawn |
| **Ground spawn** | `CItem::AddToGround()` | Ground object create packet |
| **Pickup** | `CCharacter::PickupItem()` | `GC_ITEM_SET` |
| **Move in inventory** | `CCharacter::MoveItem(src, dst, count)` | `GC_ITEM_SET` (new cell) + `GC_ITEM_DEL` (old cell) |
| **Equip** | `CCharacter::WearItem(cell)` | `GC_ITEM_SET` (wear cell) + `GC_CHARACTER_UPDATE` |
| **Unequip** | `CCharacter::UnWearItem(wCell)` | `GC_ITEM_SET` (inventory cell) |
| **Use** | `CItem::Use()` / quest callback | varies by item type |
| **Drop** | `CCharacter::DropItem(cell, count)` | `GC_ITEM_DEL` |
| **Destroy** | `ITEM_MANAGER::DestroyItem(pItem)` | `GC_ITEM_DEL` (if previously visible) |

---

## 2. Item Data Structure

### 2.1 Static definition — `TItemTable` (`server-src/common/item.h`)

Every unique item kind is described by one row in the `item_proto` table, loaded at startup into `ITEM_MANAGER`'s prototype cache.

```cpp
struct TItemTable
{
    DWORD   dwVnum;                    // unique item number
    DWORD   dwVnumRange;               // vnum range (for vnum groups)
    char    szName[ITEM_NAME_MAX_LEN]; // display name
    char    szLocaleName[ITEM_NAME_MAX_LEN];
    BYTE    bType;                     // EItemType
    BYTE    bSubType;                  // EItemWeaponType / EItemArmorType / …
    BYTE    bWeight;
    BYTE    bSize;                     // inventory cell size (1 or 2)
    DWORD   dwAntiFlags;               // EItemAntiFlag bitmask
    DWORD   dwFlags;                   // EItemFlag bitmask
    DWORD   dwWearFlags;               // EWearFlag — which slot it may occupy
    DWORD   dwImmuneFlag;
    DWORD   dwGold;                    // sell price
    DWORD   dwShopBuyPrice;
    TItemApply aApplies[ITEM_APPLY_MAX]; // up to 3 permanent stat bonuses
    long    alValues[ITEM_VALUES_MAX_NUM]; // 6 generic value slots
    TItemLimit aLimits[ITEM_LIMIT_MAX];   // level / gender / etc. restrictions
    BYTE    bGMAddItemGroupIndex;
    DWORD   dwRefinedVnum;             // vnum of next upgrade tier
    WORD    wRefineSet;                // refine table index
    BYTE    bAlterToMagicItemPct;
    BYTE    bSpecular;
    BYTE    bGainSocketPct;
    short   sAddonType;
};
```

Key fields at a glance:

| Field | Type | Notes |
|-------|------|-------|
| `dwVnum` | `DWORD` | Primary key, e.g. `1` = Sword +0, `2` = Sword +1 |
| `bType` | `BYTE` | `EItemType` — weapon, armor, etc. |
| `bSubType` | `BYTE` | Depends on `bType` |
| `dwWearFlags` | `DWORD` | Bitmask of `EWearFlag`; controls equip slots |
| `aApplies[3]` | struct | Up to 3 fixed stat bonuses (apply type + value) |
| `alValues[6]` | `long[6]` | Type-specific data (damage range, duration, …) |
| `dwRefinedVnum` | `DWORD` | Points to the +1 tier; `0` = max level |
| `wRefineSet` | `WORD` | Row in `refine_proto` table |

### 2.2 Live instance — `CItem` (`server-src/game/item.h`)

Each item **instance** on the server is a `CItem` object managed by `ITEM_MANAGER`.

```cpp
class CItem
{
public:
    // --- identity ---
    DWORD       m_dwVnum;           // prototype reference
    DWORD       m_dwID;             // unique DB id (0 for unlinked/ground)

    // --- stack ---
    DWORD       m_dwCount;          // stack size (1 for non-stackable)

    // --- sockets (3 slots) ---
    long        m_alSockets[ITEM_SOCKET_MAX_NUM];   // ITEM_SOCKET_MAX_NUM = 3

    // --- random attributes (7 slots) ---
    TPlayerItemAttribute m_aAttr[ITEM_ATTRIBUTE_MAX_NUM]; // ITEM_ATTRIBUTE_MAX_NUM = 7

    // --- placement ---
    CCharacter* m_pOwner;           // null if on ground
    BYTE        m_bCell;            // inventory position or wear slot index
    bool        m_bEquipped;

    // --- flags (runtime) ---
    DWORD       m_dwLastOwnerPID;
    bool        m_bExchanging;
};
```

Socket array meaning by item type:

| Index | Weapon | Armor | General use |
|-------|--------|-------|-------------|
| `[0]` | Socket 1 upgrade stone vnum | Socket 1 upgrade stone vnum | Type-specific |
| `[1]` | Socket 2 upgrade stone vnum | Socket 2 upgrade stone vnum | Type-specific |
| `[2]` | Socket 3 upgrade stone vnum | Socket 3 upgrade stone vnum | Type-specific |

For non-socketed items the slots store item-type-specific runtime values (e.g. remaining durability, charge count, time limits as Unix timestamps).

### 2.3 Network transfer struct — `TItemData` / `TPlayerItem`

When item data is sent over the wire it is packed into a compact struct:

```cpp
struct TPlayerItem
{
    DWORD   id;
    TItemPos pos;                          // window + cell
    DWORD   vnum;
    DWORD   count;
    long    alSockets[ITEM_SOCKET_MAX_NUM];
    TPlayerItemAttribute aAttr[ITEM_ATTRIBUTE_MAX_NUM];
};
```

`TItemPos` contains a `window` byte (`INVENTORY`, `EQUIPMENT`, `DRAGON_SOUL_EQUIPMENT`, …) and a `cell` byte/word.

---

## 3. Item Types & Subtypes

Defined in `server-src/common/item.h` (mirrored in `client-src/GameLib/ItemData.h`).

### 3.1 `EItemType`

| Value | Constant | Description |
|-------|----------|-------------|
| 0 | `ITEM_TYPE_NONE` | Undefined / placeholder |
| 1 | `ITEM_TYPE_WEAPON` | All weapon kinds |
| 2 | `ITEM_TYPE_ARMOR` | Armors, helmets, shields, shoes, … |
| 3 | `ITEM_TYPE_USE` | Consumables and activateable items |
| 4 | `ITEM_TYPE_AUTOUSE` | Auto-use items (potions triggered by HP threshold) |
| 5 | `ITEM_TYPE_MATERIAL` | Crafting / refine materials |
| 6 | `ITEM_TYPE_SPECIAL` | Unique server-specific items |
| 7 | `ITEM_TYPE_TOOL` | Mining picks, fishing rods |
| 8 | `ITEM_TYPE_LOTTERY` | Chance boxes |
| 9 | `ITEM_TYPE_ELK` | In-game currency (Yang) item |
| 10 | `ITEM_TYPE_METIN` | Metin stone |
| 11 | `ITEM_TYPE_CONTAINER` | Bags / chests |
| 12 | `ITEM_TYPE_FISH` | Fishing result items |
| 13 | `ITEM_TYPE_ROD` | Fishing rods (also TOOL) |
| 14 | `ITEM_TYPE_RESOURCE` | Gathered resources |
| 15 | `ITEM_TYPE_CAMPFIRE` | Camp fire placeable |
| 16 | `ITEM_TYPE_UNIQUE` | Unique aura items |
| 17 | `ITEM_TYPE_SKILLBOOK` | Skill books |
| 18 | `ITEM_TYPE_QUEST` | Quest items — cannot be traded/dropped |
| 19 | `ITEM_TYPE_POLYMORPH` | Polymorph marbles |
| 20 | `ITEM_TYPE_TREASURE_BOX` | Treasure boxes |
| 21 | `ITEM_TYPE_TREASURE_KEY` | Keys for treasure boxes |
| 22 | `ITEM_TYPE_SKILLFORGET` | Skill reset books |
| 23 | `ITEM_TYPE_GIFTBOX` | Gift boxes |
| 24 | `ITEM_TYPE_PICK` | Mining picks |
| 25 | `ITEM_TYPE_HAIR` | Hairstyles |
| 26 | `ITEM_TYPE_MEDIUM` | Medium (shaman attribute items) |
| 27 | `ITEM_TYPE_COSTUME` | Visual costume overlays |
| 28 | `ITEM_TYPE_DS` | Dragon Soul stones |
| 29 | `ITEM_TYPE_SPECIAL_DS` | Special Dragon Soul |
| 30 | `ITEM_TYPE_EXTRACT` | Extraction tools |
| 31 | `ITEM_TYPE_SECONDARY_COIN` | Secondary currency |
| 32 | `ITEM_TYPE_RING` | Ring slot items |
| 33 | `ITEM_TYPE_BELT` | Belt slot items |

### 3.2 Weapon subtypes (`EItemWeaponType`)

| Value | Constant | Slot |
|-------|----------|------|
| 0 | `WEAPON_SWORD` | One-hand sword |
| 1 | `WEAPON_DAGGER` | Dagger (Assassin) |
| 2 | `WEAPON_BOW` | Bow + arrows |
| 3 | `WEAPON_TWO_HANDED` | Two-hand sword |
| 4 | `WEAPON_BELL` | Shaman bell |
| 5 | `WEAPON_FAN` | Shaman fan |
| 6 | `WEAPON_ARROW` | Arrow (ammo, not directly equippable) |
| 7 | `WEAPON_CLAW` | Lycan claw |
| 8 | `WEAPON_MOUNT_SPEAR` | Mount lance |

### 3.3 Armor subtypes (`EItemArmorType`)

| Value | Constant | Wear slot |
|-------|----------|-----------|
| 0 | `ARMOR_BODY` | Body armor (`WEAR_BODY`) |
| 1 | `ARMOR_HEAD` | Helmet (`WEAR_HEAD`) |
| 2 | `ARMOR_SHIELD` | Shield (`WEAR_SHIELD`) |
| 3 | `ARMOR_WRIST` | Bracelet (`WEAR_WRIST`) |
| 4 | `ARMOR_FOOTS` | Shoes (`WEAR_FOOTS`) |
| 5 | `ARMOR_NECK` | Necklace (`WEAR_NECK`) |
| 6 | `ARMOR_EAR` | Earring (`WEAR_EAR`) |

### 3.4 Use subtypes (`EItemUseType`)

| Value | Constant | Behavior |
|-------|----------|----------|
| 0 | `USE_POTION` | Restore HP/MP by fixed value |
| 1 | `USE_TALISMAN` | Teleport item |
| 2 | `USE_TUNING` | Socket tuning marble |
| 3 | `USE_MOVE` | Move item (transfer stone) |
| 4 | `USE_TREASURE_BOX` | Open a treasure box |
| 5 | `USE_MONEYBAG` | Drop Yang coins |
| 6 | `USE_BAIT` | Fishing bait |
| 7 | `USE_ABILITY_UP` | Temporary stat boost |
| 8 | `USE_AFFECT` | Apply a timed affect |
| 9 | `USE_CREATE_STONE` | Create a metin socket stone |
| 10 | `USE_SPECIAL` | Custom use handler |
| 11 | `USE_POTION_NODELAY` | Instant potion (no cooldown) |
| 12 | `USE_CLEAR` | Remove negative affects |
| 13 | `USE_INVISIBILITY` | Stealth item |
| 14 | `USE_DETACHMENT` | Remove socket stone |
| 15 | `USE_BUCKET` | Water bucket (crafting) |
| 16 | `USE_POTION_CONTINUE` | Over-time HP/MP restore |
| 17 | `USE_CLEAN_SOCKET` | Clean item sockets |
| 18 | `USE_CHANGE_ATTRIBUTE` | Re-roll random bonus |
| 19 | `USE_ADD_ATTRIBUTE` | Add a random bonus slot |
| 20 | `USE_ADD_ATTRIBUTE2` | Add a second bonus tier |
| 21 | `USE_RECIPE` | Craft from recipe scroll |
| 22 | `USE_BLEND` | Blend potion (mix effects) |
| 23 | `USE_CHANGE_ATTRIBUTE2` | Re-roll a specific bonus slot |
| 24 | `USE_GUARD` | Summon a guard NPC |
| 25 | `USE_EMOTION_MASK` | Costume emotion mask |

---

## 4. Item Attributes System

### 4.1 Fixed applies (from proto)

`TItemTable::aApplies[ITEM_APPLY_MAX]` (size 3) holds static bonuses that are always present on every instance of that vnum. Each entry is:

```cpp
struct TItemApply
{
    WORD    wType;   // EPointType apply type
    long    lValue;  // bonus magnitude
};
```

### 4.2 Random attributes (per-instance bonus slots)

`CItem::m_aAttr[ITEM_ATTRIBUTE_MAX_NUM]` (size **7**) stores per-instance random bonuses added through enchanting:

```cpp
struct TPlayerItemAttribute
{
    WORD    wType;   // EPointType
    short   sValue;  // magnitude (signed)
};
```

Slots 0–3 are "normal" bonus slots (yellow text in client). Slots 4–6 are "rare/extra" bonus slots added via special scrolls (blue text). A zero `wType` means the slot is empty.

### 4.3 Apply types (`EPointType`) — common values

| Value | Constant | Effect |
|-------|----------|--------|
| 1 | `POINT_MAX_HP` | Max HP +N |
| 2 | `POINT_MAX_SP` | Max Mana +N |
| 3 | `POINT_HT` | Constitution (HTH) +N |
| 4 | `POINT_IQ` | Intelligence +N |
| 5 | `POINT_ST` | Strength +N |
| 6 | `POINT_DX` | Dexterity +N |
| 11 | `POINT_ATT_SPEED` | Attack speed +N% |
| 12 | `POINT_MOV_SPEED` | Movement speed +N% |
| 13 | `POINT_CAST_SPEED` | Cast speed +N% |
| 16 | `POINT_ATT_GRADE_BONUS` | Attack bonus +N |
| 17 | `POINT_DEF_GRADE_BONUS` | Defence bonus +N |
| 18 | `POINT_MAGIC_ATT_GRADE` | Magic attack +N |
| 19 | `POINT_MAGIC_DEF_GRADE` | Magic defence +N |
| 21 | `POINT_CRITICAL_PCT` | Critical hit chance +N% |
| 22 | `POINT_PENETRATE_PCT` | Piercing chance +N% |
| 23 | `POINT_ATTBONUS_HUMAN` | Bonus vs. humans +N% |
| 35 | `POINT_RESIST_SWORD` | Sword resistance +N% |
| 40 | `POINT_RESIST_MAGIC` | Magic resistance +N% |
| 71 | `POINT_BLEEDING_PCT` | Bleed chance +N% |

### 4.4 Socket system

Sockets are unlocked on weapons and armors and filled with **upgrade stones** (메틴석, vnum range typically 28000–29000). The socket array (`m_alSockets[3]`) stores the **vnum of the stone** currently inserted, or `0` (empty socket), or `-1` (socket not yet unlocked).

Socket interaction flow:

```
Player uses socket stone on item
    │
    ▼
CCharacter::UseItem() → ITEM_TYPE_USE / USE_TUNING
    │
    ├── checks item has open socket slot (alSockets[n] == 0)
    ├── writes stone vnum into alSockets[n]
    ├── computes bonus: stone's alValues[0] applied as EPointType from alValues[1]
    └── saves item to DB, sends GC_ITEM_SET to client
```

---

## 5. Inventory System

### 5.1 Inventory windows

The item position is described by two fields: `window` (which container) and `cell` (position within it).

| Window constant | Value | Description |
|----------------|-------|-------------|
| `INVENTORY` | 0 | Main bag (5 tabs × 45 cells = 225 cells, cells 0–224) |
| `EQUIPMENT` | 1 | Wear/equip slots (cells map to `EWearPositions`) |
| `SAFEBOX` | 2 | Bank/safebox storage |
| `MALL` | 3 | Cash shop purchase window |
| `DRAGON_SOUL_EQUIPMENT` | 4 | Dragon Soul equip grid |
| `BELT_INVENTORY` | 5 | Belt quick-slot inventory |

### 5.2 Inventory grid

The main inventory is a **5 × 9** cell grid per tab (45 cells), with 5 tabs giving **225 cells** total (indices 0–224). Items occupying 2 cells (bSize = 2) block a second adjacent cell.

```
Tab 0:  cells  0 – 44
Tab 1:  cells 45 – 89
Tab 2:  cells 90 – 134
Tab 3:  cells 135 – 179
Tab 4:  cells 180 – 224
```

### 5.3 Wear positions (`EWearPositions`)

| Index | Constant | Slot |
|-------|----------|------|
| 0 | `WEAR_BODY` | Body armor |
| 1 | `WEAR_HEAD` | Helmet |
| 2 | `WEAR_FOOTS` | Shoes |
| 3 | `WEAR_WRIST` | Bracelet |
| 4 | `WEAR_WEAPON` | Main weapon |
| 5 | `WEAR_NECK` | Necklace |
| 6 | `WEAR_EAR` | Earring |
| 7 | `WEAR_UNIQUE1` | Unique item slot 1 |
| 8 | `WEAR_UNIQUE2` | Unique item slot 2 |
| 9 | `WEAR_ARROW` | Arrow / ammo |
| 10 | `WEAR_SHIELD` | Shield |
| 11 | `WEAR_ABILITY_UP` | Ability scroll slot |
| 19 | `WEAR_COSTUME_BODY` | Costume body overlay |
| 20 | `WEAR_COSTUME_HAIR` | Costume hair overlay |
| 26 | `WEAR_RING1` | Ring slot 1 |
| 27 | `WEAR_RING2` | Ring slot 2 |
| 28 | `WEAR_BELT` | Belt slot |
| `WEAR_MAX` | 34 | Sentinel |

Wear slots live in the `EQUIPMENT` window with cell index equal to the `EWearPositions` value.

### 5.4 Client inventory UI (`uiinventory.py`)

The Python UI layer (`client-bin/assets/root/uiinventory.py`) maintains a visual grid. Key interactions:

- **Left-click + drag** → calls `playerInst().MoveItem(srcPos, dstPos, count)` → `CG_ITEM_MOVE` packet.
- **Right-click** → calls `playerInst().UseItem(pos)` → `CG_ITEM_USE` or `CG_ITEM_USE_TO_ITEM` packet.
- **Shift+click** → equip/unequip toggle.
- **Alt+click** → drop confirmation → `CG_ITEM_DROP` or `CG_ITEM_DROP2`.

The client's `CPythonItem` (`client-src/PythonModules/PythonItem.cpp`) and `CItemManager` (`client-src/GameLib/ItemManager.cpp`) cache the item prototype data loaded from `item_proto.txt` / `item_proto.epk` at startup.

---

## 6. Item Operations

### 6.1 Pick up

```
Client presses Z / auto-pickup
    │
    ▼ CG_ITEM_PICKUP (item UID on ground)
    │
Server: CCharacter::PickupItem(DWORD dwVID)
    ├── check distance ≤ ITEM_PICKUP_RANGE
    ├── check anti-flag: ANTI_GIVE, ownership timer
    ├── ITEM_MANAGER::MoveItem → place in first free inventory cell
    ├── save to DB (QUERY_ITEM_SAVE)
    └── GC_ITEM_SET → client
```

### 6.2 Drop

```
Client: CG_ITEM_DROP2 {cell, count, x, y}
    │
Server: CCharacter::DropItem(TItemPos, count)
    ├── validates cell, count, anti-flags (ANTI_DROP)
    ├── splits stack if count < total (CItem::Split)
    ├── CItem::RemoveFromCharacter()
    ├── CItem::AddToGround(x, y, map)
    └── GC_ITEM_DEL {cell} → client
        + ground entity appears for nearby players
```

### 6.3 Equip / Unequip

```
CCharacter::WearItem(TItemPos bodyPos)
    ├── look up wear slot from item's dwWearFlags
    ├── if slot occupied: swap items (UnWearItem first)
    ├── validate level/gender/class limits (TItemLimit)
    ├── CItem::SetCell(EQUIPMENT, wearSlot)
    ├── apply fixed aApplies and socket bonuses to character points
    ├── save to DB
    └── GC_ITEM_SET(EQUIPMENT, wearSlot) + GC_CHARACTER_UPDATE

CCharacter::UnWearItem(WORD wCell)
    ├── remove bonus contributions from character points
    ├── find free inventory cell
    ├── CItem::SetCell(INVENTORY, freeCell)
    ├── save to DB
    └── GC_ITEM_SET(INVENTORY, freeCell) + GC_ITEM_DEL(EQUIPMENT, wCell)
```

### 6.4 Use item

```
Client: CG_ITEM_USE {pos}  or  CG_ITEM_USE_TO_ITEM {srcPos, dstPos}
    │
Server: CCharacter::UseItem(TItemPos, TItemPos target)
    ├── dispatch on item bType / bSubType
    ├── ITEM_TYPE_USE:
    │       USE_POTION       → HealHP / HealSP
    │       USE_AFFECT       → AddAffect(type, duration)
    │       USE_TUNING       → socket insert
    │       USE_CHANGE_ATTRIBUTE → re-roll attr
    │       USE_RECIPE       → craft result item
    │       …
    ├── ITEM_TYPE_SKILLBOOK  → LearnSkillByBook()
    ├── ITEM_TYPE_QUEST      → quest_item_use() Lua callback
    └── decrement count / destroy if count == 0
```

### 6.5 Move / split

```
Client: CG_ITEM_MOVE {srcPos, dstPos, count}
    │
Server: CCharacter::MoveItem(src, dst, count)
    ├── if src window == dst window == INVENTORY: simple swap/move
    ├── if count < src.count and dst is empty: split → new CItem
    ├── if dst occupied and same vnum and stackable: merge
    └── GC_ITEM_SET(dst) [+ GC_ITEM_SET(src) for partial / GC_ITEM_DEL(src) for full move]
```

### 6.6 Packet reference

| Direction | Packet | Purpose |
|-----------|--------|---------|
| C→S | `CG_ITEM_USE` | Use item at pos |
| C→S | `CG_ITEM_USE_TO_ITEM` | Use item on another item (e.g., stone on armor) |
| C→S | `CG_ITEM_MOVE` | Move/split item in inventory |
| C→S | `CG_ITEM_DROP` | Drop item (yang value drop) |
| C→S | `CG_ITEM_DROP2` | Drop item with position |
| C→S | `CG_ITEM_PICKUP` | Pick up ground item |
| C→S | `CG_ITEM_TO_SAFEBOX` | Move item to safebox |
| C→S | `CG_ITEM_FROM_SAFEBOX` | Retrieve item from safebox |
| S→C | `GC_ITEM_SET` | Create/update one item slot |
| S→C | `GC_ITEM_DEL` | Remove item from a slot |
| S→C | `GC_ITEM_GROUND_ADD` | Spawn item on ground (for nearby players) |
| S→C | `GC_ITEM_GROUND_DEL` | Remove ground item entity |
| S→C | `GC_ITEM_OWNERSHIP` | Set ownership timer on ground item |

---

## 7. Refine / Upgrade System

Item refinement upgrades a `+N` item to `+(N+1)` (e.g., Sword+3 → Sword+4). The next tier vnum is stored in `TItemTable::dwRefinedVnum` and the material/cost table is in `refine_proto`.

### 7.1 Data tables

```
refine_proto
├── id          → matches TItemTable::wRefineSet
├── cost        → Yang cost
├── prob        → success probability (%)
├── materialN_vnum  (up to 5 material slots)
└── materialN_count
```

### 7.2 Server flow

```
CRefineManager::Refine(pChar, pItem)
    │
    ├── look up refine_proto row by pItem->GetRefineSet()
    ├── verify player has all required materials in inventory
    ├── deduct Yang (pChar->PointChange(POINT_GOLD, -cost))
    ├── consume all material items
    ├── roll success: rand() % 100 < prob
    │       SUCCESS:
    │           pItem->ChangeVnum(dwRefinedVnum)   ← same CItem, new vnum
    │           save to DB, GC_ITEM_SET
    │       FAILURE:
    │           item may be destroyed or downgraded (server config)
    └── send result packet GC_REFINE_INFORMATION
```

### 7.3 Npc-based vs. scroll-based

| Method | Trigger | Notes |
|--------|---------|-------|
| **Blacksmith NPC** | Talk → refine menu | Standard flow via `CRefineManager` |
| **Refine scroll** | `USE_SPECIAL` on item | Skips NPC, same backend logic |
| **Moonlight chest** | Special vnum handler | Server-side only, custom success table |

### 7.4 Vnum conventions

Upgrade tiers conventionally follow:
```
Base vnum        : XXXXX0  (e.g., 1  = Long Sword)
+1               : XXXXX1  (e.g., 2)
+2               : XXXXX2  (e.g., 3)
…
+9               : XXXXX9  (e.g., 10)
```

`dwRefinedVnum = 0` signals max upgrade level reached; the refine attempt is rejected before consuming materials.

---

## 8. Client-Server Sync

### 8.1 Initial load

On login, the game server sends the full character save data which includes all inventory and equipment items. The client processes a sequence of `GC_ITEM_SET` packets (one per item) during the character load phase.

### 8.2 `GC_ITEM_SET` packet structure

```cpp
struct TPacketGCItemSet
{
    BYTE    header;         // HEADER_GC_ITEM_SET = 0x3D (example)
    TItemPos pos;           // window + cell
    DWORD   vnum;
    WORD    count;
    TPlayerItemAttribute attrs[ITEM_ATTRIBUTE_MAX_NUM]; // 7 entries
    long    sockets[ITEM_SOCKET_MAX_NUM];               // 3 entries
    bool    bHighlight;     // flash animation on receive
};
```

### 8.3 `GC_ITEM_DEL` packet structure

```cpp
struct TPacketGCItemDel
{
    BYTE    header;         // HEADER_GC_ITEM_DEL
    TItemPos pos;
};
```

### 8.4 Client-side item cache

The client maintains two parallel caches:

| Class | File | Responsibility |
|-------|------|---------------|
| `CItemManager` | `client-src/GameLib/ItemManager.cpp` | Loads `item_proto`, caches `CItemData` per vnum |
| `CPythonPlayer` | `client-src/PythonModules/PythonPlayer.cpp` | Tracks live inventory/equipment state from `GC_ITEM_SET`/`GC_ITEM_DEL` packets |
| `CPythonItem` | `client-src/PythonModules/PythonItem.cpp` | Python-accessible item data API |

The Python UI reads item data via `player.GetItemIndex(window, cell)`, `player.GetItemAttribute(window, cell, slot)`, `player.GetItemSocket(window, cell, slot)`, etc.

### 8.5 Synchronisation guarantees

- The **server is authoritative**. The client never modifies its item state without receiving a `GC_ITEM_SET` or `GC_ITEM_DEL` confirmation.
- Client-side operations (drag-drop) are **optimistic**: the UI moves the icon immediately but reverts if the server sends back a corrective packet.
- Item counts on stackable items are always sent as the full updated count in `GC_ITEM_SET`; there is no delta/diff packet.

---

## 9. Key Files

| File | Repository path | Role |
|------|----------------|------|
| `item.h` | `server-src/game/item.h` | `CItem` class — live item instance on server |
| `item.cpp` | `server-src/game/item.cpp` | `CItem` implementation: equip/unequip bonus logic, socket handling |
| `item_manager.h` | `server-src/game/item_manager.h` | `ITEM_MANAGER` singleton declaration: create, destroy, find |
| `item_manager.cpp` | `server-src/game/item_manager.cpp` | Prototype loading (`item_proto`), instancing, ground management |
| `item_attribute.cpp` | `server-src/game/item_attribute.cpp` | Random attribute tables and roll logic |
| `char_item.cpp` | `server-src/game/char_item.cpp` | `CCharacter` item methods: `PickupItem`, `DropItem`, `UseItem`, `WearItem`, `UnWearItem`, `MoveItem` |
| `refine.cpp` | `server-src/game/refine.cpp` | `CRefineManager`: upgrade flow, material checks, success roll |
| `packet.h` | `server-src/common/packet.h` | All `CG_*` / `GC_*` packet structs for item operations |
| `item.h` (common) | `server-src/common/item.h` | `TItemTable`, `EItemType`, `EWearPositions`, `EPointType`, all shared enums |
| `item_length.h` | `server-src/common/item_length.h` | Constants: `ITEM_SOCKET_MAX_NUM`, `ITEM_ATTRIBUTE_MAX_NUM`, inventory sizes |
| `ItemData.h` | `client-src/GameLib/ItemData.h` | Client-side item prototype struct, mirrors `TItemTable` |
| `ItemManager.h/.cpp` | `client-src/GameLib/ItemManager.h`, `ItemManager.cpp` | Client prototype cache; loads `item_proto` at startup |
| `PythonItem.cpp` | `client-src/PythonModules/PythonItem.cpp` | Python C-extension: exposes item query functions to UI scripts |
| `PythonPlayer.cpp` | `client-src/PythonModules/PythonPlayer.cpp` | Inventory/equipment state mirror; processes `GC_ITEM_SET`/`GC_ITEM_DEL` |
| `uiinventory.py` | `client-bin/assets/root/uiinventory.py` | Inventory window UI: drag-drop, right-click use, equip/unequip |
| `uiEquipment.py` | `client-bin/assets/root/uiEquipment.py` | Equipment paper-doll window |
| `item_proto` | DB table / packed binary | Authoritative item definitions loaded by both server and client |
| `refine_proto` | DB table | Upgrade material/cost/probability table |

---

*Page generated 2026-03-19. Based on Metin2 Rework v3 source at commit `77266c2`.*
