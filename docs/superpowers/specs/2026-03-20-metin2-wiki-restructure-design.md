# Metin2 Rework v3 — Wiki Restructure Design

**Date:** 2026-03-20
**Approach:** Sequential single agent (Approach A)
**Total files:** 46 (16 new, 30 updated)

---

## Goal

Add a beginner-friendly entry layer to the existing Metin2 Rework v3 wiki without removing or replacing any existing content. The existing blueprint/guide/topic pages remain intact; new start-*, concept-*, and troubleshoot-* pages provide the on-ramp for less experienced developers.

---

## Repositories

| Repo | Description |
|------|-------------|
| server-src | C++ game + db process |
| client-src | C++ game client (Metin2.exe) |
| client-bin | Python UI scripts + assets |

Wiki files live in: `wiki/` (GitHub Wiki flat directory).

---

## File Structure

### New files (16)

```
wiki/start-overview.md
wiki/start-requirements.md
wiki/start-server-setup.md
wiki/start-client-setup.md
wiki/start-first-change.md
wiki/start-workflow.md

wiki/concept-architecture.md
wiki/concept-packets.md
wiki/concept-vnum.md
wiki/concept-proto.md
wiki/concept-sectree.md
wiki/concept-lua-quests.md
wiki/concept-python-ui.md

wiki/troubleshoot-server.md
wiki/troubleshoot-client.md
wiki/troubleshoot-db.md
```

### Existing files updated (30)

- 8 blueprint-* pages — "Before You Read" box inserted below first heading
- 12 guide-* pages — "Prerequisites" box inserted below first heading
- 8 topic-* pages — "Prerequisites" box inserted below first heading
- Home.md — full rewrite preserving all existing content
- _Sidebar.md — 3 new sections added at top

---

## Page Templates

### All new pages (start-*, concept-*, troubleshoot-*)

```markdown
# [Title]
> **Who is this for:** [target audience]
> **Prerequisites:** [what you need before reading]
> **What you will learn:** [what you can do after reading]

## Overview
[what this page covers and why it matters]

## [Main sections...]

## Common Mistakes
| Mistake | Symptom | Fix |
|---------|---------|-----|

## Next Steps
[links to logical next pages]
```

**Additional rules:**
- concept-* pages: no large C++ code blocks; ASCII diagrams, tables, analogies only
- troubleshoot-* pages: use real error strings as they appear in log files
- start-* pages: no installation steps from scratch — link to README anchors

### Blueprint "Before You Read" box

Inserted directly below the first `# Blueprint: ...` heading.

```markdown
> ### 📖 New to this topic?
> This is an advanced reference page. If you are not familiar with the basics yet, read these first:
> - [How Everything Fits Together](concept-architecture)
> - [What is a Packet?](concept-packets)        ← protocol blueprints only
> - [What is a vnum?](concept-vnum)             ← item/character blueprints only
> - [Understanding the Quest System](concept-lua-quests) ← quest blueprint only
> - [Why Python for the UI?](concept-python-ui) ← UI blueprint only
>
> **Difficulty:** Advanced | **Assumes:** C++ knowledge, familiarity with the overall architecture
```

Per-file box contents:

| File | Concept links included |
|------|----------------------|
| blueprint-Game-Client-Protocol | concept-architecture, concept-packets |
| blueprint-Login-Flow | concept-architecture, concept-packets |
| blueprint-Character-System | concept-architecture, concept-vnum |
| blueprint-Item-System | concept-architecture, concept-vnum |
| blueprint-Combat-System | concept-architecture |
| blueprint-Quest-System | concept-architecture, concept-lua-quests |
| blueprint-UI-Python-System | concept-architecture, concept-python-ui |
| blueprint-Map-World-System | concept-architecture, concept-sectree |

### Guide "Prerequisites" box

Inserted directly below the first `#` heading.

```markdown
> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [relevant concept page]
> - [relevant concept page]
>
> If you are setting up for the first time, start with [Getting Started](start-overview).
```

Per-file prerequisites:

| File | Concept links |
|------|--------------|
| guide-Adding-a-New-System | concept-architecture, concept-packets |
| guide-Build-Environment | concept-architecture |
| guide-Best-Practices | concept-architecture |
| guide-Asset-Pipeline | concept-python-ui |
| guide-Localization | concept-python-ui |
| guide-Debugging | concept-architecture |
| guide-Database-Proto | concept-proto, concept-vnum |
| guide-Security-AntiCheat | concept-packets, concept-architecture |
| guide-Skill-Buff-System | concept-vnum, concept-architecture |
| guide-NPC-and-Spawning | concept-vnum, concept-sectree |
| guide-Horse-Mount-Pet | concept-vnum |
| guide-Economy | concept-proto, concept-vnum |

### Topic "Prerequisites" box

Same format as guide boxes.

| File | Concept links |
|------|--------------|
| topic-Game-Client-Protocol | concept-packets, concept-architecture |
| topic-Login-Flow | concept-packets, concept-architecture |
| topic-Character-System | concept-vnum, concept-architecture |
| topic-Item-System | concept-vnum, concept-proto |
| topic-Combat-System | concept-architecture |
| topic-Quest-System | concept-lua-quests, concept-architecture |
| topic-UI-Python-System | concept-python-ui, concept-architecture |
| topic-Map-World-System | concept-sectree, concept-architecture |

---

## Home.md Rewrite

All existing content preserved. Changes:

1. **New top section: "Where do I start?"** with 3 paths:
   - Path A (new to Metin2 dev): start-overview → start-requirements → start-server-setup → start-client-setup → start-first-change → start-workflow
   - Path B (programmer, new to Metin2): start-overview → concept-architecture → concept-packets → concept-vnum → concept-proto → guide-Adding-a-New-System
   - Path C (experienced dev): start-overview → Blueprint pages → Topic Guides

2. **New sections added** (after existing sections):
   - Getting Started (all start-* pages with one-sentence descriptions)
   - Concepts (all concept-* pages with one-sentence descriptions)
   - Troubleshooting (all troubleshoot-* pages with one-sentence descriptions)

3. **One-sentence descriptions** added to any existing link currently missing one.

---

## _Sidebar.md Update

Three new sections inserted at the top, after `[[Home]]` and before `## Blueprints`:

```markdown
## Getting Started
- [[start-overview|Overview & Getting Started]]
- [[start-requirements|Requirements & Prerequisites]]
- [[start-server-setup|Setting Up the Server]]
- [[start-client-setup|Setting Up the Client]]
- [[start-first-change|Your First Change]]
- [[start-workflow|Daily Development Workflow]]

---

## Concepts
- [[concept-architecture|How Everything Fits Together]]
- [[concept-packets|What is a Packet?]]
- [[concept-vnum|What is a vnum?]]
- [[concept-proto|item_proto and mob_proto]]
- [[concept-sectree|What is a SECTREE?]]
- [[concept-lua-quests|Understanding the Quest System]]
- [[concept-python-ui|Why Python for the UI?]]

---

## Troubleshooting
- [[troubleshoot-server|Fixing Server Errors]]
- [[troubleshoot-client|Fixing Client Errors]]
- [[troubleshoot-db|Fixing Database Problems]]

---
```

---

## Execution Order

```
Task 5: start-overview, start-requirements, start-server-setup,
        start-client-setup, start-first-change, start-workflow

Task 6: concept-architecture, concept-packets, concept-vnum,
        concept-proto, concept-sectree, concept-lua-quests,
        concept-python-ui

Task 7: troubleshoot-server, troubleshoot-client, troubleshoot-db

Task 2: blueprint-Game-Client-Protocol, blueprint-Login-Flow,
        blueprint-Character-System, blueprint-Item-System,
        blueprint-Combat-System, blueprint-Quest-System,
        blueprint-UI-Python-System, blueprint-Map-World-System

Task 3: guide-Adding-a-New-System, guide-Build-Environment,
        guide-Best-Practices, guide-Asset-Pipeline,
        guide-Localization, guide-Debugging, guide-Database-Proto,
        guide-Security-AntiCheat, guide-Skill-Buff-System,
        guide-NPC-and-Spawning, guide-Horse-Mount-Pet, guide-Economy

Task 4: topic-Game-Client-Protocol, topic-Login-Flow,
        topic-Character-System, topic-Item-System,
        topic-Combat-System, topic-Quest-System,
        topic-UI-Python-System, topic-Map-World-System

Task 1: Home.md (full rewrite)
        _Sidebar.md (3 new sections)
```

After each file: output `✅ Done: [filename]`
After each task group: output `✅ Task [N] complete — [X] files processed`
At completion: output full summary of new and updated files.

---

## Quality Rules

1. Every new page opens with the target audience box
2. Every new page closes with a Next Steps section
3. Every concept-* page has at least one ASCII diagram
4. Every troubleshoot-* page has a structured error table
5. No installation steps from scratch — link to READMEs:
   - Server: https://github.com/d1str4ught/m2dev-server-src/tree/21519899adf6ade7937d71b1d9d886d502762a3b?tab=readme-ov-file#installationconfiguration
   - Client src: https://github.com/d1str4ught/m2dev-client-src/tree/a7555110828182f20d0a0306aac0552142cf0039#installationconfiguration
   - Client bin: https://github.com/d1str4ught/m2dev-client/tree/ecef2dcdb89f5d0344677b2902ad175809b70f52?tab=readme-ov-file#installationconfiguration
6. No large C++ code blocks on concept pages
7. Tables for comparisons and checklists wherever possible
8. Cross-link between related pages generously
9. Tone: clear, direct, friendly — not dumbed down, not assuming unexplained knowledge
10. English only
