# server-src-qc

> A standalone offline quest-script compiler tool that parses Metin2 `.quest` Lua files using the embedded Lua lexer and emits compiled quest chunk files into an `object/` directory — this is NOT a server process and NOT a monitoring tool.

## Overview

`qc` (quest compiler) is a command-line executable, not a server. It reads one or more `.quest` source files, tokenises them using the Lua 5.0.3 lexer (`luaX_lex`), validates the quest grammar (quests, states, when-clauses, functions), checks syntax of embedded Lua code via `luaL_loadbuffer`, verifies that all called functions have been declared, and writes the compiled output into a structured `object/` directory tree.

The output files are loaded at runtime by the game process to drive the quest system. Running `qc` is a build-time / pre-deployment step, not an online operation.

## Architecture

`qc` is a single C++ translation unit (`qc.cpp`) plus a CRC32 helper (`crc32.cpp`). It links directly against `liblua` to access the Lua lexer internals (`luaX_setinput`, `luaX_lex`, `luaX_token2str`).

```
.quest files  -->  qc  -->  object/
                              state/<quest_name>          (state map + functions)
                              begin_condition/<quest_name> (start condition)
                              <trigger>/<event>/<quest>.<state>  (when-body scripts)
                              <trigger>/<event>/<quest>.<state>.<n>.script
                              <trigger>/<event>/<quest>.<state>.<n>.when
                              <trigger>/<event>/<quest>.<state>.<n>.arg
```

## Dependencies

- `liblua` — Lua 5.0.3 lexer and `luaL_loadbuffer` for syntax checking.
- C++17 standard library (`<fstream>`, `<sstream>`, `<map>`, `<set>`, `<vector>`).
- POSIX `mkdir` / `sys/stat.h` (or `_mkdir` on Windows).

## Files

| File | Purpose |
|------|---------|
| `qc.cpp` | Entire quest compiler: `parse()` function, `main()`, helper structs, grammar state machine |
| `crc32.h` / `crc32.cpp` | CRC32 hash function (`CRC32`) used to generate numeric state IDs from state names |

## Quest Grammar

A `.quest` file follows the grammar below (using Lua keywords extended with `quest`, `state`, `when`, `with`):

```
quest <name> [with <condition>] do
    state <name> do
        when <event>[.<arg>] [or <event>[.<arg>] ...] [with <condition>] do
            <lua body>
        end
        ...
        function <name>(<args>)
            <lua body>
        end
        ...
    end
    ...
end
```

## Parse State Machine

The parser (`parse()`) walks the token stream using an explicit FSM with the following states:

| State | Description |
|-------|-------------|
| `ST_START` | Waiting for `quest` keyword |
| `ST_QUEST` | Reading quest name |
| `ST_QUEST_WITH_OR_BEGIN` | Optional `with <condition>` then `do` |
| `ST_STATELIST` | Expecting `state` or `end` |
| `ST_STATE_NAME` | Reading state name |
| `ST_STATE_BEGIN` | Expecting `do` |
| `ST_WHENLIST_OR_FUNCTION` | Expecting `when`, `function`, or `end` |
| `ST_WHEN_NAME` | Reading event name (and optional `.arg`) |
| `ST_WHEN_WITH_OR_BEGIN` | Optional `with <condition>` then `do` |
| `ST_WHEN_BODY` | Consuming the Lua body until the matching `end`; tracking nested blocks |
| `ST_FUNCTION_NAME` | Reading function name |
| `ST_FUNCTION_ARG` | Reading argument list |
| `ST_FUNCTION_BODY` | Consuming function body |

## Key Functions

### `parse(char* filename)`

The main compilation function. For each input file:

1. Opens the file and initialises a Lua `ZIO` / `LexState`.
2. Loads `quest_functions` file to pre-register known API function names.
3. Drives the state machine by calling `next(&lexstate)` in a loop.
4. For each `when` body, calls `check_syntax(bodyStr, context)` to validate it as a Lua fragment.
5. Tracks `set_state`/`newstate`/`setstate` calls and verifies that target state names are defined.
6. Tracks function calls and definitions; `CheckUsedFunction()` aborts if any called function is not declared.
7. Emits output files:
   - `object/state/<quest_name>` — Lua table mapping state names to CRC32 numeric IDs, plus quest-local function definitions.
   - `object/begin_condition/<quest_name>` — The optional start condition expression.
   - Per-trigger script, when-condition, and argument files.

### `check_syntax(str, module)`

Calls `luaL_loadbuffer(L, str, size, module)` to verify that an extracted code block is valid Lua. Aborts on syntax error.

### `get_string_crc(str)`

Computes the FNV-1-like CRC32 of a string. Used to assign unique numeric IDs to state names.

### `RegisterDefFunction(fname)` / `RegisterUsedFunction(fname)`

Maintain `function_defs` and `function_calls` sets for the cross-reference check.

### `CheckUsedFunction()`

Aborts compilation if any function name in `function_calls` is not present in `function_defs`.

### `load_quest_function_list(filename)`

Reads a whitespace-delimited list of function names from `quest_functions` and pre-populates `function_defs`.

## `AScript` Struct

```cpp
struct AScript {
    string when_condition;  // optional "with" guard expression
    string when_argument;   // optional argument (e.g. monster VID suffix)
    string script;          // the Lua body
};
```

Used to collect multiple `when` variants for the same event name before flushing to output files.

## `main()`

```
1. Create object/ directory.
2. lua_open() + luaX_init() to initialise the Lua lexer.
3. For each filename in argv[1..]: set g_filename, call parse(argv[i]).
4. lua_close().
```

## Output Directory Structure

| Path | Content |
|------|---------|
| `object/state/<quest>` | Lua source: `<quest>={["start"]=0, ["state1"]=<crc>, ...}` plus `function` definitions |
| `object/begin_condition/<quest>` | `return <condition_expr>` |
| `object/notarget/<event>/<quest>.<state>` | When-body Lua source (no target argument) |
| `object/<entity>/<event>/<quest>.<state>.<n>.script` | When-body Lua source (with target argument) |
| `object/<entity>/<event>/<quest>.<state>.<n>.when` | `return <condition>` guard |
| `object/<entity>/<event>/<quest>.<state>.<n>.arg` | Target argument suffix |
