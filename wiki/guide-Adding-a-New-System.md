# Guide: Adding a New System — End-to-End Walkthrough

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [How Everything Fits Together](concept-architecture)
> - [What is a Packet?](concept-packets) — full packet reference is at [topic-Game-Client-Protocol](topic-Game-Client-Protocol) and [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) (needed when defining new CG/GC headers)
> - [Security Checklist](guide-Security-AntiCheat) — new system handlers should follow this before going live
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> A complete step-by-step guide for building a new feature that touches all layers: Python UI → C++ client → packet → server → database.

## Overview

This guide uses a concrete example: **a "Daily Reward" system**. A player clicks a button in a new UI window, the server checks if they've claimed today's reward, and if not, gives them an item and records the claim.

The same pattern applies to any new system regardless of what it does.

---

## Architecture of a New System

```
client-bin/assets/uiscript/  dailyreward.py      ← window layout (dict)
client-bin/assets/root/       uidailyreward.py    ← window logic (Python class)
client-bin/assets/root/       interfacemodule.py  ← register/open the window

client-src/src/UserInterface/  PythonNetworkStream  ← SendDailyRewardPacket()
client-src/src/UserInterface/  PythonNetworkStream  ← RecvDailyRewardResultPacket()

server-src/src/common/         packet_headers.h    ← CG + GC header constants
server-src/src/common/         (struct header)     ← TPacketCGDailyReward, TPacketGCDailyRewardResult
server-src/src/game/           input_main.cpp      ← CInputMain::DailyReward()
server-src/src/game/           char_daily.cpp      ← new file: system logic
server-src/src/game/           char.h              ← new member + method declarations

DB:                            player_daily table  ← stores last_claim_date per player
```

---

## Step 1 — Define the Packets

### Server: packet_headers.h

```cpp
namespace CG {
    // ... existing ...
    constexpr uint16_t DAILY_REWARD = 0x00E0;   // client → server: "claim reward"
}
namespace GC {
    // ... existing ...
    constexpr uint16_t DAILY_REWARD_RESULT = 0x00E1;  // server → client: result
}
```

### Server: packet structs (add to tables.h or a new header)

```cpp
#pragma pack(push, 1)
struct TPacketCGDailyReward {
    uint16_t header = CG::DAILY_REWARD;
    uint16_t size   = sizeof(TPacketCGDailyReward);
};

struct TPacketGCDailyRewardResult {
    uint16_t header  = GC::DAILY_REWARD_RESULT;
    uint16_t size    = sizeof(TPacketGCDailyRewardResult);
    uint8_t  success;     // 1 = reward granted, 0 = already claimed
    uint32_t item_vnum;   // item given (0 if not granted)
};
#pragma pack(pop)
```

### Client: mirror in PythonNetworkStream header

The same structs (with identical memory layout) must exist on the client side.

---

## Step 2 — Server Handler

### Register in input_main.cpp

```cpp
// In CInputMain::Process() dispatch table:
case CG::DAILY_REWARD:
    DailyReward(d, c_pData);
    r_iBytesProceed += sizeof(TPacketCGDailyReward);
    break;
```

### Implement in input_main.cpp (or a new char_daily.cpp)

```cpp
void CInputMain::DailyReward(LPDESC d, const char* c_pData)
{
    LPCHARACTER ch = d->GetCharacter();
    if (!ch) return;

    ch->ClaimDailyReward();
}
```

### Implement in char.cpp / char_daily.cpp

```cpp
void CHARACTER::ClaimDailyReward()
{
    // Check if already claimed today (use a quest flag or DB query)
    if (GetQuestFlag("daily_reward.last_day") == get_server_time_sec() / 86400)
    {
        // Already claimed today — send failure result
        TPacketGCDailyRewardResult pack;
        pack.success   = 0;
        pack.item_vnum = 0;
        GetDesc()->Packet(&pack, sizeof(pack));
        return;
    }

    // Mark as claimed
    SetQuestFlag("daily_reward.last_day", get_server_time_sec() / 86400);

    // Give the reward item
    AutoGiveItem(50001, 1);   // item vnum 50001, count 1

    // Send success result to client
    TPacketGCDailyRewardResult pack;
    pack.success   = 1;
    pack.item_vnum = 50001;
    GetDesc()->Packet(&pack, sizeof(pack));
}
```

> **Note:** `SetQuestFlag` / `GetQuestFlag` persist to the `quest` table in MariaDB automatically via the db process. No additional SQL needed for simple flag storage.

---

## Step 3 — Client C++ Send and Receive

### Sending: CPythonNetworkStream

```cpp
// PythonNetworkStream.h
bool SendDailyRewardPacket();

// PythonNetworkStreamPhaseGame.cpp
bool CPythonNetworkStream::SendDailyRewardPacket()
{
    TPacketCGDailyReward pack;
    if (!Send(sizeof(pack), &pack))
    {
        Tracef("SendDailyRewardPacket: send failed\n");
        return false;
    }
    return true;
}
```

### Receiving: RegisterRecvPacket

```cpp
// In CPythonNetworkStream::SetGamePhase():
m_recvPacketMap[GC::DAILY_REWARD_RESULT] = std::bind(
    &CPythonNetworkStream::RecvDailyRewardResultPacket, this);
```

```cpp
bool CPythonNetworkStream::RecvDailyRewardResultPacket()
{
    TPacketGCDailyRewardResult pack;
    if (!Recv(sizeof(pack), &pack))
        return false;

    PyCallClassMemberFunc(m_apoPhaseWnd[PHASE_WINDOW_GAME],
        "OnDailyRewardResult",
        Py_BuildValue("(bi)", pack.success, pack.item_vnum));
    return true;
}
```

### Expose to Python: PythonNetworkStreamModule.cpp

```cpp
// Register in the net module:
{ "SendDailyRewardPacket", net_SendDailyRewardPacket, METH_VARARGS },

// Implementation:
PyObject* net_SendDailyRewardPacket(PyObject* self, PyObject* args)
{
    CPythonNetworkStream::instance().SendDailyRewardPacket();
    Py_RETURN_NONE;
}
```

---

## Step 4 — UI Script (Layout)

Create `client-bin/assets/uiscript/dailyreward.py`:

```python
window = {
    "name"    : "DailyRewardWindow",
    "x"       : 0,
    "y"       : 0,
    "style"   : ("movable", "float"),
    "width"   : 200,
    "height"  : 150,
    "children": (
        {
            "name"  : "board",
            "type"  : "board_with_titlebar",
            "x": 0, "y": 0,
            "width": 200, "height": 150,
            "title" : "Daily Reward",
            "children": (
                {
                    "name"    : "ClaimButton",
                    "type"    : "button",
                    "x": 60, "y": 90,
                    "width"   : 80,
                    "height"  : 25,
                    "text"    : "Claim",
                    "default_image" : "d:/ymir work/ui/public/btn_middle_normal.sub",
                    "over_image"    : "d:/ymir work/ui/public/btn_middle_over.sub",
                    "down_image"    : "d:/ymir work/ui/public/btn_middle_down.sub",
                },
            ),
        },
    ),
}
```

---

## Step 5 — Python Logic

Create `client-bin/assets/root/uidailyreward.py`:

```python
import ui
import net
import localeInfo

class DailyRewardWindow(ui.ScriptWindow):

    def __init__(self):
        ui.ScriptWindow.__init__(self)
        self.__LoadUI()

    def __LoadUI(self):
        pyScrLoader = ui.PythonScriptLoader()
        pyScrLoader.LoadScriptFile(self, "uiscript/dailyreward.py")
        self.GetChild("ClaimButton").SetEvent(self.__OnClickClaim)

    def __OnClickClaim(self):
        net.SendDailyRewardPacket()

    def OnDailyRewardResult(self, success, itemVnum):
        if success:
            import chat
            chat.AppendChat(chat.CHAT_TYPE_INFO,
                            "You received your daily reward!")
        else:
            import chat
            chat.AppendChat(chat.CHAT_TYPE_INFO,
                            "Already claimed today. Come back tomorrow!")
```

---

## Step 6 — Register in interfacemodule.py

```python
# In interfacemodule.Interface.__init__ or a lazy-load method:
import uidailyreward
self.wndDailyReward = None

def OpenDailyReward(self):
    if not self.wndDailyReward:
        self.wndDailyReward = uidailyreward.DailyRewardWindow()
    self.wndDailyReward.Show()

def OnDailyRewardResult(self, success, itemVnum):
    if self.wndDailyReward:
        self.wndDailyReward.OnDailyRewardResult(success, itemVnum)
```

Add the `OnDailyRewardResult` callback to `GameWindow` so it routes to the interface:
```python
def OnDailyRewardResult(self, success, itemVnum):
    self.interface.OnDailyRewardResult(success, itemVnum)
```

---

## Step 7 — Feature Toggle

Wrap all new server-side code in a `#define`:

```cpp
// service.h
#define ENABLE_DAILY_REWARD_SYSTEM
```

```cpp
// input_main.cpp
#ifdef ENABLE_DAILY_REWARD_SYSTEM
    case CG::DAILY_REWARD:
        DailyReward(d, c_pData);
        r_iBytesProceed += sizeof(TPacketCGDailyReward);
        break;
#endif
```

---

## Step 8 — Test Checklist

- [ ] Packet header constants are unique (no collision with existing headers)
- [ ] `#pragma pack(1)` structs are byte-identical on client and server
- [ ] Handler validates character is non-null and in `PHASE_GAME`
- [ ] Server never uses a client-provided value for the reward amount
- [ ] Quest flags persist across logout/login
- [ ] UI closes correctly when character logs out
- [ ] Feature can be disabled by commenting out `#define ENABLE_DAILY_REWARD_SYSTEM`

---

## Related Guides

| Guide | When to use |
|-------|------------|
| [guide-Best-Practices](guide-Best-Practices) | Coding standards for new code |
| [guide-Security-AntiCheat](guide-Security-AntiCheat) | Handler security checklist |
| [topic-Game-Client-Protocol](topic-Game-Client-Protocol) | Full packet reference and dispatcher architecture |
| [topic-UI-Python-System](topic-UI-Python-System) | UI widget classes and event system |
| [guide-Database-Proto](guide-Database-Proto) | Adding items to give as rewards |
| [topic-Quest-System](topic-Quest-System) | `SetQuestFlag` / `GetQuestFlag` API |
