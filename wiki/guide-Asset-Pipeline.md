# Guide: Asset Pipeline

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [Why Python for the UI?](concept-python-ui)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> How to add, place, pack, and reference game assets (textures, models, icons, effects) in Metin2 Rework v3.

## Prerequisites

- Basic familiarity with the client directory layout (`client-bin/` and `.pck` files)
- A texture tool capable of producing DDS (e.g. NVIDIA Texture Tools, Intel Texture Works) or TGA files
- Granny2-compatible export pipeline for `.gr2` models (RAD Game Tools GR2 exporter or equivalent)
- Reference pages: [client-src-PackLib](client-src-PackLib), [client-src-EffectLib](client-src-EffectLib), [client-src-EterGrnLib](client-src-EterGrnLib), [client-src-EterImageLib](client-src-EterImageLib), [client-src-EterLib](client-src-EterLib)

## Overview

All client assets flow through a virtual file system (VFS) backed by the EterPack system. At runtime `CPackManager` maps every filename to an entry inside one of the loaded `.pck` archives. When `SetFileLoadMode` is active (development mode) the manager bypasses packs and reads files directly from disk — the fastest iteration loop. Shipping builds use `SetPackLoadMode` and read exclusively from the encrypted, compressed `.pck` files.

The pipeline end-to-end:

```
Raw source file
  -> place loose in client-bin/ (dev) OR repack into .pck (ship)
    -> CPackManager resolves filename
      -> CResourceManager creates typed resource
        -> Rendered by EterLib / EterGrnLib / EffectLib
```

---

## 1. VFS / Pack System

### How EterPack Works

Each `.pck` file is a custom archive. Its on-disk layout (from [client-src-PackLib](client-src-PackLib)):

```
TPackFileHeader
  entry_num    — number of file entries
  data_begin   — byte offset to compressed/encrypted data section
  nonce[24]    — XChaCha20 nonce for the header

TPackFileEntry (repeated entry_num times)
  file_name[FILENAME_MAX+1]
  offset, file_size, compressed_size
  encryption flag + nonce[24]
```

The pack key is a 32-byte constant (`PACK_KEY`) defined in `PackLib/config.h`. Each file entry may be independently encrypted with its own per-file nonce and optionally LZO-compressed.

At startup the client calls `CPackManager::AddPack(path)` for every `.pck` file. This builds a flat `unordered_map<filename, (CPack*, TPackFileEntry)>`. Later, any subsystem that requests a file path is transparently served from this map.

### Priority Order

- **Later-added packs win.** `AddPack` inserts entries into the flat map; if the same filename appears in two packs the last one registered wins.
- **Loose files override packs in file mode.** During development (`SetFileLoadMode`), the manager reads from disk directly and packs are ignored entirely. Dropping a loose file into `client-bin/` under the correct relative path is sufficient for testing without repacking.

---

## 2. Where to Place Assets

All paths are relative, normalized (forward slashes, lower-case). Convention used by Rework v3:

| Asset type | Loose path (dev / file mode) | Typical pack |
|------------|------------------------------|--------------|
| `.dds` textures | `textures/<category>/filename.dds` | `textures.pck` |
| `.gr2` Granny3D models | `character/<race>/filename.gr2` | `character.pck` |
| `.tga` icon atlases | `icon/item/filename.tga` | `icon.pck` |
| `.sub` icon sub-rects | `icon/item/filename.sub` | `icon.pck` |
| `.mse` effect scripts | `effect/<category>/filename.mse` | `effect.pck` |
| Effect textures | `effect/<category>/filename.dds` | `effect.pck` |

> **Important:** All paths are looked up in lower-case. Mixed-case filenames can hide path mismatches that will break on case-sensitive systems.

---

## 3. How .mse Effect Files Work

An `.mse` (Metin Script Effect) file is a text-based hierarchical script parsed by `CTextFileLoader`. It is the source definition for a `CEffectData` object.

### File Format Overview

```
ParticleSystem
{
    texture "effect/fire/flame.dds"
    particle_count 50
    ...
}
MeshEffect
{
    mesh "effect/fire/flame_mesh.gr2"
    ...
}
SimpleLightData
{
    color 1.0 0.5 0.0
    ...
}
```

Each top-level block maps to one `CEffectElementBase` subclass:

| Block keyword | Class loaded |
|---------------|-------------|
| `ParticleSystem` | `CParticleSystemData` |
| `MeshEffect` | `CEffectMesh` |
| `SimpleLightData` | `CSimpleLightData` |

`CEffectManager::RegisterEffect(filename)` hashes the filename with CRC32 to produce an effect ID, loads the `.mse`, and stores the resulting `CEffectData`. Subsequent calls to `CEffectManager::CreateEffect(id, pos, rot)` spawn a `CEffectInstance` at the given world position.

### Attaching an Effect to a Bone

`CGraphicThingInstance::AttachModelInstance(dstSlot, boneName, srcSlot)` binds one model instance to a named bone of another. The bone name must match a bone in the `.gr2` skeleton exactly (use `FindBoneIndex` in a debug build to enumerate valid bone names). For effects that must follow a character bone:

1. Call `CEffectManager::CreateEffect(id, ...)` to get an instance index.
2. Call `CEffectManager::SelectEffectInstance(index)`.
3. Each frame, call `CEffectManager::SetEffectInstanceGlobalMatrix(mat)` where `mat` is derived from `CGraphicThingInstance::GetBonePosition(iModel, iBone, x, y, z)`.

For a fixed world-position effect (hit sparks, area spells) pass the position directly to `CreateEffect`.

---

## 4. How .sub Files Work

A `.sub` file defines a sub-rectangle inside a larger texture atlas. It is loaded by `CGraphicSubImage` (`EterLib/GrpSubImage.h/.cpp`).

### File Format

```
TextureAtlas.tga SubX SubY SubWidth SubHeight
```

| Token | Meaning |
|-------|---------|
| `TextureAtlas.tga` | Path (relative to pack root) of the atlas texture |
| `SubX` | Left edge of the sub-rectangle in pixels |
| `SubY` | Top edge of the sub-rectangle in pixels |
| `SubWidth` | Width of the sub-rectangle in pixels |
| `SubHeight` | Height of the sub-rectangle in pixels |

At runtime the engine loads the atlas via `CResourceManager::GetResourcePointer`, then slices the UV coordinates to cover only `[SubX, SubY, SubX+SubWidth, SubY+SubHeight]`.

### Why Icons Look Wrong

| Problem | Symptom | Fix |
|---------|---------|-----|
| `SubX`/`SubY` wrong | Wrong icon from atlas is shown | Open atlas in image editor, measure pixel coordinates precisely |
| `SubWidth`/`SubHeight` too large | Icon bleeds into adjacent icons | Reduce to exact cell size |
| Atlas path wrong | Blank or default texture displayed | Match the exact relative path format |

### Step-by-Step: Creating a New Icon

1. **Prepare the atlas.** Add the new icon at a known pixel coordinate in the `.tga` file (e.g. `(128, 64)` in a `32×32` cell).
2. **Write the `.sub` file:**
   ```
   icon/item/weapon_atlas.tga 128 64 32 32
   ```
3. **Reference the `.sub` in item proto.** Set the icon field to `icon/item/my_new_sword.sub`.
4. **Test loose (dev mode).** Place both files under `client-bin/` and launch with file mode. Verify the icon.
5. **Repack for distribution.** See Section 5.

---

## 5. Pack Tool Workflow

### Repacking for Distribution

1. **Assemble the asset directory.** Maintain a staging folder mirroring the path structure (`stage/icon/item/`, `stage/textures/`, etc.).

2. **Run the pack tool:**
   ```
   pack_tool.exe -key <PACK_KEY_HEX> -input stage/ -output dist/icon.pck
   ```
   The tool compresses each file with LZO and encrypts with XChaCha20, using the project's `PACK_KEY` from `PackLib/config.h`.

3. **Verify:**
   ```
   pack_tool.exe -list dist/icon.pck
   ```

4. **Deploy.** Copy updated `.pck` files alongside the game executable. The last-added pack takes priority.

### Development Iteration (No Repacking)

Switch the client to file mode via `CPackManager::SetFileLoadMode()`. Drop modified assets directly into `client-bin/` under the correct relative paths. Restart the client — no repacking required.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Mixed-case filename in `.sub` | Asset not found on case-sensitive systems | Normalize all paths to lower-case |
| Wrong SubX/SubY in `.sub` | Shows neighbouring tile from atlas | Measure pixel coordinates precisely |
| SubWidth/SubHeight too large | Icon bleeds into adjacent tiles | Reduce to exact cell size |
| Atlas path in `.sub` doesn't match pack path | Blank icon | Use same relative path format as other `.sub` files |
| Bone name in effect attachment wrong | Effect renders at world origin (0,0,0) | Use `FindBoneIndex` to enumerate valid bone names |
| Asset added to wrong pack (lower priority) | Old version shown | Check pack load order; ensure updated pack is registered last |
| File mode left on in shipping build | Encryption bypassed | Ensure `SetPackLoadMode` called in release builds |
| `.mse` references texture not in same pack | Particle system missing texture | Add effect textures to same pack as the `.mse` |

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `src/PackLib/PackManager.h` | client-src | `CPackManager` — VFS entry point, priority map |
| `src/PackLib/Pack.h` | client-src | `CPack` — single `.pck` file reader / decryptor |
| `src/PackLib/config.h` | client-src | `TPackFileHeader`, `TPackFileEntry`, `PACK_KEY` |
| `src/EterLib/GrpSubImage.h` | client-src | `CGraphicSubImage` — `.sub` loader and UV slicer |
| `src/EterLib/ResourceManager.h` | client-src | `CResourceManager` — asset lifecycle |
| `src/EterLib/TextFileLoader.h` | client-src | `CTextFileLoader` — hierarchical text parser for `.mse` |
| `src/EffectLib/EffectManager.h` | client-src | `CEffectManager` — effect registration and instantiation |
| `src/EffectLib/EffectData.h` | client-src | `CEffectData` — parsed effect definition |
| `src/EterGrnLib/ThingInstance.h` | client-src | `CGraphicThingInstance` — bone attachment |
| `src/EterImageLib/Image.h` | client-src | `CImage` — TGA format structures |
| `src/EterImageLib/DDSTextureLoader9.h` | client-src | DDS texture loader for D3D9 |
