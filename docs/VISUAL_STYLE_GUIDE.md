# Visual Style Guide

Citizenship Valley uses a functional pixel-art prototype style. The goal is clarity first: players should recognise the region, spot interactive people and objects, and understand where learning activities live.

## Scale

- Logical tile size: `32px`.
- Render scale: `1.5x`, so visible tiles are `48px` on the canvas.
- Canvas: `1280x768`.
- Player/NPC sprites occupy a roughly `32x48` visual footprint.
- Keep world-space labels short because they render inside the scaled canvas.

## Region Palettes

Each region has a distinct `visual` palette in `WORLD`:

- Village: bright civic green, stone paths, warm civic buildings.
- Modern Britain: media blue, press red, market/city accents.
- Rights & Law: stone grey, legal purple, court gold.
- Democracy: parliament gold, ballot red, civic blue.
- Participation: harbour teal, campaign green, petition red.
- Action Workshop: planning green, data blue, toolkit amber.
- Exam Hall: castle purple, source blue, exam gold.

## Region Motifs

Every exterior region should have a readable motif near the main play route:

- Village: noticeboard, civic square, meadow detail.
- Modern Britain: newspaper kiosk, media board, market press signs.
- Rights & Law: court steps, rights aid signs, scales motif.
- Democracy: ballot booth, parliament steps, election posters.
- Participation: boats, petition banner, harbour piers.
- Action Workshop: planning board, data cards, campaign tools.
- Exam Hall: castle gate, exam desks, source archive.

## Asset Locations

- `assets/items/` contains the first small item PNG pass for starter/quest items, tools, consumables, and collectible rewards.
- `assets/ui/` contains seed UI marker assets, starting with the mini-game marker.
- `assets/props/region/` contains seed regional prop assets, starting with ballot-booth art.
- `assets/story/apathy-shade.svg` remains the dedicated Apathy Shade silhouette for story scenes.

## Interaction Contrast

- Interactive doors use gold frames and dark interiors.
- Study stations use a saturated accent and label text.
- Exam practice rooms use gold cards and an `E` marker.
- Mini-game host NPCs use a floating `Game` marker above their sprite.
- The closest interactable still uses the contextual `E` prompt.
- Unresolved regions can show subtle Apathy Shade traces near their landmark until the related story flag is earned.

## Hero Presentation

- HUD and Character panel portraits should use the same visual profile as the canvas sprite.
- Presets should differ by hair style, outfit silhouette, shoe colour, backpack colour, and accent placement.
- Held tools should only appear when equipped.
- `Justice Quill` reads as a feather/quill silhouette; `Debate Blade` reads as a ceremonial debate tool.
- The current interactable target should be highlighted before the contextual `E` prompt appears.

## UI Status Colours

- Quest/story: gold.
- Mini-game: blue/cyan with gold trim.
- Shop/economy: green and gold.
- Warning/reset: red.
- Completed/success: green.
- Exam/final: purple and gold.

## Story And Mini-game Presentation

- Story title cards should identify the current region immediately through palette, landmark silhouette, Apathy Shade presence, and act title.
- Keep story cards compact and readable; do not let decorative art compete with the narrative text or action buttons.
- Mini-games should differ by layout pattern, not only by title text:
	- Source Detective: newspaper headline cards and reliable/unreliable stamps.
	- Rights Match: paired right/responsibility cards.
	- Petition Regatta: harbour route, boat, signatures, and misinformation hazards.
	- Ballot Count: ballot slips on a counting table.
	- Debate Arena: Argument/Evidence/Rebuttal/Empathy cards.
	- Campaign Planner: board layout with Research, Plan, Action, Evaluate stages.
	- Exam Simulation: exam paper, source extract, and answer planner.
- Completion screens should make medal quality visible with a small reward mark, while keeping score breakdown and learning feedback easy to scan.

## Item Presentation

- Quest items use a gold frame and show a locked marker because they cannot be sold.
- Consumables use a green frame and should surface their Focus/Knowledge effect clearly.
- Outfits use a blue frame and should indicate when they can be worn or are equipped.
- Tools use a silver frame and should describe their mini-game or exam assist.
- Collectible/treasure rewards use a teal frame.
- Backpack rows should support quick scanning, while the selected-item panel should show the larger thumbnail, type, stack/equipped state, lock state, description, effects, and actions.

## Rules For New Art

- Prefer small, inspectable bitmap/WebP assets when replacing placeholder art. SVG source assets are acceptable when the image needs to stay text-editable, but UI/item runtime replacements should prefer PNG/WebP.
- Keep item icons to a stable square size such as `32x32` or `48x48`.
- Keep contrast high enough to read against the current region palette.
- Avoid blocking paths with decorative props unless the validator is updated and passable routes remain clear.
- After map or visual changes, run `node scripts\validate-world.js` and `node qa-visual-smoke.mjs`.