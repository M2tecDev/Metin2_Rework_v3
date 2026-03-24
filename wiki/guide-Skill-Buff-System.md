# Guide: Skill & Buff System

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [What is a vnum?](concept-vnum)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How skills, affects (buffs/debuffs), cooldowns, and mana costs work in Rework v3 — and how to add new ones.

## Overview

The skill and buff system spans three repos:

| Layer | Location | Role |
|-------|----------|------|
| **Proto definitions** | `server-src/share/skill_proto` (SQL/text) | Skill stats, formulas, cooldowns, costs |
| **Server logic** | `server-src/src/game/char_skill.cpp`, `affect.cpp` | Skill activation, affect application, cooldown tracking |
| **Client display** | `client-bin/assets/root/uitooltip.py`, `skill.py`, `skillslot.py` | Skill window, tooltip, buff icons |
| **Client data** | `client-bin/assets/skill_desc.txt`, `skill_table.txt` | Client-side skill display data |

---

## 1. Skill Structure

### Server: skill_proto

Each skill is a row in `skill_proto` (SQL) or `skill_proto.txt` (text export). Key columns:

| Column | Type | Description |
|--------|------|-------------|
| `vnum` | DWORD | Skill ID — used everywhere to reference the skill |
| `name` | string | Internal name (e.g. `SKILL_SWORD_ATTACK_SPEED`) |
| `type` | byte | `SKILL_TYPE_ACTIVE` or `SKILL_TYPE_PASSIVE` |
| `level_limit` | int | Minimum character level to learn |
| `max_level` | int | Maximum learnable level (typically 20) |
| `point_on_use` | string | Formula for SP/HP/stamina cost (evaluated by `libpoly`) |
| `duration` | string | Formula for buff duration in seconds |
| `cool_time` | string | Formula for cooldown in seconds |
| `damage` | string | Formula for damage/heal amount |
| `flag` | DWORD | Bit-flags: `SKILL_FLAG_ATTACK`, `SKILL_FLAG_BUFF`, `SKILL_FLAG_SELFONLY`, etc. |
| `affect_type` | byte | Which `EApplyTypes` stat is affected (for buff skills) |
| `affect_value` | string | Formula for the buff value |

All formula strings (e.g. `"10 + level * 5"`) are evaluated by `libpoly::CPoly` (see [server-src-libpoly](server-src-libpoly)). The variable `level` is bound to the character's current skill level at runtime. `EApplyTypes` and `EPointTypes` are central to how affects modify stats — see [topic-Character-System](topic-Character-System) and [topic-Item-System](topic-Item-System).

### Client: skill_desc.txt and skill_table.txt

`skill_desc.txt` provides tooltip descriptions with `%d` placeholders that are filled with the computed formula values. `skill_table.txt` maps skill vnums to icon paths, UI positions, and skill group assignments.

---

## 2. Skill Mastery Tiers

Skills have four mastery tiers, gated by skill level:

| Tier | Constant | Level Range | Description |
|------|----------|-------------|-------------|
| Normal | `SKILL_NORMAL` | 1–19 | Basic learnable state |
| Master | `SKILL_MASTER` | 20 | Reached via skill books |
| Grand Master | `SKILL_GRAND_MASTER` | 21–30 | Requires grand master book |
| Perfect Master | `SKILL_PERFECT_MASTER` | 31–40 | Requires perfect master book |

Tier transitions gate formula variable bonuses. Many skills have a multiplier in the formula that increases at Master and above:
```
damage = "level * 10 + master_bonus"
```
where `master_bonus` is bound based on current tier.

---

## 3. Skill Activation Flow

```
[Client]  Player presses skill hotkey
              │  CG_USE_SKILL {vnum, targetVID}
              ▼
[Server]  CInputMain::UseSkill()
              ├─ ch->CheckSkillCoolTime(vnum)     — reject if on cooldown
              ├─ ch->UseSkill(vnum, pkVictim)
              │     ├─ GetSkillProto(vnum)         — look up TSkillTable
              │     ├─ Evaluate point_on_use formula → drain SP/HP
              │     ├─ Evaluate damage formula     → CalcSkillDamage()
              │     ├─ victim->Damage(dmg)
              │     ├─ ch->AddAffect(buff) if skill has affect
              │     └─ ch->SetSkillCoolTime(vnum, cooltime)
              │
              │  GC_SKILL_USE  — broadcast to nearby clients
              │  GC_DAMAGE_INFO (if damage dealt)
              ▼
[Client]  Play skill animation, show damage number, update buff bar
```

---

## 4. The Affect System — Adding a Buff

An "affect" is a time-limited stat modifier applied to a character. It corresponds to a row in the in-memory affect table and is periodically saved to the database.

### Affect Data Structure

```cpp
// server-src/src/game/affect.h
struct TAffect {
    DWORD    dwType;          // EAffectTypes — unique identifier for this buff type
    BYTE     bApplyOn;        // EApplyTypes — which stat is modified
    long     lApplyValue;     // Amount of the modification (+/- value)
    DWORD    dwFlag;          // Bit-flags (e.g. AFFECT_FLAG_NO_SAVE)
    long     lDuration;       // Duration in seconds (0 = permanent)
    long     lSPCost;         // SP drained per tick (for channeled buffs)
};
```

### Applying a New Buff

```cpp
// server-src/src/game/char.cpp or wherever your system runs
void GiveMyCustomBuff(LPCHARACTER ch, int iDurationSeconds, int iBonus)
{
    // Remove the old affect if already active (refresh)
    ch->RemoveAffect(AFFECT_MY_CUSTOM_BUFF);

    // Apply the new affect
    ch->AddAffect(
        AFFECT_MY_CUSTOM_BUFF,   // dwType  — your new EAffectTypes constant
        APPLY_ATT_SPEED,         // bApplyOn — which stat to boost
        iBonus,                  // lApplyValue
        0,                       // dwFlag
        iDurationSeconds,        // lDuration
        0,                       // lSPCost
        false                    // bOverride
    );
}
```

### Step-by-Step: Adding a New Buff Type

1. **Add a constant in `affect.h`:**
   ```cpp
   enum EAffectTypes {
       // ... existing entries ...
       AFFECT_MY_CUSTOM_BUFF = 300,   // pick a free ID
   };
   ```

2. **Call `AddAffect` when granting the buff** (from a skill, item use, quest, etc.).

3. **Client display.** The `GC_AFFECT_ADD` packet is sent automatically by `AddAffect` → the client adds a buff icon to the buff bar. The icon is looked up by `dwType` in the client's affect icon table.

4. **Persistence.** Affects with `lDuration > 0` and without `AFFECT_FLAG_NO_SAVE` are saved to the `affect` table in MariaDB and restored on next login.

---

## 5. Cooldowns and Mana Costs

### Cooldowns

Cooldowns are tracked per-character in a `std::map<DWORD, DWORD>` (skill vnum → expire time):

```cpp
// Grant cooldown after use:
ch->SetSkillCoolTime(vnum, get_dword_time() + (DWORD)(cooltime * 1000));

// Check before use:
if (ch->IsSkillCoolTime(vnum))
{
    ch->ChatPacket(CHAT_TYPE_INFO, LC_TEXT("SKILL_COOLTIME_ERROR"));
    return;
}
```

The `cool_time` formula in `skill_proto` returns seconds; the server converts to milliseconds internally.

### Mana Costs

`point_on_use` formula defines the cost per use:

```
point_on_use = "30 + level * 5"
```

The server evaluates this formula and deducts from `POINT_SP`:

```cpp
int iSPCost = (int)pkSk->kPointOn.Eval(level);
if (ch->GetSP() < iSPCost)
{
    ch->ChatPacket(CHAT_TYPE_INFO, LC_TEXT("NOT_ENOUGH_SP"));
    return;
}
ch->PointChange(POINT_SP, -iSPCost);
```

---

## 6. Guild Skills

Guild skills are special: they are activated by the guild master and affect all nearby guild members. They are defined in `skill_proto` with `type = SKILL_TYPE_GUILD` and processed separately in `guild.cpp`. Guild skill levels are stored in the `guild_skill` column of the `guild` SQL table.

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `share/skill_proto.txt` | server-src | Skill definitions: formulas, cooldowns, cost, flags |
| `src/game/char_skill.cpp` | server-src | `UseSkill`, `CheckSkillCoolTime`, `SetSkillCoolTime` |
| `src/game/affect.cpp` | server-src | `AddAffect`, `RemoveAffect`, `UpdateAffect`, persistence |
| `src/game/affect.h` | server-src | `TAffect` struct, `EAffectTypes` enum |
| `src/game/char.h` | server-src | `CHARACTER` methods: `GetSkillLevel`, `AddAffect`, `IsSkillCoolTime` |
| `src/common/length.h` | server-src | `EApplyTypes` — stat types for affects |
| `assets/skill_desc.txt` | client-bin | Skill tooltip description strings |
| `assets/skill_table.txt` | client-bin | Skill icon/UI position/group mapping |
| `assets/root/uitooltip.py` | client-bin | Skill tooltip rendering |
| `assets/root/skillslot.py` | client-bin | Skill slot widget for the skill window |
