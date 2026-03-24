# Topic: Quest System

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [Understanding the Quest System](concept-lua-quests)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> End-to-end reference for the Metin2 Rework v3 quest pipeline — from `.quest` source files through the offline compiler (`qc`), the server-side Lua runtime (`CQuestManager`), and the client-side dialog flow (`CPythonQuest` / `uiquest.py`).

> **Source file location:** Lua quest source files (`.quest`) are stored in `server/share/locale/english/quest/` in the server runtime submodule (286 quest files). The `qc` compiler is run from that directory via `make.py` and emits compiled chunks to the `object/` subdirectory. See [server-src-qc](server-src-qc) for compiler architecture details.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Quest Script Format](#2-quest-script-format)
3. [Quest Compiler (qc)](#3-quest-compiler-qc)
4. [Quest States and Triggers](#4-quest-states-and-triggers)
5. [Quest API — Lua Functions](#5-quest-api--lua-functions)
6. [Quest Variables](#6-quest-variables)
7. [Quest Window (Client)](#7-quest-window-client)
8. [Packets](#8-packets)
9. [Key Files](#9-key-files)

---

## 1. Overview

The Metin2 quest system is a **Lua 5.0.3-based scripting engine** integrated into the game server. Quest designers write `.quest` source files that combine a custom domain-specific grammar (state machines with `quest`/`state`/`when` keywords) with ordinary Lua logic. These source files are compiled offline by the `qc` tool into a directory tree of Lua chunks. At runtime the `game` server process loads those chunks, drives them through `CQuestManager`, and communicates dialog results back to clients over a dedicated packet channel.

### High-Level Data Flow

```
   Author writes .quest files
           │
           ▼
   qc (quest compiler)          ← uses liblua lexer + luaL_loadbuffer
           │  emits
           ▼
   object/                      ← compiled Lua chunks on disk
     state/<quest>
     begin_condition/<quest>
     <trigger>/<event>/<quest>.<state>[.<n>.script/.when/.arg]
           │
           │  loaded at game start
           ▼
   CQuestManager (game process)  ← Lua 5.0.3 interpreter (liblua)
           │  fires events, runs scripts, suspends coroutines
           ▼
   CLIENT  ←──GC_QUEST packets──  game server
           │  answers, input
           ▼
   CPythonQuest / uiquest.py     ← Python quest dialog window
```

---

## 2. Quest Script Format

### 2.1 File Layout

A `.quest` file is plain text with a `.quest` extension. It may contain any number of top-level `quest` blocks. Each `quest` block defines a named finite state machine.

```lua
quest <name> [with <condition>] do
    state <state_name> do
        when <trigger>[.<arg>] [or <trigger>[.<arg>] ...] [with <condition>] do
            -- Lua body
        end

        function <func_name>(<params>)
            -- Lua body
        end
    end

    state <other_state> do
        -- ...
    end
end
```

### 2.2 Minimal Example

```lua
quest tutorial_quest do
    state start do
        when 20001.chat."Hello" do
            say("Hello, adventurer!")
            say("Do you want to begin the tutorial?")
            local answer = select("Yes", "No")
            if answer == 1 then
                set_state("in_progress")
            else
                say("Come back when you are ready.")
            end
        end
    end

    state in_progress do
        when kill with pc.level >= 5 do
            say("You have proven yourself!")
            set_state("complete")
        end
    end

    state complete do
        when 20001.chat."Talk" do
            say("Quest complete. Here is your reward.")
            pc.give_exp2(1, 5000)
            pc.give_item2(1001, 1)
        end
    end
end
```

### 2.3 `quest` Block

| Clause | Required | Description |
|--------|----------|-------------|
| `quest <name>` | Yes | Defines the quest identifier. Must be unique. |
| `with <condition>` | No | Lua expression (`return <expr>`) written into `object/begin_condition/<name>`. The server evaluates it to decide whether this quest is available for a character. |
| `do … end` | Yes | Delimits the quest body. |

### 2.4 `state` Block

| Clause | Required | Description |
|--------|----------|-------------|
| `state <name>` | Yes | Names the state. The state `start` is the entry state; its CRC32 numeric ID is always `0`. |
| `do … end` | Yes | Delimits the state body (contains `when` and `function` clauses). |

### 2.5 `when` Clause

The `when` clause binds a Lua body to one or more game event triggers.

```lua
when <event>[.<arg>] [or <event>[.<arg>] ...] [with <condition>] do
    <lua body>
end
```

- **`<event>`** — A trigger name (see [Section 4](#4-quest-states-and-triggers)). Examples: `login`, `kill`, `levelup`, `20001.chat."Start Quest"`.
- **`<arg>`** — An optional dot-separated argument qualifying the event; typically a NPC vnum and a chat button label.
- **`or`** — Multiple triggers can share the same body.
- **`with <condition>`** — An additional Lua guard expression evaluated before running the body.

### 2.6 `function` Clause

Defines a quest-local Lua function callable from any `when` body inside the same quest:

```lua
function reward_player()
    pc.give_exp2(1, 1000)
    pc.give_item2(27001, 1)
end
```

### 2.7 State Transition

Use `set_state("<name>")` (also aliased as `newstate` and `setstate`) inside a `when` body to advance the quest FSM:

```lua
when kill do
    if pc.count_item(30001) >= 10 then
        set_state("complete")
    end
end
```

---

## 3. Quest Compiler (qc)

### 3.1 Role

`qc` is a standalone command-line binary (not a server process). It is a **build-time / pre-deployment tool**: run it whenever `.quest` files change. The game process reads the compiled output at startup.

```
qc  questfile1.quest  questfile2.quest  ...
```

Compiled files are written into an `object/` subdirectory relative to the working directory.

### 3.2 Architecture

`qc` consists of two translation units:

| File | Role |
|------|------|
| `server-src/qc/qc.cpp` | Entire compiler: `parse()`, `main()`, grammar FSM, output emitter |
| `server-src/qc/crc32.cpp` | CRC32 helper used to generate numeric state IDs from state name strings |

It links directly against `server-src/liblua` to reuse the Lua lexer (`luaX_setinput`, `luaX_lex`, `luaX_token2str`) and to syntax-check extracted Lua bodies with `luaL_loadbuffer`.

### 3.3 Compilation Steps

For each input file `parse(filename)` performs the following:

1. Opens the file and initialises a `ZIO` / `LexState` pointing at the raw bytes.
2. Loads the `quest_functions` whitelist file to pre-register known API function names as declared (`function_defs`).
3. Drives the parser FSM (see 3.4) by calling `next(&lexstate)` in a loop until EOF.
4. For each extracted `when` body, calls `check_syntax(body, context)` which runs `luaL_loadbuffer` — aborting the compile on any Lua syntax error.
5. Tracks calls to `set_state`/`newstate`/`setstate` and verifies the target state names are defined within the same quest.
6. Accumulates function calls in `function_calls`; after the file is fully parsed, `CheckUsedFunction()` aborts if any called name is absent from `function_defs`.
7. Emits all output files.

### 3.4 Parser FSM States

| State | Description |
|-------|-------------|
| `ST_START` | Waiting for the `quest` keyword |
| `ST_QUEST` | Reading the quest name token |
| `ST_QUEST_WITH_OR_BEGIN` | Optional `with <condition>` then expects `do` |
| `ST_STATELIST` | Expects `state` or `end` |
| `ST_STATE_NAME` | Reading the state name token |
| `ST_STATE_BEGIN` | Expects `do` |
| `ST_WHENLIST_OR_FUNCTION` | Expects `when`, `function`, or `end` |
| `ST_WHEN_NAME` | Reading event name (and optional `.arg`) |
| `ST_WHEN_WITH_OR_BEGIN` | Optional `with <condition>` then expects `do` |
| `ST_WHEN_BODY` | Consuming the Lua body until the matching `end`; counts nested blocks |
| `ST_FUNCTION_NAME` | Reading function name |
| `ST_FUNCTION_ARG` | Reading argument list |
| `ST_FUNCTION_BODY` | Consuming function body |

### 3.5 Output Directory Structure

| Path | Content |
|------|---------|
| `object/state/<quest>` | Lua source: `<quest>={["start"]=0, ["state1"]=<crc32>, ...}` plus compiled quest-local function definitions |
| `object/begin_condition/<quest>` | `return <condition_expr>` — optional begin guard |
| `object/notarget/<event>/<quest>.<state>` | When-body Lua source for triggers with no argument |
| `object/<trigger>/<event>/<quest>.<state>.<n>.script` | When-body Lua source for triggers with an argument |
| `object/<trigger>/<event>/<quest>.<state>.<n>.when` | `return <condition>` guard for that variant |
| `object/<trigger>/<event>/<quest>.<state>.<n>.arg` | The argument suffix (e.g. NPC vnum) for that variant |

State names are converted to numeric IDs using **CRC32** (`get_string_crc`). The `start` state always gets ID `0`.

### 3.6 `quest_functions` Whitelist

`qc` reads a file named `quest_functions` (whitespace-delimited function names) and pre-populates `function_defs`. This prevents false-positive "undeclared function" errors for the entire Lua quest API exposed by `CQuestManager`.

---

## 4. Quest States and Triggers

### 4.1 State Machine Model

Every quest is a FSM. At any moment a character's progress in a given quest is stored as one current **state name** (resolved to its CRC32 ID). The quest begins in state `start`. `set_state("X")` transitions to state `X`. Multiple quests can be active simultaneously for the same character.

### 4.2 Event Types

`CQuestManager` maps each game event to a directory name under `object/`. The event types defined in `quest.h` / `questmanager.h`:

| Constant | Directory / Trigger name | When it fires |
|----------|--------------------------|---------------|
| `QUEST_CLICK_EVENT` | `npc` | Player left-clicks an NPC |
| `QUEST_KILL_EVENT` | `kill` | Player kills a monster |
| `QUEST_TIMER_EVENT` | `timer` | Per-character named timer fires |
| `QUEST_LEVELUP_EVENT` | `levelup` | Player's level increases |
| `QUEST_LOGIN_EVENT` | `login` | Player logs into the game world |
| `QUEST_LOGOUT_EVENT` | `logout` | Player disconnects / logs out |
| `QUEST_ITEM_USE_EVENT` | `item` | Player uses an item |
| `QUEST_ENTER_STATE_EVENT` | `enter` | Quest transitions into a state |
| `QUEST_TARGET_EVENT` | `target` | Target indicator event |
| `QUEST_PARTY_KILL_EVENT` | `partykill` | Any party member kills a monster |

### 4.3 Common `when` Trigger Examples

```lua
-- NPC click: NPC vnum 20001
when 20001.click do ... end

-- Chat option on NPC 20001
when 20001.chat."Accept Quest" do ... end

-- Kill monster vnum 101
when 101.kill do ... end

-- Kill any monster while in quest
when kill do ... end

-- Character levels up to exactly 10
when levelup with pc.level == 10 do ... end

-- Player logs in
when login do ... end

-- Named timer fires
when timer.my_timer do ... end

-- Item use (item vnum 30001)
when 30001.use do ... end

-- Quest enters a specific state
when enter do ... end
```

### 4.4 `with` Guard Expressions

A `with` guard is evaluated as `return <expr>`. If it returns false/nil the trigger body is skipped.

```lua
when kill with pc.level >= 20 and pc.count_item(30001) < 5 do
    -- only runs if level >= 20 AND fewer than 5 of item 30001
end
```

Guards can also appear on the `quest` block itself to gate whether the quest is even offered to a character:

```lua
quest elite_quest with pc.level >= 50 do
    state start do ... end
end
```

---

## 5. Quest API — Lua Functions

`CQuestManager` registers all game API functions into the Lua state at startup. The following tables describe the standard API available inside any `when` body or quest-local `function`.

### 5.1 Dialog / Interaction

| Function | Returns | Description |
|----------|---------|-------------|
| `say(text)` | — | Appends a line of NPC dialog text. The client displays it in the quest dialog window. Multiple calls accumulate before showing. |
| `say_item(vnum, count)` | — | Appends an item icon + name line to the dialog. |
| `select(opt1, opt2, ...)` | `int` | Shows a multi-choice dialog. Suspends the coroutine until the player picks. Returns the 1-based index of the chosen option. |
| `select_table(tbl)` | `int` | Like `select` but takes a Lua table of strings. |
| `input()` | `string` | Prompts the player for free-text input. Suspends the coroutine; returns the typed string. |
| `confirm(msg, timeout)` | `int` | Shows a yes/no confirmation dialog to the target player. Returns 1 for yes, 0 for no/timeout. |
| `wait()` | — | Suspends the coroutine indefinitely (used with timer-based resumption). |
| `chat(message)` | — | Makes the NPC say a message in chat bubble. |
| `notice(message)` | — | Broadcasts a server-wide notice message. |
| `number_input(min, max)` | `int` | Prompts the player for a numeric input within [min, max]. |

### 5.2 `pc.*` — Player Character Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `pc.get_name()` | `string` | Character name. |
| `pc.get_level()` | `int` | Current level. |
| `pc.level` | `int` | Shorthand for `pc.get_level()`. |
| `pc.get_job()` | `int` | Job class index (0=Warrior, 1=Assassin, 2=Sura, 3=Shaman). |
| `pc.get_empire()` | `int` | Empire index (1=Red, 2=Yellow, 3=Blue). |
| `pc.get_exp()` | `int` | Current experience points. |
| `pc.give_exp(multiplier, base_exp)` | — | Awards experience. |
| `pc.give_exp2(multiplier, base_exp)` | — | Awards experience (alternate formula). |
| `pc.get_gold()` | `int` | Current yang (gold). |
| `pc.give_gold(amount)` | — | Gives the player yang. |
| `pc.lose_gold(amount)` | — | Removes yang from the player. |
| `pc.get_hp()` | `int` | Current HP. |
| `pc.get_max_hp()` | `int` | Maximum HP. |
| `pc.get_sp()` | `int` | Current SP (mana). |
| `pc.get_max_sp()` | `int` | Maximum SP. |
| `pc.heal(amount)` | — | Restores HP. |
| `pc.give_item2(vnum, count)` | `bool` | Gives the player `count` of item `vnum`. Returns true on success. |
| `pc.remove_item(vnum, count)` | `bool` | Removes `count` of item `vnum` from inventory. |
| `pc.count_item(vnum)` | `int` | Returns how many of item `vnum` the player has. |
| `pc.warp(x, y)` | — | Warps the player to map-local coordinates `(x, y)`. |
| `pc.warp_to_village()` | — | Warps to the player's empire village. |
| `pc.get_map_index()` | `int` | Returns the current map index. |
| `pc.get_pos()` | `int, int` | Returns `(x, y)` map-local coordinates. |
| `pc.set_flag(name, value)` | — | Sets a named integer quest flag on the player. |
| `pc.get_flag(name)` | `int` | Gets a named integer quest flag (0 if unset). |
| `pc.setqf(name, value)` | — | Alias for `pc.set_flag`. |
| `pc.getqf(name)` | `int` | Alias for `pc.get_flag`. |
| `pc.is_polymorphed()` | `bool` | True if the player is polymorphed. |
| `pc.get_skill_level(vnum)` | `int` | Skill level for the given skill vnum. |
| `pc.add_affect(type, value, duration)` | — | Applies a buff/debuff affect. |
| `pc.remove_affect(type)` | — | Removes a specific affect. |
| `pc.has_affect(type)` | `bool` | True if the player has a specific affect active. |
| `pc.kill()` | — | Kills the player character instantly. |
| `pc.get_sex()` | `int` | 0 = male, 1 = female. |
| `pc.get_pid()` | `int` | Persistent player ID. |
| `pc.get_playtime()` | `int` | Total playtime in minutes. |

### 5.3 `npc.*` — NPC / Target Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `npc.get_vnum()` | `int` | Race/vnum of the NPC that triggered the event. |
| `npc.get_name()` | `string` | NPC name. |
| `npc.get_vid()` | `int` | Virtual ID (VID) of the NPC. |
| `npc.get_level()` | `int` | NPC level. |
| `npc.is_pc()` | `bool` | True if the target is a player character. |
| `npc.is_npc()` | `bool` | True if the target is an NPC. |
| `npc.get_pos()` | `int, int` | Returns `(x, y)` of the NPC. |
| `npc.spawn(vnum, x, y)` | — | Spawns a monster at the given coordinates. |
| `npc.spawn_group(vnum, x, y)` | — | Spawns a monster group. |
| `npc.kill()` | — | Kills the targeted NPC/mob. |
| `npc.chat(message)` | — | Makes the NPC say a chat bubble message. |

### 5.4 `item.*` — Item Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `item.get_vnum()` | `int` | Vnum of the item that triggered the use event. |
| `item.get_name()` | `string` | Name of the triggering item. |
| `item.get_count()` | `int` | Stack count of the triggering item. |
| `item.remove(count)` | — | Removes `count` copies of the item. |
| `item.get_socket(n)` | `int` | Value of socket `n` (0-indexed). |
| `item.set_socket(n, value)` | — | Sets socket `n` to `value`. |
| `item.get_attribute_type(n)` | `int` | Attribute type of the nth attribute. |
| `item.get_attribute_value(n)` | `int` | Attribute value of the nth attribute. |
| `item.set_attribute(n, type, value)` | — | Sets attribute `n` to `(type, value)`. |

### 5.5 `party.*` — Party Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `party.is_party()` | `bool` | True if the player is in a party. |
| `party.get_size()` | `int` | Number of party members. |
| `party.is_leader()` | `bool` | True if the current character is the party leader. |
| `party.get_leader_pid()` | `int` | PID of the party leader. |
| `party.give_exp(multiplier, base_exp)` | — | Distributes experience to all party members. |
| `party.give_item2(vnum, count)` | — | Gives an item to all party members. |
| `party.near_count(range)` | `int` | Number of party members within `range` units. |

### 5.6 `guild.*` — Guild Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `guild.get_name()` | `string` | Name of the player's guild, or `""`. |
| `guild.get_member_count()` | `int` | Number of guild members. |
| `guild.get_level()` | `int` | Guild level. |
| `guild.give_exp(amount)` | — | Awards guild EXP. |
| `guild.is_any_conflict()` | `bool` | True if the guild is at war. |

### 5.7 Dungeon / World Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `dungeon.set_exit_location(mapIdx, x, y)` | — | Sets dungeon exit warp point. |
| `dungeon.jump_all_to_exit()` | — | Warps all dungeon participants to the exit. |
| `dungeon.kill_all()` | — | Kills all monsters in the dungeon. |
| `dungeon.spawn_mob(vnum, x, y)` | — | Spawns a mob in the dungeon. |
| `dungeon.is_use_potion_blocked()` | `bool` | True if potion use is restricted. |
| `dungeon.set_flag(name, value)` | — | Sets a dungeon-scoped integer flag. |
| `dungeon.get_flag(name)` | `int` | Gets a dungeon-scoped flag. |

### 5.8 Timer Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `set_timer(name, seconds)` | — | Starts a per-character named timer. After `seconds` the `timer.<name>` event fires. |
| `clear_timer(name)` | — | Cancels a pending named timer. |

### 5.9 Utility Functions

| Function | Returns | Description |
|----------|---------|-------------|
| `set_state(name)` | — | Transitions the quest FSM to state `name`. |
| `end_quest()` | — | Marks the quest complete and removes it from the character's active quest list. |
| `done_quest(name)` | — | Marks quest `name` as done. |
| `is_quest_started(name)` | `bool` | True if quest `name` has been started for this character. |
| `is_quest_done(name)` | `bool` | True if quest `name` has been completed. |
| `get_quest_flag(name)` | `int` | Global quest flag read. |
| `set_quest_flag(name, value)` | — | Global quest flag write. |
| `server_timer(name, seconds)` | — | Starts a server-global (not per-character) timer. |
| `server_clear_timer(name)` | — | Cancels a server-global timer. |
| `server_get_flag(name)` | `int` | Reads a server-global integer flag. |
| `server_set_flag(name, value)` | — | Writes a server-global integer flag. |
| `setskin(skin_const)` | — | Sets the quest dialog skin / window style sent to the client. |
| `settitle(text)` | — | Sets the quest dialog title bar text. |
| `get_time()` | `int` | Returns current server Unix timestamp. |
| `abs(n)` | `int` | Absolute value. |
| `number(min, max)` | `int` | Returns a random integer in `[min, max]`. |
| `in_dungeon()` | `bool` | True if the player is inside a dungeon. |
| `horse_summon()` | — | Summons the player's horse. |
| `horse_unsummon()` | — | Unsummons the player's horse. |

---

## 6. Quest Variables

### 6.1 Variable Scopes

The quest system provides four distinct variable scopes:

| Scope | Storage | Persistence | API |
|-------|---------|-------------|-----|
| **Lua local** | Lua coroutine stack | Session only (lost on relog or coroutine end) | Standard Lua `local` |
| **PC quest flags** | `SetQuestFlag` / `GetQuestFlag` on `CHARACTER` | Persistent (saved to DB per character) | `pc.set_flag(name, val)` / `pc.get_flag(name)` |
| **Server flags** | Server-wide integer table | In-memory, lost on restart unless persisted | `server_set_flag(name, val)` / `server_get_flag(name)` |
| **Dungeon flags** | `CDungeon` instance | Instance lifetime only | `dungeon.set_flag(name, val)` / `dungeon.get_flag(name)` |

### 6.2 PC Quest Flags

PC quest flags are named integer values stored per character. The name format is conventionally `<quest_name>.<flag_name>`:

```lua
-- Store how many wolves the player has killed
pc.set_flag("wolf_hunt.count", pc.get_flag("wolf_hunt.count") + 1)

-- Check it
if pc.get_flag("wolf_hunt.count") >= 10 then
    say("You have killed enough wolves!")
    set_state("complete")
end
```

Flags are persisted to the database and survive relogs. They are distinct from the quest's current state (which is also stored per-character).

### 6.3 Lua Locals

Standard Lua `local` variables live only within the current coroutine execution. They are lost when the coroutine suspends and the player disconnects before resuming. Use PC quest flags for any value that must survive across relogs:

```lua
when 20001.chat."Count" do
    local count = pc.get_flag("myquest.count")  -- persistent
    local temp = count * 2                        -- local only
    say("You have " .. count .. " items.")
end
```

### 6.4 Server-Global Flags

Server flags are shared across all characters and all map instances. They are useful for server events:

```lua
-- Enable a global event
server_set_flag("halloween_event.active", 1)

-- Check it in any quest
when login do
    if server_get_flag("halloween_event.active") == 1 then
        say("The Halloween event is running!")
    end
end
```

---

## 7. Quest Window (Client)

### 7.1 Architecture

The client-side quest dialog system involves three layers:

```
CQuestManager (server)
      │  GC_QUEST_INFO packet (text + choices)
      ▼
CPythonQuest  (UserInterface/PythonQuest.h/.cpp)
      │  Python module: quest.*
      ▼
uiquest.py — QuestDialog
      │  inherits ui.ScriptWindow
      ▼
UIScript/QuestWindow.py  (layout definition)
```

### 7.2 `CPythonQuest` (C++ module `quest`)

`CPythonQuest` is a singleton registered as the `quest` Python module. It stores the current quest state received from the server and exposes it to Python scripts.

Key Python-accessible functions (registered in `UserInterface/PythonQuestModule.cpp`):

| Python call | Description |
|-------------|-------------|
| `quest.GetQuestCount()` | Number of active quests in the quest log. |
| `quest.GetQuestName(index)` | Name string for the quest at `index`. |
| `quest.GetQuestCurrentState(index)` | Current state name string. |
| `quest.GetQuestLastTime(index)` | Remaining timer value (for time-limited quests). |
| `quest.GetQuestIndex(index)` | Internal quest index. |
| `quest.IsQuest(questIndex)` | True if the quest is in the active list. |
| `quest.GetQuestCount()` | Total active quest count. |

### 7.3 `QuestDialog` (`uiquest.py`)

`QuestDialog` is the modal Python window that displays server-pushed dialog text and answer buttons.

| Method | Description |
|--------|-------------|
| `__init__(self)` | Loads the quest dialog layout from UIScript. |
| `Open(self, skin, index)` | Shows the dialog with the given window skin; registers the quest interaction index. |
| `Close(self)` | Hides the window and sends a close packet to the server. |
| `CloseSelf(self)` | Internal close without sending a network packet. |
| `AppendQuest(self, buttonName, ...)` | Appends an answer button with label `buttonName`. |
| `OnClickAnswerButton(self, index)` | Sends the chosen answer index back to the server via `net.SendScriptAnswerPacket(index)`. |

### 7.4 NPC Dialog Flow

The complete interaction sequence when a player clicks an NPC that has a `when click` handler:

```
1. Player left-clicks NPC
       │
2. Client sends CG_ATTACK (or interaction packet) to server
       │
3. Server: CInputMain receives packet
       │
4. CQuestManager::RunEvent(QUEST_CLICK_EVENT, pc, npc, 0)
       │
5. Server loads and executes object/npc/<event>/<quest>.<state>.script
       │
6. Lua script calls say(), select(), etc.
       │  say() → suspends coroutine, sends GC_QUEST_INFO to client
       ▼
7. Client: CPythonNetworkStream::RecvQuestInfoPacket()
       │  updates CPythonQuest, calls Python handler
       ▼
8. uiquest.py QuestDialog.Open()  ← displays dialog window
       │
9. Player clicks answer button
       │
10. QuestDialog.OnClickAnswerButton(index)
        │  calls net.SendScriptAnswerPacket(index)
        ▼
11. Server: CQuestManager::Resume(pc, reply)
        │  resumes Lua coroutine with player's reply
        ▼
12. Loop back to step 6 until quest body returns
        │  (or player disconnects → coroutine destroyed)
        ▼
13. Quest body returns → dialog closed
```

### 7.5 Suspend States

`QuestState::suspend_state` tracks what kind of input the coroutine is waiting for:

| Constant | Value | Cause | Client Behaviour |
|----------|-------|-------|-----------------|
| `SUSPEND_STATE_NONE` | 0 | Not suspended | — |
| `SUSPEND_STATE_PAUSE` | 1 | `say()` with no choice | "Next" button only |
| `SUSPEND_STATE_SELECT` | 2 | `select(...)` | Multiple labelled answer buttons |
| `SUSPEND_STATE_INPUT` | 3 | `input()` | Text input field |
| `SUSPEND_STATE_CONFIRM` | 4 | `confirm(...)` | Yes / No buttons |
| `SUSPEND_STATE_SELECT_ITEM` | 5 | Item-select dialog | Item grid picker |

### 7.6 Quest Log (Character Window)

Active quests also appear in the Quest tab of `uicharacter.py`. The `CharacterWindow.RefreshQuest()` method calls `quest.GetQuestCount()` and iterates through each quest entry via `quest.GetQuestName(i)`, `quest.GetQuestCurrentState(i)`, and `quest.GetQuestLastTime(i)` to populate the quest list widget.

---

## 8. Packets

### 8.1 Client → Server (CG_*)

| Packet | Module | Description |
|--------|--------|-------------|
| `CG_SCRIPT_ANSWER` | `CInputMain` | Player selects an answer in a dialog. Payload: `answer` (byte index). Sent by `net.SendScriptAnswerPacket(answer)`. |
| `CG_QUEST_INPUT_STRING` | `CInputMain` | Player submits free-text input for `input()`. Payload: null-terminated string (max 255 chars). Sent by `net.SendQuestInputStringPacket(string)`. |
| `CG_QUEST_CONFIRM` | `CInputMain` | Player responds to a `confirm()` prompt. Payload: `answer` (byte: 1=yes, 0=no), `pid` (DWORD: the PID of the requester). Sent by `net.SendQuestConfirmPacket(answer, pid)`. |

### 8.2 Server → Client (GC_*)

| Packet | Handler | Description |
|--------|---------|-------------|
| `GC_QUEST_INFO` | `RecvQuestInfoPacket` | Pushes quest dialog text and choices to the client. Contains: quest index, title, body text, answer list, suspend type, remaining time. |
| `GC_QUEST_INFO` (update) | `RecvQuestInfoPacket` | Updates an existing quest's state display (state name, timer). |
| `GC_QUEST_CLEAR` | `RecvQuestClearPacket` | Removes a quest from the active quest list on the client (quest done or abandoned). |
| `GC_SCRIPT` | `RecvScriptPacket` | The raw NPC dialog script delivery packet; contains the Lua-driven dialog page for the current interaction. |
| `GC_SCRIPT_SELECT_ITEM` | `RecvScriptSelectItemPacket` | Asks the client to display an item-selection grid for `SUSPEND_STATE_SELECT_ITEM`. |

### 8.3 Packet Flow for `select()`

```
Server Lua:  local answer = select("A", "B", "C")
                    │  CQuestManager suspends coroutine (SUSPEND_STATE_SELECT)
                    │  builds GC_QUEST_INFO with options ["A","B","C"]
                    ▼
Client:      RecvQuestInfoPacket() → CPythonQuest updates dialog data
                    │  → QuestDialog.AppendQuest("A") / ("B") / ("C")
                    │  → QuestDialog shown
                    ▼
Player:      clicks "B"
                    │
Client:      QuestDialog.OnClickAnswerButton(2)
             → net.SendScriptAnswerPacket(2)
                    │
Server:      CInputMain receives CG_SCRIPT_ANSWER
             → CQuestManager::Resume(pc, 2)
             → Lua: answer = 2
```

---

## 9. Key Files

| File | Repository | Role |
|------|-----------|------|
| `server-src/qc/qc.cpp` | server-src | Quest compiler: parses `.quest` files, emits `object/` tree |
| `server-src/qc/crc32.cpp` | server-src | CRC32 for state name → numeric ID conversion |
| `server-src/game/questmanager.h` | server-src | `CQuestManager` declaration: event dispatch, coroutine management, Lua state |
| `server-src/game/questmanager.cpp` | server-src | `CQuestManager` implementation |
| `server-src/game/quest.h` | server-src | `QuestState` struct, event type constants (`QUEST_CLICK_EVENT`, etc.) |
| `server-src/game/questlua_*.cpp` | server-src | Lua API registrations: `pc.*`, `npc.*`, `item.*`, `party.*`, `guild.*`, etc. |
| `server-src/game/char.h` | server-src | `CHARACTER::SetQuestFlag` / `GetQuestFlag` — per-character flag storage |
| `server-src/liblua/` | server-src | Lua 5.0.3 static library — interpreter, lexer, VM |
| `server-src/game/input_main.cpp` | server-src | `CInputMain`: handles `CG_SCRIPT_ANSWER`, `CG_QUEST_INPUT_STRING`, `CG_QUEST_CONFIRM` |
| `server-src/game/packet_structs.h` | server-src | All `TPacketCG*` / `TPacketGC*` struct definitions including quest packets |
| `client-src/UserInterface/PythonQuest.h` | client-src | `CPythonQuest` class: client-side quest state model |
| `client-src/UserInterface/PythonQuest.cpp` | client-src | `CPythonQuest` implementation |
| `client-src/UserInterface/PythonQuestModule.cpp` | client-src | Registers `quest.*` Python extension module |
| `client-src/UserInterface/PythonNetworkStream.h` | client-src | `SendScriptAnswerPacket`, `SendQuestInputStringPacket`, `SendQuestConfirmPacket` |
| `client-src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | client-src | `RecvQuestInfoPacket`, `RecvQuestClearPacket`, `RecvScriptPacket` handlers |
| `client-bin/assets/root/uiquest.py` | client-bin | `QuestDialog` — Python quest dialog window |
| `client-bin/assets/root/uicharacter.py` | client-bin | `CharacterWindow.RefreshQuest()` — quest log tab |
| `client-bin/assets/uiscript/uiscript/QuestWindow.py` | client-bin | UIScript layout definition for the quest dialog |
| `object/state/<quest>` | runtime output | Lua state-map file (generated by `qc`) |
| `object/begin_condition/<quest>` | runtime output | Begin guard expression (generated by `qc`) |
| `object/<trigger>/<event>/<quest>.<state>[.<n>.*]` | runtime output | Per-trigger Lua script chunks (generated by `qc`) |

---

## See Also

- [server-src-qc](server-src-qc) — Detailed quest compiler internals
- [server-src-game](server-src-game) — `CQuestManager` and `CHARACTER` quest interface within the game subsystem
- [server-src-liblua](server-src-liblua) — Lua 5.0.3 interpreter internals
- [client-src-UserInterface](client-src-UserInterface) — Full network stream and Python module reference
- [client-src-PythonModules](client-src-PythonModules) — Python module registration overview
- [client-bin-root-ui-core](client-bin-root-ui-core) — `uiquest.py` and `uicharacter.py` documentation
