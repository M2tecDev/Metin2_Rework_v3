# Blueprint: Login Flow

> ### 📖 New to this topic?
> This is an advanced reference page. If you are not familiar with the basics yet, read these first:
> - [How Everything Fits Together](concept-architecture)
> - [What is a Packet?](concept-packets)
>
> **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture

> Full-stack architecture blueprint for the complete login sequence — from Python UI credentials entry through encrypted TCP handshake, account DB authentication, TPlayerTable load, to the game phase. Companion to [Login Flow](topic-Login-Flow).

---

## 1. Full-Stack Architecture

The login flow is a multi-phase sequence crossing five layers and two TCP connections.

### Layer 1 — Database / Tables

| File | Table / Class | Role |
|------|--------------|------|
| `account` SQL table | — | Stores account credentials: `id`, `password` (hashed), `status`, `availdt` (ban expiry) |
| `player` SQL table | — | Character slot rows: up to `PLAYER_PER_ACCOUNT=4` rows per account |
| `player_item` SQL table | — | All inventory/equipment items keyed by player ID |
| `server-src/src/common/tables.h` | `TAccountTable` | Packed struct: account ID, `login[32]`, `passwd[32]`, `status[8]`, `TSimplePlayerInformation[4]` |
| `server-src/src/common/tables.h` | `TPlayerTable` | Full character persistent data sent by DB on `GD::PLAYER_LOAD` |
| `server-src/src/common/tables.h` | `TPlayerItem` | Item row struct included with `DG::PLAYER_LOAD_SUCCESS` |
| `server-src/src/common/length.h` | `LOGIN_MAX_LEN=30`, `PASSWD_MAX_LEN=16`, `PLAYER_PER_ACCOUNT=4` | Field width limits; must match packet struct field sizes |

### Layer 2 — Server Game Process (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/desc.h` / `desc.cpp` | `DESC` | Per-connection object: ring buffers, `SecureCipher`, current phase, `TAccountTable` cache |
| `server-src/src/game/desc.cpp` | `DESC::SetPhase(EPhases)` | Swaps active `CInput*` processor; sends `GC::PHASE` to client |
| `server-src/src/game/desc_manager.h` | `DESC_MANAGER::AcceptConnection()` | Accepts new TCP connections from clients; creates `DESC` objects |
| `server-src/src/game/SecureCipher.h` / `SecureCipher.cpp` | `SecureCipher::Initialize()`, `::Encrypt()`, `::Decrypt()` | libsodium X25519 + XSalsa20-Poly1305 key exchange and in-place crypto on ring buffer data |
| `server-src/src/game/input.h` | `CInputHandshake` | Handles `PHASE_HANDSHAKE`: time sync + key challenge/response |
| `server-src/src/game/input_login.cpp` | `CInputLogin::ProcessPacket()` | Handles `PHASE_LOGIN` / `PHASE_SELECT`: dispatches `CG::LOGIN_SECURE`, `CG::CHARACTER_SELECT`, `CG::CHARACTER_CREATE`, `CG::CHARACTER_DELETE` |
| `server-src/src/game/input_login.cpp` | `CInputLogin::LoginPacket()` | Reads `CG::LOGIN_SECURE`; forwards `GD::AUTH_LOGIN` / `GD::LOGIN` to db |
| `server-src/src/game/input_login.cpp` | `CInputLogin::SelectCharacter()` | Reads `CG::CHARACTER_SELECT`; sends `GD::PLAYER_LOAD` to db |
| `server-src/src/game/input_login.cpp` | `CInputLogin::EnterGame()` | Called after `DG::PLAYER_LOAD_SUCCESS`; calls `CHARACTER::MainCharacterPacket()`, transitions to GAME phase |
| `server-src/src/game/char.cpp` | `CHARACTER::Create()`, `::MainCharacterPacket()` | Instantiates in-memory CHARACTER from TPlayerTable; sends full player data to client |
| `server-src/src/game/db.h` / `db.cpp` | `CDBManager::SendPacket()` | Wraps GD/DG channel; all outbound `GD::*` packets go through here |

### Layer 3 — Server DB Process (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/db/ClientManager.cpp` | `CClientManager::ProcessPacket()` | Receives all `GD::*` packets from connected game peers |
| `server-src/src/db/ClientManagerLogin.cpp` | `CClientManager::QUERY_LOGIN()` | Executes async SQL on `account` table to verify credentials |
| `server-src/src/db/ClientManagerLogin.cpp` | `CClientManager::RESULT_LOGIN()` | Processes SQL result; sends `DG::LOGIN_SUCCESS` or `DG::LOGIN_FAILURE` |
| `server-src/src/db/ClientManagerPlayer.cpp` | `CClientManager::QUERY_PLAYER_LOAD()` | SQL query for player row + items + quest state |
| `server-src/src/db/ClientManagerPlayer.cpp` | `CClientManager::RESULT_PLAYER_LOAD()` | Packs `TPlayerTable + TPlayerItem[]` into `DG::PLAYER_LOAD_SUCCESS` |
| `server-src/src/db/Peer.h` / `Peer.cpp` | `CPeer` | One connected game server peer in the db process; owns the GD/DG TCP connection |
| `server-src/src/libsql/` | `CAsyncSQL`, `SQLMsg` | Async MariaDB query queue; results posted back to main thread via message queue |

### Layer 4 — Network Packets (in login-sequence order)

| # | Packet | Header | Direction | Payload Summary |
|---|--------|--------|-----------|----------------|
| 1 | `GC::PHASE(HANDSHAKE)` | `0x0008` | Server→Client | Instructs client to begin key exchange |
| 2 | `GC::KEY_CHALLENGE` | `0x000B` | Server→Client | Server's X25519 public key |
| 3 | `CG::KEY_RESPONSE` | `0x000A` | Client→Server | Client's X25519 public key |
| 4 | `GC::KEY_COMPLETE` | `0x000C` | Server→Client | Key exchange accepted; encryption active |
| 5 | `GC::PHASE(LOGIN)` | `0x0008` | Server→Client | Phase switch to LOGIN |
| 6 | `CG::LOGIN_SECURE` | `0x0103` | Client→Server | `login[30]`, `password[16]` (encrypted) |
| 7 | `GD::AUTH_LOGIN` | `0x9040` | Game→DB | Forwards credentials + descriptor handle to DB |
| 8 | `DG::AUTH_LOGIN` | `0x9137` | DB→Game | Auth result: success or failure code |
| 9 | `GC::AUTH_SUCCESS` | `0x0108` | Server→Client | Account authenticated; sends `TAccountTable` with `TSimplePlayerInformation[4]` |
| 10 | `GC::LOGIN_FAILURE` | `0x0106` | Server→Client | Auth failed; `szStatus[16]` reason string (`"WRONGPWD"`, `"NOTFOUND"`, `"BLOCKED"`) |
| 11 | `GC::PHASE(SELECT)` | `0x0008` | Server→Client | Phase switch to CHARACTER_SELECT |
| 12 | `CG::CHARACTER_SELECT` | `0x0203` | Client→Server | `slot` (0–3) — select this character |
| 13 | `GD::PLAYER_LOAD` | `0x9002` | Game→DB | Account ID + slot index |
| 14 | `DG::PLAYER_LOAD_SUCCESS` | `0x9106` | DB→Game | `TPlayerTable + TPlayerItem[] + quest flags + affects` |
| 15 | `GC::PHASE(LOADING)` | `0x0008` | Server→Client | Phase switch to LOADING |
| 16 | `GC::MAIN_CHARACTER` | `0x0210` | Server→Client | Full player data: VID, job, position, map index |
| 17 | `GC::CHARACTER_ADD` × N | `0x0205` | Server→Client | Nearby actors in view range |
| 18 | `GC::ITEM_SET` × M | `0x0511` | Server→Client | Inventory items (all non-empty slots) |
| 19 | `GC::PLAYER_POINTS` | `0x0214` | Server→Client | Full stat array (255 `EPoints` values) |
| 20 | `GC::PHASE(GAME)` | `0x0008` | Server→Client | Phase switch to GAME; login complete |

### Layer 5 — Client C++

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/UserInterface/PythonNetworkStream.h` | `CPythonNetworkStream` | Singleton TCP client: stores `m_stID`, `m_stPassword`; owns all phase handler maps |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseHandshake.cpp` | `SetHandshakePhase()`, `RecvHandshakePacket()` | Registers handshake handlers; drives key challenge/response |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLogin.cpp` | `SetLoginPhase()`, `RecvLoginSuccessPacket()`, `RecvLoginFailurePacket()` | Registers login handlers; parses `GC::AUTH_SUCCESS` into `TSimplePlayerInformation[4]` |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseSelect.cpp` | `SetSelectPhase()`, `SendSelectCharacterPacket()` | Sends `CG::CHARACTER_SELECT(slot)` |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLoading.cpp` | `SetLoadingPhase()`, `RecvMainCharacterPacket()`, `RecvItemSetPacket()` | Receives all loading-phase packets; populates `CPythonPlayer` |
| `client-src/src/UserInterface/AccountConnector.h` | `CAccountConnector` | Handles optional pre-game auth-server connection (separate TCP socket, separate phase) |

### Layer 6 — Python UI

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/serverinfo.py` | `ServerInfo` | Static server/channel list: IP, port, key; populated with state by `ServerStateChecker` |
| `client-bin/assets/root/networkmodule.py` | `MainStream` | Phase controller: `SetLoginPhase()`, `SetSelectPhase()`, `SetGamePhase()`; owns `LoginWindow`, `SelectWindow`, `GameWindow` |
| `client-bin/assets/root/intrologin.py` | `LoginWindow.OnClickLoginButton()`, `OnConnect()`, `OnLoginSuccess()` | Collects credentials; calls `net.SetLoginInfo()` + `net.Connect()`; handles login success/failure |
| `client-bin/assets/root/introselect.py` | `SelectCharacterWindow.SelectCharacter(slot)` | Calls `net.SendSelectCharacterPacket(slot)` |

---

## 2. Causal Chain

### Full Login — Credentials to In-Game

```
[Trigger]  Player types username + password, clicks "Login"
    │
    ▼  (root/intrologin.py : LoginWindow.OnClickLoginButton)
[1] Reads username, password from edit-box widgets
    self.stream.SetLoginInfo(id, pwd) → net.SetLoginInfo(id, pwd)
    self.stream.Connect(ip, port)     → net.Connect(ip, port)
    ConnectingDialog countdown shown
    │
    ▼  TCP connect to game server (port 11011, 11021, …)
[2] Server DESC created; PHASE_HANDSHAKE begins
    │
    ▼  (game/SecureCipher.cpp : DESC::SendKeyChallenge)
[3] Server sends X25519 public key via GC::KEY_CHALLENGE
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseHandshake.cpp : RecvKeyChallengePacket)
[4] Client generates ephemeral keypair; sends CG::KEY_RESPONSE
    Both sides derive shared XSalsa20-Poly1305 key
    All subsequent bytes encrypted in-place on ring buffer
    │
    ▼  packet: GC::PHASE(LOGIN)
    (UserInterface/PythonNetworkStream.cpp : RecvPhasePacket → SetLoginPhase)
[5] Client registers login-phase handler map
    Python: networkmodule.py MainStream.SetLoginPhase()
    intrologin.py OnConnect() fires → calls net.SendLoginPacket(id, pwd)
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseLogin.cpp : SendLoginPacket)
[6] Builds TPacketCGLoginSecure: header=CG::LOGIN_SECURE(0x0103), login[30], password[16]
    Encrypt + send
    │
    ▼  packet: CG::LOGIN_SECURE (0x0103)
[7] (game/input_login.cpp : CInputLogin::LoginPacket)
    Extracts login, password, client IP
    Sends GD::AUTH_LOGIN to db via CDBManager::SendPacket()
    │
    ▼  (db/ClientManagerLogin.cpp : CClientManager::QUERY_LOGIN)
[8] SELECT id,password,status,availdt FROM account WHERE login='X'
    SQL executes via libsql async queue
    │
    ▼  SQL result arrives
[9] (db/ClientManagerLogin.cpp : CClientManager::RESULT_LOGIN)
    if wrong_password → DG::LOGIN_WRONG_PASSWD → GC::LOGIN_FAILURE("WRONGPWD")
    if banned         → DG::LOGIN_ALREADY      → GC::LOGIN_FAILURE("BLOCKED")
    if OK:
      Populate TAccountTable with TSimplePlayerInformation[4]
      Send DG::AUTH_LOGIN → game process
    │
    ▼  (game/input_login.cpp : handles DG::AUTH_LOGIN response)
[10] Stores TAccountTable in DESC
     Sends GC::AUTH_SUCCESS + GC::PHASE(SELECT) to client
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseLogin.cpp : RecvLoginSuccessPacket)
[11] Parses TSimplePlayerInformation[4] (name, level, job, etc.)
     Fires Python callback: intrologin.py OnLoginSuccess()
     networkmodule.py SetSelectPhase() → opens introselect.py
    │
    ▼  Player clicks character slot in introselect.py
    (root/introselect.py : SelectCharacterWindow.SelectCharacter(slot=0))
[12] Calls net.SendSelectCharacterPacket(slot)
     │
    ▼  packet: CG::CHARACTER_SELECT (0x0203)
[13] (game/input_login.cpp : CInputLogin::SelectCharacter)
     Sends GD::PLAYER_LOAD (account_id, slot) to db
    │
    ▼  (db/ClientManagerPlayer.cpp : QUERY_PLAYER_LOAD → RESULT_PLAYER_LOAD)
[14] SQL: SELECT from player + player_item + quest state + affects
     Packs into TPlayerTable + TPlayerItem[] array
     Sends DG::PLAYER_LOAD_SUCCESS
    │
    ▼  (game/input_login.cpp : CInputLogin::EnterGame)
[15] CHARACTER::Create() from TPlayerTable
     CHARACTER::Show(mapIndex, x, y) → inserted into SECTREE
     CHARACTER::MainCharacterPacket() → sends GC::MAIN_CHARACTER
     GC::CHARACTER_ADD × N (nearby actors)
     GC::ITEM_SET × M (inventory)
     GC::PLAYER_POINTS (all stats)
     GC::PHASE(GAME) sent last
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseLoading.cpp → SetGamePhase)
[16] CPythonPlayer populated; CPythonNetworkStream::SetGamePhase()
     Python: networkmodule.py SetGamePhase() → opens game.py GameWindow
    │
    ▼  [End] Player is in-game; all UI windows initialised with live data
```

---

## 3. Dependency Matrix

### Sync Points

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `TPacketCGLoginSecure` layout (`login[30]`, `password[16]`, `#pragma pack(1)`) | `game/packet_structs.h` | `UserInterface/Packet.h` | Server reads wrong password bytes → auth always fails |
| `LOGIN_MAX_LEN=30`, `PASSWD_MAX_LEN=16` | `common/length.h` | `UserInterface/Packet.h` field sizes | Field overflow: if client sends 31-char username, server reads garbage after the field |
| `TAccountTable` binary layout (`TSimplePlayerInformation[4]`) | `common/tables.h` | `common/tables.h` (shared header) | `GC::AUTH_SUCCESS` delivers wrong character-slot names/levels to client |
| `TSimplePlayerInformation` struct layout (name, level, job, shape, …) | `common/tables.h` | `common/tables.h` (shared) | Character select shows wrong name or level for each slot |
| `TPlayerTable` binary layout (all 164+ fields) | `common/tables.h` | `common/tables.h` (shared) | `DG::PLAYER_LOAD_SUCCESS` delivers wrong level/HP/position; character spawns at (0,0) or dead |
| `GC::LOGIN_FAILURE.szStatus[16]` reason strings (`"WRONGPWD"`, `"NOTFOUND"`, …) | `db/ClientManagerLogin.cpp` (strings) | `root/intrologin.py` (if-chains on status string) | Python shows "Unknown error" instead of the correct localised message |
| `PLAYER_PER_ACCOUNT=4` | `common/length.h` | `UserInterface/PythonNetworkStreamPhaseLogin.cpp` (loop bound) | Client shows wrong number of character slots; 5th character silently ignored |
| `GD_FRAME_HEADER_SIZE=10` (GD/DG header) | `common/packet_headers.h` | `db/Peer.cpp` read logic | DB reads payload at wrong offset → every GD/DG packet corrupted |
| `EPhases` enum values (HANDSHAKE=1, LOGIN=2, SELECT=3, LOADING=4, GAME=5) | `common/packet_headers.h` | `UserInterface/PythonNetworkStream.h` (phase switch) | Phase switch fires wrong handler map; client stuck in wrong phase |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| `LOGIN_MAX_LEN` | 30 | `common/length.h` | Username longer than 30 chars silently truncated; login fails if DB has the full-length name |
| `PASSWD_MAX_LEN` | 16 | `common/length.h` | Password truncated at 16 chars; authentication may succeed with a partial password match |
| `PLAYER_PER_ACCOUNT` | 4 | `common/length.h` | `GC::AUTH_SUCCESS` sends exactly 4 `TSimplePlayerInformation` entries; 5th character requires resizing the packet |
| `TAccountTable.players[4]` array | 4 entries × `sizeof(TSimplePlayerInformation)` | `common/tables.h` | Struct is fixed-size binary; adding a 5th slot requires changing the struct and recompiling both game and db |
| `PLAYER_DELETE_LIMIT_TIME` | 7 days | `server-src/game/config.h` or equivalent | Grace period before a deleted character is permanently removed; configurable server-side |
| `CHARACTER_NAME_MAX_LEN` | 64 | `common/length.h` | Character names longer than 64 bytes are rejected at creation; DB column must match this limit |

---

## 4. Extension How-To

### How to add a new login failure reason

1. **`server-src/src/db/ClientManagerLogin.cpp`** — Add detection logic in `RESULT_LOGIN()` and send the new reason string:
   ```cpp
   if (new_failure_condition) {
       SendLoginFailure(peer, handle, "MYREASON");
       return;
   }
   ```
   The `szStatus` field is 16 bytes — keep the reason string ≤ 15 characters + null terminator.
2. **`client-bin/assets/root/intrologin.py`** — Handle the new reason in `OnLoginFailure(reason)`:
   ```python
   elif reason == "MYREASON":
       self.ShowError(localeInfo.LOGIN_FAILURE_MYREASON)
   ```
3. **`client-bin/assets/root/localeInfo.py`** — Add the localised string:
   ```python
   LOGIN_FAILURE_MYREASON = "Account locked by administrator."
   ```

### How to add a 5th character slot per account

1. **`server-src/src/common/length.h`** — Change `PLAYER_PER_ACCOUNT = 5`.
2. **`server-src/src/common/tables.h`** — Resize `TAccountTable.players[PLAYER_PER_ACCOUNT]`. This changes the `sizeof(TAccountTable)` and thus the GD/DG wire format — **every consumer must be recompiled**.
3. **`server-src/src/db/ClientManagerLogin.cpp`** — `RESULT_LOGIN` loop now iterates 5 slots.
4. **`client-src/src/UserInterface/PythonNetworkStreamPhaseLogin.cpp`** — Update the `RecvLoginSuccessPacket` loop bound to 5.
5. **`client-bin/assets/root/introselect.py`** — Add a 5th character slot widget.
6. **`client-bin/assets/uiscript/uiscript/selectcharacter.py`** — Add the 5th slot UI element.
7. **DB schema** — Confirm the `player` table `account_id` + slot uniqueness constraint allows slot index 4.

### How to change the port numbering scheme

1. **`server-src/src/game/config.h`** or the server configuration file — Change `CH1_PORT`, `CH2_PORT`, etc.
2. **`client-bin/assets/root/serverinfo.py`** — Update `tcp_port` values in every channel dict entry.
3. Firewall rules must be updated on the server host.

### Controlling Constants

| Constant | File | Controls |
|----------|------|---------|
| `LOGIN_MAX_LEN`, `PASSWD_MAX_LEN` | `common/length.h` | Username and password field widths in `TPacketCGLoginSecure` |
| `PLAYER_PER_ACCOUNT` | `common/length.h` | Number of character slots; size of `TAccountTable.players[]` |
| `CHARACTER_NAME_MAX_LEN` | `common/length.h` | Maximum character name length |
| `EPhases` values | `common/packet_headers.h` | Phase constants sent in `GC::PHASE` payload |
| `GD::AUTH_LOGIN` / `DG::AUTH_LOGIN` | `common/packet_headers.h` | Header constants for the auth pathway GD/DG packets |
| `GC::LOGIN_FAILURE.szStatus` strings | `db/ClientManagerLogin.cpp` | Reason strings matched in Python `OnLoginFailure()` |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| Client connects but immediately disconnects during handshake | `SecureCipher::Initialize()` failed; libsodium mismatch | `game/SecureCipher.cpp` : `Initialize()` return value; `sys_err` for "key exchange failed" |
| `GC::LOGIN_FAILURE("WRONGPWD")` even with correct credentials | Password hash algorithm mismatch between client and DB | `db/ClientManagerLogin.cpp` : `RESULT_LOGIN()` — compare the hash/compare function with how the client sends the password |
| `GC::LOGIN_FAILURE("NOTFOUND")` | Account doesn't exist in DB; username truncated | Check `account` table for the username; check `LOGIN_MAX_LEN` vs the actual username length |
| Character select shows empty slots after successful login | `TSimplePlayerInformation.name` is empty; `QUERY_PLAYER_LOAD` returned 0 rows | `db/ClientManagerLogin.cpp` : `RESULT_LOGIN()` SQL query; verify `player` table has rows for this account |
| Client freezes on character select, never enters LOADING | `GD::PLAYER_LOAD` sent but `DG::PLAYER_LOAD_SUCCESS` never arrived | Check `db/ClientManagerPlayer.cpp` `QUERY_PLAYER_LOAD()` for SQL errors; check `sys_err` in db process |
| Character spawns at (0, 0) | `TPlayerTable.lMapIndex`, `lX`, `lY` are 0 in DB | Check `player` table row for the character; `CHARACTER::MainCharacterPacket()` sends these values |
| All stats are 0 after entering game | `GC::PLAYER_POINTS` not sent, or `TPlayerTable` stat fields are 0 | `game/char.cpp` : `CHARACTER::MainCharacterPacket()` — confirm `GC::PLAYER_POINTS` send; check DB row |
| `sys_err: CInputLogin: phase SELECT cannot handle CG::MOVE` | Client sends movement packet before PHASE_GAME is active | `game/input_login.cpp` : phase gating; client is sending game packets too early — check `SetSelectPhase()` handler map |
| Login succeeds but second login from same account kicks first | `DESC::DisconnectOfSameLogin()` working as designed | Expected behaviour; if not wanted: disable `DisconnectOfSameLogin()` in `game/desc.cpp` |
| `sys_err: db: QUERY_LOGIN: SQL error` | MariaDB connection lost or account table schema changed | Check `db/syserr.txt`; verify MariaDB is running; check column names match the SELECT query |

---

## Related

- **Topic page:** [Login Flow](topic-Login-Flow) — complete step-by-step narrative with all intermediate states
- **Blueprint:** [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) — all packet headers, GD/DG framing, phase constants
- **Blueprint:** [blueprint-Character-System](blueprint-Character-System) — `TPlayerTable`, `CHARACTER::Create()`, `MainCharacterPacket()`
- **Blueprint:** [blueprint-UI-Python-System](blueprint-UI-Python-System) — `intrologin.py`, `networkmodule.py`, phase callback mechanism
