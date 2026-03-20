# Fixing Client Errors — Common Problems & Solutions

> **Who is this for:** A developer whose client is crashing, showing Python errors, not connecting, or displaying wrong data.
> **Prerequisites:** [Why Python for the UI?](concept-python-ui) — understanding the Python/C++ split helps you interpret these errors correctly.
> **What you will learn:** Where to find client error logs, the most common Python and DirectX errors, common build failures, and a connection troubleshooting checklist.

## Overview

Client errors fall into two categories: Python runtime errors (logged to `syserr.txt`) and DirectX/C++ errors (shown as crash dialogs or also logged to `syserr.txt`). Start with the log file — it contains almost everything you need.

---

## Where is syserr.txt?

`syserr.txt` is created in the **root directory of the client** — the same folder as `Metin2.exe`.

```
client-root/
├── Metin2.exe
├── syserr.txt    ← errors appear here
├── pack/
├── root/
└── ...
```

**What it looks like:**
```
0820 14:23:01162 :: CPythonLauncher::Run: RuntimeError: CREATE_DEVICE
0820 14:23:01163 :: EXCEPTION: unhandled exception
```

Format: `[MMDD] [HH:MM:SS:ms] :: [source]: [message]`

**How to clear it before testing:** Delete or rename `syserr.txt` before launching the client. A fresh launch recreates it. This ensures you are looking at errors from the current run only, not accumulated from previous sessions.

---

## Error Reference Table

| Exact error text | Most likely cause | Fix | How to confirm |
|---|---|---|---|
| `ImportError: No module named 'X'` | A Python script tries to import a module that is not in the pack | Check if the module file exists in `root/`; verify it was included in the pack | Import succeeds; no error in syserr.txt |
| `AttributeError: module 'X' has no attribute 'Y'` | Python calling a C++ function that does not exist in this build | Version mismatch between client-src and client-bin; check that function `Y` is registered in the C++ module `X` | Function call succeeds |
| `TypeError: argument N must be int, not str` | Python passing a string where a C++ function expects an integer | Find the call site and convert to int: `int(value)` | No TypeError in syserr.txt |
| `RuntimeError: CREATE_DEVICE` | DirectX failed to initialise the graphics device | Update graphics drivers; check that DirectX SDK June 2010 is installed; verify the resolution settings in `config.cfg` are supported | Client opens to login screen |
| `RuntimeError: unknown widget type 'X'` | A uiscript layout file references a widget type that is not registered in C++ | Check the `type` field in the uiscript file — must match a registered C++ widget class name | Widget renders without this error |
| `CPythonLauncher: RunFile failed on root/game.py` | `game.py` has a Python syntax error or one of its imports fails | Check `syserr.txt` for the specific error line above this message; fix the Python syntax | Client loads without this error |
| Black screen on startup | DirectX device initialised but nothing renders — usually wrong resolution or missing map data | Try running in windowed mode; check `config.cfg` resolution; verify the starting map data is present in pack | Login screen visible |
| White screen on startup | Similar to black screen — often a missing or corrupted background texture | Verify background textures are correctly packed; check syserr.txt for missing texture messages | Login screen visible |
| Client connects but character select shows empty slots | The server is not sending character data — usually a DB error or CRC mismatch | Check `game/syserr` on the server for CRC errors or DB load failures | Characters appear in select screen |
| Items show wrong icon or wrong name | Client `item_proto.bin` is out of sync with the server SQL | Regenerate `item_proto.bin`, repack, restart client — see [concept-proto](concept-proto) | Correct name and icon shown |
| Client crashes when entering game world | Missing map data, corrupted pack files, or CRC kick from server | Check syserr.txt; verify map pack files are present; check server syserr for CRC messages | Client enters the game world |
| CRC mismatch / kicked after selecting character | Binary proto files (item_proto.bin / mob_proto.bin) do not match server's expected CRC | Regenerate and repack binary proto files | Character loads into game |
| `syserr: cannot find texture [path]` | A texture file referenced by a script or effect is missing from the pack | Verify the texture file exists in client-bin and was included in the pack | No missing texture errors |
| Minimap shows solid black | Minimap texture files not in the pack | Pack the minimap textures from the correct map directory | Minimap renders correctly |
| Effects or sounds not playing | Effect/sound files not in the pack, or wrong path in effect definition | Verify the referenced files exist and are packed | Effects/sounds play correctly |

---

## Client Build Fails — Common CMake and MSVC Errors

### Missing DirectX SDK

```
Error: cannot open include file: 'd3d9.h'
Error: cannot open include file: 'dxerr9.h'
```

**Fix:** Install DirectX SDK June 2010 (the legacy standalone SDK — not the version built into modern Windows SDK). Set the `DXSDK_DIR` environment variable or specify the include path in CMake.

### Wrong Python version

```
Error: python27.lib: cannot open file
Error: _MSC_VER mismatch: Python was built with 1500, this compiler is 1900
```

**Fix:** The client requires **32-bit Python 2.7** specifically. The 64-bit version produces linker errors. Download the 32-bit installer from the Python 2.7 download archive. Ensure CMake finds the 32-bit version, not a 64-bit Python 3 installation.

### Granny2 lib not found

```
Error: cannot open input file 'granny2.lib'
Error: granny2.h: No such file or directory
```

**Fix:** Place `granny2.lib` and `granny2.h` in the directory expected by the CMake configuration. The exact path is specified in the client-src README.

---

## Client Starts But Cannot Connect — Checklist

Work through these in order:

1. **Is the server actually running?**
   Check `game/syslog` on the server for "SYSTEM: boot done". If the game process is not running, the client has nothing to connect to.

2. **Is `serverinfo.py` pointing to the correct IP and port?**
   Open `root/serverinfo.py` and check the `IP` and `PORT` fields. If you changed it, did you repack?

3. **Did you repack after editing `serverinfo.py`?**
   The client reads `serverinfo.py` from the pack, not from disk. Run `pack.py` after any edit.

4. **Is the client firewall allowing outbound connections on port 11011?**
   Windows Firewall may block outbound connections from unsigned executables. Add an exception for `Metin2.exe`.

5. **Is the server port open in the server firewall?**
   The game server's firewall must allow inbound TCP connections on the configured game port (default 11011).

6. **Are client and server proto files in sync?**
   Check `game/syserr` for "CRC mismatch" messages. If present, regenerate and repack the binary proto files.

7. **Check `syserr.txt` for connection errors**
   Python network errors at connection time will appear here.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Editing a .py file without repacking | Old behaviour persists | Run `pack.py`, then restart client |
| Checking syserr from a previous run | Old errors mixed with current ones | Delete `syserr.txt` before launching the client for a clean log |
| 64-bit Python 2.7 instead of 32-bit | Build fails with linker errors | Install the 32-bit Python 2.7 installer |
| Forgetting to install DirectX SDK June 2010 | Build fails with `d3d9.h` not found | Install the standalone DirectX SDK June 2010 |
| Assuming CRC kicks are a server bug | Wasting time on server-side debugging | CRC kicks always mean a binary proto mismatch — regenerate and repack |

---

## Next Steps

- [Fixing Server Errors](troubleshoot-server) — if the client error points to a server-side issue
- [Fixing Database Problems](troubleshoot-db) — for proto sync and character save issues
- [Why Python for the UI?](concept-python-ui) — to understand the Python error messages better
