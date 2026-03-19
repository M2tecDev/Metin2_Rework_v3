# EterImageLib

> Image loading and texture management library supporting TGA, DDS, and STB-decoded image formats for use as D3D9 textures.

## Overview

EterImageLib provides CPU-side image data management. The `CImage` class stores a 32-bit ARGB pixel buffer of arbitrary dimensions. Format-specific loaders (TGA native, DDS via DirectX helper, and generic formats via stb_image) populate `CImage` instances which the texture pipeline then uploads to the GPU. This library is used by `EterLib`'s `ImageDecoder` and the resource manager when creating `CGraphicImageTexture` objects.

## Dependencies

- `EterLib` — types, D3D integration
- DirectX 9 (DDSTextureLoader9) — DDS format loading
- stb_image (extern/include) — PNG, JPEG, BMP, and other common formats

## Files

| File | Purpose |
|------|---------|
| `Image.h/.cpp` | `CImage`: CPU-side 32-bit ARGB image buffer with basic manipulation |
| `DDSTextureLoader9.h/.cpp` | Microsoft DDS texture loader for Direct3D 9 |
| `STBImageImplementation.cpp` | Compilation unit that defines the stb_image implementation |

## Classes

### `CImage`
**File:** `Image.h`
**Purpose:** Stores a 32-bit ARGB pixel buffer in CPU memory. Provides pixel-level access, basic drawing operations (image blitting, vertical flip), and filename tracking.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_pdwColors` | `DWORD*` | Heap-allocated 32-bit ARGB pixel array |
| `m_width` | `int` | Image width in pixels |
| `m_height` | `int` | Image height in pixels |
| `m_stFileName` | `std::string` | Source filename for identification |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Create` | `int width, int height` | `void` | Allocates a pixel buffer of the given dimensions |
| `Clear` | `DWORD color = 0` | `void` | Fills the entire buffer with a solid color |
| `GetWidth` | — | `int` | Returns image width |
| `GetHeight` | — | `int` | Returns image height |
| `GetBasePointer` | — | `DWORD*` | Returns pointer to the first pixel |
| `GetLinePointer` | `int line` | `DWORD*` | Returns pointer to the start of a scanline |
| `PutImage` | `int x, int y, CImage* pImage` | `void` | Blits another image onto this image at the given offset |
| `FlipTopToBottom` | — | `void` | Flips the image vertically (for bottom-origin TGA files) |
| `SetFileName` | `const char* c_szFileName` | `void` | Stores the source filename |
| `IsEmpty` | — | `bool` | Returns true if no pixel data has been allocated |

---

### TGA format structure (`Image.h`)

The `TGA_HEADER` struct defines the 18-byte TGA file header layout used for parsing TGA images directly without external dependencies:

| Field | Description |
|-------|-------------|
| `idLen` | Length of image ID field |
| `palType` | 1 if palette present, 0 if not |
| `imgType` | Image type (1 = palettized, 2 = truecolor) |
| `width`, `height` | Image dimensions |
| `colorBits` | Bits per pixel |
| `desc` | Image descriptor byte (includes origin flags) |

---

### DDS loading (`DDSTextureLoader9.h`)

Provides `CreateDDSTextureFromFile` and `CreateDDSTextureFromMemory` functions that load DXT-compressed or uncompressed DDS textures directly into `IDirect3DTexture9` objects. This is used by the resource manager when loading `.dds` assets from packs.

---

### stb_image (`STBImageImplementation.cpp`)

Activates the stb_image single-header implementation for decoding PNG, JPEG, BMP, TGA, and other common image formats from memory buffers. Used by `EterLib::ImageDecoder` to decode image data read from pack files.
