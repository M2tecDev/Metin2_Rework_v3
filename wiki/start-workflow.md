# The Daily Development Workflow

> **Who is this for:** Any developer making regular changes to the project.
> **Prerequisites:** Working server and client — see [start-server-setup](start-server-setup) and [start-client-setup](start-client-setup).
> **What you will learn:** Exactly what to restart or recompile after every type of change, the safe restart sequence, and how to verify your change actually took effect.

## Overview

The most common way to waste an hour in Metin2 development is to make a change and restart the wrong thing — or not restart enough things. This page is the reference you come back to every time you make a change and ask "wait, what do I need to do now?"

---

## Master Reference Table

Find the row matching what you changed, then follow each column from left to right.

| I changed... | Run qc? | Recompile server? | Restart db? | Restart game? | Recompile client? | Repack assets? | Restart client? | Notes |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|
| `item_proto` SQL | — | — | — | ✓ | — | — | — | Reload proto; some builds support `/reload item_proto` |
| `mob_proto` SQL | — | — | — | ✓ | — | — | — | |
| `regen.txt` | — | — | — | ✓ | — | — | — | Only game reads regen at startup |
| `.quest` source file | ✓ | — | — | ✓ | — | — | — | `cd server/share/locale/english/quest/` first, then `python make.py` — cwd is required (make.py uses relative paths) |
| `questmanager` / questlua C++ | — | ✓ | — | ✓ | — | — | — | Compile in `server-src` → copy binary to `server/share/bin/` → `python stop.py` → `python start.py` (from `server/` root) |
| Other C++ server code (`char`, `battle`, etc.) | — | ✓ | — | ✓ | — | — | — | Compile in `server-src` → copy binary to `server/share/bin/` → `python stop.py` → `python start.py` (from `server/` root) |
| `packet_headers.h` | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | Both sides must agree on header values |
| `tables.h` or `length.h` | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | Shared struct sizes — full rebuild required |
| C++ client code (`UserInterface/`) | — | — | — | — | ✓ | — | ✓ | |
| Python UI script in `root/` | — | — | — | — | — | ✓ | ✓ | |
| UIScript layout file in `uiscript/` | — | — | — | — | — | ✓ | ✓ | |
| DB schema (new columns/tables) | — | — | ✓ | ✓ | — | — | — | db must re-read schema; game reconnects |
| `.pck` asset files (textures, models) | — | — | — | — | — | ✓ | ✓ | |
| `item_proto` binary (client copy) | — | — | — | ✓ | — | ✓ | ✓ | Proto sync — see [guide-Database-Proto](guide-Database-Proto) |
| `mob_proto` binary (client copy) | — | — | — | ✓ | — | ✓ | ✓ | Proto sync |
| `conf.txt` (game config) | — | — | — | ✓ | — | — | — | Game reads conf.txt at startup |
| `db.conf` (located at `server/share/conf/`; see [start-server-setup](start-server-setup)) | — | — | ✓ | — | — | — | — | db reads its config at startup |
| `server/share/conf/*.txt` config files | — | — | — | ✓ | — | — | — | Game reads conf at startup; restart game channel only |
| Management scripts (`start.py`, `stop.py`, etc.) | — | — | — | — | — | — | — | Script changes take effect on next invocation |

> **Multi-channel note:** `start.py` starts all configured game channels automatically — you do not need to start each `game` process individually. Channel configuration lives in `server/channels.py`.

---

## The Safe Restart Sequence

When you need to restart both server processes (e.g., after a packet change or schema change), follow this exact order:

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

**Never start game before db is ready.** The game process connects to db during its own boot sequence. If db is not listening yet, game will fail to start.

---

## How Do I Know It Actually Worked?

### Server side
- Check `game/syslog` — look for `SYSTEM: boot done` with no error lines before it
- Check `game/syserr` — should be empty or contain only expected warnings
- For quest changes: verify the compiled output exists in `game/object/`
- Test the specific change in-game

### Client side
- Check `syserr.txt` in the client directory — should be empty on a clean startup
- For Python changes: if the old behaviour persists, the repack did not complete or the client is reading a cached pack
- For proto changes: log in and verify the item/mob displays correctly

### Quick sanity check for any change
1. Make the change
2. Do the restart/repack steps from the table above
3. Check for errors in the relevant log file
4. Test in-game
5. Only if it looks wrong: re-read the table and check you did not miss a step

---

## The Nuclear Option

When in doubt, or when something is behaving inconsistently and you cannot find the cause, do a full rebuild and restart:

```
1. Stop game and db
2. Recompile server-src (full rebuild)
3. Recompile client-src (full rebuild)
4. Start db, wait for "boot sequence done"
5. Start game, wait for "SYSTEM: boot done"
6. Run qc on all quest files in game/quest/
7. Repack all client assets: python pack.py
8. Restart the client
```

This clears any stale compiled artifacts, ensures both sides are using the same struct definitions, and gives you a clean baseline for debugging.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Restarting game but forgetting to run qc | Quest changes silently ignored | Always run `qc` on modified quest files before restarting game |
| Repacking but not restarting the client | Old behaviour persists | Kill and relaunch the client after repacking |
| Restarting game before db is ready | game exits at boot | Wait for db `syslog` to show "boot sequence done" |
| Forgetting to repack after editing serverinfo.py | Client connects to wrong server | serverinfo.py is a packed Python file — it must be repacked |
| Changing packet_headers.h but only recompiling one side | Client/server immediately disconnect | Packet changes require full recompile of both server-src and client-src |
| Not checking syserr after restart | Errors go unnoticed until something weird happens | Always check both syserr files after a restart |

---

## Next Steps

- [How Everything Fits Together](concept-architecture) — understand why the restart rules are what they are
- [Adding a New System](guide-Adding-a-New-System) — put the workflow into practice with a complete example
- [Fixing Server Errors](troubleshoot-server) — when syslog has errors you don't recognise
