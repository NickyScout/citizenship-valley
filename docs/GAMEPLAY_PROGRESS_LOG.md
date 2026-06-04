# Gameplay Progress Log

This document records what changed at each implementation step while we work through `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-04 — GitHub Actions push notification fix

Why:
- GitHub was emailing failure notifications after commits because the Azure Static Web Apps deploy workflow ran on every push to `main` and the deploy step failed.

What changed:
- `.github/workflows/azure-static-web-apps.yml` now runs only from `workflow_dispatch`, so normal commits/pushes no longer trigger deploy attempts.
- The workflow job id is now `build_and_deploy_job`, matching the structure expected by Azure Static Web Apps tooling.
- Handoff notes now describe the workflow as manual-only and still requiring `AZURE_STATIC_WEB_APPS_API_TOKEN` for an explicit manual deploy.

Validation:
- `git diff --check` for the workflow/docs change.
- GitHub Actions metadata confirmed the previous `Deploy Citizenship Game` runs were failing on the deploy step after push events.

Next marker:
- Continue with 20.4 — regional story title cards, distinct mini-game layouts, and medal reward visuals.

## 2026-06-04 — Reboot handoff snapshot

Current status before PC restart:
- Sections 20.1, 20.2, and 20.3 are closed as first-pass graphics/readability work.
- The single active roadmap marker is now 20.4 — story scene and mini-game visual polish.
- Section 20.3 added Backpack category frames, selected item detail panel, effect summaries, keyboard/mouse selection, and quest item lock markers.
- Full QA after section 20.3 completed with `blockingIssues: 0` across UI regression, visual smoke, regional mini-game playthrough, regional quest/gate playthrough, and release smoke.
- `publish/` has been synced with the latest section 20.3 code, styles, validator, docs, and assets.
- Public Azure deploy was not run after section 20.3; deployment smoke remains `not-run` unless explicitly requested.

Files to use when resuming:
- `docs/AI_HANDOFF.md` — current architecture, QA state, reboot resume point, and next task.
- `docs/GAMEPLAY_UPGRADE_PLAN.md` — canonical roadmap marker at 20.4.
- `docs/VISUAL_STYLE_GUIDE.md` — current visual rules for story, item, hero, region, and UI assets.
- `docs/QA_RUNBOOK.md` — quick/full local QA commands.

Next marker:
- Continue with 20.4 — regional story title cards, distinct mini-game layouts, and medal reward visuals.

## 2026-06-04 — Section 20.3 item and Backpack visual pass

Plan area: 20.3 — Items and inventory visuals.

What changed:
- Backpack rows now use type-based category frames for quest, consumable, outfit, tool, and collectible/treasure items.
- Backpack items can be selected, with a larger selected-item detail panel on the right.
- The selected-item panel shows a larger asset thumbnail, item type, stack/equipped state, lock marker, description, effects, and available actions.
- Quest items now display a locked/unsellable marker in Backpack detail and list rows.
- VM UI validation now asserts that the Backpack selected item detail panel renders.
- The plan marker moves to section 20.4: story and mini-game visual polish.

Validation:
- `node --check game.js`
- `node scripts\validate-ui.js`
- `node qa-ui-regression.mjs`
- `node qa-visual-smoke.mjs`

Next marker:
- Continue with 20.4 — story scene and mini-game visual polish.

## 2026-06-04 — Section 20.2 hero customization visual pass

Plan area: 20.2 — Character and customization visuals.

What changed:
- Added profile-driven hero portrait rendering to the HUD and Character panel.
- The portrait and canvas sprite now share preset visual data: hair style, outfit silhouette, shoe colour, backpack colour, trim, and accent.
- Canvas hero presets are more distinct through hairstyles, council/campaign/liberty silhouettes, visible backpack/strap details, shoe colour, and accent overlays.
- `Justice Quill` and `Debate Blade` are now drawn as distinct held tools; no default blade is drawn when no tool is equipped.
- Added a visible interaction-range highlight around the current interactable target.
- The plan marker moves to section 20.3: item and Backpack presentation polish.

Validation:
- `node --check game.js`
- `node scripts\validate-ui.js`
- `node qa-ui-regression.mjs`
- `node qa-visual-smoke.mjs`

Next marker:
- Continue with 20.3 — item category frames, larger selected-item presentation, and quest item lock markers.

## 2026-06-04 — Section 20.1 visual style asset pass

Plan area: 20.1 — General visual style.

What changed:
- Extended the visual style pass with actual small PNG item assets under `assets/items/` for core backpack items, tools, and collectible rewards.
- Added seed visual assets under `assets/ui/` and `assets/props/region/` for future marker/prop replacement.
- `itemThumb()` now prefers image-backed item thumbnails and falls back to CSS pixel art if an asset fails.
- Added stronger region silhouette motifs: media screen, legal scales, ballot booth, volunteer banner, planning/survey board, source archive, and Civic Square label.
- Added subtle Apathy Shade trace shapes in regions whose related story choice has not yet been resolved.
- The plan marker moves to section 20.2: character and customization visual polish.

Validation:
- `node --check game.js`
- `node scripts\validate-world.js`
- `node scripts\validate-ui.js`
- `node qa-visual-smoke.mjs`

Next marker:
- Continue with 20.2 — hero preset silhouettes, HUD/Character portrait, and held item visibility.

## 2026-06-04 — F5 local release smoke pass

Plan area: F5 — Release hardening.

What changed:
- Added `qa-release-smoke.mjs` as a reproducible local release smoke script.
- The script covers desktop keyboard movement, opening one NPC quest menu, primary overlays, Settings persistence/reset, mobile touch movement/interact, and Dev Travel region spot checks.
- It verifies mini-game host buttons during region spot checks.
- Deployment smoke remains explicitly `not-run` unless a separate deploy is requested, because it requires Azure auth and a Static Web Apps token.
- The plan marker moves to choosing the next gameplay expansion or asset pass.

Validation:
- `node --check qa-release-smoke.mjs`
- `node qa-release-smoke.mjs`

Next marker:
- Choose and begin the next gameplay expansion or asset pass.

## 2026-06-04 — F5 visual readability first pass

Plan area: F5 — Visual/readability polish.

What changed:
- Added `docs/VISUAL_STYLE_GUIDE.md` to document tile scale, region palettes, motifs, interaction contrast, UI status colours, and future asset rules.
- Added short world-space region motif labels for key landmarks such as Media Plaza, Court Square, Ballot Hall, Petition Hub, Plan Board, and Exam Gate.
- Added persistent floating `Game` markers above NPCs that host mini-games, so mini-game entry points are visible before the player enters interaction range.
- The plan marker moves to manual release smoke or the next gameplay expansion decision.

Validation:
- `node --check game.js`
- `node scripts\validate-world.js`
- `node scripts\validate-ui.js`
- `node qa-visual-smoke.mjs`

Next marker:
- Run manual release smoke from `docs/RELEASE_SMOKE_CHECKLIST.md`, then choose the next gameplay expansion or visual asset pass.

## 2026-06-04 — F5 balance, handoff, and release smoke pass

Plan area: F5 — Accessibility, polish, release hardening.

What changed:
- Reduced generated post-Village quest rewards from coins plus `Revision Tea` to coins only.
- Added `docs/BALANCE_REVIEW.md` with current XP, Focus, coins, inventory, and Exam Readiness findings.
- Added `docs/RELEASE_SMOKE_CHECKLIST.md` for manual desktop/mobile/release-candidate checks.
- Refreshed `docs/AI_HANDOFF.md` with current QA scripts, Settings system, balance notes, and next recommended tasks.
- The plan marker moves to visual/readability polish.

Validation:
- `node --check game.js`
- `node qa-regional-quests-playthrough.mjs`

Next marker:
- Continue F5/visual polish with regional readability, visual motifs, or interactive markers.

## 2026-06-04 — F5 settings accessibility first pass

Plan area: F5 — Accessibility, polish, release hardening.

What changed:
- Added a Settings overlay opened from the HUD Controls section.
- Added persistent browser settings under `citizenshipValleySettingsV1`.
- Added accessibility toggles for Large text, High contrast, and Reduced motion.
- Added a Settings reset-save control that deletes game progress while keeping display settings.
- Extended VM UI validation, UI regression, and desktop/mobile visual smoke coverage for the Settings panel.
- The plan marker moves to F5 balance review for XP, Focus, coins, and Exam Readiness.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node --check qa-ui-regression.mjs`
- `node --check qa-visual-smoke.mjs`
- `node scripts\validate-world.js`
- `node scripts\validate-ui.js`
- `node qa-ui-regression.mjs`
- `node qa-visual-smoke.mjs`

Next marker:
- Continue F5 polish with balance review for XP, Focus, coins, and Exam Readiness.

## 2026-06-04 — P2 QA runbook and release hardening pass

Plan area: P2 — QA and automation hardening.

What changed:
- Added `docs/QA_RUNBOOK.md` as the consolidated local QA command set.
- The runbook documents quick checks, browser regression checks, full pre-release QA, generated artifacts, and manual follow-up limitations.
- `README.md` now links to the QA runbook.
- `AGENTS.md` now lists the quick VM validation commands and points agents to the full QA runbook.
- The plan marker moves beyond P2 QA hardening toward choosing the next gameplay/polish phase.

Validation:
- Documentation diagnostics for edited files

Next marker:
- Decide and begin the next gameplay/polish phase after P2 QA automation.

## 2026-06-04 — P2 QA full regional quest and gate playthrough pass

Plan area: P2 — QA and automation hardening.

What changed:
- Added `qa-regional-quests-playthrough.mjs`, a headless Chrome/CDP playthrough for all post-Village regional quests and travel gates.
- The script starts a clean New Game, switches to Modern Britain, then completes the real UI quest flow for Modern Britain, Rights & Law, Democracy, Participation, Action Workshop, and Exam Hall.
- It covers 30 post-Village quests through accept → ask target → return → answer, with rendered shuffled answer buttons.
- It completes travel gates from Modern Britain through Action Workshop and verifies the Exam Hall final gate panel.
- The run verifies `completedQuests`, region unlocks, badges, story flags, `activeQuest`, `pendingGate`, and save persistence.
- The plan marker moves beyond P2 QA automation to QA runbook/release hardening before the next gameplay or polish phase.

Validation:
- `node --check qa-regional-quests-playthrough.mjs`
- `node qa-regional-quests-playthrough.mjs`

Next marker:
- Continue with QA runbook/release hardening: document the full QA command set and decide the next gameplay/polish phase.

## 2026-06-04 — P2 QA regional mini-game host playthrough pass

Plan area: P2 — QA and automation hardening.

What changed:
- Added `qa-regional-playthrough.mjs`, a headless Chrome/CDP regional playthrough script.
- The script starts a clean New Game, then uses controlled region switching to visit all post-Village mini-game host NPCs.
- It opens each mini-game through the real NPC menu button, completes every round with the rendered UI, and verifies a saved gold result.
- Coverage currently includes 8 host NPCs across Modern Britain, Rights & Law, Democracy, Participation, Action Workshop, and Exam Hall.
- It verifies all 7 unique mini-games, including `Exam Simulation` with its section breakdown and the duplicate `Debate Arena` host in Exam Hall.
- The plan marker moves to full regional quest/travel-gate playthrough automation if QA hardening continues.

Validation:
- `node --check qa-regional-playthrough.mjs`
- `node qa-regional-playthrough.mjs`

Next marker:
- Continue QA hardening with full regional quest and travel-gate automation beyond Citizenship Village.

## 2026-06-04 — P2 QA desktop/mobile visual smoke pass

Plan area: P2 — QA and automation hardening.

What changed:
- Added `qa-visual-smoke.mjs`, a headless Chrome/CDP screenshot smoke script with desktop and mobile viewport coverage.
- The script starts a clean New Game, closes the intro story, opens Inventory, Progress → Curriculum, Character, and a live Source Detective mini-game panel.
- The script saves 10 screenshots under `qa-screenshots/` and writes `qa-visual-smoke-result.json`.
- The script checks for runtime exceptions, horizontal page overflow, nonblank canvas rendering, visible mobile touch controls, and overlay panels fitting inside the viewport.
- The plan marker moves to broadened regional playthrough automation beyond the first location.

Validation:
- `node --check qa-visual-smoke.mjs`
- `node qa-visual-smoke.mjs`

Next marker:
- Continue QA hardening by extending automated playthrough coverage beyond Citizenship Village into later regions and their mini-game hosts.

## 2026-06-04 — P2 QA pathfinding reachability pass

Plan area: P2 — QA and automation hardening.

What changed:
- Extended `scripts/validate-world.js` pathfinding coverage beyond NPC adjacency.
- The validator now checks reachability from each location spawn to building doors, interior exits, study stations, travel-gate-capable NPCs, mini-game hosts, and Exam Hall practice rooms.
- The validator now exposes `BUILDING_DOORS`, `INTERIOR_EXITS`, `STUDY_STATIONS`, and `MINI_GAMES` inside its VM validation context.
- Aligned validator tile collision with the real game collision rules by treating `=` path/dock tiles as passable.
- The plan marker moves to the next QA hardening follow-up after pathfinding reachability checks.

Validation:
- `node scripts\validate-world.js`

Next marker:
- Continue QA hardening with desktop/mobile screenshot smoke checks or broadened regional playthrough automation beyond the first location.

## 2026-06-04 — P2 QA automation UI regression pass

Plan area: P2 — QA and automation.

What changed:
- Extended `scripts/validate-ui.js` with a VM save migration check for legacy saves through current `SAVE_VERSION = 6`.
- The save validation now checks default profile/stats, starter inventory, achievements, story fields, mini-game scores, story flags, and `serializeGame()` version output.
- Added `qa-ui-regression.mjs`, a headless Chrome/CDP UI regression script covering the planned browser scenarios without adding a new Playwright dependency.
- The browser regression covers New Game → customization → start, opening Backpack/Progress/Character/Mini-games, and completing `Source Detective` with a saved gold result.
- The plan marker moves to QA hardening follow-up after the first P2 QA automation pass.

Validation:
- `node --check qa-ui-regression.mjs`
- `node scripts\validate-ui.js`
- `node qa-ui-regression.mjs`

Next marker:
- Continue with QA hardening follow-up, especially pathfinding reachability checks from spawn to NPCs, doors, gates, and mini-game hosts.

## 2026-06-04 — P2 QA automation first pass

Plan area: P2 — QA and automation.

What changed:
- Added `scripts/validate-ui.js` as a standalone VM-based UI validation script.
- The script validates mini-game structure: title, region, reward, minimum round count, and valid correct indexes.
- The script validates achievement id uniqueness and required achievement text.
- The script checks static HTML buttons have an id or handled data-action style attribute.
- The script smoke-renders Inventory, Progress, Character, and Mini-game panels in a VM.
- The plan marker remains in QA automation for the next substep: Playwright UI regression scenarios.

Validation:
- `node scripts\validate-ui.js`

Next marker:
- Continue with P2 — QA and automation, specifically Playwright UI regression scenarios.

## 2026-06-04 — P2 visual assets first pass

Plan area: P2 — Visual assets.

What changed:
- Added `assets/story/apathy-shade.svg` as a dedicated Apathy Shade silhouette asset.
- Story scenes now use region-specific title-card backgrounds.
- Story Shade rendering now uses the SVG asset instead of only CSS shape drawing.
- Mini-game panels now include thematic visual props for source checking, rights matching, ballot counting, petitioning, debate, campaign planning, and exam simulation.
- The plan marker moved to P2 — QA and automation.
- Public build version moved to `2026.06.04.1`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Browser visual smoke test for story region cards, Apathy Shade SVG asset, mini-game visuals, and mobile overflow

Next marker:
- We are now at P2 — QA and automation in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — P2 UX menus and mobile ergonomics

Plan area: P2 — UX menus and mobile ergonomics.

What changed:
- Added a lightweight overlay manager for Inventory, Progress, Character, Story, and Mini-games.
- Opening one overlay now closes the others instead of allowing stacked panels.
- Escape now closes the active overlay first, then NPC/menu panels, then dialogue.
- HUD sidebar sections now use collapsible `details/summary` blocks.
- Mobile HUD spacing is tighter, and long inventory lists can scroll inside the HUD.
- Overlay z-index ordering is explicit, with Story above other menu overlays.
- The plan marker moved to P2 — Visual assets.
- Public build version moved to `2026.06.03.10`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Browser smoke test for overlay exclusivity, Escape close behavior, collapsible HUD sections, and mobile overflow

Next marker:
- We are now at P2 — Visual assets in `GAMEPLAY_UPGRADE_PLAN.md`.

## 2026-06-03 — P2 curriculum tracking

Plan area: P2 — Curriculum tracking as real learning progress.

What changed:
- Added curriculum metadata fields through `GCSE_CURRICULUM_INDEX`: area, difficulty, statBoosts, miniGameRefs, and examSkill.
- Added Progress → Curriculum tab.
- Curriculum tab shows overall progress and per-area progress for Core Citizenship, Modern Britain, Rights & Law, Democracy, Participation, Active Citizenship, and Exam Skills.
- Area progress counts completed quest topics, linked study stations, and linked mini-games.
- Mini-game results now show which curriculum areas improved.
- The plan marker moved to P2 — UX menus and mobile ergonomics.
- Public build version moved to `2026.06.03.9`.

Validation:
- `node --check game.js`
- `node --check curriculum.js`
- `node scripts\validate-world.js`
- VS Code diagnostics for edited files
- Browser smoke test for Curriculum tab, metadata, mini-game curriculum note, and mobile layout

Next marker:
- We are now at P2 — UX menus and mobile ergonomics in `GAMEPLAY_UPGRADE_PLAN.md`.

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