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

## Output Location

All new and modified wiki pages are written to:
`wiki/` directory in the main repository (branch `claude/wiki-v2-guides`).

After all agents complete, Phase 4 commits the changes and pushes to the GitHub Wiki git repository (`<repo>.wiki.git`) via the `wiki-repo/` directory.

---

## Deliverables

### 12 New `guide-` Pages

| File | Topic | Primary Source Files |
|------|-------|---------------------|
| `guide-Build-Environment.md` | VS version, CMake setup, dependencies (Boost, CryptoPP, Python, DevIL) | `CMakeLists.txt`, `vcpkg.json`/`conanfile.txt`, compiler flag files |
| `guide-Best-Practices.md` | Coding standards derived from observed patterns, `#ifdef` feature toggles | `UserInterface/PythonNetworkStream.h`, `game/char.h`, `UserInterface/GameType.h`, `Locale_inc.h` — derive conventions from code style; omit any claim that cannot be confirmed |
| `guide-Asset-Pipeline.md` | VFS/Pack system, .dds/.gr2/.tga placement, .mse effects, .sub files | `client-src-PackLib.md`, `client-src-EffectLib.md`, `client-src-EterGrnLib.md` wiki pages |
| `guide-Localization.md` | `locale_game.txt`, `locale_interface.txt`, server-side strings, adding a new language | `client-src-EterLocale.md` wiki, `client-bin/assets/root/locale_*.py` files |
| `guide-Debugging.md` | syserr error table, `sys_log` / `fprintf` usage, gdb/crash-dump guide, client debug console | `server-src-libthecore.md` wiki, `sys_log` call sites in game source |
| `guide-Database-Proto.md` | `item_proto`/`mob_proto` workflow (server SQL ↔ client binary), vnum range recommendations | `server-src-db.md`, `server-src-common.md` wiki pages |
| `guide-Economy.md` | Refine-system (`vnum` ↔ `refine_set`), `cube.txt` recipe format, custom-currency NPC shops | `topic-Item-System.md`, `server-src-game.md` wiki pages |
| `guide-Horse-Mount-Pet.md` | Horse tier progression, mount vnum logic (`ITEM_COSTUME_MOUNT`), `CPetSystem` | `topic-Character-System.md`, `client-src-GameLib-Characters.md` wiki pages |
| `guide-Skill-Buff-System.md` | `skill_proto`, `skill_desc.txt`, `skill_table.txt`, `AddAffect`, cooldowns/mana costs | `topic-Character-System.md`, `topic-Combat-System.md` wiki pages |
| `guide-NPC-and-Spawning.md` | `mob_proto`, `regen.txt`, SpawnGroups, NPC shop setup | `server-src-game.md`, `topic-Map-World-System.md` wiki pages |
| `guide-Adding-a-New-System.md` | End-to-end walkthrough: Python UI → C++ packet → server handler → DB | All Phase 1 guide-* pages + `guide-Best-Practices.md` (must run after those) |
| `guide-Security-AntiCheat.md` | Speed-hack detection, packet validation, ownership checks | `topic-Game-Client-Protocol.md`, `server-src-libthecore.md` wiki pages |

### 6 Extended Topic Pages

> Note: `topic-UI-Python-System.md` is excluded — the v1 agent already implemented the boilerplate window (Section 7), all base-class documentation (Section 3.2), and `onPressKeyDict` event binding. No genuine content gap exists.

| File | New Sections to Add |
|------|---------------------|
| `topic-Game-Client-Protocol.md` | **"How to Add a New Packet" step-by-step**: adding header constant in `packet_headers.h`, registering handler in `RegisterRecvPhase*`, CMake rebuild steps, client `RecvXxx`/`SendXxx` pattern. Must cross-reference existing Sections 2 and 7 rather than repeat wire-format or dispatch content already there. |
| `topic-Quest-System.md` | **Dungeon API deep dive**: expand existing 7-entry `d.*` table into full `d.*`/`dungeon.*` section with usage patterns and worked examples. **Timer decision table**: `server_timer` vs `timer` — add worked example (boss respawn = `server_timer`, player cooldown = `timer`) and decision table (per-character vs server-global vs dungeon-scoped). **Adding a new C++ trigger**: step-by-step guide to registering a new `when` event in C++. |
| `topic-Map-World-System.md` | **Full map file checklist**: client files (`property/`, `textureset/`, map name string) vs server files (`Setting.txt`, `Town.txt`, `regen.txt`) in a side-by-side table. **npc_list & Atlas registration**: how a new map appears on the minimap (M key). **Coordinate ×100 factor**: explicit explanation with example (server coord 100 = client unit 1). |
| `topic-Item-System.md` | **`UseItem()` annotated walkthrough**: `char_item.cpp::UseItem(TItemPos Cell)` — the switch/case flow, how each `ITEM_USE` subtype branches. **Durability and stack size**: where in `item_length.h` and `TItemTable` these are controlled. |
| `topic-Combat-System.md` | **`APPLY_*` vs `POINT_*` distinction**: conceptual explanation that `EApplyTypes` values are item/buff-facing identifiers and `EPoints` values are the character's live stat array indices; the server maps `APPLY_*` onto `POINT_*` at effect-application time (reference `affect.cpp` and `char_point.cpp`). **Damage formula**: expressed as a fenced code block (not LaTeX — GitHub Wiki rendering is unverified); annotate with variable sources. **Hardcap locations**: where in source the percentage caps are defined. |
| `topic-Character-System.md` | **Adding a new synced variable**: step-by-step for CLIENT side (`CInstanceBase` + Python getter) and SERVER side (`CHARACTER` member + `POINT_*` enum or custom field) + the packet that synchronizes it. **Broadcast update mechanism**: how nearby-player updates are triggered (SECTREE view range, `UpdatePacket` / `ViewList` flow). |

### Navigation Updates

- `_Sidebar.md`: add `## Developer Guides` section listing all 12 guide pages alphabetically
- `Home.md`: add "Developer Guides" section with one-line description of each guide
- Missing v1 topic pages (`topic-Guild-System`, `topic-Character-Creation`, `topic-Asset-Packing`, `topic-Python-CPP-Bridge`) are out of scope for v2 and deferred to a future wave.

---

## Generation Strategy

### Phase 1 — Parallel (10 independent agents)

Agents A–J write the first 10 guide pages concurrently. Each agent reads relevant existing wiki pages as primary source, falls back to direct source file reads where needed.

```
Agent A → guide-Build-Environment.md
Agent B → guide-Asset-Pipeline.md
Agent C → guide-Localization.md
Agent D → guide-Debugging.md
Agent E → guide-Database-Proto.md
Agent F → guide-Economy.md
Agent G → guide-Horse-Mount-Pet.md
Agent H → guide-Skill-Buff-System.md
Agent I → guide-Security-AntiCheat.md
Agent J → guide-NPC-and-Spawning.md
```

### Phase 2 — Sequential (2 agents, strict order)

Run in this exact order:

1. **Agent K** → `guide-Best-Practices.md`
   - Reads Phase 1 outputs + source files directly
   - Derives conventions from observed code patterns; omits anything not confirmable

2. **Agent L** → `guide-Adding-a-New-System.md`
   - Reads ALL Phase 1 guide outputs + `guide-Best-Practices.md` from Agent K
   - Synthesizes into end-to-end "add a complete system" walkthrough

### Phase 3 — Parallel (6 agents)

Agents extend 6 existing topic pages. Each agent:
1. Reads the current full page content first
2. For pages **with** a Table of Contents: inserts new sections in the numbered sequence and updates the ToC
3. For pages **without** a ToC: appends new sections before the existing "Key Files" section

```
Agent M → topic-Game-Client-Protocol.md
Agent N → topic-Quest-System.md
Agent O → topic-Map-World-System.md
Agent P → topic-Item-System.md
Agent Q → topic-Combat-System.md
Agent R → topic-Character-System.md
```

### Phase 4 — Sequential

Update `Home.md` and `_Sidebar.md`, then commit all changes to `wiki/`, then copy to `wiki-repo/` and push to GitHub Wiki.

---

## Content Standards

All new guide pages follow this template:

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
- **No LaTeX** (`$$...$$`): GitHub Wiki rendering is unverified. Express formulas as annotated fenced code blocks instead.
- Cross-links: always link to the relevant reference page (e.g. `[topic-Combat-System](topic-Combat-System)`)
- Unverifiable Rework-v3-specific details: mark with `> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.`

---

## Out of Scope

- Generating new source code (guides explain existing code, not add new features)
- Documenting systems that don't exist in this codebase (omit if source evidence is absent)
- Translating existing pages to German (wiki stays English)
- Missing v1 topic pages (Guild System, Character Creation, Asset Packing, Python-CPP Bridge) — deferred to v3
