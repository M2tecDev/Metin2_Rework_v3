# Blueprint: Character System

> Full-stack architecture blueprint for the CHARACTER class — the unified entity model used for players, NPCs, and monsters. Covers the point array, job system, movement validation, party/guild, and extension how-tos. Companion to [Character System](topic-Character-System).

---

## 1. Full-Stack Architecture

The character system spans from the database row definition all the way to Python UI callbacks for stat display.

### Layer 1 — Database / Proto

| File | Class / Table | Role |
|------|--------------|------|
| `player` SQL table | — | Persists all `TPlayerTable` fields per character (level, stats, gold, map position, job, hair) |
| `player_item` SQL table | — | Persists all inventory and equipment items as `TPlayerItem` rows |
| `mob_proto` SQL table | — | Defines all NPC/monster base stats, AI flags, aggro range, attack speed, race flags |
| `skill_proto` SQL table | — | Defines all skills: base vnum, name, job affinity, level formulae, poly expressions |
| `server-src/src/common/tables.h` | `TPlayerTable` | Binary wire struct for player persistence: 164+ fields packed with `#pragma pack(1)` |
| `server-src/src/common/tables.h` | `TMonsterTable` | Binary wire struct for mob/NPC proto loaded at startup |
| `server-src/src/common/tables.h` | `TSkillTable` | Binary wire struct for skill proto entries |
| `server-src/src/common/length.h` | `EPoints` (POINT_MAX_NUM=255), `EJobs`, `EWearPositions` (WEAR_MAX=32) | All game-wide numeric limits and enum definitions |

### Layer 2 — Server Core (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/char.h` | `CHARACTER` | Central entity class; all stat/skill/item/move/combat methods declared here |
| `server-src/src/game/char.cpp` | `CHARACTER::Create()`, `::Save()`, `::Show()`, `::MainCharacterPacket()` | Lifecycle: instantiation, DB serialisation, SECTREE insertion, initial client sync |
| `server-src/src/game/char_manager.cpp` | `CHARACTER_MANAGER::SpawnMob()`, `::Find(vid)` | Singleton VID allocator; NPC/monster spawning from regen entries; tick dispatcher |
| `server-src/src/game/char_battle.cpp` | `CHARACTER::Damage()`, `CHARACTER::Dead()`, `battle_melee_attack()` | Attack resolution, death handling, PvP mode checks |
| `server-src/src/game/char_skill.cpp` | `CHARACTER::UseSkill()`, `::AddSkill()`, `::SetSkillLevel()` | Skill activation, cooldown management, mastery promotion |
| `server-src/src/game/char_affect.cpp` | `CHARACTER::AddAffect()`, `::RemoveAffect()`, `::RefreshAffect()` | Buff/debuff apply + expiry timers; recomputes derived stats after each change |
| `server-src/src/game/char_item.cpp` | `CHARACTER::EquipItem()`, `::UnequipItem()`, `::PointChange()` | Equipment stat application; triggers `PointChange` for each affect apply/remove |
| `server-src/src/game/char_state.cpp` | `CHARACTER::StateIdle()`, `::StateMove()`, `::StateChase()` | NPC/monster AI finite-state machine; runs every server pulse |
| `server-src/src/game/char_horse.cpp` | `CHARACTER::MountHorse()`, `::DismountHorse()`, `::HorseFeed()` | Classic horse system: feed→level, riding stat bonuses, horse HP tracking |
| `server-src/src/game/entity.h` | `CEntity` | Base class: VID, `(m_lX, m_lY)` position, current SECTREE pointer, view-set |
| `server-src/src/game/party.cpp` | `CParty::AddMember()`, `::GiveExp()` | Party management, EXP distribution, party skill activation |
| `server-src/src/game/guild.cpp` | `CGuild::AddMember()`, `::UsePower()` | Guild member ranks, skill activation, war state |
| `server-src/src/game/battle.cpp` | `CalcMeleeDamage()`, `CalcAttackRating()`, `CalcDefence()` | Standalone damage formula functions; called from `char_battle.cpp` |
| `server-src/src/game/input_main.cpp` | `CInputMain::Move()`, `::PointUp()`, `::UseSkill()` | In-game packet handlers that call CHARACTER methods |

### Layer 3 — Network

| Packet | Header | Direction | Payload Summary |
|--------|--------|-----------|----------------|
| `GC::MAIN_CHARACTER` | `0x0210` | Server→Client | Full player data on login: VID, job, position, map index, race |
| `GC::CHARACTER_ADD` | `0x0205` | Server→Client | Spawn a new visible actor: VID, type, position, speed, name, guild, flags |
| `GC::CHARACTER_DEL` | `0x0208` | Server→Client | Remove an actor from client view range |
| `GC::CHARACTER_UPDATE` | `0x0209` | Server→Client | Batch appearance update: armour vnum, weapon vnum, hair vnum |
| `GC::PLAYER_POINTS` | `0x0214` | Server→Client | Full stat array dump (all 255 `EPoints` values) sent on login |
| `GC::PLAYER_POINT_CHANGE` | `0x0215` | Server→Client | Single stat delta: `type` + `value` (e.g. HP lost in combat) |
| `GC::MOVE` | `0x0302` | Server→Client | Authoritative position broadcast: VID, func, rot, x, y, time |
| `GC::AFFECT_ADD` | `0x0A20` | Server→Client | Apply buff/debuff: type, applyOn, value, flag, duration |
| `GC::AFFECT_REMOVE` | `0x0A21` | Server→Client | Remove a buff/debuff by type |
| `GC::SKILL_LEVEL` | `0x021A` | Server→Client | Skill level data: vnum, level, masterType, nextReadTime |
| `GC::DEAD` | `0x0217` | Server→Client | Notify client that a VID has died |
| `GC::STUN` | `0x0216` | Server→Client | Character is stunned (reduced inputs) |
| `GC::PARTY_ADD` | `0x0711` | Server→Client | New member joined party: PID, name, state |
| `GC::PARTY_UPDATE` | `0x0712` | Server→Client | Party member HP/level changed |
| `GC::GUILD` | `0x0730` | Server→Client | Guild state sub-packet (sub-header selects: info/members/skills/war) |
| `CG::MOVE` | `0x0301` | Client→Server | Player movement: func, rot, x, y, timestamp |
| `CG::ATTACK` | `0x0401` | Client→Server | Melee attack: motAttack, victimVID |
| `CG::USE_SKILL` | `0x0402` | Client→Server | Skill activation: skillVnum, targetVID |
| `CG::CHARACTER_POSITION` | `0x0A60` | Client→Server | Forced position report (anti-cheat sync) |

### Layer 4 — Client C++

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/GameLib/InstanceBase.h` | `CInstanceBase` | Client-side character: position, animation state, equipment vnum display |
| `client-src/src/GameLib/InstanceBase.cpp` | `CInstanceBase::SetPosition()`, `::Move()` | Interpolates movement from `GC::MOVE` data between server ticks |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvMainCharacterPacket()`, `RecvCharacterAddPacket()`, `RecvPointChangePacket()` | Parse GC packets; feed `CPythonPlayer` and `CNetworkActorManager` |
| `client-src/src/UserInterface/NetworkActorManager.cpp` | `CNetworkActorManager::AppendActor()`, `::UpdateActor()` | Translates network actor data into `CInstanceBase` scene objects |
| `client-src/src/PythonModules/PythonCharacterModule.cpp` | `characterGetPoint()`, `characterGetStatus()` | Python extension module; exposes `chr.GetPoint(type)`, `chr.GetStatus()` to scripts |
| `client-src/src/PythonModules/PythonPlayerModule.cpp` | `playerGetPoint()`, `playerGetStatus()` | Exposes `player.GetPoint(type)` to Python for the local character |

### Layer 5 — Python UI

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/uicharacter.py` | `CharacterWindow` | Displays stats (ST, HT, DX, IQ), free stat points, HP/SP bars; calls `player.GetPoint()` |
| `client-bin/assets/root/uiaffect.py` | `AffectShower` | Renders active buff/debuff icons; updated by `GC::AFFECT_ADD` / `::AFFECT_REMOVE` callbacks |
| `client-bin/assets/root/uiskill.py` | `SkillWindow` | Skill tree window; reads skill level/cooldown data, renders mastery progress |
| `client-bin/assets/root/uiparty.py` | `PartyWindow` | Party member list with HP bars; updated from `GC::PARTY_UPDATE` |
| `client-bin/assets/root/uiguild.py` | `GuildWindow` | Guild member list, rank editor, guild skill buttons |
| `client-bin/assets/root/gameevent.py` | `OnPointChange()`, `OnAffectAdded()` | Event dispatch layer: Python callbacks registered for GC stat/affect events |

---

## 2. Causal Chain

### Chain A: Player allocates a stat point (ST/HT/DX/IQ)

```
[Trigger]  Player clicks the + button next to STR in the Character window
    │
    ▼  (root/uicharacter.py : CharacterWindow.OnClickStatButton)
[1] Python calls player.PointUp(POINT_ST)
    net.SendPointUpPacket(POINT_ST)
    │
    ▼  packet: CG::POINT_UP (0x021? — stat sub-field)
[2] (UserInterface/PythonNetworkStreamPhaseGame.cpp : SendPointUpPacket)
    Builds TPacketCGPointUp: header, point_type=POINT_ST
    Encrypt + send
    │
    ▼  (game/input_main.cpp : CInputMain::PointUp)
[3] Reads point_type; calls ch->PointChange(POINT_STAT, -1) [consume free point]
    Calls ch->PointChange(POINT_ST, +1)
    │
    ▼  (game/char.cpp : CHARACTER::PointChange)
[4] Updates m_points[POINT_ST]
    Recalculates ATT_GRADE from (ST + equipment bonuses)
    Recomputes DEF_GRADE, MAX_HP if relevant
    │
    ▼  Sends to client's DESC:
    packet: GC::PLAYER_POINT_CHANGE (0x0215) × N  [one per changed derived point]
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvPointChangePacket)
[5] Updates CPythonPlayer::m_akPoint[type] for each changed point
    Fires Python callback: gameevent.OnPointChange(type, value)
    │
    ▼  (root/uicharacter.py : CharacterWindow.RefreshStatus)
[6] Reads player.GetPoint(POINT_ST), redraws stat number and ATT_GRADE display
    │
    ▼  [End] Updated STR value and attack power shown in character window
```

### Chain B: Buff applied by a skill → visible icon

```
[Trigger]  Server-side skill hits the player (or player uses a buff skill on self)
    │
    ▼  (game/char_affect.cpp : CHARACTER::AddAffect)
[1] Creates CAffect object: type, applyOn, applyValue, flag, duration
    Registers expiry pulse via AddTimer
    Calls ch->RefreshAffect() → recomputes affected point (e.g. ATT_SPEED)
    │
    ▼  (game/char.cpp : CHARACTER::PointChange for affected stat)
[2] m_points[POINT_ATT_SPEED] updated
    GC::PLAYER_POINT_CHANGE sent for ATT_SPEED
    │
    ▼  Also sends:
    packet: GC::AFFECT_ADD (0x0A20)
    payload: dwType, bApplyOn, lApplyValue, dwFlag, lDuration
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvAffectAddPacket)
[3] Stores affect in CPythonPlayer affect map
    Calls Python callback gameevent.OnAffectAdded(dwType, duration)
    │
    ▼  (root/uiaffect.py : AffectShower.ShowAffect)
[4] Adds buff icon with countdown timer; tooltip shows duration
    │
    ▼  [End] Buff icon visible in HUD; stat value increased in character window
```

### Chain C: NPC/Monster spawns and enters player view

```
[Trigger]  Regen pulse fires (event loop, server tick)
    │
    ▼  (game/char_manager.cpp : CHARACTER_MANAGER::SpawnMob)
[1] Allocates new CHARACTER object with VID
    Loads TMonsterTable from mob_proto (AI flags, stats, race flags)
    Calls ch->Show(mapIndex, x, y)
    │
    ▼  (game/char.cpp : CHARACTER::Show)
[2] CHARACTER inserted into SECTREE at (x, y)
    SECTREE::UpdateViewSet() computes which DESC objects have view range overlap
    │
    ▼  For each DESC in view range:
    packet: GC::CHARACTER_ADD (0x0205)
    payload: VID, type=CHAR_TYPE_MONSTER, x, y, raceNum, movSpeed, atkSpeed, name
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvCharacterAddPacket)
[3] CNetworkActorManager::AppendActor() → creates CInstanceBase in the scene
    Sets position, animation state, model from raceNum
    │
    ▼  [End] Monster appears on client screen at spawn coordinates
```

---

## 3. Dependency Matrix

### Sync Points

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `TPlayerTable` binary layout (`#pragma pack(1)`) | `common/tables.h` | `common/tables.h` (shared) | `DG::PLAYER_LOAD_SUCCESS` delivers wrong level/HP/position; character appears at wrong coords or with zero HP |
| `TMonsterTable` binary layout | `common/tables.h` | `common/tables.h` (shared) | Client displays wrong name/race/speed for all NPCs and monsters |
| `EPoints` enum values (indices 0–254) | `common/length.h` | `PythonModules/PythonPlayerModule.cpp` + `uicharacter.py` constants | `GC::PLAYER_POINT_CHANGE` updates the wrong stat on the client; HP shown instead of SP |
| `EWearPositions` (WEAR_BODY=0 … WEAR_BELT=23, WEAR_MAX=32) | `common/length.h` | `GameLib/ItemManager.h` + Python `item.EQUIPMENT_*` constants | Equipment placed in the wrong visual slot; wrong stats applied on equip |
| `GC::CHARACTER_ADD` payload struct (VID, type, x, y, raceNum, speeds, flags) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client spawns actors at wrong positions or with wrong race (wrong 3D model) |
| `GC::PLAYER_POINTS` full array size (255 entries × 8 bytes each) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client reads wrong offsets for all stats after the mismatch point |
| `GC::AFFECT_ADD` layout (dwType, bApplyOn, lApplyValue, dwFlag, lDuration) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client shows wrong buff duration or wrong effect icon |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| `POINT_MAX_NUM` | 255 | `common/length.h` | Adding a 256th point type requires widening the `m_points[]` array and all packet serialisation; `GC::PLAYER_POINTS` packet grows |
| `WEAR_MAX_NUM` | 32 | `common/length.h` | Adding equipment slot 33+ requires changing `TPlayerTable.aEquipment[32]` size and packet struct; inventory slot layout breaks |
| `PLAYER_PER_ACCOUNT` | 4 | `common/length.h` | `GC::LOGIN_SUCCESS` sends exactly 4 `TSimplePlayerInformation` structs; changing to 5 requires resizing the packet and all client-side slot UI |
| `PLAYER_MAX_LEVEL_CONST` | 120 | `common/length.h` | EXP table array `PLAYER_EXP_TABLE_MAX=120`; accessing level 121 reads uninitialized memory |
| `INVENTORY_MAX_NUM` | 90 | `common/length.h` | Inventory grid (45 slots × 2 pages); client `CGrid` hardcodes 90-slot layout |
| `QUICKSLOT_MAX_NUM` | 36 | `common/length.h` | `TPlayerTable.aQuickslot[36]`; exceeding silently truncates quickslot saves |
| `PARTY_MAX_MEMBER` | 8 | `game/party.cpp` (define) | `CParty` member array; exceeding causes out-of-bounds write in `AddMember()` |
| `GUILD_MAX_LEVEL` | 20 | `common/length.h` | Guild EXP curve table has 20 entries; beyond level 20 reads garbage |
| `SKILL_MAX_NUM` | 255 | `common/length.h` | `TPlayerTable.skills[255]`; adding skill vnum >254 requires widening |
| `CHAR_TYPE_*` enum | PLAYER=0 … WARP=6 | `char.h` (enum) | `GC::CHARACTER_ADD` bType field; new type requires client-side model lookup entry |

---

## 4. Extension How-To

### How to add a new point type (new stat)

1. **`server-src/src/common/length.h`** — Add to `EPoints` enum before `POINT_MAX_NUM`:
   ```cpp
   POINT_MY_NEW_STAT = 74,  // was the old MAX
   POINT_MAX_NUM = 75,
   ```
2. **`server-src/src/game/char.h`** — No change needed if `m_points[POINT_MAX_NUM]` is dynamically sized; if it is a fixed array, update the array declaration.
3. **`server-src/src/game/char.cpp`** — Add the initial value for new characters in `CHARACTER::Create()` if non-zero default.
4. **`server-src/src/common/tables.h`** — If the stat is persisted in `TPlayerTable`, add a field (at the end to preserve layout), update `sizeof` assertions.
5. **`client-src/src/PythonModules/PythonPlayerModule.cpp`** — Add the Python constant:
   ```cpp
   PyModule_AddIntConstant(m, "POINT_MY_NEW_STAT", POINT_MY_NEW_STAT);
   ```
6. **`client-bin/assets/root/uicharacter.py`** — Display the new stat in the character window where appropriate.
7. **`server-src/src/game/char_affect.cpp`** — If buffs can apply to the new stat, add a case in `CHARACTER::ApplyPoint()` switch.

### How to add a new equipment slot

1. **`common/length.h`** — Add to `EWearPositions` enum before `WEAR_MAX`:
   ```cpp
   WEAR_NEW_SLOT = 24,  // insert before WEAR_MAX = 32
   ```
   Ensure `WEAR_MAX` stays ≥ the new highest value.
2. **`common/tables.h`** — `TPlayerTable.aEquipment[]` must cover the new index; check the array size matches `WEAR_MAX`.
3. **`game/char_item.cpp`** — Add equip/unequip handling for the new slot in `CHARACTER::EquipItem()` and `::UnequipItem()`.
4. **`common/item_length.h`** — Add the corresponding `WEAR_FLAG` bit for items that go in the new slot.
5. **`client-src/src/GameLib/ItemManager.h`** — Mirror the new `EWearPositions` value.
6. **`client-bin/assets/root/uiinventory.py`** — Add the new slot cell to the equipment grid layout.
7. **`client-bin/assets/uiscript/inventory.py`** — Update the UI layout file to include a slot widget at the desired position.

### How to add a new character job/class

1. **`common/length.h`** — Add to `EJobs` enum (currently `JOB_WARRIOR=0` … `JOB_SHAMAN=3`).
2. **`game/char.cpp`** — Add the new job's stat growth tables in `CHARACTER::CreateJob()` or equivalent initialiser.
3. **`skill_proto`** — Add skill entries with vnum ranges assigned to the new job.
4. **`game/char_skill.cpp`** — Ensure skill-set assignment logic covers the new `JOB_*` value.
5. **`client-src/src/GameLib/`** — Add the 3D race/model lookup entry for the new job's race vnums.
6. **`client-bin/assets/root/introselect.py`** — Add the job selection UI slot.

### Controlling Constants

| Constant | File | Controls |
|----------|------|---------|
| `EPoints` / `POINT_MAX_NUM` | `common/length.h` | All stat indices; array sizes in `TPlayerTable` and `CHARACTER` |
| `EWearPositions` / `WEAR_MAX_NUM` | `common/length.h` | Equipment slot indices; `TPlayerTable.aEquipment[]` size |
| `PLAYER_MAX_LEVEL_CONST` / `PLAYER_EXP_TABLE_MAX` | `common/length.h` | Level cap and EXP curve table bounds |
| `INVENTORY_MAX_NUM` | `common/length.h` | Inventory grid size (2 pages × 45 slots) |
| `PARTY_MAX_MEMBER` | `game/party.cpp` | Maximum party members (CParty member array) |
| `GUILD_MAX_LEVEL` | `common/length.h` | Guild level cap; EXP curve table size |
| `SKILL_MAX_NUM` | `common/length.h` | Skill table size in `TPlayerTable.skills[]` |
| `CHAR_TYPE_*` enum | `game/char.h` | Character type values sent in `GC::CHARACTER_ADD.bType` |
| `VIEW_RANGE` | `game/sectree.h` (define) | Radius for SECTREE view-set updates; affects GC_CHARACTER_ADD broadcast range |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| Character spawns at position (0, 0) or underground | `TPlayerTable.x`/`y` not loaded correctly, or map index not set | `db/ClientManagerPlayer.cpp` : `RESULT_PLAYER_LOAD()` — check `TPlayerTable` field offsets |
| All stats show 0 in character window after login | `EPoints` enum value mismatch client vs server | Compare `common/length.h` (server) vs `PythonPlayerModule.cpp` Python constants |
| HP bar always shows max (no damage reflected) | `GC::PLAYER_POINT_CHANGE` not reaching client, or point type wrong | `game/char.cpp` : `CHARACTER::PointChange()` — confirm `POINT_HP` send; check `input_main.cpp` handler |
| Wrong equipment shown on character model | `EWearPositions` mismatch between client and server | `common/length.h` vs `GameLib/ItemManager.h` — compare `WEAR_BODY`, `WEAR_WEAPON` etc. |
| Buff icon appears but effect not applied | `CAffect` applyOn type not handled in `CHARACTER::ApplyPoint()` | `game/char_affect.cpp` : `CHARACTER::ApplyPoint()` switch — add the missing case |
| NPC/monster appears with wrong model | `wRaceNum` in `GC::CHARACTER_ADD` does not match `mob_proto.vnum` | `game/char.cpp` : `CHARACTER::MainCharacterPacket()`; `mob_proto` table `vnum` column |
| `sys_err: UseSkill: not found skill by vnum 1234` | Skill vnum not in `skill_proto` table | `skill_proto` SQL table; `game/char_skill.cpp` : `CHARACTER::UseSkill()` early return |
| Party HP bars not updating | `GC::PARTY_UPDATE` not sent, or PID/VID lookup fails | `game/party.cpp` : `CParty::SendPartyUpdatePacket()` — confirm it is called from `CHARACTER::PointChange()` |
| Guild skills not activating | Guild level too low, or cooldown not expired | `game/guild.cpp` : `CGuild::UsePower()` — check `m_iSkillCooltime` and `m_data.level` guards |
| Monster never chases player (no aggro) | `mob_proto.ai_flag` does not include `AGGRO` bit, or aggro range = 0 | `mob_proto` table `ai_flag` column; `game/char_state.cpp` : `StateIdle()` aggro distance check |
| Character level-up does not grant stat points | `PointChange(POINT_STAT, …)` not called in level-up path | `game/char.cpp` : `CHARACTER::LevelUp()` — check `PointChange(POINT_STAT, +3)` call |

---

## Related

- **Topic page:** [Character System](topic-Character-System) — complete lifecycle, party/guild details, all packet tables
- **Blueprint:** [blueprint-Combat-System](blueprint-Combat-System) — `battle_melee_attack()`, `CalcMeleeDamage()`, affect interactions
- **Blueprint:** [blueprint-Item-System](blueprint-Item-System) — `EquipItem()`/`UnequipItem()`, `EWearPositions`, equipment stat pipeline
- **Blueprint:** [blueprint-Login-Flow](blueprint-Login-Flow) — `TPlayerTable` load chain, `MainCharacterPacket()`, phase sequence
- **Calculator:** [Horse Level Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/horse-level.html) — feed items and yang cost to reach target horse level
- **Calculator:** [Flags Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/flags.html) — encode/decode `EWearPositions`, `ANTI_FLAG`, `RACE_FLAG` bitmasks
