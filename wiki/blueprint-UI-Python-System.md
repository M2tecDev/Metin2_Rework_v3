# Blueprint: UI Python System

> Full-stack architecture blueprint for the embedded CPython UI engine — interpreter lifecycle, C extension module registration, widget system, event dispatch, and network phase integration. Companion to [UI Python System](topic-UI-Python-System).

---

## 1. Full-Stack Architecture

The UI Python System embeds a CPython interpreter inside the C++ game client. All UI is implemented in Python calling into C extension modules.

### Layer 1 — Interpreter Lifecycle (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/UserInterface/UserInterface.cpp` | `WinMain()`, module registration block | Entry point: registers all C extension modules before the interpreter runs any Python |
| `client-src/src/ScriptLib/PythonLauncher.h` / `PythonLauncher.cpp` | `CPythonLauncher::Create()`, `::RunFile()` | Initialises CPython interpreter (`Py_Initialize`), sets `sys.path`, executes `root/game.py` |
| `client-src/src/UserInterface/PythonApplication.h` / `PythonApplication.cpp` | `CPythonApplication::Init()`, `::Run()` | Application main loop: calls `Update()` + `Render()` each frame; owns the interpreter lifetime |
| `client-src/src/UserInterface/PythonApplication.cpp` | `CPythonApplication::UpdateGame()` | Per-frame call: processes network I/O (`CPythonNetworkStream::OnProcess()`), runs window manager update, renders scene |

### Layer 2 — C Extension Modules (C++)

All modules are registered in `UserInterface/UserInterface.cpp` via `PyImport_AppendInittab()` before `Py_Initialize()`.

| Module | Registration File | Key Exposed Functions |
|--------|------------------|-----------------------|
| `app` | `UserInterface/PythonApplicationModule.cpp` | `Exit()`, `GetTime()`, `GetGlobalTime()`, `GetFPS()`, camera control, screenshots |
| `wndMgr` | `EterPythonLib/PythonWindowManagerModule.cpp` | `Register()`, `Destroy()`, `SetPosition()`, `Show()`, `Hide()`, `Update()`, `Render()`, event dispatch |
| `grp` | `EterPythonLib/PythonGraphicModule.cpp` | `GenerateColor()`, `SetInterfaceRenderState()`, `RenderCoolTimeBox()`, gamma control |
| `grpImage` | `EterPythonLib/PythonGraphicImageModule.cpp` | Image/texture loading and rendering |
| `grpText` | `EterPythonLib/PythonGraphicTextModule.cpp` | Text instance creation, font selection, rendering |
| `net` | `UserInterface/PythonNetworkStreamModule.cpp` | `Connect()`, `Disconnect()`, `SendAttackPacket()`, `SendChatPacket()`, all `Send*` methods, phase hooks |
| `player` | `UserInterface/PythonPlayerModule.cpp` | `GetPoint()`, `GetStatus()`, inventory slot queries, quickslot access, position |
| `chr` | `UserInterface/PythonCharacterManagerModule.cpp` | `GetVIDByName()`, `GetRace()`, `GetPosition()`, motion state queries for all visible actors |
| `item` | `UserInterface/PythonItemModule.cpp` | `GetItemName()`, `GetItemType()`, `GetIconImage()`, socket/attribute data queries |
| `skill` | `UserInterface/PythonSkillModule.cpp` | `GetSkillName()`, `GetSkillLevel()`, `GetSkillCoolTime()`, mastery type |
| `chat` | `UserInterface/PythonChatModule.cpp` | `AppendChat()`, `GetChatCount()`, `GetChatString()`, `GetChatType()` |
| `guild` | `UserInterface/PythonGuildModule.cpp` | Member list, grade info, mark upload, war data |
| `quest` | `UserInterface/PythonQuestModule.cpp` | `GetQuestCount()`, `GetQuestTitle()`, `GetQuestLastIcon()` |
| `exchange` | `UserInterface/PythonExchangeModule.cpp` | Trade item/coin slots for both sides, accept flags |
| `shop` | `UserInterface/PythonShopModule.cpp` | NPC shop item list, count, price |
| `miniMap` | `UserInterface/PythonMiniMapModule.cpp` | Mini-map markers, atlas texture, `Update()`, `Render()` |
| `snd` | `UserInterface/PythonSoundManagerModule.cpp` | `PlaySound2D()`, `PlayBGM()`, `StopBGM()`, volume control |
| `effect` | `UserInterface/PythonEffectModule.cpp` | `RegisterEffect()`, `CreateEffect()`, `DeleteEffect()` |
| `ime` | `UserInterface/PythonIMEModule.cpp` | Input Method Editor: composition string, candidate list |
| `dbg` | `ScriptLib/PythonDebugModule.cpp` | Trace logging, `TraceError()`, `TraceLog()` |

### Layer 3 — Widget System (C++ + Python)

| File | Class | Role |
|------|-------|------|
| `client-src/src/EterPythonLib/PythonWindow.h` | `UI::CWindow` | Base widget: position, size, parent/child links, `OnUpdate()`, `OnRender()`, `OnMouseMove()` |
| `client-src/src/EterPythonLib/PythonWindow.h` | `UI::CTextLine`, `UI::CImageBox`, `UI::CButton`, `UI::CSlotWindow` | Concrete widget types registered via `wndMgr.Register*(type)` |
| `client-src/src/EterPythonLib/PythonWindowManager.h` | `CWindowManager::Register()`, `::Update()`, `::Render()` | Singleton: owns all `CWindow` objects keyed by integer handle; drives update/render tree |
| `client-bin/assets/root/ui.py` | `ui.Window`, `ui.Button`, `ui.ImageBox`, `ui.SlotWindow`, … | Python wrappers; call `wndMgr.Register*(type)` in `__init__`; delegate all C++ calls via the `hWnd` handle |
| `client-bin/assets/root/uicommon.py` | `ui.TitleBar`, `ui.Board`, `ui.Dialog`, `ui.ScrollBar` | Composite higher-level widgets built from `ui.py` primitives |
| `client-bin/assets/uiscript/uiscript/*.py` | Layout data dicts | Window layout definitions loaded by `ui.ScriptWindow.LoadScriptFile()` at window open time |

### Layer 4 — Network Phase Integration (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/UserInterface/PythonNetworkStream.h` | `CPythonNetworkStream` | Singleton TCP client; all network state; calls Python phase callbacks via `m_apoPhaseWnd[]` |
| `client-src/src/UserInterface/PythonNetworkStream.cpp` | `OnProcess()`, `DispatchPacket()` | Per-frame: reads bytes from ring buffer, dispatches to phase handler map |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseHandshake.cpp` | `SetHandshakePhase()` | Registers handshake-phase handlers; initiates key exchange |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLogin.cpp` | `SetLoginPhase()`, `SetSelectPhase()` | Registers login/select handlers; calls Python `SetLoginPhase()` / `SetSelectPhase()` callbacks |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseLoading.cpp` | `SetLoadingPhase()` | Registers loading handlers; calls Python `SetLoadingPhase()` |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `SetGamePhase()`, all `Recv*Packet()` | Registers game-phase handlers; each calls a Python callback on the game window object |

### Layer 5 — Python Phase Controller and UI Scripts

| File | Class / Function | Role |
|------|-----------------|------|
| `client-bin/assets/root/networkmodule.py` | `MainStream` | Python-side phase controller: `SetLoginPhase()`, `SetSelectPhase()`, `SetGamePhase()` open the correct window |
| `client-bin/assets/root/game.py` | `GameWindow` | Main in-game UI: event hub receiving all in-game callbacks from C++ (`OnNPCClick`, `OnAttack`, `OnPointChange`, …) |
| `client-bin/assets/root/intrologin.py` | `LoginWindow` | Login screen; calls `net.Connect()`, `net.SetLoginInfo()` |
| `client-bin/assets/root/introselect.py` | `SelectCharacterWindow` | Character select; calls `net.SendSelectCharacterPacket()` |
| `client-bin/assets/root/uiinventory.py` | `InventoryWindow` | Inventory grid window |
| `client-bin/assets/root/uicharacter.py` | `CharacterWindow` | Stat window |
| `client-bin/assets/root/uichat.py` | `ChatWindow` | Chat box; calls `net.SendChatPacket()` |
| `client-bin/assets/root/gameevent.py` | `OnPointChange()`, `OnAffectAdded()`, `OnKillEvent()` | Event dispatch layer: maps C++ callbacks to Python window methods |

---

## 2. Causal Chain

### Chain A: Python `ui.Button` click → C++ handler → packet sent

```
[Trigger]  Player clicks a button in the inventory window
    │
    ▼  C++ CWindowManager receives mouse event
[1] (EterPythonLib/PythonWindowManager.cpp : CWindowManager::Update)
    Hit-test tree of CWindow objects
    Finds the CButton whose rect contains the click point
    Calls PyCallable_Check(m_poOnClick) → calls Python callback
    │
    ▼  (root/uiinventory.py : InventoryWindow.UseItem)
[2] Python callback executes: reads slot index from button data
    Calls net.SendItemUsePacket(slotIndex)
    │
    ▼  (UserInterface/PythonNetworkStreamModule.cpp : net.SendItemUsePacket)
[3] C extension function called via CPython C API
    Builds TPacketCGItemUse in CPythonNetworkStream::SendItemUsePacket()
    Encrypts + sends over TCP
    │
    ▼  packet: CG::ITEM_USE (0x0501) travels to server
[4] Server processes packet; sends GC::ITEM_SET / GC::PLAYER_POINT_CHANGE back
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvItemSetPacket)
[5] Updates CPythonPlayer item cache
    Calls Python callback: game.py GameWindow.OnItemSet(cell, vnum, count)
    │
    ▼  (root/uiinventory.py : InventoryWindow.RefreshSlot)
[6] Reads player.GetItemIndex(slotIndex); updates slot widget display
    │
    ▼  [End] Inventory slot shows updated item state
```

### Chain B: C++ Recv packet → Python window callback

```
[Trigger]  Server sends GC::PLAYER_POINT_CHANGE (HP decreased)
    │
    ▼  (UserInterface/PythonNetworkStream.cpp : OnProcess)
[1] DispatchPacket reads header=0x0215 from ring buffer
    Looks up m_gameHandlers[0x0215] → RecvPointChangePacket
    │
    ▼  (UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvPointChangePacket)
[2] Reads type=POINT_HP, value=1234 from packet
    Updates CPythonPlayer::m_akPoint[POINT_HP] = 1234
    Calls m_apoPhaseWnd[PHASE_WINDOW_GAME]->OnPointChange(POINT_HP, 1234)
    (m_apoPhaseWnd is the Python GameWindow object, called via PyObject_CallMethod)
    │
    ▼  (root/gameevent.py : OnPointChange(type, value))
[3] gameevent.OnPointChange dispatches to registered listeners
    Calls character.py CharacterWindow.RefreshStatus()
    │
    ▼  (root/uicharacter.py : CharacterWindow.RefreshStatus)
[4] Reads player.GetPoint(POINT_HP) and player.GetPoint(POINT_MAX_HP)
    Updates HP bar widget: hpBar.SetPosition(…)
    │
    ▼  [End] HP bar reflects new value in next render frame
```

### Chain C: Python script loads a window from uiscript

```
[Trigger]  Player opens the guild window for the first time
    │
    ▼  (root/uiguild.py : GuildWindow.__init__)
[1] Python calls self.LoadScriptFile("uiscript/guild.py")
    │
    ▼  (root/ui.py : ScriptWindow.LoadScriptFile)
[2] Executes the layout data file: a Python dict defining all child widgets
    For each widget entry: calls wndMgr.Register(type), sets parent, position, size
    Binds event callbacks (OnClick, OnMouseOver, etc.)
    │
    ▼  (EterPythonLib/PythonWindowManagerModule.cpp : wndMgr.Register)
[3] Allocates the CWindow subclass instance in C++
    Returns integer hWnd handle to Python
    CWindow is inserted as child of the guild window's root CWindow
    │
    ▼  self.Show() called
    (EterPythonLib/PythonWindowManagerModule.cpp : wndMgr.Show(hWnd))
[4] Sets CWindow::m_bShow = true
    Window enters the render tree for next frame
    │
    ▼  [End] Guild window appears on screen with all widgets from the script layout
```

---

## 3. Dependency Matrix

### Sync Points

| What must match | C++ file | Python file | If out of sync |
|----------------|----------|-------------|----------------|
| Module name strings in `PyImport_AppendInittab()` vs `import` statements | `UserInterface/UserInterface.cpp` | Any `root/*.py` that imports the module | `ImportError` at startup; the script that imports the missing module fails to load |
| C function signature `PyObject* f(PyObject* self, PyObject* args)` vs Python call-site argument types | `UserInterface/Python*Module.cpp` | Corresponding `root/*.py` call site | `TypeError` at runtime; function receives wrong argument count or types |
| `wndMgr` widget type string constants (e.g. `"BUTTON"`, `"IMAGE"`, `"SLOTWINDOW"`) | `EterPythonLib/PythonWindowManagerModule.cpp` (type registry) | `root/ui.py` `Register*()` calls | `RuntimeError: unknown widget type`; window fails to create |
| Phase window slot indices `PHASE_WINDOW_GAME=0`, `_LOGIN=1`, `_SELECT=2`, etc. | `UserInterface/PythonNetworkStream.h` | `root/networkmodule.py` `SetGamePhase()` registration order | C++ sends callback to wrong Python window; in-game events fire on login screen |
| `player.GetPoint(type)` type constants vs `EPoints` enum values | `UserInterface/PythonPlayerModule.cpp` (constant registration) | `root/uicharacter.py` `player.POINT_*` usage | Character window displays wrong stat value; HP shown in wrong bar |
| `item.GetItemType(vnum)` return values vs `EItemTypes` enum | `UserInterface/PythonItemModule.cpp` | `root/uitooltip.py` item type switch | Wrong tooltip shown; item appears as wrong type in UI |
| `net.SendItemUsePacket(cell)` argument format vs `TPacketCGItemUse.Cell` | `UserInterface/PythonNetworkStreamModule.cpp` | `root/uiinventory.py` call site | Server receives wrong inventory cell index; wrong item used |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|------------|-------------------------|
| `PHASE_WINDOW_MAX` | (number of phase window slots) | `UserInterface/PythonNetworkStream.h` | Adding a new phase requires extending `m_apoPhaseWnd[]` array and all `SetPhase()` calls |
| `CWindowManager` hWnd counter | 32-bit integer | `EterPythonLib/PythonWindowManager.cpp` | After ~4 billion window create/destroy cycles the handle wraps; extremely unlikely in practice |
| `uiscript/` layout file execution | `exec()` in Python | `root/ui.py : ScriptWindow` | Layout files are executed as Python code; arbitrary code execution — never load untrusted layout files |
| Module registration timing | All modules must be registered before `Py_Initialize()` finishes | `UserInterface/UserInterface.cpp` | A module registered after interpreter start is never importable; scripts fail with `ImportError` |
| CPython GIL | Single-threaded | CPython internals | All Python calls from C++ must happen on the main thread; calling from a worker thread without the GIL crashes the interpreter |
| `wndMgr` widget parent chain depth | No hard limit, but deep trees add render cost | `EterPythonLib/PythonWindowManager.cpp` | Very deep widget hierarchies cause significant `Update()` / `Render()` overhead per frame |

---

## 4. Extension How-To

### How to add a new C++ → Python module function

1. **Implement the C function** in the relevant `UserInterface/Python*Module.cpp`:
   ```cpp
   static PyObject* playerGetGuildName(PyObject* self, PyObject* args) {
       LPCHARACTER ch = CPythonPlayer::Instance().GetCharacter();
       if (!ch || !ch->GetGuild()) Py_RETURN_NONE;
       return Py_BuildValue("s", ch->GetGuild()->GetName());
   }
   ```
2. **Add to the module's method table** in the same file:
   ```cpp
   static PyMethodDef s_methods[] = {
       // ...existing...
       {"GetGuildName", playerGetGuildName, METH_VARARGS, ""},
       {nullptr, nullptr, 0, nullptr}
   };
   ```
3. **Call from Python** in any `root/*.py` file:
   ```python
   guildName = player.GetGuildName()
   ```
4. No additional registration needed if the file already registers the module. No client rebuild needed for Python-only changes.

### How to add a new top-level C extension module

1. **Create `UserInterface/PythonMyModule.cpp`** with a `PyMODINIT_FUNC initMyModule()` and method table.
2. **Register before `Py_Initialize()`** in `UserInterface/UserInterface.cpp`:
   ```cpp
   PyImport_AppendInittab("mymodule", &initMyModule);
   ```
3. **Import in Python**:
   ```python
   import mymodule
   ```
4. **Add to CMakeLists.txt** so the new .cpp file is compiled into the `UserInterface` target.

### How to add a new Python UI window

1. **Create `client-bin/assets/root/uiMyWindow.py`** subclassing `ui.ScriptWindow`:
   ```python
   import ui
   class MyWindow(ui.ScriptWindow):
       def __init__(self):
           ui.ScriptWindow.__init__(self)
           self.LoadScriptFile("uiscript/mywindow.py")
   ```
2. **Create `client-bin/assets/uiscript/uiscript/mywindow.py`** with the layout dict defining all widgets.
3. **Open the window** from `interfacemodule.py` or `game.py` when the appropriate event fires:
   ```python
   self.myWnd = uiMyWindow.MyWindow()
   self.myWnd.Show()
   ```
4. **Pack the files** into the appropriate `.pck` archive for deployment.

### How to hook a new GC packet into Python

1. **Add handler registration** in `PythonNetworkStreamPhaseGame.cpp` : `SetGamePhase()`:
   ```cpp
   m_gameHandlers[GC::MY_NEW_PACKET] = {
       sizeof(TPacketGCMyNewPacket), false,
       [this]() { return RecvMyNewPacket(); }
   };
   ```
2. **Implement `RecvMyNewPacket()`** — parse the struct, then call the Python window:
   ```cpp
   bool CPythonNetworkStream::RecvMyNewPacket() {
       TPacketGCMyNewPacket pkt;
       if (!Recv(sizeof(pkt), &pkt)) return false;
       PyObject* poArgs = Py_BuildValue("(ii)", pkt.vid, pkt.value);
       PyCallObject(m_apoPhaseWnd[PHASE_WINDOW_GAME]->GetMethod("OnMyNewEvent"), poArgs);
       Py_DECREF(poArgs);
       return true;
   }
   ```
3. **Add the Python callback** in `game.py : GameWindow.OnMyNewEvent(vid, value)`.

### Controlling Constants

| Constant | File | Controls |
|----------|------|---------|
| Module name strings | `UserInterface/UserInterface.cpp` | What Python scripts can `import` |
| `PHASE_WINDOW_*` indices | `UserInterface/PythonNetworkStream.h` | Which Python window object gets each phase callback |
| Widget type strings | `EterPythonLib/PythonWindowManagerModule.cpp` | Valid values for `wndMgr.Register(type)` |
| `player.POINT_*` constants | `UserInterface/PythonPlayerModule.cpp` | Point type integers importable from Python |

---

## 5. Debug Anchors

| Symptom | Likely cause | Where to look |
|---------|-------------|---------------|
| `ImportError: No module named 'mymodule'` | Module not registered with `PyImport_AppendInittab()` before `Py_Initialize()` | `UserInterface/UserInterface.cpp` — verify the `AppendInittab` call exists before `Py_Initialize()` |
| `TypeError: argument 1 must be int, not str` on a `net.Send*` call | Python passing wrong type to C extension function | `UserInterface/PythonNetworkStreamModule.cpp` : the relevant `Send*` function — check `PyArg_ParseTuple` format string |
| `RuntimeError: unknown widget type 'MYWIDGET'` | New widget type string not registered in `CWindowManager` | `EterPythonLib/PythonWindowManagerModule.cpp` : type registry map — add the string and allocator |
| In-game events fire on the wrong window (e.g. login screen gets HP update) | Phase window index mismatch: wrong index stored in `m_apoPhaseWnd[]` | `UserInterface/PythonNetworkStream.h` `PHASE_WINDOW_*` constants vs `networkmodule.py` `Set*Phase()` registration order |
| `AttributeError: 'GameWindow' object has no attribute 'OnMyNewEvent'` | New packet handler calls a Python callback that isn't implemented in `game.py` | `root/game.py` — add the `OnMyNewEvent(self, vid, value)` method |
| Client crashes on window close | Python window `__del__` calls `wndMgr.Destroy(self.hWnd)` but C++ object already freed | Ensure `Destroy()` is only called once; check `ui.Window.Destroy()` guard in `ui.py` |
| Script layout file changes not reflected | Old `.pck` archive loaded from cache; updated `.py` file not packed | Re-pack the uiscript directory into the archive; verify pack load order in `CPackManager` |
| `sys_err: CPythonLauncher: RunFile failed on root/game.py` | Syntax error or import error in `game.py` or a module it imports | Check `syserr.txt` for the Python traceback immediately after this message |
| UI completely invisible but no errors | `CPythonApplication::Run()` not calling `wndMgr.Update()` and `wndMgr.Render()` | Check `UserInterface/UserInterface.cpp` main loop — confirm `m_kWndMgr.Update()` and `Render()` are called |
| `player.GetPoint(POINT_HP)` always returns 0 | `POINT_HP` constant value mismatch between server's `EPoints` and the `player` module registration | `UserInterface/PythonPlayerModule.cpp` : `PyModule_AddIntConstant(m, "POINT_HP", POINT_HP)` — compare with `common/length.h` |

---

## Related

- **Topic page:** [UI Python System](topic-UI-Python-System) — full module table, widget class hierarchy, network phase details
- **Blueprint:** [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) — `net.Send*()` packet format, `Recv*Packet()` handlers
- **Blueprint:** [blueprint-Character-System](blueprint-Character-System) — `player.GetPoint()` stat access, point type enum
- **Blueprint:** [blueprint-Login-Flow](blueprint-Login-Flow) — `networkmodule.py` phase transitions, `intrologin.py` → `introselect.py` → `game.py`
