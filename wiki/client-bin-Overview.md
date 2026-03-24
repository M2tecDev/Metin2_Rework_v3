# client-bin Overview

> Top-level directory containing the Metin2 game executable, asset pipeline, and all client resource files.

## Overview

The `client-bin/` directory is the root of the game client deployment. It contains the `Metin2.exe` binary, all game assets under `assets/`, and a build-time Python utility (`pack.py`) for packing asset folders into the proprietary `.epk` pack format understood by the engine. Assets are organized into sub-directories by type (root, uiscript, locale, icon, sound, etc.) and must be packed before the client can load them at runtime.

## Directory Structure

```
client-bin/
├── Metin2.exe                  # Game executable
├── README.md
├── assets/
│   ├── pack.py                 # Asset packing utility (documented below)
│   ├── root/                   # Python UI scripts loaded at runtime
│   ├── uiscript/               # UI layout scripts (.py files used as data)
│   ├── locale/                 # Locale-specific UI layouts and text files
│   ├── icon/                   # Item/face/skill/action icons (.tga, .sub)
│   ├── ETC/                    # Environment data (.msenv), textures
│   ├── PC/                     # Player character motion/mesh data
│   ├── pc2/                    # Additional PC assets
│   ├── sound2/                 # Sound effect files
│   └── ...                     # Additional game data directories
```

---

## Module: pack.py

**Purpose:** Command-line utility that wraps the external `PackMaker.exe` tool to pack one or all asset sub-folders into the `../pack/` output directory. Supports parallel packing via a thread pool.

### Module-Level Constants / Variables

| Name | Value / Type | Description |
|------|-------------|-------------|
| `output_folder_path` | `"../pack"` | Destination directory for generated pack files |
| `IGNORE_FOLDERS` | `{"zz_ignore_old"}` | Set of folder names that are skipped during `--all` packing |

### Module-Level Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `pack_folder(folder_path)` | `folder_path` — absolute path to the folder to pack | None | Resolves the folder's basename, checks it exists, then calls `PackMaker.exe --input <folder_name> --output ../pack`. Prints an error and returns early on failure. |
| `pack_all_folders()` | — | None | Lists all non-ignored directories in the current working directory, then dispatches `pack_folder` for each in parallel using `ThreadPoolExecutor`. |
| `main()` | — | None | Entry point. Parses CLI arguments (`folder_name` positional or `--all` flag). Creates the output directory if it does not exist, then calls `pack_all_folders()` or `pack_folder()` as appropriate. |

### Usage

```
# Pack a single folder
python pack.py root

# Pack all folders in parallel
python pack.py --all
```

The script must be run from inside the `assets/` directory so that relative folder names resolve correctly. The external `PackMaker.exe` must be on the system PATH. For `CPackManager` priority rules (later-added packs win; file mode bypasses all packs), see [client-src-PackLib](client-src-PackLib).

### Dependencies

| Import | Purpose |
|--------|---------|
| `subprocess` | Calls `PackMaker.exe` |
| `shutil` | Imported but not used in current version |
| `os` | Directory listing and path operations |
| `sys` | System operations |
| `argparse` | CLI argument parsing |
| `concurrent.futures.ThreadPoolExecutor` | Parallel folder packing |
