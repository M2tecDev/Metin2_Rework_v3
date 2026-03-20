# How Everything Fits Together — The Overall Architecture

> **Who is this for:** A developer who wants to understand the system as a whole before diving into any specific part.
> **Prerequisites:** None — this is the conceptual foundation for everything else.
> **What you will learn:** Why the project is structured the way it is, what each component does, how they communicate, and where to find things when you need them.

## Overview

Metin2 Rework v3 consists of five layers that form a chain from the player's keyboard to the database. Understanding this chain tells you where to look when something breaks and why certain rules (like "always start db before game") exist.

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Player                                                             │
│  (keyboard + screen)                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │  Player input (mouse clicks, key presses)
                             │  Screen output (rendered 3D world)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Client — Metin2.exe                                                │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────────────────────────┐   │
│  │  C++ engine      │◄──►│  Python UI layer                    │   │
│  │  (client-src)    │    │  (root/, uiscript/ from client-bin) │   │
│  │  Rendering, audio│    │  Windows, buttons, chat, inventory  │   │
│  │  Physics, packs  │    └──────────────────────────────────────┘   │
│  └─────────────────┘                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │  Binary TCP packets  (port 11011)
                             │  CG packets (client→game)
                             │  GC packets (game→client)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  game process  (server-src/game)                                    │
│                                                                     │
│  World simulation: movement, combat, skills, spawns, quests        │
│  Runs at 40 pulses/second                                           │
│  One process per game channel                                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │  Binary TCP packets  (port 1130)
                             │  GD packets (game→db)
                             │  DG packets (db→game)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  db process  (server-src/db)                                        │
│                                                                     │
│  Persistence layer: account login, character/item save/load        │
│  Memory cache of all active characters                              │
│  One process per server cluster                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │  SQL queries
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  MariaDB                                                            │
│                                                                     │
│  Durable storage: accounts, characters, items, quest flags         │
│  item_proto, mob_proto tables                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Four Repositories

Metin2 Rework v3 is split across four repositories. Understanding which repo holds what prevents confusion when you need to find or change something.

| Repo | Language | Role | Key contents |
|------|----------|------|--------------|
| `server-src` | C++ | Build source for server binaries | `game/`, `db/`, `qc/`, `common/`, `vendor/` |
| `server` | Python + config | Runtime environment | `share/bin/`, `share/conf/`, `sql/`, `start.py` |
| `client-src` | C++ | Build source for Metin2.exe | `UserInterface/`, `GameLib/`, `EterLib/`, `vendor/` |
| `client-bin` | Python + assets | Runtime client files | `root/`, `uiscript/`, `assets/` |

### Why are server/ and server-src/ separate?

**Source code vs runtime.** You compile `server-src` once when the C++ changes. The resulting binaries (`game`, `db`, `qc`) are copied into `server/share/bin/`. The `server/` repo holds configs, SQL schema, and management scripts that change independently of the C++ source — a config tweak does not require a recompile, and the management scripts evolve on their own schedule.

### Full 4-repo relationship

```
server-src/ ──(compile)──► copy game+db+qc ──► server/share/bin/
(C++ source)                                    server/share/locale/english/quest/
                                                        │
                                               python install.py  (once)
                                                        │
                                               python start.py
                                                        │
                                          game + db processes running
                                                        │
client-src/ ──(compile)──► Metin2.exe              TCP │
(C++ source)                    │                      │
                                └──────────────────────┘
client-bin/ ──(pack.py)──► packed .epk assets loaded by Metin2.exe
(Python/assets)
```

---

## Why Two Server Processes?

The server is split into **game** and **db**. This is a deliberate design decision, not an accident.

### What would break with a single process

If game and db were one process:
- A crash in the game logic (which handles untrusted player input) would kill the database connection at the same time, potentially leaving writes incomplete
- Database I/O is slow — waiting for MariaDB during combat would stall the 40-pulse game loop for every player on the server
- You could not restart just the game without also dropping all database connections and potentially losing in-flight saves

### The benefits of the split

**Crash isolation:** If game crashes, db is still running. It still holds the character cache. When game restarts, it reconnects to db and continues. No player data is lost.

**Performance:** db handles slow I/O asynchronously. game never blocks on a SQL query — it sends a request to db via packet and continues running.

**Security boundary:** game never makes direct SQL calls. Only db touches MariaDB. A memory corruption bug in game cannot directly corrupt the database.

---

## What Each Process Does

**game process — the waiter:**
- Accepts player TCP connections
- Runs the world: entity positions, combat resolution, skill calculations, NPC behaviour, quest triggers
- Asks db (via packets) to load/save character data
- Sends client updates (HP changes, item pickups, chat) as GC packets

**db process — the kitchen:**
- Authenticates login requests (checks account credentials against MariaDB)
- Loads character/item data from MariaDB when a player selects a character
- Maintains an in-memory cache of all logged-in characters' data
- Periodically flushes changes back to MariaDB
- Sends DG packets back to game with requested data

**MariaDB — the fridge:**
- Durable long-term storage
- Never accessed directly by game; only by db
- Holds the canonical state of all player data

**client — the customer:**
- Never talks to db directly; only to game
- Sends CG packets (player actions)
- Receives GC packets (world updates)
- Displays everything the Python UI layer draws

---

## How They Communicate

```
Client ←──CG/GC──► game ←──GD/DG──► db ←──SQL──► MariaDB

               game ←──GG──► game   (cross-channel: warps, whispers)
```

All connections use TCP (reliable, ordered delivery). There is no UDP in this stack. See [concept-packets](concept-packets) for the full packet namespace reference.

---

## What Happens When Things Crash

| What crashes | What breaks | What keeps working | How to recover |
|---|---|---|---|
| game process | All connected players disconnect | db, MariaDB, all player data | Restart game; players reconnect |
| db process | game loses its DB link and also crashes | MariaDB data intact | Restart db, then game |
| MariaDB | db loses SQL connection and crashes; game follows | Nothing (full cascade) | Restart MariaDB → db → game in order |
| Client | Only that one player | Server continues for everyone else | Restart the client |

The key insight: player data survives a game crash because db is still running with the character cache. Only a db or MariaDB crash can actually lose data — and only if it happens in the middle of a write cycle.

---

## Analogy

Think of a restaurant:

- **Client** = customer — places orders, receives food
- **game** = waiter — takes orders from customers, passes them to the kitchen, brings back results
- **db** = kitchen — does the actual work, maintains the current order list
- **MariaDB** = refrigerator — long-term ingredient storage; only the kitchen touches it directly

A waiter crash means customers have to reconnect and re-order, but the kitchen still has their previous orders. A kitchen crash is more serious — the waiter has nowhere to send requests. A fridge failure brings everything down.

---

## File Locations Overview

| What | Where |
|------|-------|
| Game process logs (info) | `server/<channel>/syslog` |
| Game process errors | `server/<channel>/syserr` |
| DB process logs (info) | `server/db/syslog` |
| DB process errors | `server/db/syserr` |
| Game configuration | `server/share/conf/conf.txt` |
| DB configuration | `server/share/conf/db.conf` |
| Item definitions | `server/share/conf/item_proto.txt` |
| Mob definitions | `server/share/conf/mob_proto.txt` |
| Other game config | `server/share/conf/*.txt` |
| Server SQL schema | `server/sql/` |
| Compiled binaries | `server/share/bin/` |
| Compiled quests | `server/share/locale/english/quest/` |
| Map data | `server/share/data/map/<mapname>/` |
| Client logs | `syserr.txt` (in client root dir) |
| Client Python scripts | `root/`, `uiscript/` (in client-bin) |
| Client packed assets | `pack/` (in client root dir) |

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Starting game before db | game exits at boot: "cannot connect to db" | Always start db first; wait for "boot sequence done" in db/syslog |
| Killing db before game on shutdown | Recent player saves may be lost | Stop game first (wait a moment), then stop db |
| Assuming a game crash lost player data | Unnecessary rollback actions | Check db/syslog — character data is in the db cache, not lost |
| Looking for errors in syslog instead of syserr | Missing real errors | syslog = normal info; syserr = actual errors |

---

## Next Steps

- [What is a Packet?](concept-packets) — the binary messages that flow between these layers
- [Setting Up the Server](start-server-setup) — how to start the two processes correctly
- [Fixing Server Errors](troubleshoot-server) — when one of the processes refuses to start
