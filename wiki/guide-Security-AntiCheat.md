# Guide: Security & Anti-Cheat

> ### ✅ Prerequisites
> Before following this guide you should understand:
> - [What is a Packet?](concept-packets)
> - [How Everything Fits Together](concept-architecture)
>
> If you are setting up for the first time, start with [Getting Started](start-overview).

> The golden rules and concrete implementation patterns for keeping the Rework v3 server secure against cheating and exploits.

## The Golden Rule

> **Never trust the client.** The client is always hostile. Every value sent by the client is attacker-controlled. The server must validate everything independently.

---

## 1. Encryption Layer

All traffic between client and game server is encrypted after the handshake phase using **libsodium XSalsa20-Poly1305**, keyed via an **X25519 Diffie-Hellman** exchange.

| Component | File |
|-----------|------|
| Server key exchange | `server-src/src/game/SecureCipher.h/.cpp` |
| Client key exchange | `client-src/src/UserInterface/PythonNetworkStream*.cpp` |
| Sodium library | `vendor/libsodium/` (both repos) |

**What this prevents:** Packet sniffing and trivial packet injection from third parties on the network. It does NOT prevent a player from sending malformed packets from their own machine.

---

## 2. Phase Enforcement

Each client connection has a **phase** (`PHASE_HANDSHAKE` → `PHASE_LOGIN` → `PHASE_SELECT` → `PHASE_LOADING` → `PHASE_GAME`). Only specific packets are valid in each phase.

```cpp
// server-src/src/game/input_main.cpp
void CInputMain::Process(LPDESC d, const void* c_pvOrig, int iSize, int& r_iBytesProceed)
{
    if (d->GetPhase() != PHASE_GAME)
        return;   // silently drop out-of-phase packets
    ...
}
```

**What this prevents:** A client cannot send a `CG_ATTACK` packet before they are in the `PHASE_GAME` — the server drops it.

### Phase Constants

```cpp
enum EPhases {
    PHASE_CLOSE, PHASE_HANDSHAKE, PHASE_LOGIN, PHASE_SELECT,
    PHASE_LOADING, PHASE_GAME, PHASE_DEAD,
    PHASE_CLIENT_CONNECTING, PHASE_DBCLIENT, PHASE_P2P, PHASE_AUTH
};
```

---

## 3. Speed-Hack Detection

The server compares the time between attack packets against the character's computed attack speed.

```cpp
// server-src/src/game/battle.cpp
bool IS_SPEED_HACK(LPCHARACTER ch, LPCHARACTER victim, DWORD dwCurrentTime)
{
    int iDelta = dwCurrentTime - ch->GetLastAttackTime();
    int iLimit  = (int)(1000.0f / ch->GetPoint(POINT_ATT_SPEED) * 1000.0f);
    if (iDelta + SPEED_HACK_LIMIT_BONUS < iLimit)
    {
        // Too fast — flag as speed hack
        return true;
    }
    ch->SetLastAttackTime(dwCurrentTime);
    return false;
}
```

`m_dwLastAttackTime` is updated in `CHARACTER` and compared each attack. If the gap is shorter than physically possible for the character's attack speed, the attack is rejected.

**What this prevents:** Attack-speed cheats (speed hacks, packet spam).

---

## 4. Ownership Validation

Every item operation must verify that the acting character actually owns the item.

```cpp
// server-src/src/game/char_item.cpp — pattern for all item handlers
LPITEM pkItem = ch->GetItem(ItemPos);
if (!pkItem)
    return;   // item doesn't exist in this character's inventory

if (pkItem->IsEquipped())
    return;   // can't use equipped items this way
```

For ground items (dropped items):
```cpp
LPITEM pkItem = ITEM_MANAGER::instance().Find(dwItemID);
if (!pkItem || pkItem->GetOwner() != ch)
    return;   // not yours
```

**What this prevents:** Item duplication via forged `CG_ITEM_USE` packets, stealing ground items, deleting other players' items.

---

## 5. Duplicate Login Prevention

The `db` process tracks all logged-in accounts in `m_map_kLogonAccount`. On a new login attempt it checks for an existing session:

```cpp
// server-src/src/db/ClientManagerLogin.cpp
if (m_map_kLogonAccount.find(login) != m_map_kLogonAccount.end())
{
    // Account already logged in — kick old session, reject or queue new one
}
```

**What this prevents:** Two clients playing the same account simultaneously.

---

## 6. Gold/Value Overflow Checks

The maximum gold value is capped server-side at `GOLD_MAX = 2,000,000,000`. Any operation that would exceed this is rejected:

```cpp
if (ch->GetGold() + lGold > GOLD_MAX)
{
    ch->ChatPacket(CHAT_TYPE_INFO, LC_TEXT("GOLD_MAX_ERROR"));
    return;
}
```

Always validate arithmetic for overflow when adding gold, EXP, or any numeric point.

---

## 7. Untrusted Client Values — What to Never Trust

| Client sends | What to do server-side |
|-------------|----------------------|
| Damage amount | **Ignore.** Calculate damage entirely on the server. |
| Item vnum/count | **Verify** the item actually exists in the character's inventory. |
| Target VID | **Verify** the target exists and is in range via `battle_distance_valid()`. |
| Position (x, y) | **Validate** against the character's previous known position + movement speed. |
| Skill level | **Ignore.** Read skill level from `CHARACTER::GetSkillLevel()`, not from packet. |
| Gold amount | **Ignore.** Gold is calculated server-side; client is never trusted for amounts. |
| Craft/refine result | **Never trust.** The server always determines outcomes. |

---

## 8. Secure Handler Checklist

When writing a new CG packet handler in `input_main.cpp`, follow this checklist:

```cpp
void CInputMain::MyNewPacket(LPDESC d, const char* c_pData)
{
    LPCHARACTER ch = d->GetCharacter();

    // 1. Phase check — already done by dispatcher, but be explicit if needed
    if (!ch) return;

    // 2. Cooldown / rate-limit check
    if (get_dword_time() - ch->GetLastMyActionTime() < MY_ACTION_COOLDOWN)
        return;

    // 3. Read packet data
    const TPacketCGMyNewPacket* p = reinterpret_cast<const TPacketCGMyNewPacket*>(c_pData);

    // 4. Validate all values
    if (p->itemPos.window_type != INVENTORY || p->itemPos.cell >= INVENTORY_MAX_NUM)
        return;

    // 5. Verify ownership
    LPITEM pkItem = ch->GetItem(p->itemPos);
    if (!pkItem) return;

    // 6. Business logic — server-calculated, never client-provided results
    DoServerSideLogic(ch, pkItem);

    // 7. Update state
    ch->SetLastMyActionTime(get_dword_time());
}
```

---

## Key Files

| Path | Repo | Role |
|------|------|------|
| `src/game/SecureCipher.h/.cpp` | server-src | X25519 + XSalsa20 key exchange and stream cipher |
| `src/game/battle.cpp` | server-src | `IS_SPEED_HACK()`, `battle_is_attackable()`, distance checks |
| `src/game/char_item.cpp` | server-src | Item ownership validation patterns |
| `src/game/input_main.cpp` | server-src | CG packet dispatcher — phase + handler routing |
| `src/game/input_login.cpp` | server-src | Login packet handler — credential validation |
| `src/db/ClientManagerLogin.cpp` | server-src | Duplicate-login enforcement |
| `src/common/length.h` | server-src | `GOLD_MAX`, `INVENTORY_MAX_NUM` and other caps |
| `src/common/packet_headers.h` | server-src | All CG/GC header constants and phase definitions |
| `vendor/libsodium/` | both | Cryptographic library |
