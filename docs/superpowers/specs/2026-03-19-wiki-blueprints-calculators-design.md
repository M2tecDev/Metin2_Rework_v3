# Design: Wiki Blueprint Pages + GitHub Pages Calculators

**Date:** 2026-03-19
**Status:** Approved
**Repo:** Metin2_Rework_v3

---

## Summary

Extend the existing Metin2 Rework v3 wiki with two parallel additions:

1. **8 `blueprint-` pages** in the GitHub Wiki — one per existing topic page — using a standardized Full-Stack Blueprint template that reveals system architecture, causal chains, dependency matrices, extension how-tos, and debug anchors.
2. **6 interactive calculators** hosted on GitHub Pages (`/docs` folder, `main` branch) for systems with calculable values, plus LaTeX formulas embedded in blueprint pages where interactivity is not needed.

---

## Preconditions

Before Phase 3 (GitHub Pages), verify:
- [ ] GitHub Pages is activated: Settings → Pages → Branch: `main`, Folder: `/docs`
- [ ] The Pages URL `https://m2tecdev.github.io/Metin2_Rework_v3/` resolves
- [ ] If the repo is private: GitHub Pages requires a paid plan for private repos — confirm before proceeding

> **LaTeX Note:** GitHub Wikis DO support math rendering via `$$...$$` and `$...$` blocks (GitHub introduced math support in May 2022, including Wiki pages). If a formula does not render, fall back to a linked GitHub Pages calculator for that formula.

---

## Part 1: Blueprint Pages

### Template — Full Definition

Each `blueprint-<system>.md` file uses the following template. Every section has a defined purpose, required content, and a concrete example.

---

#### Section 1: Full-Stack Architecture

**Purpose:** Map every file that participates in the system, grouped by layer.

**Required content per layer:**
- Table with: File path | Class or Function | Role (1 sentence)
- Minimum 2 entries per layer where applicable

**Example (Item System):**

| Layer | File | Class/Function | Role |
|-------|------|---------------|------|
| DB/Proto | `item_proto` SQL table | — | Defines all static item properties |
| Server C++ | `server-src/src/game/char_item.cpp` | `CHARACTER::UseItem()` | Dispatches right-click item actions |
| Network | `server-src/src/common/packet_headers.h` | `CG::ITEM_USE = 0x0026` | Client → server use-item packet header |
| Client C++ | `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvItemSetPacket()` | Updates client item cache on GC_ITEM_SET |
| Python | `client-bin/assets/root/uiinventory.py` | `InventoryWindow.UseItem()` | Triggers net.SendItemUsePacket() |

---

#### Section 2: Causal Chain

**Purpose:** Trace one complete action from user trigger to final state, naming the exact file and function at each step.

**Required content:**
- Start: the user action or event trigger
- Each step: `[Description]  (file:ClassName::FunctionName)`
- Network steps: label the packet name and header constant
- End: the final visible state or side-effect

**Example (item right-click):**
```
[Trigger]  Player right-clicks item in inventory
    │
    ▼  (root/uiinventory.py : InventoryWindow.UseItem)
[1] Python calls net.SendItemUsePacket(slotIndex)
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : SendItemUsePacket)
[2] C++ serializes TPacketCGItemUse, sends over TCP
    │
    ▼  packet: CG::ITEM_USE (0x0026)
[3] Server receives packet
    │
    ▼  (game/input_main.cpp : CInputMain::ItemUse)
[4] Calls ch->UseItem(TItemPos)
    │
    ▼  (game/char_item.cpp : CHARACTER::UseItem)
[5] Dispatches by ITEM_TYPE — e.g. potion restores HP
    │
    ▼  packet: GC::CHAR_UPDATE (0x0058)
[End] Client updates HP bar display
```

---

#### Section 3: Dependency Matrix

**Purpose:** Identify every place where two files must stay in sync, and warn about hardcoded array/enum limits.

**Required content — two sub-tables:**

**Sync Points:**
| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `TPacketCGItemUse` struct layout | `common/packet_headers.h` | `UserInterface/Packet.h` | Client/server read wrong bytes → crash or silent wrong behavior |

**Hardcoded Limits:**
| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|------------------------|
| `ITEM_ATTRIBUTE_MAX_NUM` | 7 | `common/item_length.h` | Server writes 8th attr → buffer overflow; client shows garbage in 8th slot |
| `ITEM_SOCKET_MAX_NUM` | 3 | `common/item_length.h` | Extra socket silently ignored or corrupts struct |

---

#### Section 4: Extension How-To

**Purpose:** Step-by-step instructions for the most common modifications to this system.

**Required content:**
- At least 2 concrete how-to scenarios (e.g. "add a new item type", "add a new packet field")
- Each step numbered, with the exact file to edit
- List of controlling constants/enums at the end

**Example:**
```
### How to add a new ITEM_TYPE

1. server-src/src/common/length.h — add constant to EItemType enum
2. server-src/src/game/char_item.cpp — add case to CHARACTER::UseItem() switch
3. server-src/src/common/tables.h — verify TItemTable.type is wide enough (BYTE = 0-255)
4. client-src/src/GameLib/ItemManager.h — mirror the new constant
5. client-bin/assets/root/uitooltip.py — add display name to ITEM_TYPE_NAME dict
6. item_proto SQL — add rows with the new type value

### Controlling Constants
| Enum/Define | File | Controls |
|------------|------|---------|
| EItemType | common/length.h | All item type values |
| EItemSubType | common/length.h | Sub-type values per item type |
```

---

#### Section 5: Debug Anchors

**Purpose:** Rapid diagnosis table for the most common failures in this system.

**Required content:**
- Minimum 5 rows
- Symptom must be a specific observable error (syserr text, crash type, wrong display)
- "Where to look" must name a specific file or log

**Example:**
| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| `syserr: UseItem: ITEM_TYPE unknown 42` | New item type not handled in switch | `game/char_item.cpp : CHARACTER::UseItem()` |
| Client crash on item tooltip | `applytype` value out of range in client enum | `GameLib/ItemManager.h` EApplyTypes |
| Item disappears but no effect | Wrong ITEM_TYPE in proto | `item_proto` table, `type` column |

---

### Pages to Create (8)

| Blueprint File | Based on Topic Page |
|----------------|---------------------|
| `blueprint-Item-System.md` | topic-Item-System.md |
| `blueprint-Game-Client-Protocol.md` | topic-Game-Client-Protocol.md |
| `blueprint-Character-System.md` | topic-Character-System.md |
| `blueprint-Combat-System.md` | topic-Combat-System.md |
| `blueprint-Login-Flow.md` | topic-Login-Flow.md |
| `blueprint-Quest-System.md` | topic-Quest-System.md |
| `blueprint-UI-Python-System.md` | topic-UI-Python-System.md |
| `blueprint-Map-World-System.md` | topic-Map-World-System.md |

---

## Part 2: GitHub Pages Calculators

### Calculator Specifications (with verified formula sources)

| File | Inputs | Output | Formula Source |
|------|--------|--------|---------------|
| `docs/calculators/damage.html` | ATT_GRADE, ATT_MIN/MAX, DEF_GRADE, level diff, AttBonus%, Crit% | Expected/Min/Max damage | `server-src/src/game/battle.cpp` → `CalcMeleeDamage()`, `CalcBattleDamage()` |
| `docs/calculators/upgrade.html` | Item grade (0–9), refine_set ID, material costs, number of attempts | Success %, total cost, cost-per-success | `server-src/src/game/refine.cpp` → `CRefineManager::Refine()` + `refine_proto.prob` column |
| `docs/calculators/dragon-soul.html` | DS type (11–16), grade (0–3), step (0–4), strength target | Material count, yang fee, upgrade path | `client-bin/assets/root/dragon_soul_refine_settings.py` — `default_grade_need_count`, `default_grade_fee`, `strength_max_table` |
| `docs/calculators/horse-level.html` | Current horse level, feed item vnum, target level | Feed items needed, total yang cost | `server-src/src/game/horse.cpp` or `char_horse.cpp` → level-up formula + feed table |
| `docs/calculators/drop-chance.html` | mob_rank, item base droprate (%), player/mob level diff, premium bonus % | Actual drop probability per kill | `server-src/src/game/item_manager.cpp` → `ITEM_MANAGER::CreateDropItem()` drop formula |
| `docs/calculators/flags.html` | Checkboxes for all ANTI_FLAG / WEAR_FLAG / RACE_FLAG / MOB_FLAG bits | Decimal value + Hex value + flag name list | `server-src/src/common/length.h` — `EAntiFlags`, `EWearFlags`, `ERaceFlags`, `EAIFlags` |

### Blueprint-to-Calculator Mapping

| Blueprint Page | Links to Calculator |
|---------------|---------------------|
| blueprint-Combat-System | damage.html |
| blueprint-Item-System | upgrade.html, flags.html |
| blueprint-Character-System | horse-level.html, flags.html |
| blueprint-Game-Client-Protocol | (none — protocol reference only) |
| blueprint-Login-Flow | (none) |
| blueprint-Quest-System | drop-chance.html |
| blueprint-UI-Python-System | (none) |
| blueprint-Map-World-System | (none) |

Dragon Soul calculator is linked from `topic-Item-System.md` and `guide-Economy.md` (existing pages).

### Tech Stack

- Pure HTML + Vanilla JavaScript (no frameworks, no build pipeline)
- CSS: Dark theme matching GitHub (`#0d1117` background, `#58a6ff` accent)
- All formulas documented as comments in JS, sourced directly from C++
- Each page fully standalone (no shared JS dependencies required for basic function)

### File Structure

```
docs/
  index.html              ← Calculator Hub (overview + links to all tools)
  calculators/
    damage.html
    upgrade.html
    dragon-soul.html
    horse-level.html
    drop-chance.html
    flags.html
  css/
    style.css
  js/
    formulas.js           ← Shared formula functions
```

---

## Part 3: Wiki Navigation Updates

After all pages and calculators are created:

- `_Sidebar.md`: New section `## Blueprints` listing all 8 blueprint pages
- `Home.md`: New section `## System Blueprints` table + link to GitHub Pages calculator hub
- Each blueprint page ends with a `## Related` section linking to its calculator(s) and topic page

---

## Execution Plan

### Phase 1 — Blueprints Batch 1 (direct source reading)
- blueprint-Item-System
- blueprint-Game-Client-Protocol
- blueprint-Character-System
- blueprint-Combat-System

### Phase 2 — Blueprints Batch 2
- blueprint-Quest-System
- blueprint-UI-Python-System
- blueprint-Login-Flow
- blueprint-Map-World-System

### Phase 3 — GitHub Pages (after confirming Pages is activated)
- docs/index.html + css/style.css + js/formulas.js
- All 6 calculator HTML files

### Phase 4 — Navigation
- Update _Sidebar.md + Home.md in wiki-repo
- Push wiki-repo + main branch

---

## Success Criteria

- All 8 blueprint pages live on GitHub Wiki
- All 6 calculators accessible at `https://m2tecdev.github.io/Metin2_Rework_v3/calculators/`
- Every blueprint page contains all 5 template sections with content matching the definitions above
- Blueprint-to-calculator links verified and working
- Wiki sidebar updated with Blueprints section
- LaTeX formulas render in wiki (verified manually after push); fallback links provided where they don't
