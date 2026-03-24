# Fixing Server Errors — Common Problems & Solutions

> **Who is this for:** A developer whose server process is not starting, crashing, or behaving unexpectedly.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — you need to understand the two-process model to interpret these errors correctly.
> **What you will learn:** How to read syserr files, the most common server errors and how to fix them, and step-by-step checklists for the most frequent failure scenarios.

## Overview

When something goes wrong on the server, the answer is almost always in `game/syserr` or `db/syserr`. This page is the reference for reading those files and fixing the most common errors.

---

## How to Read syserr

### File locations

```
game/syserr    ← errors from the game process
db/syserr      ← errors from the db process
game/syslog    ← normal informational output from game (not errors)
db/syslog      ← normal informational output from db
```

**Key distinction:** `syslog` is for normal operation messages ("player logged in", "map loaded"). `syserr` is for actual problems. If something is wrong, start with `syserr`, not `syslog`.

### What a line looks like

```
Jul 14 18:23:01 :: CInputMain::Attack: invalid attack type: 99 from vid 1234
```

Format: `[date] [time] :: [class/function]: [message]`

### Finding the relevant error in a large log

On a busy server, syserr grows quickly. When debugging:
1. Clear or rename the syserr file before reproducing the problem
2. Trigger the failing behaviour
3. Check syserr immediately — the error will be near the end

```bash
tail -50 game/syserr    # last 50 lines
tail -f game/syserr     # watch in real time
```

---

## Error Reference Table

| Exact error text | Most likely cause | Fix | How to confirm it is fixed |
|---|---|---|---|
| `SECTREE_MANAGER: cannot find map [name]` | Map folder missing or misnamed in config | Verify map folder exists in `game/data/map/` and name matches `conf.txt` | Server starts without this error |
| `CInputMain: unknown packet header 0xXX` | Client is sending a packet the server does not know about — version mismatch or exploit attempt | Check `packet_headers.h` — if the header is missing, add it; if client is outdated, update | No more unknown header warnings for legitimate clients |
| `CInputMain: phase X cannot handle packet 0xXX` | Client sent a packet in the wrong phase | Usually a client-side state machine bug — check phase transitions in `CInputLogin` / `CInputMain` | Packet reaches the correct phase handler |
| `db: QUERY_LOGIN: SQL error [message]` | MariaDB query failed — bad credentials, missing table, or DB not running | Check `db/db.conf` credentials (config file at `server/share/conf/`; see [start-server-setup](start-server-setup)); verify the `account` table exists; check MariaDB status | Login succeeds; no SQL error in db/syserr |
| `SecureCipher: init failed` | libsodium not found or version mismatch | Verify `libsodium-dev` is installed; recompile the server | Handshake completes without this error |
| `key exchange failed` | Client and server using different cipher parameters | Ensure client-src and server-src are from the same version | Client reaches LOGIN phase |
| `cannot connect to db process` | game process started before db was ready | Stop game, wait for db to show "boot sequence done", then start game | game connects to db on startup |
| `mob_proto: load failed` | `mob_proto` table empty, missing, or wrong column count | Run the mob_proto SQL import; check column count matches server expectation | game starts without this error |
| `item_proto: load failed` | Same as mob_proto but for item_proto | Run the item_proto SQL import | game starts without this error |
| `regen: parse error at line N in [file]` | regen.txt syntax error at the given line | Open the file, go to line N, check for wrong field count, missing tab, or invalid vnum | game starts and mobs spawn correctly |
| `lua: attempt to call a nil value` | Quest script calling a function that does not exist or is named incorrectly | Check quest script for typos in function names; verify the function is available in the quest API | Quest runs without Lua errors |
| `lua: stack overflow` | Quest script infinite recursion | Find and fix the recursive call in the quest script | Quest runs without stack overflow |
| `IS_SPEED_HACK vid=[VID] speed=[N]` | A player's movement speed exceeded the server's hack detection threshold | Expected if a player is actually speed hacking; false positives can occur with very high movement buffs — adjust the threshold in config if needed | Log entry stops appearing for legitimate players |
| `PointChange: type [N] is out of range` | Code attempting to set a character point type that does not exist | Check the point type constant — it may be beyond the `POINT_MAX` enum value | No more out-of-range errors for this point type |
| `UseSkill: not found skill by vnum [N]` | Player or mob attempting to use a skill vnum that is not loaded | Verify the skill vnum exists in `skill_proto`; check the mob's skill list in `mob_proto` | Skill activates without this error |
| `CGrid: not enough space` | Inventory grid full — item cannot be placed | Expected behaviour when inventory is full; if happening unexpectedly, check item size vs available slots | Item successfully placed when space exists |

---

## The Server Won't Start — Step-by-Step Checklist

Work through these in order — most common causes first:

1. **Is MariaDB running?**
   ```bash
   systemctl status mariadb
   # or
   mysqladmin -u root -p status
   ```
   If not: `systemctl start mariadb`

2. **Did you start db before game?**
   Check `db/syslog` for "boot sequence done". If it is not there, db has not finished starting. Wait, then start game.

3. **Are DB credentials correct?**
   Open `db/db.conf` and verify the `HOST`, `USER`, `PASSWORD`, and `DB` values match your MariaDB setup.

4. **Are all required proto tables populated?**
   ```sql
   SELECT COUNT(*) FROM item_proto;
   SELECT COUNT(*) FROM mob_proto;
   ```
   If either returns 0, the proto SQL import was not run.

5. **Are all required files present?**
   - `game/conf.txt` — main game config
   - `game/data/map/` — at least one map directory
   - `game/object/` — compiled quest files (can be empty, but directory must exist)

6. **Check syserr for the actual error**
   ```bash
   cat game/syserr | head -50
   cat db/syserr | head -50
   ```
   The first error in the file is usually the root cause; subsequent errors are often cascades.

7. **Check for port conflicts**
   ```bash
   netstat -tlnp | grep 11011   # game port
   netstat -tlnp | grep 1130    # db port
   ```
   If another process is using the port, the server cannot bind.

---

## Players Cannot Connect — Checklist

1. **Is the game process running and showing "SYSTEM: boot done" in syslog?**
2. **Is port 11011 (or your configured game port) open in the firewall?**
   ```bash
   ufw status
   # or
   iptables -L -n | grep 11011
   ```
3. **Does `serverinfo.py` in client-bin point to the correct IP and port?** (and was it repacked after the last edit?)
4. **Is the client's binary proto CRC matching the server?** Check `game/syserr` for CRC mismatch messages when a player tries to connect.
5. **Is the client version compatible with this server version?**

---

## Mobs Are Not Spawning — Checklist

1. **Is the mob vnum in `mob_proto`?** `SELECT * FROM mob_proto WHERE vnum = [N];`
2. **Does the regen.txt entry use server coordinates (×100)?** Map editor shows metres; server uses centimetres.
3. **Did you restart the game process after editing regen.txt?** regen.txt is only read at startup.
4. **Is the map name in regen.txt exactly matching the folder name in `game/data/map/`?**
5. **Check `game/syserr` for regen parse errors** — the error message includes the line number.

---

## Quest Scripts Are Not Working — Checklist

1. **Did you run `qc` on the quest file?** The source `.quest` file is not executed directly — it must be compiled first.
2. **Is the compiled output in `game/object/`?** Verify the `.quest` file in `game/object/` is newer than the source file.
3. **Did you reload quests after compiling?** Restart the game process if hot-reload is not available.
4. **Check `game/syserr` for Lua errors** — syntax errors and runtime errors both appear here.
5. **Is the trigger name spelled correctly?** `npc.click` not `npc.Click` — Lua is case-sensitive.
6. **Is the NPC vnum correct?** `when [vnum].click` — the vnum must match the NPC you are clicking.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Looking in syslog for errors | Errors are not found; problem persists | Check syserr, not syslog |
| Assuming the first line of syserr is irrelevant | Root cause missed | The first error is usually the trigger for everything that follows |
| Restarting game without restarting db after schema changes | db/game are out of sync; characters cannot log in | Restart db before game when schema changes |

---

## Next Steps

- [Fixing Database Problems](troubleshoot-db) — when the issue is in MariaDB or the db process
- [Fixing Client Errors](troubleshoot-client) — when the client is reporting the error instead
- [How Everything Fits Together](concept-architecture) — to understand which process is responsible for which errors
