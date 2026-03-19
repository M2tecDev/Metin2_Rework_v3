# server-src Overview

> C++20 multi-process game server stack for the Metin2 private-server rework, buildable without external dependencies on Windows, Linux, FreeBSD, and macOS.

## Overview

`server-src` is the complete server-side implementation of the Metin2 MMORPG engine. It compiles into two runnable processes (`game` and `db`) and several shared static libraries. The build system uses CMake 3.15+ and targets the C++20 / C17 standards. All processes share the same source tree under `src/`, and vendored third-party code lives under `vendor/`.

## Multi-Process Architecture

The server runs as two cooperating processes:

| Process | Binary | Role |
|---------|--------|------|
| **game** | `game` | Real-time game simulation: characters, combat, maps, quests, NPC AI, network I/O with clients and peer game servers |
| **db** | `db` | Persistent storage mediator: accepts TCP connections from game processes, performs all MariaDB queries, and caches player/item data |

Additionally, a standalone tool `qc` (quest compiler) is built from `src/qc/` but is not a server process.

```
Clients  <--CG/GC TCP-->  game  <--GG P2P TCP-->  other game instances
                            |
                           GD/DG TCP
                            |
                            db  <--MariaDB-->  Database
```

### Packet Namespaces (defined in `common/packet_headers.h`)

| Namespace | Direction | Range |
|-----------|-----------|-------|
| `CG` | Client -> Game | 0x0006–0x0CFF |
| `GC` | Game -> Client | 0x0007–0x0CFF |
| `GG` | Game <-> Game (P2P) | 0x8000–0x8FFF |
| `GD` | Game -> DB | 0x9000–0x90FF |
| `DG` | DB -> Game | 0x9100–0x91FF |

## Repository Layout

```
server-src/
├── CMakeLists.txt         Root build file (C++20, platform flags, vendored MariaDB)
├── README.md              Installation and build guide
├── buildtool/             CMake find-modules
├── include/               Top-level additional include path
├── src/
│   ├── CMakeLists.txt
│   ├── common/            Shared headers only (no compiled code)
│   ├── game/              game process (~268 source files)
│   ├── db/                db process
│   ├── qc/                Quest compiler tool
│   ├── libthecore/        Networking / event-loop foundation
│   ├── libpoly/           Formula expression evaluator
│   ├── libgame/           Shared game utilities
│   ├── liblua/            Embedded Lua 5.0.3
│   └── libsql/            Async MariaDB abstraction
└── vendor/
    └── mariadb-connector-c-3.4.5/
```

## Build System

**Requirements:** CMake >= 3.15, a C++20 compiler (MSVC 2019+, GCC 10+, Clang 11+).

```bash
mkdir build && cd build
cmake ..
cmake --build .
```

Binaries are placed in `build/bin/`. Libraries in `build/lib/`.

### Platform-Specific Definitions

| Macro | Defined on |
|-------|-----------|
| `OS_WINDOWS` | Windows |
| `OS_FREEBSD` | FreeBSD |
| `OS_LINUX` | Linux |
| `OS_MACOS` | macOS |

### Optional Flags

| CMake Option | Default | Description |
|-------------|---------|-------------|
| `ENABLE_ASAN` | `OFF` | Enable AddressSanitizer |

### Key Compiler Settings

- MSVC: `/utf-8`, `/Zc:preprocessor`, `/MP` (parallel compilation), `/wd4244` for game target.
- GCC: `-finput-charset=UTF-8`.
- Both: `NOMINMAX`, `WIN32_LEAN_AND_MEAN`.
- Static CRT on Windows (`MultiThreaded[Debug]`).

## Dependencies

| Dependency | Source | Used by |
|-----------|--------|---------|
| MariaDB Connector/C 3.4.5 | `vendor/` (bundled) | `libsql`, `db`, `game` |
| libsodium | System / vcpkg | `game` (key-exchange crypto) |
| Lua 5.0.3 | `src/liblua/` (vendored source) | `game`, `qc` |
| pthreads | OS | `game`, `db` (non-Windows) |
| ws2_32 | Windows SDK | `game` (Windows) |
| md | FreeBSD libc | `game` (FreeBSD) |

## Sub-Module Documentation

| Page | Module |
|------|--------|
| [server-src-game](server-src-game.md) | game process |
| [server-src-db](server-src-db.md) | db process |
| [server-src-qc](server-src-qc.md) | quest compiler tool |
| [server-src-libthecore](server-src-libthecore.md) | networking / event loop |
| [server-src-libpoly](server-src-libpoly.md) | formula evaluator |
| [server-src-libgame](server-src-libgame.md) | shared game utilities |
| [server-src-liblua](server-src-liblua.md) | embedded Lua 5.0.3 |
| [server-src-libsql](server-src-libsql.md) | async SQL abstraction |
| [server-src-common](server-src-common.md) | shared headers |
