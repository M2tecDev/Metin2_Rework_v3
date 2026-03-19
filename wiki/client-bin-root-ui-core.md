# client-bin root — UI Core Windows

> The primary in-game UI windows: chat, character stats/skills, inventory, guild, quests, party, messenger, shop, safebox, and tooltips.

## Overview

These ten scripts implement the most frequently used gameplay windows. They all inherit from `ui.ScriptWindow` or `ui.Window` and load their layouts from `UIScript/*.py` data files. Each window wires itself into the `interfaceModule.Interface` object during `MakeInterface()` and is kept alive for the entire game session.

---

## Module: uichat.py

**Purpose:** Implements the chat input box, chat-mode selector buttons, and the scrollable chat log window.

### Module-Level Constants / Variables

| Name | Value | Description |
|------|-------|-------------|
| `ENABLE_CHAT_COMMAND` | `True` | Whether `/command` processing is active |
| `ENABLE_LAST_SENTENCE_STACK` | `True` | Whether Up/Down keys recall previous messages |
| `ENABLE_INSULT_CHECK` | `True` | Whether the insult filter is active |
| `chatInputSetList` | list | Global registry of chat input windows for mode-refresh broadcasts |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `InsertChatInputSetWindow(wnd)` | Window | None | Adds a window to the global chat-input list |
| `RefreshChatMode()` | — | None | Calls `OnRefreshChatMode()` on all registered windows |
| `DestroyChatInputSetWindow()` | — | None | Clears the global chat-input list |

### Classes

#### `ChatModeButton`
**Inherits:** `ui.Window`
**Purpose:** A custom-drawn rounded-rectangle button used to select chat mode (Normal, Shout, Party, Guild, etc.).

| Constant | Value | Description |
|----------|-------|-------------|
| `BUTTON_STATE_UP` | `0` | Normal state |
| `BUTTON_STATE_OVER` | `1` | Hover state |
| `BUTTON_STATE_DOWN` | `2` | Pressed state |

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SAFE_SetEvent(self, event)` | bound method | None | Registers click callback |
| `SetText(self, text)` | string | None | Creates a centred `TextLine` label |
| `OnMouseOverIn/Out(self)` | — | None | Changes button state |
| `OnMouseLeftButtonDown/Up(self)` | — | None | Tracks press state, fires event on up |
| `OnRender(self)` | — | None | Draws rounded-rect outline; fill on over/down states |

#### `ChatWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Main chat window with an edit line, chat-mode buttons, and a scrolling message display.

| Constant | Value | Description |
|----------|-------|-------------|
| `CHAT_WINDOW_WIDTH` | int | Chat window width in pixels |
| `EDIT_LINE_HEIGHT` | int | Height of the edit area |

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads layout, registers self in `chatInputSetList` |
| `BindInterface(self, interface)` | Interface | None | Stores reference for whisper/log callbacks |
| `SetSendWhisperEvent(self, event)` | callable | None | Registers the whisper-button callback |
| `SetOpenChatLogEvent(self, event)` | callable | None | Registers the log-open callback |
| `SetHeight(self, height)` | int | None | Resizes the scrollable message area |
| `AppendChat(self, type, message)` | int, string | None | Adds a chat message with type-based colouring |
| `OnRefreshChatMode(self)` | — | None | Updates the active mode button highlight |
| `OnUpdate(self)` | — | None | Per-frame: handles auto-hide/show |

#### `ChatLogWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** A separate scrollable window displaying the full chat history.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `BindInterface(self, interface)` | Interface | None | Stores interface reference |
| `Show(self)` / `Hide(self)` | — | None | Overrides with scroll-to-bottom / cleanup |
| `AppendChat(self, type, message)` | int, string | None | Adds a coloured line to the log |

---

## Module: uicharacter.py

**Purpose:** The character window showing status stats (HP, MP, attack, defence, level, EXP), skill pages, quest list, and emoticon grid.

### Module-Level Constants / Variables

| Name | Value | Description |
|------|-------|-------------|
| `SHOW_ONLY_ACTIVE_SKILL` | `False` | If True, only active skills are shown in the skill tab |
| `SHOW_LIMIT_SUPPORT_SKILL_LIST` | `[]` | List of support skills to show; empty = show all |
| `HIDE_SUPPORT_SKILL_POINT` | `True` | Whether to hide the support skill point display |
| `FACE_IMAGE_DICT` | dict | Maps race constant → face icon path |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `unsigned32(n)` | int | int | Masks a value to 32 bits (handles negative bonus display) |

### Classes

#### `CharacterWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Multi-tab window covering STATUS, SKILL, QUEST, and EMOTICON pages.

| Constant | Value | Description |
|----------|-------|-------------|
| `ACTIVE_PAGE_SLOT_COUNT` | `8` | Active skill slots per page |
| `SUPPORT_PAGE_SLOT_COUNT` | `12` | Support skill slots |
| `PAGE_SLOT_COUNT` | `12` | Total skill slots per page |
| `PAGE_HORSE` | `3` | Index of the horse-skill page |
| `SKILL_GROUP_NAME_DICT` | dict | Job → group → name; rebuilt by `_RebuildLocaleStrings()` |
| `STAT_DESCRIPTION` | dict | Stat abbreviation → tooltip text |
| `STAT_MINUS_DESCRIPTION` | string | Warning text for negative stats |

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads layout, sets `state="STATUS"` |
| `__LoadWindow(self)` | — | None | Loads `UIScript/CharacterWindow.py`; binds all child widgets |
| `SetSkillToolTip(self, toolTip)` | SkillToolTip | None | Attaches the skill tooltip for hover info |
| `Open(self, state)` | string | None | Shows window at the given tab state |
| `Close(self)` | — | None | Hides the window |
| `RefreshStatus(self)` | — | None | Updates all status stat labels |
| `RefreshSkill(self)` | — | None | Updates all skill slot icons/cooldowns |
| `RefreshQuest(self)` | — | None | Repopulates the quest tab list |
| `OnSelectSkillGroup(self, groupIndex)` | int | None | Switches the active skill group |
| `OnPressSkillSlot(self, slotIndex)` | int | None | Uses or attaches the skill at the given slot |
| `OnActivateSkill(self, slotIndex)` | int | None | Highlights an active skill |
| `OnDeactivateSkill(self, slotIndex)` | int | None | Removes highlight |
| `SetSkillCoolTime(self, slotIndex, coolTime, elapsedTime)` | int, float, float | None | Starts a cooldown animation on a slot |
| `_RebuildLocaleStrings()` | — | None | Static; rebuilds skill-group names and stat descriptions |

---

## Module: uiinventory.py

**Purpose:** Inventory and equipment windows, including belt inventory, costume window, and the logic for drag-and-drop item movement.

### Module-Level Constants

| Name | Value | Description |
|------|-------|-------------|
| `ITEM_FLAG_APPLICABLE` | `1 << 14` | Item flag indicating the item can be used by double-click |

### Classes

#### `CostumeWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Sub-window for the costume equipment tab. Only created when `app.ENABLE_COSTUME_SYSTEM` is True.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, wndInventory)` | InventoryWindow | None | Validates system flag, loads layout |
| `Show(self)` | — | None | Loads window if needed, refreshes costume slot |
| `Close(self)` | — | None | Hides window |
| `RefreshCostumeSlot(self)` | — | None | Updates equipped costume icons |

#### `InventoryWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Main inventory window with equipment, item grid, belt inventory, and item action menus.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads layout, initialises drag state |
| `BindInterfaceClass(self, interface)` | Interface | None | Stores reference for cross-window calls |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches the item tooltip |
| `SetDragonSoulRefineWindow(self, wnd)` | Window | None | Attaches Dragon Soul refine window |
| `Show(self)` | — | None | Shows and refreshes inventory |
| `Close(self)` | — | None | Hides window |
| `RefreshBagSlotWindow(self)` | — | None | Updates all bag slot icons |
| `RefreshEquipSlotWindow(self)` | — | None | Updates equipment slot icons |
| `RefreshBeltInventorySlot(self)` | — | None | Updates belt slot icons |
| `OverInItem(self, slotIndex)` | int | None | Shows item tooltip on mouse-over |
| `OverOutItem(self)` | — | None | Hides item tooltip |
| `UseItemSlot(self, slotIndex)` | int | None | Uses/equips/unequips item |
| `DropItem(self, slotIndex)` | int | None | Opens drop confirmation dialog |
| `MoveItemSlot(self, srcSlotIndex, dstSlotIndex)` | int, int | None | Moves item between slots |
| `OnUpdate(self)` | — | None | Processes drag-from-safebox/shop |

---

## Module: uiguild.py

**Purpose:** Guild information, member management, skill page, grade editor, war declaration, and in-game building placement.

### Module-Level Constants / Functions

| Name | Value / Type | Description |
|------|-------------|-------------|
| `DISABLE_GUILD_SKILL` | `False` | Disables the guild skill tab when True |
| `DISABLE_DECLARE_WAR` | `False` | Disables war declaration button when True |
| `MATERIAL_STONE/LOG/PLYWOOD_INDEX` | 0/1/2 | Indices for the three building materials |
| `MATERIAL_STONE/LOG/PLYWOOD_ID` | int | VNUMs for building material items |
| `BUILDING_DATA_LIST` | list | Runtime cache of building definition data |
| `GetGVGKey(srcGuildID, dstGuildID)` | int, int → int | Generates a unique int key for a guild vs guild pairing |
| `NumberToMoneyString(n)` | int → string | Delegates to `localeInfo.NumberToMoneyString` |

### Classes

#### `DeclareGuildWarDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Dialog for declaring war against another guild, with optional wager amount input.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self)` | — | None | Focuses the input field, centres dialog |
| `Close(self)` | — | None | Hides dialog |
| `OnClickOKButton(self)` | — | None | Validates wager and sends war declaration packet |

#### `GuildWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Multi-tab guild window (Info, Board, Member, Skill, Grade, Building).

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads layout |
| `SetSkillToolTip(self, toolTip)` | SkillToolTip | None | Attaches skill tooltip |
| `Open(self)` | — | None | Shows window, refreshes all tabs |
| `RefreshInfoPage(self)` | — | None | Updates guild name, level, EXP, member count |
| `RefreshBoardPage(self)` | — | None | Loads guild notice text |
| `RefreshMemberPage(self)` | — | None | Populates member list |
| `RefreshSkillPage(self)` | — | None | Updates guild skill icons and levels |
| `RefreshGradePage(self)` | — | None | Shows grade names and authority flags |
| `RefreshMemberPageGradeComboBox(self)` | — | None | Repopulates grade drop-down options |
| `OnClickGuildWarButton(self)` | — | None | Opens `DeclareGuildWarDialog` |

---

## Module: uiquest.py

**Purpose:** Quest dialog window — renders server-supplied quest text, answer buttons, and links to NPC conversations.

### Classes

#### `QuestDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Modal quest interaction window.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads layout |
| `Open(self, skin, index)` | string, int | None | Loads the skin layout and registers quest index |
| `Close(self)` | — | None | Hides window, sends close packet |
| `CloseSelf(self)` | — | None | Internal close without network packet |
| `AppendQuest(self, buttonName, ...)` | string | None | Adds an answer button |
| `OnClickAnswerButton(self, index)` | int | None | Sends answer index to server |

---

## Module: uiparty.py

**Purpose:** Party member window showing each member's name, HP/SP bars, level, and status icons.

### Classes

#### `PartyWindow`
**Inherits:** `ui.Window`
**Purpose:** Scrollable list of party member status bars.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Creates the party member list |
| `AddMember(self, pid, name)` | int, string | None | Adds a new member entry |
| `UpdateMemberInfo(self, pid)` | int | None | Refreshes HP/SP/status for a member |
| `RemoveMember(self, pid)` | int | None | Removes a member entry |
| `LinkMember(self, pid, vid)` | int, int | None | Associates a member with a world VID |
| `UnlinkMember(self, pid)` | int | None | Removes VID association |

---

## Module: uimessenger.py

**Purpose:** Messenger / friend list window showing online/offline status, guild name, and whisper buttons.

### Classes

#### `MessengerWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Scrollable list of friends and guild members with presence indicators.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self)` | — | None | Loads layout |
| `InitializeHandler(self)` | — | None | Registers with the `messenger` C++ module |
| `SetWhisperButtonEvent(self, event)` | callable | None | Sets the callback for the whisper button |
| `SetGuildButtonEvent(self, event)` | callable | None | Sets the callback for the guild button |
| `RefreshMessenger(self)` | — | None | Rebuilds the contact list |
| `OnBlockMode(self, mode)` | int | None | Updates the block indicator |

---

## Module: uishop.py

**Purpose:** NPC shop dialog showing items for sale/purchase with prices.

### Classes

#### `ShopDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Grid-based NPC shop window.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `LoadDialog(self)` | — | None | Loads `UIScript/ShopDialog.py` |
| `Open(self)` | — | None | Shows and refreshes shop slots |
| `Close(self)` | — | None | Sends close packet and hides |
| `RefreshDialog(self)` | — | None | Updates item icons and prices from `shop` module |
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `OnBuyItem(self, slotIndex)` | int | None | Sends buy packet |
| `OnSellItem(self, slotIndex)` | int | None | Sends sell packet from inventory |

---

## Module: uisafebox.py

**Purpose:** Safebox (bank/storage) and mall (item mall) windows with password protection.

### Classes

#### `PasswordDialog`
**Inherits:** `ui.ScriptWindow`
**Purpose:** PIN entry dialog used to unlock the safebox.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Open(self)` | — | None | Shows password input, clears previous entry |
| `Close(self)` | — | None | Hides dialog |
| `OnClickOK(self)` | — | None | Sends password to server |

#### `SafeboxWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Grid storage window connected to the server-side safebox.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `Open(self)` | — | None | Shows window, requests safebox contents |
| `Close(self)` | — | None | Hides and sends close packet |
| `RefreshSafeboxSlot(self)` | — | None | Redraws all storage slots |

#### `MallWindow`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Item-mall browser window (same layout as safebox but with mall data).

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetItemToolTip(self, toolTip)` | ItemToolTip | None | Attaches tooltip |
| `Open(self)` | — | None | Shows window |
| `Close(self)` | — | None | Hides window |

---

## Module: uitooltip.py

**Purpose:** All item and skill tooltip windows, including the hyperlink item tooltip.

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `chop(n)` | float | float | Rounds n − 0.5 to 1 decimal place |
| `SplitDescriptionByPixelWidth(desc, maxWidthPx, fontName)` | string, int, string | list[string] | Splits a description string into lines that fit within `maxWidthPx` pixels, respecting `\n` and `|` breaks |

### Constants

| Name | Value | Description |
|------|-------|-------------|
| `WARP_SCROLLS` | `[22011, 22000, 22010]` | VNUMs of warp-scroll items (shown with special destination tooltip) |
| `DESC_MAX_WIDTH` | `280` | Maximum tooltip description width in pixels |

### Classes

#### `ToolTip`
**Inherits:** `ui.ScriptWindow`
**Purpose:** Base tooltip window. Manages auto-sizing, line appending, and positioning relative to the cursor.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `__init__(self, minWidth=0)` | int | None | Loads layout, sets minimum width |
| `SetTitle(self, name)` | string | None | Sets the bold title line |
| `AppendSpace(self, size)` | int | None | Adds vertical whitespace |
| `AppendSeperator(self)` | — | None | Adds a horizontal divider line |
| `AppendTextLine(self, text, color, ...)` | string, int | None | Adds a text line in the given colour |
| `ShowToolTip(self)` | — | None | Shows tooltip near the cursor |
| `HideToolTip(self)` | — | None | Hides tooltip |
| `ClearToolTip(self)` | — | None | Removes all content lines |

#### `ItemToolTip`
**Inherits:** `ToolTip`
**Purpose:** Displays full item information: name, type, requirements, attributes, sockets, refine level, sell price.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetInventoryItem(self, slotIndex)` | int | None | Builds tooltip from inventory slot |
| `SetEquipmentItem(self, slotIndex)` | int | None | Builds tooltip from equipment slot |
| `SetShopItem(self, slotIndex)` | int | None | Builds tooltip from shop slot |
| `SetSafeboxItem(self, slotIndex)` | int | None | Builds tooltip from safebox slot |
| `SetExchangeOwnerItem(self, slotIndex)` | int | None | Builds tooltip from exchange offer |
| `AppendItemData(self, ...)` | various | None | Core method that appends all item fields |

#### `SkillToolTip`
**Inherits:** `ToolTip`
**Purpose:** Displays skill name, level, description, damage/cool-time, and MP cost.

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetSkill(self, skillIndex, grade)` | int, int | None | Builds tooltip for a skill at the given grade |
| `SetSkillNew(self, skillSlotIndex, ...)` | int | None | Builds tooltip from a slot reference |

#### `HyperlinkItemToolTip`
**Inherits:** `ItemToolTip`
**Purpose:** Shows an item tooltip from a chat hyperlink token array (item:vnum:...).

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `SetHyperlinkItem(self, tokens)` | list[string] | None | Parses hyperlink tokens and builds item tooltip |
