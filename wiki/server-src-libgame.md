# server-src-libgame

> Shared game utility library providing map attribute storage, inventory grid layout, and TGA image loading used by the game process and the db process.

## Overview

`libgame` is a small static library containing utilities that are shared between the `game` and `db` binaries but that do not belong in the header-only `common/` directory because they require compiled object code. It provides map-walkability attribute management (`CAttribute`), a 2-D inventory grid helper (`CGrid`), and a TGA (Truevision) image reader (`targa`).

## Dependencies

- `common/` headers.
- C standard library.

## Files

| File | Purpose |
|------|---------|
| `attribute.h` / `attribute.cpp` | `CAttribute` — compact 2-D attribute map with DWORD/WORD/BYTE backends |
| `grid.h` / `grid.cpp` | `CGrid` — fixed-size 2-D occupancy grid for item placement |
| `targa.h` / `targa.cpp` | TGA image file loader (used for guild-mark images) |

## Classes / Functions

### `CAttribute` (`attribute.h`)

**Purpose:** Stores per-cell attribute bitmasks for a 2-D map region. Automatically selects the smallest integer data type (BYTE, WORD, or DWORD) that can represent the attribute values, saving memory for large map regions.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `dataType` | `int` | Selected data type: `D_BYTE`, `D_WORD`, or `D_DWORD` |
| `defaultAttr` | `DWORD` | Default attribute value used when no attribute is set |
| `width` | `DWORD` | Width of the attribute grid in cells |
| `height` | `DWORD` | Height of the attribute grid in cells |
| `data` | `void*` | Pointer to the flat attribute array |
| `bytePtr` | `BYTE**` | Row-pointer array when `dataType == D_BYTE` |
| `wordPtr` | `WORD**` | Row-pointer array when `dataType == D_WORD` |
| `dwordPtr` | `DWORD**` | Row-pointer array when `dataType == D_DWORD` |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `CAttribute` | `DWORD width, DWORD height` | — | Allocates a zero-filled DWORD attribute map |
| `CAttribute` | `DWORD* attr, DWORD width, DWORD height` | — | Reads an existing attribute array and selects the smallest data type that fits all values |
| `Alloc` | — | `void` | Allocates the internal data and row-pointer arrays |
| `GetDataType` | — | `int` | Returns `D_BYTE`, `D_WORD`, or `D_DWORD` |
| `GetDataPtr` | — | `void*` | Returns the raw data pointer (cast to appropriate type before use) |
| `Set` | `DWORD x, DWORD y, DWORD attr` | `void` | Sets (ORs) attribute flags at cell `(x, y)` |
| `Remove` | `DWORD x, DWORD y, DWORD attr` | `void` | Clears (ANDs ~attr) attribute flags at cell `(x, y)` |
| `Get` | `DWORD x, DWORD y` | `DWORD` | Returns the attribute bitmask at cell `(x, y)` |
| `CopyRow` | `DWORD y, DWORD* row` | `void` | Copies an entire attribute row into the caller's buffer (always as DWORD) |

#### Data Type Enum (`attribute.h`)

| Constant | Value | Description |
|----------|-------|-------------|
| `D_DWORD` | 0 | 32-bit attributes (default) |
| `D_WORD` | 1 | 16-bit attributes (when all values fit in 16 bits) |
| `D_BYTE` | 2 | 8-bit attributes (when all values fit in 8 bits) |

---

### `CGrid` (`grid.h`)

**Purpose:** Manages a 2-D rectangular occupancy grid. Used to track which cells in an inventory are occupied by items of varying sizes (an item can occupy multiple cells). Also used by `db` for item placement queries.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_iWidth` | `int` | Grid width in cells |
| `m_iHeight` | `int` | Grid height in cells |
| `m_pGrid` | `char*` | Flat array; non-zero means occupied |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `CGrid` | `int w, int h` | — | Allocates an empty grid of `w × h` cells |
| `CGrid` | `CGrid* pkGrid, int w, int h` | — | Copies an existing grid and resizes to `w × h` |
| `Clear` | — | `void` | Marks all cells as empty |
| `FindBlank` | `int w, int h` | `int` | Finds the first cell position where a `w × h` item fits; returns -1 if none |
| `IsEmpty` | `int iPos, int w, int h` | `bool` | Returns true if all cells covered by a `w × h` item starting at `iPos` are free |
| `Put` | `int iPos, int w, int h` | `bool` | Marks a `w × h` region starting at `iPos` as occupied; returns false if already occupied |
| `Get` | `int iPos, int w, int h` | `void` | Marks a `w × h` region starting at `iPos` as free |
| `Print` | — | `void` | Debug: prints the grid to stdout |
| `GetSize` | — | `unsigned int` | Returns `m_iWidth * m_iHeight` |

---

### TGA Loader (`targa.h` / `targa.cpp`)

**Purpose:** Loads Truevision TGA image files used for guild-mark images. Exposes raw pixel data for server-side processing (e.g., CRC checking and serving to clients).

The `targa.h` header declares a single load function (details depend on the internal implementation) that reads an uncompressed or run-length encoded TGA file and returns image metadata (width, height, bits-per-pixel) together with a pixel data buffer.
