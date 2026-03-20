# Setting Up the Server

> **Who is this for:** Someone running the server for the first time after completing the installation steps in the server-src README.
> **Prerequisites:** [Requirements](start-requirements) — all software installed and MariaDB running.
> **What you will learn:** The correct startup order, how to verify everything is working, the safe shutdown order, and common first-run mistakes.

## Overview

The server consists of two processes — `db` and `game` — that must be started in a specific order. This page explains that order, why it matters, and how to confirm each process started correctly. The actual installation commands are in the server-src README; this page picks up where the README leaves off.

> For the full installation and configuration steps, refer to the **server-src README**:
> https://github.com/d1str4ught/m2dev-server-src/tree/21519899adf6ade7937d71b1d9d886d502762a3b?tab=readme-ov-file#installationconfiguration

---

## The Correct Startup Order

```
Step 1: Start MariaDB
        ↓
Step 2: Start the db process
        ↓  (wait for "boot sequence done" in db/syslog)
Step 3: Start the game process
```

**Why this order matters:**

When the game process starts, one of its first actions is to open a TCP connection to the db process. If db is not yet listening, the game process logs a connection error and exits. You then have to restart game anyway — so starting db first is not optional, it is required.

MariaDB must be running before db starts for the same reason: db connects to MariaDB on startup to load the schema and begin the login cache.

---

## Verifying the db Process Started Correctly

After starting db, check `db/syslog`. A successful startup looks like:

```
[boot] connecting to MySQL...
[boot] MySQL connected
[boot] loading account cache...
[boot] loading player cache...
[boot] listening on port 1130
boot sequence done
```

The key line is **`boot sequence done`**. If you see this, db is ready and you can start game.

If you see errors instead, check `db/syserr`. Common causes:
- MariaDB not running or credentials wrong → check `db.conf`
- Wrong port in `db.conf` → default MariaDB port is 3306
- Missing database tables → run the schema SQL first

---

## Verifying the game Process Started Correctly

After starting game, check `game/syslog`. A successful startup looks like:

```
[boot] loading mob_proto...
[boot] loading item_proto...
[boot] loading map data...
[boot] connecting to db process...
[boot] db connection established
[boot] loading quest scripts...
SYSTEM: boot done
```

The key line is **`SYSTEM: boot done`**. At this point the game is accepting connections on the configured port (default 11011).

If you see errors instead, check `game/syserr`. Common causes:
- db process not running → start db first
- Missing `mob_proto` or `item_proto` → check file paths in `conf.txt`
- Missing map files → verify map directory path in config
- Quest compile errors → check `game/object/` has compiled quest files

---

## Confirming a Client Can Connect

Once both processes are running:

1. Configure `serverinfo.py` in client-bin to point to your server's IP (see [start-client-setup](start-client-setup))
2. Pack the assets with `pack.py`
3. Launch the client — the login screen should appear without a connection error
4. Log in with a test account — you should reach the character selection screen

If the client cannot connect, see [troubleshoot-client](troubleshoot-client) and [troubleshoot-server](troubleshoot-server).

---

## The Safe Shutdown Order

```
Step 1: Stop the game process first
        ↓  (game flushes its memory cache to db)
Step 2: Stop the db process
        ↓  (db flushes to MariaDB)
Step 3: Stop MariaDB (only if needed)
```

**Why this order matters:**

The game process keeps a write-through cache of character data that it periodically flushes to the db process. If you kill game abruptly, in-progress player saves may not reach db. If you then kill db before its flush cycle completes, recent item pickups or quest progress may be lost.

Always stop game first and give it a moment to flush (a few seconds), then stop db.

---

## Common Post-Setup Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Starting game before db | `game/syserr`: "cannot connect to db process", game exits | Start db first, wait for "boot sequence done" |
| Wrong IP or port in `db.conf` | db cannot connect to MariaDB | Check host/port/credentials match your MariaDB setup |
| Missing or empty `mob_proto` / `item_proto` | game exits at boot with proto load error | Run the SQL import for proto tables |
| Missing map files | game exits with "cannot find map" error | Verify map directory path in `conf.txt` |
| Quest files not compiled | Quests silently fail at runtime | Run `qc` on all `.quest` files; output goes to `game/object/` |
| Killing db before game when shutting down | Recent player data lost | Always stop game first |
| Not checking syserr after startup | Unknown errors go unnoticed | Always tail `game/syserr` and `db/syserr` after startup |

---

## Next Steps

- [Setting Up the Client](start-client-setup) — connect a client to your server
- [Your First Change](start-first-change) — make your first server-side change
- [Fixing Server Errors](troubleshoot-server) — if something went wrong
