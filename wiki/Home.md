# Metin2 Rework v3 — Wiki

Welcome to the complete technical reference for **Metin2 Rework v3**. This wiki covers all three repositories and documents every library, module, and cross-cutting system.

## Repositories

| Repo | Description |
|------|-------------|
| **client-src** | C++ client source — all libraries compiled into `metin2client.exe` |
| **client-bin** | Runtime assets — Python scripts (`root/`, `uiscript/`), data files |
| **server-src** | C++ server source — `game`, `db`, shared libraries |

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
