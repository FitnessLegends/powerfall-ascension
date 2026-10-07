# Powerfall Architecture Contract

Powerfall is intentionally being moved away from a single-file prototype toward small systems with explicit ownership.

## Non-negotiable rules

1. **HUD code does not mutate gameplay state.**
   - HUD modules may read run/meta state and update the DOM.
   - They must not grant rewards, move stages, damage entities, or change saves.

2. **Rendering cannot decide gameplay outcomes.**
   - Enemy death, player death, rewards, saves, and power acquisition must finish even if a render throws.
   - Rendering is presentation only.

3. **Combat timers have one owner.**
   - src/combat-runtime.js is the only module that creates player/enemy combat intervals.
   - Callers may request start/stop/update, but must never create parallel intervals directly.

4. **Power Awakening has one owner.**
   - src/power-awakening.js owns the pending reward queue, choice generation, selection transaction, reroll and Risk Mutation.
   - A power reward is not consumed until acquisition is committed.

5. **Save scheduling has one owner.**
   - src/save-runtime.js owns snapshot timing, debouncing, autosave and persistence telemetry.
   - Save migration/hydration can remain in core until it is safely extracted.

6. **Progression routing has one owner.**
   - src/progression-runtime.js owns worlds, milestone lookup and milestone Power Awakening presentation.

7. **Critical state transitions run through the state-store bridge.**
   - High-risk operations such as enemy defeat and player defeat use src/state-store.js.
   - Before/after invariant checks must remain enabled unless the pre-state is intentionally transient.

8. **Impossible state is reported, not ignored.**
   - src/invariants.js validates health, stage, rewards, powers and UI/combat conflicts.
   - New systems must add invariants for their own impossible states.

9. **No feature ships on syntax alone.**
   A trusted build must pass:
   - syntax gate
   - invariant unit tests
   - deterministic simulation
   - Chromium gameplay smoke test
   - WebKit gameplay smoke test

10. **Static content belongs in data modules.**
    - src/data/config.js
    - src/data/powers.js
    - src/data/enemies.js
    - src/data/story.js
    New large tables should not be added back into index.html.

## Module ownership

| Module | Owns | Must not own |
| --- | --- | --- |
| power-awakening.js | reward queue, rolls, choice transaction | stage advancement, generic HUD |
| combat-runtime.js | combat timers | damage formulas, DOM layout |
| hud-runtime.js | HUD DOM rendering | gameplay mutation |
| save-runtime.js | save timing and persistence shell | progression rules |
| progression-runtime.js | worlds and milestone routing | combat intervals |
| state-store.js | transaction boundaries and checkpoints | presentation |
| invariants.js | state validation | gameplay mutation |
| telemetry.js | event/error breadcrumbs | gameplay decisions |

## Change procedure

For every meaningful gameplay change:

1. Identify the owning module.
2. Add or update an invariant/test first when practical.
3. Change the smallest owning surface.
4. Do not reach across modules to mutate private state.
5. Run the stability workflow.
6. Only treat the Vercel preview as trusted after CI is green.
7. During phone playtesting, use **Settings → Runtime Health → Copy Debug Report** when behavior looks wrong.

## Refactor direction

The remaining main-runtime work should be extracted gradually under the test suite:

1. combat formulas and enemy lifecycle
2. run/meta state hydration and migration
3. upgrades and Ascension logic
4. achievements
5. events/story orchestration
6. remaining UI overlays

Do not perform a framework rewrite merely for organization. The goal is explicit ownership, testability and predictable state transitions.
