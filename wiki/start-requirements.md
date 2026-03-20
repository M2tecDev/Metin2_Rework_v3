# Requirements & Prerequisites

> **Who is this for:** Anyone about to set up the server or build the client for the first time.
> **Prerequisites:** Read [start-overview](start-overview) first so you understand what each part is.
> **What you will learn:** Exactly what hardware, software, and skills you need before you start.

## Overview

This page covers two independent setup tracks: running the server (Linux) and building the client (Windows). You do not need to do both — many contributors only work on one side. Read the section that applies to you.

---

## Section A — Running the Server (Linux)

### Recommended OS

Ubuntu 22.04 LTS or later. The build system and dependencies are tested against this. Other Debian-based distributions will likely work; other Linux distributions may require adjustments.

### Required Software

| Package | Purpose |
|---------|---------|
| `cmake` (3.16+) | Build system |
| `gcc` / `g++` (11+) | C++ compiler |
| `make` | Build automation |
| `libmariadb-dev` | MariaDB client library |
| `mariadb-server` | Database server |
| `libsodium-dev` | Encryption (X25519 / XSalsa20) |
| `liblua5.0-dev` | Lua 5.0 interpreter (embedded in server) |
| `python2.7` | Used by the qc quest compiler |
| `git` | Source control |

> For the complete installation commands, refer to the **server-src README**:
> https://github.com/d1str4ught/m2dev-server-src/tree/21519899adf6ade7937d71b1d9d886d502762a3b?tab=readme-ov-file#installationconfiguration

### Minimum Recommended Hardware

| Resource | Minimum | Notes |
|----------|---------|-------|
| RAM | 4 GB | 2 GB for OS + 1 GB per server process |
| CPU | 2 cores | game process is single-threaded; more cores help db and MariaDB |
| Disk | 20 GB | OS + build artifacts + game data |
| Network | LAN or public IP | Clients need to reach the game port (default 11011) |

---

## Section B — Building the Client (Windows)

### Required Software

| Software | Version | Notes |
|----------|---------|-------|
| Visual Studio | 2022 | Community edition is sufficient |
| VS workload | "Desktop development with C++" | Required MSVC components |
| Python | 2.7, 32-bit | Must be 32-bit — the client embeds 32-bit Python |
| DirectX SDK | June 2010 | Legacy SDK required by EterLib |
| Granny2 | SDK matching the project | Animation library — see client-src README for source |
| CMake | 3.20+ | Can use the version bundled with Visual Studio |
| Git | Any recent | Source control |

> For the complete build steps including exact CMake invocations, refer to the **client-src README**:
> https://github.com/d1str4ught/m2dev-client-src/tree/a7555110828182f20d0a0306aac0552142cf0039#installationconfiguration

> For configuring the Python scripts and assets, refer to the **client-bin README**:
> https://github.com/d1str4ught/m2dev-client/tree/ecef2dcdb89f5d0344677b2902ad175809b70f52?tab=readme-ov-file#installationconfiguration

---

## Skills Reference Table

Use this table to understand which skills you need for which type of work. You do not need all of them — focus on what you are actually trying to do.

| Task | C++ | Python | SQL | Linux | Networking |
|------|-----|--------|-----|-------|------------|
| Run the server | — | — | ✓ (basic) | ✓ | — |
| Build the client from source | ✓ | — | — | — | — |
| Add or modify items | — | — | ✓ | — | — |
| Write quest scripts | — | ✓ (basic) | — | — | — |
| Modify the Python UI | — | ✓ | — | — | — |
| Add a new packet/feature | ✓ | ✓ | ✓ | ✓ | ✓ |
| Debug server crashes | ✓ | — | — | ✓ | — |

**Legend:** ✓ = required, ✓ (basic) = only basic knowledge needed, — = not required

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Installing 64-bit Python 2.7 | Client build fails with linker errors | Download the **32-bit** Python 2.7 installer from python.org |
| Missing DirectX SDK | Build fails with `d3d9.h not found` | Install DirectX SDK June 2010 separately — it is not included in modern Windows SDK |
| Ubuntu version older than 20.04 | `libsodium` or `cmake` version too old | Upgrade OS or manually build newer versions |
| Not reading the README before asking | Setup fails at an unexpected step | The READMEs cover edge cases and exact commands — read them fully |

---

## Next Steps

- [Setting Up the Server](start-server-setup) — startup order, verification, and first-run checklist
- [Setting Up the Client](start-client-setup) — connecting the client to your server
