# Design Spec: Cleanup, Data Sync, Wiki Audit & GitHub Pages Overhaul
**Date:** 2026-03-20
**Project:** Metin2 Rework v3
**Branch:** claude/musing-mclaren → PR to master (gh-pages changes committed directly to gh-pages branch)
**Scope:** 5 tasks — master branch cleanup, GitHub Action data sync, exhaustive wiki audit, cross-link pass, GitHub Pages performance + icon system

---

## Approach: Three-Phase with Parallel Subagents (Approach B)

- **Phase 1** — Infrastructure: Task 1 (cleanup) + Task 2 (submodule init + GitHub Action)
- **Phase 2** — Knowledge: Task 3 (scan, 4 parallel subagents) + Task 4 (cross-linking), with Task 5 running in parallel since it has no dependency on the audit
- **Phase 3** — GitHub Pages: Task 5 (performance + icons), committed directly to `gh-pages` branch

---

## Task 1 — Remove `docs/superpowers` from master

`docs/superpowers/` contains two files accidentally committed to master during the previous session:
- `docs/superpowers/specs/2026-03-20-metin2-server-repo-databases-design.md`
- `docs/superpowers/plans/2026-03-20-metin2-server-repo-databases.md`

**Steps:**
1. `git rm -r docs/superpowers`
2. Commit: `chore: remove accidental docs/superpowers from main branch`
3. Verify master tree is clean (no other obviously misplaced files — current scan shows none)

**Rule to save to memory:** `docs/superpowers/` is internal tooling — never commit to master. Spec/plan files stay in feature branches only.

---

## Task 2 — Submodule Init + GitHub Action Data Sync

### 2A — Initialize submodules

Run in worktree: `git submodule update --init --recursive`

Expected paths after init:
- `server-src/` — C++ server source
- `client-src/` — C++ client source
- `client-bin/` — Python scripts + assets
- `server/` — runtime files (configs, SQL, scripts, binaries)

All 4 currently show `-` in `git submodule status` (not initialized). Report which were freshly cloned.

### 2B — `.github/workflows/sync-data.yml`

**Triggers:**
```yaml
on:
  push:
    branches: [master]
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'
```

**Steps in order:**
1. `actions/checkout@v4` with `submodules: recursive`
2. Copy proto/desc files to `data/`:
   - `server/share/conf/item_proto.txt` → `data/item_proto.txt`
   - `server/share/conf/mob_proto.txt` → `data/mob_proto.txt`
   - `client-bin/assets/locale/locale/en/itemdesc.txt` → `data/itemdesc.txt`
3. Copy item data scripts: `client-bin/assets/item/**/*.txt` → `data/item_scripts/` (preserve subdirectory structure, only `.txt` files)
4. Run `python scripts/build_icons.py` if the script exists (graceful skip if not yet present)
5. `git diff --quiet` check — only commit if changes exist
6. Commit: `chore: sync data files from submodules [auto]`

**`.gitignore` additions** (create file if it doesn't exist):
```
!data/
!data/**
```

**Resulting raw URLs accessible to GitHub Pages:**
```
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/item_proto.txt
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/mob_proto.txt
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/itemdesc.txt
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/icons/<vnum>.png
```

---

## Task 3 — Exhaustive Wiki Audit

### Scan strategy: 4 parallel subagents + 1 cross-check agent

Each subagent scans one submodule and returns a **structured inventory** — lists of names grouped by file, not raw file dumps. All files scanned exhaustively; reporting is selective (architecturally significant entries only).

**Significance filter:** A symbol is "architecturally significant" if it:
- Appears in more than one file, OR
- Is referenced from outside its own module, OR
- Maps directly to a named game system (character, item, map, quest, combat, packet, economy, etc.)

#### server-src/ subagent
- All `.h` / `.cpp` files: class names, struct names, enum names, `#define` constants, free function signatures
- Extra depth on: `length.h`, `tables.h`, `packet_headers.h`, `char.h`, `battle.h`, `item.h`, `questmanager.h`, `sectree.h`
- Config structures: `game.conf`, `db.conf` key names

#### client-src/ subagent
- All `.h` / `.cpp`: same extraction as server-src
- Extra pass: `UserInterface/*.cpp` → all Python module registration calls → extract module names + registered function names

#### client-bin/ subagent
- All `.py` in `root/` and `uiscript/`: class names, method names, window names
- Locale files: available string keys (sample, not full dump)
- `assets/item/**/*.txt`: `IconImageFileName` paths + any vnum fields found

#### server/ subagent
- `share/conf/`: all file names + column headers of proto files
- `sql/`: all table names + column names
- `share/locale/english/quest/`: all quest file names
- Management scripts: command names

### Cross-check (central agent)

Reads all 70+ wiki pages and checks each inventory entry:

| Check | Flag when |
|---|---|
| **Accuracy** | Wiki mentions a file/class/function in the wrong location |
| **Missing coverage** | Architecturally significant symbol has zero wiki coverage |
| **Outdated references** | Wiki references a file/class/function not found in any of the 4 repos |
| **Cross-link opportunities** | Page discusses concept X, another page covers X from different angle, no link between them |

### Output: `wiki/wiki-audit-report.md`

```markdown
# Wiki Audit Report
Generated: 2026-03-20
Repos scanned: server-src, client-src, client-bin, server

## Accuracy Issues
| Wiki Page | Incorrect Statement | Correct Value |

## Missing Wiki Coverage
| File/Class/Function | Where Found | Suggested Wiki Page |

## Outdated References
| Wiki Page | Outdated Reference | Status in Repo |

## New Cross-Link Opportunities
| Source Page | Target Page | Why Link is Useful |

## Statistics
- Total files scanned: X
- Wiki pages checked: X
- Issues found: X
```

Committed to `wiki/wiki-audit-report.md` on `claude/musing-mclaren`. This is a tracking document, not a published wiki page.

---

## Task 4 — Cross-linking Pass

### Rules

1. Link a target **once per page** — first occurrence of the trigger term only
2. Every link is **bidirectional** — if A → B added, check B → A
3. Never remove or rewrite existing content — insert inline links only; add "See also" block at bottom if no other natural place

### Priority cross-links (applied to all pages regardless of audit)

| Trigger term | Links to insert |
|---|---|
| "packet" / CG_\* / GC_\* headers | `topic-Game-Client-Protocol`, `blueprint-Game-Client-Protocol` |
| "item_proto" / "mob_proto" | `topic-Item-System`, `guide-Database-Proto`, gh-pages item/mob DB URLs |
| "quest" / Lua scripting | `topic-Quest-System`, `blueprint-Quest-System` |
| "sectree" / spatial partitioning | `concept-sectree` |
| "vnum" | `concept-vnum` |
| "CHARACTER class" / "char.cpp" | `topic-Character-System`, `blueprint-Character-System` |
| "Python" / UI scripting | `topic-UI-Python-System`, `blueprint-UI-Python-System` |
| server startup / config files | `start-server-setup` |

### Server repo reference updates (mandatory edits)

| Wiki file | Addition |
|---|---|
| `guide-Database-Proto.md` | `item_proto.txt` / `mob_proto.txt` path: `server/share/conf/` |
| `guide-NPC-and-Spawning.md` | Regen files path: `server/share/` |
| `topic-Quest-System.md` | Quest files path: `server/share/locale/english/quest/` |
| `blueprint-Quest-System.md` | Same |
| `guide-Build-Environment.md` | Compiled binary destination: `server/share/bin/` |
| Any page mentioning `game.conf` / `db.conf` | Config path: `server/share/conf/` |

### Execution

Single agent iterates all 70+ wiki `.md` files. For each:
1. Scan for trigger terms
2. Insert markdown links at first occurrence
3. Apply audit-report cross-link opportunities for that page
4. Write file back

Output: summary of every file touched and every link added.

---

## Task 5 — GitHub Pages Performance + Icon System

Changes committed directly to `gh-pages` branch (independent of master PR).

### Performance architecture (both `items.html` and `mobs.html`)

| Problem | Solution |
|---|---|
| All rows rendered at once | Pagination: 50 rows/page, Previous/Next, jump-to-page dropdown |
| Detail panels pre-built for all items | Build on first click, cache in `Map<vnum, HTMLElement>` |
| Re-parse on every filter/sort | Parse once in Web Worker, store array in memory |
| Re-render on every keystroke | 300ms debounce on search input |
| UI blocks during parse | Web Worker + loading indicator ("Loading item database… (parsing X lines)") |

**Page must be scrollable and interactive before data finishes loading.**

On search/filter: reset to page 1, re-paginate filtered array. URL hash updated with `#vnum` on detail open (preserves deep links).

### Icon system

**Discovery step** (run after submodule init):
- Check for `.png` files in `client-bin/assets/` alongside `.sub` files
- If `.png` exists → Approach A (use directly)
- If only `.tga`/`.sub` → Approach B (Python conversion)

**Approach B — `scripts/build_icons.py`:**
1. Read each `data/item_scripts/**/*.txt`, extract `IconImageFileName` + vnum
2. Parse the `.sub` file → atlas path + crop rect `(x, y, w, h)`
3. Open `.tga` atlas with Pillow, crop rect, save to `data/icons/<vnum>.png`
4. Skip vnums where source file doesn't exist (no crash, log skip)
5. Output: `X icons generated, Y skipped`

The GitHub Action (Task 2B) runs this script on every sync and commits new/changed icons.

### Icon display

| Location | Size | Fallback |
|---|---|---|
| Table (first column) | 32×32 `<img loading="lazy">` | Grey box with item type initial (W, A, H…) |
| Detail panel | 64×64 | Same grey box |

`loading="lazy"` on `<img>` is sufficient for paginated rows — no Intersection Observer needed.

### Data URL updates

Both pages:
```
OLD: https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/item_proto.txt
NEW: https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/item_proto.txt

OLD: https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/mob_proto.txt
NEW: https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/mob_proto.txt

OLD: https://raw.githubusercontent.com/d1str4ught/m2dev-client/main/assets/locale/locale/en/itemdesc.txt
NEW: https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/itemdesc.txt
```

Icons: `https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/icons/<vnum>.png`

---

## Execution Order

```
Phase 1 (sequential):
  1. Task 1  — git rm docs/superpowers, commit
  2. Task 2A — git submodule update --init --recursive, verify
  3. Task 2B — create .github/workflows/sync-data.yml + .gitignore

Phase 2 (parallel):
  4a. Task 3  — 4 parallel scan subagents → central cross-check agent → wiki-audit-report.md
  4b. Task 5  — gh-pages branch: rebuild items.html + mobs.html (no dependency on audit)

  [PAUSE after Task 3: show audit report, await user confirmation before Task 4]

Phase 3 (sequential):
  5. Task 4  — cross-linking pass across all wiki pages

Final:
  6. PR: claude/musing-mclaren → master
```

---

## Constraints

1. Never remove existing wiki content — only add, correct, link
2. GitHub Pages works without a backend (pure HTML + JS)
3. All data URLs point to parent repo (`M2tecDev/Metin2_Rework_v3/main/data/`) — never to submodule repos
4. Max 50 DOM rows visible in items/mobs pages at any time
5. Icons lazy-load only — never pre-fetch all icons on page load
6. GitHub Action only commits when files actually changed (`git diff --quiet` check)
7. `docs/superpowers/` never on master
