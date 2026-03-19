# server-src-libsql

> Asynchronous MariaDB SQL abstraction layer providing a background worker thread for query execution, result queuing, and prepared-statement support.

## Overview

`libsql` wraps the MariaDB C connector (`libmysqlclient`) behind a C++ interface tailored to the Metin2 server architecture. The key class `CAsyncSQL` maintains a dedicated background thread that processes a queue of query strings, stores results in a separate result queue, and lets the main thread poll for completed results without blocking the event loop. Both the `game` and `db` processes use this layer.

## Architecture / Process Role

`libsql` is linked into `game` and `db`. It is not a process itself.

Interaction flow:
1. The main thread calls `AsyncQuery(sql)` or `ReturnQuery(sql, userData)` — these push a `SQLMsg` onto the work queue and wake the background thread via `std::condition_variable`.
2. The background thread (`ChildLoop`) pops items, runs `mysql_query`, calls `SQLMsg::Store()` to snapshot results, and pushes completed messages onto the result queue.
3. The main thread calls `PopResult()` each game tick to retrieve completed results and invoke the appropriate callback.
4. `DirectQuery()` is a synchronous variant that executes immediately on the calling thread (used during initialisation).

## Dependencies

- `libthecore` — for `sys_err` / `sys_log` logging macros.
- MariaDB Connector/C 3.4.5 (vendored) — `<mysql.h>`, `<errmsg.h>`, `<mysqld_error.h>`.
- C++17 standard library — `<thread>`, `<mutex>`, `<condition_variable>`, `<atomic>`, `<queue>`, `<memory>`.

## Files

| File | Purpose |
|------|---------|
| `AsyncSQL.h` / `AsyncSQL.cpp` | `CAsyncSQL` — background-thread async SQL; `CAsyncSQL2` — locale-aware subclass; `SQLResult` — RAII result wrapper; `SQLMsg` — query+result message |
| `Statement.h` / `Statement.cpp` | `CStmt` — prepared statement (`MYSQL_STMT`) wrapper |
| `Semaphore.h` / `Semaphore.cpp` | `CSemaphore` — portable POSIX/Win32 semaphore |
| `Tellwait.h` / `Tellwait.cpp` | `CTellwait` — lightweight signalling helper used internally |
| `libsql.h` | Public umbrella include |
| `stdafx.h` | Precompiled-header umbrella |

## Classes / Functions

### `SQLResult` (`AsyncSQL.h`)

**Purpose:** RAII wrapper for a `MYSQL_RES*`. Move-only, non-copyable.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `pSQLResult` | `MYSQL_RES*` | Raw MariaDB result set; freed in destructor |
| `uiNumRows` | `uint32_t` | Number of rows in the result |
| `uiAffectedRows` | `uint32_t` | Rows affected by an INSERT/UPDATE/DELETE |
| `uiInsertID` | `uint32_t` | Last auto-increment ID from an INSERT |

---

### `SQLMsg` (`AsyncSQL.h`)

**Purpose:** Combines a query string, its optional user data pointer, and the list of result sets returned by the query (supports multi-statement queries via `mysql_next_result`).

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_pkSQL` | `MYSQL*` | The connection handle on which the query runs |
| `iID` | `int` | Internal message ID |
| `stQuery` | `std::string` | The SQL query string |
| `vec_pkResult` | `std::vector<std::unique_ptr<SQLResult>>` | Ordered list of result sets |
| `uiResultPos` | `unsigned int` | Iterator position in `vec_pkResult` |
| `pvUserData` | `void*` | Arbitrary caller data for `ReturnQuery` callbacks |
| `bReturn` | `bool` | True if this is a return-query (result should be delivered to caller) |
| `uiSQLErrno` | `unsigned int` | MariaDB error code if the query failed |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Store()` | — | `void` | Called by the background thread: snapshots all result sets using `mysql_store_result` / `mysql_next_result` |
| `Get()` | — | `SQLResult*` | Returns the current result set (at `uiResultPos`) |
| `Next()` | — | `bool` | Advances to the next result set; returns false if none |

---

### `CAsyncSQL` (`AsyncSQL.h`)

**Purpose:** Asynchronous SQL connection manager. Maintains a MariaDB connection, a background worker thread, and two queues (query, result).

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_hDB` | `MYSQL` | The underlying MariaDB connection handle |
| `m_stHost` / `m_stUser` / `m_stPassword` / `m_stDB` / `m_stLocale` | `std::string` | Connection parameters |
| `m_iPort` | `int` | MariaDB TCP port |
| `m_thread` | `std::unique_ptr<std::thread>` | Background query-execution thread |
| `m_bEnd` | `std::atomic<bool>` | Signals the background thread to exit |
| `m_bConnected` | `std::atomic<bool>` | True when the connection is active |
| `m_queue_query` | `std::queue<std::unique_ptr<SQLMsg>>` | Pending queries (main thread -> worker) |
| `m_queue_query_copy` | `std::queue<std::unique_ptr<SQLMsg>>` | Local copy used inside `ChildLoop` to avoid long lock holds |
| `m_queue_result` | `std::queue<std::unique_ptr<SQLMsg>>` | Completed results (worker -> main thread) |
| `m_mtxQuery` | `std::mutex` | Guards `m_queue_query` |
| `m_mtxResult` | `std::mutex` | Guards `m_queue_result` |
| `m_cvQuery` | `std::condition_variable` | Wakes the background thread when new queries arrive |
| `m_iMsgCount` | `std::atomic<int>` | Total messages pushed |
| `m_iQueryFinished` | `std::atomic<int>` | Total queries completed |
| `m_iCopiedQuery` | `std::atomic<int>` | Queries copied into the local buffer each cycle |
| `m_ulThreadID` | `std::atomic<unsigned long>` | Background thread OS ID |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Setup` | `host, user, password, db, locale, bNoThread, port` | `bool` | Configures connection parameters and optionally starts the background thread |
| `Setup` | `CAsyncSQL* sql, bNoThread` | `bool` | Shares the connection with another `CAsyncSQL` instance |
| `Connect` | — | `bool` | Opens the MariaDB connection |
| `Quit` | — | `void` | Signals the background thread to stop and joins it |
| `IsConnected` | — | `bool` | Returns `m_bConnected` (acquire ordering) |
| `AsyncQuery` | `const char* c_pszQuery` | `void` | Pushes a fire-and-forget query onto the work queue |
| `ReturnQuery` | `const char* c_pszQuery, void* pvUserData` | `void` | Pushes a query whose result will be returned to the caller via `PopResult` |
| `DirectQuery` | `const char* c_pszQuery` | `std::unique_ptr<SQLMsg>` | Runs a query synchronously on the calling thread and returns the result |
| `PopResult` | `std::unique_ptr<SQLMsg>& p` | `bool` | Non-blocking pop from the result queue; returns false if empty |
| `PopResult` (legacy) | `SQLMsg** pp` | `bool` | Raw-pointer variant for older call sites |
| `PushResult` | `std::unique_ptr<SQLMsg> p` | `void` | (Internal) pushes a result for the main thread |
| `CountQuery` | — | `DWORD` | Number of queries currently in the work queue |
| `CountResult` | — | `DWORD` | Number of results ready to pop |
| `CountQueryFinished` | — | `int` | Total queries finished since last reset |
| `ResetQueryFinished` | — | `void` | Resets the finished counter |
| `EscapeString` | `dst, dstSize, src, srcSize` | `size_t` | Calls `mysql_real_escape_string` |
| `ChildLoop` | — | `void` | Background thread entry point: dequeues, executes, and enqueues results |
| `GetSQLHandle` | — | `MYSQL*` | Returns the raw connection handle |

---

### `CAsyncSQL2` (`AsyncSQL.h`)

Thin subclass of `CAsyncSQL`. Adds `SetLocale(const std::string&)` to override the locale after construction.

---

### `CStmt` (`Statement.h`)

**Purpose:** Wrapper for a MariaDB prepared statement (`MYSQL_STMT`). Provides bind/execute/fetch lifecycle.

#### Member Variables

| Variable | Type | Description |
|----------|------|-------------|
| `m_pkStmt` | `MYSQL_STMT*` | The prepared statement handle |
| `m_stQuery` | `std::string` | The SQL template with `?` placeholders |
| `m_vec_param` | `std::vector<MYSQL_BIND>` | Input parameter bindings |
| `m_vec_result` | `std::vector<MYSQL_BIND>` | Output column bindings |
| `m_uiParamCount` | `unsigned int` | Number of input parameters |
| `m_uiResultCount` | `unsigned int` | Number of output columns |
| `iRows` | `int` | Number of rows returned / affected |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Prepare` | `CAsyncSQL* sql, const char* c_pszQuery` | `bool` | Prepares the statement on the given connection |
| `BindParam` | `enum_field_types type, void* p, int iMaxLen` | `bool` | Binds an input parameter buffer |
| `BindResult` | `enum_field_types type, void* p, int iMaxLen` | `bool` | Binds an output result buffer |
| `Execute` | — | `int` | Executes the statement; returns affected rows |
| `Fetch` | — | `bool` | Fetches the next result row into bound buffers |
| `Error` | `const char* c_pszMsg` | `void` | Logs a prepared-statement error |

---

### `CSemaphore` (`Semaphore.h`)

**Purpose:** Portable counting semaphore (POSIX `sem_t` or Win32 `HANDLE`).

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Initialize` | — | `int` | Creates the semaphore |
| `Wait` | — | `int` | Decrements (blocks if zero) |
| `Release` | `int count = 1` | `int` | Increments by `count` |
| `Destroy` | — | `void` | Destroys the semaphore |
| `Clear` | — | `void` | Alias for `Destroy` |
