# Wiki Audit Report

> **Scope:** Exhaustive cross-check of all 89 `.md` files in `wiki/` against four repository inventories: server-src C++ source, client-src C++ source, client-bin Python/assets, and server conf/SQL/quests.
> **Date:** 2026-03-20
> **Branch:** `claude/musing-mclaren`
> **Method:** Every wiki page was read in full; all factual claims were verified against the provided inventories and the wiki's own source-of-truth pages (server-src-common.md, server-src-game.md, client-src-Overview.md, client-src-PackLib.md, client-src-EterPythonLib.md, client-src-ScriptLib.md, client-src-PythonModules.md).

---

## 1. Accuracy Issues

Issues where a wiki page makes a factually incorrect statement that contradicts confirmed source inventory data.

| # | File(s) | Claim in wiki | Correct value (source) | Severity |
|---|---------|---------------|------------------------|----------|
| A-01 | `concept-python-ui.md`, `blueprint-UI-Python-System.md`, `start-requirements.md`, `guide-Build-Environment.md`, `troubleshoot-client.md` | Client embeds **CPython 2.7** (32-bit) | **Python 3.x** (static, embedded). Confirmed by `client-src-Overview.md` ("Python 3.x (static)"), `client-src-EterPythonLib.md` ("Python 3.x (embedded, static)"), `client-src-ScriptLib.md` ("Python 3.x (static, embedded)"), `client-src-PythonModules.md` (frozen standard library = Python 3.x). `topic-UI-Python-System.md` correctly states 3.x. | **CRITICAL** |
| A-02 | `concept-python-ui.md`, `start-overview.md`, `start-client-setup.md` | Pack files are **`.eix`/`.epk`** format | Pack format is **`.pck`** (XChaCha20-encrypted). Confirmed by `client-src-PackLib.md` (`TPackFileHeader` + `TPackFileEntry` + `.pck`), `client-bin-Overview.md`. `.eix`/`.epk` is the original vanilla Metin2 format, not this codebase. `start-workflow.md` correctly says ".pck asset files". | **CRITICAL** |
| A-03 | `concept-sectree.md`, `blueprint-Map-World-System.md`, `start-overview.md` (glossary) | SECTREE cell size is **3200 × 3200** world units | Server inventory explicitly lists `SECTREE_SIZE = 6400`. `client-src-PRTerrainLib.md` states `TERRAIN_XSIZE/YSIZE = 25600` per tile, which subdivides differently. The 3200 value is the vanilla figure; this codebase uses 6400. | HIGH |
| A-04 | `topic-Item-System.md` | `WEAR_MAX = 34`, `WEAR_BELT = 28` | `server-src-common.md` confirms `WEAR_MAX_NUM = 32`, `EWearPositions` runs from `WEAR_BODY` (0) to `WEAR_BELT` (31). 32 positions total (0–31). `blueprint-Item-System.md` correctly states 32. | HIGH |
| A-05 | `blueprint-Character-System.md` | "255 EPointTypes values in `CHARACTER_POINT`" (implying 255 defined types) | 138 types are **defined**; 255 (`POINT_MAX_NUM`) is the **array sentinel/size**, not the count of defined types. `server-src-game.md` explicitly lists 138 defined `EPointTypes`. `Home.md` incorrectly says "73 point types"; `topic-Character-System.md` table shows 0–73 range. The correct count is 138 defined types within a 255-element array. | HIGH |
| A-06 | `Home.md` | "73 point types defined in `EPointTypes`" | 138 defined point types (see A-05). The value 73 appears to be an outdated count from a previous code revision. | HIGH |
| A-07 | `topic-Character-System.md` | Character point type table shows range 0–73, implying ~74 types | 138 types are defined (see A-05). The table is truncated and outdated. | HIGH |
| A-08 | `topic-Item-System.md` | Inventory described as "5 tabs × 45 cells = 225 cells total" | `server-src-common.md` defines `INVENTORY_MAX_NUM = 90`. The 225-cell description may refer to a different build or extended inventory variant. The authoritative constant is 90. | HIGH |
| A-09 | `topic-Map-World-System.md` | Map attribute files have extension **`.msa`** | `server-src-game.md` confirms `SECTREE_MANAGER` loads **`.atr`** files. `blueprint-Map-World-System.md` correctly says `.atr`. | MEDIUM |
| A-10 | `topic-Character-System.md` | "Guild system supports ranks 0–3" (4 ranks) | Server inventory lists `GUILD_GRADE_COUNT = 15`. 15 grades are defined. | MEDIUM |
| A-11 | `blueprint-Login-Flow.md` | `LOGIN_MAX_LEN = 32`, `PASSWD_MAX_LEN = 32` | `server-src-common.md` defines `LOGIN_MAX_LEN = 30` and `PASSWD_MAX_LEN = 16`. `topic-Game-Client-Protocol.md` also incorrectly says login[32]/password[32]. | MEDIUM |
| A-12 | `topic-Character-System.md` | "SECTREE cells cover a 25,000 × 25,000 unit area" | This is incorrect on two counts: SECTREE_SIZE = 6400 (not 25,000); TERRAIN_XSIZE = 25,600 (total terrain size per tile, not SECTREE size). These are conflated. | MEDIUM |
| A-13 | `concept-sectree.md` | SECTREE grid is "3200 × 3200 units" — repeats old value | Same as A-03. SECTREE_SIZE = 6400. | MEDIUM |
| A-14 | `blueprint-Game-Client-Protocol.md` | Hex values for several CG/GC packet headers differ from `topic-Game-Client-Protocol.md` | `server-src-Overview.md` confirms CG range 0x0006–0x0CFF, GC range 0x0007–0x0CFF, GG range 0x8000–0x8FFF. The two pages are mutually inconsistent on specific header values; cross-check against `server-src-Overview.md` and the actual `packet_headers.h`. | MEDIUM |
| A-15 | `guide-Build-Environment.md` | "Python 2.7 (optional) — only if quest compiler Python bindings are used" (server section) | The server has no Python dependency. `server-src-qc.md` confirms qc uses the embedded Lua 5.0.3 lexer directly. Python 2.7 on the server side is vestigial and should not be listed as a requirement. | LOW |
| A-16 | `start-overview.md` (glossary) | "pck / epk: `.eix` is the index; `.epk` is the data. All Python scripts and assets are packed into these files." | This describes the old vanilla format. The codebase uses `.pck` files with `TPackFileHeader` + per-entry XChaCha20. There is no `.eix` index file in this codebase. | HIGH |
| A-17 | `start-overview.md` | "40 pulses per second" stated in the server tick-rate description | `server-src-game.md` describes a 25ms heartbeat, which equals 40 Hz. This is consistent and correct. (No issue — noted for completeness.) | N/A |
| A-18 | `blueprint-Character-System.md` | `GUILD_MAX_LEVEL = 20` | Not contradicted by any source-of-truth page; guild max level is not listed in the server inventory. Listed as unverifiable but potentially inaccurate. | LOW |
| A-19 | `guide-Debugging.md` | "Python-side debug output" section correctly says "embedded Python 3 interpreter" | This is correct and consistent with `client-src-EterPythonLib.md`. (No issue.) | N/A |

---

## 2. Missing Coverage

Topics present in the repository inventories but absent from or only superficially mentioned in the wiki.

| # | Missing topic | Present in inventory | Suggested wiki location |
|---|--------------|---------------------|------------------------|
| M-01 | `liblua` — Lua 5.0.3 complete source integration, `luaX_setinput`/`luaX_lex` direct usage by `qc` | `server-src-liblua.md` sub-page exists | Cross-link from `concept-lua-quests.md` and `guide-Skill-Buff-System.md` |
| M-02 | `libpoly` CPoly formula evaluator — how skill formulas like `"floor(min(skill*2.5+level,500))"` are parsed and evaluated | `server-src-libpoly.md` sub-page exists | Cross-link from `guide-Skill-Buff-System.md` and `topic-Combat-System.md` |
| M-03 | `CGrid` inventory occupancy grid — how multi-cell items work (item can span multiple cells) | `server-src-libgame.md` briefly covers it | No guide page explains multi-cell item placement; `topic-Item-System.md` omits it |
| M-04 | `CAttribute` map walkability — BYTE/WORD/DWORD adaptive storage, how `.atr` files are loaded and queried | `server-src-libgame.md` covers it | `topic-Map-World-System.md` and `guide-NPC-and-Spawning.md` should reference it |
| M-05 | `RingBuffer` — growable circular byte buffer used for all network I/O staging (server and client have independent implementations) | `server-src-libthecore.md` and `client-src-EterLib.md` both describe it | No overview page explains the network I/O staging model |
| M-06 | `fdwatch` I/O multiplexer backends (kqueue on BSD/macOS vs. select on Windows/Linux) and their event flag semantics | `server-src-libthecore.md` documents it | `concept-architecture.md` does not mention the fdwatch abstraction |
| M-07 | `CAsyncSQL` background thread pattern — condition_variable-based wake, local copy queue to avoid long lock holds, `DirectQuery` vs `AsyncQuery` vs `ReturnQuery` | `server-src-libsql.md` covers it | `concept-architecture.md` and `server-src-db.md` should cross-link |
| M-08 | `CStmt` prepared-statement wrapper and when to use it vs. string queries | `server-src-libsql.md` covers it | No guide page mentions prepared statements |
| M-09 | XChaCha20-Poly1305 pack encryption details — `TPackFileHeader`, `TPackFileEntry`, per-file nonce, `PACK_KEY` in `config.h` | `client-src-PackLib.md` covers it | `guide-Asset-Pipeline.md` references it but does not explain the key management |
| M-10 | `CPackManager` priority rules — later-added packs win; file mode bypasses all packs | `guide-Asset-Pipeline.md` covers it | Should be cross-linked from `client-bin-Overview.md` |
| M-11 | SpeedTreeRT vegetation rendering pipeline (`Forest_RenderBranches`, `Forest_RenderFronds`, etc.) | `client-src-SpeedTreeLib.md` sub-page exists | No guide page explains adding/modifying vegetation |
| M-12 | `CSemaphore` portable POSIX/Win32 semaphore — used internally by libsql | `server-src-libsql.md` documents it | No cross-reference exists |
| M-13 | `EterLocale` Arabic RTL shaping (`Arabic_MakeShape`) and UTF-8 constant `CP_UTF8 = 65001` | `client-src-EterLocale.md` sub-page exists; `guide-Localization.md` references it | `guide-Localization.md` could include concrete Arabic shaping example |
| M-14 | `CEffectManager::RegisterEffect` CRC32 hashing for effect IDs, `.mse` file format block keywords | `client-src-EffectLib.md` documents it; `guide-Asset-Pipeline.md` covers `.mse` | `concept-vnum.md` should note that effect IDs are CRC32-derived, not sequential vnums |
| M-15 | `BELT_INVENTORY` window type (defined in `EWindows` enum in server-src-common.md) | `server-src-common.md` lists it | `topic-Item-System.md` does not mention the belt inventory window |
| M-16 | `DRAGON_SOUL_INVENTORY` window type | `server-src-common.md` lists it | `topic-Item-System.md` does not mention dragon soul inventory |
| M-17 | `MALL` (premium item shop) window type | `server-src-common.md` lists it | Not documented in any item system page |
| M-18 | `SAFEBOX` window type details — how safebox differs from regular inventory in terms of grid coordinates | `server-src-common.md` defines it | `topic-Item-System.md` should explain the multi-window item coordinate system |
| M-19 | `PLAYER_PER_ACCOUNT = 4` constant — explicit limit on characters per account | `server-src-common.md` defines it | `topic-Login-Flow.md` and `blueprint-Login-Flow.md` do not state this limit explicitly |
| M-20 | `CHARACTER_NAME_MAX_LEN = 64` constraint | `server-src-common.md` defines it | `topic-Character-System.md` does not mention name length limits |
| M-21 | `PLAYER_MAX_LEVEL_CONST = 120` — the hard cap | `server-src-common.md` defines it | `topic-Character-System.md` and `blueprint-Character-System.md` do not state this constant |
| M-22 | `SKILL_MAX_NUM = 255`, `SKILL_MAX_LEVEL = 40` — skill array sizes | `server-src-common.md` defines them | `guide-Skill-Buff-System.md` mentions level 40 for Perfect Master but does not cite the constant |
| M-23 | `QUICKSLOT_MAX_NUM = 36` — confirmed by both server (`server-src-common.md`) and client (`client-bin-root-config.md` `constInfo.py`) | Consistent across both repos | No page explicitly states this constant and its cross-repo consistency |
| M-24 | `EApplyTypes` full enumeration — 91 distinct apply types from `APPLY_NONE` through `APPLY_ANTI_PENETRATE_PCT` | `server-src-common.md` confirms 91 types | `topic-Item-System.md` says "90+ defined" — should cite the exact count |
| M-25 | GD/DG packet frame structure — `[header:2][handle:4][size:4][payload...]` = 10-byte overhead, distinct from CG/GC 4-byte header | `server-src-Overview.md` and `concept-packets.md` note this | `blueprint-Game-Client-Protocol.md` focuses on CG/GC and does not explain the GD/DG frame |
| M-26 | GG (game↔game P2P) packet range `0x8000–0x8FFF` — purpose and usage pattern | `server-src-Overview.md` lists GG range | No dedicated section in `concept-packets.md` or `topic-Game-Client-Protocol.md` |
| M-27 | `npclist.txt` format — variant-to-base model mapping used by client-bin | `client-bin-data-files.md` documents it | `guide-NPC-and-Spawning.md` references `npc_list.txt` (server) but not `npclist.txt` (client-side model mapping) |
| M-28 | `.msm` race definition files — 8 files covering warrior_m/w, assassin_w/m, sura_m/w, shaman_w/m; base paths `d:/ymir work/pc/` and `d:/ymir work/pc2/` | `client-bin-data-files.md` documents it | `guide-Horse-Mount-Pet.md` mentions `.msm` but does not explain the file format or base path convention |
| M-29 | `atlasinfo.txt` — 110 map entries, GlobalX/Y in multiples of 25600 world units, exact column structure | `client-bin-data-files.md` documents it | `guide-NPC-and-Spawning.md` mentions atlas registration but references `atlas.txt` instead of `atlasinfo.txt` |
| M-30 | `makepackscript_onlyrootnopython.txt` — `.pck` build configuration listing which directories to pack | `client-bin-data-files.md` documents it | No guide page explains the pack build script configuration |

---

## 3. Outdated References

References to APIs, file formats, or tools that no longer match the current codebase.

| # | File(s) | Outdated reference | Current state |
|---|---------|-------------------|---------------|
| O-01 | `concept-python-ui.md`, `blueprint-UI-Python-System.md`, `start-requirements.md`, `guide-Build-Environment.md`, `troubleshoot-client.md` | Python 2.7 / CPython 2.7 | Python 3.x is embedded. All `M_*.c` frozen module files in `client-src-PythonModules.md` are Python 3.x format. |
| O-02 | `concept-python-ui.md`, `start-overview.md`, `start-client-setup.md` | `.eix`/`.epk` pack format | `.pck` format with `TPackFileHeader` + XChaCha20 (libsodium). This is a complete format change from vanilla Metin2. |
| O-03 | `start-overview.md` (glossary) | "pck / epk: `.eix` is the index; `.epk` is the data" | No `.eix` or `.epk` files exist in this codebase. The pack format is a single `.pck` file with its own header. |
| O-04 | `concept-sectree.md`, `blueprint-Map-World-System.md` | `SECTREE_SIZE = 3200` | `SECTREE_SIZE = 6400` in the server-src inventory. |
| O-05 | `topic-Item-System.md` | `WEAR_MAX = 34` | `WEAR_MAX_NUM = 32` (EWearPositions 0–31) per `server-src-common.md`. |
| O-06 | `Home.md` | "73 point types" | 138 defined EPointTypes per `server-src-game.md`. |
| O-07 | `topic-Map-World-System.md` | `.msa` map attribute file extension | `.atr` extension per `server-src-game.md` and `blueprint-Map-World-System.md`. |
| O-08 | `blueprint-Login-Flow.md`, `topic-Game-Client-Protocol.md` | `LOGIN_MAX_LEN = 32`, `PASSWD_MAX_LEN = 32` | `LOGIN_MAX_LEN = 30`, `PASSWD_MAX_LEN = 16` per `server-src-common.md`. |

---

## 4. New Cross-Link Opportunities

Pages that could benefit from explicit links to related pages for navigability and discoverability.

| # | Source page | Target page | Relationship |
|---|------------|-------------|--------------|
| L-01 | `concept-lua-quests.md` | `server-src-liblua.md` | Lua 5.0.3 source is the engine; liblua describes the actual lexer used by qc |
| L-02 | `concept-lua-quests.md` | `server-src-qc.md` | qc is the tool that compiles quest scripts |
| L-03 | `guide-Skill-Buff-System.md` | `server-src-libpoly.md` | All skill formulas are evaluated by CPoly from libpoly |
| L-04 | `topic-Combat-System.md` | `server-src-libpoly.md` | Damage formulas use CPoly |
| L-05 | `topic-Item-System.md` | `server-src-libgame.md` | CGrid is the inventory placement engine; CAttribute is the map attribute layer |
| L-06 | `topic-Map-World-System.md` | `server-src-libgame.md` | CAttribute stores per-cell walkability; targa loads guild mark TGA images |
| L-07 | `topic-Map-World-System.md` | `client-src-PRTerrainLib.md` | PRTerrainLib defines TERRAIN_SIZE, CELLSCALE, TERRAIN_XSIZE/YSIZE |
| L-08 | `concept-packets.md` | `server-src-libthecore.md` | libthecore provides RingBuffer and fdwatch that back all packet I/O |
| L-09 | `concept-packets.md` | `client-src-EterLib.md` | EterLib provides the client-side CNetworkStream and RingBuffer |
| L-10 | `concept-architecture.md` | `server-src-libthecore.md` | libthecore is the event loop; the heartbeat and fdwatch drive the entire server |
| L-11 | `concept-architecture.md` | `server-src-libsql.md` | CAsyncSQL is the async DB layer; understanding it is key to the GD/DG architecture |
| L-12 | `server-src-game.md` | `server-src-libpoly.md` | game links libpoly for skill formula evaluation |
| L-13 | `server-src-game.md` | `server-src-libgame.md` | game links libgame for CAttribute (map attribute) and CGrid (inventory) |
| L-14 | `server-src-db.md` | `server-src-libsql.md` | db process uses CAsyncSQL for all MariaDB communication |
| L-15 | `server-src-qc.md` | `server-src-liblua.md` | qc calls luaX_setinput/luaX_lex directly from liblua |
| L-16 | `guide-Asset-Pipeline.md` | `client-src-PackLib.md` | PackLib defines the .pck format used by the asset pipeline |
| L-17 | `guide-Asset-Pipeline.md` | `client-src-EterGrnLib.md` | Granny2 model loading is handled by EterGrnLib |
| L-18 | `guide-Asset-Pipeline.md` | `client-src-EterImageLib.md` | TGA/DDS/PNG image loading is handled by EterImageLib |
| L-19 | `guide-Asset-Pipeline.md` | `client-src-EffectLib.md` | .mse effect scripts are loaded and run by EffectLib |
| L-20 | `guide-Skill-Buff-System.md` | `topic-Character-System.md` | EPointTypes and EApplyTypes are central to how affects modify stats |
| L-21 | `guide-Skill-Buff-System.md` | `topic-Item-System.md` | EApplyTypes is also the mechanism for item bonuses |
| L-22 | `guide-Database-Proto.md` | `server-src-db.md` | db process reads proto via ProtoReader and broadcasts via DG::BOOT |
| L-23 | `guide-Database-Proto.md` | `server-src-common.md` | EItemType, EApplyTypes, EWearPositions constants define proto fields |
| L-24 | `guide-Security-AntiCheat.md` | `server-src-libthecore.md` | GOLD_MAX and other bounds are defined in common/length.h which libthecore uses |
| L-25 | `guide-NPC-and-Spawning.md` | `concept-sectree.md` | SECTREE partitioning drives regen event scheduling |
| L-26 | `guide-Horse-Mount-Pet.md` | `client-src-GameLib-Characters.md` | CActorInstance.EType includes TYPE_HORSE used for mount rendering |
| L-27 | `guide-Localization.md` | `client-src-EterLocale.md` | EterLocale provides Arabic shaping and CP_UTF8 used by locale system |
| L-28 | `guide-Adding-a-New-System.md` | `guide-Security-AntiCheat.md` | New system handlers should follow the security checklist |
| L-29 | `guide-Adding-a-New-System.md` | `topic-Game-Client-Protocol.md` | Full packet reference needed when defining new CG/GC headers |
| L-30 | `concept-proto.md` | `server-src-db.md` | db process owns proto loading and distribution via DG::BOOT |
| L-31 | `client-src-UserInterface-NetworkStream.md` | `client-src-EterLib.md` | CPythonNetworkStream inherits from CNetworkStream in EterLib |
| L-32 | `client-bin-root-config.md` | `server-src-common.md` | QUICKSLOT_MAX_NUM=36 in constInfo.py matches server constant — worth noting |
| L-33 | `client-bin-root-network.md` | `start-server-setup.md` | serverinfo.py PORT_1=11011 matches default game port |
| L-34 | `blueprint-Quest-System.md` | `server-src-qc.md` | qc compiler architecture details the compiled output format |
| L-35 | `topic-Quest-System.md` | `server-src-qc.md` | qc state machine and output directory structure |
| L-36 | `guide-Debugging.md` | `server-src-libthecore.md` | sys_log/sys_err macros and log rotation are from libthecore |
| L-37 | `guide-Economy.md` | `server-src-libpoly.md` | refine probability formulas could use CPoly for complex expressions |
| L-38 | `guide-Build-Environment.md` | `server-src-Overview.md` | Overview lists all ~268 server-src source files referenced by build |
| L-39 | `start-overview.md` | `concept-sectree.md` | SECTREE is mentioned in glossary but not linked |
| L-40 | `client-src-GameLib-Map.md` | `client-src-PRTerrainLib.md` | PRTerrainLib is the terrain rendering foundation for CMapOutdoor |
| L-41 | `guide-Best-Practices.md` | `server-src-libthecore.md` | sys_log/sys_err patterns are documented in libthecore |
| L-42 | `guide-Best-Practices.md` | `server-src-libsql.md` | "No raw SQL in game process" rule corresponds to CAsyncSQL architecture |

---

## 5. Statistics

| Metric | Count |
|--------|-------|
| Total wiki files read | 89 |
| Accuracy issues found | 17 (excluding N/A rows) |
| Missing coverage items | 30 |
| Outdated references | 8 |
| Cross-link opportunities | 42 |
| Pages with no issues found | ~50 (guide-*, troubleshoot-*, most server-src-* sub-pages) |
| **Critical** accuracy issues | 2 (Python version, pack format) |
| **High** accuracy issues | 7 |
| **Medium** accuracy issues | 6 |
| **Low** accuracy issues | 2 |

---

## 6. Notes

### Source-of-truth hierarchy used for this audit

When resolving conflicts between wiki pages, the following precedence was applied:

1. **`server-src-common.md`** — defines all shared constants (`INVENTORY_MAX_NUM`, `WEAR_MAX_NUM`, `PLAYER_PER_ACCOUNT`, `LOGIN_MAX_LEN`, `PASSWD_MAX_LEN`, `QUICKSLOT_MAX_NUM`, `GOLD_MAX`, `PLAYER_MAX_LEVEL_CONST`, `SKILL_MAX_NUM`, `SKILL_MAX_LEVEL`, `EApplyTypes`, `EWearPositions`, `EWindows`).
2. **`server-src-game.md`** — defines runtime constants (`EPointTypes` with 138 defined types, heartbeat rate, SECTREE usage).
3. **`client-src-Overview.md`**, **`client-src-EterPythonLib.md`**, **`client-src-ScriptLib.md`**, **`client-src-PythonModules.md`** — unanimous on Python 3.x.
4. **`client-src-PackLib.md`** — definitive on `.pck` format and `TPackFileHeader`.
5. **`server-src-Overview.md`** — definitive on packet namespace ranges and process architecture.

### Most impactful fixes to prioritise

1. **Python version** (A-01): Affects `concept-python-ui.md`, `blueprint-UI-Python-System.md`, `start-requirements.md`, `guide-Build-Environment.md`, `troubleshoot-client.md`. A developer following the build guide will install the wrong Python and waste hours.
2. **Pack format** (A-02, A-16, O-02, O-03): Affects `concept-python-ui.md`, `start-overview.md`, `start-client-setup.md`. Sending developers to look for `.eix`/`.epk` tools that do not exist in this codebase.
3. **SECTREE_SIZE** (A-03, O-04): Affects spatial calculations in any custom map or spawn work.
4. **WEAR_MAX** (A-04, O-05): Affects equipment slot calculations in any item system work.
5. **Point type count** (A-05, A-06, A-07): `Home.md` is a landing page — incorrect "73 point types" is seen by every new developer.

### Pages that are accurate and well-written

The following pages are consistent with the inventory and have no accuracy issues: `server-src-libthecore.md`, `server-src-libsql.md`, `server-src-libpoly.md`, `server-src-libgame.md`, `server-src-qc.md`, `server-src-liblua.md`, `client-src-PackLib.md`, `client-src-EterPythonLib.md`, `client-src-ScriptLib.md`, `client-src-PythonModules.md`, `topic-UI-Python-System.md` (correctly says Python 3.x), `guide-Debugging.md` (correctly says Python 3), `start-workflow.md` (correctly says .pck), `guide-Asset-Pipeline.md`, `guide-Security-AntiCheat.md`, `guide-Skill-Buff-System.md`, `guide-Horse-Mount-Pet.md`, `guide-Economy.md`, all `troubleshoot-*.md` pages (except the Python version claim in `troubleshoot-client.md`), all `client-bin-*.md` pages.

### Inventory items not yet covered by any wiki page

The following server-src inventory files have sub-pages but are not linked from any concept, blueprint, or topic page: `server-src-liblua.md`, `server-src-libpoly.md`, `server-src-libgame.md`. These are referenced only from the server-src sub-page list on `Home.md`. Adding cross-links from the relevant concept and guide pages (see section 4) would significantly improve discoverability.
