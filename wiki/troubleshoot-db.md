# Fixing Database Problems

> **Who is this for:** A developer whose database is not connecting, not saving character data, or causing proto loading errors.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — understand the db process and its role before diagnosing database problems.
> **What you will learn:** How to diagnose database issues, fix MariaDB connectivity problems, resolve proto loading failures, and debug character save and quest flag issues.

## Overview

Database problems are usually one of three things: MariaDB is not running or not reachable, the db process cannot load proto tables, or data is not being saved/loaded correctly. Each has distinct symptoms and a clear fix path.

---

## Diagnosing Database Issues

### Check if MariaDB is running

```bash
systemctl status mariadb
# or check if the port is listening
netstat -tlnp | grep 3306
```

### Check the db process logs

```bash
tail -50 db/syslog    # recent informational output
tail -50 db/syserr    # errors — start here when something is wrong
```

### Useful MariaDB commands for diagnosis

```sql
-- See what connections are active
SHOW PROCESSLIST;

-- Verify the database tables exist
USE metin2;
SHOW TABLES;

-- Check that proto tables have data
SELECT COUNT(*) FROM item_proto;
SELECT COUNT(*) FROM mob_proto;

-- Check that the account table exists
DESCRIBE account;
```

---

## MariaDB Unreachable

If the db process logs show a connection failure to MariaDB, work through this checklist:

**1. Is the MariaDB service running?**
```bash
systemctl status mariadb
# If stopped:
systemctl start mariadb
```

**2. Is the port correct in `db/db.conf`?**
The default MariaDB port is `3306`. Check `db/db.conf`:
```
MYSQL_PORT      3306
```
If you changed the MariaDB port, update this value to match.

**3. Are the credentials correct?**
```
MYSQL_USER      metin2
MYSQL_PASSWORD  yourpassword
MYSQL_HOST      localhost
MYSQL_DB        metin2
```
Test manually:
```bash
mysql -u metin2 -p metin2
# Enter password — if this connects, credentials are correct
```

**4. Is the database user allowed to connect from localhost?**
```sql
-- Check user permissions
SELECT Host, User FROM mysql.user WHERE User = 'metin2';
-- Should show 'localhost' or '%' in Host column

-- If missing, grant access:
GRANT ALL PRIVILEGES ON metin2.* TO 'metin2'@'localhost' IDENTIFIED BY 'yourpassword';
FLUSH PRIVILEGES;
```

---

## item_proto or mob_proto Not Loading

If the game process logs show `item_proto: load failed` or `mob_proto: load failed`:

**Wrong column count**

The text format exported from SQL must have the exact number of columns the server expects. If you added or removed columns from the SQL table without updating the export format, the binary conversion will fail.

**Wrong separator — tabs vs spaces**

The text proto format uses **tab characters** as separators, not spaces. If the export tool outputs spaces, the server cannot parse the fields. Always verify the exported file uses actual tab characters.

**File encoding issues**

Proto text files must be UTF-8 or ASCII. UTF-16 (sometimes produced by Windows tools like Notepad) will cause parsing to fail silently or produce garbage. Use a text editor that saves as UTF-8.

**Wrong file path in config**

Check `game/conf.txt` for the paths to the binary proto files:
```
ITEM_PROTO   /home/metin2/game/data/item_proto
MOB_PROTO    /home/metin2/game/data/mob_proto
```
The file must exist at exactly this path. Verify:
```bash
ls -la /path/to/game/data/item_proto
ls -la /path/to/game/data/mob_proto
```

---

## Characters Not Being Saved

If players report losing items or progress after a server restart:

**Root causes:**
- The db process crashed before flushing its cache to MariaDB
- The game process was killed before it sent pending saves to db
- MariaDB ran out of disk space and rejected writes
- Wrong file permissions on the save directory

**How to verify items are actually in the DB:**
```sql
-- Check items for a specific player (replace X with the player's database ID)
SELECT id, vnum, count, pos FROM item WHERE owner_id = X AND window = 0
ORDER BY pos;

-- Check the character record itself
SELECT name, level, exp, gold, x, y, map_index FROM player WHERE id = X;
```

**How to check for write errors:**
```bash
tail -100 db/syserr | grep -i "sql\|error\|write"
```

**Disk space check:**
```bash
df -h
```
If the disk is full, MariaDB will fail silently. Free up space and restart.

---

## Quest Flags Being Lost

Quest progress is stored in the `quest` table in MariaDB. There are two types of flags, and confusing them is a common source of lost progress:

**Session flags (`pc.setf`):** Stored in memory only, for the duration of the current login session. Lost when the player logs out or the server restarts. Use for temporary UI state.

**Persistent quest flags (`pc.setqf`):** Written to the `quest` table in MariaDB. Survive logout and server restart. Use for quest progress that must persist.

**How to verify a flag is saved:**
```sql
-- Check all quest flags for a player (replace X with player ID, 'quest_name' with your quest)
SELECT szName, szState, iFlag FROM quest WHERE dwPCID = X AND szName = 'quest_name';
```

If the row exists after logout and re-login, the flag was saved correctly. If it is missing, the quest script is using `pc.setf` instead of `pc.setqf`.

---

## CRC Mismatch Between Client and Server

The server calculates a CRC (checksum) of the binary proto files when it starts. When a client connects and selects a character, the server compares the client's proto CRC against its own. If they differ, the client is kicked.

**What causes it:**
The client's binary proto file (`item_proto.bin` or `mob_proto.bin` packed into the client assets) does not match the binary file the server loaded at startup.

**How to identify which proto is wrong:**
```bash
grep "CRC" game/syserr
# Output will include the proto name and expected vs. actual CRC values
```

**Step-by-step fix:**
1. Export the current SQL table to text format (see [guide-Database-Proto](guide-Database-Proto))
2. Convert text to binary using the proto conversion tool
3. Copy the new binary file to the appropriate location in client-bin
4. Run `pack.py` to rebuild the client pack files
5. Restart the game process (it reloads the binary proto at startup)
6. Restart the client (it reads the new pack)
7. Verify: character loads into the game without being kicked

---

## Useful SQL Queries for Debugging

| Problem | SQL query |
|---------|-----------|
| Is this account in the DB? | `SELECT id, login, status FROM account WHERE login = 'accountname';` |
| What items does player X have? | `SELECT id, vnum, count, pos, window FROM item WHERE owner_id = X ORDER BY window, pos;` |
| What is player X's position? | `SELECT name, x, y, map_index, channel FROM player WHERE id = X;` |
| Are quest flags saved for player X? | `SELECT szName, szState, iFlag FROM quest WHERE dwPCID = X;` |
| Is this item vnum in item_proto? | `SELECT vnum, name, type FROM item_proto WHERE vnum = N;` |
| Which players are currently online? | `SELECT p.name, a.login FROM player p JOIN account a ON p.account_id = a.id WHERE a.status = 'OK';` |
| Find duplicate vnums in item_proto | `SELECT vnum, COUNT(*) FROM item_proto GROUP BY vnum HAVING COUNT(*) > 1;` |
| Check the most recently modified characters | `SELECT id, name, level, last_play FROM player ORDER BY last_play DESC LIMIT 10;` |

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Starting db before MariaDB is ready | db exits immediately with SQL connection error | Start MariaDB first; wait for it to be fully ready |
| Using `pc.setf` for quest progress | Quest progress lost on logout | Use `pc.setqf` for any flag that must survive logout |
| Forgetting to restart db after `db.conf` changes | db uses old config | Restart db after any `db.conf` change |
| Not checking disk space | MariaDB fails silently; characters not saving | Run `df -h` when characters are mysteriously losing items |
| Regenerating binary proto without restarting game | Server still has old CRC | Restart game process after replacing binary proto files |

---

## Next Steps

- [Fixing Server Errors](troubleshoot-server) — if the game process itself is failing
- [Database & Proto Workflow](guide-Database-Proto) — the complete proto regeneration workflow
- [What are item_proto and mob_proto?](concept-proto) — to understand the two-version problem
