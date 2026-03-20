# Character System

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [What is a vnum?](concept-vnum)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

## Overview

Every interactive entity in the game world — player characters, NPCs, monsters, and bosses — is represented by a single unified `CHARACTER` class (server-side `char.h` / `char.cpp`). This design means one code path handles movement validation, combat resolution, status effects, and view-set management regardless of whether the entity is controlled by a human player, a scripted NPC, or the AI state machine.

The `CHARACTER` class inherits from `CEntity`, which provides the spatial identity (position, current SECTREE cell, view-set) shared by all world objects. On top of that base, `CHARACTER` layers:

- A **point array** (`m_points[]`) storing every numeric stat and resource value.
- A **skill level / cooldown table** per-character.
- Optional **descriptor pointer** (`m_pkDesc`) — `nullptr` for NPCs/monsters, a live `CDesc *` for connected players.
- A **type flag** (`CHAR_TYPE_PLAYER`, `CHAR_TYPE_NPC`, `CHAR_TYPE_MONSTER`, `CHAR_TYPE_STONE`, `CHAR_TYPE_WARP`, etc.) that gates which subsystems are active.
- A **proto pointer** (`TMonsterTable *`) for NPCs and monsters, which carries base stats, AI flags, drop groups, and movement parameters loaded from `mob_proto`.

The client mirrors this with `CInstanceBase` (GameLib) and exposes stats to Python scripts through `PythonCharacterModule.cpp`.

---

## Character Points System

All numeric attributes are stored in a flat array indexed by the `EPoints` enum defined in `length.h`. The server uses `GetPoint(type)` / `SetPoint(type, val)` / `PointChange(type, amount)` accessors. The client receives updates via `GC_POINT_CHANGE` packets.

| ID | Constant | Description |
|----|----------|-------------|
| 0 | `POINT_LEVEL` | Character level (1–120+) |
| 1 | `POINT_EXPERIENCE` | Current EXP toward next level |
| 2 | `POINT_NEXT_EXP` | EXP required for next level (read-only, derived) |
| 3 | `POINT_HP` | Current hit points |
| 4 | `POINT_MAX_HP` | Maximum hit points (base + bonus) |
| 5 | `POINT_SP` | Current skill points (mana/stamina) |
| 6 | `POINT_MAX_SP` | Maximum skill points |
| 7 | `POINT_STAMINA` | Sprint/riding stamina |
| 8 | `POINT_MAX_STAMINA` | Maximum stamina |
| 9 | `POINT_GOLD` | Yang (currency) held by character |
| 10 | `POINT_ST` | Strength (무력) — physical attack base |
| 11 | `POINT_HT` | Vitality (체력) — HP multiplier |
| 12 | `POINT_DX` | Dexterity (민첩) — hit rate, dodge, attack speed |
| 13 | `POINT_IQ` | Intelligence (정신력) — SP pool, magic damage |
| 14 | `POINT_ATT_SPEED` | Attack speed (base 100) |
| 15 | `POINT_MOV_SPEED` | Movement speed (base 100) |
| 16 | `POINT_CASTING_SPEED` | Skill casting speed |
| 17 | `POINT_MAGIC_ATT_GRADE` | Magic attack power bonus |
| 18 | `POINT_MAGIC_DEF_GRADE` | Magic defence bonus |
| 19 | `POINT_EMPIRE_PRIV_GOLD_RATE` | Empire EXP/Gold rate modifier |
| 20 | `POINT_LEVEL_STEP` | Sub-level step within a level (0–3) |
| 21 | `POINT_STAT` | Free stat points available to distribute |
| 22 | `POINT_SUB_SKILL` | Sub-skill points |
| 23 | `POINT_SKILL` | Active skill points |
| 24 | `POINT_BODY` | Body (근육) training level (warrior/sura) |
| 25 | `POINT_MENTAL` | Mental training level (shaman/assassin) |
| 26 | `POINT_ENCHANT` | Enchant bonus from equipment |
| 27 | `POINT_RESIST_SWORD` | Sword damage resistance % |
| 28 | `POINT_RESIST_TWOHAND` | Two-handed weapon resistance % |
| 29 | `POINT_RESIST_DAGGER` | Dagger resistance % |
| 30 | `POINT_RESIST_BELL` | Bell weapon resistance % |
| 31 | `POINT_RESIST_FAN` | Fan weapon resistance % |
| 32 | `POINT_RESIST_BOW` | Bow resistance % |
| 33 | `POINT_RESIST_FIRE` | Fire element resistance % |
| 34 | `POINT_RESIST_ELECTRIC` | Lightning resistance % |
| 35 | `POINT_RESIST_MAGIC` | General magic resistance % |
| 36 | `POINT_RESIST_WIND` | Wind resistance % |
| 37 | `POINT_REFLECT_MELEE` | Melee damage reflection % |
| 38 | `POINT_REFLECT_CURSE` | Curse reflection % |
| 39 | `POINT_POISON_REDUCE` | Poison duration/damage reduction |
| 40 | `POINT_KILL_HP_RECOVERY` | HP restored on kill |
| 41 | `POINT_KILL_SP_RECOVERY` | SP restored on kill |
| 42 | `POINT_HIT_HP_RECOVERY` | HP restored on hit |
| 43 | `POINT_HIT_SP_RECOVERY` | SP restored on hit |
| 44 | `POINT_MANASHIELD` | Mana shield damage absorption % |
| 45 | `POINT_ATT_GRADE` | Physical attack power grade (computed) |
| 46 | `POINT_DEF_GRADE` | Physical defence grade (computed) |
| 47 | `POINT_EVADE_GRADE` | Evasion chance grade |
| 48 | `POINT_ACCURACY` | Hit accuracy bonus |
| 49 | `POINT_RESIST_NORMAL_DAMAGE` | Normal damage % resistance |
| 50 | `POINT_EXPERIENCE_BONUS` | EXP gain bonus % |
| 51 | `POINT_GOLD_BONUS` | Yang drop bonus % |
| 52 | `POINT_ITEM_BONUS` | Item drop rate bonus % |
| 53 | `POINT_MALL_ATTBONUS` | Premium attack bonus (mall item) |
| 54 | `POINT_MALL_DEFBONUS` | Premium defence bonus |
| 55 | `POINT_MALL_EXPBONUS` | Premium EXP bonus |
| 56 | `POINT_MALL_ITEMBONUS` | Premium item drop bonus |
| 57 | `POINT_MALL_GOLDBONUS` | Premium gold drop bonus |
| 58 | `POINT_MAX_HP_PCT` | Max HP bonus % |
| 59 | `POINT_MAX_SP_PCT` | Max SP bonus % |
| 60 | `POINT_SKILL_DAMAGE_BONUS` | Skill damage % bonus |
| 61 | `POINT_NORMAL_HIT_DAMAGE_BONUS` | Normal hit damage % bonus |
| 62 | `POINT_SKILL_DEFEND_BONUS` | Incoming skill damage reduction % |
| 63 | `POINT_NORMAL_HIT_DEFEND_BONUS` | Incoming normal hit reduction % |
| 64 | `POINT_PC_BANG_EXP_BONUS` | PC-bang EXP multiplier |
| 65 | `POINT_PC_BANG_DROP_BONUS` | PC-bang drop multiplier |
| 66 | `POINT_RAMPAGE_ON_KILL_BONUS` | Rampage activation on kill |
| 67 | `POINT_ENERGY` | Energy/Holy Power (used in some subsystems) |
| 68 | `POINT_DEF_GRADE_BONUS` | Flat defence grade bonus |
| 69 | `POINT_RESIST_WARRIOR` | Damage reduction vs warrior class |
| 70 | `POINT_RESIST_ASSASSIN` | Damage reduction vs assassin class |
| 71 | `POINT_RESIST_SURA` | Damage reduction vs sura class |
| 72 | `POINT_RESIST_SHAMAN` | Damage reduction vs shaman class |
| 73 | `POINT_MAX_NUM` | Sentinel — total number of point types |

> Points above `POINT_MAX_NUM` that appear in affect or item bonus tables are remapped before storage.

---

## Jobs / Classes

Metin2 has four playable jobs, each with two gender variants (giving eight selectable characters). The job is stored in `TPlayerTable::job` and determines base stat growth, available skill sets, and AI-specific behaviour.

| Job ID | Constant | Name (EN) | Primary Stat | Weapon Types | Role |
|--------|----------|-----------|--------------|--------------|------|
| 0 | `JOB_WARRIOR` | Warrior (무사) | STR / HT | Sword, Two-hander | Tank / melee DPS |
| 1 | `JOB_ASSASSIN` | Assassin (자객) | DX / ST | Dagger, Bow | Burst / ranged DPS |
| 2 | `JOB_SURA` | Sura (수라) | ST / IQ | Sword (dark magic) | Melee-mage hybrid |
| 3 | `JOB_SHAMAN` | Shaman (무당) | IQ / HT | Fan, Bell | Support / healer |

### Stat Growth per Level-Up

Each job gains fixed base HP and SP increments per level, and receives a different weight for each primary stat when auto-calculating derived values:

| Job | HP/level | SP/level | Primary growth | Secondary growth |
|-----|----------|----------|----------------|-----------------|
| Warrior | High | Low | STR, HT | DX |
| Assassin | Medium | Medium | DX, ST | IQ |
| Sura | Medium | Medium | ST, IQ | DX |
| Shaman | Low | High | IQ, HT | ST |

### Skill Sets

Each job has three skill trees (two specialisations + one common tree). The active tree is selected at a certain level milestone and cannot be changed. Skills are indexed in `skill_proto` and referenced by vnum ranges assigned per job:

| Job | Tree A | Tree B | Common |
|-----|--------|--------|--------|
| Warrior | Body (근육) — high STR physical skills | Mental Warrior (검기) — sword-energy skills | Shared utility |
| Assassin | Weaponry (암격) — dagger/combo skills | Archery (궁술) — bow skills | Shared utility |
| Sura | Dark Force (마력술) — dark magic | Sword-Force (검마술) — combined melee/magic | Shared utility |
| Shaman | Dragon Force (용술) — offensive | Healing (무당술) — buffs/heals | Shared utility |

Skill levels run from 0 → Master (20) → Grand Master → Perfect Master, controlled by `SKILL_LEVEL_MAX` and the grand-master book system.

---

## Character Lifecycle

### Creation

1. Client sends `CG_CREATE_CHARACTER` with name, job, shape (gender), and initial stat distribution.
2. `input_login.cpp` validates the name (profanity filter via `banword`), checks uniqueness against the DB, and constructs a default `TPlayerTable` row.
3. Default equipment is granted based on `ITEM_GIVE_TABLE` for the job.
4. The record is inserted into the `player` table via the DB server (`ClientManagerPlayer.cpp`).

### Login / Map Entry

1. `input_login.cpp::LoginPacket` authenticates the account; `SelectCharacter` loads `TPlayerTable` from DB cache.
2. The game server calls `CHARACTER::Create()` to instantiate the in-memory object.
3. `CHARACTER::MainCharacterPacket()` sends the full character data to the client (stats, inventory, skills, affects, quickslots).
4. `CHARACTER::Show()` inserts the entity into the SECTREE grid, computes initial view sets, and broadcasts `GC_CHARACTER_ADD` to nearby players.

### Map Placement

- Each map is divided into **SECTREEs** — 25 000 × 25 000 unit cells (configurable via `SECTREE_SIZE`).
- `CHARACTER::SetPosition()` updates `m_lX`, `m_lY`, notifies the old and new SECTREE, and triggers `UpdateViewSet()` to add/remove nearby entities from this character's view set.
- Server-side coordinates are in 1/100 cm units (i.e., 100 units = 1 cm in-game).

### Logout / Disconnect

1. `desc.cpp` detects TCP disconnect; calls `CHARACTER::Disconnect()`.
2. Pending exchanges, party invites, and duel states are cancelled.
3. `CHARACTER::Save()` serialises `TPlayerTable`, inventory, skills, and affects to the DB server.
4. The character is removed from the SECTREE grid; `GC_REMOVE_CHARACTER` is broadcast to nearby players.
5. After a configurable save delay, the in-memory object is destroyed.

### Deletion

- Client sends `CG_DELETE_CHARACTER` with a deletion code.
- The server verifies the code against the stored `player_delete_code` and marks the row as deleted (soft-delete with a `7-day grace period` configurable via `PLAYER_DELETE_LIMIT_TIME`).

---

## NPC vs Player vs Monster

All three use the `CHARACTER` class, distinguished by the `m_bCharType` field and whether `m_pkDesc` is non-null.

| Aspect | Player | NPC | Monster |
|--------|--------|-----|---------|
| `m_bCharType` | `CHAR_TYPE_PLAYER` | `CHAR_TYPE_NPC` | `CHAR_TYPE_MONSTER` |
| Descriptor (`m_pkDesc`) | Non-null (live TCP connection) | `nullptr` | `nullptr` |
| AI state machine | None | `char_state.cpp` FSM | `char_state.cpp` FSM |
| Proto table | None (uses `TPlayerTable`) | `TMonsterTable` from `mob_proto` | `TMonsterTable` from `mob_proto` |
| Stat source | DB row / player input | `mob_proto` base values | `mob_proto` base values |
| Drop logic | N/A | Shopkeeper / quest | `item_drop` table |
| Persistence | DB-persisted | Respawned from `mob_spawn` | Respawned from `mob_spawn` |
| Skill usage | Player-controlled | Script/quest-driven | AI-driven (`char_state`) |
| Aggro / chase | N/A | Configurable flag | `AGGRO_RANGE`, `CHASE_RANGE` in proto |
| Movement | Client-authoritative (validated server-side) | Waypoint/wander AI | Aggro-chase or wander AI |

Monsters additionally carry:
- `m_pkParty` — boss-linked mob groups share a party for aggro synchronisation.
- `m_dwMountVnum` — some mounts are implemented as NPC characters attached to the player.
- Stone-type characters (`CHAR_TYPE_STONE` / metin stones) use a simplified FSM that only handles periodic regeneration pulses and player attacks.

---

## Movement System

### Client-Side Prediction

The client sends `CG_MOVE` packets containing direction and timestamp. The server:

1. Receives the packet in `input_main.cpp::Move()`.
2. Validates the requested position against the character's movement speed and elapsed time (anti-speed-hack check via `MOVE_LIMIT_RATE`).
3. Calls `CHARACTER::Move()` which updates the server-authoritative position.
4. Broadcasts `GC_MOVE` to all players in the character's view set.

### SECTREE Spatial System

```
World Map (e.g. 4096×4096 cells at 1 unit resolution)
└── SECTREEMAP  (one per map index)
    └── SECTREE grid  (25 000 × 25 000 unit cells)
        └── Each SECTREE holds a list of CEntity pointers
```

- `SECTREEMAP::Find(x, y)` performs an O(1) lookup into the flat grid array.
- When a character moves between SECTREE cells, `UpdateViewSet()` computes the symmetric difference of the old and new 3×3 SECTREE neighbourhoods, sending `GC_CHARACTER_ADD` for newly visible entities and `GC_REMOVE_CHARACTER` for entities that left view range.
- View radius is defined by `VIEW_RANGE` (default: 5 000 units) — characters within this radius of each other are in each other's view sets.

### NPC / Monster Movement

- **Wander**: FSM transitions to `STATE_MOVE`; a random target within `wander_range` of the spawn point is chosen; `CHARACTER::SetDestination()` sets a linear path.
- **Chase**: On aggro, `CHARACTER::Follow()` is called each tick to recalculate the path toward the target.
- **Return**: If the monster exceeds `CHASE_MAX_DISTANCE` from its spawn, it transitions to `STATE_RETURN`, moves back to spawn at increased speed, and resets HP.

---

## Party System

Implemented in `party.cpp` and referenced from `char.cpp` via `m_pkParty`.

### Creation and Membership

- A player sends `CG_PARTY_INVITE`; the target accepts with `CG_PARTY_INVITE_ANSWER`.
- `CParty::AddMember()` registers the new member, broadcasts `GC_PARTY_ADD` to all members.
- Maximum party size: **8 members** (configurable via `PARTY_MAX_MEMBER`).
- Parties are **server-local** — members must be on the same game server process. Cross-server parties are not supported without a P2P relay.

### EXP Sharing

When a monster is killed, the party's EXP is distributed via `CParty::GiveExp()`:

1. Each member within `PARTY_EXP_DISTRIBUTE_RANGE` (default: 5 000 units) is eligible.
2. A level-weighted formula divides total EXP: members closer in level to the monster receive proportionally more.
3. The **bonus EXP** multiplier increases with party size (up to ~20% extra at 8 members).

### Party Skills

At party formation the leader can enable party-wide passive skills if they have the requisite skill levels:

| Skill | Effect |
|-------|--------|
| Party Heal | Periodic HP recovery pulse for all members |
| Attacker's Buff | Attack bonus distributed to melee members |
| Defender's Buff | Defence bonus to tank-role members |
| Haste | Movement and attack speed bonus |
| Resurrection | Leader can revive fallen members in-place |

Party skill activation packets: `GC_PARTY_UPDATE` carries the current active party-skill bitmask.

---

## Guild System

Implemented in `guild.cpp`, `guild_manager.cpp`, `guild_war.cpp`.

### Membership and Ranks

- A `CGuild` object is identified by a `DWORD dwID` and `std::string m_stName` (max 12 characters).
- Maximum members: **32** by default, expandable via guild-level upgrades (level controlled by `m_data.level`).
- Guild EXP and level are stored in the `guild` DB table; rank names are customisable.

| Rank ID | Default Name | Permissions |
|---------|--------------|-------------|
| 0 | New Member | Chat, use guild storage (read) |
| 1 | Member | All rank-0 + guild skill activation |
| 2 | Officer | All rank-1 + invite/kick members, manage storage |
| 3 | Master | All permissions, declare guild war, disband guild |

### Guild Skills

Guild skills are levelled using accumulated Guild EXP. Active skills are activated by any online member of sufficient rank:

| Skill | Effect |
|-------|--------|
| Guild Haste | Speed bonus for all online guild members in the same map |
| Guild Strength | Attack bonus |
| Guild Defense | Defence bonus |
| Guild Blessing | HP/SP regeneration boost |

### Guild War

Declared via `CGuildManager::RequestWar()`. Two war types exist:

| Type | Constant | Description |
|------|----------|-------------|
| Normal war | `GUILD_WAR_TYPE_FIELD` | Open-world PvP; kill counts determine winner |
| Warvote war | `GUILD_WAR_TYPE_WARVOTE` | Initiated by mutual agreement; score-based |

War state machine: `GUILD_WAR_NONE` → `GUILD_WAR_SEND_DECLARE` → `GUILD_WAR_RECV_DECLARE` → `GUILD_WAR_WAIT_START` → `GUILD_WAR_ON_WAR` → `GUILD_WAR_END`.

All guild state changes broadcast `GC_GUILD` packets to every connected player who is a guild member.

---

## Character Sync Packets

The following packets are the primary protocol surface between game server and client for character state. Packet headers are defined in `packet_headers.h`.

### Server → Client (GC_*)

| Packet | Header | Purpose |
|--------|--------|---------|
| `GC_CHARACTER_ADD` | `HEADER_GC_CHARACTER_ADD` | Notify client that a new entity entered view range; carries vnum, position, movement speed, empire, guild ID, name |
| `GC_CHARACTER_DEL` / `GC_REMOVE_CHARACTER` | `HEADER_GC_CHARACTER_DEL` | Entity left view range or despawned |
| `GC_MOVE` | `HEADER_GC_MOVE` | Broadcast authoritative position + direction + speed after a move |
| `GC_POINT_CHANGE` | `HEADER_GC_POINT_CHANGE` | Single point type changed (type + new value); client updates stat display |
| `GC_CHARACTER_UPDATE` | `HEADER_GC_CHARACTER_UPDATE` | Batch update of appearance (hair, armour, weapon vnum) for a visible entity |
| `GC_SKILL_LEVEL` | `HEADER_GC_SKILL_LEVEL` | Full skill table dump on login or selective update after level-up |
| `GC_AFFECT_ADD` | `HEADER_GC_AFFECT_ADD` | A buff/debuff affect was applied; carries type, apply type, value, duration |
| `GC_AFFECT_REMOVE` | `HEADER_GC_AFFECT_REMOVE` | A buff/debuff affect expired or was dispelled |
| `GC_PARTY_ADD` | `HEADER_GC_PARTY_ADD` | New member joined the local party |
| `GC_PARTY_UPDATE` | `HEADER_GC_PARTY_UPDATE` | Party member HP/SP/status changed |
| `GC_PARTY_REMOVE` | `HEADER_GC_PARTY_REMOVE` | Member left the party |
| `GC_GUILD` | `HEADER_GC_GUILD` | Guild state update (sub-command field selects: info, member list, skill, war) |
| `GC_DAMAGE_INFO` | `HEADER_GC_DAMAGE_INFO` | Damage numbers to display (attacker VID, defender VID, damage, flags) |
| `GC_DEAD` | `HEADER_GC_DEAD` | Target character died |
| `GC_WARP` | `HEADER_GC_WARP` | Player is being transferred to a new map/coordinates |
| `GC_MAIN_CHARACTER` | `HEADER_GC_MAIN_CHARACTER` | Full player data packet sent once on login (stats, equipment, skills, position) |
| `GC_PLAYER_POINTS` | `HEADER_GC_PLAYER_POINTS` | Full point array refresh (all 73 points) |

### Client → Server (CG_*)

| Packet | Header | Purpose |
|--------|--------|---------|
| `CG_MOVE` | `HEADER_CG_MOVE` | Movement request (direction, timestamp, position hint) |
| `CG_ATTACK` | `HEADER_CG_ATTACK` | Melee attack on target VID |
| `CG_USE_SKILL` | `HEADER_CG_USE_SKILL` | Activate skill (skill vnum, target VID, position) |
| `CG_CHAT` | `HEADER_CG_CHAT` | Chat message (normal, shout, party, guild channels) |
| `CG_POINT_UP` | `HEADER_CG_POINT_UP` | Spend one free stat point on ST/HT/DX/IQ |
| `CG_ITEM_USE` | `HEADER_CG_ITEM_USE` | Use an inventory item |
| `CG_PARTY_INVITE` | `HEADER_CG_PARTY_INVITE` | Invite target VID to party |
| `CG_PARTY_INVITE_ANSWER` | `HEADER_CG_PARTY_INVITE_ANSWER` | Accept or reject a party invite |
| `CG_PARTY_LEAVE` | `HEADER_CG_PARTY_LEAVE` | Leave current party |
| `CG_PARTY_KICK` | `HEADER_CG_PARTY_KICK` | Kick member from party (leader only) |
| `CG_CREATE_CHARACTER` | `HEADER_CG_CREATE_CHARACTER` | Create new character (name, job, shape, stats) |
| `CG_DELETE_CHARACTER` | `HEADER_CG_DELETE_CHARACTER` | Delete character (requires deletion PIN) |
| `CG_SELECT_CHARACTER` | `HEADER_CG_SELECT_CHARACTER` | Select character slot and enter world |

---

## Key Files

| File | Repository Path | Role |
|------|----------------|------|
| `char.h` | `server-src/src/game/char.h` | `CHARACTER` class declaration; all member variables, method signatures, inner types |
| `char.cpp` | `server-src/src/game/char.cpp` | Core lifecycle: `Create`, `Destroy`, `Show`, `Hide`, `Save`, `MainCharacterPacket` |
| `char_battle.cpp` | `server-src/src/game/char_battle.cpp` | Attack resolution, damage formula, critical/dodge rolls, death handling |
| `char_skill.cpp` | `server-src/src/game/char_skill.cpp` | Skill use, cooldown management, level-up, grandmaster promotion |
| `char_affect.cpp` | `server-src/src/game/char_affect.cpp` | Buff/debuff application, expiry timer, stacking rules |
| `char_item.cpp` | `server-src/src/game/char_item.cpp` | Inventory management, equip/unequip, item-stat application |
| `char_state.cpp` | `server-src/src/game/char_state.cpp` | NPC/monster AI FSM: idle, wander, aggro, chase, return states |
| `char_horse.cpp` | `server-src/src/game/char_horse.cpp` | Mount/horse system: summoning, riding stats, horse HP |
| `char_resist.cpp` | `server-src/src/game/char_resist.cpp` | Element and weapon-type resistance computation |
| `char_quickslot.cpp` | `server-src/src/game/char_quickslot.cpp` | Quickslot bar persistence and sync |
| `char_dragonsoul.cpp` | `server-src/src/game/char_dragonsoul.cpp` | Dragon Soul stone equipment subsystem |
| `char_change_empire.cpp` | `server-src/src/game/char_change_empire.cpp` | Empire transfer logic and restrictions |
| `char_manager.cpp` | `server-src/src/game/char_manager.cpp` | `CHARACTER_MANAGER` singleton: VID allocation, global character lookup, tick dispatcher |
| `party.cpp` | `server-src/src/game/party.cpp` | `CParty` class: member management, EXP distribution, party skills |
| `guild.cpp` | `server-src/src/game/guild.cpp` | `CGuild` class: member ranks, skills, war declarations |
| `guild_war.cpp` | `server-src/src/game/guild_war.cpp` | Guild war state machine, score tracking |
| `guild_manager.cpp` | `server-src/src/game/guild_manager.cpp` | `CGuildManager` singleton: guild creation, lookup, cross-guild operations |
| `length.h` | `server-src/src/common/length.h` | All game-wide constants: `EPoints`, `EJobs`, limits, sizes |
| `tables.h` | `server-src/src/common/tables.h` | `TPlayerTable`, `TMonsterTable`, `TSkillTable` — DB-wire structs |
| `packet_headers.h` | `server-src/src/common/packet_headers.h` | All `HEADER_GC_*` / `HEADER_CG_*` packet opcode constants |
| `input_main.cpp` | `server-src/src/game/input_main.cpp` | Main game-phase packet dispatcher: move, attack, chat, skill use |
| `input_login.cpp` | `server-src/src/game/input_login.cpp` | Login-phase packet handler: character select, create, delete |
| `entity.cpp` / `entity.h` | `server-src/src/game/entity.cpp` | Base `CEntity` class: VID, position, SECTREE registration |
| `battle.cpp` | `server-src/src/game/battle.cpp` | Stand-alone damage and hit-rate functions called from `char_battle.cpp` |
| `affect.cpp` | `server-src/src/game/affect.cpp` | `CAffect` value-object; serialisation helpers |
| `PythonCharacterModule.cpp` | `client-src/PythonModules/PythonCharacterModule.cpp` | Python ↔ C++ bridge exposing character queries to UI scripts |
| `CInstanceBase` (GameLib) | `client-src/GameLib/` | Client-side character representation: rendering, interpolation, animation state |
