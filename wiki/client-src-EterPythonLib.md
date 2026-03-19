# EterPythonLib

> Embedded Python 3.x UI window system providing a hierarchy of C++ window widgets that are created and controlled from Python scripts.

## Overview

EterPythonLib bridges the embedded Python interpreter and the DirectX rendering engine by providing a set of UI widget classes (windows, buttons, text lines, image boxes, etc.) that are instantiated from Python and rendered by C++. The `CWindowManager` singleton drives input dispatch and render ordering. `CPythonGraphic` acts as the rendering front-end for the Python layer, wrapping `CScreen` with interface-specific methods.

## Dependencies

- `EterBase` — utilities, singleton
- `EterLib` — `CScreen`, `CGraphicTextInstance`, `CGraphicImageInstance`, `CGraphicExpandedImageInstance`, `CGraphicMarkInstance`, `CGraphicThingInstance`
- Python 3.x (embedded, static) — `PyObject*` handles used throughout
- `EterGrnLib` — `CGraphicThingInstance` for 3D object rendering in UI

## Files

| File | Purpose |
|------|---------|
| `PythonWindow.h/.cpp` | `UI::CWindow` and all widget subclasses (Box, Bar, Line, Bar3D, TextLine, NumberLine, ImageBox, MarkBox, ExpandedImageBox, AniImageBox, Button, RadioButton, ToggleButton, DragButton) |
| `PythonWindowManager.h/.cpp` | `UI::CWindowManager`: root singleton managing all window instances, input events, rendering, and layer ordering |
| `PythonWindowManagerModule.cpp` | Python C extension module exposing `CWindowManager` to scripts |
| `PythonGraphic.h/.cpp` | `CPythonGraphic`: rendering state management for the Python UI layer |
| `PythonGraphicImageModule.cpp` | Python module for image/texture operations |
| `PythonGraphicModule.cpp` | Python module for core graphic functions |
| `PythonGraphicTextModule.cpp` | Python module for text rendering |
| `PythonGraphicThingModule.cpp` | Python module for 3D thing (Granny2 model) rendering in UI |
| `PythonSlotWindow.h/.cpp` | `UI::CSlotWindow`: inventory-slot widget with item icons and cooldown rendering |
| `PythonGridSlotWindow.h/.cpp` | `UI::CGridSlotWindow`: grid layout of slot windows |

## Classes / Functions

### `UI::CWindow`
**File:** `PythonWindow.h`
**Purpose:** Root widget class. All UI elements inherit from `CWindow`. Maintains parent/child hierarchy, position (relative and absolute RECT), visibility, flags (movable, draggable, float, etc.), and a `PyObject*` handler used for Python callback dispatch.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_strName` | `std::string` | Widget name |
| `m_x`, `m_y` | `long` | Position relative to parent |
| `m_lWidth`, `m_lHeight` | `long` | Widget dimensions |
| `m_rect` | `RECT` | Absolute screen RECT (updated each frame) |
| `m_bShow` | `bool` | Visibility flag |
| `m_dwFlag` | `DWORD` | Bitmask of `EFlags` |
| `m_poHandler` | `PyObject*` | Python handler object (receives callbacks) |
| `m_pParent` | `CWindow*` | Parent widget pointer |
| `m_pChildList` | `TWindowContainer` | Ordered list of child widgets |

#### Key Flags (`EFlags`)
| Flag | Meaning |
|------|---------|
| `FLAG_MOVABLE` | Window can be dragged by the user |
| `FLAG_LIMIT` | Cannot leave screen boundaries |
| `FLAG_FLOAT` | Floats above regular windows in z-order |
| `FLAG_NOT_PICK` | Mouse events pass through this window |
| `FLAG_RTL` | Right-to-left text direction |

#### Methods
| Method | Description |
|--------|-------------|
| `Update()` | Calls `OnUpdate()` then recursively updates children |
| `Render()` | Calls `OnRender()` then recursively renders children |
| `SetPosition(x, y)` | Sets position and propagates rect recalculation |
| `SetSize(w, h)` | Sets widget dimensions |
| `Show()` / `Hide()` | Controls visibility |
| `AddChild(pWin)` | Appends a child window |
| `PickWindow(x, y)` | Returns the deepest child under screen coordinates |
| `IsIn(x, y)` | True if screen coordinate is within this window's RECT |
| `RunKeyDownEvent(key)` | Dispatches a key-down event through the focus chain |
| `OnMouseLeftButtonDown()` | (virtual) Left mouse button down handler |
| `OnMouseRightButtonDown()` | (virtual) Right mouse button down handler |
| `OnKeyDown(key)` | (virtual) Keyboard key-down handler |
| `OnIMEUpdate()` | (virtual) IME composition update handler |

---

### `UI::CTextLine`
**File:** `PythonWindow.h`
**Purpose:** Renders a single- or multi-line text string using a `CGraphicTextInstance`. Supports outline, feather, secret mode (password masking), cursor display, and text selection highlighting.

#### Methods
| Method | Description |
|--------|-------------|
| `SetText(text)` | Sets the displayed text string |
| `SetFontName(name)` | Sets the font (e.g., `"Malgun Gothic:14"`) |
| `SetFontColor(dwColor)` | Sets the text color |
| `SetOutline(bFlag)` | Enables/disables text outline |
| `SetMultiLine(bFlag)` | Allows text to wrap across multiple lines |
| `SetLimitWidth(fWidth)` | Sets the maximum text width before wrapping |
| `ShowCursor()` / `HideCursor()` | Shows/hides the text insertion cursor |
| `SetSelection(start, end)` | Highlights a range of characters |
| `GetTextSize(pW, pH)` | Returns the pixel dimensions of the rendered text |
| `SetBaseDirection(dir)` | Sets BiDi base direction (LTR/RTL) |

---

### `UI::CImageBox`
**File:** `PythonWindow.h`
**Purpose:** Displays a `CGraphicImageInstance` at the window's position.

#### Methods
| Method | Description |
|--------|-------------|
| `LoadImage(filename)` | Loads an image from the pack/disk |
| `SetDiffuseColor(r, g, b, a)` | Applies a tint to the image |
| `GetWidth()` / `GetHeight()` | Returns image dimensions |

---

### `UI::CExpandedImageBox`
**File:** `PythonWindow.h`
**Purpose:** Extends `CImageBox` with scale, origin, rotation, sub-texture UV clipping, and rendering modes (normal, additive, etc.).

#### Methods
| Method | Description |
|--------|-------------|
| `SetScale(fx, fy)` | Sets X and Y scale factors |
| `SetRotation(fRotation)` | Rotates the image in degrees |
| `SetRenderingRect(l, t, r, b)` | Clips the rendered portion of the texture |
| `SetRenderingMode(mode)` | Sets the D3D blend mode |

---

### `UI::CAniImageBox`
**File:** `PythonWindow.h`
**Purpose:** Animates a sequence of images at a configurable frame delay.

#### Methods
| Method | Description |
|--------|-------------|
| `AppendImage(filename)` | Adds a frame to the animation sequence |
| `SetDelay(iDelay)` | Sets the number of update ticks between frame advances |
| `ResetFrame()` | Resets to the first frame |

---

### `UI::CButton`
**File:** `PythonWindow.h`
**Purpose:** Four-state button (up, over, down, disabled) with image visuals for each state.

#### Methods
| Method | Description |
|--------|-------------|
| `SetUpVisual(filename)` | Sets the idle-state image |
| `SetOverVisual(filename)` | Sets the hover-state image |
| `SetDownVisual(filename)` | Sets the pressed-state image |
| `SetDisableVisual(filename)` | Sets the disabled-state image |
| `Enable()` / `Disable()` | Enables or disables the button |
| `Flash()` | Triggers a flash animation |
| `IsPressed()` | Returns true if button is currently held down |

---

### `UI::CToggleButton`
**File:** `PythonWindow.h`
**Purpose:** A button that stays in the "down" state when clicked and returns to "up" when clicked again.

---

### `UI::CDragButton`
**File:** `PythonWindow.h`
**Purpose:** A button that also acts as a draggable handle, constrained to a specified area.

#### Methods
| Method | Description |
|--------|-------------|
| `SetRestrictMovementArea(x, y, w, h)` | Constrains the button's drag area |

---

### `UI::CWindowManager`
**File:** `PythonWindowManager.h`
**Purpose:** Singleton managing all UI windows. Routes mouse and keyboard events to the correct window, manages the focus stack, provides layer ordering, and calls Update/Render on all registered windows each frame.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_pActiveWindow` | `CWindow*` | Currently focused window |
| `m_pLockWindow` | `CWindow*` | Window that has exclusive input capture |
| `m_pPointWindow` | `CWindow*` | Window currently under the mouse cursor |
| `m_LayerWindowMap` | `TLayerContainer` | Named layer root windows |
| `m_lMouseX`, `m_lMouseY` | `long` | Current mouse position |

#### Methods
| Method | Description |
|--------|-------------|
| `RegisterWindow(po, layer)` | Creates a base `CWindow` and adds it to the named layer |
| `RegisterTextLine(po, layer)` | Creates a `CTextLine` widget |
| `RegisterImageBox(po, layer)` | Creates an `CImageBox` widget |
| `RegisterButton(po, layer)` | Creates a `CButton` widget |
| `DestroyWindow(pWin)` | Schedules a window for deletion |
| `Update()` | Updates all active windows in layer order |
| `Render()` | Renders all visible windows in layer order |
| `RunMouseLeftButtonDown(x, y)` | Dispatches left-click to the top-most window under cursor |
| `RunKeyDown(vkey)` | Dispatches key-down to the focused window |
| `LockWindow(pWin)` | Gives a window exclusive input capture |
| `SetTop(pWin)` | Brings a window to the top of its layer |
| `AttachIcon(type, index, slot, w, h)` | Attaches a dragged item icon to the cursor |

---

### `CPythonGraphic`
**File:** `PythonGraphic.h`
**Purpose:** Singleton rendering bridge between Python scripts and the D3D engine. Inherits `CScreen` to access primitive rendering, and exposes utility render methods for Python UI rendering (images, cool-time boxes, screen shots, gamma).

#### Methods
| Method | Description |
|--------|-------------|
| `SetInterfaceRenderState()` | Sets D3D state for 2D UI rendering |
| `SetGameRenderState()` | Restores D3D state for 3D game rendering |
| `PushState()` / `PopState()` | Saves/restores the view and projection matrices |
| `SetViewport(fx, fy, w, h)` | Changes the D3D viewport for sub-area rendering |
| `RestoreViewport()` | Restores the previous viewport |
| `RenderImage(pInst, x, y)` | Renders an image instance at screen coordinates |
| `RenderCoolTimeBox(cx, cy, r, t)` | Renders a cooldown radial sweep over a box |
| `SaveScreenShot(filename)` | Saves the current back buffer as a JPEG file |
| `SetGamma(fFactor)` | Sets the display gamma correction value |
| `GenerateColor(r, g, b, a)` | Returns a packed DWORD color |
