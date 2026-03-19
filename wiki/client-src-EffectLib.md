# EffectLib

> Particle system and visual-effects library supporting textured particles, animated mesh effects, point lights, and a central manager for registration and playback.

## Overview

EffectLib provides the complete visual-effects pipeline for the game. An "effect" is a composite of one or more elements: particle systems (billboarded textured quads with physics), mesh animations (looping 3D geometry sequences), and simple dynamic point lights. The `CEffectManager` singleton manages effect data loading, per-instance lifecycle, and per-frame update/render dispatch. Rendering uses frustum culling to skip off-screen elements.

## Dependencies

- `EterBase` — singleton, pool allocator (`CDynamicPool`)
- `EterLib` — `CScreen`, `CGraphicImageInstance`, `CStateManager`, frustum
- `EterGrnLib` — mesh-based effect elements may use Granny models

## Files

| File | Purpose |
|------|---------|
| `EffectManager.h/.cpp` | `CEffectManager`: singleton for registering, creating, and updating all effects |
| `EffectInstance.h/.cpp` | `CEffectInstance`: one live instance of a full effect (contains element instances) |
| `EffectData.h/.cpp` | `CEffectData`: loaded effect definition (list of element definitions) |
| `EffectElementBase.h/.cpp` | `CEffectElementBase`: abstract base for element data definitions |
| `EffectElementBaseInstance.h/.cpp` | `CEffectElementBaseInstance`: abstract base for element runtime instances |
| `EffectMesh.h/.cpp` | `CEffectMesh`: data for a mesh-animation effect element |
| `EffectMeshInstance.h/.cpp` | `CEffectMeshInstance`: runtime instance of a mesh-animation element |
| `ParticleSystemData.h/.cpp` | `CParticleSystemData`: parsed particle system definition |
| `ParticleSystemInstance.h/.cpp` | `CParticleSystemInstance`: runtime instance of a particle system with per-particle state |
| `ParticleProperty.h/.cpp` | `CParticleProperty`: particle behavior parameters (size, velocity, color, etc.) |
| `ParticleInstance.h/.cpp` | `CParticleInstance`: single particle state (position, velocity, age, color) |
| `EmitterProperty.h/.cpp` | `CEmitterProperty`: emission shape, rate, and burst configuration |
| `SimpleLightData.h/.cpp` | `CSimpleLightData`: definition for a dynamic point light element |
| `SimpleLightInstance.h/.cpp` | `CSimpleLightInstance`: runtime instance of a point light element |
| `FrameController.h/.cpp` | `CFrameController`: time-based frame/keyframe interpolator for animated effect elements |
| `Type.h/.cpp` | Shared type definitions for the effect system |

## Classes

### `CEffectManager`
**File:** `EffectManager.h`
**Purpose:** Singleton managing the lifecycle of all effect data and instances. Effects are registered by filename (identified by CRC32) and instantiated with position/rotation. Provides separate "unsafe" instance creation for area-attached effects.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_kEftDataMap` | `TEffectDataMap` | CRC → effect data (loaded definitions) |
| `m_kEftInstMap` | `TEffectInstanceMap` | Index → live effect instances |
| `m_kEftCacheMap` | `TEffectInstanceMap` | Index → cached (inactive) effect instances |
| `m_pSelectedEffectInstance` | `CEffectInstance*` | Currently selected instance (for transform operations) |

#### Methods
| Method | Description |
|--------|-------------|
| `RegisterEffect(filename, deleteIfExist, cache)` | Loads an effect definition from a file; CRC becomes the effect ID |
| `RegisterEffect2(filename, pCRC, cache)` | Same as above but also returns the CRC |
| `CreateEffect(id, pos, rot)` | Creates a live instance at a world position; returns instance index |
| `CreateEffectInstance(index, id)` | Creates a live instance at a pre-reserved index slot |
| `SelectEffectInstance(index)` | Selects an instance for subsequent transform calls |
| `DestroyEffectInstance(index)` | Destroys and removes a live instance |
| `SetEffectInstancePosition(pos)` | Sets position on the currently selected instance |
| `SetEffectInstanceRotation(rot)` | Sets rotation on the currently selected instance |
| `SetEffectInstanceGlobalMatrix(mat)` | Sets the full world matrix on the selected instance |
| `IsAliveEffect(index)` | Returns true if the instance is still active |
| `Update()` | Per-frame update of all live instances |
| `Render()` | Per-frame render of all visible instances |
| `UpdateSound()` | Processes sound events triggered by effect keyframes |
| `CreateUnsafeEffectInstance(id, ppInst)` | Creates a standalone instance not tracked by the manager map (used for area effects) |

---

### `CEffectInstance`
**File:** `EffectInstance.h`
**Purpose:** One live instance of an effect. Contains a list of `CEffectElementBaseInstance` sub-instances (particles, meshes, lights). Drives per-frame update and render dispatch across all elements.

---

### `CEffectData`
**File:** `EffectData.h`
**Purpose:** Loaded definition of an effect, containing a list of `CEffectElementBase` element definitions. Parsed from a binary effect file.

---

### `CParticleSystemInstance`
**File:** `ParticleSystemInstance.h`
**Purpose:** Runtime state of a particle system element. Manages a list of `CParticleInstance` objects, processes emission, updates particle positions/colors/ages each frame, and renders them as billboarded quads.

#### Methods
| Method | Description |
|--------|-------------|
| `CreateParticles(fElapsedTime)` | Emits new particles based on emission rate and elapsed time |
| `OnUpdate(fElapsedTime)` | Advances all particle positions, ages, and fades; removes dead particles |
| `OnRender()` | Renders all particles as billboarded textured quads using the texture atlas frames |
| `GetEmissionCount()` | Returns the total number of particles emitted |

---

### `CFrameController`
**File:** `FrameController.h`
**Purpose:** Provides time-based keyframe interpolation for animating effect element properties (scale, color, velocity, etc.) over the effect's lifetime. Used by particle and mesh element instances.
