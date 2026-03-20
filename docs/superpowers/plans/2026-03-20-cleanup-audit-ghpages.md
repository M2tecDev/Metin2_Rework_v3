# Cleanup, Data Sync, Wiki Audit & GitHub Pages Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove accidental files from master, set up automated data sync via GitHub Action, produce an exhaustive wiki audit, add cross-links across all wiki pages, and rebuild items/mobs database pages with pagination, Web Worker parsing, and icon support.

**Architecture:** Three sequential phases on branch `claude/musing-mclaren`. Phase 1: infrastructure cleanup. Phase 2: wiki audit (4 parallel subagents) and gh-pages rebuild run simultaneously — Task 3 commits `wiki/wiki-audit-report.md`, Task 5 commits `scripts/build_icons.py`, both to `claude/musing-mclaren`; items/mobs HTML commits go to `gh-pages`. Phase 3: cross-linking pass after user approves audit. Final PR: `claude/musing-mclaren → master`.

**Tech Stack:** Git, GitHub Actions (YAML), Python 3 + Pillow, vanilla HTML/CSS/JS (Blob-URL Web Workers, `Map` detail cache, `loading="lazy"` images, 300ms debounce)

**Working directory for all steps unless stated otherwise:** `D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren`

---

## File Map

| File | Action | Task |
|---|---|---|
| `docs/superpowers/` | Delete (git rm) | 1 |
| `.github/workflows/sync-data.yml` | Create | 2B |
| `wiki/wiki-audit-report.md` | Create (auto-generated) | 3 |
| `calculators/items.html` (gh-pages) | Modify | 5 |
| `calculators/mobs.html` (gh-pages) | Modify | 5 |
| `scripts/build_icons.py` | Create | 5 |
| `wiki/*.md` (70+ files) | Modify (links added) | 4 |

---

## Task 1: Remove `docs/superpowers` from master

**Files:**
- Delete: `docs/superpowers/` (entire tree)

- [ ] **Step 1: Verify the files exist on this branch**

```bash
git ls-tree -r --name-only HEAD | grep docs/superpowers
```
Expected output:
```
docs/superpowers/plans/2026-03-20-metin2-server-repo-databases.md
docs/superpowers/specs/2026-03-20-metin2-server-repo-databases-design.md
```

- [ ] **Step 2: Remove the directory from git tracking**

```bash
git rm -r docs/superpowers
```
Expected: two lines like `rm 'docs/superpowers/plans/...'`

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove accidental docs/superpowers from main branch"
```

- [ ] **Step 4: Verify removal**

```bash
git ls-tree -r --name-only HEAD | grep docs/superpowers
```
Expected: **no output** (empty). Also confirm the design spec from the current session is still present:
```bash
git ls-tree -r --name-only HEAD | grep docs/superpowers/specs/2026-03-20-cleanup
```
Expected: **one line** (the new spec that belongs here).

---

## Task 2A: Initialize All Submodules

**Files:** No files created/modified — submodules are populated locally only.

- [ ] **Step 1: Run submodule init**

```bash
git submodule update --init --recursive
```
This clones all 4 submodules. All are public repos — no PAT needed. May take several minutes.

- [ ] **Step 2: Verify each submodule is non-empty**

```bash
ls server-src/ | head -3 && echo "---" && \
ls client-src/ | head -3 && echo "---" && \
ls client-bin/ | head -3 && echo "---" && \
ls server/ | head -3
```
Expected: each section shows 3+ filenames. If any section is empty, run `git submodule update --init <name>` for that specific submodule.

- [ ] **Step 3: Report status**

```bash
git submodule status
```
Expected: all 4 lines start with a space (not `-`), meaning they are now initialized.

---

## Task 2B: Create GitHub Action Workflow

**Files:**
- Create: `.github/workflows/sync-data.yml`

- [ ] **Step 1: Create the workflows directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create the workflow file**

Create `.github/workflows/sync-data.yml` with this exact content:

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

**Notes on this file:**
- `itemdesc.txt` path has a double `locale/locale` — this is correct for the upstream repo structure
- `GITHUB_TOKEN` will not re-trigger push workflows even from scheduled/dispatch runs (documented GitHub behavior)
- `git push origin master` is explicit to avoid issues with dispatch triggers

- [ ] **Step 3: Verify YAML syntax**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/sync-data.yml'))" && echo "YAML valid"
```
Expected: `YAML valid`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/sync-data.yml
git commit -m "feat: add sync-data GitHub Action to copy submodule data files"
```

---

## Task 3: Exhaustive Wiki Audit

> ⚠️ **Run this task in PARALLEL with Task 5.** Dispatch both simultaneously. Task 3 commits only `wiki/wiki-audit-report.md`; Task 5 commits only `scripts/build_icons.py` — no conflicts possible.

**Files:**
- Create: `wiki/wiki-audit-report.md`

### Step 1: Dispatch 4 parallel scan subagents

Dispatch all 4 simultaneously (use superpowers:dispatching-parallel-agents). Each receives the instructions below.

---

**Subagent prompt — server-src/**

```
Scan the server-src/ submodule in the Metin2 Rework v3 repo at:
D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren\server-src\

Build an inventory of architecturally significant symbols. A symbol is significant if it:
- Appears in more than one file, OR
- Is referenced from outside its own module, OR
- Maps to a named game system (character, item, map, quest, combat, packet, economy, etc.)

Extract from ALL .h and .cpp files:
- Class names
- Struct names
- Enum names and their values
- #define constants (name + value)
- Free function signatures (name + params)

Give EXTRA DEPTH to these files (list every symbol regardless of significance):
length.h, tables.h, packet_headers.h, char.h, battle.h, item.h, questmanager.h, sectree.h

Also extract key names from any game.conf and db.conf files found.

Return a structured inventory in this format:
## server-src Inventory

### [filename]
**Classes:** ClassName1, ClassName2
**Structs:** StructName1
**Enums:** EnumName1 (VALUE1=0, VALUE2=1)
**Defines:** DEFINE_NAME=value, ...
**Functions:** functionName(params), ...

Include only significant symbols in the summary (apply the filter above).
For the 8 key files listed, include everything regardless of filter.
```

---

**Subagent prompt — client-src/**

```
Scan the client-src/ submodule in the Metin2 Rework v3 repo at:
D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren\client-src\

Build an inventory of architecturally significant symbols (same significance filter as server-src:
appears in multiple files, referenced cross-module, or maps to a named game system).

Extract from ALL .h and .cpp files:
- Class names, struct names, enum names, #define constants, free function signatures

Extra pass — find all Python module registrations in UserInterface/*.cpp:
- Look for calls like PyModule_AddObject, Py_BuildValue, PyArg_ParseTuple, module name strings
- Extract: module name → list of registered function names

Return structured inventory:
## client-src Inventory

### [filename]
**Classes:** ...
**Structs:** ...
**Enums:** ...
**Defines:** ...
**Functions:** ...

### Python Modules (from UserInterface/*.cpp)
**Module "system":** func1, func2, ...
**Module "net":** func1, func2, ...
(etc. for each registered module)
```

---

**Subagent prompt — client-bin/**

```
Scan the client-bin/ submodule in the Metin2 Rework v3 repo at:
D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren\client-bin\

Extract the following:

1. From ALL .py files in root/ and uiscript/:
   - Class names
   - Method names (grouped by class)
   - Top-level window names (variable assignments like MyWindow = ...)

2. From locale files (any locale_*.py or similar):
   - First 100 string key names only

3. From assets/item/**/*.txt:
   - IconImageFileName value (the path string)
   - Any explicit Vnum field value
   - List them as: vnum (or filename) → IconImageFileName path

Return structured inventory:
## client-bin Inventory

### root/ Python Classes
**ClassName (file.py):** method1, method2, ...

### uiscript/ Window Classes
**WindowName (file.py):** ...

### Locale Keys (first 100)
key1, key2, ...

### Item Icon Mapping (from assets/item/)
vnum/filename → icon path
...
```

---

**Subagent prompt — server/**

```
Scan the server/ submodule in the Metin2 Rework v3 repo at:
D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren\server\

Extract the following:

1. share/conf/ — list all files; for .txt proto files extract column headers (first non-comment line)
2. sql/ — list all .sql files; extract all table names (CREATE TABLE ...) and column names
3. share/locale/english/quest/ — list all quest file names
4. Root-level .py and .sh management scripts — list script names and main function/command names

Return structured inventory:
## server/ Inventory

### share/conf/ Files
- filename.txt: col1, col2, col3, ...

### SQL Tables
**table_name:** col1, col2, col3, ...

### Quest Files
quest1.lua, quest2.lua, ...

### Management Scripts
- script.py: command1(), command2(), ...
```

---

- [ ] **Step 2: Collect all 4 inventory results**

Wait for all 4 subagents to complete. Combine their outputs into a single working document.

- [ ] **Step 3: Cross-check against wiki pages**

Read every `.md` file in `wiki/` (70+ files). For each inventory entry, check:

| Check | What to look for |
|---|---|
| **Accuracy** | Wiki says X is in file A — scan shows it's in file B |
| **Missing coverage** | Architecturally significant symbol with zero mentions across all wiki pages |
| **Outdated references** | Wiki references a symbol not found in any of the 4 repos |
| **Cross-link opportunities** | Page discusses concept X; another page covers X from different angle; no link between them |

- [ ] **Step 4: Write `wiki/wiki-audit-report.md`**

Create `wiki/wiki-audit-report.md` with this structure (fill in all findings):

```markdown
# Wiki Audit Report
Generated: 2026-03-20
Repos scanned: server-src, client-src, client-bin, server

## Accuracy Issues
| Wiki Page | Incorrect Statement | Correct Value |
|---|---|---|

## Missing Wiki Coverage
| File/Class/Function | Where Found | Suggested Wiki Page |
|---|---|---|

## Outdated References
| Wiki Page | Outdated Reference | Status in Repo |
|---|---|---|

## New Cross-Link Opportunities
| Source Page | Target Page | Why Link is Useful |
|---|---|---|

## Statistics
- Total files scanned: X
- Wiki pages checked: X
- Issues found: X
```

- [ ] **Step 5: Commit (with rebase guard)**

```bash
git pull --rebase origin claude/musing-mclaren
git add wiki/wiki-audit-report.md
git commit -m "feat(wiki): add exhaustive audit report — X issues found across 4 repos"
git push origin claude/musing-mclaren
```

If `git pull --rebase` fails (Task 5 pushed between pull and push), retry once:
```bash
git pull --rebase origin claude/musing-mclaren
git push origin claude/musing-mclaren
```
If it fails a second time, stop and surface the conflict.

- [ ] **Step 6: Display the audit report**

Print the full contents of `wiki/wiki-audit-report.md` to the user and **pause for confirmation** before proceeding to Task 4.

---

## Task 5: GitHub Pages Rebuild

> ⚠️ **Run this task in PARALLEL with Task 3.** No shared files.
>
> This task has two branch targets:
> - `calculators/items.html` + `calculators/mobs.html` → `gh-pages` branch
> - `scripts/build_icons.py` → `claude/musing-mclaren` branch

---

### Task 5A: Rewrite `calculators/items.html`

**Files:**
- Modify: `calculators/items.html` on `gh-pages` branch

- [ ] **Step 1: Check out the gh-pages branch to a temp location**

```bash
cd "D:\Git Repo\Metin2_Rework_v3"
git worktree add .claude/worktrees/gh-pages-work gh-pages
```

Work on `items.html` at: `D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\gh-pages-work\calculators\items.html`

- [ ] **Step 2: Update data URL constants**

Find and replace these two lines near the top of the `<script>` block:

```js
// OLD:
const ITEM_PROTO_URL  = 'https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/item_proto.txt';
const ITEMDESC_URL    = 'https://raw.githubusercontent.com/d1str4ught/m2dev-client/main/assets/locale/locale/en/itemdesc.txt';

// NEW:
const ITEM_PROTO_URL  = 'https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/item_proto.txt';
const ITEMDESC_URL    = 'https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/itemdesc.txt';
const ICON_BASE_URL   = 'https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/icons/';
```

- [ ] **Step 3: Add new state variables after existing state block**

Find the `// ── State ─────` section. After `let skipCount = 0;` add:

```js
// Pagination state
let currentPage = 1;
const PAGE_SIZE = 50;
// Detail panel cache — built lazily on first click
const detailCache = new Map();
// Search debounce timer
let searchTimer = null;
```

- [ ] **Step 4: Add Web Worker before `init()`**

Insert this block before the `async function init()` definition:

```js
// ── Web Worker (inline Blob URL — no separate file needed) ────────────────────
const WORKER_CODE = `
self.onmessage = function(e) {
  const lines = e.data.split('\\n');
  const result = [];
  let skipCount = 0;
  for (const line of lines) {
    if (!line.trim() || line.startsWith('#')) continue;
    const cols = line.split('\\t');
    if (cols.length < 12) { skipCount++; continue; }
    try {
      const item = {
        vnum:       parseInt(cols[0],  10),
        name:       cols[1]?.trim() || '',
        type:       parseInt(cols[2],  10) || 0,
        subtype:    parseInt(cols[3],  10) || 0,
        weight:     parseInt(cols[4],  10) || 0,
        size:       parseInt(cols[5],  10) || 0,
        antiflag:   parseInt(cols[6],  10) || 0,
        flag:       parseInt(cols[7],  10) || 0,
        wearflag:   parseInt(cols[8],  10) || 0,
        immuneflag: parseInt(cols[9],  10) || 0,
        gold:       parseInt(cols[10], 10) || 0,
        buy_price:  parseInt(cols[11], 10) || 0,
        limittype0: parseInt(cols[12], 10) || 0,
        limitval0:  parseInt(cols[13], 10) || 0,
        limittype1: parseInt(cols[14], 10) || 0,
        limitval1:  parseInt(cols[15], 10) || 0,
        applytype0: parseInt(cols[16], 10) || 0,
        applyval0:  parseInt(cols[17], 10) || 0,
        applytype1: parseInt(cols[18], 10) || 0,
        applyval1:  parseInt(cols[19], 10) || 0,
        applytype2: parseInt(cols[20], 10) || 0,
        applyval2:  parseInt(cols[21], 10) || 0,
        value0:     parseInt(cols[22], 10) || 0,
        value1:     parseInt(cols[23], 10) || 0,
        value2:     parseInt(cols[24], 10) || 0,
        value3:     parseInt(cols[25], 10) || 0,
        value4:     parseInt(cols[26], 10) || 0,
        value5:     parseInt(cols[27], 10) || 0,
        socket_pct: parseInt(cols[28], 10) || 0,
        addon_type: parseInt(cols[29], 10) || 0,
      };
      if (!isNaN(item.vnum) && item.vnum > 0) result.push(item);
      else skipCount++;
    } catch(err) { skipCount++; }
  }
  self.postMessage({ items: result, skipCount });
};
`;
const protoWorker = new Worker(URL.createObjectURL(
  new Blob([WORKER_CODE], { type: 'text/javascript' })
));
```

- [ ] **Step 5: Replace `init()` to use Worker**

Replace the existing `async function init()` with:

```js
async function init() {
  try {
    const [protoText, descText] = await Promise.all([
      fetch(ITEM_PROTO_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.text(); }),
      fetch(ITEMDESC_URL).then(r => r.ok ? r.text() : '').catch(() => '')
    ]);
    parseDesc(descText);
    // Offload heavy parsing to Worker — keeps UI responsive
    protoWorker.onmessage = function(e) {
      allItems = e.data.items;
      skipCount = e.data.skipCount;
      if (skipCount > 0) {
        document.getElementById('globalSkipNote').textContent =
          `${skipCount} lines skipped due to parse errors`;
      }
      document.getElementById('statusText').innerHTML =
        `Loaded <strong>${allItems.length}</strong> items — ` +
        `<a href="${ITEM_PROTO_URL}" target="_blank" class="load-link">item_proto.txt</a>`;
      buildTypeFilter();
      applyFilters();
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('tableWrap').style.display = 'block';
      const hashVnum = getHashVnum();
      if (hashVnum) setTimeout(() => expandRow(hashVnum), 100);
    };
    protoWorker.postMessage(protoText);
  } catch (e) {
    document.getElementById('spinner').style.display = 'none';
    const eb = document.getElementById('errorBox');
    eb.style.display = 'block';
    eb.innerHTML = `Failed to load item data.<br>` +
      `URL: <a href="${ITEM_PROTO_URL}" target="_blank">${ITEM_PROTO_URL}</a><br>` +
      `<small>${e}</small>`;
  }
}
```

- [ ] **Step 6: Replace `renderTable()` with paginated version**

Replace the existing `function renderTable()` with:

```js
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  detailCache.clear(); // Cache is per-page only

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  document.getElementById('statusText').innerHTML =
    `Showing <strong>${filtered.length}</strong> of <strong>${allItems.length}</strong> items — ` +
    `Page ${currentPage}/${totalPages} — ` +
    `<a href="${ITEM_PROTO_URL}" target="_blank" class="load-link">item_proto.txt</a>`;

  updatePagination(totalPages);

  for (const item of pageItems) {
    const typeLabel = ITEM_TYPES[item.type] ?? `Type ${item.type}`;
    const fallbackLetter = (typeLabel)[0] ?? '?';
    const iconUrl = ICON_BASE_URL + item.vnum + '.png';
    const firstStat = firstApply(item);

    // Main row
    const tr = document.createElement('tr');
    tr.dataset.vnum = item.vnum;
    tr.innerHTML = `
      <td class="icon-col">
        <img src="${iconUrl}" width="32" height="32" loading="lazy" alt=""
             onerror="this.outerHTML='<div class=\\'icon-fallback\\'>${escHtml(fallbackLetter)}</div>'">
      </td>
      <td class="vnum">${item.vnum}</td>
      <td class="name">${escHtml(item.name)}</td>
      <td class="type-col">${escHtml(typeLabel)}</td>
      <td class="price">${item.buy_price > 0 ? fmtNum(item.buy_price) + ' yang' : '—'}</td>
      <td class="stat-col">${firstStat}</td>
    `;
    tr.onclick = () => toggleDetail(item.vnum, tr);
    tbody.appendChild(tr);

    // Detail placeholder row — content built lazily on first click
    const dr = document.createElement('tr');
    dr.className = 'detail-row';
    dr.id = `detail-${item.vnum}`;
    tbody.appendChild(dr);
  }

  // Restore previously expanded row if it is on this page
  if (expandedVnum !== null) {
    const tr = tbody.querySelector(`tr[data-vnum="${expandedVnum}"]`);
    const dr = document.getElementById(`detail-${expandedVnum}`);
    if (tr && dr) {
      tr.classList.add('expanded');
      openDetailRow(dr, expandedVnum);
    } else {
      expandedVnum = null;
    }
  }
}
```

- [ ] **Step 7: Replace `toggleDetail()` with lazy-building version**

Replace the existing `function toggleDetail(vnum, tr)`:

```js
function toggleDetail(vnum, tr) {
  const dr = document.getElementById(`detail-${vnum}`);
  if (!dr) return;
  const isOpen = dr.classList.contains('open');

  document.querySelectorAll('.detail-row.open').forEach(r => r.classList.remove('open'));
  document.querySelectorAll('.data-table tbody tr.expanded').forEach(r => r.classList.remove('expanded'));

  if (!isOpen) {
    openDetailRow(dr, vnum);
    tr.classList.add('expanded');
    expandedVnum = vnum;
    history.replaceState(null, '', '#' + vnum);
  } else {
    expandedVnum = null;
    history.replaceState(null, '', location.pathname);
  }
}

function openDetailRow(dr, vnum) {
  // Build content only once per page render; reuse from cache if available
  if (!detailCache.has(vnum)) {
    const item = allItems.find(i => i.vnum === vnum);
    if (!item) return;

    const dtd = document.createElement('td');
    dtd.colSpan = 6; // 6 columns now (icon + vnum + name + type + price + stat)
    const inner = buildDetail(item);

    // Prepend 64×64 icon to the detail inner div
    const typeLabel = ITEM_TYPES[item.type] ?? `Type ${item.type}`;
    const fallbackLetter = (typeLabel)[0] ?? '?';
    const iconUrl = ICON_BASE_URL + item.vnum + '.png';
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = 'display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem;';
    iconDiv.innerHTML = `
      <img src="${iconUrl}" width="64" height="64" loading="lazy" alt=""
           style="border-radius:4px;"
           onerror="this.outerHTML='<div class=\\'icon-fallback\\'style=\\'width:64px;height:64px;font-size:1.2rem\\'>${escHtml(fallbackLetter)}</div>'">
    `;
    inner.prepend(iconDiv);
    dtd.appendChild(inner);
    detailCache.set(vnum, dtd);
    dr.appendChild(dtd);
  }
  dr.classList.add('open');
}
```

- [ ] **Step 8: Add pagination functions**

Add these functions after `renderTable()`:

```js
function updatePagination(totalPages) {
  const bar = document.getElementById('paginationBar');
  if (!bar) return;
  bar.querySelector('.pg-prev').disabled = currentPage <= 1;
  bar.querySelector('.pg-next').disabled = currentPage >= totalPages;
  bar.querySelector('.pg-label').textContent = `Page ${currentPage} of ${totalPages}`;

  const jump = bar.querySelector('.pg-jump');
  if (parseInt(jump.dataset.total || '0') !== totalPages) {
    jump.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `Page ${i}`;
      jump.appendChild(opt);
    }
    jump.dataset.total = totalPages;
  }
  jump.value = currentPage;
}

function goPage(delta) {
  currentPage += delta;
  renderTable();
  window.scrollTo(0, 0);
}

function jumpToPage(val) {
  currentPage = parseInt(val, 10);
  renderTable();
  window.scrollTo(0, 0);
}
```

- [ ] **Step 9: Add debounced search handler**

Find the `oninput` or event listener on `searchInput`. Replace or add:

```js
document.getElementById('searchInput').addEventListener('input', function() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { currentPage = 1; applyFilters(); }, 300);
});
```

Remove any existing direct `oninput="applyFilters()"` on the search input in the HTML. Also update `applyFilters()` to reset page when called from filter/sort buttons (add `currentPage = 1;` at the start of `applyFilters()`).

- [ ] **Step 10: Add pagination bar HTML**

In the HTML, immediately after the `<div class="data-table-wrap">` closing tag (after `</div>`), add:

```html
<div class="pagination-bar" id="paginationBar">
  <button class="pg-prev" onclick="goPage(-1)">← Prev</button>
  <span class="pg-label">Page 1 of 1</span>
  <button class="pg-next" onclick="goPage(1)">Next →</button>
  <select class="pg-jump" onchange="jumpToPage(this.value)" title="Jump to page"></select>
</div>
```

- [ ] **Step 11: Add CSS for icon column, icon fallback, and pagination bar**

In the `<style>` block, add:

```css
/* Icon column */
.icon-col { width: 44px; text-align: center; padding: .25rem .4rem; }
.icon-col img { display: block; margin: auto; border-radius: 2px; }
.icon-fallback {
  width: 32px; height: 32px; display: flex; align-items: center;
  justify-content: center; background: var(--surface-alt);
  border: 1px solid var(--border); border-radius: 2px;
  font-size: .72rem; font-weight: 700; color: var(--text-muted); margin: auto;
}

/* Pagination bar */
.pagination-bar {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .6rem 0; border-top: 1px solid var(--border); margin-top: .25rem;
}
.pagination-bar button { min-width: 80px; }
.pagination-bar button:disabled { opacity: .4; cursor: not-allowed; }
.pagination-bar .pg-label { font-size: .82rem; color: var(--text-muted); }
.pagination-bar select.pg-jump { min-width: 110px; }
```

- [ ] **Step 12: Update table header to include icon column**

Find the `<thead>` row in the HTML. Add `<th>Icon</th>` as the **first** `<th>`:

```html
<thead>
  <tr>
    <th style="width:44px">Icon</th>
    <th data-col="vnum" ...>VNUM ...</th>
    <!-- ... rest unchanged ... -->
  </tr>
</thead>
```

- [ ] **Step 13: Update `detail-row td` colSpan in CSS if set as attribute**

Search for `colSpan = 5` in the existing `renderTable()` or `buildDetail()` code. It has been replaced with `colSpan = 6` in the new `openDetailRow()`. Confirm no remaining hardcoded `5` references remain for detail rows.

- [ ] **Step 14: Verify the page works in a browser**

Open `items.html` locally (file:// works for testing layout; network requests need a server). Key checks:
- Page loads without hang ✓
- "Loading item database…" spinner shows ✓
- After parsing: 50 rows visible, pagination bar shows ✓
- Typing in search box: results update after ~300ms delay ✓
- Clicking a row: detail panel expands (not pre-built) ✓
- Clicking same row again: instant (cached) ✓
- Prev/Next buttons navigate between pages ✓
- Jump dropdown lists all page numbers ✓
- Icon cells show either image or fallback letter ✓

---

### Task 5B: Rewrite `calculators/mobs.html`

**Files:**
- Modify: `calculators/mobs.html` on `gh-pages` branch

Apply the same performance changes as items.html. Mobs do not have icons — skip Steps 2 (ICON_BASE_URL), 11 (icon CSS), 12 (icon column), and the icon-related parts of Steps 6/7/13.

Specific changes:

- [ ] **Step 1: Update data URL constant**

```js
// OLD:
const MOB_PROTO_URL = 'https://raw.githubusercontent.com/d1str4ught/m2dev-server/main/share/conf/mob_proto.txt';
// NEW:
const MOB_PROTO_URL = 'https://raw.githubusercontent.com/M2tecDev/Metin2_Rework_v3/main/data/mob_proto.txt';
```

- [ ] **Step 2: Add state variables, Worker, init, renderTable, pagination — same pattern as items.html**

Worker parses the `mob_proto.txt` format into an array using the existing `parseMobs()` field extraction logic (move the field extraction code inside the Worker).

Worker output: `{ mobs: parsedArray, skipCount: N }`. Main thread: `allMobs = e.data.mobs`.

Table has 5 columns (no icon column). `colSpan` for detail rows = 5.

- [ ] **Step 3: Verify mobs.html in browser** — same checklist as items.html (minus icon checks).

---

### Task 5C: Commit gh-pages changes

- [ ] **Step 1: Stage and commit to gh-pages**

Working in the `gh-pages-work` worktree:

```bash
cd "D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\gh-pages-work"
git add calculators/items.html calculators/mobs.html
git commit -m "feat: rebuild items/mobs pages — pagination, Web Worker, icons, parent-repo data URLs"
git push origin gh-pages
```

- [ ] **Step 2: Remove the temporary worktree**

```bash
cd "D:\Git Repo\Metin2_Rework_v3"
git worktree remove .claude/worktrees/gh-pages-work
```

---

### Task 5D: Create `scripts/build_icons.py`

**Files:**
- Create: `scripts/build_icons.py` on `claude/musing-mclaren`

Working directory: `D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren`

- [ ] **Step 1: Create the `scripts/` directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create `scripts/build_icons.py`**

```python
#!/usr/bin/env python3
"""
build_icons.py — Extract item icons from Metin2 client assets.

Reads data/item_scripts/**/*.txt, maps IconImageFileName paths from
"d:/ymir work/" → client-bin/assets/, and writes data/icons/<vnum>.png.

Approach A: If a .png already exists at the mapped path, copy it directly.
Approach B: Parse the .sub file to get atlas crop coords, crop with Pillow.

Run from repo root: python scripts/build_icons.py
Requires: Pillow (pip install Pillow)
"""
import os
import re
import shutil
from pathlib import Path

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    print("WARNING: Pillow not installed — Approach B (atlas crop) disabled")

REPO_ROOT        = Path(__file__).resolve().parent.parent
ITEM_SCRIPTS_DIR = REPO_ROOT / 'data' / 'item_scripts'
CLIENT_ASSETS    = REPO_ROOT / 'client-bin' / 'assets'
ICONS_OUT        = REPO_ROOT / 'data' / 'icons'
YMIR_PREFIX      = 'd:/ymir work/'

generated = 0
skipped   = 0


def map_path(raw: str) -> Path:
    """Map 'd:/ymir work/...' to client-bin/assets/..."""
    norm = raw.replace('\\', '/').lower().strip()
    if norm.startswith(YMIR_PREFIX):
        rel = norm[len(YMIR_PREFIX):]
        return CLIENT_ASSETS / rel
    # Fallback: treat as relative to CLIENT_ASSETS
    return CLIENT_ASSETS / raw.replace('\\', '/')


def extract_vnum(path: Path, content: str) -> int | None:
    """Explicit Vnum field first; fallback to first numeric run in filename."""
    for line in content.splitlines():
        m = re.match(r'^\s*Vnum\s+(\d+)', line, re.IGNORECASE)
        if m:
            return int(m.group(1))
    m = re.search(r'\d+', path.stem)
    return int(m.group()) if m else None


def extract_icon_path(content: str) -> str | None:
    """Extract IconImageFileName value, stripping quotes."""
    for line in content.splitlines():
        m = re.match(r'^\s*IconImageFileName\s+"?([^"\n]+)"?', line, re.IGNORECASE)
        if m:
            return m.group(1).strip().strip('"')
    return None


def process(script: Path) -> None:
    global generated, skipped
    try:
        content = script.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        print(f'SKIP {script.name}: read error — {e}')
        skipped += 1
        return

    vnum = extract_vnum(script, content)
    if vnum is None:
        print(f'SKIP {script.name}: cannot determine vnum')
        skipped += 1
        return

    icon_str = extract_icon_path(content)
    if icon_str is None:
        print(f'SKIP vnum={vnum}: no IconImageFileName in {script.name}')
        skipped += 1
        return

    asset_path = map_path(icon_str)

    # Approach A: a .png already exists
    png_path = asset_path.with_suffix('.png')
    if png_path.exists():
        ICONS_OUT.mkdir(parents=True, exist_ok=True)
        shutil.copy2(png_path, ICONS_OUT / f'{vnum}.png')
        generated += 1
        return

    # Approach B: crop from .sub → .tga atlas
    if not PILLOW_AVAILABLE:
        print(f'SKIP vnum={vnum}: Pillow unavailable for atlas crop')
        skipped += 1
        return

    sub_path = asset_path if asset_path.suffix.lower() == '.sub' \
               else asset_path.with_suffix('.sub')
    if not sub_path.exists():
        print(f'SKIP vnum={vnum}: .sub not found at {sub_path}')
        skipped += 1
        return

    try:
        lines = sub_path.read_text(encoding='utf-8', errors='replace').splitlines()
        if len(lines) < 2:
            print(f'SKIP vnum={vnum}: .sub has fewer than 2 lines')
            skipped += 1
            return

        atlas_path = map_path(lines[0].strip())
        parts = lines[1].strip().split()
        if len(parts) < 4:
            print(f'SKIP vnum={vnum}: .sub line 2 has fewer than 4 values')
            skipped += 1
            return

        sx, sy, sw, sh = int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])

        if not atlas_path.exists():
            print(f'SKIP vnum={vnum}: atlas not found at {atlas_path}')
            skipped += 1
            return

        img     = Image.open(atlas_path)
        cropped = img.crop((sx, sy, sx + sw, sy + sh))
        ICONS_OUT.mkdir(parents=True, exist_ok=True)
        cropped.save(ICONS_OUT / f'{vnum}.png')
        generated += 1

    except Exception as e:
        print(f'SKIP vnum={vnum}: error — {e}')
        skipped += 1


def main() -> None:
    if not ITEM_SCRIPTS_DIR.exists():
        print(f'ERROR: {ITEM_SCRIPTS_DIR} does not exist.')
        print('Run the sync-data GitHub Action (or copy item scripts manually) first.')
        return

    scripts = sorted(ITEM_SCRIPTS_DIR.rglob('*.txt'))
    print(f'Processing {len(scripts)} item scripts...')
    for s in scripts:
        process(s)
    print(f'Generated: {generated} icons, Skipped: {skipped}')


if __name__ == '__main__':
    main()
```

- [ ] **Step 3: Smoke-test the script locally (if item_scripts exist)**

```bash
# Check if item_scripts were populated by Task 2A submodule init
ls data/item_scripts/ 2>/dev/null | head -5
```

If `data/item_scripts/` exists (it won't until the GitHub Action runs, but submodule init gives us access to the source):
```bash
# Quick dry-run test with one file
python3 -c "
from scripts.build_icons import extract_vnum, extract_icon_path
from pathlib import Path
content = 'Vnum 12345\nIconImageFileName \"d:/ymir work/ui/items/etc/test.sub\"'
print('vnum:', extract_vnum(Path('12345.txt'), content))
print('icon:', extract_icon_path(content))
"
```
Expected:
```
vnum: 12345
icon: d:/ymir work/ui/items/etc/test.sub
```

- [ ] **Step 4: Commit to claude/musing-mclaren (with rebase guard)**

```bash
cd "D:\Git Repo\Metin2_Rework_v3\.claude\worktrees\musing-mclaren"
git pull --rebase origin claude/musing-mclaren
git add scripts/build_icons.py
git commit -m "feat: add build_icons.py — extract item icons from sub/tga atlas for GitHub Pages"
git push origin claude/musing-mclaren
```

If rebase fails, retry once. If it fails again, surface to user.

---

## *** PAUSE ***

After both Task 3 and Task 5 complete:
1. Display the full contents of `wiki/wiki-audit-report.md`
2. Wait for user confirmation before starting Task 4
3. User may request changes to the audit report before approving

---

## Task 4: Cross-linking Pass

**Files:**
- Modify: all `wiki/*.md` files (70+)

**Important:** Read the full `wiki/wiki-audit-report.md` before starting. The audit report's "New Cross-Link Opportunities" table provides additional links beyond the priority table below.

### Linking rules (enforced for every file)

1. Link each target **once per page** — first occurrence of the trigger term only
2. **Bidirectional:** If you add A → B, check if B's content organically discusses A's topic. If yes, add B → A. If B doesn't discuss A's topic at all, skip the back-link. No forced back-links.
3. **Never remove or rewrite existing content.** Inline links preferred. Add "## See Also" block at the bottom only when there is no natural inline insertion point.
4. Priority links below are **unconditional** — apply to all pages regardless of audit findings.
5. Trigger matching: **case-insensitive, whole-word**, in prose and inline code (`` `vnum` `` counts). Do **not** match inside fenced code blocks (` ``` `).
6. Target identifiers = filenames without `.md` in the `wiki/` directory (lowercase kebab-case). e.g., `concept-vnum` = `wiki/concept-vnum.md`.
7. Each trigger row is independent. A page mentioning both `vnum` and `item_proto` gets both trigger rows applied separately.

### Priority cross-link table

| Trigger (case-insensitive, whole-word) | Links to insert on first match |
|---|---|
| `packet` / `CG_*` / `GC_*` | `[topic-Game-Client-Protocol](topic-Game-Client-Protocol)`, `[blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol)` |
| `item_proto` / `mob_proto` | `[topic-Item-System](topic-Item-System)`, `[guide-Database-Proto](guide-Database-Proto)`, `[Item Database](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/items.html)` |
| `quest` / `Lua scripting` | `[topic-Quest-System](topic-Quest-System)`, `[blueprint-Quest-System](blueprint-Quest-System)` |
| `sectree` / `spatial partitioning` | `[concept-sectree](concept-sectree)` |
| `vnum` | `[concept-vnum](concept-vnum)` |
| `CHARACTER class` / `char.cpp` | `[topic-Character-System](topic-Character-System)`, `[blueprint-Character-System](blueprint-Character-System)` |
| `Python` / `UI scripting` | `[topic-UI-Python-System](topic-UI-Python-System)`, `[blueprint-UI-Python-System](blueprint-UI-Python-System)` |
| `server startup` / `game.conf` / `db.conf` | `[start-server-setup](start-server-setup)` |

### Mandatory factual additions (6 specific files)

These files need new content (not just links) referencing the `server/` submodule paths:

| File | Content to add |
|---|---|
| `wiki/guide-Database-Proto.md` | Note that `item_proto.txt` and `mob_proto.txt` are located at `server/share/conf/` in the runtime server submodule |
| `wiki/guide-NPC-and-Spawning.md` | Note that regen/spawn files are in `server/share/` |
| `wiki/topic-Quest-System.md` | Note that quest Lua files are in `server/share/locale/english/quest/` |
| `wiki/blueprint-Quest-System.md` | Same as above |
| `wiki/guide-Build-Environment.md` | Note that the compiled binary (`game`, `db`) goes to `server/share/bin/` |
| Any page mentioning `game.conf` or `db.conf` | Add: these files are at `server/share/conf/` |

- [ ] **Step 1: Process all 70+ wiki files**

For each `.md` file in `wiki/`:
1. Read the file
2. Apply the priority cross-link table (first occurrence, prose + inline code only)
3. Apply any matching entries from `wiki/wiki-audit-report.md` "New Cross-Link Opportunities"
4. Apply mandatory factual additions for the 6 specific files
5. Write the file back

- [ ] **Step 2: Verify no content was removed**

```bash
git diff wiki/ | grep "^-" | grep -v "^---" | head -20
```
Inspect the output. Every `-` line should be a line that was replaced by a `+` line with a link added — not a deletion of content.

- [ ] **Step 3: Output change summary**

Print: "Cross-linking complete — X files modified, Y links added"
List each modified file and the links added to it.

- [ ] **Step 4: Commit**

```bash
git add wiki/
git commit -m "feat(wiki): cross-linking pass — add priority links, audit-report additions, server/ paths"
```

---

## Final: Create PR

- [ ] **Step 1: Push the branch**

```bash
git push origin claude/musing-mclaren
```

- [ ] **Step 2: Create the PR**

```bash
gh pr create \
  --base master \
  --head claude/musing-mclaren \
  --title "feat: cleanup, data sync, wiki audit & gh-pages overhaul" \
  --body "$(cat <<'EOF'
## Summary
- Removes accidental `docs/superpowers/` from master
- Adds `.github/workflows/sync-data.yml` to sync proto/desc/icon data from submodules daily
- Adds `scripts/build_icons.py` to extract item icons from client assets
- Adds `wiki/wiki-audit-report.md` — exhaustive scan of all 4 submodules
- Cross-links 70+ wiki pages with priority links + audit-report findings + server/ path refs

## Notes
- `calculators/items.html` and `calculators/mobs.html` changes are already live on `gh-pages`
- `/data/` directory will be populated on first Action run after merge

## Test plan
- [ ] Verify `docs/superpowers/` absent from master after merge
- [ ] Trigger `sync-data` workflow manually via `workflow_dispatch` and confirm `/data/` is populated
- [ ] Open items.html and mobs.html — confirm no browser hang, pagination works
- [ ] Confirm icon column shows images or fallback letters
- [ ] Spot-check 5 wiki pages for correct cross-links

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Confirm PR URL is returned and share with user**
