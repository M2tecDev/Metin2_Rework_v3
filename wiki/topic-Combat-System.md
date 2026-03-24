# Combat System

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> End-to-end reference for attack processing, damage calculation, skill execution, status effects, and combat networking across all three repositories.

## Table of Contents

1. [Overview](#1-overview)
2. [Damage Calculation](#2-damage-calculation)
3. [Hit / Miss / Critical System](#3-hit--miss--critical-system)
4. [Skill System](#4-skill-system)
5. [Status Effects (Affects)](#5-status-effects-affects)
6. [Combat Packets](#6-combat-packets)
7. [PvP vs PvE](#7-pvp-vs-pve)
8. [Client-Side Combat](#8-client-side-combat)
9. [Key Files](#9-key-files)

---

## 1. Overview

Metin2 uses a **server-authoritative real-time combat model**. The client sends intent (an attack or skill activation), the server validates the request, runs the full damage pipeline, and broadcasts the outcome. There is no turn-based queue; multiple characters may act simultaneously within each 25 ms server heartbeat pulse.

### Attack Flow at a Glance

```
[Client]  Player presses attack key
              │
              │  CG_ATTACK  (TCP)
              ▼
[Server]  CInputMain receives packet
              │
              ├─ battle_is_attackable()   — legality check (PK mode, faction, distance)
              ├─ IS_SPEED_HACK()           — speed-hack guard
              ├─ CalcAttackRating()        — hit/miss roll
              ├─ CalcMeleeDamage()         — raw damage
              │     ├─ CalcAttBonus()      — race-type bonus multipliers
              │     └─ CalcBattleDamage()  — level-difference scaling
              ├─ Critical / Penetrate roll
              ├─ NormalAttackAffect()      — on-hit status effects
              └─ victim->Damage()          — subtract HP, trigger death if 0
                    │
                    │  GC_DAMAGE_INFO / GC_CHAR_UPDATE (TCP)
                    ▼
[Client]  Recv handlers update HP bars, play hit animation
```

### Key Design Properties

| Property | Detail |
|----------|--------|
| Tick rate | 25 ms server heartbeat (`libthecore` pulse) |
| Authority | Server-only — client sends intent; damage is computed server-side |
| Distance | `battle_distance_valid()` enforces max melee range per attack type |
| Prediction | Client plays attack animation immediately; damage number arrives ~RTT later |
| Speed-hack guard | `IS_SPEED_HACK(ch, victim, time)` compares elapsed time against the character's computed attack speed |

---

## 2. Damage Calculation

All damage functions live in `server-src/src/game/battle.cpp`. Skill damage formulas are stored as formula strings in `TSkillTable` and evaluated at runtime via `libpoly::CPoly` (see [server-src-libpoly](server-src-libpoly) for the formula evaluator architecture).

### 2.1 Physical (Melee) Damage — `CalcMeleeDamage`

```
raw_damage  = attacker.ATT_GRADE  (base attack grade)
            + rand(attacker.ATT_MIN, attacker.ATT_MAX)

after_bonus = CalcAttBonus(attacker, victim, raw_damage)
            → multiplies by ATTBONUS_<race> percent for the victim's race type
              (ATTBONUS_HUMAN, ATTBONUS_ANIMAL, ATTBONUS_ORC, ATTBONUS_MONSTER, …)

after_level = CalcBattleDamage(after_bonus, attacker.level, victim.level)
            → applies level-difference scaling factor

net_damage  = after_level − victim.DEF_GRADE
```

The exact level-scaling formula in `CalcBattleDamage` uses a look-up into the `constants.cpp` damage table keyed on `(attackerLev − victimLev)`, clamped to a defined range.

When `bIgnoreDefense == true` (e.g., some skill calls) the subtraction of `DEF_GRADE` is skipped. When `bIgnoreTargetRating == true` the hit-roll is bypassed and the attack always lands.

### 2.2 Magic Damage — `CalcMagicDamage`

```
raw_magic   = attacker.MAGIC_ATT_GRADE
            + skill_formula_result   (evaluated by CPoly)

resistance  = victim.RESIST_MAGIC  (%)
net_damage  = raw_magic × (1 − resistance / 100)
```

Magic damage is not reduced by `DEF_GRADE`; only `RESIST_MAGIC` applies.

### 2.3 Ranged (Arrow) Damage — `CalcArrowDamage`

```
raw_arrow   = attacker.ATT_GRADE
            + bow.base_damage + arrow.bonus_damage

after_bonus = CalcAttBonus(attacker, victim, raw_arrow)
net_damage  = after_bonus − victim.DEF_GRADE   (if bIgnoreDefense == false)
```

Arrow damage runs through the same `CalcAttBonus` and `CalcBattleDamage` pipeline as melee.

### 2.4 Skill Damage via `libpoly`

Skill damage formulas are stored as text strings in `TSkillTable.szDamageFormula` (e.g. `"floor(min(skill * 2.5 + level, 500))"`). At startup, `CSkillProto` parses each formula once using `CPoly::Analyze()`. At runtime, variables are bound and the formula is evaluated:

```cpp
CPoly poly;
poly.Analyze("floor(min(skill * 2.5 + level, 500))");

// At use-time:
poly.SetVar("skill",  (double)GetSkillLevel(vnum));
poly.SetVar("level",  (double)GetLevel());
double damage = poly.Eval();
```

Variables available to formulas include `skill` (current level 0–40), `level` (character level), `atk`, `def`, and others registered by the skill system. `libpoly` supports: `+`, `-`, `*`, `/`, `^`, `min()`, `max()`, `floor()`, `abs()`, `mod()`, `irand()`, `frand()`, `sqrt()`, `sin()`, `cos()`, and more.

### 2.5 Resistance Application

Resistances are `EApplyTypes` values on items and buffs. They reduce incoming damage by a percentage:

| Resistance Point | Damage Type Blocked |
|-----------------|---------------------|
| `POINT_RESIST_SWORD` | Sword melee |
| `POINT_RESIST_TWOHAND` | Two-hand sword |
| `POINT_RESIST_DAGGER` | Dagger |
| `POINT_RESIST_BELL` | Bell (Shaman) |
| `POINT_RESIST_FAN` | Fan (Shaman) |
| `POINT_RESIST_BOW` | Arrow / ranged |
| `POINT_RESIST_FIRE` | Fire element |
| `POINT_RESIST_ICE` | Ice element |
| `POINT_RESIST_WIND` | Wind element |
| `POINT_RESIST_ELEC` | Lightning element |
| `POINT_RESIST_EARTH` | Earth element |
| `POINT_RESIST_DARK` | Dark element |
| `POINT_RESIST_MAGIC` | All magic |
| `ANTI_PENETRATE_PCT` | Penetrating hits |

---

## 3. Hit / Miss / Critical System

### 3.1 Hit Rating — `CalcAttackRating`

```
hit_chance = f(attacker.DEX, attacker.level,
               victim.DEX,   victim.level,
               bIgnoreTargetRating)
```

The function returns an integer probability 0–100. A random roll is compared against this value; if the roll fails, the attack is flagged as a miss and no damage is dealt. When `bIgnoreTargetRating == true` (skill overrides), the attack always hits.

### 3.2 Dodge

Victims with high `DEX` or items granting `APPLY_DODGE` increase the effective miss chance against them by raising the required `hit_chance` threshold.

### 3.3 Critical Hits

```
if rand(0, 99) < attacker.POINT_CRITICAL_PCT:
    damage = damage * 2     (double damage)
    flag   = DAMAGE_CRITICAL
```

`POINT_CRITICAL_PCT` is accumulated from base stats, equipment `EApplyTypes`, and skill buffs. Critical hits are broadcast to the client as part of the damage-type flags in `GC_DAMAGE_INFO`.

### 3.4 Penetrating Hits

```
if rand(0, 99) < attacker.POINT_PENETRATE_PCT:
    damage = damage + victim.DEF_GRADE   (ignore armour entirely)
    flag   = DAMAGE_PENETRATE
```

A penetrating hit bypasses all physical defence. It is mutually exclusive with a critical hit (critical is checked first). Victims with `APPLY_ANTI_PENETRATE_PCT` reduce the attacker's effective penetration chance.

### 3.5 Damage Type Flags

The server broadcasts a bitmask of damage-type flags alongside the damage value:

| Flag | Meaning |
|------|---------|
| `DAMAGE_NORMAL` | Standard hit |
| `DAMAGE_CRITICAL` | Critical (×2 damage) |
| `DAMAGE_PENETRATE` | Armour-piercing |
| `DAMAGE_POISON` | Poison tick |
| `DAMAGE_MISS` | Attack missed |
| `DAMAGE_BLOCK` | Blocked (target immune or out of range) |
| `DAMAGE_REFLECT` | Reflected damage back to attacker |

---

## 4. Skill System

### 4.1 Skill Data — `CSkillProto` (`skill.h`)

Every skill is defined in `TSkillTable` (loaded from the database at startup) and wrapped by `CSkillProto`. Key fields:

| Field | Description |
|-------|-------------|
| `dwVnum` | Skill virtual number (0–254) |
| `bType` | `SKILL_TYPE_MELEE`, `_RANGE`, `_MAGIC`, `_SUPPORT` |
| `szDamageFormula` | `libpoly` formula for damage (e.g. `"skill * 3 + level * 0.5"`) |
| `szCostFormula` | SP cost formula |
| `dwCooldown` | Cooldown in milliseconds |
| `bMaxLevel` | Maximum learnable level (typically 20 for normal, 40 for grand master) |

### 4.2 Skill Mastery Tiers

| Tier | Constant | Level Range | Description |
|------|----------|-------------|-------------|
| Novice | `SKILL_NORMAL` | 1–19 | Standard skill |
| Master | `SKILL_MASTER` | 20 (threshold) | Enhanced effectiveness |
| Grand Master | `SKILL_GRAND_MASTER` | 21–30 | Further enhanced; unlocks GM bonuses |
| Perfect Master | `SKILL_PERFECT_MASTER` | 31–40 | Maximum power; some skills gain new effects |

`GetSkillMasterType(dwVnum)` returns the current tier for a character's skill.

### 4.3 Active vs. Passive Skills

| Category | Activation | Example |
|----------|-----------|---------|
| Active offensive | Player triggers; uses SP; triggers cooldown | Sword skill, magic bolt |
| Active buff | Player triggers; applies `AFFECT_*` to self/allies | Speed buff, defence boost |
| Active utility | Player triggers; no direct damage | Stealth, teleport |
| Passive | Always applied; computed in `ComputePoints()` | HP bonus, attack bonus |

Passive skills are applied via `ApplyPoint(bApplyType, iVal)` each time `ComputePoints()` runs. Active skills are triggered by `UseSkill(dwVnum, pkVictim, bUseGrandMaster)`.

### 4.4 Skill Activation Flow

```
[Client]  Player presses skill hotkey
              │
              │  CG_USE_SKILL  { skillIndex, targetVID }
              ▼
[Server]  CInputMain → ch->UseSkill(vnum, victim)
              │
              ├─ SP cost check  (CPoly evaluates szCostFormula)
              ├─ Cooldown check  (m_dwLastSkillTime[vnum])
              ├─ Range / target validation
              ├─ SP deducted
              ├─ CPoly evaluates szDamageFormula
              ├─ CalcMeleeDamage or CalcMagicDamage  (type-dependent)
              ├─ SkillAttackAffect()  — on-hit effects specific to this skill
              └─ victim->Damage()    — apply damage
                    │
                    │  GC_SKILL_USE  (broadcast to nearby)
                    │  GC_DAMAGE_INFO
                    ▼
[Client]  Play skill animation + effect; update HP bar
```

### 4.5 Guild Skills

Guild skills are activated via `SendGuildUseSkillPacket(skillID, targetVID)` on the client side and handled by `CGuild::UseSkill(dwSkillVnum, ch)` on the server. Guild skill levels are stored in the guild data and have their own formula evaluation.

---

## 5. Status Effects (Affects)

### 5.1 Affect Storage

Each active affect is stored in the character's affect list with the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `dwType` | `DWORD` | Affect type identifier (`AFFECT_*`) |
| `bApplyOn` | `BYTE` | Which `EApplyTypes` point this affect modifies |
| `lApplyValue` | `long` | Amount added/subtracted from the point |
| `dwFlag` | `DWORD` | Bitmask of special flags (e.g., `AFF_STUN`, `AFF_SLOW`) |
| `lDuration` | `long` | Remaining duration in seconds |
| `lSPCost` | `long` | SP drain per tick (for maintained skills) |

### 5.2 Applying an Affect

```cpp
ch->AddAffect(dwType, bApplyOn, lApplyValue, dwFlag, lDuration, lSPCost, bOverride);
```

- Calls `ApplyPoint(bApplyOn, lApplyValue)` to immediately modify the character's computed stats.
- If `bOverride == true`, replaces any existing affect of the same `dwType`.
- Schedules a duration-tick event (via the `event_create` system) to call `RemoveAffect` when time expires.
- Sends `GC_AFFECT_ADD` to the client so the UI can display the buff/debuff icon.

### 5.3 Common Status Effects

| Effect | Affect Flag | Apply Type | Effect in Game |
|--------|------------|------------|----------------|
| Poison | `AFF_POISON` | `APPLY_POISON_PCT` | Periodic HP loss ticks every second |
| Stun | `AFF_STUN` | `APPLY_STUN_PCT` | Character cannot move or act (`CanMove() == false`) |
| Slow | `AFF_SLOW` | `APPLY_SLOW_PCT` | Movement and attack speed reduced |
| Curse | `AFF_CURSE` | — | Attack and defence reduced by percentage |
| Fear / Terror | `AFF_TERROR` | — | Forces character to flee from the source |
| Bleeding | — | `APPLY_BLEEDING_PCT` | Periodic HP loss similar to poison |
| Speed Buff | `AFF_SPEED` | `APPLY_MOV_SPEED` | Movement speed increased |
| Haste | — | `APPLY_ATT_SPEED` | Attack speed increased |

### 5.4 Immunity System

Monsters and some characters have immunity flags (`EImmuneFlags`) that block specific affects:

| Flag | Blocks |
|------|--------|
| `IMMUNE_STUN` | Stun effect |
| `IMMUNE_SLOW` | Slow effect |
| `IMMUNE_FALL` | Knock-back |
| `IMMUNE_CURSE` | Curse |
| `IMMUNE_POISON` | Poison |
| `IMMUNE_TERROR` | Fear / terror |
| `IMMUNE_REFLECT` | Damage reflection |

`NormalAttackAffect(attacker, victim)` checks the victim's immunity flags before applying any on-hit effect. Boss-tier monsters (`MOB_RANK_BOSS`, `MOB_RANK_KING`) typically have broad immunity sets.

### 5.5 On-Hit Effect Application

```cpp
// Normal attack affects (called from battle_melee_attack)
NormalAttackAffect(attacker, victim);
    └─ AttackAffect(attacker, victim, POINT_STUN_PCT,   AFF_STUN,   ...)
    └─ AttackAffect(attacker, victim, POINT_SLOW_PCT,   AFF_SLOW,   ...)
    └─ AttackAffect(attacker, victim, POINT_POISON_PCT, AFF_POISON, ...)

// Skill-specific affects (called from UseSkill)
SkillAttackAffect(attacker, victim, chance, affectType, applyOn, value, duration);
```

`AttackAffect` rolls `rand(0, 99) < attacker.POINT_<EFFECT>_PCT` and calls `victim->AddAffect(...)` on success.

### 5.6 Affect Removal

- **Duration expiry:** the event system fires `RemoveAffect(dwType)` when `lDuration` runs out.
- **Explicit removal:** `ch->RemoveAffect(dwType)` — e.g., a cleanse skill or death.
- **Death:** `ClearAffect(bSave)` removes all affects when a character dies.
- **Network:** `GC_AFFECT_REMOVE` is sent to the client after removal so the icon disappears.

---

## 6. Combat Packets

All packet headers are `uint16_t` constants defined in `server-src/src/common/packet_headers.h`. The wire frame for CG/GC packets is:

```
[header : 2 bytes][length : 2 bytes][payload : variable]
```

### 6.1 Client → Server (CG)

#### `CG::ATTACK`

Sent when the player initiates a normal melee attack.

| Field | Type | Description |
|-------|------|-------------|
| `bType` | `BYTE` | Attack motion type (combo index) |
| `dwVictimVID` | `DWORD` | VID of the target character |
| `dwTime` | `DWORD` | Client-side timestamp (used by `IS_SPEED_HACK`) |

**Server handler:** `CInputMain` → `battle_melee_attack(ch, victim)`

#### `CG::USE_SKILL`

Sent when the player activates a skill.

| Field | Type | Description |
|-------|------|-------------|
| `dwVnum` | `DWORD` | Skill virtual number |
| `dwVictimVID` | `DWORD` | Target VID (0 for self-cast or AoE) |

**Server handler:** `CInputMain` → `ch->UseSkill(vnum, victim)`

Client method: `SendUseSkillPacket(skillIndex, targetVID)`

#### `CG::SHOOT`

Sent for ranged attacks (bow/arrow).

| Field | Type | Description |
|-------|------|-------------|
| `bType` | `BYTE` | Shot sub-type |

**Server handler:** `CInputMain` → `CalcArrowDamage(...)` pipeline

Client method: `SendShootPacket(skill)`

#### `CG::FLY_TARGETING`

Sent to specify the exact landing position of a targeted projectile.

| Field | Type | Description |
|-------|------|-------------|
| `dwTargetVID` | `DWORD` | Target VID |
| `x`, `y` | `long` | World-space landing position |

Client method: `SendFlyTargetingPacket(targetVID, pos)`

#### `CG::TARGET`

Sets the currently selected target without attacking.

| Field | Type | Description |
|-------|------|-------------|
| `dwVID` | `DWORD` | VID of entity to select |

Client method: `SendTargetPacket(vid)`

#### `CG::SYNC_POSITION`

Synchronises a victim's world position (used during knockback effects).

| Field | Type | Description |
|-------|------|-------------|
| `dwVictimVID` | `DWORD` | Victim VID |
| `x`, `y` | `long` | World-space position |

Client method: `SendSyncPositionElementPacket(victimVID, x, y)`

---

### 6.2 Server → Client (GC)

#### `GC::DAMAGE_INFO`

Delivers the result of an attack to the victim and nearby observers.

| Field | Type | Description |
|-------|------|-------------|
| `dwVID` | `DWORD` | VID of the character who took damage |
| `damage` | `int` | Amount of damage dealt |
| `bType` | `BYTE` | Damage-type flags (`DAMAGE_NORMAL`, `DAMAGE_CRITICAL`, `DAMAGE_PENETRATE`, `DAMAGE_MISS`, etc.) |

The client reads `bType` to decide whether to display a normal, critical, or miss floating number, and which hit-sound to play.

#### `GC::SKILL_USE`

Broadcast to all characters in view range when a skill is activated.

| Field | Type | Description |
|-------|------|-------------|
| `dwVID` | `DWORD` | Caster's VID |
| `dwSkillVnum` | `DWORD` | Skill being used |
| `dwTargetVID` | `DWORD` | Primary target VID |
| `x`, `y` | `long` | Target world position (for AoE skills) |

The client uses this to trigger the correct skill animation and attach visual/sound effects.

#### `GC::AFFECT_ADD`

Notifies the client that an affect has been applied to a character.

| Field | Type | Description |
|-------|------|-------------|
| `dwType` | `DWORD` | Affect type |
| `bApplyOn` | `BYTE` | Which stat is modified |
| `lApplyValue` | `long` | Delta applied to the stat |
| `dwFlag` | `DWORD` | Affect flags (controls icon shown) |
| `lDuration` | `long` | Duration in seconds |

**Client handler:** `RecvAffectAddPacket()` → calls `OnSetAffect` on the actor; UI shows buff icon with countdown.

#### `GC::AFFECT_REMOVE`

Notifies the client that an affect has expired or been removed.

| Field | Type | Description |
|-------|------|-------------|
| `dwType` | `DWORD` | Affect type that was removed |

**Client handler:** `RecvAffectRemovePacket()` → calls `OnResetAffect`; UI removes the buff icon.

#### `GC::CREATE_FLY`

Creates a projectile on the client (arrow, magic bolt, etc.).

| Field | Type | Description |
|-------|------|-------------|
| `dwIndex` | `DWORD` | Server-registered fly-data index |
| `dwStartVID` | `DWORD` | Caster's VID (fly origin) |
| `dwEndVID` | `DWORD` | Target's VID (fly destination) |

**Client handler:** `RecvCreateFlyPacket()` → `CFlyingManager::CreateIndexedFly(...)` creates the `CFlyingInstance`.

#### `GC::CHAR_UPDATE`

Broadcasts updated character stats (HP, SP, etc.) after damage or healing.

| Field | Type | Description |
|-------|------|-------------|
| `dwVID` | `DWORD` | Character VID |
| `dwHP` | `int` | Current HP |
| `dwSP` | `int` | Current SP |

#### `GC::DEAD`

Notifies clients in range that a character has died.

| Field | Type | Description |
|-------|------|-------------|
| `dwVID` | `DWORD` | VID of the dead character |

The client transitions that actor to the death animation and removes it from the attackable set.

#### `GC::SKILL_LEVEL`

Sent to a player when their skill level changes.

| Field | Type | Description |
|-------|------|-------------|
| `dwVnum` | `DWORD` | Skill vnum |
| `bLevel` | `BYTE` | New skill level |
| `bMasterType` | `BYTE` | New mastery tier |

**Client handler:** `RecvSkillLevel()` → updates the skill window UI.

---

## 7. PvP vs PvE

### 7.1 Legality Gate — `battle_is_attackable`

Before any damage is computed, `battle_is_attackable(ch, victim)` must return `true`. The key PvP checks:

| Condition | PvP allowed? |
|-----------|-------------|
| Both players in same empire, no PK mode | No |
| Attacker has PK mode enabled (`PKMODE_REVENGE_GUILD`, etc.) | Yes, within the mode rules |
| In a designated PvP arena map | Yes |
| Guild war active between both guilds | Yes |
| One character is a GM | Blocked (GMs are immune by default) |
| Target is an NPC or monster | Always yes (PvE) |

### 7.2 Damage Scaling Differences

| Factor | PvE (vs monsters) | PvP (vs players) |
|--------|-------------------|------------------|
| `CalcBattleDamage` level scaling | Applied | Applied |
| `CalcAttBonus` race bonus | Applies to monster race flags | Applies to `ATTBONUS_HUMAN` / `ATTBONUS_WARRIOR` etc. |
| Defence reduction | `DEF_GRADE` from mob stat table | `DEF_GRADE` from player equipment + stats |
| HP pool | `TMobTable.dwMaxHP` | Player's computed `POINT_MAX_HP` |
| Immunity flags | Set per mob prototype | Can be granted via items/buffs |
| Death on 0 HP | Mob despawns; drops items/exp | Player enters dead state; drops (if PK) |

### 7.3 PvP Modes (`pvp.h`)

| Mode | Description |
|------|-------------|
| Standard (PK-off) | Players cannot attack each other unless in special zones |
| Revenge / Duel (`PKMODE_DUEL`) | Mutual consent duel; no item drop on death |
| Guild War | Full PvP between guilds in war; no drop |
| Arena | Instanced PvP arena (`BattleArena.h`); score-based |
| Castle siege | Large-scale PvP around castle ownership |
| Free PK zones | Specific maps allow unrestricted PvP |

### 7.4 Experience and Death Penalties

- **PvE death:** Character loses a percentage of current-level EXP; respawns at the nearest town/respawn point.
- **PvP death (duel):** No EXP or item loss; respawns in place or at a safe point.
- **PvP death (free PK/guild war):** Potential item drop (server-configured); EXP loss may apply.
- **Monster kill rewards:** `DistributeExp()` awards EXP to the killer; if in a party, EXP is shared among nearby members via `CParty`.

---

## 8. Client-Side Combat

### 8.1 Input to Packet

The Python UI layer listens for mouse clicks and hotkey presses:

```
assets/root/game.py  →  net.SendAttackPacket(motionType, victimVID)
                         net.SendUseSkillPacket(skillIndex, targetVID)
```

These call the C extension module `net` (registered from `UserInterface/PythonNetworkStreamModule.cpp`) which maps to `CPythonNetworkStream::SendAttackPacket` / `SendUseSkillPacket`.

### 8.2 Animation — `CActorInstance` (`ActorInstanceBattle.cpp`)

The client plays the attack animation immediately without waiting for server confirmation, providing zero-latency visual feedback:

1. `OnAttack` callback fires on the local actor → queues the attack motion.
2. `CRaceMotionData` provides timing: blend time, duration, and keyframe event offsets.
3. At the keyframe marked as the "hit point", `IEventHandler::OnHit` fires.
4. The server's `GC_DAMAGE_INFO` arrives ~RTT later; the client displays the floating damage number and plays the impact effect.

If the server responds with `DAMAGE_MISS`, a "Miss" label floats over the target instead.

### 8.3 Projectile Flight — `CFlyingManager` / `CFlyingInstance`

For ranged attacks and magic bolts:

1. Server sends `GC_CREATE_FLY` with a registered fly-data index and VID endpoints.
2. `CPythonNetworkStream::RecvCreateFlyPacket()` calls `CFlyingManager::CreateIndexedFly(index, startPos, endPos)`.
3. `CFlyingInstance` advances the projectile position each frame along the trajectory defined by `CFlyingData` (speed, arc height, model).
4. When the projectile reaches its target, `IFlyEventHandler` fires a hit callback, and the `GC_DAMAGE_INFO` packet (which has already arrived from the server) is displayed.

### 8.4 Buff / Debuff Display

- `RecvAffectAddPacket()` triggers `CActorInstance::IEventHandler::OnSetAffect(affectIndex)`.
- The actor may play a status-effect particle (e.g., poison green cloud, stun stars).
- The Python UI reads the affect data via the `player` module to show buff icons with remaining duration.
- `RecvAffectRemovePacket()` triggers `OnResetAffect` and removes the particle effect.

### 8.5 Death and Revive

1. Server sends `GC_DEAD` → client plays the death animation on that actor's `CActorInstance`.
2. For the local player, the Python UI shows the death screen with a resurrect button.
3. Player clicks revive → `net.SendRevivePacket()` → server calls `ch->Revive(bInPlace)`.
4. Server broadcasts updated character position and HP → client restores the actor to idle state.

### 8.6 Python Combat Bridge (`skill` module)

The `skill` C-extension module (registered from `UserInterface/PythonSkillModule.cpp`) exposes skill data to Python UI scripts:

| Python Call | Purpose |
|-------------|---------|
| `skill.GetSkillLevel(vnum)` | Returns current level |
| `skill.GetSkillMasterType(vnum)` | Returns mastery tier (0–3) |
| `skill.GetSkillCoolTime(vnum)` | Returns remaining cooldown |
| `skill.GetSkillDescription(vnum)` | Localised description string |

---

## 9. Key Files

| File | Repo | Role |
|------|------|------|
| `server-src/src/game/battle.h` | server-src | Free-function declarations for all combat calculations |
| `server-src/src/game/battle.cpp` | server-src | `CalcMeleeDamage`, `CalcMagicDamage`, `CalcArrowDamage`, `CalcAttBonus`, `CalcBattleDamage`, `CalcAttackRating`, `NormalAttackAffect`, `IS_SPEED_HACK`, `battle_melee_attack`, `battle_is_attackable` |
| `server-src/src/game/char_battle.cpp` | server-src | `CHARACTER` combat methods: `Damage()`, `Dead()`, `Revive()`, `DistributeExp()` |
| `server-src/src/game/char_skill.cpp` | server-src | `UseSkill()`, `GetSkillLevel()`, `LearnSkill()`, `GetSkillMasterType()`, cooldown management |
| `server-src/src/game/skill.h` / `skill.cpp` | server-src | `CSkillProto` — skill data loaded from `TSkillTable`; formula strings |
| `server-src/src/game/char.h` | server-src | `CHARACTER` class — all point constants (`POINT_*`), affect methods, stat methods |
| `server-src/src/game/affect.h` / `affect.cpp` | server-src | Affect struct, duration tick event, `AddAffect`, `RemoveAffect`, `RefreshAffect` |
| `server-src/src/game/pvp.h` / `pvp.cpp` | server-src | PvP mode management, duel logic, `battle_is_attackable` PvP path |
| `server-src/src/game/arena.h` / `BattleArena.h` | server-src | Instanced PvP arena matchmaking and zones |
| `server-src/src/game/motion.h` / `ani.h` | server-src | Attack speed computation from motion/animation tables |
| `server-src/src/game/constants.h` / `constants.cpp` | server-src | Damage scaling tables, EXP tables |
| `server-src/src/game/packet_structs.h` | server-src | `TPacketCGAttack`, `TPacketGCDamageInfo`, `TPacketGCSkillUse`, etc. |
| `server-src/src/common/packet_headers.h` | server-src | All `CG::*` and `GC::*` packet header constants including `CG::ATTACK`, `CG::USE_SKILL`, `GC::DAMAGE_INFO`, `GC::SKILL_USE`, `GC::AFFECT_ADD`, `GC::AFFECT_REMOVE`, `GC::CREATE_FLY`, `GC::DEAD` |
| `server-src/src/common/length.h` | server-src | `EApplyTypes`, `EImmuneFlags`, `ERaceFlags`, `SKILL_MAX_LEVEL`, `SKILL_MAX_NUM` |
| `server-src/src/libpoly/Poly.h` / `Poly.cpp` | server-src | `CPoly` — formula parser and stack-machine evaluator for skill damage expressions |
| `server-src/src/libpoly/SymTable.h` | server-src | `CSymTable` — named variable binding for formula evaluation |
| `client-src/src/UserInterface/PythonNetworkStream.h` | client-src | `CPythonNetworkStream` — `SendAttackPacket`, `SendUseSkillPacket`, `SendShootPacket`, `SendFlyTargetingPacket`; `RecvAffectAddPacket`, `RecvAffectRemovePacket`, `RecvCreateFlyPacket` |
| `client-src/src/UserInterface/PythonSkillModule.cpp` | client-src | `skill` Python C-extension module — skill data queries |
| `client-src/src/UserInterface/PythonPlayerModule.cpp` | client-src | `player` Python C-extension module — player stat and affect queries |
| `client-src/src/GameLib/ActorInstanceBattle.cpp` | client-src | Client-side combat: hit processing, damage number display, death animation |
| `client-src/src/GameLib/ActorInstanceMotion.cpp` | client-src | Motion state machine: attack animation queueing, combo handling |
| `client-src/src/GameLib/FlyingObjectManager.h` / `FlyingInstance.h` | client-src | Projectile creation, flight simulation, hit callback |
| `client-bin/assets/root/game.py` | client-bin | Main game loop — routes attack/skill keypresses to `net.Send*` calls |
