# Guide: Build Environment

> How to set up the build environment for Metin2 Rework v3 — client (Windows/MSVC) and server (Linux/GCC or Windows/MSVC).

## Overview

Rework v3 uses **CMake** as its build system for both the client and server. This replaces the legacy `.vcxproj`/`.sln` files from vanilla Metin2. Both targets require **C++20**.

| Target | OS | Compiler | CMake Minimum |
|--------|----|----------|---------------|
| `client-src` | Windows only | MSVC (Visual Studio 2022 recommended) | 3.19 |
| `server-src` | Linux / FreeBSD / Windows | GCC / Clang / MSVC | 3.15 |

---

## Client — Windows Build

### Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Visual Studio | 2022 (v143) | Install "Desktop development with C++" workload |
| CMake | ≥ 3.19 | Bundled with VS2022 or install standalone |
| Python | 2.7 (32-bit) | Client embeds Python 2.7 — must be 32-bit |
| Granny SDK | Granny 2.x | RAD Game Tools; `.gr2` runtime (already in `vendor/`) |
| DirectX SDK | June 2010 | For D3D9 headers; set `DXSDK_DIR` env variable |

### Bundled Vendors (no manual install needed)

These are already in `client-src/vendor/` and built automatically by CMake:

| Library | Version | Purpose |
|---------|---------|---------|
| `libsodium` | latest | XChaCha20-Poly1305 encryption for pack files and network |
| `freetype` | 2.13.3 | Font rendering |
| `lzo` | 2.10 | LZO compression for pack files |
| `zstd` | 1.5.7 | Zstandard compression (alternative/additional compression) |
| `DirectXMath` | latest | SIMD math library |
| `mio` | latest | Memory-mapped file I/O |

### Build Steps

```powershell
# 1. Clone (with submodules)
git clone --recurse-submodules <repo-url>

# 2. Generate Visual Studio solution
cmake -S client-src -B client-src/build -G "Visual Studio 17 2022" -A Win32

# 3. Open in Visual Studio
# client-src/build/m2dev-client-src.sln

# 4. OR build from command line
cmake --build client-src/build --config RelWithDebInfo
```

> **Important:** The client is 32-bit (`-A Win32`). Do not build as x64.

### Build Configurations

| Configuration | Defines | Use |
|---------------|---------|-----|
| `Debug` | `DEBUG` | Full debug symbols, no optimizations |
| `RelWithDebInfo` | `_DISTRIBUTE` + PDB | Release with debug info — use for testing |
| `Release` | `_DISTRIBUTE` + PDB | Shipping build |

### AddressSanitizer (ASan)

```powershell
cmake -S client-src -B client-src/build-asan -G "Visual Studio 17 2022" -A Win32 -DENABLE_ASAN=ON
```

### Key Compile Definitions

| Define | Purpose |
|--------|---------|
| `NOMINMAX` | Prevents Windows.h `min`/`max` macro collisions |
| `WIN32_LEAN_AND_MEAN` | Reduces Windows.h include size |
| `USE_LOD` | Enables terrain Level-of-Detail |
| `DUNGEON_WORK` | Enables dungeon block rendering |
| `BUILDING_GRANNY_STATIC` | Links Granny as a static library |
| `Py_NO_ENABLE_SHARED` | Embeds Python statically |
| `UNICODE` / `_UNICODE` | Wide-character Windows API |

---

## Server — Linux Build (Primary)

### Requirements

| Tool | Version | Notes |
|------|---------|-------|
| CMake | ≥ 3.15 | `apt install cmake` |
| GCC | ≥ 12 or Clang ≥ 15 | Must support C++20 |
| MariaDB dev headers | — | `apt install libmariadb-dev` (OR use the bundled connector) |
| Python | 2.7 (optional) | Only if quest compiler Python bindings are used |

### Bundled Vendors (no manual install needed)

Located in `server-src/vendor/`:

| Library | Version | Purpose |
|---------|---------|---------|
| `mariadb-connector-c` | 3.4.5 | Async SQL for db process |
| `libsodium` | latest | Key exchange (X25519) |
| `spdlog` | 1.15.3 | Structured logging |

### Build Steps

```bash
# 1. Configure
cmake -S server-src -B server-src/build \
  -DCMAKE_BUILD_TYPE=RelWithDebInfo

# 2. Build all targets
cmake --build server-src/build --parallel $(nproc)

# 3. Install binaries
cmake --install server-src/build
# Installs to server-src/build/_install/bin/
```

Resulting binaries: `game`, `db`, `qc` (quest compiler).

### Build for Debug (GDB)

```bash
cmake -S server-src -B server-src/build-debug \
  -DCMAKE_BUILD_TYPE=Debug
cmake --build server-src/build-debug --parallel
```

### AddressSanitizer

```bash
cmake -S server-src -B server-src/build-asan \
  -DCMAKE_BUILD_TYPE=Debug \
  -DENABLE_ASAN=ON
```

### Platform Defines (auto-set by CMake)

| Define | Set when |
|--------|----------|
| `OS_WINDOWS` | Building on Windows |
| `OS_LINUX` | Building on Linux |
| `OS_FREEBSD` | Building on FreeBSD |
| `OS_MACOS` | Building on macOS |

---

## Server — Windows Build

The server CMakeLists.txt also supports MSVC on Windows (uses the same vendor setup). Use:

```powershell
cmake -S server-src -B server-src/build -G "Visual Studio 17 2022" -A x64
```

Note: The server is **64-bit** on Windows (`-A x64`), unlike the client which is 32-bit.

---

## Version Tagging

The server CMake build derives a version string from git at configure time:

```cmake
git describe --always --dirty --tags
```

This version string is embedded in the `db` binary. If git is not found, it falls back to the short commit hash, and then to `"unknown"`.

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `error: C++20 features not supported` | Too-old compiler | Upgrade to VS2022 / GCC 12+ / Clang 15+ |
| `Cannot find Python.h` | Python not installed or wrong bitness | Install 32-bit Python 2.7 for client; add to include path |
| `D3D9.h not found` | DirectX SDK not installed | Install June 2010 DXSDK, set `DXSDK_DIR` env var |
| `MariaDB not found` (server) | Missing dev headers | `apt install libmariadb-dev` or rely on bundled connector |
| Linker error: `LNK2019` | Missing `.lib` dependency | Check `target_link_libraries` in the failing target's `CMakeLists.txt` |
| `Address already in use` (server start) | Previous instance running | `pkill game` / `pkill db` |

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `client-src/CMakeLists.txt` | client-src | Top-level client CMake config |
| `client-src/src/CMakeLists.txt` | client-src | Library and executable targets |
| `client-src/vendor/CMakeLists.txt` | client-src | Bundled vendor targets |
| `server-src/CMakeLists.txt` | server-src | Top-level server CMake config |
| `server-src/src/CMakeLists.txt` | server-src | game / db / qc targets |
| `server-src/vendor/CMakeLists.txt` | server-src | Bundled vendor targets (mariadb, libsodium, spdlog) |
