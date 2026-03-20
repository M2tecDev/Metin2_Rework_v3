# Game–Client Protocol

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [What is a Packet?](concept-packets)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> A comprehensive reference for the TCP binary protocol connecting the Metin2 game client (`client-src`) to the game server (`server-src/game`), covering all packet namespaces, wire formats, complete packet tables, and annotated round-trip flows for every major game action.

---

## Overview

The Metin2 network stack uses raw TCP with a custom binary framing protocol. There is no HTTP, WebSocket, or other application-layer protocol involved. Every interaction between the client and the game server — login, movement, combat, item use, chat — is encoded as a compact binary packet, sent over the same persistent TCP connection that is established at startup and held for the entire play session.

The connection goes through several well-defined **phases**. In each phase only a specific set of packet types is valid. Sending an out-of-phase packet is silently dropped or disconnects the client.

### Connection Lifecycle

```
Client                                              Game Server
  │                                                       │
  │──TCP connect (port 11011/11021/…)────────────────────>│
  │                                             PHASE_HANDSHAKE
  │<──GC_HANDSHAKE (time sync + key exchange)─────────────│
  │──CG_HANDSHAKE ────────────────────────────────────────>│
  │                                                        │ libsodium X25519 key exchange
  │<──GC_PHASE (→ LOGIN) ──────────────────────────────────│
  │                                              PHASE_LOGIN
  │──CG_LOGIN_SECURE ──────────────────────────────────────>│
  │<──GC_LOGIN_SUCCESS (character slot list) ──────────────│
  │                                                        │
  │──CG_PLAYER_SELECT ─────────────────────────────────────>│
  │<──GC_PHASE (→ LOADING) ────────────────────────────────│
  │                                             PHASE_LOADING
  │<──GC_MAIN_CHARACTER ───────────────────────────────────│
  │<──GC_CHARACTER_ADD (nearby actors) ────────────────────│
  │<──GC_PHASE (→ GAME) ───────────────────────────────────│
  │                                               PHASE_GAME
  │<══════════════ bidirectional gameplay ════════════════>│
  │──CG_ATTACK ───────────────────────────────────────────>│
  │<──GC_DAMAGE_INFO ──────────────────────────────────────│
  │──CG_MOVE ─────────────────────────────────────────────>│
  │<──GC_MOVE ─────────────────────────────────────────────│
  │<──GC_PLAYER_POINTS (HP change broadcast) ──────────────│
  │                                                        │
```

### Transport Layer

- **Protocol:** TCP (stream-oriented, no UDP).
- **Port range:** Channel 1 → `11011`, Channel 2 → `11021`, Channel 3 → `11031`, Channel 4 → `11041`; Auth server → `11000`.
- **Security:** After the handshake phase, all data is encrypted with libsodium's XSalsa20-Poly1305 symmetric cipher, keyed by an X25519 Diffie-Hellman exchange (`SecureCipher.h`/`.cpp` in the game server; `CNetworkStream` in EterLib on the client).
- **Buffering:** Both sides use growable ring buffers (`RingBuffer` from `libthecore`). The server drives I/O with `fdwatch` (kqueue/select); the client drives I/O from the per-frame `OnProcess()` call in `CPythonNetworkStream`.
- **Pulse rate:** The server processes all I/O and game-state changes at 40 pulses/second (25 ms per tick). Client sends are immediate; server responses arrive on the next tick or later.

---

## Packet Namespaces

All packet header constants are defined in `server-src/src/common/packet_headers.h` and are `uint16_t` values grouped into five C++ namespaces.

| Namespace | Direction | Parties | Description |
|-----------|-----------|---------|-------------|
| `CG` | Client → Game | Metin2.exe → game process | All packets the client sends to the game server |
| `GC` | Game → Client | game process → Metin2.exe | All packets the game server sends to the client |
| `GD` | Game → DB | game process → db process | Persistence and query requests sent by game to db |
| `DG` | DB → Game | db process → game process | Query results, broadcasts, and boot data from db |
| `GG` | Game ↔ Game | game ↔ game (inter-channel) | P2P packets between two game server instances |

The same wire format is used for CG/GC and for GG, but a different format is used for GD/DG (see [Packet Format](#packet-format) below).

---

## Packet Format

### CG / GC / GG Framing

```
┌──────────────────────────────────────────────────────────┐
│  header  │  length  │            payload …               │
│  2 bytes │  2 bytes │  (length − 4) bytes                │
└──────────────────────────────────────────────────────────┘
```

- **header** (`uint16_t`, little-endian): The packet type constant from the appropriate namespace.
- **length** (`uint16_t`, little-endian): Total packet size in bytes, including the 4-byte header+length prefix.
- **payload**: The fixed or variable-length body. Fixed-size packets have `length == sizeof(struct)`.

Minimum packet size is 4 bytes (header + length, no payload). After decryption, the dispatcher reads the header, looks up the registered handler for the current phase, and validates that at least `minSize` bytes are available before calling the handler.

#### Example: Fixed-size CG_ATTACK

```cpp
struct TPacketCGAttack {
    uint16_t header;    // CG::ATTACK (2 bytes)
    uint16_t length;    // sizeof(TPacketCGAttack) (2 bytes)
    uint8_t  motAttack; // attack motion index (1 byte)
    uint32_t vid;       // victim VID (4 bytes)
    uint8_t  _pad[1];   // alignment padding (1 byte)
};
// Total: 10 bytes
```

#### Example: Variable-length GC_CHAT

```cpp
struct TPacketGCChat {
    uint16_t header;    // GC::CHAT
    uint16_t length;    // 4 + sizeof(fixed fields) + textLen
    uint8_t  type;      // EChatType value
    uint32_t vid;       // speaker VID
    uint16_t textLen;   // byte count of the text that follows
    // uint8_t text[textLen]; follows immediately
};
```

### GD / DG Framing

The game↔db channel uses a different, larger header to allow the db process to route responses back to the originating connection:

```
┌─────────────────────────────────────────────────────────────────┐
│  header  │  handle  │    size    │           payload …          │
│  2 bytes │  4 bytes │  4 bytes   │  size bytes                  │
└─────────────────────────────────────────────────────────────────┘
```

- **header** (`uint16_t`): Packet type from `GD::` or `DG::`.
- **handle** (`uint32_t`): The originating connection handle, used by db to route responses to the correct game peer.
- **size** (`uint32_t`): Byte count of the payload only (not including the 10-byte frame header).

Total frame overhead: 10 bytes.

### Encryption

All bytes after the TCP three-way handshake are encrypted. The handshake phase completes an X25519 key exchange, after which both sides derive a shared XSalsa20-Poly1305 session key. The `SecureCipher` class handles `Encrypt(data, len)` and `Decrypt(data, len)` in place on the ring-buffer data. The `RingBuffer::DataAt(pos)` pointer enables in-place en/decryption without extra copies.

---

## Phase Constants

Phases are enforced by the server's `DESC` object and the client's `CPythonNetworkStream`. Each phase has its own dispatch table; packets registered only for `PHASE_GAME` are silently ignored during `PHASE_LOGIN`.

```cpp
enum EPhases {
    PHASE_CLOSE       = 0,  // Connection being closed
    PHASE_HANDSHAKE   = 1,  // Time sync + key exchange
    PHASE_LOGIN       = 2,  // Account authentication
    PHASE_SELECT      = 3,  // Character select screen
    PHASE_LOADING     = 4,  // World loading / actor spawn
    PHASE_GAME        = 5,  // In-game play
    PHASE_DEAD        = 6,  // Player is dead (limited input)
    PHASE_CLIENT_CONNECTING = 7,
    PHASE_DBCLIENT    = 8,  // Reserved for db internal use
    PHASE_P2P         = 9,  // Game-to-game P2P
    PHASE_AUTH        = 10, // Auth-server phase
};
```

---

## Complete Packet Tables

### CG Packets (Client → Game)

| Packet Constant | Hex | Phase | Description | Key Fields |
|----------------|-----|-------|-------------|------------|
| `CG::HANDSHAKE` | `0x0001` | HANDSHAKE | Client sends back the server's time challenge to complete time-sync | `dwHandshake`, `dwTime`, `lDelta` |
| `CG::LOGIN_SECURE` | `0x0002` | LOGIN | Sends login credentials; server validates against the account database | `login[32]`, `password[32]` (hashed) |
| `CG::PLAYER_SELECT` | `0x0003` | SELECT | Requests entry to the game with the character in the given slot | `slot` (0–3) |
| `CG::PLAYER_DELETE` | `0x0004` | SELECT | Requests deletion of a character slot | `slot`, `social_id[8]` |
| `CG::PLAYER_CREATE` | `0x0005` | SELECT | Creates a new character | `slot`, `name[24]`, `job`, `shape`, `stat_point_str/dex/ht/int` |
| `CG::MOVE` | `0x0010` | GAME | Sends a movement state update (walk, run, stop, dash) | `func`, `arg`, `rot` (rotation byte), `x`, `y`, `time` |
| `CG::SYNC_POSITION` | `0x0011` | GAME | Sends a forced position synchronisation for a specific VID | `elements[]` — array of `(vid, x, y)` |
| `CG::ATTACK` | `0x0013` | GAME, DEAD | Initiates a melee attack on a target | `motAttack` (motion index), `vid` (victim VID) |
| `CG::CHAT` | `0x0022` | GAME | Sends a chat message | `type` (`EChatType`), `length`, `message[length]` |
| `CG::WHISPER` | `0x0023` | GAME | Sends a private whisper message | `size`, `name[25]`, `message[size-25]` |
| `CG::ITEM_USE` | `0x0030` | GAME | Uses an item at the given inventory position | `Cell` (`TItemPos`: window + cell index) |
| `CG::ITEM_USE_TO_ITEM` | `0x0031` | GAME | Uses one item on another (e.g. combining, attaching) | `Cell` (source), `ByCell` (target) |
| `CG::ITEM_DROP` | `0x0032` | GAME | Drops an item from the given slot, optionally with yang | `Cell`, `elk` (yang to drop), `count` |
| `CG::ITEM_MOVE` | `0x0033` | GAME | Moves an item from one inventory slot to another | `Cell` (source), `CellTo` (destination), `count` |
| `CG::ITEM_PICKUP` | `0x0034` | GAME | Picks up a ground item by its VID | `vid` |
| `CG::QUICKSLOT_ADD` | `0x0038` | GAME | Assigns an item or skill to a quick-slot | `pos` (slot index), `slot` (`TQuickslot`: type + value) |
| `CG::QUICKSLOT_DEL` | `0x0039` | GAME | Removes the binding from a quick-slot | `pos` |
| `CG::QUICKSLOT_SWAP` | `0x003A` | GAME | Swaps two quick-slot bindings | `pos`, `pos2` |
| `CG::SHOP_END` | `0x0040` | GAME | Closes the currently open NPC shop | — |
| `CG::SHOP_BUY` | `0x0041` | GAME | Buys a quantity of the selected NPC shop item | `count` |
| `CG::SHOP_SELL` | `0x0042` | GAME | Sells an inventory item to the NPC shop | `pos` (inventory cell), `count` |
| `CG::EXCHANGE_START` | `0x0050` | GAME | Initiates a trade request with another player | `arg` (target VID) |
| `CG::EXCHANGE_ITEM_ADD` | `0x0051` | GAME | Adds an inventory item to the active trade | `pos` (`TItemPos`), `display_pos` |
| `CG::EXCHANGE_ITEM_DEL` | `0x0052` | GAME | Removes an item from the active trade | `display_pos` |
| `CG::EXCHANGE_ELK_ADD` | `0x0053` | GAME | Adds yang to the active trade | `elk` (amount) |
| `CG::EXCHANGE_ACCEPT` | `0x0054` | GAME | Confirms / accepts the active trade | — |
| `CG::EXCHANGE_CANCEL` | `0x0055` | GAME | Cancels the active trade | — |
| `CG::USE_SKILL` | `0x0060` | GAME | Activates a skill, optionally targeting a VID | `dwVnum` (skill vnum), `dwVID` (target, 0 = self/ground) |
| `CG::TARGET` | `0x0061` | GAME | Sets the player's current target | `dwVID` |
| `CG::WARP` | `0x0062` | GAME, DEAD | Requests a warp to a map location | `lX`, `lY`, `lMapIndex` |
| `CG::FLY_TARGETING` | `0x0065` | GAME | Fires a skill projectile at a target | `dwTargetVID`, `x`, `y` |
| `CG::SHOOT` | `0x0066` | GAME | Fires a bow/arrow shot | `bType` (skill slot) |
| `CG::SCRIPT_ANSWER` | `0x0070` | GAME | Responds to a quest/NPC dialogue option | `answer` (button index) |
| `CG::QUEST_INPUT_STRING` | `0x0071` | GAME | Submits text input for a quest prompt | `length`, `string[length]` |
| `CG::QUEST_CONFIRM` | `0x0072` | GAME | Confirms a yes/no quest dialog | `answer` (0/1), `pid` (quest owner player ID) |
| `CG::GUILD_ADD_MEMBER` | `0x0080` | GAME | Invites another player to the guild | `vid` (target VID) |
| `CG::GUILD_REMOVE_MEMBER` | `0x0081` | GAME | Kicks a member from the guild | `pid` (player ID) |
| `CG::GUILD_CHANGE_GRADE_NAME` | `0x0082` | GAME | Renames a guild rank | `grade` (0–9), `grade_name[9]` |
| `CG::GUILD_CHANGE_MEMBER_GRADE` | `0x0083` | GAME | Changes a member's rank | `pid`, `grade` |
| `CG::GUILD_USE_SKILL` | `0x0084` | GAME | Activates a guild skill | `dwVnum`, `dwPID` (target) |
| `CG::GUILD_OFFER` | `0x0085` | GAME | Donates experience to the guild | `dwOfferExp` |
| `CG::GUILD_DEPOSIT_MONEY` | `0x0086` | GAME | Deposits yang into the guild treasury | `gold` |
| `CG::GUILD_WITHDRAW_MONEY` | `0x0087` | GAME | Withdraws yang from the guild treasury | `gold` |
| `CG::PARTY_INVITE` | `0x0090` | GAME | Invites a player to the party | `vid` |
| `CG::PARTY_INVITE_ANSWER` | `0x0091` | GAME | Accepts or declines a party invitation | `leader_vid`, `accept` (bool) |
| `CG::PARTY_REMOVE` | `0x0092` | GAME | Removes a player from the party | `pid` |
| `CG::PARTY_SET_STATE` | `0x0093` | GAME | Changes a party member's role/state | `vid`, `state`, `flag` |
| `CG::PARTY_USE_SKILL` | `0x0094` | GAME | Uses a party-level skill | `vid` (target), `skill_index` |
| `CG::SAFEBOX_CHECKIN` | `0x00A0` | GAME | Deposits an inventory item into the safe-box | `bSrcCell` (inventory `TItemPos`), `bDstCell` (safebox slot) |
| `CG::SAFEBOX_CHECKOUT` | `0x00A1` | GAME | Withdraws an item from the safe-box | `bSrcCell`, `bDstCell` |
| `CG::SAFEBOX_ITEM_MOVE` | `0x00A2` | GAME | Moves an item within the safe-box | `bSrcCell`, `bDstCell` |
| `CG::MALL_CHECKOUT` | `0x00A3` | GAME | Withdraws an item from the premium mall | `bSrcCell`, `bDstCell` |
| `CG::GIVE_ITEM` | `0x00B0` | GAME | Transfers an item to an NPC/player (e.g. quest delivery) | `npc_vid`, `ItemCell`, `byCount` |
| `CG::FISHING` | `0x00C0` | GAME | Drives the fishing mini-game state machine | `action` (cast / reel-in / cancel) |
| `CG::BUILD` | `0x00D0` | GAME | Requests placement of a building/estate object | `type`, `x`, `y`, `vnum` |
| `CG::REFINE` | `0x00E0` | GAME | Initiates item refinement | `pos` (item `TItemPos`), `type` |
| `CG::DRAGON_SOUL_REFINE` | `0x00E1` | GAME | Initiates Dragon Soul stone refinement | `bType`, `grid_positions[]` |
| `CG::PRIVATE_SHOP` | `0x00F0` | GAME | Opens a player private shop with stock | `name[33]`, `count`, `items[]` |

---

### GC Packets (Game → Client)

| Packet Constant | Hex | Phase | Description | Key Fields |
|----------------|-----|-------|-------------|------------|
| `GC::HANDSHAKE` | `0x0001` | HANDSHAKE | Server sends a time challenge for sync | `dwHandshake`, `dwTime`, `lDelta` |
| `GC::PHASE` | `0x0002` | any | Instructs the client to switch phase | `phase` (`EPhases` value) |
| `GC::BLANK_PACKET` | `0x0003` | any | No-op keep-alive / alignment padding | — |
| `GC::PING` | `0x0004` | GAME | Latency probe; client echoes back with `CG::PONG` | `ping` counter |
| `GC::LOGIN_SUCCESS` | `0x0010` | LOGIN | Sends character slot data after successful auth | `players[4]` (`TSimplePlayerInformation`) |
| `GC::LOGIN_FAILURE` | `0x0011` | LOGIN | Reports a login error | `szStatus[16]` (reason string: `"WRONGPWD"`, `"NOTFOUND"`, etc.) |
| `GC::MAIN_CHARACTER` | `0x0018` | LOADING | Full character data for the local player on game entry | `dwVID`, `bJob`, `x`, `y`, `z`, `angle`, `lMapIndex`, `wRaceNum` |
| `GC::CHARACTER_ADD` | `0x0019` | GAME, LOADING | Spawns a new visible actor (player, mob, NPC) in the client's view | `dwVID`, `bType`, `x`, `y`, `z`, `angle`, `wRaceNum`, `dwMovSpeed`, `dwAtkSpeed`, `bStateFlag`, `dwAffectFlag`, `szName[25]` |
| `GC::CHARACTER_UPDATE` | `0x001A` | GAME | Updates an existing actor's equipment, level, or state | `dwVID`, `wRaceNum`, `bParts[]`, `bArmor`, `dwGuildID`, `bPKMode` |
| `GC::CHARACTER_DEL` | `0x001B` | GAME | Removes an actor from the client's view | `dwVID` |
| `GC::MOVE` | `0x001C` | GAME | Broadcasts an actor's movement (walk/run/stop/dash) | `bFunc`, `bArg`, `bRot`, `lX`, `lY`, `dwTime`, `dwVID` |
| `GC::CHAT` | `0x0022` | GAME | Delivers a chat message from any actor | `bType` (`EChatType`), `dwVID`, `wTextLen`, `text[wTextLen]` |
| `GC::WHISPER` | `0x0023` | GAME | Delivers a private whisper | `wSize`, `szNameFrom[25]`, `message[...]` |
| `GC::ITEM_SET` | `0x0030` | GAME | Sets or updates an item in the client's inventory | `Cell` (`TItemPos`), `dwVnum`, `count`, `dwFlags`, `dwAntiFlags`, `alSockets[3]`, `aAttr[7]` |
| `GC::ITEM_DEL` | `0x0031` | GAME | Removes an item from the client's inventory | `Cell` (`TItemPos`) |
| `GC::ITEM_GROUND_ADD` | `0x0032` | GAME | Spawns a dropped item on the ground | `dwVID`, `dwVnum`, `x`, `y`, `szOwnership[25]` |
| `GC::ITEM_GROUND_DEL` | `0x0033` | GAME | Removes a ground item | `dwVID` |
| `GC::ITEM_OWNERSHIP` | `0x0034` | GAME | Updates the ownership label on a ground item | `dwVID`, `szName[25]` |
| `GC::PLAYER_POINTS` | `0x0020` | GAME | Sends the local player's full stat array | `points[]` (138 `EPointTypes` values as `int64_t`) |
| `GC::PLAYER_POINT_ONE` | `0x0021` | GAME | Updates a single stat point | `type` (`EPointTypes`), `value` |
| `GC::DAMAGE_INFO` | `0x0042` | GAME | Delivers damage feedback for display | `dwVID` (victim), `bFlag` (type flags), `dam` (damage value) |
| `GC::DEAD` | `0x0043` | GAME | Notifies the client that an actor has died | `dwVID` |
| `GC::AFFECT_ADD` | `0x0050` | GAME | Applies a buff/debuff to the local player | `dwType`, `bApplyOn`, `lApplyValue`, `dwFlag`, `lDuration` |
| `GC::AFFECT_REMOVE` | `0x0051` | GAME | Removes a buff/debuff by type | `dwType` |
| `GC::SKILL_LEVEL` | `0x0060` | GAME | Sends skill-level data for one skill | `dwVnum`, `bLevel`, `bMasterType`, `tNextRead` |
| `GC::SKILL_COOLTIME_SET` | `0x0061` | GAME | Sets the cooldown for a specific skill | `dwVnum`, `fCooltime` |
| `GC::CREATE_FLY` | `0x0064` | GAME | Spawns a projectile visual effect | `dwIndex`, `bType`, `x`, `y`, `z`, `tx`, `ty`, `tz`, `dwSkillVnum` |
| `GC::SHOOT` | `0x0065` | GAME | Animates a ranged attack from an actor | `bType`, `dwShooterVID`, `dwTargetVID` |
| `GC::FLY_TARGETING` | `0x0066` | GAME | Associates a projectile with a target actor | `dwSkillVnum`, `dwShooterVID`, `dwTargetVID` |
| `GC::TARGET` | `0x0068` | GAME | Updates the target information panel | `dwVID`, `bHPPercent`, `szName[25]`, `bPKMode`, `dwGuildID` |
| `GC::SHOP` | `0x0041` | GAME | Sends the NPC shop item listing | `subheader`, `item_count`, `items[]` (`TShopItemTable`) |
| `GC::EXCHANGE` | `0x0053` | GAME | Drives the trade dialog state | `subheader` (start/add_item/add_elk/accept/cancel/error) |
| `GC::SCRIPT` | `0x0070` | GAME | Sends an NPC dialogue script for display | `subheader`, `script_text[]` |
| `GC::QUEST_INFO` | `0x0071` | GAME | Updates the quest log with one quest entry | `dwIndex`, `szName[64]`, `szDir[64]`, `szIcon[64]`, `bState`, `dwTime` |
| `GC::QUEST_CONFIRM` | `0x0072` | GAME | Sends a yes/no quest confirm dialog | `dwNPCvid`, `szMsg[256]`, `dwTimeout` |
| `GC::NPC_POSITION` | `0x0073` | GAME | Sends NPC positions for the minimap | `count`, `npcs[]` (`{type, x, y}`) |
| `GC::SAFEBOX_SET` | `0x00A0` | GAME | Populates or updates a safe-box item slot | `bPos`, `dwVnum`, `count`, `sockets[]`, `attrs[]` |
| `GC::SAFEBOX_DEL` | `0x00A1` | GAME | Removes an item from the safe-box | `bPos` |
| `GC::SAFEBOX_WRONG_PASSWORD` | `0x00A2` | GAME | Notifies that the safe-box password was incorrect | `bTryCount` |
| `GC::SAFEBOX_SIZE` | `0x00A3` | GAME | Reports the current safe-box size (number of rows) | `bSize` |
| `GC::GUILD` | `0x0080` | GAME | Guild system sub-packet dispatcher | `subheader`, `payload…` |
| `GC::PARTY_ADD` | `0x0090` | GAME | Adds a member to the party UI | `dwPID`, `szName[25]`, `bState` |
| `GC::PARTY_UPDATE` | `0x0091` | GAME | Updates a party member's HP/level | `dwPID`, `bHPPercent`, `bLevel` |
| `GC::PARTY_REMOVE` | `0x0092` | GAME | Removes a member from the party UI | `dwPID` |
| `GC::PARTY_LINK` | `0x0093` | GAME | Links a party member to a visible actor | `dwPID`, `dwVID` |
| `GC::PARTY_UNLINK` | `0x0094` | GAME | Unlinks a party member from an actor | `dwPID`, `dwVID` |
| `GC::PARTY_INVITE` | `0x0095` | GAME | Receives a party invitation | `dwLeaderVID` |
| `GC::SYNC_POSITION` | `0x0012` | GAME | Forces the client to snap an actor to a position | `elements[]` (`{vid, x, y}`) |
| `GC::WARP` | `0x0063` | GAME, DEAD | Teleports the client to a new map location | `lX`, `lY`, `lAddr`, `wPort` |
| `GC::MESSENGER` | `0x00B0` | GAME | Friend-list add/remove/status update | `subheader`, `szName[25]`, `bState` |
| `GC::FISHING` | `0x00C0` | GAME | Drives the fishing mini-game state | `subheader` (start/stop/bite/catch/fail), `dwInfo` |
| `GC::TIME` | `0x00D0` | GAME | Sends the current server time | `time` (Unix timestamp) |
| `GC::DRAGON_SOUL_REFINE` | `0x00E1` | GAME | Dragon Soul refine result | `bSubType`, `bResult`, `Cell`, `dwVnum` |

---

### GD Packets (Game → DB)

These packets are sent from the game process to the db process over the persistent GD/DG TCP channel.

| Packet Constant | Description | Key Data |
|----------------|-------------|----------|
| `GD::BOOT` | Game sends its channel/config to db on connect | channel, server IP, server port |
| `GD::LOGIN` | Authenticates a login session; db validates credentials | `TAccountTable` |
| `GD::PLAYER_LOAD` | Requests full character data for one slot | account ID, slot index |
| `GD::PLAYER_SAVE` | Persists a player's stat table | `TPlayerTable` |
| `GD::PLAYER_CREATE` | Creates a new character in the database | `TPlayerTable` |
| `GD::PLAYER_DELETE` | Deletes a character from the database | player ID, social ID |
| `GD::ITEM_SAVE` | Persists one or more item records | `TPlayerItem[]` |
| `GD::ITEM_DESTROY` | Marks an item as deleted | item ID |
| `GD::ITEM_FLUSH` | Forces immediate flush of a cached item | player ID |
| `GD::QUEST_SAVE` | Saves quest flag state | player ID, `TQuestTable` |
| `GD::SAFEBOX_LOAD` | Requests a player's safe-box contents | player ID |
| `GD::SAFEBOX_SAVE` | Persists safe-box item changes | player ID, `TPlayerItem[]` |
| `GD::SAFEBOX_CHANGE_SIZE` | Updates the safe-box row count | player ID, size |
| `GD::GUILD_CREATE` | Creates a new guild record | guild name, master player ID |
| `GD::GUILD_ADD_MEMBER` | Adds a member to a guild | guild ID, player ID, grade |
| `GD::GUILD_REMOVE_MEMBER` | Removes a member from a guild | guild ID, player ID |
| `GD::GUILD_CHANGE_GRADE` | Renames or updates a guild grade | guild ID, grade index, name |
| `GD::GUILD_OFFER_EXP` | Records an experience donation | guild ID, player ID, exp amount |
| `GD::GUILD_DEPOSIT_MONEY` | Deposits yang into the guild treasury | guild ID, amount |
| `GD::GUILD_WITHDRAW_MONEY` | Withdraws yang from the guild treasury | guild ID, amount |
| `GD::PARTY_CREATE` | Registers a new party | party leader player ID |
| `GD::PARTY_DELETE` | Removes a party record | party ID |
| `GD::PARTY_ADD` | Adds a member to a party | party ID, player ID, class, level |
| `GD::PARTY_REMOVE` | Removes a member from a party | party ID, player ID |
| `GD::SET_EVENT_FLAG` | Sets a named server-wide event flag | flag name, value |

---

### DG Packets (DB → Game)

These packets are sent from the db process back to game server(s).

| Packet Constant | Description | Key Data |
|----------------|-------------|----------|
| `DG::BOOT` | Sends all proto tables (mob, item, skill, shop, refine, banwords) to a freshly connected game | all table vectors |
| `DG::LOGIN_SUCCESS` | Authentication succeeded; returns character slot info | `TAccountTable` |
| `DG::LOGIN_FAILURE` | Authentication failed | reason code |
| `DG::PLAYER_LOAD_SUCCESS` | Full character data for a requested slot | `TPlayerTable`, `TPlayerItem[]`, quest flags, affects |
| `DG::PLAYER_CREATE_SUCCESS` | Character creation succeeded | new player ID |
| `DG::PLAYER_CREATE_FAILURE` | Character creation failed (name taken, etc.) | reason code |
| `DG::PLAYER_DELETE_SUCCESS` | Character deletion succeeded | slot index |
| `DG::ITEM_ID_RANGE` | Allocates a range of item IDs to this game server | `TItemIDRangeTable` (start, end) |
| `DG::GUILD_LOAD` | Sends a guild record to the game server | `TGuildTable` |
| `DG::GUILD_SKILL_RECHARGE` | Notifies that a guild skill cooldown has expired | guild ID, skill vnum |
| `DG::PARTY_CREATE` | Confirms party creation | party ID |
| `DG::PARTY_ADD` | Confirms party member addition | party ID, player ID |
| `DG::TIME` | Sends the canonical server time | Unix timestamp |
| `DG::CHANGE_EMPIRE_PRIV` | Broadcasts an empire-scope rate privilege change | empire ID, type, value, duration |
| `DG::CHANGE_GUILD_PRIV` | Broadcasts a guild-scope rate privilege change | guild ID, type, value, duration |
| `DG::CHANGE_CHARACTER_PRIV` | Broadcasts a character-scope rate privilege change | player ID, type, value, duration |
| `DG::ITEMAWARD_INFORMER` | Notifies game server of a pending item award | login name, item vnum, count |

---

### GG Packets (Game ↔ Game, P2P)

These packets travel between two game server instances on different channels.

| Packet Constant | Description |
|----------------|-------------|
| `GG::LOGIN` | Registers a player as online on this channel |
| `GG::LOGOUT` | Notifies peers that a player has gone offline |
| `GG::RELAY` | Forwards a GC packet to a player on a different channel |
| `GG::WARP_CHARACTER` | Transfers a player across channels (cross-channel warp) |
| `GG::GUILD_WAR_ZONE_MAP_INDEX` | Exchanges guild-war zone location between channels |
| `GG::TRANSFER` | Moves a player's game session from one channel to another |
| `GG::PING` | P2P keep-alive / latency probe |

---

## Key Round-Trip Flows

### 1. Login

```
Client (Python)                     Game Server                         DB Process
────────────────────────────────────────────────────────────────────────────────────
introLogin.py: OnClickLogin()
  └── net.SetLoginInfo(id, pwd)
  └── net.Connect(auth_addr, 11000)
                                   TCP accepted; PHASE_HANDSHAKE
  <── GC::HANDSHAKE ─────────────────
      (time challenge)
  ──> CG::HANDSHAKE ─────────────────
      (echo + delta)
                                   libsodium X25519 exchange completes
                                   PHASE_LOGIN
  <── GC::PHASE(LOGIN) ─────────────
  ──> CG::LOGIN_SECURE ─────────────>   GD::LOGIN ──────────────────────>
      (login[32], password[32])                                        QUERY_LOGIN
                                                                       SQL: account table
                                        <── DG::LOGIN_SUCCESS ─────────
                                   populate TAccountTable
  <── GC::LOGIN_SUCCESS ────────────
      (4 x TSimplePlayerInformation
       — name, level, race, etc.)
networkmodule.py: SetSelectCharacterPhase()
  └── opens introselect.py window
```

1. **Python** `introLogin.py::OnClickLogin()` → calls `net.SetLoginInfo()` and `net.Connect()`.
2. **Handshake** `GC::HANDSHAKE` / `CG::HANDSHAKE` — time synchronisation + X25519 key exchange. After this all data is encrypted.
3. **Server** switches to `PHASE_LOGIN`; sends `GC::PHASE`.
4. **Client** `CPythonNetworkStream::SetLoginPhase()` → registers login-phase packet handlers.
5. **Client** sends `CG::LOGIN_SECURE` with hashed credentials.
6. **Server** `CInputLogin::ProcessPacket()` → forwards `GD::LOGIN` to the db process.
7. **DB** `CClientManager::QUERY_LOGIN()` → executes SQL against the account table → sends `DG::LOGIN_SUCCESS` with `TAccountTable`.
8. **Server** receives `DG::LOGIN_SUCCESS`, populates `DESC::m_accountTable`, sends `GC::LOGIN_SUCCESS` with character slot summaries.
9. **Client** `CPythonNetworkStream::__RecvLoginSuccessPacket3/4()` → stores `TSimplePlayerInformation[4]`, calls `SetSelectPhase()`.

---

### 2. Character Select

```
Client (Python)                     Game Server                         DB Process
────────────────────────────────────────────────────────────────────────────────────
introselect.py: SelectCharacter(slot)
  └── net.SendSelectCharacterPacket(slot)
  ──> CG::PLAYER_SELECT ────────────>
                                   PHASE_SELECT
                                   GD::PLAYER_LOAD ─────────────────────>
                                                                         QUERY_PLAYER_LOAD
                                                                         SQL: player + items + quests
                                   <── DG::PLAYER_LOAD_SUCCESS ──────────
                                       (TPlayerTable + TPlayerItem[] + quests)
                                   character enters world → PHASE_LOADING
  <── GC::PHASE(LOADING) ───────────
  <── GC::MAIN_CHARACTER ───────────
      (dwVID, job, x, y, lMapIndex)
  <── GC::CHARACTER_ADD × N ────────
      (nearby actors in view range)
  <── GC::ITEM_SET × M ─────────────
      (inventory contents)
  <── GC::PHASE(GAME) ──────────────
networkmodule.py: SetGamePhase()
```

---

### 3. Movement

```
Client                               Game Server                 Nearby Clients
──────────────────────────────────────────────────────────────────────────────
User presses move key
CPythonNetworkStream::SendCharacterStatePacket()
  ──> CG::MOVE ───────────────────────>
      (func=FUNC_MOVE, rot, x, y, time)
                                    CInputMain::Move()
                                    ch->Move(x, y)
                                    SECTREE broadcasts to all nearby DESCs:
                                    <── GC::MOVE ──────────────────────────>
                                        (dwVID, bFunc, bRot, lX, lY, dwTime)
```

1. The client calls `SendCharacterStatePacket(dstPos, rot, func, arg)` which builds and sends `CG::MOVE`.
2. The server's `CInputMain` handler validates speed (IS_SPEED_HACK check), calls `ch->Move(x, y)`.
3. The `SECTREE` spatial partition broadcasts `GC::MOVE` to every `DESC` that has a view-range overlap with the moving character.
4. Remote clients receive `GC::MOVE`, call `RecvCharacterMovePacket()`, which updates the actor's movement interpolation in `CInstanceBase`.

---

### 4. Attack

```
Client                               Game Server                 Victim Client
──────────────────────────────────────────────────────────────────────────────
User right-clicks enemy / auto-attack
CPythonNetworkStream::SendAttackPacket(motAttack, vid)
  ──> CG::ATTACK ─────────────────────>
      (motAttack, victimVID)
                                    CInputMain::Attack()
                                    battle_melee_attack(ch, victim)
                                    ├── IS_SPEED_HACK check (time gate)
                                    ├── battle_is_attackable check
                                    ├── CalcMeleeDamage()
                                    ├── CalcAttackRating() → hit/miss
                                    ├── NormalAttackAffect() → stun/slow/poison
                                    └── victim->Damage(dam)
                                    Broadcast to nearby:
                                    <── GC::MOVE (attack motion) ──────────>
                                    <── GC::DAMAGE_INFO ───────────────────>
                                        (victimVID, flags, dam)
                                    <── GC::PLAYER_POINT_ONE ──────────────> (to victim's client)
                                        (POINT_HP, newHPValue)
```

1. `SendAttackPacket(motAttack, victimVID)` → `CG::ATTACK`.
2. Server-side `CInputMain::Attack()` calls `battle_melee_attack(ch, victim)` (defined in `battle.h` / `char_battle.cpp`).
3. Damage formula: `CalcMeleeDamage` → `CalcBattleDamage` → level-difference scaling → `CalcAttBonus` → race bonuses.
4. `victim->Damage(dam, type)` → HP deduction. If HP reaches 0, `victim->Dead(attacker)`.
5. The `SECTREE` broadcasts `GC::DAMAGE_INFO` to all nearby players (visual feedback).
6. The victim's `DESC` receives `GC::PLAYER_POINT_ONE` with the updated HP value.

---

### 5. Chat

```
Client                               Game Server                  Nearby Clients
──────────────────────────────────────────────────────────────────────────────
User presses Enter in chat box
uichat.py: SendChat(msg)
  └── net.SendChatPacket(msg)
  ──> CG::CHAT ───────────────────────>
      (type=CHAT_TYPE_TALKING, length, msg)
                                    CInputMain::Chat()
                                    ├── CInsultChecker profanity check
                                    ├── flood-rate limiter
                                    └── Broadcast to SECTREE view range:
                                    <── GC::CHAT ──────────────────────────>
                                        (type, speakerVID, textLen, text)
RecvChatPacket()
uichat.py: AddChatLine(type, speaker, text)
```

- Normal talk (`CHAT_TYPE_TALKING`) is broadcast to all players in the sector view range.
- Shout (`CHAT_TYPE_SHOUT`) is broadcast to the entire map via `DESC_MANAGER`.
- Whisper uses a dedicated `CG::WHISPER` / `GC::WHISPER` pair and is routed by player name, crossing channels via `GG::RELAY` if needed.
- Server commands (beginning with `/`) are intercepted by `CInputMain` and dispatched to `cmd.h` / `cmd*.cpp` GM command handlers before any broadcast.

---

### 6. Item Pick Up

```
Client                               Game Server
──────────────────────────────────────────────────────────────────────
User presses Z (auto-pickup) or clicks ground item
CPythonNetworkStream::SendItemPickUpPacket(vid)
  ──> CG::ITEM_PICKUP ────────────────>
      (dwVID of ground item)
                                    CInputMain::ItemPickup()
                                    item = ITEM_MANAGER::Find(vid)
                                    ch->PickupItem(vid)
                                    ├── ownership check (loot timer)
                                    ├── item->RemoveFromGround()
                                    ├── ch->AutoGiveItem(item)
                                    │   └── CGrid::FindBlank() → first free slot
                                    └── Broadcast to nearby:
                                    <── GC::ITEM_GROUND_DEL ────────────────>
                                        (dwVID — remove from ground)
                                    <── GC::ITEM_SET ──────────────────────> (to picker's client)
                                        (Cell, dwVnum, count, attrs…)
```

1. `SendItemPickUpPacket(vid)` → `CG::ITEM_PICKUP`.
2. Server finds the `CItem` in `ITEM_MANAGER`, calls `ch->PickupItem(vid)`.
3. Ownership check: if the item has loot ownership assigned to another player and the timer has not expired, the pickup is denied.
4. `ch->AutoGiveItem(pkItem)` uses `CGrid::FindBlank()` to locate the first free inventory slot.
5. `GC::ITEM_GROUND_DEL` is broadcast to all nearby players (item disappears from ground).
6. `GC::ITEM_SET` is sent only to the picking player's `DESC` with the full item data.

---

## Key Files Reference

| File | Repo | Role |
|------|------|------|
| `server-src/src/common/packet_headers.h` | server-src | **Canonical source** of all CG/GC/GG/GD/DG packet header constants |
| `server-src/src/common/tables.h` | server-src | All packed structs exchanged over GD/DG: `TPlayerTable`, `TItemTable`, `TMobTable`, `TSkillTable`, etc. |
| `server-src/src/common/length.h` | server-src | All game-wide constants and enumerations (`EJobs`, `EWearPositions`, `EChatType`, `EPointTypes`, etc.) |
| `server-src/src/game/packet_structs.h` | server-src | All in-game CG/GC payload structs (`TPacketCGAttack`, `TPacketGCChat`, etc.) |
| `server-src/src/game/input.h` | server-src | Declares all server-side input processor classes (`CInputHandshake`, `CInputLogin`, `CInputMain`, `CInputDB`) |
| `server-src/src/game/input_login.cpp` | server-src | Implements `CInputLogin`: handles `CG::LOGIN_SECURE`, `CG::PLAYER_SELECT`, `CG::PLAYER_CREATE`, `CG::PLAYER_DELETE` |
| `server-src/src/game/input_main.cpp` | server-src | Implements `CInputMain` (PHASE_GAME): handles all in-game CG packets — move, attack, chat, item, skill, quest, guild, party |
| `server-src/src/game/desc.h` / `desc.cpp` | server-src | `DESC`: per-connection state, ring buffers, phase management, `SecureCipher` |
| `server-src/src/game/desc_manager.h` / `desc_manager.cpp` | server-src | `DESC_MANAGER`: accepts connections, owns all DESCs, drives fdwatch I/O |
| `server-src/src/game/SecureCipher.h` / `SecureCipher.cpp` | server-src | libsodium X25519 + XSalsa20-Poly1305 encryption layer |
| `server-src/src/game/char.h` | server-src | `CHARACTER`: central entity class for all actors; implements `Move`, `Damage`, `UseSkill`, `PickupItem`, etc. |
| `server-src/src/game/char_item.cpp` | server-src | Character item methods: `PickupItem`, `AutoGiveItem`, `UseItem`, `DropItem` |
| `server-src/src/game/battle.h` / `char_battle.cpp` | server-src | `battle_melee_attack`, `CalcMeleeDamage`, `CalcAttackRating`, speed-hack detection |
| `server-src/src/game/cmd.h` / `cmd*.cpp` | server-src | GM slash-command dispatch (hooked into `CInputMain::Chat`) |
| `server-src/src/game/db.h` / `db.cpp` | server-src | `CDBManager`: wraps the GD/DG channel to the db process |
| `server-src/src/game/p2p.h` / `p2p.cpp` | server-src | `P2PManager`: manages GG connections between game server instances |
| `server-src/src/libthecore/ring_buffer.h` | server-src | `RingBuffer`: growable byte buffer for all network I/O staging |
| `server-src/src/libthecore/socket.h` | server-src | TCP socket helpers (`socket_tcp_bind`, `socket_accept`, `socket_nodelay`, etc.) |
| `server-src/src/libthecore/fdwatch.h` | server-src | I/O multiplexer (kqueue / select backend) |
| `server-src/src/db/ClientManager.h` / `ClientManager.cpp` | server-src | `CClientManager`: db process central dispatcher for all GD packets |
| `server-src/src/db/ClientManagerLogin.cpp` | server-src | Login authentication: `QUERY_LOGIN`, `RESULT_LOGIN` |
| `server-src/src/db/ClientManagerPlayer.cpp` | server-src | Player load/save/create/delete handlers |
| `server-src/src/db/Peer.h` / `Peer.cpp` | server-src | `CPeer`: one connected game server peer in the db process |
| `client-src/src/UserInterface/PythonNetworkStream.h` | client-src | `CPythonNetworkStream`: singleton TCP client; all `Send*` methods and phase handler maps |
| `client-src/src/UserInterface/PythonNetworkStream.cpp` | client-src | Core implementation: `OnProcess()`, `DispatchPacket()`, phase setup/teardown |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseHandshake.cpp` | client-src | Handshake phase: key exchange, `GC::HANDSHAKE` handler |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLogin.cpp` | client-src | Login phase: `GC::LOGIN_SUCCESS` / `GC::LOGIN_FAILURE` handlers |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseSelect.cpp` | client-src | Select phase: character slot display, `CG::PLAYER_SELECT` send |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLoading.cpp` | client-src | Loading phase: `GC::MAIN_CHARACTER`, `GC::CHARACTER_ADD`, `GC::ITEM_SET` receive |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | client-src | Game phase: all `Recv*` handlers for in-game GC packets |
| `client-src/src/UserInterface/PythonNetworkStreamCommand.cpp` | client-src | Client-command processing (server commands routed to Python) |
| `client-src/src/UserInterface/NetworkActorManager.h` / `.cpp` | client-src | `CNetworkActorManager`: translates network actor data into `CInstanceBase` objects |
| `client-src/src/UserInterface/AccountConnector.h` / `.cpp` | client-src | `CAccountConnector`: manages the pre-game auth-server connection |
| `client-src/src/UserInterface/Packet.h` | client-src | Client-side packet type definitions (mirrors `packet_structs.h`) |
| `client-bin/assets/root/networkmodule.py` | client-bin | `MainStream`: Python-level phase controller; drives `SetLoginPhase()`, `SetGamePhase()`, etc. |
| `client-bin/assets/root/serverinfo.py` | client-bin | Static server list: IP addresses, channel ports, auth/mark server config |
| `client-bin/assets/root/intrologin.py` | client-bin | Login window — collects credentials and calls `net.Connect()` |
| `client-bin/assets/root/introselect.py` | client-bin | Character select window — calls `net.SendSelectCharacterPacket()` |
| `client-bin/assets/root/uichat.py` | client-bin | Chat UI — calls `net.SendChatPacket()` |
| `client-bin/assets/root/uiinventory.py` | client-bin | Inventory UI — calls `net.SendItemPickUpPacket()`, `SendItemDropPacket()`, etc. |

---

## Dispatcher Architecture

### Server Side

The server dispatches inbound CG packets using a phase-keyed input processor pattern:

```
DESC::ProcessInput()
  └── RingBuffer (input)
        └── m_pInputProcessor->ProcessPacket(ch, packet, buffer)
              ├── CInputHandshake  (PHASE_HANDSHAKE)
              ├── CInputLogin      (PHASE_LOGIN / PHASE_SELECT)
              ├── CInputMain       (PHASE_GAME / PHASE_DEAD)
              └── CInputDB         (GD/DG channel)
```

Each `CInput*` class has a `ProcessPacket(desc, data, len)` method that reads the header byte and dispatches to a dedicated handler function. `CInputMain` is by far the largest, with ~50 handler functions for every in-game action.

### Client Side

The client uses per-phase `PacketHandlerMap` tables (hash maps from `uint16_t` header to a `PacketHandlerEntry`):

```
CPythonNetworkStream::OnProcess()
  └── DispatchPacket(m_<phase>Handlers)
        └── for each available byte:
              read header (uint16_t)
              → look up PacketHandlerEntry
              → guard: ReadableBytes() >= entry.minSize?
              → call handler()   // e.g. RecvCharacterMovePacket()
              → if entry.exitPhase: break (stop after phase-change packets)
```

Each phase registers its handlers via `Register*Handlers()` called from the corresponding `Set*Phase()` method. The `exitPhase` flag stops the dispatch loop after a `GC::PHASE` packet so the new phase's handlers are used for subsequent packets.

---

## Security Considerations

| Threat | Mitigation |
|--------|-----------|
| Packet injection / replay | X25519 + XSalsa20-Poly1305 encryption on the entire session |
| Speed hacking (movement) | `IS_SPEED_HACK()` in `battle.h` gates attack frequency by timestamp |
| Speed hacking (movement) | Server recalculates position from move time and speed; large deviations trigger `SyncPacket()` |
| Item duplication | Server is authoritative for all item positions; `GC::ITEM_SET` / `GC::ITEM_DEL` are the only source of truth |
| Loot steal | `CItem::SetOwnership(ch, iSec)` enforces a time-limited ownership window before an item becomes freely pickable |
| Duplicate login | `DESC::DisconnectOfSameLogin()` kicks the existing session when a new login succeeds |
| Account bruteforce | DB-side: failed-login counter with lockout (handled in `QUERY_LOGIN`) |
| Client binary tampering | `ProcessCRC.h` / `ProcessScanner.h` in UserInterface verify the binary's CRC at runtime |
