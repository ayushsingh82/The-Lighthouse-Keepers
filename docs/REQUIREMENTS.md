# Friendzone Buildathon — Requirements & Build Plan

> Decentraland Friendzone Mobile Buildathon · Host: DCL Regenesis Labs · Prize pool: 8,000 USD (MANA)
> **Extended submission deadline: 2026-09-11 ~05:30 UTC** · Judging: Sep 12–18 · Winners: Sep 20
> Source hackathon brief: `docs/decentraland-friendzone-mobile-buildathon.md`

---

## 0. TL;DR — what this project must be

| Thing | Value |
|---|---|
| Deliverable | An **SDK7 Decentraland scene** deployed to a **Decentraland World**, publicly reachable through judging (Sep 12–18) |
| Stack | Decentraland SDK7 (TypeScript / ECS) — **NOT** a web app |
| Target device | **Mobile-first** (DCL mobile app, touch, small screen). Judges test on the mobile app. |
| Must be | Multiplayer / genuinely social, persistent, standalone (no host needed) |
| Repo | Public GitHub, open source |
| Submit via | DoraHacks, before the deadline |

> ⚠️ **The current `friendzone/` folder is a Next.js scaffold. That stack cannot be submitted.** Step one is to replace it with an SDK7 scene project.

> ✅ **Update:** the SDK7 scene now exists in [`scene/`](../scene/) — engine ported,
> multiplayer sync (`syncEntity`), physical stations, sweeping beam, React-ECS HUD +
> overlays, logbook. Type-checks and bundles clean on `@dcl/sdk` 7.28.0. Still
> **not deployed** — blocked on a World name (§1) and not yet verified in the
> Decentraland client. Port guide + design rationale: [`SDK7-PORT.md`](./SDK7-PORT.md),
> [`PITCH.md`](./PITCH.md).

---

## 1. Accounts & wallet (we do NOT have this yet — must sort out first)

Deployment is **blocked** until we have a wallet that owns a World name.

### 1.1 What's needed
| Item | Why | Cost | Notes |
|---|---|---|---|
| Ethereum wallet (MetaMask / any WalletConnect) | DCL login + signs the deploy + receives MANA prizes | free | One wallet for the whole team is fine |
| **A Decentraland NAME (NFT)** | Grants a World `yourname.dcl.eth` + **100 MB** scene storage | **100 MANA** (burned) + gas | Claimed on **Polygon** via DCL Marketplace / Builder |
| ~100+ MANA | To buy the NAME | ~$25–35 (MANA price dependent) | Buy on an exchange, withdraw to Polygon |
| A little POL (MATIC) | Polygon gas for the claim tx | ~$1 | |

### 1.2 Storage math (per wallet, stacks)
- 100 MB per NAME owned
- +100 MB per LAND parcel owned
- +100 MB per 2,000 MANA held in the wallet

100 MB is plenty for a lean mobile scene — keep assets small anyway (see §5).

### 1.3 Cheaper / free alternatives
| Option | Limit | Trade-off |
|---|---|---|
| Attach a World to an **ENS domain** you already own (`name.eth`) | **36 MB** fixed scene size | Needs an existing ENS name (mainnet); tighter budget |
| **Ask in the Friendzone Discord channel** whether organizers give a free World name for the buildathon | — | Some DCL events do this; costs nothing to ask, unblocks us immediately |

### 1.4 Setup checklist
- [ ] Create / choose a team wallet (MetaMask)
- [ ] Ask in Friendzone Discord about a free buildathon World name
- [ ] If none: acquire ~100 MANA + ~$1 POL on Polygon
- [ ] Claim a NAME at `decentraland.org/builder/names` (or `marketplace.decentraland.org`)
- [ ] Record the World name → goes in `scene.json` → `worldConfiguration.name`
- [ ] Confirm login works in the **DCL mobile app** with that wallet

---

## 2. Tooling

| Tool | Purpose | Required? |
|---|---|---|
| Node.js 18+ | Build the scene | ✅ |
| Decentraland **Creator Hub** (desktop, Win/Mac) | Visual editor, one-click publish, "Show QR for Mobile" preview | Strongly recommended |
| `@dcl/sdk` + `@dcl/sdk-commands` | SDK7 + CLI (`npx @dcl/sdk-commands init`) | ✅ |
| Decentraland **desktop client** | Local preview while developing | ✅ |
| Decentraland **mobile app** (iOS/Android) | The real test surface — judges use it | ✅ |
| VS Code + GLTF Tools extension | Inspect .glb models | optional |
| Blender + DCL Blender add-on / Blender MCP | Make/optimize 3D assets | optional |
| DCL AI skills (`npx skills add decentraland/sdk-skills`) | Teach the AI assistant SDK7 patterns | optional, helpful |
| DCL Scene Optimizer | Compress textures in GLBs | optional |

### Free asset sources (avoid modeling from scratch)
- **OpenDCL catalog** — 8,800+ free GLB/glTF props & environments
- **Genesis Plaza assets** — reusable models, textures, landscaping
- Load via `GltfContainer`

### Key commands
```bash
# scaffold
npx @dcl/sdk-commands init

# preview on desktop
npm run start

# preview on phone (phone + computer on same Wi-Fi, scan QR)
npm run start -- --mobile

# deploy to your World
npx sdk-commands deploy --target-content https://worlds-content-server.decentraland.org
#   -> World name comes from scene.json "worldConfiguration": { "name": "yourname.dcl.eth" }
#   -> live at decentraland.org/play?realm=yourname.dcl.eth
```

---

## 3. Hard submission requirements (checklist)

- [ ] SDK7 scene **deployed to a Decentraland World**, publicly accessible **throughout judging (Sep 12–18)**
- [ ] **Meaningful social interaction** — multiplayer activity / co-op / competition / social system. *Single-player experiences and empty venues are explicitly ineligible.*
- [ ] **Persistent & standalone** — works any time, with no scheduled event, host, performer, or moderator
- [ ] **Designed & tested for mobile** — touch controls, small screens, safe area
- [ ] **Open source**, public GitHub repo (GitHub/GitLab/Bitbucket link required)
- [ ] **Submitted through DoraHacks** before the deadline
- [ ] **Original** — not used in past Decentraland competitions
- [ ] Complies with Friendzone T&C + Decentraland Terms of Use

---

## 4. Judging criteria (design to these)

| Criterion | What they're asking |
|---|---|
| Mobile-First Experience | Feels *built* for mobile, not ported from desktop |
| Social Value | Encourages interaction, cooperation, competition, communication, shared participation |
| Mobile UX & Accessibility | Controls, UI, text, onboarding all suit touch + small screens |
| Performance & Optimization | Loads and runs smoothly within mobile limits |
| Creativity & Originality | Fresh, memorable, surprising concept |
| Retention & Discovery | A reason to return, share, invite friends |
| Overall Execution | Complete, stable, coherent, "ready to be featured" |

> Stated explicitly by the organizers: **a simple, polished, enjoyable mobile experience scores higher than a complex one that's confusing, slow, or weakly social.**

---

## 5. Mobile constraints that shape the design

**Input**
- No hover, no keyboard shortcuts, no right-click, no gestures (not planned)
- Every interaction = **tap on an entity** (pointer event) or an **on-screen UI button**
- Use the **Mobile Safe Area** API so UI isn't under notches / home bar
- Keep tap targets big; minimise simultaneous button presses

**Not supported / different on mobile client (reviewed Aug 2026)**
- **Smart Items not officially supported** → write real SDK7 code, don't rely on no-code Actions
- **No proximity voice chat** → the social hook must work through visuals / shared UI / emotes, **not voice**
- No nameplates, no communities, no DMs, no chat reactions on mobile
- Dynamic lights (`LightSource`), nine-slice `UiBackground`, and several audio components not on mobile yet
- "Animation finished" auto-detection is **desktop only** — track timing manually
- Some video URLs (YouTube / Google Drive) unsupported
- Collider behavior can differ slightly between platforms

**Performance**
- Tight poly / texture / material / draw-call budget — see SDK "Scene limitations"
- Compress textures, reuse materials, keep the scene small, LOD big meshes
- Test framerate on an actual mid-range phone, not just desktop

**Multiplayer**
- `MessageBus` / SDK networking → sync state between players in the scene (P2P) — good for positions, simple game state
- **Multiplayer Server** → authoritative scores + persistent leaderboard the client can't fake (needed if we do a competitive leaderboard)
- Reference: DCL "Multiplayer Server Leaderboard" pattern; sample scene `kickoff-2026`

**Reference open-source mobile scenes** (study these for structure/perf):
`dead-surge` (multiplayer shooter), `cozy-farm` (farming sim), `kickoff-2026` (prediction game), `venetian-hunt` (multiplayer prop hunt), `towerofmadness` (multiplayer parkour) — all under `github.com/dcl-regenesislabs`.

---

## 6. Concept options — 2 per category

| # | Category | Concept | One-liner | Social mechanic | Mobile fit | Effort (of 4 days) |
|---|---|---|---|---|---|---|
| A1 | Co-op party game | **Overcook'd Campfire** | 2–4 players gather scattered ingredients and combine them at stations to fill orders against a timer | You physically can't keep up alone — forces division of labour & shouting via text/emote | Tap to pick up / drop / combine; short rounds | Medium |
| A2 | Co-op party game | **Two-Key Vault** | A short co-op obstacle room where every door needs 2+ players on pressure plates at once; you escape together or not at all | Total interdependence; one player alone is stuck | Walk onto plates + tap levers; no dexterity needed | **Low–Medium (recommended if going co-op)** |
| B1 | Competitive + leaderboard | **Reaction Pillars** | Pillars light up at random; first player to tap the lit one scores. Best of N rounds, global leaderboard | Head-to-head presence in the same arena; rivalry, rematches | Pure tap-speed — ideal for touch | **Low (recommended overall)** |
| B2 | Competitive + leaderboard | **Coin Rush** | 60-second scramble to grab the most coins in an arena with moving hazards; per-run score to a daily + all-time leaderboard | Shared arena, live rank ticker, daily reset = return hook | Joystick move + auto-collect on touch | Medium |
| C1 | Social hangout + activities | **Rooftop Lounge** | Cozy phone-sized rooftop: shared jukebox (vote next track), photo spots, a bonfire that triggers a synced effect when 3+ players emote around it | Ambient co-presence + small shared rituals | All tap / emote; tiny scene = fast load | Low–Medium |
| C2 | Social hangout + activities | **Campfire Questions** | Sit at the fire, an on-screen prompt shows an ice-breaker question, a rotating "hot seat" answers via quick UI; others react | Gives strangers a scripted reason to talk — pure social value | UI buttons + sit action; text-light | Low |

### Recommendation given ~4 days, mobile-first, no voice
**B1 — Reaction Pillars.** Smallest asset footprint, the mechanic *is* tapping (maximally mobile-first), obviously competitive/social, and a server leaderboard gives the retention/discovery score. Fallback if we want warmth over competition: **A2 — Two-Key Vault** (co-op, low asset needs) or **C2 — Campfire Questions** (strongest pure "social value", least 3D work).

---

## 7. Immediate next steps

1. **Pick a concept** from §6.
2. **Unblock deployment** — §1.4 (ask Discord about a free name first).
3. Replace the Next.js scaffold with an SDK7 project (`npx @dcl/sdk-commands init`).
4. Grey-box the scene + core loop, preview on a real phone day 1.
5. Add multiplayer sync (and server leaderboard if B1/B2).
6. Polish UI for safe area + touch, optimise assets.
7. Deploy to the World, push public GitHub repo, submit on DoraHacks **before Sep 11 ~05:30 UTC**.
8. Keep the World live and the repo public through Sep 18.

---

## References
- Hackathon brief: `docs/decentraland-friendzone-mobile-buildathon.md`
- Build for Mobile: https://docs.decentraland.org/creator/build-for-mobile/mobile-client/
- Mobile missing features: https://docs.decentraland.org/creator/build-for-mobile/mobile-client/missing-features.md
- SDK7 vibe coding / AI skills: https://docs.decentraland.org/creator/scenes-sdk7/getting-started/vibe-coding
- Publishing a scene: https://docs.decentraland.org/creator/development-guide/publishing/
- Worlds storage limits: https://decentraland.fandom.com/wiki/Worlds
- Scene limitations: https://docs.decentraland.org/creator/development-guide/sdk7/scene-limitations/
- Sample mobile scenes: https://github.com/dcl-regenesislabs
