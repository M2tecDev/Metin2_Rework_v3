# EterGrnLib

> Granny2 3D model and skeletal animation wrapper providing model loading, LOD control, bone-based attachment, and D3D9 rendering of animated meshes.

## Overview

EterGrnLib wraps the Granny2 middleware library (by RAD Game Tools) to provide the client with a full 3D character and object rendering pipeline. It handles loading `.gr2` files, managing their associated GPU buffers, driving skeletal animation, and integrating with the LOD system. The library is built around three layers: raw data (`CGrannyModel`, `CGrannyMesh`, `CGrannyMotion`), resource management (`CGraphicThing`), and per-instance rendering (`CGraphicThingInstance`).

## Dependencies

- `EterBase` — CRC, singleton, pool allocator
- `EterLib` — `CGraphicObjectInstance`, `CGraphicBase`, `CResource`, `CReferenceObject`, D3D vertex/index buffers
- Granny2 (extern) — `.gr2` file parsing and animation evaluation

## Files

| File | Purpose |
|------|---------|
| `Model.h/.cpp` | `CGrannyModel`: holds mesh nodes, GPU vertex/index buffers, material palette |
| `Mesh.h/.cpp` | `CGrannyMesh`: per-mesh vertex/index data, material type, deform support |
| `Material.h/.cpp` | `CGrannyMaterial`, `CGrannyMaterialPalette`: material types and texture references |
| `Motion.h/.cpp` | `CGrannyMotion`: wraps `granny_animation*`, provides duration and text-track access |
| `Thing.h/.cpp` | `CGraphicThing`: `CResource` subclass that loads a `.gr2` file into models and motions |
| `ThingInstance.h/.cpp` | `CGraphicThingInstance`: per-object instance with model, LOD, motion, and bone management |
| `ModelInstance.cpp` | Model-instance setup (model binding, skeleton initialization) |
| `ModelInstanceCollisionDetection.cpp` | Collision data update for model instances |
| `ModelInstanceModel.cpp` | Model attachment and hierarchy management |
| `ModelInstanceMotion.cpp` | Motion state machine and blending |
| `ModelInstanceRender.cpp` | Render dispatch for rigid and deformed meshes |
| `ModelInstanceUpdate.cpp` | Per-frame deformation and bone matrix update |
| `LODController.h/.cpp` | `CGrannyLODController`: manages LOD level switching based on distance |
| `Deform.h/.cpp` | CPU-side skeletal deformation for skinned meshes |
| `Util.h/.cpp` | Granny2 utility helpers (matrix conversion, etc.) |

## Classes / Functions

### `CGrannyModel`
**File:** `Model.h`
**Purpose:** Holds the GPU representation of a single Granny2 model: static PNT vertex buffer for rigid meshes, index buffer, and a list of `CGrannyMesh` nodes sorted by mesh type and material type.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_pgrnModel` | `granny_model*` | Raw Granny2 model pointer |
| `m_meshs` | `CGrannyMesh*` | Array of meshes in this model |
| `m_pntVtxBuf` | `CGraphicVertexBuffer` | Static PNT vertex buffer for rigid geometry |
| `m_idxBuf` | `CGraphicIndexBuffer` | Index buffer for all meshes |
| `m_deformVtxCount` | `int` | Number of skinned vertices |
| `m_rigidVtxCount` | `int` | Number of rigid vertices |
| `m_kMtrlPal` | `CGrannyMaterialPalette` | Material palette for this model |
| `m_bHaveBlendThing` | `bool` | True if any mesh uses additive/blend rendering |

#### Methods
| Method | Description |
|--------|-------------|
| `CreateFromGrannyModelPointer(pgrnModel)` | Builds GPU buffers from a Granny2 model pointer |
| `CreateDeviceObjects()` | Creates D3D vertex and index buffers |
| `DestroyDeviceObjects()` | Releases D3D buffers |
| `CanDeformPNTVertices()` | Returns true if skinned deformation is supported |
| `DeformPNTVertices(dst, boneMatrices, bindings)` | Performs CPU-side skeletal deformation |
| `GetMeshNodeList(meshType, mtrlType)` | Returns the linked list of mesh nodes of a given type/material combination |
| `GetMaterialPalette()` | Returns the material palette reference |

---

### `CGrannyMesh`
**File:** `Mesh.h`
**Purpose:** Represents a single mesh within a Granny model. Tracks mesh type (rigid vs. deform) and material type, and holds raw vertex/index data pointers.

#### Enumerations
| Enum | Values |
|------|--------|
| `EType` | `TYPE_RIGID`, `TYPE_DEFORM`, `TYPE_MAX_NUM` |

---

### `CGrannyMotion`
**File:** `Motion.h`
**Purpose:** Wraps a `granny_animation*` pointer providing access to the animation's name, duration, and text tracks (event cue points).

#### Methods
| Method | Description |
|--------|-------------|
| `BindGrannyAnimation(pgrnAni)` | Associates the object with a Granny animation |
| `GetGrannyAnimationPointer()` | Returns the raw animation pointer |
| `GetName()` | Returns the animation name string |
| `GetDuration()` | Returns total animation duration in seconds |
| `GetTextTrack(name, count, array)` | Returns time cue points from a named text track |

---

### `CGraphicThing`
**File:** `Thing.h`
**Purpose:** `CResource` subclass that represents a loaded `.gr2` file. Contains arrays of `CGrannyModel` and `CGrannyMotion` objects extracted from the Granny file.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_pgrnFile` | `granny_file*` | Granny file object |
| `m_pgrnFileInfo` | `granny_file_info*` | File info (models, animations, etc.) |
| `m_models` | `CGrannyModel*` | Array of models in this file |
| `m_motions` | `CGrannyMotion*` | Array of animations in this file |

#### Methods
| Method | Description |
|--------|-------------|
| `GetModelPointer(iModel)` | Returns model at index |
| `GetModelCount()` | Returns total model count |
| `GetMotionPointer(iMotion)` | Returns motion (animation) at index |
| `GetMotionCount()` | Returns total animation count |
| `CreateDeviceObjects()` | Propagates `CreateDeviceObjects` to all models |

---

### `CGraphicThingInstance`
**File:** `ThingInstance.h`
**Purpose:** Per-instance runtime state for a `CGraphicThing`. Manages multiple model instances (body parts), LOD levels, motion playback with blending, bone queries, and material overrides. Extends `CGraphicObjectInstance` for scene integration.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_LODControllerVector` | `vector<CGrannyLODController*>` | One LOD controller per model instance |
| `m_modelThingSetVector` | `vector<TModelThingSet>` | LOD-level graphic thing references |
| `m_roMotionThingMap` | `map<DWORD, TRef*>` | Loaded motion files keyed by motion hash |
| `m_fLocalTime` | `float` | Current animation local time in seconds |
| `m_v3Center` | `D3DXVECTOR3` | Bounding sphere center |
| `m_fRadius` | `float` | Bounding sphere radius |

#### Methods
| Method | Description |
|--------|-------------|
| `RegisterModelThing(i, pThing)` | Assigns a `CGraphicThing` to model slot `i` |
| `RegisterLODThing(i, pThing)` | Registers a LOD-level variant |
| `RegisterMotionThing(key, pThing)` | Registers an animation by its motion key |
| `SetModelInstance(dst, srcThing, srcModel)` | Binds a model from a thing to a model-instance slot |
| `SetMotion(key, blendTime, loopCount, speed)` | Starts playback of a motion with cross-blend support |
| `ChangeMotion(key, loopCount, speed)` | Immediately switches to a new motion |
| `AttachModelInstance(dst, boneName, src)` | Attaches one model instance to a bone of another |
| `FindBoneIndex(iModel, boneName, iRetBone)` | Finds a bone index by name |
| `GetBonePosition(iModel, iBone, x, y, z)` | Returns world-space bone position |
| `SetMaterialImagePointer(part, name, pImage)` | Overrides a mesh material's texture |
| `SetSpecularInfo(part, name, enable, power)` | Configures specular highlights on a material |
| `UpdateLODLevel()` | Selects appropriate LOD based on camera distance |
| `DeformAll()` | Runs CPU skeletal deformation for all model instances |
| `Picking(v, dir, outX, outY)` | Ray-vs-mesh picking test |

---

### `CGrannyLODController`
**File:** `LODController.h`
**Purpose:** Tracks the current LOD level for a single model instance and provides the LOD-switching logic based on screen-space size or distance.

#### Methods
| Method | Description |
|--------|-------------|
| `SetLODLevel(level)` | Forces a specific LOD level |
| `GetCurrentLOD()` | Returns the active LOD index |
| `Update(distance)` | Selects the appropriate LOD for the given distance |
