# AI Handoff

## 1. Project Purpose

Citizenship Valley is a browser-based indie RPG prototype for helping a student revise UK GCSE Citizenship. The game presents the curriculum as a top-down RPG world with themed regions, NPC conversations, short investigation quests, rewards, and travel gates that test knowledge before the next region unlocks.

The current goal is educational first, game feel second: each quest should teach a GCSE Citizenship concept through NPC dialogue, then check understanding with a short multiple-choice question.

## 2. Current Architecture

This is a static HTML/CSS/JavaScript canvas game. There is no bundler, framework, TypeScript, or backend.

- `index.html` defines the canvas, HUD, dialogue containers, and script order.
- `styles.css` handles page layout, HUD, inventory UI, and the centered NPC dialogue window.
- `game.js` contains the game loop, canvas rendering, world data, NPCs, quests, movement, inventory, save/load, and UI event handling.
- `curriculum.js` defines the external curriculum guide and enriches quest explanations through `window.GCSE_CURRICULUM_INDEX`.
- Browser progress is saved in `localStorage` under `citizenshipValleySaveV1`.
- Azure Static Web Apps hosts the public static site.

Rendering uses a `1280x768` canvas. The logical tile size is `32`, rendered at `1.5x` so visible tiles are `48px`. The camera follows the player. The draw pipeline is split into layers: ground, paths, buildings, props, characters, and world UI.

## 3. Main Folders and Important Files

- `index.html` - static shell, canvas, HUD, script includes.
- `styles.css` - visual styling for HUD, inventory, central NPC dialogue, and responsive layout.
- `game.js` - main game implementation and most runtime data.
- `curriculum.js` - editable GCSE topic map grouped by location, with NPC prompts and longer correct-answer explanations.
- `CURRICULUM_MAP.md` - broader course/world planning notes.
- `README.md` - short project overview and play instructions.
- NPC portraits are generated as inline SVG avatars in `game.js`; there is no portrait image folder at the moment.
- `assets/tiles/`, `assets/characters/`, `assets/buildings/`, `assets/props/` - reserved asset structure for future PNG art.
- `staticwebapp.config.json` - Azure Static Web Apps config.
- `.github/workflows/azure-static-web-apps.yml` - intended GitHub Actions deploy workflow.
- `dist/` - local deployment folder, ignored by Git.
- `.tools/` and `node_modules/` - local tooling, ignored by Git.
- `publish/` - clean Git working copy tracking `NickyScout/citizenship-valley`. The root `.git` is unreliable in the OneDrive workspace, so commits have been made from `publish/`.

## 4. What Has Already Been Implemented

- Seven curriculum regions:
  - Citizenship Village
  - Modern Britain Borough
  - Rights & Law Quarter
  - Democracy Capital
  - Participation Harbour
  - Action Workshop
  - Exam Hall Castle
- NPC casts for every region.
- Three or more curriculum-linked quests per major NPC in the first village, and regional topic quests for later regions.
- Quest flow:
  - accept a quest from an NPC
  - travel to another NPC to collect evidence
  - return to the giver
  - answer a GCSE-style check question
  - earn coins/items/knowledge
- Travel gates:
  - all regional quests must be complete
  - the gate asks three questions
  - all three must be correct to unlock the next region
- RPG systems:
  - coins
  - inventory
  - outfits/tools/treasures/consumables
  - equip/use/sell actions
  - badges
  - automatic localStorage save/load
  - reset via `R` or `New Game`
- Controls:
  - WASD and arrow-key movement
  - `E` to talk/inspect
  - `1`, `2`, `3` to answer questions
- Developer travel menu for switching locations quickly during testing.
- Improved canvas rendering:
  - larger canvas
  - camera
  - layered drawing
  - more detailed player, NPCs, buildings, props
  - four-direction walking animation for the player
- NPC placement fix:
  - NPCs that were overlapping building collision tiles were moved to reachable nearby positions.
- NPC dialogue upgrade:
  - central square dialogue/modal window
  - unique inline SVG avatar inside every NPC interaction flow
  - faces are generated from NPC id, role, colour, and inferred gender
  - expression changes for talking, quest prompts, questions, wrong answers, rewards, and gates
- Curriculum content extraction:
  - `curriculum.js` now stores sections, topics, NPC prompts, and longer correct-answer explanations.

## 5. Current TODO List

- Move more hardcoded world/quest/NPC data out of `game.js` into structured data files.
- Add automated tests for:
  - quest completion flow
  - travel gate logic
  - save/load compatibility
  - NPC placement against collision tiles
- Fix or replace the GitHub Actions workflow so pushes can deploy automatically.
- Add a lightweight local test script that can run without browser interaction.
- Improve curriculum coverage quality by comparing `curriculum.js` with the exact current exam board specification.
- Add better in-game curriculum review screens or journal pages so the player can reread learned facts.
- Improve mobile layout and touch controls.
- Replace procedural canvas art with real PNG tiles/sprites over time.

## 6. Known Bugs or Failing Tests

- There is currently no formal test suite.
- `node --check game.js` and similar shell syntax checks can fail in this OneDrive/Codex sandbox with `EPERM` path access errors, even when the JS parses correctly. A workaround used successfully was reading file content through the Node REPL and running `new Function(source)`.
- The GitHub Actions workflow exists but Azure SWA CLI reports: `missing property "jobs.build_and_deploy_job"`. Manual deploy still works. The workflow may also need the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
- Root `.git` is not reliable in this workspace. Use `publish/` for Git operations unless the repository setup is repaired.
- Browser cache can show stale deployed assets; use `Ctrl+F5` when checking the public site.
- NPC avatars are procedural SVGs, not hand-painted or generated raster portraits. They are unique and role-aware but still visually simple.
- The dev travel menu is intentionally still visible for testing and should be hidden before a polished release.

## 7. Commands to Build, Run, Lint and Test

There is no build step for normal development.

Run local static server from the project root:

```powershell
$env:PATH = "$PWD\.tools\node-v22.11.0-win-x64;$env:PATH"
npx vite --host 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/index.html
```

Prepare a deploy folder:

```powershell
Copy-Item -Path index.html,styles.css,game.js,curriculum.js,staticwebapp.config.json -Destination dist -Force
```

Manual Azure Static Web Apps deploy:

```powershell
$env:PATH = "$PWD\.tools\node-v22.11.0-win-x64;$env:PATH"
$token = az staticwebapp secrets list --name citizenship-gcse-game-nmilyaev --resource-group rg-citizenship-game --query properties.apiKey -o tsv
.\node_modules\.bin\swa.cmd deploy .\dist --deployment-token $token --env production
```

Git operations should generally be run in `publish/`:

```powershell
cd publish
git status --short
git add .
git commit -m "Describe the change"
git push origin main
```

No lint command currently exists.

No test command currently exists.

Useful ad hoc checks:

```powershell
Invoke-WebRequest -Uri https://lemon-meadow-063d62b03.7.azurestaticapps.net/game.js -UseBasicParsing
Invoke-WebRequest -Uri https://lemon-meadow-063d62b03.7.azurestaticapps.net/curriculum.js -UseBasicParsing
```

## 8. Environment Variables Needed

No runtime environment variables are needed by the web app itself.

Deployment needs Azure CLI authentication and a Static Web Apps deployment token. Do not commit secrets.

Expected GitHub Actions secret, if workflow deployment is repaired:

```text
AZURE_STATIC_WEB_APPS_API_TOKEN
```

Known Azure deployment context:

```text
Azure Static Web App: citizenship-gcse-game-nmilyaev
Resource group: rg-citizenship-game
Tenant ID: 556b39ce-6176-482c-a969-cc36dd218dc8
Public URL: https://lemon-meadow-063d62b03.7.azurestaticapps.net
GitHub repo: NickyScout/citizenship-valley
```

Do not store or print the SWA deployment token.

## 9. Important Design Decisions

- Keep the app static and simple for now. The priority is fast iteration and easy Azure Static Web Apps hosting.
- Use `localStorage` for save/load because there is no backend yet.
- Keep the developer travel menu visible during prototyping to speed testing across regions.
- Use data-driven curriculum where possible. `curriculum.js` is the first step; more quest/world data should eventually move out of `game.js`.
- Use a central square NPC dialogue window for every interaction type so questions, quest text, travel gates, and feedback feel consistent.
- Use procedural SVG portraits now. This keeps each NPC visually distinct without managing many raster files, and mood changes are handled by drawing different mouths/brows/accessories.
- Preserve pixel-art feel in canvas rendering, but prepare for future PNG assets under `assets/`.
- Keep travel gates gated by quest completion plus three correct answers, reinforcing mastery before progression.
- Avoid adding a framework until the static JS file becomes too difficult to maintain.

## 10. Next Recommended Task

Move character and content data out of `game.js`:

1. Add a `characters.js` or `data/npcs.js` file with each NPC's role, gender, avatar parameters, quest IDs, and default dialogue.
2. Move regional NPC definitions and quest definitions out of `game.js` in small, testable steps.
3. Add an automated placement check that fails if an NPC is on a blocked tile.
4. Add a small visual test page or debug mode for reviewing all generated NPC portraits together.

This will make future curriculum and art updates much safer, because the next agent will not need to edit a very large `game.js` for every content change.
