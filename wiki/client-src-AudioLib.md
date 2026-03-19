# AudioLib

> Sound and background music playback library built on miniaudio, supporting 2D interface sounds, 3D positional audio, and cross-faded BGM.

## Overview

AudioLib wraps the `miniaudio` library to provide all sound output for the game. It manages a pool of 3D positional sound instances, a collection of 2D sounds for the UI, and up to two simultaneously active music tracks for cross-fading. Sounds are loaded from pack files into memory and played via miniaudio's engine. The listener position can be updated each frame to drive 3D audio spatialization.

## Dependencies

- `EterBase` — singleton
- `PackLib` — loading sound files from pack archives
- miniaudio (extern/include) — audio engine (`ma_engine`)

## Files

| File | Purpose |
|------|---------|
| `SoundEngine.h/.cpp` | `SoundEngine`: singleton managing all audio playback |
| `MaSoundInstance.h/.cpp` | `MaSoundInstance`: single miniaudio sound instance wrapper |
| `Type.h/.cpp` | `NSound` namespace types: `TSoundInstanceVector`, sound descriptors |

## Classes

### `SoundEngine`
**File:** `SoundEngine.h`
**Purpose:** Singleton that owns the `ma_engine` and all sound/music instances. Handles loading, playback, volume control, and 3D listener positioning.

#### Member Variables
| Variable | Type | Description |
|----------|------|-------------|
| `m_Engine` | `ma_engine` | miniaudio engine instance |
| `m_Sounds2D` | `unordered_map<string, MaSoundInstance>` | Named 2D sounds (UI and effects) |
| `m_Sounds3D` | `array<MaSoundInstance, 32>` | Pool of 3D positional sound instances |
| `m_Music` | `array<MaSoundInstance, 2>` | Current and previous BGM tracks (for cross-fading) |
| `m_CurrentMusicIndex` | `int` | Index into `m_Music` of the currently playing track |
| `m_MusicVolume` | `float` | BGM volume (0–1) |
| `m_SoundVolume` | `float` | SFX volume (0–1) |
| `m_MasterVolume` | `float` | Master volume multiplier (0–1) |
| `m_Files` | `unordered_map<string, vector<uint8_t>>` | Raw audio file data cached in memory |
| `m_PlaySoundHistoryMap` | `unordered_map<string, float>` | Tracks recent play times to prevent duplicate triggering |

#### Methods
| Method | Description |
|--------|-------------|
| `Initialize()` | Initializes the miniaudio engine |
| `PlaySound2D(name)` | Plays a 2D (non-spatialized) sound by filename |
| `PlaySound3D(name, x, y, z)` | Plays a 3D positional sound at world coordinates; returns instance pointer |
| `PlayAmbienceSound3D(x, y, z, name, loopCount)` | Plays a looping 3D ambient sound |
| `StopAllSound3D()` | Stops all active 3D sound instances |
| `UpdateSoundInstance(x, y, z, frame, vec, checkFreq)` | Per-frame update: updates 3D positions for a set of sound descriptors |
| `FadeInMusic(path, targetVol, duration)` | Starts playing a music track with fade-in |
| `FadeOutMusic(name, targetVol, duration)` | Fades out a named music track |
| `FadeOutAllMusic()` | Fades out all currently playing music |
| `SetSoundVolume(volume)` | Sets the SFX volume |
| `SetMusicVolume(volume)` | Sets the BGM volume |
| `SetMasterVolume(volume)` | Sets the master volume |
| `SetListenerPosition(x, y, z)` | Updates the listener position for 3D audio |
| `SetListenerOrientation(fwdX,...,upZ)` | Updates listener forward and up vectors |
| `SaveVolume(isMinimized)` | Saves volume state (e.g., when the window is minimized) |
| `RestoreVolume()` | Restores previously saved volume |
| `Update()` | Per-frame update tick for active sounds |

---

### `MaSoundInstance`
**File:** `MaSoundInstance.h`
**Purpose:** Wraps a single `ma_sound` object with lifecycle management. Stores the raw audio data buffer and handles play, stop, and volume operations.

---

### `NSound` types
**File:** `Type.h`
**Purpose:** Defines `TSoundInstanceVector` (a vector of sound descriptors) and related structures used by `UpdateSoundInstance` to batch-update 3D sounds from game event data.
