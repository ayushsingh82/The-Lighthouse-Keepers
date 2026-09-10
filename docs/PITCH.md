# The Lighthouse Keepers — Pitch

**A co-op night watch for mobile Decentraland.** The keeper is gone and the
beacon is dead. You and a few strangers wash ashore in the fog. Three stations
keep the light alive — the rotation gear, the flame, the lens — and one pair of
hands can't hold all three. Keep the beam burning until dawn and guide the ships
past the rocks. At first light, a message in a bottle washes up: a line left by
a real group who kept the light before you. You sign the logbook and leave one
line for whoever comes next.

**Tagline:** *Keep the light alive until dawn. Nobody keeps it alone.*

---

## The loop (one 3.5-minute night)

1. **Briefing** — the fog is coming in. Split up: who has the gear, who has the flame, who watches the sea.
2. **Night** — three meters decay continuously. `Wind` (hold) the gear, `Stoke` (tap) the flame, `Wipe` (tap) the lens. Fog waves roll in on a timer and eat the lens fast.
3. **The beam** only shines when all three are above the line. While it shines, tap ships on the horizon to guide them home. While it's dark, ships break on the rocks — and you have 12 seconds of grace before the night is lost.
4. **Dawn** — you made it. Rescue tally updates the World's all-time counter. Draw a bottle message from a past group. Sign the logbook.
5. **Wreck** — too many ships lost, or the beam stayed dark too long. The fog takes the tower. The drowned keeper drifts through. Relight and try again.

---

## Why it scores against the judging criteria

| Criterion | How this scene answers it |
|---|---|
| **Mobile-First Experience** | Every action is one finger: tap-and-hold to wind, single taps to stoke/wipe, tap a ship to mark. No dexterity, no multi-touch, no camera control needed. Portrait. Designed for the phone from the first sketch, not ported. |
| **Social Value** | Genuine interdependence — the meters decay faster than one player can service. You physically divide labour and call out which station is slipping. No voice needed (mobile has none): the shared HUD, the station "open / you" chips, and the beam going dark *are* the communication channel. |
| **Mobile UX & Accessibility** | Safe-area insets, large thumb-zone buttons, bottom-up fuel fills so you read a station without looking up, a reduced-motion mode, a one-tap sound/haptics mute, colour + shape + text for every state (not colour alone). Onboarding is a 4-line briefing you can't get wrong. |
| **Performance & Optimization** | One island, one interior, grey-box + OpenDCL props, one fog-wave type, ~26 stars, a single beam mesh. Small texture/material/draw-call budget. Snapshot-based netcode (~5 Hz), not per-frame. |
| **Creativity & Originality** | It leads with a *world and a mood*, not a mechanic — dread, fog, a failing light, a ghost. The bottle messages and the logbook make every night part of a chain of real groups. Memorable in a way a leaderboard game isn't. |
| **Retention & Discovery** | Three return hooks: (1) the World's running "souls guided home" counter you contributed to, (2) the logbook — your line is there for strangers to read, (3) bottle messages — you only see them by surviving. Naturally a "bring a friend, we need a third" pitch. |
| **Overall Execution** | Tight scope, one coherent fantasy, graceful from 1 to 4+ players, a real fail state with a real payoff. Ready to be dropped into Mobile Discover. |

---

## Multiplayer model (see SDK7-PORT.md §3)

- **Station state + ships** — synced between clients via `@dcl/sdk/network`; the
  authoritative `tick` runs on one elected client and broadcasts snapshots.
- **Logbook + all-time tally** — a Multiplayer Server owns them, validates
  writes, and broadcasts. Client-fakeable scores are not.
- **Scales with player count** — decay eases ~15% per extra keeper present (or
  ships spawn faster); nothing ever *requires* N players, so a solo judge can
  still win a hard night.

## Mobile controls

| Action | Input | Station |
|---|---|---|
| Wind the rotation gear | tap **and hold** a button (or stand at the gear) | keeps the beam turning |
| Stoke the flame | single **tap** | keeps the beam bright |
| Wipe the lens | single **tap** | clears fog off the glass |
| Guide a ship | **tap the ship** on the horizon while the beam is lit | +1 guided home |
| Mute sound + haptics | one toggle, top-right | — |

## Scope cut for the build window

One island · one lighthouse interior (grey-box + OpenDCL props) · 3 stations ·
one fog-wave type · a 3.5-minute night · logbook + bottle = server key-value ·
beam = one rotating emissive cone mesh. Everything else is polish.
