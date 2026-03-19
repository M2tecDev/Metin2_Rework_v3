# client-bin root — Login & Character Flow

> The five intro-phase scripts that guide a player from the login screen to entering the game world.

## Overview

These five scripts each implement one phase window in the client's startup flow. `intrologin.py` handles authentication; `introempire.py` lets the player choose a faction; `introselect.py` displays existing characters; `introcreate.py` provides the new-character wizard; and `introloading.py` shows the loading screen while game data streams in. Each phase window is passed a `stream` reference (`networkModule.MainStream`) and calls `stream.Set*Phase()` methods to advance to the next step.

---

## Module: intrologin.py

**Purpose:** Implements the login screen: server/channel selection, credential entry, virtual keyboard, connecting dialog, and multi-language selector.

### Module-Level Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `LOGIN_DELAY_SEC` | `0.0` | Extra delay before sending the login packet |
| `SKIP_LOGIN_PHASE` | `False` | If True, bypasses the login UI entirely |
| `SKIP_LOGIN_PHASE_SUPPORT_CHANNEL` | `False` | Bypasses channel selection on skip |
| `FULL_BACK_IMAGE` | `False` | Whether to show a full-screen background image |
| `VIRTUAL_KEYBOARD_NUM_KEYS` | `46` | Number of keys on the virtual keyboard |
| `VIRTUAL_KEYBOARD_RAND_KEY` | `True` | Whether to shuffle virtual keyboard key order |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `Suffle(src)` | string | string | Shuffles characters in `src` for randomised virtual keyboard layout; respects `VIRTUAL_KEYBOARD_RAND_KEY` |
| `IsLoginDelay()` | — | bool | Returns True if `LOGIN_DELAY_SEC > 0` |
| `GetLoginDelay()` | — | float | Returns the current login delay in seconds |

### Classes

#### `ConnectingDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** A countdown dialog shown while attempting to connect to the server. Fires a time-over event when the countdown expires.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads `UIScript/ConnectingDialog.py` layout |
| `Open(self, waitTime)` | float | None | Locks, centres, shows; records end time |
| `Close(self)` | — | None | Unlocks and hides |
| `Destroy(self)` | — | None | Hides and clears children |
| `SetText(self, text)` | string | None | Sets the main message label |
| `SetCountDownMessage(self, waitTime)` | float | None | Updates the countdown display |
| `SAFE_SetTimeOverEvent(self, event)` | bound method | None | Registers the time-over callback |
| `SAFE_SetExitEvent(self, event)` | bound method | None | Registers the exit callback |
| `OnUpdate(self)` | — | None | Decrements timer; closes and fires event when time reaches 0 |
| `OnPressExitKey(self)` | — | bool | Absorbs the exit key (returns True without action) |

---

#### `LoginWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** The main login phase window. Loads the login UI layout, handles server/channel selection, credential input, the virtual keyboard, and all login failure/success callbacks from the network layer.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, stream)` | MainStream | None | Registers with `net`, initialises all UI state |
| `__del__(self)` | — | None | Unregisters from `net` |
| `Open(self)` | — | None | Starts server state checker, builds failure message dicts, loads layout, sets up server/channel board, shows window |
| `Close(self)` | — | None | Destroys server state checker, hides window, stops music |
| `SameLogin_OpenUI(self)` | — | None | Re-opens the login UI after a same-login disconnect |
| `__LoadScript(self, uiScriptFileName)` | string | bool | Executes a UIScript layout file and binds child widgets |
| `__SetupServerBoard(self)` | — | None | Populates server/channel list from `serverInfo` |
| `OnSelectServer(self, serverIndex)` | int | None | Handles server selection from the list |
| `OnSelectChannel(self, channelIndex)` | int | None | Handles channel selection |
| `OnClickLoginButton(self)` | — | None | Validates credentials and begins connection |
| `OnClickExitButton(self)` | — | None | Exits the application |
| `OnConnect(self)` | — | None | Sends login packet after TCP connection established |
| `OnLoginSuccess(self)` | — | None | Advances to the next phase |
| `OnLoginFailure(self, failureCode)` | string | None | Shows failure message |
| `OnUpdate(self)` | — | None | Handles login delay countdown |
| `OnKeyDown(self, key)` | DIK code | bool | Handles Enter key to submit login |

---

## Module: introempire.py

**Purpose:** Presents the empire selection screen with three faction buttons, flag animations, and description text. Also handles the re-selection case.

### Classes

#### `SelectEmpireWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Main empire selection phase window.

| Attribute | Type | Description |
|-----------|------|-------------|
| `EMPIRE_DESCRIPTION_TEXT_FILE_NAME` | dict | Maps `net.EMPIRE_A/B/C` to locale description file paths |
| `empireID` | int | Currently highlighted empire ID |

##### Inner Classes
- `EmpireButton(ui.Window)` — Hit area for one empire; fires `OnOverInEmpire`, `OnOverOutEmpire`, `OnSelectEmpire` on hover/click.
- `DescriptionBox(ui.Window)` — Renders an event-set description graphic.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, stream)` | MainStream | None | Registers with `net`, assigns a random initial empire |
| `Open(self)` | — | None | Loads layout, builds empire areas and buttons, starts music |
| `Close(self)` | — | None | Clears all child references, hides window |
| `OnSelectEmpire(self, empireID)` | int | None | Highlights new empire, loads description text |
| `OnClickSelectButton(self)` | — | None | Sends empire selection packet to server |
| `OnClickExitButton(self)` | — | None | Returns to login phase |
| `OnUpdate(self)` | — | None | Animates empire area fade-in/out |
| `OnRender(self)` | — | None | Renders empire flag graphics |

#### `ReselectEmpireWindow`
**Inherits:** `SelectEmpireWindow`
**Purpose:** Same as `SelectEmpireWindow` but used when the player is allowed to re-select their empire after creation.

---

## Module: introselect.py

**Purpose:** Displays up to four existing character slots with 3-D character previews, HP/SP gauges, and name/level info. Allows starting, deleting, and creating characters.

### Module-Level Constants

| Name | Value | Description |
|------|-------|-------------|
| `LEAVE_BUTTON_FOR_POTAL` | `False` | Whether to show a portal-leave button |
| `NOT_NEED_DELETE_CODE` | `False` | Skips the deletion confirmation code when True |
| `ENABLE_ENGNUM_DELETE_CODE` | `False` | Allows English/numeric deletion codes |

### Classes

#### `SelectCharacterWindow`
**Inherits:** `ui.Window`
**Purpose:** Four-slot character selection screen with 3-D rendering and animated slot rotations.

| Attribute | Type | Description |
|-----------|------|-------------|
| `SLOT_ROTATION` | list[float] | Angular positions for the four character slots |
| `SLOT_COUNT` | `4` | Number of character slots |
| `CHARACTER_TYPE_COUNT` | `4` | Number of character types |
| `EMPIRE_NAME` | dict | Populated by `_RebuildLocaleStrings()` at load and on locale reload |

##### Inner Classes
- `CharacterRenderer(ui.Window)` — Custom render window that draws the 3-D character preview into a viewport.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, stream)` | MainStream | None | Registers with `net`; initialises rotation, name-alpha, and gauge state lists |
| `__del__(self)` | — | None | Unregisters from `net` |
| `Open(self)` | — | None | Loads layout, loads game data, initialises character board |
| `Close(self)` | — | None | Destroys all UI elements, stops music |
| `InitCharacterBoard(self)` | — | None | Populates slots with stored character data |
| `OnClickStartButton(self)` | — | None | Begins loading phase for the selected character |
| `OnClickCreateButton(self)` | — | None | Transitions to create-character phase |
| `OnClickDeleteButton(self)` | — | None | Opens deletion confirmation |
| `OnClickExitButton(self)` | — | None | Returns to empire or login phase |
| `OnSelectSlot(self, index)` | int | None | Sets the active slot and animates character rotation |
| `OnUpdate(self)` | — | None | Interpolates slot rotations and name alpha values |
| `OnRender(self)` | — | None | Renders gauge bars and empire flags |
| `_RebuildLocaleStrings()` | — | None | Static method; rebuilds `EMPIRE_NAME` dict |

---

## Module: introcreate.py

**Purpose:** New character creation wizard: race/gender selection, appearance customisation, stat allocation, and character name entry.

### Module-Level Constants

| Name | Value | Description |
|------|-------|-------------|
| `MAN` / `WOMAN` | `0` / `1` | Gender constants |
| `SHAPE0` / `SHAPE1` | `0` / `1` | Appearance shape variants |
| `PAGE_COUNT` | `2` | Number of race-selection pages |
| `SLOT_COUNT` | `4` | Number of race slots per page |
| `BASE_CHR_ID` | `3` | Starting character model ID |

### Classes

#### `CreateCharacterWindow`
**Inherits:** `ui.Window`
**Purpose:** Full character creation UI with 3-D preview, race/gender buttons, stat sliders, and name input.

| Attribute | Type | Description |
|-----------|------|-------------|
| `SLOT_ROTATION` | list[float] | Angular positions for character preview slots |
| `CREATE_STAT_POINT` | `0` | Number of stat points to distribute at creation |
| `STAT_CON/INT/STR/DEX` | int | Indices for the four base stats |
| `START_STAT` | tuple of lists | Base stat distribution for each race (8 entries for M/W variants) |
| `STAT_DESCRIPTION` | dict | Populated by `_RebuildLocaleStrings()` |
| `DESCRIPTION_FILE_NAME` | tuple | Populated by `_RebuildLocaleStrings()`; class description file paths |

##### Inner Classes
- `DescriptionBox(ui.Window)` — Renders a scrolling job-description event set.
- `CharacterRenderer(ui.Window)` — 3-D character preview renderer.

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, stream)` | MainStream | None | Registers with `net` |
| `Open(self)` | — | None | Loads layout; resets stat/gender/slot/shape state |
| `Close(self)` | — | None | Destroys child windows and hides |
| `OnSelectRace(self, index)` | int | None | Selects a race, updates stats and 3-D preview |
| `OnSelectGender(self, gender)` | int | None | Switches M/W variant |
| `OnClickConfirmButton(self)` | — | None | Validates name and sends create-character packet |
| `OnClickCancelButton(self)` | — | None | Returns to character select phase |
| `OnUpdate(self)` | — | None | Interpolates character rotation animations |
| `_RebuildLocaleStrings()` | — | None | Static; rebuilds stat description and job description dicts |

---

## Module: introloading.py

**Purpose:** Displays a random loading background image and a progress bar while the game world data streams from the server.

### Classes

#### `LoadingWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Loading phase window that shows a background illustration, a gauge, and error messages.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, stream)` | MainStream | None | Registers with `net`; zeroes all state |
| `__del__(self)` | — | None | Unregisters from `net` |
| `Open(self)` | — | None | Loads `UIScript/LoadingWindow.py`; picks a random background image; begins loading step list |
| `Close(self)` | — | None | Releases all child references |
| `LoadData(self, x, y)` | int, int | None | Starts a test-mode load at given world coordinates |
| `OnLoadingUpdate(self, percent)` | float | None | Updates the progress gauge |
| `OnLoadingError(self)` | — | None | Shows the error message label |
| `OnUpdate(self)` | — | None | Processes the load-step queue; advances game loading |

The `imgFileNameDict` inside `Open()` maps integer indices to loading background image paths organized by thematic sets: base characters, Grotto of Exile, Catacomb, Dark Dragons, and others — allowing the client to display visually varied loading screens.
