# client-bin root — Data Files

> Static data tables, pack build scripts, and character race-data scripts shipped alongside the Python layer in `root/`.

## Overview

Four text data files and a directory of eight `.msm` race-data scripts sit in the `root/` directory. `atlasinfo.txt` maps world map names to coordinates and sizes for the atlas window. `grpblk.txt` lists graphics driver crasher signatures that the engine uses to block known-faulty driver versions. `npclist.txt` provides a mapping from NPC/monster variant names to their base model folder names, read at startup. `makepackscript_onlyrootnopython.txt` is a `PackMaker.exe` configuration script describing which file types to pack, which files to exclude, and which lists to apply security/compression to. The `msm/` subdirectory contains one `.msm` (Motion Scene Model) file per playable race, describing the base character model, all hair variants, and all shape (armour texture) variants.

---

## File: atlasinfo.txt

**Purpose:** Defines the position and extent of every in-game map region within the global world coordinate system. Read by the client to populate the atlas overview window and the minimap zone label dictionary.

### Format

Each non-empty line contains five whitespace-separated fields:

```
<MapName>  <GlobalX>  <GlobalY>  <WidthInTiles>  <HeightInTiles>
```

| Field | Type | Description |
|-------|------|-------------|
| `MapName` | string | Map folder name, optionally prefixed with a season path (`season1/`, `season2/`) |
| `GlobalX` | int | World X coordinate of the map's top-left corner, in game units (multiples of 25600) |
| `GlobalY` | int | World Y coordinate of the map's top-left corner |
| `WidthInTiles` | int | Map width in 128×128 tile blocks |
| `HeightInTiles` | int | Map height in 128×128 tile blocks |

### Notable Entries

| Map Name | GlobalX | GlobalY | W | H | Description |
|----------|---------|---------|---|---|-------------|
| `map_a2` | 256000 | 665600 | 6 | 6 | Empire A mid-level field |
| `map_b2` | 102400 | 51200 | 6 | 6 | Empire B mid-level field |
| `map_c2` | 665600 | 281600 | 6 | 6 | Empire C mid-level field |
| `metin2_map_deviltower1` | 204800 | 665600 | 3 | 3 | Devil Tower dungeon |
| `metin2_map_devilsCatacomb` | 307200 | 1203200 | 8 | 8 | Devil's Catacomb (large) |
| `Metin2_map_CapeDragonHead` | 1024000 | 1664000 | 6 | 6 | Cape Dragon Head |
| `metin2_map_Mt_Thunder` | 1126400 | 1510400 | 4 | 6 | Mt. Thunder |
| `season1/metin2_map_WL_01` | 1049600 | 716800 | 6 | 6 | Season 1 outer field |
| `season2/metin2_map_skipia_dungeon_01` | 0 | 1203200 | 6 | 6 | Skipia Dungeon |
| `metin2_map_guild_01/02/03` | various | various | 2 | 2 | Guild territory maps |

The file contains 110 entries covering the base game, Season 1, and Season 2 content.

---

## File: grpblk.txt

**Purpose:** Enumerates graphics driver DLL names and buggy version/entry-point fingerprints that are known to cause the engine to crash. The C++ engine reads this file at startup and refuses to initialise Direct3D if the installed driver matches any listed entry.

### Format

Each line contains two or three whitespace-separated fields:

```
<DllName>  <MajorVersion.MinorVersion>  [<EntryPointOffset>]
```

- The separator between version and entry-point is either a space or a period.
- Lines ending with only two fields omit the entry-point.

### Listed Drivers

| DLL | Version | Entry Point | Description |
|-----|---------|-------------|-------------|
| `nv4_disp.dll` | `0006000e` | multiple offsets | Buggy nVidia display driver (GeForce era) — 12 entries |
| `NVDD32.DLL` | `0004000d` | `00010b7e` | Older nVidia VxD driver |
| `ialmdd.dll` | `0004000d` | `000a0db6`, `00010cc0` | Intel integrated graphics driver (i810 era) |

---

## File: npclist.txt

**Purpose:** Maps internal NPC/mob variant names to their shared base model directory name. Read by `chrmgr` at startup to resolve character model paths without requiring a separate entry per skin variant.

### Format

Each line has three tab-separated fields:

```
<Reserved>  <VariantName>  <BaseModelName>
```

| Field | Type | Description |
|-------|------|-------------|
| `Reserved` | int (always `0`) | Unused / reserved field |
| `VariantName` | string | The unique name used internally to refer to this skin variant |
| `BaseModelName` | string | The shared model folder name under which the `.msm` and geometry are stored |

### Entry Categories

| Category | Example Variants | Base Model |
|----------|-----------------|------------|
| Mounts (horses) | `pony_normal`, `horse_normal`, `horse2_master` | `pony`, `horse`, `horse2` |
| Pets | `boar`, `dog_god`, `fire_tiger` (multiple colour variants), `lion` | same as variant prefix |
| Seasonal mounts | `reindeer_male1/2/3`, `reindeer_female1/2/3`, `reindeer_young1` | `reindeer_male`, `reindeer_female`, `reindeer_young` |
| Buildings/objects | `goods_02`, `bank_02`, `christmas_tree_01/02` | `goods`, `bank`, `christmas_tree` |
| Minerals/resources | `diamond`, `amber`, `gold`, `pearl`, `mineral2_sapphire`, etc. | `mineral`, `mineral2` |
| Metin stones | `metinstone_01`–`metinstone_09` | `metinstone` |
| Metin stones (variant) | `metinstone_10`–`metinstone_15` | `metinstone_02` |
| Monsters | `wolf_gray`, `wolf_blue`, `bear_gray`, `tiger_big`, etc. | `wolf`, `bear`, `tiger` |

---

## File: makepackscript_onlyrootnopython.txt

**Purpose:** `PackMaker.exe` input script that describes how to pack the `root/` directory contents into `.epk` archive files. This variant deliberately excludes all `.py` Python source files (they are packed separately after Cythonization or omitted entirely from release builds).

### Script Structure

The script uses a brace-delimited block format.

#### `FolderName`

```
FolderName "pack"
```

Output pack folder name.

#### `List ExcludedFolderNameList`

Directories to skip entirely: `CVS`.

#### `List ExcludedFileNameList`

Individual filenames to omit from packing:

| Category | Files |
|----------|-------|
| Log/debug | `syserr.txt`, `log.txt`, `errorlog.txt` |
| Development Python | `Test.py`, `Prototype[OffLine].py`, `loginInfo.py`, `error_lookup.py`, `uitest.py`, `quest_test.py`, `build_mottable.py` |
| Other pack scripts | `makepackscript.txt`, `makepackscript_onlyroot.txt`, `moviemakepackscript.txt`, `packall.txt`, `packitem.txt`, `packpc.txt`, `packroot.txt`, `test.txt`, `test2.txt` |
| Sound | `soundscript.txt` |

#### `List SecurityExtNameList`

File extensions that are encrypted before packing: `txt`, `msk`, `msa`, `msm`, `py`.

#### `List CompressExtNameList`

File extensions that are compressed in the pack: `txt`, `msk`, `mss`, `mse`, `msf`, `msa`, `spt`, `atr`, `dds`, `raw`, `wtr`, `mde`, `tga`.

#### `Group RootPackItemList`

Declares fixed-path file groups included directly in the root pack:

| Group | Pattern | Description |
|-------|---------|-------------|
| `ItemProto` | `*item_proto` | Item prototype binary |
| `mob_proto` | `*mob_proto` | Mob prototype binary |
| `TextureSet` | `TextureSet/*.txt` | Terrain texture set descriptors |
| `TextFiles` | `*.txt` | All root text files |
| `TextFiles` | `*.tbl` | All `.tbl` table files |
| `KoreanFiles` | `*.cvt` | Korean character conversion tables |
| `ModelFiles` | `*.msm` | Race data scripts |

#### `Group PackList`

Additional sub-packs to build:

| Group | Pattern | Description |
|-------|---------|-------------|
| `UIScript` | `UIScript/*` | All UIScript layout files |

---

## Directory: msm/

**Purpose:** Contains one `.msm` (Motion Scene Model / Race Data Script) file per playable character race. Each file is a text-format C-style block script read by `chrmgr.LoadLocalRaceData()` in `playersettingmodule.__InitData()`. It defines the base 3-D model path, all available hair styles with their skin recolor mappings, and all armour shape variants with their skin recolor mappings.

### Files

| File | Race | Base Model Path |
|------|------|----------------|
| `warrior_m.msm` | `RACE_WARRIOR_M` (0) | `d:/ymir work/pc/warrior/warrior_novice.GR2` |
| `warrior_w.msm` | `RACE_WARRIOR_W` (4) | `d:/ymir work/pc2/warrior/warrior_novice.GR2` |
| `assassin_w.msm` | `RACE_ASSASSIN_W` (1) | `d:/ymir work/pc/assassin/` |
| `assassin_m.msm` | `RACE_ASSASSIN_M` (5) | `d:/ymir work/pc2/assassin/` |
| `sura_m.msm` | `RACE_SURA_M` (2) | `d:/ymir work/pc/sura/` |
| `sura_w.msm` | `RACE_SURA_W` (6) | `d:/ymir work/pc2/sura/` |
| `shaman_w.msm` | `RACE_SHAMAN_W` (3) | `d:/ymir work/pc/shaman/` |
| `shaman_m.msm` | `RACE_SHAMAN_M` (7) | `d:/ymir work/pc2/shaman/` |

### MSM Script Format

#### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `ScriptType` | string | Always `RaceDataScript` |
| `BaseModelFileName` | string | Path to the default `.GR2` geometry file |

#### `Group HairData` Block

Defines all hair styles available for the race.

| Field | Type | Description |
|-------|------|-------------|
| `PathName` | string | Base directory for hair assets |
| `HairDataCount` | int | Total number of `HairData*` sub-groups |

Each `Group HairData##` sub-block:

| Field | Type | Description |
|-------|------|-------------|
| `HairIndex` | int | Numeric hair style ID (0–5 = dyeable base styles; 1001+ = fixed-colour premium styles) |
| `Model` | string | Relative path to the hair `.gr2` geometry file |
| `SourceSkin` | string | Default skin `.dds` for the hair model |
| `TargetSkin` | string | Skin to apply when this hair index is selected (enables recolor via texture swap) |

`warrior_m.msm` defines 61 hair entries: indices 0–5 are the base styles with empire-colour target skins (`warrior_hair_01_white/gold/red/brown/black.dds`); indices 1001–5065 are premium cosmetic hairs that use their own DDS directly as both source and target.

#### `Group ShapeData` Block

Defines all armour shape/skin variants for the race.

| Field | Type | Description |
|-------|------|-------------|
| `PathName` | string | Base directory for shape assets |
| `ShapeDataCount` | int | Total number of `ShapeData*` sub-groups |

Each `Group ShapeData##` sub-block:

| Field | Type | Description |
|-------|------|-------------|
| `ShapeIndex` | int | Numeric shape ID, corresponding to armour VNUM ranges |
| `Model` | string | Relative `.gr2` path for this armour shape |
| `SourceSkin` | string | Default skin DDS texture |
| `TargetSkin` | string | Skin to apply for this shape index (enables armour recolor) |

`warrior_m.msm` defines 146 shape entries covering novice armour, named set armours, and all item-shop cosmetic sets.
