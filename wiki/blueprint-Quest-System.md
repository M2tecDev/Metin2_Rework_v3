# Blueprint: Quest System

> ### 📖 New to this topic?
> This is an advanced reference page. If you are not familiar with the basics yet, read these first:
> - [How Everything Fits Together](concept-architecture)
> - [Understanding the Quest System](concept-lua-quests)
>
> **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture

> Full-stack architecture blueprint for the Lua-based quest engine — from `.quest` source files through the offline `qc` compiler, the server-side `CQuestManager` coroutine runtime, to the client dialog packets and Python UI. Companion to [Quest System](topic-Quest-System).

---

## 1. Full-Stack Architecture

The quest system is a build-time DSL compiler feeding a runtime Lua coroutine engine.

### Layer 1 — Build-Time: Quest Source and Compiler

| File | Class / Tool | Role |
|------|-------------|------|
| `*.quest` files (on-disk, not in repo) | — | Source files containing `quest`/`state`/`when` DSL blocks plus Lua bodies |
| `server-src/qc/qc.cpp` | `parse()`, `main()`, `check_syntax()` | Entire compiler: drives grammar FSM, extracts Lua bodies, verifies API calls, emits `object/` output tree |
| `server-src/qc/crc32.cpp` | `get_string_crc()` | CRC32 helper: converts state name strings to numeric IDs (`start` → always 0) |
| `server-src/liblua/` | Lua 5.0.3 lexer (`luaX_*`), `luaL_loadbuffer` | `qc` links against this to reuse the Lua lexer and syntax-check extracted bodies at compile time |
| `object/` directory (runtime) | — | Output tree: `object/state/<quest>`, `object/<trigger>/<event>/<quest>.<state>.<n>.{script,when,arg}` |

### Layer 2 — Server Runtime Core (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/questmanager.h` | `CQuestManager` | Singleton: owns the Lua state, loads `object/` chunks, manages per-character coroutine contexts |
| `server-src/src/game/questmanager.cpp` | `CQuestManager::RunEvent()` | Looks up the matching compiled chunk for an event; creates/resumes the coroutine |
| `server-src/src/game/questmanager.cpp` | `CQuestManager::Initialize()` | Loads all `object/` chunk files into the Lua state at game startup |
| `server-src/src/game/questmanager.cpp` | `CQuestManager::RegisterAPI()` | Registers all `pc.*`, `npc.*`, `item.*`, `party.*`, `guild.*`, `timer.*` Lua functions |
| `server-src/src/game/questlua.cpp` | All `quest_pc_*`, `quest_npc_*`, `quest_item_*` functions | C implementations of every Lua quest API function |
| `server-src/src/game/quest.h` / `quest.cpp` | `CQuestManager::PC` inner class | Per-character quest state: current state CRC32 for each active quest, named flag map |
| `server-src/src/game/questpc.cpp` | `pc.*` API functions | `pc.give_item2()`, `pc.give_exp()`, `pc.warp()`, `pc.set_flag()`, `pc.count_item()`, etc. |
| `server-src/src/game/questnpc.cpp` | `npc.*` API functions | `npc.spawn()`, `npc.get_vnum()`, `npc.kill()`, etc. |
| `server-src/src/game/questitem.cpp` | `item.*` API functions | `item.remove()`, `item.set_socket()`, `item.set_attribute()`, etc. |
| `server-src/src/game/questcmd.cpp` | `quest_*` global functions | `say()`, `select()`, `input()`, `confirm()`, `wait()`, `set_state()`, `notice()` |
| `server-src/src/game/char.cpp` | `CHARACTER::QuestFire(event, arg)` | Called by game code at runtime; delegates to `CQuestManager::RunEvent(ch, event, arg)` |
| `server-src/src/game/input_main.cpp` | `CInputMain::ScriptAnswer()`, `::QuestInputString()`, `::QuestConfirm()` | Handles `CG::SCRIPT_ANSWER`, `CG::QUEST_INPUT_STRING`, `CG::QUEST_CONFIRM` from client |
| `server-src/src/liblua/` | `lua_State`, `lua_newcoroutine()`, `lua_resume()`, `lua_yield()` | Lua 5.0.3 runtime; each suspended `select()`/`input()` becomes a `lua_yield` point |

### Layer 3 — Network

| Packet | Header | Direction | Payload Summary |
|--------|--------|-----------|----------------|
| `GC::SCRIPT` | `0x0910` | Server→Client | NPC/quest dialog script: subheader (say/select/input), text content |
| `GC::QUEST_CONFIRM` | `0x0911` | Server→Client | Yes/No confirm dialog: NPC VID, message text, timeout |
| `GC::QUEST_INFO` | `0x0912` | Server→Client | Quest log entry: index, name, directory icon, state, timer |
| `CG::SCRIPT_ANSWER` | `0x0901` | Client→Server | Player selected a dialog button: answer index |
| `CG::SCRIPT_BUTTON` | `0x0902` | Client→Server | Player clicked a script button by ID |
| `CG::SCRIPT_SELECT_ITEM` | `0x0903` | Client→Server | Player selected an item in a select-item dialog |
| `CG::QUEST_INPUT_STRING` | `0x0904` | Client→Server | Player typed free text: length + string |
| `CG::QUEST_CONFIRM` | `0x0905` | Client→Server | Player clicked yes/no in confirm dialog: answer byte |
| `CG::QUEST_CANCEL` | `0x0906` | Client→Server | Player dismissed dialog without answering |

### Layer 4 — Client C++

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvScriptPacket()`, `RecvQuestInfoPacket()` | Parse `GC::SCRIPT` / `GC::QUEST_INFO`; call Python quest callbacks |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `SendScriptAnswerPacket()`, `SendQuestInputStringPacket()`, `SendQuestConfirmPacket()` | Build and send `CG::SCRIPT_ANSWER`, `CG::QUEST_INPUT_STRING`, `CG::QUEST_CONFIRM` |
| `client-src/src/PythonModules/PythonQuestModule.cpp` | `questGetQuestCount()`, `questGetQuestName()` | Python `quest` C-extension module: exposes active quest list to Python UI |

### Layer 5 — Python UI

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/uiquest.py` | `QuestWindow` | Quest log window: renders active quests with icons, state text, timer countdowns |
| `client-bin/assets/root/uiQuestDialog.py` | `QuestDialog` | NPC dialog window: renders `say()` text, button choices for `select()`, text input for `input()` |
| `client-bin/assets/root/interfacemodule.py` | `Interface.OpenQuestDialog()` | Opens the quest dialog window when `RecvScriptPacket` triggers it |
| `client-bin/assets/root/game.py` | `GameWindow.OnNPCClick()` | Sends `CG::TARGET` then `CG::ON_CLICK` when player left-clicks an NPC to start a quest event |

---

## 2. Causal Chain

### Chain A: Player clicks NPC → dialog displayed → answer sent back

```
[Trigger]  Player left-clicks NPC vnum 20001
    │
    ▼  (root/game.py : GameWindow.OnNPCClick)
[1] Python calls net.SendClickPacket(npcVID)
    │
    ▼  packet: CG::ON_CLICK (0x0A02)
[2] (game/input_main.cpp : CInputMain::Click)
    Finds CHARACTER* for npcVID
    Calls ch->QuestFire(QUEST_CLICK_EVENT, npc->GetRaceNum())
    │
    ▼  (game/questmanager.cpp : CQuestManager::RunEvent)
[3] Finds matching compiled chunk: object/npc/<vnum>/<quest>.<state>.script
    Checks begin_condition and with guard
    Creates new coroutine via lua_newcoroutine()
    Calls lua_resume() → Lua body starts executing
    │
    ▼  Lua body calls say("Hello!") then select("Yes", "No")
    say() → appends text to script buffer
    select() → calls lua_yield() (coroutine suspends)
    │
    ▼  (game/questcmd.cpp : quest_Say, quest_Select serialise the dialog)
[4] Sends to client's DESC:
    packet: GC::SCRIPT (0x0910) — contains all say() lines + select() button labels
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvScriptPacket)
[5] Parses script sub-packets; fires Python callback
    (root/interfacemodule.py : OpenQuestDialog)
    QuestDialog window opens, shows text and Yes/No buttons
    │
    ▼  Player clicks "Yes" (answer = 1)
    (root/uiQuestDialog.py : QuestDialog.OnClickYes)
[6] Python calls net.SendScriptAnswerPacket(1)
    │
    ▼  packet: CG::SCRIPT_ANSWER (0x0901) — answer=1
[7] (game/input_main.cpp : CInputMain::ScriptAnswer)
    Calls CQuestManager::Resume(ch, answer=1)
    lua_resume() → coroutine resumes after lua_yield()
    Lua body continues: if answer == 1 then set_state("in_progress")
    │
    ▼  [End] Quest state updated to "in_progress"; GC::QUEST_INFO sent to update quest log
```

### Chain B: Kill event with condition check → state transition

```
[Trigger]  Player kills monster vnum 101 (mob dies)
    │
    ▼  (game/char_battle.cpp : CHARACTER::Dead → DistributeExp)
[1] Calls killer->QuestFire(QUEST_KILL_EVENT, killed_vnum=101)
    │
    ▼  (game/questmanager.cpp : CQuestManager::RunEvent)
[2] Searches for chunks matching: object/kill/101/<quest>.<state>.{script,when,arg}
    For each matching script:
      Loads .when guard if present → evaluates "return pc.level >= 5"
      If guard passes → lua_resume() on that chunk
    │
    ▼  (game/questpc.cpp : quest_pc_get_level called from guard)
[3] Guard: pc.level >= 5 → if player level < 5 → chunk skipped
    If level >= 5 → Lua body executes:
      say("You have proven yourself!")
      set_state("complete")
    │
    ▼  set_state("complete") calls CQuestManager::PC::SetState(quest, CRC32("complete"))
[4] State persisted: ch->quest_state[quest_name] = CRC32("complete")
    GC::QUEST_INFO sent: updated state text to client
    │
    ▼  [End] Quest log shows "complete" state; quest dialog updates
```

### Chain C: Quest timer fires → coroutine resumes

```
[Trigger]  Lua script called timer.singlestart("my_timer", 60)
    │
    ▼  (game/questlua.cpp : quest_timer_singlestart)
[1] Registers a 60-second event for player PID "my_timer"
    Suspends current coroutine via wait()
    │
    ▼  60 seconds elapse; server event fires
[2] (game/questmanager.cpp : QUEST_TIMER_EVENT fires for PID)
    RunEvent(ch, QUEST_TIMER_EVENT, "my_timer")
    Finds object/timer/<quest>.<state>.script where trigger matches "my_timer"
    lua_resume() → Lua body after wait() continues
    │
    ▼  [End] Timer-triggered Lua code executes; can give rewards, transition states, etc.
```

---

## 3. Dependency Matrix

### Sync Points

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `GC::SCRIPT` subheader values (say=0, select=1, input=2, …) | `game/questcmd.cpp` (enum/constants) | `UserInterface/PythonNetworkStreamPhaseGame.cpp` (RecvScriptPacket switch) | Client displays wrong dialog type; say text shown as input field or vice versa |
| `GC::QUEST_INFO` struct layout (index, name, dir, icon, state, timer) | `game/packet_structs.h` | `UserInterface/Packet.h` | Quest log shows wrong name or icon for entries |
| `CG::SCRIPT_ANSWER.answer` byte meaning (1-based index, 0=cancel) | `game/input_main.cpp` : ScriptAnswer handler | `UserInterface/PythonNetworkStreamPhaseGame.cpp` : SendScriptAnswerPacket | Player selects "Yes" but server receives "No"; wrong dialog branch executes |
| `CG::QUEST_INPUT_STRING` struct (length:2 + string bytes) | `game/packet_structs.h` | `UserInterface/Packet.h` | Server reads wrong string length; `input()` receives garbage text |
| CRC32 state IDs (`start`=0) | `server-src/qc/crc32.cpp` | (compile-time only — not client-visible) | Compiled chunks reference wrong state table; `set_state("X")` maps to wrong numeric ID |
| Quest event directory names (`npc`, `kill`, `timer`, `levelup`, etc.) | `game/questmanager.h` (enum + dir strings) | (compile-time qc output) | `qc` emits chunks to wrong directory; `CQuestManager` never finds the chunk to run |
| `quest_functions` whitelist file vs actual registered API functions | `qc/quest_functions` whitelist | `game/questlua.cpp` function registrations | Functions present in game but missing from whitelist → false compile error; functions in whitelist but not registered → runtime `nil` call crash |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| `QUEST_MAX_NUM` (active quests per player) | (defined in `quest.h`) | `game/quest.h` | Adding quests beyond the limit silently drops new quests; player can't start more |
| State name → CRC32 mapping | CRC32 (32-bit) | `qc/crc32.cpp` | CRC32 collision between two state names in the same quest → both map to the same numeric ID → wrong state loaded |
| `GC::QUEST_INFO` max count per send | Typically sent one-by-one per update | `game/packet_structs.h` | Sending too many quest updates in a single packet burst can overflow the client's ring buffer |
| `say()` text accumulation buffer | String concatenated in Lua state | `game/questcmd.cpp` | Very long NPC scripts (many `say()` calls) build a large single `GC::SCRIPT` packet; `TPacketGCScript.length` is `uint16_t` → max 65535 byte payload |
| Coroutine nesting | No nested coroutine support in Lua 5.0.3 | `liblua/` | Calling `select()` from inside a Lua function called by a Lua function works only if all levels yield to the same root coroutine |
| Named quest flags per player | Map<string, int> in `CQuestManager::PC` | `game/quest.h` | No hard cap but very many flags increase DB save size and quest state serialisation time |

---

## 4. Extension How-To

### How to add a new quest trigger type (e.g. enter-dungeon)

1. **`server-src/src/game/questmanager.h`** — Add a new event constant:
   ```cpp
   QUEST_ENTER_DUNGEON_EVENT = 15,
   ```
2. **`server-src/src/game/questmanager.cpp`** — Add the directory name to the event-to-dir mapping:
   ```cpp
   case QUEST_ENTER_DUNGEON_EVENT: return "dungeon_enter";
   ```
3. **`server-src/src/game/`** — At the correct game code location (e.g. dungeon entry function), call:
   ```cpp
   ch->QuestFire(QUEST_ENTER_DUNGEON_EVENT, dungeonVnum);
   ```
4. **`server-src/qc/qc.cpp`** — Register the new keyword in the parser's trigger-name table so `when dungeon_enter` is recognised.
5. **`server-src/qc/quest_functions`** whitelist — Add any new API functions exposed for this trigger.
6. **`.quest` files** — Quest authors can now write:
   ```lua
   when dungeon_enter.30001 do
       say("Welcome to dungeon 30001!")
   end
   ```

### How to add a new `pc.*` quest API function

1. **`server-src/src/game/questpc.cpp`** — Implement the C function:
   ```cpp
   int quest_pc_get_guild_name(lua_State* L) {
       LPCHARACTER ch = CQuestManager::instance().GetCurrentCharacterPtr();
       if (!ch || !ch->GetGuild()) { lua_pushstring(L, ""); return 1; }
       lua_pushstring(L, ch->GetGuild()->GetName());
       return 1;
   }
   ```
2. **`server-src/src/game/questmanager.cpp`** — Register in `RegisterAPI()`:
   ```cpp
   lua_register(L, "pc_get_guild_name", quest_pc_get_guild_name);
   // or as part of the pc table: set "get_guild_name" in pc metatable
   ```
3. **`server-src/qc/quest_functions`** — Add `pc.get_guild_name` to the whitelist so `qc` doesn't reject quests that call it.
4. **No client changes needed** — Quest API is server-side only.

### How to create a new `.quest` file and deploy it

1. Write the `.quest` source file following the `quest`/`state`/`when` grammar.
2. Run `qc` from the server-side quest directory:
   ```bash
   ./qc my_new_quest.quest
   ```
   Fix any errors (syntax errors in Lua bodies or undefined function calls).
3. Compiled output is emitted to the `object/` directory.
4. Copy `object/` files to the game server's quest object directory.
5. Reload the quest system: either restart the game process or call the GM command (if implemented) to reload `object/` at runtime.

### Controlling Constants

| Constant | File | Controls |
|----------|------|---------|
| `QUEST_*_EVENT` enum | `game/questmanager.h` | All quest trigger type values; determines directory name used for chunk lookup |
| `quest_functions` whitelist | `qc/quest_functions` (text file) | API function names `qc` allows in `.quest` source without a compile error |
| `object/` directory path | `game/questmanager.cpp` (config or hardcoded path) | Where compiled quest chunks are loaded from at startup |
| CRC32 of `"start"` | Always 0 | `qc/qc.cpp` (hardcoded) | The initial state of every quest FSM; never rename the first state away from `start` |
| `QUEST_MAX_NUM` | `game/quest.h` | Maximum number of simultaneously active quests per character |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| `sys_err: CQuestManager: cannot find script for event X` | Compiled chunk not present in `object/` directory; `qc` was not run after `.quest` edit | Check `object/<trigger>/<vnum>/<quest>.<state>.script` exists on disk |
| `sys_err: lua: attempt to call nil value 'pc.my_new_func'` | New function not registered in `RegisterAPI()` or missing from `quest_functions` whitelist | `game/questmanager.cpp` : `RegisterAPI()` — add the missing registration |
| Quest dialog never opens on NPC click | `QUEST_CLICK_EVENT` chunk not found; NPC vnum does not match any `when <vnum>.click` | Verify NPC vnum in `mob_proto` matches the vnum in the `.quest` file; check `object/npc/<vnum>/` exists |
| `set_state("next_state")` has no effect | Target state name has different CRC32 in runtime vs compiled output; state not defined in the quest | Run `qc` again; verify `object/state/<quest>` lists all state names and their CRC32 IDs |
| `select()` hangs; player stuck in dialog | `CG::SCRIPT_ANSWER` not received; client dialog not sending answer packet | Check client `uiQuestDialog.py` button handler; verify `SendScriptAnswerPacket` is called |
| `input()` returns empty string | `CG::QUEST_INPUT_STRING.length` is 0; client sends empty string | Check `uiQuestDialog.py` input validation; verify `SendQuestInputStringPacket` sends the typed text |
| `pc.give_item2()` returns false; item not given | Inventory full or item vnum not in `item_proto` | `game/questpc.cpp` : `quest_pc_give_item2()` — check return value; verify vnum exists |
| `qc` compile error: `undefined function 'my_func'` | Called function not in `quest_functions` whitelist | Add function name to `server-src/qc/quest_functions` file |
| Quest log not showing updated state | `GC::QUEST_INFO` not sent after `set_state()` | `game/questmanager.cpp` : `RunEvent()` — confirm `SendQuestInfoPacket(ch)` is called after state change |
| Timer never fires | `timer.singlestart()` called but event not scheduled; server event system not running | `game/questlua.cpp` : `quest_timer_singlestart()` — confirm `event_create()` succeeds; check pulse system is healthy |

---

## Related

- **Topic page:** [Quest System](topic-Quest-System) — full API reference, compiler output format, all trigger types
- **Blueprint:** [blueprint-Item-System](blueprint-Item-System) — `item.remove()`, `pc.give_item2()` item data flow
- **Blueprint:** [blueprint-Character-System](blueprint-Character-System) — `pc.add_affect()`, `pc.warp()` character state changes
- **Blueprint:** [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) — `GC::SCRIPT`, `CG::SCRIPT_ANSWER` wire format
- **Calculator:** [Drop Chance Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/drop-chance.html) — compute item drop probability per kill (relevant to `when kill` quest design)
