# Guide: Debugging

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How to read server and client logs, interpret common errors, add temporary debug output, and use gdb / WinDbg to investigate crashes in Metin2 Rework v3.

---

## Prerequisites

- Basic familiarity with the two-process server architecture (`game` + `db`); see [server-src-game](server-src-game) and [server-src-db](server-src-db).
- Understanding of `libthecore`'s logging layer; see [server-src-libthecore](server-src-libthecore).
- Linux shell access with root or `ulimit` capability for core dump configuration.
- On Windows: Visual Studio or WinDbg installed alongside the `.pdb` files produced by a `Debug` or `RelWithDebInfo` build; see [client-src Overview](client-src-overview).

> **Note:** Derived from vanilla Metin2 source — verify against your local Rework v3 files.

---

## Overview

Metin2 Rework v3 produces log output from three distinct layers:

1. **Server-side** (`game` and `db` processes) — written by the `sys_log` / `sys_err` macros in [server-src-libthecore](server-src-libthecore) (`libthecore/log.cpp`), backed by spdlog with a daily-rotating file sink (`syslog_rotate_sink.h`).
2. **Client-side** (Windows executable) — the client writes `syserr.txt` and `syslog.txt` to its working directory and exposes Python-callable trace helpers.
3. **Crash artefacts** — Linux produces core dumps readable by gdb; Windows produces a crash dump (`.dmp`) and can be analysed with WinDbg or the Visual Studio debugger.

---

## Step-by-Step

### 1 — Locate server log files

The `game` and `db` processes write their logs to files in their working directory (the directory from which the binary is launched, typically the channel directory on the server).

| Process | Default log file | Notes |
|---------|-----------------|-------|
| `game` | `syserr` | Errors and warnings; rotated daily by spdlog |
| `game` | `syslog` | Verbose trace output (level-gated) |
| `db` | `syserr` | Errors from the db process |
| `db` | `syslog` | Verbose db trace output |

`log_init()` in `libthecore/log.cpp` sets up these sinks at process start. `log_destroy()` flushes and closes them on shutdown.

---

### 2 — Understand the logging macros

`libthecore/log.h` exposes two macros used throughout the server source:

```cpp
sys_log(level, fmt, ...)   // Verbose trace; 0 = most verbose
sys_err(fmt, ...)          // Error; writes to syserr with file/line via std::source_location
```

**Level conventions for `sys_log`:**

| Level | Conventional use |
|-------|-----------------|
| `0` | High-frequency per-packet / per-character trace (very noisy) |
| `1` | Subsystem lifecycle events (connect, disconnect, load, save) |
| `2` | Significant in-game events (level-up, item create, quest transition) |
| `3+` | Rarely used; implementation-defined per subsystem |

`sys_err` always writes to the `syserr` file and includes source file name and line number automatically via `std::source_location` (C++20). It does not gate on a level.

---

### 3 — Add temporary debug output

To add a temporary trace to a server source file:

```cpp
// In any .cpp that includes libthecore/log.h (directly or via stdafx.h):
sys_log(0, "DEBUG char=%s hp=%d", ch->GetName(), ch->GetPoint(POINT_HP));
```

For errors that should always appear in the syserr file:

```cpp
sys_err("Unexpected item vnum %u in slot %d", dwVnum, iSlot);
```

Remove all temporary `sys_log(0, ...)` calls before building for production — level-0 output can flood the log on live servers.

---

### 4 — Read client log files

The client writes two text files to its working directory (the folder containing `Metin2_<Config>.exe`):

| File | Content |
|------|---------|
| `syserr.txt` | Errors from C++ engine code and Python exception traces |
| `syslog.txt` | General informational output from the C++ engine |

These files are appended on each client run and are not automatically rotated. Check `syserr.txt` first when the client crashes at startup or during loading.

---

### 5 — Python-side debug output

The embedded Python 3 interpreter exposes debug helpers via the `dbg` module (registered in `UserInterface/UserInterface.cpp`):

```python
import dbg

dbg.TraceError("Something went wrong: " + str(value))  # Writes to syserr.txt
dbg.Trace("Informational message\n")                    # Writes to syslog.txt
```

These are the primary tools for debugging Python UI scripts. Use `dbg.TraceError` for unexpected conditions; use `dbg.Trace` for temporary flow tracing (remove before shipping).

To enable more verbose output from a Python module, add `dbg.Trace` calls at the entry of each function you want to trace:

```python
def OnClickItem(self, slot):
    dbg.Trace("OnClickItem slot=%d\n" % slot)
    # ... existing code ...
```

---

### 6 — Enable and capture Linux core dumps

By default the OS limits core file size to zero. Run the following before starting a game or db process:

```bash
ulimit -c unlimited
```

To make this permanent for a service account, add the above line to the user's `.bashrc` or the init script that launches the server.

Core dumps are written to the current working directory by default (the file is named `core` or `core.<pid>` depending on `/proc/sys/kernel/core_pattern`).

---

### 7 — Analyse a core dump with gdb

Build the server in `RelWithDebInfo` or `Debug` configuration (CMake) so that the binary retains debug symbols:

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo
cmake --build build
```

Then load the core dump:

```bash
gdb ./game core
```

Or attach to a running process by PID:

```bash
gdb ./game <pid>
```

**Key gdb commands:**

| Command | Purpose |
|---------|---------|
| `bt` | Print the call stack (backtrace) of the current thread |
| `bt full` | Print the full backtrace with local variables for each frame |
| `thread apply all bt` | Print backtraces for all threads |
| `frame N` | Switch to stack frame number N |
| `info registers` | Display CPU register values at the crash point |
| `print variable` | Print a variable or expression |
| `list` | Show source lines around the current frame |
| `info locals` | List all local variables in the current frame |
| `up` / `down` | Move one frame up or down the stack |

**Reading a Metin2 server backtrace:**

The server is single-threaded (driven by `thecore_idle`). A typical crash backtrace will show:

```
#0  <crash site — e.g. inside CHARACTER::Damage or ITEM_MANAGER::CreateItem>
#1  <caller>
#N  thecore_idle        <- the main event loop
#N+1 main
```

Start at frame 0 and work upward. Look for the first frame inside your own code (not inside a system call or the C++ runtime). Use `frame N` followed by `info locals` and `print <var>` to inspect state at each frame.

The `core_dump()` utility in `libthecore/utils.h` also logs a stack trace notice to the syserr file when called explicitly from code.

---

### 8 — Windows client crash analysis

**Crash dump location:**

When `Metin2_<Config>.exe` crashes, Windows may write a minidump (`.dmp`) file. Common locations:

- `%LOCALAPPDATA%\CrashDumps\`
- The application's working directory, if the application registers its own unhandled-exception handler.

**Using WinDbg:**

1. Open WinDbg (from the Windows SDK).
2. Set the symbol path to include the `.pdb` files from your build output (`build/bin/<Config>/`):
   ```
   .sympath srv*C:\symbols*https://msdl.microsoft.com/download/symbols;C:\path\to\build\bin\RelWithDebInfo
   ```
3. Open the crash dump: **File → Open Crash Dump**.
4. Run `!analyze -v` to get an automated analysis.
5. Use `kP` to print the call stack with parameters.
6. Use `dv` to dump local variables in the current frame.

**Using Visual Studio:**

1. Open the `.sln` or the CMake project in Visual Studio.
2. Double-click the `.dmp` file; Visual Studio opens the Minidump Summary page.
3. Click **Debug with Native Only** (ensure the `.pdb` path is set under **Tools → Options → Debugging → Symbols**).
4. The call stack, locals, and watch windows behave identically to live debugging.

The client `.pdb` files are produced automatically when building in `Debug` or `RelWithDebInfo` configuration via CMake. The `Release` configuration may strip them — use `RelWithDebInfo` for any build you intend to debug.

---

## Syserr "Table of Pain"

> **Note:** Direct source grep was not available during wiki generation. The table below is derived from the documented architecture of each subsystem. Verify exact message strings against your local source files before relying on them for automated log parsing.

The `sys_err` macro writes errors to the `syserr` file with the source location automatically appended. Entries appear in the format:

```
[YYYY-MM-DD HH:MM:SS] [path/to/file.cpp:LINE] <message>
```

### Database connection and SQL errors (`libsql/AsyncSQL.cpp`)

| Error pattern | Emitting location | Meaning | Fix |
|--------------|------------------|---------|-----|
| MariaDB connect failure | `CAsyncSQL::Connect` | Wrong credentials or host unreachable | Verify `db.conf`: `[DB_HOST]`, `[DB_USER]`, `[DB_PASSWD]`, `[DB_PORT]`; confirm MariaDB is running |
| SQL query error with error number | `CAsyncSQL::ChildLoop` | The query was rejected by MariaDB | Check the full query in the log; verify the database schema matches expected table definitions |

### Boot / table-load errors (`db` process, `ClientManagerBoot.cpp`, `ProtoReader.cpp`)

| Error pattern | Emitting location | Meaning | Fix |
|--------------|------------------|---------|-----|
| Failure loading `mob_proto` or `item_proto` | `ProtoReader` | File missing or CSV column count mismatch | Check file path relative to `db` working directory; verify header row and column count |
| Shop / skill / refine table load failure | `CClientManager::InitializeTables` | Missing table file or DB query failure | Run `db` with verbose logging; inspect which table fails; confirm the relevant DB tables are populated |

### Game process startup errors (`game`, `config.cpp`, `sectree_manager.cpp`)

| Error pattern | Emitting location | Meaning | Fix |
|--------------|------------------|---------|-----|
| Map attribute load failure | `SECTREE_MANAGER::LoadMap` | `.atr` attribute file missing for a configured map index | Ensure all map attribute files are present in the maps directory |
| Cannot connect to db process | `CDBManager` / `game` startup | Wrong `db` host/port in `game.conf` or `db` not yet started | Start `db` before `game`; verify `[DB_ADDR]` and `[DB_PORT]` in `game.conf` |
| P2P bind or connect failure | `P2PManager` | Port in use or misconfigured `P2P_PORT` | Check for duplicate `game` instances; verify `P2P_PORT` is free |

### Quest / Lua runtime errors (`game`, `questmanager.cpp`)

| Error pattern | Emitting location | Meaning | Fix |
|--------------|------------------|---------|-----|
| Lua compile error with file name and line | `CQuestManager` script loader | Syntax error in a `.lua` quest file | Fix the reported line in the quest source file; recompile quest scripts |
| Lua runtime error / traceback | `CQuestManager::RunEvent` | Runtime exception inside a quest callback | Read the full Lua traceback from syserr; the bottom frame names the quest file and line |

### Character and item runtime errors (`game`, `char.cpp`, `item_manager.cpp`)

| Error pattern | Emitting location | Meaning | Fix |
|--------------|------------------|---------|-----|
| Item vnum not found in proto | `ITEM_MANAGER::GetProto` | A quest or config references a vnum absent from `item_proto` | Add the missing item entry to `item_proto` and restart `db` |
| Mob vnum not found | `CMobManager` | A spawn group or quest references an absent mob vnum | Add the entry to `mob_proto` and restart `db` |
| Packet received in unexpected phase | `CInputMain` / `CInputLogin` | Client sent a packet for a phase that has not been entered yet | Usually a protocol version mismatch between client and server; rebuild both from the same source revision |

---

## Common Mistakes

1. **Reading a stale log.** The `syserr` file is appended across restarts. Always note the timestamp range at the top of a diagnostic session. Truncate the file before reproducing a specific bug to get a clean trace.

2. **Using `sys_log(0, ...)` in production.** Level-0 output is extremely verbose. One log line per packet on a busy server produces millions of lines per hour and will fill the disk.

3. **Missing debug symbols.** If the build was made with `-DCMAKE_BUILD_TYPE=Release` and `.pdb` / DWARF symbols were stripped, gdb backtraces will show `??` for most frames. Always crash-test with `RelWithDebInfo`.

4. **Not setting `ulimit -c unlimited`.** Without this, Linux silently discards core dumps and there is no crash artefact to analyse.

5. **Confusing `syserr.txt` (client) with `syserr` (server).** They share the same naming convention but live in completely different directories. The server file is in the `game` or `db` process working directory on Linux; the client file is in the Windows game folder next to the `.exe`.

6. **Ignoring Lua traceback continuation lines.** When a quest crashes, spdlog writes a multi-line Lua traceback to syserr. Each line after the first looks like a separate error but is part of the same event. Read all lines up to the next timestamp.

7. **Not checking the `db` syserr first.** Many apparent `game`-side symptoms (missing items after login, quest flags not persisting) are actually `db`-side SQL errors. Always check both `syserr` files.

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `server-src/libthecore/log.h` | server-src | `sys_log` / `sys_err` macro declarations |
| `server-src/libthecore/log.cpp` | server-src | spdlog logger initialisation and routing |
| `server-src/libthecore/syslog_rotate_sink.h` | server-src | Daily-rotating file sink for server log files |
| `server-src/libthecore/utils.h` | server-src | `core_dump()` utility for explicit stack-trace logging |
| `server-src/game/config.h` / `config.cpp` | server-src | Parses `game.conf`; startup errors originate here |
| `server-src/db/Config.h` / `Config.cpp` | server-src | Parses `db.conf`; MariaDB credentials and listen address |
| `server-src/libsql/AsyncSQL.h` / `AsyncSQL.cpp` | server-src | SQL error logging from `CAsyncSQL::ChildLoop` |
| `client-src/src/EterBase/Debug.h` / `Debug.cpp` | client-src | Client-side debug output helpers |
| `client-src/src/UserInterface/PythonExceptionSender.h` / `.cpp` | client-src | Forwards unhandled Python exceptions to the server log |
| `syserr` (server working directory) | runtime | Server error log (spdlog, daily-rotated) |
| `syslog` (server working directory) | runtime | Server verbose trace log (spdlog, daily-rotated) |
| `syserr.txt` (client working directory) | runtime | Client error log |
| `syslog.txt` (client working directory) | runtime | Client verbose trace log |
