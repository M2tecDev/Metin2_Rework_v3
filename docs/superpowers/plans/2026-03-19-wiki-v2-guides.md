# Wiki v2 Developer Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the 53-page Metin2 Rework v3 wiki with 12 new developer guide pages and 6 extended topic pages, all pushed to the GitHub Wiki.

**Architecture:** Four phases — Phase 1 runs 10 agents in parallel to produce independent guide pages; Phase 2 runs 2 agents sequentially (Best Practices first, then the synthesis guide); Phase 3 runs 6 agents in parallel to extend existing topic pages; Phase 4 updates navigation and pushes everything to GitHub Wiki.

**Tech Stack:** Markdown, GitHub Wiki git repo, existing wiki pages as source material, Metin2 Rework v3 source (CMake-based, vanilla Metin2 + modernized libs)

---

## File Map

### New Files (wiki/)
- `wiki/guide-Build-Environment.md` — CMake setup, VS/GCC versions, all dependencies
- `wiki/guide-Asset-Pipeline.md` — VFS/Pack system, .dds/.gr2/.tga, .mse effects, .sub files
- `wiki/guide-Localization.md` — locale_game.txt, locale_interface.txt, server strings, new language
- `wiki/guide-Debugging.md` — syserr table, sys_log usage, gdb/crash-dump guide
- `wiki/guide-Database-Proto.md` — item_proto/mob_proto workflow, vnum range recommendations
- `wiki/guide-Economy.md` — refine_proto, cube.txt recipes, custom-currency shops
- `wiki/guide-Horse-Mount-Pet.md` — horse tiers, mount vnum logic, CPetSystem
- `wiki/guide-Skill-Buff-System.md` — skill_proto, AddAffect, cooldowns/mana costs
- `wiki/guide-Security-AntiCheat.md` — speed-hack detection, packet validation
- `wiki/guide-NPC-and-Spawning.md` — mob_proto, regen.txt, SpawnGroups, NPC shops
- `wiki/guide-Best-Practices.md` — coding standards derived from source, #ifdef toggles
- `wiki/guide-Adding-a-New-System.md` — end-to-end walkthrough through all layers

### Modified Files (wiki/)
- `wiki/topic-Game-Client-Protocol.md` — add "How to Add a New Packet" section
- `wiki/topic-Quest-System.md` — add dungeon API deep dive, timer decision table, new C++ trigger guide
- `wiki/topic-Map-World-System.md` — add map file checklist, atlas registration, ×100 coordinate factor
- `wiki/topic-Item-System.md` — add UseItem() walkthrough, durability/stack size settings
- `wiki/topic-Combat-System.md` — add APPLY vs POINT distinction, damage formula, hardcap locations
- `wiki/topic-Character-System.md` — add new synced variable guide, broadcast update mechanism
- `wiki/Home.md` — add Developer Guides section
- `wiki/_Sidebar.md` — add ## Developer Guides navigation section

---

## Task 1: Phase 1 — Run 10 guide agents in parallel

**Files:**
- Create: `wiki/guide-Build-Environment.md`
- Create: `wiki/guide-Asset-Pipeline.md`
- Create: `wiki/guide-Localization.md`
- Create: `wiki/guide-Debugging.md`
- Create: `wiki/guide-Database-Proto.md`
- Create: `wiki/guide-Economy.md`
- Create: `wiki/guide-Horse-Mount-Pet.md`
- Create: `wiki/guide-Skill-Buff-System.md`
- Create: `wiki/guide-Security-AntiCheat.md`
- Create: `wiki/guide-NPC-and-Spawning.md`

- [ ] **Step 1: Dispatch 10 agents in parallel using a single message with 10 Agent tool calls**

Each agent follows the guide page template:
```markdown
# Guide: <Title>
> One-line summary.
## Prerequisites
## Overview
## Step-by-Step
## Common Mistakes
## Key Files (table: path | repo | role)
```
Rules for all agents:
- No LaTeX. Formulas as fenced code blocks.
- Cross-link to related reference pages.
- Mark unverifiable Rework-v3 details: `> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.`
- Write output to `wiki/` directory.

**Agent A prompt — guide-Build-Environment.md:**
Read the following files to research the content, then write `wiki/guide-Build-Environment.md`:
- Primary: scan `CMakeLists.txt` files across the repo, any `vcpkg.json` or `conanfile.txt`
- If dependency files are not found, note the absence with the standard Note disclaimer rather than guessing version numbers
Cover: which Visual Studio version is required for client-src, which GCC/Clang version for server-src, CMake minimum version, all third-party dependencies (Boost, CryptoPP, Python 2.7, DevIL, etc.) with version numbers where findable, build steps for both client and server, common build errors and fixes.

**Agent B prompt — guide-Asset-Pipeline.md:**
Read `wiki/client-src-PackLib.md`, `wiki/client-src-EffectLib.md`, `wiki/client-src-EterGrnLib.md`, `wiki/client-src-EterImageLib.md`, then write `wiki/guide-Asset-Pipeline.md`.
Cover: how the VFS/Pack system works (EterPack), where to place new .dds textures, .gr2 models, .tga icons so the client finds them, how .mse effect files work and how InstanceBase attaches effects to bones/positions, how .sub files define texture atlas coordinates (and why icons look wrong when .sub coords are wrong).

**Agent C prompt — guide-Localization.md:**
Read `wiki/client-src-EterLocale.md`, `wiki/client-bin-root-config.md`, `wiki/client-bin-root-settings.md`, then glob for `locale_*.py` or `locale_*.txt` files in `client-bin/`, then write `wiki/guide-Localization.md`.
Cover: how `locale_game.txt` and `locale_interface.txt` work client-side, how to reference strings from Python instead of hardcoding, how server-side `locale_string.txt` works for system messages, complete workflow for adding a new language (file list, build flags, client config).

**Agent D prompt — guide-Debugging.md:**
Read `wiki/server-src-libthecore.md`, `wiki/server-src-game.md`, then search for `sys_log` and `sys_err` usage patterns in server source, then write `wiki/guide-Debugging.md`.
Cover: syserr "table of pain" (include only error messages directly found in the searched source files — omit any that cannot be confirmed), how to use `sys_log`/`sys_err`/`fprintf` for server-side debug output, how to enable/read client syserr, how to read a Linux core dump with gdb (bt full, info registers), how to interpret a Windows crash dump.

**Agent E prompt — guide-Database-Proto.md:**
Read `wiki/server-src-db.md`, `wiki/server-src-common.md`, `wiki/topic-Item-System.md`, then write `wiki/guide-Database-Proto.md`.
Cover: complete workflow to add a new item (SQL insert into item_proto → regenerate/rebuild client item_proto binary → sync or client will kick), complete workflow to add a new mob (mob_proto server SQL + mob_proto client file), vnum range recommendations (which ranges are used by vanilla, which are safe to use for custom content), what happens when server/client proto are out of sync.

**Agent F prompt — guide-Economy.md:**
Read `wiki/topic-Item-System.md`, `wiki/server-src-game.md`, `wiki/server-src-db.md`, then write `wiki/guide-Economy.md`.
Cover: refine_proto schema (vnum → refine_set_id → materials + chance), how to add a new upgrade path, cube.txt format (ingredients, results, probabilities, multiple outcomes), how to create an NPC shop that accepts non-gold currency (honor points, special items), shop_item table structure.

**Agent G prompt — guide-Horse-Mount-Pet.md:**
Read `wiki/topic-Character-System.md`, `wiki/client-src-GameLib-Characters.md`, `wiki/server-src-game.md`, then write `wiki/guide-Horse-Mount-Pet.md`.
Cover: classic horse system (3 tiers: Beginner/Combat/Military, horse_vnum logic, horse skill table), modern mount system (ITEM_COSTUME_MOUNT item subtype, how USE triggers model spawn and player "riding" state), pet system if CPetSystem.cpp exists (pet leveling, stat bonuses, feeding) — omit pet section entirely if CPetSystem.cpp cannot be confirmed in the codebase.

**Agent H prompt — guide-Skill-Buff-System.md:**
Read `wiki/topic-Character-System.md`, `wiki/topic-Combat-System.md`, `wiki/server-src-common.md`, then write `wiki/guide-Skill-Buff-System.md`.
Cover: skill_proto structure (server DB table), skill_desc.txt and skill_table.txt client files and how they map to server data, how to use AddAffect to apply a time-limited buff (parameters: type, apply, value, duration), how affects are stored and expire, cooldown storage (POINT_SKILL_NEXT_USE or equivalent), mana cost per level configuration.

**Agent I prompt — guide-Security-AntiCheat.md:**
Read `wiki/topic-Game-Client-Protocol.md`, `wiki/server-src-libthecore.md`, `wiki/server-src-game.md`, then write `wiki/guide-Security-AntiCheat.md`.
Cover: speed-hack detection mechanism (how the server detects impossible movement deltas), packet ownership validation (how server verifies the sender owns the entity/item being acted on), duplicate-login enforcement, session key validation, common exploit patterns and how the code guards against them, what NOT to trust from the client.

**Agent J prompt — guide-NPC-and-Spawning.md:**
Read `wiki/server-src-game.md`, `wiki/topic-Map-World-System.md`, `wiki/server-src-common.md`, then write `wiki/guide-NPC-and-Spawning.md`.
Cover: mob_proto fields and how to add a new mob, regen.txt format (spawn groups, spawn counts, timing, wander radius), how SpawnGroup/SpawnGroupCollection work, how to create an NPC that opens a dialog/shop, how to place a static NPC on a map, common regen.txt errors and what syserr messages they produce.

- [ ] **Step 2: Verify all 10 files were written to `wiki/`**

```bash
ls wiki/guide-*.md | wc -l
# Expected: 10
```

- [ ] **Step 3: Commit Phase 1 output**

```bash
git add wiki/guide-Build-Environment.md wiki/guide-Asset-Pipeline.md \
  wiki/guide-Localization.md wiki/guide-Debugging.md \
  wiki/guide-Database-Proto.md wiki/guide-Economy.md \
  wiki/guide-Horse-Mount-Pet.md wiki/guide-Skill-Buff-System.md \
  wiki/guide-Security-AntiCheat.md wiki/guide-NPC-and-Spawning.md
git commit -m "wiki: add 10 developer guide pages (Phase 1)"
```

---

## Task 2: Phase 2 — Sequential agents (Best Practices → Adding a New System)

**Files:**
- Create: `wiki/guide-Best-Practices.md`
- Create: `wiki/guide-Adding-a-New-System.md`

- [ ] **Step 1: Dispatch Agent K — guide-Best-Practices.md**

Agent K reads ONLY from source files (not other wiki pages) to derive actual conventions:
- `client-src/src/UserInterface/PythonNetworkStream.h`
- `server-src/src/game/char.h`
- `client-src/src/UserInterface/GameType.h`
- Any `Locale_inc.h`, `Service.h`, `CommonDefines.h` if they exist (glob first)
- Any top-level CMakeLists.txt for compile flags

Write `wiki/guide-Best-Practices.md`. Rules:
- Only document conventions that are demonstrably present in the code (naming style, include order, use of `#ifdef` for feature flags, etc.)
- Omit anything that cannot be confirmed from the files
- Do NOT invent or assume conventions

- [ ] **Step 2: Verify guide-Best-Practices.md was written, then dispatch Agent L**

```bash
ls wiki/guide-Best-Practices.md && echo "OK — proceed to Agent L"
```

Agent L reads the following files (all 10 Phase 1 guides + Best Practices + key topic pages):
- `wiki/guide-Build-Environment.md`
- `wiki/guide-Asset-Pipeline.md`
- `wiki/guide-Localization.md`
- `wiki/guide-Debugging.md`
- `wiki/guide-Database-Proto.md`
- `wiki/guide-Economy.md`
- `wiki/guide-Horse-Mount-Pet.md`
- `wiki/guide-Skill-Buff-System.md`
- `wiki/guide-Security-AntiCheat.md`
- `wiki/guide-NPC-and-Spawning.md`
- `wiki/guide-Best-Practices.md`
- `wiki/topic-Game-Client-Protocol.md`
- `wiki/topic-UI-Python-System.md`
- `wiki/topic-Quest-System.md`

Write `wiki/guide-Adding-a-New-System.md` as a complete end-to-end walkthrough of building one new feature from scratch. Use a concrete example: "Add a custom teleport stone item that warps the player to a fixed location when used."
Walk through every layer:
1. Define the item in item_proto (SQL + client binary sync)
2. Write the server USE handler in char_item.cpp
3. Add the quest/server trigger if needed
4. Create the Python UI feedback (notification or dialog)
5. Add any necessary packet if UI needs server confirmation
6. Test checklist
Cross-reference the relevant guide- pages at each step.

- [ ] **Step 3: Commit Phase 2 output**

```bash
git add wiki/guide-Best-Practices.md wiki/guide-Adding-a-New-System.md
git commit -m "wiki: add Best-Practices and Adding-a-New-System guides (Phase 2)"
```

---

## Task 3: Phase 3 — Extend 6 topic pages in parallel

**Files:**
- Modify: `wiki/topic-Game-Client-Protocol.md`
- Modify: `wiki/topic-Quest-System.md`
- Modify: `wiki/topic-Map-World-System.md`
- Modify: `wiki/topic-Item-System.md`
- Modify: `wiki/topic-Combat-System.md`
- Modify: `wiki/topic-Character-System.md`

- [ ] **Step 1: Dispatch 6 agents in parallel**

All agents follow this edit rule:
- Read the full current page first
- If the page has a Table of Contents: insert new sections in numbered sequence and update the ToC
- If the page has no ToC: append new sections before the existing "Key Files" section
- Do NOT rewrite or remove existing content — only add

**Agent M — topic-Game-Client-Protocol.md:**
Read the current `wiki/topic-Game-Client-Protocol.md` (note: it already has Sections 1–8 including wire format in Section 2 and dispatcher architecture in Section 7).
Add a new section titled **"How to Add a New Packet"** with these sub-steps:
1. Add header constant to `server-src/src/common/packet_headers.h` (CG or GC namespace)
2. Define the packet struct in `packet_structs.h`
3. Server side: register handler in `CInputMain::RegisterRecvPhaseGame` (or appropriate phase)
4. Server side: implement the handler function
5. Client side: add `SendXxxPacket()` method to `CPythonNetworkStream`
6. Client side: register `RecvXxx` in the phase dispatch table
7. CMake: no additional steps needed (auto-compiled), but note which files to rebuild
Cross-reference existing Sections 2 (wire format) and 7 (dispatcher) — do not repeat their content.

**Agent N — topic-Quest-System.md:**
Read current `wiki/topic-Quest-System.md`.
Add three new sections:
1. **"Dungeon API Reference"** — expand the existing `d.*` table (currently 7 entries) into a full reference with usage examples: `d.new_jump_all`, `d.setf`, `d.getf`, `d.notice`, `d.kill_all_in_map`, `d.is_enter_scroll`, instance variable patterns, and how dungeon-scoped variables differ from PC flags.
2. **"Timer Decision Table"** — `server_timer` vs `timer`: a comparison table (scope, persistence, use-case), worked example for boss respawn (`server_timer`) vs player quest cooldown (`timer`), and warning about why `timer` should rarely be used in shared quest contexts.
3. **"Adding a New C++ Quest Trigger"** — step-by-step: where trigger constants are defined, how to register a new event in `questlua_*.cpp`, how to make it callable from `.quest` scripts with the `when X begin` syntax.

**Agent O — topic-Map-World-System.md:**
Read current `wiki/topic-Map-World-System.md`.
Add three new sections:
1. **"Map File Checklist"** — side-by-side table: CLIENT files (`property/` folder, `textureset/`, `map_name.txt`, minimap image) vs SERVER files (`Setting.txt`, `Town.txt`, `regen.txt`, `npc_list.txt`) with what happens if each is missing.
2. **"Minimap & Atlas Registration"** — how to register a new map so it appears correctly on the M-key minimap: `npc_list.txt` format, atlas image naming convention, `AtlasInfo.txt` or equivalent.
3. **"Coordinate System: The ×100 Factor"** — explicit explanation with worked example: server stores coordinates in centimeters (unit = 1 cm), client uses the same unit but warp/teleport Lua functions use a ×1 factor while some Python calls divide by 100. Table showing which API calls expect which unit. Common mistake: `pc.warp(x*100, y*100)` vs `pc.warp(x, y)`.

**Agent P — topic-Item-System.md:**
Read current `wiki/topic-Item-System.md`.
Add two new sections:
1. **"UseItem() Annotated Walkthrough"** — document `char_item.cpp::UseItem(TItemPos Cell)`: the outer switch on `ITEM_TYPE`, the inner switch on subtype for `ITEM_USE`, how `CItem::Use()` is called, where to add a new USE subtype handler. Annotate the flow with the key decision points.
2. **"Durability and Stack Size"** — where `bLimitType`/`wLimitValue` control item restrictions, where `wMaxCount` (stack size) is set in `TItemTable`, where `bAntiFlags` controls trade/drop restrictions, and how `ITEM_ANTIFLAG_SELL` etc. work.

**Agent Q — topic-Combat-System.md:**
Read current `wiki/topic-Combat-System.md`.
Add three new sections:
1. **"APPLY_* vs POINT_* Distinction"** — conceptual explanation: `EApplyTypes` (defined in `common/length.h`) are the identifiers used on items and buffs; `EPoints` are the indices into the character's live stat array. The server maps APPLY→POINT at effect-application time in `affect.cpp`. Show the mapping for 5 common examples (e.g. `APPLY_STR` → `POINT_ST`). Reference `affect.cpp` and `char_point.cpp`.
2. **"Damage Formula"** — express the melee damage calculation as an annotated fenced code block showing the formula components (base attack, bonus applies, defense calculation, critical/penetrating multipliers). Reference the exact functions in `battle.cpp` where each component is calculated.
3. **"Hardcap Locations"** — table of percentage caps (e.g. critical hit max %, dodge max %, resist max %) with the source file and line/constant name where each cap is enforced. Mark any that cannot be confirmed with the standard Note disclaimer.

**Agent R — topic-Character-System.md:**
Read current `wiki/topic-Character-System.md`.
Add two new sections:
1. **"Adding a New Synced Character Variable"** — complete step-by-step:
   - SERVER: add member to `CHARACTER` class, add `POINT_*` enum entry if it's a point-type value, add getter/setter, handle persistence (player_index_table or separate column)
   - PACKET: add field to `TPacketGCCharacterUpdate` or create new packet if needed
   - CLIENT C++: receive in `CInstanceBase`, store value, expose via Python getter
   - CLIENT Python: call getter from UI code
2. **"Broadcast Update Mechanism"** — how `UpdatePacket`/`ViewList` works: SECTREE view range (default radius), how `CHARACTER::UpdatePacket()` builds the update, how it is sent to all players in the same sector, how to trigger an immediate re-broadcast when a value changes (vs waiting for the next tick).

- [ ] **Step 2: Verify all 6 topic pages were modified**

```bash
git diff --name-only | grep "topic-"
# Expected: 6 topic files listed
```

- [ ] **Step 3: Commit Phase 3 output**

```bash
git add wiki/topic-Game-Client-Protocol.md wiki/topic-Quest-System.md \
  wiki/topic-Map-World-System.md wiki/topic-Item-System.md \
  wiki/topic-Combat-System.md wiki/topic-Character-System.md
git commit -m "wiki: extend 6 topic pages with developer guide sections (Phase 3)"
```

---

## Task 4: Phase 4 — Navigation update and GitHub Wiki push

**Files:**
- Modify: `wiki/Home.md`
- Modify: `wiki/_Sidebar.md`

- [ ] **Step 1: Update `wiki/_Sidebar.md`**

Read the current `wiki/_Sidebar.md`. Add a new `## Developer Guides` section after the existing `## Topic Guides` section, listing all 12 guide pages alphabetically:

```markdown
## Developer Guides
- [Adding a New System](guide-Adding-a-New-System)
- [Asset Pipeline](guide-Asset-Pipeline)
- [Best Practices](guide-Best-Practices)
- [Build Environment](guide-Build-Environment)
- [Database & Proto](guide-Database-Proto)
- [Debugging](guide-Debugging)
- [Economy & Trading](guide-Economy)
- [Horse, Mounts & Pets](guide-Horse-Mount-Pet)
- [Localization](guide-Localization)
- [NPC & Spawning](guide-NPC-and-Spawning)
- [Security & Anti-Cheat](guide-Security-AntiCheat)
- [Skill & Buff System](guide-Skill-Buff-System)
```

- [ ] **Step 2: Update `wiki/Home.md`**

Read the current `wiki/Home.md`. Add a "Developer Guides" section with a one-line description for each of the 12 guides. Place it after the existing "Topic Guides" section.

- [ ] **Step 3: Commit navigation updates**

```bash
git add wiki/Home.md wiki/_Sidebar.md
git commit -m "wiki: update Home and Sidebar navigation for v2 guide pages"
```

- [ ] **Step 4: Copy all wiki files to wiki-repo and push to GitHub**

Run from the main repo root:
```bash
cp wiki/*.md wiki-repo/
cd wiki-repo
git add -A
git commit -m "Wiki v2: add 12 developer guides + extend 6 topic pages"
git push origin master
# If 'master' is rejected, try: git push origin main
cd ..
# Back in main repo root
```

- [ ] **Step 5: Verify push succeeded**

```bash
cd wiki-repo && git log --oneline -3 && cd ..
```
Verify the top commit is the wiki v2 commit, then return:
```bash
```bash
git log --oneline -3
# Expected: top commit is the wiki v2 commit
cd ..
# Return to main repo root for Task 5
```

---

## Task 5: Merge to master

- [ ] **Step 1: Push branch to origin**

```bash
git push origin claude/wiki-v2-guides
```

- [ ] **Step 2: Confirm with user before merging to master**

Ask: "Branch `claude/wiki-v2-guides` pushed. Ready to merge to master?"

- [ ] **Step 3: Merge on approval**

```bash
git checkout master
git merge claude/wiki-v2-guides --no-ff -m "Merge wiki v2: 12 developer guides + 6 topic extensions"
git push origin master
```
