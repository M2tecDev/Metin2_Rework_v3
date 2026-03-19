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

## Part 1: Blueprint Pages

### Format

Each `blueprint-<system>.md` file follows this exact template:

```
## 1. Full-Stack Architecture   (5 layers: DB/Proto → Server C++ → Network → Client C++ → Python)
## 2. Causal Chain              (Trigger → A → B → C → End, with file:function at each step)
## 3. Dependency Matrix         (sync points + hardcoded limits with warnings)
## 4. Extension How-To          (step-by-step for adding new values/slots/types)
## 5. Debug Anchors             (symptom → cause → where to look table)
```

### Pages to Create (8)

| File | Based on |
|------|----------|
| `blueprint-Item-System.md` | topic-Item-System.md |
| `blueprint-Game-Client-Protocol.md` | topic-Game-Client-Protocol.md |
| `blueprint-Character-System.md` | topic-Character-System.md |
| `blueprint-Combat-System.md` | topic-Combat-System.md |
| `blueprint-Login-Flow.md` | topic-Login-Flow.md |
| `blueprint-Quest-System.md` | topic-Quest-System.md |
| `blueprint-UI-Python-System.md` | topic-UI-Python-System.md |
| `blueprint-Map-World-System.md` | topic-Map-World-System.md |

### LaTeX Usage

Formulas are embedded in blueprint pages using GitHub-flavored math blocks:
- Block: `$$formula$$`
- Inline: `$formula$`

Used where interactivity is not needed (flag bitmasks, EXP formulas, simple ratios).

---

## Part 2: GitHub Pages Calculators

### Hosting

- Branch: `main`
- Folder: `/docs`
- URL: `https://m2tecdev.github.io/Metin2_Rework_v3/`
- Activated via: Settings → Pages → Branch: main, Folder: /docs

### Calculator Specifications

| File | Inputs | Output | Source |
|------|--------|--------|--------|
| `docs/calculators/damage.html` | ATT_GRADE, ATT_MIN/MAX, DEF_GRADE, level diff, AttBonus%, Crit% | Expected/Min/Max damage | `battle.cpp` CalcMeleeDamage |
| `docs/calculators/upgrade.html` | Item grade, refine_set ID, material costs, attempts | Success %, total cost, cost-per-success | `refine_proto` |
| `docs/calculators/dragon-soul.html` | DS type (11–16), grade, step, strength | Material count, yang cost, path | `dragon_soul_refine_settings.py` |
| `docs/calculators/horse-level.html` | Current level, feed items, target level | Items needed, total cost | horse level table |
| `docs/calculators/drop-chance.html` | mob_rank, droprate, level diff, premium% | Actual drop probability | drop formula |
| `docs/calculators/flags.html` | Checkboxes for all ANTI_FLAG / WEAR_FLAG / RACE_FLAG bits | Decimal + Hex bitmask | `length.h` |

### Tech Stack

- Pure HTML + Vanilla JavaScript (no frameworks, no build pipeline)
- CSS: Dark theme matching GitHub
- All formulas documented as comments in JS, sourced directly from C++ source
- Each page fully standalone

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
    formulas.js           ← Shared formula functions (damage, drop, etc.)
```

---

## Part 3: Wiki Navigation Updates

After all pages are created:

- `_Sidebar.md`: New section `## Blueprints` with links to all 8 blueprint pages
- `Home.md`: New section `## System Blueprints` table + link to GitHub Pages calculator hub
- Each blueprint page links to its corresponding calculator where applicable

---

## Execution Plan

### Phase 1 — Blueprints (Batch 1, direct source reading)
- blueprint-Item-System
- blueprint-Game-Client-Protocol
- blueprint-Character-System
- blueprint-Combat-System

### Phase 2 — Blueprints (Batch 2)
- blueprint-Quest-System
- blueprint-UI-Python-System
- blueprint-Login-Flow
- blueprint-Map-World-System

### Phase 3 — GitHub Pages
- docs/index.html + css/style.css + js/formulas.js
- All 6 calculator HTML files

### Phase 4 — Navigation
- Update _Sidebar.md + Home.md
- Push wiki + main branch

---

## Success Criteria

- All 8 blueprint pages live on GitHub Wiki
- All 6 calculators accessible at `https://m2tecdev.github.io/Metin2_Rework_v3/calculators/`
- Every blueprint page has: causal chain with file:function references, dependency matrix with hardcoded limit warnings, extension how-to steps, debug anchor table
- LaTeX formulas render correctly on GitHub
- Wiki sidebar updated with Blueprint section
