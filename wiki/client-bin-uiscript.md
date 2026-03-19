# Client UI Scripts — Complete Reference

**Source directory:** `client-bin/assets/uiscript/uiscript/`
**Total files documented:** 80

All files in this directory define a single module-level `window` dictionary (not a class). The dictionary describes the root window and a recursive `children` tuple of widget dictionaries. All localised strings come from `uiScriptLocale`. Screen-relative positioning uses the globals `SCREEN_WIDTH` and `SCREEN_HEIGHT`.

---

## acceptguildwardialog.py

**Purpose:** Dialog presented to a guild when another guild requests a war. Lets the defending guild accept or reject the war and choose the battle type.

**Window name:** `InputDialog`
**Size:** 230 × 130
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (yellow) | Title from `GUILD_WAR_ACCEPT` |
| `InputSlot` | slotbar | Displays the attacking guild's name |
| `InputValue` | text (inside InputSlot) | Enemy guild name text |
| `NormalButton` | radio_button | Select normal war type |
| `WarpButton` | radio_button | Select warp war type |
| `CTFButton` | radio_button | Select capture-the-flag war type |
| `AcceptButton` | button | Accept the war declaration |
| `CancelButton` | button | Reject / cancel |

---

## atlaswindow.py

**Purpose:** Zone/world map overlay window.

**Window name:** `AtlasWindow`
**Size:** 271 × 294
**Style:** movable, float
**Position:** `SCREEN_WIDTH - 136 - 256 - 10` (right side of screen)

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board_with_titlebar | Outer container, title from `ATLAS_TITLE` |

No additional named child widgets; the map image is rendered programmatically into the board area.

---

## attachstonedialog.py

**Purpose:** Confirmation dialog shown when a player attempts to attach a Metin stone to an item.

**Window name:** `AttachStoneDialog`
**Size:** auto (0 × 0, sized to content)
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (red) | Title from `ATTACH_METIN_DIALOG_TITLE` |
| `arrow_image` | image | Visual arrow pointing from source to target |
| `metin_slot` | image | Image slot showing the Metin stone |
| `info_text` | text | Descriptive message |
| `AcceptButton` | button | Confirm attachment |
| `CancelButton` | button | Cancel |

---

## auctionwindow.py

**Purpose:** Container window for the auction house. Hosts three tab pages: list, register, and unique auction.

**Window name:** `AuctionWindow`
**Size:** 376 × 370
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `TitleBar` | titlebar (gray) | Title from `AUCTION_TITLE` |
| `Tab_01_Image` / `Tab_02_Image` / `Tab_03_Image` | image | Background images for each tab |
| `Tab_Button_01` / `Tab_Button_02` / `Tab_Button_03` | radio_button | Switch between list / register / unique-auction pages |

---

## auctionwindow_listpage.py

**Purpose:** Auction list sub-page — displays the searchable item listing.

**Window name:** `AuctionWindow_RegisterPage` (internal name reused)
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `column_header_*` | text | Column headers: item number, item name, price |
| `SearchNameEditLine` | editline | Filter items by name |
| `SearchIDEditLine` | editline | Filter items by ID |
| `SearchNameButton` | button | Trigger name search |
| `SearchIDButton` | button | Trigger ID search |
| `ItemList` | listbox | Scrollable auction item listing |
| `scrollbar` | scrollbar | Scrollbar for ItemList |

---

## auctionwindow_registerpage.py

**Purpose:** Auction item registration sub-page — lets the player list an item for sale.

**Window name:** `AuctionWindow_RegisterPage`
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `ItemSlot` | slot | Drag-and-drop target for the item to register |
| `ItemNameText` | text | Displays the dragged item's name |
| `LowestPriceText` / `AveragePriceText` | text | Market price reference information |
| `InputPriceSlot` | slotbar | Input field for the sale price |
| `RegisterButton` | button | Submit the listing |

---

## auctionwindow_uniqueauctionpage.py

**Purpose:** Stub page for unique/timed auctions. Currently defines no child widgets.

**Window name:** `AuctionWindow_UniqueAuctionPage`
**Size:** 360 × 298

No active child widgets.

---

## beltinventorywindow.py

**Purpose:** Secondary inventory window bound to the belt equipment slot.

**Window name:** `BeltInventoryWindow`
**Size:** 148 × 139
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `ExpandButton` | button | Show the full belt inventory grid |
| `MinimizeButton` | button | Hide the inventory grid |
| `BeltInventoryBoard` | thinboard | Container for the inventory grid |
| `BeltInventorySlot` | grid_table | 4 × 4 item grid, start index `item.BELT_INVENTORY_SLOT_START` |

---

## buildguildbuildingwindow.py

**Purpose:** Window for constructing guild buildings — selecting building type, position and material costs.

**Window name:** `BuildGuildBuildingWindow`
**Size:** 465 × 240
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `CategoryList` | listbox | Building category selector |
| `BuildingList` | listbox | Building type selector |
| `BuildingScrollBar` | scrollbar | Scrollbar for building list |
| `XPositionSlot` / `YPositionSlot` | slotbar + editline | World position X/Y inputs |
| `XRotationSlider` / `YRotationSlider` / `ZRotationSlider` | sliderbar | Rotation controls |
| `PositionToggleButton` | toggle_button | Toggle free/snapped positioning |
| `PreviewToggleButton` | toggle_button | Toggle preview rendering |
| `AcceptButton` | button | Confirm building placement |
| `CancelButton` | button | Cancel |
| `StoneCount` / `LogCount` / `PlywoodCount` / `PriceCount` | text | Required materials display |

---

## changegradenamedialog.py

**Purpose:** Dialog for renaming a guild member grade.

**Window name:** `ChangeGradeNameDialog`
**Size:** 170 × 90
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Title from `GUILD_CHANGE_GRADE_NAME` |
| `GradeNameSlot` | slotbar | Input container |
| `GradeNameValue` | editline | New grade name (input limit 8) |
| `OkButton` | button | Confirm rename |
| `CancelButton` | button | Cancel |

---

## changepassworddialog.py

**Purpose:** Dialog to change the safebox password.

**Window name:** `ChangePasswordDialog`
**Size:** 220 × 137
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Title from `SAFEBOX_CHANGE_PASSWORD_TITLE` |
| `OldPasswordSlot` / `NewPasswordSlot` / `ConfirmPasswordSlot` | slotbar | Input containers |
| `OldPasswordValue` / `NewPasswordValue` / `ConfirmPasswordValue` | editline | Secret password fields (limit 6) |
| `AcceptButton` | button | Confirm change |
| `CancelButton` | button | Cancel |

---

## characterwindow.py

**Purpose:** Main character window with four tabs: status, skills, emoticons, and quest log.

**Window name:** `CharacterWindow`
**Size:** 253 × 361
**Style:** movable, float

**Tabs:**

**Character (status) tab:**

| Name | Type | Description |
|---|---|---|
| `FaceImage` | expanded_image | Character portrait |
| `GuildNameSlot` / `CharacterNameSlot` | image + text | Guild and character name display |
| `LevelValue` / `ExpValue` | text | Level and experience |
| `HTH_Value` / `INT_Value` / `STR_Value` / `DEX_Value` | text | Base stat values |
| `HTH_Plus` / `INT_Plus` / `STR_Plus` / `DEX_Plus` | button | Stat point allocation buttons |
| `HP_Gauge` / `SP_Gauge` | gauge | HP and SP bar |
| `ATT_Value` / `DEF_Value` / `MSPD_Value` / `ASPD_Value` / `CSPD_Value` / `MATT_Value` / `MDEF_Value` / `ER_Value` | text | Combat stat display |

**Skill tab:**

| Name | Type | Description |
|---|---|---|
| `ActiveSkillSlot` | slot | 24 active skill icons (two groups of 12) |
| `EtcSkillSlot` | grid_table | 6 × 2 passive/ETC skill grid |
| `SkillGroupButton1` / `SkillGroupButton2` / `SkillGroupButton3` | button | Switch skill group |

**Emoticon tab:**

| Name | Type | Description |
|---|---|---|
| `SoloEmotionSlot` | grid_table | 6 × 3 solo emotion grid |
| `DualEmotionSlot` | grid_table | 6 × 3 dual emotion grid |

**Quest tab:**

| Name | Type | Description |
|---|---|---|
| `QuestSlot_0` – `QuestSlot_4` | bar | Five quest entry rows |
| `QuestName_0` – `QuestName_4` | text | Quest name labels |
| `QuestTime_0` – `QuestTime_4` | text | Quest timer labels |
| `QuestCount_0` – `QuestCount_4` | text | Quest counter labels |
| `QuestScrollBar` | scrollbar | Scroll quest list |

---

## connectingdialog.py

**Purpose:** Non-interactive dialog shown while the client connects to the server.

**Window name:** `QuestionDialog` (internal name differs from filename)
**Size:** 280 × 75
**Style:** float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `message` | text | Primary status text (`LOGIN_CONNECTING`) |
| `countdown_message` | text | Countdown or secondary status text |

---

## costumewindow.py

**Purpose:** Costume equipment window showing three dedicated costume slots.

**Window name:** `CostumeWindow`
**Size:** 140 × 180
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (yellow) | Title from `COSTUME_TITLE` |
| `CostumeBackground` | image | Costume panel background |
| `CostumeSlot` | slot | 3 slots: body (index+0), head (index+1), weapon (index+2) |

---

## createcharacterwindow.py

**Purpose:** Full-screen character creation screen with class selection, stat preview, name entry and gender/shape selection.

**Window name:** `CreateCharacterWindow`
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `BackGround` | expanded_image | Full-screen background |
| `name_warrior` / `name_assassin` / `name_sura` / `name_shaman` | image | Class name images |
| `gauge_hth` / `gauge_int` / `gauge_str` / `gauge_dex` | gauge | Stat preview bars (red/pink/purple/blue) |
| `CharacterNameSlot` | slotbar | Name input container |
| `CharacterNameValue` | editline | Character name (limit 12) |
| `man_button` / `woman_button` | radio_button | Gender selection |
| `shape_1_button` / `shape_2_button` | radio_button | Shape/appearance selection |
| `create_button` | button | Confirm character creation |
| `cancel_button` | button | Cancel and return |
| `left_button` / `right_button` | button | Navigate between class slots |

---

## cuberesultwindow.py

**Purpose:** Displays the result of a cube synthesis.

**Window name:** `CubeWindow` (internal name)
**Size:** 176 × 175
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `TitleBar` | titlebar | Title from `CUBE_RESULT_TITLE` |
| `ResultSlot` | grid_table | 2 × 2 result item grid |
| `SuccessLabel` | text | Success/failure text |
| `OkButton` | button | Dismiss dialog |

---

## cubewindow.py

**Purpose:** Cube synthesis window — compose ingredients into new items.

**Window name:** `CubeWindow`
**Size:** 285 × 521
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `Background` | expanded_image | Decorative background |
| `IngredientSlot` | slot | 8 × 3 ingredient grid |
| `scrollbar` | thin_scrollbar | Scroll through recipe list |
| `result1board` / `result2board` / `result3board` | thinboard | Three result preview areas |
| Inside each result board: `ResultSlot` | grid_table | 1 result item slot |
| Inside each result board: `MaterialSlot` | grid_table | 5 material requirement slots |
| `MoneyText` | text | Required Yang cost display |
| `OkButton` | button | Perform synthesis |
| `CancelButton` | button | Cancel |

---

## declareguildwardialog.py

**Purpose:** Dialog to declare a war on another guild.

**Window name:** `InputDialog`
**Size:** 230 × 130
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Title from `GUILD_WAR_DECLARE` |
| `InputSlot` | slotbar | Input container |
| `InputValue` | editline | Enemy guild name (limit 12) |
| `NormalButton` / `WarpButton` / `CTFButton` | radio_button | War type selection |
| `OkButton` | button | Declare war |
| `CancelButton` | button | Cancel |

---

## dragonsoulrefinewindow.py

**Purpose:** Dragon Soul refining window — combine dragon soul stones to upgrade them.

**Window name:** `DragonSoulRefineWindow`
**Size:** 287 × 232
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `Background` | image | Refine window background |
| `RefineSlot` | grid_table | 5 × 3 ingredient stone grid |
| `ResultSlot` | grid_table | 2 × 3 result stone grid |
| `GradeButton` / `StepButton` / `StrengthButton` | toggle_button | Refinement mode selectors |
| `MoneyText` | text | Yang cost |
| `DoRefineButton` | button | Execute refinement |

---

## dragonsoulwindow.py

**Purpose:** Dragon Soul inventory window — manage and equip Dragon Soul stones.

**Window name:** `InventoryWindow` (internal name)
**Size:** 287 × 505
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `DragonSoulBackground` | image | Window background |
| `Tab_01` – `Tab_05` | radio_button | Inventory type tabs |
| `ItemSlot` | grid_table | 8 × 4 dragon soul item grid |
| `EquipmentSlot` | slot | 6 dragon soul equipment positions |
| `Deck1Button` / `Deck2Button` | toggle_button | Active deck selection |
| `TypeTab_01` – `TypeTab_06` | radio_button | Stone type filter tabs |
| `ActivateButton` | toggle_button | Activate/deactivate equipped dragon souls |

---

## energybar.py

**Purpose:** Small energy/stamina bar widget displayed on the HUD.

**Window name:** `EnergyBar`
**Size:** 50 × 10

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `Board` | image | Bar background |
| `EmptyImage` / `HungryImage` / `FullImage` | expanded_image | State-dependent fill images |
| `TooltipWindow` | window | Tooltip container |

---

## equipmentdialog.py

**Purpose:** View another player's equipment in a read-only dialog.

**Window name:** `EquipmentDialog`
**Size:** 180 × 230
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board_with_titlebar | Frame titled with the target character's name |
| `EquipmentBackground` | image | Equipment panel background |
| `EquipmentSlot` | slot | 12 equipment slots (indices 0–10 plus belt index 23) |

---

## exchangedialog.py

**Purpose:** Player-to-player trade dialog showing both parties' offered items and Yang.

**Window name:** `ExchangeDialog`
**Size:** 282 × 167
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `MiddleBar` | image | Divider between owner and target sides |
| `OwnerSlot` | grid_table | 4 × 3 item grid (own side) |
| `OwnerMoneyButton` | button | Set Yang offer |
| `OwnerAcceptLight` | image | Acceptance indicator |
| `OwnerAcceptToggle` | toggle_button | Toggle acceptance |
| `TargetSlot` | grid_table | 4 × 3 item grid (other side) |
| `TargetMoneyImage` | image | Other party's Yang display |
| `TargetAcceptLight` | image | Other party acceptance indicator |

---

## expandedtaskbar.py

**Purpose:** Small expanded taskbar widget that appears above the main taskbar.

**Window name:** `ExpandTaskBar`
**Size:** 37 × 37

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `DragonSoulButton` | button | Toggle Dragon Soul window |

---

## fishingwindow.py

**Purpose:** Fishing activity window showing animations for the different fishing states.

**Window name:** `FishingWindow`
**Size:** 150 × 195
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `BoxBorder` | image | Window frame |
| `WaterAnimation` | ani_image | Animated water surface (7 frames) |
| `FishNameText` | text | Name of caught fish |
| `WaitAni` | ani_image | "Waiting" state (11 frames) |
| `ThrowAni` | ani_image | "Casting" state (14 frames) |
| `ReactAni` | ani_image | "Fish biting" state (14 frames) |
| `CatchAni` | ani_image | "Caught" state (12 frames) |
| `FishingButton` | button | Interact / reel in |

---

## gameoptiondialog.py

**Purpose:** In-game gameplay option toggles (name color, PvP mode, block options, etc.).

**Window name:** `GameOptionDialog`
**Size:** 300 × 283
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `titlebar` | titlebar (gray) | Title from `GAMEOPTION_TITLE` |
| `name_color_normal` / `name_color_empire` | radio_button | Player name color scheme |
| `target_board_show` / `target_board_hide` | radio_button | Target info board visibility |
| `pvp_mode_peace` / `pvp_mode_revenge` / `pvp_mode_guild` / `pvp_mode_free` | radio_button | PvP mode selection |
| `block_exchange` / `block_party` / `block_guild` / `block_whisper` / `block_friend` / `block_party_request` | toggle_button | Communication block options |
| `chat_onoff` | toggle_button | Chat on/off |
| `always_show_name` | toggle_button | Always show player names |
| `effect_onoff` | toggle_button | Effects on/off |
| `sales_text_onoff` | toggle_button | Sales text on/off |

---

## gamewindow.py

**Purpose:** Root game HUD window (transparent, non-interactive overlay).

**Window name:** `GameWindow`
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT
**Style:** not_pick (mouse clicks pass through)

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `HelpButton` | button | Open help overlay |
| `QuestButton` | button | Open quest log |
| `StatusPlusButton` | button | Open status/stat allocation panel |
| `SkillPlusButton` | button | Open skill point allocation panel |
| `ExitObserver` | button | Exit observer mode |
| `BuildGuildBuilding` | button | Open guild building construction |

---

## giftbox.py

**Purpose:** Gift box icon displayed near the bottom of the screen when gifts are available.

**Window name:** `GiftBox`
**Size:** 50 × 50
**Position:** `y = SCREEN_HEIGHT - 45 - 90`

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `GiftIcon` | image | Gift box icon image |
| `TooltipWindow` | window | Tooltip container |

---

## guildwindow.py

**Purpose:** Guild window container with six navigation tabs.

**Window name:** `GuildWindow`
**Size:** 376 × 356
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `TitleBar` | titlebar (gray) | Title from `GUILD_TITLE` |
| `Tab_Button_01` – `Tab_Button_06` | radio_button | Tab navigation (info / members / grades / skills / bulletin / base info) |

---

## guildwindow_baseinfopage.py

**Purpose:** Guild base information sub-page showing resources and buildings.

**Window name:** `GuildWindow_BaseInfoPage`
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `GuildNameSlot` | slotbar + text | Guild name display |
| Resource rows (×6) | image + text | Water stone / Metin stone / Water / Crystal / Mineral / Gem with drop basket description |
| Building column headers | text | Column header labels |
| `RefreshButton` | button | Reload building/resource data |

---

## guildwindow_boardpage.py

**Purpose:** Guild bulletin board for posting and reading messages.

**Window name:** `GuildWindow_BoardPage`
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `IDHeader` / `MessageHeader` | text | Column headers |
| `RefreshButton` | button | Reload board entries |
| `PostButton` | button | Open post comment dialog |
| `CommentEditLine` | editline | New message input (limit 49) |
| `BoardList` | listbox | Scrollable message list |
| `scrollbar` | scrollbar | Scrollbar for BoardList |

---

## guildwindow_gradepage.py

**Purpose:** Guild grade management sub-page — view and set permissions per grade.

**Window name:** `GuildWindow_BoardPage` (internal name reused)
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| Column header texts | text | GradeNumber, GradeName, InviteAuthority, DriveOutAuthority, NoticeAuthority, SkillAuthority |
| Grade rows | dynamically populated | Grade rows with authority toggle buttons |

---

## guildwindow_guildinfopage.py

**Purpose:** Guild information sub-page — general guild data, war management, guild mark.

**Window name:** `GuildWindow_GuildInfoPage`
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| Left panel slots | text / slotbar | Guild name, master, level, current EXP, remaining EXP, member count, average level |
| `MarkUploadButton` | button | Upload new guild mark image |
| `LargeMarkSlot` | image / slot | Large guild mark display |
| Enemy guild slots (×6) | slotbar + button | Enemy guild names with cancel war buttons |
| `DeclareWarButton` | button | Open war declaration dialog |

---

## guildwindow_guildinfopage_eu.py

**Purpose:** EU locale variant of the guild info page. Functionally identical to the base version.

**Window name:** `GuildWindow_GuildInfoPage`
**Size:** 360 × 298

Same layout as `guildwindow_guildinfopage.py` with no additional widgets.

---

## guildwindow_guildinfopage_jp.py

**Purpose:** JP locale variant of the guild info page. Adds guild treasury management buttons.

**Window name:** `GuildWindow_GuildInfoPage`
**Size:** 360 × 298

Extends the base page with:

| Name | Type | Description |
|---|---|---|
| `DepositButton` | button | Deposit Yang into guild treasury |
| `WithdrawButton` | button | Withdraw Yang from guild treasury |

---

## guildwindow_guildskillpage.py

**Purpose:** Guild skill sub-page — view and use guild passive, active, and affect skills.

**Window name:** `GuildWindow_GuildSkillPage`
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `PassiveSkillBar` | image | Passive skill section header bar |
| `PassiveSkillSlot` | slot | 9 × 1 passive skill grid (index 200) |
| `ActiveSkillBar` | image | Active skill section header bar |
| `ActiveSkillSlot` | slot | 9 × 1 active skill grid (index 210) |
| `AffectSkillBar` | image | Affect skill section header bar |
| `AffectSkillSlot` | slot | 9 × 2 affect skill grid |
| `DragonGodGauge` | ani_image | Animated dragon god power gauge (7 frames) |
| `DragonGodValueSlot` | slot | Power value display |
| `HealGSPButton` | button | Heal guild SP |

---

## guildwindow_memberpage.py

**Purpose:** Guild member list sub-page.

**Window name:** `GuildWindow_MemberPage`
**Size:** 360 × 298

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| Column headers | text | IndexName, IndexGrade, IndexJob, IndexLevel, IndexOffer, IndexGeneral |
| `MemberList` | listbox | Scrollable member list |
| `scrollbar` | scrollbar | List scrollbar |

---

## helpwindow.py

**Purpose:** In-game help overlay showing keyboard shortcuts and taskbar pointer guides.

**Window name:** `HelpWindow`
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| Help text lines (×19) | text | Keyboard shortcut descriptions |
| Pointer sticks (×8) | expanded_image + text | Visual guides pointing at taskbar elements: fury, HP, SP, EXP, left mouse, right mouse, quickslot, system |
| `CloseButton` | button | Dismiss help overlay |

---

## helpwindow2.py

**Purpose:** Extended help overlay with two pages — page 1 mirrors helpwindow.py, page 2 is a placeholder.

**Window name:** `HelpWindow`
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| Help text lines (×19) | text | Page 1 keyboard shortcut descriptions |
| `Page1Button` / `Page2Button` | radio_button | Switch help pages |
| Pointer sticks (×8) | expanded_image + text | Same taskbar pointer guides as helpwindow.py |
| `CloseButton` | button | Dismiss |

---

## imekor.py

**Purpose:** Korean IME candidate input bar.

**Window name:** `IME`
**Size:** 155 × 25

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `HorizontalCandidateBoard` | image | Background bar image |
| `candidate_list` | candidate_list | Displays Korean character candidates |

---

## inputdialog.py

**Purpose:** Generic single-field text input dialog.

**Window name:** `InputDialog`
**Size:** 170 × 90
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Empty title (set programmatically) |
| `InputSlot` | slotbar | Input container (centered) |
| `InputValue` | editline | Text input (limit 12) |
| `OkButton` | button | Confirm |
| `CancelButton` | button | Cancel |

---

## inputdialogwithdescription.py

**Purpose:** Input dialog with a single description line above the input field.

**Window name:** `InputDialog_WithDescription`
**Size:** 170 × 106
**Style:** movable, float

Extends `inputdialog.py` with:

| Name | Type | Description |
|---|---|---|
| `Description` | text | Centered description text above input |

---

## inputdialogwithdescription2.py

**Purpose:** Input dialog with two description lines above the input field.

**Window name:** `InputDialog_WithDescription`
**Size:** 170 × 122
**Style:** movable, float

Extends `inputdialog.py` with:

| Name | Type | Description |
|---|---|---|
| `Description1` | text | First description line |
| `Description2` | text | Second description line |

---

## inventorywindow.py

**Purpose:** Main player inventory window with equipment slots and item grid.

**Window name:** `InventoryWindow`
**Size:** 176 × 565
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (yellow) | Title from `INVENTORY_TITLE` |
| `EquipmentBackground` | image | Equipment panel background |
| `EquipmentSlot` | slot | 12 equipment slots (indices 90–100 + belt slot 23) |
| `DSSButton` | button | Open Dragon Soul System window |
| `MallButton` | button | Open item mall |
| `CostumeButton` | button | Open costume window |
| `Equipment_Tab_01` / `Equipment_Tab_02` | radio_button | Switch equipment page I/II |
| `Inventory_Tab_01` / `Inventory_Tab_02` | radio_button | Switch inventory page I/II (with tooltips) |
| `ItemSlot` | grid_table | 5 × 9 item grid (index 0) |
| `MoneyButton` | button | Open money management |
| `MoneyIcon` | image | Yang icon |

---

## loadingwindow.py

**Purpose:** Loading screen shown while map data is loaded.

**Window name:** `LoginWindow` (internal name differs from filename)
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `BackGround` | expanded_image | Tiled pattern background |
| `ErrorMessage` | text | Error text (hidden unless error) |
| `LoadingGauge` | ani_image | 24-frame loading animation |
| `EmptyGauge` | image | Empty gauge background |
| `FullGauge` | expanded_image | Full gauge overlay |

---

## loginwindow.py

**Purpose:** Login and server-selection screen with virtual keyboard.

**Window name:** `LoginWindow`
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `BackGround1` / `BackGround2` | expanded_image | Background layers |
| Virtual keyboard keys (×46) | button | Digit, letter and special character keys |
| `ConnectBoard` | board | Server address input area |
| `ServerAddressSlot` | slotbar + editline | Server address / IP field |
| `ConnectSelectButton` | button | Connect to entered address |
| `LoginBoard` | board | Login credentials area |
| `IDSlot` / `PasswordSlot` | slotbar + editline | Username and password fields |
| `LoginButton` | button | Submit login |
| `ExitButton` | button | Exit the client |
| `ServerBoard` | board | Server / channel list area |
| `ServerList` | listbox2 | Server list |
| `ChannelList` | listbox | Channel list |
| `ServerSelectButton` | button | Confirm server/channel |
| `ServerExitButton` | button | Cancel server selection |

---

## mallwindow.py

**Purpose:** Item mall window (safebox-style, minimal UI — content rendered separately).

**Window name:** `SafeboxWindow` (internal name differs from filename)
**Size:** 176 × 327
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (yellow) | Title from `MALL_TITLE` |
| `CloseButton` | button | Close window |

---

## marklistwindow.py

**Purpose:** Guild mark selection list window.

**Window name:** `MarkListWindow`
**Size:** 170 × 300
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board_with_titlebar | Frame with title from `MARK_LIST_TITLE` |
| `MarkList` | listbox | Scrollable mark image list |
| `scrollbar` | scrollbar | List scrollbar |
| `OkButton` | button | Select mark |
| `CancelButton` | button | Cancel |
| `RefreshButton` | button | Reload mark list |

---

## messengerwindow.py

**Purpose:** Friend/messenger window for managing contacts.

**Window name:** `MessengerWindow`
**Size:** 170 × 300
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board_with_titlebar | Frame with title from `MESSENGER_TITLE` |
| `FriendList` | listbox | Scrollable friend list |
| `scrollbar` | scrollbar | List scrollbar |
| `AddFriendButton` | button | Add a friend (tooltip text) |
| `WhisperButton` | button | Open whisper dialog (tooltip text, disabled image) |
| `RemoveButton` | button | Remove friend (tooltip text, disabled image) |
| `GuildButton` | button | View guild (tooltip text, disabled image) |

---

## minimap.py

**Purpose:** Minimap HUD widget with open/closed states.

**Window name:** `MiniMap`
**Size:** 136 × 137

**Sub-windows:**

**OpenWindow:**

| Name | Type | Description |
|---|---|---|
| `MiniMapBackground` | image | Map background |
| `MiniMapWindow` | window | Map rendering target |
| `ScaleUpButton` / `ScaleDownButton` | button | Zoom in/out |
| `HideButton` | button | Collapse minimap |
| `AtlasShowButton` | button | Open atlas (zone map) |
| `ServerInfo` | text | Server name display |
| `PositionInfo` | text | Player coordinate display |
| `ObserverCount` | text | Observer count display |

**CloseWindow:**

| Name | Type | Description |
|---|---|---|
| `MiniMapShowButton` | button | Expand minimap |

---

## moneyinputdialog.py

**Purpose:** Specialised input dialog for entering a Yang (money) amount.

**Window name:** `InputDialog` (internal name)
**Size:** 200 × 110
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Title set programmatically |
| `InputSlot` | slotbar + editline | Yang amount field (limit 12, numbers only) |
| `MoneyValue` | text | Current Yang balance display |
| `OkButton` | button | Confirm |
| `CancelButton` | button | Cancel |

---

## mousebuttonwindow.py

**Purpose:** Left mouse button mode selector popup.

**Window name:** `ButtonWindow`
**Size:** 32 × 96

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `button_move_and_attack` | button | Move and attack mode (tooltip: `MOUSEBUTTON_ATTACK`) |
| `button_auto_attack` | button | Auto-attack mode (tooltip: `MOUSEBUTTON_AUTO`) |
| `button_camera` | button | Camera mode (tooltip: `MOUSEBUTTON_CAMERA`) |

---

## musiclistwindow.py

**Purpose:** Background music track selection list.

**Window name:** `MusicListWindow`
**Size:** 170 × 300
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board_with_titlebar | Frame with title from `MUSIC_LIST_TITLE` |
| `MusicList` | listbox | Scrollable track list |
| `scrollbar` | scrollbar | List scrollbar |
| `OkButton` | button | Play selected track |
| `CancelButton` | button | Cancel |
| `RefreshButton` | button | Reload list |

---

## partymemberinfoboard.py

**Purpose:** Party member status widget displayed for each member in the party.

**Window name:** `PartyMemeberInfoBoard`
**Size:** 106 × 36

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `StateButton` | button | Member state/status indicator |
| `NameBar` | image | Member name background bar |
| `HPGauge` | gauge | Member HP bar |
| `ExperienceImage` | image | EXP share role icon |
| `AttackerImage` | image | Attacker role icon |
| `DefenderImage` | image | Defender role icon |
| `BufferImage` | image | Buffer role icon |
| `SkillMasterImage` | image | Skill master role icon |
| `TimeBonusImage` | image | Time bonus role icon |
| `RegenBonus` | image | Regeneration bonus icon |
| `IncreaseArea150` / `IncreaseArea200` | image | Loot area increase icons (150% / 200%) |

---

## passworddialog.py

**Purpose:** Safebox password entry dialog.

**Window name:** `PasswordDialog`
**Size:** 250 × 150
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (gray) | Title from `SAFEBOX_PASSWORD_TITLE` |
| `Desc1` – `Desc5` | text | Five password instruction/description lines |
| `PasswordSlot` | slotbar | Input container |
| `PasswordValue` | editline | Secret password field (limit 6) |
| `OkButton` | button | Confirm |
| `CancelButton` | button | Cancel |

---

## pickmoneydialog.py

**Purpose:** Dialog for specifying how much money to pick up from the ground.

**Window name:** `PickMoneyDialog`
**Size:** 170 × 90
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Title from `PICK_MONEY_TITLE` |
| `InputSlot` | slotbar | Input container |
| `InputValue` | editline | Amount (numbers only, limit 6, default "1") |
| `MaxValueText` | text | Maximum available amount |
| `OkButton` | button | Confirm |
| `CancelButton` | button | Cancel |

---

## popupdialog.py

**Purpose:** Simple one-button popup notification dialog.

**Window name:** `PopupDialog`
**Size:** 280 × 105
**Style:** float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `message` | text | Centered notification text |
| `OkButton` | button | Dismiss |

---

## privateshopbuilder.py

**Purpose:** Private shop setup window — name your shop and arrange items for sale.

**Window name:** `PrivateShopBuilder`
**Size:** 184 × 354
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (gray) | Title from `PRIVATE_SHOP_TITLE` |
| `ShopNameSlot` | slotbar | Shop name input container |
| `ShopNameEditLine` | editline | Shop name (limit 25) |
| `ItemSlot` | grid_table | 5 × 8 item grid |
| `OkButton` | button | Open shop |
| `CloseButton` | button | Cancel |

---

## questdialog.py

**Purpose:** Quest NPC dialog container window.

**Window name:** `QuestDialog`
**Size:** 800 × 450
**Style:** float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | thinboard | Centered container (all_align center) |

Quest content (text, buttons, images) is loaded dynamically at runtime.

---

## questiondialog.py

**Purpose:** Standard yes/no confirmation dialog.

**Window name:** `QuestionDialog`
**Size:** 340 × 105
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `message` | text | Centered question text |
| `YesButton` | button | Confirm / yes |
| `NoButton` | button | Deny / no |

---

## questiondialog2.py

**Purpose:** Yes/no dialog with two message lines.

**Window name:** `QuestionDialog`
**Size:** 280 × 105
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `message1` / `message2` | text | Two centered message lines |
| `YesButton` | button | Confirm / yes |
| `NoButton` | button | Deny / no |

---

## refinedialog.py

**Purpose:** Item refinement (upgrade) confirmation dialog showing success chance and cost.

**Window name:** `RefineDialog`
**Size:** auto-sized
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (red) | Title from `REFINE_DIALOG_TITLE` |
| `SuccessRateText` | text | Success percentage display |
| `CostText` | text | Required Yang/material cost |
| `OkButton` | button | Confirm refine |
| `CancelButton` | button | Cancel |

---

## restartdialog.py

**Purpose:** Death restart options dialog.

**Window name:** `RestartDialog`
**Size:** 200 × 88
**Style:** float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | thinboard | Outer frame |
| `restart_here_button` | button | Restart at current location |
| `restart_town_button` | button | Restart in town |

---

## rightmousebuttonwindow.py

**Purpose:** Right mouse button mode selector popup.

**Window name:** `RightButtonWindow`
**Size:** 96 × 32

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `button_move_and_attack` | button | Move/attack mode (tooltip: `MOUSEBUTTON_ATTACK`) |
| `button_camera` | button | Camera mode (tooltip: `MOUSEBUTTON_CAMERA`) |
| `button_skill` | button | Skill use mode (tooltip: `MOUSEBUTTON_SKILL`) |

---

## safeboxwindow.py

**Purpose:** Safe (bank storage) window with password change and exit options.

**Window name:** `SafeboxWindow`
**Size:** 176 × 250
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame |
| `TitleBar` | titlebar (yellow) | Title from `SAFE_TITLE` |
| `ChangePasswordButton` | button | Open change password dialog |
| `ExitButton` | button | Close safebox |

Note: the item grid for safebox contents is rendered separately and not defined in this script.

---

## selectcharacterwindow.py

**Purpose:** Character selection screen showing up to four character slots.

**Window name:** `SelectCharacterWindow`
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `BackGround` | expanded_image | Full-screen background (scaled to screen) |
| `name_warrior` / `name_assassin` / `name_sura` / `name_shaman` | image | Class name images |
| `character_board` | thinboard | Character info panel |
| `EmpireFlag_A` / `EmpireFlag_B` / `EmpireFlag_C` | expanded_image | Empire flag (one shown at a time, scale 0.5) |
| `EmpireNameSlot` / `EmpireName` | image + text | Empire name display |
| `GuildNameSlot` / `GuildName` | image + text | Guild name display |
| `character_name` / `character_name_value` | text | Character name row |
| `character_level` / `character_level_value` | text | Level row |
| `character_play_time` / `character_play_time_value` | text | Play time row |
| `gauge_hth` / `character_hth_value` | gauge + text | HP stat bar and numeric value |
| `gauge_int` / `character_int_value` | gauge + text | SP stat bar and numeric value |
| `gauge_str` / `character_str_value` | gauge + text | Attack grade bar and numeric value |
| `gauge_dex` / `character_dex_value` | gauge + text | Dex grade bar and numeric value |
| `start_button` | button | Enter game with selected character |
| `create_button` | button | Create new character |
| `exit_button` | button | Exit to login |
| `delete_button` | button | Delete selected character |
| `left_button` / `right_button` | button | Navigate character slots |

---

## selectempirewindow.py

**Purpose:** Empire selection screen shown before first character creation.

**Window name:** `SelectCharacterWindow` (internal name)
**Size:** SCREEN_WIDTH × SCREEN_HEIGHT

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `BackGround` | expanded_image | Tiled pattern background |
| `Alpha` | expanded_image | Semi-transparent overlay |
| `Top_Line` / `Bottom_Line` | expanded_image | Decorative top/bottom line patterns |
| `Title` | expanded_image | Locale-specific title image |
| `Atlas` | image | World map atlas image |
| `EmpireArea_A` / `EmpireArea_B` / `EmpireArea_C` | expanded_image | Highlighted empire territory areas |
| `EmpireAreaFlag_A` / `EmpireAreaFlag_B` / `EmpireAreaFlag_C` | expanded_image | Empire flags on atlas |
| `left_button` / `right_button` | button | Navigate empire selection |
| `empire_board` | thinboard | Empire info sidebar |
| `flag_board` | bar | Empire flag display area |
| `EmpireFlag_A` / `EmpireFlag_B` / `EmpireFlag_C` | expanded_image | Large empire flags (centered) |
| `text_board` | bar | Empire lore text area with border lines |
| `prev_text_button` / `next_text_button` | button | Page through empire lore text |
| `select_button` | button | Confirm empire choice |
| `exit_button` | button | Return without selecting |

---

## selectitemwindow.py

**Purpose:** Item selection window (used for choosing a Metin stone to attach).

**Window name:** `SelectItemWindow`
**Size:** 184 × 332
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar | Title from `SELECT_METIN_STONE_TITLE` |
| `ItemSlot` | grid_table | 5 × 8 item grid (start index 0) |
| `ExitButton` | button | Close window |

---

## shopdialog.py

**Purpose:** NPC shop dialog for buying and selling items.

**Window name:** `ShopDialog`
**Size:** 184 × 328
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `TitleBar` | titlebar (gray) | Shop title |
| `ItemSlot` | grid_table | 5 × 8 item grid |
| `BuyButton` / `SellButton` | toggle_button | Switch between buy and sell mode |
| `CloseButton` | button | Close shop |
| `MiddleTab1` / `MiddleTab2` | radio_button | Middle tab selection |
| `SmallTab1` / `SmallTab2` / `SmallTab3` | radio_button | Sub-category tabs |

---

## skillpointresetdialog.py

**Purpose:** Dialog offering skill point reset option.

**Window name:** `SkillResetDialog`
**Size:** 200 × 228
**Style:** float
**Position:** centered on screen

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | thinboard | Outer frame |
| `reset_button` | button | Reset skill points (text: "스킬포인트 리셋") |
| `cancel_button` | button | Cancel (text: "취소") |

Note: button labels are hardcoded Korean strings, not sourced from `uiScriptLocale`.

---

## systemdialog.py

**Purpose:** System menu with links to all major system functions.

**Window name:** `SystemDialog`
**Size:** 200 × 288
**Style:** float
**Position:** centered on screen

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | thinboard | Outer frame |
| `help_button` | button | Open help window (`SYSTEM_HELP`) |
| `mall_button` | button | Open item mall (`SYSTEM_MALL`, gold text, always-down appearance) |
| `system_option_button` | button | Open system options (`SYSTEMOPTION_TITLE`) |
| `game_option_button` | button | Open game options (`GAMEOPTION_TITLE`) |
| `change_button` | button | Change character (`SYSTEM_CHANGE`) |
| `logout_button` | button | Log out (`SYSTEM_LOGOUT`) |
| `exit_button` | button | Exit game (`SYSTEM_EXIT`) |
| `cancel_button` | button | Close menu (`CANCEL`) |

---

## systemdialog_formall.py

**Purpose:** System menu variant that includes the mall button without the gold highlight styling. Otherwise functionally identical to `systemdialog.py`.

**Window name:** `SystemDialog`
**Size:** 200 × 288
**Style:** float
**Position:** centered on screen

Same widgets as `systemdialog.py`. The `mall_button` uses standard button images (no forced-down state, no gold text color).

---

## systemdialog_forportal.py

**Purpose:** Reduced system menu variant without the mall button (used in portal/restricted contexts).

**Window name:** `SystemDialog`
**Size:** 200 × 225
**Style:** float
**Position:** centered on screen

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | thinboard | Outer frame |
| `help_button` | button | Open help window |
| `system_option_button` | button | Open system options |
| `game_option_button` | button | Open game options |
| `change_button` | button | Change character |
| `exit_button` | button | Exit game |
| `cancel_button` | button | Close menu |

---

## systemoptiondialog.py

**Purpose:** System options dialog for audio, camera distance, fog density, and tile rendering mode.

**Window name:** `SystemOptionDialog`
**Size:** 305 × 255
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `titlebar` | titlebar (gray) | Title from `SYSTEMOPTION_TITLE` |
| `sound_name` | text | Sound effects label |
| `sound_volume_controller` | sliderbar | Sound volume slider |
| `music_name` | text | Music label |
| `music_volume_controller` | sliderbar | Music volume slider |
| `bgm_button` | button | Change background music file |
| `bgm_file` | text | Current BGM filename display |
| `camera_mode` | text | Camera distance label |
| `camera_short` / `camera_long` | radio_button | Camera distance: short / long |
| `fog_mode` | text | Fog label |
| `fog_level0` / `fog_level1` / `fog_level2` | radio_button | Fog: dense / middle / light |
| `tiling_mode` | text | Tile rendering label |
| `tiling_cpu` / `tiling_gpu` | radio_button | Tiling: CPU / GPU |
| `tiling_apply` | button | Apply tiling mode change |

Note: shadow options are present in the file but commented out.

---

## taskbar.py

**Purpose:** Main taskbar — the primary HUD bar at the bottom of the screen containing gauges, quickslots, mouse mode buttons, and navigation buttons.

**Window name:** `TaskBar`
**Size:** SCREEN_WIDTH × 37
**Position:** `y = SCREEN_HEIGHT - 37`

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `Base_Board_01` | expanded_image | Tiled taskbar background (center section) |
| `Gauge_Board` | image | Left gauge panel background |
| `RampageGauge` / `RampageGauge2` | ani_image | Fury/rampage animated gauge (16 frames each) |
| `HPGauge_Board` | window | HP gauge container |
| `HPRecoveryGaugeBar` | bar | HP recovery overlay (semi-transparent red) |
| `HPGauge` | ani_image | HP animated bar (7 frames) |
| `SPGauge_Board` | window | SP gauge container |
| `SPRecoveryGaugeBar` | bar | SP recovery overlay (semi-transparent blue) |
| `SPGauge` | ani_image | SP animated bar (7 frames) |
| `STGauge_Board` | window | Stamina gauge container |
| `STGauge` | ani_image | Stamina animated bar (7 frames) |
| `EXP_Gauge_Board` | image | EXP gauge panel |
| `EXPGauge_01` – `EXPGauge_04` | expanded_image | EXP progress point markers |
| `LeftMouseButton` | button | Left mouse mode selector |
| `RightMouseButton` | button | Right mouse mode selector |
| `CharacterButton` | button | Open character window (tooltip: `TASKBAR_CHARACTER`) |
| `InventoryButton` | button | Open inventory (tooltip: `TASKBAR_INVENTORY`) |
| `MessengerButton` | button | Open messenger (tooltip: `TASKBAR_MESSENGER`) |
| `SystemButton` | button | Open system menu (tooltip: `TASKBAR_SYSTEM`) |
| `quickslot_board` | window | Quickslot container |
| `ExpandButton` | button | Expand taskbar (tooltip: `TASKBAR_EXPAND`) |
| `quick_slot_1` | grid_table | Left quickslot bank 4 × 1 (indices 0–3, labeled 1/2/3/4) |
| `quick_slot_2` | grid_table | Right quickslot bank 4 × 1 (indices 4–7, labeled F1/F2/F3/F4) |
| `QuickSlotBoard` | window | Page navigation sub-widget |
| `QuickSlotNumberBox` | image | Current page number display |
| `QuickPageUpButton` | button | Previous quickslot page (tooltip: `TASKBAR_PREV_QUICKSLOT`) |
| `QuickPageNumber` | image | Page number digit image |
| `QuickPageDownButton` | button | Next quickslot page (tooltip: `TASKBAR_NEXT_QUICKSLOT`) |

---

## taskbar_easter.py

**Purpose:** Easter event seasonal variant of the main taskbar. Identical structure to `taskbar.py` with the rampage gauge animation replaced by an Easter 2012 egg animation (10 frames: `easter_2012_0000.tga` – `easter_2012_0009.tga`).

**Window name:** `TaskBar`
**Size:** SCREEN_WIDTH × 37

All other widgets are identical to `taskbar.py`.

---

## taskbar_haloween.py

**Purpose:** Halloween event seasonal variant of the main taskbar. Identical structure to `taskbar.py` with the rampage gauge animation replaced by a pumpkin animation (16 frames: `shop_button_kuerbis0000.tga` – `shop_button_kuerbis0015.tga`).

**Window name:** `TaskBar`
**Size:** SCREEN_WIDTH × 37

All other widgets are identical to `taskbar.py`.

---

## taskbar_valentine.py

**Purpose:** Valentine's Day event seasonal variant of the main taskbar. Identical structure to `taskbar.py` with the rampage gauge animation replaced by a heart animation (16 frames: `herz0000.tga` – `herz0015.tga`).

**Window name:** `TaskBar`
**Size:** SCREEN_WIDTH × 37

All other widgets are identical to `taskbar.py`.

---

## webwindow.py

**Purpose:** Embedded web browser window for the item mall or external web content.

**Window name:** `MallWindow`
**Size:** 760 × 590 (WEB_WIDTH + 20 × WEB_HEIGHT + 40, where WEB_WIDTH=740, WEB_HEIGHT=550)
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | board | Outer frame (style: attach) |
| `TitleBar` | titlebar (yellow) | Title from `SYSTEM_MALL` |

The web browser content area (740 × 550) is rendered programmatically and is not declared as a child widget.

---

## whisperdialog.py

**Purpose:** Private message (whisper) dialog for player-to-player communication.

**Window name:** `WhisperDialog`
**Size:** 280 × 200
**Style:** movable, float

**Key widgets:**

| Name | Type | Description |
|---|---|---|
| `board` | thinboard | Outer frame |
| `name_slot` | image | Sender name bar background |
| `titlename` | text | Recipient name label (`WHISPER_NAME`) |
| `titlename_edit` | editline | Editable recipient name (limit `PLAYER_NAME_MAX_LEN`) |
| `gamemastermark` | expanded_image | GM mark icon (scaled 0.2×, shown for GM senders) |
| `ignorebutton` | toggle_button | Toggle ignore/ban on sender (`WHISPER_BAN`) |
| `reportviolentwhisperbutton` | button | Report sender for harassment (`WHISPER_REPORT`) |
| `acceptbutton` | button | Accept/OK (`OK`) |
| `minimizebutton` | button | Minimize dialog (tooltip: `MINIMIZE`) |
| `closebutton` | button | Close dialog (tooltip: `CLOSE`) |
| `scrollbar` | thin_scrollbar | Scroll message history |
| `editbar` | bar | Message composition area (semi-transparent black) |
| `chatline` | editline | Message input (limit 40, multi-line) |
| `sendbutton` | button | Send message (`WHISPER_SEND`) |

---

*Total files documented: 80*
