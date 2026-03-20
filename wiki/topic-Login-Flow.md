# Login Flow

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [What is a Packet?](concept-packets)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> End-to-end walkthrough of the complete Metin2 login sequence: from the player clicking the Login button in the Python UI to the character select screen appearing.

## Overview

The Metin2 login flow spans all three repositories and involves five distinct layers: the Python UI scripts (`client-bin`), the C++ network stream (`client-src`), the game server's login input processor (`server-src/game`), the database server's authentication layer (`server-src/db`), and the shared packet definitions (`server-src/common`). A single player login involves two separate TCP connections (an optional auth-server connection and the main game-server connection), a libsodium-based handshake phase for encrypted communication, a synchronous account credential check against MariaDB, and a multi-step packet exchange that ends when the client transitions to the character-select phase.

---

## Step-by-Step Flow

### Phase 0 — Server List Population (before the player does anything)

**1.** `ServerStateChecker` (`client-src/UserInterface/ServerStateChecker.h`) is started when `LoginWindow.Open()` is called in `intrologin.py`. It polls each channel entry from `serverinfo.py` via a lightweight TCP probe and updates the `"state"` field of each channel dict with `"NORM"`, `"BUSY"`, or `"FULL"` so the player can see live server load.

**2.** `serverinfo.py` (`client-bin/assets/root/serverinfo.py`) defines the static server list. Each channel entry carries:
```python
{
    "key": int,        # unique channel key (e.g. 11 = server 1, channel 1)
    "name": str,       # display name ("CH1")
    "ip": str,         # server IP
    "tcp_port": int,   # TCP port (11011 / 11021 / 11031 / 11041)
    "udp_port": int,   # unused in current build
    "state": str,      # "..." → filled by ServerStateChecker at runtime
}
```

Two server entries are defined: a production server at `178.18.255.214` and a test server at `127.0.0.1`. Each has up to four channels.

---

### Phase 1 — Player Enters Credentials and Clicks Login

**3.** `LoginWindow.__init__()` (`intrologin.py`) registers the window with the `net` Python module (the C-extension binding to `CPythonNetworkStream`) and sets up all callback slots: `OnConnect`, `OnLoginSuccess`, `OnLoginFailure`.

**4.** `LoginWindow.OnClickLoginButton()` (`intrologin.py`) is triggered. It reads the username and password from the UI edit-box widgets. If `IsLoginDelay()` is true (`LOGIN_DELAY_SEC > 0`), it arms a countdown timer and defers the actual connection; otherwise it proceeds immediately. It then calls:
```python
self.stream.SetLoginInfo(id, pwd)
self.stream.Connect()
```

**5.** `MainStream.SetLoginInfo(id, pwd)` (`networkmodule.py`) stores the credentials locally and forwards them to the C++ layer:
```python
net.SetLoginInfo(id, pwd)
```

**6.** `CPythonNetworkStream::SetLoginInfo(id, password)` (`UserInterface/PythonNetworkStream.h`) stores `id` in `m_stID` and `password` in `m_stPassword` for use when the handshake completes.

**7.** `MainStream.Connect()` (`networkmodule.py`) calls `net.Connect(addr, port)` using the IP/port stored from `MainStream.SetConnectInfo()`, which was populated when the player selected a channel. A `ConnectingDialog` countdown dialog appears.

---

### Phase 2 — TCP Connection and Handshake

**8.** `CPythonNetworkStream::ConnectLoginServer(addr, port)` (`client-src/UserInterface/PythonNetworkStream.h`) opens a TCP socket to the selected game server channel. On success the stream enters `PHASE_HANDSHAKE`.

**9.** `CInputHandshake` (`server-src/game/input.h`) handles the handshake phase on the server side. This phase synchronises the client and server clocks, and drives the libsodium X25519 key exchange:

- The server (`DESC::SendKeyChallenge()`) sends its public key.
- The client verifies and responds with its own public key.
- `DESC::HandleKeyResponse(client_pk, response)` verifies the client's response and activates `m_secureCipher` (XSalsa20-Poly1305).

After the handshake succeeds the server transitions the `DESC` to `PHASE_LOGIN` and the client's `CPythonNetworkStream` switches to its login-phase handler map via `SetLoginPhase()`.

**10.** `CPythonNetworkStream::OnProcess()` runs each frame and dispatches packets via the active `m_loginHandlers` map now that the login phase is active.

---

### Phase 3 — Login Packet (Client → Game Server)

**11.** `LoginWindow.OnConnect()` (`intrologin.py`) fires as the network-event callback when the TCP connection succeeds. It calls into the C++ layer to transmit the login packet:
```python
net.SendLoginPacket(id, pwd)
```

**12.** `CPythonNetworkStream` constructs and sends a `CG::LOGIN_SECURE` packet over the now-encrypted channel.

**Packet: `CG::LOGIN_SECURE`**

| Field | Type | Description |
|-------|------|-------------|
| header | `uint16_t` | `CG::LOGIN_SECURE` |
| length | `uint16_t` | total packet size |
| login | `char[LOGIN_MAX_LEN]` | null-terminated account username |
| password | `char[PASSWD_MAX_LEN]` | null-terminated password (hashed or plaintext depending on build) |

Framing: `[header:2][length:2][payload…]` — standard CG/GC frame format.

---

### Phase 4 — Game Server Validates and Forwards to DB

**13.** `CInputLogin::ProcessPacket()` (`server-src/game/input_login.cpp`) reads the `CG::LOGIN_SECURE` packet from the descriptor's input ring buffer. It extracts the username and password and constructs a `GD::LOGIN` request.

**14.** `CInputLogin` calls `CDBManager::SendPacket()` which writes a `GD::LOGIN` packet (or equivalent `GD::AUTH_LOGIN` for the auth-server path) to the GD/DG TCP channel maintained by `CDBManager` (`server-src/game/db.h`).

**Packet: `GD::LOGIN` (Game → DB)**

| Field | Type | Description |
|-------|------|-------------|
| header | `uint16_t` | `GD::LOGIN` |
| handle | `uint32_t` | descriptor handle for correlating the async response |
| size | `uint32_t` | payload byte count |
| login | `char[LOGIN_MAX_LEN]` | account username |
| password | `char[PASSWD_MAX_LEN]` | password to verify |
| ip | `char[MAX_HOST_LENGTH]` | client IP address (for ban and duplicate-login checks) |

GD/DG framing: `[header:2][handle:4][size:4][payload…]` — 10-byte frame overhead.

---

### Phase 5 — DB Server Authenticates

**15.** `CClientManager::ProcessPackets(peer)` (`server-src/db/ClientManager.cpp`) receives the `GD::LOGIN` packet on the connected `CPeer` representing this game server.

**16.** `CClientManager::QUERY_LOGIN()` (`server-src/db/ClientManagerLogin.cpp`) issues an async MariaDB query against the `account` table:

```sql
SELECT id, password, status, availdt
FROM account
WHERE login = '<username>'
```

The account status field encodes ban state. `availdt` is a datetime field used for temporary bans.

**17.** `CClientManager::RESULT_LOGIN()` is called when `CDBManager::PopResult()` returns the query result. The function:

- Verifies the password hash matches the stored hash.
- Checks `status` is not `'BLOCK'` (permanent ban) or `'QUIT'`.
- Checks `availdt` — if in the future, the account is temporarily banned.
- Checks `m_map_kLogonAccount` for duplicate logins (same account already online).
- On success, allocates a `CLoginData` session object with the account ID, login key, and the four character slot player-IDs, and registers it in `m_map_pkLoginData`.

**18.** DB sends `DG::LOGIN_SUCCESS` or `DG::LOGIN_FAILURE` back to the game server.

**Packet: `DG::LOGIN_SUCCESS` (DB → Game)**

| Field | Type | Description |
|-------|------|-------------|
| header | `uint16_t` | `DG::LOGIN_SUCCESS` |
| handle | `uint32_t` | original descriptor handle |
| size | `uint32_t` | payload size |
| dwLoginKey | `DWORD` | session login key (random token) |
| account_id | `DWORD` | database account ID |
| player_id[4] | `DWORD[4]` | persistent player IDs for each character slot |
| login | `char[LOGIN_MAX_LEN]` | confirmed username (echo) |

**Packet: `DG::LOGIN_FAILURE` (DB → Game)**

| Field | Type | Description |
|-------|------|-------------|
| header | `uint16_t` | `DG::LOGIN_FAILURE` |
| handle | `uint32_t` | original descriptor handle |
| size | `uint32_t` | payload size |
| szStatus | `char[8]` | failure code string (see Error Handling section) |

---

### Phase 6 — Game Server Replies to Client

**19.** `CInputDB` (`server-src/game/input.h`) on the game server receives the `DG::LOGIN_SUCCESS` packet. The game server:

- Stores the login key in the matching `DESC` via a lookup by handle.
- Sets `desc->m_accountTable` with account ID and player IDs.
- Calls `desc->SetPhase(PHASE_SELECT)` to advance the descriptor to character-select phase and swap in the `CInputLogin` → select-phase input processor.

**20.** The game server then sends `GC::LOGIN_SUCCESS` (also called `GC_LOGIN_SUCCESS3` or variant `4` depending on packet version) to the client.

**Packet: `GC::LOGIN_SUCCESS` (Game → Client)**

| Field | Type | Description |
|-------|------|-------------|
| header | `uint16_t` | `GC::LOGIN_SUCCESS` (or versioned variant) |
| length | `uint16_t` | total packet size |
| dwLoginKey | `DWORD` | session login key (echoed from DB) |
| akSimplePlayerInfo[4] | `TSimplePlayerInformation[4]` | summary of each character slot |

`TSimplePlayerInformation` (one per slot):

| Field | Type | Description |
|-------|------|-------------|
| dwID | `DWORD` | player DB ID (0 = empty slot) |
| szName | `char[CHARACTER_NAME_MAX_LEN]` | character name |
| byJob | `BYTE` | job class (`JOB_WARRIOR`, `JOB_ASSASSIN`, `JOB_SURA`, `JOB_SHAMAN`) |
| byLevel | `BYTE` | character level |
| dwPlayMinutes | `DWORD` | total played time in minutes |
| byST/boDEX/byHT/byIQ | `BYTE` | base stats |
| wMainPart | `WORD` | equipped weapon/armour vnum (for 3-D preview) |
| byHair | `BYTE` | hair style index |
| wHairPart | `WORD` | hair item vnum (for 3-D preview) |
| x / y | `long` | last map position |
| lAddr | `long` | game server IP (network byte order) |
| wPort | `WORD` | game server port for this slot |
| byEmpire | `BYTE` | empire ID (1 = Shinsoo, 2 = Chunjo, 3 = Jinno) |

---

### Phase 7 — Client Processes Success and Transitions Phase

**21.** `CPythonNetworkStream::__RecvLoginSuccessPacket3()` (or `4`) (`client-src/UserInterface/PythonNetworkStreamPhaseLogin.cpp`) is dispatched by the login-phase handler map. It:

- Stores `dwLoginKey` via `SetLoginKey()` into `m_dwLoginKey`.
- Populates `m_akSimplePlayerInfo[4]` with the four slot summaries.
- Calls the Python handler `OnLoginSuccess()`.

**22.** `LoginWindow.OnLoginSuccess()` (`intrologin.py`) closes the connecting dialog and calls `self.stream.SetSelectEmpirePhase()` or `self.stream.SetSelectCharacterPhase()` depending on whether the player has already chosen an empire.

**23.** `MainStream.SetSelectCharacterPhase()` (`networkmodule.py`) loads locale data and calls `self.SetPhaseWindow(introSelect.SelectCharacterWindow(self))`.

**24.** `MainStream.SetPhaseWindow(newPhaseWindow)` drives a fade-out / fade-in curtain transition, closes `LoginWindow`, and opens `SelectCharacterWindow`. The character select screen is now displayed with up to four character slots populated from `m_akSimplePlayerInfo`.

---

## Sequence Diagram

```
Python UI         C++ Client               Game Server           DB Server
(intrologin.py)   (CPythonNetworkStream)   (game process)        (db process)
     |                    |                      |                     |
     |-- OnClickLogin --> |                      |                     |
     |   SetLoginInfo()   |                      |                     |
     |   Connect()        |                      |                     |
     |                    |--- TCP connect ------>|                     |
     |                    |<-- HANDSHAKE phase ---|                     |
     |                    |   (key exchange,      |                     |
     |                    |    libsodium cipher)  |                     |
     |                    |--- HANDSHAKE ACK ---->|                     |
     |<-- OnConnect() ----|                      |                     |
     |                    |                      |                     |
     |                    |=CG::LOGIN_SECURE=====>|                     |
     |                    |  (username, password) |                     |
     |                    |                      |--GD::LOGIN---------->|
     |                    |                      |  (username, pw, ip)  |
     |                    |                      |                     |-- SQL query -->
     |                    |                      |                     |  account table
     |                    |                      |                     |<-- SQL result -
     |                    |                      |<--DG::LOGIN_SUCCESS--|
     |                    |                      |  (login key,         |
     |                    |                      |   player IDs)        |
     |                    |                      | SetPhase(SELECT)     |
     |                    |<=GC::LOGIN_SUCCESS====|                     |
     |                    |  (login key,          |                     |
     |                    |   4x TSimplePlayerInfo)|                    |
     |<-- OnLoginSuccess--|                      |                     |
     |  SetSelectCharPhase|                      |                     |
     |  → SelectCharWnd   |                      |                     |
     |  (character list)  |                      |                     |
```

---

## Packet Details

### Summary Table

| Packet | Direction | Trigger | Key Fields |
|--------|-----------|---------|------------|
| `CG::LOGIN_SECURE` | Client → Game | Player clicks Login | username, password |
| `GD::LOGIN` | Game → DB | Game receives CG login | username, password, client IP, descriptor handle |
| `DG::LOGIN_SUCCESS` | DB → Game | Auth succeeds | login key, account ID, player IDs[4] |
| `DG::LOGIN_FAILURE` | DB → Game | Auth fails | failure code string |
| `GC::LOGIN_SUCCESS` | Game → Client | Game receives DG success | login key, TSimplePlayerInfo[4] |
| `GC::LOGIN_FAILURE` | Game → Client | Game receives DG failure | failure code string |

### Packet Framing

**CG / GC (client ↔ game server):**
```
[header : uint16_t][length : uint16_t][payload : length - 4 bytes]
```

**GD / DG (game server ↔ db server):**
```
[header : uint16_t][handle : uint32_t][size : uint32_t][payload : size bytes]
```

The `handle` field is the descriptor handle from `DESC_MANAGER` and is used to correlate asynchronous DB responses back to the originating client connection.

---

## Authentication

### Credential Storage

Passwords are stored in the `account` table in MariaDB. The exact hashing scheme is applied before comparison in `RESULT_LOGIN` inside `ClientManagerLogin.cpp`.

### Duplicate Login Detection

`CClientManager::m_map_kLogonAccount` (type `TLogonAccountMap`) maps account IDs to currently-online session records. On every `QUERY_LOGIN`, the DB server checks this map. If the account is already present, `DisconnectOfSameLogin()` is called on the existing descriptor before the new session is established. The existing client receives a forced logout; the Python UI handles this via `MainStream.SameLogin_SetLoginPhase()` which re-opens the login window with a notification.

### Session Login Key

When authentication succeeds, the DB server generates a random `DWORD` login key (`dwLoginKey`) which is:
1. Stored in the `CLoginData` session object in the DB server.
2. Echoed to the game server in `DG::LOGIN_SUCCESS`.
3. Forwarded to the client in `GC::LOGIN_SUCCESS`.
4. Stored by the client in `CPythonNetworkStream::m_dwLoginKey`.
5. Referenced in subsequent character-select and game-entry packets to prevent session hijacking.

### Account Table Fields Used

| Column | Type | Purpose |
|--------|------|---------|
| `login` | `varchar` | Account username |
| `password` | `varchar` | Hashed password |
| `status` | `enum/varchar` | `'OK'`, `'BLOCK'`, `'QUIT'` |
| `availdt` | `datetime` | Temporary ban expiry timestamp |
| `id` | `int` | Account ID (used as `AID`) |

---

## Error Handling

### Wrong Password / Account Not Found

`RESULT_LOGIN` returns a failure. DB sends `DG::LOGIN_FAILURE` with `szStatus = "WRONGPWD"` or `"NOTEXIST"`. The game server forwards this as `GC::LOGIN_FAILURE` to the client.

`CPythonNetworkStream::__RecvLoginFailurePacket()` receives the packet and calls the Python handler `OnLoginFailure(failureCode)`.

`LoginWindow.OnLoginFailure(failureCode)` (`intrologin.py`) looks up the code in a pre-built failure message dictionary and displays a `PopupDialog` (`networkmodule.py`) with the localised error string. The player remains on the login screen.

### Permanently Banned Account

`status = 'BLOCK'` in the account table. DB returns `szStatus = "BLOCK"`. The Python UI displays a ban notification popup. The player cannot proceed.

### Temporarily Banned Account

`availdt` is a future datetime. DB returns `szStatus = "BLOCK"` (same code) or a time-specific code. Displayed as a ban message with no ability to log in until the ban expires.

### Account Already Online (Duplicate Login)

DB detects the account ID in `m_map_kLogonAccount`. DB calls `ForwardPacket()` to the game server that currently holds the session to force-disconnect the existing client. That client's `DESC` calls `DelayedDisconnect()`, the existing session is torn down, and `MainStream.SameLogin_SetLoginPhase()` opens the login window again on that client. The new login attempt proceeds as normal after the old session is cleared.

### Server Full

`ServerStateChecker` marks the channel state as `"FULL"` (state value `3` from `STATE_DICT`). `LoginWindow.__SetupServerBoard()` renders the channel as full in the UI. The login button may be disabled or the player sees the "FULL" status. If the player attempts to connect anyway and the server is at capacity, the game server may reject the connection at the TCP level or during handshake.

### Connection Timeout

`ConnectingDialog` (`intrologin.py`) runs a countdown timer. When the countdown expires, `OnUpdate()` fires the time-over event, which closes the dialog and reverts the UI to the idle login state. The player can retry.

### Network Disconnect During Login

If the TCP connection drops at any point, `CPythonNetworkStream::SetOffLinePhase()` is called. The Python handler `OnDisconnect()` fires. `MainStream.SetLoginPhase()` disconnects and transitions back to `LoginWindow`, which re-opens the login UI.

---

## Key Files

| File | Repo | Role |
|------|------|------|
| `client-bin/assets/root/intrologin.py` | client-bin | Login screen UI: credential input, button handlers, failure/success callbacks, connecting dialog |
| `client-bin/assets/root/networkmodule.py` | client-bin | `MainStream`: phase controller, `SetLoginInfo()`, `Connect()`, `SetSelectCharacterPhase()`, `PopupDialog` |
| `client-bin/assets/root/serverinfo.py` | client-bin | Static server/channel list: IPs, ports, auth-server addresses |
| `client-src/UserInterface/PythonNetworkStream.h` | client-src | `CPythonNetworkStream`: stores credentials (`m_stID`, `m_stPassword`, `m_dwLoginKey`), phase handler maps, `SetLoginPhase()` |
| `client-src/UserInterface/PythonNetworkStreamPhaseLogin.cpp` | client-src | Login-phase packet handlers: `__RecvLoginSuccessPacket3/4()`, `__RecvLoginFailurePacket()` |
| `client-src/UserInterface/AccountConnector.h/.cpp` | client-src | `CAccountConnector`: optional pre-auth server connection path |
| `client-src/UserInterface/ServerStateChecker.h/.cpp` | client-src | Polls channel status at login time to populate server load display |
| `server-src/src/game/input.h` | server-src | Declares `CInputHandshake`, `CInputLogin` — phase-specific packet parsers on the game server |
| `server-src/src/game/input_login.cpp` | server-src | `CInputLogin::ProcessPacket()`: parses `CG::LOGIN_SECURE`, forwards `GD::LOGIN` to db process |
| `server-src/src/game/desc.h` | server-src | `DESC`: per-connection state (`m_iPhase`, `m_accountTable`, `m_secureCipher`), `SetPhase()`, `SendKeyChallenge()` |
| `server-src/src/game/SecureCipher.h/.cpp` | server-src | libsodium X25519 key exchange + XSalsa20-Poly1305 session cipher for encrypted client connections |
| `server-src/src/game/db.h` / `db.cpp` | server-src | `CDBManager`: wraps the GD/DG TCP channel; `SendPacket()` forwards login requests to db process |
| `server-src/src/db/ClientManager.h` | server-src | `CClientManager`: central db singleton; owns `m_map_kLogonAccount`, `m_map_pkLoginData` |
| `server-src/src/db/ClientManagerLogin.cpp` | server-src | `QUERY_LOGIN()`, `RESULT_LOGIN()`: executes MariaDB auth query, constructs `CLoginData`, sends `DG::LOGIN_SUCCESS/FAILURE` |
| `server-src/src/db/LoginData.h` | server-src | `CLoginData`: transient per-session struct (login key, AID, player IDs, IP) |
| `server-src/src/common/packet_headers.h` | server-src | Defines `CG::LOGIN_SECURE`, `GC::LOGIN_SUCCESS`, `GD::LOGIN`, `DG::LOGIN_SUCCESS`, `DG::LOGIN_FAILURE`, all phase constants |
| `server-src/src/common/tables.h` | server-src | `TAccountTable`, `TSimplePlayerInformation` structs serialised in login packets |
