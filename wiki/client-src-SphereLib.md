# SphereLib

> Spherical collision, frustum culling, and spatial bounding-sphere structures used across the rendering pipeline.

## Overview

SphereLib provides the mathematical primitives used for visibility culling and spatial queries throughout the engine. The `Frustum` class extracts six planes from a combined view-projection matrix and tests bounding spheres for inside/outside/partial visibility. The sphere-packing algorithms (`spherepack`) are used to compute optimal bounding spheres for sets of points or child spheres. This library is referenced by `EterLib::CScreen` (which uses `Frustum`), and by culling managers throughout the codebase.

## Dependencies

- DirectX 9 (math types: `D3DXMATRIX`, `D3DXPLANE`, `D3DXVECTOR3`)

## Files

| File | Purpose |
|------|---------|
| `frustum.h/.cpp` | `Frustum`: view-frustum clipping with sphere test |
| `sphere.h/.cpp` | `Sphere`: bounding sphere representation and merge operations |
| `spherepack.h/.cpp` | Sphere-packing algorithms for building bounding sphere hierarchies |
| `vector.h` | `Vector3d`: 3D vector type used by `Frustum` and sphere operations |
| `pool.h` | Generic pool allocator template used within this library |

## Classes / Types

### `Frustum`
**File:** `frustum.h`
**Purpose:** Represents the six clip planes of a view frustum. Used for visibility culling of renderable objects.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_plane[6]` | `D3DXPLANE[6]` | The six frustum planes (near, far, left, right, top, bottom) |
| `m_bUsingSphere` | `bool` | Whether to use a sphere proxy for broad-phase culling |
| `m_v3Center` | `D3DXVECTOR3` | Frustum sphere proxy center |
| `m_fRadius` | `float` | Frustum sphere proxy radius |

#### Methods
| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `BuildViewFrustum` | `D3DXMATRIX& mat` | `void` | Extracts frustum planes from a combined view-projection matrix |
| `BuildViewFrustum2` | `mat, near, far, fov, aspect, camera, look` | `void` | Builds frustum from explicit parameters |
| `ViewVolumeTest` | `const Vector3d& center, float radius` | `ViewState` | Tests a bounding sphere: returns `VS_INSIDE`, `VS_PARTIAL`, or `VS_OUTSIDE` |

---

### `ViewState` (enum)
**File:** `frustum.h`
| Value | Meaning |
|-------|---------|
| `VS_INSIDE` | Sphere is completely inside the frustum |
| `VS_PARTIAL` | Sphere straddles one or more planes |
| `VS_OUTSIDE` | Sphere is completely outside the frustum |

---

### `Vector3d`
**File:** `vector.h`
**Purpose:** Simple 3D float vector type with basic arithmetic used throughout `SphereLib` and `EterLib`'s frustum culling.

---

### `spherepack` functions
**File:** `spherepack.h/.cpp`
**Purpose:** Implements sphere-packing and bounding-sphere fitting algorithms for building spatial hierarchies from sets of points or child spheres. Used when constructing object bounding spheres in the culling manager.
