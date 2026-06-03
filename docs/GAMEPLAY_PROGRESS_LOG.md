# Gameplay Progress Log

This document records what changed at each implementation step while we work through `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — P1 story choices and Shade reactions

Plan area: P1 — Story choices and Apathy Shade reactions.

What changed:
- Added persistent `state.storyFlags` with save migration to version 6.
- Regional quest completions now record story choices such as challenging rumours, defending rights, helping volunteers, using evidence, and planning action.
- Mini-game completions can also record matching story choices when the player earns a medal.
- Progress → Story now shows `Choices against Apathy` and the current Shade reaction.
- Story cutscenes now include a short choices/Shade reaction line.
- Silver and Gold endings now require enough story choices, not only readiness and exam score.
- Public build version moved to `2026.06.03.8`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Browser smoke test for save migration, Progress story flags, and ending thresholds

Next marker:
- We are now at P2 — Curriculum tracking as real learning progress in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — Exterior map cleanup pass

Plan area: visual and movement cleanup for all non-interior regions.

What changed:
- Cleaned Modern Britain, Rights & Law, Democracy, Participation Harbour, Action Workshop, and Exam Hall maps using the same approach as Citizenship Village.
- Removed internal placeholder stone blocks and tree blockers from exterior maps.
- Replaced cluttered building-placeholder tiles with passable road/plaza/grass surfaces.
- Kept Participation Harbour water as an intentional boundary while making wooden dock tiles passable.
- Moved three NPCs slightly away from collision edges: Devolution Herald Ewan, Digital Moderator Rae, and Source Keeper Nia.
- Public build version moved to `2026.06.03.7`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- Runtime browser check across all exterior maps: no internal random blockers, no blocked spawns, no blocked NPCs

Next marker:
- Continue from P1 — Story choices and Apathy Shade reactions in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — Village map cleanup

Plan area: first-location visual and movement cleanup.

What changed:
- Cleaned the Citizenship Village base map by removing internal blocking stone blocks, trees, and water tiles that looked like random obstacles.
- Kept building collision on actual buildings, while making the central plaza and approach paths easier to read and move through.
- Removed nonfunctional Village market stalls, fences, random barrels, crates, and the decorative dock/water block that cluttered the first screen.
- Added sparse nonblocking meadow/flower detail so the map still has texture without blocking movement.
- Public build version moved to `2026.06.03.6`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- Browser screenshot smoke for the cleaned Village field

Next marker:
- Continue from P1 — Story choices and Apathy Shade reactions in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — P1 economy and vendors

Plan area: P1 — Economy and vendors.

What changed:
- One vendor NPC is available in each major region.
- Trade menu now shows regional shop stock for vendor NPCs.
- Players can buy useful supplies with coins directly from NPC panels.
- Shops sell Focus consumables and region-appropriate tools/outfits.
- Unique items are disabled in the shop once owned.
- Quest items no longer show Sell buttons and cannot be sold defensively.
- The plan marker moved to P1 — Story choices and Apathy Shade reactions.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Browser smoke test for vendor shop purchase and mobile shop layout
- Azure Static Web Apps deployment confirmed

Next marker:
- We are now at P1 — Story choices and Apathy Shade reactions in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — P1 Focus and stat clarity

Plan area: P1 — Improve RPG stats and Focus.

What changed:
- Focus is now a real resource for equipped-tool assists in mini-games.
- Tool assists cost 10 Focus and only trigger once per mini-game run.
- `Justice Quill` can assist Source Detective and the final exam `Evaluate`/`Source` sections.
- `Debate Blade` can assist Debate Arena.
- Study Stations now restore Focus when completed, so buildings also act as recovery points.
- Character Panel now explains each stat and shows its Exam Readiness contribution.
- Character Panel now shows the shared Exam Readiness formula and tool-assist Focus cost.
- Public build version moved to `2026.06.03.4`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Browser smoke test for Character Panel on desktop and mobile viewport
- Azure Static Web Apps deployment confirmed

Next marker:
- We are now at P1 — Economy and vendors in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — P1 item effects

Plan area: P1 — Make items more game-like.

What changed:
- Key items gained `effect` metadata.
- `Revision Tea` restores Focus.
- `Notebook` opens Progress and shows the current objective.
- `Citizen Scroll` opens the Story/Progress hint for the current act.
- `Justice Quill` and `Debate Blade` gained thematic mini-game assists.
- Final Exam breakdown can display `tool assist` rows.
- Public build version moved to `2026.06.03.3`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Azure Static Web Apps deployment confirmed

## 2026-06-03 — P0 final exam and mini-game integration

Plan area: P0 — World-connected mini-games and final Exam Simulation.

What changed:
- Mini-games can be launched from specific NPC hosts.
- Progress now shows mini-game hosts and regions.
- Exam Simulation became a five-section final exam: Identify, Describe, Explain, Evaluate, Source.
- Exam Simulation saves section breakdowns and affects final endings with Exam Readiness.
- Exam Hall practice spacing was adjusted so `Identify` is reachable and no longer collides with the entrance prompt.
- Public build version moved to `2026.06.03.2`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- Custom Exam Hall spacing check
- VS Code diagnostics for edited files
- Azure Static Web Apps deployment confirmed