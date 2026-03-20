# Metin2 Rework v3 — Wiki Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a beginner-friendly entry layer to the existing wiki by creating 16 new pages (start-*, concept-*, troubleshoot-*), inserting prerequisite boxes into 28 existing pages, rewriting Home.md, and updating _Sidebar.md — all in `wiki/` without removing any existing content.

**Architecture:** Sequential single-agent execution in 8 ordered task groups. New concept pages are created before existing pages reference them, so all cross-links are valid by the time they are written. Home.md and _Sidebar.md are rewritten last once all new pages exist.

**Tech Stack:** Markdown (GitHub Wiki flavour), `[[page-name|Display Name]]` wiki links for _Sidebar.md, standard `[text](page-name)` links inside page content.

**Spec:** `docs/superpowers/specs/2026-03-20-metin2-wiki-restructure-design.md`

> **Task numbering note:** The spec uses its original numbering (Task 5, 6, 7, 2, 3, 4, 1). This plan renumbers them 1–8 for clarity, but the **execution order is identical**: new files first (start-* → concept-* → troubleshoot-*), then box insertions (blueprint-* → guide-* → topic-*), then Home.md and _Sidebar.md last.

---

## File Map

### Created (16 new files)

| File | Responsibility |
|------|---------------|
| `wiki/start-overview.md` | What the project is; 3 repos; 2 server processes; entry paths; glossary |
| `wiki/start-requirements.md` | Linux server prereqs; Windows client prereqs; skills table |
| `wiki/start-server-setup.md` | Startup order (db→game), verification, shutdown, common mistakes |
| `wiki/start-client-setup.md` | serverinfo.py, pack.py, connecting, common mistakes |
| `wiki/start-first-change.md` | Three end-to-end examples (NPC, item, Python UI); The Golden Rule |
| `wiki/start-workflow.md` | Master reference table (what I changed → what to restart); safe restart sequence |
| `wiki/concept-architecture.md` | Big picture ASCII diagram; why 2 processes; crash behaviour table; file locations |
| `wiki/concept-packets.md` | Packet anatomy; 5 namespaces table; byte diagram; phases state machine |
| `wiki/concept-vnum.md` | ID system; type/range table; upgrade chain ASCII; safe custom ranges |
| `wiki/concept-proto.md` | Blueprint analogy; two-version problem; sync workflow; key fields table |
| `wiki/concept-sectree.md` | Spatial partitioning; sector grid ASCII; coordinate system; attribute map |
| `wiki/concept-lua-quests.md` | Quest state machine; 3-stage pipeline; triggers table; dialog suspend/resume |
| `wiki/concept-python-ui.md` | Why Python; architecture diagram; C++ modules; root vs uiscript; pack cycle |
| `wiki/troubleshoot-server.md` | syserr guide; 15+ error entries; server won't start checklist; mobs not spawning |
| `wiki/troubleshoot-client.md` | syserr.txt guide; 15+ error entries; build fail errors; can't connect checklist |
| `wiki/troubleshoot-db.md` | DB diagnostics; MariaDB unreachable; proto not loading; useful SQL queries |

### Modified (30 existing files)

| File | Change |
|------|--------|
| `wiki/blueprint-Game-Client-Protocol.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-Login-Flow.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-Character-System.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-Item-System.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-Combat-System.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-Quest-System.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-UI-Python-System.md` | Insert "Before You Read" box after first heading |
| `wiki/blueprint-Map-World-System.md` | Insert "Before You Read" box after first heading |
| `wiki/guide-Adding-a-New-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Build-Environment.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Best-Practices.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Asset-Pipeline.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Localization.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Debugging.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Database-Proto.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Security-AntiCheat.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Skill-Buff-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-NPC-and-Spawning.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Horse-Mount-Pet.md` | Insert "Prerequisites" box after first heading |
| `wiki/guide-Economy.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Game-Client-Protocol.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Login-Flow.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Character-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Item-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Combat-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Quest-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-UI-Python-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/topic-Map-World-System.md` | Insert "Prerequisites" box after first heading |
| `wiki/Home.md` | Full rewrite — adds "Where do I start?", Getting Started, Concepts, Troubleshooting sections |
| `wiki/_Sidebar.md` | Add Getting Started, Concepts, Troubleshooting sections at top |

---

## Important Rules (apply to every task)

- **After each individual file:** output `✅ Done: [filename]`
- **After each task group:** output `✅ Task [N] complete — [X] files processed`
- **After all tasks:** output full summary
- **No installation steps from scratch** — link to READMEs:
  - Server: https://github.com/d1str4ught/m2dev-server-src/tree/21519899adf6ade7937d71b1d9d886d502762a3b?tab=readme-ov-file#installationconfiguration
  - Client src: https://github.com/d1str4ught/m2dev-client-src/tree/a7555110828182f20d0a0306aac0552142cf0039#installationconfiguration
  - Client bin: https://github.com/d1str4ught/m2dev-client/tree/ecef2dcdb89f5d0344677b2902ad175809b70f52?tab=readme-ov-file#installationconfiguration
- **concept-* pages:** no large C++ code blocks; ASCII diagrams, tables, analogies only
- **troubleshoot-* pages:** use real error strings as they appear in syslog/syserr
- **Every new page:** opens with `> **Who is this for:**` / `> **Prerequisites:**` / `> **What you will learn:**` box; closes with `## Next Steps`
- **Every concept-* page:** at least one ASCII diagram
- **Language:** English only

---

## Page Structure Reference

### New page template (all start-*, concept-*, troubleshoot-*)

```markdown
# [Title]

> **Who is this for:** [target audience]
> **Prerequisites:** [what to know/have before reading]
> **What you will learn:** [what you can do after reading]

## Overview

[Short explanation of what this page covers and why it matters]

## [Main sections...]

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|

## Next Steps

- [Link to next logical page]
- [Link to related page]
```

### Blueprint "Before You Read" box

Insert this block directly after the `# Blueprint: ...` line and before the next content line.
Each file gets only the concept links listed in the table below — do not add extras.

```markdown
> ### 📖 New to this topic?
> This is an advanced reference page. If you are not familiar with the basics yet, read these first:
> - [How Everything Fits Together](concept-architecture)
> - [What is a Packet?](concept-packets)
>
> **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
```

Per-file concept links:

| File | Concept links in box |
|------|---------------------|
| blueprint-Game-Client-Protocol | concept-architecture, concept-packets |
| blueprint-Login-Flow | concept-architecture, concept-packets |
| blueprint-Character-System | concept-architecture, concept-vnum |
| blueprint-Item-System | concept-architecture, concept-vnum |
| blueprint-Combat-System | concept-architecture |
| blueprint-Quest-System | concept-architecture, concept-lua-quests |
| blueprint-UI-Python-System | concept-architecture, concept-python-ui |
| blueprint-Map-World-System | concept-architecture, concept-sectree |

### Guide/Topic "Prerequisites" box

Insert this block directly after the `# Guide: ...` / `# [Title]` line and before the next content line.

```markdown
> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [relevant concept page]
> - [relevant concept page]
>
> If you are setting up for the first time, start with [Getting Started](start-overview).
```

Per-file concept links:

| File | Concept links in box |
|------|---------------------|
| guide-Adding-a-New-System | concept-architecture, concept-packets |
| guide-Build-Environment | concept-architecture |
| guide-Best-Practices | concept-architecture |
| guide-Asset-Pipeline | concept-python-ui |
| guide-Localization | concept-python-ui |
| guide-Debugging | concept-architecture |
| guide-Database-Proto | concept-proto, concept-vnum |
| guide-Security-AntiCheat | concept-packets, concept-architecture |
| guide-Skill-Buff-System | concept-vnum, concept-architecture |
| guide-NPC-and-Spawning | concept-vnum, concept-sectree |
| guide-Horse-Mount-Pet | concept-vnum |
| guide-Economy | concept-proto, concept-vnum |
| topic-Game-Client-Protocol | concept-packets, concept-architecture |
| topic-Login-Flow | concept-packets, concept-architecture |
| topic-Character-System | concept-vnum, concept-architecture |
| topic-Item-System | concept-vnum, concept-proto |
| topic-Combat-System | concept-architecture |
| topic-Quest-System | concept-lua-quests, concept-architecture |
| topic-UI-Python-System | concept-python-ui, concept-architecture |
| topic-Map-World-System | concept-sectree, concept-architecture |

---

## Task 1 — Create start-* pages (6 files)

**Files:**
- Create: `wiki/start-overview.md`
- Create: `wiki/start-requirements.md`
- Create: `wiki/start-server-setup.md`
- Create: `wiki/start-client-setup.md`
- Create: `wiki/start-first-change.md`
- Create: `wiki/start-workflow.md`

- [ ] **Step 1: Create `wiki/start-overview.md`**

  Required content:
  - Title: `# Metin2 Rework v3 — Overview & Getting Started`
  - Who is this for: anyone new to the project
  - What is Metin2 Rework v3 — 1–2 sentences
  - The 3 repositories and their roles — ASCII diagram showing the relationship:
    ```
    [client-bin Python UI] ──pack──> [client-src Metin2.exe] ──TCP──> [server-src/game] ──TCP──> [server-src/db] ──SQL──> [MariaDB]
    ```
  - The 2 server processes (game + db) and WHY there are 2 — explain the design split, not just what they do
  - What does the client do?
  - The 3 entry paths table (Path A / B / C — same as will appear in Home.md)
  - Glossary table: vnum, proto, sectree, packet, phase, pulse, DESC, VID, regen, pck/epk, tick rate — plain-English definitions
  - Common Mistakes table
  - Next Steps → start-requirements

- [ ] **Step 2: Create `wiki/start-requirements.md`**

  Required content:
  - Title: `# Requirements & Prerequisites`
  - Who is this for: someone about to set up the server or build the client
  - Section A: Running the server (Linux)
    - Recommended OS: Ubuntu 22.04+
    - Brief list of what is needed (cmake, gcc, mariadb, libsodium, etc.)
    - Link to server-src README (use the README link from the rules above)
    - Minimum hardware (4 GB RAM, 2-core CPU, 20 GB disk — reasonable estimates)
  - Section B: Building the client (Windows)
    - Visual Studio 2022 with "Desktop development with C++" workload
    - Brief list of what is needed (DirectX SDK, Python 2.7 32-bit, Granny2)
    - Link to client-src README
  - Skills table:
    | Task | C++ | Python | SQL | Linux | Networking |
    Each row: Run server / Build client / Add items / Write quests / Modify UI / Add packets / Debug crashes
    Use ✓ / (partial) / — to indicate requirement level
  - Common Mistakes table
  - Next Steps → start-server-setup, start-client-setup

- [ ] **Step 3: Create `wiki/start-server-setup.md`**

  Required content:
  - Title: `# Setting Up the Server`
  - Who is this for: someone running the server for the first time
  - Brief overview of what setup achieves
  - The correct startup ORDER with explanation:
    ```
    1. Start MariaDB
    2. Start db process  ← must be ready before game connects
    3. Start game process
    ```
    Explain WHY: game process connects to db on startup; if db is not ready, game exits with a connection error
  - Link to server-src README for full install steps
  - After the README — how to verify everything is working:
    - What should appear in syslog when db starts correctly (e.g. `"boot sequence done"`)
    - What should appear in syslog when game starts correctly (e.g. `"SYSTEM: boot done"`)
    - How to confirm a client can connect
  - The safe shutdown ORDER (game first, then db — and why: game must flush its cache to db before db stops)
  - Common post-setup mistakes table (e.g. starting game before db, wrong port in db.conf, missing locale files)
  - Next Steps → start-client-setup, troubleshoot-server

- [ ] **Step 4: Create `wiki/start-client-setup.md`**

  Required content:
  - Title: `# Setting Up the Client`
  - Who is this for: someone connecting a client to their server for the first time
  - Prerequisites: working server + built client-src + configured client-bin
  - Link to client-src README for building Metin2.exe
  - Link to client-bin README for asset configuration
  - After the READMEs — connecting to your server:
    - Where to set the server IP: `serverinfo.py` — explain each field (CH1, IP, PORT, P2P_PORT)
    - How to pack assets with `pack.py` — one-paragraph explanation of what it does and when to run it
    - How to verify the connection works (what you see in the login screen if it works vs. doesn't)
  - Common mistakes table (e.g. wrong IP, forgot to repack after editing serverinfo.py, wrong port, CRC mismatch)
  - Next Steps → start-first-change, troubleshoot-client

- [ ] **Step 5: Create `wiki/start-first-change.md`**

  Required content:
  - Title: `# Your First Change — The Complete Development Workflow`
  - Who is this for: developer making their first change to the project
  - Introduction paragraph explaining the goal (show the full change-test cycle end-to-end)
  - **Example A: Spawn a new NPC**
    - Step 1: Add mob_proto entry in SQL (show example INSERT with vnum, name, level, hp, model_vnum)
    - Step 2: Add regen.txt entry (show example line, explain each field: map, x, y, dir, vnum, count, respawn_time)
    - Step 3: Restart the server (which process: game only — db doesn't need restart for regen changes)
    - Step 4: Test in-game (how to teleport to the spawn location and verify)
  - **Example B: Change an existing item**
    - Step 1: Modify item_proto in SQL (e.g. change `gold` value of vnum 1)
    - Step 2: Export and regenerate the client binary proto (reference guide-Database-Proto for the process)
    - Step 3: Restart game process + repack client assets
    - Step 4: Test in-game
  - **Example C: Change the Python UI (move a button)**
    - Step 1: Find the right .py file (explain: layout in uiscript/, logic in root/)
    - Step 2: Edit the position value in the uiscript file
    - Step 3: Repack with pack.py
    - Step 4: Restart only the client (no server restart needed)
  - **Highlighted box — The Golden Rule:**
    ```
    Server-side change    → restart server (game process)
    Client-side change    → repack + restart client
    Proto change          → BOTH (server restart + client repack)
    Packet struct change  → recompile EVERYTHING
    ```
  - Common Mistakes table
  - Next Steps → start-workflow, guide-Adding-a-New-System

- [ ] **Step 6: Create `wiki/start-workflow.md`**

  Required content:
  - Title: `# The Daily Development Workflow`
  - Who is this for: any developer making regular changes
  - Introduction paragraph: why this table exists (people waste hours restarting the wrong thing)
  - **Master reference table:**

    | I changed... | Run qc? | Recompile server? | Restart db? | Restart game? | Recompile client? | Repack assets? | Restart client? | Notes |
    |---|---|---|---|---|---|---|---|---|
    | item_proto SQL | — | — | — | ✓ (reload) | — | — | — | Use `/reload item_proto` if supported, else restart game |
    | mob_proto SQL | — | — | — | ✓ | — | — | — | |
    | regen.txt | — | — | — | ✓ | — | — | — | Only game process reads regen |
    | .quest source file | ✓ qc | — | — | ✓ | — | — | — | Must compile with qc first |
    | questmanager C++ | — | ✓ | — | ✓ | — | — | — | |
    | Other C++ server code | — | ✓ | — | ✓ | — | — | — | |
    | packet_headers.h | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | Both sides must match |
    | tables.h / length.h | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | |
    | C++ client code | — | — | — | — | ✓ | — | ✓ | |
    | Python UI script (root/) | — | — | — | — | — | ✓ | ✓ | |
    | UIScript layout (uiscript/) | — | — | — | — | — | ✓ | ✓ | |
    | DB schema change | — | — | ✓ | ✓ | — | — | — | db must reload schema |
    | .pck asset files | — | — | — | — | — | ✓ | ✓ | |

  - **Section: The safe restart sequence**
    1. Stop game process
    2. Stop db process
    3. (make your changes)
    4. Start db process — wait for "boot sequence done" in syslog
    5. Start game process — wait for "SYSTEM: boot done" in syslog
    6. Repack client if needed
    7. Restart client

  - **Section: How do I know it actually worked?**
    - Check syslog (not syserr) for startup confirmation messages
    - Check syserr is empty (or has only expected warnings)
    - Test the specific change in-game

  - **Section: The nuclear option**
    When in doubt — full rebuild + restart everything:
    1. Stop game and db
    2. Recompile server-src
    3. Recompile client-src
    4. Start db, then game
    5. Run qc on all quest files
    6. Repack all client assets
    7. Restart client

  - Common Mistakes table
  - Next Steps → concept-architecture, guide-Adding-a-New-System

- [ ] **Step 7: Verify all 6 start-* files exist**

  ```bash
  ls wiki/start-*.md
  ```
  Expected: 6 files listed

- [ ] **Step 8: Commit**

  ```bash
  git add wiki/start-overview.md wiki/start-requirements.md wiki/start-server-setup.md wiki/start-client-setup.md wiki/start-first-change.md wiki/start-workflow.md
  git commit -m "feat(wiki): add start-* getting started pages (6 files)"
  ```

  Output: `✅ Task 1 complete — 6 files created`

---

## Task 2 — Create concept-* pages (7 files)

**Files:**
- Create: `wiki/concept-architecture.md`
- Create: `wiki/concept-packets.md`
- Create: `wiki/concept-vnum.md`
- Create: `wiki/concept-proto.md`
- Create: `wiki/concept-sectree.md`
- Create: `wiki/concept-lua-quests.md`
- Create: `wiki/concept-python-ui.md`

> **Reminder:** No large C++ code blocks. Use ASCII diagrams, tables, analogies, plain English.

- [ ] **Step 1: Create `wiki/concept-architecture.md`**

  Required content:
  - Title: `# How Everything Fits Together — The Overall Architecture`
  - Who is this for: developer who wants to understand the system before diving into code
  - **ASCII diagram** (the big picture):
    ```
    Player
      │
      ▼
    [Client — Metin2.exe]
      │  TCP (port 11011)
      ▼
    [game process]
      │  TCP (internal)
      ▼
    [db process]
      │  SQL
      ▼
    [MariaDB]
    ```
    With annotations: what travels over each connection (packets / binary structs / SQL queries)
  - Why 2 server processes? — explain the design reason:
    - Crash isolation: if game crashes, DB and player data survive
    - Performance: DB operations are async and don't block the game loop
    - Explain what would break if everything were one process
  - What does each process do? — bullet points, plain language
  - How do they communicate? — TCP, named packet types, no struct details
  - What happens when things crash — table:
    | What crashes | What breaks | What keeps working | How to recover |
    |---|---|---|---|
    | game process | All connected players disconnect | DB, MariaDB, player data | Restart game |
    | db process | game loses DB connection, crashes too | MariaDB data intact | Restart db then game |
    | MariaDB | db process loses connection | Nothing (all crash cascade) | Restart all three in order |
    | Client | Only that player | Everything else | Restart client |
  - Analogy: game = waiter, db = kitchen, MariaDB = fridge, client = customer
  - File locations overview table:
    | What | Where |
    |------|-------|
    | Server logs (info) | `game/syslog`, `db/syslog` |
    | Server errors | `game/syserr`, `db/syserr` |
    | Server config | `game/conf.txt`, `db/db.conf` |
    | Map data | `game/maps/` |
    | Quest scripts (source) | `game/quest/` |
    | Quest scripts (compiled) | `game/object/` |
    | Client logs | `syserr.txt` in client dir |
    | Client Python scripts | `root/`, `uiscript/` in client-bin |
    | Client packed assets | `pack/` in client-bin |
  - Common Mistakes table
  - Next Steps → concept-packets, start-server-setup

- [ ] **Step 2: Create `wiki/concept-packets.md`**

  Required content:
  - Title: `# What is a Packet? — Understanding Network Communication`
  - Who is this for: developer who needs to understand how the client and server communicate
  - What is a packet? — analogy: a typed form with a header saying what type of form it is, then data
  - Why TCP and not UDP? — explain reliability requirement for an RPG (ordered delivery, no retransmit logic needed)
  - **The 5 packet namespaces table:**
    | Namespace | Direction | Between | Example use |
    |-----------|-----------|---------|-------------|
    | CG | Client → Game | Client ↔ Server | Player attacks, moves, chats |
    | GC | Game → Client | Server → Client | HP update, item change, spawn NPC |
    | GD | Game → DB | game → db | Save player data, login check |
    | DG | DB → Game | db → game | Load player, account info result |
    | GG | Game ↔ Game | game ↔ game | Cross-channel warp, whisper routing |
  - **ASCII byte diagram:**
    ```
    ┌─────────────────────────────────────────────┐
    │ header  │ length  │ payload                 │
    │ 2 bytes │ 2 bytes │ variable                │
    └─────────────────────────────────────────────┘
    ```
    With plain explanation of each field
  - What is encryption and why is it used?
    - X25519 key exchange on handshake → XSalsa20 stream cipher for all subsequent traffic
    - Explain without math: "why it matters" (prevents packet sniffing / replay attacks)
  - What are connection phases? — **ASCII state machine:**
    ```
    [HANDSHAKE] → key exchange complete → [LOGIN] → player selected → [LOADING] → world ready → [GAME]
                                                                                               ↓
                                                                                           [DEAD]
    ```
    Explain why phases exist (prevents sending GAME packets before being logged in)
  - How to find which packet does what — `packet_headers.h` is the source of truth; link to topic-Game-Client-Protocol
  - Common Mistakes table
  - Next Steps → concept-architecture, topic-Game-Client-Protocol

- [ ] **Step 3: Create `wiki/concept-vnum.md`**

  Required content:
  - Title: `# What is a vnum? — Understanding the ID System`
  - Who is this for: developer adding or modifying items, mobs, or skills
  - What is a vnum? — Virtual Number, every "thing" in the game has one; it is the primary key for everything
  - Why numbers instead of names? — performance, binary protocols, DB efficiency (also: names are localisable, vnums are not)
  - **Which types of things have vnums — table:**
    | Type | vnum range | Example | Where defined |
    |------|------------|---------|---------------|
    | Items | 1–799999 | vnum 1 = Sword +0 | item_proto (SQL + binary) |
    | Mobs/NPCs | 1–65535 | vnum 101 = Wolf | mob_proto (SQL + binary) |
    | Skills | 1–255 | vnum 1 = Sword Skill | skill_proto |
    | Effects | registered at startup | Hit effect | CEffectManager |
    | Maps | 1–299 static, 300+ dynamic | 1 = n_flame_01 | map config files |
  - **Item upgrade vnum chain — ASCII:**
    ```
    vnum 1 (Sword +0)
      dwRefinedVnum = 2
          │
          ▼
    vnum 2 (Sword +1)
      dwRefinedVnum = 3
          │
          ▼
    vnum 3 (Sword +2)
      ...
    ```
  - What happens if two things share a vnum? — concrete symptoms: wrong model shown, wrong stats, client crash on spawn
  - How to choose safe vnums for custom content — recommended custom ranges:
    | Type | Safe custom range |
    |------|------------------|
    | Items | 50000–799999 |
    | Mobs | 10000–65535 |
    | Maps | 300+ |
  - Common Mistakes table (e.g. reusing a vnum, forgetting to update both SQL and binary proto)
  - Next Steps → concept-proto, guide-Database-Proto

- [ ] **Step 4: Create `wiki/concept-proto.md`**

  Required content:
  - Title: `# What are item_proto and mob_proto? — The Blueprint System`
  - Who is this for: developer modifying or adding items or mobs
  - What is a proto table? — Blueprint analogy: proto defines WHAT something IS (the template), not a specific instance
  - **The two-version problem — diagram:**
    ```
    Server                          Client
    ┌──────────────┐                ┌──────────────────┐
    │ item_proto   │                │ item_proto.bin   │
    │ (MariaDB     │ ◄─ must ─►    │ (packed into     │
    │  SQL table)  │    match       │  client assets)  │
    └──────────────┘                └──────────────────┘
    Used for:                       Used for:
    - game logic                    - display names
    - drop rates                    - icons
    - stat calculation              - descriptions
    - giving items to players       - client-side validation
    ```
  - What happens when they are out of sync? — table:
    | Symptom | Likely cause | How to check |
    |---------|-------------|--------------|
    | Wrong item name shown to client | Client proto outdated | Compare vnums between SQL and binary |
    | Kicked on login with CRC error | Binary file mismatch | Regenerate binary + repack |
    | Wrong mob model displayed | Client mob_proto outdated | Check client vs SQL mob vnum |
    | Server gives item but wrong icon | Client item_proto outdated | Regenerate + repack |
  - The sync workflow step by step (no commands, just the concept):
    1. Change SQL table (add/modify row)
    2. Export to text format (txt_proto)
    3. Convert text to binary format
    4. Pack binary into client assets
    5. Restart game process + repack client
  - Key fields overview table (important fields only):
    | Field | Meaning | Example |
    |-------|---------|---------|
    | vnum | Unique ID | 1 |
    | name | Internal name (not displayed) | `"Sword"` |
    | type | Item category | `ITEM_WEAPON` |
    | wearflag | Which equipment slot | `WEAR_WEAPON` |
    | dwRefinedVnum | vnum of next upgrade tier | 2 |
    | wRefineSet | Which upgrade recipe to use | 501 |
  - Common Mistakes table
  - Next Steps → guide-Database-Proto, concept-vnum

- [ ] **Step 5: Create `wiki/concept-sectree.md`**

  Required content:
  - Title: `# What is a SECTREE? — Understanding Spatial Partitioning`
  - Who is this for: developer working with maps, spawns, or movement
  - The problem first: 1000 players + 5000 monsters = 6000 entities; checking every pair = 18 million checks per tick (O(n²)); explain simply why this is unacceptable at 40 pulses/second
  - The solution: divide the map into a grid — **ASCII diagram:**
    ```
    ┌────┬────┬────┬────┐
    │    │    │ P  │    │  P = Player
    ├────┼────┼────┼────┤  M = Monster
    │ M  │    │    │    │
    ├────┼────┼────┼────┤  Each cell = one SECTREE
    │    │    │    │ M  │  Size: 3200 × 3200 world units
    └────┴────┴────┴────┘
    ```
  - What is a SECTREE? — one cell in the grid; knows which entities are inside it
  - How lookup works: player at (x,y) → calculate sector → check that sector + 8 neighbours only
  - What happens when a player moves between sectors — **ASCII diagram showing view range:**
    ```
    Old sector: [A][B][C]     New sector: [B][C][D]
                [D][P][E]  →             [E][P][F]
                [F][G][H]                [G][H][I]

    Entities leaving view → GC_CHARACTER_DEL sent
    Entities entering view → GC_CHARACTER_ADD sent
    ```
  - The coordinate system:
    - 1 unit = 1 centimetre in game world
    - Map editor shows metres → multiply by 100 for server coordinates
    - regen.txt uses server coordinates (centimetres)
  - Why this matters for developers:
    - Attribute map (passable/water/safe-zone/no-mount) stored per sector
    - Wrong attribute map = characters walk through walls or can't enter valid areas
  - Common Mistakes table (e.g. using editor coords directly in regen.txt, forgetting ×100 factor)
  - Next Steps → guide-NPC-and-Spawning, blueprint-Map-World-System

- [ ] **Step 6: Create `wiki/concept-lua-quests.md`**

  Required content:
  - Title: `# Understanding the Quest System — From Source File to Runtime`
  - Who is this for: developer writing or modifying quest scripts
  - What is a "quest" in Metin2? — a state machine; player is always in ONE state per quest — **ASCII state machine:**
    ```
    state start begin
         │
         │ [trigger: click NPC]
         ▼
    state talking begin
         │
         │ [trigger: player says "yes"]
         ▼
    state rewarded begin   ← terminal state
    ```
  - **The three-stage pipeline — diagram:**
    ```
    Stage 1: Author writes
    quest my_quest begin
      state start begin
        ...
      end
    end
    (human-readable DSL in game/quest/)
          │
          │  qc compiler
          ▼
    Stage 2: Compiled Lua chunks
    stored in game/object/
    (binary Lua bytecode)
          │
          │  CQuestManager loads at startup
          ▼
    Stage 3: Runtime
    Triggers fire → CQuestManager resumes
    the correct Lua coroutine
    ```
  - What are states? — analogy: a bouncer with a clipboard; different reactions depending on your "status" with the quest
  - What are triggers? — **table:**
    | Trigger | When it fires | Example use |
    |---------|--------------|-------------|
    | click | Player clicks NPC | Start a conversation |
    | kill | Player kills a mob | Count kills for a task |
    | levelup | Player gains a level | Award level-up bonus |
    | login | Player enters the world | Daily reward check |
    | timer | A timer expires | Delayed reward delivery |
    | item.use | Player uses a quest item | Activate item effect |
  - How dialog works (the suspend/resume cycle) — **ASCII sequence diagram:**
    ```
    Lua coroutine          Server          Client
          │                  │               │
          │── say("Hello") ──►│               │
          │  (coroutine       │── GC_QUEST ──►│
          │   suspends)       │               │  (dialog shown)
          │                  │◄── CG_QUEST ──│  (player clicks OK)
          │◄── resume ───────│               │
          │  (coroutine       │               │
          │   continues)      │               │
    ```
  - Why Lua and not C++? — hot-reload: quest scripts can be updated without recompiling the server binary; run `qc` and reload
  - Where compiled files live: `game/object/` directory; each quest produces a `.quest` bytecode file
  - Common Mistakes table (e.g. forgot to run qc, using wrong trigger name, state name typo)
  - Next Steps → blueprint-Quest-System, guide-Adding-a-New-System

- [ ] **Step 7: Create `wiki/concept-python-ui.md`**

  Required content:
  - Title: `# Why Python for the UI? — Understanding the Client UI Architecture`
  - Who is this for: developer modifying or building client-side UI
  - Why Python? — Change UI without recompiling C++; faster iteration; non-C++ developers can contribute
  - **The architecture — ASCII diagram:**
    ```
    Metin2.exe starts
          │
          ▼
    Loads CPython 2.7 interpreter (embedded in EterPythonLib)
          │
          ▼
    Registers C++ modules:
    net, player, item, chr, wndMgr, grp, app, ui, ...
          │
          ▼
    Runs root/game.py
          │
          ▼
    Python controls all UI from here
    (creates windows, handles events, sends packets)
    ```
  - How Python talks to C++:
    - Not magic — C++ registers functions using the Python C API
    - Analogy: C++ builds a toolbox with labelled tools; Python picks up the tools by name
    - Module names and rough responsibilities: `net` (send packets), `player` (local player data), `item` (item data lookup), `chr` (character data), `wndMgr` (window manager), `grp` (2D graphics)
  - Two types of UI files — table:
    | File type | Location | Purpose | Example |
    |-----------|----------|---------|---------|
    | Logic | `root/*.py` | What happens when you click, what data is shown | `uiinventory.py` |
    | Layout | `uiscript/uiscript/*.py` | Where things are on screen (positions, sizes) | `uiscript/inventory.py` |
  - The widget system:
    - C++ creates actual window/button objects (in EterPythonLib)
    - Python holds a handle (integer ID) to each widget
    - Analogy: Python has the TV remote; C++ is the TV
  - How changes become active:
    - Python files are packed into `.eix`/`.epk` archives by `pack.py`
    - Client reads from the pack, not directly from disk
    - This is why you MUST repack after editing any `.py` file
    - If you edited a file but still see old behaviour: you forgot to repack
  - Where to start if you want to change the UI:
    - To move/resize something: edit the uiscript layout file
    - To change what happens when you click: edit the root logic file
    - Link to guide-Asset-Pipeline for packing details
  - Common Mistakes table
  - Next Steps → guide-Asset-Pipeline, blueprint-UI-Python-System

- [ ] **Step 8: Verify all 7 concept-* files exist**

  ```bash
  ls wiki/concept-*.md
  ```
  Expected: 7 files listed

- [ ] **Step 9: Commit**

  ```bash
  git add wiki/concept-architecture.md wiki/concept-packets.md wiki/concept-vnum.md wiki/concept-proto.md wiki/concept-sectree.md wiki/concept-lua-quests.md wiki/concept-python-ui.md
  git commit -m "feat(wiki): add concept-* explainer pages (7 files)"
  ```

  Output: `✅ Task 2 complete — 7 files created`

---

## Task 3 — Create troubleshoot-* pages (3 files)

**Files:**
- Create: `wiki/troubleshoot-server.md`
- Create: `wiki/troubleshoot-client.md`
- Create: `wiki/troubleshoot-db.md`

> **Reminder:** Use real error strings as they appear in log files. Format each as a table row or clearly separated entry.

- [ ] **Step 1: Create `wiki/troubleshoot-server.md`**

  Required content:
  - Title: `# Fixing Server Errors — Common Problems & Solutions`
  - Who is this for: developer whose server is not starting or behaving unexpectedly
  - **Section: How to read syserr**
    - Location: `game/syserr` and `db/syserr`
    - What a line looks like: `[timestamp] [pid] ERROR message`
    - How to find the relevant error in a large log: look for the last ERROR before process exit
    - Difference between `syslog` (informational — normal operation) and `syserr` (errors — needs investigation)
  - **Section: Error Reference Table**

    Format: Exact error text | Most likely cause | Step-by-step fix | How to confirm it is fixed

    Errors to cover (use exact strings from the codebase):
    - `"SECTREE_MANAGER: cannot find map"` / `"Cannot find map X"`
    - `"CInputMain: unknown packet header 0x%02X"`
    - `"CInputMain: phase %d cannot handle packet 0x%02X"`
    - `"db: QUERY_LOGIN: SQL error"`
    - `"SecureCipher: init failed"` / key exchange failure
    - `"Cannot connect to db process"` / db connection refused at game startup
    - `"mob_proto: load failed"` / `"item_proto: load failed"`
    - `"regen: parse error"` / regen.txt issues
    - `"lua: attempt to call a nil value"`
    - `"lua: stack overflow"`
    - `"IS_SPEED_HACK"` — player disconnect log entry
    - `"PointChange: type X is out of range"`
    - `"UseSkill: not found skill by vnum X"`
    - `"CGrid: not enough space"`

  - **Section: The server won't start — step-by-step checklist**
    (ordered most-to-least common)
    1. Is MariaDB running? (`systemctl status mariadb`)
    2. Is db process started before game? (check startup order)
    3. Are DB credentials correct in `db.conf`?
    4. Are all required files present? (`conf.txt`, `mob_proto`, `item_proto`, map files)
    5. Check `db/syserr` first, then `game/syserr`
    6. Check port conflicts (`netstat -tlnp | grep 1130`)

  - **Section: Players cannot connect — checklist**
    - Is the game port (11011) open in the firewall?
    - Is `serverinfo.py` pointing to the correct IP?
    - Is the CRC of the client proto matching the server proto?
    - Check `game/syserr` for connection rejection messages

  - **Section: Mobs are not spawning — checklist**
    1. Is the mob vnum in mob_proto?
    2. Is the regen.txt entry using server coordinates (×100)?
    3. Did you restart the game process after editing regen.txt?
    4. Is the map name in regen.txt correct?

  - **Section: Quest scripts are not working — checklist**
    1. Did you run `qc` on the quest file?
    2. Is the compiled output in `game/object/`?
    3. Did you reload quests (`quest reload` if supported, else restart game)?
    4. Check `game/syserr` for Lua errors

  - Common Mistakes table
  - Next Steps → troubleshoot-db, concept-architecture

- [ ] **Step 2: Create `wiki/troubleshoot-client.md`**

  Required content:
  - Title: `# Fixing Client Errors — Common Problems & Solutions`
  - Who is this for: developer whose client is crashing, showing errors, or behaving unexpectedly
  - **Section: Where is syserr.txt?**
    - Exact path: in the root of the client-bin directory (same folder as Metin2.exe)
    - How it looks: one error per line with timestamp
    - How to clear it before testing: delete or rename the file; client recreates it on next run

  - **Section: Error Reference Table**
    Same format as server troubleshoot. Errors to cover:
    - `"ImportError: No module named 'X'"` — missing Python module, check pack contents
    - `"AttributeError: module 'X' has no attribute 'Y'"` — C++ module function not found, version mismatch
    - `"TypeError: argument N must be int, not str"` — Python passing wrong type to C++ module
    - `"RuntimeError: CREATE_DEVICE"` — DirectX initialisation failure
    - `"RuntimeError: unknown widget type 'X'"` — uiscript referencing unregistered widget
    - `"CPythonLauncher: RunFile failed on root/game.py"` — syntax error in game.py or its imports
    - Black or white screen on startup — DirectX device or resolution issue
    - Client connects but character select shows empty slots — CRC mismatch or DB load error
    - Items show wrong icon or wrong name — client item_proto out of sync with server
    - Client crashes when entering the game world — usually a missing or corrupt map file or CRC kick
    - CRC mismatch / kicked immediately after selecting character — binary proto out of sync
    - `"syserr: cannot find texture X"` — missing or incorrectly packed texture
    - Minimap shows solid black — missing minimap texture in pack
    - Effects or sounds not playing — missing effect/sound file in pack

  - **Section: Client build fails — common CMake and MSVC errors**
    - Missing DirectX SDK → install DirectX SDK June 2010
    - Wrong Python version (must be Python 2.7 32-bit, not 64-bit and not Python 3)
    - Granny2 lib not found → verify `granny2.lib` is in the expected directory per client-src README

  - **Section: Client starts but cannot connect — checklist**
    1. Is `serverinfo.py` pointing to the correct IP and port?
    2. Did you repack after editing `serverinfo.py`?
    3. Is the server actually running? (check game/syslog)
    4. Is the client firewall allowing outbound port 11011?
    5. Are client and server proto files in sync? (check for CRC errors in game/syserr)

  - Common Mistakes table
  - Next Steps → troubleshoot-server, troubleshoot-db

- [ ] **Step 3: Create `wiki/troubleshoot-db.md`**

  Required content:
  - Title: `# Fixing Database Problems`
  - Who is this for: developer whose database is not connecting, not saving, or causing errors
  - **Section: Diagnosing database issues**
    - How to check if MariaDB is running: `systemctl status mariadb`
    - How to check db process logs: `tail -f db/syslog` and `tail -f db/syserr`
    - Useful MariaDB commands:
      - `SHOW PROCESSLIST;` — see active connections
      - `SHOW TABLES;` — verify schema loaded
      - `SELECT COUNT(*) FROM item_proto;` — verify proto loaded

  - **Section: MariaDB unreachable**
    Step-by-step checklist:
    1. Is the MariaDB service running? (`systemctl status mariadb`)
    2. Is the port correct in `db.conf`? (default 3306)
    3. Are username/password correct in `db.conf`?
    4. Is the database user allowed to connect from localhost? (`GRANT ... TO 'user'@'localhost'`)

  - **Section: item_proto or mob_proto not loading**
    - Wrong column count — generated file has different columns than the table definition
    - Wrong separator — must be tabs, not spaces
    - File encoding issues — must be UTF-8 or ASCII, not UTF-16
    - Wrong file path in config — check `db.conf` for proto file paths

  - **Section: Characters not being saved**
    - What causes this: db process crashed before flush, wrong permissions on save directory, MySQL write error
    - How to check if items are in the DB: `SELECT * FROM item WHERE owner_id = [pid];`
    - How to check character data: `SELECT * FROM player WHERE id = [pid];`

  - **Section: Quest flags being lost**
    - Why this happens: session-only flags (`pc.setf`) vs persistent flags (`pc.setqf`); only persistent flags survive server restart
    - How to verify flags are saved: `SELECT * FROM quest WHERE dwPCID = [pid] AND szName = 'quest_name';`

  - **Section: CRC mismatch between client and server**
    - What causes it: client binary proto file does not match the server's expected CRC
    - How to identify: `game/syserr` shows `"CRC mismatch"` with the offending proto name
    - Step-by-step fix:
      1. Regenerate the binary proto from SQL
      2. Copy to client-bin
      3. Repack client assets
      4. Restart game process

  - **Section: Useful SQL queries for debugging**
    | Problem | SQL query |
    |---------|-----------|
    | Is this account in the DB? | `SELECT * FROM account WHERE login = 'name';` |
    | What items does player X have? | `SELECT * FROM item WHERE owner_id = X;` |
    | What is player X's current position? | `SELECT x, y, map_index FROM player WHERE id = X;` |
    | Are quest flags saved? | `SELECT * FROM quest WHERE dwPCID = X AND szName = 'quest_name';` |
    | Is this item vnum in item_proto? | `SELECT * FROM item_proto WHERE vnum = N;` |

  - Common Mistakes table
  - Next Steps → troubleshoot-server, guide-Database-Proto

- [ ] **Step 4: Verify all 3 troubleshoot-* files exist**

  ```bash
  ls wiki/troubleshoot-*.md
  ```
  Expected: 3 files listed

- [ ] **Step 5: Commit**

  ```bash
  git add wiki/troubleshoot-server.md wiki/troubleshoot-client.md wiki/troubleshoot-db.md
  git commit -m "feat(wiki): add troubleshoot-* pages (3 files)"
  ```

  Output: `✅ Task 3 complete — 3 files created`

---

## Task 4 — Add "Before You Read" boxes to blueprint-* pages (8 files)

**Files to modify:**
- `wiki/blueprint-Game-Client-Protocol.md`
- `wiki/blueprint-Login-Flow.md`
- `wiki/blueprint-Character-System.md`
- `wiki/blueprint-Item-System.md`
- `wiki/blueprint-Combat-System.md`
- `wiki/blueprint-Quest-System.md`
- `wiki/blueprint-UI-Python-System.md`
- `wiki/blueprint-Map-World-System.md`

For each file:
- Read the file to find the exact first heading (`# Blueprint: ...`)
- Insert the box immediately after the first heading line, before any other content
- Do NOT change any other content

- [ ] **Step 1: Update `wiki/blueprint-Game-Client-Protocol.md`**

  Insert after `# Blueprint: Game–Client Protocol`:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [What is a Packet?](concept-packets)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 2: Update `wiki/blueprint-Login-Flow.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [What is a Packet?](concept-packets)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 3: Update `wiki/blueprint-Character-System.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [What is a vnum?](concept-vnum)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 4: Update `wiki/blueprint-Item-System.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [What is a vnum?](concept-vnum)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 5: Update `wiki/blueprint-Combat-System.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 6: Update `wiki/blueprint-Quest-System.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [Understanding the Quest System](concept-lua-quests)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 7: Update `wiki/blueprint-UI-Python-System.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [Why Python for the UI?](concept-python-ui)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 8: Update `wiki/blueprint-Map-World-System.md`**

  Insert after first `#` heading:
  ```markdown
  > ### 📖 New to this topic?
  > This is an advanced reference page. If you are not familiar with the basics yet, read these first:
  > - [How Everything Fits Together](concept-architecture)
  > - [What is a SECTREE?](concept-sectree)
  >
  > **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
  ```

- [ ] **Step 9: Verify box was inserted correctly**

  Read the first 20 lines of one blueprint to confirm structure:
  ```bash
  head -20 wiki/blueprint-Game-Client-Protocol.md
  ```
  Expected: line 1 is the `# Blueprint:` heading, lines 2–7 are the blockquote box, then the original content continues.

- [ ] **Step 10: Commit**

  ```bash
  git add wiki/blueprint-Game-Client-Protocol.md wiki/blueprint-Login-Flow.md wiki/blueprint-Character-System.md wiki/blueprint-Item-System.md wiki/blueprint-Combat-System.md wiki/blueprint-Quest-System.md wiki/blueprint-UI-Python-System.md wiki/blueprint-Map-World-System.md
  git commit -m "feat(wiki): add Before You Read boxes to all blueprint pages"
  ```

  Output: `✅ Task 4 complete — 8 files updated`

---

## Task 5 — Add "Prerequisites" boxes to guide-* pages (12 files)

**Files to modify:** all 12 guide-* pages listed in the File Map above.

For each file:
- Read the file to find the exact first heading
- Insert the Prerequisites box immediately after the first heading, before any other content
- Do NOT change any other content

- [ ] **Step 1: Update `wiki/guide-Adding-a-New-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [How Everything Fits Together](concept-architecture)
  > - [What is a Packet?](concept-packets)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 2: Update `wiki/guide-Build-Environment.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 3: Update `wiki/guide-Best-Practices.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 4: Update `wiki/guide-Asset-Pipeline.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [Why Python for the UI?](concept-python-ui)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 5: Update `wiki/guide-Localization.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [Why Python for the UI?](concept-python-ui)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 6: Update `wiki/guide-Debugging.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 7: Update `wiki/guide-Database-Proto.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [What are item_proto and mob_proto?](concept-proto)
  > - [What is a vnum?](concept-vnum)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 8: Update `wiki/guide-Security-AntiCheat.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [What is a Packet?](concept-packets)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 9: Update `wiki/guide-Skill-Buff-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [What is a vnum?](concept-vnum)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 10: Update `wiki/guide-NPC-and-Spawning.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [What is a vnum?](concept-vnum)
  > - [What is a SECTREE?](concept-sectree)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 11: Update `wiki/guide-Horse-Mount-Pet.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [What is a vnum?](concept-vnum)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 12: Update `wiki/guide-Economy.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before following this guide you should understand:
  > - [What are item_proto and mob_proto?](concept-proto)
  > - [What is a vnum?](concept-vnum)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 13: Verify box was inserted correctly**

  Read the first 15 lines of one guide to confirm structure:
  ```bash
  head -15 wiki/guide-Adding-a-New-System.md
  ```
  Expected: line 1 is the `# Guide:` heading, lines 2–7 are the blockquote box, then the original content continues.

- [ ] **Step 14: Commit**

  ```bash
  git add wiki/guide-Adding-a-New-System.md wiki/guide-Build-Environment.md wiki/guide-Best-Practices.md wiki/guide-Asset-Pipeline.md wiki/guide-Localization.md wiki/guide-Debugging.md wiki/guide-Database-Proto.md wiki/guide-Security-AntiCheat.md wiki/guide-Skill-Buff-System.md wiki/guide-NPC-and-Spawning.md wiki/guide-Horse-Mount-Pet.md wiki/guide-Economy.md
  git commit -m "feat(wiki): add Prerequisites boxes to all guide pages"
  ```

  Output: `✅ Task 5 complete — 12 files updated`

---

## Task 6 — Add "Prerequisites" boxes to topic-* pages (8 files)

**Files to modify:** all 8 topic-* pages listed in the File Map above.

Same process as Task 5: read first heading, insert box, do not change anything else.

- [ ] **Step 1: Update `wiki/topic-Game-Client-Protocol.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [What is a Packet?](concept-packets)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 2: Update `wiki/topic-Login-Flow.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [What is a Packet?](concept-packets)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 3: Update `wiki/topic-Character-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [What is a vnum?](concept-vnum)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 4: Update `wiki/topic-Item-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [What is a vnum?](concept-vnum)
  > - [What are item_proto and mob_proto?](concept-proto)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 5: Update `wiki/topic-Combat-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 6: Update `wiki/topic-Quest-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [Understanding the Quest System](concept-lua-quests)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 7: Update `wiki/topic-UI-Python-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [Why Python for the UI?](concept-python-ui)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 8: Update `wiki/topic-Map-World-System.md`**
  ```markdown
  > ### ✅ Prerequisites
  > Before reading this page you should understand:
  > - [What is a SECTREE?](concept-sectree)
  > - [How Everything Fits Together](concept-architecture)
  >
  > If you are setting up for the first time, start with [Getting Started](start-overview).
  ```

- [ ] **Step 9: Verify box was inserted correctly**

  Read the first 15 lines of one topic to confirm structure:
  ```bash
  head -15 wiki/topic-Game-Client-Protocol.md
  ```
  Expected: line 1 is the `#` heading, lines 2–7 are the blockquote box, then the original content continues.

- [ ] **Step 10: Commit**

  ```bash
  git add wiki/topic-Game-Client-Protocol.md wiki/topic-Login-Flow.md wiki/topic-Character-System.md wiki/topic-Item-System.md wiki/topic-Combat-System.md wiki/topic-Quest-System.md wiki/topic-UI-Python-System.md wiki/topic-Map-World-System.md
  git commit -m "feat(wiki): add Prerequisites boxes to all topic pages"
  ```

  Output: `✅ Task 6 complete — 8 files updated`

---

## Task 7 — Rewrite Home.md

**File:** `wiki/Home.md`

- Read the current file first (`wiki/Home.md`) to preserve all existing links and descriptions exactly.
- Keep every existing section. The only changes are additions.

- [ ] **Step 1: Read current `wiki/Home.md`** — note all existing section headings, links, and descriptions

- [ ] **Step 2: Rewrite `wiki/Home.md`** with the following structure:

  ```
  # Metin2 Rework v3 — Wiki

  [1–2 sentence welcome]

  ## Where do I start?

  [Intro paragraph: "Three paths depending on your background."]

  ### Path A — New to Metin2 development
  [Brief description of who this is for]
  start-overview → start-requirements → start-server-setup → start-client-setup → start-first-change → start-workflow

  ### Path B — I know programming but am new to Metin2
  [Brief description of who this is for]
  start-overview → concept-architecture → concept-packets → concept-vnum → concept-proto → guide-Adding-a-New-System

  ### Path C — I am an experienced developer
  [Brief description of who this is for]
  start-overview → Blueprint pages → Topic Guides

  ---

  ## Repositories
  [Existing table — unchanged]

  ---

  ## Blueprints (Full-Stack Architecture)
  [Existing table — unchanged]

  ---

  ## Interactive Calculators (GitHub Pages)
  [Existing content — unchanged]

  ---

  ## Developer Guides
  [Existing table — unchanged, add descriptions to any links missing them]

  ---

  ## Topic Guides (Cross-Cutting)
  [Existing table — unchanged, add descriptions to any links missing them]

  ---

  ## Getting Started
  [New section]
  | Page | Description |
  | [Overview & Getting Started](start-overview) | What the project is, the 3 repos, glossary of key terms |
  | [Requirements & Prerequisites](start-requirements) | What you need to run the server, build the client, and what skills are needed |
  | [Setting Up the Server](start-server-setup) | Startup order, verification steps, and common first-time mistakes |
  | [Setting Up the Client](start-client-setup) | Connecting the client to your server, configuring serverinfo.py, packing assets |
  | [Your First Change](start-first-change) | End-to-end examples: spawn an NPC, change an item, move a UI button |
  | [Daily Development Workflow](start-workflow) | The master reference table for what to restart after every type of change |

  ---

  ## Concepts
  [New section]
  | Page | Description |
  | [How Everything Fits Together](concept-architecture) | The overall architecture: client, game process, db process, MariaDB — why each exists |
  | [What is a Packet?](concept-packets) | How the client and server communicate: namespaces, wire format, phases |
  | [What is a vnum?](concept-vnum) | The ID system: every item, mob, skill, and map has a vnum and why |
  | [What are item_proto and mob_proto?](concept-proto) | The blueprint system and the two-version problem (server SQL vs client binary) |
  | [What is a SECTREE?](concept-sectree) | Spatial partitioning: how the server tracks which entities are near which |
  | [Understanding the Quest System](concept-lua-quests) | From .quest source file to runtime: states, triggers, and the qc compiler |
  | [Why Python for the UI?](concept-python-ui) | How the Python UI layer works, the root/uiscript split, and the pack cycle |

  ---

  ## Troubleshooting
  [New section]
  | Page | Description |
  | [Fixing Server Errors](troubleshoot-server) | syserr reference for common game and db process errors with step-by-step fixes |
  | [Fixing Client Errors](troubleshoot-client) | syserr.txt reference for Python, DirectX, and connection errors |
  | [Fixing Database Problems](troubleshoot-db) | MariaDB connectivity, proto loading, character saving, and CRC mismatch fixes |

  ---

  ## client-src — C++ Client Libraries
  [Existing table — unchanged]

  ---

  ## client-bin — Runtime Python Scripts
  [Existing table — unchanged]

  ---

  ## server-src — C++ Server Libraries
  [Existing table — unchanged]
  ```

- [ ] **Step 3: Verify Home.md structure**

  ```bash
  grep -n "## Where do I start\|## Getting Started\|## Concepts\|## Troubleshooting" wiki/Home.md
  ```
  Expected: 4 matching lines at correct positions. Also confirm all original sections (`## Blueprints`, `## Developer Guides`, etc.) are still present.

- [ ] **Step 4: Commit**

  ```bash
  git add wiki/Home.md
  git commit -m "feat(wiki): rewrite Home.md — add entry paths, Getting Started/Concepts/Troubleshooting sections"
  ```

  Output: `✅ Done: Home.md`

---

## Task 8 — Update _Sidebar.md

**File:** `wiki/_Sidebar.md`

- Read the current file first to preserve all existing entries exactly.
- Insert three new sections at the top, after `## [[Home]]` and before `## Blueprints (Full-Stack)`.

- [ ] **Step 1: Read current `wiki/_Sidebar.md`** — note exact existing content

- [ ] **Step 2: Update `wiki/_Sidebar.md`** — insert the following block between `## [[Home]]` and `## Blueprints (Full-Stack)`:

  ```markdown
  ---

  ## Getting Started
  - [[start-overview|Overview & Getting Started]]
  - [[start-requirements|Requirements & Prerequisites]]
  - [[start-server-setup|Setting Up the Server]]
  - [[start-client-setup|Setting Up the Client]]
  - [[start-first-change|Your First Change]]
  - [[start-workflow|Daily Development Workflow]]

  ---

  ## Concepts
  - [[concept-architecture|How Everything Fits Together]]
  - [[concept-packets|What is a Packet?]]
  - [[concept-vnum|What is a vnum?]]
  - [[concept-proto|item_proto and mob_proto]]
  - [[concept-sectree|What is a SECTREE?]]
  - [[concept-lua-quests|Understanding the Quest System]]
  - [[concept-python-ui|Why Python for the UI?]]

  ---

  ## Troubleshooting
  - [[troubleshoot-server|Fixing Server Errors]]
  - [[troubleshoot-client|Fixing Client Errors]]
  - [[troubleshoot-db|Fixing Database Problems]]
  ```

- [ ] **Step 3: Verify _Sidebar.md structure**

  ```bash
  grep -n "## Getting Started\|## Concepts\|## Troubleshooting\|## Blueprints" wiki/_Sidebar.md
  ```
  Expected: all 4 sections present; Getting Started, Concepts, Troubleshooting appear BEFORE Blueprints.

- [ ] **Step 4: Commit**

  ```bash
  git add wiki/_Sidebar.md
  git commit -m "feat(wiki): add Getting Started, Concepts, Troubleshooting to sidebar"
  ```

  Output: `✅ Done: _Sidebar.md`
  Output: `✅ Task 7+8 complete — 2 files updated`

---

## Final Output

After all tasks complete, output:

```
✅ Wiki restructure complete

New files created (16):
  wiki/start-overview.md
  wiki/start-requirements.md
  wiki/start-server-setup.md
  wiki/start-client-setup.md
  wiki/start-first-change.md
  wiki/start-workflow.md
  wiki/concept-architecture.md
  wiki/concept-packets.md
  wiki/concept-vnum.md
  wiki/concept-proto.md
  wiki/concept-sectree.md
  wiki/concept-lua-quests.md
  wiki/concept-python-ui.md
  wiki/troubleshoot-server.md
  wiki/troubleshoot-client.md
  wiki/troubleshoot-db.md

Existing files updated (30):
  wiki/blueprint-Game-Client-Protocol.md
  wiki/blueprint-Login-Flow.md
  wiki/blueprint-Character-System.md
  wiki/blueprint-Item-System.md
  wiki/blueprint-Combat-System.md
  wiki/blueprint-Quest-System.md
  wiki/blueprint-UI-Python-System.md
  wiki/blueprint-Map-World-System.md
  wiki/guide-Adding-a-New-System.md
  wiki/guide-Build-Environment.md
  wiki/guide-Best-Practices.md
  wiki/guide-Asset-Pipeline.md
  wiki/guide-Localization.md
  wiki/guide-Debugging.md
  wiki/guide-Database-Proto.md
  wiki/guide-Security-AntiCheat.md
  wiki/guide-Skill-Buff-System.md
  wiki/guide-NPC-and-Spawning.md
  wiki/guide-Horse-Mount-Pet.md
  wiki/guide-Economy.md
  wiki/topic-Game-Client-Protocol.md
  wiki/topic-Login-Flow.md
  wiki/topic-Character-System.md
  wiki/topic-Item-System.md
  wiki/topic-Combat-System.md
  wiki/topic-Quest-System.md
  wiki/topic-UI-Python-System.md
  wiki/topic-Map-World-System.md
  wiki/Home.md
  wiki/_Sidebar.md
```
