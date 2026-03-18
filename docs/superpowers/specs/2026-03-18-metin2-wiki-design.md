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

## Repository Structure

**Repository root (absolute path):** `D:/Git Repo/Metin2_Rework_v3/`

The main repository at `Metin2_Rework_v3/` contains three git submodules:

| Submodule path | Language | Purpose |
|----------------|----------|---------|
| `client-src/` | C++20 | Game client — rendering, game logic, Python bridge, networking |
| `client-bin/` | Python + assets | Client distribution — UI scripts, assets, configuration |
| `server-src/` | C++20 | Game server — multi-process architecture (game, db, qc) |

---

## Wiki Structure

The wiki will be stored as Markdown files in a `wiki/` directory at the root of the main repo (`Metin2_Rework_v3/wiki/`). After generation, these files are pushed to the GitHub Wiki's separate git repository (`<repo>.wiki.git`).

### Navigation

- `Home.md` — Entry point with project overview and links to all sections
- `_Sidebar.md` — Always-visible navigation sidebar

### Repo Reference Pages

One page per library/module, containing full class and method documentation.

#### client-src/

Source libraries are under `client-src/src/`. Each subdirectory is one library.

| Page | Library path | Contents |
|------|-------------|----------|
| `client-src-Overview.md` | `client-src/` | Architecture, build system (CMake/MSVC), output binaries, dependencies |
| `client-src-EterLib.md` | `src/EterLib/` | Core graphics engine — DirectX 9, D3D pipeline, scene graph, rendering |
| `client-src-EterGrnLib.md` | `src/EterGrnLib/` | Granny2 3D model and animation system |
| `client-src-EterPythonLib.md` | `src/EterPythonLib/` | Embedded Python 3.x runtime — Python interpreter lifecycle, script loading |
| `client-src-GameLib.md` | `src/GameLib/` | Core game logic — characters, skills, items, combat; split into sub-sections if needed |
| `client-src-PythonModules.md` | `src/PythonModules/` | Python C extension modules — C++↔Python bridge, all exported functions |
| `client-src-PRTerrainLib.md` | `src/PRTerrainLib/` | Terrain rendering and height-map system |
| `client-src-EffectLib.md` | `src/EffectLib/` | Particle effects and visual effects engine |
| `client-src-AudioLib.md` | `src/AudioLib/` | Sound and music playback (BGM) |
| `client-src-PackLib.md` | `src/PackLib/` | Asset pack reading — encrypted/compressed archive format |
| `client-src-EterBase.md` | `src/EterBase/` | Low-level utilities — CRC, cipher, AES, math, string utilities |
| `client-src-EterLocale.md` | `src/EterLocale/` | Localization and character encoding support |
| `client-src-EterImageLib.md` | `src/EterImageLib/` | Image loading and texture management |
| `client-src-ScriptLib.md` | `src/ScriptLib/` | Script parsing and loading |
| `client-src-SphereLib.md` | `src/SphereLib/` | Spherical collision and spatial data structures |
| `client-src-SpeedTreeLib.md` | `src/SpeedTreeLib/` | Vegetation and tree rendering |
| `client-src-UserInterface.md` | `src/UserInterface/` | Main client executable — application entry point, Python network stream (`PythonNetworkStream*.cpp`), all phase packet handlers (Login, Select, Game, HandShake, Loading), account connector, network actor manager |
| `client-src-Discord.md` | `src/Discord/` | Discord Rich Presence integration |
| `client-src-DumpProto.md` | `src/DumpProto/` | Standalone tool — binary protocol file compiler |
| `client-src-PackMaker.md` | `src/PackMaker/` | Standalone tool — asset pack file creator |

**Note on page size:** If a library has more than ~20 source files, split into sub-pages. The parent page serves as an index.
- `GameLib` example: `client-src-GameLib.md` (index), `client-src-GameLib-Characters.md`, `client-src-GameLib-Combat.md`, `client-src-GameLib-Items.md`, `client-src-GameLib-Skills.md`
- `UserInterface` example (142 source files): `client-src-UserInterface.md` (index), `client-src-UserInterface-NetworkStream.md`, `client-src-UserInterface-PhaseLogin.md`, `client-src-UserInterface-PhaseGame.md`, `client-src-UserInterface-PhaseSelect.md`, `client-src-UserInterface-Connector.md`

#### client-bin/

All Python scripts and assets are under `client-bin/`. The key source directories are `client-bin/assets/root/` (74 Python files) and `client-bin/assets/uiscript/uiscript/` (80 Python files).

**File discovery:** Each agent recursively lists `client-bin/assets/root/` and `client-bin/assets/uiscript/uiscript/`, then reads every `.py` file found.

| Page | Path | Contents |
|------|------|----------|
| `client-bin-Overview.md` | `client-bin/` | Directory structure, asset packing workflow, configuration overview; includes `assets/pack.py` documentation |
| `client-bin-root-framework.md` | `assets/root/` | `ui.py` (UI framework, 3716 lines), `game.py` (main game loop, 2232 lines), `interfacemodule.py` (UI state management) |
| `client-bin-root-network.md` | `assets/root/` | `networkmodule.py` (connection and phase management), `serverinfo.py` (server IP/port config) |
| `client-bin-root-login.md` | `assets/root/` | `intrologin.py`, `introselect.py`, `introcreate.py`, `introempire.py`, `introloading.py` |
| `client-bin-root-ui-core.md` | `assets/root/` | `uichat.py`, `uicharacter.py`, `uiinventory.py`, `uiguild.py`, `uiquest.py`, `uiparty.py`, `uimessenger.py`, `uishop.py`, `uisafebox.py`, `uitooltip.py` |
| `client-bin-root-ui-extended.md` | `assets/root/` | `uiaffectshower.py`, `uiattachmetin.py`, `uiauction.py`, `uicandidate.py`, `uicommon.py`, `uicube.py`, `uidragonsoul.py`, `uiequipmentdialog.py`, `uiex.py`, `uiexchange.py`, `uigamebutton.py`, `uigameoption.py`, `uihelp.py`, `uilocalerefresh.py`, `uilocaleselector.py`, `uimapnameshower.py`, `uiminimap.py`, `uioption.py`, `uiphasecurtain.py`, `uipickmoney.py`, `uiplayergauge.py`, `uipointreset.py`, `uiprivateshopbuilder.py`, `uirefine.py`, `uirestart.py`, `uiscriptlocale.py`, `uiselectitem.py`, `uiselectmusic.py`, `uisystem.py`, `uisystemoption.py`, `uitarget.py`, `uitaskbar.py`, `uitip.py`, `uiuploadmark.py`, `uiweb.py`, `uiwhisper.py` |
| `client-bin-root-config.md` | `assets/root/` | `localeInfo.py`, `constInfo.py`, `colorinfo.py`, `musicinfo.py`, `dragon_soul_refine_settings.py` |
| `client-bin-root-settings.md` | `assets/root/` | `playersettingmodule.py`, `mousemodule.py`, `consolemodule.py`, `system.py`, `emotion.py` |
| `client-bin-root-misc.md` | `assets/root/` | `debuginfo.py`, `exception.py`, `prototype.py`, `rootlibcythonizer.py`, `servercommandparser.py`, `stringcommander.py`, `test_affect.py`, `utils.py` — and any other `.py` files not assigned above |
| `client-bin-uiscript.md` | `assets/uiscript/uiscript/` | All 80 UI window definition scripts — layout, buttons, interaction logic per window |
| `client-bin-data-files.md` | `assets/root/` | Non-Python data files: `atlasinfo.txt`, `grpblk.txt`, `npclist.txt`, `makepackscript_onlyrootnopython.txt`; MSM files (`msm/*.msm`) — motion/animation state machine definitions for the 8 character archetypes |

#### server-src/

Source libraries and processes are under `server-src/src/`. Each subdirectory is one library or process.

**File discovery:** Each agent recursively lists its assigned `src/` subtree, then reads every `.h` and `.cpp` file found.

| Page | Library path | Contents |
|------|-------------|----------|
| `server-src-Overview.md` | `server-src/` | Multi-process architecture (game+db+qc), build system (CMake/FreeBSD primary), platform support |
| `server-src-game.md` | `src/game/` | Main game server process — all gameplay subsystems (combat, items, quests, NPCs, movement); split into sub-pages if needed |
| `server-src-db.md` | `src/db/` | Database server process — MariaDB persistence, query handlers, account/character/item storage |
| `server-src-qc.md` | `src/qc/` | Quest-script compiler/checker tool — parses Lua quest files using `liblua`'s lexer and outputs compiled quest chunks. **This is a standalone tool, not a server process.** |
| `server-src-libthecore.md` | `src/libthecore/` | Core library — threading, event loop, async I/O, networking foundation |
| `server-src-libpoly.md` | `src/libpoly/` | Polynomial/formula expression evaluator — parses and evaluates skill formulas and damage calculation expressions (`Poly.cpp`, `SymTable.cpp`, `Symbol.cpp`, `Base.cpp`) |
| `server-src-libgame.md` | `src/libgame/` | Shared game logic — item definitions, skill data, formulas, balance calculations shared by game and db processes |
| `server-src-liblua.md` | `src/liblua/` | Embedded Lua 5.x scripting engine — quest scripts, server-side event scripting |
| `server-src-libsql.md` | `src/libsql/` | MariaDB SQL abstraction — connection management, query helpers, result parsing |
| `server-src-common.md` | `src/common/` | Shared headers-only directory — packet type definitions (`packet_headers.h`), table structs, constants and enums shared across all server processes. **This is not an executable process.** |

**Note on page size:** Same rule as client-src: if a process directory has more than ~20 source files, split into sub-pages.
- `game/` example (268 source files): `server-src-game.md` (index), `server-src-game-Character.md`, `server-src-game-Combat.md`, `server-src-game-Item.md`, `server-src-game-Quest.md`, `server-src-game-Network.md`, `server-src-game-Skill.md`, `server-src-game-Guild.md`
- `db/` example: `server-src-db.md` (index), `server-src-db-Account.md`, `server-src-db-Character.md`, `server-src-db-Item.md` if needed

### Thematic Cross-Reference Pages

These pages document end-to-end flows across all repos, with explicit file references and packet traces.

| Page | Description |
|------|-------------|
| `topic-Game-Client-Protocol.md` | All CG/GC/GD/DG packet types, format (header+length framing), ranges, payload structures, and usage examples |
| `topic-Login-Flow.md` | Full flow: Python UI → CG Packets → Server → DB → GC Response |
| `topic-Character-Creation.md` | UI interaction → CG packet → server validation → DB storage |
| `topic-Item-System.md` | From Python inventory UI to DB persistence |
| `topic-Combat-System.md` | Attack packets, server-side damage calculation (libgame/libpoly), death and revive flow |
| `topic-Guild-System.md` | Guild creation, management, building construction, guild marks |
| `topic-Quest-System.md` | Lua quest scripts, quest log UI, packet flow |
| `topic-Asset-Packing.md` | `pack.py` → `PackMaker.exe` → `.pack` archives → `PackLib` runtime loading |
| `topic-Python-CPP-Bridge.md` | How `EterPythonLib` embeds Python, how `PythonModules` exports C++ functionality to Python scripts |

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

### Phase 0 — Setup

Before any agents start, create the output directory if it does not exist:
```
mkdir -p "D:/Git Repo/Metin2_Rework_v3/wiki/"
```

### Phase 1 — Parallel (independent agents)

Four subagents run simultaneously. Each agent:
1. Performs a recursive directory listing of its assigned source subtree
2. Reads every `.h`, `.cpp`, and `.py` file found (Agent B also reads `.txt` and `.msm` files)
3. Writes the assigned wiki pages to `D:/Git Repo/Metin2_Rework_v3/wiki/`

**Parallel-write safety:** Each agent writes to a distinct set of page filenames — no two agents write the same file. No coordination layer is needed.

| Agent | Assigned source area | Output pages |
|-------|---------------------|--------------|
| **Agent A** | `client-src/src/*` (all libraries) | All `client-src-*.md` pages |
| **Agent B** | `client-bin/assets/root/` (all `.py`, `.txt`, `msm/*.msm` files) | `client-bin-root-*.md` pages + `client-bin-Overview.md` + `client-bin-data-files.md` |
| **Agent C** | `client-bin/assets/uiscript/uiscript/*.py` | `client-bin-uiscript.md` |
| **Agent D** | `server-src/src/*` (all libraries) | All `server-src-*.md` pages |

### Phase 2 — Thematic Pages (after Phase 1 completes)

Thematic topic pages cross-reference content from multiple repos. They run after Phase 1, but can run in parallel with each other. Each agent reads the relevant source files directly (not the Phase 1 output) to write accurate flow documentation.

Produces: all `topic-*.md` pages.

### Phase 3 — Navigation

After all content pages exist, generate:
- `Home.md` — full index with links to all pages, organized by section
- `_Sidebar.md` — compact sidebar for GitHub Wiki navigation

### Output Location

All generated `.md` files are written to `Metin2_Rework_v3/wiki/` (top-level of the main repo, not inside any submodule). After generation, push the contents of `wiki/` to the GitHub Wiki's git repository.

**Estimated page count:** ~45–60 pages

---

## Success Criteria

- Every C++ class in all three repos has its own entry with all methods documented (signature, parameters, return type, description)
- Every Python file in `client-bin/assets/root/` (all 74 files) is documented function by function
- Every Python file in `client-bin/assets/uiscript/uiscript/` (all 80 files) is documented
- All CG/GC/GD/DG packet types defined in `server-src/src/common/packet_headers.h` are listed and explained in `topic-Game-Client-Protocol.md`
- At least 9 thematic topic pages covering the major cross-cutting flows
- `client-bin/assets/pack.py` is documented in `client-bin-Overview.md`
- `libpoly` is correctly documented as a formula expression evaluator (not a network layer)
- `server-src/src/common/` is documented as a shared headers directory (not a server process)
- Data files in `assets/root/` (`.txt`, `.msm`) are covered in `client-bin-data-files.md`
- `Home.md` and `_Sidebar.md` provide complete, accurate navigation
- Claude can answer questions about any part of the codebase by referencing the wiki
