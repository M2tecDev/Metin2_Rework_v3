# client-bin root — Network

> Network connection management, phase transitions, and server connection configuration.

## Overview

Two scripts handle all client-side network concerns. `networkmodule.py` owns the `MainStream` object — the master state machine that drives phase transitions (login → empire select → character select → create character → loading → game) via fade-in/fade-out curtains, and it contains the `PopupDialog` used for error messages. `serverinfo.py` is a static configuration file declaring the server list, channel definitions, auth-server addresses, and guild-mark server addresses.

---

## Module: networkmodule.py

**Purpose:** Implements the client's top-level network/phase controller and the general-purpose popup error dialog.

### Classes

#### `PopupDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** A modal, locked dialog box that displays a message and a single acknowledgement button. Supports multi-line messages (MR-15).

##### Constants
| Name | Value | Description |
|------|-------|-------------|
| `BASE_HEIGHT` | `105` | Base dialog height in pixels |
| `BASE_WIDTH` | `280` | Dialog width in pixels |
| `BUTTON_Y` | `63` | Vertical position of the accept button in the base layout |
| `LINE_HEIGHT` | `12` | Extra height per additional text line |

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Initialises `CloseEvent` to 0 |
| `LoadDialog(self)` | — | None | Loads `UIScript/PopupDialog.py` layout |
| `Open(self, Message, event=0, ButtonName=None)` | string, callable, string | None | Locks the window, sets message text, adjusts height for extra lines, centres, shows |
| `Close(self)` | — | None | Unlocks, hides, fires `CloseEvent` if set |
| `Destroy(self)` | — | None | Closes and clears child dictionary |
| `OnPressEscapeKey(self)` | — | bool | Closes on Escape |
| `OnIMEReturn(self)` | — | bool | Closes on Enter |

---

#### `MainStream`
**Purpose:** Master application controller. Holds login credentials, server address, current/next phase windows, and a fade curtain. Drives all phase transitions through `SetPhaseWindow()`.

##### Class Variables
| Name | Value | Description |
|------|-------|-------------|
| `isChrData` | `0` | Flag indicating character data has been received |

##### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Sets self as `net` handler, configures TCP buffer sizes, zeroes all state |
| `__del__(self)` | — | None | Prints deletion message |
| `Destroy(self)` | — | None | Closes current/new phase windows, destroys popup and curtain |
| `Create(self)` | — | None | Creates the `PopupDialog` and `PhaseCurtain` |
| `SetPhaseWindow(self, newPhaseWindow)` | phase window object | None | Schedules a phase transition; uses curtain fade-out if a phase is already active |
| `__ChangePhaseWindow(self)` | — | None | Executes the transition: closes old phase, opens new, fades in; exits app if `newPhaseWindow` is None |
| `CreatePopupDialog(self)` | — | None | Creates and positions the popup dialog |
| `SetLoginPhase(self)` | — | None | Disconnects and transitions to `introLogin.LoginWindow` |
| `SameLogin_SetLoginPhase(self)` | — | None | Transitions to login and calls `SameLogin_OpenUI()` |
| `SetSelectEmpirePhase(self)` | — | None | Transitions to `introEmpire.SelectEmpireWindow` |
| `SetReselectEmpirePhase(self)` | — | None | Transitions to `introEmpire.ReselectEmpireWindow` |
| `SetSelectCharacterPhase(self)` | — | None | Loads locale data, transitions to `introSelect.SelectCharacterWindow` |
| `SetCreateCharacterPhase(self)` | — | None | Transitions to `introCreate.CreateCharacterWindow` |
| `SetLoadingPhase(self)` | — | None | Transitions to `introLoading.LoadingWindow` |
| `SetTestGamePhase(self, x, y)` | int, int | None | Starts loading at specific coordinates (debug/test) |
| `SetGamePhase(self)` | — | None | Closes popup and transitions to `game.GameWindow` |
| `Connect(self)` | — | None | Initiates TCP (or account-server) connection using stored address/port |
| `SetConnectInfo(self, addr, port, account_addr=0, account_port=0)` | string, int, int, int | None | Stores server connection parameters |
| `GetConnectAddr(self)` | — | string | Returns stored server address |
| `SetLoginInfo(self, id, pwd)` | string, string | None | Stores and forwards credentials to the `net` module |
| `CancelEnterGame(self)` | — | None | No-op; hook for cancelling game entry |
| `SetCharacterSlot(self, slot)` | int | None | Stores the selected character slot index |
| `GetCharacterSlot(self)` | — | int | Returns the stored character slot |
| `EmptyFunction(self)` | — | None | No-op placeholder |

---

## Module: serverinfo.py

**Purpose:** Static configuration declaring all server regions, channels, ports, and guild-mark server addresses. Used by the login screen to populate the server list.

### Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `SERVER_NAME` | `"Metin2"` | Display name for the main production server |
| `SERVER_NAME_TEST` | `"Test"` | Display name for the test/local server |
| `SERVER_IP` | `"178.18.255.214"` | Production server IP address |
| `SERVER_IP_TEST` | `"127.0.0.1"` | Test server IP address (localhost) |
| `CH1_NAME` … `CH4_NAME` | `"CH1"` … `"CH4"` | Channel display names |
| `PORT_1` … `PORT_4` | `11011` / `11021` / `11031` / `11041` | Game channel TCP/UDP ports |
| `PORT_AUTH` | `11000` | Authentication server port |
| `PORT_MARK` | `11011` | Guild mark server port |
| `STATE_NONE` | `"..."` | Default state label |
| `STATE_DICT` | `{0:"....", 1:"NORM", 2:"BUSY", 3:"FULL"}` | Numeric server state to display label mapping |
| `SERVER01_CHANNEL_DICT` | dict | Channel definitions for the production server (4 channels) |
| `SERVER02_CHANNEL_DICT` | dict | Channel definitions for the test server (2 channels) |
| `REGION_NAME_DICT` | `{0: ""}` | Region ID to display name mapping |
| `REGION_AUTH_SERVER_DICT` | nested dict | Maps region → server index → `{ip, port}` for auth connections |
| `REGION_DICT` | nested dict | Maps region → server index → `{name, channel dict}` |
| `MARKADDR_DICT` | `{10: {...}, 20: {...}}` | Guild mark server addresses keyed by numeric server ID |

### Data Structure Format

**Channel entry:**
```python
{
    "key": int,           # Unique channel key (e.g. 11 = server 1, channel 1)
    "name": str,          # Display name ("CH1")
    "ip": str,            # Server IP
    "tcp_port": int,      # TCP port
    "udp_port": int,      # UDP port (unused in current build)
    "state": str,         # "..." initially; filled by ServerStateChecker at runtime
}
```

**Mark address entry:**
```python
{
    "ip": str,
    "tcp_port": int,
    "mark": str,          # Mark image filename
    "symbol_path": str,   # Symbol image subdirectory
}
```
