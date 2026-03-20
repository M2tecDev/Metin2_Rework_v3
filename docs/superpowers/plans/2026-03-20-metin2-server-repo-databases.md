# Server Submodule + Wiki Updates + Item/Mob Databases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `server` runtime repo as a submodule, update 7 wiki files to reflect the 4-repo structure, and create live Item Database and Monster Database pages on GitHub Pages.

**Architecture:** Three independent work streams on two branches — Task 1+2 on `master`, Task 3 on `gh-pages`. Wiki files are edited in `wiki/` then synced to the separate `Metin2_Rework_v3.wiki` repo. GitHub Pages HTML files fetch all game data live from `raw.githubusercontent.com` (CORS enabled); no hardcoded data.

**Tech Stack:** Git submodules, GitHub Wiki (flat Markdown), pure HTML + vanilla JavaScript (ES2020), CSS custom properties (dark theme), GitHub Pages (`gh-pages` branch), `fetch()` + `Promise.all` for live TSV data.

---

## File Map

| File | Branch/Repo | Action |
|------|-------------|--------|
| `.gitmodules` | master | UPDATE |
| `wiki/concept-architecture.md` | master | UPDATE |
| `wiki/start-requirements.md` | master | UPDATE |
| `wiki/start-server-setup.md` | master | UPDATE |
| `wiki/start-workflow.md` | master | UPDATE |
| `wiki/guide-Build-Environment.md` | master | UPDATE |
| `wiki/guide-Database-Proto.md` | master | UPDATE |
| `wiki/Home.md` | master | UPDATE |
| `D:/Git Repo/Metin2_Rework_v3.wiki/*.md` | wiki repo | SYNC (copy from wiki/) |
| `calculators/items.html` | gh-pages | CREATE |
| `calculators/mobs.html` | gh-pages | CREATE |
| `index.html` | gh-pages | UPDATE |

---

## Task 1: Add `server` Submodule

**Files:** `.gitmodules`, `server/` (submodule entry)

- [ ] **Step 1: Add the submodule**

```bash
cd "D:/Git Repo/Metin2_Rework_v3"
git submodule add https://github.com/d1str4ught/m2dev-server server
```

Expected: git clones the repo into `server/`, stages `.gitmodules` and the `server` submodule ref.

- [ ] **Step 2: Verify the new server submodule entry exists**

```bash
grep -A2 'submodule "server"' "D:/Git Repo/Metin2_Rework_v3/.gitmodules"
```

Expected output contains exactly:
```
[submodule "server"]
	path = server
	url = https://github.com/d1str4ught/m2dev-server
```

- [ ] **Step 3: Verify server/ directory exists with expected structure**

```bash
ls "D:/Git Repo/Metin2_Rework_v3/server/"
```

Expected: `share/`, `sql/`, `start.py`, `stop.py`, `install.py`, `clear.py` visible.

- [ ] **Step 4: Commit and push**

```bash
cd "D:/Git Repo/Metin2_Rework_v3"
git add .gitmodules server
git commit -m "feat: add server runtime repo as submodule"
git push origin master
```

---

## Task 2: Update Wiki Files

**Rule: ADD and CORRECT only — never delete existing content. Read each file before editing.**

**Repo paths:**
- Edit source: `D:/Git Repo/Metin2_Rework_v3/wiki/<file>`
- Sync target: `D:/Git Repo/Metin2_Rework_v3.wiki/<file>`

---

### Task 2a: concept-architecture.md

**File:** `wiki/concept-architecture.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/concept-architecture.md` in full before editing.

- [ ] **Step 2: Insert "The Four Repositories" section**

Insert the following block immediately **before** the existing `## Why Two Server Processes?` heading:

```markdown
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
```

- [ ] **Step 3: Update File Locations Overview table**

In the existing `## File Locations Overview` table, update or add the following rows so all server-side paths are prefixed with `server/`:

Replace:
```
| Game process logs (info) | `game/syslog` |
| Game process errors | `game/syserr` |
| DB process logs (info) | `db/syslog` |
| DB process errors | `db/syserr` |
| Game configuration | `game/conf.txt` |
| DB configuration | `db/db.conf` |
| Map data | `game/data/map/<mapname>/` |
| Quest scripts (source) | `game/quest/` |
| Quest scripts (compiled) | `game/object/` |
```

With:
```
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
```

(Keep all client-side rows unchanged.)

- [ ] **Step 4: Verify insertions**

```bash
grep -n "Four Repositories\|server-src.*C++.*Build\|server/share/bin\|server/share/conf" "D:/Git Repo/Metin2_Rework_v3/wiki/concept-architecture.md"
```

Expected: at least 4 matching lines.

---

### Task 2b: start-requirements.md

**File:** `wiki/start-requirements.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/start-requirements.md` in full.

- [ ] **Step 2: Insert "Repository Roles at a Glance" section**

Insert the following block immediately **after** the `## Overview` section (after the overview table, before `---`):

```markdown
## Repository Roles at a Glance

| Repo | Purpose | When you need it |
|------|---------|-----------------|
| `server-src` | C++ source — compile to get `game`, `db`, `qc` binaries | When changing server C++ code |
| `server` | Runtime environment — configs, SQL, management scripts | Always: this is where you run the server |
| `client-src` | C++ source — compile to get `Metin2.exe` | When changing client C++ code |
| `client-bin` | Runtime assets — Python UI scripts, data files, textures | Always: packs go here |

> **server vs server-src:** You only need `server-src` if you're changing C++ code. Most developers only ever touch `server/` (configs, quests, SQL) and `client-bin/` (Python UI). Think of `server-src` as the factory and `server/` as the warehouse.

---
```

- [ ] **Step 3: Add Python 3.x to Section A requirements table**

In the `### Required Software` table under `## Section A`, add this row after the `git` row:

```markdown
| `python3` | 3.6+ | Required for server management scripts: `start.py`, `stop.py`, `install.py`, `clear.py` |
```

- [ ] **Step 4: Verify**

```bash
grep -n "Repository Roles\|python3\|server vs server-src" "D:/Git Repo/Metin2_Rework_v3/wiki/start-requirements.md"
```

Expected: 3+ matching lines.

---

### Task 2c: start-server-setup.md

**File:** `wiki/start-server-setup.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/start-server-setup.md` in full.

- [ ] **Step 2: Insert first-time setup sections before "The Correct Startup Order"**

Insert the following block immediately **before** the `## The Correct Startup Order` heading:

```markdown
---

## First-Time Setup (Do Once)

These steps are required the first time you set up the server. After that, you only need [start.py and stop.py](#starting-and-stopping-the-server).

> For the complete installation and configuration steps, refer to the **server README**:
> https://github.com/d1str4ught/m2dev-server#installationconfiguration

### Step 0 — Place Compiled Binaries

After building `server-src`, copy the output binaries into the `server/` runtime repo.

**Linux / FreeBSD:**
```bash
# From the repo root
cp server-src/build/_install/bin/game  server/share/bin/
cp server-src/build/_install/bin/db    server/share/bin/
cp server-src/build/_install/bin/qc    server/share/bin/
cp server-src/build/_install/bin/qc    server/share/locale/english/quest/
```

**Windows:**
```powershell
copy server-src\build\_install\bin\game.exe  server\share\bin\
copy server-src\build\_install\bin\db.exe    server\share\bin\
copy server-src\build\_install\bin\qc.exe    server\share\bin\
copy server-src\build\_install\bin\qc.exe    server\share\locale\english\quest\
```

`qc` goes in two places: `share/bin/` (for PATH access) and `share/locale/english/quest/` (because `make.py` calls it from that directory).

---

### Step 0b — Import the Database Schema

Create all 5 required databases and import the SQL schema files from `server/sql/`:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS account;"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS common;"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS hotbackup;"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS log;"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS player;"

mysql -u root -p account  < server/sql/account.sql
mysql -u root -p common   < server/sql/common.sql
mysql -u root -p log      < server/sql/log.sql
mysql -u root -p player   < server/sql/player.sql
```

> **hotbackup** is intentionally empty — it must exist but has no SQL schema to import. The server uses it for backup rotation.

---

### Step 0c — Compile the Quest Scripts

Quest scripts must be compiled from inside the quest directory. The `make.py` script uses relative paths — running it from the wrong directory will fail silently or produce wrong output.

```bash
# MUST be run from inside the quest directory
cd server/share/locale/english/quest/
python make.py
cd -   # back to repo root
```

**Why the cwd matters:** `make.py` calls `qc` using a path relative to `./` and reads `.quest` source files from the current directory. If you run it from `server/` or the repo root, it cannot find the source files.

---

### Step 0d — Run install.py (Once)

After placing binaries and importing SQL, run the one-time setup script from the `server/` root:

```bash
cd server/
python install.py
cd -
```

`install.py` creates the channel directories, sets up `share/` symlinks so each channel sees the same config files, and prepares the runtime layout for `start.py`.

---

> **clear.py:** During development you can run `python server/clear.py` at any time to delete all log files and core dumps from channel directories. Safe to run between restarts when iterating on changes.

---
```

- [ ] **Step 3: Update the startup section to reference start.py**

Find the existing `## The Correct Startup Order` section. After the startup diagram, add this callout:

```markdown
> **Using the management scripts:** Instead of starting `db` and `game` manually, use:
> ```bash
> cd server/
> python start.py   # starts all configured channels + db
> python stop.py    # stops all channels + db (safe shutdown order)
> ```
> `start.py` handles the startup order, channel count, and `db` automatically. `stop.py` shuts down in the correct order (game first, then db). See the [server README](https://github.com/d1str4ught/m2dev-server#installationconfiguration) for channel configuration.
```

- [ ] **Step 4: Verify**

```bash
grep -n "Step 0\|install.py\|make.py\|hotbackup\|start.py\|clear.py" "D:/Git Repo/Metin2_Rework_v3/wiki/start-server-setup.md"
```

Expected: 8+ matching lines.

---

### Task 2d: start-workflow.md

**File:** `wiki/start-workflow.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/start-workflow.md` in full.

- [ ] **Step 2: Update the .quest source file row**

Find the row starting with `| \`.quest\` source file` in the Master Reference Table. Update its Notes column from:
```
Must compile with `qc` first; output to `game/object/`
```
To:
```
`cd server/share/locale/english/quest/` first, then `python make.py` — cwd is required (make.py uses relative paths)
```

- [ ] **Step 3: Update the C++ server code rows**

Find the rows for `| \`questmanager\` / questlua C++` and `| Other C++ server code`. Update their Notes columns to:
```
Compile in `server-src` → copy binary to `server/share/bin/` → `python stop.py` → `python start.py` (from `server/` root)
```

- [ ] **Step 4: Add two management script rows to the table**

Append these two rows to the Master Reference Table (before the closing separator):

```markdown
| `server/share/conf/*.txt` config files | — | — | — | ✓ | — | — | — | Game reads conf at startup; restart game channel only |
| Management scripts (`start.py`, `stop.py`, etc.) | — | — | — | — | — | — | — | Script changes take effect on next invocation |
```

- [ ] **Step 5: Update the Safe Restart Sequence**

Find the Safe Restart Sequence code block. Replace the manual start/stop steps with `python stop.py` / `python start.py`. The updated sequence should read:

```
1. cd server/ && python stop.py
   └─ Stops all game channels, then db, in the correct order

2. (optional) Stop MariaDB if you are making schema changes

3. Apply your changes

4. Start MariaDB (if stopped)

5. cd server/ && python start.py
   └─ Starts db, then all game channels, in the correct order
   └─ Wait for: "boot sequence done" in db log
   └─ Wait for: "SYSTEM: boot done" in game log

6. Repack client assets (if needed)
   └─ Run: python pack.py

7. Restart the client
```

- [ ] **Step 6: Add multi-channel callout after the Master Reference Table**

After the table (before `## The Safe Restart Sequence`), insert:

```markdown
> **Multi-channel note:** `start.py` starts all configured game channels automatically — you do not need to start each `game` process individually. Channel configuration lives in `server/channels.py`.
```

- [ ] **Step 7: Verify**

```bash
grep -n "server/share/locale/english/quest\|server/share/bin\|python stop.py\|python start.py\|Multi-channel\|channels.py\|conf/\*.txt" "D:/Git Repo/Metin2_Rework_v3/wiki/start-workflow.md"
```

Expected: 7+ matching lines.

---

### Task 2e: guide-Build-Environment.md

**File:** `wiki/guide-Build-Environment.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/guide-Build-Environment.md` in full.

- [ ] **Step 2: Insert "Distributing Your Build" section**

Insert the following block immediately **after** the `## Server — Windows Build` section (after the Windows MSVC code block and its note, before `## Version Tagging`):

```markdown
---

## Distributing Your Build

After a successful build, copy the compiled binaries from the build output into the `server/` runtime repo. The server management scripts (`start.py`, `stop.py`) look for binaries in `server/share/bin/`.

### Linux / FreeBSD

```bash
# After: cmake --install server-src/build
cp server-src/build/_install/bin/game  server/share/bin/
cp server-src/build/_install/bin/db    server/share/bin/
cp server-src/build/_install/bin/qc    server/share/bin/
# qc also goes in the quest directory (make.py calls it from there)
cp server-src/build/_install/bin/qc    server/share/locale/english/quest/
```

### Windows

```powershell
# After: cmake --build server-src/build --config RelWithDebInfo
copy server-src\build\RelWithDebInfo\game.exe  server\share\bin\
copy server-src\build\RelWithDebInfo\db.exe    server\share\bin\
copy server-src\build\RelWithDebInfo\qc.exe    server\share\bin\
copy server-src\build\RelWithDebInfo\qc.exe    server\share\locale\english\quest\
```

### After Copying

**First time ever:**
```bash
cd server/
python install.py   # creates channel dirs + share/ symlinks
python start.py     # starts db + all game channels
```

**Subsequent restarts:**
```bash
cd server/
python stop.py      # safe shutdown
python start.py     # restart with new binaries
```

> **Full server setup and configuration → [server README](https://github.com/d1str4ught/m2dev-server#installationconfiguration)**
```

- [ ] **Step 3: Verify**

```bash
grep -n "Distributing Your Build\|server/share/bin\|install.py\|m2dev-server" "D:/Git Repo/Metin2_Rework_v3/wiki/guide-Build-Environment.md"
```

Expected: 4+ matching lines.

---

### Task 2f: guide-Database-Proto.md

**File:** `wiki/guide-Database-Proto.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/guide-Database-Proto.md` in full.

- [ ] **Step 2: Update item_proto.txt and mob_proto.txt path references**

In the file, replace all occurrences of bare `item_proto.txt` (when used as a file path, not a table name) with `server/share/conf/item_proto.txt`, and bare `mob_proto.txt` with `server/share/conf/mob_proto.txt`.

Specifically update:
- The export command in Step 2: `--output /srv/metin2/share/item_proto.txt` → `--output server/share/conf/item_proto.txt`
- The `SELECT ... INTO OUTFILE` path: `/tmp/item_proto.txt` → `server/share/conf/item_proto.txt`
- The mob_proto Step 2 export path similarly
- Any other path reference to these files

- [ ] **Step 3: Update the stop/start command in Step 5**

Find:
```bash
./stop.sh && ./start.sh
```

Replace with:
```bash
# From the server/ root directory
python stop.py && python start.py
```

- [ ] **Step 4: Update the Key Files table**

At the bottom of the file, in the `## Key Files` table, add these rows:

```markdown
| `share/conf/item_proto.txt` | server | Tab-separated item definitions — read by `db` at startup |
| `share/conf/mob_proto.txt` | server | Tab-separated mob definitions — read by `db` at startup |
| `sql/account.sql` | server | Account database schema |
| `sql/common.sql` | server | Common database schema |
| `sql/log.sql` | server | Log database schema |
| `sql/player.sql` | server | Player database schema |
```

- [ ] **Step 5: Verify**

```bash
grep -n "server/share/conf\|python stop.py\|sql/account\|sql/player" "D:/Git Repo/Metin2_Rework_v3/wiki/guide-Database-Proto.md"
```

Expected: 5+ matching lines.

---

### Task 2g: Home.md

**File:** `wiki/Home.md`

- [ ] **Step 1: Read the file**

Read `D:/Git Repo/Metin2_Rework_v3/wiki/Home.md` in full.

- [ ] **Step 2: Add server row to Repositories table**

Find the `## Repositories` table. It currently has 3 rows (client-src, client-bin, server-src). Add a `**server**` row:

```markdown
| **server** | Runtime server files — configs (`share/conf/`), SQL schema (`sql/`), management scripts (`start.py`, `stop.py`, `install.py`), compiled binary destination (`share/bin/`) |
```

Insert it as the first row in the table body (before client-src), so the table reads: server, server-src, client-src, client-bin — matching the mental model of "server things first".

- [ ] **Step 3: Verify**

```bash
grep -n "server.*Runtime\|share/conf\|share/bin\|start.py.*stop.py" "D:/Git Repo/Metin2_Rework_v3/wiki/Home.md"
```

Expected: 2+ matching lines.

---

### Task 2h: Sync to wiki repo and commit both

- [ ] **Step 1: Confirm wiki repo state before copying**

```bash
cd "D:/Git Repo/Metin2_Rework_v3.wiki"
git branch
git status
```

Expected: on `master` branch, working tree clean (or only the files we are about to overwrite).

- [ ] **Step 2: Copy all 7 updated files to the wiki repo**

```bash
cp "D:/Git Repo/Metin2_Rework_v3/wiki/concept-architecture.md"  "D:/Git Repo/Metin2_Rework_v3.wiki/concept-architecture.md"
cp "D:/Git Repo/Metin2_Rework_v3/wiki/start-requirements.md"    "D:/Git Repo/Metin2_Rework_v3.wiki/start-requirements.md"
cp "D:/Git Repo/Metin2_Rework_v3/wiki/start-server-setup.md"    "D:/Git Repo/Metin2_Rework_v3.wiki/start-server-setup.md"
cp "D:/Git Repo/Metin2_Rework_v3/wiki/start-workflow.md"        "D:/Git Repo/Metin2_Rework_v3.wiki/start-workflow.md"
cp "D:/Git Repo/Metin2_Rework_v3/wiki/guide-Build-Environment.md" "D:/Git Repo/Metin2_Rework_v3.wiki/guide-Build-Environment.md"
cp "D:/Git Repo/Metin2_Rework_v3/wiki/guide-Database-Proto.md"  "D:/Git Repo/Metin2_Rework_v3.wiki/guide-Database-Proto.md"
cp "D:/Git Repo/Metin2_Rework_v3/wiki/Home.md"                  "D:/Git Repo/Metin2_Rework_v3.wiki/Home.md"
```

- [ ] **Step 3: Commit and push the wiki repo**

```bash
cd "D:/Git Repo/Metin2_Rework_v3.wiki"
git add concept-architecture.md start-requirements.md start-server-setup.md start-workflow.md guide-Build-Environment.md guide-Database-Proto.md Home.md
git commit -m "feat(wiki): update 7 pages for 4-repo structure — server submodule, binary placement, management scripts"
git push origin master
```

- [ ] **Step 4: Commit and push the main repo wiki/ files**

```bash
cd "D:/Git Repo/Metin2_Rework_v3"
git add wiki/concept-architecture.md wiki/start-requirements.md wiki/start-server-setup.md wiki/start-workflow.md wiki/guide-Build-Environment.md wiki/guide-Database-Proto.md wiki/Home.md
git commit -m "feat(wiki): update 7 pages for 4-repo structure — server submodule, binary placement, management scripts"
git push origin master
```

---

## Task 3: GitHub Pages — Item & Monster Databases

**Branch:** `gh-pages`

All steps in this task run on the `gh-pages` branch. The branch has no `wiki/` or `docs/` — only web files.

---

### Task 3a: Switch to gh-pages and read existing style

> **Prerequisite:** Tasks 1 and 2 must be fully committed and pushed to `master` before this step. After `git checkout gh-pages` the working tree will reflect the gh-pages branch, not master. Confirm master is clean first:

- [ ] **Step 0: Confirm master is clean before switching**

```bash
cd "D:/Git Repo/Metin2_Rework_v3"
git status
git log --oneline -3
```

Expected: `nothing to commit, working tree clean` and the top commit is the Task 2 wiki commit.

- [ ] **Step 1: Checkout gh-pages**

```bash
cd "D:/Git Repo/Metin2_Rework_v3"
git checkout gh-pages
```

- [ ] **Step 2: Confirm we are on gh-pages and calculators/ exists**

```bash
git branch
ls "D:/Git Repo/Metin2_Rework_v3/calculators/"
```

Expected: `* gh-pages` active; `damage.html`, `upgrade.html` etc. visible in calculators/. The `calculators/` directory already exists on gh-pages — no mkdir needed.

- [ ] **Step 3: Read existing calculator to understand style conventions**

Read `D:/Git Repo/Metin2_Rework_v3/calculators/damage.html` (lines 1–30) to confirm the header/nav HTML pattern used by all calculator pages.

Read `D:/Git Repo/Metin2_Rework_v3/css/style.css` (lines 1–120) to confirm CSS variable names: `--bg`, `--surface`, `--surface-alt`, `--border`, `--accent`, `--text`, `--text-muted`, `--success`, `--danger`, `--info`, `--radius`.

---

### Task 3b: Create calculators/items.html

**File:** `calculators/items.html` (CREATE — does not exist yet)

- [ ] **Step 1: Write the complete file**

Write `D:/Git Repo/Metin2_Rework_v3/calculators/items.html` with the following complete content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Item Database — Metin2 Rework v3</title>
  <link rel="stylesheet" href="../css/style.css" />
  <style>
    .db-toolbar { display:flex; flex-wrap:wrap; gap:.6rem; margin:1.5rem 0 .8rem; align-items:center; }
    .db-toolbar input[type="text"] { flex:1; min-width:180px; }
    .db-toolbar select { width:auto; }
    .db-toolbar label { display:flex; align-items:center; gap:.35rem; font-size:.82rem; color:var(--text-muted); cursor:pointer; white-space:nowrap; }
    .db-toolbar label input[type="checkbox"] { accent-color:var(--accent); cursor:pointer; }
    .count-bar { font-size:.8rem; color:var(--text-muted); margin-bottom:.6rem; }
    .db-table { width:100%; border-collapse:collapse; font-size:.875rem; }
    .db-table th { background:var(--surface); padding:.55rem .75rem; text-align:left; font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); border-bottom:2px solid var(--border); cursor:pointer; user-select:none; white-space:nowrap; }
    .db-table th:hover { color:var(--text); }
    .db-table th.sort-asc::after { content:' ▲'; color:var(--accent); }
    .db-table th.sort-desc::after { content:' ▼'; color:var(--accent); }
    .db-table td { padding:.5rem .75rem; border-bottom:1px solid var(--border); vertical-align:top; }
    .db-table tr.data-row:nth-child(even) td { background:var(--surface-alt); }
    .db-table tr.data-row:hover td { background:rgba(230,168,23,.07); cursor:pointer; }
    .db-table tr.detail-row td { padding:0; border-bottom:2px solid var(--accent); }
    .detail-inner { padding:1.2rem 1.4rem; background:var(--surface); display:grid; grid-template-columns:1fr 1fr; gap:.5rem 2rem; }
    @media(max-width:600px){ .detail-inner { grid-template-columns:1fr; } }
    .detail-inner .full { grid-column:1/-1; }
    .detail-label { font-size:.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.04em; margin-bottom:.1rem; }
    .detail-value { font-size:.9rem; color:var(--text); font-family:var(--font-mono); }
    .badge { display:inline-block; padding:.15rem .5rem; border-radius:3px; font-size:.75rem; font-weight:600; background:var(--surface-alt); border:1px solid var(--border); color:var(--text-muted); margin:.1rem .15rem .1rem 0; }
    .badge.warn { border-color:var(--danger); color:var(--danger); }
    .badge.info { border-color:var(--info); color:var(--info); }
    .badge.success { border-color:var(--success); color:var(--success); }
    .stat-pill { font-size:.8rem; color:var(--accent); font-family:var(--font-mono); }
    .status-bar { font-size:.8rem; color:var(--text-muted); margin:1rem 0 .4rem; }
    .status-bar a { color:var(--info); }
    .error-banner { background:rgba(248,81,73,.12); border:1px solid var(--danger); border-radius:var(--radius); padding:.8rem 1rem; margin:1rem 0; color:var(--danger); font-size:.875rem; }
    .spinner { display:inline-block; width:18px; height:18px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; margin-right:.5rem; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .upgrade-link { color:var(--info); text-decoration:none; font-family:var(--font-mono); font-size:.85rem; }
    .upgrade-link:hover { text-decoration:underline; }
    .parse-warn { font-size:.75rem; color:var(--text-muted); margin-top:.8rem; }
  </style>
</head>
<body>
<header class="site-header">
  <a href="../index.html" class="logo">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    Metin2 Rework v3
  </a>
  <nav>
    <a href="../index.html">Calculators</a>
    <a href="mobs.html">Monster DB</a>
    <a href="https://github.com/M2tecDev/Metin2_Rework_v3/wiki" target="_blank">Wiki</a>
  </nav>
</header>
<div class="container" style="max-width:1100px">
  <a href="../index.html" class="back-link" style="display:inline-flex;align-items:center;gap:.35rem;color:var(--text-muted);text-decoration:none;font-size:.85rem;margin-bottom:1rem">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    All Calculators
  </a>
  <div class="hero" style="padding-top:.5rem;text-align:left">
    <h1 style="font-size:1.6rem;color:var(--accent)">📦 Item Database</h1>
    <p>Live data from <code>server/share/conf/item_proto.txt</code> — fetched on page load.</p>
  </div>

  <div id="loadStatus"><span class="spinner"></span> Loading item data…</div>
  <div id="errorBox" style="display:none"></div>

  <div id="dbUI" style="display:none">
    <div class="db-toolbar">
      <input type="text" id="searchInput" placeholder="Search by name…" oninput="applyFilters()" />
      <select id="typeFilter" onchange="applyFilters()"><option value="">All Types</option></select>
      <label><input type="checkbox" id="bonusFilter" onchange="applyFilters()" /> Has bonuses</label>
      <label><input type="checkbox" id="questFilter" onchange="applyFilters()" /> Quest items</label>
    </div>
    <div class="count-bar" id="countBar"></div>
    <div style="overflow-x:auto">
      <table class="db-table" id="itemTable">
        <thead>
          <tr>
            <th onclick="setSort('vnum')" id="th-vnum">vnum</th>
            <th onclick="setSort('name')" id="th-name">Name</th>
            <th onclick="setSort('type')" id="th-type">Type</th>
            <th onclick="setSort('shop_buy_price')" id="th-shop_buy_price">Buy Price</th>
            <th id="th-stats">Stats</th>
          </tr>
        </thead>
        <tbody id="itemTbody"></tbody>
      </table>
    </div>
    <div id="parseWarn" class="parse-warn" style="display:none"></div>
  </div>
</div>

<script>
const ITEM_PROTO_URL = 'https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/item_proto.txt';
const ITEMDESC_URL   = 'https://raw.githubusercontent.com/d1str4ught/m2dev-client/main/assets/locale/locale/en/itemdesc.txt';

const ITEM_TYPES = {0:'None',1:'Weapon',2:'Armor',3:'Consumable',4:'Auto-Use',5:'Material',6:'Special',7:'Tool',8:'Lottery',9:'Currency (Yang)',10:'Metin Stone',11:'Container',12:'Fish',13:'Rod',14:'Resource',15:'Campfire',16:'Unique',17:'Skillbook',18:'Quest Item',19:'Polymorph',20:'Treasure Box',21:'Treasure Key',22:'Skillbook (Forget)',23:'Gift Box',24:'Pick',25:'Hair',26:'Medium',27:'Costume',28:'Dragon Soul',29:'Dragon Soul Special',30:'Extract',31:'Secondary Coin',32:'Ring',33:'Belt'};
const APPLY_NAMES = {0:'None',1:'Max HP',2:'Max SP (Mana)',3:'Constitution (HT)',4:'Intelligence (IQ)',5:'Strength (ST)',6:'Dexterity (DX)',11:'Attack Speed',12:'Movement Speed',13:'Cast Speed',16:'Attack Bonus',17:'Defense Bonus',18:'Magic Attack',19:'Magic Defense',21:'Critical Hit %',22:'Penetrating Hit %',35:'Sword Resistance',36:'Two-Hand Resistance',37:'Dagger Resistance',40:'Magic Resistance'};
const ANTIFLAG_LABELS = ['No Drop','No Trade','No Sell','No Equip','No Warrior','No Assassin','No Sura','No Shaman','Male Only','Female Only'];
const VALUE_LABELS = {1:['Min ATK','Max ATK','Magic Min ATK','Magic Max ATK','',''],2:['Defense','Magic Defense','','','',''],3:['HP Restore','SP Restore','Effect Type','Duration (ms)','',''],4:['HP Restore','SP Restore','Effect Type','Duration (ms)','','']};

let allItems = [], descMap = new Map(), filtered = [], sortCol = 'vnum', sortDir = 1, openVnum = null, parseErrors = 0;

function applyName(type, val) {
  if (!val || val === '0') return null;
  return (APPLY_NAMES[type] || ('Apply '+type)) + ': +' + val;
}

function fmt(n) { return parseInt(n).toLocaleString(); }

function antiflags(n) {
  const v = parseInt(n)||0; const tags=[];
  ANTIFLAG_LABELS.forEach((l,i)=>{ if(v&(1<<i)) tags.push(l); });
  return tags;
}

function valueLabels(type, vals) {
  const lbls = VALUE_LABELS[type] || [];
  return vals.map((v,i)=>{ if(!v||v==='0') return null; return {label:lbls[i]||('value'+i), val:v}; }).filter(Boolean);
}

function statsCell(item) {
  for(const [at, av] of [[item.applytype0,item.applyvalue0],[item.applytype1,item.applyvalue1],[item.applytype2,item.applyvalue2]]) {
    const at_ = parseInt(at), av_ = parseInt(av);
    if(at_ && av_) { const name = APPLY_NAMES[at_]||('Apply '+at_); const short = name.split(' ').map(w=>w[0]).join(''); return `<span class="stat-pill">${short} +${av_}</span>`; }
  }
  return '';
}

function parseLine(line) {
  const cols = line.split('\t');
  if(cols.length < 29) { parseErrors++; return null; }
  return { vnum:parseInt(cols[0]), name:cols[1], type:parseInt(cols[2]), subtype:parseInt(cols[3]), weight:cols[4], size:cols[5], antiflag:cols[6], flag:cols[7], wearflag:cols[8], immuneflag:cols[9], gold:cols[10], shop_buy_price:cols[11], limittype0:cols[12], limitvalue0:cols[13], limittype1:cols[14], limitvalue1:cols[15], applytype0:cols[16], applyvalue0:cols[17], applytype1:cols[18], applyvalue1:cols[19], applytype2:cols[20], applyvalue2:cols[21], value0:cols[22], value1:cols[23], value2:cols[24], value3:cols[25], value4:cols[26], value5:cols[27], socket_pct:cols[28], addon_type:cols[29]||'0' };
}

function setSort(col) {
  if(sortCol===col) sortDir*=-1; else {sortCol=col; sortDir=1;}
  document.querySelectorAll('.db-table th').forEach(th=>th.className='');
  const th = document.getElementById('th-'+col);
  if(th) th.className = sortDir===1?'sort-asc':'sort-desc';
  renderTable();
}

function applyFilters() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const t = document.getElementById('typeFilter').value;
  const bonus = document.getElementById('bonusFilter').checked;
  const quest = document.getElementById('questFilter').checked;
  filtered = allItems.filter(it=>{
    if(q && !it.name.toLowerCase().includes(q)) return false;
    if(t && it.type !== parseInt(t)) return false;
    if(bonus && !(parseInt(it.applytype0)&&parseInt(it.applyvalue0)||parseInt(it.applytype1)&&parseInt(it.applyvalue1)||parseInt(it.applytype2)&&parseInt(it.applyvalue2))) return false;
    if(quest && it.type!==18) return false;
    return true;
  });
  renderTable();
}

function renderTable() {
  filtered.sort((a,b)=>{
    let av=a[sortCol], bv=b[sortCol];
    const an=parseFloat(av), bn=parseFloat(bv);
    if(!isNaN(an)&&!isNaN(bn)) return (an-bn)*sortDir;
    return String(av).localeCompare(String(bv))*sortDir;
  });
  document.getElementById('countBar').textContent = `Showing ${filtered.length} of ${allItems.length} items`;
  const tbody = document.getElementById('itemTbody');
  tbody.innerHTML = '';
  filtered.forEach(item=>{
    const tr = document.createElement('tr');
    tr.className='data-row'; tr.dataset.vnum=item.vnum;
    tr.innerHTML = `<td style="font-family:var(--font-mono);color:var(--text-muted)">${item.vnum}</td><td>${item.name}</td><td>${ITEM_TYPES[item.type]||item.type}</td><td style="font-family:var(--font-mono)">${parseInt(item.shop_buy_price)?fmt(item.shop_buy_price)+' ⚙':''}</td><td>${statsCell(item)}</td>`;
    tr.addEventListener('click', ()=>toggleDetail(item, tr));
    tbody.appendChild(tr);
  });
  // re-open if needed
  if(openVnum) { const tr = tbody.querySelector(`[data-vnum="${openVnum}"]`); if(tr) { const item = allItems.find(i=>i.vnum===openVnum); if(item) insertDetail(item, tr); } }
}

function toggleDetail(item, tr) {
  const existing = document.getElementById('detail-'+item.vnum);
  if(existing) { existing.remove(); if(openVnum===item.vnum){openVnum=null; history.replaceState(null,'',location.pathname);} return; }
  // close any open
  document.querySelectorAll('.detail-row').forEach(r=>r.remove());
  openVnum = item.vnum;
  history.replaceState(null,'','#'+item.vnum);
  insertDetail(item, tr);
}

function insertDetail(item, tr) {
  const dt = document.createElement('tr'); dt.className='detail-row'; dt.id='detail-'+item.vnum;
  const td = document.createElement('td'); td.colSpan=5;
  const desc = descMap.get(item.vnum)||'No description available.';
  const applies = [[item.applytype0,item.applyvalue0],[item.applytype1,item.applyvalue1],[item.applytype2,item.applyvalue2]].filter(([t,v])=>parseInt(t)&&parseInt(v)).map(([t,v])=>`<span class="badge info">${APPLY_NAMES[parseInt(t)]||'Apply '+t}: +${v}</span>`).join('');
  const vals = valueLabels(item.type, [item.value0,item.value1,item.value2,item.value3,item.value4,item.value5]);
  const aflags = antiflags(item.antiflag).map(l=>`<span class="badge warn">${l}</span>`).join('');
  const limitStr = [[item.limittype0,item.limitvalue0],[item.limittype1,item.limitvalue1]].filter(([t,v])=>parseInt(t)&&parseInt(v)).map(([t,v])=>`${parseInt(t)===1?'Level':parseInt(t)===2?'Stat':'Limit'} ${v}+`).join(', ')||'None';
  let upgradeStr = '';
  if(item.type===1&&parseInt(item.value0)>0) { const uv=parseInt(item.value0); const un=allItems.find(i=>i.vnum===uv); upgradeStr=`<a href="#${uv}" class="upgrade-link" onclick="event.stopPropagation();scrollToVnum(${uv})">${un?un.name:'vnum '+uv} (#${uv})</a>`; }
  td.innerHTML = `<div class="detail-inner">
    <div class="full"><div class="detail-label">Description</div><div class="detail-value" style="font-family:inherit;font-size:.875rem;color:var(--text-muted)">${desc}</div></div>
    <div><div class="detail-label">vnum</div><div class="detail-value">${item.vnum}</div></div>
    <div><div class="detail-label">Type / Subtype</div><div class="detail-value">${ITEM_TYPES[item.type]||item.type} / ${item.subtype}</div></div>
    <div><div class="detail-label">Requirements</div><div class="detail-value">${limitStr}</div></div>
    <div><div class="detail-label">Buy / Sell Price</div><div class="detail-value">${fmt(item.shop_buy_price)} / ${fmt(item.gold)} yang</div></div>
    ${applies?`<div class="full"><div class="detail-label">Bonuses</div><div>${applies}</div></div>`:''}
    ${vals.length?`<div class="full"><div class="detail-label">Values</div><div>${vals.map(v=>`<span class="badge">${v.label}: ${v.val}</span>`).join('')}</div></div>`:''}
    ${parseInt(item.socket_pct)?`<div><div class="detail-label">Socket Chance</div><div class="detail-value">${item.socket_pct}%</div></div>`:''}
    ${aflags?`<div class="full"><div class="detail-label">Restrictions</div><div>${aflags}</div></div>`:''}
    ${upgradeStr?`<div class="full"><div class="detail-label">Upgrades To</div><div>${upgradeStr}</div></div>`:''}
  </div>`;
  dt.appendChild(td); tr.insertAdjacentElement('afterend', dt);
}

function scrollToVnum(vnum) {
  openVnum = null; document.querySelectorAll('.detail-row').forEach(r=>r.remove());
  const tr = document.querySelector(`[data-vnum="${vnum}"]`);
  if(tr) { tr.scrollIntoView({behavior:'smooth',block:'center'}); setTimeout(()=>tr.click(),350); }
  else { document.getElementById('searchInput').value=''; document.getElementById('typeFilter').value=''; document.getElementById('bonusFilter').checked=false; document.getElementById('questFilter').checked=false; filtered=allItems.slice(); renderTable(); setTimeout(()=>scrollToVnum(vnum),100); }
}

async function init() {
  try {
    const [protoRes, descRes] = await Promise.all([fetch(ITEM_PROTO_URL), fetch(ITEMDESC_URL)]);
    if(!protoRes.ok) throw new Error(`item_proto.txt: HTTP ${protoRes.status}`);
    if(!descRes.ok) throw new Error(`itemdesc.txt: HTTP ${descRes.status}`);
    const [protoText, descText] = await Promise.all([protoRes.text(), descRes.text()]);

    // parse itemdesc
    descText.split('\n').forEach(line=>{ const m=line.match(/^(\d+)\t(.*)$/); if(m) descMap.set(parseInt(m[1]),m[2].trim()); });

    // parse item_proto
    protoText.split('\n').forEach(line=>{ const t=line.trim(); if(!t||t.startsWith('//')) return; const item=parseLine(t); if(item&&item.vnum) allItems.push(item); });

    // populate type filter
    const types = [...new Set(allItems.map(i=>i.type))].sort((a,b)=>a-b);
    const sel = document.getElementById('typeFilter');
    types.forEach(t=>{ const o=document.createElement('option'); o.value=t; o.textContent=ITEM_TYPES[t]||('Type '+t); sel.appendChild(o); });

    document.getElementById('loadStatus').innerHTML = `Loaded <strong>${allItems.length}</strong> items from <a href="${ITEM_PROTO_URL}" target="_blank" style="color:var(--info)">item_proto.txt</a>`;
    document.getElementById('dbUI').style.display='';
    filtered = allItems.slice();
    document.getElementById('th-vnum').className='sort-asc';
    renderTable();

    if(parseErrors>0) { const pw=document.getElementById('parseWarn'); pw.textContent=`${parseErrors} lines skipped due to parse errors.`; pw.style.display=''; }

    // handle URL hash
    const hash = parseInt(location.hash.replace('#',''));
    if(hash) setTimeout(()=>scrollToVnum(hash), 200);
  } catch(e) {
    document.getElementById('loadStatus').style.display='none';
    document.getElementById('errorBox').innerHTML=`<div class="error-banner">Failed to load item data: ${e.message}<br>Verify the file exists: <a href="${ITEM_PROTO_URL}" target="_blank">${ITEM_PROTO_URL}</a></div>`;
    document.getElementById('errorBox').style.display='';
  }
}

window.addEventListener('DOMContentLoaded', init);
</script>
</body>
</html>
```

- [ ] **Step 2: Verify file created**

```bash
grep -n "item_proto.txt\|itemdesc.txt\|ITEM_TYPES\|applyFilters\|scrollToVnum" "D:/Git Repo/Metin2_Rework_v3/calculators/items.html"
```

Expected: 5+ matching lines.

---

### Task 3c: Create calculators/mobs.html

**File:** `calculators/mobs.html` (CREATE — does not exist yet)

- [ ] **Step 1: Write the complete file**

Write `D:/Git Repo/Metin2_Rework_v3/calculators/mobs.html` with the following complete content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Monster Database — Metin2 Rework v3</title>
  <link rel="stylesheet" href="../css/style.css" />
  <style>
    .db-toolbar { display:flex; flex-wrap:wrap; gap:.6rem; margin:1.5rem 0 .8rem; align-items:center; }
    .db-toolbar input[type="text"],.db-toolbar input[type="number"] { min-width:80px; }
    .db-toolbar input[type="text"] { flex:1; min-width:180px; }
    .db-toolbar select { width:auto; }
    .db-toolbar label { display:flex; align-items:center; gap:.35rem; font-size:.82rem; color:var(--text-muted); cursor:pointer; white-space:nowrap; }
    .db-toolbar label input[type="checkbox"] { accent-color:var(--accent); cursor:pointer; }
    .lvl-range { display:flex; align-items:center; gap:.3rem; font-size:.82rem; color:var(--text-muted); }
    .lvl-range input { width:64px; }
    .count-bar { font-size:.8rem; color:var(--text-muted); margin-bottom:.6rem; }
    .db-table { width:100%; border-collapse:collapse; font-size:.875rem; }
    .db-table th { background:var(--surface); padding:.55rem .75rem; text-align:left; font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); border-bottom:2px solid var(--border); cursor:pointer; user-select:none; white-space:nowrap; }
    .db-table th:hover { color:var(--text); }
    .db-table th.sort-asc::after { content:' ▲'; color:var(--accent); }
    .db-table th.sort-desc::after { content:' ▼'; color:var(--accent); }
    .db-table td { padding:.5rem .75rem; border-bottom:1px solid var(--border); vertical-align:top; }
    .db-table tr.data-row:nth-child(even) td { background:var(--surface-alt); }
    .db-table tr.data-row:hover td { background:rgba(230,168,23,.07); cursor:pointer; }
    .db-table tr.detail-row td { padding:0; border-bottom:2px solid var(--accent); }
    .detail-inner { padding:1.2rem 1.4rem; background:var(--surface); display:grid; grid-template-columns:1fr 1fr; gap:.5rem 2rem; }
    @media(max-width:600px){ .detail-inner { grid-template-columns:1fr; } }
    .detail-inner .full { grid-column:1/-1; }
    .detail-label { font-size:.75rem; color:var(--text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.04em; margin-bottom:.1rem; }
    .detail-value { font-size:.9rem; color:var(--text); font-family:var(--font-mono); }
    .badge { display:inline-block; padding:.15rem .5rem; border-radius:3px; font-size:.75rem; font-weight:600; background:var(--surface-alt); border:1px solid var(--border); color:var(--text-muted); margin:.1rem .15rem .1rem 0; }
    .badge.warn { border-color:var(--danger); color:var(--danger); }
    .badge.info { border-color:var(--info); color:var(--info); }
    .badge.success { border-color:var(--success); color:var(--success); }
    .status-bar { font-size:.8rem; color:var(--text-muted); margin:1rem 0 .4rem; }
    .status-bar a { color:var(--info); }
    .error-banner { background:rgba(248,81,73,.12); border:1px solid var(--danger); border-radius:var(--radius); padding:.8rem 1rem; margin:1rem 0; color:var(--danger); font-size:.875rem; }
    .spinner { display:inline-block; width:18px; height:18px; border:2px solid var(--border); border-top-color:var(--accent); border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; margin-right:.5rem; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .xlink { color:var(--info); text-decoration:none; font-family:var(--font-mono); font-size:.85rem; }
    .xlink:hover { text-decoration:underline; }
    .parse-warn { font-size:.75rem; color:var(--text-muted); margin-top:.8rem; }
  </style>
</head>
<body>
<header class="site-header">
  <a href="../index.html" class="logo">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
    Metin2 Rework v3
  </a>
  <nav>
    <a href="../index.html">Calculators</a>
    <a href="items.html">Item DB</a>
    <a href="https://github.com/M2tecDev/Metin2_Rework_v3/wiki" target="_blank">Wiki</a>
  </nav>
</header>
<div class="container" style="max-width:1100px">
  <a href="../index.html" class="back-link" style="display:inline-flex;align-items:center;gap:.35rem;color:var(--text-muted);text-decoration:none;font-size:.85rem;margin-bottom:1rem">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    All Calculators
  </a>
  <div class="hero" style="padding-top:.5rem;text-align:left">
    <h1 style="font-size:1.6rem;color:var(--accent)">👾 Monster &amp; NPC Database</h1>
    <p>Live data from <code>server/share/conf/mob_proto.txt</code> — fetched on page load.</p>
  </div>

  <div id="loadStatus"><span class="spinner"></span> Loading monster data…</div>
  <div id="errorBox" style="display:none"></div>

  <div id="dbUI" style="display:none">
    <div class="db-toolbar">
      <input type="text" id="searchInput" placeholder="Search by name…" oninput="applyFilters()" />
      <select id="typeFilter" onchange="applyFilters()">
        <option value="">All Types</option>
        <option value="0">Monster</option>
        <option value="1">NPC</option>
        <option value="2">Stone</option>
        <option value="3">Warp/Portal</option>
        <option value="other">Other</option>
      </select>
      <select id="rankFilter" onchange="applyFilters()">
        <option value="">All Ranks</option>
        <option value="0">Pawn</option>
        <option value="1">Knight</option>
        <option value="2">Boss</option>
        <option value="3">King</option>
      </select>
      <div class="lvl-range">Lv <input type="number" id="lvlMin" placeholder="min" min="0" oninput="applyFilters()" /> – <input type="number" id="lvlMax" placeholder="max" min="0" oninput="applyFilters()" /></div>
      <label><input type="checkbox" id="aggroFilter" onchange="applyFilters()" /> Aggressive</label>
      <label><input type="checkbox" id="bossFilter" onchange="applyFilters()" /> Boss &amp; King</label>
    </div>
    <div class="count-bar" id="countBar"></div>
    <div style="overflow-x:auto">
      <table class="db-table" id="mobTable">
        <thead>
          <tr>
            <th onclick="setSort('vnum')" id="th-vnum">vnum</th>
            <th onclick="setSort('name')" id="th-name">Name</th>
            <th onclick="setSort('type')" id="th-type">Type</th>
            <th onclick="setSort('rank')" id="th-rank">Rank</th>
            <th onclick="setSort('level')" id="th-level">Level</th>
            <th onclick="setSort('MAX_HP')" id="th-MAX_HP">Max HP</th>
            <th onclick="setSort('exp')" id="th-exp">EXP</th>
          </tr>
        </thead>
        <tbody id="mobTbody"></tbody>
      </table>
    </div>
    <div id="parseWarn" class="parse-warn" style="display:none"></div>
  </div>
</div>

<script>
const MOB_PROTO_URL = 'https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/mob_proto.txt';

const MOB_RANKS = {0:'Pawn',1:'Knight',2:'Boss',3:'King'};
const MOB_TYPES = {0:'Monster',1:'NPC',2:'Stone',3:'Warp/Portal',4:'Door',5:'Building',6:'PC',7:'Polymorph',8:'Horse/Mount'};
const AI_FLAGS  = ['Aggressive','No Move','Coward','Group Assist','Stone Skin','Revive'];
const IMM_FLAGS = ['Immune Stun','Immune Slow','Immune Knockback','Immune Curse','Immune Poison','Immune Terror','Immune Reflect'];
const RESIST_LABELS = ['Sword','Two-Hand','Dagger','Bell','Fan','Bow','Fire','Lightning','Magic','Wind','Poison'];
const ENCHANT_LABELS = ['Curse Chance','Slow Chance','Poison Chance','Stun Chance','Critical Chance','Penetrate Chance'];

let allMobs=[], filtered=[], sortCol='vnum', sortDir=1, openVnum=null, parseErrors=0;

function fmt(n){ return parseInt(n).toLocaleString(); }

function parseLine(line){
  const c=line.split('\t');
  if(c.length<47){parseErrors++;return null;}
  return {vnum:parseInt(c[0]),name:c[1],rank:parseInt(c[2]),type:parseInt(c[3]),battle_type:c[4],level:parseInt(c[5]),size:c[6],ai_flag:parseInt(c[7]),mount_capacity:c[8],setRaceFlag:c[9],setImmuneFlag:parseInt(c[10]),gold_min:c[11],gold_max:c[12],exp:parseInt(c[13]),def:c[14],attack_speed:c[15],move_speed:c[16],aggressive_hp_pct:c[17],aggressive_sight:parseInt(c[18]),attack_range:c[19],drop_item:parseInt(c[20]),resurrection_vnum:parseInt(c[21]),enchant_curse:c[22],enchant_slow:c[23],enchant_poison:c[24],enchant_stun:c[25],enchant_critical:c[26],enchant_penetrate:c[27],resist_sword:c[28],resist_twohand:c[29],resist_dagger:c[30],resist_bell:c[31],resist_fan:c[32],resist_bow:c[33],resist_fire:c[34],resist_elect:c[35],resist_magic:c[36],resist_wind:c[37],resist_poison:c[38],dam_multiply:c[39],summon_vnum:parseInt(c[40]),drain_sp:c[41],mob_color:c[42],polymorph_item:c[43],hpPercentage:c[44],healOnKill:c[45],MAX_HP:parseInt(c[46])};
}

function flagBits(val, labels){ const v=parseInt(val)||0; return labels.filter((_,i)=>v&(1<<i)); }

function setSort(col){ if(sortCol===col)sortDir*=-1;else{sortCol=col;sortDir=1;} document.querySelectorAll('.db-table th').forEach(th=>th.className=''); const th=document.getElementById('th-'+col); if(th)th.className=sortDir===1?'sort-asc':'sort-desc'; renderTable(); }

function applyFilters(){
  const q=document.getElementById('searchInput').value.trim().toLowerCase();
  const t=document.getElementById('typeFilter').value;
  const r=document.getElementById('rankFilter').value;
  const lmin=parseInt(document.getElementById('lvlMin').value);
  const lmax=parseInt(document.getElementById('lvlMax').value);
  const aggro=document.getElementById('aggroFilter').checked;
  const boss=document.getElementById('bossFilter').checked;
  filtered=allMobs.filter(m=>{
    if(q&&!m.name.toLowerCase().includes(q)) return false;
    if(t){if(t==='other'){if(m.type>=0&&m.type<=3)return false;}else if(m.type!==parseInt(t))return false;}
    if(r&&m.rank!==parseInt(r)) return false;
    if(!isNaN(lmin)&&m.level<lmin) return false;
    if(!isNaN(lmax)&&m.level>lmax) return false;
    if(aggro&&!(m.ai_flag&1)) return false;
    if(boss&&m.rank<2) return false;
    return true;
  });
  renderTable();
}

function renderTable(){
  filtered.sort((a,b)=>{let av=a[sortCol],bv=b[sortCol];const an=parseFloat(av),bn=parseFloat(bv);if(!isNaN(an)&&!isNaN(bn))return(an-bn)*sortDir;return String(av).localeCompare(String(bv))*sortDir;});
  document.getElementById('countBar').textContent=`Showing ${filtered.length} of ${allMobs.length} entries`;
  const tbody=document.getElementById('mobTbody'); tbody.innerHTML='';
  filtered.forEach(mob=>{
    const tr=document.createElement('tr'); tr.className='data-row'; tr.dataset.vnum=mob.vnum;
    const rankBadge=mob.rank>=2?`<span class="badge warn">${MOB_RANKS[mob.rank]||mob.rank}</span>`:`<span class="badge">${MOB_RANKS[mob.rank]||mob.rank}</span>`;
    tr.innerHTML=`<td style="font-family:var(--font-mono);color:var(--text-muted)">${mob.vnum}</td><td>${mob.name}</td><td>${MOB_TYPES[mob.type]||mob.type}</td><td>${rankBadge}</td><td style="font-family:var(--font-mono)">${mob.level}</td><td style="font-family:var(--font-mono)">${fmt(mob.MAX_HP)}</td><td style="font-family:var(--font-mono)">${fmt(mob.exp)}</td>`;
    tr.addEventListener('click',()=>toggleDetail(mob,tr));
    tbody.appendChild(tr);
  });
  if(openVnum){const tr=tbody.querySelector(`[data-vnum="${openVnum}"]`);if(tr){const m=allMobs.find(i=>i.vnum===openVnum);if(m)insertDetail(m,tr);}}
}

function toggleDetail(mob,tr){
  const ex=document.getElementById('detail-'+mob.vnum);
  if(ex){ex.remove();if(openVnum===mob.vnum){openVnum=null;history.replaceState(null,'',location.pathname);}return;}
  document.querySelectorAll('.detail-row').forEach(r=>r.remove());
  openVnum=mob.vnum; history.replaceState(null,'','#'+mob.vnum);
  insertDetail(mob,tr);
}

function insertDetail(mob,tr){
  const dt=document.createElement('tr'); dt.className='detail-row'; dt.id='detail-'+mob.vnum;
  const td=document.createElement('td'); td.colSpan=7;

  const resistFields=[mob.resist_sword,mob.resist_twohand,mob.resist_dagger,mob.resist_bell,mob.resist_fan,mob.resist_bow,mob.resist_fire,mob.resist_elect,mob.resist_magic,mob.resist_wind,mob.resist_poison];
  const resistStr=resistFields.map((v,i)=>parseInt(v)?`<span class="badge info">${RESIST_LABELS[i]}: ${v}%</span>`:'').join('');

  const enchFields=[mob.enchant_curse,mob.enchant_slow,mob.enchant_poison,mob.enchant_stun,mob.enchant_critical,mob.enchant_penetrate];
  const enchStr=enchFields.map((v,i)=>parseInt(v)?`<span class="badge warn">${ENCHANT_LABELS[i]}: ${v}%</span>`:'').join('');

  const aiStr=flagBits(mob.ai_flag,AI_FLAGS).map(l=>`<span class="badge">${l}</span>`).join('');
  const immStr=flagBits(mob.setImmuneFlag,IMM_FLAGS).map(l=>`<span class="badge">${l}</span>`).join('');

  const goldStr=(parseInt(mob.gold_min)||parseInt(mob.gold_max))?`${fmt(mob.gold_min)} – ${fmt(mob.gold_max)} yang`:'';
  const aggStr=mob.aggressive_sight?`Sight ${mob.aggressive_sight}, flee below ${mob.aggressive_hp_pct}% HP`:'';
  const dmStr=parseFloat(mob.dam_multiply);
  const dmStrShow=(dmStr&&dmStr!==1.0&&mob.dam_multiply!=='1.00')?mob.dam_multiply:'';

  const summonVnum=mob.summon_vnum; const summonMob=summonVnum?allMobs.find(m=>m.vnum===summonVnum):null;
  const resuVnum=mob.resurrection_vnum; const resuMob=resuVnum?allMobs.find(m=>m.vnum===resuVnum):null;
  const dropVnum=mob.drop_item;

  td.innerHTML=`<div class="detail-inner">
    <div><div class="detail-label">vnum</div><div class="detail-value">${mob.vnum}</div></div>
    <div><div class="detail-label">Type / Rank / Level</div><div class="detail-value">${MOB_TYPES[mob.type]||mob.type} / ${MOB_RANKS[mob.rank]||mob.rank} / ${mob.level}</div></div>
    <div><div class="detail-label">Max HP / Defense</div><div class="detail-value">${fmt(mob.MAX_HP)} / ${mob.def}</div></div>
    <div><div class="detail-label">Atk Speed / Move Speed</div><div class="detail-value">${mob.attack_speed} / ${mob.move_speed}</div></div>
    ${goldStr?`<div><div class="detail-label">Gold Drop</div><div class="detail-value">${goldStr}</div></div>`:''}
    <div><div class="detail-label">EXP Reward</div><div class="detail-value">${fmt(mob.exp)}</div></div>
    ${aggStr?`<div><div class="detail-label">Aggressive</div><div class="detail-value">${aggStr}</div></div>`:''}
    <div><div class="detail-label">Attack Range</div><div class="detail-value">${mob.attack_range}</div></div>
    ${dmStrShow?`<div><div class="detail-label">Damage Multiplier</div><div class="detail-value">×${dmStrShow}</div></div>`:''}
    ${resistStr?`<div class="full"><div class="detail-label">Resistances</div><div>${resistStr}</div></div>`:''}
    ${enchStr?`<div class="full"><div class="detail-label">Enchant Chances</div><div>${enchStr}</div></div>`:''}
    ${aiStr?`<div class="full"><div class="detail-label">AI Flags</div><div>${aiStr}</div></div>`:''}
    ${immStr?`<div class="full"><div class="detail-label">Immunities</div><div>${immStr}</div></div>`:''}
    ${summonVnum?`<div><div class="detail-label">Summons</div><div><a class="xlink" href="#${summonVnum}" onclick="event.stopPropagation();scrollToVnum(${summonVnum})">${summonMob?summonMob.name:'vnum '+summonVnum} (#${summonVnum})</a></div></div>`:''}
    ${resuVnum?`<div><div class="detail-label">Resurrects As</div><div><a class="xlink" href="#${resuVnum}" onclick="event.stopPropagation();scrollToVnum(${resuVnum})">${resuMob?resuMob.name:'vnum '+resuVnum} (#${resuVnum})</a></div></div>`:''}
    ${dropVnum?`<div><div class="detail-label">Drop Item</div><div><a class="xlink" href="items.html#${dropVnum}">Item #${dropVnum}</a></div></div>`:''}
  </div>`;
  dt.appendChild(td); tr.insertAdjacentElement('afterend',dt);
}

function scrollToVnum(vnum){
  openVnum=null; document.querySelectorAll('.detail-row').forEach(r=>r.remove());
  const tr=document.querySelector(`[data-vnum="${vnum}"]`);
  if(tr){tr.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>tr.click(),350);}
}

async function init(){
  try{
    const res=await fetch(MOB_PROTO_URL);
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text();
    text.split('\n').forEach(line=>{const t=line.trim();if(!t||t.startsWith('//'))return;const m=parseLine(t);if(m&&m.vnum)allMobs.push(m);});
    document.getElementById('loadStatus').innerHTML=`Loaded <strong>${allMobs.length}</strong> entries from <a href="${MOB_PROTO_URL}" target="_blank" style="color:var(--info)">mob_proto.txt</a>`;
    document.getElementById('dbUI').style.display='';
    filtered=allMobs.slice();
    document.getElementById('th-vnum').className='sort-asc';
    renderTable();
    if(parseErrors>0){const pw=document.getElementById('parseWarn');pw.textContent=`${parseErrors} lines skipped due to parse errors.`;pw.style.display='';}
    const hash=parseInt(location.hash.replace('#',''));
    if(hash) setTimeout(()=>scrollToVnum(hash),200);
  }catch(e){
    document.getElementById('loadStatus').style.display='none';
    document.getElementById('errorBox').innerHTML=`<div class="error-banner">Failed to load monster data: ${e.message}<br>Verify: <a href="${MOB_PROTO_URL}" target="_blank">${MOB_PROTO_URL}</a></div>`;
    document.getElementById('errorBox').style.display='';
  }
}
window.addEventListener('DOMContentLoaded',init);
</script>
</body>
</html>
```

- [ ] **Step 2: Verify file created**

```bash
grep -n "mob_proto.txt\|MOB_RANKS\|applyFilters\|scrollToVnum\|items.html" "D:/Git Repo/Metin2_Rework_v3/calculators/mobs.html"
```

Expected: 5+ matching lines.

---

### Task 3d: Update index.html

**File:** `D:/Git Repo/Metin2_Rework_v3/index.html` (at gh-pages root — NOT in calculators/)

> This file only exists on the `gh-pages` branch. Ensure you are on `gh-pages` before this step.

- [ ] **Step 1: Read index.html**

Read `D:/Git Repo/Metin2_Rework_v3/index.html` in full to confirm the existing structure and find the exact position of `<div class="section-title">Combat &amp; Economy</div>`.

- [ ] **Step 2: Insert Reference Databases section**

Insert the following block immediately **before** `<div class="section-title">Combat &amp; Economy</div>`:

```html
  <div class="section-title">Reference Databases</div>
  <div class="card-grid">
    <a href="calculators/items.html" class="calc-card">
      <span class="icon">📦</span>
      <h3>Item Database</h3>
      <p>Browse all items — full stats, bonuses, descriptions and upgrade chains</p>
    </a>
    <a href="calculators/mobs.html" class="calc-card">
      <span class="icon">👾</span>
      <h3>Monster &amp; NPC Database</h3>
      <p>Browse all monsters and NPCs — combat stats, resistances and drop links</p>
    </a>
  </div>

```

- [ ] **Step 3: Verify**

```bash
grep -n "Reference Databases\|Item Database\|Monster.*NPC Database\|calculators/items\|calculators/mobs" "D:/Git Repo/Metin2_Rework_v3/index.html"
```

Expected: 5 matching lines. Also verify "Reference Databases" appears before "Combat":

```bash
grep -n "Reference Databases\|Combat" "D:/Git Repo/Metin2_Rework_v3/index.html"
```

Expected: Reference Databases line number < Combat &amp; Economy line number.

---

### Task 3e: Commit, push gh-pages, return to master

- [ ] **Step 1: Commit gh-pages changes**

```bash
cd "D:/Git Repo/Metin2_Rework_v3"
git add calculators/items.html calculators/mobs.html index.html
git commit -m "feat(gh-pages): add Item Database and Monster Database pages, add Reference Databases section to hub"
```

- [ ] **Step 2: Push gh-pages**

```bash
git push origin gh-pages
```

- [ ] **Step 3: Verify push succeeded**

```bash
git log --oneline origin/gh-pages -3
```

Expected: top commit matches the gh-pages commit just made (same message and hash).

- [ ] **Step 4: Return to master**

```bash
git checkout master
```

- [ ] **Step 5: Final verification**

```bash
git branch
git log --oneline -6
```

Expected: `* master` is active. Top 6 commits include entries for submodule, wiki updates, and gh-pages.

---

## Summary Checklist

After completing all tasks, verify:

- [ ] `git submodule status` shows `server` submodule with a commit hash
- [ ] `wiki/concept-architecture.md` contains "The Four Repositories" section
- [ ] `wiki/start-server-setup.md` contains "Step 0 — Place Compiled Binaries"
- [ ] `wiki/start-workflow.md` contains "Multi-channel note"
- [ ] `wiki/guide-Build-Environment.md` contains "Distributing Your Build"
- [ ] `wiki/guide-Database-Proto.md` references `server/share/conf/item_proto.txt`
- [ ] `wiki/Home.md` contains a `server` row in the Repositories table
- [ ] `Metin2_Rework_v3.wiki` repo is pushed with all 7 updated files
- [ ] `calculators/items.html` exists on gh-pages branch
- [ ] `calculators/mobs.html` exists on gh-pages branch
- [ ] `index.html` on gh-pages has "Reference Databases" section above "Combat & Economy"
- [ ] Both gh-pages and master are pushed to origin
