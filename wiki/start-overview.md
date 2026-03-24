# Metin2 Rework v3 — Overview & Getting Started

> **Who is this for:** Anyone new to the project who wants to understand what it is before diving in.
> **Prerequisites:** None — this is the starting point.
> **What you will learn:** What the project contains, how the three repositories relate to each other, and which path through the wiki fits your background.

## Overview

Metin2 Rework v3 is a private server project that rebuilds and extends the Metin2 MMORPG. It consists of three separate repositories that together produce a running game: a server backend, a C++ game client, and a Python-based UI layer. This page explains how they fit together and points you toward the right starting path.

---

## The Three Repositories

```
┌─────────────────────────────────────────────────────────────────┐
│                        client-bin                               │
│   Python scripts (root/, uiscript/) + assets (textures, maps)  │
│   ──pack.py──> .eix/.epk archives read by the client           │
└───────────────────────┬─────────────────────────────────────────┘
                        │ packed into
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        client-src                               │
│   C++ source → compiled to Metin2.exe                          │
│   Embeds CPython, reads .eix/.epk packs, handles rendering     │
└───────────────────────┬─────────────────────────────────────────┘
                        │ TCP connection (port 11011)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     server-src / game                           │
│   C++ game process — world simulation, combat, quests          │
└───────────────────────┬─────────────────────────────────────────┘
                        │ TCP connection (internal)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     server-src / db                             │
│   C++ db process — account/character/item persistence          │
└───────────────────────┬─────────────────────────────────────────┘
                        │ SQL
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        MariaDB                                  │
│   Relational database — player data, proto tables, quests      │
└─────────────────────────────────────────────────────────────────┘
```

| Repository | Language | What it produces | Runs on |
|------------|----------|-----------------|---------|
| **server-src** | C++ | `game` and `db` processes | Linux server |
| **client-src** | C++ | `Metin2.exe` | Windows |
| **client-bin** | Python + assets | Packed `.eix`/`.epk` files loaded by the client | Windows (packed into client dir) |

---

## The Two Server Processes — Why Not One?

The server is split into two separate processes: **game** and **db**.

**Why the split?**

- **Crash isolation:** The game process handles hundreds of simultaneous player actions — if it crashes, the db process keeps running. Player data in MariaDB is unaffected. You restart game without losing anything.
- **Performance:** Database queries (loading a character, saving items) are slow I/O operations. Running them in a separate process means they never block the game's main loop, which needs to tick 40 times per second.
- **Security boundary:** The db process is the only thing that directly touches MariaDB. The game process never makes SQL calls — it asks db instead. This limits the blast radius of a game-process exploit.

**What each process does:**

**game process:**
- Runs the world simulation (movement, combat, skills, quests, spawns)
- Accepts player TCP connections
- Handles all real-time gameplay
- Talks to db process for persistence

**db process:**
- Manages account login/logout
- Loads and saves characters, items, and quest flags
- Maintains a memory cache of active character data
- Talks to MariaDB for durable storage

---

## What Does the Client Do?

The client (`Metin2.exe`) is the player-facing application. It:

- Renders the 3D world using DirectX
- Plays audio
- Displays all UI (windows, buttons, chat) driven by Python scripts
- Sends player input to the game server as binary TCP packets
- Receives game state updates (movement, damage, item changes) from the server

The Python scripts in `client-bin` control almost all UI logic. When you click a button, Python code runs. When a window needs to be shown, Python code creates it. The C++ in `client-src` provides the rendering engine and a library of functions that Python calls.

---

## Which Path Is Right For You?

### Path A — New to Metin2 development
You have limited or no experience with game server development.

→ [This page](start-overview) → [Requirements](start-requirements) → [Server Setup](start-server-setup) → [Client Setup](start-client-setup) → [Your First Change](start-first-change) → [Daily Workflow](start-workflow)

### Path B — I know programming but am new to Metin2
You are comfortable with C++ or Python, but the Metin2 architecture is new to you.

→ [This page](start-overview) → [Architecture](concept-architecture) → [Packets](concept-packets) → [vnum](concept-vnum) → [Proto](concept-proto) → [Adding a New System](guide-Adding-a-New-System)

### Path C — Experienced developer
You want the deep technical reference without hand-holding.

→ [This page](start-overview) → [Blueprint pages](Home) → [Topic Guides](Home)

---

## Glossary of Key Terms

| Term | Plain-English Definition |
|------|------------------------|
| **vnum** | Virtual Number — the unique integer ID assigned to every item, mob, skill, map, and effect. If two things share a vnum, things break. |
| **proto** | Short for "prototype table" — the blueprint for a type of item or mob. `item_proto` defines every item; `mob_proto` defines every mob. Exists as both a SQL table (server) and a binary file (client). |
| **sectree** | A spatial partitioning cell in the map grid used by the [sectree](concept-sectree) system. The server uses these to efficiently find which entities are near each other. |
| **packet** | A binary message sent over TCP between the client and server. Every player action (attack, move, use item) is a packet. Every server response (HP change, item update) is a packet. |
| **phase** | The connection state a client is currently in: HANDSHAKE → LOGIN → SELECT → LOADING → GAME. Different packet types are only valid in specific phases. |
| **pulse** | One server tick. The server runs at 40 pulses per second. All timers, movement, and combat are measured in pulses. |
| **DESC** | Short for "descriptor" — the server-side object representing one connected TCP client. Each logged-in player has exactly one DESC. |
| **VID** | Virtual ID — a session-only integer assigned to each visible entity (player, mob, NPC) on a map. Used in packets to identify who is who. Not the same as the character's database ID. |
| **regen** | Spawn configuration. A `regen.txt` file tells the server where to spawn mobs, in what quantity, and how often to respawn them after they are killed. |
| **pck / epk** | The client's encrypted pack file formats. `.eix` is the index; `.epk` is the data. All Python scripts and assets are packed into these files. |
| **tick rate** | 40 pulses per second — how often the server's main loop runs. Each pulse processes movement, timers, and pending network events. |

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Starting the game process before db | game exits immediately with "cannot connect to db" | Always start db first, wait for it to be ready, then start game |
| Editing .py files but not repacking | Old UI behaviour despite file changes | Run `pack.py` after every Python edit, then restart the client |
| Using map editor coordinates directly in regen.txt | Mobs spawn in wrong location or not at all | Multiply map editor values by 100 — server uses centimetres |
| Changing item_proto SQL but not regenerating client binary | Items show wrong names/icons in client | Regenerate binary proto, repack, restart both server and client |
| Assuming one vnum range works for all types | Item and mob with same vnum causes crashes | Each type has its own vnum space — see [concept-vnum](concept-vnum) |

---

## Next Steps

- [Requirements & Prerequisites](start-requirements) — what you need to install before anything else
- [How Everything Fits Together](concept-architecture) — a deeper look at the architecture
- [What is a Packet?](concept-packets) — how the client and server communicate
