# Metin2 Rework v3 — Wiki Design Spec

**Date:** 2026-03-18
**Author:** Brainstorming session
**Status:** Approved

---

## Goal

Create a comprehensive, fully-detailed GitHub Wiki for the Metin2 Rework v3 project covering all three submodule repositories. The wiki must document every function, class, and module, and show cross-cutting thematic flows (e.g., Game↔Client communication, login flow, item system). The primary purpose is to enable efficient future development and serve as a reference when working with Claude.

---

## Decisions

| Question | Decision |
|----------|----------|
| Where does the wiki live? | GitHub Wiki of the main repository |
| Documentation depth | Maximum — every function, parameters, return values, relationships |
| Language | English |
| Priority areas | All areas equally: client-src, client-bin, server-src |
| Navigation structure | Repo-based reference pages + thematic cross-reference pages |
| Generation approach | Static agent-generated wiki (Approach A) |

---

## Wiki Structure

The wiki will be stored as Markdown files in a `wiki/` directory at the root of the main repo, then pushed to the GitHub Wiki's git repository.

### Navigation

- `Home.md` — Entry point with overview and links to all sections
- `_Sidebar.md` — Always-visible navigation sidebar

### Repo Reference Pages

One page per library/module. Each page documents all classes and methods in full detail.

#### client-src/
| Page | Contents |
|------|----------|
| `client-src-Overview.md` | Architecture, build system, dependencies, output binaries |
| `client-src-EterLib.md` | Core graphics engine (DirectX 9, D3D pipeline, rendering) |
| `client-src-EterGrnLib.md` | Granny2 3D model and animation system |
| `client-src-EterPythonLib.md` | Embedded Python 3.x runtime |
| `client-src-GameLib.md` | Core game logic (characters, skills, items, combat) |
| `client-src-PythonModules.md` | Python C extension modules (C↔Python bridge) |
| `client-src-PRTerrainLib.md` | Terrain rendering and height-map system |
| `client-src-EffectLib.md` | Particle effects and visual effects engine |
| `client-src-AudioLib.md` | Sound and music playback (BGM) |
| `client-src-PackLib.md` | Asset pack reading (encrypted/compressed archives) |
| `client-src-EterBase.md` | Low-level utilities (CRC, cipher, AES, math) |
| `client-src-EterLocale.md` | Localization and character encoding |
| `client-src-EterImageLib.md` | Image loading and texture management |
| `client-src-ScriptLib.md` | Script parsing and loading |
| `client-src-SphereLib.md` | Spherical collision/spatial structures |
| `client-src-SpeedTreeLib.md` | Vegetation and tree rendering |
| `client-src-UserInterface.md` | Network streams and packet handlers |
| `client-src-Discord.md` | Discord Rich Presence integration |
| `client-src-DumpProto.md` | Tool: binary protocol file compiler |
| `client-src-PackMaker.md` | Tool: asset pack file creator |

#### client-bin/
| Page | Contents |
|------|----------|
| `client-bin-Overview.md` | Directory structure, asset packing, configuration |
| `client-bin-root-ui.md` | `ui.py`, `game.py`, `interfacemodule.py` — UI framework and main game loop |
| `client-bin-root-network.md` | `networkmodule.py`, `serverinfo.py` — connection and phase management |
| `client-bin-root-login.md` | `intrologin.py`, `introselect.py`, `introcreate.py`, `introempire.py`, `introloading.py` |
| `client-bin-root-ui-windows.md` | `uiChat.py`, `uiCharacter.py`, `uiInventory.py`, `uiGuild.py`, `uiQuest.py`, `uiParty.py`, `uiMessenger.py`, `uiShop.py`, `uiSafeBox.py`, `uiTooltip.py` |
| `client-bin-root-config.md` | `localeInfo.py`, `constInfo.py`, `colorinfo.py`, `serverinfo.py`, `musicinfo.py` |
| `client-bin-root-misc.md` | `consolemodule.py`, `mousemodule.py`, `system.py`, `emotion.py`, `playersettingmodule.py` |
| `client-bin-uiscript.md` | All 83 UI window definition scripts in `uiscript/uiscript/` |

#### server-src/
| Page | Contents |
|------|----------|
| `server-src-Overview.md` | Multi-process architecture, build system, platform support |
| `server-src-game.md` | Main game server process — gameplay, combat, items, quests |
| `server-src-db.md` | Database server process — MariaDB persistence layer |
| `server-src-qc.md` | Quality control/monitoring server process |
| `server-src-libthecore.md` | Core library: threading, event loop, async I/O, networking |
| `server-src-libpoly.md` | Network protocol layer: CG/GC/GG packet marshalling |
| `server-src-libgame.md` | Shared game logic: items, skills, formulas, calculations |
| `server-src-liblua.md` | Embedded Lua 5.x scripting engine |
| `server-src-libsql.md` | MariaDB SQL abstraction and connection management |
| `server-src-common.md` | Shared constants, enums, packet definitions |

### Thematic Cross-Reference Pages

These pages show end-to-end flows across all repos, with file references and packet traces.

| Page | Description |
|------|-------------|
| `topic-Game-Client-Protocol.md` | All CG/GC/GD/DG packet types, formats, ranges, and usage |
| `topic-Login-Flow.md` | Python UI → CG Packets → Server → DB → GC Response |
| `topic-Character-Creation.md` | UI → Packet → Server → DB storage |
| `topic-Item-System.md` | From Python inventory UI to DB entry |
| `topic-Combat-System.md` | Attack packets, damage calculation, death and revive |
| `topic-Guild-System.md` | Guild creation, management, building, marks |
| `topic-Quest-System.md` | Lua scripts, quest log UI, packet flow |
| `topic-Asset-Packing.md` | pack.py → PackMaker → PackLib → runtime loading |
| `topic-Python-CPP-Bridge.md` | How EterPythonLib and PythonModules expose C++ to Python |

---

## Content Format

### Repo Reference Pages

Each page follows this template:

```markdown
# <Module Name>

> <One-line purpose statement>

## Overview
<2-3 sentences: what this module does, why it exists, how it fits into the larger system>

## Dependencies
- <Other module> — <why it's needed>

## Files
| File | Purpose |
|------|---------|
| `path/to/file.cpp` | <description> |

## Classes / Functions

### <ClassName>
**File:** `path/to/file.h`
**Purpose:** <what this class represents or does>

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_varName` | `int` | <what it stores> |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `MethodName(...)` | `type param` — description | `type` | <what it does> |
```

### Thematic Cross-Reference Pages

Each topic page follows this template:

```markdown
# <Topic Name>

## Overview
<What this flow/system does and why it matters>

## Flow
1. **<Layer>** `file.py::FunctionName()` — <what happens>
2. **<Packet>** `0xXXXX NAME` — <what it carries>
3. **<Layer>** `file.cpp::HandlerName()` — <what happens on the other side>
...

## Key Files
| File | Repo | Role |
|------|------|------|
| `path/to/file` | client-bin | <role in this flow> |

## Packet Reference
| Packet | Direction | Payload | Trigger |
|--------|-----------|---------|---------|
| `CG_LOGIN3 (0x0102)` | Client → Game | username, password hash | Player clicks Login |
```

---

## Generation Plan

### Phase 1 — Parallel (independent)
Four subagents run simultaneously, each reading all files in their assigned area and generating all reference pages:

- **Agent A** → all `client-src/` library pages
- **Agent B** → all `client-bin/assets/root/*.py` pages
- **Agent C** → all `client-bin/assets/uiscript/**/*.py` pages
- **Agent D** → all `server-src/` library pages

### Phase 2 — Thematic Pages (after Phase 1)
Topic pages are generated after Phase 1 completes, since they cross-reference content from multiple repos. These can also run in parallel with each other.

### Phase 3 — Navigation
Generate `Home.md` and `_Sidebar.md` linking to all pages produced in Phases 1 and 2.

### Output
All generated `.md` files are written to `wiki/` at the repo root. From there, they can be pushed to the GitHub Wiki's git repository (`<repo>.wiki.git`).

**Estimated page count:** 40–60 pages

---

## Success Criteria

- Every C++ class in all three repos has its own entry with all methods documented
- Every Python file in `client-bin/assets/root/` is documented function by function
- Every Python file in `client-bin/assets/uiscript/` is documented
- All CG/GC/GD/DG packet types are listed and explained
- At least 9 thematic topic pages covering the major cross-cutting flows
- `Home.md` and `_Sidebar.md` provide complete navigation
- Claude can answer questions about any part of the codebase by referencing the wiki
