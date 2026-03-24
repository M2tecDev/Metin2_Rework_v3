# Guide: Best Practices (The Rework Way)

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> Coding standards and patterns observed in the Rework v3 codebase. These are derived from the source code itself — follow them when adding new code.

## Overview

Rework v3 upgrades the vanilla Metin2 codebase to **C++20** (both client and server) and replaces legacy build systems with **CMake**. New code should follow modern C++ idioms and the patterns established in the Rework source.

---

## 1. Build System

- **Use CMake.** Do not create `.vcxproj` or `Makefile` files manually. Add new libraries or executables by editing the appropriate `CMakeLists.txt`.
- **New library target pattern:**
  ```cmake
  add_library(MyLib STATIC
      MyLib.cpp
      MyLib.h
  )
  target_include_directories(MyLib PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})
  target_link_libraries(MyLib PRIVATE common)
  ```
- **Keep vendor libraries in `vendor/`.** Never copy third-party code into `src/`.

---

## 2. C++ Standards

The CMakeLists.txt enforces `set(CMAKE_CXX_STANDARD 20)`. Use modern C++ where it improves clarity:

### Prefer Modern Containers

```cpp
// Old vanilla style
std::vector<int> vec;
DWORD arr[128];

// Rework style
std::vector<int> vec;
std::array<DWORD, 128> arr;   // fixed-size arrays → std::array
```

### Use Range-Based For

```cpp
// Old
for (auto it = m_vec.begin(); it != m_vec.end(); ++it)
    Process(*it);

// Rework
for (auto& entry : m_vec)
    Process(entry);
```

### Use nullptr, not NULL or 0

```cpp
LPCHARACTER ch = nullptr;   // not NULL or 0
```

### Use `auto` for Long Type Names

```cpp
auto it = m_map_playerCache.find(dwPlayerID);
```

### Prefer `std::string` over `char*`

```cpp
// Prefer
void SetName(const std::string& name);

// Avoid new char* parameters unless interfacing with C APIs
```

---

## 3. Logging

The server uses **spdlog** (`vendor/spdlog-1.15.3`) for structured logging. Use `sys_log` and `sys_err` from [server-src-libthecore](server-src-libthecore) for game-process logging (they route to spdlog internally — see [server-src-libthecore](server-src-libthecore) for log rotation and `sys_log`/`sys_err` macro details):

```cpp
sys_log(0, "CHARACTER::UseSkill vnum=%d level=%d", vnum, level);
sys_err("CHARACTER::UseSkill: no skill proto for vnum=%d", vnum);
```

- `sys_log(level, ...)` — informational log, `level` controls verbosity (0 = always, higher = verbose-only)
- `sys_err(...)` — error log, always written

**Never use `printf` or `fprintf(stderr, ...)` for server logging.** Use `sys_log` / `sys_err` so logs go to the correct output files.

For client-side C++ debugging, use `TraceError` (writes to `syserr.txt`):
```cpp
TraceError("CMySystem::Update: pkItem is null, cell=%d", iCell);
```

---

## 4. Feature Toggles with #define

New systems should be gated behind a `#define` toggle so they can be disabled without deleting code. The pattern from the vanilla codebase (used in `service.h` and the CMakeLists defines) is:

```cpp
// In service.h or a dedicated defines header
#define ENABLE_MY_NEW_SYSTEM
```

In code:
```cpp
#ifdef ENABLE_MY_NEW_SYSTEM
    // New system logic here
#endif
```

For CMake-level toggles (compile-time, no header required):
```cmake
# CMakeLists.txt
option(ENABLE_MY_SYSTEM "Enable My New System" ON)
if(ENABLE_MY_SYSTEM)
    add_compile_definitions(ENABLE_MY_SYSTEM)
endif()
```

This makes it easy to:
- Disable a broken feature without a full revert
- Test the codebase with and without the feature
- Track which features are custom additions vs vanilla

---

## 5. Packet Definitions

When adding a new packet, always define the struct in `server-src/src/common/packet_headers.h` (header constant) and a matching struct in `tables.h` or a local header. Mirror the same struct on the client side.

**Server side:**
```cpp
// packet_headers.h
namespace CG {
    constexpr uint16_t MY_NEW_ACTION = 0x00F0;
}
namespace GC {
    constexpr uint16_t MY_NEW_RESPONSE = 0x00F1;
}

// In a packet struct header
#pragma pack(push, 1)
struct TPacketCGMyNewAction {
    uint16_t header = CG::MY_NEW_ACTION;
    uint16_t size   = sizeof(TPacketCGMyNewAction);
    uint32_t param;
};

struct TPacketGCMyNewResponse {
    uint16_t header = GC::MY_NEW_RESPONSE;
    uint16_t size   = sizeof(TPacketGCMyNewResponse);
    int32_t  result;
};
#pragma pack(pop)
```

**Client side:** Mirror the same `#pragma pack(1)` struct in the corresponding `PythonNetworkStream` header.

---

## 6. Memory Management

- **Prefer stack allocation** for small, short-lived objects.
- **Use `ITEM_MANAGER::instance().CreateItem()`** and the singleton pools for game objects — do not `new` raw game objects.
- **Never call `delete` on `LPCHARACTER`, `LPITEM`, etc.** — they are managed by their respective managers (`CHAR_MANAGER`, `ITEM_MANAGER`).

---

## 7. Server-Side: No Raw SQL in Game Process

The game process must **not** execute direct SQL queries against MariaDB during gameplay. All persistence goes through the `db` process via GD packets (see [server-src-libsql](server-src-libsql) for the `CAsyncSQL` architecture that enforces this):

```
game → GD::PLAYER_SAVE → db → MariaDB
```

Direct SQL from `game` is only acceptable in the `libsql` async path for local logging (e.g. `QUERY_LOG`). Never use blocking SQL in the game's main loop.

---

## 8. Error Handling Pattern

Functions that can fail should return a `bool` or use an early-return pattern. Avoid exceptions in hot paths:

```cpp
bool CMySystem::Process(LPCHARACTER ch, uint32_t param)
{
    if (!ch)
    {
        sys_err("CMySystem::Process: null character");
        return false;
    }

    LPITEM pkItem = ch->GetItem(TItemPos(INVENTORY, param));
    if (!pkItem)
        return false;

    // ... logic
    return true;
}
```

---

## Key Files to Review

| Path | Repo | Why |
|------|------|-----|
| `CMakeLists.txt` | both | Understand the build structure before adding targets |
| `src/common/service.h` | server-src | Feature toggle defines — add yours here |
| `src/common/packet_headers.h` | server-src | Packet header constants — always update both sides |
| `src/common/length.h` | server-src | Global constants and enums — check before hardcoding values |
| `src/game/char.h` | server-src | The largest class — understand its structure before adding to it |
| `vendor/spdlog-1.15.3/` | server-src | Logging library — no need to modify |
