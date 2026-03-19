# Guide: Localization

> How to use, extend, and add new languages to the locale system in Metin2 Rework v3.

## Overview

The Rework v3 locale system has two distinct layers:

| Layer | Where | Files |
|-------|-------|-------|
| **Client strings** | `client-bin/assets/locale/<lang>/` | `locale_game.txt`, `locale_interface.txt` |
| **Server messages** | `server-src/share/locale/` | `locale_string.txt` |

The Python module `localeInfo.py` is the bridge between the text files and all Python UI code. The C++ module `EterLocale` provides low-level encoding utilities (Arabic shaping, UTF-8 code-page constants).

---

## 1. Client-Side Strings

### locale_game.txt

This is the master string file for all in-game text. It lives at:
```
client-bin/assets/locale/<lang>/locale_game.txt
```

**File format:**
```
KEY<TAB>VALUE[<TAB>TYPE]
```

- `KEY` — a unique Python-accessible constant name (e.g. `UI_OK`, `ITEM_TOOLTIP_ATT_SPEED`)
- `VALUE` — the display string; may contain `%s` or `%d` placeholders
- `TYPE` (optional) — one of:
  - `SA` — single string argument: `value % x`
  - `SNA` — no argument (value is a plain string)
  - `SAA` — tuple argument: `value % (a, b)`
  - `SAN` — numeric argument

When `LoadLocaleFile()` processes a line with a `TYPE`, it wraps the value in a lambda/closure that performs `%`-substitution on call.

**Accessing strings in Python:**
```python
import localeInfo
# Plain string
ok_label = localeInfo.UI_OK

# Parameterized string (SA type)
msg = localeInfo.WHISPER_SEND_FORMAT("PlayerName")  # "Whisper to %s" % "PlayerName"
```

**Never hard-code strings in Python.** Instead of:
```python
self.SetText("확인")  # Bad: hardcoded Korean
```
Always write:
```python
self.SetText(localeInfo.UI_OK)  # Good: locale-aware
```

### locale_interface.txt and uiScriptLocale

`locale_interface.txt` follows the same tab-separated format and is loaded into `uiScriptLocale.py`. It provides strings specifically for UI window titles and labels.

```python
import uiScriptLocale
title = uiScriptLocale.INVENTORY_TITLE
```

### Hot Reload

`localeInfo.LoadLocaleData()` and `uiScriptLocale.LoadLocaleData()` support runtime reload. Register a callback to be called after reload:

```python
import localeInfo
def OnLocaleReload():
    self.titleBar.SetText(localeInfo.MY_WINDOW_TITLE)

localeInfo.RegisterReloadCallback(OnLocaleReload)
```

After both modules reload, `localeInfo.FireReloadCallbacks()` is called automatically.

---

## 2. How to Add a New String

1. **Add to `locale_game.txt`:**
   ```
   MY_SYSTEM_TITLE	My System Window
   MY_SYSTEM_MSG	Hello, %s!	SA
   ```

2. **Use it in Python:**
   ```python
   import localeInfo
   self.titleBar.SetText(localeInfo.MY_SYSTEM_TITLE)
   greeting = localeInfo.MY_SYSTEM_MSG("World")
   ```

3. **Rebuild derived data if needed.** If your new string is used in a lookup dict (like `NOTIFY_MESSAGE`), add an entry in `_RebuildDerivedData()` inside `localeInfo.py`.

---

## 3. Server-Side Strings

### locale_string.txt

Server-side messages sent to the client via `CHAT_TYPE_INFO` or system notices are looked up from `locale_string.txt`. This file lives in the server's share/locale directory.

Format (same as client):
```
KEY<TAB>VALUE
```

In C++ server code, messages are sent via:
```cpp
ch->ChatPacket(CHAT_TYPE_INFO, LC_TEXT("QUEST_COMPLETE_MESSAGE"));
```

`LC_TEXT()` looks up the key in the loaded locale string table. If the key is not found, it returns the key itself as fallback.

### Adding a New Server Message

1. Add the key/value to `locale_string.txt`:
   ```
   MY_SYSTEM_REWARD	You received your reward!
   ```

2. Use it in C++:
   ```cpp
   ch->ChatPacket(CHAT_TYPE_INFO, LC_TEXT("MY_SYSTEM_REWARD"));
   ```

---

## 4. Adding a New Language

Adding a completely new language requires changes in both the client and server.

### Step 1 — Client Directory Structure

Create a new locale directory mirroring an existing one:
```
client-bin/assets/locale/
  de/
    locale_game.txt
    locale_interface.txt
    ...
  en/            ← new language
    locale_game.txt
    locale_interface.txt
    ...
```

### Step 2 — localeInfo.py

The locale path is set by `app.GetLocalePath()` which reads the configured locale directory from the client's startup config. To point the client at a new locale:

In `config.py` or the launcher config:
```
LOCALE_PATH locale/en
```

### Step 3 — EterLocale (C++ Encoding)

If the new language uses a non-Latin script (e.g. Arabic), `EterLocale` provides the necessary shaping utilities:

- **Arabic RTL shaping:** `Arabic_MakeShape(src, srcLen, dst, dstLen)` converts base Unicode code points to their correct positional presentation forms before rendering.
- **UTF-8 handling:** `CP_UTF8 = 65001` is used in all `MultiByteToWideChar` / `WideCharToMultiByte` calls.

For a left-to-right Latin script language, no additional C++ changes are needed.

### Step 4 — Server Locale

Copy and translate `locale_string.txt` to the new locale directory on the server. Point the server's locale config to the new path in `setup` or the server configuration file.

### Step 5 — Font

If the new language requires a new font, add the font file (`.fnt` + texture) under `client-bin/assets/locale/<lang>/ui/` and update `constInfo.py` or the font loading call in `GameWindow.py`.

---

## 5. Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Hard-coded string in Python | String breaks when locale changes | Use `localeInfo.KEY` instead |
| Missing key in `locale_game.txt` | `AttributeError: module 'localeInfo' has no attribute 'MY_KEY'` | Add the key/value pair to the file |
| SA type but called as plain string | `TypeError: 'str' object is not callable` | Call it as a function: `localeInfo.MY_KEY("arg")` |
| Forgetting `_RebuildDerivedData` | Derived dicts still use old strings after reload | Add rebuild logic for new derived structures |
| Wrong TAB character (space instead of TAB) | Key not loaded (line silently skipped) | Ensure the separator is a real `\t` tab character |
| `LC_TEXT` key missing server-side | Server sends the raw key string as chat message | Add the key to `locale_string.txt` |

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `assets/locale/<lang>/locale_game.txt` | client-bin | Master client string table |
| `assets/locale/<lang>/locale_interface.txt` | client-bin | UI label string table |
| `assets/root/localeInfo.py` | client-bin | Python string loader and accessor module |
| `assets/root/uiScriptLocale.py` | client-bin | Interface-specific string module |
| `assets/root/constInfo.py` | client-bin | `APP_GET_LOCALE_PATH`, font and locale config constants |
| `src/EterLocale/Arabic.h/.cpp` | client-src | Arabic RTL shaping utilities |
| `src/EterLocale/CodePageId.h` | client-src | `CP_UTF8 = 65001` constant |
| `share/locale/<lang>/locale_string.txt` | server-src | Server-side message string table |
