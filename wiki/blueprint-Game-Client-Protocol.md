# Blueprint: Game–Client Protocol

> Full-stack architecture blueprint for the binary TCP protocol connecting the Metin2 client to the game server. Covers wire format, dispatcher internals, phase enforcement, cross-channel routing, and extension how-tos. Companion to [Game–Client Protocol](topic-Game-Client-Protocol).

---

## 1. Full-Stack Architecture

The protocol stack spans five layers: Python UI → C++ client network → encrypted TCP wire → C++ server dispatch → db/P2P back-channels.

### Layer 1 — Wire Format Definition

| File | Class / Constant | Role |
|------|-----------------|------|
| `server-src/src/common/packet_headers.h` | `CG::`, `GC::`, `GG::`, `GD::`, `DG::` namespaces | **Canonical source** of all `uint16_t` packet header constants for all five namespaces |
| `server-src/src/common/packet_headers.h` | `PACKET_HEADER_SIZE = 4`, `GD_FRAME_HEADER_SIZE = 10` | Minimum frame sizes for CG/GC vs GD/DG framing |
| `server-src/src/common/packet_headers.h` | `EPhases` enum | 11 phase constants used by `GC::PHASE` payload |
| `server-src/src/game/packet_structs.h` | `TPacketCGAttack`, `TPacketGCChat`, `TPacketGCItemSet`, … | All concrete payload structs with `#pragma pack(1)` |
| `server-src/src/common/tables.h` | `TPlayerTable`, `TItemTable`, `TMobTable`, `TGuildTable`, … | Large binary structs exchanged over the GD/DG internal channel |
| `client-src/src/UserInterface/Packet.h` | Client-side mirror of `packet_structs.h` | Must stay byte-identical with the server version |

### Layer 2 — Server Dispatcher (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/desc.h` / `desc.cpp` | `DESC::ProcessInput()` | Per-connection entry point; routes bytes to the phase-correct `CInput*` processor |
| `server-src/src/game/desc.cpp` | `DESC::SetPhase(EPhases)` | Swaps the active input processor; enforces phase gating |
| `server-src/src/game/desc_manager.h` | `DESC_MANAGER::AcceptConnection()` | Accepts new TCP connections, creates `DESC` objects |
| `server-src/src/game/input.h` | `CInputHandshake`, `CInputLogin`, `CInputMain`, `CInputDB` | Abstract base + concrete processors for each phase |
| `server-src/src/game/input_login.cpp` | `CInputLogin::ProcessPacket()` | Handles `CG::LOGIN_SECURE`, `CG::PLAYER_SELECT`, `CG::PLAYER_CREATE`, `CG::PLAYER_DELETE` |
| `server-src/src/game/input_main.cpp` | `CInputMain::ProcessPacket()` | Master in-game dispatcher; ~50 handler functions for PHASE_GAME/PHASE_DEAD packets |
| `server-src/src/game/SecureCipher.h` / `SecureCipher.cpp` | `SecureCipher::Encrypt()`, `::Decrypt()` | libsodium X25519 + XSalsa20-Poly1305 in-place en/decryption on ring-buffer data |
| `server-src/src/libthecore/ring_buffer.h` | `RingBuffer` | Growable byte buffer for all network I/O; enables in-place crypto via `DataAt(pos)` |
| `server-src/src/libthecore/fdwatch.h` | `fdwatch_*` | I/O multiplexer (kqueue/select) that drives the server's 40-pulse/s event loop |

### Layer 3 — Server Logic (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/char.h` / `char.cpp` | `CHARACTER` | Central actor class; `Move()`, `Damage()`, `UseSkill()`, `PickupItem()` called from input handlers |
| `server-src/src/game/char_battle.cpp` | `battle_melee_attack()`, `CalcMeleeDamage()` | Combat resolution invoked from `CInputMain::Attack()` |
| `server-src/src/game/char_item.cpp` | `CHARACTER::PickupItem()`, `UseItemEx()`, `DropItem()` | Item action handlers invoked from `CInputMain::Item*()` |
| `server-src/src/game/db.h` / `db.cpp` | `CDBManager::SendPacket()` | Wraps the GD/DG channel; all outbound `GD::*` packets go through here |
| `server-src/src/game/p2p.h` / `p2p.cpp` | `P2PManager` | Manages GG connections between game server instances on different channels |
| `server-src/src/db/ClientManager.cpp` | `CClientManager::ProcessPacket()` | DB-side dispatcher for all `GD::*` inbound packets |
| `server-src/src/db/ClientManagerLogin.cpp` | `CClientManager::QUERY_LOGIN()`, `RESULT_LOGIN()` | Login authentication: SQL query → `DG::LOGIN_SUCCESS` / `DG::LOGIN_FAILURE` |
| `server-src/src/db/ClientManagerPlayer.cpp` | `QUERY_PLAYER_LOAD()`, `RESULT_PLAYER_LOAD()` | Character load: SQL → `DG::PLAYER_LOAD_SUCCESS` with `TPlayerTable + TPlayerItem[]` |

### Layer 4 — Client Network (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/UserInterface/PythonNetworkStream.h` | `CPythonNetworkStream` | Singleton TCP client; owns all `Send*` methods and phase handler maps |
| `client-src/src/UserInterface/PythonNetworkStream.cpp` | `CPythonNetworkStream::OnProcess()`, `DispatchPacket()` | Frame processing loop; called every render frame from the app loop |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseHandshake.cpp` | `SetHandshakePhase()`, `RecvHandshakePacket()` | Registers handshake handlers; drives X25519 key exchange |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLogin.cpp` | `SetLoginPhase()`, `RecvLoginSuccessPacket()` | Registers login handlers; parses `GC::LOGIN_SUCCESS` into character slot data |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseSelect.cpp` | `SetSelectPhase()`, `SendSelectCharacterPacket()` | Character select handler registration + `CG::PLAYER_SELECT` send |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLoading.cpp` | `SetLoadingPhase()`, `RecvMainCharacterPacket()` | Receives `GC::MAIN_CHARACTER`, `GC::CHARACTER_ADD`, `GC::ITEM_SET` during world load |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `SetGamePhase()`, `Recv*Packet()` (50+ functions) | All in-game receive handlers; feeds `CPythonPlayer`, `CPythonItem`, `CNetworkActorManager` |
| `client-src/src/UserInterface/NetworkActorManager.h` | `CNetworkActorManager::AppendActor()` | Translates `GC::CHARACTER_ADD` data into `CInstanceBase` objects in the scene |
| `client-src/src/UserInterface/AccountConnector.h` | `CAccountConnector` | Manages the separate pre-game auth-server connection before the game TCP connection |

### Layer 5 — Python UI

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/networkmodule.py` | `MainStream` | Python-level phase controller; calls `net.SetLoginPhase()`, `net.SetGamePhase()` etc. |
| `client-bin/assets/root/intrologin.py` | `LoginWindow.OnClickLogin()` | Collects credentials, calls `net.SetLoginInfo()` and `net.Connect()` |
| `client-bin/assets/root/introselect.py` | `SelectCharacterWindow.SelectCharacter()` | Calls `net.SendSelectCharacterPacket(slot)` |
| `client-bin/assets/root/uichat.py` | `ChatWindow.SendChat()` | Calls `net.SendChatPacket(type, msg)` |
| `client-bin/assets/root/uiinventory.py` | `InventoryWindow.UseItem()`, `DropItem()` | Calls `net.SendItemUsePacket()`, `net.SendItemDropPacket()` |
| `client-bin/assets/root/serverinfo.py` | `ServerInfo` | Static server list: IP addresses, channel ports (`11011`, `11021`, …), auth-server config |

---

## 2. Causal Chain

### Chain A: Player types a chat message

```
[Trigger]  Player presses Enter in the chat box
    │
    ▼  (root/uichat.py : ChatWindow.SendChat)
[1] Python calls net.SendChatPacket(CHAT_TYPE_TALKING, message)
    │
    ▼  (UserInterface/PythonNetworkStream.cpp : CPythonNetworkStream::SendChatPacket)
[2] C++ builds TPacketCGChat: header=CG::CHAT(0x0601), type, length, message[]
    Encrypt via SecureCipher → write to TCP send buffer
    │
    ▼  packet: CG::CHAT (0x0601)
[3] Server receives encrypted bytes; SecureCipher::Decrypt in-place
    │
    ▼  (game/input_main.cpp : CInputMain::Chat)
[4] Read header switch → dispatches to Chat handler
    CInsultChecker profanity filter applied
    Flood-rate limiter checked
    │
    ▼  (game/char.cpp : CHARACTER::ChatPacket → SECTREE broadcast)
[5] ch->ChatPacket() broadcasts GC::CHAT to all DESC in SECTREE view range
    │
    ▼  packet: GC::CHAT (0x0603)
[6] Each nearby client decrypts, dispatches via RecvChatPacket()
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvChatPacket)
[7] Calls Python callback via module → uichat.py AddChatLine(type, speaker, text)
    │
    ▼  [End] Chat line appears in each nearby player's chat window
```

### Chain B: Player sends CG::PHASE (server-initiated phase switch)

```
[Trigger]  Server decides a phase change is needed (e.g. login accepted)
    │
    ▼  (game/desc.cpp : DESC::SetPhase(PHASE_GAME))
[1] Server sets m_pInputProcessor = new CInputMain
    Builds TPacketGCPhase: header=GC::PHASE(0x0008), phase=PHASE_GAME(5)
    Encrypts + sends
    │
    ▼  packet: GC::PHASE (0x0008)
[2] Client receives, DispatchPacket reads header 0x0008
    exitPhase flag set → dispatch loop breaks after this packet
    │
    ▼  (UserInterface/PythonNetworkStream.cpp : RecvPhasePacket)
[3] Reads phase byte; calls SetGamePhase() / SetLoginPhase() / etc.
    New handler map registered for subsequent packets
    │
    ▼  (root/networkmodule.py : MainStream.SetGamePhase)
[4] Python-level phase callback: opens game UI windows
    │
    ▼  [End] Client processes subsequent packets with PHASE_GAME handlers
```

### Chain C: Client sends CG::ATTACK → damage feedback

```
[Trigger]  Player right-clicks enemy (auto-attack or manual)
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : SendAttackPacket)
[1] Build TPacketCGAttack: header=CG::ATTACK(0x0401), motAttack, vid(victimVID)
    Encrypt + send
    │
    ▼  packet: CG::ATTACK (0x0401)
[2] Server CInputMain::Attack() receives
    IS_SPEED_HACK() timestamp check
    battle_is_attackable() validity check
    │
    ▼  (game/char_battle.cpp : battle_melee_attack)
[3] CalcMeleeDamage() → CalcBattleDamage() → level-diff scaling → CalcAttBonus
    CalcAttackRating() → hit/miss decision
    victim->Damage(dam, type)
    │
    ▼  SECTREE broadcast to nearby DESCs:
    packet: GC::DAMAGE_INFO (0x0410) — to all nearby
    packet: GC::PLAYER_POINT_ONE (0x0215) — to victim's DESC (HP update)
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvDamageInfoPacket)
[4] Client reads victimVID, bFlag, dam → floating damage number rendered
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvPlayerPointOnePacket)
[5] Updates CPythonPlayer point array; Python HP bar redraws
    │
    ▼  [End] Attacker sees damage number; victim's HP bar decreases
```

---

## 3. Dependency Matrix

### Sync Points

The following pairs must stay byte-identical. A mismatch causes silent data corruption or a client crash.

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `TPacketCGAttack` struct layout (`#pragma pack(1)`) | `game/packet_structs.h` | `UserInterface/Packet.h` | Server reads wrong `vid` / `motAttack` bytes → wrong target attacked |
| `TPacketGCItemSet` layout (`Cell`, `dwVnum`, `alSockets[3]`, `aAttr[7]`) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client inventory shows wrong item / wrong attributes → visual desync |
| `TPacketGCChat` layout (`bType`, `dwVID`, `wTextLen`) | `game/packet_structs.h` | `UserInterface/Packet.h` | Client reads wrong text length → buffer overrun crash |
| `TPacketGCMove` layout (`bFunc`, `bArg`, `bRot`, `lX`, `lY`, `dwTime`, `dwVID`) | `game/packet_structs.h` | `UserInterface/Packet.h` | Actors teleport or freeze on the client; server position diverges |
| `EPhases` enum values | `common/packet_headers.h` | `UserInterface/PythonNetworkStream.cpp` (phase switch cases) | Phase switch fails; client stuck in wrong phase, all subsequent packets dropped |
| `CG::` / `GC::` header constants (all `uint16_t` values) | `common/packet_headers.h` | `UserInterface/Packet.h` + handler registration | Dispatcher looks up wrong handler; packet silently dropped or wrong action executed |
| `GD_FRAME_HEADER_SIZE = 10` (handle:4 + size:4 + header:2) | `common/packet_headers.h` | `db/Peer.cpp` | DB process reads wrong payload start; all GD/DG data corrupted |
| `TPlayerTable` binary layout | `common/tables.h` (server) | `common/tables.h` (shared header) | DG::PLAYER_LOAD_SUCCESS corrupts character stats — level, HP, position wrong |
| `TItemTable` binary layout | `common/tables.h` | `common/tables.h` | Item proto data loaded on client differs from server; wrong item attributes shown |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| `PACKET_HEADER_SIZE` | 4 bytes | `common/packet_headers.h` | CG/GC minimum frame; packets shorter than 4 bytes crash the dispatcher |
| `GD_FRAME_HEADER_SIZE` | 10 bytes | `common/packet_headers.h` | GD/DG frame overhead; reading payload at wrong offset corrupts every GD/DG packet |
| CG range | `0x0006–0x0CFF` | `common/packet_headers.h` (comment) | New CG headers outside range collide with GC range or existing constants |
| GC range | `0x0007–0x0CFF` | `common/packet_headers.h` (comment) | Same as above — header collision causes wrong handler dispatch |
| GG range | `0x8000–0x8FFF` | `common/packet_headers.h` (comment) | P2P headers outside range risk overlap with GD/DG range |
| GD range | `0x9000–0x90FF` | `common/packet_headers.h` (comment) | Only 256 possible GD headers; range is nearly full |
| DG range | `0x9100–0x91FF` | `common/packet_headers.h` (comment) | Only 256 possible DG headers; range is nearly full |
| `EPhases` max value | 10 (`PHASE_AUTH`) | `common/packet_headers.h` | Adding a phase beyond 10 requires updating all phase-switch switch statements on both client and server |
| `login[32]` / `password[32]` | 32 bytes each | `game/packet_structs.h` (`TPacketCGLoginSecure`) | Longer credentials silently truncated; authentication fails |

---

## 4. Extension How-To

### How to add a new CG packet (client → server)

1. **`server-src/src/common/packet_headers.h`** — Add constant in the correct range:
   ```cpp
   namespace CG { constexpr uint16_t MY_ACTION = 0x0B04; }
   ```
2. **`server-src/src/game/packet_structs.h`** — Define the payload struct with `#pragma pack(1)`:
   ```cpp
   #pragma pack(1)
   struct TPacketCGMyAction {
       uint16_t header;   // CG::MY_ACTION
       uint16_t length;   // sizeof(TPacketCGMyAction)
       uint32_t targetVID;
       uint8_t  actionType;
   };
   #pragma pack()
   ```
3. **`client-src/src/UserInterface/Packet.h`** — Add identical struct (must be byte-for-byte the same).
4. **`server-src/src/game/input_main.cpp`** — Add `case CG::MY_ACTION:` to `CInputMain::ProcessPacket()` switch and implement the handler function `MyAction(DESC*, const char*, int)`.
5. **`client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp`** — Add `Send*` method that builds and sends the struct:
   ```cpp
   void CPythonNetworkStream::SendMyActionPacket(uint32_t vid, uint8_t type) {
       TPacketCGMyAction p;
       p.header = CG::MY_ACTION;
       p.length = sizeof(p);
       p.targetVID = vid;
       p.actionType = type;
       Send(sizeof(p), &p);
   }
   ```
6. **`client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp`** — Register the send function as a Python-callable via the `PythonNetworkStreamModule.cpp` module table.
7. **`client-bin/assets/root/`** — Call `net.SendMyActionPacket(vid, type)` from the appropriate Python UI file.

### How to add a new GC packet (server → client)

1. **`common/packet_headers.h`** — Add constant in the GC range:
   ```cpp
   namespace GC { constexpr uint16_t MY_UPDATE = 0x0A60; }
   ```
2. **`game/packet_structs.h`** and **`UserInterface/Packet.h`** — Add matching `#pragma pack(1)` struct to both files.
3. **`game/`** — Build and send the packet from the appropriate server-side location using `ch->GetDesc()->Packet(&pkt, sizeof(pkt))` or broadcast via `SECTREE::ForEachAround()`.
4. **`UserInterface/PythonNetworkStreamPhaseGame.cpp`** — Implement `RecvMyUpdatePacket()` and register it in `SetGamePhase()`:
   ```cpp
   m_gameHandlers[GC::MY_UPDATE] = { sizeof(TPacketGCMyUpdate), false,
       [this]() { return RecvMyUpdatePacket(); } };
   ```
5. **Python side** — The `Recv*` function typically calls back into Python via `m_apoPhaseWnd[PHASE_WINDOW_GAME]->OnMyUpdate(...)`.

### How to add a new GD/DG packet (game ↔ db)

1. **`common/packet_headers.h`** — Add in GD range (`0x9000–0x90FF`) and DG range (`0x9100–0x91FF`). Check range capacity before adding.
2. **`common/tables.h`** — Add the payload struct if it carries a significant data blob (shared header used by both game and db).
3. **`game/db.h` / `db.cpp`** — Add a `CDBManager::Send*()` helper to build and send the GD packet.
4. **`db/ClientManager.cpp`** — Add `case GD::MY_PACKET:` to `ProcessPacket()` + implement handler.
5. **`db/Peer.cpp`** — If the db needs to respond, build and send the DG reply packet.
6. **`game/input.h` / a new `CInputDB` handler method** — Receive and handle the DG response in the game process.

### Controlling Constants

| Constant / Namespace | File | Controls |
|---------------------|------|----------|
| `CG::`, `GC::`, `GG::`, `GD::`, `DG::` | `common/packet_headers.h` | All packet type identifiers |
| `EPhases` | `common/packet_headers.h` | Phase values used in `GC::PHASE` payloads |
| `PACKET_HEADER_SIZE` | `common/packet_headers.h` | Minimum CG/GC/GG frame size (4 bytes) |
| `GD_FRAME_HEADER_SIZE` | `common/packet_headers.h` | GD/DG frame overhead (10 bytes) |
| `EChatType` | `common/length.h` | Chat message type enum (TALKING, SHOUT, WHISPER, …) |
| `EPointTypes` | `common/length.h` | Stat point types sent in `GC::PLAYER_POINTS` |
| `GuildSub::`, `ShopSub::`, `ExchangeSub::`, … | `common/packet_headers.h` | Sub-header enums for multi-action packets |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| Client disconnects immediately after connecting | Handshake key exchange failed (version mismatch or libsodium error) | `game/SecureCipher.cpp` : `Initialize()` return value; `sys_log` for "SecureCipher init failed" |
| Server log: `"CInputMain: unknown packet header 0xXXXX"` | New CG packet defined in client but no case in server's switch | `game/input_main.cpp` : `CInputMain::ProcessPacket()` switch — add the missing case |
| Client log: `"unhandled packet header 0xXXXX in game phase"` | New GC packet sent by server but not registered in `SetGamePhase()` | `UserInterface/PythonNetworkStreamPhaseGame.cpp` : `SetGamePhase()` handler registration |
| Client freezes or crashes on character select | `GC::LOGIN_SUCCESS` struct layout mismatch (server vs client `Packet.h`) | Compare `TPacketGCLoginSuccess` in `game/packet_structs.h` vs `UserInterface/Packet.h` |
| All actors teleport wildly for nearby players | `TPacketGCMove` field size or order differs client/server | `game/packet_structs.h` vs `UserInterface/Packet.h` — compare `TPacketGCMove` byte by byte |
| Inventory shows wrong items after pick-up | `TPacketGCItemSet` attribute or socket array size differs | Check `alSockets[3]` and `aAttr[7]` array sizes in both `packet_structs.h` and client `Packet.h` |
| Chat text is garbled or length is wrong | `TPacketGCChat.wTextLen` is mis-read due to struct misalignment | Verify `#pragma pack(1)` is present on both sides; check `bType`+`dwVID` sizes |
| `sys_err: CInputMain: phase %d cannot handle packet 0xXXXX` | Packet sent in wrong phase (e.g. sending item packets before PHASE_GAME) | Client is not respecting `exitPhase` flag after `GC::PHASE`; check `RecvPhasePacket()` |
| GD/DG channel corrupted — all db responses fail | `GD_FRAME_HEADER_SIZE` mismatch or handle field read at wrong offset | `db/Peer.cpp` read logic vs `game/db.cpp` write logic — compare frame construction |
| Cross-channel whisper never arrives | `GG::RELAY` packet not forwarded by P2P manager, or target channel not connected | `game/p2p.cpp` : `P2PManager::SendPacket()` + check `sys_log` for "p2p: relay failed" |
| Phase-change deadlock — client stuck in LOADING forever | Server never sends `GC::PHASE(GAME)` after `GC::MAIN_CHARACTER` | `game/input_login.cpp` : `CInputLogin::EnterGame()` — check the `GC::PHASE` send call |
| DB authentication always returns LOGIN_NOT_EXIST | `TPacketGDLogin` login/password field sizes differ from account table column size | `db/ClientManagerLogin.cpp` : `QUERY_LOGIN()` — verify field widths match `login[32]` |

---

## Related

- **Topic page:** [Game–Client Protocol](topic-Game-Client-Protocol) — complete packet tables and all round-trip flows
- **Blueprint:** [blueprint-Login-Flow](blueprint-Login-Flow) — detailed trace of the authentication + character load sequence
- **Blueprint:** [blueprint-Character-System](blueprint-Character-System) — `EPointTypes`, `GC::PLAYER_POINTS`, stat update flow
- **Blueprint:** [blueprint-Item-System](blueprint-Item-System) — item packet flow (`GC::ITEM_SET`, `GC::ITEM_DEL`)
- **Blueprint:** [blueprint-Combat-System](blueprint-Combat-System) — `CG::ATTACK`, `GC::DAMAGE_INFO`, `CalcMeleeDamage()`
