# Requirements & Prerequisites

> **Who is this for:** Anyone about to set up the server or build the client for the first time.
> **Prerequisites:** Read [Overview & Getting Started](start-overview) first so you understand what each part is.
> **What you will learn:** What OS, software, and skills you need — and where to find the exact setup steps.

## Overview

Two independent tracks. You do not need both — most contributors only work on one side.

| Track | OS | Full guide |
|-------|----|------------|
| **Run / build the server** | Linux, FreeBSD, or Windows | [Build Environment](guide-Build-Environment) |
| **Build the client** | Windows only | [Build Environment](guide-Build-Environment) |

---

## Repository Roles at a Glance

| Repo | Purpose | When you need it |
|------|---------|-----------------|
| `server-src` | C++ source — compile to get `game`, `db`, `qc` binaries | When changing server C++ code |
| `server` | Runtime environment — configs, SQL, management scripts | Always: this is where you run the server |
| `client-src` | C++ source — compile to get `Metin2.exe` | When changing client C++ code |
| `client-bin` | Runtime assets — Python UI scripts, data files, textures | Always: packs go here |

> **server vs server-src:** You only need `server-src` if you're changing C++ code. Most developers only ever touch `server/` (configs, quests, SQL) and `client-bin/` (Python UI). Think of `server-src` as the factory and `server/` as the warehouse.

---

## Section A — Server (Linux / FreeBSD / Windows)

The server builds with CMake + GCC, Clang, or MSVC and runs on all three platforms. Linux is the most common production target; FreeBSD and Windows are fully supported.

### What you need

| Tool | Version | Notes |
|------|---------|-------|
| CMake | ≥ 3.15 | `apt install cmake` on Debian/Ubuntu |
| GCC or Clang | GCC ≥ 12 / Clang ≥ 15 | Must support C++20 |
| MariaDB dev headers | — | `apt install libmariadb-dev` — OR use the bundled connector in `server-src/vendor/` |
| `python3` | 3.6+ | Required for server management scripts: `start.py`, `stop.py`, `install.py`, `clear.py` |

**Bundled — no manual install needed** (already in `server-src/vendor/`):
`mariadb-connector-c`, `libsodium`, `spdlog`

### Minimum hardware (for running the server)

| Resource | Minimum | Notes |
|----------|---------|-------|
| RAM | 4 GB | ~1 GB per server process + OS overhead |
| CPU | 2 cores | `game` is single-threaded; extra cores help `db` and MariaDB |
| Disk | 20 GB | OS + build artifacts + game data |
| Network | LAN or public IP | Clients connect to game port (default 11011) |

> **Full build steps, CMake flags, and platform-specific notes → [Guide: Build Environment](guide-Build-Environment)**

---

## Section B — Client (Windows only)

The client is a 32-bit Windows executable built with MSVC. It embeds Python 2.7 (32-bit) and requires the legacy DirectX 9 SDK.

### What you need

| Tool | Version | Notes |
|------|---------|-------|
| Visual Studio | 2022 | "Desktop development with C++" workload |
| CMake | ≥ 3.19 | Bundled with VS2022 |
| Python | 2.7, **32-bit** | Must be 32-bit — the client embeds it statically |
| DirectX SDK | June 2010 | For D3D9 headers; set `DXSDK_DIR` env variable |
| Granny SDK | 2.x | RAD Game Tools; `.gr2` runtime — already in `vendor/` |

**Bundled — no manual install needed** (already in `client-src/vendor/`):
`libsodium`, `freetype`, `lzo`, `zstd`, `DirectXMath`, `mio`

> **Full build steps, CMake flags, and ASan setup → [Guide: Build Environment](guide-Build-Environment)**

---

## Skills Reference

Use this to understand what you actually need to know — not all skills are needed for all tasks.

| Task | C++ | Python | SQL | Linux/BSD | Networking |
|------|-----|--------|-----|-----------|------------|
| Run the server | — | — | ✓ (basic) | ✓ | — |
| Build the server from source | ✓ | — | — | ✓ | — |
| Build the client from source | ✓ | — | — | — | — |
| Add or modify items/mobs | — | — | ✓ | — | — |
| Write quest scripts | — | ✓ (basic) | — | — | — |
| Modify the Python UI | — | ✓ | — | — | — |
| Add a new packet/feature | ✓ | ✓ | ✓ | ✓ | ✓ |
| Debug server crashes | ✓ | — | — | ✓ | — |

**Legend:** ✓ = required, ✓ (basic) = basics only, — = not needed

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Installing 64-bit Python 2.7 | Client build fails with linker errors | Download the **32-bit** Python 2.7 installer |
| Missing DirectX SDK | `d3d9.h not found` | Install DirectX SDK June 2010, set `DXSDK_DIR` |
| GCC version too old | `C++20 features not supported` | Upgrade to GCC ≥ 12 or Clang ≥ 15 |
| Missing MariaDB headers | CMake error during server configure | `apt install libmariadb-dev` or let CMake use the bundled connector |

> More build-specific errors → [Guide: Build Environment — Troubleshooting](guide-Build-Environment)

---

## Next Steps

- [Build Environment](guide-Build-Environment) — complete CMake setup for server and client
- [Setting Up the Server](start-server-setup) — startup order, verification, first-run checklist
- [Setting Up the Client](start-client-setup) — connecting the client to your server
