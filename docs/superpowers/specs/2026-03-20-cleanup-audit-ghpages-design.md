# Design Spec: Cleanup, Data Sync, Wiki Audit & GitHub Pages Overhaul
**Date:** 2026-03-20
**Project:** Metin2 Rework v3
**Branch:** claude/musing-mclaren → PR to master (gh-pages changes committed directly to gh-pages branch)
**Scope:** 5 tasks — master branch cleanup, GitHub Action data sync, exhaustive wiki audit, cross-link pass, GitHub Pages performance + icon system

---

## Approach: Three-Phase with Parallel Subagents (Approach B)

- **Phase 1** (sequential) — Infrastructure: Task 1 → Task 2A → Task 2B
- **Phase 2** (parallel) — Task 3 (scan/audit) runs alongside Task 5 (gh-pages rebuild); no dependency between them. Both may commit to `claude/musing-mclaren` — each agent must `git pull --rebase origin claude/musing-mclaren` before pushing. If the rebase fails (another agent pushed between pull and push), retry once. If it fails a second time, abort and surface the conflict to the user for manual resolution. In practice conflicts should not occur since Task 3 writes only `wiki/wiki-audit-report.md` and Task 5 writes only `scripts/build_icons.py` — non-overlapping files.
- **Phase 3** (sequential) — Task 4 (cross-linking), depends on Task 3 audit report

**Data availability note:** Task 5 updates `gh-pages` to point to `/data/` URLs only populated after the GitHub Action first runs on `master`. Pages will show a fetch error until then — acceptable by design.

---

## Task 1 — Remove `docs/superpowers` from master

`docs/superpowers/` contains two files accidentally committed to master:
- `docs/superpowers/specs/2026-03-20-metin2-server-repo-databases-design.md`
- `docs/superpowers/plans/2026-03-20-metin2-server-repo-databases.md`

**Steps:**
1. `git rm -r docs/superpowers`
2. Commit: `chore: remove accidental docs/superpowers from main branch`
3. Verify: `git ls-tree -r --name-only HEAD | grep docs/superpowers` returns no output (checking specifically for `docs/superpowers`, not all of `docs/`)

---

## Task 2 — Submodule Init + GitHub Action Data Sync

### 2A — Initialize submodules

```bash
git submodule update --init --recursive
```

All submodule repos are **public** (hosted at `github.com/d1str4ught/`), so the default `GITHUB_TOKEN` has read access. No PAT required.

All 4 currently show `-` prefix in `git submodule status` (uninitialized). After init, verify each of `server-src/`, `client-src/`, `client-bin/`, `server/` is non-empty and report which were freshly cloned.

### 2B — `.github/workflows/sync-data.yml`

No `.gitignore` exists in the repo. **Do not create one** — `data/` is a normal committed directory, no special handling needed.

**Note on `itemdesc.txt` path:** The actual path in the `client-bin` submodule is `assets/locale/locale/en/itemdesc.txt` — the double `locale/locale` segment is correct and intentional in the upstream repo structure.

**Full workflow file:**

```yaml
name: Sync data files from submodules

on:
  push:
    branches: [master]
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'

jobs:
  sync-data:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout with submodules
        uses: actions/checkout@v4
        with:
          submodules: recursive
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Copy proto and desc files
        run: |
          mkdir -p data
          cp server/share/conf/item_proto.txt data/item_proto.txt
          cp server/share/conf/mob_proto.txt  data/mob_proto.txt
          cp client-bin/assets/locale/locale/en/itemdesc.txt data/itemdesc.txt

      - name: Copy item data scripts
        run: |
          mkdir -p data/item_scripts
          find client-bin/assets/item -name "*.txt" | while read f; do
            rel="${f#client-bin/assets/item/}"
            mkdir -p "data/item_scripts/$(dirname "$rel")"
            cp "$f" "data/item_scripts/$rel"
          done

      - name: Build icons (if script exists)
        run: |
          # Condition: always run if the script exists; skip silently if not yet committed.
          # The script itself handles missing source files gracefully (see Task 5).
          if [ -f scripts/build_icons.py ]; then
            pip install Pillow --quiet
            python scripts/build_icons.py
          else
            echo "scripts/build_icons.py not yet present — skipping icon build"
          fi

      - name: Commit if changed
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add data/
          if git diff --staged --quiet; then
            echo "No changes to data/ — skipping commit"
          else
            git commit -m "chore: sync data files from submodules [auto]"
            git push origin master
          fi
```

**`GITHUB_TOKEN` re-trigger note:** When the Action pushes using `GITHUB_TOKEN`, GitHub suppresses any resulting workflow trigger events — this applies regardless of whether the current run was initiated by `push`, `schedule`, or `workflow_dispatch`. No `[skip ci]` in the commit message is required. This is documented GitHub behavior: "events triggered by the GITHUB_TOKEN will not create a new workflow run."

**Resulting raw URLs:**
```
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/item_proto.txt
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/mob_proto.txt
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/itemdesc.txt
https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/icons/<vnum>.png
```

---

## Task 3 — Exhaustive Wiki Audit

### Scan strategy: 4 parallel subagents + 1 cross-check agent

Each subagent scans one submodule and returns a **structured inventory** — lists of names grouped by file, not raw dumps. All files scanned; reporting filtered to architecturally significant entries only.

**Significance filter:** A symbol is reportable if it:
- Appears in more than one file, OR
- Is referenced from outside its own module, OR
- Maps directly to a named game system (character, item, map, quest, combat, packet, economy, etc.)

#### server-src/ subagent
- All `.h` / `.cpp`: class names, struct names, enum names, `#define` constants, free function signatures
- Extra depth (full extraction): `length.h`, `tables.h`, `packet_headers.h`, `char.h`, `battle.h`, `item.h`, `questmanager.h`, `sectree.h`
- Config key names from `game.conf` and `db.conf`

#### client-src/ subagent
- All `.h` / `.cpp`: same extraction as server-src
- Extra pass: all `UserInterface/*.cpp` → Python module registration calls → extract module names + registered function names

#### client-bin/ subagent
- All `.py` in `root/` and `uiscript/`: class names, method names, window names
- Locale files: available string keys (sample — first 100 keys only)
- `assets/item/**/*.txt`: `IconImageFileName` path values + any explicit vnum fields

#### server/ subagent
- `share/conf/`: all file names + column headers of proto files
- `sql/`: all table names + column names
- `share/locale/english/quest/`: all quest file names
- Management scripts (root-level `.py` / `.sh`): command/function names

### Cross-check (central agent)

Reads all 70+ wiki pages and checks inventories:

| Check | Flag when |
|---|---|
| **Accuracy** | Wiki states a file/class/function lives in location X, scan found it in location Y |
| **Missing coverage** | Architecturally significant symbol (by filter above) has zero mentions across all wiki pages |
| **Outdated references** | Wiki references a file/class/function not found in any of the 4 repos |
| **Cross-link opportunities** | Page discusses concept X, another page covers X from a different angle, no link exists between them |

### Output: `wiki/wiki-audit-report.md`

Committed to `claude/musing-mclaren` branch in the `wiki/` directory. Tracking document — not a published GitHub Wiki page (those are synced separately). Agent must `git pull --rebase origin claude/musing-mclaren` before pushing (Task 5 may also commit to this branch in parallel).

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

**PAUSE:** After Task 3 completes, show the audit report and await user confirmation before starting Task 4.

---

## Task 4 — Cross-linking Pass

### Rules

1. **Link target once per page** — first occurrence of the trigger term only
2. **Bidirectional:** If A → B is added, check whether B's existing content naturally discusses A's topic. If it does, add B → A. If B does not organically discuss A's subject matter, do NOT add a forced back-link. No numeric cap — the natural constraint is whether the back-link makes sense in B's context.
3. Never remove or rewrite existing content — insert inline links only; add "See also" block at the bottom only when there is no other natural insertion point on the page.
4. **Priority cross-link pass is unconditional** on all 70+ pages. Audit report cross-link opportunities are **additive** to the priority table, not a replacement.
5. **Trigger matching:** Case-insensitive, whole-word match. Applies to both prose text and inline code spans (e.g., `` `char.cpp` `` or `` `CG_*` ``). Does not match inside fenced code blocks (` ``` ` blocks) — only in prose and inline code.
6. **Target page identifiers** in the priority table are filenames without the `.md` extension (matching the existing `wiki/` directory naming convention, e.g., `topic-Game-Client-Protocol` = `wiki/topic-Game-Client-Protocol.md`). All filenames use lowercase kebab-case.
7. **Single-target rows in the priority table are intentionally complete.** For example, `vnum` links only to `concept-vnum` because that is the canonical definition page. If a page mentions both `vnum` and `item_proto`, the `item_proto` trigger fires independently and adds its own links (`topic-Item-System`, `guide-Database-Proto`). Each trigger row is evaluated independently — there is no "combined trigger" logic.

### Priority cross-links (applied to all pages regardless of audit)

| Trigger term on a page | Links to insert |
|---|---|
| "packet" / `CG_*` / `GC_*` | `[topic-Game-Client-Protocol](topic-Game-Client-Protocol)`, `[blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol)` |
| "item_proto" / "mob_proto" | `[topic-Item-System](topic-Item-System)`, `[guide-Database-Proto](guide-Database-Proto)`, gh-pages item/mob DB URLs |
| "quest" / Lua scripting | `[topic-Quest-System](topic-Quest-System)`, `[blueprint-Quest-System](blueprint-Quest-System)` |
| "sectree" / spatial partitioning | `[concept-sectree](concept-sectree)` |
| "vnum" | `[concept-vnum](concept-vnum)` |
| "CHARACTER class" / "char.cpp" | `[topic-Character-System](topic-Character-System)`, `[blueprint-Character-System](blueprint-Character-System)` |
| "Python" / UI scripting | `[topic-UI-Python-System](topic-UI-Python-System)`, `[blueprint-UI-Python-System](blueprint-UI-Python-System)` |
| server startup / `game.conf` / `db.conf` | `[start-server-setup](start-server-setup)` |

### Mandatory server repo reference updates (6 specific files)

| Wiki file | What to add |
|---|---|
| `guide-Database-Proto.md` | `item_proto.txt` / `mob_proto.txt` live at `server/share/conf/` |
| `guide-NPC-and-Spawning.md` | Regen files are in `server/share/` |
| `topic-Quest-System.md` | Quest files are in `server/share/locale/english/quest/` |
| `blueprint-Quest-System.md` | Same as above |
| `guide-Build-Environment.md` | Compiled binary destination: `server/share/bin/` |
| Any page mentioning `game.conf` or `db.conf` | Config path: `server/share/conf/` |

### Execution

Single agent iterates all 70+ wiki `.md` files. For each:
1. Scan for trigger terms (case-insensitive, whole-word, prose + inline code only)
2. Insert markdown links at first occurrence
3. Apply audit report cross-link opportunities for that page (additive)
4. Write file back

Output: summary of every file touched + every link added.

---

## Task 5 — GitHub Pages Performance + Icon System

**Branch strategy:**
- `calculators/items.html` and `calculators/mobs.html` → committed to `gh-pages` branch
- `scripts/build_icons.py` → committed to `claude/musing-mclaren` branch (merges to `master` via PR, so the GitHub Action can run it). Agent must `git pull --rebase origin claude/musing-mclaren` before pushing (Task 3 may also commit to this branch in parallel).

Both `items.html` and `mobs.html` receive identical performance treatment.

### Performance architecture

| Problem (current) | Solution |
|---|---|
| `renderTable()` creates DOM rows for all items on every call | Pagination: 50 rows/page, Prev/Next buttons, jump-to-page dropdown (by page number) |
| Detail panels built for all items upfront inside `renderTable()` | Build on first click; cache in `Map<vnum, HTMLElement>` — second click instant |
| Proto file re-parsed on filter/sort | Parse once in Web Worker; store parsed array in `allItems` |
| Re-render on every keystroke | 300ms debounce on search/filter inputs |
| UI blocks during proto file parse | Web Worker parses in background; loading indicator shows while parsing |

**Web Worker delivery:** Use an inline Worker via Blob URL to satisfy same-origin constraints on GitHub Pages (no separate `.js` file needed):

```js
const workerCode = `
  self.onmessage = function(e) {
    const lines = e.data.split('\\n');
    const result = [];
    // ... parse lines into item/mob objects ...
    self.postMessage(result);
  };
`;
const worker = new Worker(URL.createObjectURL(new Blob([workerCode], { type: 'text/javascript' })));
```

**What the Worker parses:** The Worker receives the raw `item_proto.txt` (or `mob_proto.txt`) text and parses it into an array of plain objects. Each object contains the fields already used by the existing `items.html`/`mobs.html` (e.g., `vnum`, `name`, `type`, `buy_price`, apply values, etc. — match the existing field names exactly). The Worker does **not** process item data scripts or icon paths. Icon URLs are constructed client-side as `data/icons/<vnum>.png` using the `vnum` field from each parsed object.

**Web Worker data flow:**
1. Main thread: `const text = await fetch(DATA_URL).then(r => r.text())`
2. Main thread: `worker.postMessage(text)` — sends raw text string to Worker
3. Worker: receives string in `e.data`, parses it into array of objects, calls `self.postMessage(parsedArray)`
4. Main thread: `worker.onmessage = e => { allItems = e.data; renderTable(); }`
5. Loading indicator is shown from step 1 until step 4 completes

**Pagination UX:**
- Prev / Next buttons + "Page X of Y" label + jump dropdown listing page numbers (1, 2, 3…)
- Dropdown jumps to the selected page number
- On search/filter change: reset to page 1, re-paginate filtered array
- URL hash updated with `#<vnum>` when detail panel is opened (preserves deep links)
- Page is scrollable and interactive before Worker finishes

### Icon system — `scripts/build_icons.py`

**Lives on `master` branch** (committed via `claude/musing-mclaren` PR). Run by the GitHub Action on every sync.

**Step-by-step:**

1. For each file in `data/item_scripts/**/*.txt`:
   - Extract `IconImageFileName` value (the string after `IconImageFileName` keyword, strip quotes)
   - Extract vnum: look for explicit `Vnum` field first; fall back to extracting the **first contiguous numeric sequence** from the filename stem using regex `\d+` (e.g., `12345.txt` → 12345, `sword_12345.txt` → 12345, `12345_fire.txt` → 12345). If no numeric sequence found, skip and log.

2. Map asset path: replace `d:/ymir work/` prefix (case-insensitive, normalise to forward slashes) with `client-bin/assets/`

3. **Approach A** — check if a `.png` already exists at the asset path (replacing `.sub` or `.tga` extension with `.png`). If found: copy to `data/icons/<vnum>.png`.

4. **Approach B** — if no `.png`, read the `.sub` file. **Metin2 `.sub` format:**
   - The file contains plain text
   - Line 1: atlas texture filename (e.g., `d:/ymir work/ui/items/weapon/sword.tga`) — resolve using the same `d:/ymir work/` → `client-bin/assets/` mapping
   - Line 2: four space-separated integers: `SubX SubY SubWidth SubHeight`
   - Only one region per `.sub` file; if the file has more than 2 lines, silently ignore lines 3+
   - Pillow crop call: `Image.open(atlas_path).crop((SubX, SubY, SubX+SubWidth, SubY+SubHeight)).save(f"data/icons/{vnum}.png")`

5. **Skip conditions** — log `SKIP vnum=X: <reason>` and continue if:
   - Source `.sub` or `.tga` file not found
   - Vnum cannot be determined
   - File parse error

6. **Output:** Print `Generated: X icons, Skipped: Y` at end of script

GitHub Action runs this script and commits any new/changed files in `data/icons/`.

### Icon display

| Location | Size | `<img>` attributes | Fallback (onerror) |
|---|---|---|---|
| Table first column (new) | 32×32 | `loading="lazy"` | Grey `<div>` 32×32, background `var(--surface-alt)`, centered text = first character of the type label string from the existing `ITEM_TYPES` constant already declared in `items.html` (e.g., `(ITEM_TYPES[item.type] ?? '?')[0]`). `ITEM_TYPES` is a plain object mapping integer type → string label (e.g., `{1: 'Weapon', 2: 'Armor', …}`). |
| Detail panel | 64×64 | `loading="lazy"` | Same grey div, 64×64 |

Icon URL: `https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/icons/<vnum>.png`

### Data URL replacements (both pages)

```
OLD → NEW

https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/item_proto.txt
→ https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/item_proto.txt

https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/mob_proto.txt
→ https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/mob_proto.txt

https://raw.githubusercontent.com/d1str4ught/m2dev-client/main/assets/locale/locale/en/itemdesc.txt
→ https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/itemdesc.txt
```

---

## Execution Order

```
Phase 1 — sequential (all commits on claude/musing-mclaren):
  1. Task 1  — git rm docs/superpowers, commit
  2. Task 2A — git submodule update --init --recursive, verify
  3. Task 2B — create .github/workflows/sync-data.yml, commit

Phase 2 — parallel:
  4a. Task 3  — 4 scan subagents → cross-check → wiki-audit-report.md
                git pull --rebase before push → commit to claude/musing-mclaren
  4b. Task 5  — checkout gh-pages: rebuild items.html + mobs.html, commit to gh-pages
                create scripts/build_icons.py: git pull --rebase before push
                  → commit to claude/musing-mclaren

  *** PAUSE: show wiki-audit-report.md, await user confirmation ***

Phase 3 — sequential:
  5. Task 4  — cross-linking pass on 70+ wiki pages, commit to claude/musing-mclaren

Final:
  6. PR: claude/musing-mclaren → master
     (gh-pages changes are already live on gh-pages branch)
```

---

## Constraints

1. Never remove existing wiki content — only add, correct, link
2. GitHub Pages must work without a backend (pure HTML + JS)
3. All data URLs in HTML pages: `M2tecDev/Metin2_Rework_v3/main/data/` — never submodule repo URLs
4. Max 50 DOM rows visible in items/mobs pages at any time
5. Icons lazy-load only — never pre-fetch all icons on page load
6. GitHub Action commits only when `git diff --staged` is non-empty
7. `docs/superpowers/` never committed to master
8. `scripts/build_icons.py` lives on `master` (via PR) — not on `gh-pages`
9. Cross-link trigger matching: case-insensitive, whole-word, prose + inline code only (not inside fenced code blocks)
10. Priority cross-links are unconditional; they override the 3-back-link cap on target pages
