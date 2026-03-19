# Wiki v2 — Developer Guides Design Spec

**Date:** 2026-03-19
**Branch:** claude/wiki-v2-guides
**Author:** User + Claude Sonnet 4.6

---

## Overview

Extend the existing 53-page Metin2 Rework v3 wiki with a second wave of content:
**Developer Guides** — "How do I do X?" style pages, as opposed to the existing reference documentation ("What does X do?").

The project is Metin2 Rework v3: vanilla Metin2 source base with modernized build system (CMake), updated libraries, performance improvements, and cleaner code — but no fundamentally new systems or custom protocols.

---

## Goals

- Every developer should be able to add a complete feature (packet, item, quest, UI window) by following a guide — without reading 10 different source files first.
- Guides must be accurate: if source-derived information is not available, omit rather than guess.
- Guides must be Rework-v3-specific where applicable (CMake paths, updated library versions, coding patterns).

---

## Deliverables

### 12 New `guide-` Pages

| File | Topic | Source |
|------|-------|--------|
| `guide-Build-Environment.md` | VS version, CMake, dependencies (Boost, CryptoPP, Python, DevIL) | CMakeLists.txt, vcpkg/conan files |
| `guide-Best-Practices.md` | Coding standards, feature toggles, Service.h pattern | Derived from source; omit if not derivable |
| `guide-Asset-Pipeline.md` | VFS/Pack system, .dds/.gr2/.tga placement, .mse effects, .sub files | EterPack, PackLib, EffectLib wiki |
| `guide-Localization.md` | locale_game.txt, locale_interface.txt, server-side strings, adding new language | EterLocale wiki, client-bin locale files |
| `guide-Debugging.md` | syserr table, sys_log usage, gdb/crash dump guide, debug modes | libthecore, sys_log call sites |
| `guide-Database-Proto.md` | item_proto/mob_proto workflow, vnum ranges, client↔server proto sync | server-src-db wiki, server-src-common wiki |
| `guide-Economy.md` | Refine-system (vnum↔refine_set), cube.txt recipes, custom-currency shops | topic-Item-System wiki, server-src-game wiki |
| `guide-Horse-Mount-Pet.md` | Horse tiers, mount vnum logic (ITEM_COSTUME_MOUNT), CPetSystem | topic-Character-System wiki, GameLib-Characters wiki |
| `guide-Skill-Buff-System.md` | skill_proto, skill_desc.txt, skill_table.txt, AddAffect, cooldowns/mana | topic-Character-System, topic-Combat-System wiki |
| `guide-Adding-a-New-System.md` | End-to-end walkthrough: Python UI → C++ packet → server handler → DB | All guide-* pages as input |
| `guide-NPC-and-Spawning.md` | mob_proto, regen.txt, SpawnGroups, NPC shop setup | server-src-game wiki, topic-Map-World-System wiki |
| `guide-Security-AntiCheat.md` | Speed-hack detection, packet validation, ownership checks | topic-Game-Client-Protocol wiki, libthecore wiki |

### 7 Extended Topic Pages

| File | New Sections Added |
|------|--------------------|
| `topic-UI-Python-System.md` | Boilerplate empty window, all `ui.py` base classes with use-cases, `onPressKeyDict` event binding |
| `topic-Game-Client-Protocol.md` | Step-by-step "How to Add a New Packet" (both sides), Rework-specific CMake build integration |
| `topic-Quest-System.md` | Dungeon library deep dive (`d.*` API), `server_timer` vs `timer` comparison, adding a new C++ trigger |
| `topic-Map-World-System.md` | Full client+server map file checklist, npc_list/atlas registration, coordinate ×100 factor explained |
| `topic-Item-System.md` | `UseItem()` annotated walkthrough, `char_item.cpp` structure, durability and stack size settings |
| `topic-Combat-System.md` | `APPLY_*` vs `POINT_*` distinction, damage formula with LaTeX, hardcap locations in source |
| `topic-Character-System.md` | How to add a new synced variable (CLIENT + SERVER steps), broadcast update mechanism |

### Navigation Updates

- `_Sidebar.md`: new `## Developer Guides` section listing all 12 guide pages
- `Home.md`: add "Developer Guides" section with brief description

---

## Generation Strategy

### Phase 1 — Parallel (9 independent agents)
Agents A–I write the first 9 guide pages concurrently. Each agent reads relevant existing wiki pages as primary source, falls back to direct source file reads where needed.

### Phase 2 — Sequential (3 agents, depend on Phase 1)
- `guide-Best-Practices.md` — reads Phase 1 output + source code directly
- `guide-Adding-a-New-System.md` — synthesizes all Phase 1 guides into end-to-end walkthrough
- `guide-NPC-and-Spawning.md` — reads server-src-game wiki + map wiki

### Phase 3 — Parallel (7 agents)
Agents extend the 7 existing topic pages. Each agent reads the current page content first, then appends new sections.

### Phase 4 — Sequential
Update `Home.md` and `_Sidebar.md`, commit all changes, push to GitHub wiki repo.

---

## Content Standards

All guide pages follow this template:

```markdown
# Guide: <Title>

> One-line summary of what this guide teaches.

## Prerequisites
- What the reader should already know

## Overview
Brief description of the system being worked with.

## Step-by-Step
Numbered steps with code snippets.

## Common Mistakes
Table of frequent errors and fixes.

## Key Files
Table: file path | repo | role
```

- Code snippets: use fenced blocks with language identifier (`cpp`, `python`, `lua`, `sql`)
- Math formulas: use GitHub-compatible LaTeX (`$$formula$$`)
- Cross-links: always link to the relevant reference page (e.g. `[topic-Combat-System](topic-Combat-System)`)
- "Best guess" content: if a specific Rework-v3 detail cannot be confirmed from source, mark with `> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.`

---

## Out of Scope

- Generating new source code (guides explain existing code, not add new features)
- Documenting systems that don't exist in this codebase (e.g. if no Pet system exists, omit CPetSystem)
- Translating existing pages to German (wiki stays English per earlier decision)
