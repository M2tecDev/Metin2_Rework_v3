# Metin2 Rework v3 — Wiki

Welcome to the complete technical reference for **Metin2 Rework v3**. This wiki covers all three repositories and documents every library, module, and cross-cutting system.

---

## Where do I start?

Choose the path that matches your background. Each path links to pages in the right order.

### Path A — New to Metin2 development
You have little or no experience with game server development and want to understand the project from the ground up before touching code.

→ [Overview & Getting Started](start-overview) → [Requirements](start-requirements) → [Server Setup](start-server-setup) → [Client Setup](start-client-setup) → [Your First Change](start-first-change) → [Daily Workflow](start-workflow)

### Path B — I know programming but am new to Metin2
You are comfortable with C++ or Python and want to understand the Metin2-specific concepts before diving into guides.

→ [Overview & Getting Started](start-overview) → [Architecture](concept-architecture) → [Packets](concept-packets) → [vnum](concept-vnum) → [Proto](concept-proto) → [Adding a New System](guide-Adding-a-New-System)

### Path C — Experienced developer
You understand server/client architecture and want the deep technical reference directly.

→ [Overview & Getting Started](start-overview) → [Blueprint pages](#blueprints-full-stack-architecture) → [Topic Guides](#topic-guides-cross-cutting)

---

## Repositories

| Repo | Description |
|------|-------------|
| **server** | Runtime server files — configs (`share/conf/`), SQL schema (`sql/`), management scripts (`start.py`, `stop.py`, `install.py`), compiled binary destination (`share/bin/`) |
| **server-src** | C++ server source — `game`, `db`, shared libraries |
| **client-src** | C++ client source — all libraries compiled into `Metin2.exe` |
| **client-bin** | Runtime assets — Python scripts (`root/`, `uiscript/`), data files |

---

## Blueprints (Full-Stack Architecture)

Deep-dive reference pages with 5-section structure: Full-Stack Architecture → Causal Chain → Dependency Matrix → Extension How-To → Debug Anchors.

| Blueprint | What it covers |
|-----------|---------------|
| [Protocol Blueprint](blueprint-Game-Client-Protocol) | All CG/GC/GD/DG/GG packet tables, dispatcher architecture, framing |
| [Login Flow Blueprint](blueprint-Login-Flow) | Phase state machine, EPhases transitions, all login/select packets |
| [Character System Blueprint](blueprint-Character-System) | 73 point types, job system, party/guild, lifecycle hooks |
| [Item System Blueprint](blueprint-Item-System) | Item creation, inventory grid, attribute/socket/refine pipeline |
| [Combat System Blueprint](blueprint-Combat-System) | CalcMeleeDamage, hit/crit/penetrate, affect system, PvP modes |
| [Quest System Blueprint](blueprint-Quest-System) | Lua DSL grammar, qc compiler FSM, full 90-function Lua API |
| [UI Python Blueprint](blueprint-UI-Python-System) | CPython bridge, module table, widget hierarchy, execution model |
| [Map & World Blueprint](blueprint-Map-World-System) | SECTREE spatial system, dungeon instancing, warp/portal flow |

---

## Interactive Calculators (GitHub Pages)

Browser-based tools derived directly from the server source code.
➜ **[Open Calculator Hub](https://m2tecdev.github.io/Metin2_Rework_v3/)**

| Calculator | Formula source |
|------------|---------------|
| [Damage Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/damage.html) | `battle.cpp : CalcMeleeDamage()` |
| [Upgrade Probability](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/upgrade.html) | `refine.cpp : CRefineManager::Refine()` |
| [Dragon Soul Refine](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/dragon-soul.html) | `dragon_soul_refine_settings.py` |
| [Horse Feed Planner](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/horse-level.html) | `char_horse.cpp : HORSE_LEVEL_UP_NEED_STAMINA` |
| [Drop Chance](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/drop-chance.html) | `item_manager.cpp : CreateDropItem()` |
| [Item Flag Decoder](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/flags.html) | `length.h` — ANTI/WEAR/RACE/MOB flags |

---

## Developer Guides

How-to guides for building and extending the server and client.

| Page | Description |
|------|-------------|
| [Adding a New System (E2E)](guide-Adding-a-New-System) | Complete walkthrough: UI → packet → server → DB |
| [Build Environment](guide-Build-Environment) | CMake setup for client (MSVC/Win32) and server (GCC/Linux) |
| [Best Practices](guide-Best-Practices) | Rework coding standards derived from the source |
| [Asset Pipeline](guide-Asset-Pipeline) | .pck VFS, .sub icons, .mse effects, bone attachment |
| [Localization](guide-Localization) | locale_game.txt, uiScriptLocale, adding a new language |
| [Debugging](guide-Debugging) | syserr interpretation, sys_log, GDB crash dumps |
| [Database & Proto Workflow](guide-Database-Proto) | item_proto/mob_proto sync, vnum ranges |
| [Security & Anti-Cheat](guide-Security-AntiCheat) | Server-authoritative validation, speed hack, ownership checks |
| [Skill & Buff System](guide-Skill-Buff-System) | skill_proto, AddAffect, cooldowns, mastery tiers |
| [NPC & Spawning](guide-NPC-and-Spawning) | regen.txt, group spawns, NPC shops, coordinate ×100 factor |
| [Horses, Mounts & Pets](guide-Horse-Mount-Pet) | Classic horse, vnum-based mounts, pet system |
| [Economy (Shop, Cube, Refine)](guide-Economy) | Refine proto, cube.txt recipes, custom currency shops |

---

## Topic Guides (Cross-Cutting)

These pages explain how systems work **across all three repos**, tracing data from UI click to database.

| Page | Description |
|------|-------------|
| [Game↔Client Protocol](topic-Game-Client-Protocol) | All TCP packets: CG, GC, GD, DG, GG — format, tables, flows |
| [Login Flow](topic-Login-Flow) | Complete login sequence: Python UI → C++ → game server → DB |
| [Character System](topic-Character-System) | CHARACTER class, point types, classes, party, guild |
| [Item System](topic-Item-System) | Item lifecycle, inventory, attributes, sockets, refine |
| [Combat System](topic-Combat-System) | Damage formulas, skills, affects, PvP/PvE |
| [Quest System](topic-Quest-System) | Lua scripting, qc compiler, quest API (~90 functions) |
| [UI Python System](topic-UI-Python-System) | Python/C++ bridge, widget system, network phases |
| [Map & World System](topic-Map-World-System) | SECTREE, spawns, dungeons, terrain rendering, warps |

---

## Getting Started

New to the project? Start here. These pages require no prior knowledge of Metin2.

| Page | Description |
|------|-------------|
| [Overview & Getting Started](start-overview) | What the project is, the 3 repos, how they relate, and a glossary of key terms |
| [Requirements & Prerequisites](start-requirements) | Software and hardware needed to run the server or build the client |
| [Setting Up the Server](start-server-setup) | Correct startup order (db → game), verification steps, shutdown order |
| [Setting Up the Client](start-client-setup) | Configuring serverinfo.py, packing assets, and connecting to your server |
| [Your First Change](start-first-change) | Three end-to-end examples: spawn an NPC, modify an item, move a UI button |
| [Daily Development Workflow](start-workflow) | Master reference table — what to restart or recompile after every type of change |

---

## Concepts

Plain-language explanations of the core technical concepts. No C++ knowledge required.

| Page | Description |
|------|-------------|
| [How Everything Fits Together](concept-architecture) | The overall architecture: client, game process, db process, MariaDB — and why each exists |
| [What is a Packet?](concept-packets) | How the client and server communicate: the 5 namespaces, wire format, and connection phases |
| [What is a vnum?](concept-vnum) | The ID system: every item, mob, skill, and map has a vnum — why numbers instead of names |
| [What are item_proto and mob_proto?](concept-proto) | The blueprint system and the two-version problem (server SQL vs. client binary) |
| [What is a SECTREE?](concept-sectree) | Spatial partitioning: how the server efficiently tracks which entities are near which |
| [Understanding the Quest System](concept-lua-quests) | From .quest source to runtime: states, triggers, the qc compiler, and the suspend/resume cycle |
| [Why Python for the UI?](concept-python-ui) | How Python controls all UI, the root/uiscript split, C++ module system, and the pack cycle |

---

## Troubleshooting

| Page | Description |
|------|-------------|
| [Fixing Server Errors](troubleshoot-server) | syserr reference for game and db process errors with step-by-step fixes and checklists |
| [Fixing Client Errors](troubleshoot-client) | syserr.txt reference for Python, DirectX, and connection errors; build failure fixes |
| [Fixing Database Problems](troubleshoot-db) | MariaDB connectivity, proto loading failures, character save issues, CRC mismatch fixes |

---

## client-src — C++ Client Libraries

| Page | Description |
|------|-------------|
| [Overview](client-src-Overview) | All libraries, dependency graph, build system |
| [EterBase](client-src-EterBase) | Foundation: file I/O, memory, math, logging |
| [EterLib](client-src-EterLib) | Core engine: rendering, camera, device management |
| [EterGrnLib](client-src-EterGrnLib) | Granny3D animation and model system |
| [EterPythonLib](client-src-EterPythonLib) | Python embedding, C++ widget hierarchy |
| [EterImageLib](client-src-EterImageLib) | Image loading and texture management |
| [EterLocale](client-src-EterLocale) | Localization, string tables, locale config |
| [PackLib](client-src-PackLib) | .eix/.epk encrypted pack file system |
| [ScriptLib](client-src-ScriptLib) | Python script launcher, UI script loader |
| [AudioLib](client-src-AudioLib) | Sound and music playback |
| [EffectLib](client-src-EffectLib) | Particle effects and visual FX |
| [PRTerrainLib](client-src-PRTerrainLib) | Terrain rendering, LOD, texture sets |
| [SpeedTreeLib](client-src-SpeedTreeLib) | Tree and vegetation rendering |
| [SphereLib](client-src-SphereLib) | Collision sphere system |
| [GameLib](client-src-GameLib) | Core game logic: entities, skills, items, combat |
| [GameLib — Characters](client-src-GameLib-Characters) | CInstanceBase, actor state, animation |
| [GameLib — Combat](client-src-GameLib-Combat) | Client-side combat: hit detection, FX |
| [GameLib — Items](client-src-GameLib-Items) | Client item data, inventory grid |
| [GameLib — Map](client-src-GameLib-Map) | MapManager, outdoor/indoor map, background |
| [PythonModules](client-src-PythonModules) | All C extension modules exposed to Python |
| [UserInterface](client-src-UserInterface) | Main executable: app loop, phase management |
| [UserInterface — NetworkStream](client-src-UserInterface-NetworkStream) | CPythonNetworkStream: packet send/recv, phases |

---

## client-bin — Runtime Python Scripts

| Page | Description |
|------|-------------|
| [Overview](client-bin-Overview) | Directory structure, pack files, loading order |
| [root — Framework](client-bin-root-framework) | `app.py`, `ui.py`, `uicommon.py` — base widget system |
| [root — Network](client-bin-root-network) | `networkmodule.py`, `serverinfo.py` — connection and phases |
| [root — Login](client-bin-root-login) | `intrologin.py`, `logininfo.py` — login/select UI |
| [root — UI Core](client-bin-root-ui-core) | Chat, inventory, minimap, quest windows |
| [root — UI Extended](client-bin-root-ui-extended) | Shop, exchange, guild, party, dungeon windows |
| [root — Config](client-bin-root-config) | `config.py`, `systemsetting.py` — client options |
| [root — Settings](client-bin-root-settings) | Key bindings, interface settings |
| [root — Misc](client-bin-root-misc) | Utility scripts, locale helpers |
| [uiscript](client-bin-uiscript) | All 80 UI layout files — window definitions |
| [Data Files](client-bin-data-files) | Locale tables, item/mob proto, map data |

---

## server-src — C++ Server Libraries

| Page | Description |
|------|-------------|
| [Overview](server-src-Overview) | Multi-process architecture, build system |
| [common](server-src-common) | Shared headers: packet defs, enums, table structs |
| [libthecore](server-src-libthecore) | Event loop, pulse system, socket I/O, ring buffer |
| [libpoly](server-src-libpoly) | Expression parser/evaluator for skill/quest formulas |
| [libsql](server-src-libsql) | Async MariaDB client, prepared statements |
| [liblua](server-src-liblua) | Embedded Lua 5.0.3 interpreter |
| [libgame](server-src-libgame) | Map attributes, inventory grid, TGA loader |
| [qc](server-src-qc) | Quest script compiler (.quest → bytecode) |
| [db](server-src-db) | DB process: account/char/item persistence, login cache |
| [game](server-src-game) | Game process: CHARACTER, ITEM, battle, quests, world |
