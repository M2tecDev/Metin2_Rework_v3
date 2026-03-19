# server-src-common

> Shared header-only directory containing packet header constants, table/struct definitions, constants, and enums used by all server processes — this is NOT a server process or compiled library.

## Overview

`src/common/` contains no `.cpp` files. It is a pure collection of C++ headers that every compiled target (`game`, `db`, `qc`) includes. The headers define the wire protocol packet header values, all shared data table structs, game constants, and utility templates. There is a `CMakeLists.txt` that creates a header-only interface target named `common`.

## Architecture / Process Role

`common/` is not a process. It is the single source of truth for all data structures and constants shared between the game process and the db process. Both processes include these headers; the structs defined here are serialized directly into the binary packets exchanged over GD/DG TCP connections.

## Dependencies

This directory has no runtime dependencies. It is a pure-header include set.

## Files

| File | Purpose |
|------|---------|
| `packet_headers.h` | All packet header constants for CG, GC, GG, GD, DG namespaces; phase constants; sub-header enums |
| `tables.h` | All packed structs exchanged between game and db: `TAccountTable`, `TPlayerTable`, `TPlayerItem`, `TMobTable`, `TItemTable`, `TSkillTable`, etc. |
| `length.h` | Game-wide constants (`INVENTORY_MAX_NUM`, `PLAYER_PER_ACCOUNT`, `CHARACTER_NAME_MAX_LEN`, etc.), enumerations for character jobs, races, positions, item wear slots, apply types, mob stats, chat types, and more |
| `item_length.h` | Item-specific constants: socket count, attribute count, dragon soul inventory sizes |
| `building.h` | Building / land structs for the estate system |
| `cache.h` | Cache policy constants |
| `d3dtype.h` | DirectX-compatible vector/colour types used in map attribute data |
| `noncopyable.h` | Portable `noncopyable` base class mixin |
| `pool.h` | Object-pool template (`ObjectPool<T>`) |
| `service.h` | Server-service constants (channel IDs, etc.) |
| `singleton.h` | Thread-safe `singleton<T>` CRTP base |
| `stl.h` | Common STL typedef aliases used throughout the codebase (`CHARACTER_SET`, `CHARACTER_LIST`, `CHARACTER_VECTOR`, etc.) |
| `utils.h` | Small inline utility helpers |
| `VnumHelper.h` | Helper functions and macros for encoding/decoding virtual item/mob number ranges |

## Key Types and Constants

### Packet Header Namespaces (`packet_headers.h`)

All packet headers are `uint16_t` constants grouped in C++ namespaces.

| Namespace | Direction | Example constants |
|-----------|-----------|-------------------|
| `CG` | Client -> Game | `CG::LOGIN_SECURE`, `CG::ATTACK`, `CG::ITEM_USE`, `CG::CHAT` |
| `GC` | Game -> Client | `GC::PING`, `GC::PLAYER_POINTS`, `GC::ITEM_SET`, `GC::CHAT` |
| `GG` | Game <-> Game P2P | `GG::LOGIN`, `GG::RELAY`, `GG::WARP_CHARACTER` |
| `GD` | Game -> DB | `GD::PLAYER_SAVE`, `GD::ITEM_SAVE`, `GD::QUEST_SAVE` |
| `DG` | DB -> Game | `DG::LOGIN_SUCCESS`, `DG::PLAYER_LOAD_SUCCESS`, `DG::BOOT` |

Framing rules:
- CG/GC/GG: `[header:2][length:2][payload...]`, minimum 4 bytes.
- GD/DG: `[header:2][handle:4][size:4][payload...]`, 10-byte frame overhead.

### Phase Constants

```cpp
enum EPhases {
    PHASE_CLOSE, PHASE_HANDSHAKE, PHASE_LOGIN, PHASE_SELECT,
    PHASE_LOADING, PHASE_GAME, PHASE_DEAD,
    PHASE_CLIENT_CONNECTING, PHASE_DBCLIENT, PHASE_P2P, PHASE_AUTH
};
```

### Global Constants (`length.h`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `INVENTORY_MAX_NUM` | 90 | Slots in main inventory |
| `WEAR_MAX_NUM` | 32 | Equipment slot count |
| `PLAYER_PER_ACCOUNT` | 4 | Characters per account |
| `CHARACTER_NAME_MAX_LEN` | 64 | Max character name length |
| `PLAYER_MAX_LEVEL_CONST` | 120 | Maximum player level |
| `SKILL_MAX_NUM` | 255 | Total skill slots |
| `SKILL_MAX_LEVEL` | 40 | Maximum skill level |
| `GOLD_MAX` | 2,000,000,000 | Maximum gold held |
| `QUICKSLOT_MAX_NUM` | 36 | Quick-slot bar size |

### Key Enumerations (`length.h`)

| Enum | Values | Purpose |
|------|--------|---------|
| `EJobs` | `JOB_WARRIOR`, `JOB_ASSASSIN`, `JOB_SURA`, `JOB_SHAMAN` | Player job classes |
| `EWearPositions` | `WEAR_BODY` … `WEAR_BELT` (0–31) | Equipment slots |
| `ECharType` | `CHAR_TYPE_MONSTER`, `CHAR_TYPE_NPC`, `CHAR_TYPE_PC`, … | Character entity types |
| `EMobRank` | `MOB_RANK_PAWN` … `MOB_RANK_KING` | Monster tier |
| `EApplyTypes` | `APPLY_MAX_HP` … `APPLY_ANTI_PENETRATE_PCT` (91 types) | Item/buff apply stat codes |
| `EChatType` | `CHAT_TYPE_TALKING` … `CHAT_TYPE_SHOUT` | Chat channel types |
| `EGMLevels` | `GM_PLAYER` … `GM_IMPLEMENTOR` | GM permission tiers |
| `EImmuneFlags` | `IMMUNE_STUN`, `IMMUNE_SLOW`, `IMMUNE_FALL`, `IMMUNE_CURSE`, `IMMUNE_POISON`, `IMMUNE_TERROR`, `IMMUNE_REFLECT` | Bit-flags for monster/player immunity |
| `ERaceFlags` | `RACE_FLAG_ANIMAL` … `RACE_FLAG_ATT_DARK` | Monster race/element flags |
| `EAIFlags` | `AIFLAG_AGGRESSIVE` … `AIFLAG_REVIVE` | Monster AI behaviour flags |
| `EWindows` | `INVENTORY`, `EQUIPMENT`, `SAFEBOX`, `MALL`, `DRAGON_SOUL_INVENTORY`, `BELT_INVENTORY`, `GROUND` | Storage window types |
| `EGuildWarType` | `GUILD_WAR_TYPE_FIELD`, `_BATTLE`, `_FLAG` | Guild war modes |

### `TItemPos` Struct (`length.h`)

Represents a fully-qualified item position (window + cell index) with helper methods:

| Method | Returns | Description |
|--------|---------|-------------|
| `IsValidItemPosition()` | `bool` | Validates cell against window bounds |
| `IsEquipPosition()` | `bool` | True if cell is in equipment range |
| `IsDragonSoulEquipPosition()` | `bool` | True if cell is dragon-soul deck |
| `IsBeltInventoryPosition()` | `bool` | True if cell is belt inventory |
| `IsDefaultInventoryPosition()` | `bool` | True if cell is basic bag slot |
| `IsSamePosition(other)` | `bool` | Cross-window equality (handles INVENTORY/EQUIPMENT overlap) |

### Utility Templates

#### `singleton<T>` (`singleton.h`)

CRTP base giving any class `T` a `T::instance()` static accessor. Used by `CHARACTER_MANAGER`, `CClientManager`, and most manager singletons.

#### `ObjectPool<T>` (`pool.h`)

Fixed-capacity object pool template. Optionally enabled by compiling with `M2_USE_POOL`.

#### `noncopyable` (`noncopyable.h`)

Deletes copy constructor and copy-assignment operator. Used as a base class for managers and resources that must not be copied.
