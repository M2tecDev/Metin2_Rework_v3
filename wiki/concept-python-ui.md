# Why Python for the UI? — Understanding the Client UI Architecture

> **Who is this for:** A developer modifying or building client-side UI windows, buttons, or layouts.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — understand the client/server split before reading about the UI layer.
> **What you will learn:** Why Python is used for the UI, how Python and C++ communicate, the difference between root/ and uiscript/ files, how the widget system works, and why you must repack after every edit.

## Overview

Almost all of the visible UI in the Metin2 client — windows, buttons, chat boxes, inventory slots, minimap, quest windows — is controlled by Python scripts. When you click a button, Python code runs. When a window opens, Python creates it. The C++ engine provides the raw tools; Python decides how to use them. This page explains how that relationship works.

---

## Why Python?

The answer is **iteration speed**.

Building and modifying UI in C++ means: change the code, recompile the entire client (minutes), restart, test. If you need to move a button 10 pixels to the right, that is a multi-minute cycle per change.

With Python: change the script, repack the assets (seconds), restart the client, test. UI designers with no C++ knowledge can modify layouts. Quest writers can add UI elements to new quests without touching compiled code.

The trade-off is performance — Python is slower than C++ for compute-intensive work — but UI code is event-driven and rarely performance-critical. The C++ engine handles rendering; Python only handles *when* and *how* UI elements should be shown or hidden.

---

## The Architecture

```
┌────────────────────────────────────────────────────┐
│  Metin2.exe starts                                 │
│         │                                          │
│         ▼                                          │
│  EterPythonLib loads CPython 2.7 interpreter       │
│  (embedded inside the executable)                  │
│         │                                          │
│         ▼                                          │
│  C++ registers its modules into Python:            │
│    import net    → network send/receive            │
│    import player → local player data               │
│    import item   → item data lookups               │
│    import chr    → character data                  │
│    import wndMgr → window manager                  │
│    import grp    → 2D graphics primitives          │
│    import app    → application control             │
│    import ui     → widget base classes             │
│    ... (and more)                                  │
│         │                                          │
│         ▼                                          │
│  Python interpreter runs root/game.py              │
│         │                                          │
│         ▼                                          │
│  game.py creates all UI windows, registers         │
│  event handlers, and enters the main loop          │
└────────────────────────────────────────────────────┘
```

From this point on, all UI is Python. C++ renders what Python tells it to render, using the registered module functions.

---

## How Python Talks to C++

It is not magic. The C++ code explicitly registers functions into the Python interpreter using the Python C API.

**Analogy:** C++ builds a toolbox and puts labelled tools in it. Python opens the toolbox and picks up tools by name.

For example, when Python calls `net.SendAttackPacket(vid, type)`, what actually happens is:
1. Python looks up `SendAttackPacket` in the `net` module's function table
2. C++ function `CNetworkStream::SendAttackPacket` is called with the Python arguments
3. C++ serialises the packet and sends it over TCP
4. Control returns to Python

Python never touches the network directly. It calls a C++ function that does.

**Key module responsibilities:**

| Module | What it exposes |
|--------|----------------|
| `net` | Send packets to the server, connection state |
| `player` | Local player stats, inventory, position |
| `item` | Item data lookups by vnum (name, icon, type) |
| `chr` | Character data for other entities on screen |
| `wndMgr` | Create, destroy, and position UI windows |
| `grp` | Draw 2D primitives (lines, rectangles, text) |
| `app` | Application-level: FPS, time, screen resolution |
| `ui` | Base Python widget classes that wrap C++ handles |

---

## Two Types of UI Files

UI files are split into two categories with different purposes:

```
client-bin/
├── root/                    ← LOGIC
│   ├── uiinventory.py       What happens when you click
│   ├── uiChat.py            How chat input is processed
│   ├── uiShop.py            Buy/sell interactions
│   └── ...
└── uiscript/
    └── uiscript/            ← LAYOUT
        ├── inventory.py     Where the inventory window is on screen
        ├── chat.py          Size and position of the chat box
        └── ...
```

| File type | Location | Purpose | What it contains |
|-----------|----------|---------|-----------------|
| Logic | `root/*.py` | Event handlers, data binding, business logic | Python classes with `OnUpdate`, `OnKeyDown`, `Open`, `Close` methods |
| Layout | `uiscript/uiscript/*.py` | Window layout declarations | Python dicts describing window type, position, size, children |

**Why the separation?** Logic files change often (adding features, fixing bugs). Layout files change less often (repositioning UI elements). Keeping them separate means you can update layout without touching logic and vice versa.

---

## The Widget System

Every button, window, text label, image, and progress bar in the UI is a C++ object (created by `wndMgr`) with an integer handle.

Python holds those handles as member variables but never creates the underlying C++ objects directly. When Python calls `self.btn = ui.Button()`, C++ allocates a button object and returns a handle. Python stores the handle.

**Analogy:** Python has the TV remote. C++ is the TV. Python presses buttons on the remote (calls functions) and the TV responds — but Python cannot reach inside the TV.

When Python calls `self.btn.Show()`, it calls a C++ function via the handle, which makes the C++ button object visible. Python has no direct access to the button's internal state or rendering.

---

## How Changes Become Active

Python files are not read directly from disk by the running client. They are **packed** into encrypted `.eix`/`.epk` archive files.

```
Edit file               python pack.py              Client reads
root/uiShop.py   ──────────────────────►   pack/uiscript.eix
                                                    pack/uiscript.epk

                     (re-creates all pack files)
```

**The consequences:**
1. If you edit `root/uiShop.py` and restart the client without repacking, the client reads the old version from the existing pack files. Your change has no effect.
2. After repacking, you must restart the client — it does not hot-reload Python files.
3. `serverinfo.py` (which sets the server IP) is also a Python file — it also requires repacking after changes.

**Rule:** Edit → pack → restart. In that order. Every time.

---

## Where to Start If You Want to Change the UI

| Goal | Where to look |
|------|--------------|
| Move or resize a window | `uiscript/uiscript/<windowname>.py` — find the `x`, `y`, `width`, `height` values |
| Add a new button to an existing window | `uiscript/uiscript/<windowname>.py` (add layout entry) + `root/<windowlogic>.py` (add handler) |
| Change what happens when a button is clicked | `root/<windowlogic>.py` — find the `OnClick` or event handler method |
| Add a completely new window | Create both a new `uiscript/uiscript/mywindow.py` and `root/uimywindow.py` |
| Change the chat system | `root/uiChat.py` (logic) + `uiscript/uiscript/chat.py` (layout) |

For packing and deploying changes, see [guide-Asset-Pipeline](guide-Asset-Pipeline).

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Editing a .py file but not repacking | Old behaviour persists; change has no effect | Run `pack.py` after every edit |
| Repacking but not restarting the client | Still sees old behaviour | Kill and relaunch the client |
| Editing the layout file for an event handler | Nothing happens on click — event handler is in the logic file | Layout files define position/size; logic files define behaviour |
| Calling a C++ module function with wrong argument type | `TypeError: argument 1 must be int, not str` in `syserr.txt` | Check the expected argument types for each module function |
| Assuming Python reads files directly from disk | Edit works in some runs, not others | Python always reads from the pack — always repack |

---

## Next Steps

- [UI Python Blueprint](blueprint-UI-Python-System) — deep-dive into CPython embedding, module table, widget hierarchy
- [UI Python Topic Guide](topic-UI-Python-System) — cross-cutting explanation tracing a UI action to the server
- [Asset Pipeline](guide-Asset-Pipeline) — full details on packing, pack structure, and `.eix`/`.epk` format
