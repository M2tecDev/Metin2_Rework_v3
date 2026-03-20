#!/usr/bin/env python3
"""
build_icons.py — Extract item icons from Metin2 client assets.

Reads data/item_scripts/**/*.txt, maps IconImageFileName paths from
"d:/ymir work/" → client-bin/assets/, and writes data/icons/<vnum>.png.

Approach A: If a .png already exists at the mapped path, copy it directly.
Approach B: Parse the .sub file to get atlas crop coords, crop with Pillow.

Run from repo root: python scripts/build_icons.py
Requires: Pillow (pip install Pillow)
"""
import os
import re
import shutil
from pathlib import Path

try:
    from PIL import Image
    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False
    print("WARNING: Pillow not installed — Approach B (atlas crop) disabled")

REPO_ROOT        = Path(__file__).resolve().parent.parent
ITEM_SCRIPTS_DIR = REPO_ROOT / 'data' / 'item_scripts'
CLIENT_ASSETS    = REPO_ROOT / 'client-bin' / 'assets'
ICONS_OUT        = REPO_ROOT / 'data' / 'icons'
YMIR_PREFIX      = 'd:/ymir work/'

generated = 0
skipped   = 0


def map_path(raw: str) -> Path:
    """Map 'd:/ymir work/...' to client-bin/assets/..."""
    norm = raw.replace('\\', '/').lower().strip()
    if norm.startswith(YMIR_PREFIX):
        rel = norm[len(YMIR_PREFIX):]
        return CLIENT_ASSETS / rel
    return CLIENT_ASSETS / raw.replace('\\', '/')


def extract_vnum(path: Path, content: str) -> int | None:
    """Explicit Vnum field first; fallback to first numeric run in filename."""
    for line in content.splitlines():
        m = re.match(r'^\s*Vnum\s+(\d+)', line, re.IGNORECASE)
        if m:
            return int(m.group(1))
    m = re.search(r'\d+', path.stem)
    return int(m.group()) if m else None


def extract_icon_path(content: str) -> str | None:
    """Extract IconImageFileName value, stripping quotes."""
    for line in content.splitlines():
        m = re.match(r'^\s*IconImageFileName\s+"?([^"\n]+)"?', line, re.IGNORECASE)
        if m:
            return m.group(1).strip().strip('"')
    return None


def process(script: Path) -> None:
    global generated, skipped
    try:
        content = script.read_text(encoding='utf-8', errors='replace')
    except Exception as e:
        print(f'SKIP {script.name}: read error — {e}')
        skipped += 1
        return

    vnum = extract_vnum(script, content)
    if vnum is None:
        print(f'SKIP {script.name}: cannot determine vnum')
        skipped += 1
        return

    icon_str = extract_icon_path(content)
    if icon_str is None:
        print(f'SKIP vnum={vnum}: no IconImageFileName in {script.name}')
        skipped += 1
        return

    asset_path = map_path(icon_str)

    # Approach A: a .png already exists
    png_path = asset_path.with_suffix('.png')
    if png_path.exists():
        ICONS_OUT.mkdir(parents=True, exist_ok=True)
        out = ICONS_OUT / f'{vnum}.png'
        if out.exists():
            print(f'  WARN vnum={vnum}: icon already exists, skipping duplicate from {script.name}')
            skipped += 1
            return
        shutil.copy2(png_path, out)
        generated += 1
        return

    # Approach B: crop from .sub → .tga atlas
    if not PILLOW_AVAILABLE:
        print(f'SKIP vnum={vnum}: Pillow unavailable for atlas crop')
        skipped += 1
        return

    sub_path = asset_path if asset_path.suffix.lower() == '.sub' \
               else asset_path.with_suffix('.sub')
    if not sub_path.exists():
        print(f'SKIP vnum={vnum}: .sub not found at {sub_path}')
        skipped += 1
        return

    try:
        lines = sub_path.read_text(encoding='utf-8', errors='replace').splitlines()
        if len(lines) < 2:
            print(f'SKIP vnum={vnum}: .sub has fewer than 2 lines')
            skipped += 1
            return

        atlas_path = map_path(lines[0].strip())
        parts = lines[1].strip().split()
        if len(parts) < 4:
            print(f'SKIP vnum={vnum}: .sub line 2 has fewer than 4 values')
            skipped += 1
            return

        sx, sy, sw, sh = int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])
        if sx < 0 or sy < 0 or sw <= 0 or sh <= 0:
            print(f'  SKIP vnum={vnum}: invalid crop coords ({sx},{sy},{sw},{sh})')
            skipped += 1
            return

        if not atlas_path.exists():
            print(f'SKIP vnum={vnum}: atlas not found at {atlas_path}')
            skipped += 1
            return

        with Image.open(atlas_path) as img:
            aw, ah = img.size
            if sx + sw > aw or sy + sh > ah:
                print(f'  WARN vnum={vnum}: crop ({sx},{sy},{sw},{sh}) exceeds atlas {aw}x{ah}, clipping')
            cropped = img.crop((sx, sy, sx + sw, sy + sh))
        ICONS_OUT.mkdir(parents=True, exist_ok=True)
        out = ICONS_OUT / f'{vnum}.png'
        if out.exists():
            print(f'  WARN vnum={vnum}: icon already exists, skipping duplicate from {script.name}')
            skipped += 1
            return
        cropped.save(out)
        generated += 1

    except Exception as e:
        print(f'SKIP vnum={vnum}: error — {e}')
        skipped += 1


def main() -> None:
    if not ITEM_SCRIPTS_DIR.exists():
        print(f'ERROR: {ITEM_SCRIPTS_DIR} does not exist.')
        print('Run the sync-data GitHub Action (or copy item scripts manually) first.')
        return

    scripts = sorted(ITEM_SCRIPTS_DIR.rglob('*.txt'))
    print(f'Processing {len(scripts)} item scripts...')
    for s in scripts:
        process(s)
    print(f'Generated: {generated} icons, Skipped: {skipped}')


if __name__ == '__main__':
    main()
