# What's left

Status of **The Lighthouse Keepers** for the Friendzone Mobile Buildathon.
Done so far: engine ported to SDK7, multiplayer sync (`syncEntity`), physical
stations, sweeping beam, React-ECS HUD + overlays, logbook. Both the `scene/`
build and the web prototype compile clean and are pushed to `main`.

---

## 1. Blockers — only you can do these

- [ ] **Get a World name.** Ask in the Friendzone Discord channel for a free
      buildathon name first (costs nothing). Otherwise claim a Decentraland
      NAME at `decentraland.org/builder/names` — 100 MANA (burned) + ~$1 POL
      for Polygon gas. Or attach a World to an ENS `.eth` name you already own
      (36 MB cap). Details: `docs/REQUIREMENTS.md` §1.
- [ ] **Set the name** in `scene/scene.json` → `worldConfiguration.name`
      (currently `CHANGE-ME.dcl.eth`).
- [ ] **Deploy** — `cd scene && npm run deploy`, sign with the wallet that owns
      the name. Keep the World live through judging (Sep 12–18).
- [ ] **Submit on DoraHacks** before the deadline. Brief says 2026-09-11
      05:30 UTC — check whether it has passed or was extended.
- [ ] Confirm the GitHub repo is public and stays public through judging.

## 2. Verification — needs the Decentraland app installed

- [ ] `cd scene && npm run start` — test in the desktop client. Nothing in the
      scene is verified in-client yet, only that it type-checks and bundles.
- [ ] `npm run start -- --mobile` — test on a real phone: tap targets, tapping
      ships from the balcony, station reach distance (`maxDistance: 3.5` in
      `scene/src/world.ts`), HUD readability at phone size.
- [ ] Open two browser windows — confirm `syncEntity` state agrees between
      players and authority election (lowest wallet address) works.
- [ ] Check framerate on a mid-range phone, not just desktop.

## 3. Tuning — likely needed after playing it

- [ ] Station positions in `scene/src/world.ts` — the parcel is only 16 m, they
      may feel cramped.
- [ ] Decay rates and `crewFactor()` in `scene/src/engine.ts` — balance solo
      vs. 2–4 players so a solo judge can still win a hard night.
- [ ] Ship z-range, spawn cadence, and `SHIP_HOME_AT`.
- [ ] Beam cone size / sweep speed (`beamSpinSystem` in `scene/src/systems.ts`).

## 4. Polish — optional

- [x] **Sound.** 12 clips from the free DCL audio catalog in
      `scene/assets/Audio/`, played through global `AudioSource`s in
      `scene/src/feedback.ts` — every cue + a looping night bed. Needs an
      in-client listen to check levels/fit.
- [ ] Real `navmapThumbnail` — a 228×160 screenshot of the scene for the Places
      listing (`scene/images/scene-thumbnail.png`).
- [ ] Move the static tower/island into `scene/assets/scene/main.composite` so
      it is editable in the Creator Hub. **Best done by the Creator Hub itself** —
      open the scene there once and its MCP/inspector writes the composite +
      `entity-names.ts` correctly. Hand-writing it now, untested, is not worth
      the risk. The scene is code-first for now (like the SDK template).
- [ ] Swap the logbook from `syncEntity` (resets when the scene empties) to a
      Multiplayer Server for true cross-session persistence —
      `docs/SDK7-PORT.md` §3.2. Keep the `readLog` / `appendLogEntry` shapes.
- [ ] Fill in `scene.json` `owner` and `contact.email`.

## 5. Done

- [x] Hackathon requirements reviewed (`docs/REQUIREMENTS.md`).
- [x] Web prototype UI polished — hero landing, deeper scene, co-op signalling.
- [x] Submission pitch (`docs/PITCH.md`) and SDK7 port guide (`docs/SDK7-PORT.md`).
- [x] SDK7 scene built in `scene/` — engine, state/sync, world, systems, UI.
- [x] Sound wired — 12 catalog clips through `AudioSource` (`scene/src/feedback.ts`).
- [x] Hardening pass: ship/mast entity leak fixed (`removeEntityWithChildren`),
      modal overlays block clicks (`pointerFilter`), `isMobile()` read per-frame,
      solo authority fallback when the wallet address hasn't resolved.
- [x] Both projects type-check and build clean; pushed to `main`.
