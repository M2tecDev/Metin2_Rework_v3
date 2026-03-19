# UserInterface

> Main game executable entry point, network protocol implementation, and all Python game-module bindings.

## Overview

UserInterface is the final assembly point: it produces the `Metin2.exe` binary. It contains `CPythonApplication` (the top-level application class), the full network-protocol implementation (`CPythonNetworkStream`), and every Python C extension module that exposes game state to scripts. The library bridges the C++ game engines (EterLib, GameLib, EffectLib, AudioLib) with the Python UI scripts. Because of its size it is documented in sub-pages.

## Sub-pages

| Sub-page | Covers |
|----------|--------|
| [UserInterface — NetworkStream](client-src-UserInterface-NetworkStream.md) | `CPythonNetworkStream`: packet send/receive, protocol dispatch |
| [UserInterface — PhaseLogin](client-src-UserInterface-PhaseLogin.md) | Login phase: server connection, account auth, character slot display |
| [UserInterface — PhaseSelect](client-src-UserInterface-PhaseSelect.md) | Character selection phase |
| [UserInterface — PhaseGame](client-src-UserInterface-PhaseGame.md) | Gameplay phase: actor sync, item/skill/chat/party/guild packets |
| [UserInterface — Connector](client-src-UserInterface-Connector.md) | `AccountConnector`, `ServerStateChecker`, guild mark upload/download |

## Dependencies

- All other client libraries (EterLib, EterGrnLib, EterPythonLib, GameLib, EffectLib, AudioLib, PackLib, ScriptLib, SphereLib, SpeedTreeLib)
- Python 3.x (embedded)
- Discord Rich Presence (optional, `ENABLE_DISCORD_RPC`)

## Files (summary)

| File | Purpose |
|------|---------|
| `UserInterface.cpp` | `main()` / `WinMain()`: registers all Python modules, initializes subsystems, calls `CPythonApplication::Run()` |
| `PythonApplication.h/.cpp` | `CPythonApplication`: top-level application combining window, D3D, input, and all game systems |
| `PythonNetworkStream.h/.cpp` | Network stream with all packet send/receive methods |
| `PythonNetworkStreamPhase*.cpp` | Phase-specific receive handlers |
| `PythonNetworkStreamCommand.cpp` | Client-command processing |
| `PythonNetworkStreamEvent.cpp` | Network event callbacks |
| `PythonNetworkStreamModule.cpp` | `net` Python module registration |
| `InstanceBase.h/.cpp` | `CInstanceBase`: actor instance visible in the game world (wraps `CActorInstance`) |
| `InstanceBase*.cpp` | Battle, effect, event, motion, movement, transform sub-implementations |
| `PythonPlayer.h/.cpp` | `CPythonPlayer`: local player state (HP, SP, inventory, quick slots, skills) |
| `PythonCharacterManager.h/.cpp` | `CPythonCharacterManager`: all visible actor management |
| `PythonNonPlayer.h/.cpp` | `CPythonNonPlayer`: NPC name/level/title data |
| `PythonItem.h/.cpp` | `CPythonItem`: Python-accessible item state |
| `PythonSkill.h/.cpp` | `CPythonSkill`: skill data and cooldown queries |
| `PythonChat.h/.cpp` | `CPythonChat`: chat history and filter |
| `PythonTextTail.h/.cpp` | `CPythonTextTail`: floating name/HP labels |
| `PythonGuild.h/.cpp` | `CPythonGuild`: guild info, member list, mark |
| `PythonQuest.h/.cpp` | `CPythonQuest`: quest state and dialog |
| `PythonExchange.h/.cpp` | `CPythonExchange`: trade exchange state |
| `PythonShop.h/.cpp` | `CPythonShop`: NPC shop item list |
| `PythonMessenger.h/.cpp` | `CPythonMessenger`: friends list and online status |
| `PythonSafeBox.h/.cpp` | `CPythonSafeBox`: safe-box (bank) item list |
| `PythonMiniMap.h/.cpp` | `CPythonMiniMap`: mini-map rendering |
| `PythonIME.h/.cpp` | `CPythonIME`: input method editor state |
| `PythonSystem.h/.cpp` | `CPythonSystem`: game settings (resolution, gamma, etc.) |
| `PythonEventManager.h/.cpp` | `CPythonEventManager`: timed in-game event scheduling |
| `AccountConnector.h/.cpp` | `CAccountConnector`: login-server connection before the main game server |
| `NetworkActorManager.h/.cpp` | `CNetworkActorManager`: creates/updates `CInstanceBase` objects from network actor data |
| `AffectFlagContainer.h/.cpp` | Stores and queries active buff/debuff flags |
| `GuildMarkDownloader.h/.cpp` | Downloads guild mark images from the mark server |
| `GuildMarkUploader.h/.cpp` | Uploads guild mark images to the mark server |
| `MarkImage.h/.cpp`, `MarkManager.h/.cpp` | Guild mark atlas management |
| `InsultChecker.h/.cpp` | Chat profanity/insult word filter |
| `ServerStateChecker.h/.cpp` | Polls server list for status |
| `CameraProcedure.cpp` | Camera mode handling (third-person, free cam) |
| `ProcessCRC.h/.cpp`, `ProcessScanner.h/.cpp` | Anti-cheat: process/file CRC verification |
| `PythonExceptionSender.h/.cpp` | Reports unhandled Python exceptions to the server |
| `Packet.h` | Complete client-server packet type definitions |
| `Discord.h` | Discord Rich Presence helper functions (inline) |
| `Locale.h/.cpp` | Locale detection and string conversion helpers |
| `GameType.h/.cpp` | `TItemPos`, `TShopItemTable`, and other shared types |
| `MovieMan.h/.cpp` | `CMovieMan`: AVI movie playback using DirectShow |
| `Version.h` | Client version string constants |
