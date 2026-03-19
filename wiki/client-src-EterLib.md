# EterLib

> Core graphics engine library providing the DirectX 9 rendering pipeline, window management, camera system, resource management, networking primitives, and font/text rendering.

## Overview

EterLib is the central engine library of the client. It wraps DirectX 9 (Direct3D 9Ex), manages the Windows application lifecycle, provides a full scene rendering pipeline, and implements a reference-counted resource management system with background thread loading. It also provides the TCP network stream, font rasterization via FreeType 2, and the D3D render-state manager. All game libraries build on top of EterLib.

## Dependencies

- `EterBase` — singleton template, file I/O, timer, utilities
- DirectX 9 (d3d9, d3dx9) — rendering
- FreeType 2 — font glyph rasterization

## Files

| File | Purpose |
|------|---------|
| `GrpBase.h/.cpp` | Shared base class `CGraphicBase`: vertex type definitions, matrix stack, camera modes, screen effects, D3D state |
| `GrpDevice.h/.cpp` | `CGraphicDevice`: D3D9Ex device creation, reset, back-buffer management |
| `GrpScreen.h/.cpp` | `CScreen`: 2D/3D primitive rendering, frustum management, cursor picking |
| `GrpObjectInstance.h/.cpp` | `CGraphicObjectInstance`: base for all world objects with transform, collision, and height data |
| `GrpTexture.h/.cpp` | `CGraphicTexture`: wraps `IDirect3DTexture9` |
| `GrpImageTexture.h/.cpp` | Image-derived texture loaded from file data |
| `GrpImage.h/.cpp` | `CGraphicImage`: resource subclass wrapping a 2D texture |
| `GrpImageInstance.h/.cpp` | `CGraphicImageInstance`: renderable image instance |
| `GrpExpandedImageInstance.h/.cpp` | Image instance with scale, rotation, and UV-clip support |
| `GrpFontTexture.h/.cpp` | `CGraphicFontTexture`: FreeType glyph atlas texture, per-character UV mapping |
| `GrpText.h/.cpp` | `CGraphicText`: text layout resource |
| `GrpTextInstance.h/.cpp` | `CGraphicTextInstance`: renderable text with font, color, outline, alignment |
| `GrpMarkInstance.h/.cpp` | Guild mark rendering |
| `GrpVertexBuffer.h/.cpp` | Static D3D vertex buffer wrapper |
| `GrpVertexBufferDynamic.h/.cpp` | Dynamic (write-discard) D3D vertex buffer |
| `GrpVertexBufferStatic.h/.cpp` | Static D3D vertex buffer |
| `GrpIndexBuffer.h/.cpp` | D3D index buffer wrapper |
| `GrpVertexShader.h/.cpp` | Vertex shader wrapper |
| `GrpPixelShader.h/.cpp` | Pixel shader wrapper |
| `GrpD3DXBuffer.h/.cpp` | Wraps `ID3DXBuffer` |
| `GrpDIB.h/.cpp` | Device-independent bitmap for CPU-side pixel access |
| `GrpCollisionObject.h/.cpp` | `CGraphicCollisionObject`: adds sphere/ray collision to screen |
| `GrpColorInstance.h/.cpp` | `CGraphicColorInstance`: color animation on objects |
| `GrpColor.h/.cpp` | Color helpers |
| `GrpSubImage.h/.cpp` | Sub-rectangle of a larger texture |
| `GrpRatioInstance.h/.cpp` | Image instance with aspect-ratio scaling |
| `GrpShadowTexture.h/.cpp` | Shadow map render target |
| `GrpMath.h/.cpp` | Matrix and vector math helpers |
| `GrpLightManager.h/.cpp` | D3D light management |
| `StateManager.h/.cpp` | `CStateManager`: cached D3D render/texture state manager (NVIDIA-origin) |
| `Camera.h/.cpp` | `CCamera`, `CCameraManager`: first/third-person camera with collision avoidance |
| `SkyBox.h/.cpp` | `CSkyBox`, `CSkyObject`: multi-face sky with gradient colors and cloud layer |
| `Resource.h/.cpp` | `CResource`: abstract base for all managed assets |
| `ResourceManager.h/.cpp` | `CResourceManager`: singleton managing load/cache/unload of all resources |
| `ReferenceObject.h/.cpp` | Reference-counted base (`CReferenceObject`) |
| `FontManager.h/.cpp` | `CFontManager`: FreeType library singleton; loads `.ttf` files and creates `FT_Face` |
| `NetDevice.h/.cpp` | `CNetworkDevice`: WSAStartup/WSACleanup wrapper |
| `NetStream.h/.cpp` | `CNetworkStream`: TCP socket with ring buffers and XChaCha20 cipher integration |
| `NetAddress.h/.cpp` | `CNetworkAddress`: host:port address helper |
| `NetPacketHeaderMap.h/.cpp` | Maps packet header IDs to expected sizes |
| `PacketReader.h` | Inline helpers for reading structured packets |
| `PacketWriter.h` | Inline helpers for writing structured packets |
| `RingBuffer.h` | Lock-free ring buffer for send/receive queues |
| `MSApplication.h/.cpp` | `CMSApplication`: Win32 message loop and application lifecycle |
| `MSWindow.h/.cpp` | `CMSWindow`: Win32 window creation and `WndProc` dispatch |
| `Input.h/.cpp` | Keyboard/mouse input state |
| `IME.h/.cpp` | Input Method Editor (IME) support for CJK text input |
| `CullingManager.h/.cpp` | Frustum culling registration and testing |
| `EnvironmentMap.h/.cpp` | Cube/sphere environment map rendering |
| `Decal.h/.cpp` | Projected decal rendering |
| `LensFlare.h/.cpp` | Lens flare effect |
| `ScreenFilter.h/.cpp` | Full-screen post-process color filter |
| `AttributeData.h/.cpp` | Attribute (walkable/collision) map data |
| `AttributeInstance.h/.cpp` | Instanced attribute data for a world object |
| `CollisionData.h/.cpp` | Static collision shape data (spheres, cylinders, etc.) |
| `FileLoaderThread.h/.cpp` | Background file loading thread |
| `GameThreadPool.h/.cpp` | Thread pool for async game tasks |
| `ImageDecoder.h/.cpp` | Decodes image data from pack buffers into D3D textures |
| `TextBar.h/.cpp` | Simple text bar UI element |
| `DibBar.h/.cpp` | Bar drawn using a DIB |
| `TextFileLoader.h/.cpp` | `CTextFileLoader`: hierarchical text file parser with group/token navigation |
| `TextTag.h/.cpp` | Parses inline text tags (color, hyperlinks) from chat strings |
| `TextureCache.h/.cpp` | Texture reference caching to avoid re-creation |
| `PathStack.h/.cpp` | Stack-based file path resolution |
| `BlockTexture.h/.cpp` | Block-tiled texture atlas |
| `BufferPool.h/.cpp` | Memory pool for network/file buffers |
| `ColorTransitionHelper.h/.cpp` | Interpolated RGBA color transitions |
| `Mutex.h/.cpp` | RAII Win32 mutex wrapper |
| `Thread.h/.cpp` | Base class for Win32 threads |
| `Util.h/.cpp` | Additional EterLib-specific utility functions |
| `JpegFile.h/.cpp` | JPEG file loader |
| `parser.h/.cpp` | Simple token parser |
| `lineintersect_utils.h/.cpp` | Line segment intersection math |
| `Pool.h` | `CDynamicPool<T>`: pooled object allocator |
| `Ref.h` | Smart reference wrapper `CRef<T>` |
| `Ray.h` | `CRay`: 3D ray for picking and collision |
| `Event.h` | Game event type definitions |
| `FuncObject.h` | Callable function-object helpers |
| `ControlPackets.h` | Control-plane packet type definitions for key exchange |
| `SPSCQueue.h` | Single-producer single-consumer lock-free queue |
| `Profiler.h` | Frame-time profiler |
| `DecodedImageData.h` | Struct holding decoded image pixel data |

## Classes / Functions

### `CGraphicBase`
**File:** `GrpBase.h`
**Purpose:** Abstract root for all graphic classes. Holds all shared D3D9 objects (device, matrix stack, viewport, etc.) as static members, providing a single point of access across the entire render hierarchy.

#### Member Variables (static)
| Variable | Type | Description |
|----------|------|-------------|
| `ms_lpd3d` | `LPDIRECT3D9EX` | Direct3D9 interface |
| `ms_lpd3dDevice` | `LPDIRECT3DDEVICE9EX` | Active D3D9Ex device |
| `ms_lpd3dMatStack` | `ID3DXMatrixStack*` | World-matrix transformation stack |
| `ms_matView` | `D3DXMATRIX` | Current view matrix |
| `ms_matProj` | `D3DXMATRIX` | Current projection matrix |
| `ms_matWorld` | `D3DXMATRIX` | Current world matrix |
| `ms_iWidth`, `ms_iHeight` | `int` | Back-buffer dimensions |
| `ms_fFieldOfView` | `float` | Current field of view in radians |
| `ms_fNearY`, `ms_fFarY` | `float` | Near and far clip plane distances |
| `ms_alpd3dDefIB[]` | `LPDIRECT3DINDEXBUFFER9[]` | Default index buffers for common primitive types |
| `ms_alpd3dPDTVB[]` | `LPDIRECT3DVERTEXBUFFER9[]` | Dynamic PDT vertex buffers |

#### Methods
| Method | Description |
|--------|-------------|
| `SetPerspective(fov, aspect, near, far)` | Sets up perspective projection |
| `SetOrtho2D(hres, vres, zres)` | Sets up 2D orthographic projection |
| `SetAroundCamera(dist, pitch, roll, z)` | Positions camera orbiting a target point |
| `SetPositionCamera(x, y, z, dist, pitch, rot)` | Positions camera at world coordinates |
| `PushMatrix()` / `PopMatrix()` | Push/pop the world matrix stack |
| `Translate/Rotate/Scale(...)` | Applies transforms to the current matrix |
| `SetScreenEffectWaving(time, power)` | Activates a screen-waving distortion effect |
| `SetScreenEffectFlashing(time, color)` | Activates a screen-flash overlay |
| `SetDefaultIndexBuffer(eDefIB)` | Binds one of the default index buffers |
| `SetPDTStream(vertices, count)` | Uploads PDT vertices to the dynamic vertex buffer |

---

### `CGraphicDevice`
**File:** `GrpDevice.h`
**Purpose:** Manages creation and reset of the Direct3D 9Ex device. Inherits from `CGraphicBase`.

#### Methods
| Method | Description |
|--------|-------------|
| `Create(hWnd, hres, vres, windowed, bit, rate)` | Creates the D3D9Ex device and all default resources; returns a bitmask of `ECreateReturnValues` |
| `GetDeviceState()` | Returns current device state (`OK`, `BROKEN`, `NEEDS_RESET`, `NULL`) |
| `Reset()` | Resets the device after a lost-device event |
| `ResizeBackBuffer(w, h)` | Resizes the swap chain back buffer |
| `InitBackBufferCount(n)` | Sets the number of back buffers before device creation |

---

### `CScreen`
**File:** `GrpScreen.h`
**Purpose:** Extends `CGraphicCollisionObject` with 2D/3D primitive rendering, picking-ray management, and frustum access.

#### Methods
| Method | Description |
|--------|-------------|
| `Begin()` / `End()` | Begin/end the Direct3D scene |
| `Clear()` / `ClearDepthBuffer()` | Clear color and depth targets |
| `Show(hWnd)` | Presents the back buffer |
| `RenderLine2d/3d(...)` | Draws a 2D or 3D line segment |
| `RenderBar2d/3d(...)` | Draws a filled 2D or 3D bar (rectangle) |
| `RenderBox2d/3d(...)` | Draws a wire-frame 2D or 3D box |
| `RenderGradationBar2d/3d(...)` | Draws a gradient-filled bar |
| `RenderCircle2d/3d(...)` | Draws a 2D or 3D circle |
| `RenderSphere(...)` | Renders a solid or wire sphere |
| `RenderCylinder(...)` | Renders a solid or wire cylinder |
| `SetCursorPosition(x, y, hres, vres)` | Updates the picking ray from screen cursor coordinates |
| `GetPickingPosition(t, x, y, z)` | Returns the world-space point along the picking ray at parameter `t` |
| `ProjectPosition(x,y,z, pfX,pfY)` | Projects a 3D world position to 2D screen coordinates |
| `BuildViewFrustum()` | Rebuilds the frustum planes from the current view/proj matrices |
| `GetFrustum()` | Returns the static `Frustum` object |

---

### `CGraphicObjectInstance`
**File:** `GrpObjectInstance.h`
**Purpose:** Abstract base for all renderable world objects. Manages position, rotation, scale, bounding box, collision, height query, and frustum culling.

#### Methods (key)
| Method | Description |
|--------|-------------|
| `SetPosition(x, y, z)` | Sets world position |
| `SetRotation(yaw, pitch, roll)` | Sets Euler rotation angles |
| `Update()` / `Render()` | Per-frame update and render dispatch |
| `Show()` / `Hide()` | Controls visibility |
| `isIntersect(ray, u, v, t)` | Ray-vs-object intersection test |
| `AddCollision(pData, pMat)` | Adds a static collision shape |
| `CollisionDynamicSphere(s)` | Tests collision against a dynamic sphere |
| `GetObjectHeight(x, y, pfH)` | Queries height at 2D world position |

---

### `CGraphicTexture`
**File:** `GrpTexture.h`
**Purpose:** Base wrapper for `IDirect3DTexture9`. Stores width, height, and the D3D texture pointer.

---

### `CGraphicFontTexture`
**File:** `GrpFontTexture.h`
**Purpose:** Maintains a FreeType-rasterized glyph atlas as one or more `CGraphicImageTexture` pages, providing UV coordinates for each Unicode character.

#### Methods
| Method | Description |
|--------|-------------|
| `Create(fontName, size, italic)` | Creates the FT_Face and initializes the atlas |
| `GetCharacterInfomation(keyValue)` | Returns UV and metrics for a wide character |
| `UpdateCharacterInfomation(key)` | Rasterizes a new glyph into the atlas |
| `GetKerning(prev, cur)` | Returns kerning advance between two characters |
| `UpdateTexture()` | Uploads dirty atlas changes to the D3D texture |

---

### `CStateManager`
**File:** `StateManager.h`
**Purpose:** Singleton D3D render-state manager (originally from NVIDIA). Caches all render states, texture stage states, sampler states, transform matrices, shaders, streams, and index buffers. Reduces redundant API calls by only flushing state changes that actually differ from the current device state.

#### Methods (key)
| Method | Description |
|--------|-------------|
| `SetRenderState(type, value)` | Sets a D3D render state (cached) |
| `SaveRenderState(type, value)` / `RestoreRenderState(type)` | Push/pop a specific render state |
| `SetTexture(stage, texture)` | Binds a texture to a stage (cached) |
| `SetTextureStageState(stage, type, value)` | Sets texture stage state (cached) |
| `SetVertexShader(shader)` | Sets the vertex shader (cached) |
| `SetPixelShader(shader)` | Sets the pixel shader (cached) |
| `DrawIndexedPrimitive(...)` | Draws indexed primitives (increments draw-call counter in Debug) |
| `GetDevice()` | Returns the `LPDIRECT3DDEVICE9EX` pointer |

---

### `CCamera` / `CCameraManager`
**File:** `Camera.h`
**Purpose:** `CCamera` implements a third-person camera with physics-based resistance, terrain collision avoidance, and building-occlusion detection. `CCameraManager` (singleton) manages a map of named cameras and tracks the currently active one.

#### `CCamera` Methods (key)
| Method | Description |
|--------|-------------|
| `Update()` | Applies angular velocity/resistance and rebuilds the view matrix |
| `Wheel(nWheelLen)` | Adjusts camera distance via mouse wheel |
| `Drag(nMouseX, nMouseY, lpPoint)` | Rotates camera via mouse drag |
| `SetDistance(fdistance)` | Sets camera-to-target distance |
| `Pitch(delta)` / `Roll(delta)` | Adjusts pitch and roll angles |
| `Move(displacement)` | Translates both eye and target |
| `RotateEyeAroundTarget(pitch, roll)` | Orbits eye around the target point |
| `GetViewMatrix()` | Returns the current view matrix |
| `GetBillboardMatrix()` | Returns a matrix for billboard sprites |
| `SetTerrainCollision(enable)` | Enables/disables terrain-based camera collision |

---

### `CResource`
**File:** `Resource.h`
**Purpose:** Abstract base for all assets managed by `CResourceManager`. Tracks load state and filename, and provides virtual hooks for loading, clearing, and device-object lifecycle.

#### States
`STATE_EMPTY` → `STATE_LOAD` → `STATE_EXIST` / `STATE_ERROR` / `STATE_FREE`

#### Methods
| Method | Description |
|--------|-------------|
| `Load()` | Triggers asset loading via the resource manager |
| `Reload()` | Clears and re-loads the asset |
| `IsData()` | Returns true if the resource is successfully loaded |
| `CreateDeviceObjects()` | (virtual) Creates D3D resources |
| `DestroyDeviceObjects()` | (virtual) Releases D3D resources |
| `OnLoad(size, buf)` | (pure virtual) Parses raw data from a buffer |

---

### `CResourceManager`
**File:** `ResourceManager.h`
**Purpose:** Singleton that manages the complete lifecycle of all client assets. Looks up resources by CRC32 of their filename, supports background (threaded) loading, and schedules deferred deletion.

#### Methods
| Method | Description |
|--------|-------------|
| `GetResourcePointer(filename)` | Finds or creates a resource by filename; creates on demand using a registered factory function |
| `InsertResourcePointer(crc, pRes)` | Manually registers an externally created resource |
| `RegisterResourceNewFunctionPointer(ext, fn)` | Registers a factory function for a given file extension |
| `BeginThreadLoading()` / `EndThreadLoading()` | Starts/stops the background loading thread |
| `Update()` | Processes pending deletes and completed background loads |
| `ReserveDeletingResource(pRes)` | Schedules a resource for deferred deletion |

---

### `CNetworkStream`
**File:** `NetStream.h`
**Purpose:** TCP networking client with ring-buffer send/receive queues and integrated XChaCha20 stream-cipher support. Derived classes handle game-specific protocol phases.

#### Methods
| Method | Description |
|--------|-------------|
| `Connect(addr, port, limitSec)` | Establishes a TCP connection with a timeout |
| `Disconnect()` | Closes the socket |
| `Process()` | Pumps send/receive buffers and calls `OnProcess()` |
| `Send(len, buf)` | Queues data for transmission |
| `Recv(len, buf)` | Dequeues data from the receive buffer |
| `Peek(len, buf)` | Peeks at receive buffer without consuming |
| `IsOnline()` | Returns true if the socket is connected |
| `ActivateSecureCipher()` | Switches the stream to encrypted mode |
| `DecryptPendingRecvData()` | Decrypts data already in the receive buffer after activating cipher |

---

### `CTextFileLoader`
**File:** `TextFileLoader.h`
**Purpose:** Hierarchical text file parser. Files consist of named group blocks containing key/value token lines. Provides a tree-navigation API with typed value accessors.

#### Methods
| Method | Description |
|--------|-------------|
| `Load(filename)` | Parses the named text file into a group tree |
| `SetChildNode(key)` | Descends into a named child group |
| `SetParentNode()` | Ascends to the parent group |
| `GetTokenInteger(key, pData)` | Reads an integer value from the current node |
| `GetTokenFloat(key, pData)` | Reads a float value |
| `GetTokenString(key, pString)` | Reads a string value |
| `GetTokenVector3(key, pVec)` | Reads a `D3DXVECTOR3` value |
| `GetTokenColor(key, pColor)` | Reads a `D3DXCOLOR` value |

---

### `CFontManager`
**File:** `FontManager.h`
**Purpose:** Singleton that initializes the FreeType library, maps font names to file paths, and creates `FT_Face` objects on demand.

#### Methods
| Method | Description |
|--------|-------------|
| `Initialize()` | Initializes the FreeType library |
| `CreateFace(faceName)` | Creates and returns a new `FT_Face` (caller must call `FT_Done_Face`) |
| `GetLibrary()` | Returns the `FT_Library` handle |

---

### `CMSApplication`
**File:** `MSApplication.h`
**Purpose:** Top-level Win32 application class. Implements the Windows message pump and delegates WndProc messages to the game.

#### Methods
| Method | Description |
|--------|-------------|
| `Initialize(hInstance)` | Registers the window class |
| `MessageLoop()` | Runs the blocking Win32 message loop |
| `MessageProcess()` | Processes a single message (non-blocking) |

---

### `CSkyBox`
**File:** `SkyBox.h`
**Purpose:** Renders the sky as a 6-face box with per-face textures, gradient vertex colors, and a scrolling cloud layer. Supports animated color transitions.

#### Methods (key)
| Method | Description |
|--------|-------------|
| `SetFaceTexture(filename, index)` | Assigns a texture to one of the 6 sky faces |
| `SetCloudTexture(filename)` | Sets the cloud-layer texture |
| `SetSkyColor(colors, nextColors, transTime)` | Starts a timed color transition on the sky gradient |
| `SetCloudScrollSpeed(v2)` | Sets the UV scroll speed of the cloud texture |
| `Update()` | Advances cloud UV scroll and color transitions |
| `Render()` / `RenderCloud()` | Renders the sky box faces and cloud layer |
