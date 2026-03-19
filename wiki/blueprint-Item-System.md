# Blueprint: Item System

> Full-stack architecture of the item system across all three repos — from `item_proto` SQL table through server dispatch to Python inventory UI. Use this when adding new item types, modifying attributes, or debugging item-related failures.

**Companion reference:** [topic-Item-System](topic-Item-System) · [guide-Database-Proto](guide-Database-Proto)

---

## 1. Full-Stack Architecture

### Layer 1 — Database / Proto

| File / Table | Key Fields | Role |
|-------------|-----------|------|
| `item_proto` SQL table | `vnum`, `type`, `subtype`, `wearflag`, `antiflag`, `applytype0-2`, `applyvalue0-2`, `value0-5`, `socket_pct` | Single source of truth for all static item properties |
| `server-src/src/common/tables.h` → `TItemTable` | All proto columns as C++ struct fields | In-memory representation broadcast from db → game on boot |
| `server-src/src/common/tables.h` → `TPlayerItem` | `id`, `vnum`, `count`, `pos`, `sockets[3]`, `attrs[7]` | Per-instance item data persisted to the `item` SQL table |
| `server-src/src/common/item_length.h` → `EItemMisc` | `ITEM_ATTRIBUTE_MAX_NUM=7`, `ITEM_SOCKET_MAX_NUM=3`, `ITEM_APPLY_MAX_NUM=3`, `ITEM_MAX_COUNT=200` | Hardcoded capacity limits |
| `server-src/src/common/item_length.h` → `EItemTypes` | `ITEM_NONE(0)` through `ITEM_BELT(34)` — 35 types | All valid item type values |
| `client-bin/assets/item_proto` | Binary packed version of item_proto | Client-side item data (must match server SQL exactly) |

### Layer 2 — Server Core (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `server-src/src/game/item.h/.cpp` | `CItem` | Runtime item instance: holds `TPlayerItem` data, equip state, owner pointer |
| `server-src/src/game/item_manager.h/.cpp` | `ITEM_MANAGER::CreateItem()`, `DestroyItem()`, `FindByVID()` | Item lifecycle management, proto lookup by vnum |
| `server-src/src/game/item_manager_read_tables.cpp` | `ITEM_MANAGER::ReadItemTable()` | Loads `TItemTable` vector from db boot packet |
| `server-src/src/game/char_item.cpp` | `CHARACTER::UseItemEx()` | Primary dispatch: switch on `item->GetType()` → routes to subsystem |
| `server-src/src/game/char_item.cpp` | `CHARACTER::PickupItem()` | Ground item → inventory transfer |
| `server-src/src/game/char_item.cpp` | `CHARACTER::MoveItem()` | Inventory cell → cell move, equip/unequip |
| `server-src/src/game/char_item.cpp` | `CHARACTER::DropItem()` | Inventory → ground |
| `server-src/src/game/item_attribute.cpp` | `CItem::AddAttribute()`, `CItem::ChangeAttribute()` | Random bonus attribute management |
| `server-src/src/game/item_addon.cpp` | addon application logic | Item addon bonus application |
| `server-src/src/game/blend_item.cpp` | blend item logic | ITEM_BLEND random-attribute item creation |

### Layer 3 — Network Layer

| Packet | Header (CG/GC) | Direction | Key Fields |
|--------|---------------|-----------|-----------|
| `CG::ITEM_USE` | `0x0501` | Client → Server | `TItemPos pos` (window+cell) |
| `CG::ITEM_DROP` | `0x0502` | Client → Server | `TItemPos pos`, `DWORD gold_per_item` |
| `CG::ITEM_MOVE` | `0x0504` | Client → Server | `TItemPos from`, `TItemPos to`, `BYTE count` |
| `CG::ITEM_PICKUP` | `0x0505` | Client → Server | `DWORD vid` (ground item VID) |
| `CG::ITEM_USE_TO_ITEM` | `0x0506` | Client → Server | `TItemPos from`, `TItemPos to` (e.g. stone → equipment) |
| `GC::ITEM_SET` | `0x0511` | Server → Client | Full `TPlayerItem` struct — creates/updates item in slot |
| `GC::ITEM_DEL` | `0x0510` | Server → Client | `TItemPos pos` — removes item from slot |
| `GC::ITEM_USE` | `0x0512` | Server → Client | `TItemPos pos` — confirms/broadcasts item use |
| `GC::ITEM_DROP` | `0x0513` | Server → Client | Drop confirmation with ground position |

### Layer 4 — Client Binary (C++)

| File | Class / Function | Role |
|------|-----------------|------|
| `client-src/src/GameLib/ItemManager.h/.cpp` | `CPythonItemManager` | Holds all `TItemTable` data; proto lookup by vnum |
| `client-src/src/GameLib/ItemData.h` | `CItemData` | Client-side item type/subtype/flag constants (must mirror server enums) |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvItemSetPacket()` | Processes `GC::ITEM_SET` → updates `CPythonPlayer` item cache |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `RecvItemDelPacket()` | Processes `GC::ITEM_DEL` → clears item slot |
| `client-src/src/UserInterface/PythonNetworkStreamPhaseGame.cpp` | `SendItemUsePacket()` | Serializes `CG::ITEM_USE` from Python call |
| `client-src/src/UserInterface/PythonPlayer.h/.cpp` | `CPythonPlayer` | In-memory item grid: `m_aItem[INVENTORY_MAX_NUM]` |
| `client-src/src/UserInterface/PythonItemModule.cpp` | `item_*` functions | Python `item` module — exposes proto data to Python |

### Layer 5 — Client Interface (Python)

| File | Class / Widget | Role |
|------|---------------|------|
| `client-bin/assets/root/uiinventory.py` | `InventoryWindow` | Main inventory window; handles right-click → `UseItem()`, drag-drop → `MoveItem()` |
| `client-bin/assets/root/uitooltip.py` | `ItemToolTip` | Renders item stat tooltip on hover; reads proto via `item` module |
| `client-bin/assets/root/interfacemodule.py` | `Interface` | Opens/closes inventory; routes `OnRecvItemSet()` callbacks |
| `client-bin/assets/root/uicommon.py` | `GetItemIcon()` | Loads `.sub` icon file for a given item vnum |
| `client-bin/assets/uiscript/inventorywindow.py` | layout dict | Inventory grid layout: slot positions and sizes |

---

## 2. Causal Chain

### Action: Player right-clicks an item (e.g. a potion)

```
[Trigger]  Player right-clicks item slot in InventoryWindow
    │
    ▼  client-bin/root/uiinventory.py : InventoryWindow.__OnMouseLeftButtonDown → UseItem(slotIndex)
[1] Python calls net.SendItemUsePacket(window=INVENTORY, slotIndex)
    │
    ▼  client-src/UserInterface/PythonNetworkStreamPhaseGame.cpp : SendItemUsePacket()
[2] C++ builds TPacketCGItemUse{header=CG::ITEM_USE, pos={INVENTORY, slotIndex}}
    sends over encrypted TCP
    │
    ▼  packet: CG::ITEM_USE (0x0501)
[3] Server input dispatcher receives packet
    │
    ▼  server-src/game/input_main.cpp : CInputMain::ItemUse()
[4] ch = desc->GetCharacter(); item = ch->GetItem(pos)
    │
    ▼  server-src/game/char_item.cpp : CHARACTER::UseItemEx(item, destCell)
[5] switch(item->GetType()):
      case ITEM_USE:  → switch(item->GetSubType())
        case USE_POTION: → PointChange(POINT_HP, +value0)
        case USE_AFFECT: → AddAffect(type, apply, value, duration)
      case ITEM_WEAPON / ITEM_ARMOR: → EquipItem(item)
      case ITEM_QUEST: → CQuestManager::UseItem()
      (etc. — 20+ cases)
    │
    ▼  packet: GC::CHAR_UPDATE (broadcast) + GC::ITEM_DEL if consumed
[6] Client receives GC::CHAR_UPDATE
    │
    ▼  client-src/UserInterface/PythonNetworkStreamPhaseGame.cpp : RecvCharacterUpdatePacket()
[7] Updates CPythonPlayer point cache → Python OnRecvPointChange()
    │
    ▼  client-bin/root/uitaskbar.py : UpdateHP() / uicharacter.py : Refresh()
[End] HP bar updates on screen; item slot cleared if consumed
```

### Action: Item equip (weapon/armor drag to equipment slot)

```
[Trigger]  Player drags item to equipment slot
    │
    ▼  uiinventory.py : InventoryWindow.OverInItem → MoveItem(from, to)
[1] net.SendItemMovePacket(fromPos, toPos)
    │
    ▼  packet: CG::ITEM_MOVE (0x0504)
[2] server: CInputMain::ItemMove → ch->MoveItem(from, to)
    │
    ▼  char_item.cpp : CHARACTER::MoveItem → EquipItem() if destPos is WEAR slot
[3] EquipItem: runs CheckEquipLimits, applies item's applytype/applyvalue via PointChange
    │
    ▼  GC::ITEM_SET (updates equipment slot) + GC::ITEM_DEL (removes from inventory)
[End] Equipment slot shows item; stats updated
```

---

## 3. Dependency Matrix

### Sync Points — Must Be Identical on Both Sides

| What must match | Server file | Client file | If out of sync |
|----------------|-------------|-------------|----------------|
| `TPlayerItem` struct layout (TItemPos, sockets[], attrs[]) | `common/tables.h` | `UserInterface/Packet.h` or mirrored struct | Client reads wrong bytes in `GC::ITEM_SET` → garbage slots or crash |
| `EItemTypes` enum values (0–34) | `common/item_length.h` | `GameLib/ItemData.h` | Wrong item type displayed; tooltip broken |
| `EItemAntiFlag` bit values | `common/item_length.h` | `GameLib/ItemData.h` | Anti-restriction checks wrong; warrior can use shaman-only item |
| `EItemWearableFlag` bit values | `common/item_length.h` | `GameLib/ItemData.h` | Wrong equipment slots available in UI |
| `TItemPos` struct (window_type + cell) | `common/length.h` | `UserInterface/Packet.h` | Move/use packets point to wrong slot |
| `item_proto` binary file (client) ↔ SQL table (server) | MariaDB `item_proto` | `client-bin/assets/item_proto` | Item names/icons wrong; CRC kick on login |
| `ITEM_ATTRIBUTE_MAX_NUM = 7` | `common/item_length.h` | `GameLib/ItemData.h` | Over-run on 8th attribute → buffer overflow or silent data loss |

### Hardcoded Limits

| Constant | Value | Defined in | What breaks if exceeded |
|----------|-------|-----------|------------------------|
| `ITEM_ATTRIBUTE_MAX_NUM` | 7 | `server-src/src/common/item_length.h` | 8th attribute written server-side overflows `TPlayerItem.attrs[]`; client shows garbage in last slot |
| `ITEM_SOCKET_MAX_NUM` | 3 | `server-src/src/common/item_length.h` | 4th socket ignored or corrupts `TPlayerItem.sockets[]` |
| `ITEM_APPLY_MAX_NUM` | 3 | `server-src/src/common/item_length.h` | Proto apply slots 4+ silently ignored |
| `ITEM_VALUES_MAX_NUM` | 6 | `server-src/src/common/item_length.h` | Proto value6+ out of bounds in `TItemTable.values[]` |
| `ITEM_MAX_COUNT` | 200 | `server-src/src/common/item_length.h` | Stack size > 200 truncated to 200 on server; client may show > 200 temporarily |
| `EItemTypes` max | 34 (`ITEM_BELT`) | `server-src/src/common/item_length.h` | New type needs new enum entry + UseItemEx case; missing case = item silently does nothing |
| `INVENTORY_MAX_NUM` | 90 | `server-src/src/common/length.h` | Slot 91+ never accessible; items placed there are permanently lost |
| `ITEM_ELK_VNUM` | 50026 | `server-src/src/common/item_length.h` | Gold item vnum hardcoded — do not reuse |

---

## 4. Extension How-To

### How to Add a New Item Type

1. **`server-src/src/common/item_length.h`** — add constant to `EItemTypes`:
   ```cpp
   ITEM_MY_NEW_TYPE,   // 35 — always add at the end before closing brace
   ```

2. **`server-src/src/game/char_item.cpp`** — add case to `CHARACTER::UseItemEx()` switch:
   ```cpp
   case ITEM_MY_NEW_TYPE:
       MyNewTypeHandler(ch, item);
       break;
   ```

3. **`client-src/src/GameLib/ItemData.h`** — mirror the new constant (must match numeric value exactly):
   ```cpp
   ITEM_MY_NEW_TYPE = 35,
   ```

4. **`client-bin/assets/root/uitooltip.py`** — add display name / tooltip handling for the new type.

5. **`item_proto` SQL** — add rows with `type = 35`.

6. **Rebuild and re-export client `item_proto` binary** — see [guide-Database-Proto](guide-Database-Proto).

> ⚠️ **Warning:** `EItemTypes` values are stored in the database. Changing existing values will corrupt all existing items of that type.

### How to Add an 8th Item Attribute Slot

> This is a structural change that affects the DB schema, wire protocol, and client simultaneously. Not recommended unless necessary.

1. **`server-src/src/common/item_length.h`** — change `ITEM_ATTRIBUTE_MAX_NUM` from 7 to 8.
2. **`server-src/src/common/tables.h`** — verify `TPlayerItem.attrs[ITEM_ATTRIBUTE_MAX_NUM]` array size auto-updates.
3. **Client** — update mirrored array size in client's packet struct.
4. **DB schema** — add `attr_type7` / `attr_value7` columns to the `item` table. Run migration.
5. **Rebuild both client and server** — wire protocol has changed; old clients will desync.

### How to Add a New ITEM_FLAG Bit

1. **`server-src/src/common/item_length.h`** — add to `EItemFlag`:
   ```cpp
   ITEM_FLAG_MY_FLAG = (1 << 15),   // pick the next free bit
   ```
2. **Server C++** — check the flag wherever needed: `item->IsFlag(ITEM_FLAG_MY_FLAG)`.
3. **Client** — mirror the constant in `GameLib/ItemData.h`.
4. **`item_proto` SQL** — set the `flag` column bit for items that should have it.

### How to Add a New ANTI_FLAG Restriction

1. **`server-src/src/common/item_length.h`** — add to `EItemAntiFlag`:
   ```cpp
   ITEM_ANTIFLAG_MY_RESTRICTION = (1 << 18),  // next free bit after bit 17
   ```
2. **Server C++** — add check in `CHARACTER::EquipItem()` or wherever the restriction applies.
3. **Client** — mirror in `GameLib/ItemData.h`; add tooltip warning in `uitooltip.py`.
4. **`item_proto` SQL** — set the `antiflag` column bit.

> ⚠️ **Warning:** `antiflag` is stored as a 32-bit integer. Maximum 32 distinct anti-flags. Currently 18 bits used (bits 0–17).

### Controlling Constants

| Enum / Define | File | Controls |
|--------------|------|---------|
| `EItemTypes` | `common/item_length.h` | All item type IDs (0–34) |
| `EWeaponSubTypes` | `common/item_length.h` | Weapon subtypes (sword, dagger, bow, etc.) |
| `EArmorSubTypes` | `common/item_length.h` | Armor subtypes (body, head, shield, etc.) |
| `EUseSubTypes` | `common/item_length.h` | Use-item subtypes (potion, affect, recipe, etc.) |
| `EItemFlag` | `common/item_length.h` | Item behavior flags (stackable, refineable, etc.) |
| `EItemAntiFlag` | `common/item_length.h` | Restriction bits (no female, no sell, etc.) |
| `EItemWearableFlag` | `common/item_length.h` | Which equipment slot each item can occupy |
| `ELimitTypes` | `common/item_length.h` | Limit types (level, stat, real-time expiry) |
| `EItemMisc` | `common/item_length.h` | Capacity constants (attr max, socket max, etc.) |
| `REFINE_MATERIAL_MAX_NUM` | `common/item_length.h` | Max refine materials per recipe (5) |

---

## 5. Debug Anchors

| Symptom | Likely Cause | Where to Look |
|---------|-------------|---------------|
| Item right-click does nothing | `UseItemEx()` switch has no case for item's `type` | `server-src/src/game/char_item.cpp : CHARACTER::UseItemEx()` — check the switch |
| Wrong icon / name shown for item | Client `item_proto` binary out of sync with server SQL | Re-export and repack `item_proto`; see [guide-Database-Proto](guide-Database-Proto) |
| Player kicked immediately after login | CRC mismatch — client `item_proto` differs from server | Compare client `item_proto` binary with server SQL; rebuild client binary |
| Item disappears on use but no effect | `UseItemEx()` case calls `RemoveItem()` before applying effect, or falls through to no-op | `char_item.cpp : CHARACTER::UseItemEx()` — trace the specific item type case |
| 8th attribute slot shows garbage | `ITEM_ATTRIBUTE_MAX_NUM` not raised on client side | `client-src/src/GameLib/ItemData.h` — check `ITEM_ATTRIBUTE_MAX_NUM` matches server |
| Equip fails silently | `CheckEquipLimits()` returns false (level too low, wrong job, antiflag) | `server-src/src/game/char_item.cpp : CHARACTER::EquipItem()` — trace limit check |
| `syserr: UseItem: unknown type N` | New item type added to proto but no case in UseItemEx switch | `char_item.cpp` — add case; also check client logs for matching error |
| Stack count > 200 resets to 200 | `ITEM_MAX_COUNT = 200` limit enforced on pickup/receive | `common/item_length.h` — raise if needed (affects all items) |
| Item socket shows wrong value | `ITEM_SOCKET_UNIQUE_SAVE_TIME` / `UNIQUE_REMAIN_TIME` are `socket_max - 2/1` — last 2 sockets reserved for unique timers | `common/item_length.h EItemUniqueSockets` — do not use last 2 sockets for custom data on ITEM_UNIQUE |
| Proto not loading after restart | `db` process could not parse `item_proto.txt` — whitespace/tab issue | Check `db` syserr log; verify `item_proto.txt` uses tab-separated format |

---

## Related

| Resource | Link |
|----------|------|
| Reference page | [topic-Item-System](topic-Item-System) |
| Proto workflow | [guide-Database-Proto](guide-Database-Proto) |
| Upgrade calculator | [Upgrade/Refine Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/upgrade.html) |
| Flag calculator | [Flag Bitmask Calculator](https://m2tecdev.github.io/Metin2_Rework_v3/calculators/flags.html) |
