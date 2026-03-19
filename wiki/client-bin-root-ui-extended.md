# client-bin root — UI Extended Windows

> Secondary and specialised in-game UI components covering affects, auction, cube crafting, Dragon Soul, equipment viewer, exchange, game buttons, help, locale refresh/selector, map display, minimap, options, system menus, target board, task bar, tips, web browser, and whisper.

## Overview

These scripts provide the full breadth of gameplay UI beyond the core windows. Most follow the same pattern as core windows: they inherit from `ui.ScriptWindow` or `ui.Window`, load a UIScript layout file, and wire events to callbacks. They are all constructed during `interfaceModule.Interface.MakeInterface()`.

---

## Module: uiaffectshower.py

**Purpose:** Shows active buff/debuff icons in the HUD with countdown timers (MR-16).

### Classes

#### `LovePointImage`
**Inherits:** `ui.ExpandedImageBox`
**Purpose:** Displays a wedding love-point icon that changes based on the love value (0–100).

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetLoverInfo(self, name, lovePoint)` | string, int | None | Stores lover name/points and refreshes the image |
| `OnUpdateLovePoint(self, lovePoint)` | int | None | Updates love-point value |

#### `AffectShower`
**Inherits:** `ui.Window`
**Purpose:** Manages a row of affect icons, each showing remaining duration as a countdown overlay.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `ClearAffects(self)` | — | None | Removes all affect icons |
| `SetAffect(self, affect)` | int | None | Adds a classic-style affect icon |
| `ResetAffect(self, affect)` | int | None | Removes a classic-style affect icon |
| `BINARY_NEW_AddAffect(self, type, pointIdx, value, duration, affFlag=0)` | int×5 | None | Adds a new-style affect with explicit duration countdown (MR-16) |
| `BINARY_NEW_RemoveAffect(self, type, pointIdx)` | int, int | None | Removes a new-style affect |

---

## Module: uiattachmetin.py

**Purpose:** Dialog for attaching a metin stone to an item socket.

### Classes

#### `AttachMetinDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Modal dialog listing available sockets and confirming stone attachment.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, itemSlotIndex)` | int | None | Shows dialog for the target item |
| `Close(self)` | — | None | Hides dialog |
| `OnClickOK(self)` | — | None | Sends attach metin packet |

---

## Module: uiauction.py

**Purpose:** Auction house browser and listing dialog (purpose partially unclear from source; likely disabled or unreleased feature).

### Classes

#### `AuctionWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Auction house UI window.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self)` | — | None | Shows auction window |
| `Close(self)` | — | None | Hides window |

---

## Module: uicandidate.py

**Purpose:** IME candidate word list window for Chinese/Japanese/Korean input methods.

### Classes

#### `CandidateWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Floating window displaying IME candidate list next to the edit cursor.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Load(self)` | — | None | Loads candidate window layout |
| `SetCandidatePosition(self, x, y, textCount)` | int, int, int | None | Positions the window relative to cursor |
| `Clear(self)` | — | None | Removes all candidate entries |
| `Append(self, text)` | string | None | Adds a candidate string |
| `Refresh(self)` | — | None | Redraws the candidate list |
| `Select(self)` | — | None | Confirms the highlighted candidate |

---

## Module: uicommon.py

**Purpose:** Generic reusable dialogs: input dialog, yes/no question dialog, multi-line message board, etc.

### Classes

#### `InputDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Modal dialog with a text input field, accept/cancel buttons, and a title.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetTitle(self, text)` | string | None | Sets dialog title |
| `SetAcceptEvent(self, event)` | callable | None | Registers accept callback |
| `SetCancelEvent(self, event)` | callable | None | Registers cancel callback |
| `Open(self)` | — | None | Shows and focuses the input field |
| `Close(self)` | — | None | Hides dialog |
| `GetText(self)` | — | string | Returns current input text |

#### `QuestionDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Yes/No confirmation dialog.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetText(self, text)` | string | None | Sets question text |
| `SetAcceptEvent(self, event)` | callable | None | Registers accept callback |
| `SetCancelEvent(self, event)` | callable | None | Registers cancel callback |
| `Open(self)` | — | None | Shows dialog |
| `Close(self)` | — | None | Hides dialog |

#### `InputDialogWithDescription`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Like `InputDialog` but includes an additional description text block above the input field.

---

## Module: uicube.py

**Purpose:** Cube NPC crafting window and crafting result preview.

### Classes

#### `CubeWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Shows available recipes, material slots, and a craft button.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadWindow(self)` | — | None | Loads `UIScript/CubeWindow.py` |
| `Open(self, npcVID)` | int | None | Shows window for the given NPC |
| `Close(self)` | — | None | Sends close packet and hides |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `RefreshCubeRecipe(self)` | — | None | Reloads available recipes |
| `OnClickCraftButton(self)` | — | None | Sends craft request to server |

#### `CubeResultWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Shows the result item of a successful cube craft.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadWindow(self)` | — | None | Loads result window layout |
| `Open(self, resultVnum)` | int | None | Shows result item |
| `Close(self)` | — | None | Hides window |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |

---

## Module: uidragonsoul.py

**Purpose:** Dragon Soul inventory and refinement windows.

### Classes

#### `DragonSoulWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Two-deck Dragon Soul equipment/inventory window.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `BindInterfaceClass(self, interface)` | Interface | None | Stores interface reference |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `SetDragonSoulRefineWindow(self, wnd)` | DragonSoulRefineWindow | None | Links refine window |
| `Open(self)` | — | None | Shows DS window |
| `Close(self)` | — | None | Hides window |
| `ActivateButtonClick(self, deckIndex)` | int | None | Activates a deck by keyboard shortcut |

#### `DragonSoulRefineWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Dragon Soul refinement (grade/step/strength upgrade) dialog.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `SetInventoryWindows(self, wndInventory, wndDragonSoul)` | Windows | None | Links both inventory windows |
| `Open(self)` | — | None | Shows refine window |
| `Close(self)` | — | None | Hides window |

---

## Module: uiequipmentdialog.py

**Purpose:** Remote equipment viewer — shows another player's equipped items when requested.

### Classes

#### `EquipmentDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Read-only equipment grid for another player.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, vid)` | int | None | Shows dialog for the given VID |
| `Close(self)` | — | None | Hides dialog |
| `SetItem(self, slotIndex, vnum, count)` | int, int, int | None | Sets an equipment slot's item |
| `SetSocket(self, slotIndex, socketIndex, value)` | int×3 | None | Sets a socket value |
| `SetAttr(self, slotIndex, attrIndex, type, value)` | int×4 | None | Sets an attribute value |

---

## Module: uiex.py

**Purpose:** Extended/experimental UI helpers (purpose partially unclear; contains helper widgets used by other modules).

---

## Module: uiexchange.py

**Purpose:** Player-to-player trade dialog showing both parties' offered items and money.

### Classes

#### `ExchangeDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Two-panel trade window with accept/cancel controls.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadDialog(self)` | — | None | Loads `UIScript/ExchangeDialog.py` |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `Open(self)` | — | None | Shows dialog |
| `Close(self)` | — | None | Hides dialog and sends cancel packet |
| `Refresh(self)` | — | None | Updates both item grids |
| `OnAccept(self)` | — | None | Sends accept packet |
| `OnCancel(self)` | — | None | Sends cancel packet |

---

## Module: uigamebutton.py

**Purpose:** Floating notification buttons (status point, skill point, quest, help, build) that appear when action is needed.

### Classes

#### `GameButtonWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Container for game notification buttons.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetButtonEvent(self, name, event)` | string, callable | None | Assigns a callback to the named button |
| `CheckGameButton(self)` | — | None | Shows/hides buttons based on available points and quests |

---

## Module: uigameoption.py

**Purpose:** In-game option toggles accessible from the system dialog (whisper block, empire language, etc.).

### Classes

#### `GameOption`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Checkbox-style option panel for gameplay settings.

---

## Module: uihelp.py

**Purpose:** In-game help window showing control reference text.

### Classes

#### `HelpWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Scrollable help text window.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadDialog(self)` | — | None | Loads `UIScript/HelpDialog.py` |
| `SetCloseEvent(self, event)` | callable | None | Registers close callback |
| `Open(self)` | — | None | Shows help window |
| `Close(self)` | — | None | Fires close callback, hides |

---

## Module: uilocalerefresh.py

**Purpose:** Hot-reload support for UI elements that need to update when the locale changes. Provides a mixin or utility used by windows that register locale-reload callbacks.

---

## Module: uilocaleselector.py

**Purpose:** Locale (language) selector widget shown on the login screen. Allows switching the game language without restarting.

### Classes

#### `LocaleSelector`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Dropdown or button-group widget that calls `app.ReloadLocale()` when the user changes language.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, parent)` | Window | None | Attaches and shows the selector |
| `Close(self)` | — | None | Hides the selector |
| `OnSelectLocale(self, localeCode)` | string | None | Triggers locale hot-reload |

---

## Module: uimapnameshower.py

**Purpose:** Displays the map/zone name banner that fades in when entering a new area.

### Classes

#### `MapNameShower`
**Inherits:** `ui.Window`
**Purpose:** Animated text banner that fades in and out.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `ShowMapName(self, mapName, x, y)` | string, int, int | None | Sets text, positions, starts fade-in |
| `OnUpdate(self)` | — | None | Handles the fade timing |
| `OnRender(self)` | — | None | Draws the text with current alpha |

---

## Module: uiminimap.py

**Purpose:** Minimap widget with zoom controls, player/NPC markers, and the full atlas window.

### Classes

#### `MapTextToolTip`
**Inherits:** `ui.Window`
**Purpose:** Text label used above minimap markers.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetText(self, text)` | string | None | Sets label text |
| `SetTooltipPosition(self, x, y)` | int, int | None | Positions label near the given point |
| `SetTextColor(self, color)` | int | None | Sets packed text colour |
| `GetTextSize(self)` | — | (w, h) | Returns label pixel size |

#### `AtlasWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Full-screen atlas map window.

##### Inner Class: `AtlasRenderer(ui.Window)`
Calls `miniMap.UpdateAtlas()` and `miniMap.RenderAtlas(fx, fy)` each frame.

#### `MiniMap`
**Inherits:** `ui.ScriptWindow`
**Purpose:** HUD minimap widget with scale controls and icon overlays.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `ScaleUp(self)` / `ScaleDown(self)` | — | None | Zooms the minimap in/out |
| `SetMapName(self, mapName)` | string | None | Sets the zone name label |
| `ShowAtlasWindow(self)` | — | None | Opens the full atlas window |
| `OnUpdate(self)` | — | None | Refreshes marker positions |
| `OnRender(self)` | — | None | Renders minimap texture and icons |

---

## Module: uioption.py

**Purpose:** Options dialog accessed from system menu: resolution, sound volumes, shadow, camera distance.

### Classes

#### `OptionDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** In-game options panel.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self)` | — | None | Shows options, reads current values |
| `Close(self)` | — | None | Saves and hides |
| `OnChangeMusicVolume(self)` | — | None | Updates background music volume |
| `OnChangeSoundVolume(self)` | — | None | Updates sound effect volume |

---

## Module: uiphasecurtain.py

**Purpose:** Full-screen fade curtain used during phase transitions.

### Classes

#### `PhaseCurtain`
**Inherits:** `ui.Bar`
**Purpose:** Black fullscreen bar that animates alpha during fade-in/out transitions.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `FadeIn(self, event=None)` | callable | None | Starts a fade-in animation; fires `event` when complete |
| `FadeOut(self, event=None)` | callable | None | Starts a fade-out animation; fires `event` when complete |
| `OnUpdate(self)` | — | None | Advances alpha each frame |

---

## Module: uipickmoney.py

**Purpose:** Dialog for picking up a specific amount of money dropped on the ground.

### Classes

#### `PickMoneyDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Input dialog for entering the amount of yang to pick up.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, money)` | int | None | Shows dialog with max=money |
| `Close(self)` | — | None | Hides dialog |
| `OnClickOK(self)` | — | None | Sends pick-money packet |

---

## Module: uiplayergauge.py

**Purpose:** In-game HP/SP/stamina bar overlay displayed above the player model.

### Classes

#### `PlayerGauge`
**Inherits:** `ui.Window`
**Purpose:** Compact HP/SP/stamina bar shown near the player.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, parent)` | GameWindow | None | Creates gauge bars |
| `RefreshGauge(self)` | — | None | Updates all bar fill percentages |
| `OnUpdate(self)` | — | None | Repositions gauge above player each frame |

---

## Module: uipointreset.py

**Purpose:** Stat-point reset dialog from the Point Reset NPC.

### Classes

#### `PointResetDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Stat allocation panel with increment/decrement controls for HTH/INT/STR/DEX.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadDialog(self)` | — | None | Loads layout |
| `Open(self)` | — | None | Shows dialog |
| `Close(self)` | — | None | Hides dialog |
| `OnClickApply(self)` | — | None | Sends stat distribution packet |

---

## Module: uiprivateshopbuilder.py

**Purpose:** Private shop creation interface where players set item positions and prices.

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `Clear()` | — | None | Resets shop builder state |
| `IsBuildingPrivateShop()` | — | bool | Returns True while the player is building a shop |

### Classes

#### `PrivateShopBuilder`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Grid + price form for creating a private player shop.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `Open(self)` | — | None | Shows builder UI |
| `Close(self)` | — | None | Hides and resets state |
| `AddItem(self, slotIndex, price)` | int, int | None | Adds an item to the shop layout |
| `OnClickConfirmButton(self)` | — | None | Sends shop-open packet |

---

## Module: uirefine.py

**Purpose:** Item refinement (upgrade) dialog used for smithing items and adding attributes.

### Classes

#### `RefineDialogNew`
**Inherits:** `ui.ScriptWindow`
**Purpose:** New-style refine dialog with material slots and cost display.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, targetItemPos, nextGradeItemVnum, cost, prob, type=0)` | various | None | Shows dialog with calculated material list |
| `Close(self)` | — | None | Hides dialog |
| `AppendMaterial(self, vnum, count)` | int, int | None | Adds a material line to the list |
| `OnClickRefineButton(self)` | — | None | Sends refine request |
| `OnClickCancelButton(self)` | — | None | Cancels and hides |

---

## Module: uirestart.py

**Purpose:** Death restart dialog offering choices to respawn at village or in-place.

### Classes

#### `RestartDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Modal dialog shown on character death.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadDialog(self)` | — | None | Loads restart layout |
| `Open(self)` | — | None | Shows dialog |
| `Close(self)` | — | None | Hides dialog |
| `OnClickRestartVillageButton(self)` | — | None | Sends respawn-at-village packet |
| `OnClickRestartHereButton(self)` | — | None | Sends respawn-in-place packet |

---

## Module: uiscriptlocale.py

**Purpose:** Locale-specific path constants for UIScript files and description text. Rebuilt on locale reload.

### Key Constants

| Name | Type | Description |
|------|------|-------------|
| `LOCALE_UISCRIPT_PATH` | string | Base path for locale-specific UI layout files |
| `JOBDESC_WARRIOR/ASSASSIN/SURA/SHAMAN_PATH` | string | Paths to job description event files |
| `EMPIREDESC_A/B/C` | string | Paths to empire description event files |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `LoadLocaleData()` | — | None | Reloads all locale-path constants from `app.GetLocalePath()`; fires `localeInfo.FireReloadCallbacks()` |

---

## Module: uiselectitem.py

**Purpose:** Item selection dialog for accessory refinement — lets the player choose which material stone to use.

### Classes

#### `SelectItemWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Grid of selectable material items.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `Open(self, targetSlot)` | int | None | Shows window for the given equipment slot |
| `Close(self)` | — | None | Hides window |
| `OnSelectItem(self, slotIndex)` | int | None | Sends accessory refine start packet |

---

## Module: uiselectmusic.py

**Purpose:** BGM selection dialog allowing the player to choose or disable background music.

### Classes

#### `MusicListWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Scrollable list of available BGM tracks.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self)` | — | None | Populates track list and shows |
| `Close(self)` | — | None | Hides window |
| `OnSelectMusic(self, index)` | int | None | Fades to the selected track |

---

## Module: uisystem.py

**Purpose:** System/escape-menu dialog with links to options, help, and quit.

### Classes

#### `SystemDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Main ESC-menu dialog.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadDialog(self)` | — | None | Loads `UIScript/SystemDialog.py` |
| `SetOpenHelpWindowEvent(self, event)` | callable | None | Registers help-window callback |
| `Open(self)` | — | None | Shows dialog |
| `Close(self)` | — | None | Hides dialog |
| `OnClickHelpButton(self)` | — | None | Fires help-window event |
| `OnClickLogOutButton(self)` | — | None | Sends logout request |
| `OnClickExitButton(self)` | — | None | Exits the application |

---

## Module: uisystemoption.py

**Purpose:** Extended system options (graphics quality, shadow, fog, camera distance toggle). Separate from the basic `uioption.py` panel.

---

## Module: uitarget.py

**Purpose:** Target board displayed when clicking a character — shows name, HP bar, level, guild info, and action buttons.

### Classes

#### `TargetBoard`
**Inherits:** `ui.ThinBoard`
**Purpose:** Contextual target panel that appears above the clicked entity.

| Button ID Constants | Value | Description |
|--------------------|-------|-------------|
| `BTN_WHISPER` | `0` | Open whisper dialog |
| `BTN_EXCHANGE` | `1` | Request trade |
| `BTN_FIGHT` | `2` | Request PVP |
| `BTN_ACCEPT_FIGHT` | `3` | Accept PVP challenge |
| `BTN_AVENGE` | `4` | Revenge request |
| `BTN_FRIEND` | `5` | Add as friend |
| `BTN_INVITE_PARTY` | `6` | Invite to party |
| `BTN_LEAVE_PARTY` | `7` | Remove from party |
| `BTN_EXCLUDE` | `8` | Exclude from party |
| `BTN_INVITE_GUILD` | `9` | Invite to guild |
| `BTN_REMOVE_GUILD` | `10` | Remove from guild |
| `BTN_DISMOUNT` | `11` | Dismount target |
| `BTN_EXIT_OBSERVER` | `12` | Exit observer mode |
| `BTN_VIEW_EQUIPMENT` | `13` | View target's equipment |
| `BTN_REQUEST_ENTER_PARTY` | `14` | Request to join party |
| `BTN_BUILDING_DESTROY` | `15` | Destroy building |
| `BTN_EMOTION_ALLOW` | `16` | Toggle emotion permission |
| `BTN_VOTE_BLOCK_CHAT` | `17` | Vote to block chat |

Other constants:

| Name | Value | Description |
|------|-------|-------------|
| `GRADE_NAME` | dict | Title/grade name cache |
| `EXCHANGE_LIMIT_RANGE` | `3000` | Maximum distance (units) to initiate trade |

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, vid, name)` | int, string | None | Shows target board for the given entity |
| `Close(self)` | — | None | Hides target board |
| `Refresh(self)` | — | None | Full refresh of all displayed data |
| `RefreshByVID(self, vid)` | int | None | Refresh if VID matches current target |
| `RefreshByName(self, name)` | string | None | Refresh if name matches current target |
| `GetTargetVID(self)` | — | int | Returns currently targeted VID |
| `ResetTargetBoard(self)` | — | None | Clears target state |
| `SetEnemyVID(self, vid)` | int | None | Sets target without opening the board (for HP-bar display) |
| `SetHP(self, hpPercentage)` | int | None | Updates HP progress bar |
| `SetWhisperEvent(self, event)` | callable | None | Registers whisper-button callback |

---

## Module: uitaskbar.py

**Purpose:** Bottom taskbar with HP/SP/EXP gauges, quick-slot grid, and toggle buttons for character/inventory/messenger/system.

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `InitMouseButtonSettings(left, right)` | int, int | None | Sets the global mouse button action mapping |
| `SetMouseButtonSetting(dir, event)` | int, int | None | Changes one mouse button's action |
| `GetMouseButtonSettings()` | — | list | Returns current [left, right] action mapping |
| `SaveMouseButtonSettings()` | — | None | Writes mouse settings to `config/mouse.cfg` |
| `LoadMouseButtonSettings()` | — | None | Reads mouse settings from `config/mouse.cfg` |
| `unsigned32(n)` | int | int | Masks to 32-bit unsigned |

### Classes

#### `GiftBox`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Notification box for received gift/event items.

#### `TaskBar`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Main bottom HUD bar.

| Constant | Value | Description |
|----------|-------|-------------|
| `IS_EXPANDED` | bool | Whether the expanded taskbar button is shown |
| `BUTTON_CHARACTER` | int | Character toggle button index |
| `BUTTON_INVENTORY` | int | Inventory toggle button index |
| `BUTTON_MESSENGER` | int | Messenger toggle button index |
| `BUTTON_SYSTEM` | int | System dialog toggle button index |
| `BUTTON_EXPAND` | int | Expanded taskbar toggle button index |
| `BUTTON_CHAT` | int | Chat toggle button index |

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadWindow(self)` | — | None | Loads taskbar layout |
| `SetToggleButtonEvent(self, buttonIndex, event)` | int, callable | None | Wires a toggle button to an event |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches item tooltip for quick slot hover |
| `SetSkillToolTip(self, toolTip)` | SkillToolTip | None | Attaches skill tooltip for skill slot hover |
| `RefreshStatus(self)` | — | None | Updates HP/SP/EXP gauge fills |
| `OnUpdate(self)` | — | None | Per-frame: ticks EXP bonus timer |

#### `ExpandedTaskBar`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Secondary button bar revealed by the expand button; contains Dragon Soul toggle and similar.

#### `EnergyBar`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Energy system bar (shown only when `app.ENABLE_ENERGY_SYSTEM` is True).

---

## Module: uitip.py

**Purpose:** Server tip/broadcast message boards.

### Classes

#### `TipBoard`
**Inherits:** `ui.Window`
**Purpose:** Small overlay for short tip messages that auto-dismiss.

#### `BigBoard`
**Inherits:** `ui.Window`
**Purpose:** Larger announcement board for multi-line server messages.

---

## Module: uiuploadmark.py

**Purpose:** Guild mark upload dialog (loads a `.tga` or `.bmp` file and sends it to the server).

### Classes

#### `UploadMarkWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** File selection and upload confirmation dialog.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self)` | — | None | Shows dialog |
| `Close(self)` | — | None | Hides dialog |
| `OnClickUploadButton(self)` | — | None | Sends mark upload packet |

---

## Module: uiweb.py

**Purpose:** Embedded web browser window (wraps `app.ShowWebPage()`).

### Classes

#### `WebWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Window that embeds a web page using the engine's built-in browser.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadWindow(self)` | — | None | Loads web window layout |
| `Open(self, url)` | string | None | Navigates to and shows the given URL |
| `Close(self)` | — | None | Hides the web window |

---

## Module: uiwhisper.py

**Purpose:** Private whisper (direct message) dialog window.

### Classes

#### `WhisperDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Floating chat window for one-on-one private messages.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self, name)` | string | None | Opens/focuses dialog for the named character |
| `Close(self)` | — | None | Hides dialog |
| `AppendWhisper(self, type, name, line)` | int, string, string | None | Adds a message line with appropriate colour |
| `OnClickSendButton(self)` | — | None | Sends the typed message as a whisper packet |
