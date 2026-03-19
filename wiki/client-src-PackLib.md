# PackLib

> Asset pack reader that loads encrypted, compressed `.pck` archive files and provides transparent file access to the rest of the client.

## Overview

PackLib provides the virtual file system used by the game client. All game assets (textures, models, scripts, sound) are stored in `.pck` archive files. When loading, `CPackManager` scans packs and builds a flat filename map. File reads are transparently decrypted using XChaCha20 (libsodium) and decompressed. The manager can be switched between "pack mode" (reads from archives) and "file mode" (reads directly from disk), which is useful during development.

## Dependencies

- `EterBase` — singleton, LZO decompression (`CLZO`)
- libsodium — XChaCha20 decryption (`crypto_stream_xchacha20_xor`)
- mio — memory-mapped file I/O (`mio::mmap_source`)

## Files

| File | Purpose |
|------|---------|
| `config.h` | Pack file format structures (`TPackFileHeader`, `TPackFileEntry`), encryption key constants |
| `Pack.h/.cpp` | `CPack`: loads a single `.pck` file, parses its index, and extracts/decrypts individual file entries |
| `PackManager.h/.cpp` | `CPackManager`: singleton managing multiple pack files, filename lookup, and file retrieval |

## Pack File Format

| Structure | Fields |
|-----------|--------|
| `TPackFileHeader` | `entry_num` (count of entries), `data_begin` (byte offset to data), `nonce[24]` (XChaCha20 nonce for header) |
| `TPackFileEntry` | `file_name[FILENAME_MAX+1]`, `offset`, `file_size`, `compressed_size`, `encryption` (flag), `nonce[24]` |

The pack key is a 32-byte constant defined in `config.h` (`PACK_KEY`). Each entry may be independently encrypted with its own per-file nonce. Files may be compressed (when `compressed_size < file_size`).

## Classes

### `CPack`
**File:** `Pack.h`
**Purpose:** Loads and memory-maps a single `.pck` file. Parses the header and index section, and provides methods to extract and decrypt individual files.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_header` | `TPackFileHeader` | Parsed pack header |
| `m_index` | `vector<TPackFileEntry>` | All file entries in this pack |
| `m_file` | `mio::mmap_source` | Memory-mapped view of the `.pck` file |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Load` | `const string& path` | `bool` | Opens the file, parses header and index |
| `GetIndex` | — | `const vector<TPackFileEntry>&` | Returns the list of all file entries |
| `GetFile` | `entry, result` | `bool` | Extracts, decrypts, and optionally decompresses a file entry into `result` |
| `GetFileWithPool` | `entry, result, pPool` | `bool` | Same as `GetFile` but uses a pooled buffer |

---

### `CPackManager`
**File:** `PackManager.h`
**Purpose:** Singleton managing all loaded pack files. Maintains a flat `unordered_map` from normalized filename to `(CPack*, TPackFileEntry)` pair. Thread-safe via a mutex.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_entries` | `TPackFileMap` | Filename → (pack, entry) lookup map |
| `m_load_from_pack` | `bool` | True: read from packs; false: read from disk directly |
| `m_pBufferPool` | `CBufferPool*` | Pooled memory for file extraction |
| `m_mutex` | `std::mutex` | Thread safety guard |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `AddPack` | `const string& path` | `bool` | Loads a `.pck` file and registers all its entries |
| `GetFile` | `path, result` | `bool` | Retrieves a file by normalized path |
| `GetFileWithPool` | `path, result, pPool` | `bool` | Retrieves a file using a pooled buffer |
| `IsExist` | `path` | `bool` | Returns true if the filename exists in any loaded pack |
| `SetPackLoadMode` | — | — | Enables reading from pack archives |
| `SetFileLoadMode` | — | — | Enables direct disk reading (dev mode) |
| `GetBufferPool` | — | `CBufferPool*` | Returns the internal buffer pool |
