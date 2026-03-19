# PythonModules

> Python C extension modules providing the C++↔Python bridge for all game subsystems exposed to the embedded scripting engine.

## Overview

PythonModules is the largest Python-binding layer in the client. It consists entirely of C source files that are compiled as part of the static Python interpreter. The library contains two categories of files: the frozen Python standard library modules (the many `M_*.c` files) that make the standard library available without a filesystem, and the game-specific C extension modules registered during interpreter initialization.

The frozen modules are auto-generated from CPython source and are not manually written. The game extension modules are hand-written C++ calling into the game libraries.

## Dependencies

- Python 3.x (static) — all modules are C extension modules
- `EterLib`, `EterGrnLib`, `EterPythonLib` — referenced by graphic modules

## Files

### Frozen Standard Library

The `M_*.c` files (200+) are machine-generated frozen bytecode modules for the complete Python 3.x standard library: `os`, `sys`, `re`, `json`, `threading`, `asyncio`, `collections`, `functools`, and hundreds more. They are compiled into the executable so that Python scripts can `import` standard modules without any filesystem access.

`frozen_modules.c` / `frozen_modules.h` register all frozen modules with the interpreter.

### Game Extension Module: GameLib–Skills

The `CMakeLists.txt` reveals that PythonModules is primarily a compilation unit that packages the frozen modules. The actual game C extension modules (for skill data, character data, etc.) reside in `UserInterface/` and are described in the [UserInterface](client-src-UserInterface) documentation.

## Notes on Architecture

Game Python modules are scattered across several source directories and registered at interpreter startup in `UserInterface/UserInterface.cpp`:

| Module name | Registration source | Covers |
|-------------|-------------------|--------|
| `grp` | `EterPythonLib/PythonGraphicModule.cpp` | Core graphics primitives |
| `grpImage` | `EterPythonLib/PythonGraphicImageModule.cpp` | Image loading and rendering |
| `grpText` | `EterPythonLib/PythonGraphicTextModule.cpp` | Text rendering |
| `grpThing` | `EterPythonLib/PythonGraphicThingModule.cpp` | 3D model rendering |
| `wndMgr` | `EterPythonLib/PythonWindowManagerModule.cpp` | UI window management |
| `net` | `UserInterface/PythonNetworkStreamModule.cpp` | Network communication |
| `player` | `UserInterface/PythonPlayerModule.cpp` | Local player state |
| `chr` | `UserInterface/PythonCharacterManagerModule.cpp` | Character manager |
| `item` | `UserInterface/PythonItemModule.cpp` | Item data queries |
| `skill` | `UserInterface/PythonSkillModule.cpp` | Skill data queries |
| `chat` | `UserInterface/PythonChatModule.cpp` | Chat system |
| `guild` | `UserInterface/PythonGuildModule.cpp` | Guild system |
| `quest` | `UserInterface/PythonQuestModule.cpp` | Quest state |
| `exchange` | `UserInterface/PythonExchangeModule.cpp` | Trade exchange |
| `shop` | `UserInterface/PythonShopModule.cpp` | NPC shop interface |
| `messenger` | `UserInterface/PythonMessengerModule.cpp` | Friends/messenger |
| `miniMap` | `UserInterface/PythonMiniMapModule.cpp` | Mini-map |
| `ime` | `UserInterface/PythonIMEModule.cpp` | IME text input |
| `snd` | `UserInterface/PythonSoundManagerModule.cpp` | Sound engine |
| `fly` | `UserInterface/PythonFlyModule.cpp` | Fly/projectile control |
| `effect` | `UserInterface/PythonEffectModule.cpp` | Visual effects |
| `nonplayer` | `UserInterface/PythonNonPlayerModule.cpp` | NPC data |
| `textTail` | `UserInterface/PythonTextTailModule.cpp` | Floating text labels |
| `eventMgr` | `UserInterface/PythonEventManagerModule.cpp` | Event manager |
| `pack` | `UserInterface/PythonPackModule.cpp` | Pack file access |
| `dbg` | `ScriptLib/PythonDebugModule.cpp` | Debug utilities |
| `profiler` | `UserInterface/PythonProfilerModule.cpp` | Frame profiler |
| `system` | `UserInterface/PythonSystemModule.cpp` | System settings |
| `serverState` | `UserInterface/ServerStateCheckerModule.cpp` | Server state |
| `gameEventMgr` | `UserInterface/PythonGameEventManagerModule.cpp` | Game event manager |
