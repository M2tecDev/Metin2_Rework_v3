# Setting Up the Client

> **Who is this for:** Someone connecting a client to their server for the first time.
> **Prerequisites:** A working server (both db and game processes running) + a built Metin2.exe from client-src + a configured client-bin directory.
> **What you will learn:** How to configure serverinfo.py, pack the assets, and verify the client connects to your server.

## Overview

The client has two independent parts: the executable (`Metin2.exe`, built from client-src) and the runtime assets (Python scripts and data files from client-bin). Both must be set up before you can connect. This page covers the post-build configuration — the actual build steps are in the respective READMEs.

> For building Metin2.exe from source, refer to the **client-src README**:
> https://github.com/d1str4ught/m2dev-client-src/tree/a7555110828182f20d0a0306aac0552142cf0039#installationconfiguration

> For setting up the Python scripts and assets, refer to the **client-bin README**:
> https://github.com/d1str4ught/m2dev-client/tree/ecef2dcdb89f5d0344677b2902ad175809b70f52?tab=readme-ov-file#installationconfiguration

---

## Before You Start

Make sure you have:
- [ ] The server is running (both db and game) — see [start-server-setup](start-server-setup)
- [ ] `Metin2.exe` is built and placed in the client directory
- [ ] client-bin is set up according to its README

---

## Configuring serverinfo.py

`serverinfo.py` is the file that tells the client where your server is. It lives in `root/serverinfo.py` inside client-bin.

The key fields:

```python
SERVER_NAME = "My Server"       # Displayed in the server list (cosmetic)

# Channel 1 configuration
CH1 = {
    "IP"     : "127.0.0.1",     # The IP address of your game server
                                # Use 127.0.0.1 for local testing
                                # Use your public IP for remote clients
    "PORT"   : 11011,           # The game port — must match conf.txt on the server
    "P2P_PORT": 11911,          # Internal game-to-game port (usually PORT + 900)
}
```

**Important:** If you change `serverinfo.py`, you must repack the assets before the client reads the change — the client does not read `.py` files directly from disk.

---

## Packing Assets with pack.py

The client reads all Python scripts and data files from encrypted `.eix`/`.epk` pack archives, not directly from disk. After any change to a `.py` file or asset, you must run `pack.py` to rebuild the archives.

What `pack.py` does:
1. Scans the `root/` and `uiscript/` directories
2. Encrypts and archives the files into `.eix`/`.epk` format
3. Places the pack files in the `pack/` directory
4. The client reads from `pack/` on the next launch

**Rule:** Edit file → run pack.py → restart client. Skipping the pack step is the single most common mistake.

---

## Verifying the Connection Works

After packing:

1. Launch `Metin2.exe`
2. The login screen should appear
3. Enter your account credentials (created via SQL or the account creation tool)
4. If the connection is working: you reach the character creation/selection screen
5. If the connection fails: the client shows a "Cannot connect to server" error or hangs

**What to check if it fails:**
- Is the game process actually running? Check `game/syslog`
- Is the IP in `serverinfo.py` correct?
- Did you repack after editing `serverinfo.py`?
- Is port 11011 open in your firewall?
- Check `syserr.txt` in the client directory for Python errors

See [troubleshoot-client](troubleshoot-client) for a full checklist.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Editing serverinfo.py but not repacking | Client connects to old server or fails to connect | Run `pack.py` after every edit to serverinfo.py |
| Using the wrong IP | Connection failure or "Cannot connect" error | Use `127.0.0.1` for local testing; use your actual server IP for remote |
| Wrong port | Connection hangs or refuses | Port in `serverinfo.py` must match `PORT` in `conf.txt` |
| Metin2.exe and pack files in wrong directory | Client crashes at launch | All files must be in the same directory structure as expected by the client |
| CRC mismatch between client and server proto | Kicked immediately after selecting a character | Regenerate the binary proto files and repack — see [concept-proto](concept-proto) |
| Forgetting to start the server before testing | "Cannot connect" error on every attempt | Start db and game processes first — see [start-server-setup](start-server-setup) |

---

## Next Steps

- [Your First Change](start-first-change) — make your first change and see the full development cycle
- [Daily Development Workflow](start-workflow) — reference for what to restart after each type of change
- [Fixing Client Errors](troubleshoot-client) — if the client is not connecting or crashing
