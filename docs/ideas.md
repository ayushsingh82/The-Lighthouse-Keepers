# Friendzone — Concept Ideas

Both of these lead with a **world and a hook**, not just a mechanic — that's what wins the
Creativity & Originality and Retention & Discovery scores.

---

## 1. The Lighthouse Keepers  *(co-op, 2–5 players)*  — SELECTED

**Story.** A lighthouse on a fog-drowned island. The old keeper is gone, the light is dead, and
ships are breaking on the rocks. You and a few strangers wash ashore in the dark — and the only
way off is to keep the beacon alive until dawn.

**The loop.** The light needs constant hands and no one person can cover it:
- one player **winds the rotation gear** (it slows and stops if left alone)
- one **stokes the flame**
- one **wipes fog off the lens**
- one stands on the **balcony spotting ships**, tapping them to mark bearings

Fog banks roll in on a timer. If the beam dies, the screen goes cold, a drowned-keeper ghost
drifts through, and the night resets. Survive to dawn and a **message in a bottle** washes up —
carrying a note left by a *real previous group* (server-persisted). Before you leave you sign the
**keeper's logbook** and leave one line for whoever comes next.

| | |
|---|---|
| **Why it scores** | Real interdependence (Social Value); a clear arc with dread + payoff (Creativity); persistent logbook + global "ships saved" counter + bottle messages (Retention) |
| **Mobile controls** | Tap-and-hold to wind; tap to stoke / wipe; walk to balcony; tap ships to mark — no dexterity, no multi-touch |
| **4-day scope cut** | One island, one lighthouse interior (greybox + OpenDCL props), 3 stations, one fog-wave type, a 4-minute night. Logbook + bottle = simple server key-value. |

---

## 2. Last Call at the Static Bar  *(social hangout, drop-in)*

**Story.** A bar wedged between radio stations, on the edge of a signal that's fading out. The
bartender — Vox — is never there; he talks only through a broken jukebox, in static. Patrons
"tune in" from the noise, share a drink, and try to keep the place on the air one more night.

**The loop.** The jukebox is dead. It only plays when the room performs a shared ritual together —
everyone sits, everyone does the same emote on Vox's cue, someone drops a "memory" into the jar.
Each song you unlock lights another panel of the neon sign and reveals a fragment of Vox's story.
Over many visits, the crowd collectively rebuilds who Vox was and why the signal is dying. A wall
lets each patron pin **one line** — a confession, a joke, advice — that stays for the next crowd.

| | |
|---|---|
| **Why it scores** | Pure social value with strangers; needs zero skill so anyone joins; unmistakable mood / originality; story fragments + growing memory wall = strong return hook; tiny scene = fast mobile load |
| **Mobile controls** | Tap to sit; emote wheel; tap to pin a note — entirely touch-native, text-light |
| **4-day scope cut** | One room, ~5 unlockable songs / story panels, emote-sync ritual, server-persisted wall + unlock state. Voice not needed (good — mobile has no proximity voice). |

---

## Recommendation

**Static Bar** is the safer bet for 4 days and mobile-first: one room, no game-state sync
headaches, the social payoff is the whole point, and it degrades gracefully with 2 players or 12.

**Lighthouse Keepers** is the more memorable, higher-ceiling entry but carries real risk — synced
multiplayer station state, a fail/reset cycle, and more 3D work.

**Decision:** building **Lighthouse Keepers**.
