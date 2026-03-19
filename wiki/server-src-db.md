# server-src-db

> The database server process that acts as a persistent storage mediator between game processes and MariaDB, handling all player/item/guild/party data, caching, and proto table distribution.

## Overview

`db` is the second of two server processes. It listens for TCP connections from one or more `game` processes (on the GD/DG channel), accepts all persistence-related requests, executes MariaDB queries (both synchronous and async), maintains write-back caches for player and item data, and sends results and broadcasts back to connected game servers. It does not handle client connections.

`db` also acts as the authoritative source for shared read-only tables (`mob_proto`, `item_proto`, skill tables, shop tables, refine tables, ban-word lists) which it loads on startup and broadcasts to each connecting game server via `QUERY_BOOT`.

## Architecture / Process Role

```
game (channel 1)  ──GD/DG TCP──┐
game (channel 2)  ──GD/DG TCP──┤── CClientManager (db) ──── MariaDB
game (channel N)  ──GD/DG TCP──┘
```

- **Inbound packets (GD::**): `PLAYER_LOAD`, `PLAYER_SAVE`, `ITEM_SAVE`, `ITEM_DESTROY`, `QUEST_SAVE`, `SAFEBOX_LOAD`, `SAFEBOX_SAVE`, `GUILD_*`, `PARTY_*`, `MARRIAGE_*`, `AUTH_LOGIN`, etc.
- **Outbound packets (DG::**): `PLAYER_LOAD_SUCCESS`, `ITEM_LOAD`, `QUEST_LOAD`, `BOOT`, `GUILD_LOAD`, `TIME`, `ITEM_ID_RANGE`, etc.
- **Cache flush**: player and item caches are periodically flushed to MariaDB by the main loop.

## Dependencies

- `libthecore` — event loop, sockets, fdwatch, logging.
- `libsql` — async MariaDB queries.
- `libgame` — `CGrid` for item grid placement.
- `common/` — shared packet headers and table structs.
- MariaDB Connector/C 3.4.5 (vendored).

## Files

| File | Purpose |
|------|---------|
| `Main.h` / `Main.cpp` | Entry point: argument parsing, `CClientManager` bootstrap, `thecore_idle` loop |
| `Config.h` / `Config.cpp` | Parses `db.conf`: database host/port/credentials, listen address, table postfixes |
| `ClientManager.h` / `ClientManager.cpp` | `CClientManager` — central singleton: peer management, packet dispatch, cache management, all `QUERY_*`/`RESULT_*` handlers |
| `ClientManagerBoot.cpp` | Boot sequence: `InitializeTables()` — loads mob/item/skill/shop/refine/banword tables |
| `ClientManagerLogin.cpp` | Login/logout handling: `QUERY_LOGIN`, `RESULT_LOGIN`, `QUERY_AUTH_LOGIN`, `QUERY_LOGIN_BY_KEY` |
| `ClientManagerPlayer.cpp` | Player load/save/create/delete handlers |
| `ClientManagerEventFlag.cpp` | Event flags: loading, setting, broadcasting |
| `ClientManagerGuild.cpp` | Guild creation, member management, skill/exp/war/money handlers |
| `ClientManagerHorseName.cpp` | Horse name update and retrieval |
| `ClientManagerParty.cpp` | Party create/delete/add/remove/state-change handlers |
| `DBManager.h` / `DBManager.cpp` | `CDBManager` — wraps multiple `CAsyncSQL` instances; routes queries to the correct db thread |
| `Peer.h` / `Peer.cpp` | `CPeer` — a connected game server peer; inherits `CPeerBase`; owns read/write buffers, dispatches `ProcessPackets` |
| `PeerBase.h` / `PeerBase.cpp` | `CPeerBase` — base network peer with ring-buffer I/O |
| `NetBase.h` / `NetBase.cpp` | `CNetBase` — `fdwatch`-driven TCP acceptor/connector base |
| `Cache.h` / `Cache.cpp` | `CPlayerTableCache`, `CItemCache`, `CItemPriceListTableCache` — write-back cache wrappers |
| `LoginData.h` / `LoginData.cpp` | `CLoginData` — per-login session data during authentication |
| `GuildManager.h` / `GuildManager.cpp` | `CGuildManager` — in-memory guild state: war reservations, skill cooldowns, money |
| `Marriage.h` / `Marriage.cpp` | Marriage / wedding packet handlers |
| `HB.h` / `HB.cpp` | Heartbeat callback: drives cache flush, logout cleanup, item cache sweep |
| `ItemAwardManager.h` / `ItemAwardManager.cpp` | `CItemAwardManager` — tracks and delivers pending item awards |
| `ItemIDRangeManager.h` / `ItemIDRangeManager.cpp` | `CItemIDRangeManager` — allocates item ID ranges and distributes them to game servers |
| `Lock.h` / `Lock.cpp` | Thin mutex wrappers used by the cache layer |
| `MoneyLog.h` / `MoneyLog.cpp` | `CMoneyLog` — logs gold transactions to DB |
| `PrivManager.h` / `PrivManager.cpp` | `CPrivManager` — empire/guild/character privilege management |
| `ProtoReader.h` / `ProtoReader.cpp` | Loads `mob_proto.txt` / `item_proto.txt` CSV format into `TMobTable` / `TItemTable` vectors |
| `CsvReader.h` / `CsvReader.cpp` | Generic CSV parser used by `ProtoReader` |
| `grid.h` / `grid.cpp` | Local copy of the `CGrid` helper (mirrors `libgame`) |
| `QID.h` | Query-ID enum constants for correlating async results |
| `version.cpp` | Embeds the git version string from `GIT_DESCRIBE` |
| `stdafx.h` | Precompiled-header umbrella |

## Classes

### `CClientManager` (`ClientManager.h`)

**Purpose:** The central singleton for the db process. Inherits `CNetBase` (TCP acceptor) and `singleton<CClientManager>`. Manages all connected game peers, dispatches every inbound GD packet to the appropriate handler, and drives the cache flush cycle.

#### Key Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_peerList` | `TPeerList` | All currently connected game server peers |
| `m_map_playerCache` | `TPlayerTableCacheMap` | Player table write-back cache keyed by player ID |
| `m_map_itemCache` | `TItemCacheMap` | Item write-back cache keyed by item ID |
| `m_map_pkItemCacheSetPtr` | `TItemCacheSetPtrMap` | Per-player set of item caches (for bulk flush on logout) |
| `m_mapItemPriceListCache` | `TItemPriceListCacheMap` | Personal shop price list caches |
| `m_map_pkLoginData` | `TLoginDataByLoginKey` | Login sessions indexed by login key |
| `m_map_pkLoginDataByLogin` | `TLoginDataByLogin` | Login sessions indexed by login name |
| `m_map_pkLoginDataByAID` | `TLoginDataByAID` | Login sessions indexed by account ID |
| `m_map_kLogonAccount` | `TLogonAccountMap` | Currently online accounts (for duplicate-login prevention) |
| `m_vec_mobTable` | `std::vector<TMobTable>` | All mob proto records loaded at boot |
| `m_vec_itemTable` | `std::vector<TItemTable>` | All item proto records loaded at boot |
| `m_map_itemTableByVnum` | `std::map<DWORD, TItemTable*>` | Item proto lookup by vnum |
| `m_pShopTable` | `TShopTable*` | NPC shop definitions |
| `m_vec_skillTable` | `std::vector<TSkillTable>` | Skill definitions |
| `m_vec_banwordTable` | `std::vector<TBanwordTable>` | Banned words |
| `m_map_pkParty` | `TPartyMap` | Active party state (member roles and levels) |
| `m_map_lEventFlag` | `TEventFlagMap` | Server-wide event flags (name → value) |
| `m_map_pkObjectTable` | `std::map<DWORD, building::TObject*>` | Placed building objects |
| `m_map_logout` | `TLogoutPlayerMap` | Players who logged out recently (for deferred cache flush) |
| `m_itemRange` | `TItemIDRangeTable` | Current item ID range issued to game servers |
| `m_iCacheFlushCountLimit` | `int` | Max cache entries to flush per heartbeat |

#### Key Methods

| Method | Description |
|--------|-------------|
| `Initialize()` | Opens accept socket, initialises SQL connections, calls `InitializeTables()` |
| `MainLoop()` | Calls `thecore_idle`; processes pending SQL results, flushes caches |
| `ProcessPackets(peer)` | Dispatches all buffered GD packets from a peer to the correct `QUERY_*` handler |
| `QUERY_BOOT(peer, p)` | Sends all proto tables and event flags to a newly connected game server |
| `QUERY_LOGIN` / `RESULT_LOGIN` | Full login authentication flow against the account database |
| `QUERY_PLAYER_LOAD` / `RESULT_PLAYER_LOAD` | Loads player row, items, quests, affects, and sends `DG::PLAYER_LOAD_SUCCESS` |
| `QUERY_PLAYER_SAVE` | Upserts player row to cache; deferred flush to DB |
| `QUERY_ITEM_SAVE` / `QUERY_ITEM_DESTROY` / `QUERY_ITEM_FLUSH` | Item persistence |
| `QUERY_QUEST_SAVE` | Saves quest flags |
| `QUERY_SAFEBOX_LOAD` / `QUERY_SAFEBOX_SAVE` | Safebox (storage) persistence |
| `PutPlayerCache` / `GetPlayerCache` | Write-back player cache management |
| `PutItemCache` / `GetItemCache` / `DeleteItemCache` | Write-back item cache management |
| `UpdatePlayerCache` / `UpdateItemCache` | Periodic cache flush to DB |
| `ForwardPacket(header, data, size, channel, except)` | Broadcasts a packet to all connected peers (optionally excluding one and filtering by channel) |
| `GuildCreate` / `GuildSkillUpdate` / `GuildExpUpdate` / `GuildAddMember` / `GuildRemoveMember` / … | Full guild management suite |
| `MarriageAdd` / `MarriageUpdate` / `MarriageRemove` | Marriage lifecycle management |
| `SetEventFlag` / `LoadEventFlag` / `SendEventFlagsOnSetup` | Event flag management |
| `SendSpareItemIDRange(peer)` | Allocates and sends a new item ID range to a game server |
| `BlockChat(p)` | Applies a chat-block punishment |
| `ItemAward(peer, login)` | Delivers a pending item award to a player |

---

### `CPeer` (`Peer.h`)

**Purpose:** Represents one connected game server. Inherits `CPeerBase`. Owns the per-connection state and packet processing.

#### Key Methods

| Method | Description |
|--------|-------------|
| `ProcessPackets()` | Reads all complete GD packets from the input ring buffer and dispatches them to `CClientManager` |
| `Encode(data, size)` | Appends data to the output buffer |
| `GetChannel()` | Returns the game server's channel number |
| `GetHandle()` | Returns the per-connection handle used in GD/DG packet framing |

---

### `CDBManager` (`DBManager.h`)

**Purpose:** Multiplexes queries across multiple `CAsyncSQL` instances (one per logical database partition or purpose).

#### Key Methods

| Method | Description |
|--------|-------------|
| `AsyncQuery(idx, query)` | Sends a fire-and-forget query to SQL instance `idx` |
| `ReturnQuery(idx, query, userData)` | Sends a query whose result will be returned |
| `DirectQuery(idx, query)` | Synchronous query for boot-time initialisation |
| `PopResult(result)` | Pops a completed result from any SQL instance |

---

### `CLoginData` (`LoginData.h`)

**Purpose:** Holds transient state for a player login session from the moment `QUERY_LOGIN` is received until the character is fully loaded.

Key fields: login key, account ID, player IDs for each slot, pending safe-box, IP address.

---

### Cache Classes (`Cache.h`)

| Class | Cached Struct | Key |
|-------|--------------|-----|
| `CPlayerTableCache` | `TPlayerTable` | Player ID |
| `CItemCache` | `TPlayerItem` | Item ID |
| `CItemPriceListTableCache` | `TItemPriceListTable` | Player ID |

Each cache entry tracks a dirty flag and a flush timestamp. The heartbeat calls `UpdatePlayerCache()` and `UpdateItemCache()` to write dirty entries back to MariaDB up to `m_iCacheFlushCountLimit` entries per tick.

---

### `CGuildManager` (`GuildManager.h`)

**Purpose:** Maintains in-memory guild state for all guilds: war reservations, skill usage cooldowns, skill recharge timers, and money balances.

#### Key Methods

| Method | Description |
|--------|-------------|
| `LoginGuild(guild_id)` | Marks a guild as active |
| `LogoutGuild(guild_id)` | Marks a guild as inactive |
| `SetGuildWarEndTime(id1, id2, t)` | Records when a guild war ends |
| `UpdateSkillRechargeTime()` | Called each heartbeat to send `DG::GUILD_SKILL_RECHARGE` when cooldowns expire |

---

### `CMoneyLog` (`MoneyLog.h`)

Accumulates gold transaction records and periodically flushes them to the `money_log` database table.

---

### `CPrivManager` (`PrivManager.h`)

Manages timed privilege bonuses (item drop rate, gold drop rate, EXP rate) at empire, guild, and character scope. Broadcasts `DG::CHANGE_EMPIRE_PRIV` / `DG::CHANGE_GUILD_PRIV` / `DG::CHANGE_CHARACTER_PRIV` to connected game servers.

---

### `CItemIDRangeManager` (`ItemIDRangeManager.h`)

Allocates unique item ID ranges from the database and distributes sub-ranges to each game server via `DG::ITEM_ID_RANGE`. Ensures globally unique item IDs across all game server instances.

---

### `CItemAwardManager` (`ItemAwardManager.h`)

Tracks pending item awards (gifts) and delivers them to players when they log in. Sends `DG::ITEMAWARD_INFORMER` to the relevant game server.
