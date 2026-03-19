# server-src-liblua

> Embedded Lua 5.0.3 scripting engine — the complete interpreter source compiled as a static library for use by the game process and the quest compiler tool.

## Overview

`liblua` is an unmodified (or minimally patched) copy of the Lua 5.0.3 scripting language sources. It is compiled as a static library and linked into both the `game` process (for in-game quest and NPC scripting) and the `qc` quest compiler tool. The game process embeds a `lua_State` and registers C functions that expose all game APIs to Lua quest scripts.

The library provides the complete Lua runtime: lexer, parser, code generator, VM, garbage collector, and standard libraries (base, math, string, table, I/O, debug, loadlib).

## Architecture / Process Role

`liblua` is not a process. It is a static library linked into `game` and `qc`.

- In `game`: a `lua_State` is created at startup, all game API functions are registered as Lua C functions, and quest scripts are loaded and executed via `luaL_loadbuffer` / `lua_pcall`.
- In `qc`: `lua_open()` / `luaX_init()` are called to initialise the Lua lexer so the quest compiler can tokenise `.quest` files using Lua's own tokeniser.

## Dependencies

- C standard library only (`<math.h>`, `<stdio.h>`, `<stdlib.h>`, `<string.h>`, etc.).
- No external dependencies.

## Files

### Public API (`include/`)

| File | Purpose |
|------|---------|
| `lua.h` | Core Lua C API: `lua_State`, `lua_pcall`, `lua_push*`, `lua_to*`, `lua_register`, `lua_open`, `lua_close`, etc. |
| `lauxlib.h` | Auxiliary library helpers: `luaL_loadbuffer`, `luaL_newstate`, `luaL_error`, buffer/registry utilities |
| `lualib.h` | Standard library open functions: `luaopen_base`, `luaopen_math`, `luaopen_string`, `luaopen_table`, `luaopen_io`, `luaopen_debug`, `luaopen_loadlib`, `luaL_openlibs` |

### Internal Implementation (`src/`)

| File | Purpose |
|------|---------|
| `lapi.c` / `lapi.h` | C API implementation — all `lua_*` functions |
| `llex.c` / `llex.h` | Lexer: tokenises Lua source into tokens (`TK_*` constants) |
| `lparser.c` / `lparser.h` | Recursive-descent parser and code generator |
| `lcode.c` / `lcode.h` | Code generation: emits VM instructions |
| `lvm.c` / `lvm.h` | Virtual machine: executes Lua bytecode |
| `ldo.c` / `ldo.h` | Call stack management, protected calls, error handling |
| `lgc.c` / `lgc.h` | Mark-and-sweep garbage collector |
| `lstate.c` / `lstate.h` | `lua_State` structure and global state management |
| `lobject.c` / `lobject.h` | Lua value types (`TObject`, `TValue`), type tags, conversion |
| `lstring.c` / `lstring.h` | Interned string table |
| `ltable.c` / `ltable.h` | Table (hash + array) implementation |
| `lfunc.c` / `lfunc.h` | Lua/C function and closure objects |
| `lmem.c` / `lmem.h` | Memory allocator wrapper |
| `lopcodes.c` / `lopcodes.h` | Bytecode instruction set definitions |
| `ldebug.c` / `ldebug.h` | Debug information, stack traces, error messages |
| `lundump.c` / `lundump.h` | Bytecode dump/undump (pre-compiled chunks) |
| `lzio.c` / `lzio.h` | Buffered I/O streams for the lexer |
| `ltm.c` / `ltm.h` | Tag methods (metamethods) |
| `ltests.c` | Internal test hooks (compiled only in debug builds) |
| `lib/lauxlib.c` | Auxiliary library implementation |
| `lib/lbaselib.c` | Base library: `print`, `error`, `pcall`, `type`, `tostring`, `tonumber`, etc. |
| `lib/lmathlib.c` | Math library: `math.floor`, `math.random`, `math.sin`, etc. |
| `lib/lstrlib.c` | String library: `string.format`, `string.find`, `string.gsub`, etc. |
| `lib/ltablib.c` | Table library: `table.insert`, `table.remove`, `table.sort`, etc. |
| `lib/liolib.c` | I/O library: file reading/writing |
| `lib/ldblib.c` | Debug library |
| `lib/loadlib.c` | Dynamic loader (`require`) |
| `lua/lua.c` | Stand-alone `lua` interpreter executable (not built into the server) |
| `luac/luac.c` | Stand-alone `luac` compiler (not built into the server) |
| `luac/print.c` | Bytecode pretty-printer for `luac` |

## Key API Functions

### Core (`lua.h`)

| Function | Description |
|----------|-------------|
| `lua_open()` | Creates a new `lua_State` |
| `lua_close(L)` | Destroys a `lua_State` and frees all memory |
| `lua_pcall(L, nargs, nresults, errfunc)` | Protected call: calls function on stack; catches errors |
| `lua_call(L, nargs, nresults)` | Unprotected call |
| `lua_register(L, name, f)` | Registers a C function as a global |
| `lua_getglobal(L, name)` | Pushes a global variable onto the stack |
| `lua_setglobal(L, name)` | Pops the top value and assigns it as a global |
| `lua_pushnumber(L, n)` | Pushes a `lua_Number` (double) |
| `lua_pushstring(L, s)` | Pushes a C string |
| `lua_pushboolean(L, b)` | Pushes a boolean |
| `lua_pushnil(L)` | Pushes nil |
| `lua_pushlightuserdata(L, p)` | Pushes a raw pointer |
| `lua_toboolean(L, idx)` | Converts stack value to boolean |
| `lua_tonumber(L, idx)` | Converts stack value to `lua_Number` |
| `lua_tostring(L, idx)` | Converts stack value to C string |
| `lua_type(L, idx)` | Returns the type tag (`LUA_TNIL`, `LUA_TNUMBER`, `LUA_TSTRING`, `LUA_TTABLE`, `LUA_TFUNCTION`, `LUA_TUSERDATA`, `LUA_TBOOLEAN`, `LUA_TLIGHTUSERDATA`) |
| `lua_gettop(L)` | Returns the number of values on the stack |
| `lua_settop(L, idx)` | Sets the stack size |
| `lua_pop(L, n)` | Discards the top `n` values |

### Auxiliary (`lauxlib.h`)

| Function | Description |
|----------|-------------|
| `luaL_loadbuffer(L, buf, size, name)` | Compiles a buffer as a Lua chunk; leaves the function on the stack |
| `luaL_loadfile(L, filename)` | Loads and compiles a Lua source file |
| `luaL_error(L, fmt, ...)` | Raises a Lua error with a formatted message |
| `luaL_checkstring(L, n)` | Asserts argument `n` is a string and returns it |
| `luaL_checknumber(L, n)` | Asserts argument `n` is a number and returns it |
| `luaL_optnumber(L, n, d)` | Returns argument `n` as a number, or `d` if absent |
| `luaL_newstate()` | Creates a new state with the standard allocator |

### Lexer Internal (`src/llex.h`)

Used directly by the `qc` quest compiler to tokenise quest files using Lua's lexer:

| Function | Description |
|----------|-------------|
| `luaX_init(L)` | Initialises the lexer keyword table |
| `luaX_setinput(L, ls, z, source)` | Attaches a `ZIO` stream to a `LexState` |
| `luaX_lex(ls, seminfo)` | Reads and returns the next token |
| `luaX_token2str(ls, token)` | Converts a token code to a display string |

## Version

Lua 5.0.3 — Copyright (C) 1994–2006 Tecgraf, PUC-Rio.
