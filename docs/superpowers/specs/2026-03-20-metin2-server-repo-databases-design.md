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
Prefix all server-side runtime paths with `server/` (e.g. `server/share/conf/item_proto.txt`). Add rows for `server/sql/`, `server/share/bin/`, `server/share/locale/english/quest/`.

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
- `hotbackup` is empty — must exist but no SQL to import (only `account.sql`, `common.sql`, `log.sql`, `player.sql` are in `server/sql/`)
- Import commands: `mysql < server/sql/account.sql` etc.

**ADD: "Step 0c — Quest Compilation" section**
- MUST `cd server/share/locale/english/quest/` first
- Then `python make.py`
- Explain WHY cwd matters: make.py uses relative paths to find `.quest` source files; running it from any other directory will fail to locate the source files

**ADD: "Step 0d — One-Time Setup with install.py" section**
- `python install.py` — run once after first setup from `server/` root
- What it does: creates channel directories, links share/ folders

**UPDATE: startup and shutdown commands** to use `python start.py` / `python stop.py` as the primary method (keep the manual `game`/`db` explanation as "what the scripts do under the hood")

**ADD: "What clear.py Does" callout**
- Removes log files and core dumps from all channel directories
- Safe to run between development iterations

**ADD: link** to `https://github.com/d1str4ught/m2dev-server#installationconfiguration`

---

#### 2.4 `wiki/start-workflow.md`

**UPDATE: `.quest` source file row** — Notes column:
"Must `cd server/share/locale/english/quest/` first, then `python make.py` — cwd is required because make.py uses relative paths"

**UPDATE: C++ server code rows** — Notes column:
"Compile in server-src → copy binary to `server/share/bin/` → `python stop.py` → `python start.py`"

**UPDATE: Safe Restart Sequence** — replace manual `game`/`db` start/stop lines with `python stop.py` / `python start.py` (run from `server/` root)

**ADD: management script rows** to the master reference table:

| I changed... | Run qc? | Recompile server? | Restart db? | Restart game? | Recompile client? | Repack assets? | Restart client? | Notes |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `server/share/conf/*.txt` config files | — | — | — | ✓ | — | — | — | Game reads conf at startup |
| Management scripts (start/stop/install/clear) | — | — | — | — | — | — | — | Script changes take effect next invocation |

**ADD: "Multi-channel note"** callout: `start.py` manages all configured channels automatically — no need to start each game process individually.

---

#### 2.5 `wiki/guide-Build-Environment.md`

**ADD: "Distributing Your Build" section** after "Server — Linux Build"

Content:
- After `cmake --install`, copy outputs to `server/`:

```bash
# Linux / FreeBSD — copy game and db binaries
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
- All references to `item_proto.txt` → `server/share/conf/item_proto.txt`
- All references to `mob_proto.txt` → `server/share/conf/mob_proto.txt`

**UPDATE: SQL import section** — reference `server/sql/*.sql` as the canonical location for schema files

**UPDATE: stop/start commands** in "Step 5 — Restart db Process":
- `./stop.sh && ./start.sh` → `python stop.py && python start.py` (run from `server/` root)

**UPDATE: Key Files table** — add rows:
| `share/conf/item_proto.txt` | server | Tab-separated item definitions read by db at startup |
| `share/conf/mob_proto.txt` | server | Tab-separated mob definitions read by db at startup |
| `sql/account.sql` / `common.sql` / `log.sql` / `player.sql` | server | Database schema files |

---

#### 2.7 `wiki/Home.md`

**UPDATE: Repositories table** — add `server` row:
| **server** | Runtime server files — configs (`share/conf/`), SQL schema (`sql/`), management scripts (`start.py`, `stop.py`, `install.py`), compiled binary destination (`share/bin/`) |

**UPDATE: Path A** entry path to reference Server Setup page (which now includes binary placement + install.py):
`Overview` → `Requirements` → `Server Setup` → `Client Setup` → `First Change` → `Daily Workflow`

---

## 3. Task 3 — GitHub Pages: Item & Monster Databases

### Branch: `gh-pages`

**Existing gh-pages structure:**
```
.nojekyll
css/style.css                  ← shared dark theme CSS (not modified)
js/formulas.js
index.html                     ← hub page (UPDATED)
calculators/
  damage.html
  dragon-soul.html
  drop-chance.html
  flags.html
  horse-level.html
  upgrade.html
```

**New files:** `calculators/items.html`, `calculators/mobs.html`
**Updated file:** `index.html` (at gh-pages root, NOT in calculators/)

Calculator pages link to `../css/style.css`. Each database page includes an inline `<style>` block for table-specific CSS — the shared `css/style.css` is not modified.

---

### 3.1 Raw data sources (all served from GitHub raw — CORS headers provided by GitHub CDN)

| File | URL |
|------|-----|
| item_proto.txt | `https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/item_proto.txt` |
| mob_proto.txt | `https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/mob_proto.txt` |
| itemdesc.txt | `https://raw.githubusercontent.com/d1str4ught/m2dev-client/main/assets/locale/locale/en/itemdesc.txt` |

GitHub raw URLs (`raw.githubusercontent.com`) return `Access-Control-Allow-Origin: *` headers — `fetch()` from any origin works without a proxy.

---

### 3.2 Shared architecture (both pages)

**Data loading:**
```
Page load
  → fetch() all needed URLs in parallel (Promise.all)
  → show spinner during load
  → parse TSV: split on \n, skip blank lines and comment lines (starting with //)
  → split each data line on \t, map fields by index to named properties
  → hide spinner, show "Loaded X entries from [filename]" with clickable raw URL link
  → render initial table (default sort: vnum ascending)
```

**Interaction model:**
- Filter inputs (`input` event on text/number, `change` on select/checkbox) → re-filter array → re-render `<tbody>`
- Column header `<th>` click → toggle sort direction on that column, re-render, update ▲/▼ indicator on active header
- Data row click → if detail row already open below it, close it; otherwise close any open detail row, then insert a new `<tr class="detail-row">` with a `<td colspan="N">` containing the detail panel; smooth height transition via CSS max-height
- URL hash `#<vnum>` on `DOMContentLoaded` → find entry with that vnum, scroll to its row, click it to open detail

**Error handling:**
- `fetch()` rejects or response not ok → show error banner: "Failed to load [filename]. Verify the file exists: [raw URL]"
- Line with wrong column count → silently skip; increment `parseErrors` counter
- After render: if `parseErrors > 0`, show "X lines skipped due to parse errors" at bottom of page

**URL hash update:** When a detail row opens, update `location.hash = '#' + vnum` so the URL is shareable.

---

### 3.3 `calculators/items.html`

#### Data sources
- item_proto.txt (tab-separated, no header row — first data line is a real item)
- itemdesc.txt: lines matching `/^\d+\t/` → parse as `vnum<TAB>description text`; build a `Map<vnum, description>` joined to items by vnum

#### item_proto.txt column mapping (0-indexed)

| Index | Field name |
|-------|-----------|
| 0 | vnum |
| 1 | name |
| 2 | type |
| 3 | subtype |
| 4 | weight |
| 5 | size |
| 6 | antiflag |
| 7 | flag |
| 8 | wearflag |
| 9 | immuneflag |
| 10 | gold |
| 11 | shop_buy_price |
| 12 | limittype0 |
| 13 | limitvalue0 |
| 14 | limittype1 |
| 15 | limitvalue1 |
| 16 | applytype0 |
| 17 | applyvalue0 |
| 18 | applytype1 |
| 19 | applyvalue1 |
| 20 | applytype2 |
| 21 | applyvalue2 |
| 22 | value0 |
| 23 | value1 |
| 24 | value2 |
| 25 | value3 |
| 26 | value4 |
| 27 | value5 |
| 28 | socket_pct |
| 29 | addon_type |

#### Type number → readable name mapping

| Number | Name |
|--------|------|
| 0 | None |
| 1 | Weapon |
| 2 | Armor |
| 3 | Consumable |
| 4 | Auto-Use |
| 5 | Material |
| 6 | Special |
| 7 | Tool |
| 8 | Lottery |
| 9 | Currency (Yang) |
| 10 | Metin Stone |
| 11 | Container |
| 12 | Fish |
| 13 | Rod |
| 14 | Resource |
| 15 | Campfire |
| 16 | Unique |
| 17 | Skillbook |
| 18 | Quest Item |
| 19 | Polymorph |
| 20 | Treasure Box |
| 21 | Treasure Key |
| 22 | Skillbook (Forget) |
| 23 | Gift Box |
| 24 | Pick |
| 25 | Hair |
| 26 | Medium |
| 27 | Costume |
| 28 | Dragon Soul |
| 29 | Dragon Soul Special |
| 30 | Extract |
| 31 | Secondary Coin |
| 32 | Ring |
| 33 | Belt |

#### Apply type number → stat name mapping (key values; others shown as raw number)

| Number | Name |
|--------|------|
| 0 | None |
| 1 | Max HP |
| 2 | Max SP (Mana) |
| 3 | Constitution (HT) |
| 4 | Intelligence (IQ) |
| 5 | Strength (ST) |
| 6 | Dexterity (DX) |
| 11 | Attack Speed |
| 12 | Movement Speed |
| 13 | Cast Speed |
| 16 | Attack Bonus |
| 17 | Defense Bonus |
| 18 | Magic Attack |
| 19 | Magic Defense |
| 21 | Critical Hit % |
| 22 | Penetrating Hit % |
| 35 | Sword Resistance |
| 36 | Two-Hand Resistance |
| 37 | Dagger Resistance |
| 40 | Magic Resistance |

#### Antiflag bitmask → tag labels

| Bit | Label |
|-----|-------|
| 0 | No Drop |
| 1 | No Trade |
| 2 | No Sell |
| 3 | No Equip |
| 4 | No Warrior |
| 5 | No Assassin |
| 6 | No Sura |
| 7 | No Shaman |
| 8 | Male Only |
| 9 | Female Only |

#### Type-aware value labels for detail panel

- **Weapon (type=1):** value0=Min ATK, value1=Max ATK, value2=Magic Min ATK, value3=Magic Max ATK
- **Armor (type=2):** value0=Defense, value1=Magic Defense
- **Consumable/Use (type=3 or 4):** value0=HP Restore, value1=SP Restore, value2=Effect Type, value3=Duration (ms)
- **All other types:** show raw `value0`–`value5` labels

#### Main table columns
vnum (sortable) | Name | Type | Buy Price (formatted with commas) | Stats (first non-zero applytype → "ST +10" style)

#### Detail panel fields
Full name + vnum, type (readable) + subtype, description (from itemdesc Map by vnum, or "No description available"), limits (limittype0/1: type 1=Level requirement, type 2=Stat requirement → display label+value, skip if limitvalue=0), all 3 apply bonuses (format: "Strength (ST): +15", skip if applytype=0 or applyvalue=0), value0–5 with type-aware labels (skip zeros), socket_pct (if > 0: "Socket Chance: X%"), antiflag tags (render each set bit as a badge), buy price / sell price (gold field), upgrade chain: if value0 > 0 and type=1 treat value0 as upgrade vnum and render "Upgrades to: [name] (#vnum)" as clickable `href="#vnum"`

#### Filters
- Text search → instant filter on `name` field (case-insensitive)
- Type dropdown → "All Types" + one option per type from mapping above
- "Has bonuses" checkbox → only items where at least one applytype > 0 and applyvalue > 0
- "Quest items" checkbox → only items where type === 18 (Quest Item in the type mapping above)

#### Results count
"Showing X of Y items" updated on every filter change

---

### 3.4 `calculators/mobs.html`

#### Data source
mob_proto.txt (tab-separated, no header row)

#### mob_proto.txt column mapping (0-indexed)

| Index | Field name |
|-------|-----------|
| 0 | vnum |
| 1 | name |
| 2 | rank |
| 3 | type |
| 4 | battle_type |
| 5 | level |
| 6 | size |
| 7 | ai_flag |
| 8 | mount_capacity |
| 9 | setRaceFlag |
| 10 | setImmuneFlag |
| 11 | gold_min |
| 12 | gold_max |
| 13 | exp |
| 14 | def |
| 15 | attack_speed |
| 16 | move_speed |
| 17 | aggressive_hp_pct |
| 18 | aggressive_sight |
| 19 | attack_range |
| 20 | drop_item |
| 21 | resurrection_vnum |
| 22 | enchant_curse |
| 23 | enchant_slow |
| 24 | enchant_poison |
| 25 | enchant_stun |
| 26 | enchant_critical |
| 27 | enchant_penetrate |
| 28 | resist_sword |
| 29 | resist_twohand |
| 30 | resist_dagger |
| 31 | resist_bell |
| 32 | resist_fan |
| 33 | resist_bow |
| 34 | resist_fire |
| 35 | resist_elect |
| 36 | resist_magic |
| 37 | resist_wind |
| 38 | resist_poison |
| 39 | dam_multiply |
| 40 | summon_vnum |
| 41 | drain_sp |
| 42 | mob_color |
| 43 | polymorph_item |
| 44 | hpPercentage |
| 45 | healOnKill |
| 46 | MAX_HP |

#### Rank number → readable name

| Number | Name |
|--------|------|
| 0 | Pawn |
| 1 | Knight |
| 2 | Boss |
| 3 | King |

#### Type number → readable name

| Number | Name |
|--------|------|
| 0 | Monster |
| 1 | NPC |
| 2 | Stone |
| 3 | Warp/Portal |
| 4 | Door |
| 5 | Building |
| 6 | PC |
| 7 | Polymorph |
| 8 | Horse/Mount |

#### AI flag bitmask → tag labels

| Bit | Label |
|-----|-------|
| 0 | Aggressive |
| 1 | No Move |
| 2 | Coward |
| 3 | Group Assist |
| 4 | Stone Skin |
| 5 | Revive |

#### Immune flag bitmask → tag labels

| Bit | Label |
|-----|-------|
| 0 | Immune Stun |
| 1 | Immune Slow |
| 2 | Immune Knockback |
| 3 | Immune Curse |
| 4 | Immune Poison |
| 5 | Immune Terror |
| 6 | Immune Reflect |

#### Resistance fields (columns 28–38) → readable label

resist_sword=Sword, resist_twohand=Two-Hand, resist_dagger=Dagger, resist_bell=Bell, resist_fan=Fan, resist_bow=Bow, resist_fire=Fire, resist_elect=Lightning, resist_magic=Magic, resist_wind=Wind, resist_poison=Poison

#### Enchant fields (columns 22–27) → readable label

enchant_curse=Curse Chance, enchant_slow=Slow Chance, enchant_poison=Poison Chance, enchant_stun=Stun Chance, enchant_critical=Critical Chance, enchant_penetrate=Penetrate Chance

#### Main table columns
vnum (sortable) | Name | Type (readable) | Rank (readable) | Level (sortable) | Max HP (formatted, sortable) | EXP (sortable)

#### Detail panel fields
Full name + vnum, type (readable), rank (readable), level, Max HP (formatted), defense, attack speed, move speed, gold drop range ("X – Y yang"; skip if both 0), EXP, aggressive sight + HP% threshold (skip if aggressive_sight=0), attack range, all resistance fields > 0 (format: "Fire Resistance: 30%"), all enchant fields > 0 (format: "Stun Chance: 15%"), AI flag tags, immune flag tags, dam_multiply (if != 1.0 and != "1.00"), summon_vnum > 0 → "Summons: [name] (#vnum)" as `href="#vnum"` on same page, resurrection_vnum > 0 → "Resurrects as: [name] (#vnum)" as `href="#vnum"`, drop_item > 0 → "Drops item: #[vnum]" as `href="items.html#vnum"`

#### Cross-link from mobs to items
`drop_item` (column 20) contains the item vnum to drop. Link: `items.html#<drop_item_vnum>`. Opening this link opens items.html with that item pre-selected via URL hash.

#### Filters
- Text search → filter on `name` (case-insensitive)
- Type dropdown → "All" + Monster / NPC / Stone / Warp/Portal / Other
- Rank dropdown → "All" + Pawn / Knight / Boss / King
- Level range → min input + max input (both optional; empty = no bound)
- "Aggressive only" checkbox → only mobs where bit 0 of ai_flag is set
- "Boss & King only" checkbox → only mobs where rank >= 2

#### Results count
"Showing X of Y entries" updated on every filter change

---

### 3.5 `index.html` update (gh-pages root)

The existing `index.html` has these sections in order:
1. "Combat & Economy" — damage, upgrade, drop-chance
2. "Progression" — dragon-soul, horse-level
3. "Item Flags" — flags

**ADD** a new section **above** "Combat & Economy":

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

The navigation header and footer of `index.html` are not changed.

---

## 4. Execution Order

1. **master branch:**
   - `git submodule add` → commit
   - Update 7 wiki files in order: concept-architecture → start-requirements → start-server-setup → start-workflow → guide-Build-Environment → guide-Database-Proto → Home
   - Sync all 7 files to `Metin2_Rework_v3.wiki` repo → commit + push both

2. **gh-pages branch:**
   - `git checkout gh-pages`
   - Create `calculators/items.html`
   - Create `calculators/mobs.html`
   - Update `index.html` (add Reference Databases section)
   - Commit + push gh-pages

---

## 5. Quality Rules

1. English only
2. Wiki: add and correct, never remove existing content
3. Calculator pages: all data fetched live from raw GitHub URLs — no hardcoded game data
4. Calculator pages: pure HTML + JavaScript, no backend required
5. GitHub raw URLs (`raw.githubusercontent.com`) provide `Access-Control-Allow-Origin: *` — `fetch()` works directly from any origin including GitHub Pages
6. Detail panels skip zero/null fields (zero resistances, zero enchants, zero apply values)
7. All file paths in wiki must match the actual `server/` repo structure exactly
8. Wiki stop/start commands: always `python stop.py` / `python start.py` run from `server/` root

---

## 6. File Summary

| # | File | Repo/Branch | Action |
|---|------|-------------|--------|
| 1 | `.gitmodules` | master | UPDATE — add server submodule entry |
| 2 | `wiki/concept-architecture.md` | master | UPDATE |
| 3 | `wiki/start-requirements.md` | master | UPDATE |
| 4 | `wiki/start-server-setup.md` | master | UPDATE |
| 5 | `wiki/start-workflow.md` | master | UPDATE |
| 6 | `wiki/guide-Build-Environment.md` | master | UPDATE |
| 7 | `wiki/guide-Database-Proto.md` | master | UPDATE |
| 8 | `wiki/Home.md` | master | UPDATE |
| 9 | `calculators/items.html` | gh-pages | CREATE |
| 10 | `calculators/mobs.html` | gh-pages | CREATE |
| 11 | `index.html` | gh-pages | UPDATE |

**Total: 11 files authored — 1 submodule registration, 7 wiki updates, 2 new HTML pages, 1 updated HTML page**
