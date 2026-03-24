# Understanding the Quest System — From Source File to Runtime

> **Who is this for:** A developer writing or modifying quest scripts, or trying to understand why a quest is not triggering correctly.
> **Prerequisites:** [How Everything Fits Together](concept-architecture) — know the server structure before reading about quest execution.
> **What you will learn:** What a quest is in Metin2 terms, the three-stage compile pipeline, how states and triggers work, how dialog suspends and resumes, and why Lua is used instead of C++.

## Overview

Metin2 quests are Lua-based state machines. A quest author writes a human-readable script, a compiler converts it to Lua bytecode, and the server runs those chunks at runtime when players trigger events. This page explains each stage of that pipeline so you can write, debug, and modify quests confidently.

---

## What is a Quest in Metin2?

A quest is a **state machine**. At any given moment, every player is in exactly one state for each quest they have interacted with.

The player's state determines how the quest reacts to events. The same NPC click will produce different dialogue depending on whether the player is in the `start` state or the `talking` state.

```
                                 ┌──────────────────────────────┐
                                 │  Quest: simple_task          │
                                 └──────────────────────────────┘

  ┌───────────┐  trigger: click NPC    ┌─────────────┐
  │   start   │ ──────────────────────►│   talking   │
  └───────────┘                        └──────┬──────┘
                                              │
                                              │ player says "yes"
                                              ▼
                                       ┌─────────────┐
                                       │  rewarded   │  ← terminal state
                                       └─────────────┘
```

The `start` state is the default — every player begins here. Triggers cause transitions between states. A terminal state (like `rewarded`) prevents the quest from restarting.

---

## The Three-Stage Pipeline

```
Stage 1: Author writes the quest file
─────────────────────────────────────
File: game/quest/simple_task.quest
Content: human-readable DSL

  quest simple_task begin
    state start begin
      when npc.click begin
        say("Hello! Do you want a reward?")
        ...
      end
    end
    state rewarded begin
      when npc.click begin
        say("You already got your reward!")
      end
    end
  end

          │
          │  qc compiler
          ▼

Stage 2: Compiled Lua chunks
─────────────────────────────────────
Files: game/object/simple_task.quest
       (binary Lua 5.0 bytecode)

The qc tool parses the .quest DSL and outputs
Lua bytecode that the server can execute directly.
Each state's handler is a separate Lua function.

          │
          │  CQuestManager loads at game startup
          ▼

Stage 3: Runtime execution
─────────────────────────────────────
When a player clicks the NPC:
1. CQuestManager checks the player's current state for this quest
2. Looks up the handler function for (state=start, trigger=click)
3. Resumes (or starts) the Lua coroutine for that player
4. The coroutine runs until it suspends (e.g., say()) or completes
```

---

## What are States?

A state is a named position in the quest's progression. The server stores one state name per quest per player in the `quest` table in MariaDB.

**Analogy:** A bouncer at a venue has a clipboard. When you first arrive, your status is "not checked in". After showing your ID, your status changes to "checked in". The bouncer reacts differently to you depending on your current status — even though it is the same bouncer and the same venue.

States work the same way. The same NPC produces different dialogue, different item checks, and different outcomes depending on the player's current state in the quest.

---

## What are Triggers?

A trigger is the event that causes a quest handler to fire. Within a state block, you define `when <trigger> begin ... end` to handle that event.

| Trigger | When it fires | Common use |
|---------|--------------|------------|
| `npc.click` | Player left-clicks an NPC | Start a conversation, check progress |
| `kill` | Player kills a specific mob (by vnum) | Count kills for a task |
| `levelup` | Player's level increases | Award level-up bonus, unlock content |
| `login` | Player enters the game world | Daily reward check, tutorial prompt |
| `timer` | A named timer expires (set with `timer()`) | Delayed rewards, time-limited events |
| `item.use` | Player uses a specific item (by vnum) | Activate a quest item effect |
| `letter` | Player opens the quest letter in the quest log | Show quest description |

---

## How Dialog Works — The Suspend/Resume Cycle

When a quest script calls `say("Hello!")`, execution does not simply continue. The quest coroutine **suspends** — it pauses mid-execution — and the server sends a dialog packet to the client. When the player clicks "OK" or chooses an option, the client sends a response packet, and the coroutine **resumes** from exactly where it paused.

```
Quest Lua coroutine          game server          Client
       │                           │                  │
       │  say("Hello!")            │                  │
       │ ─────────────────────────►│                  │
       │  (coroutine suspends)     │  GC_QUEST ──────►│
       │                           │                  │  (dialog shown)
       │                           │  CG_QUEST ◄──────│  (player clicks OK)
       │  (coroutine resumes)      │◄─────────────────│
       │                           │                  │
       │  say("Goodbye!")          │                  │
       │ ─────────────────────────►│                  │
       │  (suspends again)         │  GC_QUEST ──────►│
       ...
```

This is why quest scripts look like synchronous code (`say()`, wait for player, `say()` again) even though the server is asynchronous. Each player has their own coroutine; suspending one does not affect others.

---

## Why Lua and Not C++?

**Hot-reload:** Quest scripts are compiled Lua bytecode loaded from disk at startup. To update a quest, you:
1. Edit the `.quest` file
2. Run `qc` to recompile
3. Reload quests (or restart the game process)

No C++ recompile, no server rebuild, no downtime beyond a process restart. Quest designers can iterate without touching C++ at all.

**Safety:** Lua has a sandboxed environment. A bug in a quest script cannot corrupt the game server's memory the way a C++ bug can. The worst a Lua error does is kill that player's quest coroutine.

**Approachability:** Lua is much simpler to learn than C++ for quest content that is primarily branching dialogue, condition checks, and item rewards.

---

## Where Compiled Files Live

```
Source files:  game/quest/*.quest
               ↓ (qc compiler)
Compiled:      game/object/*.quest   ← binary Lua chunks, one per source file
```

The game process reads from `game/object/` at startup. If you edit a `.quest` file and forget to recompile with `qc`, the running game uses the old compiled version. Your changes have no effect until you compile and reload.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Editing the `.quest` file but not running `qc` | Quest changes silently ignored | Always run `qc` after editing; check that the `.quest` file in `game/object/` is newer than the source |
| Typo in a trigger name (e.g., `npc.Click` instead of `npc.click`) | Trigger never fires | Trigger names are case-sensitive; check the exact name |
| Typo in a state name | Transition goes to a non-existent state; player gets stuck | State names must match exactly in both the `when` and `goto` |
| Using `pc.setf` (session flag) for quest progress | Progress is lost when player logs out | Use `pc.setqf` (persistent quest flag) for data that must survive logout |
| Calling `say()` inside a `kill` trigger | `say()` only works in triggers that support dialog (click, letter) | `kill` triggers cannot show dialog — use `notice()` or give an item instead |
| Missing `end` closing a state block | `qc` fails with a parse error | Every `begin` needs a matching `end` |

---

## Next Steps

- [Quest System Blueprint](blueprint-Quest-System) — the complete technical reference: Lua grammar, full API (~90 functions), compiler FSM
- [Quest System Topic Guide](topic-Quest-System) — cross-cutting explanation of how quests interact with the full stack
- [Adding a New System](guide-Adding-a-New-System) — a complete end-to-end example that includes quest integration
- [server-src-liblua](server-src-liblua) — Lua 5.0.3 complete source integration; the actual lexer used by `qc`
- [server-src-qc](server-src-qc) — `qc` compiler: drives grammar FSM, extracts Lua bodies, emits `object/` output tree
