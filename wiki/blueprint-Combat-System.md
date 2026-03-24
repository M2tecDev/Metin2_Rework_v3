# Blueprint: Combat System

> ### 📖 New to this topic?
> This is an advanced reference page. If you are not familiar with the basics yet, read these first:
> - [How Everything Fits Together](concept-architecture)
>
> **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture

> Full-stack architecture blueprint for the server-authoritative real-time combat model — melee damage pipeline, magic/arrow/skill damage, hit/crit/penetrate rolls, on-hit affects, speed-hack detection, and PvP legality gating. Companion to [Combat System](topic-Combat-System).

---

## 1. Full-Stack Architecture

Combat is server-authoritative: the client sends intent packets, the server computes all outcomes, and only then sends results back.

### Layer 1 — Database / Proto

| File | Class / Table | Role |
|------|--------------|------|
| `skill_proto` SQL table | — | Every skill definition: `dwVnum`, `szDamageFormula`, `szCostFormula`, `dwCooldown`, `bMaxLevel`, AI flags |
| `mob_proto` SQL table | — | Monster base stats: `dwMaxHP`, `dwMobAttackRange`, `dwAttackSpeed`, `ai_flag`, immune flags |
| `server-src/src/game/constants.cpp` | `aiLevelDiffDamageMultiply[]` | Level-difference damage-scaling table indexed by `(attacker_level − victim_level)` |
| `server-src/src/common/length.h` | `EApplyTypes`, `EImmuneFlags`, `ERaceFlags` | All apply-type indices (used in `AddAffect`), immunity bits, race-flag bits |

### Layer 2 — Server Core (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/battle.cpp` | `battle_melee_attack()` | Entry point for normal melee: distance check → `battle_is_attackable` → `battle_hit` pipeline |
| `server-src/src/game/battle.cpp` | `battle_is_attackable()` | Legality gate: dead check, safe-zone check, PvP mode, guild war, arena, castle map |
| `server-src/src/game/battle.cpp` | `battle_distance_valid()` | Distance check using `DISTANCE_APPROX`; default max 300 units for PC, mob's `AttackRange × 1.15` for NPCs |
| `server-src/src/game/battle.cpp` | `CalcBattleDamage(dam, atk_lev, vic_lev)` | Level-difference scaling; clamps damage ≥ 3 (returns random 1–5 if < 3) |
| `server-src/src/game/battle.cpp` | `CalcMeleeDamage()`, `CalcMagicDamage()`, `CalcArrowDamage()` | Full damage pipelines for each attack type |
| `server-src/src/game/battle.cpp` | `CalcAttBonus(attacker, victim, dam)` | Race-type bonus multipliers: `ATTBONUS_HUMAN`, `ATTBONUS_ANIMAL`, `ATTBONUS_MONSTER`, etc. |
| `server-src/src/game/battle.cpp` | `NormalAttackAffect(attacker, victim)` | On-hit status effects: rolls stun%, slow%, poison% from attacker's points |
| `server-src/src/game/battle.cpp` | `IS_SPEED_HACK(ch, victim, time)` | Speed-hack guard: gates attack frequency by comparing `dwTime` vs computed attack interval |
| `server-src/src/game/battle.h` | All above declarations | Header exposing all free combat functions |
| `server-src/src/game/char_battle.cpp` | `CHARACTER::Damage()`, `::Dead()`, `::Revive()`, `::DistributeExp()` | HP subtraction, death trigger, respawn, EXP award logic |
| `server-src/src/game/char_skill.cpp` | `CHARACTER::UseSkill()`, `::GetSkillMasterType()` | Skill activation: SP cost, cooldown, `CPoly` formula evaluation, `SkillAttackAffect()` |
| `server-src/src/game/char_affect.cpp` | `CHARACTER::AddAffect()`, `::RemoveAffect()`, `::RefreshAffect()` | Affect apply/expiry/recompute; calls `ApplyPoint()` to modify stats |
| `server-src/src/game/skill.h` / `skill.cpp` | `CSkillProto` | Loaded from `TSkillTable`; caches parsed `CPoly` objects for each formula string |
| `server-src/src/game/pvp.h` / `pvp.cpp` | `CPVPManager::CanAttack()` | PvP mode decisions: duel consent, revenge mode, faction |
| `server-src/src/game/arena.h` | `CArenaManager::CanAttack()` | Arena bypass: always returns `true` for matched arena pairs |
| `server-src/src/game/input_main.cpp` | `CInputMain::Attack()`, `::UseSkill()` | Packet handlers: deserialise CG::ATTACK / CG::USE_SKILL → call battle functions |
| [server-src-libpoly](server-src-libpoly) — `Poly.h` | `CPoly::Analyze()`, `::SetVar()`, `::Eval()` | Formula parser + stack-machine evaluator; used for all skill damage/cost formulas |

### Layer 3 — Network

| Packet | Header | Direction | Payload Summary |
|--------|--------|-----------|----------------|
| `CG::ATTACK` | `0x0401` | Client→Server | Attack intent: `motAttack` (motion byte), `vid` (victim VID), `dwTime` (client timestamp) |
| `CG::USE_SKILL` | `0x0402` | Client→Server | Skill activation: `dwVnum` (skill ID), `dwVID` (target VID, 0 = AoE/self) |
| `CG::SHOOT` | `0x0403` | Client→Server | Ranged shot: `bType` (shot sub-type) |
| `CG::FLY_TARGETING` | `0x0404` | Client→Server | Projectile aim: `dwTargetVID`, world `x`, `y` |
| `CG::TARGET` | `0x0A01` | Client→Server | Set active target: `dwVID` |
| `GC::DAMAGE_INFO` | `0x0410` | Server→Client | Damage result: victim VID, `dam` (amount), `bFlag` (DAMAGE_NORMAL/CRITICAL/PENETRATE/MISS/REFLECT) |
| `GC::AFFECT_ADD` | `0x0A20` | Server→Client | Apply buff/debuff: `dwType`, `bApplyOn`, `lApplyValue`, `dwFlag`, `lDuration` |
| `GC::AFFECT_REMOVE` | `0x0A21` | Server→Client | Remove buff/debuff: `dwType` |
| `GC::DEAD` | `0x0217` | Server→Client | Character died: `dwVID` |
| `GC::STUN` | `0x0216` | Server→Client | Character stunned: `dwVID` |
| `GC::PLAYER_POINT_CHANGE` | `0x0215` | Server→Client | Single stat delta: `type` (e.g. POINT_HP), `value` |
| `GC::SKILL_LEVEL` | `0x021A` | Server→Client | Skill level changed: `dwVnum`, `bLevel`, `bMasterType` |
| `GC::CREATE_FLY` | `0x0413` | Server→Client | Spawn projectile: fly-data index, start VID, end VID |
| `GC::FLY_TARGETING` | `0x0411` | Server→Client | Associate projectile with target for tracking |

### Layer 4 — Client C++

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `SendAttackPacket()`, `SendUseSkillPacket()` | Build and send CG::ATTACK / CG::USE_SKILL |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvDamageInfoPacket()`, `RecvAffectAddPacket()`, `RecvAffectRemovePacket()`, `RecvCreateFlyPacket()` | Handle all combat GC packets |
| `client-src/src/GameLib/ActorInstanceBattle.cpp` | `CActorInstance::ProcessHit()` | Plays hit animation, triggers damage-number display, plays impact sound |
| `client-src/src/GameLib/ActorInstanceMotion.cpp` | `CActorInstance::InterceptAttack()` | Attack animation queueing, combo-state tracking |
| `client-src/src/GameLib/FlyingObjectManager.h` | `CFlyingManager::CreateIndexedFly()` | Spawns `CFlyingInstance` from `GC::CREATE_FLY` data |
| `client-src/src/GameLib/FlyingInstance.h` | `CFlyingInstance::Update()` | Per-frame projectile position interpolation along trajectory arc |

### Layer 5 — Python UI

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/game.py` | `GameWindow.OnAttack()`, `OnKeyDown()` | Routes attack keypresses to `net.SendAttackPacket(motType, vid)` |
| `client-bin/assets/root/uiskill.py` | `SkillWindow.UseSkill()` | Calls `net.SendUseSkillPacket(skillIndex, targetVID)` |
| `client-bin/assets/root/uiaffect.py` | `AffectShower.ShowAffect()`, `HideAffect()` | Displays/removes buff icons with countdown timers |
| `client-bin/assets/root/uicharacter.py` | `CharacterWindow.RefreshStatus()` | Updates ATT_GRADE / DEF_GRADE display after `GC::PLAYER_POINT_CHANGE` |

---

## 2. Causal Chain

### Chain A: Melee attack — from keypress to HP bar update

```
[Trigger]  Player right-clicks enemy or presses attack key
    │
    ▼  (root/game.py : GameWindow.OnAttack)
[1] Python calls net.SendAttackPacket(motAttack=0, victimVID)
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : SendAttackPacket)
[2] Builds TPacketCGAttack: header=CG::ATTACK(0x0401), motAttack, vid, dwTime
    Client plays attack animation immediately (no wait)
    Encrypt + send over TCP
    │
    ▼  packet: CG::ATTACK (0x0401)
[3] (game/input_main.cpp : CInputMain::Attack)
    Deserialise: read motAttack, victimVID, dwTime
    IS_SPEED_HACK(ch, victim, dwTime) check — if fails: disconnect
    │
    ▼  (game/battle.cpp : battle_melee_attack)
[4] battle_is_attackable(ch, victim) — dead? safe-zone? PvP rules? → if false: BATTLE_NONE
    battle_distance_valid(ch, victim) — DISTANCE_APPROX ≤ max (300 pc, mob.AttackRange×1.15)
    ch->SetPosition(POS_FIGHTING)
    │
    ▼  (game/battle.cpp : battle_hit → CalcMeleeDamage)
[5] raw_damage = ATT_GRADE + rand(ATT_MIN, ATT_MAX)
    after_bonus = CalcAttBonus(ch, victim, raw_damage)  [ATTBONUS_<race> multiplier]
    after_level = CalcBattleDamage(after_bonus, ch->GetLevel(), victim->GetLevel())
    CalcAttackRating(ch, victim) → hit/miss roll
    if miss → broadcast GC::DAMAGE_INFO with DAMAGE_MISS flag
    if rand(0,99) < POINT_CRITICAL_PCT → damage ×2, DAMAGE_CRITICAL flag
    if rand(0,99) < POINT_PENETRATE_PCT → add victim DEF_GRADE back, DAMAGE_PENETRATE flag
    net_damage = after_level − victim.DEF_GRADE
    NormalAttackAffect(ch, victim)  [roll stun/slow/poison]
    │
    ▼  (game/char_battle.cpp : CHARACTER::Damage)
[6] victim->m_points[POINT_HP] -= net_damage
    if HP ≤ 0 → CHARACTER::Dead(attacker)
    │
    ▼  SECTREE broadcast to nearby DESCs:
    packet: GC::DAMAGE_INFO (0x0410)  [victimVID, dam, bFlag]
    packet: GC::PLAYER_POINT_CHANGE (0x0215)  [POINT_HP, newValue → victim's client]
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvDamageInfoPacket)
[7] RecvDamageInfoPacket → floating damage number rendered on victimVID
    RecvPointChangePacket → CPythonPlayer HP updated → HP bar redraws
    │
    ▼  [End] Attacker sees damage number; victim's HP bar decreases
```

### Chain B: Skill activation → `libpoly` damage formula evaluation

```
[Trigger]  Player presses skill hotkey F1
    │
    ▼  (root/uiskill.py : SkillWindow.UseSkill)
[1] Python calls net.SendUseSkillPacket(skillVnum=1, targetVID)
    │
    ▼  packet: CG::USE_SKILL (0x0402)
[2] (game/input_main.cpp : CInputMain::UseSkill)
    Reads dwVnum, dwVID → calls ch->UseSkill(dwVnum, victim)
    │
    ▼  (game/char_skill.cpp : CHARACTER::UseSkill)
[3] Lookup CSkillProto by vnum
    SP cost check: CPoly::Eval(szCostFormula) ≤ ch->GetSP()
    Cooldown check: now − m_dwLastSkillTime[vnum] ≥ dwCooldown
    SP deducted via PointChange(POINT_SP, -cost)
    m_dwLastSkillTime[vnum] = now
    │
    ▼  CPoly::SetVar("skill", level); CPoly::SetVar("level", ch_level)
    damage = CPoly::Eval(szDamageFormula)  [e.g. "skill * 2.5 + level"]
    │
    ▼  (game/battle.cpp : CalcMeleeDamage or CalcMagicDamage depending on skill type)
[4] Magic skills: net_damage = raw_magic × (1 − RESIST_MAGIC/100)  [DEF_GRADE NOT applied]
    Melee skills: same pipeline as Chain A step [5] above
    SkillAttackAffect(ch, victim, chance, …)  [skill-specific on-hit effects]
    victim->Damage(dam, type)
    │
    ▼  Broadcasts: GC::DAMAGE_INFO, GC::SKILL_USE, GC::CREATE_FLY (if ranged skill)
[5] (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvCreateFlyPacket)
    CFlyingManager::CreateIndexedFly() → projectile flies across screen
    On arrival: GC::DAMAGE_INFO already present → damage number shown
    │
    ▼  [End] Skill animation plays; damage shown; victim HP decreases; skill enters cooldown
```

### Chain C: Poison affect applied → periodic tick damage

```
[Trigger]  NormalAttackAffect rolls poison (rand < POINT_POISON_PCT)
    │
    ▼  (game/battle.cpp : AttackAffect → CHARACTER::AddAffect)
[1] Creates CAffect: dwType=AFFECT_POISON, bApplyOn=APPLY_POISON, lDuration=30s
    Schedules event_create: fires every 1s
    Calls RefreshAffect() → recomputes points
    │
    ▼  packet: GC::AFFECT_ADD (0x0A20)
[2] (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvAffectAddPacket)
    CPythonPlayer stores affect; Python callback: gameevent.OnAffectAdded(type, duration)
    uiaffect.py shows poison icon with countdown
    │
    ▼  Each server tick while duration > 0:
[3] Poison event fires → victim->Damage(poisonDam, DAMAGE_POISON)
    GC::DAMAGE_INFO with DAMAGE_POISON flag → green damage number on client
    GC::PLAYER_POINT_CHANGE (POINT_HP) → HP bar ticks down
    │
    ▼  Duration expires → CHARACTER::RemoveAffect(AFFECT_POISON)
    packet: GC::AFFECT_REMOVE (0x0A21)
    uiaffect.py removes poison icon
    │
    ▼  [End] Poison icon gone; HP ticking stops
```

---

## 3. Dependency Matrix

### Sync Points

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `TPacketCGAttack` layout (motAttack:1, vid:4, dwTime:4 — `#pragma pack(1)`) | `game/packet_structs.h` | `UserInterface/Packet.h` | Server reads wrong victim VID or timestamp → wrong target attacked; speed-hack false-positive |
| `TPacketGCDamageInfo` layout (dwVID:4, dam:4, bType:1) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client displays wrong damage number or plays wrong hit sound/animation |
| `TPacketGCAffectAdd` layout (dwType:4, bApplyOn:1, lApplyValue:4, dwFlag:4, lDuration:4) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client shows wrong buff duration or wrong buff icon |
| `EApplyTypes` enum values (used as bApplyOn in affects) | `common/length.h` | `PythonPlayerModule.cpp` + `uiaffect.py` icon map | Client maps affect to wrong stat; wrong icon shown; stat display incorrect |
| `EImmuneFlags` bit positions | `common/length.h` | `GameLib/ActorInstance.h` (immune set display) | Client shows wrong immunity state; server/client immunity desync |
| Damage flag bitmask (`DAMAGE_NORMAL=0`, `DAMAGE_CRITICAL=1`, `DAMAGE_PENETRATE=2`, …) | `battle.h` (defines) | `GameLib/ActorInstanceBattle.cpp` | Critical hit shows as normal hit; wrong floating number colour/size |
| `TSkillTable` binary layout (vnum, damage formula string offset, cost formula string offset) | `common/tables.h` | `common/tables.h` (shared) | `DG::BOOT` skill proto delivered with wrong formula strings → zero damage or NaN crash |
| `CPoly` formula variable names (`"skill"`, `"level"`, `"atk"`) | `char_skill.cpp` (SetVar calls) | (N/A — libpoly is server-only) | Formula evaluates to 0 or NaN; skill does no damage; skill window shows wrong formula |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| Melee max distance (PC vs PC) | 300 units | `battle.cpp` hardcoded constant | Attacker further than 300 units can never hit any player; adjust for extended reach weapons |
| `DISTANCE_APPROX` approximation | `|dx|+|dy|` (Chebyshev) | `utils.h` macro | Distance check is not Euclidean — diagonal attacks have ~41% longer reach than cardinal |
| `SKILL_MAX_NUM` | 255 | `common/length.h` | Skill vnum ≥ 255 cannot be stored in `TPlayerTable.skills[255]`; AddSkill silently ignored |
| `SKILL_MAX_LEVEL` | 40 | `common/length.h` | `SetSkillLevel` clamps to 40; formula variables still use the capped value |
| `POINT_CRITICAL_PCT` max effective value | 100 (%) | (implicit) | Values > 100 always crit but waste item budget; no overflow safety in the roll |
| `POINT_PENETRATE_PCT` max effective value | 100 (%) | (implicit) | Same as above; penetrate and critical are mutually exclusive (critical checked first) |
| CalcBattleDamage minimum damage | 3 (else `number(1,5)`) | `battle.cpp : CalcBattleDamage` | Attacks doing < 3 raw damage are randomised 1–5; cannot reliably deal 1–2 damage |
| `mob_proto.dwMobAttackRange` vs PC max | 300 for PC; `range × 1.15` for mobs | `battle.cpp : battle_melee_attack` | If mob's attack range > 300 and target is PC, the PC's 300-unit cap may be used instead |
| `EImmuneFlags` bit field | 32 bits (DWORD) | `common/length.h` | 32 immunity types maximum; adding a 33rd requires widening to `uint64_t` in `TMonsterTable` |
| `lDuration` in CAffect | `long` (seconds) | `affect.h` | Very long durations (> INT_MAX seconds) wrap around; permanent buffs should use a sentinel value |

---

## 4. Extension How-To

### How to add a new damage type (e.g. holy damage)

1. **`server-src/src/common/length.h`** — Add resist point and apply type:
   ```cpp
   POINT_RESIST_HOLY = 74,      // new resist point
   APPLY_HOLY_DAMAGE = 85,      // new apply type for items
   ```
2. **`server-src/src/game/battle.cpp`** — Add `CalcHolyDamage()` following the `CalcMagicDamage` pattern; subtract `victim->GetPoint(POINT_RESIST_HOLY) / 100.0 * iDam`.
3. **`server-src/src/game/char_skill.cpp`** — In `UseSkill()`, dispatch to `CalcHolyDamage()` for skills with `bType == SKILL_TYPE_HOLY`.
4. **`server-src/src/game/battle.h`** — Declare the new function.
5. **`server-src/src/common/packet_headers.h`** — If new damage flag needed, add `DAMAGE_HOLY = 0x08` to the flags; also update `TPacketGCDamageInfo.bType` handling.
6. **`client-src/src/GameLib/ActorInstanceBattle.cpp`** — Handle `DAMAGE_HOLY` flag: choose appropriate floating-text colour and hit sound.
7. **`skill_proto`** SQL — Tag holy-damage skills with the new `bType` value.

### How to add a new on-hit status effect (e.g. freeze)

1. **`server-src/src/common/length.h`** — Add entries:
   ```cpp
   POINT_FREEZE_PCT   = 75,    // attacker's chance to freeze
   IMMUNE_FREEZE      = 0x80,  // new immunity flag bit
   ```
2. **`server-src/src/game/battle.cpp`** — Add to `NormalAttackAffect()`:
   ```cpp
   AttackAffect(ch, victim, POINT_FREEZE_PCT, AFF_FREEZE, APPLY_FREEZE, 0, 5 /*seconds*/);
   ```
3. **`server-src/src/game/char_affect.cpp`** — Handle `AFF_FREEZE` in `CHARACTER::AddAffect()`: set `CanMove() = false` while frozen, similar to stun.
4. **`server-src/src/game/char.cpp`** — Add immunity check: `if (victim->IsImmune(IMMUNE_FREEZE)) return;` before applying.
5. **`server-src/src/game/packet_structs.h`** — Ensure `GC::AFFECT_ADD.dwFlag` has a bit for `AFF_FREEZE`.
6. **`client-src/src/GameLib/ActorInstance.cpp`** — Handle freeze in `OnSetAffect(AFF_FREEZE)`: play ice particle effect, disable movement input.
7. **`client-bin/assets/root/uiaffect.py`** — Map `AFF_FREEZE` to its buff-icon image.

### How to modify the level-difference damage formula

1. **`server-src/src/game/battle.cpp`** — Modify `CalcBattleDamage(iDam, iAttackerLev, iVictimLev)`:
   ```cpp
   // Current: just returns iDam (scaling disabled in this rework)
   // To re-enable: use aiLevelDiffDamageMultiply table
   int delta = iAttackerLev - iVictimLev;
   delta = MINMAX(-20, delta, 20);
   return iDam * aiLevelDiffDamageMultiply[20 + delta] / 100;
   ```
2. **`server-src/src/game/constants.cpp`** — Update `aiLevelDiffDamageMultiply[41]` with desired curve values.
3. No client changes required — damage numbers are computed server-side.

### Controlling Constants

| Constant | File | Controls |
|----------|------|---------|
| `EApplyTypes` | `common/length.h` | All apply-type indices for `AddAffect` bApplyOn and item attributes |
| `EImmuneFlags` | `common/length.h` | Immunity bitmask in `TMonsterTable` |
| `ERaceFlags` | `common/length.h` | Race-flag bits used in `CalcAttBonus()` |
| `DAMAGE_*` flags | `battle.h` | Damage type bitmask in `GC::DAMAGE_INFO.bType` |
| `AFF_*` flags | `affect.h` | Affect bitmask in `GC::AFFECT_ADD.dwFlag` |
| `SKILL_MAX_LEVEL` | `common/length.h` | Skill level cap (40 = Perfect Master) |
| `SKILL_MAX_NUM` | `common/length.h` | Maximum skill vnum (255) |
| `aiLevelDiffDamageMultiply[]` | `game/constants.cpp` | Level-difference damage multiplier table |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| `sys_log: IS_SPEED_HACK` — player disconnected for no apparent reason | Client clock drift; `dwTime` in `CG::ATTACK` diverges from server time | `game/battle.cpp` : `IS_SPEED_HACK()` — adjust the tolerance constant; check client NTP sync |
| Melee attacks always miss even at close range | `CalcAttackRating()` returning 0, or attacker DEX is 0 | `game/battle.cpp` : `CalcAttackRating()` — print attacker DEX and level; check `POINT_DX` |
| All skills deal 0 damage | `CPoly::Eval()` returning 0.0; `szDamageFormula` empty or unparsed | `game/skill.cpp` : `CSkillProto::Analyze()` — check `sys_err` for formula parse errors on boot |
| Skill damage is NaN / crashes server | Formula uses undefined variable (e.g. `"sp"` not set via `SetVar`) | `game/char_skill.cpp` : `CHARACTER::UseSkill()` — list all `poly.SetVar()` calls; add missing variable |
| Critical hits never appear on client | `DAMAGE_CRITICAL` flag not matching between server `battle.h` and client `ActorInstanceBattle.cpp` | Compare `DAMAGE_CRITICAL` bitmask value in both files |
| Buffs never expire (stuck icons) | Duration-tick event not created; `event_create` failed | `game/char_affect.cpp` : `CHARACTER::AddAffect()` — check `m_pkAffectEvent` assignment and event system pulse |
| `GC::AFFECT_ADD` received but wrong icon shown | `EApplyTypes` mismatch between server enum and Python uiaffect icon map | `common/length.h` vs `uiaffect.py` affect-icon dict keys |
| Poison deals 0 ticks | Poison affect applied but periodic tick event not scheduled | `game/char_affect.cpp` : `AddAffect(AFFECT_POISON, …)` — confirm periodic event `AFFECT_POISON_EVENT` is created |
| Monster never stops chasing after leaving range | `CHASE_MAX_DISTANCE` not set in `mob_proto` or `char_state.cpp` chase-return check disabled | `game/char_state.cpp` : `StateChase()` — check `GetDistanceToSpawn() > CHASE_MAX_DISTANCE` condition |
| PvP attack blocked even in guild war | `CGuild::UnderWar()` returns false; guild IDs not synced | `game/guild.cpp` : `CGuild::UnderWar(g2->GetID())` — verify both guilds have active war entry in `guild_war` DB table |
| Penetrate never fires | `POINT_PENETRATE_PCT` is 0 on all equipment | Check item attributes in `item_proto`; verify `APPLY_PENETRATE_PCT` is in `EApplyTypes` and items set it |

---

## Related

- **Topic page:** [Combat System](topic-Combat-System) — full damage tables, all status effects, PvP mode reference
- **Blueprint:** [blueprint-Character-System](blueprint-Character-System) — `EPoints`, `AddAffect`, stat pipeline
- **Blueprint:** [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) — `CG::ATTACK`, `GC::DAMAGE_INFO` wire format
- **Calculator:** [Damage Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/damage.html) — compute expected/min/max damage from ATT_GRADE, DEF_GRADE, level diff, crit%
