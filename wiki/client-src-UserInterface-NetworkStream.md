# UserInterface — NetworkStream

> `CPythonNetworkStream`: the central TCP protocol hub managing all packet send/receive operations and phase-driven dispatch for the Metin2 client.

[← Back to UserInterface index](client-src-UserInterface.md)

## Overview

`CPythonNetworkStream` inherits from `CNetworkStream` (the encrypted TCP layer in EterLib) and `CSingleton<CPythonNetworkStream>`. It is the single point of contact between the game logic and the server. All outbound packets are written via `Send*` methods; all inbound packets are parsed by `Recv*` handlers organised into per-phase dispatch tables.

Phase transitions are driven by the server: when a `PHASE` packet arrives the stream switches its active dispatch table and calls the appropriate `Set*Phase()` method. Each phase owns a `PacketHandlerMap` (an `unordered_map<uint16_t, PacketHandlerEntry>`) that maps packet headers to member function pointers, a minimum expected size, and an `exitPhase` flag.

---

## Class: `CPythonNetworkStream`

**File:** `UserInterface/PythonNetworkStream.h`

### Enumerations

#### Server Commands
| Value | Meaning |
|-------|---------|
| `SERVER_COMMAND_LOG_OUT` (0) | Force logout |
| `SERVER_COMMAND_RETURN_TO_SELECT_CHARACTER` (1) | Return to character select |
| `SERVER_COMMAND_QUIT` (2) | Quit the game |

#### Phase Windows (`PHASE_WINDOW_*`)
| Value | Window |
|-------|--------|
| `PHASE_WINDOW_LOGO` | Logo / splash screen |
| `PHASE_WINDOW_LOGIN` | Login form |
| `PHASE_WINDOW_SELECT` | Character select |
| `PHASE_WINDOW_CREATE` | Character creation |
| `PHASE_WINDOW_LOAD` | World loading screen |
| `PHASE_WINDOW_GAME` | In-game HUD |
| `PHASE_WINDOW_EMPIRE` | Empire selection |

#### Account Character Slot Fields (`ACCOUNT_CHARACTER_SLOT_*`)
`ID`, `NAME`, `RACE`, `LEVEL`, `STR`, `DEX`, `HTH`, `INT`, `PLAYTIME`, `FORM`, `ADDR`, `PORT`, `GUILD_ID`, `GUILD_NAME`, `CHANGE_NAME_FLAG`, `HAIR`

#### UI Refresh Flags (`REFRESH_WINDOW_TYPE`)
Bitmask constants: `RefreshStatus`, `RefreshCharacterWindow`, `RefreshEquipmentWindow`, `RefreshInventoryWindow`, `RefreshExchangeWindow`, `RefreshSkillWindow`, `RefreshSafeboxWindow`, `RefreshMessengerWindow`, `RefreshGuildWindow*`, `RefreshTargetBoard`, `RefreshMallWindow`

### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_dwMainActorVID` | `DWORD` | VID of the local player actor |
| `m_dwMainActorRace` | `DWORD` | Race of the local player |
| `m_dwMainActorEmpire` | `DWORD` | Empire of the local player |
| `m_dwMainActorSkillGroup` | `DWORD` | Active skill group index |
| `m_isGameOnline` | `BOOL` | True while the game-phase connection is active |
| `m_isStartGame` | `BOOL` | True after `StartGame()` has been called |
| `m_dwGuildID` | `DWORD` | Current player's guild ID |
| `m_dwEmpireID` | `DWORD` | Current player's empire ID |
| `m_kServerTimeSync` | `SServerTimeSync` | Server/client time offset for lag correction |
| `m_dwLastGamePingTime` | `DWORD` | Timestamp of the last game ping |
| `m_stID` | `std::string` | Stored login ID |
| `m_stPassword` | `std::string` | Stored login password |
| `m_dwLoginKey` | `DWORD` | Login session key |
| `m_phaseProcessFunc` | `CFuncObject<…>` | Function pointer to the active phase process callback |
| `m_phaseLeaveFunc` | `CFuncObject<…>` | Function pointer to the active phase leave callback |
| `m_poHandler` | `PyObject*` | Python handler object receiving network events |
| `m_apoPhaseWnd[]` | `PyObject*[PHASE_WINDOW_NUM]` | Python window objects per phase |
| `m_poSerCommandParserWnd` | `PyObject*` | Window that parses server command strings |
| `m_akSimplePlayerInfo` | `TSimplePlayerInformation[4]` | Per-slot character summary data |
| `m_rokNetActorMgr` | `CRef<CNetworkActorManager>` | Actor manager that creates/updates `CInstanceBase` objects |
| `m_EmoticonStringVector` | `std::vector<std::string>` | Registered emoticon trigger strings |
| `m_kInsultChecker` | `CInsultChecker` | Chat profanity filter |
| `m_kMarkAuth` | `SMarkAuth` | Mark server connection credentials |
| `m_kBettingGuildWar` | `SBettingGuildWar` | Betting war observer/money counters |
| `m_offlineHandlers` … `m_gameHandlers` | `PacketHandlerMap` | Per-phase dispatch tables |
| `m_aRecentRecvPackets[]` | `PacketLogEntry[32]` | Ring buffer of last 32 received packets for debug |

### Key Methods — Phase Management

| Method | Description |
|--------|-------------|
| `SetOffLinePhase()` | Switches to offline (disconnected) phase |
| `SetHandShakePhase()` | Switches to handshake (encryption setup) phase |
| `SetLoginPhase()` | Switches to login phase; registers login packet handlers |
| `SetSelectPhase()` | Switches to character select phase |
| `SetLoadingPhase()` | Switches to world loading phase |
| `SetGamePhase()` | Switches to full game phase; calls `__InitializeGamePhase()` |
| `ClosePhase()` | Tears down the current phase |
| `OnProcess()` | Called each frame; dispatches packets via the active phase handler map |

### Key Methods — Connection & Setup

| Method | Description |
|--------|-------------|
| `ConnectLoginServer(addr, port)` | Opens a TCP connection to the login/auth server |
| `ConnectGameServer(iChrSlot)` | Selects a character slot and opens the game server connection |
| `SetLoginInfo(id, password)` | Stores credentials for the login packet |
| `SetLoginKey(key)` | Stores the session key returned from the auth server |
| `SetHandler(poHandler)` | Binds the Python network event handler |
| `SetPhaseWindow(phase, wnd)` | Registers a Python window for the given phase |
| `SetMarkServer(addr, port)` | Configures the guild mark server address |

### Key Methods — Outbound Packets (Send*)

#### Combat / Movement
| Method | Description |
|--------|-------------|
| `SendAttackPacket(motAttack, victimVID)` | Sends a melee attack |
| `SendCharacterStatePacket(dstPos, rot, func, arg)` | Sends movement state (walk/run/stop) |
| `SendUseSkillPacket(skillIndex, targetVID)` | Activates a skill on an optional target |
| `SendTargetPacket(vid)` | Sets the current target |
| `SendFlyTargetingPacket(targetVID, pos)` | Fires a targeted projectile |
| `SendShootPacket(skill)` | Fires an arrow/bow shot |
| `SendSyncPositionElementPacket(victimVID, x, y)` | Syncs a victim's position |

#### Items
| Method | Description |
|--------|-------------|
| `SendItemUsePacket(pos)` | Uses an item from inventory |
| `SendItemUseToItemPacket(src, dst)` | Uses one item on another |
| `SendItemDropPacketNew(pos, elk, count)` | Drops an item (with yang/count) |
| `SendItemMovePacket(pos, newPos, count)` | Moves an item within inventory |
| `SendItemPickUpPacket(vid)` | Picks up a ground item |

#### Shop / Exchange
| Method | Description |
|--------|-------------|
| `SendShopBuyPacket(count)` | Buys from the open NPC shop |
| `SendShopSellPacketNew(slot, count)` | Sells to the open NPC shop |
| `SendExchangeStartPacket(vid)` | Initiates a player trade |
| `SendExchangeItemAddPacket(itemPos, displayPos)` | Adds an item to the trade |
| `SendExchangeElkAddPacket(elk)` | Adds yang to the trade |
| `SendExchangeAcceptPacket()` | Confirms the trade |
| `SendBuildPrivateShopPacket(name, stock)` | Opens a private player shop |

#### Guild
| Method | Description |
|--------|-------------|
| `SendGuildAddMemberPacket(vid)` | Invites a player to the guild |
| `SendGuildRemoveMemberPacket(pid)` | Removes a guild member |
| `SendGuildChangeGradeNamePacket(grade, name)` | Renames a guild grade |
| `SendGuildOfferPacket(exp)` | Donates experience to the guild |
| `SendGuildDepositMoneyPacket(money)` | Deposits yang into the guild treasury |
| `SendGuildUseSkillPacket(skillID, targetVID)` | Uses a guild skill |

#### Party
| Method | Description |
|--------|-------------|
| `SendPartyInvitePacket(vid)` | Invites a player to the party |
| `SendPartyInviteAnswerPacket(leaderVID, accept)` | Responds to a party invitation |
| `SendPartyRemovePacket(pid)` | Removes a party member |
| `SendPartySetStatePacket(vid, state, flag)` | Changes party member role |

#### SafeBox / Mall
| Method | Description |
|--------|-------------|
| `SendSafeBoxCheckinPacket(invPos, sbPos)` | Deposits an item into the safe-box |
| `SendSafeBoxCheckoutPacket(sbPos, invPos)` | Withdraws an item from the safe-box |
| `SendMallCheckoutPacket(mallPos, invPos)` | Withdraws an item from the premium mall |

#### Quest / Script
| Method | Description |
|--------|-------------|
| `SendScriptAnswerPacket(answer)` | Answers a scripted dialog choice |
| `SendQuestInputStringPacket(string)` | Submits a text input for a quest |
| `SendQuestConfirmPacket(answer, pid)` | Confirms a quest dialog prompt |

### Key Methods — Inbound Packets (Recv*)

All `Recv*` methods follow the pattern: read from the network ring buffer, update game state (Python objects, character manager, item tables, etc.), and call Python callbacks via `m_poHandler`. A selection of important handlers:

| Method | Phase | Description |
|--------|-------|-------------|
| `__RecvLoginSuccessPacket3/4()` | Login | Receives character slot list and login key |
| `__RecvLoginFailurePacket()` | Login | Receives login error code |
| `RecvMainCharacter()` | Loading | Receives the local player's full data on enter |
| `RecvCharacterAppendPacket()` | Game | Spawns a new visible actor |
| `RecvCharacterUpdatePacket()` | Game | Updates an existing actor's equipment/state |
| `RecvCharacterDeletePacket()` | Game | Despawns an actor |
| `RecvCharacterMovePacket()` | Game | Updates actor movement |
| `RecvItemSetPacket()` | Game | Sets an item in inventory |
| `RecvItemDelPacket()` | Game | Removes an item from inventory |
| `RecvItemGroundAddPacket()` | Game | Spawns a ground-dropped item |
| `RecvChatPacket()` | Game | Delivers a chat message |
| `RecvWhisperPacket()` | Game | Delivers a whisper message |
| `RecvSkillLevel()` | Game | Updates a skill's level data |
| `RecvAffectAddPacket()` | Game | Applies a buff/debuff |
| `RecvAffectRemovePacket()` | Game | Removes a buff/debuff |
| `RecvGuild()` | Game | Dispatches guild sub-packets |
| `RecvPartyAdd/Remove/Update()` | Game | Party membership changes |
| `RecvSafeBoxSetPacket()` | Game | Updates safe-box inventory |
| `RecvFishing()` | Game | Drives the fishing mini-game |
| `RecvWarpPacket()` | Game | Teleports the player to a new location |
| `RecvCreateFlyPacket()` | Game | Creates a projectile via `CFlyingManager` |
| `RecvDragonSoulRefine()` | Game | Dragon Soul stone refine result |
| `RecvNPCList()` | Game | Populates the mini-map NPC list |

### Dispatch Architecture

```
OnProcess()
  └── DispatchPacket(m_<phase>Handlers)
        └── For each available byte:
              read header → look up PacketHandlerEntry
              → call handler()
              → if exitPhase: stop loop
```

Each phase registers its own handler map via `Register*Handlers()`. The `PacketHandlerEntry` struct holds a member function pointer, a minimum packet byte-size (for partial-read guard), and an `exitPhase` boolean that stops the dispatch loop after phase-changing packets.
