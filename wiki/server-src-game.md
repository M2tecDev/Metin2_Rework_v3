# server-src-game

> The core game simulation process: manages characters, combat, items, quests, maps, NPC AI, guild/party/PvP systems, and all real-time network communication with game clients and peer game servers.

## Overview

`game` is the primary server process. It runs the Metin2 real-time game world: accepting TCP connections from clients, maintaining the spatial world (sector-tree maps), simulating characters (player characters, monsters, NPCs, buildings), running skill/combat formulas, executing Lua quest scripts, synchronising state with peer game servers over P2P connections, and forwarding persistence requests to the `db` process.

The process uses a single-threaded pulse-based event loop driven by `libthecore`. Each heartbeat pulse (typically 25 ms) triggers updates for AI, status effects, skill cooldowns, fishing, chat flood control, and deferred saves.

## Architecture / Process Role

```
Clients     <─CG/GC TCP──> DESC/DESC_CLIENT
                                │
                          CInputMain / CInputLogin
                                │
                         CHARACTER (CHAR_MANAGER)
                         ├── SECTREE (SECTREE_MANAGER)
                         ├── ITEM (ITEM_MANAGER)
                         ├── QUEST (CQuestManager)
                         ├── GUILD (CGuildManager)
                         ├── PARTY (CPartyManager)
                         └── PVP / ARENA / DUNGEON

game <──GG P2P TCP──> other game instances (P2PManager)
game ──GD/DG TCP──> db process (CDBManager / CInputDB)
```

## Dependencies

- `libthecore` — event loop, fdwatch, sockets, ring buffer, logging.
- `libpoly` — formula evaluation for skill damage and stat formulas.
- `libgame` — `CGrid`, `CAttribute`.
- `libsql` — async MariaDB (for local game-server logging queries).
- `liblua` — embedded Lua 5.0.3 for quest scripting.
- `common/` — shared packet headers and table structs.
- MariaDB Connector/C, libsodium (key exchange).

---

## Source File Index

The game directory contains approximately 130 header files and 140 implementation files. They are grouped below by subsystem.

---

## Subsystem: Character (`char.h` / `char*.cpp`)

### `CHARACTER` (`char.h`)

**Purpose:** The central entity class representing any actor in the game world — player characters (PCs), monsters, NPCs, stones, doors, buildings, warp points. Inherits `CEntity` (spatial), `CFSM` (finite state machine), and `CHorseRider` (mount system).

`CHARACTER` is the most feature-rich class in the codebase. Its definition spans `char.h` (~900 lines) and the implementation is split across multiple `.cpp` files by domain.

#### Key Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_vid` | `VID` | Virtual ID: unique in-process identifier |
| `m_dwPlayerID` | `DWORD` | Persistent player ID (0 for NPCs/mobs) |
| `m_stName` | `std::string` | Character name |
| `m_bCharType` | `BYTE` | `CHAR_TYPE_PC`, `CHAR_TYPE_MONSTER`, `CHAR_TYPE_NPC`, etc. |
| `m_points` | `CHARACTER_POINT` | Persistent stats: level, exp, gold, HP, SP, stamina, skill group, base stat points |
| `m_pointsInstant` | `CHARACTER_POINT_INSTANT` | Session-only stats: computed point array, position, flags, equipped items, battle target |
| `m_stateMove` / `m_stateBattle` / `m_stateIdle` | `CStateTemplate<CHARACTER>` | FSM states |
| `m_dwPolymorphRace` | `DWORD` | Active polymorph monster vnum (0 = not polymorphed) |
| `m_dwMoveDuration` | `DWORD` | Current move duration in ms |
| `m_dwLastAttackTime` | `DWORD` | Timestamp of last attack for speed-hack detection |
| `m_quickslot[]` | `TQuickslot[QUICKSLOT_MAX_NUM]` | Quick-slot bar bindings |

#### Point System

`CHARACTER_POINT::points[]` (saved) and `CHARACTER_POINT_INSTANT::points[]` (computed) are both indexed by `EPointTypes` (138 defined point types). Key points:

| Point Constant | Meaning |
|---------------|---------|
| `POINT_LEVEL` | Character level |
| `POINT_HP` / `POINT_MAX_HP` | Current/maximum HP |
| `POINT_SP` / `POINT_MAX_SP` | Current/maximum SP (mana) |
| `POINT_ATT_GRADE` | Physical attack grade |
| `POINT_DEF_GRADE` | Physical defence grade |
| `POINT_CRITICAL_PCT` | Critical hit chance % |
| `POINT_PENETRATE_PCT` | Penetration hit chance % |
| `POINT_POISON_PCT` / `POINT_STUN_PCT` / `POINT_SLOW_PCT` | Status-effect apply chances |
| `POINT_ATTBONUS_HUMAN` … `POINT_ATTBONUS_MONSTER` | Bonus damage to specific race types |
| `POINT_RESIST_SWORD` … `POINT_RESIST_DARK` | Resistance to damage types |
| `POINT_STEAL_HP` / `POINT_STEAL_SP` | Life/mana leech |
| `POINT_MOUNT` | Currently mounted monster vnum |
| `POINT_POLYMORPH` | Active polymorph vnum |
| `POINT_ENERGY` | Energy (special resource) |

#### Identity / Type Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `IsPC()` | `bool` | True if a client descriptor is bound (player character) |
| `IsNPC()` | `bool` | True for any non-PC character |
| `IsMonster()` | `bool` | `CHAR_TYPE_MONSTER` |
| `IsStone()` | `bool` | `CHAR_TYPE_STONE` |
| `IsDoor()` | `bool` | `CHAR_TYPE_DOOR` |
| `IsGM()` | `BOOL` | True if GM level > `GM_PLAYER` |
| `IsPolymorphed()` | `bool` | True if `m_dwPolymorphRace > 0` |
| `GetJob()` | `BYTE` | Job class (`JOB_WARRIOR`, etc.) |
| `GetCharType()` | `BYTE` | Raw character type constant |
| `GetRaceNum()` | `WORD` | Race/mob vnum |

#### Stat Methods

| Method | Description |
|--------|-------------|
| `GetPoint(idx)` | Returns instant (computed) point value |
| `GetRealPoint(idx)` | Returns persistent base point value |
| `SetPoint(idx, val)` | Sets an instant point value |
| `PointChange(type, amount, bAmount, bBroadcast)` | Changes a point by `amount`; broadcasts to client if `bBroadcast` |
| `ComputePoints()` | Recomputes all instant points from base + equipment + affects |
| `ComputeBattlePoints()` | Recomputes attack and defence grades specifically |
| `ApplyPoint(bApplyType, iVal)` | Applies a single `EApplyTypes` bonus to the instant point array |
| `CheckMaximumPoints()` | Clamps current HP/SP if they exceed maximums |

#### Movement Methods

| Method | Description |
|--------|-------------|
| `Move(x, y)` | Moves character after checking movement validity |
| `Sync(x, y)` | Unconditional position synchronisation |
| `Goto(x, y)` | Initiates a blended movement toward a target position |
| `Stop()` | Cancels current movement |
| `WarpSet(x, y, lRealMapIndex)` | Initiates warp to another map position |
| `WarpToPID(dwPID)` | Warps to another player's location |
| `CanMove()` | Returns false if stunned, dead, fishing, etc. |
| `SyncPacket()` | Sends a position sync packet to nearby entities |

#### Combat & Status

| Method | Description |
|--------|-------------|
| `AddAffect(dwType, bApplyOn, lApplyValue, dwFlag, lDuration, lSPCost, bOverride)` | Applies a buff/debuff |
| `RemoveAffect(dwType)` | Removes a specific affect |
| `IsAffectFlag(dwAff)` | True if any affect has this flag bit set |
| `ClearAffect(bSave)` | Removes all active affects |
| `RefreshAffect()` | Re-applies all active affects after a recompute |
| `Damage(pkAttacker, dam, type)` | Inflicts `dam` damage; handles death |
| `Dead(pkKiller, bImmediately)` | Triggers death: drops, exp, respawn logic |
| `Revive(bInPlace)` | Revives a dead character |
| `DistributeExp()` | Awards XP to attacker/party; returns the XP recipient |

#### Item Methods (implemented in `char_item.cpp`)

| Method | Description |
|--------|-------------|
| `GetItem(Cell)` | Returns item at `TItemPos` |
| `EquipItem(item)` | Equips an item |
| `UnequipItem(item)` | Unequips an item |
| `PickupItem(dwVID)` | Picks up a ground item by VID |
| `AutoGiveItem(pkItem, bHighPriority)` | Auto-places item in first free inventory slot |
| `CountSpecifyItem(dwVnum)` | Counts stacks of a given item vnum in inventory |
| `RemoveSpecifyItem(dwVnum, count)` | Removes `count` copies of a specific item |
| `UseItem(Cell, ByCell)` | Uses the item at `Cell` (on item at `ByCell` if applicable) |
| `DropItem(Cell, bCount)` | Drops an item to the ground |
| `ExchangeItem(pkExchange, pos)` | Transfers an item to a trade partner |
| `ModifyPoints(item, bAdd)` | Applies or removes an item's stat bonuses |

#### Skill Methods (implemented in `char_skill.cpp`)

| Method | Description |
|--------|-------------|
| `UseSkill(dwVnum, pkVictim, bUseGrandMaster)` | Activates a skill |
| `GetSkillLevel(dwVnum)` | Returns current skill level |
| `SetSkillLevel(dwVnum, level)` | Sets skill level and sends packet |
| `LearnSkill(dwVnum)` | Increases skill level by 1 |
| `ResetSkill()` | Resets all skill points |
| `GetSkillMasterType(dwVnum)` | Returns `SKILL_NORMAL` / `SKILL_MASTER` / `SKILL_GRAND_MASTER` / `SKILL_PERFECT_MASTER` |
| `ComputeSkillAtPosition(dwVnum)` | Computes effective skill bonus at current position |

#### Horse / Mount Methods (implemented in `char_horse.cpp`)

| Method | Description |
|--------|-------------|
| `MountVnum(dwVnum)` | Mounts a horse/mount by vnum |
| `Mount_Unmount()` | Dismounts |
| `IsRiding()` | True if currently mounted |
| `SetHorseLevel(level)` | Sets horse level |

#### Quest Interface

| Method | Description |
|--------|-------------|
| `SetQuestFlag(str, val)` | Sets a named integer quest flag |
| `GetQuestFlag(str)` | Returns a quest flag value |
| `NPC(bType)` | Returns the NPC state for a given event type |

---

### `CHARACTER_MANAGER` (`char_manager.h`)

**Purpose:** Singleton that owns all `CHARACTER` instances. Manages the VID counter, spawning, lookup, state updates, and rate multipliers.

#### Key Methods

| Method | Description |
|--------|-------------|
| `CreateCharacter(name, dwPID)` | Allocates and registers a new `CHARACTER` |
| `DestroyCharacter(ch)` | Removes and deletes a character |
| `SpawnMob(dwVnum, lMapIndex, x, y, z, bSpawnMotion, iRot, bShow)` | Spawns a single monster at a location |
| `SpawnMobRange(dwVnum, lMapIndex, sx, sy, ex, ey, ...)` | Spawns a monster within a rectangle |
| `SpawnGroup(dwVnum, lMapIndex, ...)` | Spawns a monster group |
| `SpawnGroupWithImmunity(...)` | Spawns a group with damage immunity conditions |
| `Find(dwVID)` | Looks up a character by VID |
| `FindPC(name)` | Looks up a player character by name |
| `FindByPID(dwPID)` | Looks up by persistent player ID |
| `Update(iPulse)` | Drives FSM updates for all active characters |
| `DelayedSave(ch)` | Marks a character for deferred DB save |
| `FlushDelayedSave(ch)` | Immediately saves a deferred character (used on disconnect) |
| `ProcessDelayedSave()` | Flushes all pending saves (called each heartbeat) |
| `SetMobItemRate` / `SetMobExpRate` / `SetMobGoldAmountRate` … | Server-wide rate multipliers |
| `KillLog(dwVnum)` | Records a mob kill for statistics |

---

## Subsystem: Network / Descriptors

### `DESC` (`desc.h`)

**Purpose:** Represents a TCP connection — either from a client (`DESC_TYPE_ACCEPTOR`) or to another server (`DESC_TYPE_CONNECTOR`). Owns the input/output ring buffers, the current connection phase, and the secure cipher for authenticated sessions.

#### Key Members

| Member | Type | Description |
|--------|------|-------------|
| `m_sock` | `socket_t` | The underlying socket fd |
| `m_iPhase` | `int` | Current connection phase (`PHASE_HANDSHAKE`, `PHASE_LOGIN`, `PHASE_SELECT`, `PHASE_GAME`, etc.) |
| `m_inputBuffer` | `RingBuffer` | Incoming data staging buffer |
| `m_outputBuffer` | `RingBuffer` | Outgoing data staging buffer |
| `m_lpCharacter` | `LPCHARACTER` | The bound character (null until `PHASE_GAME`) |
| `m_accountTable` | `TAccountTable` | Account data after successful login |
| `m_secureCipher` | `SecureCipher` | libsodium-based session cipher for encrypted communication |
| `m_pInputProcessor` | `CInputProcessor*` | Phase-specific packet handler |

#### Key Methods

| Method | Description |
|--------|-------------|
| `Setup(fdw, fd, addr, handle)` | Associates a socket and starts the handshake phase |
| `SetPhase(phase)` | Transitions to a new connection phase and swaps input processor |
| `Packet(data, size)` | Appends data to the output buffer |
| `ProcessInput()` | Reads from socket into input buffer; calls input processor |
| `ProcessOutput()` | Flushes output buffer to socket |
| `SendKeyChallenge()` | Sends a libsodium key-exchange challenge |
| `HandleKeyResponse(client_pk, response)` | Verifies the client's key response; activates the secure cipher |
| `BindCharacter(ch)` | Associates a `CHARACTER` with this connection |
| `DisconnectOfSameLogin()` | Disconnects any existing session with the same login |
| `DelayedDisconnect(iSec)` | Schedules a disconnect after `iSec` seconds |

---

### `DESC_MANAGER` (`desc_manager.h`)

**Purpose:** Singleton that owns all `DESC` instances and drives `fdwatch`-based I/O.

Key methods: `AcceptDesc(lpFdw, sock)`, `ConnectDesc(...)`, `DestroyDesc(desc)`, `Update()` (called each pulse), `FindByHandle(handle)`, `GetClientCountByIP(ip)`.

---

### `CDescP2P` (`desc_p2p.h`)

**Purpose:** Descriptor specialisation for game-to-game P2P connections. Inherits `DESC`. Stores channel, host, and port for the peer game server. Used by `P2PManager`.

---

### Input Processors (`input.h`)

Stateless objects (one per phase) that parse packets from the input ring buffer:

| Class | Phase | Description |
|-------|-------|-------------|
| `CInputHandshake` | `PHASE_HANDSHAKE` | Time synchronisation handshake |
| `CInputAuth` | `PHASE_AUTH` | Auth-server login flow |
| `CInputLogin` | `PHASE_LOGIN` | Account login, character list |
| `CInputMain` | `PHASE_GAME` | All in-game packets (movement, combat, items, chat, etc.) |
| `CInputDead` | `PHASE_DEAD` | Limited input while dead |
| `CInputClose` | — | Graceful close phase |
| `CInputDB` | (DB channel) | Handles all `DG::*` packets from the db process |

---

## Subsystem: Combat (`battle.h` / `char_battle.cpp`)

### Free Functions (`battle.h`)

| Function | Description |
|----------|-------------|
| `battle_melee_attack(ch, victim)` | Executes a melee attack: computes damage, applies crits/penetrates, calls `victim->Damage()` |
| `battle_is_attackable(ch, victim)` | Returns true if `ch` can legally attack `victim` (phase, PK mode, faction, etc.) |
| `battle_end(ch)` | Clears battle state and attack target |
| `battle_distance_valid(ch, victim)` | Returns true if victim is within attack range |
| `battle_count_attackers(ch)` | Returns the number of characters currently targeting `ch` |
| `CalcMeleeDamage(attacker, victim, bIgnoreDefense, bIgnoreTargetRating)` | Computes raw melee damage |
| `CalcMagicDamage(attacker, victim)` | Computes magic damage |
| `CalcArrowDamage(attacker, victim, bow, arrow, bIgnoreDefense)` | Computes ranged (arrow) damage |
| `CalcAttBonus(attacker, victim, iAtk)` | Applies attacker race-bonus multipliers to base attack |
| `CalcBattleDamage(iDam, attackerLev, victimLev)` | Applies level-difference scaling to damage |
| `CalcAttackRating(attacker, victim, bIgnoreTargetRating)` | Computes hit/miss probability |
| `NormalAttackAffect(attacker, victim)` | Applies on-hit status effects (stun, slow, poison, curse) |
| `AttackAffect(attacker, victim, ...)` | Inline: applies a specific status-effect on hit with probability |
| `SkillAttackAffect(attacker, victim, ...)` | Inline: same but for skill-based status effects |
| `IS_SPEED_HACK(ch, victim, time)` | Detects if an attack was too fast (speed-hack) |

---

## Subsystem: Items (`item.h` / `item_manager.h`)

### `CItem` (`item.h`)

**Purpose:** Represents a game item instance. Inherits `CEntity` to participate in the spatial system (items can be on the ground). Each instance references a `TItemTable` prototype for static properties.

| Key Method | Description |
|-----------|-------------|
| `AddToCharacter(ch, Cell)` | Places item in a character's inventory/equipment slot |
| `RemoveFromCharacter()` | Removes item from owner's slot |
| `AddToGround(lMapIndex, pos)` | Places item on the ground |
| `RemoveFromGround()` | Picks item up from the ground |
| `EquipTo(ch, bWearCell)` | Equips to a specific wear slot |
| `ModifyPoints(bAdd)` | Applies/removes all stat bonuses from `m_aAttr` and sockets |
| `SetAttribute(i, bType, sValue)` | Sets a specific attribute on the item |
| `ChangeAttribute(aiChangeProb)` | Re-rolls magic attributes randomly |
| `AddAttribute()` | Adds a new random attribute |
| `AlterToSocketItem(iSocketCount)` | Adds sockets to the item |
| `AlterToMagicItem()` | Upgrades to magic tier |
| `StartDestroyEvent(iSec)` | Schedules automatic item deletion |
| `SetOwnership(ch, iSec)` | Assigns loot ownership to a character for `iSec` seconds |
| `GiveMoreTime_Per(fPercent)` / `GiveMoreTime_Fix(dwTime)` | Extends timed item duration |

### `ITEM_MANAGER` (`item_manager.h`)

Singleton managing all item instances and prototypes. Key methods:
- `CreateItem(dwVnum, count, id, bEdge)` — allocates a new `CItem`.
- `DestroyItem(item)` — deletes an item instance.
- `GetProto(dwVnum)` — returns the `TItemTable*` for a vnum.
- `CreateBlankItem()` — allocates an item with no vnum for initialisation.
- `FlushDelayedSave(ch)` — forces immediate DB save for a character's items.

---

## Subsystem: Quests (`quest.h` / `questmanager.h`)

### Quest Event Types

Quests are triggered by game events. Each event type corresponds to a directory in the compiled quest output:

| Constant | Trigger |
|----------|---------|
| `QUEST_CLICK_EVENT` | Player clicks an NPC |
| `QUEST_KILL_EVENT` | Player kills a monster |
| `QUEST_TIMER_EVENT` | Per-character timer fires |
| `QUEST_LEVELUP_EVENT` | Player levels up |
| `QUEST_LOGIN_EVENT` | Player logs in |
| `QUEST_LOGOUT_EVENT` | Player logs out |
| `QUEST_ITEM_USE_EVENT` | Player uses an item |
| `QUEST_ENTER_STATE_EVENT` | Quest enters a new state |
| `QUEST_TARGET_EVENT` | Target indicator event |
| `QUEST_PARTY_KILL_EVENT` | Party member kills a monster |

### `QuestState` Struct

Represents a suspended Lua coroutine for an in-progress quest interaction:

| Field | Type | Description |
|-------|------|-------------|
| `co` | `lua_State*` | The Lua coroutine |
| `ico` | `int` | Coroutine registry index |
| `suspend_state` | `BYTE` | `SUSPEND_STATE_NONE`, `_PAUSE`, `_SELECT`, `_INPUT`, `_CONFIRM`, `_SELECT_ITEM` |
| `st` | `int` | Current quest state index |
| `_title` | `std::string` | Quest title for client UI |
| `chat_scripts` | `std::vector<AArgScript*>` | Chat option scripts for dialogue |

### `CQuestManager` (`questmanager.h`)

Singleton. Loads compiled quest scripts, registers Lua API bindings, dispatches events to the appropriate quest/state scripts, and manages suspended coroutines (resuming them when players respond to dialogue prompts).

Key operations:
- `RunEvent(type, ch, npc, count)` — fires an event for a character.
- `Resume(ch, reply)` — resumes a suspended quest coroutine with a player's response.
- `SetCurrentCharacterPtr(ch)` / `GetCurrentCharacterPtr()` — provides the quest Lua API with a reference to the active character.

---

## Subsystem: Skills (`skill.h` / `char_skill.cpp`)

### `CSkillProto` (`skill.h`)

Loaded from the skill table at startup. Holds the skill vnum, flags, type (melee/range/magic), cost formula string, damage formula string, cooldown, and level caps. The game evaluates damage formulas through `libpoly::CPoly`.

---

## Subsystem: Guild (`guild.h` / `guild_manager.h`)

### `CGuild` (`guild.h`)

Represents a player guild. Tracks: guild ID, name, level, EXP, gold, skill levels, grade definitions, and member list.

Key methods: `AddMember(ch, grade)`, `RemoveMember(pid)`, `RequestWar(target, type)`, `UseSkill(dwSkillVnum, ch)`, `DepositMoney(amount)`, `WithdrawMoney(ch, amount)`.

### `CGuildManager` (`guild_manager.h`)

Singleton. Manages all guild instances, war scheduling, and broadcasting of guild events to connected clients.

---

## Subsystem: Party (`party.h`)

### `CParty`

Manages a group of up to 8 players: experience sharing, HP sharing, buff bonuses, party skill usage, and leader-follower distance checks.

Key methods: `AddMember(ch)`, `RemoveMember(ch)`, `Link(ch)`, `Unlink(ch)`, `GetExpeditionLeader()`, `UseSkill(dwVnum, ch)`.

---

## Subsystem: Maps / Sectors (`sectree.h` / `sectree_manager.h`)

### `SECTREE` (`sectree.h`)

A fixed-size spatial partition cell (sector). Holds a list of entities within its bounds. Broadcasts `EncodeInsertPacket`/`EncodeRemovePacket` to all player descriptors in the sector when entities enter or leave.

### `SECTREE_MANAGER` (`sectree_manager.h`)

Singleton. Loads map attribute files (`.atr`), manages sector tree grids per map index, and provides entity lookup by position.

Key methods: `LoadMap(lMapIndex, stMapName, func)`, `GetSectree(lMapIndex, x, y)`, `Find(lMapIndex, x, y)`, `IsValidPosition(lMapIndex, x, y)`.

---

## Subsystem: Events (`event.h` / `event_queue.h`)

### `LPEVENT` / `event_create` / `event_cancel`

A lightweight timer system. Events are allocated with `event_create(func, info, iSec)` and fire `func(info, pulse)` after `iSec` pulses. Many systems (item expiry, heal ticks, warp delays, affect durations) use this mechanism.

---

## Subsystem: Dungeon (`dungeon.h`)

### `CDungeon`

Manages an instanced dungeon: party entrance, mob spawning, timer attacks, stage progression, and automatic cleanup on completion or timeout.

---

## Subsystem: Additional Game Features

| File(s) | Feature |
|---------|---------|
| `exchange.h` / `.cpp` | Player-to-player item/gold exchange protocol |
| `safebox.h` / `.cpp` | Personal storage (safebox) and premium mall inventory |
| `shop.h` / `.cpp` | NPC shop buying/selling |
| `fishing.h` / `.cpp` | Fishing minigame: rod cast, bite detection, reel-in |
| `mining.h` / `.cpp` | Mining minigame: load and take actions |
| `cube.h` / `cube.cpp` | Cube crafting (item combination recipes) |
| `refine.h` / `.cpp` | Item refinement (upgrade stones + gold) |
| `DragonSoul.h` / `.cpp` | Dragon Soul gem system: grade/step/strength refinement |
| `dragon_soul_table.h` / `.cpp` | Dragon Soul refinement probability tables |
| `PetSystem.h` / `.cpp` | Pet summoning, levelling, and buff application |
| `marriage.h` / `.cpp` | In-game marriage system and wedding events |
| `arena.h` / `BattleArena.h` | PvP arena matchmaking and combat zone |
| `OXEvent.h` / `.cpp` | OX (true/false quiz) event management |
| `castle.h` / `.cpp` | Castle siege system |
| `building.h` / `.cpp` | Player estate/building placement |
| `pvp.h` / `.cpp` | General PvP mode and duel management |
| `dungeon.h` / `.cpp` | Instanced dungeon management |
| `DragonLair.h` / `.cpp` | Dragon Lair boss instance |
| `BlueDragon.h` / `.cpp` | Blue Dragon world boss event |
| `regen.h` / `.cpp` | Monster respawn scheduling |
| `mob_manager.h` / `.cpp` | Monster prototype loading and AI helpers |
| `motion.h` / `.cpp` | Animation/motion data for attack speed computation |
| `ani.h` / `.cpp` | Animation duration tables |
| `map_location.h` | Map index / name / coordinates registry |
| `MarkManager.h` / `MarkImage.h` / `MarkConvert.cpp` | Guild mark (emblem) upload, storage, and serving |
| `p2p.h` / `.cpp` | `P2PManager` singleton: GG P2P connection management and packet broadcast |
| `db.h` / `db.cpp` | `CDBManager` wrapper for GD/DG channel to the db process |
| `gm.h` / `.cpp` | GM admin level checks |
| `cmd.h` / `cmd*.cpp` | Admin slash-command dispatch table and implementations |
| `banword.h` / `.cpp` | Chat profanity filter |
| `config.h` / `config.cpp` | Configuration file parser (`game.conf`) |
| `constants.h` / `constants.cpp` | Game constant arrays (exp tables, damage tables) |
| `log.h` / `.cpp` | Game-specific action logging |
| `locale_service.h` / `.cpp` | Locale and language service |
| `SecureCipher.h` / `.cpp` | libsodium X25519 key exchange + XSalsa20-Poly1305 symmetric cipher |
| `buffer_manager.h` / `.cpp` | Packet buffer pool |
| `blend_item.h` / `.cpp` | Item stat blending / overlay logic |
| `buff_on_attributes.h` / `.cpp` | CBuffOnAttributes: attribute-set-based buff bonuses |
| `priv_manager.h` / `.cpp` | Empire/guild/character temporary privilege management |
| `polymorph.h` / `.cpp` | Polymorph (monster transformation) utilities |
| `messenger_manager.h` / `.cpp` | Friends list and online/offline notifications |
| `group_text_parse_tree.h` / `.cpp` | Group-text configuration file parser |
| `file_loader.h` / `.cpp` | Token-based config file reader |
| `crc32.h` / `crc32.cpp` | CRC32 for client-binary integrity checks |
| `empire_text_convert.h` / `.cpp` | Per-empire text conversion (font encoding) |
| `FSM.h` / `FSM.cpp` | `CFSM` and `CStateTemplate<T>`: generic finite state machine base |
| `entity.h` / `entity.cpp` | `CEntity`: base spatial entity with sector-tree registration |
| `vid.h` | `VID` type: strongly-typed virtual ID wrapper |
| `packet_structs.h` | All in-game packet payload structs (TPacketCG*, TPacketGC*, etc.) |
| `packet_reader.h` / `packet_writer.h` | Type-safe packet read/write helpers |

---

## Key Singleton Managers

| Class | Header | Role |
|-------|--------|------|
| `CHARACTER_MANAGER` | `char_manager.h` | All CHARACTER instances |
| `ITEM_MANAGER` | `item_manager.h` | All item instances and prototypes |
| `SECTREE_MANAGER` | `sectree_manager.h` | World map spatial index |
| `DESC_MANAGER` | `desc_manager.h` | All active network descriptors |
| `CQuestManager` | `questmanager.h` | Lua quest execution |
| `CGuildManager` | `guild_manager.h` | All guild instances |
| `P2PManager` | `p2p.h` | Inter-server P2P connections |
| `CDBManager` | `db.h` | GD/DG channel to db process |
| `CMobManager` | `mob_manager.h` | Monster prototypes and AI |
| `CPrivManager` | `priv_manager.h` | Server-wide rate privileges |
| `CMessengerManager` | `messenger_manager.h` | Friend lists |
| `CMarkManager` | `MarkManager.h` | Guild emblems |
