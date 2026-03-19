# client-bin root — Framework

> Core Python framework: the UI widget library, the main game window, and the interface orchestrator.

## Overview

Three scripts form the backbone of the client-side Python layer. `ui.py` defines every reusable widget class (windows, buttons, text lines, scroll bars, slots, etc.) and is imported by virtually every other script. `game.py` owns the live gameplay window — handling input, camera, server callbacks, and delegating all UI operations to the `Interface` object defined in `interfacemodule.py`. `interfacemodule.py` constructs, wires up, and exposes all gameplay windows and dialogs as a single managed facade.

---

## Module: ui.py

**Purpose:** Provides the complete Python-level UI widget hierarchy, wrapping the C++ window-manager module (`wndMgr`) in idiomatic Python classes.

### Module-Level Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `BACKGROUND_COLOR` | `grp.GenerateColor(0,0,0,1)` | Solid black color constant |
| `DARK_COLOR` | `grp.GenerateColor(0.2,0.2,0.2,1)` | Dark grey color constant |
| `BRIGHT_COLOR` | `grp.GenerateColor(0.7,0.7,0.7,1)` | Bright grey color constant |
| `SELECT_COLOR` | `grp.GenerateColor(0,0,0.5,0.3)` | Semi-transparent blue selection highlight |
| `WHITE_COLOR` | `grp.GenerateColor(1,1,1,0.5)` | Half-opacity white |
| `HALF_WHITE_COLOR` | `grp.GenerateColor(1,1,1,0.2)` | Low-opacity white |
| `createToolTipWindowDict` | `dict` | Registry mapping tooltip type strings to factory callables |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `RegisterCandidateWindowClass(candidateWindowClass)` | `candidateWindowClass` — class | None | Registers the IME candidate window class on `EditLine` |
| `RegisterToolTipWindow(type, createToolTipWindow)` | `type` — string key; `createToolTipWindow` — factory callable | None | Registers a tooltip factory in `createToolTipWindowDict` |

### Classes

#### `__mem_func__`
**Purpose:** Wraps a bound method in a weak-reference-safe callable. Prevents reference cycles when storing callbacks. Automatically chooses between a no-argument and an argument-passing variant based on the method's argument count.

##### Inner Classes
- `__noarg_call__` — calls `func(obj)` ignoring extra arguments
- `__arg_call__` — calls `func(obj, *arg)` forwarding all arguments

---

#### `Window`
**Purpose:** Base class for all UI elements. Registers with `wndMgr` on construction, exposes position/size/visibility helpers, and dispatches window-manager events.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, layer="UI")` | `layer` — render layer string | None | Registers window, hides it |
| `__del__(self)` | — | None | Destroys the native window handle |
| `RegisterWindow(self, layer)` | `layer` — string | None | Creates `hWnd` via `wndMgr.Register` |
| `Destroy(self)` | — | None | Override hook; base is a no-op |
| `GetWindowHandle(self)` | — | handle | Returns native window handle |
| `AddFlag(self, style)` | `style` — string flag | None | Adds a style flag via `wndMgr` |
| `IsRTL(self)` | — | bool | Returns whether the window is in right-to-left mode |
| `SetWindowName(self, Name)` | `Name` — string | None | Assigns a debug name |
| `SetParent(self, parent)` | `parent` — Window | None | Reparents to another window |
| `SetParentProxy(self, parent)` | `parent` — Window | None | Reparents using a weak proxy |
| `SetPickAlways(self)` | — | None | Marks window as always pickable |
| `SetWindowHorizontalAlignLeft/Center/Right(self)` | — | None | Sets horizontal alignment |
| `SetWindowVerticalAlignTop/Center/Bottom(self)` | — | None | Sets vertical alignment |
| `SetTop(self)` | — | None | Brings window to front |
| `Show(self)` | — | None | Makes the window visible |
| `Hide(self)` | — | None | Hides the window |
| `Lock(self)` / `Unlock(self)` | — | None | Locks/unlocks input processing |
| `IsShow(self)` | — | bool | Returns visibility state |
| `UpdateRect(self)` | — | None | Recalculates screen rect |
| `SetSize(self, width, height)` | integers | None | Resizes the window |
| `GetWidth(self)` / `GetHeight(self)` | — | int | Returns current dimensions |
| `GetLocalPosition(self)` | — | (x, y) | Position relative to parent |
| `GetGlobalPosition(self)` | — | (x, y) | Absolute screen position |
| `GetRect(self)` | — | (l,t,r,b) | Screen bounding rect |
| `SetPosition(self, x, y)` | int, int | None | Moves the window |
| `SetCenterPosition(self, x=0, y=0)` | offsets | None | Centers on screen with optional offset |
| `IsFocus(self)` | — | bool | Returns whether window has keyboard focus |
| `SetFocus(self)` / `KillFocus(self)` | — | None | Grants/removes keyboard focus |
| `GetChildCount(self)` | — | int | Number of child windows |
| `IsIn(self)` | — | bool | Returns whether cursor is over the window |
| `SetOnMouseLeftButtonUpEvent(self, event)` | callable | None | Registers a left-button-up callback |
| `OnMouseLeftButtonUp(self)` | — | None | Fires `onMouseLeftButtonUpEvent` |
| `EnableScissorRect(self)` / `DisableScissorRect(self)` | — | None | Enables/disables scissor-rect clipping |
| `IsScissorRectEnabled(self)` | — | bool | Checks scissor state |

---

#### `ListBoxEx`
**Inherits:** `Window`
**Purpose:** A scrollable list of selectable `Item` child windows.

##### Inner Class: `ListBoxEx.Item`
**Inherits:** `Window`
A list row that highlights itself on selection and reports clicks to the parent.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Initialises list state (10-item view, 20px step) |
| `SetItemStep(self, itemStep)` | int | None | Sets vertical spacing between rows |
| `SetItemSize(self, itemWidth, itemHeight)` | int, int | None | Sets uniform row dimensions |
| `SetViewItemCount(self, viewItemCount)` | int | None | Sets how many rows are visible at once |
| `SetSelectEvent(self, event)` | callable | None | Registers a selection callback |
| `SetBasePos(self, basePos)` | int | None | Scrolls to a given row index |
| `GetItemIndex(self, argItem)` | Item | int | Returns the list index of an item |
| `GetSelectedItem(self)` | — | Item or None | Returns the currently selected item |
| `SelectIndex(self, index)` | int | None | Selects an item by index |
| `SelectItem(self, selItem)` | Item | None | Selects an item and fires the select event |
| `RemoveAllItems(self)` | — | None | Clears all items |
| `RemoveItem(self, delItem)` | Item | None | Removes a single item |
| `AppendItem(self, newItem)` | Item | None | Adds an item; shows it if in view range |
| `SetScrollBar(self, scrollBar)` | ScrollBar | None | Attaches a scroll bar |
| `GetItemViewCoord(self, pos, itemWidth)` | int, int | (x, y) | Calculates pixel coordinates for a row |
| `IsEmpty(self)` | — | bool | Returns True if no items are present |

---

#### `CandidateListBox`
**Inherits:** `ListBoxEx`
**Purpose:** Horizontal or vertical list box used for IME candidate input display.

| Constant | Value | Description |
|----------|-------|-------------|
| `HORIZONTAL_MODE` | `0` | Items laid out left-to-right |
| `VERTICAL_MODE` | `1` | Items laid out top-to-bottom |

---

#### `TextLine`
**Inherits:** `Window`
**Purpose:** Displays a single line of text (or multiple lines when `\n` / `/n` separators are detected). Supports font selection, colour, alignment, outline, feather, and secret mode.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetMax(self, max)` | int | None | Maximum character count |
| `SetLimitWidth(self, width)` | int | None | Wraps text at pixel width |
| `SetMultiLine(self)` | — | None | Enables native multi-line mode |
| `SetHorizontalAlignLeft/Right/Center/Arabic(self)` | — | None | Text horizontal alignment |
| `SetVerticalAlignTop/Bottom/Center(self)` | — | None | Text vertical alignment |
| `SetSecret(self, Value=True)` | bool | None | Hides characters (password mode) |
| `SetOutline(self, Value=True)` | bool | None | Enables text outline |
| `SetFeather(self, value=True)` | bool | None | Enables feathered text rendering |
| `SetFontName(self, fontName)` | string | None | Changes the render font |
| `SetDefaultFontName(self)` | — | None | Resets to the locale default font |
| `SetFontColor(self, r, g, b)` | float×3 | None | Sets font colour (component form) |
| `SetPackedFontColor(self, color)` | packed int | None | Sets font colour (packed ARGB) |
| `SetText(self, text)` | string | None | Sets displayed text; handles `\n`/`/n` splits via extra `TextLine` children |
| `GetText(self)` | — | string | Returns current text, including extra lines joined by `\n` |
| `GetTextSize(self)` | — | (w, h) | Returns pixel dimensions of the text |

---

#### `EmptyCandidateWindow`
**Inherits:** `Window`
**Purpose:** No-op stub implementing the candidate window interface for when IME candidate support is disabled.

---

#### `EditLine`
**Inherits:** `TextLine`
**Purpose:** Editable text input widget with IME support, secret mode, number-only mode, and candidate window integration.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SAFE_SetReturnEvent(self, event)` | bound method | None | Sets return-key handler via `__mem_func__` |
| `SetReturnEvent(self, event)` | callable | None | Sets return-key handler |
| `SetEscapeEvent(self, event)` | callable | None | Sets escape-key handler |
| `SetTabEvent(self, event)` | callable | None | Sets tab-key handler |
| `SetMax(self, max)` | int | None | Sets character limit |
| `SetUserMax(self, max)` | int | None | Sets user-visible character limit |
| `SetNumberMode(self)` | — | None | Restricts input to digits |
| `SetIMEFlag(self, flag)` | bool | None | Enables/disables IME |
| `SetSecretMode(self, flag)` | bool | None | Enables/disables password masking |
| `Enable(self)` / `Disable(self)` | — | None | Shows/hides the text cursor |
| `SetEndPosition(self)` | — | None | Moves IME cursor to end of text |
| `OnSetFocus(self)` | — | None | Activates IME, shows cursor |
| `OnKillFocus(self)` | — | None | Commits IME text, hides cursor |
| `OnIMEOpenCandidateList(self)` | — | bool | Shows candidate window |
| `OnIMECloseCandidateList(self)` | — | bool | Hides candidate window |
| `OnIMEOpenReadingWnd(self)` | — | bool | Shows IME reading window |
| `OnIMECloseReadingWnd(self)` | — | bool | Hides IME reading window |
| `OnIMEUpdate(self)` | — | None | Plays typing sound and updates text |
| `OnIMETab(self)` | — | bool | Fires tab event if registered |
| `OnIMEReturn(self)` | — | bool | Plays click sound and fires return event |
| `OnPressEscapeKey(self)` | — | bool | Fires escape event |
| `OnIMEKeyDown(self, key)` | VK key code | bool | Handles cursor movement and delete keys |
| `OnMouseLeftButtonDown(self)` | — | bool | Sets focus and positions IME cursor at click point |

---

#### `MarkBox`
**Inherits:** `Window`
**Purpose:** Renders a guild mark image at a given scale and index.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Load(self)` | — | None | Loads mark image data |
| `SetScale(self, scale)` | float | None | Sets render scale |
| `SetIndex(self, guildID)` | int | None | Looks up and sets the mark for a guild |
| `SetAlpha(self, alpha)` | float | None | Sets mark transparency |

---

#### `ImageBox`
**Inherits:** `Window`
**Purpose:** Renders a single static image loaded from pack or filesystem.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadImage(self, imageName)` | string | None | Loads image from pack |
| `LoadImageFromFile(self, imageName)` | string | None | Loads image from filesystem |
| `SetAlpha(self, alpha)` | float | None | Sets image transparency |
| `GetWidth(self)` / `GetHeight(self)` | — | int | Returns image dimensions |
| `SAFE_SetStringEvent(self, event, func)` | string, bound method | None | Registers mouse-over event handler |

---

#### `ExpandedImageBox`
**Inherits:** `ImageBox`
**Purpose:** Extends `ImageBox` with scale, rotation, origin, rendering mode, and partial-rendering (for progress bars).

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetScale(self, xScale, yScale)` | float, float | None | Sets X/Y scale |
| `SetOrigin(self, x, y)` | int, int | None | Sets rotation/scale origin |
| `SetRotation(self, rotation)` | float | None | Sets rotation in degrees |
| `SetRenderingMode(self, mode)` | int | None | Sets blend/rendering mode |
| `SetRenderingRect(self, l, t, r, b)` | float×4 | None | Crops rendered portion (0.0–1.0) |
| `SetPercentage(self, curValue, maxValue)` | numeric | None | Renders a left-to-right fill fraction |

---

#### `AniImageBox`
**Inherits:** `Window`
**Purpose:** Animated image widget cycling through a list of frame images.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetDelay(self, delay)` | int | None | Sets frame delay in milliseconds |
| `AppendImage(self, filename)` | string | None | Adds a frame image |
| `SetPercentage(self, curValue, maxValue)` | numeric | None | Renders a fill fraction |
| `OnEndFrame(self)` | — | None | Called when animation loops; override hook |

---

#### `Button`
**Inherits:** `Window`
**Purpose:** Clickable button supporting up/over/down/disabled visual states, optional text label, and tooltip.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetUpVisual(self, filename)` | string | None | Sets the normal-state image |
| `SetOverVisual(self, filename)` | string | None | Sets the hover-state image |
| `SetDownVisual(self, filename)` | string | None | Sets the pressed-state image |
| `SetDisableVisual(self, filename)` | string | None | Sets the disabled-state image |
| `Flash(self)` | — | None | Triggers a flash animation |
| `Enable(self)` / `Disable(self)` | — | None | Enables/disables the button |
| `Down(self)` | — | None | Forces button into pressed state |
| `SetUp(self)` | — | None | Returns button to normal state |
| `SAFE_SetEvent(self, func, *args)` | bound method | None | Registers click handler via `__mem_func__` |
| `SetEvent(self, func, *args)` | callable | None | Registers click handler |
| `SetTextColor(self, color)` | packed int | None | Sets label text colour |
| `SetText(self, text, height=4)` | string | None | Creates/updates a `TextLine` label centred on button |
| `SetToolTipText(self, text, x=0, y=-19)` | string, int, int | None | Creates a text tooltip |
| `SetToolTipWindow(self, toolTip)` | Window | None | Attaches an existing tooltip window |
| `CallEvent(self)` | — | None | Plays click sound and fires event |
| `ShowToolTip(self)` / `HideToolTip(self)` | — | None | Shows/hides attached tooltip |
| `IsDown(self)` | — | bool | Returns whether button is in pressed state |

---

#### `RadioButton`
**Inherits:** `Button`
**Purpose:** Single-select button used in groups.

---

#### `RadioButtonGroup`
**Purpose:** Manages a group of `RadioButton` instances ensuring only one is selected at a time.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Show(self)` / `Hide(self)` | — | None | Shows/hides all buttons in the group |
| `SetText(self, idx, text)` | int, string | None | Sets label for button at index |
| `OnClick(self, btnIdx)` | int | None | Handles selection change: un-selects old, selects new |
| `AddButton(self, button, selectEvent, unselectEvent)` | Button, callable, callable | None | Adds a button with select/unselect callbacks |
| `Create(rawButtonGroup)` | list of (Button, callable, callable) | RadioButtonGroup | Static factory: creates group and selects index 0 |

---

#### `ToggleButton`
**Inherits:** `Button`
**Purpose:** Button that alternates between an "up" and "down" state, firing separate events for each transition.

---

#### Additional Widget Classes

The following classes are also defined in `ui.py`. Full method signatures follow the same pattern as above.

| Class | Inherits | Purpose |
|-------|---------|---------|
| `DragButton` | `Button` | Draggable window title bar |
| `SlotWindow` | `Window` | Grid of item/skill slots with drag-and-drop support |
| `GridSlotWindow` | `SlotWindow` | Slot window with configurable column count |
| `Bar` | `Window` | Filled colour rectangle |
| `Line` | `Window` | Horizontal/vertical line |
| `Box` | `Window` | Unfilled rectangle outline |
| `RoundBox` | `Window` | Rounded rectangle outline |
| `Board` | `Window` | Decorative panel background |
| `ThinBoard` | `Board` | Thinner variant panel |
| `BoardWithTitleBar` | `Board` | Panel with a built-in title bar and close button |
| `TitleBar` | `Window` | Window title bar with close button |
| `HorizontalScrollBar` | `Window` | Horizontal scroll bar |
| `ScrollBar` | `Window` | Vertical scroll bar |
| `ListBox` | `Window` | Simple non-interactive text list |
| `ComboBox` | `Window` | Drop-down selector |
| `NumberLine` | `Window` | Numeric display widget |
| `ScriptWindow` | `Window` | Window that can be populated from UIScript `.py` files via `PythonScriptLoader` |
| `PythonScriptLoader` | object | Executes UIScript files, binding named child windows |
| `ReadingWnd` | `ScriptWindow` | IME reading window pop-up |

---

## Module: game.py

**Purpose:** Implements the `GameWindow` — the top-level window active during gameplay. Handles key bindings, camera control, debug overlays, server event callbacks, and delegates all UI operations to `interfaceModule.Interface`.

### Module-Level Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `SCREENSHOT_CWDSAVE` | `False` | Whether screenshots are saved to the working directory |
| `SCREENSHOT_DIR` | `None` | Override directory for screenshot saving |
| `cameraDistance` | `1550.0` | Persistent camera distance (survives window close/reopen) |
| `cameraPitch` | `27.0` | Persistent camera pitch angle |
| `cameraRotation` | `0.0` | Persistent camera rotation |
| `cameraHeight` | `100.0` | Persistent camera height |
| `testAlignment` | `0` | Debug: current alignment value display |

### Classes

#### `GameWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** The main in-game window. Created by `networkModule.MainStream.SetGamePhase()` and destroyed when the game phase ends. Owns the interface, console, target board, map-name shower, affect shower, and player gauge.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, stream)` | stream — MainStream | None | Registers with `net` and `player`, constructs all sub-systems, builds key dictionaries, processes preserved server commands |
| `__del__(self)` | — | None | Unregisters from `net` and `player` |
| `Open(self)` | — | None | Sets screen size, resets game state, starts music, sends enter-game packet, calls `StartGame()` |
| `Close(self)` | — | None | Fades music, clears all sub-systems, destroys interface |
| `__BuildKeyDict(self)` | — | None | Populates `onPressKeyDict` and `onClickKeyDict` with all keyboard shortcuts |
| `__PressNumKey(self, num)` | 1–9 | None | Activates emoticon (Ctrl+num) or quickslot (num 1–4) |
| `__PressCKey(self)` | — | None | Opens character STATUS tab or Dragon Soul deck 0 (with Ctrl) |
| `__PressDKey(self)` | — | None | Moves right or activates Dragon Soul deck 1 (with Ctrl) |
| `__PressJKey(self)` | — | None | Unmounts or uses horse items (with Ctrl) |
| `__PressHKey(self)` | — | None | Opens help window or mounts horse (with Ctrl) |
| `__PressBKey(self)` | — | None | Opens emoticon window or sends horse-back command (with Ctrl) |
| `__PressFKey(self)` | — | None | Zooms camera or feeds horse (with Ctrl) |
| `__PressGKey(self)` | — | None | Pitches camera or opens guild window when names are shown (with Ctrl rides) |
| `__PressQKey(self)` | — | None | Rotates camera or toggles quest button visibility (with Ctrl) |
| `__SetQuickSlotMode(self)` | — | None | Sets number keys 1–4 to activate quick slots |
| `__SetQuickPageMode(self)` | — | None | Sets number keys to select quick-slot page |
| `ToggleDebugInfo(self)` | — | None | Toggles visibility of all debug text overlays |
| `__BuildDebugInfo(self)` | — | None | Creates all debug TextLine overlays (coord, FPS, pitch, splat, mouse pos, texture count, object count, view distance) |
| `ChangePKMode(self)` | — | None | Cycles PK mode with cooldown enforcement |
| `OnChangePKMode(self)` | — | None | Handles server notification of PK mode change |
| `StartGame(self)` | — | None | Initial data refresh (inventory, equipment, character, skills) |
| `RefreshStatus(self)` | — | None | Refreshes character stats display |
| `RefreshStamina(self)` | — | None | Refreshes stamina display |
| `RefreshSkill(self)` | — | None | Refreshes skill page |
| `RefreshQuest(self)` | — | None | Refreshes quest window |
| `RefreshMessenger(self)` | — | None | Refreshes messenger window |
| `RefreshGuild*Page(self)` | — | None | Various guild page refresh methods |
| `OnBlockMode(self, mode)` | int | None | Passes block mode to interface |
| `OpenQuestWindow(self, skin, idx)` | int, int | None | Opens a quest dialog |
| `AskGuildName(self)` | — | None | Opens an input dialog to create a guild |
| `ConfirmGuildName(self)` | — | bool | Validates and sends the guild creation packet |
| `CancelGuildName(self)` | — | bool | Dismisses the guild name dialog |
| `PopupMessage(self, msg)` | string | None | Opens the stream-level popup with a message |
| `OpenRefineDialog(self, ...)` | various | None | Opens the item refinement dialog |
| `SetAffect(self, affect)` / `ResetAffect(self, affect)` | int | None | Adds/removes a character affect icon |
| `BINARY_NEW_AddAffect(self, type, pointIdx, value, duration, affFlag=0)` | various | None | Handles new-style affect packet; also triggers Dragon Soul activation |
| `BINARY_NEW_RemoveAffect(self, type, pointIdx)` | int, int | None | Removes an affect; deactivates Dragon Soul if applicable |
| `SetPCTargetBoard(self, vid, name)` | int, string | None | Opens the target board; optionally opens whisper dialog on Ctrl+click |
| `RefreshTargetBoardByVID(self, vid)` | int | None | Refreshes target board for a given VID |
| `SetHPTargetBoard(self, vid, hpPercentage)` | int, int | None | Updates target board HP bar |
| `CloseTargetBoard(self)` | — | None | Closes the target board |
| `OpenEquipmentDialog(self, vid)` | int | None | Opens remote equipment viewer |
| `ShowMapName(self, mapName, x, y)` | string, int, int | None | Shows the map name banner and updates minimap |
| `OnRecvWhisper(self, mode, name, line)` | int, string, string | None | Routes incoming whisper to chat and interface |
| `OnRecvWhisperError(self, mode, name, line)` | int, string, string | None | Shows localised whisper error message |
| `OnPickMoney(self, money)` | int | None | Appends pick-up money chat message |
| `OnShopError(self, type)` | int | None | Shows localised shop error popup |
| `OnFishingSuccess/Notify/Failure(self, ...)` | various | None | Fishing result chat/info messages |
| `OnCannotUseSkill(self, vid, type)` | int, int | None | Shows skill error as text-tail or chat |
| `StartShop(self, vid)` / `EndShop(self)` / `RefreshShop(self)` | int/— | None | Shop dialog lifecycle |
| `StartExchange(self)` / `EndExchange(self)` / `RefreshExchange(self)` | — | None | Trade dialog lifecycle |
| `RecvPartyInviteQuestion(self, leaderVID, leaderName)` | int, string | None | Shows a party invite confirmation dialog |
| `AnswerPartyInvite(self, answer)` | bool | None | Sends the party invite response packet |
| `OnUpdate(self)` | — | None | Per-frame: calls `app.UpdateGame()`, updates debug overlays, fires key press events |
| `OnRender(self)` | — | None | Per-frame: calls `app.RenderGame()`, renders mouse overlay |
| `OnKeyDown(self, key)` / `OnKeyUp(self, key)` | DIK code | None | Dispatches to `onPressKeyDict` / `onClickKeyDict` |

---

## Module: interfacemodule.py

**Purpose:** Constructs and manages all gameplay UI windows and dialogs as a single `Interface` object. Acts as the central bridge between server events and individual UI components.

### Module-Level Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `IsQBHide` | `0` | Global flag: whether quest buttons are currently hidden (0=visible, 1=hidden) |

### Classes

#### `Interface`
**Purpose:** Owns all gameplay windows (character, inventory, minimap, chat, guild, messenger, party, shop, exchange, safebox, task bar, etc.) and exposes a unified API for creating, showing, hiding, and refreshing them.

##### Constants
| Name | Value | Description |
|------|-------|-------------|
| `CHARACTER_STATUS_TAB` | `1` | Tab index for the status page |
| `CHARACTER_SKILL_TAB` | `2` | Tab index for the skill page |

##### Key Methods — Construction
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Initialises all window references to None/0; registers self with `systemSetting` and `event` |
| `__del__(self)` | — | None | Unregisters from `systemSetting` and `event` |
| `MakeInterface(self)` | — | None | Master constructor: calls all `__Make*` helpers, wires tooltip cross-references, initialises whisper system |
| `Close(self)` | — | None | Destroys all windows and dialogs in reverse order |

##### Key Methods — Window Factories (private)
`__MakeUICurtain`, `__MakeMessengerWindow`, `__MakeGuildWindow`, `__MakeChatWindow`, `__MakeTaskBar`, `__MakeParty`, `__MakeGameButtonWindow`, `__MakeWindows`, `__MakeDialogs`, `__MakeHelpWindow`, `__MakeTipBoard`, `__MakeWebWindow`, `__MakeCubeWindow`, `__MakeCubeResultWindow`, `__MakeItemSelectWindow` — each constructs the corresponding window/dialog and wires events.

##### Key Methods — Toggle / Open / Close
| Method | Description |
|--------|-------------|
| `ShowDefaultWindows()` | Shows taskbar, minimap, and game button window |
| `HideAllWindows()` | Hides all managed windows |
| `ToggleCharacterWindow(state)` | Toggles the character window at a given tab state |
| `ToggleInventoryWindow()` | Toggles the inventory window |
| `ToggleDragonSoulWindow()` | Toggles the Dragon Soul inventory |
| `ToggleMessenger()` | Toggles the messenger window |
| `ToggleGuildWindow()` | Toggles the guild window |
| `ToggleSystemDialog()` | Toggles the system/options dialog |
| `ToggleChatLogWindow()` | Toggles the chat log window |
| `OpenWhisperDialog(name)` | Opens a whisper dialog for a character name |
| `OpenWhisperDialogWithoutTarget()` | Opens a whisper dialog with empty target |
| `OpenHelpWindow()` / `CloseHelpWindow()` | Shows/hides the help window |
| `OpenRestartDialog()` | Opens the death-restart dialog |
| `OpenRefineDialog(...)` | Opens the refinement dialog |
| `OpenShopDialog(vid)` / `CloseShopDialog()` / `RefreshShopDialog()` | NPC shop lifecycle |
| `StartExchange()` / `EndExchange()` / `RefreshExchange()` | Trade dialog lifecycle |
| `OpenPointResetDialog()` | Opens the stat-point reset dialog |
| `BINARY_OpenAtlasWindow()` | Opens the world atlas window |

##### Key Methods — Refresh
| Method | Description |
|--------|-------------|
| `RefreshStatus()` | Refreshes character status numbers |
| `RefreshSkill()` | Refreshes skill slot data |
| `RefreshInventory()` | Refreshes inventory and equipment slots |
| `RefreshCharacter()` | Full character window refresh |
| `RefreshQuest()` | Quest list refresh |
| `RefreshMessenger()` | Messenger contact list refresh |
| `RefreshGuildInfoPage()` | Guild info tab refresh |
| `RefreshAlignment()` | PK alignment display refresh |
| `CheckGameButton()` | Checks and shows/hides game notification buttons |

##### Key Methods — Party
| Method | Description |
|--------|-------------|
| `AddPartyMember(pid, name)` | Adds a member to the party window |
| `UpdatePartyMemberInfo(pid)` | Updates a party member's status bars |
| `RemovePartyMember(pid)` | Removes a member from the party window |
| `LinkPartyMember(pid, vid)` | Links party member pid to world VID |
| `UnlinkPartyMember(pid)` | Unlinks party member |

##### Key Methods — Misc
| Method | Description |
|--------|-------------|
| `MakeHyperlinkTooltip(hyperlink)` | Parses a `item:xxx` hyperlink string and shows item tooltip |
| `SetMapName(mapName)` | Updates minimap label |
| `MiniMapScaleUp()` / `MiniMapScaleDown()` | Adjusts minimap zoom |
| `PressMKey()` | Toggles minimap |
| `RecvWhisper(name)` | Notifies whisper button for incoming message |
| `RegisterGameMasterName(name)` | Marks a name as GM in chat |
| `OnUseSkill(slotIndex, coolTime)` | Starts skill cooldown animation |
| `OnActivateSkill(slotIndex)` | Activates skill slot visually |
| `OnDeactivateSkill(slotIndex)` | Deactivates skill slot visually |
| `DragonSoulActivate(deckIndex)` | Activates Dragon Soul deck UI |
| `DragonSoulDeactivate()` | Deactivates Dragon Soul deck UI |
| `OnChangePKMode()` | Refreshes PK mode indicator |
| `OnBlockMode(mode)` | Passes block mode state to messenger |
