# Topic: UI Python System

> ### ✅ Prerequisites
> Before reading this page you should understand:
> - [Why Python for the UI?](concept-python-ui)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> End-to-end explanation of how Python scripts running in `client-bin` control the game's user interface through an embedded CPython interpreter and a set of C++ extension modules.

---

## 1. Overview

The Metin2 client uses an **embedded CPython 3.x interpreter** to implement all of its user interface. The C++ engine (`Metin2.exe`, built from `client-src/`) starts the interpreter at application launch, registers a set of C extension modules that expose every game subsystem, and then executes the main entry-point Python script. From that point on, every button, window, health bar, chat box, and inventory slot is a Python object calling into C++ through those modules.

### Execution model

```
WinMain()
  └─ CPythonApplication::Init()
       ├─ Register all C extension modules (grp, wndMgr, net, player, chr, …)
       ├─ CPythonLauncher::Create()   — initialise CPython interpreter
       └─ CPythonLauncher::RunFile("root/game.py")
                                     — Python takes over the UI
```

The interpreter never exits until the application closes. The C++ main loop (`CPythonApplication::Run()`) calls the window manager's `Update()` and `Render()` each frame; the window manager in turn calls `OnUpdate()` / `OnRender()` on every visible Python window.

### Key source directories

| Source | Language | Role |
|--------|----------|------|
| `client-src/src/ScriptLib/` | C++ | Interpreter lifecycle — `CPythonLauncher` |
| `client-src/src/EterPythonLib/` | C++ | Widget classes and `CWindowManager` |
| `client-src/src/UserInterface/` | C++ | All game C extension modules + network layer |
| `client-bin/assets/root/` | Python | Runtime UI scripts (imported at startup) |
| `client-bin/assets/uiscript/uiscript/` | Python | Window layout data files (loaded on demand) |

---

## 2. C++ to Python Modules

All modules are registered in `UserInterface/UserInterface.cpp` before `CPythonLauncher::RunFile()` is called. Scripts import them at the top of each `.py` file like ordinary Python modules.

### Full module table

| Module | Registration file | What it exposes |
|--------|------------------|-----------------|
| `app` | `UserInterface/PythonApplication*.cpp` | Application lifecycle — `Exit()`, `UpdateGame()`, `RenderGame()`, `GetTime()`, `GetGlobalTime()`, `GetFPS()`, camera control, screenshots, game options |
| `grp` | `EterPythonLib/PythonGraphicModule.cpp` | Core 2-D rendering primitives — `GenerateColor()`, `SetInterfaceRenderState()`, `RenderCoolTimeBox()`, `SaveScreenShot()`, gamma |
| `grpImage` | `EterPythonLib/PythonGraphicImageModule.cpp` | Image/texture loading and rendering |
| `grpText` | `EterPythonLib/PythonGraphicTextModule.cpp` | Text instance creation and rendering |
| `grpThing` | `EterPythonLib/PythonGraphicThingModule.cpp` | 3-D Granny2 model rendering in the UI (e.g., character preview) |
| `wndMgr` | `EterPythonLib/PythonWindowManagerModule.cpp` | Window manager — `Register()`, `Destroy()`, `SetPosition()`, `Show()`, `Hide()`, `Update()`, `Render()`, event dispatch |
| `net` | `UserInterface/PythonNetworkStreamModule.cpp` | Network I/O — `Connect()`, `Disconnect()`, `SendXxx()` packet senders, phase registration, ping |
| `player` | `UserInterface/PythonPlayerModule.cpp` | Local player state — HP/SP/stamina, inventory slots, quick slots, skills, experience, money, position |
| `chr` | `UserInterface/PythonCharacterManagerModule.cpp` | All visible actors — `GetVIDByName()`, `GetRace()`, position queries, motion state |
| `item` | `UserInterface/PythonItemModule.cpp` | Item data queries — `GetItemName()`, `GetItemType()`, `GetIconImage()`, socket/attribute data |
| `skill` | `UserInterface/PythonSkillModule.cpp` | Skill data — `GetSkillName()`, `GetSkillType()`, `GetSkillCoolTime()`, `GetAffectDataByIndex()` |
| `chat` | `UserInterface/PythonChatModule.cpp` | Chat history — `AppendChat()`, `GetChatCount()`, `GetChatString()`, `GetChatType()` |
| `guild` | `UserInterface/PythonGuildModule.cpp` | Guild state — member list, grade info, mark upload, war data |
| `quest` | `UserInterface/PythonQuestModule.cpp` | Quest state — `GetQuestCount()`, `GetQuestTitle()`, `GetQuestLastIcon()`, button/counter state |
| `exchange` | `UserInterface/PythonExchangeModule.cpp` | Trade exchange state — item/coin slots for both sides, accept flags |
| `shop` | `UserInterface/PythonShopModule.cpp` | NPC shop item list — `GetItemID()`, `GetItemCount()`, `GetItemPrice()` |
| `messenger` | `UserInterface/PythonMessengerModule.cpp` | Friends list — online/offline status, block list, guild-member presence |
| `miniMap` | `UserInterface/PythonMiniMapModule.cpp` | Mini-map — arrows, object markers, `Update()`, `Render()`, atlas texture |
| `ime` | `UserInterface/PythonIMEModule.cpp` | Input Method Editor state — composition string, candidate list, reading window |
| `snd` | `UserInterface/PythonSoundManagerModule.cpp` | Sound — `PlaySound2D()`, `PlayBGM()`, `StopBGM()`, volume control |
| `fly` | `UserInterface/PythonFlyModule.cpp` | Projectile/fly system control |
| `effect` | `UserInterface/PythonEffectModule.cpp` | Visual effect playback — `RegisterEffect()`, `CreateEffect()`, `DeleteEffect()` |
| `nonplayer` | `UserInterface/PythonNonPlayerModule.cpp` | NPC data — `GetName()`, `GetLevel()`, `GetRaceNumByVID()` |
| `textTail` | `UserInterface/PythonTextTailModule.cpp` | Floating name/HP labels above actors |
| `eventMgr` | `UserInterface/PythonEventManagerModule.cpp` | Timed in-game event scheduling |
| `pack` | `UserInterface/PythonPackModule.cpp` | Low-level pack file access |
| `dbg` | `ScriptLib/PythonDebugModule.cpp` | Trace logging and error display |
| `profiler` | `UserInterface/PythonProfilerModule.cpp` | Frame-time profiler overlay |
| `system` | `UserInterface/PythonSystemModule.cpp` | System settings — resolution, gamma, detail levels |
| `serverState` | `UserInterface/ServerStateCheckerModule.cpp` | Server channel status polling |
| `gameEventMgr` | `UserInterface/PythonGameEventManagerModule.cpp` | Server-pushed game event manager |

### Typical import pattern in a script

```python
import app
import net
import player
import item
import wndMgr
import grp
import ui
```

Scripts never `import` a C module that was not registered at startup — attempting to do so raises an `ImportError` because there is no `.py` or `.pyc` file on disk for them.

---

## 3. UI Widget System

### 3.1 C++ widget classes (EterPythonLib)

Every visible element on screen corresponds to a C++ object managed by `UI::CWindowManager`. The C++ class hierarchy is:

```
UI::CWindow                  (PythonWindow.h)
 ├─ UI::CTextLine             — rendered text
 ├─ UI::CImageBox             — static image
 │    └─ UI::CExpandedImageBox — scaled / rotated / clipped image
 ├─ UI::CAniImageBox          — animated frame sequence
 ├─ UI::CButton               — four-state button (up/over/down/disabled)
 │    ├─ UI::CRadioButton
 │    ├─ UI::CToggleButton
 │    └─ UI::CDragButton      — draggable handle constrained to a rect
 ├─ UI::CSlotWindow           — item/skill slot with cooldown rendering
 └─ UI::CGridSlotWindow       — grid of slots
```

All C++ objects are opaque handles from the Python side. The `wndMgr` module's `Register*()` functions allocate the C++ object and return an integer handle (`hWnd`). Destroying a handle deallocates the C++ object.

### 3.2 Python widget classes (ui.py)

`client-bin/assets/root/ui.py` (3716 lines) wraps every C++ widget in an idiomatic Python class. The base class is `ui.Window`:

```python
class Window:
    def __init__(self, layer="UI"):
        self.hWnd = wndMgr.Register(self, layer)
        wndMgr.Hide(self.hWnd)

    def __del__(self):
        wndMgr.Destroy(self.hWnd)

    def Show(self):
        wndMgr.Show(self.hWnd)

    def Hide(self):
        wndMgr.Hide(self.hWnd)

    def SetPosition(self, x, y):
        wndMgr.SetPosition(self.hWnd, x, y)

    def SetSize(self, width, height):
        wndMgr.SetSize(self.hWnd, width, height)

    def SetParent(self, parent):
        wndMgr.SetParent(self.hWnd, parent.hWnd)
```

The complete widget class hierarchy in `ui.py`:

| Python class | C++ backing | Purpose |
|---|---|---|
| `Window` | `CWindow` | Base for all elements |
| `TextLine` | `CTextLine` | Static label; supports outline, secret, multi-line |
| `EditLine` | `CTextLine` | Editable text input with IME, tab/return/escape events |
| `ImageBox` | `CImageBox` | Static image loaded from pack |
| `ExpandedImageBox` | `CExpandedImageBox` | Image with scale, rotation, UV clip, blend mode |
| `AniImageBox` | `CAniImageBox` | Frame-animated image |
| `MarkBox` | `CMarkBox` | Guild mark renderer |
| `Button` | `CButton` | Four-state clickable button |
| `RadioButton` | `CRadioButton` | Single-select button |
| `ToggleButton` | `CToggleButton` | Latching button |
| `DragButton` | `CDragButton` | Draggable handle |
| `SlotWindow` | `CSlotWindow` | Inventory/skill slot grid |
| `GridSlotWindow` | `CGridSlotWindow` | Fixed-column slot grid |
| `Bar` | `CWindow` (custom draw) | Filled colour rectangle |
| `Line` / `Box` / `RoundBox` | `CWindow` | Outline shapes |
| `Board` / `ThinBoard` | `CWindow` | Decorative panel background |
| `BoardWithTitleBar` | `CWindow` | Panel with built-in close button |
| `ScrollBar` / `HorizontalScrollBar` | `CWindow` | Scroll bars |
| `ListBox` / `ListBoxEx` | `CWindow` | Scrollable item lists |
| `ComboBox` | `CWindow` | Drop-down selector |
| `NumberLine` | `CWindow` | Numeric display |
| `ScriptWindow` | `CWindow` | Window populated from a UIScript `.py` file |

### 3.3 Event callbacks

The C++ window manager calls Python methods on the handler object (`PyObject* m_poHandler`) for each event. The handler is the Python `Window` instance itself. Events are pure virtual in C++ but implemented as ordinary Python methods:

| C++ virtual method | Python override | Trigger |
|---|---|---|
| `OnUpdate()` | `def OnUpdate(self)` | Called every frame while window is visible |
| `OnRender()` | `def OnRender(self)` | Called every frame for custom drawing |
| `OnMouseLeftButtonDown()` | `def OnMouseLeftButtonDown(self)` | Left mouse pressed inside window |
| `OnMouseLeftButtonUp()` | `def OnMouseLeftButtonUp(self)` | Left mouse released |
| `OnMouseRightButtonDown()` | `def OnMouseRightButtonDown(self)` | Right mouse pressed |
| `OnMouseOverIn()` | `def OnMouseOverIn(self)` | Cursor enters the window rect |
| `OnMouseOverOut()` | `def OnMouseOverOut(self)` | Cursor leaves the window rect |
| `OnKeyDown(key)` | `def OnKeyDown(self, key)` | Key pressed while window has focus |
| `OnKeyUp(key)` | `def OnKeyUp(self, key)` | Key released |
| `OnIMEUpdate()` | `def OnIMEUpdate(self)` | IME composition text changed |
| `OnSetFocus()` | `def OnSetFocus(self)` | Window gained keyboard focus |
| `OnKillFocus()` | `def OnKillFocus(self)` | Window lost keyboard focus |
| `OnPressEscapeKey()` | `def OnPressEscapeKey(self)` | Escape key (routed specially) |

Convenience wrappers exist for common events so that callers can register a callback without subclassing:

```python
button.SetEvent(self.OnClickOK)          # fires on left-click
editLine.SetReturnEvent(self.OnSubmit)   # fires on Enter key
editLine.SetEscapeEvent(self.OnCancel)   # fires on Escape key
window.SetOnMouseLeftButtonUpEvent(cb)  # fires on left-button-up
```

The `__mem_func__` helper in `ui.py` wraps bound methods in a weak-reference-safe callable to avoid reference cycles when storing callbacks on child widgets.

---

## 4. UIScript Files

UIScript `.py` files (in `client-bin/assets/uiscript/uiscript/`) are **not** imported as Python modules. They are executed by `ui.PythonScriptLoader` (or `ui.ScriptWindow.LoadScriptFile()`), which runs the file in a fresh namespace and extracts the top-level `window` dictionary.

### Dictionary format

Every UIScript file defines exactly one `window` dict at module scope:

```python
window = {
    "name"    : "InventoryWindow",
    "x"       : 0, "y" : 0,
    "width"   : 176, "height" : 420,
    "style"   : ("movable", "float",),

    "children" : (
        {
            "name"   : "board",
            "type"   : "board",
            "x" : 0, "y" : 0,
            "width"  : 176, "height" : 420,

            "children" : (
                {
                    "name"  : "TitleBar",
                    "type"  : "titlebar",
                    "x"     : 8, "y" : 8,
                    "width" : 161,
                    "color" : "gray",
                },
                {
                    "name"  : "ItemSlot",
                    "type"  : "slot",
                    "x"     : 8, "y" : 35,
                    "width" : 160, "height" : 320,
                    "slot"  : (0, 5, 9, 32, 32),  # (startIndex, cols, rows, cellW, cellH)
                },
                {
                    "name"     : "CloseButton",
                    "type"     : "button",
                    "x"        : 152, "y" : 9,
                    "default_image" : "d:/ymir work/ui/public/close_button_01.sub",
                    "over_image"    : "d:/ymir work/ui/public/close_button_02.sub",
                    "down_image"    : "d:/ymir work/ui/public/close_button_03.sub",
                },
            ),
        },
    ),
}
```

### Common `type` values

| `type` | Python/C++ widget created | Notes |
|--------|--------------------------|-------|
| `"window"` | `ui.Window` | Generic invisible container |
| `"board"` | `ui.Board` | Decorative panel |
| `"board_with_titlebar"` | `ui.BoardWithTitleBar` | Panel with close button |
| `"titlebar"` | `ui.TitleBar` | Draggable title bar |
| `"text"` | `ui.TextLine` | Static label |
| `"editline"` | `ui.EditLine` | Editable text input |
| `"image"` | `ui.ImageBox` | Static image |
| `"expanded_image"` | `ui.ExpandedImageBox` | Transformed image |
| `"ani_image"` | `ui.AniImageBox` | Animated image |
| `"button"` | `ui.Button` | Clickable button |
| `"radio_button"` | `ui.RadioButton` | Single-select button |
| `"toggle_button"` | `ui.ToggleButton` | Latching button |
| `"slot"` | `ui.SlotWindow` | Item/skill slot grid |
| `"grid_table"` | `ui.GridSlotWindow` | Fixed-column grid slots |
| `"scrollbar"` | `ui.ScrollBar` | Vertical scroll bar |
| `"horizontal_scrollbar"` | `ui.HorizontalScrollBar` | Horizontal scroll bar |
| `"listbox"` | `ui.ListBox` | Non-interactive text list |
| `"bar"` | `ui.Bar` | Filled colour rectangle |
| `"line"` | `ui.Line` | Horizontal/vertical line |

### How `PythonScriptLoader` processes the dict

```
ScriptWindow.LoadScriptFile("UIScript/InventoryWindow.py")
  └─ PythonScriptLoader.LoadScriptFile(filename)
       ├─ CPythonLauncher::RunMemoryTextFile()  — executes the .py file
       ├─ extracts the 'window' dict from the resulting namespace
       └─ recursively instantiates Python widget objects for each entry
            mapping "type" → widget class
            mapping "name" → stored in self.Children dict
            setting x, y, width, height, style flags, images, etc.
```

After loading, the caller retrieves named children by string key:

```python
self.LoadScriptFile("UIScript/InventoryWindow.py")
self.GetChild("CloseButton").SetEvent(self.Close)
self.GetChild("ItemSlot").SetSlotStyle(wndMgr.SLOT_STYLE_NORMAL)
```

---

## 5. Python Event Loop

The C++ main loop in `CPythonApplication::Run()` executes every frame:

```
CPythonApplication::Run()
  ├─ Process Windows messages (keyboard/mouse → CWindowManager)
  ├─ CWindowManager::Update()
  │    └─ for each root window in layer order:
  │         window->Update()           — calls Python OnUpdate()
  └─ CWindowManager::Render()
       └─ for each visible window in layer order:
            window->Render()           — calls Python OnRender()
```

### OnUpdate

`OnUpdate()` is called once per frame on every **visible** window. It is the right place for:
- Polling C++ state and refreshing display labels (e.g., updating HP numbers)
- Advancing timers or countdowns
- Checking `app.GetTime()` for cooldown expiry

```python
def OnUpdate(self):
    hp = player.GetStatus(player.HP)
    self.hpBar.SetPercentage(hp, player.GetStatus(player.MAX_HP))
```

`GameWindow.OnUpdate()` in `game.py` drives the entire gameplay loop:

```python
def OnUpdate(self):
    app.UpdateGame()          # C++: physics, animations, actor updates
    self.__UpdateDebugInfo()  # refresh debug text overlays
    self.__ProcessKeyDict()   # fire held-key events
```

### OnRender

`OnRender()` is called after all standard widget rendering. It is used for custom drawing not covered by standard widget types (e.g., the chat mode button draws its own rounded rectangle via `grp` calls):

```python
def OnRender(self):
    grp.SetInterfaceRenderState()
    grp.RenderBox(self.x, self.y, self.width, self.height)
```

`GameWindow.OnRender()` renders the 3-D game world:

```python
def OnRender(self):
    app.RenderGame()          # C++: 3-D scene, actors, terrain, effects
```

### Keyboard and mouse events

Keyboard input arrives from `CWindowManager::RunKeyDown(vkey)`. The manager routes it to the focused window's `OnKeyDown()`. In `game.py`, `GameWindow` builds lookup dictionaries at startup mapping DirectInput key codes to handler lambdas:

```python
self.onPressKeyDict = {
    app.DIK_I : self.__PressIKey,   # toggle inventory
    app.DIK_C : self.__PressCKey,   # toggle character window
    app.DIK_M : self.interface.PressMKey,  # toggle minimap
    # … ~40 more bindings
}

def OnKeyDown(self, key):
    if key in self.onPressKeyDict:
        self.onPressKeyDict[key]()
        return True
```

Mouse events (`OnMouseLeftButtonDown`, `OnMouseRightButtonDown`, etc.) are dispatched by `CWindowManager` to the topmost window under the cursor. `CWindowManager::PickWindow(x, y)` walks the layer stack from front to back to find the target.

### Render layers

`CWindowManager` maintains named layers. Windows are registered into a specific layer, which controls z-ordering:

| Layer name | Use |
|---|---|
| `"GAME"` | 3-D game viewport (background) |
| `"UI"` | Standard HUD windows (default) |
| `"TOP_MOST"` | Tooltips, modal dialogs, curtains |
| `"CURSOR"` | Dragged item icon, cursor |

Windows registered into `"TOP_MOST"` always render above those in `"UI"`.

---

## 6. Network from Python

### The `net` module

The `net` C extension module wraps `CPythonNetworkStream`, a singleton TCP client. Python scripts call `net.SendXxx()` methods to transmit packets and register Python handler windows to receive server-pushed events.

```python
import net

# Send a chat message
net.SendChatPacket(chat.CHAT_TYPE_NORMAL, "Hello!")

# Send a use-item request
net.SendItemUsePacket(slotIndex)

# Register the current window as the network event handler
net.SetPhaseWindow(net.PHASE_WINDOW_GAME, self)
```

### Phase system

The client-server connection goes through a series of phases. The server sends a `PHASE` packet when it is ready to advance; `CPythonNetworkStream` switches its packet dispatch table and calls the corresponding Python `Set*Phase()` method on `networkModule.MainStream`:

| Phase | C++ dispatch table | Python window | Trigger |
|---|---|---|---|
| `offline` | — | None | Disconnected |
| `handshake` | `m_handshakeHandlers` | — | TCP connected |
| `login` | `m_loginHandlers` | `introLogin.LoginWindow` | After handshake |
| `select` | `m_selectHandlers` | `introSelect.SelectCharacterWindow` | After login success |
| `loading` | `m_loadingHandlers` | `introLoading.LoadingWindow` | After character select |
| `game` | `m_gameHandlers` | `game.GameWindow` | After map load complete |

`networkModule.MainStream` handles phase transitions with a fade curtain:

```python
class MainStream:
    def SetGamePhase(self):
        self.stream.ClosePopupDialog()
        self.SetPhaseWindow(game.GameWindow(self))

    def SetPhaseWindow(self, newPhaseWindow):
        # fade out → close old phase → open new phase → fade in
        self.curtain.FadeOut(self.__ChangePhaseWindow)
        self.newPhaseWindow = newPhaseWindow

    def __ChangePhaseWindow(self):
        if self.phaseWindow:
            self.phaseWindow.Close()
        self.phaseWindow = self.newPhaseWindow
        if self.phaseWindow:
            self.phaseWindow.Open()
        self.curtain.FadeIn()
```

### Server-to-Python callbacks

The C++ network stream calls Python methods on the registered phase window (`m_poHandler`) when packets arrive. For example, when a `GC_CHAT` packet arrives, `CPythonNetworkStream::RecvChatPacket()` calls:

```python
self.phaseWindow.OnRecvChat(type, message)
```

The `GameWindow` (or whichever window is active) must implement the callback:

```python
def AppendChat(self, type, message):
    self.interface.chatWindow.AppendChat(type, message)
```

`CPythonNetworkStream` also calls `RefreshStatus()`, `RefreshInventory()`, etc. on the active phase window after updating internal state, so the Python UI can pull fresh data from the `player`, `item`, etc. modules.

### Connection flow

```python
# In LoginWindow.OnClickLoginButton():
stream.SetConnectInfo(serverIP, port)
stream.SetLoginInfo(id, password)
stream.Connect()           # → net.Connect() → TCP SYN

# CPythonNetworkStream.OnConnect() fires:
# → calls LoginWindow.OnConnect()
def OnConnect(self):
    net.SendLoginPacket(self.loginID, self.loginPwd)

# On GC_LOGIN_SUCCESS:
# → CPythonNetworkStream calls LoginWindow.OnLoginSuccess()
def OnLoginSuccess(self):
    self.stream.SetSelectCharacterPhase()
```

---

## 7. How to Add a New UI Window

Adding a new UI window requires three things: a UIScript layout file, a Python class that loads it, and integration with the interface or phase window.

### Step 1 — Create the UIScript layout file

Create `client-bin/assets/uiscript/uiscript/MyNewWindow.py`:

```python
import uiScriptLocale

window = {
    "name"    : "MyNewWindow",
    "x"       : 0, "y" : 0,
    "width"   : 200, "height" : 150,
    "style"   : ("movable", "float",),

    "children" : (
        {
            "name"  : "board",
            "type"  : "board_with_titlebar",
            "x"     : 0, "y" : 0,
            "width" : 200, "height" : 150,
            "title" : uiScriptLocale.MY_NEW_WINDOW_TITLE,

            "children" : (
                {
                    "name"     : "OKButton",
                    "type"     : "button",
                    "x"        : 60, "y" : 110,
                    "text"     : uiScriptLocale.OK,
                    "default_image" : "d:/ymir work/ui/public/middle_button_01.sub",
                    "over_image"    : "d:/ymir work/ui/public/middle_button_02.sub",
                    "down_image"    : "d:/ymir work/ui/public/middle_button_03.sub",
                },
                {
                    "name"  : "InfoText",
                    "type"  : "text",
                    "x"     : 20, "y" : 50,
                    "text"  : "Hello, Metin2!",
                },
            ),
        },
    ),
}
```

### Step 2 — Write the Python class

Create or add to an existing file in `client-bin/assets/root/`, e.g. `uimynewwindow.py`:

```python
import ui

class MyNewWindow(ui.ScriptWindow):

    def __init__(self):
        ui.ScriptWindow.__init__(self)
        self.__CreateUI()

    def __del__(self):
        ui.ScriptWindow.__del__(self)

    def __CreateUI(self):
        self.LoadScriptFile("UIScript/MyNewWindow.py")

        # Bind named children from the layout
        self.GetChild("OKButton").SetEvent(self.__OnClickOK)
        self.GetChild("board").SetCloseEvent(self.Hide)

    def Open(self):
        self.SetCenterPosition()
        self.SetTop()
        self.Show()

    def Close(self):
        self.Hide()

    def OnPressEscapeKey(self):
        self.Close()
        return True

    def __OnClickOK(self):
        self.Close()
```

### Step 3 — Integrate with the interface

In `interfacemodule.py`, inside `MakeInterface()` or a `__Make*()` helper:

```python
import uimynewwindow

class Interface:
    def MakeInterface(self):
        # … existing window construction …
        self.__MakeMyNewWindow()

    def __MakeMyNewWindow(self):
        self.wndMyNew = uimynewwindow.MyNewWindow()

    def OpenMyNewWindow(self):
        self.wndMyNew.Open()

    def Close(self):
        # … existing cleanup …
        if self.wndMyNew:
            self.wndMyNew.Close()
            self.wndMyNew = None
```

Then call `self.interface.OpenMyNewWindow()` from `GameWindow` in response to a key press or server event:

```python
# In GameWindow.__BuildKeyDict():
self.onPressKeyDict[app.DIK_N] = self.interface.OpenMyNewWindow
```

### Step 4 — Pack the assets

After editing the scripts, re-pack both changed asset directories:

```bash
cd client-bin/assets/
python pack.py uiscript
python pack.py root
```

---

## 8. Key Files

| File | Repo | Role |
|------|------|------|
| `src/ScriptLib/PythonLauncher.h/.cpp` | client-src | Embeds CPython; `RunFile()`, `RunMemoryTextFile()`, `RunCompiledFile()` |
| `src/ScriptLib/PythonUtils.h/.cpp` | client-src | Python ↔ C++ type conversion helpers |
| `src/EterPythonLib/PythonWindow.h/.cpp` | client-src | All C++ widget classes (`CWindow`, `CButton`, `CTextLine`, etc.) |
| `src/EterPythonLib/PythonWindowManager.h/.cpp` | client-src | `CWindowManager` singleton — input dispatch, render ordering |
| `src/EterPythonLib/PythonWindowManagerModule.cpp` | client-src | Registers the `wndMgr` Python module |
| `src/EterPythonLib/PythonGraphic.h/.cpp` | client-src | `CPythonGraphic` — 2-D rendering bridge |
| `src/EterPythonLib/PythonGraphicModule.cpp` | client-src | Registers the `grp` Python module |
| `src/UserInterface/UserInterface.cpp` | client-src | `WinMain()` — registers all C extension modules, runs the launcher |
| `src/UserInterface/PythonApplication.h/.cpp` | client-src | `CPythonApplication` — top-level app; main loop; `app` module |
| `src/UserInterface/PythonNetworkStream.h/.cpp` | client-src | `CPythonNetworkStream` — all packet send/receive |
| `src/UserInterface/PythonNetworkStreamModule.cpp` | client-src | Registers the `net` Python module |
| `src/UserInterface/PythonPlayer.h/.cpp` | client-src | Local player state; `player` module |
| `src/UserInterface/PythonCharacterManager.h/.cpp` | client-src | Actor registry; `chr` module |
| `src/UserInterface/PythonItem.h/.cpp` | client-src | Item data; `item` module |
| `src/UserInterface/PythonSkill.h/.cpp` | client-src | Skill data; `skill` module |
| `assets/root/ui.py` | client-bin | Python widget class hierarchy (3716 lines) — base `Window`, all widget types, `ScriptWindow`, `PythonScriptLoader` |
| `assets/root/game.py` | client-bin | `GameWindow` — main gameplay window, key bindings, `OnUpdate`/`OnRender` |
| `assets/root/interfacemodule.py` | client-bin | `Interface` — constructs and manages all gameplay UI windows |
| `assets/root/networkmodule.py` | client-bin | `MainStream` — phase controller; `PopupDialog` |
| `assets/root/serverinfo.py` | client-bin | Static server/channel IP+port configuration |
| `assets/root/intrologin.py` | client-bin | Login phase window |
| `assets/root/introselect.py` | client-bin | Character select phase window |
| `assets/root/introloading.py` | client-bin | Loading phase window |
| `assets/uiscript/uiscript/*.py` | client-bin | 80 UIScript layout data files — one per dialog/window |

---

## Related Pages

- [EterPythonLib](client-src-EterPythonLib) — full C++ widget class reference
- [ScriptLib](client-src-ScriptLib) — CPython launcher and debug module
- [PythonModules](client-src-PythonModules) — C extension module registration list
- [UserInterface](client-src-UserInterface) — `CPythonApplication`, `CPythonNetworkStream`
- [UserInterface — NetworkStream](client-src-UserInterface-NetworkStream) — packet send/receive detail
- [client-bin root — Framework](client-bin-root-framework) — `ui.py`, `game.py`, `interfacemodule.py`
- [client-bin root — Network](client-bin-root-network) — `networkmodule.py`, `serverinfo.py`
- [client-bin UIScript](client-bin-uiscript) — all 80 UIScript layout files documented
- [topic-Login-Flow](topic-Login-Flow) — end-to-end login packet trace
