# Design Spec: Server Submodule + Wiki Updates + Item/Mob Databases
**Date:** 2026-03-20
**Project:** Metin2 Rework v3
**Scope:** Add `server` submodule, update wiki for 4-repo structure, create live Item Database and Monster Database pages on GitHub Pages

---

## 1. Task 1 — Add `server` Submodule

### What changes
`.gitmodules` gets a fourth entry:

```ini
[submodule "server"]
    path = server
    url = https://github.com/d1str4ught/m2dev-server
```

### Approach
Run `git submodule add https://github.com/d1str4ught/m2dev-server server` from the repo root on the `master` branch. This clones the repo, registers the tracked commit, and stages both `.gitmodules` and the `server` submodule entry.

### Final repo root layout
```
client-bin/    ← Python UI scripts + assets
client-src/    ← C++ source for Metin2.exe
docs/          ← internal project docs
server/        ← NEW: runtime files (configs, SQL, scripts, binaries)
server-src/    ← C++ source for game + db + qc
wiki/          ← wiki source files (synced to GitHub Wiki)
```

### server/ directory structure (from m2dev-server)
```
server/
├── share/
│   ├── bin/                          ← compiled game, db, qc binaries live here
│   ├── conf/
│   │   ├── item_proto.txt            ← tab-separated item definitions
│   │   ├── mob_proto.txt             ← tab-separated mob definitions
│   │   └── *.txt                     ← other game config files
│   └── locale/
│       └── english/
│           └── quest/                ← compiled quest .lc files + qc binary
├── sql/
│   ├── account.sql
│   ├── common.sql
│   ├── log.sql
│   └── player.sql
├── start.py        ← starts all channels
├── stop.py         ← stops all channels + db
├── install.py      ← one-time channel setup + share/ symlinks
├── clear.py        ← clears logs and core dump files
├── channels.py     ← channel config (dependency of install.py)
└── perms.py        ← Linux: chmod 0777 on binaries
```

---

## 2. Task 2 — Wiki Updates

### Rule
Add and correct only. Never remove existing content.

### Files changed: 7

---

#### 2.1 `wiki/concept-architecture.md`

**ADD: "The Four Repositories" section**

New 4-column table:
| Repo | Language | Role | Key contents |
|------|----------|------|--------------|
| server-src | C++ | Build source for server binaries | game/, db/, qc/, common/, vendor/ |
| server | Python + config | Runtime environment | share/bin/, share/conf/, sql/, start.py |
| client-src | C++ | Build source for Metin2.exe | UserInterface/, GameLib/, EterLib/, vendor/ |
| client-bin | Python + assets | Runtime client files | root/, uiscript/, assets/ |

**ADD: ASCII 4-repo relationship diagram**
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

**ADD: Explanation of server vs server-src separation**
Source code vs runtime: you compile once in server-src when the C++ changes; the resulting binaries are copied to server/. The server/ repo holds configs, SQL schema, and management scripts that change independently of the C++ source — a config tweak does not require a recompile.

**UPDATE: File Locations Overview table**
Prefix all server-side paths with `server/` (e.g. `server/share/conf/item_proto.txt`). Add rows for `server/sql/`, `server/share/bin/`, `server/share/locale/english/quest/`.

---

#### 2.2 `wiki/start-requirements.md`

**ADD: "Repository Roles at a Glance" table** (4 rows: server-src / server / client-src / client-bin with role column)

**ADD: Python 3.x** to Section A requirements table
Note: "Required for management scripts: `start.py`, `stop.py`, `install.py`, `clear.py`"

**ADD: callout box** distinguishing server-src (C++ source, compile once) from server (runtime, configs + scripts, clone and configure)

---

#### 2.3 `wiki/start-server-setup.md`

Existing content (startup order, verification strings, shutdown order, common mistakes) preserved in full.

**ADD: "Step 0 — Binary Placement" section** (before "Correct Startup Order")
- After compiling server-src, copy binaries to `server/share/bin/`
- Copy `qc` additionally to `server/share/locale/english/quest/`
- Exact `cp` commands for Linux/FreeBSD, `copy` for Windows

**ADD: "Step 0b — Database Setup" section**
- 5 databases: `account`, `common`, `hotbackup`, `log`, `player`
- `hotbackup` is empty — must exist but no SQL to import
- Import commands: `mysql < server/sql/account.sql` etc.

**ADD: "Step 0c — Quest Compilation" section**
- MUST `cd server/share/locale/english/quest/` first
- Then `python make.py`
- Explain WHY cwd matters: make.py uses relative paths to find `.quest` source files

**ADD: "Step 0d — One-Time Setup with install.py" section**
- `python install.py` — run once after first setup
- What it does: creates channel directories, links share/ folders

**UPDATE: startup and shutdown commands** to use `python start.py` / `python stop.py` as the primary method (keep the manual `game`/`db` explanation as "what the scripts do under the hood")

**ADD: "What clear.py Does" callout**
- Removes log files and core dumps from all channel directories
- Safe to run between development iterations

**ADD: link** to `https://github.com/d1str4ught/m2dev-server#installationconfiguration`

---

#### 2.4 `wiki/start-workflow.md`

**UPDATE: `.quest` source file row** — Notes column:
"Must `cd server/share/locale/english/quest/` first, then `python make.py` — cwd is required"

**UPDATE: C++ server code rows** — Notes column:
"Compile in server-src → copy binary to `server/share/bin/` → `python stop.py` → `python start.py`"

**UPDATE: Safe Restart Sequence** — replace manual `game`/`db` start/stop lines with `python stop.py` / `python start.py`

**ADD: management script rows** to the master reference table:
| `server/share/conf/*.txt` config files | No | No | No | ✓ | No | No | No | Game reads conf at startup |
| Management scripts (start/stop/install/clear) | No | No | No | No | No | No | No | Script changes take effect next run |

**ADD: "Multi-channel note"** callout: `start.py` manages all configured channels automatically — no need to start each game process individually.

---

#### 2.5 `wiki/guide-Build-Environment.md`

**ADD: "Distributing Your Build" section** after "Server — Linux Build"

Content:
- After `cmake --install`, copy outputs to `server/`:

```bash
# Copy game and db binaries
cp server-src/build/_install/bin/game  server/share/bin/
cp server-src/build/_install/bin/db    server/share/bin/
cp server-src/build/_install/bin/qc    server/share/bin/
cp server-src/build/_install/bin/qc    server/share/locale/english/quest/

# Windows equivalent
copy server-src\build\_install\bin\game.exe  server\share\bin\
copy server-src\build\_install\bin\db.exe    server\share\bin\
copy server-src\build\_install\bin\qc.exe    server\share\bin\
copy server-src\build\_install\bin\qc.exe    server\share\locale\english\quest\
```

- After copying: run `python server/install.py` (first time) or `python server/start.py` (subsequent starts)
- Link to server README: `https://github.com/d1str4ught/m2dev-server#installationconfiguration`

---

#### 2.6 `wiki/guide-Database-Proto.md`

**UPDATE: proto file path references**
- `item_proto.txt` → `server/share/conf/item_proto.txt`
- `mob_proto.txt` → `server/share/conf/mob_proto.txt`

**UPDATE: SQL import section** — reference `server/sql/*.sql` as the canonical location

**UPDATE: stop/start commands** in "Step 5 — Restart db Process":
- `./stop.sh && ./start.sh` → `python stop.py && python start.py` (from `server/` root)

**UPDATE: Key Files table** — add rows:
| `share/conf/item_proto.txt` | server | Tab-separated item definitions read by db at startup |
| `share/conf/mob_proto.txt` | server | Tab-separated mob definitions read by db at startup |
| `sql/account.sql` etc. | server | Database schema files |

---

#### 2.7 `wiki/Home.md`

**UPDATE: Repositories table** — add `server` row:
| **server** | Runtime server files — configs (`share/conf/`), SQL schema (`sql/`), management scripts (`start.py`, `stop.py`, `install.py`), compiled binary destination (`share/bin/`) |

**UPDATE: Path A** entry path:
`Overview` → `Requirements` → `Server Setup` (which now includes binary placement + install.py) → `Client Setup` → `First Change` → `Daily Workflow`

---

## 3. Task 3 — GitHub Pages: Item & Monster Databases

**Branch:** `gh-pages`
**New files:** `calculators/items.html`, `calculators/mobs.html`
**Updated files:** `calculators/index.html`
**Not changed:** `css/style.css` (each database page uses an inline `<style>` block for table-specific CSS)

### 3.1 Shared architecture for both pages

**Data loading:**
```
Page load
  → fetch(item_proto_url) + fetch(itemdesc_url OR mob_proto_url) in parallel
  → show spinner during load
  → parse TSV: split lines, skip blanks/comments, split each line by \t
  → build in-memory array of objects with named fields
  → hide spinner, show "Loaded X entries from [filename]" with raw URL link
  → render initial table (sorted by vnum ascending)
```

**Interaction model:**
- Filter inputs (`input` event) → re-filter + re-render table body
- Column header click → toggle sort direction on that column, re-render, update ▲/▼ indicator
- Row click → toggle inline detail `<tr>` below the clicked row (collapse any previously open row first)
- URL hash `#<vnum>` on load → auto-find that entry, scroll to it, expand detail

**Error handling:**
- fetch fails → show error banner with raw URL for manual verification
- Line parse fails → silently skip; show "X lines skipped due to parse errors" footer (only if > 0)

**CSS approach:** Inline `<style>` in each file. Base theme from `../css/style.css`. New classes needed: `.db-table`, `.db-row`, `.detail-row`, `.detail-content`, `.filter-bar`, `.badge`, `.spinner`, `.status-bar`.

### 3.2 `calculators/items.html`

**Raw data sources:**
- `https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/item_proto.txt`
- `https://raw.githubusercontent.com/d1str4ught/m2dev-client/main/assets/locale/locale/en/itemdesc.txt`

**item_proto.txt column mapping (0-indexed, tab-separated):**
```
0:vnum  1:name  2:type  3:subtype  4:weight  5:size  6:antiflag  7:flag
8:wearflag  9:immuneflag  10:gold  11:shop_buy_price
12:limittype0  13:limitvalue0  14:limittype1  15:limitvalue1
16:applytype0  17:applyvalue0  18:applytype1  19:applyvalue1
20:applytype2  21:applyvalue2
22:value0  23:value1  24:value2  25:value3  26:value4  27:value5
28:socket_pct  29:addon_type
```

Note: `dwRefinedVnum` is not in the column list provided; upgrade chain uses `value0` for weapon-type items or a separate field if present. Implement upgrade chain from `value0` for now, skip if zero.

**Main table columns:** vnum | Name | Type | Buy Price | Stats

**Detail panel fields:** name, vnum, type (readable), subtype, description (from itemdesc.txt or "No description available"), limits (limittype0/1 → level/stat requirement), all 3 apply bonuses (skip zero), value0-5 with type-aware labels, socket_pct, anti-flag tags, flag tags, buy price / sell price (gold field)

**Filters:** text search (name), type dropdown, "Has bonuses" toggle, "Quest items" toggle

**Type/apply/flag mappings:** as specified in the task brief (all 34 item types, key apply types, antiflag bits)

### 3.3 `calculators/mobs.html`

**Raw data source:**
- `https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/mob_proto.txt`

**mob_proto.txt column mapping (0-indexed, tab-separated):**
```
0:vnum  1:name  2:rank  3:type  4:battle_type  5:level  6:size  7:ai_flag
8:mount_capacity  9:setRaceFlag  10:setImmuneFlag
11:gold_min  12:gold_max  13:exp  14:def
15:attack_speed  16:move_speed  17:aggressive_hp_pct  18:aggressive_sight
19:attack_range  20:drop_item  21:resurrection_vnum
22:enchant_curse  23:enchant_slow  24:enchant_poison  25:enchant_stun
26:enchant_critical  27:enchant_penetrate
28:resist_sword  29:resist_twohand  30:resist_dagger  31:resist_bell
32:resist_fan  33:resist_bow  34:resist_fire  35:resist_elect
36:resist_magic  37:resist_wind  38:resist_poison
39:dam_multiply  40:summon_vnum  41:drain_sp  42:mob_color
43:polymorph_item  44:hpPercentage  45:healOnKill  46:MAX_HP
```

**Main table columns:** vnum | Name | Type | Rank | Level | Max HP | EXP

**Detail panel fields:** name, vnum, type (readable), rank (readable), level, max HP, defense, attack/move speed, gold range, exp, aggressive sight + HP%, attack range, resistances (skip zeros), enchants (skip zeros), AI flag tags, immune flag tags, dam_multiply (if ≠ 1.0), summon_vnum link, resurrection_vnum link, drop_item link to items.html

**Filters:** text search (name), type dropdown (Monster/NPC/Stone/All), rank dropdown, level range min/max, "Aggressive only" toggle, "Boss & King only" toggle

**Rank/type/AI/immune mappings:** as specified in the task brief

### 3.4 `calculators/index.html` update

**ADD** a "Reference Databases" `section-title` + `card-grid` **above** the existing "Combat & Economy" section:

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

---

## 4. Execution Order

1. `git submodule add` → commit `.gitmodules` + `server` entry on `master`
2. Update 7 wiki files in `wiki/` → sync to `Metin2_Rework_v3.wiki` → commit + push both
   - Order: concept-architecture → start-requirements → start-server-setup → start-workflow → guide-Build-Environment → guide-Database-Proto → Home
3. Checkout `gh-pages` branch
4. Create `calculators/items.html`
5. Create `calculators/mobs.html`
6. Update `calculators/index.html`
7. Commit + push `gh-pages`

---

## 5. Quality Rules

1. English only
2. Wiki: add and correct, never remove
3. Calculator pages: all data fetched live from raw GitHub URLs — no hardcoded game data
4. Calculator pages: pure HTML + JavaScript, no backend required
5. GitHub raw URLs support CORS — `fetch()` works directly
6. Detail panels show only non-zero/non-null fields (skip zero resistances, zero enchants, etc.)
7. All file paths in wiki must match the actual `server/` repo structure exactly

---

## 6. File Summary

| File | Repo/Branch | Action |
|------|-------------|--------|
| `.gitmodules` | master | UPDATE — add server submodule |
| `wiki/concept-architecture.md` | master | UPDATE |
| `wiki/start-requirements.md` | master | UPDATE |
| `wiki/start-server-setup.md` | master | UPDATE |
| `wiki/start-workflow.md` | master | UPDATE |
| `wiki/guide-Build-Environment.md` | master | UPDATE |
| `wiki/guide-Database-Proto.md` | master | UPDATE |
| `wiki/Home.md` | master | UPDATE |
| `calculators/items.html` | gh-pages | CREATE |
| `calculators/mobs.html` | gh-pages | CREATE |
| `calculators/index.html` | gh-pages | UPDATE |

**Total: 11 files — 1 created (submodule), 7 updated (wiki), 2 created + 1 updated (gh-pages)**
