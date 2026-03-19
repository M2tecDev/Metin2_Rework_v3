# Wiki Blueprint Pages + GitHub Pages Calculators — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 Full-Stack Blueprint pages to the GitHub Wiki and 6 interactive calculators on GitHub Pages for the Metin2 Rework v3 project.

**Architecture:** Each blueprint page follows a strict 5-section template (Full-Stack Architecture → Causal Chain → Dependency Matrix → Extension How-To → Debug Anchors), written by directly reading server/client source files. Calculators are standalone HTML+JS pages hosted under `/docs/` on the main branch with GitHub Pages.

**Tech Stack:** Markdown + GitHub-flavored LaTeX for blueprints; pure HTML + Vanilla JS + CSS for calculators; no build pipeline.

---

## File Map

### Wiki files (write to wiki/, then sync to wiki-repo/)
| File | Action |
|------|--------|
| `wiki/blueprint-Item-System.md` | Create |
| `wiki/blueprint-Game-Client-Protocol.md` | Create |
| `wiki/blueprint-Character-System.md` | Create |
| `wiki/blueprint-Combat-System.md` | Create |
| `wiki/blueprint-Quest-System.md` | Create |
| `wiki/blueprint-UI-Python-System.md` | Create |
| `wiki/blueprint-Login-Flow.md` | Create |
| `wiki/blueprint-Map-World-System.md` | Create |
| `wiki/_Sidebar.md` | Modify — add Blueprints section |
| `wiki/Home.md` | Modify — add Blueprints table + calculator hub link |

### GitHub Pages files (write to docs/ on main branch)
| File | Action |
|------|--------|
| `docs/index.html` | Create |
| `docs/css/style.css` | Create |
| `docs/js/formulas.js` | Create |
| `docs/calculators/damage.html` | Create |
| `docs/calculators/upgrade.html` | Create |
| `docs/calculators/dragon-soul.html` | Create |
| `docs/calculators/horse-level.html` | Create |
| `docs/calculators/drop-chance.html` | Create |
| `docs/calculators/flags.html` | Create |

### Source files to READ (not modify)
- `server-src/src/game/battle.cpp` — damage formulas
- `server-src/src/game/refine.cpp` — refine success probability
- `server-src/src/game/char_item.cpp` — UseItem dispatch
- `server-src/src/game/char_horse.cpp` — horse level/feed
- `server-src/src/game/item_manager.cpp` — drop chance
- `server-src/src/common/length.h` — all enums and flags
- `server-src/src/common/packet_headers.h` — packet constants
- `server-src/src/common/item_length.h` — item limits
- `client-bin/assets/root/dragon_soul_refine_settings.py` — DS tables
- Existing wiki topic pages in `wiki/topic-*.md` — cross-reference

---

## PHASE 1 — Blueprint Batch 1

### Task 1: blueprint-Item-System.md

**Source files to read first:**
- `server-src/src/common/length.h` (EItemType, EWearPositions, EApplyTypes, item limits)
- `server-src/src/common/item_length.h` (ITEM_ATTRIBUTE_MAX_NUM, ITEM_SOCKET_MAX_NUM)
- `server-src/src/common/tables.h` (TItemTable, TPlayerItem structs)
- `server-src/src/common/packet_headers.h` (CG/GC item packet headers)
- `server-src/src/game/char_item.cpp` (UseItem dispatch)
- `wiki/topic-Item-System.md` (existing reference)

**Files:**
- Create: `wiki/blueprint-Item-System.md`

- [ ] **Step 1: Read source files**

Read the 6 source files listed above to extract: all EItemType values, ITEM_ATTRIBUTE_MAX_NUM and ITEM_SOCKET_MAX_NUM constants, TItemTable struct fields, CG/GC item packet headers, UseItem switch structure.

- [ ] **Step 2: Write blueprint-Item-System.md**

Section 1 — Full-Stack Architecture:
```
Layer: DB/Proto      → item_proto SQL table, TItemTable struct (tables.h)
Layer: Server C++    → char_item.cpp UseItem(), item.cpp, item_manager.cpp
Layer: Network       → CG::ITEM_USE, CG::ITEM_DROP, GC::ITEM_SET, GC::ITEM_DEL (packet_headers.h)
Layer: Client C++    → PythonNetworkStreamPhaseGame.cpp RecvItemSet/Del, GameLib/ItemManager
Layer: Python        → uiinventory.py, uitooltip.py, uiCommon.py
```

Section 2 — Causal Chain (item right-click → use):
```
Trigger: Player right-clicks item slot
→ uiinventory.py:InventoryWindow.UseItem(slotIndex)
→ net.SendItemUsePacket(slotIndex)
→ PythonNetworkStreamPhaseGame.cpp:SendItemUsePacket → TPacketCGItemUse over TCP
→ packet CG::ITEM_USE (verify header from packet_headers.h)
→ game/input_main.cpp:CInputMain::ItemUse
→ game/char_item.cpp:CHARACTER::UseItem(TItemPos)
→ switch(ITEM_TYPE): potion → PointChange(POINT_HP, +value)
→ GC::CHAR_UPDATE → client HP bar updates
```

Section 3 — Dependency Matrix:
Sync points: TPacketCGItemUse layout server↔client; TPlayerItem struct for DB↔game; item_proto binary client↔server SQL
Hardcoded limits: ITEM_ATTRIBUTE_MAX_NUM=7 (item_length.h), ITEM_SOCKET_MAX_NUM=3 (item_length.h), EItemType max=BYTE (0-255), WEAR_MAX_NUM=32

Section 4 — Extension How-To:
- How to add a new ITEM_TYPE (6 steps across 6 files)
- How to add a new apply bonus type (5 steps)
- How to add an 8th item attribute slot (4 steps + rebuild proto)
Controlling constants table.

Section 5 — Debug Anchors (≥5 rows):
- syserr UseItem unknown type → char_item.cpp switch
- Client shows wrong icon → item_proto binary out of sync
- Item disappears on use → proto type mismatch
- Attribute slot overflow → ITEM_ATTRIBUTE_MAX_NUM not raised on client
- CRC kick on login → client item_proto differs from server

- [ ] **Step 3: Commit**

```bash
cd "/d/Git Repo/Metin2_Rework_v3/.claude/worktrees/trusting-haibt"
git add wiki/blueprint-Item-System.md
git commit -m "docs(wiki): add blueprint-Item-System — full-stack blueprint with causal chain and dependency matrix"
```

---

### Task 2: blueprint-Game-Client-Protocol.md

**Source files to read first:**
- `server-src/src/common/packet_headers.h` (all CG/GC/GD/DG/GG headers)
- `server-src/src/game/input_main.cpp` (dispatcher pattern, phase enforcement)
- `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` (recv dispatch table)
- `wiki/topic-Game-Client-Protocol.md` (existing reference)

**Files:**
- Create: `wiki/blueprint-Game-Client-Protocol.md`

- [ ] **Step 1: Read source files**

Extract: phase enforcement pattern, packet dispatcher structure both sides, encryption layer, GD/DG framing differences from CG/GC.

- [ ] **Step 2: Write blueprint-Game-Client-Protocol.md**

Section 1 — Architecture: 5 layers showing how a packet travels from Python → C++ client → TCP → C++ server → handler

Section 2 — Causal Chain: trace CG_ATTACK from keypress to GC_DAMAGE_INFO display (the most complex round-trip)

Section 3 — Dependency Matrix:
Sync points: every TPacket struct must be `#pragma pack(1)` identical both sides; phase enum must match; header uint16_t values must match
Hardcoded limits: PHASE_* enum range, packet header namespace (CG 0x00xx range, GC 0x00xx range — document collision risk)

Section 4 — How-To: add a new CG+GC packet pair (8 steps: headers.h × 2, struct × 2, send function, recv register, Python module, test)

Section 5 — Debug Anchors:
- "Unknown packet header" syserr → input_main dispatch table missing entry
- Client disconnect on packet → struct size mismatch (pragma pack)
- Packet dropped silently → wrong phase for packet type
- Encryption fails → libsodium key mismatch (SecureCipher.h)
- GD packet not reaching db → handle/size framing wrong (GD uses 10-byte overhead)

- [ ] **Step 3: Commit**

```bash
git add wiki/blueprint-Game-Client-Protocol.md
git commit -m "docs(wiki): add blueprint-Game-Client-Protocol — packet lifecycle, phase enforcement, sync matrix"
```

---

### Task 3: blueprint-Character-System.md

**Source files to read first:**
- `server-src/src/game/char.h` (CHARACTER members, EPointTypes)
- `server-src/src/common/tables.h` (TPlayerTable, CHARACTER_POINT structs)
- `server-src/src/common/packet_headers.h` (GC::PLAYER_POINTS, GC::CHAR_UPDATE)
- `wiki/topic-Character-System.md` (existing reference)

**Files:**
- Create: `wiki/blueprint-Character-System.md`

- [ ] **Step 1: Read source files**

Extract: CHARACTER_POINT layout, EPointTypes enum values, TPlayerTable persistence fields, sync packets.

- [ ] **Step 2: Write blueprint-Character-System.md**

Section 1 — Architecture: TPlayerTable (DB) → CHARACTER (server) → GC_PLAYER_POINTS (network) → CPythonPlayer (client C++) → uitaskbar.py/uicharacter.py (Python)

Section 2 — Causal Chain: adding a stat point (player clicks +STR button → Python → CG_POINT_UP → server PointChange → save to TPlayerTable → GC_PLAYER_POINTS → client updates stat display)

Section 3 — Dependency Matrix:
Sync: CHARACTER_POINT::points[] array index must match EPointTypes; TPlayerTable::points[] size must accommodate all point types; GC_PLAYER_POINTS packet point array size
Hardcoded limits: POINT_MAX_NUM=138 (length.h), CHARACTER_NAME_MAX_LEN=64, PLAYER_MAX_LEVEL_CONST=120, QUICKSLOT_MAX_NUM=36

Section 4 — How-To: add a new point type (5 steps); add a new persistent character field (6 steps: TPlayerTable → DB schema → save/load → packet → client display)

Section 5 — Debug Anchors: ≥5 rows covering wrong stats, unsaved data, sync lag, level cap issues.

- [ ] **Step 3: Commit**

```bash
git add wiki/blueprint-Character-System.md
git commit -m "docs(wiki): add blueprint-Character-System — point system, sync chain, extension how-to"
```

---

### Task 4: blueprint-Combat-System.md

**Source files to read first:**
- `server-src/src/game/battle.cpp` (CalcMeleeDamage, CalcBattleDamage, IS_SPEED_HACK)
- `server-src/src/common/length.h` (EApplyTypes, EImmuneFlags, ERaceFlags)
- `wiki/topic-Combat-System.md` (existing reference)

**Files:**
- Create: `wiki/blueprint-Combat-System.md`

- [ ] **Step 1: Read battle.cpp for exact formulas**

Extract: CalcMeleeDamage formula, CalcBattleDamage level-scaling table, IS_SPEED_HACK threshold, critical/penetrate roll logic, affect application on hit.

- [ ] **Step 2: Write blueprint-Combat-System.md**

Section 1 — Architecture: 5 layers from attack keypress to HP bar update

Section 2 — Causal Chain: normal melee attack full trace

Section 3 — Dependency Matrix:
Sync: TPacketCGAttack struct; GC_DAMAGE_INFO must carry correct damage type flags
Hardcoded limits: POINT_CRITICAL_PCT max (verify cap in battle.cpp), POINT_PENETRATE_PCT cap, attack speed minimum interval, IS_SPEED_HACK BONUS constant

LaTeX formulas for:
$$\text{raw\_damage} = \text{ATT\_GRADE} + \text{rand}(\text{ATT\_MIN}, \text{ATT\_MAX})$$
$$\text{net\_damage} = \text{after\_bonus} \cdot \text{level\_factor} - \text{DEF\_GRADE}$$

Section 4 — How-To: add a new EApplyType bonus (5 steps); add a new damage type flag (4 steps); add a new immune flag (4 steps)

Section 5 — Debug Anchors: ≥5 rows (speed hack false positives, wrong damage, immune not working, affect not stacking, GC_DAMAGE_INFO not received)

Link to: `→ [Interactive Damage Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/damage)`

- [ ] **Step 3: Commit**

```bash
git add wiki/blueprint-Combat-System.md
git commit -m "docs(wiki): add blueprint-Combat-System — damage formulas (LaTeX), speed-hack guard, extension how-to"
```

---

## PHASE 2 — Blueprint Batch 2

### Task 5: blueprint-Quest-System.md

**Source files to read first:**
- `server-src/src/game/questmanager.h` (CQuestManager, QuestState)
- `server-src/src/game/questlua_pc.cpp` (pc.* API functions)
- `server-src/src/qc/` (compiler FSM)
- `wiki/topic-Quest-System.md`

**Files:**
- Create: `wiki/blueprint-Quest-System.md`

- [ ] **Step 1: Read quest source files, write blueprint**

All 5 sections. Causal chain: `when npc.chat` trigger → qc compiler → CQuestManager::StartQuest → Lua execution → say() → GC_SCRIPT packet → Python QuestDialog.

Dependency Matrix: quest_functions whitelist (qc won't compile unlisted functions); Lua state isolation per-quest; GC_SCRIPT/CG_SCRIPT_ANSWER packet struct sync; quest flag storage in `quest` SQL table.

Hardcoded limits: quest name max length, flag name constraints (alphanumeric + underscore only), timer precision (1-second minimum).

How-To: add a new quest function in C++ (register in questlua_*.cpp + add to quest_functions whitelist in qc); add a new quest trigger event.

Link to: `→ [Drop Chance Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/drop-chance)`

- [ ] **Step 2: Commit**

```bash
git add wiki/blueprint-Quest-System.md
git commit -m "docs(wiki): add blueprint-Quest-System — Lua trigger chain, compiler dependency, extension how-to"
```

---

### Task 6: blueprint-UI-Python-System.md

**Source files to read first:**
- `client-src/src/EterPythonLib/PythonWindow.h` (CWindow hierarchy)
- `client-src/src/UserInterface/PythonNetworkStreamModule.cpp` (net module registration)
- `wiki/topic-UI-Python-System.md`
- `wiki/client-bin-root-framework.md`

**Files:**
- Create: `wiki/blueprint-UI-Python-System.md`

- [ ] **Step 1: Read UI source files, write blueprint**

All 5 sections. Causal chain: UIScript dict loaded → CPythonLauncher::RunFile → CWindow::Create → Python class __init__ → Show().

Dependency Matrix: CWindow method names must match Python `ui.Window` wrappers; C extension module function signatures must match Python call sites; UIScript `type` strings must match registered factories.

How-To: add a new C++ widget type (register in EterPythonLib + expose to Python in PythonWindowModule); add a new `net` module function.

Debug Anchors: AttributeError on widget access, TypeError in C extension call, UIScript type unknown, window renders at 0,0, event callback not firing.

- [ ] **Step 2: Commit**

```bash
git add wiki/blueprint-UI-Python-System.md
git commit -m "docs(wiki): add blueprint-UI-Python-System — Python/C++ bridge, widget chain, extension how-to"
```

---

### Task 7: blueprint-Login-Flow.md

**Source files to read first:**
- `server-src/src/game/input_login.cpp` (CInputLogin handlers)
- `server-src/src/game/input_handshake.cpp` (key exchange)
- `wiki/topic-Login-Flow.md`

**Files:**
- Create: `wiki/blueprint-Login-Flow.md`

- [ ] **Step 1: Read login source files, write blueprint**

All 5 sections. Causal chain: Python LoginWindow.OnLogin → net.SendLoginPacket → CG::LOGIN_SECURE → CInputLogin::LoginSecure → GD::LOGIN → db validates → DG::LOGIN_SUCCESS → GC::LOGIN_SUCCESS3 → Python OnLoginSuccess.

Dependency Matrix: login packet struct (credentials encoding); session key lifecycle; phase transition timing (must set PHASE_LOGIN before sending LOGIN_SECURE).

Debug Anchors: wrong password loop, duplicate login, timeout during handshake, GD packet never arrives at db, character list empty after login.

- [ ] **Step 2: Commit**

```bash
git add wiki/blueprint-Login-Flow.md
git commit -m "docs(wiki): add blueprint-Login-Flow — 24-step auth chain, session key lifecycle, debug anchors"
```

---

### Task 8: blueprint-Map-World-System.md

**Source files to read first:**
- `server-src/src/game/sectree_manager.cpp` (map loading, sector key)
- `server-src/src/game/regen.cpp` (regen event)
- `wiki/topic-Map-World-System.md`

**Files:**
- Create: `wiki/blueprint-Map-World-System.md`

- [ ] **Step 1: Read map source files, write blueprint**

All 5 sections. Causal chain: player warps → CG::WARP → server validates → GD::WARP_CHARACTER → new game process → GC::PHASE LOADING → map data sent → GC::PHASE GAME.

Dependency Matrix: **coordinate × 100 factor** (server cm vs client display units) — highlight prominently; SECTREE key encoding; map attribute bit alignment.

LaTeX:
$$\text{server\_coord} = \text{client\_coord} \times 100$$

Hardcoded limits: SECTREE sector size = 3200 units, map attribute BYTE/WORD/DWORD auto-selection threshold.

How-To: add a new map (11 steps: server files + client files + atlas + npc_list + regen); add a new dungeon instance.

- [ ] **Step 2: Commit**

```bash
git add wiki/blueprint-Map-World-System.md
git commit -m "docs(wiki): add blueprint-Map-World-System — warp chain, coordinate factor warning, new-map how-to"
```

---

## PHASE 3 — GitHub Pages Calculators

### Task 9: Shared Infrastructure

**Files:**
- Create: `docs/index.html`
- Create: `docs/css/style.css`
- Create: `docs/js/formulas.js`
- Create: `docs/calculators/` (directory)

- [ ] **Step 1: Check GitHub Pages is activated**

```bash
# Verify docs/ directory is configured as Pages source
# If not: Settings → Pages → Branch: main, Folder: /docs
ls "/d/Git Repo/Metin2_Rework_v3/docs/"
```

- [ ] **Step 2: Create style.css**

Dark theme: `#0d1117` background, `#c9d1d9` text, `#58a6ff` accent/links, `#161b22` card backgrounds, `#30363d` borders. Responsive single-column layout. Input fields, buttons, result boxes styled consistently.

- [ ] **Step 3: Create formulas.js**

Shared functions with source comments:
```javascript
// Source: server-src/src/game/battle.cpp CalcMeleeDamage()
function calcMeleeDamage(attGrade, attMin, attMax, defGrade, attBonus, levelFactor) { ... }

// Source: server-src/src/game/battle.cpp CalcBattleDamage()
function calcLevelFactor(attackerLevel, victimLevel) { ... }

// Source: server-src/src/game/item_manager.cpp CreateDropItem()
function calcDropChance(baseRate, levelDiff, mobRank, premiumBonus) { ... }
```

- [ ] **Step 4: Create docs/index.html**

Calculator Hub page: title "Metin2 Rework v3 — Developer Calculators", grid of 6 cards (one per calculator), each with name + description + link. Links back to wiki.

- [ ] **Step 5: Commit**

```bash
cd "/d/Git Repo/Metin2_Rework_v3"
git add docs/index.html docs/css/style.css docs/js/formulas.js
git commit -m "feat(gh-pages): add calculator hub, shared CSS dark theme, shared formula JS"
```

---

### Task 10: Damage Calculator

**Files:**
- Create: `docs/calculators/damage.html`

- [ ] **Step 1: Write damage.html**

Inputs: ATT_GRADE (number), ATT_MIN (number), ATT_MAX (number), DEF_GRADE (number), Level difference (-10 to +10 slider), AttBonus % (0–200), Critical % (0–100).

Outputs section:
- Minimum damage
- Maximum damage
- Expected average damage
- With critical hit (×2)
- With penetrating hit (ignores DEF)

Show formula under result:
```
raw = ATT_GRADE + rand(ATT_MIN, ATT_MAX)
after_bonus = raw × (1 + AttBonus/100)
after_level = after_bonus × levelFactor
net = max(0, after_level - DEF_GRADE)
```

Source comment at top of JS: `// Formula from: server-src/src/game/battle.cpp :: CalcMeleeDamage()`

- [ ] **Step 2: Commit**

```bash
git add docs/calculators/damage.html
git commit -m "feat(gh-pages): add damage calculator (CalcMeleeDamage formula)"
```

---

### Task 11: Upgrade/Refine Calculator

**Files:**
- Create: `docs/calculators/upgrade.html`

- [ ] **Step 1: Write upgrade.html**

Inputs: Item grade (0–9 slider with labels: +0 to +9), Success chance % (from refine_proto, manual input), Material cost (yang, manual input), Number of simulated attempts (1–1000).

Outputs:
- Probability of success in N attempts: `1 - (1 - p)^N`
- Expected attempts until first success: `1/p`
- Expected total yang cost: `cost × (1/p)`
- Expected yang for N upgrades: `N × cost / p`

LaTeX-style formula displayed as text in results box.
Source: `// Formula from: server-src/src/game/refine.cpp :: CRefineManager::Refine() + refine_proto.prob`

- [ ] **Step 2: Commit**

```bash
git add docs/calculators/upgrade.html
git commit -m "feat(gh-pages): add upgrade/refine calculator (success probability and cost)"
```

---

### Task 12: Dragon Soul Calculator

**Files:**
- Create: `docs/calculators/dragon-soul.html`

- [ ] **Step 1: Write dragon-soul.html**

Data tables embedded directly from `dragon_soul_refine_settings.py`:
- `default_grade_need_count = [15, 10, 5, 3]`
- `default_grade_fee = [30000, 50000, 70000, 100000]`
- `default_step_need_count = [4, 3, 2, 1]`
- `default_step_fee = [20000, 30000, 40000, 50000]`
- `strength_max_table` (5×5)

Inputs: DS Type (dropdown 11–16), current grade (0–3), current step (0–4), target grade, target step.

Output: step-by-step upgrade path table showing stones needed and yang cost for each step.

Source: `// Data from: client-bin/assets/root/dragon_soul_refine_settings.py`

- [ ] **Step 2: Commit**

```bash
git add docs/calculators/dragon-soul.html
git commit -m "feat(gh-pages): add Dragon Soul alchemy calculator"
```

---

### Task 13: Horse Level Calculator

**Files:**
- Create: `docs/calculators/horse-level.html`

- [ ] **Step 1: Read char_horse.cpp for feed/level table**

```bash
grep -n "level\|feed\|exp\|horse" "/d/Git Repo/Metin2_Rework_v3/server-src/src/game/char_horse.cpp" | head -60
```

Extract the horse level EXP table and feed item values.

- [ ] **Step 2: Write horse-level.html**

Inputs: current horse level (1–30), feed item type (dropdown: carrot types), target level.

Output: feed items needed, total yang cost.

If exact formula unavailable from source read, show what was found and note the source location for manual verification.

Source: `// Formula from: server-src/src/game/char_horse.cpp`

- [ ] **Step 3: Commit**

```bash
git add docs/calculators/horse-level.html
git commit -m "feat(gh-pages): add horse level calculator"
```

---

### Task 14: Drop Chance Calculator

**Files:**
- Create: `docs/calculators/drop-chance.html`

- [ ] **Step 1: Read item_manager.cpp for drop formula**

```bash
grep -n "drop\|chance\|prob\|rate" "/d/Git Repo/Metin2_Rework_v3/server-src/src/game/item_manager.cpp" | head -60
```

- [ ] **Step 2: Write drop-chance.html**

Inputs: base drop rate % (0–100), mob rank (0=Pawn → 5=King, dropdown), player/mob level difference (-20 to +20 slider), premium bonus % (0–100).

Output:
- Adjusted drop probability per kill
- Expected kills per drop
- Expected kills for 95% chance of at least one drop: `log(0.05)/log(1-p)`

Source: `// Formula from: server-src/src/game/item_manager.cpp :: ITEM_MANAGER::CreateDropItem()`

- [ ] **Step 3: Commit**

```bash
git add docs/calculators/drop-chance.html
git commit -m "feat(gh-pages): add drop chance calculator"
```

---

### Task 15: Flag Calculator

**Files:**
- Create: `docs/calculators/flags.html`

- [ ] **Step 1: Read length.h for all flag enums**

```bash
grep -A 40 "EAntiFlags\|EWearFlags\|ERaceFlags\|EAIFlags\|EImmuneFlags" "/d/Git Repo/Metin2_Rework_v3/server-src/src/common/length.h"
```

- [ ] **Step 2: Write flags.html**

Four collapsible sections, one per flag type:
- **ANTI_FLAG** — checkboxes for each bit (ANTI_FEMALE, ANTI_MALE, ANTI_WARRIOR, etc.)
- **WEAR_FLAG** — which equipment slots the item can go in
- **RACE_FLAG** — monster race classification bits
- **IMMUNE_FLAG** — monster immunity bits

Live output as user checks boxes:
- Decimal value (for item_proto SQL)
- Hex value (e.g. `0x00000005`)
- Active flag names list

All flag names and values sourced directly from `length.h`.

Source: `// All constants from: server-src/src/common/length.h`

- [ ] **Step 3: Commit**

```bash
git add docs/calculators/flags.html
git commit -m "feat(gh-pages): add flag bitmask calculator (ANTI/WEAR/RACE/IMMUNE flags)"
```

---

## PHASE 4 — Navigation & Deploy

### Task 16: Update Wiki Navigation

**Files:**
- Modify: `wiki/_Sidebar.md`
- Modify: `wiki/Home.md`

- [ ] **Step 1: Update _Sidebar.md — add Blueprints section**

Add after `## [[Home]]` and before `## Developer Guides`:
```markdown
## Blueprints
- [[blueprint-Item-System|📐 Item System]]
- [[blueprint-Game-Client-Protocol|📐 Game↔Client Protocol]]
- [[blueprint-Character-System|📐 Character System]]
- [[blueprint-Combat-System|📐 Combat System]]
- [[blueprint-Quest-System|📐 Quest System]]
- [[blueprint-UI-Python-System|📐 UI Python System]]
- [[blueprint-Login-Flow|📐 Login Flow]]
- [[blueprint-Map-World-System|📐 Map & World System]]
```

- [ ] **Step 2: Update Home.md — add Blueprints table + Calculator Hub link**

Add after existing Developer Guides section:
```markdown
## System Blueprints

Full-stack architecture breakdowns with causal chains, dependency matrices, extension how-tos, and debug anchors.

| Blueprint | Key Formulas | Calculator |
|-----------|-------------|-----------|
| [Item System](blueprint-Item-System) | Item type dispatch, attribute limits | [Upgrade Calc](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/upgrade) |
| [Game↔Client Protocol](blueprint-Game-Client-Protocol) | Packet framing | — |
| [Character System](blueprint-Character-System) | Point types, stat sync | [Horse Level Calc](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/horse-level) |
| [Combat System](blueprint-Combat-System) | Damage formulas (LaTeX) | [Damage Calc](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/damage) |
| [Quest System](blueprint-Quest-System) | Drop rates | [Drop Chance Calc](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/drop-chance) |
| [UI Python System](blueprint-UI-Python-System) | C++/Python bridge | — |
| [Login Flow](blueprint-Login-Flow) | Auth chain | — |
| [Map & World System](blueprint-Map-World-System) | Coord ×100 factor | — |

🧮 **[Open Calculator Hub →](https://m2tecdev.github.io/Metin2_Rework_v3/)**
```

- [ ] **Step 3: Commit navigation changes**

```bash
cd "/d/Git Repo/Metin2_Rework_v3/.claude/worktrees/trusting-haibt"
git add wiki/_Sidebar.md wiki/Home.md
git commit -m "docs(wiki): add Blueprints section to sidebar and homepage"
```

---

### Task 17: Sync Wiki and Push Everything

**Files:** wiki-repo/, main branch

- [ ] **Step 1: Copy all wiki files to wiki-repo**

```bash
cd "/d/Git Repo/Metin2_Rework_v3/.claude/worktrees/trusting-haibt"
cp wiki/*.md wiki-repo/
```

- [ ] **Step 2: Commit and push wiki-repo**

```bash
cd "/d/Git Repo/Metin2_Rework_v3/.claude/worktrees/trusting-haibt/wiki-repo"
git add -A
git commit -m "Add 8 blueprint pages and update navigation (blueprints + calculator hub links)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin master
```

- [ ] **Step 3: Push main branch (GitHub Pages)**

```bash
cd "/d/Git Repo/Metin2_Rework_v3"
git add docs/
git commit -m "feat(gh-pages): add 6 interactive calculators and calculator hub

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin claude/wiki-v2-guides
```

- [ ] **Step 4: Verify GitHub Pages**

Open `https://m2tecdev.github.io/Metin2_Rework_v3/` — confirm index.html loads.
Open `https://m2tecdev.github.io/Metin2_Rework_v3/calculators/damage` — confirm calculator works.

- [ ] **Step 5: Verify Wiki**

Open `https://github.com/M2tecDev/Metin2_Rework_v3/wiki/blueprint-Item-System` — confirm page renders.
Check one LaTeX formula renders (e.g. damage formula in blueprint-Combat-System).

---

## Completion Checklist

- [ ] 8 blueprint pages on GitHub Wiki
- [ ] Each blueprint has all 5 template sections with ≥5 debug anchors
- [ ] LaTeX formulas present in Combat and Map blueprints
- [ ] Calculator Hub at `https://m2tecdev.github.io/Metin2_Rework_v3/`
- [ ] All 6 calculators functional and formula-sourced
- [ ] Wiki sidebar has Blueprints section
- [ ] Homepage has Blueprint table + calculator hub link
- [ ] Blueprint-to-calculator cross-links working
