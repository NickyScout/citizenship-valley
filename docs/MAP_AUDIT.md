# Map Audit

Generated from current `game.js` world data for Map Phase 1. Use this before recomposing regions so movement, NPC roles, building doors, mini-game hosts, and travel gates stay understandable.

## Exterior Locations

| Location | Spawn | Main Landmark | NPC Positions | Building Doors | Mini-game Anchor | Mini-game Trigger Props | Signs | Props | Travel Gate | Blocked Zones | Audit Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Citizenship Village | 210,392 | Civic Square / Noticeboard | Mayor Ada (168,242); Priya the Campaigner (372,292); Sam the Librarian (688,244); Justice Rowan (356,430); Councillor Noor (704,384) | Town Hall 130,160 -> townHallInterior; Library 652,160 -> libraryInterior; Court 452,474 -> courtInterior; Park 732,482 -> parkInterior | Petition Regatta at Priya the Campaigner (372,292) | - | Noticeboard (510,336); River Charter (232,104) | 4 prop(s) | Train to Modern Britain Borough -> Modern Britain Borough | walls 94, routes 140 | travel gate is currently NPC-menu based, not a world prop |
| Modern Britain Borough | 242,394 | Media Plaza / Press Kiosk | Editor Vale (168,242); Historian Iona (372,292); Aid Worker Mina (640,232); Data Clerk Omar (356,430); Community Elder Grace (704,384) | City Hall 124,160 -> townHallInterior; Printworks 693,156 -> libraryInterior; Museum 456,478 -> libraryInterior; Garden 726,469 -> parkInterior | Source Detective at Editor Vale (168,242) | Source Detective kiosk (230,226) | Media Plaza (452,296); Source Kiosk (248,220); Underground Gate (776,360) | 4 prop(s) | Underground to Rights & Law Quarter -> Rights & Law Quarter | walls 94, routes 106 | travel gate is currently NPC-menu based, not a world prop |
| Rights & Law Quarter | 330,394 | Court Square / Legal Scales | Advocate Farah (72,218); Sergeant Blake (372,292); Mediator Chen (612,220); Youth Worker Ellis (356,430); Justice Rowan (604,360) | Rights Aid 415,176 -> courtInterior; Archive 156,334 -> libraryInterior; Court 694,332 -> courtInterior; Police 682,475 -> courtInterior | Rights vs Responsibilities at Advocate Farah (72,218) | Rights vs Responsibilities notice (244,252) | Court Square (428,244); Rights Cards (126,196); Clock Lift Gate (748,394) | 4 prop(s) | Clock-lift to Democracy Capital -> Democracy Capital | walls 94, routes 68 | travel gate is currently NPC-menu based, not a world prop |
| Democracy Capital | 274,394 | Ballot Hall / Parliament Steps | Speaker Lark (108,242); MP Rivers (372,292); Campaign Manager Sol (640,244); Returning Officer June (356,430); Devolution Herald Ewan (704,368) | Parliament 161,168 -> townHallInterior; Party Hall 693,168 -> townHallInterior; Election 614,494 -> townHallInterior; Devolve 824,473 -> townHallInterior | Debate Arena at Campaign Manager Sol (640,244); Ballot Count at Returning Officer June (356,430) | Ballot Count ballotBox (420,384); Debate Arena podium (690,246) | Ballot Hall (430,326); Count Table (410,392); Debate Steps (696,248); Ferry Gate (788,386) | 4 prop(s) | Campaign Ferry to Participation Harbour -> Participation Harbour | walls 94, routes 130 | travel gate is currently NPC-menu based, not a world prop |
| Participation Harbour | 330,394 | Petition Pier / Campaign Boat | Priya the Campaigner (164,250); Union Rep Morgan (372,292); Charity Lead Amina (664,220); Lobbyist Pax (356,406); Digital Moderator Rae (704,368) | Petitions 172,154 -> parkInterior; Signal Hub 489,386 -> parkInterior; Union Hall 292,473 -> parkInterior; Volunteer 688,477 -> parkInterior | Petition Regatta at Priya the Campaigner (164,250) | Petition Regatta petitionStand (238,272) | Petition Pier (252,250); Regatta Stand (218,304); Volunteer Dock (632,250); Campaign Boat Gate (744,384) | 4 prop(s) | Campaign Boat to Action Workshop -> Action Workshop | walls 94, water 186 + harbour exclusion, routes 116 | travel gate is currently NPC-menu based, not a world prop |
| Action Workshop | 330,394 | Plan Board / Campaign Table | Councillor Noor (132,218); Surveyor Tess (372,292); Statistician Jules (664,220); Organiser Kai (356,430); Examiner Mira (620,384) | Research 306,162 -> libraryInterior; Survey Lab 600,162 -> libraryInterior; Planning 144,494 -> parkInterior; Impact 672,472 -> parkInterior | Campaign Planner at Councillor Noor (132,218) | Campaign Planner planningBoard (202,270) | Plan Board (224,254); Campaign Planner (170,196); Data Bench (608,258); Lighthouse Bridge (756,386) | 4 prop(s) | Lighthouse Bridge to Exam Hall -> Exam Hall Castle | walls 94, routes 132 | travel gate is currently NPC-menu based, not a world prop |
| Exam Hall Castle | 274,394 | Final Gate / Exam Desk | Examiner Mira (236,218); Timekeeper Ash (372,292); Source Keeper Nia (648,220); Debate Coach Leon (356,430); Paragraph Scribe Pip (620,384) | Identify 426,162 -> identify; Describe 132,306 -> describe; Explain 730,306 -> explain; Evaluate 128,490 -> evaluate; Sources 728,490 -> sourceUsefulness | Exam Simulation at Examiner Mira (236,218); Debate Arena at Debate Coach Leon (356,430) | Exam Simulation examDesk (268,252); Debate Arena debateBench (420,408) | Final Gate (442,230); Exam Desk (286,242); Source Archive (646,244); Debate Bench (430,402) | 4 prop(s) | Course complete | walls 94, routes 108 | ready for focused layout pass |

## Region Zone Sketches

```json
[
  {
    "location": "Citizenship Village",
    "safeSpawn": "210,392",
    "centralHub": "Civic Square",
    "npcCluster": [
      "Mayor Ada@168,242",
      "Priya the Campaigner@372,292",
      "Sam the Librarian@688,244",
      "Justice Rowan@356,430",
      "Councillor Noor@704,384"
    ],
    "learningBuildings": [
      "Town Hall@130,160",
      "Library@652,160",
      "Court@452,474",
      "Park@732,482"
    ],
    "miniGameArea": [
      "Petition Regatta@372,292"
    ],
    "travelEdge": "Train to Modern Britain Borough via NPC menu",
    "blockedZones": "walls 94, routes 140"
  },
  {
    "location": "Modern Britain Borough",
    "safeSpawn": "242,394",
    "centralHub": "Media Plaza",
    "npcCluster": [
      "Editor Vale@168,242",
      "Historian Iona@372,292",
      "Aid Worker Mina@640,232",
      "Data Clerk Omar@356,430",
      "Community Elder Grace@704,384"
    ],
    "learningBuildings": [
      "City Hall@124,160",
      "Printworks@693,156",
      "Museum@456,478",
      "Garden@726,469"
    ],
    "miniGameArea": [
      "Source Detective@168,242"
    ],
    "travelEdge": "Underground to Rights & Law Quarter via NPC menu",
    "blockedZones": "walls 94, routes 106"
  },
  {
    "location": "Rights & Law Quarter",
    "safeSpawn": "330,394",
    "centralHub": "Court Square",
    "npcCluster": [
      "Advocate Farah@72,218",
      "Sergeant Blake@372,292",
      "Mediator Chen@612,220",
      "Youth Worker Ellis@356,430",
      "Justice Rowan@604,360"
    ],
    "learningBuildings": [
      "Rights Aid@415,176",
      "Archive@156,334",
      "Court@694,332",
      "Police@682,475"
    ],
    "miniGameArea": [
      "Rights vs Responsibilities@72,218"
    ],
    "travelEdge": "Clock-lift to Democracy Capital via NPC menu",
    "blockedZones": "walls 94, routes 68"
  },
  {
    "location": "Democracy Capital",
    "safeSpawn": "274,394",
    "centralHub": "Ballot Hall",
    "npcCluster": [
      "Speaker Lark@108,242",
      "MP Rivers@372,292",
      "Campaign Manager Sol@640,244",
      "Returning Officer June@356,430",
      "Devolution Herald Ewan@704,368"
    ],
    "learningBuildings": [
      "Parliament@161,168",
      "Party Hall@693,168",
      "Election@614,494",
      "Devolve@824,473"
    ],
    "miniGameArea": [
      "Debate Arena@640,244",
      "Ballot Count@356,430"
    ],
    "travelEdge": "Campaign Ferry to Participation Harbour via NPC menu",
    "blockedZones": "walls 94, routes 130"
  },
  {
    "location": "Participation Harbour",
    "safeSpawn": "330,394",
    "centralHub": "Petition Pier",
    "npcCluster": [
      "Priya the Campaigner@164,250",
      "Union Rep Morgan@372,292",
      "Charity Lead Amina@664,220",
      "Lobbyist Pax@356,406",
      "Digital Moderator Rae@704,368"
    ],
    "learningBuildings": [
      "Petitions@172,154",
      "Signal Hub@489,386",
      "Union Hall@292,473",
      "Volunteer@688,477"
    ],
    "miniGameArea": [
      "Petition Regatta@164,250"
    ],
    "travelEdge": "Campaign Boat to Action Workshop via NPC menu",
    "blockedZones": "walls 94, water 186 + harbour exclusion, routes 116"
  },
  {
    "location": "Action Workshop",
    "safeSpawn": "330,394",
    "centralHub": "Plan Board",
    "npcCluster": [
      "Councillor Noor@132,218",
      "Surveyor Tess@372,292",
      "Statistician Jules@664,220",
      "Organiser Kai@356,430",
      "Examiner Mira@620,384"
    ],
    "learningBuildings": [
      "Research@306,162",
      "Survey Lab@600,162",
      "Planning@144,494",
      "Impact@672,472"
    ],
    "miniGameArea": [
      "Campaign Planner@132,218"
    ],
    "travelEdge": "Lighthouse Bridge to Exam Hall via NPC menu",
    "blockedZones": "walls 94, routes 132"
  },
  {
    "location": "Exam Hall Castle",
    "safeSpawn": "274,394",
    "centralHub": "Final Gate",
    "npcCluster": [
      "Examiner Mira@236,218",
      "Timekeeper Ash@372,292",
      "Source Keeper Nia@648,220",
      "Debate Coach Leon@356,430",
      "Paragraph Scribe Pip@620,384"
    ],
    "learningBuildings": [
      "Identify@426,162",
      "Describe@132,306",
      "Explain@730,306",
      "Evaluate@128,490",
      "Sources@728,490"
    ],
    "miniGameArea": [
      "Exam Simulation@236,218",
      "Debate Arena@356,430"
    ],
    "travelEdge": "Course complete",
    "blockedZones": "walls 94, routes 108"
  }
]
```

## Interior Study Routes

| Interior | Spawn | Study Stations | Exit |
| --- | --- | --- | --- |
| Town Hall Interior | 468,500 | Council Chamber (128,136); Decision Ladder (640,136); Role Cards (128,360); Service Desk (640,360) | 454,530 -> village |
| Library Interior | 468,500 | Revision Shelves (128,136); Flashcard Desk (640,136); Source Table (128,360); Misinformation Corner (640,360) | 454,530 -> village |
| Court Interior | 468,500 | Mock Trial (128,136); Rights Bench (640,136); Verdict Builder (128,360); Mistakes Board (640,360) | 454,530 -> village |
| Park Action Hub | 468,500 | Noticeboard (128,136); Campaign Planner (640,136); Impact Meter (128,360); Reflection Bench (640,360) | 454,530 -> village |

## Exam Hall Practice Rooms

| Room | Skill | Position | Question Focus |
| --- | --- | --- | --- |
| Identify Room | Identify | 286,286 | Identify one way citizens can take part in democracy between general elections. |
| Describe Room | Describe | 398,286 | Describe two responsibilities that support rights in the UK. |
| Explain Room | Explain | 510,286 | Explain why a free press can be important in a democracy. |
| Evaluate Room | Evaluate | 342,374 | Evaluate whether peaceful protest is an effective way for citizens to create change. |
| Source Usefulness Lab | Sources | 566,374 | A campaign leaflet says: 'Most young people want more local youth services.' Explain how useful this source is for investigating a local issue. |

## Map Phase 1 Findings

- The current maps pass automated reachability checks for spawn, NPCs, building doors, study stations, mini-game hosts, and Exam Hall practice rooms.
- Trigger props now use small PNG runtime assets from `assets/props/region/`, with SVG source assets and canvas primitive fallback.
- Travel gates are currently opened from NPC menus rather than represented by dedicated world props; Map Phase 2/3 should decide whether to add visible gate props per region.
- Mini-game host markers now render dynamic status labels from `state.miniGameScores`: New, Try, Bronze, Silver, or Gold.
- Most non-Village exterior regions still have no standalone signpost/prop records in `signs` or `props`, so their landmarks are mostly building silhouettes and canvas motif drawing rather than auditable map objects.
- The next recomposition pass should improve route clarity one region at a time: spawn -> landmark -> NPC cluster -> building/interior -> mini-game host -> travel gate.

## Next Pass Checklist

- Add or move a small number of landmark/signpost props per region before broad decoration.
- Keep mini-game hosts near a thematic visual anchor without overlapping door interaction zones.
- Add visible public travel-gate props after deciding whether fast travel/world map belongs in the same release.
- Re-run `node scripts\validate-world.js` and `node qa-visual-smoke.mjs` after any map movement.
