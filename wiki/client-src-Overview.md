# client-src Overview

> C++20 game client source for the Metin2 Rework v3 private server, producing the main game executable and tooling binaries.

## Overview

`client-src` contains all C++ source code necessary to compile the Metin2 game client. The project is structured as a CMake build system targeting Windows (MSVC) exclusively. It compiles a collection of static libraries that are linked into the final game executable (`Metin2_<Config>.exe`) and two standalone tools (`DumpProto.exe` and `PackMaker.exe`). The codebase uses C++20 and C17 standards and relies on DirectX 9 for rendering.

## Build System

| Setting | Value |
|---------|-------|
| Build tool | CMake 3.19+ |
| Language standard | C++20 (CXX), C17 (C) |
| Target platform | Windows only (MSVC) |
| Runtime library | Multi-threaded (`/MT` for Release, `/MTd` for Debug) |
| Configurations | `Debug`, `RelWithDebInfo`, `Release` |
| Output directory | `build/bin/<Config>/` |

### Build Commands

```
cmake -S . -B build
cmake --build build
```

### Key Compile Definitions

| Definition | Purpose |
|------------|---------|
| `NOMINMAX` | Prevents Windows `min`/`max` macros |
| `WIN32_LEAN_AND_MEAN` | Slims Windows header inclusions |
| `USE_LOD` | Enables level-of-detail rendering |
| `DUNGEON_WORK` | Enables dungeon-specific code paths |
| `BUILDING_GRANNY_STATIC` | Links Granny2 as a static library |
| `GRANNY_THREADED` | Enables thread-safe Granny2 usage |
| `Py_NO_ENABLE_SHARED` | Embeds Python as a static library |
| `DEBUG` | Set in Debug configuration |
| `_DISTRIBUTE` | Set in Release/RelWithDebInfo |
| `UNICODE` / `_UNICODE` | Enables Unicode Windows APIs |
| `ENABLE_ASAN` | Optional: enables AddressSanitizer |

## Source Layout

```
client-src/
├── CMakeLists.txt          Root build configuration
├── README.md               Installation and build guide
├── buildtool/              CMake helper utilities (Utils.cmake)
├── extern/                 Third-party headers and pre-built libraries
│   ├── include/            DirectX 9, Granny2, miniaudio, discord_rpc, stb_image, etc.
│   └── library/            Pre-built .lib files
├── vendor/                 Vendored source-built dependencies
│   ├── libsodium/          Cryptographic primitives (XChaCha20, X25519)
│   └── freetype-2.13.3/    Font rasterization
└── src/                    Game-specific libraries and executables
    ├── EterBase/           Low-level utilities
    ├── EterLib/            Core engine (D3D9, windowing, networking)
    ├── EterGrnLib/         Granny2 model/animation wrapper
    ├── EterPythonLib/      Python UI window system
    ├── EterLocale/         Localization helpers
    ├── EterImageLib/       Image loading (TGA, DDS, STB)
    ├── PackLib/            Encrypted pack-file reader
    ├── PackMaker/          Tool: creates .pck pack files
    ├── AudioLib/           Sound and music (miniaudio)
    ├── EffectLib/          Particle and visual effects
    ├── GameLib/            Game logic (actors, map, items, skills)
    ├── PRTerrainLib/       Terrain height-map and splatting
    ├── ScriptLib/          Embedded Python interpreter launcher
    ├── SphereLib/          Frustum and sphere collision
    ├── SpeedTreeLib/       Vegetation rendering (SpeedTreeRT)
    ├── PythonModules/      Python C-extension modules
    ├── UserInterface/      Main executable + Python game modules
    ├── Discord/            Discord Rich Presence integration
    └── DumpProto/          Tool: compiles protocol CSV files
```

## Dependencies

| Library | Source | Purpose |
|---------|--------|---------|
| DirectX 9 (d3d9, d3dx9) | extern/include | 3D rendering pipeline |
| Granny2 | extern | Skeletal animation format |
| libsodium | vendor | Encryption (XChaCha20, X25519 key exchange) |
| FreeType 2.13.3 | vendor | Font rasterization for UI text |
| miniaudio | extern/include | Audio playback (2D and 3D) |
| SpeedTreeRT | extern | Real-time tree/vegetation rendering |
| Python 3.x (static) | extern | Embedded scripting engine |
| discord_rpc | src/Discord | Discord Rich Presence |
| stb_image | extern/include | PNG/JPEG/BMP image loading |
| lzo2 | extern/library | LZO compression for pack files |
| zstd | extern | Zstandard compression (PackMaker) |
| argparse | extern/include | CLI argument parsing (PackMaker) |
| mio | extern | Memory-mapped file I/O (PackLib) |
| rapidjson | extern/include | JSON parsing |

## Output Binaries

| Binary | Source | Description |
|--------|--------|-------------|
| `Metin2_<Config>.exe` | `UserInterface/` | Main game client executable |
| `PackMaker.exe` | `PackMaker/` | Creates encrypted `.pck` asset archives |
| `DumpProto.exe` | `DumpProto/` | Compiles item/mob proto CSV files to binary |
