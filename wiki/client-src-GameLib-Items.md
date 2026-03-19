# GameLib — Items

> Item data definitions and management: item proto table loading, graphic resources, wear positions, apply types, and item flags.

[← Back to GameLib index](client-src-GameLib)

## Overview

The item sub-system provides `CItemData`, which stores both the raw proto-table data (`TItemTable`) for a single item and its associated graphical resources (3D model, drop model, icon image, LOD models). `CItemManager` is the singleton that loads the item proto binary file and provides lookup by virtual number (vnum). The extensive enumerations in `CItemData` define every aspect of the item system.

## Classes

### `CItemData`
**File:** `ItemData.h`
**Purpose:** Holds all data for a single item type: proto-table fields (vnum, name, type, sub-type, flags, limits, apply values, socket count, buy/sell prices, refine info) plus loaded graphical assets.

#### Item Types (`EItemType`)
| Value | Description |
|-------|-------------|
| `ITEM_TYPE_WEAPON` | Melee or ranged weapon |
| `ITEM_TYPE_ARMOR` | Armor/equipment |
| `ITEM_TYPE_USE` | Usable consumable item |
| `ITEM_TYPE_MATERIAL` | Crafting material |
| `ITEM_TYPE_SPECIAL` | Special item |
| `ITEM_TYPE_ELK` | Currency (yang) |
| `ITEM_TYPE_METIN` | Metin stone |
| `ITEM_TYPE_CONTAINER` | Container item |
| `ITEM_TYPE_FISH` | Fishing item |
| `ITEM_TYPE_SKILLBOOK` | Skill book |
| `ITEM_TYPE_QUEST` | Quest item |
| `ITEM_TYPE_HAIR` | Hair attachment |
| `ITEM_TYPE_COSTUME` | Costume item (body/hair) |
| `ITEM_TYPE_DS` | Dragon Soul stone |
| `ITEM_TYPE_BELT` | Belt |
| `ITEM_TYPE_RING` | Ring |
| *(and more — see `EItemType`)* | |

#### Weapon Sub-types (`EWeaponSubTypes`)
`WEAPON_SWORD`, `WEAPON_DAGGER`, `WEAPON_BOW`, `WEAPON_TWO_HANDED`, `WEAPON_BELL`, `WEAPON_FAN`, `WEAPON_ARROW`

#### Armor Sub-types (`EArmorSubTypes`)
`ARMOR_BODY`, `ARMOR_HEAD`, `ARMOR_SHIELD`, `ARMOR_WRIST`, `ARMOR_FOOTS`, `ARMOR_NECK`, `ARMOR_EAR`

#### Wear Positions (`EWearPositions`)
| Position | Slot |
|----------|------|
| `WEAR_BODY` | Body armor |
| `WEAR_HEAD` | Helmet |
| `WEAR_WEAPON` | Primary weapon |
| `WEAR_SHIELD` | Shield |
| `WEAR_RING1/2` | Ring slots |
| `WEAR_BELT` | Belt slot |
| `WEAR_COSTUME_BODY/HAIR` | Costume slots |
| *(+ unique, ability, arrow, etc.)* | |

#### Limit Types (`ELimitTypes`)
| Limit | Meaning |
|-------|---------|
| `LIMIT_LEVEL` | Required character level |
| `LIMIT_STR/DEX/INT/CON` | Stat requirements |
| `LIMIT_REAL_TIME` | Item expires in real time |
| `LIMIT_REAL_TIME_START_FIRST_USE` | Timer starts on first use |
| `LIMIT_TIMER_BASED_ON_WEAR` | Timer runs only while equipped |

#### Apply Types (`EApplyTypes`)
Over 90 defined apply bonuses including: `APPLY_MAX_HP`, `APPLY_STR/DEX/INT/CON`, `APPLY_ATT_SPEED`, `APPLY_MOV_SPEED`, `APPLY_CRITICAL_PCT`, `APPLY_PENETRATE_PCT`, `APPLY_RESIST_*`, `APPLY_STEAL_HP/SP`, `APPLY_SKILL_DAMAGE_BONUS`, and many more.

#### `TItemTable` Fields
| Field | Type | Description |
|-------|------|-------------|
| `dwVnum` | `DWORD` | Item virtual number (unique identifier) |
| `szName` | `char[65]` | Internal item name |
| `szLocaleName` | `char[65]` | Localized display name |
| `bType` | `BYTE` | Item type (`EItemType`) |
| `bSubType` | `BYTE` | Sub-type within the item type |
| `dwAntiFlags` | `DWORD` | Restrictions (who cannot use/trade/drop) |
| `dwFlags` | `DWORD` | Item properties (stackable, refineable, rare, etc.) |
| `dwWearFlags` | `DWORD` | Which equipment slots this item can occupy |
| `dwIBuyItemPrice` | `DWORD` | NPC buy price (player buys from NPC) |
| `dwISellItemPrice` | `DWORD` | NPC sell price (player sells to NPC) |
| `aLimits[2]` | `TItemLimit[]` | Equip/use requirements |
| `aApplies[3]` | `TItemApply[]` | Stat bonus applications |
| `alValues[6]` | `long[]` | Type-specific numeric values |
| `alSockets[3]` | `long[]` | Socket slot values |
| `dwRefinedVnum` | `DWORD` | Vnum of the next refine tier |
| `bGainSocketPct` | `BYTE` | Chance to gain a socket on refine |

#### Methods
| Method | Description |
|--------|-------------|
| `SetItemTableData(pTable)` | Populates from a binary proto table entry |
| `SetDefaultItemData(icon, model)` | Sets icon and model filenames and triggers load |
| `GetModelThing()` | Returns the 3D model `CGraphicThing*` for equipped display |
| `GetDropModelThing()` | Returns the 3D model for ground-dropped items |
| `GetIconImage()` | Returns the `CGraphicSubImage*` for the inventory icon |
| `IsAntiFlag(flag)` | Tests anti-flag bitmask |
| `IsFlag(flag)` | Tests flag bitmask |
| `IsWearableFlag(flag)` | Tests wear-flag bitmask |
| `GetApply(index, pApply)` | Returns the apply entry at the given index |
| `GetLimit(index, pLimit)` | Returns the limit entry at the given index |
| `GetValue(index)` | Returns a numeric value field |

---

### `CItemManager`
**File:** `ItemManager.h`
**Purpose:** Singleton that loads the item proto binary and holds all `CItemData` objects. Provides lookup by vnum.

#### Methods
| Method | Description |
|--------|-------------|
| `LoadItemTable(filename)` | Reads the binary item proto file and constructs `CItemData` entries |
| `GetProto(vnum, ppItemData)` | Finds an item by vnum; returns false if not found |
| `SelectItem(vnum)` | Selects an item for subsequent property setting |
| `SetModelFileName(filename)` | Sets the model filename for the currently selected item |
| `SetIconFileName(filename)` | Sets the icon filename for the currently selected item |
