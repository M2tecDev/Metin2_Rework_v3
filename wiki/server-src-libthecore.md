# server-src-libthecore

> Foundational C library providing the event loop, heartbeat timer, async socket I/O, file descriptor watching, logging, and miscellaneous utilities used by all server processes.

## Overview

`libthecore` is the lowest-level building block of the server stack. It is a C-oriented (with a small amount of C++) static library that wraps platform socket APIs behind a portable abstraction, implements a single-threaded pulse-based event loop (the "heart"), and provides the `fdwatch` I/O multiplexer. Every server process (`game`, `db`) links against `libthecore` and calls `thecore_init` / `thecore_idle` to drive the main loop.

## Architecture / Process Role

`libthecore` does not run as its own process. It is linked into `game` and `db` and provides:

1. **Main loop** — `thecore_idle()` blocks until the next heartbeat pulse, calls user-supplied `HEARTFUNC` callbacks, and processes all pending I/O events.
2. **fdwatch** — an I/O multiplexer backed by `kqueue` (FreeBSD/macOS) or `select` (Windows/Linux fallback).
3. **Socket helpers** — thin wrappers around `accept`, `connect`, `read`, `write`, `close`, and socket option setters.
4. **RingBuffer** — a modern C++ growable circular byte buffer used for per-connection I/O staging.
5. **Logging** — `sys_log` / `sys_err` macros backed by the spdlog-based `log.cpp`, with log rotation via `syslog_rotate_sink.h`.
6. **Utilities** — random numbers, time helpers, string utilities, Korean encoding tables.

## Dependencies

- Standard POSIX socket API or `ws2_32` on Windows.
- C++20 standard library (for `<atomic>`, `<source_location>`).
- No external third-party libraries.

## Files

| File | Purpose |
|------|---------|
| `main.h` / `main.cpp` | `thecore_init`, `thecore_idle`, `thecore_shutdown`, `thecore_destroy`, `thecore_pulse`, `thecore_time` |
| `heart.h` / `heart.cpp` | `HEART` struct and heartbeat timing: `heart_new`, `heart_idle`, `heart_beat` |
| `fdwatch.h` / `fdwatch.cpp` | File-descriptor watch multiplexer (`kqueue` or `select`) |
| `socket.h` / `socket.cpp` | TCP socket helpers: bind, accept, connect, read, write, option setters |
| `ring_buffer.h` | `RingBuffer` — growable linear-address byte buffer for network I/O |
| `log.h` / `log.cpp` | `sys_log(level, fmt, ...)` / `sys_err(fmt, ...)` logging macros |
| `syslog_rotate_sink.h` | spdlog-compatible daily-rotating file sink |
| `utils.h` / `utils.cpp` | Utility functions: `number()`, `get_dword_time()`, `parse_token()`, memory macros |
| `signal.h` / `signal.cpp` | POSIX signal handling bootstrap |
| `memcpy.h` / `memcpy.cpp` | Platform-optimised `memcpy` wrapper |
| `hangul.h` / `hangul.cpp` | Korean Hangul character encoding utilities |
| `kstbl.h` / `kstbl.cpp` | Korean–English character translation table |
| `xdirent.h` / `xdirent.cpp` | Portable directory-entry iteration (`opendir`/`readdir` wrapper) |
| `xgetopt.h` / `xgetopt.cpp` | Portable `getopt` for command-line argument parsing |
| `typedef.h` | Fundamental type aliases (`BYTE`, `WORD`, `DWORD`, `socket_t`, etc.) |
| `stdafx.h` | Precompiled-header umbrella for the library |

## Classes / Functions

### `HEART` / Heartbeat (`heart.h`)

**Purpose:** Tracks elapsed wall-clock time and delivers periodic "pulse" ticks to the main loop callback.

#### Fields

| Field | Type | Description |
|-------|------|-------------|
| `func` | `HEARTFUNC` | Callback invoked each pulse: `void func(LPHEART, int pulse)` |
| `passes_per_sec` | `int` | Pulse rate (ticks per second), derived from `opt_usec` |
| `pulse` | `int` | Monotonically increasing tick counter |
| `before_sleep` | `struct timeval` | Timestamp before the last `select`/`kevent` wait |
| `opt_time` | `struct timeval` | Target interval between heartbeats |
| `last_time` | `struct timeval` | Timestamp of the last heartbeat |

#### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `heart_new` | `int opt_usec, HEARTFUNC func` | `LPHEART` | Allocates and initialises a new heart |
| `heart_delete` | `LPHEART ht` | `void` | Frees a heart |
| `heart_idle` | `LPHEART ht` | `int` | Returns how many pulses have elapsed; used by main loop |
| `heart_beat` | `LPHEART ht, int pulses` | `void` | Advances pulse counter and calls `func` |

---

### `thecore` Main Loop (`main.h`)

**Purpose:** Bootstraps the server event loop, owns the global `HEART`, and drives all I/O and heartbeat callbacks.

#### Global State

| Symbol | Type | Description |
|--------|------|-------------|
| `thecore_heart` | `LPHEART` | The global heartbeat instance |
| `tics` | `std::atomic<int>` | Millisecond tick counter |
| `shutdowned` | `std::atomic<int>` | Non-zero when shutdown is requested |
| `thecore_profiler[NUM_PF]` | `unsigned int[]` | Cycle counters: `PF_IDLE`, `PF_HEARTBEAT` |

#### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `thecore_init` | `int fps, HEARTFUNC heartbeat_func` | `int` | Initialises the event loop at the specified pulse rate; returns 0 on failure |
| `thecore_idle` | — | `int` | Processes one round of I/O events; returns 0 to continue, non-zero to exit |
| `thecore_shutdown` | — | `void` | Requests graceful shutdown |
| `thecore_destroy` | — | `void` | Frees all thecore resources |
| `thecore_pulse` | — | `int` | Returns the current pulse counter value |
| `thecore_time` | — | `float` | Returns elapsed time in seconds |
| `thecore_pulse_per_second` | — | `float` | Returns configured pulses per second |
| `thecore_is_shutdowned` | — | `int` | Non-zero if shutdown was requested |
| `thecore_tick` | — | `void` | Increments `tics` by one millisecond |

---

### `FDWATCH` / I/O Multiplexer (`fdwatch.h`)

**Purpose:** Abstracts `kqueue` (BSD/macOS) or `select` (Windows/Linux) behind a unified API for monitoring socket read/write readiness.

Two compile-time backends:
- **kqueue backend** (default on FreeBSD/macOS): stores a `kqueue` fd plus `kevent` arrays.
- **select backend** (Windows, defined by `__USE_SELECT__`): stores `fd_set` pairs and a flat socket array.

#### Event Flags

| Flag | Value | Meaning |
|------|-------|---------|
| `FDW_NONE` | 0 | No events |
| `FDW_READ` | 1 | Readable |
| `FDW_WRITE` | 2 | Writable |
| `FDW_WRITE_ONESHOT` | 4 | Write once then remove |
| `FDW_EOF` | 8 | Connection closed by peer |

#### Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `fdwatch_new` | `int nfiles` | `LPFDWATCH` | Allocates a watcher for up to `nfiles` fds |
| `fdwatch_delete` | `LPFDWATCH fdw` | `void` | Frees the watcher |
| `fdwatch_add_fd` | `fdw, fd, client_data, rw, oneshot` | `void` | Registers `fd` for `rw` events; associates arbitrary `client_data` pointer |
| `fdwatch_del_fd` | `LPFDWATCH fdw, socket_t fd` | `void` | Removes `fd` from the watcher |
| `fdwatch_clear_fd` | `LPFDWATCH fdw, socket_t fd` | `void` | Clears all pending events for `fd` |
| `fdwatch` | `LPFDWATCH fdw, struct timeval *timeout` | `int` | Waits for events; returns count of ready fds |
| `fdwatch_check_event` | `fdw, fd, event_idx` | `int` | Checks if `fd` has a specific event |
| `fdwatch_clear_event` | `fdw, fd, event_idx` | `void` | Clears an event flag for `fd` |
| `fdwatch_get_client_data` | `fdw, event_idx` | `void *` | Returns the `client_data` registered for a ready fd |
| `fdwatch_get_ident` | `fdw, event_idx` | `int` | Returns the fd for the nth ready event |
| `fdwatch_get_buffer_size` | `fdw, fd` | `int` | Returns pending kernel buffer size for `fd` |
| `fdwatch_check_fd` | `fdw, fd` | `int` | True if `fd` is registered |

---

### `RingBuffer` (`ring_buffer.h`)

**Purpose:** Growable byte buffer for staging network send/receive data without unnecessary copies. Non-copyable, movable.

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `Write` | `const void* data, size_t len` | `void` | Appends bytes; grows the buffer if needed |
| `WritePtr` | — | `uint8_t*` | Direct pointer to the next write position (for `recv()`) |
| `CommitWrite` | `size_t len` | `void` | Advances write position after a direct write |
| `Read` | `void* dest, size_t len` | `bool` | Copies and consumes `len` bytes; returns false if insufficient data |
| `Peek` | `void* dest, size_t len` | `bool` | Copies without consuming |
| `PeekAt` | `size_t offset, void* dest, size_t len` | `bool` | Copies from an arbitrary offset without consuming |
| `Discard` | `size_t len` | `bool` | Advances read position without copying |
| `ReadPtr` | — | `const uint8_t*` | Direct pointer to the next readable byte |
| `ReadableBytes` | — | `size_t` | Unread byte count |
| `WritableBytes` | — | `size_t` | Free space before the end of the backing vector |
| `EnsureWritable` | `size_t len` | `void` | Guarantees at least `len` writable bytes (compacts or grows) |
| `Compact` | — | `void` | Moves unread data to index 0 |
| `Reserve` | `size_t capacity` | `void` | Pre-allocates at least `capacity` bytes |
| `Clear` | — | `void` | Resets read and write positions to 0 |
| `DataAt` | `size_t pos` | `uint8_t*` | Writable pointer at an absolute offset (used for in-place encryption) |

---

### Socket Helpers (`socket.h`)

Thin wrappers over POSIX / WinSock.

| Function | Description |
|----------|-------------|
| `socket_tcp_bind(ip, port)` | Creates, binds, and listens on a TCP socket; returns the listening fd |
| `socket_accept(s, peer)` | Accepts an incoming connection |
| `socket_connect(host, port)` | Initiates a TCP connection |
| `socket_close(s)` | Closes a socket |
| `socket_read(desc, buf, len)` | Non-blocking read; returns bytes read or -1 |
| `socket_write(desc, data, len)` | Writes `len` bytes; returns bytes written or -1 |
| `socket_nonblock(s)` | Sets `O_NONBLOCK` / `FIONBIO` |
| `socket_block(s)` | Clears non-blocking mode |
| `socket_nodelay(s)` | Sets `TCP_NODELAY` |
| `socket_lingeroff(s)` | Disables `SO_LINGER` |
| `socket_lingeron(s)` | Enables `SO_LINGER` |
| `socket_sndbuf(s, opt)` | Sets `SO_SNDBUF` |
| `socket_rcvbuf(s, opt)` | Sets `SO_RCVBUF` |

---

### Utility Functions (`utils.h`)

| Function / Macro | Description |
|-----------------|-------------|
| `number(from, to)` | Returns a random integer in `[from, to]` (inclusive); macro that calls `number_ex` with `__FILE__`/`__LINE__` |
| `fnumber(from, to)` | Returns a random float in `[from, to]` |
| `gauss_random(avg, sigma)` | Gaussian-distributed random float |
| `get_dword_time()` | Returns current time as milliseconds (`DWORD`) |
| `get_float_time()` | Returns current time as a float (seconds) |
| `parse_token(src, token, value)` | Splits `"key value"` lines for config parsing |
| `trim_and_lower(src, dest, size)` | Trims whitespace and lowercases into `dest` |
| `MINMAX(min, value, max)` | Clamps `value` to `[min, max]` |
| `timediff(a, b)` | Returns `a - b` as a `struct timeval` |
| `timeadd(a, b)` | Returns `a + b` as a `struct timeval` |
| `core_dump()` | Logs a stack trace / core-dump notice |
| `CREATE(result, type, number)` | Safe `calloc` macro; aborts on OOM |
| `RECREATE(result, type, number)` | Safe `realloc` macro; aborts on OOM |

---

### Logging (`log.h`)

| Macro / Function | Description |
|-----------------|-------------|
| `sys_log(level, fmt, ...)` | Logs a message at `level` (0 = most verbose) |
| `sys_err(fmt, ...)` | Logs an error with source location (`std::source_location`) |
| `log_init()` | Initialises the spdlog logger (rotating file sink) |
| `log_destroy()` | Flushes and closes the logger |
