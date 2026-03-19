# EterBase

> Low-level utility library providing CRC, compression, encryption, file I/O, timing, and math helpers used by all other client libraries.

## Overview

EterBase is the foundation layer of the client. It contains no game logic but instead provides fundamental services: file access, timer management, LZO compression with optional TEA/XChaCha20 encryption, CRC32 checksums, a template Singleton base class, random number generation, and a variety of string and math utility functions. Every other library in the client depends directly on EterBase.

## Dependencies

- libsodium — used by `SecureCipher` (XChaCha20 stream cipher, X25519 key exchange)
- lzo2 — used by `CLZO` / `CLZObject` for data compression

## Files

| File | Purpose |
|------|---------|
| `CRC32.h/.cpp` | CRC32 checksum over buffers, files, and handles |
| `Debug.h/.cpp` | Debug output and trace logging helpers |
| `FileBase.h/.cpp` | Base class for Win32 file handle operations |
| `FileDir.h/.cpp` | Directory enumeration utilities |
| `FileLoader.h/.cpp` | In-memory text/binary file loaders and token splitting |
| `Filename.h` | Filename string manipulation helpers |
| `lzo.h/.cpp` | LZO compression/decompression wrapper (`CLZO`, `CLZObject`) |
| `tea.h/.cpp` | Symmetric cipher API backed by libsodium (XChaCha20); API named "TEA" for legacy compatibility |
| `SecureCipher.h/.cpp` | X25519 key exchange + XChaCha20-Poly1305 stream cipher for network security |
| `Random.h/.cpp` | Pseudo-random number generation utilities |
| `Singleton.h` | CRTP singleton template (`CSingleton<T>`, `singleton<T>`) |
| `Stl.h/.cpp` | STL helper types: `CTokenVector`, `stl_wipe`, container utilities |
| `TempFile.h/.cpp` | Temporary file creation and management |
| `Timer.h/.cpp` | High-resolution timer singleton and frame/server time tracking |
| `Utils.h/.cpp` | Miscellaneous utilities: safe delete macros, path/string manipulation, coordinate math templates |
| `error.h/.cpp` | Error reporting and assertion utilities |
| `vk.h` | Virtual key code definitions |
| `Poly/` | Polynomial expression evaluator (Base, Poly, Symbol, SymTable) |

## Classes / Functions

### `CSingleton<T>` / `singleton<T>`
**File:** `Singleton.h`
**Purpose:** CRTP-based singleton template. Ensures only one instance of `T` exists. Provides `Instance()` and `InstancePtr()` static accessors.

#### Methods
| Method | Description |
|--------|-------------|
| `static T& Instance()` | Returns reference to the singleton instance (asserts it exists) |
| `static T* InstancePtr()` | Returns pointer to the singleton instance (may be null) |

---

### `CRC32 free functions`
**File:** `CRC32.h`
**Purpose:** Compute CRC32 checksums for integrity checking and resource lookup by the resource manager.

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `GetCRC32` | `const char* buffer, size_t count` | `DWORD` | CRC32 over an in-memory buffer |
| `GetCaseCRC32` | `const char* buf, size_t len` | `DWORD` | Case-insensitive CRC32 (lowercases before hashing) |
| `GetHFILECRC32` | `HANDLE hFile` | `DWORD` | CRC32 of a Win32 file handle's contents |
| `GetFileCRC32` | `const wchar_t* c_szFileName` | `DWORD` | CRC32 of a file on disk (wide-char path) |
| `GetFileCRC32` | `const char* fileUtf8` | `DWORD` | CRC32 of a file on disk (UTF-8 path) |
| `GetFileSize` | `const char* c_szFileName` | `DWORD` | File size in bytes |

---

### `CFileBase`
**File:** `FileBase.h`
**Purpose:** Base class wrapping a Win32 `HANDLE` for basic file read/write operations.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_mode` | `int` | Open mode flags (`FILEMODE_READ`, `FILEMODE_WRITE`) |
| `m_filename` | `char[MAX_PATH+1]` | Path of the opened file |
| `m_hFile` | `HANDLE` | Win32 file handle |
| `m_dwSize` | `DWORD` | File size in bytes |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Create` | `const char* filename, EFileMode mode` | `BOOL` | Opens the file |
| `Read` | `void* dest, int bytes` | `BOOL` | Reads bytes into destination buffer |
| `Write` | `const void* src, int bytes` | `BOOL` | Writes bytes from source buffer |
| `Seek` | `DWORD offset` | `void` | Seeks to absolute offset |
| `SeekCur` | `DWORD size` | `void` | Seeks forward by `size` bytes |
| `Size` | — | `DWORD` | Returns file size |
| `Close` | — | `void` | Closes the file handle |

---

### `CMemoryTextFileLoader`
**File:** `FileLoader.h`
**Purpose:** Parses a memory buffer as a text file, providing line-by-line access and token splitting.

#### Methods
| Method | Description |
|--------|-------------|
| `Bind(int bufSize, const void* pvBuf)` | Binds the loader to an existing memory buffer and splits it into lines |
| `GetLineCount()` | Returns the total number of lines |
| `SplitLine(DWORD dwLine, CTokenVector* pVec, const char* delim)` | Tokenizes the specified line using the given delimiter |
| `GetLineString(DWORD dwLine)` | Returns the raw string for a line |

---

### `CMemoryFileLoader`
**File:** `FileLoader.h`
**Purpose:** Sequential binary reader over a memory buffer.

#### Methods
| Method | Description |
|--------|-------------|
| `Read(int size, void* pvDst)` | Reads `size` bytes and advances the position |
| `GetPosition()` | Returns current read position |
| `GetSize()` | Returns total buffer size |

---

### `CDiskFileLoader`
**File:** `FileLoader.h`
**Purpose:** File-based sequential binary reader using `FILE*`.

#### Methods
| Method | Description |
|--------|-------------|
| `Open(const char* c_szFileName)` | Opens the file |
| `Read(int size, void* pvDst)` | Reads `size` bytes |
| `GetSize()` | Returns file size |
| `Close()` | Closes the file |

---

### `CLZObject`
**File:** `lzo.h`
**Purpose:** Holds a compressed/encrypted data block with a fixed header describing its sizes and encryption state.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_pbBuffer` | `BYTE*` | Output buffer for compressed/decompressed data |
| `m_dwBufferSize` | `DWORD` | Current buffer allocation size |
| `m_pHeader` | `THeader*` | Pointer to the fixed 16-byte header inside the buffer |
| `m_bCompressed` | `bool` | True if data is currently in compressed form |
| `ms_dwFourCC` | `static DWORD` | Magic number identifying LZO-compressed files |

#### Methods
| Method | Description |
|--------|-------------|
| `BeginCompress(pvIn, uiInLen)` | Prepares input data for compression |
| `Compress()` | Compresses the input data using LZO1X |
| `BeginDecompress(pvIn)` | Attaches to a compressed input buffer |
| `Decompress(pdwKey)` | Decompresses (optionally decrypts first) |
| `Encrypt(pdwKey)` | Encrypts the compressed payload using TEA/XChaCha20 |
| `GetBuffer()` | Returns pointer to the output data buffer |
| `GetSize()` | Returns current data size |

---

### `CLZO`
**File:** `lzo.h`
**Purpose:** Singleton wrapper around the LZO1X algorithm providing compress/decompress operations used by the pack system and resources.

#### Methods
| Method | Description |
|--------|-------------|
| `CompressMemory(rObj, pIn, uiInLen)` | Compresses raw memory into a `CLZObject` |
| `CompressEncryptedMemory(rObj, pIn, uiInLen, pdwKey)` | Compresses and encrypts into a `CLZObject` |
| `Decompress(rObj, pbBuf, pdwKey)` | Decompresses (and decrypts if key provided) from a buffer into a `CLZObject` |
| `GetWorkMemory()` | Returns the LZO working memory buffer |

---

### `SecureCipher`
**File:** `SecureCipher.h`
**Purpose:** Implements X25519 Diffie-Hellman key exchange and XChaCha20-Poly1305 stream encryption for the network connection. Used to secure client-server communication.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_pk[PK_SIZE]` | `uint8_t[32]` | X25519 public key |
| `m_sk[SK_SIZE]` | `uint8_t[32]` | X25519 secret key |
| `m_tx_key[KEY_SIZE]` | `uint8_t[32]` | Session key for outgoing packet encryption |
| `m_rx_key[KEY_SIZE]` | `uint8_t[32]` | Session key for incoming packet decryption |
| `m_tx_nonce` | `uint64_t` | Outgoing byte counter (nonce) |
| `m_rx_nonce` | `uint64_t` | Incoming byte counter (nonce) |
| `m_activated` | `bool` | Whether cipher is in use on the stream |

#### Methods
| Method | Description |
|--------|-------------|
| `Initialize()` | Generates the X25519 keypair |
| `GetPublicKey(out_pk)` | Copies the public key for transmission to the server |
| `ComputeClientKeys(server_pk)` | Derives TX/RX session keys from server's public key |
| `EncryptInPlace(buffer, len)` | Encrypts a buffer in place using the TX stream key |
| `DecryptInPlace(buffer, len)` | Decrypts a buffer in place using the RX stream key |
| `GenerateChallenge(out_challenge)` | Generates a random 32-byte challenge |
| `VerifyChallengeResponse(challenge, response)` | Validates a challenge-response HMAC |

---

### `CTimer`
**File:** `Timer.h`
**Purpose:** Singleton timer that tracks current time, elapsed time per frame, and a server-synchronized clock.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_dwBaseTime` | `DWORD` | Base time at initialization |
| `m_dwCurrentTime` | `DWORD` | Current absolute time in milliseconds |
| `m_dwElapsedTime` | `DWORD` | Time elapsed since last `Advance()` call |
| `m_bUseRealTime` | `bool` | Whether to use real-time or custom time |

#### Methods
| Method | Description |
|--------|-------------|
| `Advance()` | Advances the timer to the current system time |
| `GetCurrentMillisecond()` | Returns current time in milliseconds |
| `GetCurrentSecond()` | Returns current time in seconds |
| `GetElapsedSecond()` | Returns time elapsed since last `Advance()` call in seconds |
| `GetElapsedMilliecond()` | Returns time elapsed since last `Advance()` call in milliseconds |
| `Adjust(iTimeGap)` | Adjusts the timer by a given millisecond offset |

**Global helpers:** `ELTimer_GetMSec()`, `ELTimer_SetServerMSec()`, `ELTimer_GetServerMSec()`, `ELTimer_SetFrameMSec()`, `ELTimer_GetFrameMSec()`

---

### Utility free functions (`Utils.h`)

| Function | Description |
|----------|-------------|
| `StringPath(string&)` | Lowercases all characters and converts `\` to `/` |
| `GetFilePathNameExtension(...)` | Splits a path into directory, base name, and extension |
| `IsFile(filename)` | Returns true if the file exists on disk |
| `SplitLine(line, delimiter, &vec)` | Splits a line by delimiter into a vector of strings |
| `EL_DegreeToRadian<T>(degree)` | Converts degrees to radians |
| `LinearInterpolation(min, max, ratio)` | Linear interpolation between two values |
| `HermiteInterpolation(min, max, ratio)` | Hermite (smooth-step) interpolation between two values |
| `SAFE_DELETE(p)` | Deletes a pointer and sets it to null |
| `SAFE_DELETE_ARRAY(p)` | Deletes an array and sets it to null |
| `SAFE_RELEASE(p)` | Calls `Release()` on a COM pointer and sets it to null |
