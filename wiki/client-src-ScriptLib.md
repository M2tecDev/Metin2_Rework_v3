# ScriptLib

> Script parsing and loading library providing the embedded Python 3.x interpreter launcher and associated debug/utility modules.

## Overview

ScriptLib is responsible for initializing and driving the embedded CPython interpreter. `CPythonLauncher` creates the Python module/dictionary context and provides methods to run scripts from files, from memory buffers, or as pre-compiled `.pyc` bytecode. Debug utilities provide Python-level access to trace functions and error reporting.

## Dependencies

- Python 3.x (static, embedded) — `PyObject*`, `PyFrameObject*`, interpreter APIs
- `EterBase` — singleton template

## Files

| File | Purpose |
|------|---------|
| `PythonLauncher.h/.cpp` | `CPythonLauncher`: initializes CPython and runs script files/lines/bytecode |
| `PythonDebugModule.h/.cpp` | Python extension module exposing debug/trace functions to scripts |
| `PythonUtils.h/.cpp` | Python-to-C++ type conversion helpers |
| `Resource.h/.cpp` | Resource handling helpers for script loading (purpose relates to script resource access) |

## Classes

### `CPythonLauncher`
**File:** `PythonLauncher.h`
**Purpose:** Singleton that owns the Python interpreter state (`m_poModule`, `m_poDic`) and provides the interface for running all game scripts.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_poModule` | `PyObject*` | Main Python module (`__main__`) |
| `m_poDic` | `PyObject*` | Global dictionary of the main module |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Create` | — | `bool` | Initializes the CPython interpreter |
| `Clear` | — | `void` | Shuts down and cleans up the interpreter |
| `RunLine` | `const char* c_szLine` | `bool` | Executes a single Python statement string |
| `RunFile` | `const char* c_szFileName` | `bool` | Executes a Python source file from disk |
| `RunMemoryTextFile` | `filename, uFileSize, c_pvFileData` | `bool` | Executes a Python source file from a memory buffer (e.g., loaded from a pack) |
| `RunCompiledFile` | `const char* c_szFileName` | `bool` | Executes a pre-compiled `.pyc` bytecode file |
| `SetTraceFunc` | `int (*pFunc)(PyObject*, PyFrameObject*, int, PyObject*)` | `void` | Installs a Python trace function for debugging |
| `GetError` | — | `const char*` | Returns a string description of the last Python exception |

---

### `PythonUtils`
**File:** `PythonUtils.h`
**Purpose:** Provides helper functions for converting between Python objects and C++ types (strings, integers, lists, etc.), used throughout the Python module implementations.

---

### `PythonDebugModule`
**File:** `PythonDebugModule.h`
**Purpose:** Python C extension module (`dbg` or similar) that exposes debug-level functions to game scripts — for example, trace logging and script error display.
