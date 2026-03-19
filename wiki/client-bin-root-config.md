# client-bin root — Configuration

> Static configuration data: locale strings, game constants, UI colours, music filenames, and Dragon Soul refinement tables.

## Overview

These five scripts define the constants and data tables that the rest of the Python layer reads at startup and whenever a locale reload is triggered. `localeInfo.py` is the most critical — it loads all user-visible strings from `locale_game.txt` into Python globals. `constInfo.py` controls gameplay tuning parameters accessible to Python. `colorinfo.py` defines named RGB colour tuples used in chat and character name rendering. `musicinfo.py` holds BGM filenames with load/save helpers. `dragon_soul_refine_settings.py` defines the material and fee tables for Dragon Soul upgrade.

---

## Module: localeinfo.py

**Purpose:** Loads and exposes all user-visible locale strings from `locale_game.txt` as Python module-level globals, with hot-reload support for runtime language switching.

### Module-Level Constants

| Name | Value / Type | Description |
|------|-------------|-------------|
| `APP_GET_LOCALE_PATH` | string | Current locale directory path (from `app.GetLocalePath()`) |
| `APP_GET_LOCALE_PATH_COMMON` | string | Common locale directory path |
| `APP_TITLE` | `'METIN2'` | Application window title |
| `BLEND_POTION_NO_TIME` / `BLEND_POTION_NO_INFO` | string | Blend potion error message keys |
| `LOGIN_FAILURE_WRONG_SOCIALID` / `LOGIN_FAILURE_SHUTDOWN_TIME` | string | Login failure message keys |
| `GUILD_MEMBER_COUNT_INFINITY` | `'INFINITY'` | Display label for unlimited guild members |
| `GUILD_MARK_MIN_LEVEL` | `'3'` | Minimum guild level required to upload a mark |
| `GUILD_BUILDING_LIST_TXT` | string | Path to `GuildBuildingList.txt` |
| `FN_GM_MARK` | string | Path to the GM mark effect file |
| `VIRTUAL_KEY_ALPHABET_LOWERS` | string | Virtual keyboard lower-case character layout |
| `VIRTUAL_KEY_ALPHABET_UPPERS` | string | Virtual keyboard upper-case character layout |
| `VIRTUAL_KEY_SYMBOLS` | string | Virtual keyboard symbol character layout |
| `VIRTUAL_KEY_NUMBERS` | string | Virtual keyboard number character layout |
| `_reloadCallbacks` | list | Registry of functions called after locale reload |

All locale string keys from `locale_game.txt` are also injected as module-level globals (e.g. `UI_OK`, `UI_CANCEL`, `OPTION_PVPMODE_MESSAGE_DICT`, `WHISPER_ERROR`, etc.).

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `RegisterReloadCallback(callback)` | callable | None | Registers a function to be called after locale strings are reloaded; prevents duplicates |
| `LoadLocaleData()` | — | bool | Hot-reload entry point: refreshes locale path, re-reads `locale_game.txt`, calls `_RebuildDerivedData()`; returns True on success |
| `FireReloadCallbacks()` | — | None | Calls all registered reload callbacks in order; called by `uiScriptLocale.LoadLocaleData()` after both modules are fully reloaded |
| `LoadLocaleFile(srcFileName, localeDict)` | string, dict | None | Parses a tab-separated locale file and injects keys into `localeDict`; supports `SA`/`SNA`/`SAA`/`SAN` format-function specifiers for parameterised strings |
| `_RebuildDerivedData()` | — | None | Rebuilds all derived data structures (dicts, lists) that depend on locale string values |

### Derived Data Structures (rebuilt by `_RebuildDerivedData`)

| Name | Type | Description |
|------|------|-------------|
| `OPTION_PVPMODE_MESSAGE_DICT` | `{int: str}` | PK mode index → message string |
| `WHISPER_ERROR` | `{int: callable}` | Error code → formatted error message function |
| `error` | dict | Graphics init error code → localised message |
| `JOBINFO_TITLE` | list of lists | Job → skill group → title string |
| `GUILDWAR_NORMAL/WARP/CTF_DESCLIST` | list | Guild war type description lines |
| `MODE_NAME_LIST` | list | PK mode display names |
| `TITLE_NAME_LIST` | list | Alignment grade title names |
| `LEVEL_LIST` / `HEALTH_LIST` | list | Level/health threshold lists |
| `USE_SKILL_ERROR_TAIL_DICT` / `USE_SKILL_ERROR_CHAT_DICT` | dict | Skill error code → tail/chat message |
| `NOTIFY_MESSAGE` | dict | Notification code → message |
| `ATTACK_ERROR_TAIL_DICT` / `SHOT_ERROR_TAIL_DICT` | dict | Attack/shot error code → tail message |
| `SHOP_ERROR_DICT` | dict | Shop error code → message |
| `STAT_MINUS_DESCRIPTION` | string | Warning displayed for negative stat allocation |
| `MINIMAP_ZONE_NAME_DICT` | dict | Zone ID → zone name for minimap labels |

### Locale File Format

`locale_game.txt` is a tab-separated file. Each line has:
```
KEY\tVALUE[\tTYPE]
```
- `TYPE` is optional: `SA` (single arg), `SNA` (no arg), `SAA` (tuple arg), `SAN` (numeric arg).
- When a `TYPE` is present, the value is wrapped in a closure that performs `% x` substitution.
- Lines without a tab character are skipped.

---

## Module: constinfo.py

**Purpose:** Defines gameplay-tuning constants and getter/setter functions that expose them to the rest of Python and to the C++ engine.

### Constants

| Name | Default Value | Description |
|------|--------------|-------------|
| `CONSOLE_ENABLE` | `0` | Whether the developer console is accessible |
| `PVPMODE_ENABLE` | `1` | PK mode system enabled |
| `PVPMODE_TEST_ENABLE` | `0` | Debug PK overlay enabled |
| `PVPMODE_ACCELKEY_ENABLE` | `1` | PK mode keyboard shortcut enabled |
| `PVPMODE_ACCELKEY_DELAY` | `0.5` | Minimum seconds between PK mode changes |
| `PVPMODE_PROTECTED_LEVEL` | `15` | Minimum level to change PK mode |
| `FOG_LEVEL0/1/2` | `4800/9600/12800` | Fog distance presets |
| `FOG_LEVEL` | `FOG_LEVEL0` | Active fog distance |
| `CAMERA_MAX_DISTANCE_SHORT` | `2500.0` | Short camera distance preset |
| `CAMERA_MAX_DISTANCE_LONG` | `3500.0` | Long camera distance preset |
| `CAMERA_MAX_DISTANCE` | `CAMERA_MAX_DISTANCE_SHORT` | Active camera max distance |
| `CHRNAME_COLOR_INDEX` | `0` | Empire-colour mode for character names |
| `HIGH_PRICE` | `500000` | Yang threshold for "expensive" price warning |
| `MIDDLE_PRICE` | `50000` | Yang threshold for "moderate" price warning |
| `ERROR_METIN_STONE` | `28960` | VNUM of the error-placeholder metin stone |
| `HAIR_COLOR_ENABLE` | `1` | Hair colour dyeing system enabled |
| `ARMOR_SPECULAR_ENABLE` | `1` | Armour specular shading enabled |
| `WEAPON_SPECULAR_ENABLE` | `1` | Weapon specular shading enabled |
| `KEEP_ACCOUNT_CONNETION_ENABLE` | `1` | Keep-alive account connection enabled |
| `QUICKSLOT_MAX_NUM` | `36` | Total number of quick-slot slots |
| `TWO_HANDED_WEAPON_ATT_SPEED_DECREASE_VALUE` | `10` | Attack speed penalty for two-handed weapons |
| `ACCESSORY_MATERIAL_LIST` | list of int | VNUMs of valid accessory refine materials |
| `JewelAccessoryInfos` | list | Jewel→wrist/neck/ear VNUM mapping |
| `ACCESSORY_SOCKET_TIME_CACHE` | dict | Runtime cache for accessory socket timer values |

### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `SET_DEFAULT_FOG_LEVEL()` | — | None | Applies `FOG_LEVEL` to engine via `app.SetMinFog` |
| `SET_FOG_LEVEL_INDEX(index)` | int | None | Sets fog level from `FOG_LEVEL_LIST[index]` |
| `GET_FOG_LEVEL_INDEX()` | — | int | Returns current fog level index |
| `SET_DEFAULT_CAMERA_MAX_DISTANCE()` | — | None | Applies `CAMERA_MAX_DISTANCE` to engine |
| `SET_CAMERA_MAX_DISTANCE_INDEX(index)` | int | None | Sets camera distance from list |
| `GET_CAMERA_MAX_DISTANCE_INDEX()` | — | int | Returns current camera distance index |
| `SET_DEFAULT_CHRNAME_COLOR()` | — | None | Applies `CHRNAME_COLOR_INDEX` to `chrmgr` |
| `SET_CHRNAME_COLOR_INDEX(index)` | int | None | Sets and applies character name colour mode |
| `GET_CHRNAME_COLOR_INDEX()` | — | int | Returns current name colour index |
| `SET_VIEW_OTHER_EMPIRE_PLAYER_TARGET_BOARD(index)` | int | None | Enables/disables cross-empire target boards |
| `GET_VIEW_OTHER_EMPIRE_PLAYER_TARGET_BOARD()` | — | int | Returns the cross-empire target board flag |
| `SET_DEFAULT_CONVERT_EMPIRE_LANGUAGE_ENABLE()` | — | None | Applies empire language mode to `net` |
| `SET_DEFAULT_USE_ITEM_WEAPON_TABLE_ATTACK_BONUS()` | — | None | Applies weapon-table attack bonus flag to `player` |
| `SET_DEFAULT_USE_SKILL_EFFECT_ENABLE()` | — | None | Applies skill effect upgrade setting to `app` |
| `SET_TWO_HANDED_WEAPON_ATT_SPEED_DECREASE_VALUE()` | — | None | Applies two-handed attack speed decrease to `app` |
| `GET_ITEM_QUESTION_DIALOG_STATUS()` | — | int | Returns `isItemQuestionDialog` flag |
| `SET_ITEM_QUESTION_DIALOG_STATUS(flag)` | int | None | Sets `isItemQuestionDialog` flag |
| `GET_ACCESSORY_MATERIAL_VNUM(vnum, subType)` | int, int | int | Returns the correct refine material VNUM for an accessory slot type |

---

## Module: colorinfo.py

**Purpose:** Named RGB tuples for chat message types, character name types, and alignment title grades.

### Constants

| Name | Value (R, G, B) | Description |
|------|----------------|-------------|
| `CHAT_RGB_TALK` | `(255, 255, 255)` | Normal chat text |
| `CHAT_RGB_INFO` | `(255, 200, 200)` | System info messages |
| `CHAT_RGB_NOTICE` | `(255, 230, 186)` | Server notice messages |
| `CHAT_RGB_PARTY` | `(0, 255, 228)` | Party chat |
| `CHAT_RGB_GUILD` | `(253, 255, 124)` | Guild chat |
| `CHAT_RGB_COMMAND` | `(167, 255, 212)` | Command feedback |
| `CHAT_RGB_SHOUT` | `(167, 255, 212)` | Shout/public chat |
| `CHAT_RGB_WHISPER` | `(74, 225, 74)` | Private whisper |
| `CHR_NAME_RGB_MOB` | `(235, 22, 9)` | Monster name colour |
| `CHR_NAME_RGB_NPC` | `(122, 231, 93)` | NPC name colour |
| `CHR_NAME_RGB_PC` | `(255, 215, 76)` | Player character name |
| `CHR_NAME_RGB_PK` | `(180, 100, 0)` | PK-mode player name |
| `CHR_NAME_RGB_PVP` | `(238, 54, 223)` | PVP-mode player name |
| `CHR_NAME_RGB_PARTY` | `(128, 192, 255)` | Party member name |
| `CHR_NAME_RGB_WARP` | `(136, 218, 241)` | Warp portal label |
| `CHR_NAME_RGB_WAYPOINT` | `(255, 255, 255)` | Waypoint label |
| `CHR_NAME_RGB_EMPIRE_MOB` | `(235, 22, 9)` | Empire-mode monster name |
| `CHR_NAME_RGB_EMPIRE_NPC` | `(122, 231, 93)` | Empire-mode NPC name |
| `CHR_NAME_RGB_EMPIRE_PC_A` | `(157, 0, 0)` | Empire A player name |
| `CHR_NAME_RGB_EMPIRE_PC_B` | `(222, 160, 47)` | Empire B player name |
| `CHR_NAME_RGB_EMPIRE_PC_C` | `(23, 30, 138)` | Empire C player name |
| `TITLE_RGB_GOOD_4` | `(0, 204, 255)` | Highest positive alignment title |
| `TITLE_RGB_GOOD_3` | `(0, 144, 255)` | Second positive alignment title |
| `TITLE_RGB_GOOD_2` | `(92, 110, 255)` | Third positive alignment title |
| `TITLE_RGB_GOOD_1` | `(155, 155, 255)` | Lowest positive alignment title |
| `TITLE_RGB_NORMAL` | `(255, 255, 255)` | Neutral alignment title |
| `TITLE_RGB_EVIL_1` | `(207, 117, 0)` | Lowest negative alignment title |
| `TITLE_RGB_EVIL_2` | `(235, 83, 0)` | Second negative alignment title |
| `TITLE_RGB_EVIL_3` | `(227, 0, 0)` | Third negative alignment title |
| `TITLE_RGB_EVIL_4` | `(255, 0, 0)` | Highest negative alignment title |

---

## Module: musicinfo.py

**Purpose:** Stores currently playing BGM filenames and provides helpers to persist the last-played field music across sessions.

### Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `METIN2THEMA` | `"M2BG.mp3"` | Default field music filename |
| `loginMusic` | `"login_window.mp3"` | Music played on the login screen |
| `createMusic` | `"characterselect.mp3"` | Music played on the character create screen |
| `selectMusic` | `"characterselect.mp3"` | Music played on the character select screen |
| `fieldMusic` | `METIN2THEMA` | Currently active field BGM filename |

### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `SaveLastPlayFieldMusic()` | — | None | Writes `fieldMusic` to `BGM/lastplay.inf` |
| `LoadLastPlayFieldMusic()` | — | None | Reads `BGM/lastplay.inf` into `fieldMusic`; silently ignores `IOError` |

---

## Module: dragon_soul_refine_settings.py

**Purpose:** Defines the material counts, fees, and strength tables used by the Dragon Soul upgrade system.

### Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `default_grade_need_count` | `[15, 10, 5, 3]` | DS stones needed per grade level (index = grade 0–3) |
| `default_grade_fee` | `[30000, 50000, 70000, 100000]` | Yang cost per grade level |
| `default_step_need_count` | `[4, 3, 2, 1]` | DS stones needed per step level |
| `default_step_fee` | `[20000, 30000, 40000, 50000]` | Yang cost per step level |
| `strength_fee` | `{MATERIAL_DS_REFINE_NORMAL: 10000, …}` | Yang cost per strength material type |
| `default_strength_max_table` | 5×5 nested list | Maximum strength value per (grade, step) combination |
| `default_refine_info` | dict | Single refine-info bundle containing all above tables |
| `dragon_soul_refine_info` | `{11: ..., 12: ..., ..., 16: ...}` | Maps Dragon Soul type VNUM prefix (11–16) to its refine info |

### Data Structure Format

```python
default_refine_info = {
    "grade_need_count" : list,         # 4 entries
    "grade_fee"        : list,         # 4 entries
    "step_need_count"  : list,         # 4 entries
    "step_fee"         : list,         # 4 entries
    "strength_max_table" : list[list], # 5 grades × 5 steps
}
```
