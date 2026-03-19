# client-bin root — Settings & Runtime Support

> Player character setup, mouse controller, developer console, runtime bootstrap, and emote tables.

## Overview

These five modules handle three distinct concerns. `playersettingmodule.py` is the largest: it defines race/job constants, skill index tables, and calls `chrmgr`/`effect`/`emotion` to register all character motions, effects, and in-world emoticons at startup. `mousemodule.py` provides the drag-and-drop cursor layer via `CMouseController`, which tracks an "attached" item icon and renders it under the pointer. `consolemodule.py` implements the developer console: a `Console` backend with 50+ commands and a `ConsoleWindow` UI frontend. `system.py` is the Python bootstrap script that runs before anything else: it wires stdout/stderr to `dbg`, installs the pack-file `open()` override and the `custom_import_hook`, then calls `RunMainScript("prototype.py")`. `emotion.py` declares emote IDs, icon paths, and animation filenames in version-guarded tables and provides helpers to register them with `chrmgr` and `player`.

---

## Module: playersettingmodule.py

**Purpose:** Declares race and job constants, defines skill index tables for all four jobs, and registers all character motions, cached effects, fly-data, weapon refinement effects, in-world emoticons, item sounds, and spawn effects by calling into `chrmgr`, `effect`, `net`, and `item`.

### Module-Level Constants

| Name | Value | Description |
|------|-------|-------------|
| `JOB_WARRIOR` / `JOB_ASSASSIN` / `JOB_SURA` / `JOB_SHAMAN` | `0` / `1` / `2` / `3` | Job index constants |
| `RACE_WARRIOR_M` / `RACE_WARRIOR_W` | `0` / `4` | Warrior male/female race IDs |
| `RACE_ASSASSIN_W` / `RACE_ASSASSIN_M` | `1` / `5` | Assassin female/male race IDs |
| `RACE_SURA_M` / `RACE_SURA_W` | `2` / `6` | Sura male/female race IDs |
| `RACE_SHAMAN_W` / `RACE_SHAMAN_M` | `3` / `7` | Shaman female/male race IDs |
| `COMBO_TYPE_1/2/3` | `0` / `1` / `2` | Combo chain type indices |
| `COMBO_INDEX_1` … `COMBO_INDEX_6` | `0` … `5` | Combo step slot indices |
| `HORSE_SKILL_WILDATTACK/CHARGE/SPLASH` | `chr.MOTION_SKILL+121/122/123` | Horse skill motion IDs |
| `GUILD_SKILL_DRAGONBLOOD` … `GUILD_SKILL_MAGICUP` | `chr.MOTION_SKILL+101` … `+106` | Guild skill motion IDs |
| `PASSIVE_GUILD_SKILL_INDEX_LIST` | `(151,)` | Passive guild skill VNUMs |
| `ACTIVE_GUILD_SKILL_INDEX_LIST` | `(152, 153, 154, 155, 156, 157)` | Active guild skill VNUMs |
| `NEW_678TH_SKILL_ENABLE` | `0` | Enables optional 6th–8th skills per skill group |
| `SKILL_INDEX_DICT` | list (populated by `DefineSkillIndexDict`) | Job → group → skill index tuples |
| `FACE_IMAGE_DICT` | dict | Race ID → face icon `.sub` path used by UI |
| `isInitData` | `0` | Guard flag preventing `__InitData()` from running twice |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `DefineSkillIndexDict()` | — | None | Builds `SKILL_INDEX_DICT` for all four jobs; also adds group 0 (horse-only) entries |
| `RegisterSkill(race, group, empire)` | int, int, int | None | Calls `DefineSkillIndexDict()`, then registers active skills, support skills, language skills, and guild skills with `player.SetSkill()` |
| `RegisterSkillAt(race, group, pos, num)` | int, int, int, int | None | Overrides a single position in a job's skill list and calls `player.SetSkill()` |
| `SetGeneralMotions(mode, folder)` | int, string | None | Registers the standard locomotion/damage/death motions (`wait`, `walk`, `run`, `damage`, etc.) for a given motion mode and path |
| `SetIntroMotions(mode, folder)` | int, string | None | Registers the three intro motions (`INTRO_WAIT`, `INTRO_SELECTED`, `INTRO_NOT_SELECTED`) used on the character select screen |
| `__InitData()` | — | None | One-shot initialiser: sets dust/horse-dust gaps, registers all cached effects (`EFFECT_DUST`, `EFFECT_HIT`, `EFFECT_LEVELUP`, `EFFECT_SKILLUP`, `EFFECT_EMPIRE`, `EFFECT_REFINED`, `EFFECT_AFFECT` 0–37, `EFFECT_EMOTICON` 0–11, etc.), and all `FLY_*` indexed fly data; then creates and initialises intro motions for all 8 races |
| `__LoadGameSound()` | — | None | Registers use/drop sound filenames for each item category via `item.SetUseSoundFileName` / `item.SetDropSoundFileName` |
| `__LoadGameEffect()` | — | None | Registers game-phase effects: spawn appear/disappear, elemental attack/hit/attach, level-up, weapon refinement glow (grades 7–9), per-affect loops, and fly data |
| `__LoadGameWarrior/Assassin/Sura/Shaman()` | — | None | Delegates to `__LoadGame*Ex(race, path)` for each gender variant |
| `__LoadGameWarriorEx(race, path)` | int, string | None | Registers all combat motion modes (GENERAL, ONEHAND_SWORD, TWOHAND_SWORD) plus combo chains for a warrior race |

---

## Module: mousemodule.py

**Purpose:** Manages the software cursor image and the drag-and-drop item attachment system. `CursorImage` wraps a single `grpImage` handle. `CMouseController` tracks which item/skill/emotion is "attached" to the cursor and renders the translucent icon at the cursor position.

### Class: `CursorImage`

**Purpose:** Thin wrapper around `grpImage.Generate()` for software cursor sprites.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, imageName)` | string | None | Calls `LoadImage(imageName)` |
| `__del__(self)` | — | None | Calls `grpImage.Delete(self.handle)` if valid (MR-10 fix) |
| `LoadImage(self, imageName)` | string | None | Calls `grpImage.Generate(imageName)`; logs error and sets handle to 0 on failure |
| `DeleteImage(self)` | — | None | Deletes the image handle |
| `IsImage(self)` | — | bool | Returns True if handle is non-zero |
| `SetPosition(self, x, y)` | int, int | None | Moves the image to the given screen coordinates |
| `Render(self)` | — | None | Renders the cursor image at its current position |

### Class: `CMouseController`

**Purpose:** Singleton cursor controller. Maintains 15 cursor type → image mappings and the attached-object drag state.

#### Instance Variables

| Name | Type | Description |
|------|------|-------------|
| `IsSoftwareCursor` | bool | True when using software-rendered cursor |
| `cursorDict` | dict | `app.*` cursor constant → `CursorImage` |
| `cursorPosDict` | dict | `app.*` cursor constant → `(offsetX, offsetY)` |
| `AttachedFlag` | bool | Whether an object is currently attached |
| `AttachedOwner` | object | The UI window that initiated the drag |
| `AttachedType` | int | `player.SLOT_TYPE_*` constant |
| `AttachedSlotNumber` | int | Source slot index |
| `AttachedItemIndex` | int | Item/skill VNUM |
| `AttachedCount` | int | Stack count being dragged |
| `AttachedIconHandle` | int | `grpImage` handle for the dragged icon |
| `AttachedIconHalfWidth/Height` | int | Half-dimensions used to centre icon under cursor |
| `LastAttachedSlotNumber` | int | Slot number of the previous attachment |
| `countNumberLine` | `ui.NumberLine` | Floating count label shown when count > 1 |
| `callbackDict` | dict | Type → callback function registered by the drag consumer |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Create(self)` | — | bool | Reads `systemSetting.IsSoftwareCursor()`, builds `cursorDict`/`cursorPosDict`, sets NORMAL cursor, creates `countNumberLine` |
| `ChangeCursor(self, cursorNum)` | int | None | Switches the active cursor image; falls back to NORMAL on missing key |
| `AttachObject(self, Owner, Type, SlotNumber, ItemIndex, count)` | object, int, int, int, int | None | Resolves icon handle for inventory/shop/skill/emotion slot types; calls `wndMgr.AttachIcon()`; shows count label when count > 1 |
| `AttachMoney(self, owner, type, count)` | object, int, int | None | Attaches a yang money icon (`icon/item/money.tga`); slot number set to -1 |
| `DeattachObject(self)` | — | None | Releases icon handle (dispatching to `item`/`skill`/`grpImage` based on type), clears all attachment state, hides count label |
| `isAttached(self)` | — | bool | Returns `AttachedFlag` |
| `IsAttachedMoney(self)` | — | bool | Returns True if attached item is `player.ITEM_MONEY` |
| `GetAttachedMoneyAmount(self)` | — | int | Returns count if money is attached; 0 otherwise |
| `GetAttachedOwner(self)` | — | object | Returns `AttachedOwner` or 0 if nothing attached |
| `GetAttachedType(self)` | — | int | Returns `AttachedType` or `player.SLOT_TYPE_NONE` |
| `GetAttachedSlotNumber(self)` | — | int | Returns `AttachedSlotNumber` or 0 |
| `GetLastAttachedSlotNumber(self)` | — | int | Returns `LastAttachedSlotNumber` |
| `GetAttachedItemIndex(self)` | — | int | Returns `AttachedItemIndex` or 0 |
| `GetAttachedItemCount(self)` | — | int | Returns `AttachedCount` or 0 |
| `Update(self, x, y)` | int, int | None | Stores cursor position; moves attached icon and count label to follow cursor; updates software cursor image position |
| `Render(self)` | — | None | Renders attached icon at 50 % alpha; renders software cursor image when visible or when liar-cursor mode is on |
| `SetCallBack(self, type, event)` | int, callable | None | Registers a callback for a given drag-drop event type |
| `RunCallBack(self, type, *arg)` | int, ... | None | Fires the callback for `type`; detaches if type not registered |
| `ClearCallBack(self)` | — | None | Clears all registered callbacks |

### Module-Level Singleton

| Name | Description |
|------|-------------|
| `mouseController` | `CMouseController()` instance created at import time |

---

## Module: consolemodule.py

**Purpose:** Implements the developer console. `Console` is a pure-logic backend with 50+ registered commands. `ConsoleWindow` is the `ui.Window` frontend with a drag-resize button, edit line, and scrolling text history.

### Class: `Console`

**Purpose:** Command backend. Holds a reference to a `ConsoleWindow` output target, a current filesystem path, and implements each console command as a named method.

#### Instance Variables

| Name | Type | Description |
|------|------|-------------|
| `output` | `ConsoleWindow` | Target for `Print()` calls |
| `curPathName` | string | Current filesystem browse path (default `D:\Ymir Work\`) |
| `dirNameList` / `fileNameList` | list | Cached directory and file names at `curPathName` |
| `bgPartDict` | dict | Background part name → `background.PART_*` constant |
| `bgSortDict` | dict | Sort mode name → `background.*_SORT` constant |
| `game` | object | Bound `GameWindow` instance (set by `BindGameClass`) |

#### Selected Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `BindGameClass(self, game)` | `GameWindow` | None | Stores reference for commands that need game-window access |
| `Close(self)` | — | None | Sets output to 0 |
| `Print(self, msg)` | string | None | Forwards to `self.output.Print(msg)` |
| `Exit(self)` | — | None | Calls `app.Exit()` |
| `ReloadLocale(self)` | — | None | Calls `app.ReloadLocale()`; prints result |
| `ReloadDevel(self)` | — | None | Hot-reloads `uiGuild` and `uiInventory` modules |
| `ShowPerformanceInfo(self)` | — | None | Prints actor/item/effect/texttail counts from `app.GetInfo()` |
| `Disconnect(self)` | — | None | Sends unknown packet via `net.SendStrangePacket()` |
| `SetMusicVolume(self, arg)` | string | None | Sets BGM volume 0–1.0 via `snd.SetMusicVolume()` |
| `SetSoundVolume(self, arg)` | string | None | Sets sound effect volume 0–1.0 |
| `SetShadowLevel(self, arg)` | string | None | Sets shadow level 0–5 via `background.SetShadowLevel()` |
| `SelectViewDistanceNum(self, arg)` | string | None | Sets view distance preset 0–4 |
| `SetBGLoading(self, bBGLoading)` | string | None | Enables/disables background streaming loading |
| `WarpTest(self, warpX, warpY)` | string, string | None | Debug warp: destroys/reinitialises background at given coordinates |
| `SetCollision(self, *mode)` | string | None | Toggles or sets collision object visibility |
| `SetCameraSpeed(self, percentage)` | string | None | Sets camera speed via `app.SetCameraSpeed()` |
| `ShowUI(self) / HideUI(self)` | — | None | Shows/hides all default game windows and chat |
| `SetPath(self, newPathName)` | string | None | Changes console browse path; populates `dirNameList`/`fileNameList` |
| `MoveParentPath(self)` | — | None | Navigates to the parent directory |
| `MoveChildPath(self, directory)` | string | None | Navigates into a child directory by name or index |
| `ShowList(self)` | — | None | Prints directory and file listings |
| `SetEmpireLanguageMode(self, mode)` | string | None | Sets empire language translation mode via `net` |
| `ToggleDebugInfo(self)` | — | None | Toggles game debug info overlay via `net.ToggleGameDebugInfo()` |
| `SetComboType(self, type)` | string | None | Sets the active combo type for test purposes |

### Class: `ConsoleWindow`

**Inherits:** `ui.Window`
**Purpose:** The visible developer console UI. Contains a draggable resize button, an `EditLine` for command input, and a scrolling list of text lines.

#### Class Constants

| Name | Value | Description |
|------|-------|-------------|
| `BACK_GROUND_COLOR` | `(0, 0, 0, 0.5)` | Semi-transparent black background |
| `HEIGHT` | `200` | Default height in pixels |
| `LINE_STEP` | `15` | Vertical spacing between log lines |
| `MAX_LINE_COUNT` | `50` | Maximum stored log lines |

#### Inner Classes

- `ConsoleEditLine(ui.EditLine)` — Fires `eventReturn` on Enter/IME-return, `eventEscape` on Escape; clears text after each submission.
- `ResizingButton(ui.DragButton)` — Drag button constrained to x-axis; moving it calls `UpdatePosition()` to resize the console.

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Creates `Console(self)`, `ResizingButton`, `ConsoleEditLine`; binds move/return/escape events; calls `InitFunction()` |
| `BindGameClass(self, game)` | `GameWindow` | None | Forwards to `self.Console.BindGameClass(game)` |
| `OpenWindow(self)` | — | None | Sets edit focus, shows window, refreshes path |
| `CloseWindow(self)` | — | None | Hides the window |
| `ProcessCommand(self, text)` | string | None | If text starts with `/`, sends as chat via `net.SendChatPacket()`; otherwise tokenizes and dispatches to `functionDict` |
| `InitFunction(self)` | — | None | Registers all command name → `Console.*` method bindings in `functionDict` |
| `AddFunction(self, name, fn)` | string, method | None | Adds an entry to `functionDict` |
| `Print(self, msg)` | string | None | Prepends a `TextLine` to the log; removes oldest when `MAX_LINE_COUNT` exceeded; calls `UpdatePosition()` |
| `UpdatePosition(self)` | — | None | Recalculates window/button/edit-line sizes and repositions all log `TextLine` objects |
| `OnRender(self)` | — | None | Draws semi-transparent background bar, edit-line background, and resize button background |

#### Registered Console Commands (command alias → Console method)

| Alias | Method | Description |
|-------|--------|-------------|
| `exit` | `Exit` | Exit the application |
| `mvol` | `SetMusicVolume` | BGM volume |
| `svol` | `SetSoundVolume` | SFX volume |
| `shadow` | `SetShadowLevel` | Shadow level 0–5 |
| `distance` | `SelectViewDistanceNum` | View distance 0–4 |
| `collision`/`colli` | `SetCollision` | Collision visibility toggle |
| `cd` / `up` | `MoveChildPath` / `MoveParentPath` | Filesystem navigation |
| `ls` / `lsd` / `lsf` / `lse` | `ShowList` / `ShowDirList` / `ShowFileList` / `ShowEffectList` | Directory listing |
| `disconnect` | `Disconnect` | Force disconnect |
| `debuginfo` | `ToggleDebugInfo` | Debug overlay toggle |
| `wtt` / `wtm` | `SetWeaponTraceTexture` / `SetWeaponTraceMode` | Sword afterimage settings |
| `dirline` | `ToggleActorDirectionLine` | Actor direction debug line |
| `pickc` / `infoc` | `ShowPickedCharacterInfo` / `ShowCharacterInfo` | VID info |
| `stune` / `duste` / `hite` | Effect setters | Stun/dust/hit effect override |
| `autorot` | `SetAutoCameraRotationSpeed` | Camera auto-rotation speed |
| `cspd` | `SetCameraSpeed` | Camera speed percentage |

---

## Module: system.py

**Purpose:** Python runtime bootstrap. Executed first by the C++ host. Redirects stdout/stderr to `dbg`, installs the pack-file virtual filesystem, registers the `custom_import_hook`, and launches `prototype.py`.

### Module-Level Classes

#### `TraceFile`
Wraps `dbg.Trace(msg)` as `sys.stdout`; `flush()` is a no-op. Installed at module top level: `sys.stdout = TraceFile()`.

#### `TraceErrorFile`
Wraps `dbg.TraceError(msg)` and `dbg.RegisterExceptionString(msg)` as `sys.stderr`; installed at module top level.

#### `LogBoxFile`
Accumulates stderr text in `self.msg` during an exception context; calls `dbg.LogBox(self.msg, "Error")` on `show()`. Restores the saved stderr reference on `__del__`.

#### `pack_file`

**Purpose:** File-like object backed by pack data; returned by the overridden `open()`.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, filename, mode)` | string, `'r'`/`'rb'` | None | Calls `pack.Get(filename)`; decodes text with `_decode_pack_text()` if mode is `'r'` |
| `read(self, length)` | int | bytes/str | Reads up to `length` bytes; reads all if `length` is None |
| `readline(self)` | — | bytes/str | Reads until next newline |
| `readlines(self)` | — | list | Returns list of all lines via iterator |
| `__iter__(self)` | — | iterator | Returns `pack_file_iterator` |

#### `custom_import_hook`

**Purpose:** PEP 451 meta path finder and loader that resolves `.py` files from the pack instead of the filesystem.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `find_spec(self, fullname, path, target)` | string, ... | `ModuleSpec` or None | Returns a spec if `fullname + ".py"` exists in the pack |
| `create_module(self, spec)` | spec | None | Returns None (uses default `ModuleType` creation) |
| `exec_module(self, module)` | module | None | Calls `execfile(filename, module.__dict__)` for the pack source |
| `find_module(self, name, path)` | string, ... | self or None | Legacy hook: returns self if file is in pack |
| `load_module(self, name)` | string | module | Legacy hook: creates `ModuleType`, calls `exec_module`, inserts into `sys.modules` |

#### `PythonExecutioner`

**Purpose:** Executes `.py` or `.pyc`/`.pyo` files from the pack.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Run(self, sFileName, kDict)` | string, dict | None | Detects compiled vs text; calls `__LoadCompiledFile__` or `__LoadTextFile__`; execs in `kDict` |
| `__IsCompiledFile__(self, sFileName)` | string | bool | Returns True if extension is `.pyc` or `.pyo` |
| `__LoadTextFile__(self, sFileName)` | string | code | Opens via `pack_open`; compiles source string |
| `__LoadCompiledFile__(self, sFileName)` | string | code | Reads `.pyc`; validates `MAGIC_NUMBER`; unmarshals bytecode |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `_extract_source_encoding(data)` | bytes | string or None | Scans first two lines for a PEP 263 encoding declaration |
| `_decode_pack_text(data)` | bytes | string | Tries source encoding, then `utf-8-sig`, `cp949`, `latin-1` in order |
| `splitext(p)` | string | (root, ext) | Splits a path into base and extension; handles `/` separators |
| `execfile(fileName, dict)` | string, dict | None | Creates `PythonExecutioner` and calls `Run(fileName, dict)`; installed as `builtins.execfile` |
| `exec_add_module_do(mod)` | module | None | Injects `execfile` into each imported module's namespace |
| `GetExceptionString(excTitle)` | string | string | Formats a full traceback + exception message string |
| `ShowException(excTitle)` | string | int | Logs via `dbg.TraceError`, calls `app.Abort()`; returns 0 |
| `RunMainScript(name)` | string | None | Reads and execs a pack file in `__main__.__dict__`; calls `dbg.LogBox` + `app.Abort()` on error |

### Module-Level Setup (executed at import time)

1. `sys.stdout = TraceFile()` and `sys.stderr = TraceErrorFile()`
2. `builtins.pack_open = pack_file` — exposes pack-aware file open globally
3. `builtins.open` overridden to transparently serve pack files for `'r'`/`'rb'` mode
4. `meta_hook = custom_import_hook()` inserted at position 0 of `sys.meta_path`
5. `module_do = exec_add_module_do` — injects `execfile` into each loaded module
6. `debugInfo.SetDebugMode(__DEBUG__)` — applies the compile-time debug flag
7. `RunMainScript("prototype.py")` — launches the game

---

## Module: emotion.py

**Purpose:** Declares emote ID constants, icon image paths, animation filenames, and locale-aware display name tables. Provides helpers to register animations and icons with `chrmgr` and `player`.

### Module-Level Constants

| Name | Value | Description |
|------|-------|-------------|
| `EMOTION_VERSION` | `2` | Active emote set version (1 = reduced set; 2 = full set) |
| `EMOTION_CLAP` … `EMOTION_JOY` | `1`–`10` | Single-player emote IDs (version 2) |
| `EMOTION_CHEERS_1` / `CHEERS_2` | `11` / `12` | Cheers emote IDs |
| `EMOTION_DANCE_1` … `DANCE_6` | `13`–`18` | Dance emote IDs |
| `EMOTION_KISS` / `EMOTION_FRENCH_KISS` / `EMOTION_SLAP` | `51` / `52` / `53` | Paired emote IDs |

### Module-Level Data Structures

| Name | Type | Description |
|------|------|-------------|
| `EMOTION_DICT` | `{int: {"name": str, "command": str}}` | Emote ID → locale display name + slash command; rebuilt by `_RebuildLocaleStrings()` |
| `ICON_DICT` | `{int: string}` | Emote ID → icon image path |
| `ANI_DICT` | `{chr.MOTION_*: string}` | Motion constant → `.msa` animation filename relative to the character's action path |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `_RebuildLocaleStrings()` | — | None | Rebuilds `EMOTION_DICT` using `localeInfo.*` string globals; version-specific subsets; called at import and registered as a locale reload callback |
| `RegisterEmotionAnis(path)` | string | None | Calls `__RegisterSharedEmotionAnis()` for `MOTION_MODE_GENERAL` and `MOTION_MODE_WEDDING_DRESS`; also registers wedding wait/walk/run motions |
| `RegisterEmotionIcons()` | — | None | Iterates `ICON_DICT` and calls `player.RegisterEmotionIcon(key, val)` for each entry |
| `__RegisterSharedEmotionAnis(mode, path)` | int, string | None | Registers all entries in `ANI_DICT` for the given motion mode and base path |

### Locale Reload Integration

`emotion.py` calls `localeInfo.RegisterReloadCallback(_RebuildLocaleStrings)` at import time so `EMOTION_DICT` is refreshed whenever locale strings are hot-reloaded.
