# What is a Packet? — Understanding Network Communication

> **Who is this for:** A developer who needs to understand how the client and server communicate before reading protocol documentation or adding a new feature.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — you should know the client/game/db structure first.
> **What you will learn:** What a packet is, the five packet namespaces, how a packet is structured on the wire, why encryption is used, and what connection phases mean.

## Overview

Every interaction between the client and the server — logging in, moving, attacking, picking up an item — is encoded as a binary packet sent over TCP. Understanding packets is necessary before you can read the protocol documentation, add a new feature, or debug connection problems.

---

## What is a Packet?

A packet is a binary message with a fixed structure: a header that says what type of message this is, followed by a payload that contains the data.

**Analogy:** Think of a government form. There is a form number on the top (the header — tells you which form this is), and then fields you fill in below (the payload — the actual data). The server has a registry of every known form number and knows exactly what fields to expect for each one.

When the client attacks a monster:
1. Python code calls a C++ function: `net.SendAttackPacket(monster_vid, attack_type)`
2. C++ serialises this into bytes and sends it over TCP
3. The server receives the bytes, reads the 2-byte header (`CG::ATTACK`), looks up the handler, and processes the attack

---

## Why TCP and Not UDP?

TCP provides **ordered, reliable delivery** — every byte arrives, in order, exactly once.

For an RPG, this is required:
- If an item-use packet is dropped and not retransmitted, the item is consumed on the client but the server never processes it — the player loses the item with no effect
- If packets arrive out of order (e.g., "pick up item" before "walk to item"), the server would need to implement its own reordering logic
- A single persistent TCP connection per player is simpler to encrypt than many independent UDP datagrams

The cost — slightly higher latency compared to UDP for fast-moving data — is acceptable for an MMORPG where the authoritative server updates run at 40 pulses/second anyway.

---

## The Five Packet Namespaces

All packets belong to one of five namespaces. The namespace tells you the direction and which pair of processes the packet travels between.

| Namespace | Direction | Between | Example use |
|-----------|-----------|---------|-------------|
| **CG** | Client → Game | Client ↔ Server | Player attacks, moves, chats, uses item |
| **GC** | Game → Client | Server → Client | HP update, mob spawns, item changes, chat |
| **GD** | Game → DB | game process → db process | "Save this character", "Did this account log in?" |
| **DG** | DB → Game | db process → game process | Character data loaded, login result |
| **GG** | Game ↔ Game | game ↔ game | Cross-channel player warp, whisper routing |

**CG and GC** are the client-server packets — the ones visible to players and the ones you add when building new features.

**GD and DG** are the internal persistence packets — they carry character/item data between the two server processes.

**GG** is used when a player warps to a different game channel or sends a cross-channel whisper.

The canonical list of all packet header constants is in `server-src/src/common/packet_headers.h`. For the full packet tables see [topic-Game-Client-Protocol](topic-Game-Client-Protocol).

---

## What Does a Packet Look Like?

Every CG/GC packet has this structure:

```
┌──────────────────────────────────────────────────────────────────┐
│         header          │         length          │   payload    │
│         2 bytes         │         2 bytes         │   variable   │
└──────────────────────────────────────────────────────────────────┘
```

- **header (2 bytes):** The packet type constant from `packet_headers.h`. The server/client looks this up in a jump table to find the handler function.
- **length (2 bytes):** The total size of the packet including the header. Tells the reader how many bytes to read before the next packet starts.
- **payload (variable):** The actual data. Its structure is defined by a `#pragma pack(1)` struct in `packet_structs.h` (server) or `Packet.h` (client). Both files must define the same struct — they are manually kept in sync.

**GD/DG packets** use a slightly different framing (a 10-byte frame header) because they carry larger data structures (full character tables), but the concept is the same.

---

## What is Encryption and Why?

All packets after the initial handshake are encrypted. Without encryption, anyone on the network path between the player and the server could read or modify packets — they could see another player's login credentials, inject fake movement, or replay item pickup packets.

**How it works (without the maths):**

1. When a client connects, both sides perform an **X25519 key exchange** — each side proves to the other that it holds the right private key, and they derive a shared secret without ever sending that secret over the wire.

2. Using that shared secret, all subsequent data is encrypted with **XSalsa20-Poly1305** — a stream cipher. The server decrypts incoming bytes in-place in the ring buffer before dispatching them to the packet handler. The client does the same.

3. An attacker watching the wire sees only random-looking bytes. Without the private key (which never leaves the client or server), they cannot decrypt or forge packets.

From a development perspective: you never call encrypt/decrypt manually. The network layer handles it transparently. You just define your struct and call `Send(packet)`.

---

## Connection Phases

A client connection does not immediately jump into gameplay. It progresses through a series of **phases**, and only specific packet types are valid in each phase. Sending an out-of-phase packet is silently dropped or causes a disconnect.

```
 ┌────────────────┐
 │  HANDSHAKE     │  Key exchange + time sync
 └───────┬────────┘
         │  GC_PHASE → LOGIN
         ▼
 ┌────────────────┐
 │  LOGIN         │  Account credentials, character slot list
 └───────┬────────┘
         │  GC_PHASE → SELECT
         ▼
 ┌────────────────┐
 │  SELECT        │  Character selection, creation, deletion
 └───────┬────────┘
         │  CG_PLAYER_SELECT → GC_PHASE → LOADING
         ▼
 ┌────────────────┐
 │  LOADING       │  Server sends initial world state
 └───────┬────────┘
         │  GC_PHASE → GAME
         ▼
 ┌────────────────┐
 │  GAME          │  Normal gameplay — all CG/GC gameplay packets valid
 └───────┬────────┘
         │  Character dies
         ▼
 ┌────────────────┐
 │  DEAD          │  Limited packets valid (respawn, ghost movement)
 └────────────────┘
```

**Why phases exist:** The server enforces which packets are valid in which phase. A client that sends `CG_ATTACK` before reaching PHASE_GAME gets disconnected. This prevents exploits where a malicious client sends gameplay packets before authentication is complete.

In the server code, each phase has a corresponding `CInput*` handler class (`CInputHandshake`, `CInputLogin`, `CInputMain`, etc.). The `DESC` object (one per connection) holds a pointer to the currently active handler.

---

## How to Find Which Packet Does What

1. Open `server-src/src/common/packet_headers.h`
2. Find the header constant (e.g., `CG::ATTACK = 0x0D`)
3. Search `input_main.cpp` for that constant to find the handler function
4. The handler function name tells you what it does (e.g., `CInputMain::Attack()`)

For the full indexed packet tables with directions, sizes, and descriptions, see [topic-Game-Client-Protocol](topic-Game-Client-Protocol).

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Adding a packet header on the server but not the client (or vice versa) | Server sees unknown packet header from client | Both `packet_headers.h` (server) and `Packet.h` (client) must have matching constants |
| Changing a packet struct size without updating both sides | Client/server immediately disconnect after the changed packet is sent | Recompile both server-src and client-src; both struct definitions must match |
| Sending a packet in the wrong phase | Packet silently dropped or client disconnected | Check which `CInput*` handler is active for your target phase |
| Forgetting `#pragma pack(1)` on a new packet struct | Struct has unexpected padding; sizes mismatch | All packet structs must be packed — add `#pragma pack(1)` / `#pragma pack()` |

---

## Next Steps

- [topic-Game-Client-Protocol](topic-Game-Client-Protocol) — full packet tables for all 5 namespaces
- [blueprint-Game-Client-Protocol](blueprint-Game-Client-Protocol) — deep-dive into the dispatcher architecture
- [guide-Adding-a-New-System](guide-Adding-a-New-System) — step-by-step guide to adding a new packet
