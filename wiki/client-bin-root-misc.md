# client-bin root — Miscellaneous Utilities

> Debug flag helper, exception formatter, application entry point, build-time Cythonizer, server command bus, string command dispatcher, UI test harness, and module sandbox.

## Overview

Eight small scripts that do not belong to any major subsystem. `debuginfo.py` is a one-flag module used by the engine to control debug mode. `exception.py` provides a portable traceback formatter and hard-abort helper. `prototype.py` is the real application entry point that wires subsystems together and starts the main loop. `rootlibcythonizer.py` is a build-time-only script that Cythonizes the entire `root/` directory. `servercommandparser.py` bridges the network layer to a set of server-driven event handlers via `stringCommander.Analyzer`. `stringcommander.py` provides `CallBackFunction` (a weak-reference bound-method wrapper) and `Analyzer` (a generic tokenizing command dispatcher). `test_affect.py` is a standalone development test harness that boots the game window with only `AffectShower` and the full interface. `utils.py` contains the `Sandbox` class for executing arbitrary files in a restricted module environment.

---

## Module: debuginfo.py

**Purpose:** Stores and exposes a single boolean debug-mode flag used throughout the Python layer and set by `system.py` from the compile-time `__DEBUG__` constant.

### Module-Level Variables

| Name | Value | Description |
|------|-------|-------------|
| `g_isDebugMode` | `0` | Global debug mode flag; 0 = release, non-zero = debug |

### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `SetDebugMode(isDebugMode)` | int | None | Sets `g_isDebugMode` |
| `IsDebugMode()` | — | int | Returns `g_isDebugMode` |

---

## Module: exception.py

**Purpose:** Standalone exception formatting and hard-abort utilities, usable without importing `system.py`.

### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `GetExceptionString(excTitle)` | string | string | Calls `sys.exc_info()` inside an active `except` block; formats each traceback frame as `filename(line:N) func - source`; appends `excTitle - ExcType:ExcMsg`; returns the full multi-line string |
| `Abort(excTitle)` | string | int (0) | Calls `GetExceptionString(excTitle)`, writes it via `dbg.TraceError()`, calls `app.Abort()`, then `sys.exit()`; always returns 0 to satisfy call-site error returns |

---

## Module: prototype.py

**Purpose:** Application entry point. Executed by `system.py` via `RunMainScript("prototype.py")`. Configures rendering flags, wires the mouse controller, creates the application window, creates `MainStream`, and drives the phase loop.

### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `RunApp()` | — | None | Full startup sequence (see below) |

### `RunApp()` Startup Sequence

1. `musicInfo.LoadLastPlayFieldMusic()` — restores last played BGM filename.
2. Applies `constInfo.HAIR_COLOR_ENABLE`, `ARMOR_SPECULAR_ENABLE`, `WEAPON_SPECULAR_ENABLE` to `app`.
3. Registers `mouseModule.mouseController` as mouse handler for both `app` and `wndMgr`.
4. Sets screen size from `systemSetting.GetWidth()/GetHeight()`.
5. Calls `app.Create(localeInfo.APP_TITLE, width, height, 1)`; shows error dialog and returns if `RuntimeError` is raised (e.g. `"CREATE_DEVICE"`).
6. Sets default camera: `app.SetCamera(1500.0, 30.0, 0.0, 180.0)`.
7. Calls `mouseModule.mouseController.Create()`; aborts if it returns False.
8. Creates `networkModule.MainStream()` and calls `mainStream.Create()`.
9. Calls `mainStream.SetLoginPhase()` — enters the login screen.
10. Calls `app.Loop()` — blocks until the application exits.
11. Calls `mainStream.Destroy()` — cleanup.

`RunApp()` is called unconditionally at module bottom level so execution starts immediately when `system.py` calls `RunMainScript("prototype.py")`.

---

## Module: rootlibcythonizer.py

**Purpose:** Build-time-only script. Cythonizes every `.py` file in `root/` (except itself) and produces a combined C/C++ source file named `rootlib` using the `sourceWriter` tool. Not shipped with the client; run from a developer machine.

### Execution Steps

1. Appends `..\..\Extern\Py2Lib\lib` to `sys.path`.
2. Loads `utils` module via `imp.find_module` / `imp.load_module`.
3. Calls `utils.findMatchedFiles(".", "*.py")` to collect all `.py` files; removes `RootlibCythonizer.py` from the list.
4. Calls `cythonizer.run(pys, forceRecompile=True)` — compiles each file to a C or C++ extension module.
5. Iterates the resulting module list and collects module names and source file paths (`.c` or `.cpp`).
6. Calls `sourceWriter.run(moduleNameLst, 'rootlib')` — writes a single amalgamated C source file.
7. Prints the output filename on success.

---

## Module: servercommandparser.py

**Purpose:** Receives server-originated string commands from the network layer and dispatches them to registered Python handlers. Registered as the server command parser via `net.SetServerCommandParserWindow()`.

### Class: `ServerCommandParser`

**Inherits:** `object`
**Purpose:** Receives `BINARY_ServerCommand_Run(line)` calls from the C++ network module and routes them through a `stringCommander.Analyzer` instance.

#### Registered Commands

| Command String | Handler Method | Description |
|---------------|---------------|-------------|
| `DayMode` | `__DayMode_Update(mode)` | Preserves day-mode command for deferred processing |
| `xmas_snow` | `__XMasSnow_Enable(mode)` | Preserves X-Mas snow effect enable/disable |
| `xmas_boom` | `__XMasBoom_Enable(mode)` | Enables dark/light day mode for X-Mas fireworks |
| `xmas_tree` | `__XMasTree_Enable(grade)` | Preserves X-Mas tree grade |
| `newyear_boom` | `__XMasBoom_Enable(mode)` | Same handler as `xmas_boom`; used for New Year fireworks |
| `item_mall` | `__ItemMall_Open()` | Preserves the item-mall open command |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Registers self with `net.SetServerCommandParserWindow()`; calls `__ServerCommand_Build()` |
| `__ServerCommand_Build(self)` | — | None | Builds `serverCommander` as a `stringCommander.Analyzer`; registers all command callbacks via `SAFE_RegisterCallBack()` |
| `BINARY_ServerCommand_Run(self, line)` | string | int | Entry point called by C++; delegates to `self.serverCommander.Run(line)`; logs `RuntimeError` via `dbg.TraceError()` |
| `__PreserveCommand(self, line)` | string | None | Calls `net.PreserveServerCommand(line)` to queue command for main-thread processing |

### Module-Level Singleton

| Name | Description |
|------|-------------|
| `parserWnd` | `ServerCommandParser()` instance created at import time; self-registers with `net` |

---

## Module: stringcommander.py

**Purpose:** Generic weak-reference command dispatcher. Used by `servercommandparser.py` and elsewhere to route string-tokenized commands to bound methods without creating strong reference cycles.

### Class: `CallBackFunction`

**Purpose:** Wraps a bound method in weak-reference proxies to prevent circular reference cycles. Selects either a no-arg or arg-forwarding call wrapper based on the method's argument count.

#### Inner Classes

- `__noarg_call__` — stores `_weakref.proxy(obj)` and `_weakref.proxy(func)`; `__call__(*arg)` invokes `func(obj)`.
- `__arg_call__` — same but `__call__(*arg)` invokes `func(obj, *arg)`.

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, mfunc)` | bound method | None | Reads `co_argcount` to pick `__arg_call__` (>1) or `__noarg_call__` (≤1) |
| `__call__(self, *arg)` | ... | any | Delegates to the chosen inner call wrapper |
| `GetArgumentCount(self)` | — | int | Returns the original `co_argcount` value |

### Class: `Analyzer`

**Purpose:** Command dispatcher. Maps string command names to `CallBackFunction` wrappers; tokenizes input lines and dispatches to the correct callback.

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Creates empty `cmdDict` |
| `SAFE_RegisterCallBack(self, cmd, callBackFunc)` | string, bound method | None | Wraps `callBackFunc` in `CallBackFunction` and stores it under `cmd` |
| `Run(self, line)` | string | int | Splits `line` into tokens; pops first as command name; looks up in `cmdDict`; validates argument count; calls the callback with remaining tokens; returns 1 on success, 0 if command not found; raises `RuntimeError` if too few arguments are provided |

---

## Module: test_affect.py

**Purpose:** Standalone development test harness. Boots the minimum game engine environment and displays `AffectShower` plus the full game interface for testing affect/buff UI without a live server connection.

### Module-Level Setup (executed at import / run time)

1. Imports `*` from `interfaceModule` (brings `Interface` into scope).
2. Initialises `app`, `wndMgr`, and `mouseModule.mouseController` directly (bypassing `prototype.py`).
3. Calls `app.Create("METIN2", width, height, 1)`.
4. Calls `mouseModule.mouseController.Create()`.

### Class: `TestGame`

**Inherits:** `ui.Window`
**Purpose:** Test window that creates `AffectShower` and the full `Interface` object, then runs the engine loop.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Creates `uiAffectShower.AffectShower()`; calls `BINARY_NEW_AddAffect(chr.NEW_AFFECT_EXP_BONUS_EURO_FREE, 0, 100, 1000)` for a test affect; creates and shows `Interface()` |
| `OnKeyUp(self, key)` | int | True | Prints key code; always returns True |
| `OnUpdate(self)` | — | None | Calls `app.UpdateGame()` |
| `OnRender(self)` | — | None | Calls `app.RenderGame()`; pops graphics state; sets interface render state |

After class definition, the module instantiates `game = TestGame()`, sets its size to the full screen, shows it, and calls `app.Loop()`.

---

## Module: utils.py

**Purpose:** Provides a `Sandbox` class that executes a Python file in an isolated module environment with configurable allow/prevent lists and path restrictions.

### Class: `Sandbox`

**Purpose:** Controlled execution environment. Before running the target file, optionally hides all currently imported modules and sets a restricted `sys.path`; fully restores both after execution.

#### Class Variables

| Name | Value | Description |
|------|-------|-------------|
| `WHITE_LIST` | `['__builtin__', 'types', __name__, '__main__', 'sys']` | Modules that are never hidden, even in full-restrict mode |

#### Constructor Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prevent_imported_modules` | bool | `False` | If True, sets all currently imported non-white-listed modules to None before execution |
| `allowed_modules` | list of str | `[]` | Modules to import before execution; always importable inside the sandbox |
| `prevented_modules` | list of str | `[]` | Modules to set to None regardless of import state |
| `allowed_paths` | list of str | `[]` | Replaces `sys.path` during execution |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `add_allowed_modules(self, allowed_modules)` | list | None | Appends to `self.allowed_modules` |
| `add_prevented_modules(self, prevented_modules)` | list | None | Appends to `self.prevented_modules` |
| `execfile(self, filename, dic)` | string, dict | None | Imports all `allowed_modules`; shallow-copies `sys.modules`; optionally sets non-white-listed modules to None; sets `prevented_modules` to None; reads and executes `filename` in `dic` via `compile()`/`exec()`; restores `sys.modules` and `sys.path` in a `finally` block |

#### Restore Strategy

`sys.modules` is restored by iterating the snapshot: new keys added during execution are deleted, and snapshot values are written back for pre-existing keys. Direct assignment `sys.modules = old_modules` is intentionally avoided because existing references to `sys.modules` held by other code would not see the replacement.
