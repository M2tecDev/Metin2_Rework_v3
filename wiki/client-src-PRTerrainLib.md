# PRTerrainLib

> Terrain rendering and height-map library providing cell-based terrain data, splatting texture sets, water maps, and shadow maps.

## Overview

PRTerrainLib implements the low-level terrain data model. It stores height maps, tile/attribute maps, water height data, and splatting alpha textures for a fixed-size terrain patch grid. The library is responsible for loading terrain files from disk, building splatting texture atlases, and providing height and shadow queries to the rest of the engine. The higher-level outdoor map (`GameLib::CMapOutdoor`) uses this library for terrain rendering.

## Dependencies

- `EterBase` — file I/O, utilities
- `EterLib` — `CGraphicBase`, D3D texture types
- DirectX 9 — splatting alpha textures and shadow map textures

## Files

| File | Purpose |
|------|---------|
| `Terrain.h/.cpp` | `CTerrainImpl`: core terrain data: height map, tile map, attribute map, water map, normal map, shadow map |
| `TextureSet.h/.cpp` | `CTextureSet`: manages the set of splatting textures used by a terrain cell |
| `TerrainType.h` | Constant and type definitions: `TERRAIN_SIZE`, `TERRAIN_PATCHSIZE`, `TERRAIN_PATCHCOUNT`, `TTerrainSplatPatch` |

## Constants (`TerrainType.h`)

| Constant | Value | Description |
|----------|-------|-------------|
| `TERRAIN_SIZE` | 128 | Grid cells per terrain patch side |
| `TERRAIN_PATCHSIZE` | 4 | Cells per patch (for LOD subdivision) |
| `TERRAIN_PATCHCOUNT` | 32 | Patches per terrain side |
| `CELLSCALE` | 200 | World units per cell (2 m) |
| `TERRAIN_XSIZE/YSIZE` | 25600 | Total world units per terrain |

## Classes

### `CTerrainImpl`
**File:** `Terrain.h`
**Purpose:** Holds all raw terrain data arrays for one terrain cell. Provides loading methods for height, tile, attribute, water, and shadow maps, and exposes height/shadow queries.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_awRawHeightMap` | `WORD[...]` | Raw height values including a 1-cell border |
| `m_abyTileMap` | `BYTE[...]` | Tile type for each cell (raw with border) |
| `m_abyAttrMap` | `BYTE[...]` | Attribute flags per cell (`BLOCK`, `WATER`, `BANPK`) |
| `m_abyWaterMap` | `BYTE[...]` | Water index per cell (0 = no water) |
| `m_acNormalMap` | `CHAR[...]` | Per-vertex surface normals |
| `m_awShadowMap` | `WORD[...]` | 16-bit shadow values per cell |
| `m_lpShadowTexture` | `LPDIRECT3DTEXTURE9` | D3D shadow map texture |
| `m_lpAlphaTexture[]` | `LPDIRECT3DTEXTURE9[]` | Splatting alpha textures per layer |
| `m_TerrainSplatPatch` | `TTerrainSplatPatch` | Splatting texture assignment data |
| `m_lWaterHeight[]` | `long[]` | Height of each water layer |
| `m_fHeightScale` | `float` | Scaling factor applied to raw height values |

#### Attribute Flags
| Flag | Meaning |
|------|---------|
| `ATTRIBUTE_BLOCK` | Cell blocks movement |
| `ATTRIBUTE_WATER` | Cell is water |
| `ATTRIBUTE_BANPK` | PK banned in this cell |

#### Methods
| Method | Description |
|--------|-------------|
| `LoadHeightMap(filename)` | Loads raw height data from file |
| `RAW_LoadTileMap(filename)` | Loads the tile map from file |
| `LoadAttrMap(filename)` | Loads the attribute map |
| `LoadWaterMap(filename)` | Loads the water index map |
| `LoadTextures()` | Loads and builds the splatting alpha textures |
| `GetHeightMapValue(sx, sy)` | Returns the raw height value at cell (sx, sy) |
| `GetShadowMapColor(fx, fy)` | Returns interpolated shadow color at world position |
| `SetTextureSet(pTexSet)` | Sets the shared texture set (static) |

---

### `CTextureSet`
**File:** `TextureSet.h`
**Purpose:** Manages the list of textures used for splatting on a terrain cell. Each terrain cell references a `CTextureSet` that maps texture indices to loaded `TTerrainTexture` entries.

#### Methods
| Method | Description |
|--------|-------------|
| `GetTextureCount()` | Returns the number of textures in the set |
| `GetTexture(index)` | Returns the `TTerrainTexture` at the given index |
