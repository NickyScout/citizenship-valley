const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const dialogue = document.getElementById("dialogue");
const choicePanel = document.getElementById("choicePanel");
const questText = document.getElementById("questText");
const knowledgeText = document.getElementById("knowledgeText");
const knowledgeBar = document.getElementById("knowledgeBar");
const badgeList = document.getElementById("badgeList");
const coinText = document.getElementById("coinText");
const regionText = document.getElementById("regionText");
const outfitText = document.getElementById("outfitText");
const toolText = document.getElementById("toolText");
const inventoryList = document.getElementById("inventoryList");
const inventoryOpenButton = document.getElementById("inventoryOpenButton");
const inventoryPanel = document.getElementById("inventoryPanel");
const inventoryPanelBody = document.getElementById("inventoryPanelBody");
const inventoryCloseButton = document.getElementById("inventoryCloseButton");
const progressOpenButton = document.getElementById("progressOpenButton");
const progressPanel = document.getElementById("progressPanel");
const progressPanelBody = document.getElementById("progressPanelBody");
const progressCloseButton = document.getElementById("progressCloseButton");
const characterOpenButton = document.getElementById("characterOpenButton");
const characterPanel = document.getElementById("characterPanel");
const characterPanelBody = document.getElementById("characterPanelBody");
const characterCloseButton = document.getElementById("characterCloseButton");
const storyPanel = document.getElementById("storyPanel");
const storyPanelBody = document.getElementById("storyPanelBody");
const storyContinueButton = document.getElementById("storyContinueButton");
const miniGameOpenButton = document.getElementById("miniGameOpenButton");
const miniGamePanel = document.getElementById("miniGamePanel");
const miniGamePanelBody = document.getElementById("miniGamePanelBody");
const miniGameCloseButton = document.getElementById("miniGameCloseButton");
const settingsOpenButton = document.getElementById("settingsOpenButton");
const settingsPanel = document.getElementById("settingsPanel");
const settingsPanelBody = document.getElementById("settingsPanelBody");
const settingsCloseButton = document.getElementById("settingsCloseButton");
const focusText = document.getElementById("focusText");
const focusBar = document.getElementById("focusBar");
const xpText = document.getElementById("xpText");
const xpBar = document.getElementById("xpBar");
const examReadinessText = document.getElementById("examReadinessText");
const examReadinessBar = document.getElementById("examReadinessBar");
const journalText = document.getElementById("journalText");
const reviewList = document.getElementById("reviewList");
const reviewButton = document.getElementById("reviewButton");
const resetButton = document.getElementById("resetButton");
const devLocationSelect = document.getElementById("devLocationSelect");
const devTravelButton = document.getElementById("devTravelButton");
const touchControls = document.getElementById("touchControls");

const TILE = 48;
const LOGICAL_TILE = 32;
const RENDER_SCALE = TILE / LOGICAL_TILE;
const VIEW_W = canvas.width / RENDER_SCALE;
const VIEW_H = canvas.height / RENDER_SCALE;
const SAVE_KEY = "citizenshipValleySaveV1";
const SETTINGS_KEY = "citizenshipValleySettingsV1";
const SAVE_VERSION = 6;
const keys = new Set();
let activeNpc = null;
let activeQuestion = null;
let activeCheckIndex = 0;
const ambientWalkers = [];
let pendingQuestTurnIn = null;
let messageTimer = 0;
let saveReady = false;
let gameStarted = false;
let currentProgressTab = "story";
let activeMiniGame = null;
let selectedInventoryItemId = null;
let settings = loadSettings();
let lastFrameTimestamp = null;
let frameDeltaMs = 1000 / 60;
let animationClockMs = 0;
// §G9 polish state: region transition fade + footstep dust (both reduced-motion gated).
let regionTransitionMs = 0;
const REGION_TRANSITION_MS = 440;
const footstepDust = [];

const imageCache = {};

function nowMs() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") return performance.now();
  return Date.now();
}

function getAssetImage(src) {
  if (!src || typeof Image === "undefined") return null;
  if (!imageCache[src]) {
    const image = new Image();
    image.src = src;
    imageCache[src] = image;
  }
  return imageCache[src];
}

class AnimatedSprite {
  constructor({ src, frameWidth, frameHeight, frames = 1, fps = 6, rows = {} }) {
    this.src = src;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frames = Math.max(1, frames);
    this.fps = Math.max(1, fps);
    this.rows = rows;
  }

  image() {
    return getAssetImage(this.src);
  }

  isReady() {
    const image = this.image();
    return Boolean(image && image.complete && image.naturalWidth);
  }

  frameIndex(elapsedMs = animationClockMs) {
    return Math.floor((elapsedMs / 1000) * this.fps) % this.frames;
  }

  draw(x, y, options = {}) {
    const image = this.image();
    if (!image || !image.complete || !image.naturalWidth) return false;
    const row = this.rows[options.state || "default"] || 0;
    const frame = options.frame ?? this.frameIndex(options.elapsedMs);
    const width = options.width || this.frameWidth;
    const height = options.height || this.frameHeight;
    ctx.drawImage(
      image,
      (frame % this.frames) * this.frameWidth,
      row * this.frameHeight,
      this.frameWidth,
      this.frameHeight,
      x,
      y,
      width,
      height
    );
    return true;
  }
}

function defaultSettings() {
  return { largeText: false, highContrast: false, reducedMotion: false };
}

function sanitiseSettings(input) {
  if (!input || typeof input !== "object") return defaultSettings();
  return {
    largeText: Boolean(input.largeText),
    highContrast: Boolean(input.highContrast),
    reducedMotion: Boolean(input.reducedMotion)
  };
}

function loadSettings() {
  try {
    return sanitiseSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"));
  } catch (error) {
    return defaultSettings();
  }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    state.journal = "Settings could not be saved in this browser.";
  }
}

function applySettings() {
  if (!document.body) return;
  document.body.classList.toggle("large-text", settings.largeText);
  document.body.classList.toggle("high-contrast", settings.highContrast);
  document.body.classList.toggle("reduced-motion", settings.reducedMotion);
}

applySettings();

const ACCENT_COLORS = {
  ember: "#e36b5d",
  ocean: "#5da9e9",
  forest: "#6fbf73",
  amber: "#f2c14e"
};

const STAT_KEYS = ["knowledge", "rhetoric", "empathy", "integrity"];
const STAT_LABELS = {
  knowledge: "Knowledge",
  rhetoric: "Rhetoric",
  empathy: "Empathy",
  integrity: "Integrity"
};
const READINESS_BASE = 35;
const READINESS_WEIGHTS = {
  knowledge: 0.6,
  rhetoric: 0.4,
  empathy: 0.2,
  integrity: 0.3
};
const STAT_DESCRIPTIONS = {
  knowledge: "Builds accurate GCSE content and has the strongest Exam Readiness impact.",
  rhetoric: "Strengthens debate, explanations, and persuasive active citizenship answers.",
  empathy: "Supports balanced judgement, rights responsibilities, and community choices.",
  integrity: "Improves evidence use, source caution, and fair legal reasoning."
};
const STAT_ICONS = {
  knowledge: "ico-book",
  rhetoric: "ico-speech",
  empathy: "ico-heart",
  integrity: "ico-shield"
};
const TOOL_ASSIST_FOCUS_COST = 10;
const MAX_LEVEL = 10;

const STORY_BEATS = {
  intro: {
    act: 1,
    title: "The Citizen Scroll Awakens",
    region: "Citizenship Village",
    villain: "Apathy Shade",
    body: "A cold hush moves over the village noticeboard. The Citizen Scroll glows in your backpack: the valley is losing its sparks of participation, and the Exam Hall Castle will not open for passive citizens.",
    objective: "Speak to local citizens, complete quests, and collect sparks by proving that rights, responsibilities, and evidence still matter."
  },
  modernBritain: {
    act: 2,
    title: "Headlines in the Fog",
    region: "Modern Britain Borough",
    villain: "Apathy Shade",
    body: "The Shade spreads rumours through headlines and half-truths. People stop checking sources, and the borough forgets how shared values can hold diverse communities together.",
    objective: "Use evidence, source-checking, and balanced answers to weaken the fog."
  },
  rightsLaw: {
    act: 3,
    title: "The Silent Court",
    region: "Rights & Law Quarter",
    villain: "Apathy Shade",
    body: "In the court square, the Shade whispers that rights are only words on paper. Witnesses hesitate, and responsibility begins to look optional.",
    objective: "Defend rights by linking them to fairness, law, safeguards, and accountability."
  },
  democracy: {
    act: 4,
    title: "Empty Ballot Hall",
    region: "Democracy Capital",
    villain: "Apathy Shade",
    body: "The debate lights dim. The Shade wants citizens to believe that voting, scrutiny, Parliament, and local representation do not matter.",
    objective: "Win arguments with evidence and show why democratic participation changes decisions."
  },
  participation: {
    act: 5,
    title: "Harbour of Unsent Petitions",
    region: "Participation Harbour",
    villain: "Apathy Shade",
    body: "Petitions drift unfinished in the harbour. The Shade feeds on people saying somebody else will act.",
    objective: "Organise informed action, gather support, and prove that active citizenship is practical."
  },
  actionWorkshop: {
    act: 6,
    title: "Workshop Against Apathy",
    region: "Action Workshop",
    villain: "Apathy Shade",
    body: "Plans, surveys, and campaign posters lie scattered. The Shade can only be cornered by careful research, a clear plan, action, and evaluation.",
    objective: "Prepare a campaign sequence strong enough to reach the Exam Hall Castle."
  },
  examHall: {
    act: 7,
    title: "The Exam Hall Castle Opens",
    region: "Exam Hall Castle",
    villain: "Apathy Shade",
    body: "The castle doors unlock, but the Shade waits beside the exam desk. It cannot answer for you; it can only hope you have not revised the links between knowledge, argument, empathy, and integrity.",
    objective: "Complete practice rooms, raise Exam Readiness, then face the ending."
  }
};

const STORY_VISUALS = {
  "Citizenship Village": { landmark: "Civic Square", object: "Noticeboard", className: "village" },
  "Modern Britain Borough": { landmark: "Media Plaza", object: "Press Kiosk", className: "modern" },
  "Rights & Law Quarter": { landmark: "Court Square", object: "Legal Scales", className: "rights" },
  "Democracy Capital": { landmark: "Ballot Hall", object: "Parliament Steps", className: "democracy" },
  "Participation Harbour": { landmark: "Petition Pier", object: "Campaign Boat", className: "participation" },
  "Action Workshop": { landmark: "Plan Board", object: "Campaign Table", className: "workshop" },
  "Exam Hall Castle": { landmark: "Final Gate", object: "Exam Desk", className: "exam" }
};

const STORY_ENDINGS = {
  bronze: {
    title: "Bronze Citizen",
    body: "You pass the final challenge by remembering the essentials: citizens have rights, responsibilities, and routes to take action. The Shade retreats from the village, but a few sparks still wait to be restored."
  },
  silver: {
    title: "Silver Citizen",
    body: "Your answers connect evidence, fairness, democracy, and participation. The valley's regions relight, and the Shade loses its hold over most citizens."
  },
  gold: {
    title: "Gold Citizen",
    body: "You bring every spark together: knowledge, rhetoric, empathy, integrity, and action. The Apathy Shade dissolves at the Exam Hall doors, and Citizenship Valley becomes a living revision map."
  }
};

const STORY_FLAGS = {
  challengedRumour: {
    label: "Challenged Rumour",
    description: "Checked claims before the Shade could spread them."
  },
  defendedRights: {
    label: "Defended Rights",
    description: "Linked rights to fairness, safeguards, and responsibility."
  },
  usedEvidenceInDebate: {
    label: "Used Evidence In Debate",
    description: "Answered weak arguments with reasons and evidence."
  },
  helpedVolunteer: {
    label: "Helped Volunteers",
    description: "Turned concern into practical participation."
  },
  plannedAction: {
    label: "Planned Action",
    description: "Prepared research, action, impact, and evaluation."
  }
};

const MINI_GAME_STORY_FLAGS = {
  sourceDetective: "challengedRumour",
  rightsMatch: "defendedRights",
  ballotCount: "usedEvidenceInDebate",
  debateArena: "usedEvidenceInDebate",
  petitionRegatta: "helpedVolunteer",
  campaignPlanner: "plannedAction"
};

const REGION_STORY_FLAGS = {
  modernBritain: "challengedRumour",
  rightsLaw: "defendedRights",
  democracy: "usedEvidenceInDebate",
  participation: "helpedVolunteer",
  actionWorkshop: "plannedAction"
};

const CURRICULUM_AREAS = ["Core Citizenship", "Modern Britain", "Rights & Law", "Democracy", "Participation", "Active Citizenship", "Exam Skills"];

const STUDY_AREA_MAP = {
  townHallInterior: "Democracy",
  libraryInterior: "Modern Britain",
  courtInterior: "Rights & Law",
  parkInterior: "Active Citizenship"
};

const MINI_GAMES = {
  sourceDetective: {
    title: "Source Detective",
    region: "Modern Britain",
    summary: "Judge whether media claims are reliable before the Apathy Shade spreads them.",
    reward: { coins: 10, xp: 14, integrity: 2, knowledge: 1 },
    rounds: [
      { prompt: "A headline quotes named ONS data and links to the full report.", choices: ["Reliable", "Unreliable"], correct: 0, explain: "Named data and a checkable source make it stronger." },
      { prompt: "A post says 'everyone knows migrants cause every local problem' with no evidence.", choices: ["Reliable", "Unreliable"], correct: 1, explain: "Sweeping claims without evidence are weak." },
      { prompt: "An article separates facts, opinion, and named expert comment.", choices: ["Reliable", "Unreliable"], correct: 0, explain: "Clear separation helps citizens judge the claim." },
      { prompt: "A viral image has no date, no author, and asks you to share immediately.", choices: ["Reliable", "Unreliable"], correct: 1, explain: "Missing context and pressure to share are warning signs." }
    ]
  },
  rightsMatch: {
    title: "Rights vs Responsibilities",
    region: "Rights & Law",
    summary: "Match each right with the civic responsibility that keeps it meaningful.",
    reward: { coins: 10, xp: 14, empathy: 2, knowledge: 1 },
    rounds: [
      { prompt: "Freedom of expression works best when citizens...", choices: ["Listen and avoid harassment", "Silence opponents", "Ignore evidence"], correct: 0, explain: "Rights are protected alongside responsibilities to others." },
      { prompt: "The right to vote connects with the responsibility to...", choices: ["Stay informed", "Sell your vote", "Avoid all debate"], correct: 0, explain: "Informed voting strengthens democracy." },
      { prompt: "The right to a fair trial depends on...", choices: ["Independent courts", "Trial by rumour", "Secret punishments"], correct: 0, explain: "Fair processes protect everyone." },
      { prompt: "Equality law asks citizens to...", choices: ["Challenge discrimination", "Treat stereotypes as facts", "Ignore unfairness"], correct: 0, explain: "Citizenship includes respect and fairness." }
    ]
  },
  petitionRegatta: {
    title: "Petition Regatta",
    region: "Participation Harbour",
    summary: "Steer a campaign boat toward signatures and away from misinformation.",
    reward: { coins: 12, xp: 16, rhetoric: 2, empathy: 1 },
    rounds: [
      { prompt: "A resident asks what the petition wants. You choose...", choices: ["A clear, specific ask", "A vague slogan", "No explanation"], correct: 0, explain: "Good petitions have clear aims." },
      { prompt: "A red rumour floats by. You...", choices: ["Check evidence first", "Repeat it loudly", "Hide the source"], correct: 0, explain: "Campaigns need integrity." },
      { prompt: "Volunteers need a safe route. You...", choices: ["Plan roles and timing", "Send everyone randomly", "Ignore accessibility"], correct: 0, explain: "Organisation makes participation practical." },
      { prompt: "After collecting signatures, the best next step is...", choices: ["Submit and follow up", "Throw them away", "Stop communicating"], correct: 0, explain: "Active citizenship follows through." }
    ]
  },
  ballotCount: {
    title: "Ballot Count",
    region: "Democracy Capital",
    summary: "Count First Past the Post results and identify the winning candidate.",
    reward: { coins: 10, xp: 14, knowledge: 1, integrity: 2 },
    rounds: [
      { prompt: "Asha 12, Ben 9, Cara 7. Who wins?", choices: ["Asha", "Ben", "Cara"], correct: 0, explain: "FPTP awards the seat to the most votes." },
      { prompt: "Red 21, Blue 21, Green 19. What is the issue?", choices: ["Tie for first", "Green wins", "No votes counted"], correct: 0, explain: "A tie needs a local tie-break process." },
      { prompt: "A ballot marks two candidates when only one is allowed. It is usually...", choices: ["Rejected/spoiled", "Counted twice", "Given to the mayor"], correct: 0, explain: "Invalid ballots are separated in a count." },
      { prompt: "Why do observers watch counts?", choices: ["Transparency", "To change votes", "To stop reporting"], correct: 0, explain: "Observation supports trust and accountability." }
    ]
  },
  debateArena: {
    title: "Debate Arena",
    region: "Democracy / Action Workshop",
    summary: "Play the best debate card for each round against the Shade's weak arguments.",
    reward: { coins: 12, xp: 18, rhetoric: 3, empathy: 1 },
    rounds: [
      { prompt: "Opponent: 'Young people should never be heard.'", choices: ["Evidence", "Insult", "Silence"], correct: 0, explain: "Evidence beats dismissal." },
      { prompt: "Opponent uses a stereotype about a group.", choices: ["Empathy and rights", "Copy the stereotype", "Avoid the issue"], correct: 0, explain: "Empathy protects fair debate." },
      { prompt: "Opponent ignores your source.", choices: ["Rebuttal", "Personal attack", "Give up"], correct: 0, explain: "A rebuttal explains why evidence matters." },
      { prompt: "Final round needs a balanced conclusion.", choices: ["Judgement", "Slogan only", "New rumour"], correct: 0, explain: "Strong answers make a supported judgement." }
    ]
  },
  campaignPlanner: {
    title: "Campaign Planner",
    region: "Action Workshop",
    summary: "Put an active citizenship campaign into the right order.",
    reward: { coins: 12, xp: 18, rhetoric: 2, integrity: 1, knowledge: 1 },
    rounds: [
      { prompt: "First step of a campaign", choices: ["Research", "Evaluate", "Celebrate"], correct: 0, explain: "Research defines the issue." },
      { prompt: "After research, citizens should...", choices: ["Plan", "Forget the evidence", "Publish results before acting"], correct: 0, explain: "Planning turns evidence into action." },
      { prompt: "The campaign then needs...", choices: ["Action", "Silence", "A hidden goal"], correct: 0, explain: "Action is the participation stage." },
      { prompt: "The final step is...", choices: ["Evaluate impact", "Ignore outcomes", "Delete notes"], correct: 0, explain: "Evaluation shows what changed." }
    ]
  },
  examSimulation: {
    title: "Exam Simulation",
    region: "Exam Hall",
    summary: "Sit the final five-section GCSE challenge: identify, describe, explain, evaluate, source.",
    isFinalExam: true,
    reward: { coins: 16, xp: 22, knowledge: 3, integrity: 2, rhetoric: 1 },
    rounds: [
      { section: "Identify", task: "Select the precise point", prompt: "A one-mark identify question asks: Name one way citizens can participate in democracy.", choices: ["Voting in an election", "Writing every detail you know", "Ignoring political decisions"], correct: 0, explain: "Identify needs one clear, accurate point." },
      { section: "Describe", task: "Choose the developed detail", prompt: "Which sentence best describes how a petition can influence decision-makers?", choices: ["It shows public support for a clear request and can be sent to the right authority.", "Petitions exist.", "A petition always instantly changes the law."], correct: 0, explain: "Describe answers add relevant detail without exaggerating." },
      { section: "Explain", task: "Link cause and effect", prompt: "Why can a free press support democracy?", choices: ["It informs citizens and can hold power to account, so voters can make better judgements.", "It prints words on paper.", "It means every article is automatically unbiased."], correct: 0, explain: "Explain answers show how or why one idea leads to another." },
      { section: "Evaluate", task: "Make a balanced judgement", prompt: "Which conclusion best evaluates whether peaceful protest is useful?", choices: ["It can raise awareness and pressure leaders, but impact depends on evidence, public support, and lawful methods.", "It is always useless.", "It is always successful whatever happens."], correct: 0, explain: "Evaluate answers weigh strengths, limits, and reach a supported judgement." },
      { section: "Source", task: "Judge reliability", prompt: "A social post makes a dramatic claim about migration but has no author, date, data, or source link. What should you do first?", choices: ["Treat it cautiously and check origin, purpose, evidence, and accuracy.", "Share it because it sounds urgent.", "Assume it is reliable because it is short."], correct: 0, explain: "Source questions start by checking origin, purpose, content, accuracy, and relevance." }
    ]
  },
  keywordRescue: {
    title: "Keyword Rescue",
    region: "Citizenship Village",
    summary: "Rescue a civic keyword letter by letter, then prove you know what it means.",
    type: "wordReveal",
    reward: { coins: 10, xp: 14, knowledge: 2, rhetoric: 1 },
    rounds: [
      {
        word: "DEMOCRACY",
        hint: "How the UK chooses who governs.",
        prompt: "Which meaning fits the rescued keyword DEMOCRACY?",
        choices: [
          "A system where citizens choose representatives through free, fair elections.",
          "A system where one unelected leader holds all the power.",
          "A rule that only wealthy landowners are allowed to vote."
        ],
        correct: 0,
        explain: "Democracy means people hold power through regular free elections and can replace their representatives."
      },
      {
        word: "ACCOUNTABILITY",
        hint: "Why people in power must answer for decisions.",
        prompt: "Which meaning fits the rescued keyword ACCOUNTABILITY?",
        choices: [
          "Decision-makers must explain their actions and can be challenged or removed.",
          "Leaders can act in secret and never be questioned.",
          "Only voters, never politicians, are responsible for outcomes."
        ],
        correct: 0,
        explain: "Accountability lets citizens hold representatives to account through scrutiny, elections, and a free press."
      },
      {
        word: "REPRESENTATION",
        hint: "What an MP or councillor does for you.",
        prompt: "Which meaning fits the rescued keyword REPRESENTATION?",
        choices: [
          "Elected people acting and speaking on behalf of citizens in councils or Parliament.",
          "Citizens making every single decision by direct vote each day.",
          "Civil servants choosing policies without any elections."
        ],
        correct: 0,
        explain: "Representation means we elect people to make decisions for us and answer back to us."
      },
      {
        word: "DEVOLUTION",
        hint: "Power shared out to Scotland, Wales and Northern Ireland.",
        prompt: "Which meaning fits the rescued keyword DEVOLUTION?",
        choices: [
          "Passing some powers from the UK Parliament to bodies like the Scottish Parliament or Senedd.",
          "Removing all local government across the UK.",
          "Giving the monarch direct control over new laws."
        ],
        correct: 0,
        explain: "Devolution transfers certain powers to nations and regions while the UK Parliament stays sovereign."
      },
      {
        word: "PARLIAMENT",
        hint: "Where UK laws are debated and passed.",
        prompt: "Which meaning fits the rescued keyword PARLIAMENT?",
        choices: [
          "The body of Commons, Lords and monarch that debates and makes UK law.",
          "A single courtroom that decides criminal trials.",
          "The local council that empties the bins."
        ],
        correct: 0,
        explain: "Parliament (Commons, Lords, and Crown) debates, scrutinises, and passes laws for the UK."
      }
    ]
  },
  casewordCourt: {
    title: "Caseword Court",
    region: "Rights & Law",
    summary: "Restore a legal term from Rights & Law, then connect it to its correct meaning.",
    type: "wordReveal",
    reward: { coins: 12, xp: 16, knowledge: 2, integrity: 1 },
    rounds: [
      {
        word: "JURY",
        hint: "Citizens who decide a Crown Court verdict.",
        prompt: "Which meaning fits the restored term JURY?",
        choices: [
          "Twelve members of the public who decide the verdict in a serious criminal trial.",
          "The lawyer who speaks for the person accused.",
          "The official who sentences a guilty defendant."
        ],
        correct: 0,
        explain: "A jury of citizens weighs the evidence and reaches a verdict; the judge then handles sentencing."
      },
      {
        word: "EVIDENCE",
        hint: "What must back up a legal claim.",
        prompt: "Which meaning fits the restored term EVIDENCE?",
        choices: [
          "Information such as documents, testimony, or objects used to prove facts in a case.",
          "A personal opinion offered without any proof.",
          "The final punishment given to a defendant."
        ],
        correct: 0,
        explain: "Courts decide using evidence, not rumour, so cases are judged fairly and consistently."
      },
      {
        word: "APPEAL",
        hint: "Challenging a decision in a higher court.",
        prompt: "Which meaning fits the restored term APPEAL?",
        choices: [
          "Asking a higher court to review a decision you believe is wrong.",
          "Refusing to attend court at all.",
          "Choosing your own jury members."
        ],
        correct: 0,
        explain: "The right to appeal helps correct mistakes and supports fair access to justice."
      },
      {
        word: "HUMAN RIGHTS",
        hint: "Freedoms that belong to everyone.",
        prompt: "Which meaning fits the restored term HUMAN RIGHTS?",
        choices: [
          "Basic freedoms and protections that belong to every person, such as fairness and free expression.",
          "Privileges given only to people who own property.",
          "Rules that apply to politicians but not ordinary citizens."
        ],
        correct: 0,
        explain: "Human rights protect everyone equally; in the UK they are supported by the Human Rights Act."
      },
      {
        word: "RULE OF LAW",
        hint: "No one is above it, not even government.",
        prompt: "Which meaning fits the restored term RULE OF LAW?",
        choices: [
          "The principle that everyone, including the government, must follow the law and be treated equally by it.",
          "The idea that powerful people can ignore laws they dislike.",
          "A rule that only judges have to obey the law."
        ],
        correct: 0,
        explain: "The rule of law means laws apply equally to all, protecting citizens from unfair or arbitrary power."
      }
    ]
  }
};

const MINI_GAME_VISUALS = {
  sourceDetective: {
    layout: "source",
    cue: "Headline desk",
    labels: ["Source", "Evidence", "Stamp"],
    result: "Verified evidence mark"
  },
  rightsMatch: {
    layout: "rights",
    cue: "Rights pair table",
    labels: ["Right", "Responsibility", "Fairness"],
    result: "Rights balance mark"
  },
  petitionRegatta: {
    layout: "harbour",
    cue: "Harbour route",
    labels: ["Boat", "Signatures", "Hazard"],
    result: "Petition harbour pennant"
  },
  ballotCount: {
    layout: "ballot",
    cue: "Counting table",
    labels: ["Ballots", "Tally", "Winner"],
    result: "Transparent count mark"
  },
  debateArena: {
    layout: "debate",
    cue: "Debate card row",
    labels: ["Argument", "Evidence", "Rebuttal"],
    result: "Debate rosette"
  },
  campaignPlanner: {
    layout: "campaign",
    cue: "Campaign board",
    labels: ["Research", "Plan", "Action", "Evaluate"],
    result: "Campaign planner badge"
  },
  examSimulation: {
    layout: "exam",
    cue: "Exam desk",
    labels: ["Paper", "Source", "Plan"],
    result: "Exam readiness seal"
  },
  keywordRescue: {
    layout: "wordcivic",
    cue: "Civic word board",
    labels: ["Letters", "Keyword", "Meaning"],
    result: "Keyword rescue badge"
  },
  casewordCourt: {
    layout: "wordcourt",
    cue: "Evidence word board",
    labels: ["Letters", "Case term", "Meaning"],
    result: "Caseword court seal"
  }
};

const MINI_GAME_NPC_LINKS = {
  editorVale: { miniGameId: "sourceDetective", conclusion: "Check the source, evidence, and purpose before you share. That is how citizens weaken rumour." },
  advocateFarah: { miniGameId: "rightsMatch", conclusion: "Rights work best when citizens also protect fairness and responsibilities for others." },
  officerJune: { miniGameId: "ballotCount", conclusion: "Transparent counting helps voters trust the result, even when the race is close." },
  campaignPriya2: { miniGameId: "petitionRegatta", conclusion: "A clear demand, evidence, and follow-up turn signatures into action." },
  managerSol: { miniGameId: "debateArena", conclusion: "Strong debate uses evidence and rebuttal instead of slogans or personal attacks." },
  coachLeon: { miniGameId: "debateArena", conclusion: "A balanced argument should answer the other side and finish with a supported judgement." },
  plannerNoor2: { miniGameId: "campaignPlanner", conclusion: "Research, plan, action, and evaluation make an active citizenship project credible." },
  examMira2: { miniGameId: "examSimulation", conclusion: "Command words are your route map: identify, describe, explain, evaluate, then check sources." }
};

const PROFILE_PRESETS = [
  { id: "boySchool", label: "Schoolboy", gender: "boy", outfit: "schoolJumper", accent: "ember" },
  { id: "boyCampaign", label: "Campaigner", gender: "boy", outfit: "campaignBoots", accent: "forest" },
  { id: "boyCouncil", label: "Councillor", gender: "boy", outfit: "councilCloak", accent: "amber" },
  { id: "boyLiberty", label: "Advocate", gender: "boy", outfit: "libertyCoat", accent: "ocean" },
  { id: "girlSchool", label: "Schoolgirl", gender: "girl", outfit: "schoolJumper", accent: "ocean" },
  { id: "girlCampaign", label: "Organiser", gender: "girl", outfit: "campaignBoots", accent: "forest" },
  { id: "girlCouncil", label: "Speaker", gender: "girl", outfit: "councilCloak", accent: "amber" },
  { id: "girlLiberty", label: "Rights Lead", gender: "girl", outfit: "libertyCoat", accent: "ember" }
];

const HERO_PRESET_VISUALS = {
  boySchool: { hair: "short", hairColor: "#5b3525", shoes: "#263036", bag: "#8f5b3f", trim: "#f5f0df", silhouette: "school" },
  boyCampaign: { hair: "cap", hairColor: "#2b1a14", shoes: "#3b251f", bag: "#4f7b55", trim: "#6fbf73", silhouette: "campaign" },
  boyCouncil: { hair: "parted", hairColor: "#6a594d", shoes: "#202326", bag: "#8f4f44", trim: "#f2c14e", silhouette: "council" },
  boyLiberty: { hair: "crest", hairColor: "#1f2f3a", shoes: "#202326", bag: "#466d9f", trim: "#5da9e9", silhouette: "liberty" },
  girlSchool: { hair: "bob", hairColor: "#7a4b28", shoes: "#263036", bag: "#8f5b3f", trim: "#5da9e9", silhouette: "school" },
  girlCampaign: { hair: "ponytail", hairColor: "#2b1a14", shoes: "#3b251f", bag: "#4f7b55", trim: "#6fbf73", silhouette: "campaign" },
  girlCouncil: { hair: "bun", hairColor: "#5b3525", shoes: "#202326", bag: "#8f4f44", trim: "#f2c14e", silhouette: "council" },
  girlLiberty: { hair: "long", hairColor: "#4b2d2b", shoes: "#202326", bag: "#466d9f", trim: "#e36b5d", silhouette: "liberty" }
};

const ACHIEVEMENTS = [
  { id: "packedBag", name: "Packed Bag", description: "Start with the backpack, notebook, tea, and Citizen Scroll." },
  { id: "firstStep", name: "First Step", description: "Complete your first regional quest." },
  { id: "questTrio", name: "Helpful Citizen", description: "Complete three regional quests." },
  { id: "regionalRegular", name: "Regional Regular", description: "Unlock three travel regions." },
  { id: "buildingReader", name: "Building Reader", description: "Complete one building study station." },
  { id: "studyScholar", name: "Study Scholar", description: "Complete ten building study stations." },
  { id: "practicePlanner", name: "Practice Planner", description: "Complete one Exam Hall practice room." },
  { id: "badgeCollector", name: "Badge Collector", description: "Earn your first badge." },
  { id: "toolBearer", name: "Tool Bearer", description: "Equip a tool in your hand." },
  { id: "wellPrepared", name: "Well Prepared", description: "Reach 25 knowledge." },
  { id: "civicSaver", name: "Civic Saver", description: "Hold 50 coins at once." },
  { id: "fullPractice", name: "Practice Champion", description: "Complete all Exam Hall practice rooms." },
  { id: "sourceDetective", name: "Source Detective", description: "Earn a medal in Source Detective." },
  { id: "rightsMatcher", name: "Rights Matcher", description: "Earn a medal in Rights vs Responsibilities." },
  { id: "petitionPilot", name: "Petition Pilot", description: "Earn a medal in Petition Regatta." },
  { id: "ballotCounter", name: "Ballot Counter", description: "Earn a medal in Ballot Count." },
  { id: "debateChampion", name: "Debate Champion", description: "Earn a medal in Debate Arena." },
  { id: "campaignPlanner", name: "Campaign Planner", description: "Earn a medal in Campaign Planner." },
  { id: "examSimulator", name: "Exam Simulator", description: "Earn a medal in Exam Simulation." }
];

function defaultProfile() {
  return { name: "Citizen", presetId: "boySchool", gender: "boy", outfit: "schoolJumper", accent: "ember" };
}

function currentProfilePreset(profile = state.profile || defaultProfile()) {
  return PROFILE_PRESETS.find((entry) => entry.id === profile.presetId) || PROFILE_PRESETS[0];
}

function heroVisual(profile = state.profile || defaultProfile()) {
  const preset = currentProfilePreset(profile);
  const visual = HERO_PRESET_VISUALS[preset.id] || HERO_PRESET_VISUALS.boySchool;
  const outfit = ITEMS[profile.outfit] || ITEMS[preset.outfit] || { name: "School Jumper", color: "#2f638f" };
  const accentId = ACCENT_COLORS[profile.accent] ? profile.accent : preset.accent;
  return {
    preset,
    outfit,
    gender: profile.gender === "girl" || profile.gender === "boy" ? profile.gender : preset.gender,
    accent: ACCENT_COLORS[accentId] || ACCENT_COLORS.ember,
    hair: visual.hair,
    hairColor: visual.hairColor,
    shoes: visual.shoes,
    bag: visual.bag,
    trim: visual.trim,
    silhouette: visual.silhouette
  };
}

function heroPortraitHtml(sizeClass = "") {
  const profile = state.profile || defaultProfile();
  const visual = heroVisual(profile);
  const style = `--hero-outfit:${visual.outfit.color};--hero-accent:${visual.accent};--hero-hair:${visual.hairColor};--hero-shoes:${visual.shoes};--hero-bag:${visual.bag};--hero-trim:${visual.trim};`;
  return `
    <span class="hero-portrait ${sizeClass} hero-hair-${visual.hair} hero-silhouette-${visual.silhouette}" style="${style}" role="img" aria-label="${escapeHtml(profile.name || "Citizen")} portrait">
      <span class="hero-portrait-shadow"></span>
      <span class="hero-portrait-bag"></span>
      <span class="hero-portrait-body"></span>
      <span class="hero-portrait-accent"></span>
      <span class="hero-portrait-head"></span>
      <span class="hero-portrait-hair"></span>
      <span class="hero-portrait-shoes"></span>
    </span>
  `;
}

function defaultStats() {
  return { knowledge: 0, rhetoric: 0, empathy: 0, integrity: 0, focus: 100, xp: 0, level: 1, statPoints: 0, spark: 0 };
}

function defaultStarterInventory() {
  return ["schoolBackpack", "notebook", "revisionTea", "citizenScroll"];
}

function sanitiseProfile(input) {
  const base = defaultProfile();
  if (!input || typeof input !== "object") return base;
  const preset = PROFILE_PRESETS.find((entry) => entry.id === input.presetId) || PROFILE_PRESETS[0];
  const rawName = typeof input.name === "string" ? input.name : base.name;
  const safeName = rawName.replace(/[<>"'`]/g, "").trim().slice(0, 16) || base.name;
  const gender = input.gender === "girl" || input.gender === "boy" ? input.gender : preset.gender;
  const outfit = ITEMS[input.outfit]?.type === "outfit" ? input.outfit : preset.outfit;
  const accent = ACCENT_COLORS[input.accent] ? input.accent : preset.accent;
  return { name: safeName, presetId: preset.id, gender, outfit, accent };
}

function sanitiseStats(input) {
  const base = defaultStats();
  if (!input || typeof input !== "object") return base;
  Object.keys(base).forEach((key) => {
    if (Number.isFinite(input[key])) base[key] = input[key];
  });
  STAT_KEYS.forEach((key) => { base[key] = clamp(base[key], 0, 100); });
  base.focus = clamp(base.focus, 0, 100);
  base.level = clamp(Math.floor(base.level), 1, MAX_LEVEL);
  base.xp = Math.max(0, Math.floor(base.xp));
  base.statPoints = Math.max(0, Math.floor(base.statPoints));
  base.spark = Math.max(0, Math.floor(base.spark));
  return base;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function xpForNextLevel(level = state.stats.level) {
  if (level >= MAX_LEVEL) return 0;
  return 20 + (level - 1) * 12;
}

function collectedSparks() {
  return Math.max(state.stats?.spark || 0, state.badges.length);
}

function examChance() {
  const stats = state.stats || defaultStats();
  const statScore = STAT_KEYS.reduce((sum, key) => sum + stats[key] * READINESS_WEIGHTS[key], 0);
  return Math.round(clamp(READINESS_BASE + statScore + collectedSparks() * 1.5, 0, 95));
}

function awardStats(reward = {}) {
  state.stats = sanitiseStats(state.stats);
  STAT_KEYS.forEach((key) => {
    if (Number.isFinite(reward[key])) {
      state.stats[key] = clamp(state.stats[key] + reward[key], 0, 100);
    }
  });
  if (Number.isFinite(reward.focus)) {
    state.stats.focus = clamp(state.stats.focus + reward.focus, 0, 100);
  }
  if (Number.isFinite(reward.spark)) {
    state.stats.spark = Math.max(0, state.stats.spark + reward.spark);
  }
  if (Number.isFinite(reward.xp) && state.stats.level < MAX_LEVEL) {
    state.stats.xp += Math.max(0, reward.xp);
    while (state.stats.level < MAX_LEVEL && state.stats.xp >= xpForNextLevel(state.stats.level)) {
      state.stats.xp -= xpForNextLevel(state.stats.level);
      state.stats.level += 1;
      state.stats.statPoints += 1;
    }
    if (state.stats.level >= MAX_LEVEL) state.stats.xp = 0;
  }
}

function statRewardForRegion(locationId) {
  const rewards = {
    village: { empathy: 1, integrity: 1, rhetoric: 1, xp: 4 },
    modernBritain: { integrity: 2, empathy: 1, xp: 12 },
    rightsLaw: { integrity: 2, empathy: 1, xp: 12 },
    democracy: { rhetoric: 2, integrity: 1, xp: 12 },
    participation: { empathy: 2, rhetoric: 1, xp: 12 },
    actionWorkshop: { rhetoric: 2, knowledge: 1, xp: 12 },
    examHall: { knowledge: 2, integrity: 1, xp: 14 },
    townHallInterior: { empathy: 1, integrity: 1, xp: 6 },
    libraryInterior: { knowledge: 1, integrity: 1, xp: 6 },
    courtInterior: { integrity: 2, xp: 6 },
    parkInterior: { rhetoric: 1, empathy: 1, xp: 6 }
  };
  return rewards[locationId] || { knowledge: 1, xp: 6 };
}

function questCoinReward(reward, locationId) {
  const base = Number(reward?.coins) || 0;
  const multiplier = locationId === "village" ? 0.35 : 0.65;
  return Math.max(base ? 2 : 0, Math.round(base * multiplier));
}

function allocateStat(stat) {
  if (!STAT_KEYS.includes(stat) || state.stats.statPoints <= 0 || state.stats[stat] >= 100) return;
  state.stats[stat] = clamp(state.stats[stat] + 1, 0, 100);
  state.stats.statPoints -= 1;
  if (stat === "knowledge") state.knowledge = Math.max(state.knowledge, state.stats.knowledge);
  state.journal = `${STAT_LABELS[stat]} increased. Exam Readiness is now ${examChance()}%.`;
  updateHud();
  saveGame();
}

const state = {
  knowledge: 0,
  coins: 30,
  inventory: defaultStarterInventory(),
  equipped: { outfit: "schoolJumper", tool: null },
  badges: [],
  completed: new Set(),
  completedQuests: new Set(),
  completedStudyStations: new Set(),
  examPracticeCompleted: new Set(),
  achievements: new Set(),
  miniGameScores: {},
  storyAct: 1,
  storySeen: new Set(),
  storyFlags: {},
  storyEnding: null,
  currentLocation: "village",
  unlockedLocations: new Set(["village"]),
  pendingGate: null,
  lastDoorReturn: null,
  activeQuest: null,
  quest: "Talk to the Mayor outside Town Hall.",
  journal: "Earn items by helping villagers.",
  profile: defaultProfile(),
  stats: defaultStats(),
  saveVersion: SAVE_VERSION,
  player: { x: 144, y: 404, w: 22, h: 32, dir: "down", step: 0 }
};

const camera = { x: 0, y: 0 };

const FEMALE_NPC_NAMES = new Set([
  "Ada", "Priya", "Mina", "Grace", "Farah", "June", "Amina", "Rae", "Tess", "Mira", "Nia", "Iona"
]);

const SKIN_TONES = ["#f2b785", "#c98b5d", "#8c5d45", "#e0a06d", "#b77452", "#6f4638"];
const HAIR_COLORS = ["#2b1a14", "#5b3525", "#7a4b28", "#d8a23a", "#1f2f3a", "#6a594d"];
const JACKET_COLORS = ["#8f4f44", "#466d9f", "#4f7b55", "#b98231", "#665a7d", "#2f4f5f", "#d88c5a"];
const WALKER_COATS = ["#6f7b8c", "#8a6f9c", "#5f8f6a", "#b07a52", "#7a8fa6", "#9c6f6f", "#6a9c97", "#a98a52"];

function serializeGame() {
  return {
    saveVersion: SAVE_VERSION,
    knowledge: state.knowledge,
    coins: state.coins,
    inventory: state.inventory,
    equipped: state.equipped,
    badges: state.badges,
    completed: [...state.completed],
    completedQuests: [...state.completedQuests],
    completedStudyStations: [...state.completedStudyStations],
    examPracticeCompleted: [...state.examPracticeCompleted],
    achievements: [...state.achievements],
    miniGameScores: state.miniGameScores,
    storyAct: state.storyAct,
    storySeen: [...state.storySeen],
    storyFlags: state.storyFlags,
    storyEnding: state.storyEnding,
    currentLocation: state.currentLocation,
    unlockedLocations: [...state.unlockedLocations],
    pendingGate: state.pendingGate,
    lastDoorReturn: state.lastDoorReturn,
    activeQuest: state.activeQuest,
    quest: state.quest,
    journal: state.journal,
    profile: state.profile,
    stats: state.stats,
    player: {
      x: state.player.x,
      y: state.player.y,
      dir: state.player.dir
    }
  };
}

function sanitiseStoryFlags(input = {}) {
  return Object.keys(STORY_FLAGS).reduce((flags, key) => {
    if (Boolean(input[key])) flags[key] = true;
    return flags;
  }, {});
}

function storyFlagCount() {
  return Object.keys(STORY_FLAGS).filter((key) => state.storyFlags?.[key]).length;
}

function markStoryFlag(key) {
  if (!STORY_FLAGS[key]) return "";
  state.storyFlags = sanitiseStoryFlags(state.storyFlags);
  if (state.storyFlags[key]) return "";
  state.storyFlags[key] = true;
  return ` ${STORY_FLAGS[key].label} recorded.`;
}

function shadeReactionText() {
  const count = storyFlagCount();
  if (count >= 5) return "The Shade has little left to feed on: you challenged rumours, defended rights, used evidence, helped volunteers, and planned action.";
  if (count >= 3) return "The Shade flickers as your choices start linking evidence, fairness, and action.";
  if (count >= 1) return "The Shade notices your choices, but some sparks still need action.";
  return "The Shade still waits for proof that you can turn knowledge into choices.";
}

function migrateSave(raw) {
  const data = raw && typeof raw === "object" ? { ...raw } : {};
  if (!Number.isFinite(data.saveVersion) || data.saveVersion < 2) {
    data.profile = sanitiseProfile(data.profile);
    data.stats = sanitiseStats(data.stats);
    if (!Array.isArray(data.inventory) || !data.inventory.length) {
      data.inventory = defaultStarterInventory();
    } else if (!data.inventory.includes("citizenScroll")) {
      data.inventory = [...data.inventory, "citizenScroll"];
    }
    data.saveVersion = 2;
  }
  if (data.saveVersion < 3) {
    data.achievements = Array.isArray(data.achievements) ? data.achievements : [];
    if (Array.isArray(data.inventory)) {
      defaultStarterInventory().forEach((id) => {
        if (!data.inventory.includes(id)) data.inventory.push(id);
      });
    }
    data.saveVersion = 3;
  }
  if (data.saveVersion < 4) {
    data.storyAct = Number.isFinite(data.storyAct) ? data.storyAct : 1;
    data.storySeen = Array.isArray(data.storySeen) ? data.storySeen : [];
    data.storyEnding = data.storyEnding || null;
    data.saveVersion = 4;
  }
  if (data.saveVersion < 5) {
    data.miniGameScores = data.miniGameScores && typeof data.miniGameScores === "object" ? data.miniGameScores : {};
    data.saveVersion = 5;
  }
  if (data.saveVersion < 6) {
    data.storyFlags = data.storyFlags && typeof data.storyFlags === "object" ? data.storyFlags : {};
    data.saveVersion = 6;
  }
  return data;
}

function hasSavedGame() {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch (error) {
    return false;
  }
}

function saveGame() {
  if (!saveReady) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(serializeGame()));
  } catch (error) {
    state.journal = "Save failed: browser storage is unavailable.";
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const saved = migrateSave(JSON.parse(raw));
    state.saveVersion = Number(saved.saveVersion) || SAVE_VERSION;
    state.profile = sanitiseProfile(saved.profile);
    state.stats = sanitiseStats(saved.stats);
    state.equipped = state.equipped || { outfit: "schoolJumper", tool: null };
    state.equipped.outfit = ITEMS[state.profile.outfit]?.type === "outfit" ? state.profile.outfit : "schoolJumper";
    state.knowledge = Number(saved.knowledge) || 0;
    state.stats.knowledge = Math.max(state.stats.knowledge, state.knowledge);
    state.coins = Number(saved.coins) || 0;
    state.inventory = Array.isArray(saved.inventory) ? saved.inventory.filter((id) => ITEMS[id]) : [];
    state.equipped = {
      outfit: ITEMS[saved.equipped?.outfit] ? saved.equipped.outfit : "schoolJumper",
      tool: ITEMS[saved.equipped?.tool] ? saved.equipped.tool : null
    };
    ensureEquipmentOwned();
    state.badges = Array.isArray(saved.badges) ? saved.badges : [];
    state.completed = new Set(Array.isArray(saved.completed) ? saved.completed : []);
    state.completedQuests = new Set(Array.isArray(saved.completedQuests) ? saved.completedQuests : []);
    state.completedStudyStations = new Set(Array.isArray(saved.completedStudyStations) ? saved.completedStudyStations : []);
    state.examPracticeCompleted = new Set(Array.isArray(saved.examPracticeCompleted) ? saved.examPracticeCompleted : []);
    state.achievements = new Set(Array.isArray(saved.achievements) ? saved.achievements.filter((id) => ACHIEVEMENTS.some((achievement) => achievement.id === id)) : []);
    state.miniGameScores = saved.miniGameScores && typeof saved.miniGameScores === "object" ? saved.miniGameScores : {};
    state.storyAct = Number(saved.storyAct) || 1;
    state.storySeen = new Set(Array.isArray(saved.storySeen) ? saved.storySeen.filter((id) => STORY_BEATS[id] || STORY_ENDINGS[id]) : []);
    state.storyFlags = sanitiseStoryFlags(saved.storyFlags);
    state.storyEnding = saved.storyEnding || null;
    state.unlockedLocations = new Set(Array.isArray(saved.unlockedLocations) ? saved.unlockedLocations : ["village"]);
    state.pendingGate = saved.pendingGate || null;
    state.lastDoorReturn = saved.lastDoorReturn && WORLD_LAYOUTS[saved.lastDoorReturn.from]
      ? {
        from: saved.lastDoorReturn.from,
        label: saved.lastDoorReturn.label,
        returnSpawn: {
          x: Number(saved.lastDoorReturn.returnSpawn?.x) || 144,
          y: Number(saved.lastDoorReturn.returnSpawn?.y) || 404
        }
      }
      : null;
    state.activeQuest = saved.activeQuest && QUESTS[saved.activeQuest.id] ? saved.activeQuest : null;
    state.quest = saved.quest || "Continue your citizenship journey.";
    state.journal = saved.journal || "Progress loaded.";
    const locationId = WORLD[saved.currentLocation] ? saved.currentLocation : "village";
    setLocation(locationId, { preservePlayer: true, preserveText: true, skipSave: true });
    if (saved.player) {
      state.player.x = Number(saved.player.x) || 144;
      state.player.y = Number(saved.player.y) || 404;
      state.player.dir = saved.player.dir || "down";
    }
    if (isBlocked(state.player.x, state.player.y, state.player.w, state.player.h)) {
      const spawn = safeSpawnFor(locationId);
      state.player.x = spawn.x;
      state.player.y = spawn.y;
      state.journal = "Saved position was blocked by the updated map, so you were moved to a safe starting spot.";
    }
    updateHud();
    if (state.pendingGate) showGateQuestion();
    return true;
  } catch (error) {
    localStorage.removeItem(SAVE_KEY);
    state.journal = "Saved progress was unreadable, so a new game started.";
    return false;
  }
}

function resetGame(options = {}) {
  localStorage.removeItem(SAVE_KEY);
  const profile = sanitiseProfile(options.profile || state.profile);
  state.profile = profile;
  state.stats = defaultStats();
  state.saveVersion = SAVE_VERSION;
  state.knowledge = 0;
  state.coins = 30;
  state.inventory = [...new Set([...defaultStarterInventory(), profile.outfit])];
  state.equipped = { outfit: profile.outfit, tool: null };
  state.badges = [];
  state.completed = new Set();
  state.completedQuests = new Set();
  state.completedStudyStations = new Set();
  state.examPracticeCompleted = new Set();
  state.achievements = new Set();
  state.miniGameScores = {};
  state.storyAct = 1;
  state.storySeen = new Set();
  state.storyFlags = {};
  state.storyEnding = null;
  state.unlockedLocations = new Set(["village"]);
  state.activeQuest = null;
  state.pendingGate = null;
  state.lastDoorReturn = null;
  state.quest = "Citizenship Village: complete all regional quests.";
  state.journal = `Welcome, ${profile.name}. The Citizen Scroll glows in your pack.`;
  setLocation("village");
  saveGame();
}

const ITEMS = {
  schoolJumper: {
    name: "School Jumper",
    type: "outfit",
    icon: "SJ",
    value: 0,
    color: "#2f638f",
    description: "A familiar starter outfit."
  },
  councilCloak: {
    name: "Council Cloak",
    type: "outfit",
    icon: "CC",
    value: 18,
    color: "#8f4f44",
    description: "A formal cloak for public debates."
  },
  campaignBoots: {
    name: "Campaign Boots",
    type: "outfit",
    icon: "CB",
    value: 16,
    color: "#3f7d4f",
    description: "Sturdy boots for door-knocking and petitions."
  },
  libertyCoat: {
    name: "Liberty Coat",
    type: "outfit",
    icon: "LC",
    value: 20,
    color: "#466d9f",
    description: "A smart coat stitched with rights symbols."
  },
  debateBlade: {
    name: "Debate Blade",
    type: "tool",
    icon: "DB",
    value: 24,
    effect: { miniGameBonus: "debateArena" },
    description: "A ceremonial blade that sharpens arguments, not people."
  },
  justiceQuill: {
    name: "Justice Quill",
    type: "tool",
    icon: "JQ",
    value: 22,
    effect: { examSections: ["Evaluate", "Source"], miniGameBonus: "sourceDetective" },
    description: "A courtly quill for clear evidence and fair judgement."
  },
  revisionTea: {
    name: "Revision Tea",
    type: "consumable",
    icon: "RT",
    value: 8,
    color: "#8fcf9b",
    effect: { focus: 25 },
    description: "Use to restore +25 Focus."
  },
  civicGem: {
    name: "Civic Gem",
    type: "treasure",
    icon: "CG",
    value: 30,
    color: "#67d6c7",
    description: "A valuable reward from an active citizenship project."
  },
  schoolBackpack: {
    name: "School Backpack",
    type: "quest",
    icon: "BP",
    value: 0,
    color: "#9a6a3a",
    description: "A sturdy bag for carrying unequipped items."
  },
  notebook: {
    name: "Notebook",
    type: "quest",
    icon: "NB",
    value: 0,
    color: "#d8c77a",
    effect: { openProgress: "story" },
    description: "A place for progress notes, clues, and future planning."
  },
  citizenScroll: {
    name: "Citizen Scroll",
    type: "quest",
    icon: "CS",
    value: 0,
    color: "#f2c14e",
    effect: { storyHint: true },
    description: "A starter scroll. It hints at lost sparks of participation across the valley."
  }
};

const ITEM_ASSETS = {
  schoolBackpack: "assets/items/school-backpack.png",
  notebook: "assets/items/notebook.png",
  revisionTea: "assets/items/revision-tea.png",
  citizenScroll: "assets/items/citizen-scroll.png",
  justiceQuill: "assets/items/justice-quill.png",
  debateBlade: "assets/items/debate-blade.png",
  civicGem: "assets/items/civic-gem.png"
};

const PROP_ASSETS = {
  ballotBox: "assets/props/region/trigger-ballot-box.png",
  debateBench: "assets/props/region/trigger-debate-bench.png",
  examDesk: "assets/props/region/trigger-exam-desk.png",
  kiosk: "assets/props/region/trigger-kiosk.png",
  notice: "assets/props/region/trigger-rights-notice.png",
  petitionStand: "assets/props/region/trigger-petition-stand.png",
  planningBoard: "assets/props/region/trigger-planning-board.png",
  podium: "assets/props/region/trigger-debate-podium.png"
};

const TILE_ASSETS = {
  grass: "assets/tiles/tile-grass.svg",
  road: "assets/tiles/tile-road.svg",
  plaza: "assets/tiles/tile-plaza.svg",
  water: "assets/tiles/tile-water.svg",
  dock: "assets/tiles/tile-dock.svg",
  wall: "assets/tiles/tile-wall.svg"
};

const HERO_ASSETS = {
  base: "assets/characters/hero-base-spritesheet.svg"
};

const heroBaseSprite = new AnimatedSprite({
  src: HERO_ASSETS.base,
  frameWidth: 32,
  frameHeight: 48,
  frames: 4,
  fps: 7,
  rows: { down: 0, left: 1, right: 2, up: 3 }
});

const VENDORS = {
  mayor: {
    title: "Village Supplies",
    stock: [
      { item: "revisionTea", price: 6, note: "Focus recovery for longer routes." },
      { item: "notebook", price: 10, note: "Progress notes for new citizens." }
    ]
  },
  editorVale: {
    title: "Source Desk",
    stock: [
      { item: "revisionTea", price: 7, note: "Steady focus before source checks." },
      { item: "justiceQuill", price: 28, note: "Evidence and reliability support." }
    ]
  },
  advocateFarah: {
    title: "Rights Kit",
    stock: [
      { item: "revisionTea", price: 7, note: "Calm revision before court topics." },
      { item: "libertyCoat", price: 26, note: "A rights-themed outfit." }
    ]
  },
  managerSol: {
    title: "Debate Stand",
    stock: [
      { item: "revisionTea", price: 7, note: "Focus before debates." },
      { item: "debateBlade", price: 30, note: "Helps in Debate Arena." }
    ]
  },
  campaignPriya2: {
    title: "Campaign Stall",
    stock: [
      { item: "revisionTea", price: 7, note: "Focus for petition routes." },
      { item: "campaignBoots", price: 22, note: "Built for participation work." }
    ]
  },
  plannerNoor2: {
    title: "Action Workshop Store",
    stock: [
      { item: "revisionTea", price: 8, note: "Focus for planning and evaluation." },
      { item: "notebook", price: 12, note: "Keep campaign objectives visible." }
    ]
  },
  examMira2: {
    title: "Exam Prep Desk",
    stock: [
      { item: "revisionTea", price: 8, note: "Recover Focus before the final exam." },
      { item: "justiceQuill", price: 30, note: "Useful for Evaluate and Source sections." }
    ]
  }
};

const baseMap = [
  "##############################",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "#............................#",
  "##############################"
];

const studyInteriorMap = [
  "##############################",
  "#::::::::::::::::::::::::::::#",
  "#::::::::::::::::::::::::::::#",
  "#:::::::,,,,,,,,,,,,:::::::::#",
  "#:::::::,,,,,,,,,,,,:::::::::#",
  "#:::::::,,,,,,,,,,,,:::::::::#",
  "#::::::::::::::::::::::::::::#",
  "#::::::::::::,,,,::::::::::::#",
  "#::::::::::::,,,,::::::::::::#",
  "#::::::::::::,,,,::::::::::::#",
  "#::::::::::::::::::::::::::::#",
  "#:::::::,,,,,,,,,,,,:::::::::#",
  "#:::::::,,,,,,,,,,,,:::::::::#",
  "#:::::::,,,,,,,,,,,,:::::::::#",
  "#::::::::::::::::::::::::::::#",
  "#::::::::::::,,,,::::::::::::#",
  "#::::::::::::,,,,::::::::::::#",
  "#::::::::::::,,,,::::::::::::#",
  "##############################"
];

const WORLD_LAYOUTS = {
  village: {
    map: baseMap,
    spawn: { x: 210, y: 392 },
    buildings: [
      { x: 86, y: 116, w: 112, h: 72, wall: "#d9c6a0", roof: "roofA", kind: "townhall" },
      { x: 612, y: 116, w: 104, h: 72, wall: "#c5d3b1", roof: "roofB", kind: "library" },
      { x: 396, y: 430, w: 136, h: 72, wall: "#d7d0c3", roof: "roofC", kind: "court" },
      { x: 740, y: 466, w: 92, h: 56, wall: "#d0a66f", roof: "roofD", kind: "garden" }
    ]
  },
  modernBritain: {
    map: [
      "##############################",
      "#............................#",
      "#............................#",
      "#..............,,,,..........#",
      "#..............,,,,..........#",
      "#..............,,,,..........#",
      "#..............,,,,..........#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,.#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,.#",
      "#..............,,,,..........#",
      "#..............,,,,..........#",
      "#..............,,,,..........#",
      "#............................#",
      "#...........::::::::.........#",
      "#...........::::::::.........#",
      "#...........::::::::.........#",
      "#............................#",
      "#............................#",
      "##############################"
    ],
    spawn: { x: 242, y: 394 },
    buildings: [
      { x: 72, y: 104, w: 128, h: 84, wall: "#d9c6a0", roof: "roofA", kind: "townhall" },
      { x: 646, y: 96, w: 118, h: 88, wall: "#c5d3b1", roof: "roofB", kind: "press" },
      { x: 388, y: 420, w: 160, h: 86, wall: "#d7d0c3", roof: "roofC", kind: "library" },
      { x: 734, y: 444, w: 106, h: 74, wall: "#d0a66f", roof: "roofD", kind: "garden" }
    ]
  },
  rightsLaw: {
    map: [
      "##############################",
      "#............................#",
      "#............................#",
      "#...........::::::::.........#",
      "#...........::::::::.........#",
      "#...........::::::::.........#",
      "#............................#",
      "#.............::::...........#",
      "#.............::::...........#",
      "#......::::::::::::::::......#",
      "#.............::::...........#",
      "#.............::::...........#",
      "#............................#",
      "#.............::::...........#",
      "#.............::::...........#",
      "#.............::::...........#",
      "#............................#",
      "#............................#",
      "##############################"
    ],
    spawn: { x: 330, y: 394 },
    buildings: [
      { x: 350, y: 112, w: 154, h: 92, wall: "#d7d0c3", roof: "roofC", kind: "court" },
      { x: 112, y: 284, w: 112, h: 78, wall: "#d9c6a0", roof: "roofA", kind: "library" },
      { x: 648, y: 282, w: 116, h: 78, wall: "#c5d3b1", roof: "roofB", kind: "court" },
      { x: 690, y: 448, w: 126, h: 78, wall: "#c2c8ca", roof: "roofD", kind: "police" }
    ]
  },
  democracy: {
    map: [
      "##############################",
      "#............................#",
      "#............................#",
      "#....::::::........::::::....#",
      "#....::::::........::::::....#",
      "#....::::::........::::::....#",
      "#............................#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,.#",
      "#,,,,,,,,,,,,,,,,,,,,,,,,,,,.#",
      "#...........::::::...........#",
      "#...........::::::...........#",
      "#...........::::::...........#",
      "#...........::::::...........#",
      "#............................#",
      "#.................::::::::...#",
      "#.................::::::::...#",
      "#............................#",
      "#............................#",
      "##############################"
    ],
    spawn: { x: 274, y: 394 },
    buildings: [
      { x: 104, y: 104, w: 138, h: 92, wall: "#d8b36a", roof: "roofA", kind: "townhall" },
      { x: 636, y: 104, w: 138, h: 92, wall: "#c5d3b1", roof: "roofB", kind: "campaign" },
      { x: 532, y: 458, w: 188, h: 64, wall: "#d7d0c3", roof: "roofC", kind: "campaign" },
      { x: 732, y: 450, w: 108, h: 70, wall: "#d0a66f", roof: "roofD", kind: "townhall" }
    ]
  },
  participation: {
    map: [
      "##############################",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
      "#~~~~====================~~~~#",
      "#~~..=..................=~~~~#",
      "#~~..=..................=~~~~#",
      "#~~..=..................=~~~~#",
      "#~~..=,,,,,,,,,,,,,,,,,,=~~~~#",
      "#~~..=,,,,,,,,,,,,,,,,,,=~~~~#",
      "#~~~~=..................=~~~~#",
      "#~~~~=..........::::....=~~~~#",
      "#~~~~=..........::::....=~~~~#",
      "#~~~~=..................=~~~~#",
      "#~~~~=..................=~~~~#",
      "#~~~~=............::::..=~~~~#",
      "#~~~~=............::::..=~~~~#",
      "#~~~~====================~~~~#",
      "#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#",
      "##############################"
    ],
    spawn: { x: 330, y: 394 },
    buildings: [
      { x: 124, y: 100, w: 120, h: 82, wall: "#d9c6a0", roof: "roofA", kind: "campaign" },
      { x: 438, y: 334, w: 126, h: 80, wall: "#c5d3b1", roof: "roofB", kind: "press" },
      { x: 170, y: 444, w: 138, h: 82, wall: "#d7d0c3", roof: "roofC", kind: "campaign" },
      { x: 592, y: 454, w: 112, h: 70, wall: "#d0a66f", roof: "roofD", kind: "garden" }
    ],
    harbor: true
  },
  actionWorkshop: {
    map: [
      "##############################",
      "#............................#",
      "#............................#",
      "#........::::......::::......#",
      "#........::::......::::......#",
      "#........::::......::::......#",
      "#............................#",
      "#......,,,,,,,,,,,,,,,,......#",
      "#......,,,,,,,,,,,,,,,,......#",
      "#......,,,,,,::::,,,,,,......#",
      "#............::::............#",
      "#............::::............#",
      "#............::::............#",
      "#..::::::::..::::............#",
      "#..::::::::..::::....::::::..#",
      "#..::::::::..::::....::::::..#",
      "#............................#",
      "#............................#",
      "##############################"
    ],
    spawn: { x: 330, y: 394 },
    buildings: [
      { x: 258, y: 104, w: 120, h: 86, wall: "#d9c6a0", roof: "roofA", kind: "library" },
      { x: 552, y: 104, w: 120, h: 86, wall: "#c5d3b1", roof: "roofB", kind: "press" },
      { x: 86, y: 438, w: 140, h: 84, wall: "#d7d0c3", roof: "roofC", kind: "campaign" },
      { x: 680, y: 442, w: 136, h: 84, wall: "#d0a66f", roof: "roofD", kind: "townhall" }
    ]
  },
  examHall: {
    map: [
      "##############################",
      "#............................#",
      "#............................#",
      "#...........::::::::.........#",
      "#...........::::::::.........#",
      "#...........::::::::.........#",
      "#............................#",
      "#............::::............#",
      "#............::::............#",
      "#......::::::::::::::::......#",
      "#......::::::::::::::::......#",
      "#............::::............#",
      "#............::::............#",
      "#..::::......::::......::::..#",
      "#..::::......::::......::::..#",
      "#..::::......::::......::::..#",
      "#............................#",
      "#............................#",
      "##############################"
    ],
    spawn: { x: 274, y: 394 },
    buildings: [
      { x: 350, y: 86, w: 176, h: 104, wall: "#d7d0c3", roof: "roofC", kind: "exam" },
      { x: 84, y: 254, w: 120, h: 80, wall: "#c5d3b1", roof: "roofA", kind: "exam" },
      { x: 682, y: 254, w: 120, h: 80, wall: "#c5d3b1", roof: "roofB", kind: "exam" },
      { x: 84, y: 434, w: 112, h: 84, wall: "#c5d3b1", roof: "roofA", kind: "exam" },
      { x: 682, y: 434, w: 116, h: 84, wall: "#c5d3b1", roof: "roofB", kind: "library" }
    ]
  },
  townHallInterior: {
    map: studyInteriorMap,
    spawn: { x: 468, y: 500 },
    buildings: []
  },
  libraryInterior: {
    map: studyInteriorMap,
    spawn: { x: 468, y: 500 },
    buildings: []
  },
  courtInterior: {
    map: studyInteriorMap,
    spawn: { x: 468, y: 500 },
    buildings: []
  },
  parkInterior: {
    map: studyInteriorMap,
    spawn: { x: 468, y: 500 },
    buildings: []
  }
};

const EXAM_PRACTICE_ROOMS = [
  {
    id: "identify",
    label: "Identify",
    title: "Identify Room",
    x: 286,
    y: 286,
    question: "Identify one way citizens can take part in democracy between general elections.",
    plan: [
      "Name one clear method of participation.",
      "Keep the answer short; this command word does not need a long explanation.",
      "Use precise citizenship vocabulary."
    ],
    model: "Citizens can contact their MP or local councillor between elections."
  },
  {
    id: "describe",
    label: "Describe",
    title: "Describe Room",
    x: 398,
    y: 286,
    question: "Describe two responsibilities that support rights in the UK.",
    plan: [
      "Give two distinct responsibilities.",
      "Add a little detail to each one.",
      "Link each responsibility to living fairly with other people."
    ],
    model: "One responsibility is obeying the law, because shared rules help protect everyone's rights. Another is respecting other people's freedom of expression, even when we disagree with them."
  },
  {
    id: "explain",
    label: "Explain",
    title: "Explain Room",
    x: 510,
    y: 286,
    question: "Explain why a free press can be important in a democracy.",
    plan: [
      "Make a clear point about information or accountability.",
      "Develop the point with a reason.",
      "Use an example such as investigations, debate, or checking power."
    ],
    model: "A free press is important because it helps citizens find out what people in power are doing. This supports accountability, as journalists can investigate decisions and give voters evidence to use when judging representatives."
  },
  {
    id: "evaluate",
    label: "Evaluate",
    title: "Evaluate Room",
    x: 342,
    y: 374,
    question: "Evaluate whether peaceful protest is an effective way for citizens to create change.",
    plan: [
      "Give one reason protest can be effective.",
      "Give one limitation or counter-argument.",
      "Reach a justified judgement based on evidence and context."
    ],
    model: "Peaceful protest can be effective because it raises public awareness and puts pressure on decision-makers. However, it may not lead to change if it lacks clear aims or public support. Overall, it is strongest when combined with evidence, petitions, media work, and contact with representatives."
  },
  {
    id: "sourceUsefulness",
    label: "Sources",
    title: "Source Usefulness Lab",
    x: 566,
    y: 374,
    question: "A campaign leaflet says: 'Most young people want more local youth services.' Explain how useful this source is for investigating a local issue.",
    plan: [
      "Use content: what information does the source give?",
      "Use origin and purpose: who made it and why?",
      "Judge limits: what extra evidence would you need?"
    ],
    model: "The leaflet is partly useful because it shows a campaign claim about youth services and may reveal what supporters believe. Its usefulness is limited because a leaflet is designed to persuade, so it may be selective or biased. I would also need survey data, council information, and views from young people who do not support the campaign."
  }
];

const BUILDING_LABELS = {
  village: ["Town Hall", "Library", "Court", "Park"],
  modernBritain: ["City Hall", "Printworks", "Museum", "Garden"],
  rightsLaw: ["Rights Aid", "Archive", "Court", "Police"],
  democracy: ["Parliament", "Party Hall", "Election", "Devolve"],
  participation: ["Petitions", "Signal Hub", "Union Hall", "Volunteer"],
  actionWorkshop: ["Research", "Survey Lab", "Planning", "Impact"],
  examHall: ["Identify", "Describe", "Explain", "Evaluate", "Sources"]
};

const BUILDING_DOOR_TARGETS = {
  village: ["townHallInterior", "libraryInterior", "courtInterior", "parkInterior"],
  modernBritain: ["townHallInterior", "libraryInterior", "libraryInterior", "parkInterior"],
  rightsLaw: ["courtInterior", "libraryInterior", "courtInterior", "courtInterior"],
  democracy: ["townHallInterior", "townHallInterior", "townHallInterior", "townHallInterior"],
  participation: ["parkInterior", "parkInterior", "parkInterior", "parkInterior"],
  actionWorkshop: ["libraryInterior", "libraryInterior", "parkInterior", "parkInterior"]
};

const BUILDING_DOOR_EXAM_ROOMS = {
  examHall: ["identify", "describe", "explain", "evaluate", "sourceUsefulness"]
};

const BUILDING_DOOR_SIDE_OVERRIDES = {
  villageDoor3: "left",
  modernBritainDoor3: "left",
  rightsLawDoor3: "left",
  democracyDoor3: "right",
  participationDoor2: "right",
  participationDoor3: "right",
  actionWorkshopDoor3: "left"
};

function placeBuildingDoor(building, side = "bottom") {
  if (side === "left") {
    return {
      x: building.x - 8,
      y: building.y + Math.round(building.h / 2) - 12,
      returnSpawn: {
        x: building.x - 34,
        y: building.y + Math.round(building.h / 2) - 16
      }
    };
  }
  if (side === "right") {
    return {
      x: building.x + building.w - 16,
      y: building.y + Math.round(building.h / 2) - 12,
      returnSpawn: {
        x: building.x + building.w + 10,
        y: building.y + Math.round(building.h / 2) - 16
      }
    };
  }
  return {
    x: Math.round(building.x + building.w / 2 - 12),
    y: building.y + building.h - 28,
    returnSpawn: {
      x: Math.round(building.x + building.w / 2 - 8),
      y: building.y + building.h + 22
    }
  };
}

function makeBuildingDoor(locationId, building, index) {
  const id = `${locationId}Door${index}`;
  const target = BUILDING_DOOR_TARGETS[locationId]?.[index];
  const examRoomId = BUILDING_DOOR_EXAM_ROOMS[locationId]?.[index] || null;
  const label = BUILDING_LABELS[locationId]?.[index];
  if ((!target && !examRoomId) || !label) return null;
  const placement = placeBuildingDoor(building, BUILDING_DOOR_SIDE_OVERRIDES[id] || "bottom");
  return {
    id,
    from: locationId,
    target,
    examRoomId,
    label,
    x: placement.x,
    y: placement.y,
    returnSpawn: placement.returnSpawn
  };
}

const BUILDING_DOORS = Object.keys(BUILDING_LABELS).flatMap((locationId) => {
  const buildings = WORLD_LAYOUTS[locationId]?.buildings || [];
  return buildings.map((building, index) => makeBuildingDoor(locationId, building, index)).filter(Boolean);
});

const INTERIOR_EXITS = {
  townHallInterior: { x: 454, y: 530, target: "village" },
  libraryInterior: { x: 454, y: 530, target: "village" },
  courtInterior: { x: 454, y: 530, target: "village" },
  parkInterior: { x: 454, y: 530, target: "village" }
};

const STUDY_STATIONS = {
  townHallInterior: [
    {
      id: "councilChamber",
      label: "Council Chamber",
      x: 128,
      y: 136,
      accent: "#d88c5a",
      summary: "Practise local democracy through short council decision scenarios.",
      revise: [
        "Local councils make decisions about services, budgets, safety, and community priorities.",
        "Good citizenship answers mention consultation, debate, voting, and accountability.",
        "Use local examples such as youth services, parks, transport, or recycling."
      ],
      examTip: "Explain questions work best when you show how a local issue leads to consultation, a decision, and accountability.",
      example: "One way a council can respond is by consulting local residents, debating the evidence, and then voting on a policy such as funding youth services.",
      reward: 3
    },
    {
      id: "decisionLadder",
      label: "Decision Ladder",
      x: 640,
      y: 136,
      accent: "#f2c14e",
      summary: "Memorise the order of a democratic decision from issue to review.",
      revise: [
        "Issue identified -> evidence gathered -> consultation -> debate -> vote -> review.",
        "Democratic decisions should be transparent and open to challenge.",
        "Review stages matter because policies can be improved after feedback."
      ],
      examTip: "When asked to describe decision-making, use sequence language such as first, then, after that, and finally.",
      example: "First the council gathers evidence on the problem, then it consults residents, debates options, votes, and later reviews the impact.",
      reward: 3
    },
    {
      id: "roleCards",
      label: "Role Cards",
      x: 128,
      y: 360,
      accent: "#6fbf73",
      summary: "Compare the roles of councillors, mayors, residents, and pressure groups.",
      revise: [
        "Councillors represent residents and scrutinise local decisions.",
        "Residents provide views, evidence, and democratic pressure.",
        "Pressure groups and campaigners raise awareness and try to influence priorities."
      ],
      examTip: "In describe answers, define each role briefly and link it to representation or participation.",
      example: "A councillor represents local people in debates, while residents influence decisions through consultation and contacting representatives.",
      reward: 3
    },
    {
      id: "serviceDesk",
      label: "Service Desk",
      x: 640,
      y: 360,
      accent: "#5da9e9",
      summary: "Link council decisions to real public services that appear in exam questions.",
      revise: [
        "Local government often covers housing, parks, waste, planning, and community facilities.",
        "Answers improve when you connect services to citizens' needs and budgets.",
        "Useful evaluation compares impact, cost, and fairness."
      ],
      examTip: "For evaluate questions, weigh benefits for the community against costs or limitations.",
      example: "Funding a youth centre may reduce antisocial behaviour and support wellbeing, but councillors must judge whether it is affordable and fair.",
      reward: 3
    }
  ],
  libraryInterior: [
    {
      id: "revisionShelves",
      label: "Revision Shelves",
      x: 128,
      y: 136,
      accent: "#5da9e9",
      summary: "Use a glossary wall to lock in key GCSE Citizenship terms.",
      revise: [
        "Focus on accountability, representation, rights, participation, and rule of law.",
        "Definitions should be accurate and short enough to use under pressure.",
        "Pair each term with one real example."
      ],
      examTip: "Identify questions reward precise terminology, so practise naming concepts cleanly.",
      example: "Accountability means decision-makers must explain and justify what they do and can be challenged if they fail.",
      reward: 3
    },
    {
      id: "flashcardDesk",
      label: "Flashcard Desk",
      x: 640,
      y: 136,
      accent: "#f2c14e",
      summary: "Turn definitions into quick active-recall revision.",
      revise: [
        "Front of card: term or command word. Back: definition plus one example.",
        "Mix identify, describe, explain, and evaluate prompts.",
        "Repeat weak cards more often than strong cards."
      ],
      examTip: "If a term is on a flashcard, you should be able to use it in one sentence without reading notes.",
      example: "Representation means elected people act on behalf of citizens in councils or Parliament.",
      reward: 3
    },
    {
      id: "sourceTable",
      label: "Source Table",
      x: 128,
      y: 360,
      accent: "#e36b5d",
      summary: "Practise source usefulness by checking content, origin, and purpose.",
      revise: [
        "Useful sources answer the question and provide relevant evidence.",
        "Origin and purpose can increase or reduce usefulness.",
        "A strong answer includes one limitation and one extra source needed."
      ],
      examTip: "Use the formula: useful because..., limited because..., I would also need....",
      example: "A campaign leaflet is useful for showing what campaigners claim, but limited because it is persuasive and may be selective.",
      reward: 3
    },
    {
      id: "misinformationCorner",
      label: "Misinformation Corner",
      x: 640,
      y: 360,
      accent: "#6fbf73",
      summary: "Learn how to test bias, reliability, and responsible sharing online.",
      revise: [
        "Ask who made the claim, what evidence is shown, and who benefits.",
        "Reliable citizenship revision uses official data, balanced sources, and dates.",
        "Citizens should avoid sharing claims they have not checked."
      ],
      examTip: "Reliability answers should refer to evidence, expertise, purpose, and corroboration.",
      example: "A social post with no named source is less reliable than official statistics checked against another source.",
      reward: 3
    }
  ],
  courtInterior: [
    {
      id: "mockTrial",
      label: "Mock Trial",
      x: 128,
      y: 136,
      accent: "#b089d6",
      summary: "Work through mini cases about fairness, evidence, and due process.",
      revise: [
        "Courts apply law using evidence and procedure rather than personal preference.",
        "Fair trial ideas include evidence, legal representation, and an impartial decision.",
        "Rule of law means nobody is above the law."
      ],
      examTip: "Explain answers on justice should connect fairness to evidence and equal treatment.",
      example: "A fair hearing matters because courts must judge evidence carefully and apply the law equally to all people.",
      reward: 3
    },
    {
      id: "rightsBench",
      label: "Rights Bench",
      x: 640,
      y: 136,
      accent: "#f2c14e",
      summary: "Compare rights with responsibilities and lawful limits.",
      revise: [
        "Rights protect freedom, dignity, and equal treatment.",
        "Some rights may be limited to protect safety or the rights of others.",
        "Strong answers mention balance, not absolute freedom in every case."
      ],
      examTip: "For evaluate questions, present both the right itself and the reason limits may exist.",
      example: "Freedom of expression is important, but it can be limited when speech causes serious harm or threatens others' rights.",
      reward: 3
    },
    {
      id: "verdictBuilder",
      label: "Verdict Builder",
      x: 128,
      y: 360,
      accent: "#d88c5a",
      summary: "Build balanced judgements from evidence, counter-arguments, and conclusions.",
      revise: [
        "Judgement should follow evidence, not come first.",
        "A balanced verdict acknowledges strengths, limits, and competing rights.",
        "Use linking phrases such as however, on the other hand, and overall."
      ],
      examTip: "Evaluate questions score better when the conclusion clearly follows from both sides of the argument.",
      example: "Overall, the policy is justified if it protects public safety and still preserves the core right as far as possible.",
      reward: 3
    },
    {
      id: "mistakesBoard",
      label: "Mistakes Board",
      x: 640,
      y: 360,
      accent: "#5da9e9",
      summary: "Catch common exam confusions before they cost marks.",
      revise: [
        "Civil law is mainly about disputes between people or organisations.",
        "Criminal law is mainly about offences against society.",
        "Rights, responsibilities, and moral rules are related but not identical."
      ],
      examTip: "If a question asks for legal knowledge, avoid drifting into vague moral opinion.",
      example: "Criminal cases involve offences against society, while civil cases usually settle disputes or claims between parties.",
      reward: 3
    }
  ],
  parkInterior: [
    {
      id: "noticeboard",
      label: "Noticeboard",
      x: 128,
      y: 136,
      accent: "#6fbf73",
      summary: "Compare real participation methods such as petitions, volunteering, and contacting representatives.",
      revise: [
        "Different methods suit different targets and issues.",
        "Good action is informed, lawful, and aimed at a real decision-maker.",
        "Participation can be formal or informal."
      ],
      examTip: "Describe answers improve when you name two methods and explain why each fits the issue.",
      example: "A petition can show public support, while contacting a councillor targets the person who can act on the issue.",
      reward: 3
    },
    {
      id: "campaignPlanner",
      label: "Campaign Planner",
      x: 640,
      y: 136,
      accent: "#f2c14e",
      summary: "Plan an active citizenship campaign with aims, audience, methods, and risks.",
      revise: [
        "A strong plan states the issue, the target, the audience, and the action method.",
        "Campaigns need evidence and realistic timing.",
        "Risks and limits should be anticipated early."
      ],
      examTip: "In project questions, always link methods to the people who have power to make the change.",
      example: "If the issue is unsafe crossings, the target may be the local council and the method could be a petition backed by survey evidence.",
      reward: 3
    },
    {
      id: "impactMeter",
      label: "Impact Meter",
      x: 128,
      y: 360,
      accent: "#5da9e9",
      summary: "Judge whether action worked by using evidence of change and reach.",
      revise: [
        "Impact can include awareness, response from decision-makers, turnout, policy change, or media coverage.",
        "Aims must be clear before success can be measured.",
        "Not all impact is immediate, so note short-term and longer-term outcomes."
      ],
      examTip: "Evaluation answers should name evidence, not just say the project was successful.",
      example: "The campaign showed impact because 300 people signed the petition and the council agreed to review the issue.",
      reward: 3
    },
    {
      id: "reflectionBench",
      label: "Reflection Bench",
      x: 640,
      y: 360,
      accent: "#e36b5d",
      summary: "Practise evaluation by identifying what to improve next time.",
      revise: [
        "Good evaluation includes strengths, weaknesses, evidence, and improvements.",
        "Consider different viewpoints such as supporters, officials, and the wider public.",
        "Improvement points should be realistic and specific."
      ],
      examTip: "The best evaluation conclusions are balanced and explain what should change next time.",
      example: "Next time the group could collect more survey evidence earlier and target the council committee directly.",
      reward: 3
    }
  ]
};

const STUDY_CHALLENGES = {
  townHallInterior: {
    councilChamber: {
      question: "Which step should normally happen before a council votes on a local policy?",
      answers: ["Consultation and debate", "Ignoring residents", "A criminal trial"],
      correct: 0,
      journal: "Council decisions are strongest when evidence, consultation, debate, and accountability appear in the answer.",
      success: "Correct: councils should usually consult and debate before making a decision.",
      incorrect: "Not quite. Councils usually gather views and debate evidence before they vote."
    },
    decisionLadder: {
      question: "Which order best matches democratic decision-making?",
      answers: ["Issue -> evidence -> consultation -> vote -> review", "Vote -> rumours -> ignore feedback", "Decision -> no review -> no explanation"],
      correct: 0,
      journal: "Sequence matters in citizenship answers because it shows how democratic choices move from issue to accountability.",
      success: "Correct: a strong answer tracks the issue from evidence and consultation to review.",
      incorrect: "Not quite. Put the issue and evidence first, then consultation, voting, and later review."
    },
    roleCards: {
      question: "Who mainly represents local residents in council debates?",
      answers: ["Councillors", "Judges", "Private companies"],
      correct: 0,
      journal: "Councillors represent residents, while other groups such as campaigners and residents themselves add pressure and evidence.",
      success: "Correct: councillors are elected to represent local residents.",
      incorrect: "Not quite. In local democracy, elected councillors are the main representatives in debates and scrutiny."
    },
    serviceDesk: {
      question: "Which set is most closely linked to local council decisions?",
      answers: ["Parks, housing, waste, and local facilities", "Declaring war and issuing passports", "Running every court case"],
      correct: 0,
      journal: "Local government answers improve when they link decisions to real services such as parks, housing, waste, and community facilities.",
      success: "Correct: councils are closely connected to everyday local services.",
      incorrect: "Not quite. Think about the everyday services people use in their community, such as parks, waste collection, or housing."
    }
  },
  libraryInterior: {
    revisionShelves: {
      question: "Which term means power holders must explain and justify what they do?",
      answers: ["Accountability", "Apathy", "Censorship"],
      correct: 0,
      journal: "Use precise vocabulary in GCSE answers. Accountability means decision-makers must explain and justify their actions.",
      success: "Correct: accountability is about being answerable for decisions and actions.",
      incorrect: "Not quite. Accountability is the term for explaining, justifying, and being challenged about decisions."
    },
    flashcardDesk: {
      question: "What makes a flashcard useful for revision?",
      answers: ["A definition plus one clear example", "A random slogan only", "A blank card"],
      correct: 0,
      journal: "Fast revision works best when a term is linked to a definition and one clear example you can reuse in an answer.",
      success: "Correct: a definition plus an example gives you something exam-ready to recall.",
      incorrect: "Not quite. Flashcards are strongest when they pair a definition with one clear example."
    },
    sourceTable: {
      question: "What usually makes a source only partly useful?",
      answers: ["It may be persuasive or selective", "It exists at all", "It is written in English"],
      correct: 0,
      journal: "Source usefulness answers should mention both what the source gives you and what limits its value, such as bias or selective purpose.",
      success: "Correct: persuasive sources can still help, but they are often limited by bias or selectivity.",
      incorrect: "Not quite. A source is often limited because its purpose may be persuasive, selective, or incomplete."
    },
    misinformationCorner: {
      question: "Which habit is most responsible before sharing a claim online?",
      answers: ["Checking evidence and source reliability", "Sharing it because it is dramatic", "Ignoring where it came from"],
      correct: 0,
      journal: "Responsible digital citizenship means checking evidence, origin, and reliability before sharing claims.",
      success: "Correct: evidence checking and source reliability matter before sharing information.",
      incorrect: "Not quite. Responsible sharing means checking evidence, source, and reliability first."
    }
  },
  courtInterior: {
    mockTrial: {
      question: "What best supports a fair trial?",
      answers: ["Evidence, procedure, and impartial judgement", "Only speed", "Only public opinion"],
      correct: 0,
      journal: "Fair trial answers should link justice to evidence, procedure, representation, and impartial judgement.",
      success: "Correct: fairness depends on evidence, procedure, and impartial judgement.",
      incorrect: "Not quite. Fair trials depend on evidence, lawful procedure, and an impartial decision-maker."
    },
    rightsBench: {
      question: "Why can some rights be limited in a democracy?",
      answers: ["To protect safety and the rights of others", "Because rights never matter", "Because governments should avoid all rules"],
      correct: 0,
      journal: "Evaluation answers on rights should show balance: rights matter, but some limits exist to protect safety and other people.",
      success: "Correct: limits may exist to protect public safety and the rights of others.",
      incorrect: "Not quite. Rights are important, but some can be limited to protect safety or other people's rights."
    },
    verdictBuilder: {
      question: "What makes an evaluation judgement strong?",
      answers: ["It follows evidence from both sides", "It ignores counter-arguments", "It is only emotional"],
      correct: 0,
      journal: "A strong verdict comes after weighing both sides and then justifying a final judgement with evidence.",
      success: "Correct: evaluation should weigh both sides before reaching a conclusion.",
      incorrect: "Not quite. Strong evaluation uses evidence from both sides before giving a final judgement."
    },
    mistakesBoard: {
      question: "What is criminal law mainly about?",
      answers: ["Offences against society", "Only private disputes", "School timetables"],
      correct: 0,
      journal: "Remember the exam distinction: criminal law deals mainly with offences against society, while civil law handles disputes and claims.",
      success: "Correct: criminal law mainly concerns offences against society.",
      incorrect: "Not quite. Criminal law mainly deals with offences against society rather than private disputes."
    }
  },
  parkInterior: {
    noticeboard: {
      question: "Which action best targets a local decision-maker?",
      answers: ["Contacting a councillor about a local issue", "Ignoring the issue", "Waiting without evidence"],
      correct: 0,
      journal: "Participation answers are stronger when the method clearly matches the decision-maker who can act on the issue.",
      success: "Correct: contacting a councillor can directly target the person linked to the local issue.",
      incorrect: "Not quite. Choose the method that reaches the decision-maker who can actually act on the issue."
    },
    campaignPlanner: {
      question: "What should a campaign plan always name clearly?",
      answers: ["Aim, target, method, and audience", "Only a slogan", "Only the poster colour"],
      correct: 0,
      journal: "A campaign plan should clearly state the issue, the target, the audience, and the action method.",
      success: "Correct: a usable campaign plan needs a clear aim, target, method, and audience.",
      incorrect: "Not quite. A proper campaign plan needs a clear aim, target, method, and audience."
    },
    impactMeter: {
      question: "What is the best evidence that a campaign had impact?",
      answers: ["Measured change such as signatures or an official response", "Only saying it felt successful", "No evidence at all"],
      correct: 0,
      journal: "Impact should be judged with evidence of change, reach, or response rather than vague claims of success.",
      success: "Correct: impact is strongest when you can show evidence of change or response.",
      incorrect: "Not quite. Impact needs evidence, such as signatures, responses, turnout, or policy review."
    },
    reflectionBench: {
      question: "What should a strong evaluation include at the end?",
      answers: ["Specific improvements for next time", "Only praise", "No conclusion"],
      correct: 0,
      journal: "Evaluation should include strengths, weaknesses, evidence, and realistic improvements for next time.",
      success: "Correct: improvement points are a key part of strong evaluation.",
      incorrect: "Not quite. Strong evaluation finishes with realistic improvements as well as strengths and limits."
    }
  }
};

Object.entries(STUDY_STATIONS).forEach(([locationId, stations]) => {
  stations.forEach((station) => {
    Object.assign(station, STUDY_CHALLENGES[locationId]?.[station.id] || {});
  });
});

const npcs = [
  {
    id: "mayor",
    name: "Mayor Ada",
    x: 168,
    y: 242,
    color: "#d88c5a",
    badge: "Democracy Badge",
    reward: { item: "councilCloak", coins: 10 },
    quest: "Find Priya at the noticeboard to learn how citizens take part.",
    intro: "Welcome to Citizenship Valley. A healthy democracy depends on people knowing how power is shared, checked, and challenged.",
    checks: [
      {
        question: "Which institution makes laws for the UK?",
        answers: ["Parliament", "The police", "The Bank of England"],
        correct: 0
      },
      {
        question: "Which idea helps stop one group having unchecked power?",
        answers: ["Accountability", "Censorship", "Random guessing"],
        correct: 0
      }
    ],
    feedback: "Parliament makes laws, while government proposes many of them and is held to account."
  },
  {
    id: "priya",
    name: "Priya the Campaigner",
    x: 372,
    y: 292,
    color: "#6fbf73",
    miniGameId: "petitionRegatta",
    badge: "Participation Badge",
    reward: { item: "campaignBoots", coins: 14 },
    quest: "Visit the library and speak to Sam about rights and responsibilities.",
    intro: "Voting is only one form of participation. Citizens can petition, campaign, join parties, volunteer, protest peacefully, or contact representatives.",
    checks: [
      {
        question: "Which action is a peaceful way to influence decision makers?",
        answers: ["Start a petition", "Ignore public issues", "Damage public property"],
        correct: 0
      },
      {
        question: "What makes a campaign stronger?",
        answers: ["Evidence and a clear target", "Only slogans", "No research"],
        correct: 0
      }
    ],
    feedback: "Petitions and campaigns can show public support while respecting the law."
  },
  {
    id: "sam",
    name: "Sam the Librarian",
    x: 688,
    y: 244,
    color: "#5da9e9",
    badge: "Rights Badge",
    reward: { item: "libertyCoat", coins: 16 },
    quest: "Go to the court and talk to Justice Rowan about the rule of law.",
    intro: "Rights protect freedoms, but they sit alongside responsibilities such as respecting the rights of others and obeying fair laws.",
    checks: [
      {
        question: "What does the Human Rights Act help protect in the UK?",
        answers: ["Basic rights and freedoms", "Only the right to vote", "Only consumer refunds"],
        correct: 0
      },
      {
        question: "Which responsibility best matches freedom of expression?",
        answers: ["Respect others' rights", "Silence everyone else", "Ignore consequences"],
        correct: 0
      }
    ],
    feedback: "It protects a broad set of rights and freedoms, including fair trial and expression."
  },
  {
    id: "rowan",
    name: "Justice Rowan",
    x: 356,
    y: 430,
    color: "#b089d6",
    badge: "Rule of Law Badge",
    reward: { item: "debateBlade", coins: 18 },
    quest: "Meet Councillor Noor near the park to plan an active citizenship project.",
    intro: "The rule of law means everyone, including people in power, is subject to law. Courts help decide disputes and protect legal rights.",
    checks: [
      {
        question: "Which statement best describes the rule of law?",
        answers: ["No one is above the law", "Only judges must obey laws", "Laws never change"],
        correct: 0
      },
      {
        question: "Why are independent courts important?",
        answers: ["They can judge disputes fairly", "They replace elections", "They write every manifesto"],
        correct: 0
      }
    ],
    feedback: "The rule of law includes equality before the law and legal limits on power."
  },
  {
    id: "noor",
    name: "Councillor Noor",
    x: 704,
    y: 384,
    color: "#f2c14e",
    badge: "Active Citizen Badge",
    reward: { items: ["justiceQuill", "civicGem"], coins: 25 },
    quest: "Chapter complete. Keep replaying conversations to revise key ideas.",
    intro: "For the exam, active citizenship means researching an issue, planning action, making a difference, and evaluating what happened.",
    checks: [
      {
        question: "What should you do before planning a citizenship action?",
        answers: ["Research the issue", "Choose a slogan at random", "Avoid listening to others"],
        correct: 0
      },
      {
        question: "What belongs in an evaluation?",
        answers: ["Impact and what could improve", "Only praise", "Only decoration"],
        correct: 0
      }
    ],
    feedback: "Good action starts with evidence, aims, target audiences, and reflection."
  }
];

const QUESTS = {
  mayorVote: {
    giver: "mayor",
    target: "sam",
    title: "Who Can Vote?",
    brief: "Go to the Library and ask Sam who is usually eligible to vote in UK general elections.",
    ask: "Ask Sam about voting eligibility.",
    clue: "In UK general elections, voters usually need to be registered, aged 18 or over, and a British, Irish, or qualifying Commonwealth citizen.",
    question: "Who is usually eligible to vote in a UK general election?",
    answers: ["A registered 18+ qualifying citizen", "Anyone living anywhere in Europe", "Only people who own property"],
    correct: 0,
    reward: { coins: 8, item: "revisionTea" },
    feedback: "Correct: eligibility links age, registration, and citizenship status."
  },
  mayorRepresent: {
    giver: "mayor",
    target: "priya",
    title: "Representative Democracy",
    brief: "Find Priya and ask how citizens can influence representatives between elections.",
    ask: "Ask Priya how citizens influence representatives.",
    clue: "Citizens can contact MPs or councillors, join campaigns, sign petitions, attend meetings, and use peaceful protest.",
    question: "Which action can influence representatives between elections?",
    answers: ["Contacting an MP or councillor", "Refusing all evidence", "Only waiting for the next election"],
    correct: 0,
    reward: { coins: 10, item: "civicGem" },
    feedback: "Correct: representative democracy includes accountability between elections."
  },
  mayorParliament: {
    giver: "mayor",
    target: "rowan",
    title: "Law-Making Trail",
    brief: "Ask Justice Rowan why Parliament matters when laws are challenged or debated.",
    ask: "Ask Rowan about Parliament and law.",
    clue: "Parliament is the UK legislature. It debates, scrutinises, and passes laws, while courts interpret and apply them.",
    question: "What is Parliament's main role in the legal system?",
    answers: ["Debate, scrutinise, and pass laws", "Arrest suspects", "Run every court case"],
    correct: 0,
    reward: { coins: 12, item: "councilCloak" },
    feedback: "Correct: Parliament makes law; courts apply and interpret it."
  },
  priyaPetition: {
    giver: "priya",
    target: "mayor",
    title: "Petition Route",
    brief: "Ask Mayor Ada what makes a petition useful in democratic participation.",
    ask: "Ask Mayor Ada about petitions.",
    clue: "A petition is stronger when it has a clear aim, evidence, public support, and a realistic decision-maker.",
    question: "What makes a petition stronger?",
    answers: ["Clear aim, evidence, and target", "A confusing demand", "No public support"],
    correct: 0,
    reward: { coins: 9, item: "campaignBoots" },
    feedback: "Correct: campaigns need evidence, aims, and an audience."
  },
  priyaMedia: {
    giver: "priya",
    target: "sam",
    title: "Media Watch",
    brief: "Ask Sam how a free press links to democratic life in modern Britain.",
    ask: "Ask Sam about the free press.",
    clue: "A free press informs the public, provides debate, influences opinion, and can hold people in power to account.",
    question: "Why is a free press important in a democracy?",
    answers: ["It can inform people and hold power to account", "It replaces courts", "It bans disagreement"],
    correct: 0,
    reward: { coins: 11, item: "revisionTea" },
    feedback: "Correct: media literacy is part of active, informed citizenship."
  },
  priyaProject: {
    giver: "priya",
    target: "noor",
    title: "Action Plan",
    brief: "Ask Councillor Noor what should go into an active citizenship plan.",
    ask: "Ask Noor about action planning.",
    clue: "A strong action plan sets aims, researches evidence, identifies targets, chooses methods, and plans evaluation.",
    question: "What belongs in an active citizenship plan?",
    answers: ["Aims, evidence, targets, action, evaluation", "Only a poster", "No research"],
    correct: 0,
    reward: { coins: 13, item: "civicGem" },
    feedback: "Correct: active citizenship is planned, evidenced, and evaluated."
  },
  samRights: {
    giver: "sam",
    target: "rowan",
    title: "Rights and Courts",
    brief: "Ask Justice Rowan why courts matter for rights.",
    ask: "Ask Rowan about rights and courts.",
    clue: "Courts protect legal rights by hearing disputes, applying law fairly, and checking whether power has been used lawfully.",
    question: "How can courts protect rights?",
    answers: ["By applying law fairly in disputes", "By writing every manifesto", "By stopping all elections"],
    correct: 0,
    reward: { coins: 10, item: "justiceQuill" },
    feedback: "Correct: rights need fair processes and independent courts."
  },
  samDuties: {
    giver: "sam",
    target: "mayor",
    title: "Rights Need Duties",
    brief: "Ask Mayor Ada for an example of a responsibility that supports rights.",
    ask: "Ask Mayor Ada about civic duties.",
    clue: "Responsibilities include obeying the law, respecting others' rights, serving on a jury if summoned, and voting or participating responsibly.",
    question: "Which is a civic responsibility?",
    answers: ["Respecting the rights of others", "Ignoring fair laws", "Silencing other voters"],
    correct: 0,
    reward: { coins: 9, item: "revisionTea" },
    feedback: "Correct: rights and responsibilities work together."
  },
  samIdentity: {
    giver: "sam",
    target: "noor",
    title: "Modern Britain",
    brief: "Ask Councillor Noor what shapes identity in modern Britain.",
    ask: "Ask Noor about identity in modern Britain.",
    clue: "Identity can be shaped by family, community, nation, language, culture, faith, migration, values, and shared democratic life.",
    question: "Which theme belongs to Life in modern Britain?",
    answers: ["Identity, diversity, and shared values", "Only court sentencing", "Only bank interest rates"],
    correct: 0,
    reward: { coins: 12, item: "libertyCoat" },
    feedback: "Correct: GCSE Citizenship asks how diverse communities live together."
  },
  rowanCriminal: {
    giver: "rowan",
    target: "sam",
    title: "Civil or Criminal?",
    brief: "Ask Sam the difference between civil and criminal law.",
    ask: "Ask Sam about civil and criminal law.",
    clue: "Criminal law deals with offences against society; civil law deals with disputes between individuals or organisations.",
    question: "What does criminal law mainly deal with?",
    answers: ["Offences against society", "Only private contract disputes", "Choosing MPs"],
    correct: 0,
    reward: { coins: 12, item: "debateBlade" },
    feedback: "Correct: criminal and civil law have different purposes and processes."
  },
  rowanPolice: {
    giver: "rowan",
    target: "mayor",
    title: "Police and Accountability",
    brief: "Ask Mayor Ada why public bodies need accountability.",
    ask: "Ask Mayor Ada about accountability.",
    clue: "Public bodies need accountability so power is used lawfully, fairly, transparently, and with public trust.",
    question: "Why is accountability important?",
    answers: ["It limits and checks public power", "It removes all rules", "It means no one answers questions"],
    correct: 0,
    reward: { coins: 11, item: "civicGem" },
    feedback: "Correct: accountability is a key democratic principle."
  },
  rowanJury: {
    giver: "rowan",
    target: "priya",
    title: "Jury Service",
    brief: "Ask Priya why jury service can be seen as citizenship in action.",
    ask: "Ask Priya about jury service.",
    clue: "Jury service lets citizens participate in justice by listening to evidence and helping decide facts in serious cases.",
    question: "Why can jury service be civic participation?",
    answers: ["Citizens help deliver justice", "It is a party campaign", "It replaces Parliament"],
    correct: 0,
    reward: { coins: 14, item: "justiceQuill" },
    feedback: "Correct: participation can include legal duties as well as political action."
  },
  noorSurvey: {
    giver: "noor",
    target: "priya",
    title: "Community Survey",
    brief: "Ask Priya how to collect evidence before taking action.",
    ask: "Ask Priya about collecting evidence.",
    clue: "Surveys, interviews, local statistics, news reports, and stakeholder views can help identify a real community issue.",
    question: "What should active citizens collect before acting?",
    answers: ["Evidence from reliable sources", "Only rumours", "Only guesses"],
    correct: 0,
    reward: { coins: 10, item: "revisionTea" },
    feedback: "Correct: evidence helps justify action and evaluate impact."
  },
  noorCouncil: {
    giver: "noor",
    target: "mayor",
    title: "Local Power",
    brief: "Ask Mayor Ada what local councils can influence.",
    ask: "Ask Mayor Ada about local councils.",
    clue: "Local councils can influence services such as planning, housing, waste, local transport, libraries, parks, and community facilities.",
    question: "Which issue is often linked to local councils?",
    answers: ["Libraries, parks, and local services", "Declaring war", "Changing the monarchy"],
    correct: 0,
    reward: { coins: 12, item: "campaignBoots" },
    feedback: "Correct: local government matters for everyday public services."
  },
  noorEvaluate: {
    giver: "noor",
    target: "rowan",
    title: "Evaluate Impact",
    brief: "Ask Justice Rowan what makes evaluation fair and balanced.",
    ask: "Ask Rowan about evaluation.",
    clue: "A balanced evaluation considers evidence of impact, limitations, different viewpoints, and what could be improved next time.",
    question: "What should a strong evaluation include?",
    answers: ["Impact, limits, views, and improvements", "Only success claims", "No evidence"],
    correct: 0,
    reward: { coins: 16, item: "civicGem" },
    feedback: "Correct: evaluation is essential in the active citizenship part of GCSE."
  }
};

npcs.forEach((npc) => {
  if (VENDORS[npc.id]) npc.vendor = VENDORS[npc.id];
  npc.questIds = Object.keys(QUESTS).filter((id) => QUESTS[id].giver === npc.id);
});

const locationOrder = ["village", "modernBritain", "rightsLaw", "democracy", "participation", "actionWorkshop", "examHall"];

const INTERIOR_LOCATIONS = {
  townHallInterior: {
    name: "Town Hall Interior",
    shortName: "Town Hall",
    badge: "Council Revision Badge",
    next: null,
    travel: "Study complete",
    studyReward: { coins: 10 },
    visual: { sky: "#3d3b4a", water: "#2a4d5e", road: "#8f8576", roofA: "#8f4f44", roofB: "#4b6f88", roofC: "#665a7d", roofD: "#4f7b55" },
    npcs: [],
    questIds: [],
    gateQuestions: []
  },
  libraryInterior: {
    name: "Library Interior",
    shortName: "Library",
    badge: "Research Revision Badge",
    next: null,
    travel: "Study complete",
    studyReward: { coins: 10 },
    visual: { sky: "#314553", water: "#2a4d5e", road: "#848c8b", roofA: "#8f4f44", roofB: "#4b6f88", roofC: "#665a7d", roofD: "#4f7b55" },
    npcs: [],
    questIds: [],
    gateQuestions: []
  },
  courtInterior: {
    name: "Court Interior",
    shortName: "Court",
    badge: "Justice Revision Badge",
    next: null,
    travel: "Study complete",
    studyReward: { coins: 10 },
    visual: { sky: "#44414f", water: "#2a4d5e", road: "#938b86", roofA: "#8f4f44", roofB: "#4b6f88", roofC: "#665a7d", roofD: "#4f7b55" },
    npcs: [],
    questIds: [],
    gateQuestions: []
  },
  parkInterior: {
    name: "Park Action Hub",
    shortName: "Park Hub",
    badge: "Action Planning Badge",
    next: null,
    travel: "Study complete",
    studyReward: { coins: 10 },
    visual: { sky: "#355044", water: "#2a4d5e", road: "#8a8d78", roofA: "#8f4f44", roofB: "#4b6f88", roofC: "#665a7d", roofD: "#4f7b55" },
    npcs: [],
    questIds: [],
    gateQuestions: []
  }
};

const WORLD = {
  village: {
    name: "Citizenship Village",
    shortName: "Village",
    badge: "Informed Citizen",
    next: "modernBritain",
    travel: "Train to Modern Britain Borough",
    visual: { sky: "#63a858", water: "#1f6b78", road: "#a8a79d", roofA: "#8f4f44", roofB: "#4b6f88", roofC: "#665a7d", roofD: "#4f7b55" },
    npcs: npcs.map((npc) => ({ ...npc })),
    questIds: Object.keys(QUESTS),
    gateQuestions: [
      {
        question: "Which word means decisions and power should be checked and explained?",
        answers: ["Accountability", "Censorship", "Apathy"],
        correct: 0
      },
      {
        question: "What is a strong citizenship answer built from?",
        answers: ["Point, evidence, explanation, judgement", "Only opinion", "Only a slogan"],
        correct: 0
      },
      {
        question: "Which action is active citizenship?",
        answers: ["Researching an issue and taking informed action", "Ignoring local problems", "Avoiding all debate"],
        correct: 0
      }
    ]
  }
};

const locationBlueprints = [
  {
    id: "modernBritain",
    name: "Modern Britain Borough",
    shortName: "Borough",
    badge: "Modern Britain Mapper",
    next: "rightsLaw",
    travel: "Underground to Rights & Law Quarter",
    visual: { sky: "#5f9aa8", water: "#276c83", road: "#b2aba2", roofA: "#8f4f44", roofB: "#3f6f7f", roofC: "#6f5c8f", roofD: "#4f7b55" },
    npcs: [
      ["editorVale", "Editor Vale", 168, 242, "#e36b5d", "Free press, public interest, and media influence."],
      ["historianIona", "Historian Iona", 372, 292, "#b089d6", "Identity, nations of the UK, and shared values."],
      ["aidMina", "Aid Worker Mina", 640, 232, "#6fbf73", "NGOs, humanitarian crises, and global responsibility."],
      ["dataOmar", "Data Clerk Omar", 356, 430, "#5da9e9", "Migration, statistics, and community change."],
      ["elderGrace", "Community Elder Grace", 704, 384, "#f2c14e", "Diversity, respect, and community cohesion."]
    ],
    topics: [
      ["identity", "Identity Web", "historianIona", "elderGrace", "Ask Grace what can shape a person's identity.", "Identity can be shaped by family, community, nation, language, culture, faith, migration, values, and personal experience.", "Which set best describes identity influences?", ["Family, culture, values, nation, community", "Only hair colour", "Only exam grades"]],
      ["diversity", "Living Together", "elderGrace", "historianIona", "Ask Iona why diversity matters in modern Britain.", "Diversity can enrich communities, but citizenship also asks how shared values, respect, and equal rights help people live together.", "What helps diverse communities live together?", ["Mutual respect and equal rights", "Ignoring every difference", "Banning disagreement"]],
      ["freePress", "Free Press Case", "editorVale", "dataOmar", "Ask Omar how evidence helps judge a media claim.", "A free press can inform people and hold power to account, but citizens should check accuracy, evidence, and bias.", "Why is a free press important?", ["It informs people and can hold power to account", "It replaces elections", "It stops all criticism"]],
      ["migration", "Migration Map", "dataOmar", "elderGrace", "Ask Grace how migration can affect communities.", "Migration can bring skills, culture, and growth, while also creating questions about services, housing, and cohesion.", "A balanced answer on migration should include...", ["Benefits and challenges with evidence", "Only rumours", "Only one viewpoint"]],
      ["globalUk", "UK In The World", "aidMina", "editorVale", "Ask Vale how citizens learn about international issues.", "The UK works with international organisations and NGOs; media coverage can influence public concern and government action.", "Which organisation type often supports humanitarian crises?", ["NGOs and international bodies", "Only football clubs", "Only local shops"]]
    ],
    gateQuestions: [
      ["What topic belongs to Life in modern Britain?", ["Identity, diversity, media, and UK global role", "Only algebra", "Only driving tests"]],
      ["What should citizens check before sharing a media claim?", ["Accuracy, evidence, and bias", "Whether it is exciting", "Whether it is short"]],
      ["What is a balanced way to discuss diversity?", ["Consider shared values, rights, and different experiences", "Use one stereotype", "Avoid evidence"]]
    ]
  },
  {
    id: "rightsLaw",
    name: "Rights & Law Quarter",
    shortName: "Law Quarter",
    badge: "Rights Defender",
    next: "democracy",
    travel: "Clock-lift to Democracy Capital",
    visual: { sky: "#586a75", water: "#245666", road: "#93908a", roofA: "#4b5a65", roofB: "#5c5470", roofC: "#7b6d65", roofD: "#2f4f5f" },
    npcs: [
      ["advocateFarah", "Advocate Farah", 72, 218, "#466d9f", "Human rights, equality, and discrimination."],
      ["sergeantBlake", "Sergeant Blake", 372, 292, "#31405a", "Police powers, safeguards, and accountability."],
      ["mediatorChen", "Mediator Chen", 612, 220, "#d88c5a", "Civil disputes and legal solutions."],
      ["youthEllis", "Youth Worker Ellis", 356, 430, "#6fbf73", "Youth justice and rehabilitation."],
      ["justiceRowan2", "Justice Rowan", 604, 360, "#b089d6", "Courts, rule of law, and fair trials."]
    ],
    topics: [
      ["ruleLaw", "Rule of Law Seal", "justiceRowan2", "advocateFarah", "Ask Farah why power must be limited by law.", "The rule of law means everyone is subject to law, including people in power, and laws should be applied fairly.", "Which statement best fits rule of law?", ["No one is above the law", "Power has no limits", "Only citizens obey law"]],
      ["civilCriminal", "Civil or Criminal?", "mediatorChen", "justiceRowan2", "Ask Rowan to compare civil and criminal law.", "Criminal law deals with offences against society; civil law deals with disputes between people or organisations.", "Criminal law mainly concerns...", ["Offences against society", "Only private disputes", "Election manifestos"]],
      ["humanRights", "Rights Archive", "advocateFarah", "sergeantBlake", "Ask Blake why rights can have limits.", "Rights protect freedoms, but they may be balanced with public safety and the rights of others.", "Rights are often balanced with...", ["Responsibilities and public safety", "No duties at all", "Random preference"]],
      ["policePowers", "Police Safeguards", "sergeantBlake", "mediatorChen", "Ask Chen why safeguards matter.", "Police powers need safeguards so investigations are lawful, fair, and accountable.", "Why do police powers need safeguards?", ["To protect fairness and accountability", "To stop all policing", "To hide decisions"]],
      ["youthJustice", "Second Chances", "youthEllis", "advocateFarah", "Ask Farah how justice can include rehabilitation.", "Sentencing can aim to punish, deter, protect the public, repair harm, and rehabilitate.", "Which is a sentencing aim?", ["Rehabilitation", "Confusion", "Censorship"]]
    ],
    gateQuestions: [
      ["What is the rule of law?", ["Everyone, including power holders, is subject to law", "Only judges obey law", "Laws never change"]],
      ["Civil law usually deals with...", ["Disputes between people or organisations", "All general elections", "Only Parliament debates"]],
      ["A fair justice system needs...", ["Rights, evidence, and due process", "Only speed", "No appeals"]]
    ]
  },
  {
    id: "democracy",
    name: "Democracy Capital",
    shortName: "Capital",
    badge: "Democracy Scholar",
    next: "participation",
    travel: "Campaign Ferry to Participation Harbour",
    visual: { sky: "#7b8653", water: "#315f78", road: "#b9b18f", roofA: "#8f4f44", roofB: "#b98231", roofC: "#4b6f88", roofD: "#665a7d" },
    npcs: [
      ["speakerLark", "Speaker Lark", 108, 242, "#d8b36a", "Parliament and scrutiny."],
      ["mpRivers", "MP Rivers", 372, 292, "#5da9e9", "Representation and constituencies."],
      ["managerSol", "Campaign Manager Sol", 640, 244, "#e36b5d", "Parties and manifestos."],
      ["officerJune", "Returning Officer June", 356, 430, "#6fbf73", "Elections and voting systems."],
      ["heraldEwan", "Devolution Herald Ewan", 704, 368, "#b089d6", "Devolution and levels of government."]
    ],
    topics: [
      ["parliament", "Bill Trail", "speakerLark", "mpRivers", "Ask Rivers how MPs represent people.", "Parliament debates, scrutinises, passes laws, and holds government to account.", "Parliament can hold government to account by...", ["Scrutiny and questions", "Arresting voters", "Running every school"]],
      ["government", "Cabinet Key", "mpRivers", "speakerLark", "Ask Lark how government relates to Parliament.", "Government runs the country and proposes policies; Parliament scrutinises and passes laws.", "Government is mainly responsible for...", ["Running policy and public administration", "Being every court", "Counting every vote alone"]],
      ["elections", "Ballot Box Trial", "officerJune", "managerSol", "Ask Sol why manifestos matter.", "Elections let voters choose representatives; parties publish manifestos to explain policies.", "A manifesto is...", ["A party's policy promises", "A court sentence", "A police warrant"]],
      ["votingSystems", "Counting Method", "officerJune", "mpRivers", "Ask Rivers about constituencies.", "First Past the Post elects one MP per constituency; other systems can represent votes differently.", "First Past the Post usually elects...", ["One representative per constituency", "Every candidate", "No Parliament"]],
      ["devolution", "Four Nations Gate", "heraldEwan", "speakerLark", "Ask Lark why power can be shared.", "Devolution gives some powers to Scotland, Wales, and Northern Ireland while the UK Parliament keeps reserved powers.", "Devolution means...", ["Some powers are held by devolved administrations", "Local councils vanish", "No UK Parliament"]]
    ],
    gateQuestions: [
      ["What does Parliament do?", ["Debates, scrutinises, and passes laws", "Only sells goods", "Only runs courts"]],
      ["Why do elections matter?", ["They let citizens choose representatives", "They stop participation", "They remove accountability"]],
      ["Devolution is about...", ["Sharing power across UK nations and institutions", "Banning local government", "Replacing rights"]]
    ]
  },
  {
    id: "participation",
    name: "Participation Harbour",
    shortName: "Harbour",
    badge: "Participation Strategist",
    next: "actionWorkshop",
    travel: "Campaign Boat to Action Workshop",
    visual: { sky: "#4f9b8f", water: "#1f6b78", road: "#aa967a", roofA: "#b94e48", roofB: "#466d9f", roofC: "#8f5b3f", roofD: "#4f7b55" },
    npcs: [
      ["campaignPriya2", "Priya the Campaigner", 164, 250, "#6fbf73", "Campaign strategy and public voice."],
      ["unionMorgan", "Union Rep Morgan", 372, 292, "#d88c5a", "Trade unions and collective action."],
      ["charityAmina", "Charity Lead Amina", 664, 220, "#5da9e9", "Volunteering and charities."],
      ["lobbyistPax", "Lobbyist Pax", 356, 406, "#b089d6", "Lobbying and pressure groups."],
      ["moderatorRae", "Digital Moderator Rae", 704, 368, "#f2c14e", "Social media and online participation."]
    ],
    topics: [
      ["petition", "Petition Pier", "campaignPriya2", "lobbyistPax", "Ask Pax what target a petition needs.", "A petition needs a clear demand, evidence, public support, and the right decision-maker.", "A strong petition needs...", ["Clear aim, evidence, and target", "No audience", "Only decoration"]],
      ["pressureGroups", "Pressure Office", "lobbyistPax", "unionMorgan", "Ask Morgan how groups influence decisions.", "Pressure groups try to influence policy; they may campaign, lobby, use media, and mobilise supporters.", "A pressure group mainly tries to...", ["Influence policy or public decisions", "Run every court", "Replace all voters"]],
      ["volunteering", "Volunteer Dock", "charityAmina", "campaignPriya2", "Ask Priya why volunteering counts as participation.", "Volunteering helps communities and can create social change without formal party politics.", "Volunteering is citizenship because it...", ["Helps communities and public life", "Avoids all responsibility", "Only benefits exams"]],
      ["protest", "Protest Green", "unionMorgan", "moderatorRae", "Ask Rae how protest can spread online.", "Peaceful protest can raise awareness and pressure decision-makers, but it must consider law and others' rights.", "Peaceful protest should consider...", ["Law, rights, and public impact", "Only anger", "No consequences"]],
      ["digitalAction", "Signal Tower", "moderatorRae", "charityAmina", "Ask Amina how online action can support real communities.", "Digital campaigns can spread information quickly, but citizens should check evidence and avoid misinformation.", "Digital participation needs...", ["Evidence checking and responsible sharing", "Rumours only", "No sources"]]
    ],
    gateQuestions: [
      ["Which is a participation method?", ["Petitioning or campaigning", "Ignoring issues", "Banning debate"]],
      ["Pressure groups try to...", ["Influence decisions and policy", "Run all elections", "Be courts"]],
      ["Digital campaigns should avoid...", ["Misinformation", "Evidence", "Clear aims"]]
    ]
  },
  {
    id: "actionWorkshop",
    name: "Action Workshop",
    shortName: "Workshop",
    badge: "Active Citizen",
    next: "examHall",
    travel: "Lighthouse Bridge to Exam Hall",
    visual: { sky: "#7b9b6f", water: "#2d7186", road: "#9aa28b", roofA: "#9a633f", roofB: "#466d9f", roofC: "#6fbf73", roofD: "#b98231" },
    npcs: [
      ["plannerNoor2", "Councillor Noor", 132, 218, "#f2c14e", "Planning active citizenship projects."],
      ["surveyorTess", "Surveyor Tess", 372, 292, "#5da9e9", "Surveys and interviews."],
      ["statJules", "Statistician Jules", 664, 220, "#6fbf73", "Data, charts, and impact."],
      ["organiserKai", "Organiser Kai", 356, 430, "#e36b5d", "Action methods and events."],
      ["examinerMira", "Examiner Mira", 620, 384, "#b089d6", "Evaluation and exam write-up."]
    ],
    topics: [
      ["issue", "Choose The Issue", "plannerNoor2", "surveyorTess", "Ask Tess how to choose a real issue.", "A good issue is specific, researchable, linked to citizenship, and important to a community.", "A good active citizenship issue should be...", ["Specific, researchable, and relevant", "Impossible to investigate", "Only a joke"]],
      ["research", "Evidence Tools", "surveyorTess", "statJules", "Ask Jules how to use evidence.", "Research can use surveys, interviews, statistics, news, official sources, and stakeholder views.", "Which is useful project evidence?", ["Surveys, interviews, and reliable statistics", "Only guesses", "Only one rumour"]],
      ["plan", "Planning Board", "plannerNoor2", "organiserKai", "Ask Kai what an action plan needs.", "An action plan should name aims, targets, methods, resources, timing, and risks.", "An action plan should include...", ["Aims, targets, methods, and timing", "Only a title", "No audience"]],
      ["impact", "Impact Observatory", "statJules", "examinerMira", "Ask Mira how impact is judged.", "Impact is judged using evidence: what changed, who was reached, and whether aims were met.", "Impact should be measured using...", ["Evidence of change and reach", "Feelings only", "No aims"]],
      ["evaluation", "Reflection Room", "examinerMira", "plannerNoor2", "Ask Noor what should be improved after action.", "Evaluation should consider impact, limits, different viewpoints, and what could be improved.", "A strong evaluation includes...", ["Impact, limitations, views, and improvements", "Only praise", "No evidence"]]
    ],
    gateQuestions: [
      ["Before action, active citizens should...", ["Research the issue", "Avoid evidence", "Hide the aim"]],
      ["Evaluation should include...", ["Impact and improvements", "Only slogans", "Only decoration"]],
      ["A project plan needs...", ["Aims, targets, methods, timing", "No audience", "No evidence"]]
    ]
  },
  {
    id: "examHall",
    name: "Exam Hall Castle",
    shortName: "Exam Hall",
    badge: "Exam Champion",
    next: null,
    travel: "Course complete",
    visual: { sky: "#6b5b8f", water: "#394d78", road: "#a79bb7", roofA: "#5c5470", roofB: "#394d78", roofC: "#6b5b8f", roofD: "#b98231" },
    npcs: [
      ["examMira2", "Examiner Mira", 236, 218, "#b089d6", "Command words and mark schemes."],
      ["timeAsh", "Timekeeper Ash", 372, 292, "#d88c5a", "Timed practice."],
      ["sourceNia", "Source Keeper Nia", 648, 220, "#5da9e9", "Source reliability and usefulness."],
      ["coachLeon", "Debate Coach Leon", 356, 430, "#6fbf73", "Balanced arguments."],
      ["scribePip", "Paragraph Scribe Pip", 620, 384, "#f2c14e", "PEEL paragraphs and evidence."]
    ],
    topics: [
      ["commandWords", "Command Word Corridor", "examMira2", "scribePip", "Ask Pip how explain differs from identify.", "Identify means name something; explain means give a developed reason or link.", "Explain questions need...", ["Developed reasons", "One-word labels only", "No links"]],
      ["sourceReliability", "Source Library", "sourceNia", "examMira2", "Ask Mira what makes a source useful.", "Source usefulness depends on content, origin, purpose, accuracy, and relevance to the question.", "Source usefulness depends on...", ["Content, origin, purpose, accuracy, relevance", "Font colour only", "Whether it is short"]],
      ["paragraphs", "Paragraph Forge", "scribePip", "coachLeon", "Ask Leon why paragraphs need evidence.", "A strong paragraph makes a point, uses evidence, explains it, and links back to the question.", "A PEEL paragraph includes...", ["Point, evidence, explanation, link", "Only conclusion", "Only quote"]],
      ["balance", "Debate Arena", "coachLeon", "sourceNia", "Ask Nia how to use both sides fairly.", "Evaluation needs balanced arguments, evidence on both sides, and a justified conclusion.", "Evaluation needs...", ["Balance and justified judgement", "One side only", "No conclusion"]],
      ["timing", "Timed Trial Tower", "timeAsh", "examMira2", "Ask Mira how to manage longer questions.", "Longer answers need planned points, examples, balance, and time for a judgement.", "Long answers benefit from...", ["Planning, examples, balance, judgement", "Writing randomly", "No structure"]]
    ],
    gateQuestions: [
      ["A strong evaluation answer needs...", ["Balanced evidence and a justified judgement", "Only one fact", "No conclusion"]],
      ["Source reliability can depend on...", ["Origin, purpose, accuracy, and relevance", "Only page colour", "Only length"]],
      ["PEEL stands for...", ["Point, evidence, explanation, link", "Power, election, essay, law", "Plan, erase, exit, lose"]]
    ]
  }
];

function makeNpc([id, name, x, y, color, intro]) {
  const miniGameLink = MINI_GAME_NPC_LINKS[id];
  const vendor = VENDORS[id];
  return {
    id,
    name,
    x,
    y,
    color,
    ...(miniGameLink ? { miniGameId: miniGameLink.miniGameId } : {}),
    ...(vendor ? { vendor } : {}),
    badge: "Regional Badge",
    reward: { item: "revisionTea", coins: 8 },
    quest: "Choose another regional quest.",
    intro,
    checks: [
      {
        question: "What is the best way to learn this topic?",
        answers: ["Ask questions and use evidence", "Guess quickly", "Avoid examples"],
        correct: 0
      }
    ],
    feedback: "Good citizenship answers use accurate knowledge, evidence, and judgement."
  };
}

function buildQuest(location, topic) {
  const [slug, title, giver, target, brief, clue, question, answers] = topic;
  return {
    giver,
    target,
    title,
    brief,
    ask: `Ask about ${title}.`,
    clue,
    question,
    answers,
    correct: 0,
    reward: { coins: 8 },
    feedback: `Correct: ${title} is part of ${location.name}.`,
    location: location.id
  };
}

locationBlueprints.forEach((location) => {
  WORLD[location.id] = {
    ...location,
    npcs: location.npcs.map(makeNpc),
    questIds: location.topics.map((topic) => `${location.id}_${topic[0]}`),
    gateQuestions: location.gateQuestions.map(([question, answers]) => ({ question, answers, correct: 0 }))
  };
  WORLD[location.id].topics.forEach((topic) => {
    QUESTS[`${location.id}_${topic[0]}`] = buildQuest(location, topic);
  });
});

Object.entries(INTERIOR_LOCATIONS).forEach(([locationId, location]) => {
  WORLD[locationId] = {
    ...location,
    npcs: [],
    questIds: [],
    gateQuestions: []
  };
});

function applyCurriculumGuide() {
  const guide = window.GCSE_CURRICULUM_INDEX || {};
  Object.entries(QUESTS).forEach(([id, quest]) => {
    const topic = guide[id];
    if (!topic) return;
    const detail = `${topic.correctAnswer} ${topic.note || ""}`.trim();
    quest.clue = detail;
    quest.feedback = `Correct. ${detail}`;
    quest.curriculum = {
      npc: topic.npc,
      asks: topic.asks,
      correctAnswer: topic.correctAnswer,
      note: topic.note || ""
    };
  });
}

applyCurriculumGuide();

function currentLocation() {
  return WORLD[state.currentLocation];
}

// Inside a shared interior, show the building the player entered (e.g. "Printworks")
// instead of the generic interior location name (e.g. "Library Interior").
function currentRegionDisplayName() {
  if (isInteriorLocation() && state.lastDoorReturn?.label) return state.lastDoorReturn.label;
  return currentLocation().name;
}

function isInteriorLocation(locationId = state.currentLocation) {
  return Boolean(INTERIOR_LOCATIONS[locationId]);
}

function currentSigns() {
  return signs.filter((item) => !item.location || item.location === state.currentLocation);
}

function currentStudyStations(locationId = state.currentLocation) {
  return STUDY_STATIONS[locationId] || [];
}

function studyStationKey(locationId, stationId) {
  return `${locationId}:${stationId}`;
}

function buildingDoorByTarget(locationId) {
  return BUILDING_DOORS.find((door) => door.target === locationId) || null;
}

// === SECTION: INTERIOR THEMES BY PURPOSE (§G5) ===
// All four interior locations share one floor plan (studyInteriorMap); the visible
// room is themed by the building the player walked through. state.lastDoorReturn.label
// records that building (and is persisted in the save), so the same shared interior
// reads as a council chamber, newsroom, court, police station, library, campaign
// workshop or garden hub depending on the entrance. Study stations + exit are drawn
// on top of decor, so reachability/visibility never change.
const INTERIOR_DEFAULT_THEME = {
  townHallInterior: "council",
  libraryInterior: "library",
  courtInterior: "court",
  parkInterior: "garden"
};

function interiorThemeFromLabel(label) {
  const l = (label || "").toLowerCase();
  if (/(town hall|city hall|parliament|council|devolve|government|civic)/.test(l)) return "council";
  if (/police/.test(l)) return "police";
  if (/(court|rights aid|tribunal|justice|magistrate)/.test(l)) return "court";
  if (/(printworks|signal|press|media|broadcast|newsroom)/.test(l)) return "press";
  if (/(petition|union|party|election|planning|campaign|survey|rally|impact|hub|action)/.test(l)) return "campaign";
  if (/(library|archive|museum|sources|research|reading|records)/.test(l)) return "library";
  if (/(park|garden|volunteer|green|grove|allotment|community)/.test(l)) return "garden";
  return null;
}

function currentInteriorTheme() {
  const fromLabel = interiorThemeFromLabel(state.lastDoorReturn?.label);
  return fromLabel || INTERIOR_DEFAULT_THEME[state.currentLocation] || "council";
}

function currentBuildingDoors(locationId = state.currentLocation) {
  return BUILDING_DOORS.filter((door) => door.from === locationId);
}

function currentLayout() {
  return WORLD_LAYOUTS[state.currentLocation] || WORLD_LAYOUTS.village;
}

function currentMap() {
  return currentLayout().map || baseMap;
}

function safeSpawnFor(locationId = state.currentLocation) {
  const layout = WORLD_LAYOUTS[locationId] || WORLD_LAYOUTS.village;
  return layout.spawn || WORLD_LAYOUTS.village.spawn || { x: 210, y: 392 };
}

function getQuestLocationId(questId) {
  return Object.keys(WORLD).find((id) => WORLD[id].questIds.includes(questId));
}

function setLocation(locationId, options = {}) {
  const location = WORLD[locationId];
  if (!location) return;
  const previousLocation = state.currentLocation;
  state.currentLocation = locationId;
  // §G9: brief screen fade when actually moving between locations (skipped on first
  // load, when staying put, and under Reduced Motion). Cleared footstep dust too.
  if (gameStarted && previousLocation && previousLocation !== locationId && !settings.reducedMotion) {
    regionTransitionMs = REGION_TRANSITION_MS;
  }
  footstepDust.length = 0;
  npcs.length = 0;
  location.npcs.forEach((npc) => npcs.push({ ...npc }));
  npcs.forEach((npc) => {
    npc.questIds = location.questIds.filter((id) => QUESTS[id].giver === npc.id);
  });
  spawnAmbientWalkers();
  activeNpc = null;
  activeQuestion = null;
  pendingQuestTurnIn = null;
  hidePanel();
  hideDialogue();
  if (!options.preservePlayer) {
    const spawn = safeSpawnFor(locationId);
    state.player.x = spawn.x;
    state.player.y = spawn.y;
  }
  if (!options.preserveText) {
    state.quest = locationOrder.includes(locationId) ? `${location.name}: complete all regional quests.` : `${location.name}: revise the study stations inside.`;
    state.journal = `Arrived at ${location.name}.`;
  }
  if (!isInteriorLocation(locationId)) state.lastDoorReturn = null;
  if (devLocationSelect && locationOrder.includes(locationId)) devLocationSelect.value = locationId;
  updateHud();
  if (!options.skipSave) saveGame();
}

setLocation("village");

function setupDevTravel() {
  if (!devLocationSelect || !devTravelButton) return;
  devLocationSelect.innerHTML = locationOrder
    .map((id) => `<option value="${id}">${WORLD[id].name}</option>`)
    .join("");
  devLocationSelect.value = state.currentLocation;
  devTravelButton.addEventListener("click", () => {
    const target = devLocationSelect.value;
    state.unlockedLocations.add(target);
    state.activeQuest = null;
    state.pendingGate = null;
    setLocation(target);
    showStoryForLocation(target);
    state.journal = `Dev travel: switched to ${WORLD[target].name}.`;
    updateHud();
    saveGame();
  });
}

const signs = [
  {
    location: "village",
    x: 510,
    y: 336,
    title: "Noticeboard",
    body: "Revision tip: long answers often need explained points, evidence, and a balanced judgement."
  },
  {
    location: "village",
    x: 232,
    y: 104,
    title: "River Charter",
    body: "Key concept: justice is about fairness, rights, responsibility, and access to the law."
  },
  {
    location: "modernBritain",
    x: 452,
    y: 296,
    title: "Media Plaza",
    body: "Route note: use the central plaza to reach the press kiosk, museum, and community voices."
  },
  {
    location: "modernBritain",
    x: 248,
    y: 220,
    title: "Source Kiosk",
    body: "Source Detective starts with Editor Vale. Check origin, purpose, evidence, and accuracy before sharing."
  },
  {
    location: "modernBritain",
    x: 776,
    y: 360,
    title: "Underground Gate",
    body: "Complete the borough topics, then use any NPC travel gate to move toward Rights & Law Quarter."
  },
  {
    location: "rightsLaw",
    x: 428,
    y: 244,
    title: "Court Square",
    body: "Route note: the court square links the Rights Aid desk, legal archive, court, and police safeguards."
  },
  {
    location: "rightsLaw",
    x: 126,
    y: 196,
    title: "Rights Cards",
    body: "Rights vs Responsibilities starts with Advocate Farah. Match freedoms with fairness and responsibility."
  },
  {
    location: "rightsLaw",
    x: 748,
    y: 394,
    title: "Clock Lift Gate",
    body: "Complete the law quarter topics, then use any NPC travel gate to move toward Democracy Capital."
  },
  {
    location: "democracy",
    x: 430,
    y: 326,
    title: "Ballot Hall",
    body: "Route note: the ballot hall links Parliament, parties, election counting, and devolution topics."
  },
  {
    location: "democracy",
    x: 410,
    y: 392,
    title: "Count Table",
    body: "Ballot Count starts with Returning Officer June. Count votes carefully and keep the result transparent."
  },
  {
    location: "democracy",
    x: 696,
    y: 248,
    title: "Debate Steps",
    body: "Debate Arena starts with Campaign Manager Sol. Use evidence, rebuttal, empathy, and judgement."
  },
  {
    location: "democracy",
    x: 788,
    y: 386,
    title: "Ferry Gate",
    body: "Complete the capital topics, then use any NPC travel gate to move toward Participation Harbour."
  },
  {
    location: "participation",
    x: 252,
    y: 250,
    title: "Petition Pier",
    body: "Route note: the pier links Priya, petition strategy, volunteer action, and the harbour travel route."
  },
  {
    location: "participation",
    x: 218,
    y: 304,
    title: "Regatta Stand",
    body: "Petition Regatta starts with Priya. Gather signatures, avoid misinformation, and follow up clearly."
  },
  {
    location: "participation",
    x: 632,
    y: 250,
    title: "Volunteer Dock",
    body: "Volunteering and charities turn concern into practical support for communities."
  },
  {
    location: "participation",
    x: 744,
    y: 384,
    title: "Campaign Boat Gate",
    body: "Complete the harbour topics, then use any NPC travel gate to move toward Action Workshop."
  },
  {
    location: "actionWorkshop",
    x: 224,
    y: 254,
    title: "Plan Board",
    body: "Route note: the plan board links research, survey evidence, action methods, and campaign evaluation."
  },
  {
    location: "actionWorkshop",
    x: 170,
    y: 196,
    title: "Campaign Planner",
    body: "Campaign Planner starts with Councillor Noor. Put research, plan, action, and evaluation in order."
  },
  {
    location: "actionWorkshop",
    x: 608,
    y: 258,
    title: "Data Bench",
    body: "Use survey evidence and data carefully before choosing a campaign action."
  },
  {
    location: "actionWorkshop",
    x: 756,
    y: 386,
    title: "Lighthouse Bridge",
    body: "Complete the workshop topics, then use any NPC travel gate to move toward Exam Hall Castle."
  },
  {
    location: "examHall",
    x: 442,
    y: 230,
    title: "Final Gate",
    body: "Route note: the final gate links command words, source work, debate practice, and the ending challenge."
  },
  {
    location: "examHall",
    x: 286,
    y: 242,
    title: "Exam Desk",
    body: "Exam Simulation starts with Examiner Mira. Use command words to plan each answer before choosing."
  },
  {
    location: "examHall",
    x: 646,
    y: 244,
    title: "Source Archive",
    body: "Source work asks about origin, purpose, content, accuracy, and relevance."
  },
  {
    location: "examHall",
    x: 430,
    y: 402,
    title: "Debate Bench",
    body: "Debate Arena practice with Coach Leon helps evaluation answers balance evidence and judgement."
  }
];

const props = [
  { location: "village", type: "lamp", x: 232, y: 100 },
  { location: "village", type: "lamp", x: 760, y: 232 },
  { location: "village", type: "flowers", x: 666, y: 96 },
  { location: "village", type: "flowers", x: 790, y: 96 },
  { location: "modernBritain", type: "kiosk", x: 230, y: 226, miniGameId: "sourceDetective" },
  { location: "modernBritain", type: "bench", x: 438, y: 308 },
  { location: "modernBritain", type: "lamp", x: 316, y: 342 },
  { location: "modernBritain", type: "crate", x: 602, y: 270 },
  { location: "rightsLaw", type: "scales", x: 470, y: 246 },
  { location: "rightsLaw", type: "notice", x: 244, y: 252, miniGameId: "rightsMatch" },
  { location: "rightsLaw", type: "bench", x: 430, y: 342 },
  { location: "rightsLaw", type: "lamp", x: 824, y: 394 },
  { location: "democracy", type: "ballotBox", x: 420, y: 384, miniGameId: "ballotCount" },
  { location: "democracy", type: "podium", x: 690, y: 246, miniGameId: "debateArena" },
  { location: "democracy", type: "poster", x: 596, y: 304 },
  { location: "democracy", type: "bench", x: 456, y: 338 },
  { location: "participation", type: "petitionStand", x: 238, y: 272, miniGameId: "petitionRegatta" },
  { location: "participation", type: "boat", x: 744, y: 286 },
  { location: "participation", type: "banner", x: 620, y: 338 },
  { location: "participation", type: "crate", x: 520, y: 258 },
  { location: "actionWorkshop", type: "planningBoard", x: 202, y: 270, miniGameId: "campaignPlanner" },
  { location: "actionWorkshop", type: "surveyBox", x: 594, y: 272 },
  { location: "actionWorkshop", type: "dataCards", x: 650, y: 278 },
  { location: "actionWorkshop", type: "campaignTable", x: 734, y: 340 },
  { location: "examHall", type: "finalGate", x: 440, y: 206 },
  { location: "examHall", type: "examDesk", x: 268, y: 252, miniGameId: "examSimulation" },
  { location: "examHall", type: "sourceArchive", x: 520, y: 408 },
  { location: "examHall", type: "debateBench", x: 420, y: 408, miniGameId: "debateArena" }
];

function addKnowledge(amount) {
  state.knowledge = Math.min(100, state.knowledge + amount);
  state.stats.knowledge = clamp((state.stats?.knowledge || 0) + amount, 0, 100);
  updateHud();
  saveGame();
}

function addCoins(amount) {
  state.coins += amount;
  updateHud();
  saveGame();
}

function addItem(id) {
  if (ITEMS[id]) {
    const item = ITEMS[id];
    if (["outfit", "tool", "quest", "treasure"].includes(item.type) && state.inventory.includes(id)) {
      updateHud();
      saveGame();
      return false;
    }
    state.inventory.push(id);
    updateHud();
    saveGame();
    return true;
  }
  updateHud();
  saveGame();
  return false;
}

function ensureEquipmentOwned() {
  [state.equipped.outfit, state.equipped.tool].forEach((id) => {
    if (id && ITEMS[id] && !state.inventory.includes(id)) {
      state.inventory.push(id);
    }
  });
  defaultStarterInventory().forEach((id) => {
    if (ITEMS[id] && !state.inventory.includes(id)) {
      state.inventory.push(id);
    }
  });
}

function removeItem(id) {
  const index = state.inventory.indexOf(id);
  if (index >= 0) {
    state.inventory.splice(index, 1);
  }
}

function addBadge(badge) {
  if (!state.badges.includes(badge)) {
    state.badges.push(badge);
  }
  updateHud();
  saveGame();
}

function unlockAchievement(id, condition) {
  if (condition && ACHIEVEMENTS.some((achievement) => achievement.id === id)) {
    state.achievements.add(id);
  }
}

function syncAchievements() {
  unlockAchievement("packedBag", defaultStarterInventory().every((id) => state.inventory.includes(id)));
  unlockAchievement("firstStep", state.completedQuests.size >= 1);
  unlockAchievement("questTrio", state.completedQuests.size >= 3);
  unlockAchievement("regionalRegular", state.unlockedLocations.size >= 3);
  unlockAchievement("buildingReader", state.completedStudyStations.size >= 1);
  unlockAchievement("studyScholar", state.completedStudyStations.size >= 10);
  unlockAchievement("practicePlanner", state.examPracticeCompleted.size >= 1);
  unlockAchievement("badgeCollector", state.badges.length >= 1);
  unlockAchievement("toolBearer", Boolean(state.equipped.tool));
  unlockAchievement("wellPrepared", state.knowledge >= 25);
  unlockAchievement("civicSaver", state.coins >= 50);
  unlockAchievement("fullPractice", state.examPracticeCompleted.size >= EXAM_PRACTICE_ROOMS.length);
  unlockAchievement("sourceDetective", miniGameHasMedal("sourceDetective"));
  unlockAchievement("rightsMatcher", miniGameHasMedal("rightsMatch"));
  unlockAchievement("petitionPilot", miniGameHasMedal("petitionRegatta"));
  unlockAchievement("ballotCounter", miniGameHasMedal("ballotCount"));
  unlockAchievement("debateChampion", miniGameHasMedal("debateArena"));
  unlockAchievement("campaignPlanner", miniGameHasMedal("campaignPlanner"));
  unlockAchievement("examSimulator", miniGameHasMedal("examSimulation"));
}

function miniGameHasMedal(id) {
  const game = MINI_GAMES[id];
  const score = state.miniGameScores[id]?.score;
  return Boolean(game && Number.isFinite(score) && miniGameMedal(score, game.rounds.length) !== "practice");
}

function updateHud() {
  syncAchievements();
  regionText.textContent = currentRegionDisplayName();
  coinText.textContent = state.coins;
  knowledgeText.textContent = `${state.knowledge}/100`;
  knowledgeBar.style.width = `${state.knowledge}%`;
  questText.textContent = state.quest;
  journalText.textContent = state.journal;
  outfitText.textContent = ITEMS[state.equipped.outfit]?.name || "None";
  toolText.textContent = ITEMS[state.equipped.tool]?.name || "None";
  badgeList.innerHTML = state.badges.length
    ? state.badges.map((badge) => `<li>${badge}</li>`).join("")
    : "<li>None yet</li>";
  inventoryList.innerHTML = renderInventory();
  renderInventoryPanel();
  if (reviewList) reviewList.innerHTML = renderReviewList();
  renderProgressPanel();
  renderCharacterPanel();
  const nameSlot = document.getElementById("playerNameText");
  if (nameSlot) nameSlot.textContent = state.profile?.name || "Citizen";
  const portraitSlot = document.getElementById("playerPortrait");
  if (portraitSlot) portraitSlot.innerHTML = heroPortraitHtml("is-hud");
  const levelSlot = document.getElementById("playerLevelText");
  if (levelSlot) levelSlot.textContent = `Lvl ${state.stats?.level ?? 1}${state.stats?.statPoints ? ` · ${state.stats.statPoints} pts` : ""}`;
  characterOpenButton?.classList.toggle("has-points", Boolean(state.stats?.statPoints));
  if (characterOpenButton) characterOpenButton.title = state.stats?.statPoints ? "You have unspent stat points." : "Open Character";
  if (focusText) focusText.textContent = `${Math.round(state.stats.focus)}/100`;
  if (focusBar) focusBar.style.width = `${clamp(state.stats.focus, 0, 100)}%`;
  const nextXp = xpForNextLevel();
  if (xpText) xpText.textContent = state.stats.level >= MAX_LEVEL ? "MAX" : `${state.stats.xp}/${nextXp}`;
  if (xpBar) xpBar.style.width = state.stats.level >= MAX_LEVEL ? "100%" : `${nextXp ? clamp((state.stats.xp / nextXp) * 100, 0, 100) : 0}%`;
  const readiness = examChance();
  if (examReadinessText) examReadinessText.textContent = `${readiness}%`;
  if (examReadinessBar) examReadinessBar.style.width = `${readiness}%`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[character]));
}

function shuffledAnswerIndexes(length) {
  const order = Array.from({ length }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

function renderShuffledAnswers(answers, attributeName, options = {}) {
  const order = options.order || shuffledAnswerIndexes(answers.length);
  const extraAttributes = options.extraAttributes || "";
  return order.map((originalIndex, displayIndex) => (
    `<button type="button" data-${attributeName}="${originalIndex}"${extraAttributes}>${displayIndex + 1}. ${escapeHtml(answers[originalIndex])}</button>`
  )).join("");
}

function markAnswerThen(button, isCorrect, correctSelector, callback) {
  if (!button) {
    callback();
    return;
  }
  const panel = button.closest(".choice-panel, .minigame-layout") || button.parentElement;
  panel?.querySelectorAll("button").forEach((item) => { item.disabled = true; });
  if (correctSelector && panel) {
    panel.querySelectorAll(correctSelector).forEach((item) => item.classList.add("answer-correct"));
  }
  button.classList.add(isCorrect ? "answer-correct" : "answer-wrong");
  window.setTimeout(callback, isCorrect ? 420 : 760);
}

function clickVisibleAnswerButton(position) {
  if (miniGamePanel && !miniGamePanel.classList.contains("hidden") && activeMiniGame) {
    const miniButtons = [...miniGamePanel.querySelectorAll("button[data-minigame-choice]")].filter((button) => !button.disabled);
    miniButtons[position]?.click();
    return;
  }
  const selector = state.pendingGate
    ? "button[data-gate-answer]"
    : pendingQuestTurnIn
      ? "button[data-quest-answer]"
      : "button[data-answer]";
  const buttons = [...choicePanel.querySelectorAll(selector)].filter((button) => !button.disabled);
  buttons[position]?.click();
}

function reviewEntries() {
  return locationOrder.flatMap((locationId) => {
    const location = WORLD[locationId];
    return location.questIds
      .filter((questId) => state.completedQuests.has(questId))
      .map((questId) => {
        const quest = QUESTS[questId];
        return {
          id: questId,
          kind: "quest",
          title: quest.title,
          region: location.shortName || location.name,
          question: quest.curriculum?.asks || quest.question,
          answer: quest.curriculum?.correctAnswer || quest.clue
        };
      });
  });
}

function studyJournalEntries() {
  return Object.keys(INTERIOR_LOCATIONS).map((locationId) => {
    const location = WORLD[locationId];
    const stations = currentStudyStations(locationId);
    const completedStations = stations.filter((station) => state.completedStudyStations.has(studyStationKey(locationId, station.id)));
    const remainingStations = stations.filter((station) => !state.completedStudyStations.has(studyStationKey(locationId, station.id)));
    return {
      id: `study:${locationId}`,
      kind: "study",
      locationId,
      title: `${location.shortName} Progress`,
      region: "Building Journal",
      question: `${completedStations.length}/${stations.length} stations complete`,
      answer: completedStations.length
        ? completedStations.map((station) => `${station.label}: ${station.journal}`).join(" ")
        : `No ${location.shortName.toLowerCase()} stations logged yet.`,
      completedStations,
      remainingStations,
      total: stations.length,
      done: completedStations.length
    };
  });
}

function journalEntries() {
  return [...studyJournalEntries(), ...reviewEntries()];
}

function renderReviewList() {
  const studyEntries = studyJournalEntries()
    .filter((entry) => entry.done > 0 || entry.locationId === state.currentLocation)
    .sort((left, right) => {
      if (left.locationId === state.currentLocation) return -1;
      if (right.locationId === state.currentLocation) return 1;
      return right.done - left.done;
    });
  const topicEntries = reviewEntries().slice(-2).reverse();
  const entries = [...studyEntries, ...topicEntries].slice(0, 3);
  if (!entries.length) {
    return "<p class=\"empty\">Complete quests or building stations to unlock revision notes.</p>";
  }
  return entries.map((entry) => `
    <button type="button" data-review-entry="${entry.id}">
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.region)}${entry.kind === "study" ? ` - ${entry.done}/${entry.total}` : ""}</small>
    </button>
  `).join("");
}

function renderStudyJournalDetail(entry) {
  const completed = entry.completedStations.length
    ? entry.completedStations.map((station) => `<li><strong>${escapeHtml(station.label)}</strong>: ${escapeHtml(station.journal)}</li>`).join("")
    : `<li>No stations completed yet.</li>`;
  const remaining = entry.remainingStations.length
    ? `<small>Still To Do</small><p>${escapeHtml(entry.remainingStations.map((station) => station.label).join(", "))}</p>`
    : `<small>Status</small><p>All stations complete in this building.</p>`;
  return `
    <div class="review-detail">
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.region)} - ${entry.done}/${entry.total} complete</small>
      <p>${escapeHtml(entry.question)}</p>
      <small>Completed Notes</small>
      <ul class="exam-practice-plan">${completed}</ul>
      ${remaining}
    </div>
  `;
}

function renderQuestJournalDetail(entry) {
  return `
    <div class="review-detail">
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.region)}</small>
      <p>${escapeHtml(entry.question)}</p>
      <p>${escapeHtml(entry.answer)}</p>
    </div>
  `;
}

function showReviewJournal(selectedEntryId = null) {
  const entries = journalEntries();
  if (!entries.length) {
    showPanel("<button type=\"button\" disabled>Complete quests or building stations to unlock revision notes.</button><button type=\"button\" data-menu=\"close\">Close</button>", "Revision Journal", "book");
    return;
  }
  const selected = entries.find((entry) => entry.id === selectedEntryId)
    || entries.find((entry) => entry.kind === "study" && entry.locationId === state.currentLocation)
    || entries.at(-1);
  const buttons = entries.map((entry) => `
    <button type="button" data-review-entry="${entry.id}">
      ${entry.id === selected.id ? "[Selected] " : ""}${escapeHtml(entry.region)}: ${escapeHtml(entry.title)}${entry.kind === "study" ? ` (${entry.done}/${entry.total})` : ""}
    </button>
  `).join("");
  const html = `
    ${selected.kind === "study" ? renderStudyJournalDetail(selected) : renderQuestJournalDetail(selected)}
    <div class="review-menu">${buttons}</div>
    <button type="button" data-menu="close">Close</button>
  `;
  showPanel(html, "Revision Journal", "book");
}

function renderInventory() {
  const bagIds = backpackItemCounts();
  const ids = Object.keys(bagIds).slice(0, 4);
  if (!ids.length) return "<p class=\"empty\">Your backpack is empty.</p>";
  const rows = ids.map((id) => renderItemRow(id, bagIds[id], { compact: true })).join("");
  const more = Object.keys(bagIds).length > ids.length ? `<p class="empty">+${Object.keys(bagIds).length - ids.length} more in Backpack</p>` : "";
  return `${rows}${more}`;
}

function backpackItemCounts() {
  return state.inventory.reduce((summary, id) => {
    if (!ITEMS[id] || isEquippedItem(id)) return summary;
    summary[id] = (summary[id] || 0) + 1;
    return summary;
  }, {});
}

function isEquippedItem(id) {
  return state.equipped.outfit === id || state.equipped.tool === id;
}

function itemThumb(id) {
  const item = ITEMS[id];
  if (!item) return "";
  const asset = ITEM_ASSETS[id];
  const color = item.color || item.thumbnailColor || {
    outfit: "#466d9f",
    tool: "#d7dde0",
    consumable: "#8fcf9b",
    treasure: "#67d6c7",
    quest: "#f2c14e"
  }[item.type] || "#d3a74d";
  return `
    <span class="item-icon item-thumb item-thumb-${item.type} item-art item-art-${id}${asset ? " has-asset" : ""}" style="--item-color:${color}" aria-label="${escapeHtml(item.name)} image" role="img">
      ${asset ? `<img class="item-asset" src="${asset}" alt="" aria-hidden="true" onerror="this.style.display='none';this.parentElement.classList.remove('has-asset')">` : ""}
      <span class="art art-main"></span>
      <span class="art art-a"></span>
      <span class="art art-b"></span>
      <span class="art art-c"></span>
      <span class="item-code">${escapeHtml(item.icon)}</span>
    </span>
  `;
}

function renderItemActions(id, item, options = {}) {
  const actions = [];
  if (item.type === "outfit") {
    actions.push(`<button type="button" data-action="equip" data-item="${id}">Wear</button>`);
  }
  if (item.type === "tool") {
    actions.push(`<button type="button" data-action="equip" data-item="${id}">Hold</button>`);
  }
  if (item.type === "consumable" || item.effect?.openProgress || item.effect?.storyHint) {
    actions.push(`<button type="button" data-action="use" data-item="${id}">Use</button>`);
  }
  if (!options.compact && item.value > 0 && item.type !== "quest" && !isEquippedItem(id)) {
    actions.push(`<button type="button" data-action="sell" data-item="${id}">Sell ${item.value}c</button>`);
  }
  return actions.join("");
}

function itemTypeLabel(type) {
  return {
    quest: "Quest item",
    consumable: "Consumable",
    outfit: "Outfit",
    tool: "Tool",
    treasure: "Collectible"
  }[type] || "Item";
}

function itemEffectSummary(id, item) {
  const effects = [];
  if (item.effect?.focus) effects.push(`Restores ${item.effect.focus} Focus`);
  if (item.effect?.knowledge) effects.push(`Adds ${item.effect.knowledge} Knowledge`);
  if (item.effect?.openProgress) effects.push("Opens Progress notes");
  if (item.effect?.storyHint) effects.push("Shows a story hint");
  if (item.effect?.miniGameBonus) effects.push(`Assists ${MINI_GAMES[item.effect.miniGameBonus]?.title || item.effect.miniGameBonus}`);
  if (item.effect?.examSections?.length) effects.push(`Assists ${item.effect.examSections.join("/")} exam sections`);
  if (item.type === "quest") effects.push("Locked story item");
  if (item.type === "outfit") effects.push("Can be worn as an outfit");
  if (item.type === "tool") effects.push("Can be held as a tool");
  if (item.type === "treasure") effects.push("Collectible reward");
  return effects.length ? effects : ["No active effect yet"];
}

function renderItemMeta(id, item, count = 1) {
  const locked = item.type === "quest";
  const equipped = isEquippedItem(id);
  return `
    <div class="item-meta-row">
      <span class="item-type-pill item-type-${item.type}">${itemTypeLabel(item.type)}</span>
      ${count > 1 ? `<span class="item-count-pill">Stack x${count}</span>` : ""}
      ${equipped ? `<span class="item-equipped-pill">Equipped</span>` : ""}
      ${locked ? `<span class="item-lock" title="This quest item cannot be sold">Locked</span>` : ""}
    </div>
  `;
}

function renderItemRow(id, count, options = {}) {
  const item = ITEMS[id];
  if (!item) return "";
  const countText = count > 1 ? ` x${count}` : "";
  const selectable = !options.compact;
  const selected = options.selected ? " is-selected" : "";
  return `
    <div class="item-row item-row-${item.type}${options.compact ? " item-row-compact" : ""}${selected}"${selectable ? ` data-item-select="${id}" role="button" tabindex="0"` : ""}>
      ${itemThumb(id)}
      <div>
        <strong>${escapeHtml(item.name)}${countText}</strong>
        ${!options.compact ? renderItemMeta(id, item, count) : ""}
        <small>${escapeHtml(item.description)}</small>
        <div class="item-actions">${renderItemActions(id, item, options)}</div>
      </div>
    </div>
  `;
}

function renderItemDetail(id, count = 1) {
  const item = ITEMS[id];
  if (!item) {
    return `
      <section class="item-detail-panel empty-detail" aria-label="Selected item details">
        <strong>No item selected</strong>
        <small>Select an item in the backpack to inspect it.</small>
      </section>
    `;
  }
  const effects = itemEffectSummary(id, item).map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  return `
    <section class="item-detail-panel item-detail-${item.type}" aria-label="Selected item details">
      <div class="item-detail-top">
        <div class="item-detail-thumb">${itemThumb(id)}</div>
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          ${renderItemMeta(id, item, count)}
        </div>
      </div>
      <p>${escapeHtml(item.description)}</p>
      <small>Effects</small>
      <ul class="item-effect-list">${effects}</ul>
      <div class="item-actions item-detail-actions">${renderItemActions(id, item)}</div>
    </section>
  `;
}

function renderEquippedSlot(slot, id) {
  const item = id ? ITEMS[id] : null;
  const slotLabel = slot === "outfit" ? "Outfit" : "Hand";
  if (!item) {
    return `
      <div class="equipment-slot">
        <span class="item-icon item-thumb item-thumb-empty">--</span>
        <div><strong>${slotLabel}</strong><small>Nothing equipped.</small></div>
      </div>
    `;
  }
  const unequip = slot === "tool"
    ? `<button type="button" data-action="unequip" data-slot="${slot}">Put away</button>`
    : "";
  return `
    <div class="equipment-slot">
      ${itemThumb(id)}
      <div>
        <strong>${slotLabel}: ${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.description)}</small>
        <div class="item-actions">${unequip}</div>
      </div>
    </div>
  `;
}

function renderInventoryPanel() {
  if (!inventoryPanelBody) return;
  const bagIds = backpackItemCounts();
  const ids = Object.keys(bagIds);
  if (!selectedInventoryItemId || !bagIds[selectedInventoryItemId]) selectedInventoryItemId = ids[0] || null;
  const bagContent = ids.length
    ? ids.map((id) => renderItemRow(id, bagIds[id], { selected: id === selectedInventoryItemId })).join("")
    : `<p class="empty">Your backpack is empty. Equipped outfit and hand items are shown above.</p>`;
  inventoryPanelBody.innerHTML = `
    <section class="backpack-panel inventory-list-column" aria-label="Backpack items">
      <h3>Equipped</h3>
      ${renderEquippedSlot("outfit", state.equipped.outfit)}
      ${renderEquippedSlot("tool", state.equipped.tool)}
      <h3>Backpack items</h3>
      <div class="inventory-list inventory-list-panel">${bagContent}</div>
    </section>
    ${renderItemDetail(selectedInventoryItemId, selectedInventoryItemId ? bagIds[selectedInventoryItemId] : 0)}
  `;
}

function progressTabButton(id, label) {
  return `<button type="button" class="progress-tab${currentProgressTab === id ? " is-selected" : ""}" data-progress-tab="${id}">${label}</button>`;
}

function questRegionName(questId) {
  const locationId = getQuestLocationId(questId);
  return locationId && WORLD[locationId] ? (WORLD[locationId].shortName || WORLD[locationId].name) : "Valley";
}

function storyProgressSummary() {
  const totalQuests = Object.keys(QUESTS).length || 1;
  const completedQuests = state.completedQuests.size;
  const completedPercent = Math.round((completedQuests / totalQuests) * 100);
  const exploredRegions = [...state.unlockedLocations].filter((id) => locationOrder.includes(id)).length;
  const current = currentLocation();
  const act = storyActTitle();
  return { totalQuests, completedQuests, completedPercent, exploredRegions, current, act };
}

function renderProgressStory() {
  const summary = storyProgressSummary();
  const flagRows = Object.entries(STORY_FLAGS).map(([key, flag]) => `
    <li><span class="status-${state.storyFlags?.[key] ? "done" : "open"}">${state.storyFlags?.[key] ? "Done" : "Open"}</span> ${escapeHtml(flag.label)} - ${escapeHtml(flag.description)}</li>
  `).join("");
  return `
    <section class="progress-section">
      <h3>${escapeHtml(summary.act)}</h3>
      <div class="progress-stat-grid">
        <div><strong>${summary.completedQuests}/${summary.totalQuests}</strong><small>Quests complete</small></div>
        <div><strong>${summary.exploredRegions}/${locationOrder.length}</strong><small>Regions reached</small></div>
        <div><strong>${state.achievements.size}/${ACHIEVEMENTS.length}</strong><small>Achievements</small></div>
      </div>
      <div class="progress-bar"><span style="width:${Math.min(100, summary.completedPercent)}%"></span></div>
      <p>${escapeHtml(state.journal)}</p>
      <p><strong>Current objective:</strong> ${escapeHtml(state.quest)}</p>
      <p><strong>Current region:</strong> ${escapeHtml(summary.current.name)}</p>
      <p><strong>Apathy Shade:</strong> ${escapeHtml(shadeReactionText())}</p>
      <div class="progress-card"><strong>Choices against Apathy (${storyFlagCount()}/${Object.keys(STORY_FLAGS).length})</strong><ul class="progress-list">${flagRows}</ul></div>
      <p><strong>Story scenes:</strong> ${state.storySeen.size}/${Object.keys(STORY_BEATS).length + Object.keys(STORY_ENDINGS).length} seen${state.storyEnding ? ` - Ending: ${escapeHtml(STORY_ENDINGS[state.storyEnding]?.title || state.storyEnding)}` : ""}</p>
    </section>
  `;
}

function renderProgressQuests() {
  const active = state.activeQuest ? QUESTS[state.activeQuest.id] : null;
  const activeHtml = active
    ? `<div class="progress-card is-active"><strong>Active: ${escapeHtml(active.title)}</strong><small>${escapeHtml(questRegionName(state.activeQuest.id))} - ${escapeHtml(state.activeQuest.stage)}</small><p>${escapeHtml(active.brief)}</p></div>`
    : `<div class="progress-card"><strong>No active quest</strong><small>Talk to NPCs to accept one.</small></div>`;
  const regions = locationOrder.map((locationId) => {
    const location = WORLD[locationId];
    const quests = location.questIds || [];
    if (!quests.length) return "";
    const done = quests.filter((id) => state.completedQuests.has(id)).length;
    const rows = quests.map((id) => {
      const quest = QUESTS[id];
      const status = state.completedQuests.has(id) ? "Done" : state.activeQuest?.id === id ? "Active" : "Open";
      return `<li><span class="status-${status.toLowerCase()}">${status}</span> ${escapeHtml(quest.title)}</li>`;
    }).join("");
    return `<div class="progress-card"><strong>${escapeHtml(location.shortName || location.name)} (${done}/${quests.length})</strong><ul class="progress-list">${rows}</ul></div>`;
  }).join("");
  return `<section class="progress-section">${activeHtml}<div class="progress-card-grid">${regions}</div></section>`;
}

function renderProgressBuildings() {
  const entries = studyJournalEntries();
  const cards = entries.map((entry) => {
    const completeList = entry.completedStations.length
      ? entry.completedStations.map((station) => `<li>${escapeHtml(station.label)}</li>`).join("")
      : `<li>No notes yet</li>`;
    const remaining = entry.remainingStations.length
      ? entry.remainingStations.map((station) => station.label).join(", ")
      : "All stations complete";
    const percent = entry.total ? Math.round((entry.done / entry.total) * 100) : 0;
    return `
      <div class="progress-card">
        <strong>${escapeHtml(entry.title)}</strong>
        <small>${entry.done}/${entry.total} complete</small>
        <div class="progress-bar mini"><span style="width:${percent}%"></span></div>
        <ul class="progress-list">${completeList}</ul>
        <small>Next: ${escapeHtml(remaining)}</small>
      </div>
    `;
  }).join("");
  return `<section class="progress-section"><div class="progress-card-grid">${cards}</div></section>`;
}

function renderProgressAchievements() {
  const cards = ACHIEVEMENTS.map((achievement) => {
    const unlocked = state.achievements.has(achievement.id);
    return `
      <div class="achievement-card${unlocked ? " is-unlocked" : ""}">
        <span class="achievement-icon">${unlocked ? "✓" : "?"}</span>
        <div><strong>${escapeHtml(achievement.name)}</strong><small>${escapeHtml(achievement.description)}</small></div>
      </div>
    `;
  }).join("");
  return `<section class="progress-section"><div class="achievement-grid">${cards}</div></section>`;
}

function miniGameMedal(score, total) {
  if (score >= total) return "gold";
  if (score >= Math.ceil(total * .75)) return "silver";
  if (score >= Math.ceil(total * .5)) return "bronze";
  return "practice";
}

function miniGameHosts(id) {
  return locationOrder.flatMap((locationId) => {
    const location = WORLD[locationId];
    return (location?.npcs || [])
      .filter((npc) => npc.miniGameId === id)
      .map((npc) => ({ npc, location }));
  });
}

function miniGameHostText(id) {
  const hosts = miniGameHosts(id);
  if (!hosts.length) return "Host: Progress menu";
  return hosts
    .map(({ npc, location }) => `${npc.name} in ${location.name}`)
    .join("; ");
}

function triggerPropLabel(type) {
  const labels = {
    ballotBox: "ballot box",
    debateBench: "debate bench",
    examDesk: "exam desk",
    kiosk: "source kiosk",
    notice: "rights notice board",
    petitionStand: "petition stand",
    planningBoard: "planning board",
    podium: "debate podium"
  };
  return labels[type] || type;
}

function miniGameTriggerProps(id) {
  return locationOrder.flatMap((locationId) => {
    const location = WORLD[locationId];
    return props
      .filter((prop) => prop.location === locationId && prop.miniGameId === id)
      .map((prop) => ({ prop, location }));
  });
}

function miniGameTriggerText(id) {
  const triggers = miniGameTriggerProps(id);
  if (!triggers.length) return "Trigger: host marker only";
  return triggers
    .map(({ prop, location }) => `${triggerPropLabel(prop.type)} in ${location.name}`)
    .join("; ");
}

function miniGameNpcConclusion(id) {
  const host = miniGameHosts(id)[0]?.npc;
  const conclusion = host ? MINI_GAME_NPC_LINKS[host.id]?.conclusion : "Keep practising this skill and link it to GCSE command words.";
  return host && conclusion ? `${host.name}: ${conclusion}` : conclusion;
}

function renderProgressMiniGames() {
  const cards = Object.entries(MINI_GAMES).map(([id, game]) => {
    const score = state.miniGameScores[id]?.score ?? null;
    const medal = score === null ? "not started" : miniGameMedal(score, game.rounds.length);
    const hostText = miniGameHostText(id);
    const triggerText = miniGameTriggerText(id);
    const markerStatus = miniGameMapStatus(id);
    return `
      <div class="progress-card minigame-card">
        <strong>${escapeHtml(game.title)}</strong>
        <small>${escapeHtml(game.region)} - ${score === null ? "not played" : `${score}/${game.rounds.length} (${medal})`}</small>
        <small>${escapeHtml(hostText)}</small>
        <small>Trigger: ${escapeHtml(triggerText)}</small>
        <small>Map marker: ${escapeHtml(markerStatus.label)}</small>
        <p>${escapeHtml(game.summary)}</p>
        <button type="button" data-minigame-start="${id}">${score === null ? "Start" : "Replay"}</button>
      </div>
    `;
  }).join("");
  return `<section class="progress-section"><div class="progress-card-grid">${cards}</div></section>`;
}

function curriculumEntries() {
  const index = window.GCSE_CURRICULUM_INDEX || {};
  return Object.entries(index).map(([id, topic]) => ({ id, ...topic }));
}

function curriculumAreaSummary(area) {
  const topics = curriculumEntries().filter((topic) => topic.area === area);
  const topicDone = topics.filter((topic) => state.completedQuests.has(topic.id)).length;
  const miniGameRefs = [...new Set(topics.flatMap((topic) => topic.miniGameRefs || []))];
  const miniDone = miniGameRefs.filter((id) => Number.isFinite(state.miniGameScores[id]?.score)).length;
  const studyLocations = Object.entries(STUDY_AREA_MAP).filter(([, mappedArea]) => mappedArea === area).map(([locationId]) => locationId);
  const studyTotal = studyLocations.reduce((sum, locationId) => sum + currentStudyStations(locationId).length, 0);
  const studyDone = studyLocations.reduce((sum, locationId) => (
    sum + currentStudyStations(locationId).filter((station) => state.completedStudyStations.has(studyStationKey(locationId, station.id))).length
  ), 0);
  const total = topics.length + miniGameRefs.length + studyTotal;
  const done = topicDone + miniDone + studyDone;
  return { area, topics, topicDone, miniGameRefs, miniDone, studyTotal, studyDone, total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

function curriculumAreasForMiniGame(id) {
  return CURRICULUM_AREAS.filter((area) => curriculumAreaSummary(area).miniGameRefs.includes(id));
}

function miniGameCurriculumNote(id) {
  const areas = curriculumAreasForMiniGame(id);
  return areas.length ? ` Curriculum improved: ${areas.join(", ")}.` : "";
}

function renderProgressCurriculum() {
  const summaries = CURRICULUM_AREAS.map(curriculumAreaSummary);
  const total = summaries.reduce((sum, area) => sum + area.total, 0);
  const done = summaries.reduce((sum, area) => sum + area.done, 0);
  const overall = total ? Math.round((done / total) * 100) : 0;
  const cards = summaries.map((summary) => {
    const nextTopic = summary.topics.find((topic) => !state.completedQuests.has(topic.id));
    const miniText = summary.miniGameRefs.length ? `${summary.miniDone}/${summary.miniGameRefs.length} mini-games` : "No mini-game link yet";
    const stationText = summary.studyTotal ? `${summary.studyDone}/${summary.studyTotal} study stations` : "No study station link yet";
    return `
      <div class="progress-card">
        <strong>${escapeHtml(summary.area)}</strong>
        <small>${summary.done}/${summary.total} learning links complete</small>
        <div class="progress-bar mini"><span style="width:${summary.percent}%"></span></div>
        <p>${summary.percent}% learned - ${summary.topicDone}/${summary.topics.length} topics, ${escapeHtml(miniText)}, ${escapeHtml(stationText)}.</p>
        <small>Next: ${escapeHtml(nextTopic?.asks || "All linked topics complete")}</small>
      </div>
    `;
  }).join("");
  return `
    <section class="progress-section">
      <div class="progress-card is-active">
        <strong>Curriculum progress: ${overall}%</strong>
        <small>${done}/${total} linked learning activities complete</small>
        <div class="progress-bar"><span style="width:${overall}%"></span></div>
      </div>
      <div class="progress-card-grid">${cards}</div>
    </section>
  `;
}

function renderProgressPanel() {
  if (!progressPanelBody) return;
  const content = currentProgressTab === "quests"
    ? renderProgressQuests()
    : currentProgressTab === "buildings"
      ? renderProgressBuildings()
      : currentProgressTab === "miniGames"
        ? renderProgressMiniGames()
        : currentProgressTab === "curriculum"
          ? renderProgressCurriculum()
          : currentProgressTab === "achievements"
            ? renderProgressAchievements()
            : renderProgressStory();
  progressPanelBody.innerHTML = `
    <nav class="progress-tabs" aria-label="Progress sections">
      ${progressTabButton("story", "Story")}
      ${progressTabButton("quests", "Quests")}
      ${progressTabButton("buildings", "Buildings")}
      ${progressTabButton("miniGames", "Mini-games")}
      ${progressTabButton("curriculum", "Curriculum")}
      ${progressTabButton("achievements", "Achievements")}
    </nav>
    ${content}
  `;
}

function openMiniGameHub() {
  openProgressPanel("miniGames");
}

function miniGameScoreText(id) {
  const game = MINI_GAMES[id];
  const score = state.miniGameScores[id]?.score;
  return Number.isFinite(score) ? `Best: ${score}/${game.rounds.length} (${miniGameMedal(score, game.rounds.length)})` : "Best: not played";
}

function safeClassName(value) {
  return String(value || "valley").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "valley";
}

function miniGameVisualMeta(id) {
  return MINI_GAME_VISUALS[id] || { layout: "cards", cue: "Practice table", labels: ["Prompt", "Choice", "Feedback"], result: "Practice mark" };
}

function renderMiniGameVisual(id, round, index, total) {
  const meta = miniGameVisualMeta(id);
  const labelChips = meta.labels.map((label) => `<span>${escapeHtml(label)}</span>`).join("");
  const roundLabel = round.section || `Round ${index + 1}`;
  return `
    <div class="minigame-visual minigame-stage-${safeClassName(meta.layout)} minigame-visual-${safeClassName(id)}" aria-hidden="true">
      <div class="minigame-banner"></div>
      <div class="minigame-stage-prop prop-a"></div>
      <div class="minigame-stage-prop prop-b"></div>
      <div class="minigame-stage-prop prop-c"></div>
      <div class="minigame-stage-labels">${labelChips}</div>
      <strong>${escapeHtml(meta.cue)}</strong>
      <small>${escapeHtml(roundLabel)} ${index + 1}/${total}</small>
    </div>
  `;
}

function renderMiniGameMedal(id, medal, score, total) {
  const meta = miniGameVisualMeta(id);
  const label = `${medal.charAt(0).toUpperCase()}${medal.slice(1)} ${medal === "practice" ? "run" : "medal"}`;
  return `
    <div class="minigame-medal-screen medal-${safeClassName(medal)} minigame-stage-${safeClassName(meta.layout)}">
      <div class="minigame-medal-mark" aria-hidden="true"><span></span></div>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <small>${escapeHtml(meta.result)} - ${score}/${total}</small>
      </div>
    </div>
  `;
}

function openMiniGame(id) {
  const game = MINI_GAMES[id];
  if (!game) return;
  closeOverlays("miniGame");
  if (game.type === "wordReveal") {
    activeMiniGame = {
      id,
      index: 0,
      score: 0,
      type: "wordReveal",
      ...makeWordRevealRound(game.rounds[0])
    };
    renderMiniGamePanel();
    miniGamePanel?.classList.remove("hidden");
    return;
  }
  activeMiniGame = {
    id,
    index: 0,
    score: 0,
    answered: false,
    selected: null,
    orders: game.rounds.map((round) => shuffledAnswerIndexes(round.choices.length))
  };
  renderMiniGamePanel();
  miniGamePanel?.classList.remove("hidden");
}

// Per-round sub-state for word-reveal games (Keyword Rescue / Caseword Court).
const WORD_REVEAL_MAX_MISSES = 6;

function makeWordRevealRound(round) {
  return {
    phase: "guess",
    revealed: [],
    usedLetters: [],
    misses: 0,
    wordSolved: false,
    answered: false,
    selected: null,
    defineOrder: shuffledAnswerIndexes(round.choices.length)
  };
}

function wordRevealLettersNeeded(word) {
  return [...new Set(word.toUpperCase().replace(/[^A-Z]/g, "").split(""))];
}

function wordRevealIsSolved(round, revealed) {
  return wordRevealLettersNeeded(round.word).every((letter) => revealed.includes(letter));
}

function renderMiniGamePanel() {
  if (!miniGamePanelBody || !activeMiniGame) return;
  const game = MINI_GAMES[activeMiniGame.id];
  if (game.type === "wordReveal") {
    renderWordRevealPanel(game);
    return;
  }
  const round = game.rounds[activeMiniGame.index];
  const order = activeMiniGame.orders[activeMiniGame.index] || shuffledAnswerIndexes(round.choices.length);
  const choices = order.map((originalIndex, displayIndex) => {
    const chosen = activeMiniGame.selected === originalIndex;
    const correct = activeMiniGame.answered && originalIndex === round.correct;
    const wrong = activeMiniGame.answered && chosen && originalIndex !== round.correct;
    return `<button type="button" class="minigame-choice${correct ? " is-correct answer-correct" : ""}${wrong ? " is-wrong answer-wrong" : ""}" data-minigame-choice="${originalIndex}"${activeMiniGame.answered ? " disabled" : ""}>${displayIndex + 1}. ${escapeHtml(round.choices[originalIndex])}</button>`;
  }).join("");
  const feedback = activeMiniGame.answered
    ? `<div class="minigame-feedback"><strong>${escapeHtml(miniGameFeedbackTitle(activeMiniGame, round))}</strong><p>${escapeHtml(miniGameFeedbackText(activeMiniGame, round))}</p><button type="button" data-minigame-next>${activeMiniGame.index >= game.rounds.length - 1 ? "Finish" : "Next"}</button></div>`
    : "";
  const sectionLabel = game.isFinalExam && round.section ? `${round.section} section` : `Round ${activeMiniGame.index + 1}/${game.rounds.length}`;
  const taskLabel = game.isFinalExam && round.task ? ` - ${round.task}` : "";
  miniGamePanelBody.innerHTML = `
    <div class="minigame-header">
      <strong>${escapeHtml(game.title)}</strong>
      <small>${escapeHtml(game.region)} - ${miniGameScoreText(activeMiniGame.id)}</small>
    </div>
    ${renderMiniGameVisual(activeMiniGame.id, round, activeMiniGame.index, game.rounds.length)}
    <div class="minigame-meter"><span style="width:${(activeMiniGame.index / game.rounds.length) * 100}%"></span></div>
    <div class="minigame-round">
      <small>${escapeHtml(sectionLabel)}${escapeHtml(taskLabel)} - Score ${activeMiniGame.score}</small>
      <p>${escapeHtml(round.prompt)}</p>
      <div class="minigame-choices">${choices}</div>
      ${feedback}
    </div>
  `;
}

function renderWordRevealPanel(game) {
  const run = activeMiniGame;
  const round = game.rounds[run.index];
  const letters = round.word.toUpperCase();
  const slots = [...letters].map((ch) => {
    if (ch === " ") return `<span class="word-gap"></span>`;
    const shown = run.revealed.includes(ch) || run.phase !== "guess";
    const justRevealed = run.phase !== "guess" && !run.revealed.includes(ch);
    return `<span class="word-slot${shown ? " is-filled" : ""}${justRevealed ? " is-revealed" : ""}">${shown ? escapeHtml(ch) : ""}</span>`;
  }).join("");
  const missPct = Math.min(100, (run.misses / WORD_REVEAL_MAX_MISSES) * 100);
  const missMeter = `<div class="word-miss-meter" aria-label="Misses ${run.misses} of ${WORD_REVEAL_MAX_MISSES}"><span style="width:${missPct}%"></span></div>`;
  let body;
  if (run.phase === "guess") {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const keys = [...alphabet].map((ch) => {
      const used = run.usedLetters.includes(ch);
      const inWord = letters.includes(ch);
      const cls = used ? (inWord ? " is-hit" : " is-miss") : "";
      return `<button type="button" class="word-key${cls}" data-minigame-letter="${ch}"${used ? " disabled" : ""}>${ch}</button>`;
    }).join("");
    body = `
      <p class="word-hint"><strong>Clue:</strong> ${escapeHtml(round.hint)}</p>
      <div class="word-keys">${keys}</div>
      <small class="word-status">Misses ${run.misses}/${WORD_REVEAL_MAX_MISSES} - rescue the keyword, then prove its meaning.</small>
    `;
  } else {
    const order = run.defineOrder || shuffledAnswerIndexes(round.choices.length);
    const choices = order.map((originalIndex, displayIndex) => {
      const chosen = run.selected === originalIndex;
      const correct = run.answered && originalIndex === round.correct;
      const wrong = run.answered && chosen && originalIndex !== round.correct;
      return `<button type="button" class="minigame-choice${correct ? " is-correct answer-correct" : ""}${wrong ? " is-wrong answer-wrong" : ""}" data-minigame-define="${originalIndex}"${run.answered ? " disabled" : ""}>${displayIndex + 1}. ${escapeHtml(round.choices[originalIndex])}</button>`;
    }).join("");
    const solvedNote = run.wordSolved
      ? `<small class="word-status is-good">Keyword rescued. Now lock in its meaning.</small>`
      : `<small class="word-status is-warn">Out of guesses - the word is shown. Pick its meaning to learn it.</small>`;
    const feedback = run.answered
      ? `<div class="minigame-feedback"><strong>${run.selected === round.correct ? (run.wordSolved ? "Correct" : "Good to know") : "Not quite"}</strong><p>${escapeHtml(round.explain)}</p><button type="button" data-minigame-next>${run.index >= game.rounds.length - 1 ? "Finish" : "Next word"}</button></div>`
      : "";
    body = `
      ${solvedNote}
      <p>${escapeHtml(round.prompt)}</p>
      <div class="minigame-choices">${choices}</div>
      ${feedback}
    `;
  }
  miniGamePanelBody.innerHTML = `
    <div class="minigame-header">
      <strong>${escapeHtml(game.title)}</strong>
      <small>${escapeHtml(game.region)} - ${miniGameScoreText(run.id)}</small>
    </div>
    ${renderMiniGameVisual(run.id, round, run.index, game.rounds.length)}
    <div class="minigame-meter"><span style="width:${(run.index / game.rounds.length) * 100}%"></span></div>
    <div class="minigame-round minigame-wordgame">
      <small>Word ${run.index + 1}/${game.rounds.length} - Score ${run.score}</small>
      <div class="word-display">${slots}</div>
      ${missMeter}
      ${body}
    </div>
  `;
}

function guessLetter(letter) {
  const run = activeMiniGame;
  if (!run || run.type !== "wordReveal" || run.phase !== "guess") return;
  const ch = String(letter || "").toUpperCase();
  if (!/^[A-Z]$/.test(ch) || run.usedLetters.includes(ch)) return;
  const game = MINI_GAMES[run.id];
  const round = game.rounds[run.index];
  run.usedLetters = [...run.usedLetters, ch];
  if (round.word.toUpperCase().includes(ch)) {
    run.revealed = [...run.revealed, ch];
    if (wordRevealIsSolved(round, run.revealed)) {
      run.wordSolved = true;
      run.phase = "define";
    }
  } else {
    run.misses += 1;
    if (run.misses >= WORD_REVEAL_MAX_MISSES) {
      run.wordSolved = false;
      run.phase = "define";
    }
  }
  renderMiniGamePanel();
}

function answerWordDefinition(index) {
  const run = activeMiniGame;
  if (!run || run.type !== "wordReveal" || run.phase !== "define" || run.answered) return;
  const game = MINI_GAMES[run.id];
  const round = game.rounds[run.index];
  run.selected = index;
  run.answered = true;
  if (index === round.correct && run.wordSolved) run.score += 1;
  renderMiniGamePanel();
}

function miniGameFeedbackTitle(run, round) {
  const result = run.sectionResults?.[run.index];
  if (result?.assisted) return "Tool assist";
  return run.selected === round.correct ? "Correct" : "Not quite";
}

function miniGameFeedbackText(run, round) {
  const result = run.sectionResults?.[run.index];
  return result?.assistText || round.explain;
}

function answerMiniGame(index) {
  if (!activeMiniGame || activeMiniGame.answered) return;
  const game = MINI_GAMES[activeMiniGame.id];
  const round = game.rounds[activeMiniGame.index];
  const correct = index === round.correct;
  const assist = !correct ? miniGameToolAssist(activeMiniGame.id, round) : null;
  const resultCorrect = correct || Boolean(assist);
  activeMiniGame.selected = index;
  activeMiniGame.answered = true;
  if (assist) {
    activeMiniGame.toolBonusUsed = true;
    awardStats({ focus: -TOOL_ASSIST_FOCUS_COST });
  }
  if (resultCorrect) activeMiniGame.score += 1;
  activeMiniGame.sectionResults = activeMiniGame.sectionResults || [];
  activeMiniGame.sectionResults[activeMiniGame.index] = {
    section: round.section || `Round ${activeMiniGame.index + 1}`,
    task: round.task || "Question",
    correct: resultCorrect,
    assisted: Boolean(assist),
    assistText: assist,
    selected: round.choices[index],
    answer: round.choices[round.correct],
    explain: round.explain
  };
  renderMiniGamePanel();
}

function miniGameToolAssist(id, round) {
  if (activeMiniGame?.toolBonusUsed) return null;
  const tool = ITEMS[state.equipped.tool];
  if (!tool?.effect) return null;
  if ((state.stats?.focus || 0) < TOOL_ASSIST_FOCUS_COST) return null;
  if (tool.effect.miniGameBonus === id) return `${tool.name} spent ${TOOL_ASSIST_FOCUS_COST} Focus to turn a weak answer into a usable point.`;
  if (id === "examSimulation" && tool.effect.examSections?.includes(round.section)) {
    return `${tool.name} spent ${TOOL_ASSIST_FOCUS_COST} Focus to help with the ${round.section} section.`;
  }
  return null;
}

function miniGameSectionBreakdown(id, sectionResults = []) {
  const game = MINI_GAMES[id];
  if (!game?.isFinalExam) return [];
  return game.rounds.map((round, index) => {
    const result = sectionResults[index] || {};
    return {
      section: round.section || `Section ${index + 1}`,
      task: round.task || "Question",
      correct: Boolean(result.correct),
      assisted: Boolean(result.assisted),
      assistText: result.assistText || "",
      selected: result.selected || "No answer",
      answer: round.choices[round.correct],
      explain: round.explain
    };
  });
}

function renderExamBreakdown(sections = []) {
  if (!sections.length) return "";
  const rows = sections.map((section) => `
    <div class="exam-breakdown-row${section.correct ? " is-correct" : " is-wrong"}">
      <strong>${escapeHtml(section.section)}</strong>
      <small>${escapeHtml(section.task)} - ${section.assisted ? "tool assist" : section.correct ? "secure" : "revise"}</small>
      <p>${escapeHtml(section.assistText || section.explain)}</p>
    </div>
  `).join("");
  return `<div class="exam-breakdown"><h3>Section breakdown</h3>${rows}</div>`;
}

function advanceMiniGame() {
  if (!activeMiniGame) return;
  const game = MINI_GAMES[activeMiniGame.id];
  if (activeMiniGame.index >= game.rounds.length - 1) {
    completeMiniGame();
    return;
  }
  activeMiniGame.index += 1;
  if (activeMiniGame.type === "wordReveal") {
    Object.assign(activeMiniGame, makeWordRevealRound(game.rounds[activeMiniGame.index]));
  } else {
    activeMiniGame.answered = false;
    activeMiniGame.selected = null;
  }
  renderMiniGamePanel();
}

function completeMiniGame() {
  if (!activeMiniGame) return;
  const game = MINI_GAMES[activeMiniGame.id];
  const id = activeMiniGame.id;
  const score = activeMiniGame.score;
  const previous = state.miniGameScores[id]?.score ?? -1;
  const medal = miniGameMedal(score, game.rounds.length);
  const npcConclusion = miniGameNpcConclusion(id);
  const sections = miniGameSectionBreakdown(id, activeMiniGame.sectionResults || []);
  const storyNote = medal !== "practice" ? markStoryFlag(MINI_GAME_STORY_FLAGS[id]) : "";
  const curriculumNote = medal !== "practice" ? miniGameCurriculumNote(id) : "";
  if (score > previous) {
    state.miniGameScores[id] = { score, medal, completedAt: Date.now(), ...(sections.length ? { sections } : {}) };
    const bonus = medal === "gold" ? 8 : medal === "silver" ? 5 : medal === "bronze" ? 3 : 1;
    addCoins((game.reward.coins || 0) + bonus);
    awardStats(game.reward);
    if (medal !== "practice") state.stats.spark += 1;
    state.journal = `${game.title}: ${score}/${game.rounds.length}, ${medal}. ${npcConclusion}${storyNote}${curriculumNote}`;
  } else {
    state.journal = `${game.title}: ${score}/${game.rounds.length}. Best score unchanged. ${npcConclusion}${storyNote}${curriculumNote}`;
  }
  activeMiniGame = null;
  renderProgressPanel();
  updateHud();
  saveGame();
  miniGamePanelBody.innerHTML = `
    <div class="minigame-result">
      <strong>${escapeHtml(game.title)} complete</strong>
      ${renderMiniGameMedal(id, medal, score, game.rounds.length)}
      <p>Score: ${score}/${game.rounds.length}</p>
      <p>Medal: ${escapeHtml(medal)}</p>
      <p>${escapeHtml(npcConclusion)}</p>
      ${curriculumNote ? `<p>${escapeHtml(curriculumNote.trim())}</p>` : ""}
      ${renderExamBreakdown(sections)}
      <button type="button" data-minigame-replay="${id}">Replay</button>
      ${game.isFinalExam ? `<button type="button" data-minigame-ending>Face final ending</button>` : ""}
      <button type="button" data-minigame-close>Close</button>
    </div>
  `;
}

function closeMiniGamePanel() {
  activeMiniGame = null;
  miniGamePanel?.classList.add("hidden");
}

function renderCharacterPanel() {
  if (!characterPanelBody) return;
  const nextXp = xpForNextLevel();
  const profile = state.profile || defaultProfile();
  const visual = heroVisual(profile);
  const statCards = STAT_KEYS.map((key) => {
    const value = Math.round(state.stats[key]);
    const contribution = Math.round(value * READINESS_WEIGHTS[key]);
    const disabled = state.stats.statPoints <= 0 || value >= 100 ? " disabled" : "";
    return `
      <div class="character-stat-card card-${key}">
        <div class="stat-card-header"><strong><i class="ico ${STAT_ICONS[key]}"></i>${STAT_LABELS[key]}</strong><span>${value}/100</span></div>
        <small>${escapeHtml(STAT_DESCRIPTIONS[key])}</small>
        <div class="progress-bar mini"><span style="width:${value}%"></span></div>
        <small>Readiness contribution: +${contribution}%</small>
        <button type="button" data-character-stat="${key}"${disabled}>+1</button>
      </div>
    `;
  }).join("");
  characterPanelBody.innerHTML = `
    <section class="character-hero-card">
      ${heroPortraitHtml("is-large")}
      <div>
        <strong>${escapeHtml(profile.name || "Citizen")}</strong>
        <small>${escapeHtml(visual.preset.label)} · ${escapeHtml(visual.outfit.name)} · ${escapeHtml(visual.silhouette)} silhouette</small>
      </div>
    </section>
    <section class="character-summary">
      <div><strong>Level ${state.stats.level}</strong><small>${state.stats.level >= MAX_LEVEL ? "Maximum level" : `${state.stats.xp}/${nextXp} XP to next level`}</small></div>
      <div><strong>${state.stats.statPoints}</strong><small>Unspent points</small></div>
      <div class="summary-readiness"><strong>${examChance()}%</strong><small>Exam Readiness</small></div>
    </section>
    <section class="character-stat-grid">${statCards}</section>
    <section class="character-formula">
      <strong>Readiness formula</strong>
      <p>${READINESS_BASE} + Knowledge x ${READINESS_WEIGHTS.knowledge} + Rhetoric x ${READINESS_WEIGHTS.rhetoric} + Empathy x ${READINESS_WEIGHTS.empathy} + Integrity x ${READINESS_WEIGHTS.integrity} + Sparks x 1.5, capped at 95%.</p>
      <p>Sparks: ${collectedSparks()} · Focus: ${Math.round(state.stats.focus)}/100 · Tool assists cost ${TOOL_ASSIST_FOCUS_COST} Focus.</p>
    </section>
  `;
}

function equipItem(id) {
  const item = ITEMS[id];
  if (!item || !state.inventory.includes(id) || !["outfit", "tool"].includes(item.type)) return;
  state.equipped[item.type] = id;
  state.journal = item.type === "tool" ? `${item.name} is now in hand.` : `${item.name} equipped.`;
  updateHud();
  saveGame();
}

function unequipItem(slot) {
  if (slot !== "tool") return;
  state.equipped.tool = null;
  state.journal = "Your hands are free.";
  updateHud();
  saveGame();
}

function useItem(id) {
  const item = ITEMS[id];
  if (!item || !state.inventory.includes(id)) return;
  if (item.type === "consumable") {
    removeItem(id);
    awardStats({ focus: item.effect?.focus || 0, knowledge: item.effect?.knowledge || 0 });
    state.journal = `${item.name} used. Focus restored to ${Math.round(state.stats.focus)}/100.`;
  } else if (item.effect?.openProgress) {
    state.journal = `Notebook opened. Current objective: ${state.quest}`;
    openProgressPanel(item.effect.openProgress);
  } else if (item.effect?.storyHint) {
    const beat = Object.values(STORY_BEATS).find((entry) => entry.act === state.storyAct) || STORY_BEATS.intro;
    state.journal = `Citizen Scroll: ${beat.objective}`;
    openProgressPanel("story");
  } else {
    return;
  }
  updateHud();
  saveGame();
}

function sellItem(id) {
  const item = ITEMS[id];
  if (!item || !state.inventory.includes(id)) return;
  if (item.type === "quest") {
    state.journal = `${item.name} is a key item and cannot be sold.`;
    updateHud();
    return;
  }
  if (state.equipped.outfit === id || state.equipped.tool === id) {
    state.journal = "Unequip an item before selling it.";
    updateHud();
    return;
  }
  const nearbyNpc = npcs.find((person) => rectsNear(state.player, person, 70));
  if (!nearbyNpc) {
    state.journal = "Stand near a villager to sell items.";
    updateHud();
    return;
  }
  removeItem(id);
  addCoins(item.value);
  state.journal = `${nearbyNpc.name} bought ${item.name} for ${item.value} coins.`;
  updateHud();
  saveGame();
}

function tileAtPixel(x, y) {
  const col = Math.floor(x / LOGICAL_TILE);
  const row = Math.floor(y / LOGICAL_TILE);
  return currentMap()[row]?.[col] || "#";
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function isBuildingBlocked(x, y, w, h) {
  const playerRect = { x, y, w, h };
  return (currentLayout().buildings || []).some((building) => {
    const solid = { x: building.x - 6, y: building.y - 28, w: building.w + 12, h: building.h + 34 };
    return rectsOverlap(playerRect, solid);
  });
}

function isBlocked(x, y, w, h) {
  const points = [
    [x + 2, y + 2],
    [x + w - 2, y + 2],
    [x + 2, y + h - 2],
    [x + w - 2, y + h - 2]
  ];
  return isBuildingBlocked(x, y, w, h) || points.some(([px, py]) => "#~T".includes(tileAtPixel(px, py)) || isHarborWater(px, py));
}

function isHarborWater(x, y) {
  if (!currentLayout().harbor) return false;
  const inWater = x >= 704 && x <= 864 && y >= 192 && y <= 352;
  const onDock = x >= 704 && x <= 850 && y >= 274 && y <= 318;
  return inWater && !onDock;
}

function rectsNear(a, b, distance = 42) {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + 12;
  const by = b.y + 14;
  return Math.hypot(ax - bx, ay - by) < distance;
}

function findInteractable() {
  const door = currentBuildingDoors().find((item) => rectsNear(state.player, { ...item, w: 24, h: 24 }, 48));
  if (door) return { type: "buildingDoor", item: door };
  const npc = npcs.find((person) => rectsNear(state.player, person));
  if (npc) return { type: "npc", item: npc };
  if (isInteriorLocation()) {
    const station = currentStudyStations().find((item) => rectsNear(state.player, { ...item, w: 28, h: 20 }, 64));
    if (station) return { type: "studyStation", item: station };
    const exit = INTERIOR_EXITS[state.currentLocation];
    if (exit && rectsNear(state.player, { ...exit, w: 28, h: 20 }, 54)) return { type: "exitDoor", item: exit };
  }
  if (state.currentLocation === "examHall") {
    const room = EXAM_PRACTICE_ROOMS.find((item) => rectsNear(state.player, { ...item, w: 24, h: 20 }, 50));
    if (room) return { type: "examRoom", item: room };
  }
  const sign = currentSigns().find((item) => rectsNear(state.player, { ...item, w: 20, h: 20 }, 38));
  if (sign) return { type: "sign", item: sign };
  return null;
}

function npcForTitle(title) {
  if (!title) return null;
  const pools = [npcs, ...Object.values(WORLD).map((w) => w.npcs || [])];
  for (const pool of pools) {
    const hit = pool.find((npc) => npc.name === title || title.includes(npc.name));
    if (hit) return hit;
  }
  return null;
}

function hashText(text = "") {
  return [...text].reduce((hash, ch) => ((hash << 5) - hash + ch.charCodeAt(0)) | 0, 17);
}

function avatarRole(npc) {
  const text = `${npc?.id || ""} ${npc?.name || ""} ${npc?.intro || ""}`.toLowerCase();
  if (text.includes("mayor") || text.includes("councillor") || text.includes("council")) return "council";
  if (text.includes("campaign") || text.includes("petition") || text.includes("party")) return "campaign";
  if (text.includes("library") || text.includes("archive") || text.includes("source") || text.includes("scribe")) return "book";
  if (text.includes("justice") || text.includes("court") || text.includes("law") || text.includes("rights") || text.includes("advocate")) return "law";
  if (text.includes("police") || text.includes("sergeant")) return "police";
  if (text.includes("data") || text.includes("statistic") || text.includes("survey")) return "data";
  if (text.includes("media") || text.includes("editor") || text.includes("moderator") || text.includes("signal")) return "media";
  if (text.includes("election") || text.includes("returning") || text.includes("mp") || text.includes("parliament")) return "democracy";
  if (text.includes("timekeeper") || text.includes("timed")) return "time";
  if (text.includes("charity") || text.includes("aid") || text.includes("volunteer")) return "care";
  if (text.includes("exam")) return "exam";
  return "citizen";
}

function avatarSpec(npc) {
  const id = npc?.id || npc?.name || "guide";
  const hash = Math.abs(hashText(id));
  const firstName = (npc?.name || "").split(" ").at(-1);
  const feminine = FEMALE_NPC_NAMES.has(firstName) || /priya|amina|mira|nia|june|grace|farah|mina|tess|rae/i.test(id);
  return {
    feminine,
    role: avatarRole(npc),
    skin: SKIN_TONES[hash % SKIN_TONES.length],
    hair: HAIR_COLORS[Math.floor(hash / 3) % HAIR_COLORS.length],
    jacket: npc?.color || JACKET_COLORS[Math.floor(hash / 7) % JACKET_COLORS.length],
    shirt: ["#f5f0df", "#1d2427", "#e6d3a4", "#d7e8f3"][Math.floor(hash / 11) % 4],
    bgA: ["#20363b", "#28304a", "#2f3d2f", "#3a2f42"][Math.floor(hash / 13) % 4],
    bgB: ["#5da9e9", "#f2c14e", "#6fbf73", "#d88c5a"][Math.floor(hash / 17) % 4]
  };
}

function moodMouth(mood) {
  if (mood === "wrong" || mood === "stern") return `<path d="M92 126 Q106 118 120 126" fill="none" stroke="#5b2f2b" stroke-width="5" stroke-linecap="round"/>`;
  if (mood === "reward" || mood === "correct") return `<path d="M91 121 Q106 137 122 121" fill="none" stroke="#5b2f2b" stroke-width="5" stroke-linecap="round"/><rect x="99" y="123" width="15" height="4" fill="#fff7e0"/>`;
  if (mood === "question" || mood === "unsure") return `<ellipse cx="106" cy="125" rx="7" ry="4" fill="#5b2f2b"/>`;
  return `<path d="M94 123 Q106 130 118 123" fill="none" stroke="#5b2f2b" stroke-width="4" stroke-linecap="round"/>`;
}

function roleAccessory(role) {
  const common = `stroke="#f5f0df" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const dark = `stroke="#263036" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  if (role === "book") return `<rect x="142" y="126" width="34" height="26" rx="3" fill="#5da9e9" stroke="#f5f0df" stroke-width="3"/><path d="M159 128 L159 151" ${common}/><path d="M148 136 H155 M164 136 H171 M148 144 H155 M164 144 H171" ${dark}/>`;
  if (role === "law") return `<rect x="143" y="145" width="34" height="7" fill="#d8a23a"/><path d="M150 139 H170 M160 111 V145 M148 119 H172" ${common}/><path d="M150 119 L143 133 H157 Z M170 119 L163 133 H177 Z" fill="#d8a23a"/>`;
  if (role === "campaign") return `<path d="M143 124 L176 113 V144 L143 135 Z" fill="#e36b5d" stroke="#f5f0df" stroke-width="3"/><rect x="137" y="129" width="8" height="18" fill="#263036"/><path d="M176 120 Q187 128 176 137" ${common}/>`;
  if (role === "council") return `<circle cx="160" cy="132" r="19" fill="#f2c14e" stroke="#f5f0df" stroke-width="3"/><path d="M151 132 L158 139 L171 123" fill="none" stroke="#263036" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (role === "police") return `<path d="M145 118 L160 111 L175 118 V137 Q160 150 145 137 Z" fill="#31405a" stroke="#f5f0df" stroke-width="3"/><path d="M153 128 H167" ${common}/>`;
  if (role === "data") return `<rect x="143" y="119" width="34" height="32" rx="4" fill="#263036" stroke="#f5f0df" stroke-width="3"/><rect x="150" y="138" width="5" height="8" fill="#6fbf73"/><rect x="159" y="129" width="5" height="17" fill="#f2c14e"/><rect x="168" y="123" width="5" height="23" fill="#5da9e9"/>`;
  if (role === "media") return `<rect x="145" y="121" width="31" height="22" rx="3" fill="#f5f0df"/><circle cx="154" cy="132" r="5" fill="#5da9e9"/><path d="M166 121 V113 M173 121 L181 116 M174 128 H185" ${common}/>`;
  if (role === "democracy") return `<rect x="144" y="123" width="33" height="28" fill="#f5f0df" stroke="#263036" stroke-width="3"/><path d="M151 129 H169 M151 137 H164" ${dark}/><path d="M159 113 L169 123 H149 Z" fill="#f2c14e"/>`;
  if (role === "time") return `<circle cx="160" cy="132" r="18" fill="#f5f0df" stroke="#263036" stroke-width="4"/><path d="M160 132 V120 M160 132 L169 138" ${dark}/>`;
  if (role === "care") return `<path d="M160 149 C130 128 148 107 160 122 C172 107 190 128 160 149 Z" fill="#e36b5d" stroke="#f5f0df" stroke-width="3"/>`;
  if (role === "exam") return `<rect x="145" y="117" width="30" height="36" rx="2" fill="#f5f0df" stroke="#263036" stroke-width="3"/><path d="M151 127 H169 M151 136 H169 M151 145 H162" ${dark}/><circle cx="171" cy="146" r="9" fill="#6fbf73"/>`;
  return `<circle cx="160" cy="132" r="17" fill="#6fbf73" stroke="#f5f0df" stroke-width="3"/><path d="M152 132 H168 M160 124 V140" ${common}/>`;
}

const NPC_PORTRAIT_DIR = "assets/characters/portraits/";
// Recurring roles share one portrait file (same person in two locations).
const NPC_PORTRAIT_ALIASES = {
  campaignPriya2: "priya",
  justiceRowan2: "rowan",
  plannerNoor2: "noor",
  examMira2: "examinerMira"
};
// Portraits that exist on disk (sliced from the art atlas).
const NPC_PORTRAIT_IDS = new Set([
  "mayor", "priya", "sam", "rowan", "noor", "editorVale", "historianIona", "aidMina", "dataOmar", "elderGrace",
  "advocateFarah", "sergeantBlake", "mediatorChen", "youthEllis", "speakerLark", "mpRivers", "managerSol", "officerJune", "heraldEwan",
  "unionMorgan", "charityAmina", "lobbyistPax", "moderatorRae", "surveyorTess", "statJules", "organiserKai", "examinerMira",
  "timeAsh", "sourceNia", "coachLeon", "scribePip"
]);

function npcPortraitId(npc) {
  const id = npc?.id;
  if (!id) return null;
  const canon = NPC_PORTRAIT_ALIASES[id] || id;
  return NPC_PORTRAIT_IDS.has(canon) ? canon : null;
}


function renderNpcPortrait(title, mood = "talk") {
  const npc = npcForTitle(title) || activeNpc || null;
  const portraitId = npcPortraitId(npc);
  if (portraitId) {
    let emblem = "";
    if (mood === "reward" || mood === "correct") emblem = `<span class="npc-portrait-emblem is-spark">★</span>`;
    else if (mood === "question" || mood === "unsure") emblem = `<span class="npc-portrait-emblem is-ask">?</span>`;
    return `<div class="npc-portrait-photo npc-portrait-${mood}"><img src="${NPC_PORTRAIT_DIR}${portraitId}.png" alt="${title}" loading="lazy" onerror="this.parentNode.dataset.failed='1'">${emblem}</div>`;
  }
  const spec = avatarSpec(npc);
  const hair = spec.feminine
    ? `<path d="M70 76 Q75 37 108 35 Q143 39 145 79 L137 112 Q128 62 106 61 Q84 62 77 112 Z" fill="${spec.hair}"/>`
    : `<path d="M70 75 Q76 39 108 36 Q138 39 145 75 Q126 57 105 59 Q86 59 70 75 Z" fill="${spec.hair}"/>`;
  const extraHair = spec.feminine
    ? `<rect x="70" y="78" width="14" height="48" rx="7" fill="${spec.hair}"/><rect x="131" y="78" width="14" height="48" rx="7" fill="${spec.hair}"/>`
    : `<path d="M77 67 Q88 45 105 56 Q120 43 138 67 L132 77 Q106 61 81 77 Z" fill="${spec.hair}"/>`;
  const brows = mood === "wrong" || mood === "stern"
    ? `<path d="M83 91 L97 87 M116 87 L130 91" stroke="#2b1a14" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M83 87 H97 M116 87 H130" stroke="#2b1a14" stroke-width="4" stroke-linecap="round"/>`;
  const spark = mood === "reward" || mood === "correct"
    ? `<path d="M42 43 L48 58 L63 64 L48 70 L42 85 L36 70 L21 64 L36 58 Z" fill="#f2c14e"/><circle cx="176" cy="63" r="7" fill="#f2c14e"/>`
    : "";
  const question = mood === "question" || mood === "unsure"
    ? `<text x="167" y="70" fill="#5da9e9" font-size="42" font-family="Georgia" font-weight="700">?</text>`
    : "";
  const svg = `
    <svg viewBox="0 0 216 216" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="${spec.bgA}"/>
          <stop offset="1" stop-color="${spec.bgB}"/>
        </linearGradient>
      </defs>
      <rect width="216" height="216" rx="18" fill="url(#bg)"/>
      <circle cx="108" cy="98" r="74" fill="rgba(255,255,255,.12)"/>
      ${spark}${question}
      <path d="M49 202 Q61 151 108 151 Q155 151 167 202 Z" fill="${spec.jacket}"/>
      <path d="M79 202 L91 157 H125 L137 202 Z" fill="${spec.shirt}"/>
      <rect x="95" y="136" width="26" height="28" rx="9" fill="${spec.skin}"/>
      ${hair}${extraHair}
      <circle cx="72" cy="98" r="9" fill="${spec.skin}"/>
      <circle cx="144" cy="98" r="9" fill="${spec.skin}"/>
      <rect x="72" y="58" width="72" height="91" rx="34" fill="${spec.skin}"/>
      <path d="M78 76 Q105 52 140 77 Q128 60 106 60 Q86 60 78 76 Z" fill="${spec.hair}"/>
      ${brows}
      <circle cx="90" cy="100" r="6" fill="#f5f0df"/>
      <circle cx="124" cy="100" r="6" fill="#f5f0df"/>
      <circle cx="91" cy="101" r="3" fill="#263036"/>
      <circle cx="125" cy="101" r="3" fill="#263036"/>
      <path d="M106 104 L101 116 H111" fill="none" stroke="#8c5d45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${moodMouth(mood)}
      <path d="M66 187 Q84 169 103 180 M150 187 Q132 169 113 180" fill="none" stroke="#263036" stroke-width="7" stroke-linecap="round"/>
      ${roleAccessory(spec.role)}
    </svg>
  `;
  return svg;
}

function renderNpcWindow(title, body, hint, controls = "", mood = "talk") {
  return `
    <div class="npc-window npc-window-${mood}">
      <div class="npc-portrait-frame">
        <div class="npc-portrait">${renderNpcPortrait(title, mood)}</div>
      </div>
      <div class="npc-copy">
        <h2>${title}</h2>
        ${body ? `<p>${body}</p>` : ""}
        ${controls ? `<div class="npc-actions">${controls}</div>` : ""}
        ${hint ? `<small>${hint}</small>` : ""}
      </div>
    </div>
  `;
}

function showDialogue(title, body, hint = "Press E to continue.", mood = "talk") {
  dialogue.innerHTML = renderNpcWindow(title, body, hint, "", mood);
  dialogue.classList.remove("hidden");
}

function hideDialogue() {
  dialogue.classList.add("hidden");
  dialogue.innerHTML = "";
}

function showQuestion(npc) {
  activeQuestion = npc;
  const check = npc.checks[activeCheckIndex];
  const controls = renderShuffledAnswers(check.answers, "answer");
  choicePanel.innerHTML = renderNpcWindow(npc.name, check.question, "Choose 1, 2, or 3.", controls, "question");
  choicePanel.classList.remove("hidden");
}

function showPanel(html, title = activeNpc?.name || "Citizenship", mood = "talk") {
  choicePanel.innerHTML = renderNpcWindow(title, "", "", html, mood);
  choicePanel.classList.remove("hidden");
}

function hidePanel() {
  choicePanel.classList.add("hidden");
  choicePanel.innerHTML = "";
}

function storyBeatForLocation(locationId) {
  if (locationId === "village") return "intro";
  return STORY_BEATS[locationId] ? locationId : null;
}

function storyActTitle() {
  const beat = Object.values(STORY_BEATS).find((entry) => entry.act === state.storyAct);
  return beat ? `Act ${beat.act}: ${beat.region}` : `Act ${state.storyAct}`;
}

function storyVisualForRegion(region) {
  return STORY_VISUALS[region] || STORY_VISUALS["Citizenship Village"];
}

function storySceneHtml(beat, endingId = null) {
  const isEnding = Boolean(endingId);
  const label = isEnding ? "Finale" : `Act ${beat.act}`;
  const regionClass = `story-region-${safeClassName(beat.region || "valley")}`;
  const visual = storyVisualForRegion(beat.region || "Citizenship Village");
  return `
    <div class="story-scene ${regionClass}${isEnding ? " story-scene-ending" : ""}">
      <div class="story-art story-art-${escapeHtml(visual.className)}" aria-hidden="true">
        <span class="story-sky"></span>
        <span class="story-title-card">
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(visual.landmark)}</small>
        </span>
        <span class="story-castle"></span>
        <span class="story-landmark story-landmark-${escapeHtml(visual.className)}"></span>
        <span class="story-scroll"></span>
        <span class="story-key-object">${escapeHtml(visual.object)}</span>
        <span class="story-spark story-spark-a"></span>
        <span class="story-spark story-spark-b"></span>
        <span class="story-shade"></span>
      </div>
      <div class="story-copy">
        <small>${escapeHtml(label)} - ${escapeHtml(beat.region || "Citizenship Valley")}</small>
        <h2 id="storyPanelTitle">${escapeHtml(beat.title)}</h2>
        <p>${escapeHtml(beat.body)}</p>
        <p><strong>${isEnding ? "Result" : beat.villain}:</strong> ${escapeHtml(beat.objective || `Exam Readiness ${examChance()}% - Sparks ${collectedSparks()}`)}</p>
        <p><strong>Choices:</strong> ${escapeHtml(shadeReactionText())}</p>
      </div>
    </div>
  `;
}

function showStoryBeat(id, options = {}) {
  const beat = STORY_BEATS[id];
  if (!beat || !storyPanelBody || !storyPanel) return false;
  if (!options.force && state.storySeen.has(id)) return false;
  closeOverlays("story");
  state.storyAct = Math.max(state.storyAct || 1, beat.act);
  state.storySeen.add(id);
  storyPanelBody.innerHTML = storySceneHtml(beat);
  storyPanel.classList.remove("hidden");
  state.journal = `${beat.title}: ${beat.objective}`;
  updateHud();
  saveGame();
  return true;
}

function showStoryForLocation(locationId, options = {}) {
  const beatId = storyBeatForLocation(locationId);
  return beatId ? showStoryBeat(beatId, options) : false;
}

function finalEndingId() {
  const readiness = examChance();
  const examScore = state.miniGameScores.examSimulation?.score ?? 0;
  const examTotal = MINI_GAMES.examSimulation.rounds.length;
  const allPractice = state.examPracticeCompleted.size >= EXAM_PRACTICE_ROOMS.length;
  const allRegions = locationOrder.every((id) => state.unlockedLocations.has(id));
  const choiceCount = storyFlagCount();
  if (readiness >= 85 && examScore >= examTotal - 1 && allPractice && allRegions && choiceCount >= 5) return "gold";
  if (((readiness >= 65 && examScore >= 3) || examScore >= examTotal - 1) && choiceCount >= 3) return "silver";
  return "bronze";
}

function examSimulationSummaryText() {
  const score = state.miniGameScores.examSimulation?.score;
  const total = MINI_GAMES.examSimulation.rounds.length;
  return Number.isFinite(score) ? `${score}/${total}` : "not attempted";
}

function showFinalEnding() {
  const endingId = finalEndingId();
  const ending = STORY_ENDINGS[endingId];
  if (!ending || !storyPanelBody || !storyPanel) return;
  closeOverlays("story");
  state.storyAct = 7;
  state.storyEnding = endingId;
  state.storySeen.add(endingId);
  storyPanelBody.innerHTML = storySceneHtml({ ...ending, region: "Exam Hall Castle", objective: `Exam Readiness ${examChance()}% - Exam Score ${examSimulationSummaryText()} - Sparks ${collectedSparks()} - Choices ${storyFlagCount()}/${Object.keys(STORY_FLAGS).length}` }, endingId);
  storyPanel.classList.remove("hidden");
  state.journal = `${ending.title}: ${ending.body}`;
  updateHud();
  saveGame();
}

function hideStoryPanel() {
  storyPanel?.classList.add("hidden");
}

function npcById(id) {
  return npcs.find((npc) => npc.id === id);
}

function itemRewardText(reward, coinsOverride = reward.coins) {
  const items = reward.items || (reward.item ? [reward.item] : []);
  const names = items.map((id) => ITEMS[id].name);
  return [...names, `${coinsOverride} coins`].filter(Boolean).join(", ");
}

function showExamPracticeRoom(room) {
  const completed = state.examPracticeCompleted.has(room.id);
  const plan = room.plan.map((step, index) => `<li>${index + 1}. ${escapeHtml(step)}</li>`).join("");
  const html = `
    <div class="exam-practice-card">
      <strong>${escapeHtml(room.question)}</strong>
      <div>
        <small>Plan</small>
        <ul class="exam-practice-plan">${plan}</ul>
      </div>
      <div>
        <small>Model answer</small>
        <p>${escapeHtml(room.model)}</p>
      </div>
    </div>
    <button type="button" data-exam-practice="${room.id}"${completed ? " disabled" : ""}>${completed ? "Practice complete" : "Mark practice done"}</button>
    <button type="button" data-menu="close">Close</button>
  `;
  showPanel(html, room.title, "question");
}

function showStudyStation(station) {
  const key = studyStationKey(state.currentLocation, station.id);
  const completed = state.completedStudyStations.has(key);
  const revise = station.revise.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const answers = completed
    ? `<button type="button" disabled>Mini-question complete</button>`
    : renderShuffledAnswers(station.answers, "study-answer", { extraAttributes: ` data-study-station-id="${station.id}"` });
  const html = `
    <div class="exam-practice-card">
      <strong>${escapeHtml(station.summary)}</strong>
      <div>
        <small>Revise</small>
        <ul class="exam-practice-plan">${revise}</ul>
      </div>
      <div>
        <small>Exam move</small>
        <p>${escapeHtml(station.examTip)}</p>
      </div>
      <div>
        <small>Model point</small>
        <p>${escapeHtml(station.example)}</p>
      </div>
      <div>
        <small>Mini Question</small>
        <p>${escapeHtml(station.question)}</p>
      </div>
      <div>
        <small>${completed ? "Journal note" : "Complete the check"}</small>
        <p>${escapeHtml(completed ? station.journal : station.examTip)}</p>
      </div>
    </div>
    ${answers}
    <button type="button" data-menu="close">Close</button>
  `;
  showPanel(html, station.label, "question");
}

function answerStudyStation(stationId, index) {
  const station = currentStudyStations().find((item) => item.id === stationId);
  if (!station) return;
  if (index !== station.correct) {
    hidePanel();
    showDialogue(station.label, station.incorrect, "Press E and try the station again.", "wrong");
    return;
  }
  completeStudyStation(stationId);
}

function completeStudyStation(stationId) {
  const station = currentStudyStations().find((item) => item.id === stationId);
  if (!station) return;
  const key = studyStationKey(state.currentLocation, station.id);
  if (state.completedStudyStations.has(key)) {
    showStudyStation(station);
    return;
  }
  state.completedStudyStations.add(key);
  addKnowledge(station.reward || 3);
  awardStats({ ...statRewardForRegion(state.currentLocation), focus: 6 });
  state.journal = `${currentLocation().name}: ${station.label} logged. ${station.success} Focus +6.`;
  const location = currentLocation();
  const allDone = currentStudyStations().every((item) => state.completedStudyStations.has(studyStationKey(state.currentLocation, item.id)));
  if (allDone && location.badge && !state.badges.includes(location.badge)) {
    addBadge(location.badge);
    if (location.studyReward?.coins) addCoins(location.studyReward.coins);
    state.journal = `${location.name}: all study stations complete. ${location.badge} earned.`;
  }
  updateHud();
  saveGame();
  showStudyStation(station);
}

function enterBuildingDoor(door) {
  if (door.examRoomId) {
    const room = EXAM_PRACTICE_ROOMS.find((item) => item.id === door.examRoomId);
    if (!room) return;
    state.journal = `${door.label} practice opened from the building entrance.`;
    updateHud();
    saveGame();
    showExamPracticeRoom(room);
    return;
  }
  state.lastDoorReturn = {
    from: door.from,
    label: door.label,
    returnSpawn: { ...door.returnSpawn }
  };
  setLocation(door.target, { preserveText: true });
  state.journal = `Entered ${door.label}. Explore the study stations and press E at the exit to leave.`;
  updateHud();
  saveGame();
}

function leaveInterior() {
  const door = state.lastDoorReturn || buildingDoorByTarget(state.currentLocation);
  if (!door) return;
  setLocation(door.from, { preserveText: true });
  state.player.x = door.returnSpawn.x;
  state.player.y = door.returnSpawn.y;
  state.journal = `Left ${door.label}. You are back in ${WORLD[door.from].name}.`;
  updateHud();
  saveGame();
}

function completeExamPractice(roomId) {
  const room = EXAM_PRACTICE_ROOMS.find((item) => item.id === roomId);
  if (!room || state.examPracticeCompleted.has(room.id)) return;
  state.examPracticeCompleted.add(room.id);
  addKnowledge(4);
  awardStats({ integrity: 1, xp: 8, focus: -4 });
  state.journal = `${room.label} practice complete. Knowledge +4.`;
  if (state.examPracticeCompleted.size === EXAM_PRACTICE_ROOMS.length && !state.badges.includes("Exam Practice Badge")) {
    addBadge("Exam Practice Badge");
    state.journal = "All Exam Hall practice rooms complete. Exam Practice Badge earned.";
  }
  updateHud();
  saveGame();
  showExamPracticeRoom(room);
}

function showNpcMenu(npc) {
  activeNpc = npc;
  const buttons = [
    `<button type="button" data-menu="talk" data-npc="${npc.id}">Talk</button>`,
    `<button type="button" data-menu="quests" data-npc="${npc.id}">Quests</button>`
  ];
  if (npc.miniGameId && MINI_GAMES[npc.miniGameId]) {
    buttons.push(`<button type="button" data-menu="miniGame" data-npc="${npc.id}">Mini-game: ${MINI_GAMES[npc.miniGameId].title}</button>`);
  }
  if (state.activeQuest) {
    const quest = QUESTS[state.activeQuest.id];
    if (quest.target === npc.id && state.activeQuest.stage === "travel") {
      buttons.splice(1, 0, `<button type="button" data-menu="askQuest" data-npc="${npc.id}">${quest.ask}</button>`);
    }
    if (quest.giver === npc.id && state.activeQuest.stage === "return") {
      buttons.splice(1, 0, `<button type="button" data-menu="turnIn" data-npc="${npc.id}">Report back: ${quest.title}</button>`);
    }
  }
  buttons.push(`<button type="button" data-menu="trade" data-npc="${npc.id}">Trade / sell items</button>`);
  buttons.push(`<button type="button" data-menu="travel" data-npc="${npc.id}">Travel gate</button>`);
  buttons.push(`<button type="button" data-menu="close">Leave</button>`);
  showPanel(buttons.join(""), npc.name, "talk");
}

function showQuestList(npc) {
  const nextOpenQuestId = npc.questIds.find((id) => !state.completedQuests.has(id));
  const rows = npc.questIds.map((id) => {
    const quest = QUESTS[id];
    if (state.completedQuests.has(id)) {
      return `<button type="button" disabled>${quest.title} - complete</button>`;
    }
    if (state.activeQuest && state.activeQuest.id === id) {
      return `<button type="button" disabled>${quest.title} - active</button>`;
    }
    if (state.activeQuest) {
      return `<button type="button" disabled>${quest.title} - finish current quest first</button>`;
    }
    if (id !== nextOpenQuestId) {
      return `<button type="button" disabled>${quest.title} - complete earlier ${npc.name} quests first</button>`;
    }
    return `<button type="button" data-menu="acceptQuest" data-quest="${id}">${quest.title}: ${quest.brief}</button>`;
  }).join("");
  showPanel(`${rows}<button type="button" data-menu="back" data-npc="${npc.id}">Back</button>`, `${npc.name}: Quests`, "quest");
}

function acceptQuest(id) {
  const quest = QUESTS[id];
  if (!quest || state.activeQuest || state.completedQuests.has(id)) return;
  const target = npcById(quest.target);
  state.activeQuest = { id, stage: "travel" };
  state.quest = `${quest.title}: go to ${target.name}.`;
  state.journal = quest.brief;
  updateHud();
  saveGame();
  hidePanel();
  showDialogue(npcById(quest.giver).name, quest.brief, `Find ${target.name} and choose the quest question.`, "quest");
}

function askQuestTarget(npc) {
  const active = state.activeQuest;
  if (!active) return;
  const quest = QUESTS[active.id];
  if (quest.target !== npc.id || active.stage !== "travel") return;
  active.stage = "return";
  const giver = npcById(quest.giver);
  addKnowledge(1);
  state.quest = `${quest.title}: return to ${giver.name}.`;
  state.journal = quest.clue;
  updateHud();
  saveGame();
  hidePanel();
  showDialogue(npc.name, quest.clue, `Return to ${giver.name} and report back.`, "question");
}

function showTurnInQuestion(npc) {
  const active = state.activeQuest;
  if (!active) return;
  const quest = QUESTS[active.id];
  if (quest.giver !== npc.id || active.stage !== "return") return;
  pendingQuestTurnIn = quest;
  showPanel(renderShuffledAnswers(quest.answers, "quest-answer"), quest.question, "question");
}

function answerQuest(index) {
  const quest = pendingQuestTurnIn;
  if (!quest) return;
  pendingQuestTurnIn = null;
  hidePanel();
  if (index !== quest.correct) {
    const giver = npcById(quest.giver);
    showDialogue(giver.name, `Not quite. Remember: ${quest.clue}`, "Open the report option and try again.", "wrong");
    return;
  }
  completeQuest(quest);
}

function completeQuest(quest) {
  const questId = state.activeQuest?.id;
  const questLocationId = questId ? getQuestLocationId(questId) : state.currentLocation;
  const reward = quest.reward;
  const coins = questCoinReward(reward, questLocationId);
  addCoins(coins);
  const addedItems = (reward.items || (reward.item ? [reward.item] : [])).filter(addItem);
  addKnowledge(2);
  awardStats({ ...statRewardForRegion(questLocationId), focus: -3, spark: 1 });
  const storyNote = markStoryFlag(REGION_STORY_FLAGS[questLocationId]);
  if (questId) state.completedQuests.add(questId);
  state.activeQuest = null;
  const location = currentLocation();
  const unfinished = location.questIds.filter((id) => !state.completedQuests.has(id)).length;
  state.quest = unfinished ? `${location.name}: ${unfinished} quest${unfinished === 1 ? "" : "s"} left.` : `${location.name}: use Travel gate for 3 questions.`;
  const levelHint = state.stats.statPoints ? " Open Character (C) to spend your new stat points." : "";
  const rewardText = itemRewardText({ items: addedItems, coins }, coins);
  state.journal = `${quest.title} complete. Reward: ${rewardText}.${storyNote}${levelHint}`;
  updateHud();
  saveGame();
  showDialogue(npcById(quest.giver).name, `${quest.feedback} Reward: ${rewardText}.${storyNote}${levelHint}`, "Choose another quest or equip your rewards.", "reward");
}

function hasUniqueItem(id) {
  const item = ITEMS[id];
  return Boolean(item && ["outfit", "tool", "quest", "treasure"].includes(item.type) && state.inventory.includes(id));
}

function renderShopRows(npc) {
  const stock = npc.vendor?.stock || [];
  if (!stock.length) return `<button type="button" disabled>No stock available yet.</button>`;
  return stock.map((entry, index) => {
    const item = ITEMS[entry.item];
    if (!item) return "";
    const owned = hasUniqueItem(entry.item);
    const affordable = state.coins >= entry.price;
    const disabled = owned || !affordable ? " disabled" : "";
    const status = owned ? "Owned" : affordable ? `Buy ${entry.price}c` : `Need ${entry.price}c`;
    return `
      <div class="shop-row">
        ${itemThumb(entry.item)}
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(entry.note || item.description)}</small>
        </div>
        <button type="button" data-shop-buy="${index}" data-npc="${npc.id}"${disabled}>${status}</button>
      </div>
    `;
  }).join("");
}

function buyShopItem(npc, stockIndex) {
  if (!npc?.vendor) return;
  const entry = npc.vendor.stock[stockIndex];
  const item = entry ? ITEMS[entry.item] : null;
  if (!entry || !item) return;
  if (hasUniqueItem(entry.item)) {
    state.journal = `${item.name} is already in your backpack.`;
    updateHud();
    showTradeMenu(npc);
    return;
  }
  if (state.coins < entry.price) {
    state.journal = `Not enough coins for ${item.name}.`;
    updateHud();
    showTradeMenu(npc);
    return;
  }
  state.coins -= entry.price;
  addItem(entry.item);
  showTradeMenu(npc);
  state.journal = `${npc.name} sold you ${item.name} for ${entry.price} coins.`;
  updateHud();
  saveGame();
}

function showTradeMenu(npc) {
  if (npc.vendor) {
    const html = `
      <div class="shop-summary"><strong>${escapeHtml(npc.vendor.title)}</strong><small>Coins: ${state.coins}</small></div>
      <div class="shop-list">${renderShopRows(npc)}</div>
      <button type="button" data-menu="back" data-npc="${npc.id}">Back</button>
    `;
    state.journal = `${npc.name} has useful supplies for this region.`;
    updateHud();
    showPanel(html, `${npc.name}: Trade`, "talk");
    return;
  }
  state.journal = `Stand near ${npc.name} and use Sell buttons in your inventory.`;
  updateHud();
  showPanel(`<button type="button" disabled>Use the Sell buttons in the inventory panel.</button><button type="button" data-menu="back" data-npc="${npc.id}">Back</button>`, `${npc.name}: Trade`, "talk");
}

function showTravelGate(npc) {
  const location = currentLocation();
  if (!location.next) {
    const examScore = state.miniGameScores.examSimulation?.score;
    const ready = Number.isFinite(examScore);
    showPanel(`<button type="button" data-menu="finalExam" data-npc="${npc.id}">${ready ? "Retake Exam Simulation" : "Sit Exam Simulation"}</button><button type="button" data-menu="finalEnding"${ready ? "" : " disabled"}>${ready ? `Face final ending (${examSimulationSummaryText()})` : "Complete Exam Simulation first"}</button><button type="button" data-menu="back" data-npc="${npc.id}">Back</button>`, location.name, "reward");
    return;
  }
  const unfinished = location.questIds.filter((id) => !state.completedQuests.has(id));
  if (unfinished.length) {
    showPanel(`<button type="button" disabled>Finish ${unfinished.length} regional quest${unfinished.length === 1 ? "" : "s"} before travelling.</button><button type="button" data-menu="back" data-npc="${npc.id}">Back</button>`, location.travel, "stern");
    return;
  }
  state.pendingGate = { location: state.currentLocation, index: 0, npc: npc.id };
  saveGame();
  showGateQuestion();
}

function showGateQuestion() {
  const gate = state.pendingGate;
  if (!gate) return;
  const location = WORLD[gate.location];
  const check = location.gateQuestions[gate.index];
  showPanel(renderShuffledAnswers(check.answers, "gate-answer"), `${location.travel}: Question ${gate.index + 1}/3`, "gate");
}

function answerGate(index) {
  const gate = state.pendingGate;
  if (!gate) return;
  const location = WORLD[gate.location];
  const check = location.gateQuestions[gate.index];
  if (index !== check.correct) {
    state.pendingGate = null;
    hidePanel();
    saveGame();
    showDialogue("Travel Gate", `Not quite. Review ${location.name} quests, then try the travel gate again.`, "Press E to close.", "wrong");
    return;
  }
  if (gate.index < 2) {
    gate.index += 1;
    saveGame();
    showGateQuestion();
    return;
  }
  state.pendingGate = null;
  state.unlockedLocations.add(location.next);
  if (!state.badges.includes(location.badge)) addBadge(location.badge);
  setLocation(location.next);
  if (!showStoryForLocation(location.next)) {
    showDialogue("New Region Unlocked", `${currentLocation().name} is now open.`, "Talk to local NPCs to start the next set of quests.", "reward");
  }
}

function closeQuestion() {
  activeQuestion = null;
  activeCheckIndex = 0;
  choicePanel.classList.add("hidden");
  choicePanel.innerHTML = "";
}

function completeNpc(npc) {
  state.completed.add(npc.id);
  addKnowledge(20);
  addBadge(npc.badge);
  addCoins(npc.reward.coins);
  const rewardItems = npc.reward.items || [npc.reward.item];
  rewardItems.forEach(addItem);
  state.quest = npc.quest;
  const itemNames = rewardItems.map((id) => ITEMS[id].name).join(", ");
  state.journal = `Reward: ${itemNames} and ${npc.reward.coins} coins.`;
  showDialogue(
    npc.name,
    `${npc.feedback} You earned the ${npc.badge}, ${itemNames}, and ${npc.reward.coins} coins.`,
    "Equip, use, or sell items from your inventory.",
    "reward"
  );
}

function answer(index) {
  if (!activeQuestion) return;
  const npc = activeQuestion;
  const check = npc.checks[activeCheckIndex];
  if (index === check.correct) {
    if (activeCheckIndex < npc.checks.length - 1) {
      activeCheckIndex += 1;
      showQuestion(npc);
      return;
    }
    closeQuestion();
    completeNpc(npc);
    return;
  }
  closeQuestion();
  showDialogue(npc.name, `Almost. ${npc.feedback}`, "Press E to try again.", "wrong");
}

function interact() {
  if (activeQuestion) return;
  if (!choicePanel.classList.contains("hidden")) {
    hidePanel();
    return;
  }
  if (!dialogue.classList.contains("hidden")) {
    activeNpc = null;
    hideDialogue();
    return;
  }

  const found = findInteractable();
  if (!found) {
    showFloatingMessage(state.currentLocation === "examHall" ? "Stand on a gold practice mat and press E." : "No one is close enough to talk to.");
    return;
  }
  if (found.type === "sign") {
    showDialogue(found.item.title, found.item.body, "Press E to close.");
    return;
  }
  if (found.type === "buildingDoor") {
    enterBuildingDoor(found.item);
    return;
  }
  if (found.type === "studyStation") {
    showStudyStation(found.item);
    return;
  }
  if (found.type === "exitDoor") {
    leaveInterior();
    return;
  }
  if (found.type === "examRoom") {
    showExamPracticeRoom(found.item);
    return;
  }
  showNpcMenu(found.item);
}

function showFloatingMessage(text) {
  messageTimer = 110;
  dialogue.innerHTML = renderNpcWindow("Hint", text, "Walk up to a villager or sign.", "", "unsure");
  dialogue.classList.remove("hidden");
}

function movePlayer() {
  if (activeQuestion || !choicePanel.classList.contains("hidden") || !dialogue.classList.contains("hidden")) return;
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  if (dx && dy) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }
  if (dx < 0) state.player.dir = "left";
  if (dx > 0) state.player.dir = "right";
  if (dy < 0) state.player.dir = "up";
  if (dy > 0) state.player.dir = "down";
  const speed = 2.25;
  const nx = state.player.x + dx * speed;
  const ny = state.player.y + dy * speed;
  if (!isBlocked(nx, state.player.y, state.player.w, state.player.h)) state.player.x = nx;
  if (!isBlocked(state.player.x, ny, state.player.w, state.player.h)) state.player.y = ny;
  if (dx || dy) {
    state.player.step += 1;
    spawnFootstepDust();
    if (state.player.step % 45 === 0) saveGame();
  }
}

// §G9: small dust puff kicked up under the hero's feet while walking (reduced-motion gated).
function spawnFootstepDust() {
  if (settings.reducedMotion) return;
  if (state.player.step % 9 !== 0) return;
  const side = (state.player.step / 9) % 2 ? -3 : 3;
  footstepDust.push({
    x: state.player.x + state.player.w / 2 + side,
    y: state.player.y + state.player.h - 2,
    life: 0,
    ttl: 360 + Math.random() * 120,
    r: 2 + Math.random() * 1.5
  });
  if (footstepDust.length > 24) footstepDust.shift();
}

function updateFootstepDust(dt) {
  for (let i = footstepDust.length - 1; i >= 0; i -= 1) {
    const d = footstepDust[i];
    d.life += dt;
    if (d.life >= d.ttl) footstepDust.splice(i, 1);
  }
}

function drawFootstepDust() {
  if (settings.reducedMotion || !footstepDust.length) return;
  ctx.save();
  footstepDust.forEach((d) => {
    const t = d.life / d.ttl;
    const alpha = (1 - t) * 0.3;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#cdbfa6";
    ctx.beginPath();
    ctx.ellipse(d.x, d.y - t * 4, d.r + t * 3, (d.r + t * 3) * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function updateCamera() {
  const map = currentMap();
  const worldW = map[0].length * LOGICAL_TILE;
  const worldH = map.length * LOGICAL_TILE;
  const targetX = state.player.x + state.player.w / 2 - VIEW_W / 2;
  const targetY = state.player.y + state.player.h / 2 - VIEW_H / 2;
  camera.x = Math.max(0, Math.min(worldW - VIEW_W, targetX));
  camera.y = Math.max(0, Math.min(worldH - VIEW_H, targetY));
}

function inputKey(event) {
  const byCode = {
    ArrowLeft: "arrowleft",
    ArrowRight: "arrowright",
    ArrowUp: "arrowup",
    ArrowDown: "arrowdown",
    KeyA: "a",
    KeyD: "d",
    KeyW: "w",
    KeyS: "s",
    KeyE: "e",
    KeyR: "r",
    Digit1: "1",
    Digit2: "2",
    Digit3: "3"
  };
  return byCode[event.code] || event.key.toLowerCase();
}

function hashNoise(x, y, salt = 0) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
  const r = clamp((n >> 16) & 255);
  const g = clamp((n >> 8) & 255);
  const b = clamp(n & 255);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function locColors() {
  return currentLocation().visual || WORLD.village.visual;
}

const REGION_ATMOSPHERE = {
  village: { grade: [126, 184, 96], gradeAlpha: .09, vignette: .26, particle: "pollen", pColor: "rgba(247,242,198,", pCount: 26 },
  modernBritain: { grade: [92, 132, 184], gradeAlpha: .11, vignette: .30, particle: "dust", pColor: "rgba(220,230,246,", pCount: 22 },
  rightsLaw: { grade: [120, 110, 156], gradeAlpha: .12, vignette: .34, particle: "dust", pColor: "rgba(226,221,242,", pCount: 18 },
  democracy: { grade: [204, 172, 92], gradeAlpha: .10, vignette: .28, particle: "pollen", pColor: "rgba(250,236,192,", pCount: 22 },
  participation: { grade: [72, 162, 172], gradeAlpha: .11, vignette: .26, particle: "sparkle", pColor: "rgba(202,246,250,", pCount: 26 },
  actionWorkshop: { grade: [152, 178, 98], gradeAlpha: .10, vignette: .26, particle: "pollen", pColor: "rgba(242,246,202,", pCount: 22 },
  examHall: { grade: [120, 100, 162], gradeAlpha: .13, vignette: .38, particle: "dust", pColor: "rgba(226,216,246,", pCount: 18 },
  townHallInterior: { grade: [156, 122, 78], gradeAlpha: .15, vignette: .42, particle: "dust", pColor: "rgba(247,227,182,", pCount: 12 },
  libraryInterior: { grade: [120, 132, 162], gradeAlpha: .15, vignette: .42, particle: "dust", pColor: "rgba(236,236,246,", pCount: 12 },
  courtInterior: { grade: [132, 122, 152], gradeAlpha: .15, vignette: .44, particle: "dust", pColor: "rgba(236,229,246,", pCount: 12 },
  parkInterior: { grade: [132, 178, 112], gradeAlpha: .13, vignette: .40, particle: "pollen", pColor: "rgba(242,246,206,", pCount: 14 }
};

const atmosphereGradientCache = {};

function currentAtmosphere() {
  return REGION_ATMOSPHERE[state.currentLocation] || REGION_ATMOSPHERE.village;
}

function drawPixelPattern(x, y, w, h, colors, density, salt) {
  for (let i = 0; i < density; i += 1) {
    const px = x + Math.floor(hashNoise(i + x, y, salt) * w);
    const py = y + Math.floor(hashNoise(x, i + y, salt + 3) * h);
    rect(px, py, 2 + (i % 2), 1 + (i % 3 === 0 ? 1 : 0), colors[i % colors.length]);
  }
}

function tileKind(ch) {
  if (ch === "#") return "wall";
  if (ch === "~") return "water";
  if (ch === "=") return "dock";
  if (ch === ",") return "road";
  if (ch === ":") return "plaza";
  return "grass";
}

function tileAtMap(map, row, col) {
  if (!map[row]) return "#";
  return map[row][col] || "#";
}

function drawTileAsset(kind, x, y) {
  const image = getAssetImage(TILE_ASSETS[kind]);
  if (!image || !image.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, x, y, LOGICAL_TILE, LOGICAL_TILE);
  return true;
}

function drawTileVariation(kind, x, y, row, col) {
  if (kind !== "grass" && kind !== "road" && kind !== "plaza") return;
  const noise = hashNoise(col, row, 19);
  if (kind === "grass") {
    if (noise > .72) {
      rect(x + 6 + Math.floor(noise * 10), y + 7, 3, 2, "rgba(215,242,139,.85)");
      rect(x + 21, y + 21 + Math.floor(noise * 4), 4, 2, "rgba(67,124,69,.75)");
    }
    if (noise > .58) {
      const bx = x + 4 + Math.floor(hashNoise(col, row, 27) * 22);
      const by = y + 18 + Math.floor(hashNoise(row, col, 29) * 10);
      rect(bx, by, 1, 4, "rgba(58,108,58,.55)");
      rect(bx + 2, by + 1, 1, 3, "rgba(74,134,72,.5)");
    }
    if (noise > .9) {
      const fx = x + 7 + Math.floor(hashNoise(col, row, 41) * 16);
      const fy = y + 9 + Math.floor(hashNoise(row, col, 43) * 14);
      rect(fx, fy, 2, 2, "#f4e7a8");
      rect(fx + 3, fy + 1, 2, 2, "#eef4f7");
      rect(fx + 1, fy + 3, 1, 2, "#5aa14a");
    }
  }
  if (kind === "road" && noise > .68) rect(x + 6, y + 24, 10, 2, "rgba(70,58,48,.22)");
  if (kind === "plaza" && noise > .76) rect(x + 18, y + 6, 8, 1, "rgba(255,255,255,.18)");
}

function drawTileEdges(kind, x, y, row, col, map) {
  const top = tileKind(tileAtMap(map, row - 1, col));
  const right = tileKind(tileAtMap(map, row, col + 1));
  const bottom = tileKind(tileAtMap(map, row + 1, col));
  const left = tileKind(tileAtMap(map, row, col - 1));

  if (kind === "water") {
    drawWaterFoam(x, y, top, right, bottom, left, row, col);
    return;
  }

  const wTop = top === "water";
  const wRight = right === "water";
  const wBottom = bottom === "water";
  const wLeft = left === "water";
  if (kind === "grass") {
    if (wTop || wRight || wBottom || wLeft) {
      drawBeachEdges(x, y, wTop, wRight, wBottom, wLeft, row, col);
    } else {
      const tl = tileKind(tileAtMap(map, row - 1, col - 1)) === "water";
      const tr = tileKind(tileAtMap(map, row - 1, col + 1)) === "water";
      const bl = tileKind(tileAtMap(map, row + 1, col - 1)) === "water";
      const br = tileKind(tileAtMap(map, row + 1, col + 1)) === "water";
      if (tl || tr || bl || br) drawBeachCorners(x, y, tl, tr, bl, br);
    }
  }

  if (kind === "road" || kind === "plaza") {
    drawPavingEdges(x, y, top, right, bottom, left, row, col);
  }
}

function drawWaterFoam(x, y, top, right, bottom, left, row, col) {
  const T = LOGICAL_TILE;
  const foam = "rgba(236,248,244,.82)";
  const foam2 = "rgba(188,234,238,.5)";
  if (top !== "water") { rect(x, y, T, 3, foam); rect(x, y + 3, T, 2, foam2); }
  if (bottom !== "water") { rect(x, y + T - 3, T, 3, foam); rect(x, y + T - 5, T, 2, foam2); }
  if (left !== "water") { rect(x, y, 3, T, foam); rect(x + 3, y, 2, T, foam2); }
  if (right !== "water") { rect(x + T - 3, y, 3, T, foam); rect(x + T - 5, y, 2, T, foam2); }
  if (!settings.reducedMotion) {
    const pulse = 0.5 + 0.5 * Math.sin(animationClockMs / 520 + (row + col) * 0.7);
    const a = (0.22 + 0.4 * pulse).toFixed(2);
    const shimmer = `rgba(255,255,255,${a})`;
    if (top !== "water") rect(x, y, T, 1, shimmer);
    if (bottom !== "water") rect(x, y + T - 1, T, 1, shimmer);
    if (left !== "water") rect(x, y, 1, T, shimmer);
    if (right !== "water") rect(x + T - 1, y, 1, T, shimmer);
  }
}

function drawBeachEdges(x, y, wTop, wRight, wBottom, wLeft, row, col) {
  const T = LOGICAL_TILE;
  const sand = "#d8c089";
  const sandLt = "#ead8a6";
  const sandDk = "#bd9f60";
  const band = 8;
  if (wTop) { rect(x, y, T, band, sand); rect(x, y, T, 2, sandLt); rect(x, y + band - 2, T, 2, sandDk); }
  if (wBottom) { rect(x, y + T - band, T, band, sand); rect(x, y + T - 2, T, 2, sandLt); rect(x, y + T - band, T, 2, sandDk); }
  if (wLeft) { rect(x, y, band, T, sand); rect(x, y, 2, T, sandLt); rect(x + band - 2, y, 2, T, sandDk); }
  if (wRight) { rect(x + T - band, y, band, T, sand); rect(x + T - 2, y, 2, T, sandLt); rect(x + T - band, y, 2, T, sandDk); }
  if (hashNoise(col, row, 31) > .45) {
    const px = x + 5 + Math.floor(hashNoise(col, row, 5) * (T - 10));
    const py = y + 5 + Math.floor(hashNoise(row, col, 7) * (T - 10));
    rect(px, py, 2, 2, "rgba(122,98,58,.5)");
  }
}

function drawBeachCorners(x, y, tl, tr, bl, br) {
  const T = LOGICAL_TILE;
  const sand = "#d8c089";
  const s = 7;
  if (tl) rect(x, y, s, s, sand);
  if (tr) rect(x + T - s, y, s, s, sand);
  if (bl) rect(x, y + T - s, s, s, sand);
  if (br) rect(x + T - s, y + T - s, s, s, sand);
}

function drawPavingEdges(x, y, top, right, bottom, left, row, col) {
  const T = LOGICAL_TILE;
  const shade = "rgba(45,62,32,.22)";
  const blade = "#5aa14a";
  const bladeLt = "#82c468";
  if (top === "grass") {
    rect(x, y, T, 2, shade);
    for (let i = 3; i < T - 3; i += 7) {
      if (hashNoise(col, row * 4 + i, 17) < .5) continue;
      rect(x + i, y, 2, 4, blade);
      rect(x + i + 1, y, 1, 2, bladeLt);
    }
  }
  if (bottom === "grass") {
    rect(x, y + T - 2, T, 2, shade);
    for (let i = 3; i < T - 3; i += 7) {
      if (hashNoise(col, row * 4 + i, 19) < .5) continue;
      rect(x + i, y + T - 4, 2, 4, blade);
      rect(x + i + 1, y + T - 2, 1, 2, bladeLt);
    }
  }
  if (left === "grass") {
    rect(x, y, 2, T, shade);
    for (let i = 3; i < T - 3; i += 7) {
      if (hashNoise(col * 4 + i, row, 21) < .5) continue;
      rect(x, y + i, 4, 2, blade);
      rect(x, y + i + 1, 2, 1, bladeLt);
    }
  }
  if (right === "grass") {
    rect(x + T - 2, y, 2, T, shade);
    for (let i = 3; i < T - 3; i += 7) {
      if (hashNoise(col * 4 + i, row, 23) < .5) continue;
      rect(x + T - 4, y + i, 4, 2, blade);
      rect(x + T - 2, y + i + 1, 2, 1, bladeLt);
    }
  }
}

function drawTile(ch, x, y, row = 0, col = 0, map = currentMap()) {
  const kind = tileKind(ch);
  if (drawTileAsset(kind, x, y)) {
    drawTileVariation(kind, x, y, row, col);
    drawTileEdges(kind, x, y, row, col, map);
    if (ch === "T") drawTreeTile(x, y);
    return;
  }
  const visual = locColors();
  if (ch === "#") {
    rect(x, y, LOGICAL_TILE, LOGICAL_TILE, "#3f4738");
    rect(x + 2, y + 2, LOGICAL_TILE - 4, LOGICAL_TILE - 4, "#626d55");
    rect(x + 4, y + 4, LOGICAL_TILE - 8, 2, "#788365");
    rect(x + 4, y + LOGICAL_TILE - 7, LOGICAL_TILE - 8, 3, "#323a2f");
    rect(x + LOGICAL_TILE - 7, y + 4, 3, LOGICAL_TILE - 10, "#4e5947");
    rect(x + 6, y + 12, 7, 2, "#778268");
    rect(x + 17, y + 21, 9, 2, "#394235");
    return;
  }
  if (ch === "~") {
    rect(x, y, LOGICAL_TILE, LOGICAL_TILE, visual.water || "#226b78");
    rect(x, y + 18, LOGICAL_TILE, 14, "#1d5968");
    const wave = Math.floor(state.player.step / 18) % 3;
    rect(x + 4 + wave, y + 8, 14, 2, "#63b7bf");
    rect(x + 12, y + 22 - wave, 16, 2, "#3d8f9a");
    rect(x + 2, y + 2, 2, 28, "rgba(255, 255, 255, .08)");
    return;
  }
  if (ch === "=") {
    rect(x, y, LOGICAL_TILE, LOGICAL_TILE, "#8f5b3f");
    rect(x, y + 2, LOGICAL_TILE, 4, "#b77752");
    rect(x, y + 15, LOGICAL_TILE, 3, "#c98a60");
    rect(x, y + 28, LOGICAL_TILE, 2, "#653d31");
    rect(x + 5, y + 4, 2, 24, "#5c362d");
    rect(x + 25, y + 4, 2, 24, "#5c362d");
    return;
  }
  if (ch === "," || ch === ":") {
    const base = ch === "," ? (visual.road || "#a8a79d") : "#8f9290";
    rect(x, y, LOGICAL_TILE, LOGICAL_TILE, base);
    rect(x, y + 20, LOGICAL_TILE, 12, "rgba(40, 34, 30, .12)");
    for (let sx = x + 2; sx < x + LOGICAL_TILE; sx += 11) {
      rect(sx, y + 3, 8, 2, "rgba(255,255,255,.14)");
      rect(sx + 2, y + 17, 7, 2, "rgba(60,50,45,.18)");
      rect(sx - 3, y + 29, 9, 2, "rgba(255,255,255,.10)");
    }
    if (ch === ":") {
      rect(x + 2, y + 2, LOGICAL_TILE - 4, LOGICAL_TILE - 4, "rgba(245,240,223,.09)");
      rect(x + 4, y + 15, LOGICAL_TILE - 8, 2, "rgba(40,35,35,.18)");
    }
    return;
  }
  rect(x, y, LOGICAL_TILE, LOGICAL_TILE, visual.sky || "#63a858");
  rect(x, y + 20, LOGICAL_TILE, 12, "rgba(45, 92, 48, .28)");
  drawPixelPattern(x + 2, y + 2, LOGICAL_TILE - 4, LOGICAL_TILE - 4, ["#78c86d", "#4f8f4a", "#9bd37c", "#467a45"], 8, 9);
  for (let i = 0; i < 4; i += 1) {
    const px = x + 3 + Math.floor(hashNoise(x, y, i) * 24);
    const py = y + 3 + Math.floor(hashNoise(y, x, i) * 24);
    rect(px, py, 3, 2, i % 2 ? "#d7f28b" : "#4f8f4a");
  }
  if (ch === "T") {
    drawTreeTile(x, y);
  }
}

function drawTreeTile(x, y) {
  const cx = x + 16;
  ctx.save();
  ctx.globalAlpha = .18;
  ctx.fillStyle = "#16240f";
  ctx.beginPath();
  ctx.ellipse(cx + 4, y + 30, 12, 4, -0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .26;
  ctx.beginPath();
  ctx.ellipse(cx + 1, y + 29, 9, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  rect(x + 13, y + 16, 6, 14, "#6a4a32");
  rect(x + 13, y + 16, 2, 14, "#7e5a3e");
  rect(x + 17, y + 16, 2, 14, "#553823");
  const blob = (bx, by, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(cx, y + 11, 12, "#2f6f39");
  blob(cx - 5, y + 12, 7, "#367c41");
  blob(cx + 5, y + 12, 7, "#367c41");
  blob(cx, y + 8, 9, "#46924f");
  blob(cx - 4, y + 8, 5, "#5aa85e");
  blob(cx + 3, y + 6, 4, "#74c06e");
  ctx.fillStyle = "#9bd888";
  ctx.fillRect(cx - 6, y + 5, 2, 2);
  ctx.fillRect(cx + 1, y + 3, 2, 2);
}

function paintUnionJack(x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "#012169";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = h * 0.34;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  ctx.strokeStyle = "#c8102e";
  ctx.lineWidth = h * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x, y + h);
  ctx.stroke();
  const vw = h * 0.4;
  const hh = h * 0.4;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x + w / 2 - vw / 2, y, vw, h);
  ctx.fillRect(x, y + h / 2 - hh / 2, w, hh);
  const vw2 = vw * 0.55;
  const hh2 = hh * 0.55;
  ctx.fillStyle = "#c8102e";
  ctx.fillRect(x + w / 2 - vw2 / 2, y, vw2, h);
  ctx.fillRect(x, y + h / 2 - hh2 / 2, w, hh2);
  ctx.restore();
}

function drawWavingUnionJack(x, y, w, h, phase, dir) {
  if (phase === null) {
    paintUnionJack(x, y, w, h);
    return;
  }
  const strips = 5;
  for (let i = 0; i < strips; i += 1) {
    const t = (i + 0.5) / strips;
    const distFromPole = dir === 1 ? t : 1 - t;
    const off = Math.sin(phase + distFromPole * 4) * 1.8 * distFromPole;
    const sx = x + (w * i) / strips - 0.5;
    const sw = w / strips + 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, y - 4, sw, h + 8);
    ctx.clip();
    paintUnionJack(x, y + off, w, h);
    ctx.restore();
  }
}

function isCivicBuilding(label) {
  const l = (label || "").toLowerCase();
  return ["hall", "court", "parliament", "police", "election", "council", "rights", "museum", "devolve", "petition", "union", "party", "government", "civic"].some((k) => l.includes(k));
}

function drawBuildingFlag(x, y, w, h) {
  const poleX = x + 8;
  const poleTop = y - 58;
  rect(poleX, poleTop, 3, 60, "#6b5a44");
  rect(poleX, poleTop, 3, 26, "#7c6a50");
  rect(poleX - 1, poleTop - 4, 5, 4, "#e8c45a");
  const phase = settings.reducedMotion ? null : animationClockMs / 210 + (x + y) * 0.05;
  drawWavingUnionJack(poleX + 3, poleTop + 2, 26, 16, phase, 1);
}

// === SECTION: BUILDING EXTERIORS BY PURPOSE (§G4) ===
// Each building has a `kind` (set in WORLD_LAYOUTS, with a label-keyword fallback)
// that drives a recognisable roofline silhouette and an entrance group, while the
// shared base (walls/windows/door/sign) keeps door positions and reachability stable.
function buildingKindFromLabel(label) {
  const l = (label || "").toLowerCase();
  if (/(town hall|city hall|parliament|council|devolve|government|civic)/.test(l)) return "townhall";
  if (/(court|rights aid|tribunal|justice|magistrate)/.test(l)) return "court";
  if (/(library|archive|museum|sources|research|reading|records)/.test(l)) return "library";
  if (/(printworks|signal|press|media|broadcast|survey|studio)/.test(l)) return "press";
  if (/police/.test(l)) return "police";
  if (/(park|garden|volunteer|green|grove|allotment)/.test(l)) return "garden";
  if (/(identify|describe|explain|evaluate)/.test(l)) return "exam";
  if (/(election|petition|campaign|party|union|planning|impact|rally|hub|action)/.test(l)) return "campaign";
  return "generic";
}

// Classic tiled gabled roof + corner chimney (used by campaign + generic fallback).
function drawBuildingRoofClassic(x, y, w, h, roof) {
  rect(x + w - 20, y - 42, 12, 22, "#5b3434");
  rect(x + w - 18, y - 48, 8, 6, "#7d4840");
  rect(x + w - 18, y - 39, 8, 2, "#2d2521");
  rect(x - 10, y - 22, w + 20, 20, "#4d2c2b");
  rect(x - 5, y - 17, w + 10, 18, roof);
  rect(x - 8, y - 20, w + 16, 4, "#2d2521");
  for (let tx = x - 2; tx < x + w + 4; tx += 16) {
    rect(tx, y - 14, 12, 4, "#7d4840");
    rect(tx + 5, y - 7, 12, 4, "#9a5a4d");
    rect(tx + 1, y - 12, 3, 2, "#c18470");
  }
  rect(x - 7, y - 1, w + 14, 3, "#2d2521");
  rect(x - 2, y + 1, w + 4, 3, "rgba(255,255,255,.18)");
}

function drawBuildingRoof(kind, x, y, w, h, roof, wall) {
  const cx = Math.round(x + w / 2);
  const rdk = "#2d2521";
  const rlt = shadeHex(roof, 24);
  if (kind === "garden") {
    const leaf = "#3f8a47", leafLt = "#5bb45e", leafDk = "#2c6a34";
    rect(x - 10, y - 18, w + 20, 18, leafDk);
    rect(x - 6, y - 15, w + 12, 15, leaf);
    rect(x - 6, y - 15, w + 12, 3, leafLt);
    for (let sx = x - 8; sx < x + w + 8; sx += 12) {
      rect(sx, y - 1, 12, 4, leafDk);
      rect(sx + 2, y, 8, 2, leaf);
    }
    rect(cx - 2, y - 27, 4, 10, "#6b5a44");
    rect(cx - 5, y - 30, 10, 5, "#ffd95e");
    rect(cx - 3, y - 29, 6, 3, "#ffe9a8");
    return;
  }
  if (kind === "townhall") {
    rect(x - 6, y - 18, w + 12, 18, rdk);
    rect(x - 3, y - 15, w + 6, 15, roof);
    rect(x - 3, y - 15, w + 6, 3, rlt);
    const tw = 30, tx = cx - 15;
    rect(tx - 3, y - 20, tw + 6, 6, rdk);
    rect(tx - 2, y - 58, tw + 4, 42, "#26201c");
    rect(tx, y - 56, tw, 40, shadeHex(wall, -2));
    rect(tx, y - 56, 3, 40, shadeHex(wall, 16));
    rect(tx + tw - 3, y - 56, 3, 40, shadeHex(wall, -18));
    rect(cx - 8, y - 54, 16, 14, rdk);
    rect(cx - 6, y - 52, 12, 10, "#f5efdb");
    rect(cx - 6, y - 52, 12, 2, "#fffaf0");
    rect(cx - 1, y - 48, 2, 2, "#3a2f2a");
    rect(cx - 3, y - 50, 2, 3, "#3a2f2a");
    rect(cx + 2, y - 50, 2, 3, "#3a2f2a");
    ctx.save();
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(tx - 4, y - 56); ctx.lineTo(cx, y - 70); ctx.lineTo(tx + tw + 4, y - 56); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rdk;
    ctx.beginPath(); ctx.moveTo(cx, y - 70); ctx.lineTo(tx + tw + 4, y - 56); ctx.lineTo(cx, y - 56); ctx.closePath(); ctx.fill();
    ctx.restore();
    rect(cx - 1, y - 80, 2, 11, "#6b5a44");
    rect(cx - 3, y - 82, 6, 4, "#f2c14e");
    return;
  }
  if (kind === "court") {
    const stone = shadeHex(wall, 6), stoneLt = shadeHex(wall, 20), stoneDk = shadeHex(wall, -18);
    rect(x - 8, y - 14, w + 16, 14, rdk);
    rect(x - 6, y - 12, w + 12, 12, stone);
    rect(x - 6, y - 12, w + 12, 3, stoneLt);
    rect(x - 8, y - 2, w + 16, 3, stoneDk);
    ctx.save();
    ctx.fillStyle = rdk;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 12); ctx.lineTo(cx, y - 48); ctx.lineTo(x + w + 8, y - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = stone;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 13); ctx.lineTo(cx, y - 44); ctx.lineTo(x + w + 3, y - 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = stoneLt;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 13); ctx.lineTo(cx, y - 44); ctx.lineTo(cx, y - 13); ctx.closePath(); ctx.fill();
    ctx.restore();
    rect(cx - 3, y - 47, 6, 6, "#caa64a");
    rect(cx - 2, y - 46, 4, 4, "#f2d479");
    return;
  }
  if (kind === "library") {
    rect(x - 8, y - 19, w + 16, 19, rdk);
    rect(x - 5, y - 16, w + 10, 16, roof);
    rect(x - 5, y - 16, w + 10, 3, rlt);
    for (let tx = x - 4; tx < x + w + 4; tx += 9) rect(tx, y - 3, 5, 3, rdk);
    rect(cx - 14, y - 15, 28, 12, "#6f4633");
    rect(cx - 13, y - 14, 13, 10, "#f3ead0");
    rect(cx, y - 14, 13, 10, "#e7dcc4");
    rect(cx - 1, y - 14, 2, 10, "#8a6f4f");
    for (let i = 1; i < 4; i += 1) {
      rect(cx - 11, y - 14 + i * 2, 9, 1, "#bdae8f");
      rect(cx + 2, y - 14 + i * 2, 9, 1, "#b0a283");
    }
    return;
  }
  if (kind === "press") {
    rect(x - 8, y - 18, w + 16, 18, rdk);
    rect(x - 5, y - 15, w + 10, 15, roof);
    rect(x - 5, y - 15, w + 10, 3, rlt);
    rect(x + 8, y - 60, 14, 44, "#5b3434");
    rect(x + 8, y - 60, 14, 4, "#7d4840");
    rect(x + 9, y - 56, 12, 2, "#3a2422");
    rect(x + 10, y - 42, 10, 2, "#3a2422");
    rect(x + 10, y - 28, 10, 2, "#3a2422");
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = "#cfd2cf";
    [[-2, -68, 5], [3, -75, 6], [1, -83, 7]].forEach(([dx, dy, r]) => {
      ctx.beginPath(); ctx.arc(x + 15 + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
    rect(x + w - 14, y - 50, 2, 34, "#6a6f74");
    rect(x + w - 20, y - 44, 14, 2, "#6a6f74");
    rect(x + w - 18, y - 38, 10, 2, "#6a6f74");
    rect(x + w - 15, y - 54, 4, 4, settings.reducedMotion ? "#e36b5d" : (Math.floor(animationClockMs / 500) % 2 ? "#ff5a4d" : "#7a2820"));
    return;
  }
  if (kind === "police") {
    rect(x - 8, y - 18, w + 16, 18, rdk);
    rect(x - 5, y - 15, w + 10, 15, roof);
    rect(x - 5, y - 15, w + 10, 3, rlt);
    for (let i = 0, sx = x - 4; sx < x + w + 4; sx += 6, i += 1) {
      rect(sx, y - 6, 6, 6, i % 2 ? "#1f3f7a" : "#f4f6fb");
    }
    rect(x - 6, y - 7, w + 12, 1, "#16233a");
    rect(x - 6, y, w + 12, 1, "#16233a");
    return;
  }
  if (kind === "exam") {
    const stone = shadeHex(wall, 4), stoneLt = shadeHex(wall, 18), stoneDk = shadeHex(wall, -20);
    rect(x - 8, y - 16, w + 16, 16, stoneDk);
    rect(x - 6, y - 14, w + 12, 14, stone);
    rect(x - 6, y - 14, w + 12, 3, stoneLt);
    for (let sx = x - 6; sx < x + w + 4; sx += 14) {
      rect(sx, y - 22, 8, 8, stone);
      rect(sx, y - 22, 8, 2, stoneLt);
      rect(sx, y - 22, 2, 8, shadeHex(stone, 10));
    }
    rect(x - 8, y - 14, 2, 14, stoneDk);
    rect(x + w + 6, y - 14, 2, 14, stoneDk);
    rect(cx - 8, y - 13, 16, 12, "#3a4f74");
    rect(cx - 6, y - 11, 12, 8, "#52688f");
    rect(cx - 1, y - 12, 2, 11, "#cdd6e6");
    rect(cx - 6, y - 8, 12, 1, "#cdd6e6");
    return;
  }
  drawBuildingRoofClassic(x, y, w, h, roof);
  if (kind === "campaign") {
    const colors = ["#e36b5d", "#f2c14e", "#5da9e9", "#6fbf73"];
    rect(x - 2, y - 25, w + 4, 1, "#5a4632");
    for (let i = 0, sx = x; sx < x + w; sx += 15, i += 1) {
      ctx.save();
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.moveTo(sx, y - 24); ctx.lineTo(sx + 11, y - 24); ctx.lineTo(sx + 5, y - 16); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

function drawBuilding(x, y, w, h, wall, roof, label, kind) {
  const buildingKind = kind || buildingKindFromLabel(label);
  ctx.save();
  ctx.globalAlpha = .16;
  ctx.fillStyle = "#1a2410";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + h + 1);
  ctx.lineTo(x + w + 6, y + h + 1);
  ctx.lineTo(x + w + 20, y + h + 13);
  ctx.lineTo(x + 24, y + h + 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  rect(x + 5, y + h - 2, w + 10, 9, "rgba(0, 0, 0, .32)");
  rect(x - 7, y + h + 5, w + 16, 5, "rgba(0, 0, 0, .18)");
  drawBuildingRoof(buildingKind, x, y, w, h, roof, wall);
  rect(x, y, w, h, wall);
  drawPixelPattern(x + 3, y + 4, w - 6, h - 26, ["rgba(255,255,255,.16)", "rgba(80,60,45,.14)"], 14, x + y);
  for (let by = y + 8; by < y + h - 25; by += 12) {
    for (let bx = x + 6 + ((by / 12) % 2 ? 8 : 0); bx < x + w - 8; bx += 18) {
      rect(bx, by, 8, 1, "rgba(82,64,52,.18)");
    }
  }
  rect(x, y + h - 20, w, 20, "#9a9284");
  for (let sx = x + 4; sx < x + w - 4; sx += 18) {
    rect(sx, y + h - 18, 14, 2, "#6f685f");
    rect(sx + 1, y + h - 10, 12, 2, "#b7aca0");
  }
  rect(x + 8, y + 8, 24, 24, "#5b3434");
  rect(x + 12, y + 12, 16, 16, "#9f504b");
  rect(x + 14, y + 14, 12, 3, "#d17870");
  rect(x + 7, y + 6, 26, 4, "#3f2c2a");
  rect(x + 10, y + 31, 20, 3, "#6d4939");
  rect(x + w - 34, y + 10, 24, 22, "#513b35");
  rect(x + w - 30, y + 14, 16, 14, "#d0a56d");
  rect(x + w - 28, y + 16, 12, 3, "#f1c986");
  rect(x + w - 22, y + 14, 2, 14, "#513b35");
  rect(x + w - 30, y + 20, 16, 2, "#513b35");
  rect(x + w / 2 - 11, y + h - 28, 22, 28, "#49342d");
  rect(x + w / 2 - 13, y + h - 30, 26, 4, "#2d2521");
  rect(x + w / 2 - 7, y + h - 24, 14, 19, "#805344");
  rect(x + w / 2 - 5, y + h - 22, 10, 3, "#a96e55");
  rect(x + w / 2 + 4, y + h - 15, 3, 3, "#f2c14e");
  rect(x - 4, y, 4, h, "#6e5f56");
  rect(x + w, y, 4, h, "#5c5049");
  rect(x + 4, y + h - 4, w - 8, 2, "#eee1c0");
  const signW = Math.max(54, label.length * 7);
  const signX = x + w / 2 - signW / 2;
  const signY = y - 39;
  rect(signX - 2, signY - 2, signW + 4, 16, "#513b35");
  rect(signX, signY, signW, 12, "#e6d3a4");
  rect(signX + 2, signY + 2, signW - 4, 1, "#fff3d0");
  rect(x + w / 2 - 2, signY + 14, 4, 8, "#513b35");
  ctx.fillStyle = "#4d2c2b";
  ctx.font = "10px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, signY + 9);
  drawBuildingEntrance(buildingKind, x, y, w, h, wall, label);
}

function drawPerson(person) {
  const style = npcStyle(person);
  const role = npcRole(person);
  const x = person.x;
  const y = person.y;
  const outline = "#1b232c";
  ctx.save();
  ctx.globalAlpha = .28;
  ctx.fillStyle = "#10160f";
  ctx.beginPath();
  ctx.ellipse(x + 12, y + 46, 15, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  rect(x + 5, y + 38, 7, 9, "#2b2d2f");
  rect(x + 17, y + 38, 7, 9, "#1f2224");
  rect(x + 4, y + 45, 9, 3, "#4a2f25");
  rect(x + 16, y + 45, 9, 3, "#4a2f25");
  rect(x - 2, y + 17, 6, 18, outline);
  rect(x - 1, y + 18, 5, 16, style.coat);
  rect(x + 22, y + 17, 6, 18, outline);
  rect(x + 23, y + 18, 5, 16, style.coat);
  rect(x - 1, y + 33, 5, 4, style.skin);
  rect(x + 23, y + 33, 5, 4, style.skin);
  rect(x + 1, y + 13, 24, 27, outline);
  rect(x + 2, y + 14, 22, 25, style.coat);
  rect(x + 2, y + 14, 4, 25, style.coatLt);
  rect(x + 20, y + 14, 4, 25, style.coatDk);
  rect(x + 8, y + 16, 10, 20, person.color);
  rect(x + 8, y + 16, 10, 2, "rgba(255,255,255,.22)");
  rect(x + 4, y + 31, 18, 3, "#5b3b2c");
  rect(x + 11, y + 31, 4, 3, style.trim);
  rect(x + 4, y + 1, 20, 18, outline);
  rect(x + 5, y + 2, 18, 16, style.skin);
  rect(x + 20, y + 3, 3, 14, style.skinDk);
  rect(x + 4, y, 21, 7, style.hair);
  rect(x + 4, y + 6, 4, 9, style.hair);
  rect(x + 21, y + 6, 4, 9, style.hair);
  rect(x + 4, y, 21, 2, style.hairLt);
  rect(x + 8, y + 9, 2, 2, "#243140");
  rect(x + 16, y + 9, 2, 2, "#243140");
  rect(x + 11, y + 14, 5, 1, "#9c5d4a");
  drawNpcRoleKit(person, role, style);
  if (!state.completed.has(person.id)) drawNpcQuestMarker(x, y);
}

// Explicit world-sprite role per NPC id (from docs/NPC_CHARACTER_GUIDE.md), used to
// pick a recognisable silhouette/prop. Falls back to the keyword heuristic avatarRole.
const NPC_ROLE = {
  mayor: "council", priya: "campaign", sam: "book", rowan: "law", noor: "council",
  editorVale: "media", historianIona: "book", aidMina: "care", dataOmar: "data", elderGrace: "citizen",
  advocateFarah: "law", sergeantBlake: "police", mediatorChen: "citizen", youthEllis: "care",
  speakerLark: "law", mpRivers: "democracy", managerSol: "campaign", officerJune: "democracy", heraldEwan: "citizen",
  unionMorgan: "campaign", charityAmina: "care", lobbyistPax: "citizen", moderatorRae: "media",
  surveyorTess: "data", statJules: "data", organiserKai: "campaign", examinerMira: "exam",
  timeAsh: "time", sourceNia: "book", coachLeon: "campaign", scribePip: "book",
  campaignPriya2: "campaign", justiceRowan2: "law", plannerNoor2: "council", examMira2: "exam"
};

function npcRole(person) {
  return (person && NPC_ROLE[person.id]) || avatarRole(person);
}

function drawNpcRoleKit(p, role, style) {
  const x = p.x;
  const y = p.y;
  const gold = "#f2c14e";
  const paper = "#f5f0df";
  const ink = "#243140";
  const red = "#e36b5d";
  const white = "#fbf6e9";
  if (role === "police") {
    rect(x + 4, y - 6, 20, 10, "#1e2f4a");
    rect(x + 5, y - 7, 18, 2, "#26395a");
    rect(x + 12, y - 9, 4, 3, "#16233a");
    rect(x + 4, y + 4, 20, 3, "#16233a");
    rect(x + 12, y + 8, 4, 4, gold);
    return;
  }
  if (role === "council") {
    rect(x + 3, y + 15, 21, 2, gold);
    rect(x + 6, y + 16, 2, 4, gold);
    rect(x + 19, y + 16, 2, 4, gold);
    rect(x + 10, y + 19, 6, 5, gold);
    rect(x + 11, y + 20, 4, 3, "#b8881f");
    return;
  }
  if (role === "law") {
    rect(x + 1, y + 14, 5, 24, "#2a2533");
    rect(x + 22, y + 14, 5, 24, "#2a2533");
    rect(x + 9, y + 15, 8, 7, white);
    rect(x + 12, y + 15, 2, 7, "#cfc8b6");
    return;
  }
  if (role === "democracy") {
    rect(x + 15, y + 16, 9, 9, red);
    rect(x + 17, y + 18, 5, 5, "#f0998d");
    rect(x + 17, y + 25, 2, 6, gold);
    rect(x + 20, y + 25, 2, 6, paper);
    return;
  }
  if (role === "media") {
    rect(x + 12, y + 14, 4, 9, ink);
    rect(x + 8, y + 21, 12, 8, paper);
    rect(x + 10, y + 23, 5, 4, "#5da9e9");
    return;
  }
  if (role === "book") {
    rect(x + 6, y + 8, 12, 2, ink);
    rect(x - 5, y + 27, 13, 11, "#6f4633");
    rect(x - 4, y + 28, 5, 9, paper);
    rect(x + 2, y + 28, 5, 9, "#e7dcc4");
    rect(x - 1, y + 28, 1, 9, "#b6a98a");
    return;
  }
  if (role === "data") {
    rect(x + 21, y + 23, 13, 15, "#33424b");
    rect(x + 23, y + 25, 9, 9, "#e9eef0");
    rect(x + 24, y + 30, 2, 3, "#6fbf73");
    rect(x + 27, y + 27, 2, 6, gold);
    rect(x + 30, y + 25, 2, 8, "#5da9e9");
    return;
  }
  if (role === "care") {
    rect(x + 3, y + 15, 19, 11, "#3f74c4");
    rect(x + 9, y + 18, 7, 6, paper);
    rect(x + 11, y + 20, 3, 3, red);
    return;
  }
  if (role === "campaign") {
    rect(x + 4, y - 2, 19, 5, style.trim);
    rect(x + 4, y + 1, 19, 2, "rgba(0,0,0,.22)");
    rect(x + 2, y - 3, 6, 2, style.trim);
    rect(x + 22, y + 21, 12, 15, paper);
    rect(x + 24, y + 24, 8, 2, ink);
    rect(x + 24, y + 28, 8, 1, "#8f8576");
    rect(x + 24, y + 31, 6, 1, "#8f8576");
    return;
  }
  if (role === "time") {
    rect(x + 2, y + 15, 21, 13, "#d8a23a");
    rect(x + 6, y + 17, 3, 10, "rgba(255,255,255,.5)");
    rect(x + 16, y + 17, 3, 10, "rgba(255,255,255,.5)");
    rect(x + 23, y + 27, 10, 10, "#e9eef0");
    rect(x + 25, y + 29, 6, 6, ink);
    rect(x + 27, y + 25, 2, 3, "#8f8576");
    return;
  }
  if (role === "exam") {
    rect(x + 21, y + 23, 12, 16, paper);
    rect(x + 23, y + 27, 8, 1, ink);
    rect(x + 23, y + 30, 8, 1, ink);
    rect(x + 23, y + 33, 5, 1, ink);
    rect(x + 30, y + 21, 2, 9, red);
    rect(x + 30, y + 20, 2, 2, "#cfc8b6");
    return;
  }
  rect(x + 5, y + 15, 17, 3, style.trim);
  rect(x + 9, y + 18, 4, 4, style.trim);
}

function drawNpcQuestMarker(x, y) {
  rect(x + 10, y - 18, 5, 9, "#8a6a1e");
  rect(x + 11, y - 17, 3, 6, "#f2c14e");
  rect(x + 11, y - 9, 3, 3, "#f2c14e");
  rect(x + 11, y - 17, 3, 1, "#fff3d0");
}

function drawBuildingOrnaments(x, y, w, h, label) {
  const lower = label.toLowerCase();
  if (lower.includes("court") || lower.includes("rights") || lower.includes("parliament")) {
    for (let i = 0; i < 4; i += 1) {
      rect(x + 14 + i * 18, y + h - 45, 5, 25, "#eee1c0");
      rect(x + 12 + i * 18, y + h - 47, 9, 3, "#b7aca0");
    }
    return;
  }
  if (lower.includes("library") || lower.includes("archive") || lower.includes("sources") || lower.includes("printworks")) {
    rect(x + 38, y + 12, 28, 17, "#704633");
    for (let i = 0; i < 3; i += 1) rect(x + 41 + i * 8, y + 15, 5, 11, ["#5da9e9", "#f2c14e", "#6fbf73"][i]);
    return;
  }
  if (lower.includes("park") || lower.includes("garden") || lower.includes("volunteer")) {
    rect(x + 8, y + h - 30, 17, 9, "#4e9b50");
    rect(x + 10, y + h - 34, 4, 4, "#f05d5e");
    rect(x + 18, y + h - 36, 4, 4, "#ffe066");
    return;
  }
  if (lower.includes("election") || lower.includes("petition") || lower.includes("campaign")) {
    rect(x + w - 10, y - 40, 4, 36, "#4b3128");
    rect(x + w - 6, y - 38, 24, 13, "#e36b5d");
    rect(x + w - 3, y - 34, 14, 2, "#f5f0df");
  }
}

// Entrance group per building kind: recognisable props framing the door, drawn in
// front of the facade. Door position itself is unchanged (reachability preserved).
function drawBuildingEntrance(kind, x, y, w, h, wall, label) {
  const cx = Math.round(x + w / 2);
  const base = y + h;
  const doorTop = base - 28;
  const gold = "#f2c14e", paper = "#f5f0df", ink = "#2d2521", red = "#e36b5d";
  if (kind === "townhall") {
    [x + 12, x + w - 15].forEach((px) => {
      rect(px, base - 24, 3, 24, "#5a4632");
      rect(px - 2, base - 30, 7, 7, "#3a4f74");
      rect(px - 1, base - 29, 5, 4, "#ffe9a8");
      rect(px - 1, base - 25, 5, 2, "#cf9d3a");
    });
    drawBuildingFlag(x, y, w, h);
    return;
  }
  if (kind === "court") {
    [x + 12, x + 27, x + w - 33, x + w - 18].forEach((px) => {
      rect(px, base - 30, 6, 30, "#efe6cf");
      rect(px, base - 30, 2, 30, "#fffaf0");
      rect(px + 4, base - 30, 2, 30, "#cdbf9f");
      rect(px - 2, base - 32, 10, 3, "#d8ccad");
      rect(px - 2, base - 3, 10, 3, "#d8ccad");
    });
    const sxp = cx + 18;
    rect(sxp, base - 24, 2, 16, "#caa64a");
    rect(sxp - 8, base - 23, 18, 2, "#caa64a");
    rect(sxp - 10, base - 20, 6, 3, paper);
    rect(sxp + 6, base - 20, 6, 3, paper);
    return;
  }
  if (kind === "library") {
    rect(x + 10, base - 16, 22, 12, "#6f4633");
    rect(x + 12, base - 14, 6, 9, "#5da9e9");
    rect(x + 19, base - 14, 5, 9, red);
    rect(x + 25, base - 14, 5, 9, "#6fbf73");
    rect(x + 10, base - 4, 4, 4, "#3a2422");
    rect(x + 28, base - 4, 4, 4, "#3a2422");
    return;
  }
  if (kind === "press") {
    rect(x + w - 34, base - 18, 24, 14, "#4b3128");
    rect(x + w - 32, base - 16, 20, 5, paper);
    rect(x + w - 30, base - 15, 16, 1, ink);
    rect(x + w - 30, base - 13, 11, 1, "#8f8576");
    rect(x + w - 32, base - 9, 20, 4, "#d8cdb6");
    return;
  }
  if (kind === "police") {
    rect(cx - 2, doorTop - 14, 4, 8, "#1a1f2a");
    rect(cx - 5, doorTop - 22, 10, 9, "#16233a");
    rect(cx - 4, doorTop - 21, 8, 7, "#2f6fd0");
    rect(cx - 3, doorTop - 20, 6, 3, "#7fb0f5");
    rect(cx - 5, doorTop - 23, 10, 2, "#0f1726");
    return;
  }
  if (kind === "garden") {
    [x + 8, x + w - 26].forEach((px) => {
      rect(px, base - 14, 18, 14, "#3f8a47");
      rect(px, base - 14, 18, 3, "#5bb45e");
      rect(px + 3, base - 11, 3, 3, "#f05d5e");
      rect(px + 9, base - 9, 3, 3, "#ffe066");
      rect(px + 13, base - 12, 3, 3, "#e879c7");
    });
    return;
  }
  if (kind === "campaign") {
    rect(cx - 16, doorTop - 16, 32, 12, red);
    rect(cx - 16, doorTop - 16, 32, 2, "#f29a8f");
    rect(cx - 14, doorTop - 12, 28, 1, "#fff0ec");
    rect(cx - 24, doorTop - 18, 10, 10, gold);
    rect(cx - 21, doorTop - 15, 4, 4, "#b8881f");
    rect(cx - 22, doorTop - 8, 3, 14, "#b94a3e");
    rect(x + 10, y + 38, 16, 18, paper);
    rect(x + 12, y + 40, 12, 6, "#5da9e9");
    rect(x + 12, y + 48, 12, 1, ink);
    rect(x + 12, y + 51, 9, 1, "#8f8576");
    return;
  }
  if (kind === "exam") {
    [x + 10, x + w - 13].forEach((px) => {
      rect(px, y + 38, 3, 14, "#3a2f26");
      rect(px - 1, y + 34, 5, 5, "#f2a13a");
      rect(px, y + 32, 3, 3, "#ffd95e");
    });
    return;
  }
  drawBuildingOrnaments(x, y, w, h, label);
}

function npcStyle(person) {
  const skins = ["#f0bf98", "#d8a079", "#b9785f", "#8f5b4a"];
  const hairs = ["#4b2d2b", "#2d2521", "#7b4b38", "#31405a", "#d88c32"];
  const name = person.name.toLowerCase();
  let coat = "#263036";
  if (name.includes("campaign") || name.includes("union") || name.includes("charity")) coat = "#1f3f2d";
  if (name.includes("justice") || name.includes("advocate") || name.includes("examiner")) coat = "#3d334f";
  if (name.includes("editor") || name.includes("librarian") || name.includes("source")) coat = "#2f4f5f";
  if (name.includes("mayor") || name.includes("councillor") || name.includes("speaker")) coat = "#5a3f2c";
  if (name.includes("officer") || name.includes("sergeant")) coat = "#1e2f4a";
  const skin = skins[Math.floor(hashNoise(person.x, person.y, 8) * skins.length)];
  const hair = hairs[Math.floor(hashNoise(person.y, person.x, 6) * hairs.length)];
  return {
    skin,
    skinDk: shadeHex(skin, -26),
    hair,
    hairLt: shadeHex(hair, 34),
    coat,
    coatLt: shadeHex(coat, 20),
    coatDk: shadeHex(coat, -22),
    sleeve: "#3a2b2b",
    trim: "#d3a74d"
  };
}

function drawPlayer() {
  const p = state.player;
  const frame = Math.floor(p.step / 10) % 4;
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  if (drawHeroSpriteAsset(p, frame, bob)) return;
  const outfit = ITEMS[state.equipped.outfit] || ITEMS.schoolJumper;
  const side = p.dir === "left" ? -1 : 1;
  if (p.dir === "left" || p.dir === "right") {
    drawHeroSide(p, outfit, bob, frame, side);
  } else if (p.dir === "up") {
    drawHeroBack(p, outfit, bob, frame);
  } else {
    drawHeroFront(p, outfit, bob, frame);
  }
  drawHeroProfileMarkers(p, bob, frame, isHeroMoving());
}

function isHeroMoving() {
  if (activeQuestion || !choicePanel.classList.contains("hidden") || !dialogue.classList.contains("hidden")) return false;
  return keys.has("arrowleft") || keys.has("a") || keys.has("arrowright") || keys.has("d") || keys.has("arrowup") || keys.has("w") || keys.has("arrowdown") || keys.has("s");
}

function drawHeroSpriteAsset(p, fallbackFrame, fallbackBob) {
  const direction = ["up", "left", "right", "down"].includes(p.dir) ? p.dir : "down";
  const frame = isHeroMoving() ? heroBaseSprite.frameIndex(animationClockMs) : 0;
  if (!heroBaseSprite.draw(Math.round(p.x), Math.round(p.y), { state: direction, frame, width: 32, height: 48 })) return false;
  const bob = isHeroMoving() ? (frame === 1 || frame === 3 ? 1 : 0) : fallbackBob;
  drawHeroProfileMarkers(p, bob, frame, isHeroMoving());
  if (p.dir === "left") drawHeroHeldItem(p, -1, bob);
  else if (p.dir === "right") drawHeroHeldItem(p, 1, bob);
  else if (p.dir === "down") drawHeroHeldItem(p, 1, bob);
  return true;
}

function drawHeroProfileMarkers(p, bob, frame = 0, moving = false) {
  const visual = heroVisual();
  drawHeroShoeDetails(p, visual, frame, moving);
  drawHeroHairColor(p, bob, visual);
  drawHeroCap(p, bob, visual);
  drawHeroAccentBand(p, bob, visual);
  if (p.dir === "left" || p.dir === "right") drawHeroSideArm(p, bob, frame, moving);
  drawHeroUkFlag(p, bob);
}

// Recolor the base sprite's hair to the chosen colour, consistently in all four
// facings. Footprints match the spritesheet head silhouette so nothing pokes out.
function drawHeroHairColor(p, bob, visual) {
  if (visual.hair === "cap") return;
  const hair = visual.hairColor;
  const sheen = "rgba(255,255,255,.16)";
  const shade = "rgba(0,0,0,.18)";
  const y = p.y + bob;
  if (p.dir === "up") {
    rect(p.x + 6, y + 3, 20, 12, hair);
    rect(p.x + 6, y + 3, 20, 1, sheen);
    rect(p.x + 6, y + 14, 20, 1, shade);
    return;
  }
  if (p.dir === "right") {
    rect(p.x + 8, y + 2, 18, 5, hair);
    rect(p.x + 8, y + 6, 4, 7, hair);
    rect(p.x + 8, y + 2, 18, 1, sheen);
    rect(p.x + 8, y + 6, 18, 1, shade);
    return;
  }
  if (p.dir === "left") {
    rect(p.x + 6, y + 2, 18, 5, hair);
    rect(p.x + 20, y + 6, 4, 7, hair);
    rect(p.x + 6, y + 2, 18, 1, sheen);
    rect(p.x + 6, y + 6, 18, 1, shade);
    return;
  }
  rect(p.x + 6, y + 2, 20, 5, hair);
  rect(p.x + 6, y + 6, 3, 6, hair);
  rect(p.x + 23, y + 6, 3, 6, hair);
  rect(p.x + 6, y + 2, 20, 1, sheen);
  rect(p.x + 6, y + 6, 20, 1, shade);
}

// A peaked cap (accent colour) that sits on the head in all four facings.
function drawHeroCap(p, bob, visual) {
  if (visual.hair !== "cap") return;
  const c = visual.accent;
  const cd = "rgba(0,0,0,.22)";
  const sheen = "rgba(255,255,255,.18)";
  const y = p.y + bob;
  if (p.dir === "up") {
    rect(p.x + 5, y + 1, 22, 6, c);
    rect(p.x + 5, y + 1, 22, 1, sheen);
    rect(p.x + 5, y + 6, 22, 1, cd);
    return;
  }
  if (p.dir === "right") {
    rect(p.x + 7, y + 1, 19, 5, c);
    rect(p.x + 24, y + 5, 6, 2, c);
    rect(p.x + 7, y + 1, 19, 1, sheen);
    rect(p.x + 7, y + 5, 19, 1, cd);
    return;
  }
  if (p.dir === "left") {
    rect(p.x + 6, y + 1, 19, 5, c);
    rect(p.x + 2, y + 5, 6, 2, c);
    rect(p.x + 6, y + 1, 19, 1, sheen);
    rect(p.x + 6, y + 5, 19, 1, cd);
    return;
  }
  rect(p.x + 5, y + 1, 22, 5, c);
  rect(p.x + 7, y + 6, 18, 2, c);
  rect(p.x + 5, y + 1, 22, 1, sheen);
  rect(p.x + 5, y + 5, 22, 1, cd);
}

// A neck scarf in the accent colour, drawn consistently in all four facings.
function drawHeroAccentBand(p, bob, visual) {
  const c = visual.accent;
  const cd = "rgba(0,0,0,.2)";
  const y = p.y + bob;
  if (p.dir === "up") {
    rect(p.x + 7, y + 16, 18, 2, c);
    rect(p.x + 7, y + 17, 18, 1, cd);
    return;
  }
  if (p.dir === "right") {
    rect(p.x + 9, y + 16, 13, 2, c);
    rect(p.x + 9, y + 18, 4, 2, c);
    return;
  }
  if (p.dir === "left") {
    rect(p.x + 11, y + 16, 13, 2, c);
    rect(p.x + 19, y + 18, 4, 2, c);
    return;
  }
  rect(p.x + 7, y + 16, 18, 2, c);
  rect(p.x + 13, y + 18, 4, 3, c);
}

function drawHeroShoeDetails(p, visual, frame = 0, moving = false) {
  const trouser = "#2b333d";
  const trouserDk = "#222a33";
  const shoe = visual.shoes;
  const stride = moving ? frame : 0;
  if (p.dir === "left" || p.dir === "right") {
    const s = p.dir === "left" ? -1 : 1;
    const ph = moving ? frame : -1;
    const legBob = ph === 1 || ph === 3 ? 1 : 0;
    let frontDx;
    let backDx;
    if (!moving) {
      frontDx = 4 * s;
      backDx = -4 * s;
    } else if (ph === 0) {
      frontDx = 7 * s;
      backDx = -4 * s;
    } else if (ph === 2) {
      frontDx = -4 * s;
      backDx = 7 * s;
    } else {
      frontDx = 1 * s;
      backDx = 1 * s;
    }
    const baseY = p.y + legBob;
    drawHeroSideLeg(p.x + 12, baseY, backDx, trouserDk, shoe);
    drawHeroSideLeg(p.x + 15, baseY, frontDx, trouser, shoe);
    return;
  }
  const stepL = stride === 1 ? 5 : 0;
  const stepR = stride === 3 ? 5 : 0;
  rect(p.x + 5, p.y + 36, 8, 8 + stepL, trouser);
  rect(p.x + 4, p.y + 44 + stepL, 11, 3, shoe);
  rect(p.x + 18, p.y + 36, 8, 8 + stepR, trouserDk);
  rect(p.x + 17, p.y + 44 + stepR, 11, 3, shoe);
}

function drawHeroSideLeg(hipX, y, footDx, trouserColor, shoeColor) {
  rect(hipX, y + 35, 6, 6, trouserColor);
  rect(hipX + Math.round(footDx * 0.5), y + 40, 6, 6, trouserColor);
  rect(hipX + footDx, y + 45, 8, 3, shoeColor);
  rect(hipX + footDx, y + 45, 8, 1, "rgba(255,255,255,.12)");
}

function drawHeroSideArm(p, bob, frame, moving) {
  const s = p.dir === "left" ? -1 : 1;
  const jumper = "#3f6f97";
  const jumperDk = "#2e567a";
  const skin = "#f1c49c";
  const y = p.y + bob;
  const gripX = s === -1 ? p.x + 2 : p.x + 27;
  const bodyX = p.x + 13;
  const x0 = Math.min(bodyX, gripX);
  const w = Math.abs(gripX - bodyX) + 4;
  rect(x0, y + 24, w, 4, jumper);
  rect(x0, y + 24, w, 1, jumperDk);
  rect(gripX, y + 26, 4, 5, skin);
}

function drawHeroUkFlag(p, bob) {
  const moving = isHeroMoving();
  const phase = settings.reducedMotion ? null : animationClockMs / (moving ? 95 : 240);
  let poleX;
  let dir;
  let top = p.y - 14 + bob;
  let poleH = 38;
  if (p.dir === "left") {
    poleX = p.x + 3;
    dir = -1;
    top = p.y - 16 + bob;
    poleH = 44;
  } else if (p.dir === "right") {
    poleX = p.x + 29;
    dir = 1;
    top = p.y - 16 + bob;
    poleH = 44;
  } else if (p.dir === "up") {
    poleX = p.x + 24;
    dir = 1;
  } else {
    poleX = p.x + 25;
    dir = 1;
  }
  rect(poleX, top, 2, poleH, "#7a5a34");
  rect(poleX, top, 2, 14, "#8a6a40");
  rect(poleX - 1, top - 3, 4, 4, "#e8c45a");
  const fw = 15;
  const fh = 10;
  const fx = dir === 1 ? poleX + 2 : poleX - fw;
  drawWavingUnionJack(fx, top + 1, fw, fh, phase, dir);
}

function drawHeroSide(p, outfit, bob, frame, side) {
  const x = p.x;
  const y = p.y;
  const stride = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  const mirror = (localX, w = 1) => side === 1 ? x + localX : x + 32 - localX - w;
  const draw = (localX, localY, w, h, color) => rect(mirror(localX, w), y + localY, w, h, color);

  rect(x - 5, y + 39, 40, 8, "rgba(0,0,0,.34)");

  draw(10, 16 + bob, 15, 23, "#1f2f1d");
  draw(8, 17 + bob, 13, 21, outfit.color);
  draw(11, 19 + bob, 10, 16, "#2f6f3b");
  draw(7, 30 + bob, 19, 5, "#6d4939");
  draw(13, 31 + bob, 4, 4, "#d3a74d");
  draw(22, 18 + bob, 5, 14, "#5a3a2e");
  draw(24, 29 + bob, 5, 5, "#d8a079");
  draw(6, 19 + (1 - bob), 5, 13, "#5a3a2e");

  draw(8, 36, 7, 10 + Math.max(0, -stride), "#202326");
  draw(17, 36, 7, 10 + Math.max(0, stride), "#2b2d2f");
  draw(6 + Math.min(0, stride), 44 + Math.max(0, -stride), 11, 3, "#5b392f");
  draw(16 + Math.max(0, stride), 44 + Math.max(0, stride), 11, 3, "#5b392f");

  draw(8, 4, 17, 15, "#f0be8e");
  draw(18, 8, 6, 7, "#e0a879");
  draw(6, 2, 21, 7, "#7a3f28");
  draw(7, -1, 18, 6, "#f2c14e");
  draw(10, -4, 14, 5, "#ffe066");
  draw(22, 1, 6, 5, "#d88c32");
  draw(5, 6, 5, 7, "#b05d2c");
  draw(15, 9, 10, 3, "#202326");
  draw(21, 13, 4, 1, "#8f4f44");
  draw(10, 20 + bob, 3, 12, "#d3a74d");
  drawHeroHeldItemSide(x, y, side, bob);
}

function drawHeroFront(p, outfit, bob, frame) {
  const legA = frame === 1 ? 3 : 0;
  const legB = frame === 3 ? 3 : 0;
  rect(p.x - 5, p.y + 39, 38, 8, "rgba(0,0,0,.34)");
  rect(p.x + 4, p.y + 17 + bob, 22, 22, outfit.color);
  rect(p.x + 7, p.y + 20 + bob, 16, 15, "#2f6f3b");
  rect(p.x + 3, p.y + 18 + bob, 5, 17, "#5a3a2e");
  rect(p.x + 24, p.y + 18 + (1 - bob), 5, 17, "#5a3a2e");
  rect(p.x + 6, p.y + 31 + bob, 20, 4, "#6d4939");
  rect(p.x + 9, p.y + 33 + bob, 4, 4, "#d3a74d");
  rect(p.x + 5, p.y + 37, 8, 8 + legA, "#1f2224");
  rect(p.x + 18, p.y + 37, 8, 8 + legB, "#2b2d2f");
  rect(p.x + 4, p.y + 44 + legA, 11, 3, "#5b392f");
  rect(p.x + 17, p.y + 44 + legB, 11, 3, "#5b392f");
  rect(p.x + 6, p.y + 4, 18, 15, "#f0be8e");
  rect(p.x + 3, p.y + 1, 24, 8, "#7a3f28");
  rect(p.x + 5, p.y - 2, 20, 7, "#f2c14e");
  rect(p.x + 10, p.y - 5, 13, 5, "#ffe066");
  rect(p.x + 3, p.y + 7, 5, 7, "#d88c32");
  rect(p.x + 22, p.y + 7, 5, 7, "#d88c32");
  rect(p.x + 9, p.y + 10, 3, 2, "#202326");
  rect(p.x + 18, p.y + 10, 3, 2, "#202326");
  rect(p.x + 12, p.y + 14, 7, 1, "#8f4f44");
  drawHeroHeldItem(p, 1, bob);
}

function drawHeroBack(p, outfit, bob, frame) {
  const legA = frame === 1 ? 3 : 0;
  const legB = frame === 3 ? 3 : 0;
  rect(p.x - 5, p.y + 39, 38, 8, "rgba(0,0,0,.34)");
  rect(p.x + 4, p.y + 16 + bob, 22, 24, "#23351f");
  rect(p.x + 7, p.y + 18 + bob, 16, 19, outfit.color);
  rect(p.x + 5, p.y + 31 + bob, 21, 4, "#6d4939");
  rect(p.x + 5, p.y + 37, 8, 8 + legA, "#1f2224");
  rect(p.x + 18, p.y + 37, 8, 8 + legB, "#2b2d2f");
  rect(p.x + 4, p.y + 44 + legA, 11, 3, "#5b392f");
  rect(p.x + 17, p.y + 44 + legB, 11, 3, "#5b392f");
  rect(p.x + 5, p.y + 4, 20, 15, "#7a3f28");
  rect(p.x + 4, p.y, 23, 8, "#f2c14e");
  rect(p.x + 9, p.y - 4, 15, 5, "#ffe066");
  rect(p.x + 3, p.y + 8, 5, 8, "#d88c32");
  rect(p.x + 23, p.y + 8, 5, 8, "#d88c32");
}

function drawHeroHeldItem(p, side, bob) {
  if (!state.equipped.tool) return;
  const x = side === 1 ? p.x + 28 : p.x - 8;
  if (state.equipped.tool === "justiceQuill") {
    rect(x, p.y + 13 + bob, 3, 23, "#f5f0df");
    rect(x + (side === 1 ? 2 : -7), p.y + 7 + bob, 10, 10, "#466d9f");
    rect(x + (side === 1 ? 5 : -9), p.y + 10 + bob, 4, 4, "#5da9e9");
    return;
  }
  if (state.equipped.tool === "debateBlade") {
    rect(x, p.y + 15 + bob, 18 * side, 4, "#d7dde0");
    rect(x + 9 * side, p.y + 11 + bob, 10 * side, 3, "#f5f0df");
    rect(x - 3 * side, p.y + 14 + bob, 6 * side, 8, "#f2c14e");
    rect(x - 7 * side, p.y + 17 + bob, 7 * side, 5, "#5b392f");
    return;
  }
  rect(x, p.y + 20 + bob, 14 * side, 3, "#d7dde0");
  rect(x + 8 * side, p.y + 18 + bob, 8 * side, 2, "#f5f0df");
  rect(x - 2 * side, p.y + 19 + bob, 5 * side, 5, "#d3a74d");
}

function drawHeroHeldItemSide(x, y, side, bob) {
  if (!state.equipped.tool) return;
  const tip = side === 1 ? x + 38 : x - 10;
  const hand = side === 1 ? x + 28 : x + 1;
  if (state.equipped.tool === "justiceQuill") {
    rect(hand, y + 16 + bob, 3, 22, "#f5f0df");
    rect(hand + (side === 1 ? 2 : -8), y + 10 + bob, 10, 9, "#466d9f");
    rect(hand + (side === 1 ? 6 : -10), y + 13 + bob, 4, 4, "#5da9e9");
    return;
  }
  if (state.equipped.tool === "debateBlade") {
    rect(hand, y + 20 + bob, 16 * side, 4, "#d7dde0");
    rect(tip - (side === 1 ? 8 : 0), y + 17 + bob, 9, 3, "#f5f0df");
    rect(hand - (side === 1 ? 3 : -2), y + 19 + bob, 7, 8, "#f2c14e");
    rect(hand - (side === 1 ? 7 : -3), y + 22 + bob, 7, 5, "#5b392f");
  }
}

function drawSigns() {
  currentSigns().forEach((sign) => {
    rect(sign.x + 8, sign.y + 12, 5, 18, "#5d4037");
    rect(sign.x, sign.y, 22, 16, "#b98252");
    rect(sign.x + 2, sign.y + 3, 18, 2, "#e1b675");
    rect(sign.x + 3, sign.y + 9, 13, 2, "#704633");
  });
  drawExamPracticeRooms();
}

function drawBuildingDoors() {
  currentBuildingDoors().forEach((door) => {
    rect(door.x - 4, door.y + 18, 32, 8, "rgba(0,0,0,.24)");
    rect(door.x, door.y, 24, 20, "#f2c14e");
    rect(door.x + 2, door.y + 2, 20, 16, "#4d2c2b");
    rect(door.x + 9, door.y + 8, 6, 8, "#c18455");
    rect(door.x + 17, door.y + 9, 2, 2, "#f2c14e");
  });
}

function drawStudyStations() {
  if (!isInteriorLocation()) return;
  currentStudyStations().forEach((station) => {
    const done = state.completedStudyStations.has(studyStationKey(state.currentLocation, station.id));
    const accent = done ? "#6fbf73" : station.accent;
    rect(station.x - 16, station.y + 22, 64, 10, "rgba(0,0,0,.22)");
    rect(station.x - 8, station.y + 8, 48, 18, accent);
    rect(station.x - 4, station.y + 10, 40, 14, "#1d2427");
    rect(station.x + 4, station.y - 10, 24, 10, accent);
    rect(station.x + 10, station.y - 22, 12, 12, "#f5f0df");
    rect(station.x + 8, station.y + 26, 5, 12, "#5b3b31");
    rect(station.x + 19, station.y + 26, 5, 12, "#5b3b31");
    if (station.id.includes("source") || station.id.includes("revision") || station.id.includes("flashcard") || station.id.includes("misinformation")) {
      rect(station.x + 5, station.y + 13, 8, 8, "#f5f0df");
      rect(station.x + 14, station.y + 13, 8, 8, "#5da9e9");
      rect(station.x + 23, station.y + 13, 8, 8, "#f2c14e");
    } else if (station.id.includes("trial") || station.id.includes("rights") || station.id.includes("verdict") || station.id.includes("mistakes")) {
      rect(station.x + 8, station.y + 13, 20, 4, "#d7d0c3");
      rect(station.x + 16, station.y + 9, 4, 16, "#f2c14e");
    } else if (station.id.includes("campaign") || station.id.includes("impact") || station.id.includes("notice") || station.id.includes("reflection")) {
      rect(station.x + 8, station.y + 11, 4, 14, "#4b3128");
      rect(station.x + 12, station.y + 11, 18, 10, "#e36b5d");
      rect(station.x + 15, station.y + 14, 11, 2, "#f5f0df");
    } else {
      rect(station.x + 9, station.y + 12, 18, 10, "#d8a23a");
      rect(station.x + 15, station.y + 9, 6, 16, "#5a3f2c");
    }
    ctx.fillStyle = "#f5f0df";
    ctx.font = "10px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(station.label, station.x + 12, station.y + 52);
  });
}

function drawInteriorExit() {
  if (!isInteriorLocation()) return;
  const exit = INTERIOR_EXITS[state.currentLocation];
  if (!exit) return;
  rect(exit.x - 10, exit.y + 18, 44, 10, "rgba(0,0,0,.22)");
  rect(exit.x, exit.y, 24, 22, "#d8a23a");
  rect(exit.x + 2, exit.y + 2, 20, 18, "#4d2c2b");
  rect(exit.x + 8, exit.y + 8, 8, 10, "#c18455");
  rect(exit.x + 18, exit.y + 10, 2, 2, "#f2c14e");
}

function drawInteriorDecor() {
  if (!isInteriorLocation()) return;
  const theme = currentInteriorTheme();
  if (theme === "council") drawCouncilInterior();
  else if (theme === "library") drawLibraryInterior();
  else if (theme === "court") drawCourtInterior();
  else if (theme === "press") drawPressInterior();
  else if (theme === "police") drawPoliceInterior();
  else if (theme === "campaign") drawCampaignInterior();
  else drawGardenInterior();
  drawInteriorPlaque(theme);
}

// Small wall plaque naming the building the player entered, so the shared interior
// reads clearly as that specific civic place. Drawn high on the back wall, clear of
// study stations (top stations sit at x 128/640).
const INTERIOR_THEME_ACCENT = {
  council: "#d8a23a", library: "#5da9e9", court: "#b089d6",
  press: "#e36b5d", police: "#3f74c4", campaign: "#f2a13a", garden: "#6fbf73"
};

function drawInteriorPlaque(theme) {
  const label = state.lastDoorReturn?.label;
  if (!label) return;
  const accent = INTERIOR_THEME_ACCENT[theme] || "#d8a23a";
  const w = Math.max(96, label.length * 8 + 28);
  const x = 480 - w / 2;
  const y = 38;
  rect(x - 3, y - 3, w + 6, 24, "#2d2521");
  rect(x, y, w, 18, "#1d2427");
  rect(x, y, w, 3, accent);
  rect(x, y + 15, w, 3, "rgba(0,0,0,.4)");
  rect(x + 6, y + 4, 4, 10, accent);
  rect(x + w - 10, y + 4, 4, 10, accent);
  ctx.fillStyle = "#f5f0df";
  ctx.font = "11px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, 480, y + 13);
}

function drawCouncilInterior() {
  rect(252, 68, 456, 26, "#5a3f2c");
  rect(280, 86, 400, 8, "#e6d3a4");
  rect(330, 114, 300, 28, "#8f4f44");
  rect(352, 142, 256, 10, "#d7d0c3");
  rect(148, 248, 664, 6, "#d7d0c3");
  rect(200, 420, 560, 5, "#7d8078");
  for (let x = 208; x < 752; x += 74) {
    rect(x, 282, 42, 14, "#8f5b3f");
    rect(x + 4, 296, 34, 12, "#b77752");
    rect(x + 8, 308, 4, 16, "#4b3128");
    rect(x + 30, 308, 4, 16, "#4b3128");
  }
  rect(182, 96, 34, 48, "#466d9f");
  rect(182, 96, 6, 48, "#f5f0df");
  rect(728, 96, 34, 48, "#e36b5d");
  rect(756, 96, 6, 48, "#f5f0df");
  rect(404, 186, 152, 18, "#665a7d");
  rect(424, 204, 112, 6, "#f2c14e");
}

function drawLibraryInterior() {
  rect(224, 74, 480, 24, "#704633");
  rect(260, 96, 408, 8, "#e6d3a4");
  for (let y = 84; y < 470; y += 92) {
    rect(76, y, 58, 62, "#704633");
    rect(826, y, 58, 62, "#704633");
    for (let i = 0; i < 5; i += 1) {
      rect(84, y + 8 + i * 10, 42, 6, ["#5da9e9", "#f2c14e", "#6fbf73", "#e36b5d", "#b089d6"][i]);
      rect(834, y + 8 + i * 10, 42, 6, ["#6fbf73", "#f2c14e", "#5da9e9", "#b089d6", "#e36b5d"][i]);
    }
  }
  for (let x = 236; x < 700; x += 182) {
    rect(x, 238, 118, 14, "#8f5b3f");
    rect(x + 8, 252, 102, 10, "#c18455");
    rect(x + 14, 262, 6, 18, "#4b3128");
    rect(x + 92, 262, 6, 18, "#4b3128");
    rect(x + 42, 218, 26, 20, "#f5f0df");
    rect(x + 50, 224, 10, 8, "#5da9e9");
  }
  rect(452, 118, 56, 56, "#d7d0c3");
  rect(462, 128, 36, 36, "#5da9e9");
  rect(476, 140, 8, 8, "#6fbf73");
}

function drawCourtInterior() {
  rect(226, 78, 508, 18, "#665a7d");
  for (let x = 254; x < 706; x += 46) rect(x, 96, 12, 140, "#d7d0c3");
  rect(278, 238, 404, 10, "#f2c14e");
  rect(360, 130, 240, 26, "#5b3b31");
  rect(388, 156, 184, 22, "#8f5b3f");
  rect(392, 452, 180, 24, "#5b3b31");
  rect(168, 320, 120, 18, "#8f5b3f");
  rect(170, 338, 116, 8, "#b77752");
  rect(648, 320, 120, 18, "#8f5b3f");
  rect(650, 338, 116, 8, "#b77752");
  rect(448, 96, 64, 24, "#d7d0c3");
  rect(478, 98, 4, 20, "#f2c14e");
  rect(458, 104, 44, 4, "#f2c14e");
}

function drawGardenInterior() {
  rect(128, 92, 704, 12, "#4e9b50");
  rect(128, 456, 704, 12, "#4e9b50");
  for (let x = 146; x < 814; x += 88) {
    rect(x, 104, 18, 18, "#f05d5e");
    rect(x + 28, 430, 18, 18, "#ffe066");
  }
  rect(370, 120, 220, 12, "#8f5b3f");
  rect(394, 132, 14, 84, "#4b3128");
  rect(552, 132, 14, 84, "#4b3128");
  rect(390, 216, 180, 12, "#8f5b3f");
  rect(176, 240, 90, 64, "#e6d3a4");
  rect(182, 246, 78, 8, "#b94e48");
  rect(188, 264, 64, 4, "#4d2c2b");
  rect(690, 240, 90, 64, "#e6d3a4");
  rect(696, 246, 78, 8, "#466d9f");
  rect(702, 264, 64, 4, "#4d2c2b");
  for (let x = 234; x < 716; x += 144) {
    rect(x, 352, 34, 18, "#8f5b3f");
    rect(x + 4, 370, 26, 12, "#b77752");
    rect(x + 8, 382, 4, 12, "#4b3128");
    rect(x + 22, 382, 4, 12, "#4b3128");
  }
}

// Newsroom / printworks: headline board, printing press, paper racks, fact-check desk.
function drawPressInterior() {
  rect(252, 68, 456, 28, "#34424b");
  rect(262, 76, 436, 4, "#1d2427");
  for (let i = 0, x = 276; x < 690; x += 70, i += 1) {
    rect(x, 82, 56, 10, i % 2 ? "#cdd6da" : "#e9eef0");
    rect(x + 4, 84, 40, 2, "#7c8a92");
    rect(x + 4, 88, 30, 2, "#7c8a92");
  }
  // printing press machine (left-centre gap between stations)
  rect(150, 232, 150, 86, "#3a4750");
  rect(150, 232, 150, 8, "#566872");
  rect(158, 244, 134, 50, "#26313a");
  rect(166, 252, 118, 12, "#8f8576");
  rect(166, 270, 118, 12, "#a89f8c");
  rect(196, 294, 60, 24, "#1d2427");
  rect(204, 300, 44, 8, "#f5f0df");
  rect(204, 310, 44, 4, "#cdc6b2");
  rect(290, 250, 18, 18, "#caa64a");
  rect(296, 256, 6, 6, "#1d2427");
  // newspaper racks (right-centre gap)
  for (let i = 0; i < 3; i += 1) {
    const x = 600 + i * 66;
    rect(x, 244, 54, 70, "#5b3b31");
    rect(x + 4, 250, 46, 18, "#e9eef0");
    rect(x + 4, 272, 46, 18, "#dfe6e8");
    rect(x + 4, 294, 46, 16, "#d4dbdd");
    rect(x + 8, 254, 38, 3, "#34424b");
    rect(x + 8, 276, 30, 3, "#34424b");
  }
  // fact-check desk centre
  rect(404, 150, 152, 16, "#33424b");
  rect(420, 130, 120, 22, "#26313a");
  rect(430, 136, 100, 12, "#5da9e9");
  rect(436, 139, 40, 6, "#cde7fb");
  rect(424, 166, 8, 22, "#1d2427");
  rect(528, 166, 8, 22, "#1d2427");
}

// Police station: reception desk, evidence board, posters, barred window (age-appropriate).
function drawPoliceInterior() {
  rect(252, 64, 456, 30, "#1e2f4a");
  rect(252, 64, 456, 6, "#2c4368");
  for (let x = 258; x < 700; x += 14) rect(x, 78, 7, 8, (Math.floor((x - 258) / 14) % 2) ? "#16233a" : "#f4f6fb");
  rect(420, 70, 120, 8, "#cdd6e6");
  rect(460, 70, 40, 8, "#1a2740");
  // reception desk (centre band)
  rect(330, 250, 300, 40, "#3a4f74");
  rect(330, 250, 300, 8, "#52688f");
  rect(342, 262, 276, 20, "#26354f");
  rect(360, 268, 60, 10, "#cdd6e6");
  rect(540, 268, 60, 10, "#cdd6e6");
  rect(470, 240, 20, 14, "#1a2740");
  rect(474, 244, 12, 8, "#7fb0f5");
  // evidence board left
  rect(150, 232, 120, 86, "#2a3344");
  rect(158, 240, 104, 70, "#3d4a5e");
  for (let i = 0; i < 4; i += 1) rect(166 + (i % 2) * 52, 248 + Math.floor(i / 2) * 32, 40, 26, "#e9eef0");
  rect(206, 240, 2, 70, "#cdd6e6");
  // barred window right
  rect(640, 236, 120, 76, "#26313a");
  rect(648, 244, 104, 60, "#52688f");
  for (let x = 656; x < 752; x += 16) rect(x, 244, 4, 60, "#1d2427");
  rect(648, 270, 104, 4, "#1d2427");
}

// Campaign workshop: planning boards, posters, survey tables, pinned charts.
function drawCampaignInterior() {
  rect(252, 68, 456, 26, "#2f5d3a");
  rect(262, 76, 436, 4, "#1f3f2d");
  const flagColors = ["#e36b5d", "#f2c14e", "#5da9e9", "#6fbf73"];
  for (let i = 0, x = 268; x < 700; x += 30, i += 1) {
    ctx.save();
    ctx.fillStyle = flagColors[i % flagColors.length];
    ctx.beginPath(); ctx.moveTo(x, 82); ctx.lineTo(x + 20, 82); ctx.lineTo(x + 10, 92); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // planning boards on side walls
  [150, 690].forEach((x, idx) => {
    rect(x, 226, 120, 92, "#f5f0df");
    rect(x, 226, 120, 8, idx ? "#5da9e9" : "#e36b5d");
    for (let i = 0; i < 3; i += 1) {
      rect(x + 12, 244 + i * 20, 46, 12, ["#cfe6fb", "#ffe9c2", "#d7f0d9"][i]);
      rect(x + 66, 244 + i * 20, 40, 12, "#e6ded0");
      rect(x + 12, 248 + i * 20, 30, 2, "#8f8576");
    }
    rect(x + 8, 226, 6, 92, "rgba(0,0,0,.12)");
  });
  // survey table centre
  rect(396, 150, 168, 16, "#8f5b3f");
  rect(404, 130, 152, 22, "#a8703f");
  rect(414, 134, 40, 14, "#f5f0df");
  rect(418, 138, 32, 3, "#5da9e9");
  rect(418, 144, 24, 3, "#cdc6b2");
  rect(470, 134, 40, 14, "#f5f0df");
  rect(474, 138, 32, 3, "#e36b5d");
  rect(516, 134, 34, 14, "#f5f0df");
  rect(410, 166, 8, 22, "#5b3b31");
  rect(548, 166, 8, 22, "#5b3b31");
  // ballot / petition box centre-low
  rect(440, 408, 80, 18, "#4b3128");
  rect(452, 396, 56, 14, "#6fbf73");
  rect(474, 398, 12, 4, "#1f3f2d");
}


function drawExamPracticeRooms() {
  if (state.currentLocation !== "examHall") return;
  EXAM_PRACTICE_ROOMS.forEach((room) => {
    const done = state.examPracticeCompleted.has(room.id);
    const accent = done ? "#6fbf73" : "#f2c14e";
    rect(room.x - 12, room.y + 18, 48, 14, done ? "rgba(111,191,115,.24)" : "rgba(242,193,78,.28)");
    rect(room.x - 12, room.y + 30, 48, 2, accent);
    rect(room.x - 2, room.y + 16, 28, 5, "rgba(0,0,0,.26)");
    rect(room.x, room.y, 24, 18, accent);
    rect(room.x + 2, room.y + 2, 20, 14, "#2d2521");
    rect(room.x + 5, room.y + 5, 14, 2, accent);
    rect(room.x + 5, room.y + 10, 10, 2, "#f5f0df");
    if (done) rect(room.x + 16, room.y + 10, 3, 3, "#f5f0df");
    rect(room.x - 5, room.y - 18, 34, 14, "rgba(17,23,25,.9)");
    ctx.strokeStyle = accent;
    ctx.strokeRect(room.x - 5, room.y - 18, 34, 14);
    ctx.fillStyle = "#f5f0df";
    ctx.font = "10px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("E", room.x + 12, room.y - 8);
  });
}

function propAssetBounds(prop) {
  const dimensions = {
    ballotBox: { w: 46, h: 45 },
    debateBench: { w: 66, h: 42 },
    examDesk: { w: 58, h: 52 },
    kiosk: { w: 52, h: 54 },
    notice: { w: 40, h: 46 },
    petitionStand: { w: 52, h: 54 },
    planningBoard: { w: 63, h: 55 },
    podium: { w: 52, h: 49 }
  };
  return dimensions[prop.type] || null;
}

function propAssetImage(type) {
  const src = PROP_ASSETS[type];
  return getAssetImage(src);
}

function drawPropAsset(prop) {
  const bounds = propAssetBounds(prop);
  const image = bounds ? propAssetImage(prop.type) : null;
  if (!image || !image.complete || !image.naturalWidth) return false;
  ctx.drawImage(image, prop.x, prop.y, bounds.w, bounds.h);
  return true;
}

function drawProp(prop) {
  if (drawPropAsset(prop)) return;
  if (prop.type === "barrel") {
    rect(prop.x - 1, prop.y + 24, 22, 4, "rgba(0,0,0,.24)");
    rect(prop.x, prop.y + 4, 20, 22, "#6f3d2f");
    rect(prop.x + 2, prop.y, 16, 6, "#9e5c43");
    rect(prop.x + 2, prop.y + 22, 16, 5, "#4b2b24");
    rect(prop.x + 5, prop.y + 3, 2, 22, "#c27b54");
    rect(prop.x + 13, prop.y + 3, 2, 22, "#c27b54");
    return;
  }
  if (prop.type === "crate") {
    rect(prop.x + 2, prop.y + 22, 24, 4, "rgba(0,0,0,.22)");
    rect(prop.x, prop.y, 24, 24, "#9a633f");
    rect(prop.x + 2, prop.y + 2, 20, 20, "#b9794d");
    rect(prop.x + 3, prop.y + 11, 18, 3, "#704633");
    rect(prop.x + 10, prop.y + 3, 3, 18, "#704633");
    rect(prop.x + 4, prop.y + 4, 5, 2, "#d29a68");
    return;
  }
  if (prop.type === "kiosk") {
    rect(prop.x - 4, prop.y + 38, 54, 8, "rgba(0,0,0,.26)");
    rect(prop.x, prop.y + 10, 44, 32, "#31405a");
    rect(prop.x - 4, prop.y, 52, 12, "#e36b5d");
    rect(prop.x + 4, prop.y + 16, 15, 20, "#f5f0df");
    rect(prop.x + 23, prop.y + 16, 15, 20, "#d7d0c3");
    rect(prop.x + 7, prop.y + 20, 9, 3, "#4d5a59");
    rect(prop.x + 26, prop.y + 20, 9, 3, "#4d5a59");
    rect(prop.x + 6, prop.y + 28, 11, 3, "#b98231");
    rect(prop.x + 25, prop.y + 28, 11, 3, "#5da9e9");
    rect(prop.x + 2, prop.y + 42, 6, 12, "#263036");
    rect(prop.x + 36, prop.y + 42, 6, 12, "#263036");
    return;
  }
  if (prop.type === "scales") {
    rect(prop.x - 4, prop.y + 42, 54, 6, "rgba(0,0,0,.24)");
    rect(prop.x + 20, prop.y + 6, 5, 38, "#d7d0c3");
    rect(prop.x + 7, prop.y + 13, 31, 4, "#f2c14e");
    rect(prop.x + 11, prop.y + 17, 3, 13, "#d7d0c3");
    rect(prop.x + 31, prop.y + 17, 3, 13, "#d7d0c3");
    rect(prop.x + 3, prop.y + 30, 20, 5, "#665a7d");
    rect(prop.x + 25, prop.y + 30, 20, 5, "#665a7d");
    rect(prop.x + 14, prop.y + 43, 18, 5, "#4d5a59");
    return;
  }
  if (prop.type === "notice") {
    rect(prop.x - 2, prop.y + 36, 42, 6, "rgba(0,0,0,.22)");
    rect(prop.x + 4, prop.y + 28, 5, 18, "#4b3128");
    rect(prop.x + 29, prop.y + 28, 5, 18, "#4b3128");
    rect(prop.x, prop.y, 38, 30, "#5c5470");
    rect(prop.x + 3, prop.y + 3, 32, 24, "#f5f0df");
    rect(prop.x + 7, prop.y + 8, 22, 3, "#4d5a59");
    rect(prop.x + 7, prop.y + 15, 16, 3, "#b98231");
    rect(prop.x + 7, prop.y + 22, 22, 3, "#4d5a59");
    return;
  }
  if (prop.type === "ballotBox") {
    rect(prop.x - 2, prop.y + 38, 48, 7, "rgba(0,0,0,.24)");
    rect(prop.x, prop.y + 14, 42, 30, "#466d9f");
    rect(prop.x + 4, prop.y + 10, 34, 8, "#f5f0df");
    rect(prop.x + 13, prop.y + 7, 16, 4, "#263036");
    rect(prop.x + 10, prop.y + 24, 22, 4, "#f2c14e");
    rect(prop.x + 14, prop.y + 31, 14, 4, "#f5f0df");
    return;
  }
  if (prop.type === "podium") {
    rect(prop.x - 4, prop.y + 42, 56, 7, "rgba(0,0,0,.24)");
    rect(prop.x + 6, prop.y + 16, 36, 30, "#8f5b3f");
    rect(prop.x + 2, prop.y + 10, 44, 10, "#f2c14e");
    rect(prop.x + 18, prop.y + 2, 8, 12, "#d7d0c3");
    rect(prop.x + 20, prop.y - 4, 4, 8, "#263036");
    rect(prop.x + 13, prop.y + 27, 20, 4, "#f5f0df");
    return;
  }
  if (prop.type === "poster") {
    rect(prop.x - 2, prop.y + 42, 40, 6, "rgba(0,0,0,.22)");
    rect(prop.x + 4, prop.y + 28, 5, 18, "#4b3128");
    rect(prop.x, prop.y, 36, 32, "#e36b5d");
    rect(prop.x + 3, prop.y + 3, 30, 26, "#f5f0df");
    rect(prop.x + 7, prop.y + 8, 22, 4, "#466d9f");
    rect(prop.x + 7, prop.y + 16, 16, 3, "#4d5a59");
    rect(prop.x + 7, prop.y + 23, 22, 3, "#b98231");
    return;
  }
  if (prop.type === "petitionStand") {
    rect(prop.x - 4, prop.y + 40, 56, 8, "rgba(0,0,0,.24)");
    rect(prop.x, prop.y + 18, 48, 24, "#8f5b3f");
    rect(prop.x + 4, prop.y + 8, 40, 14, "#f5f0df");
    rect(prop.x + 8, prop.y + 12, 22, 3, "#4d5a59");
    rect(prop.x + 8, prop.y + 18, 28, 3, "#6fbf73");
    rect(prop.x + 10, prop.y + 28, 10, 10, "#f5f0df");
    rect(prop.x + 25, prop.y + 28, 14, 4, "#f2c14e");
    rect(prop.x + 6, prop.y + 42, 5, 12, "#4b3128");
    rect(prop.x + 36, prop.y + 42, 5, 12, "#4b3128");
    return;
  }
  if (prop.type === "boat") {
    rect(prop.x - 6, prop.y + 32, 72, 8, "rgba(0,0,0,.18)");
    rect(prop.x, prop.y + 20, 58, 18, "#d88c5a");
    rect(prop.x + 5, prop.y + 30, 48, 10, "#8f4f44");
    rect(prop.x + 28, prop.y + 2, 4, 24, "#4b3128");
    rect(prop.x + 32, prop.y + 6, 18, 16, "#f5f0df");
    rect(prop.x + 10, prop.y + 22, 8, 6, "#f2c14e");
    return;
  }
  if (prop.type === "banner") {
    rect(prop.x - 2, prop.y + 48, 66, 7, "rgba(0,0,0,.22)");
    rect(prop.x + 3, prop.y + 14, 5, 38, "#4b3128");
    rect(prop.x + 53, prop.y + 14, 5, 38, "#4b3128");
    rect(prop.x + 7, prop.y, 50, 22, "#6fbf73");
    rect(prop.x + 11, prop.y + 6, 30, 3, "#f5f0df");
    rect(prop.x + 11, prop.y + 14, 38, 3, "#f2c14e");
    return;
  }
  if (prop.type === "planningBoard") {
    rect(prop.x - 3, prop.y + 48, 66, 7, "rgba(0,0,0,.22)");
    rect(prop.x + 4, prop.y + 30, 5, 22, "#4b3128");
    rect(prop.x + 52, prop.y + 30, 5, 22, "#4b3128");
    rect(prop.x, prop.y, 60, 34, "#26362f");
    rect(prop.x + 4, prop.y + 4, 52, 26, "#f5f0df");
    rect(prop.x + 8, prop.y + 9, 12, 8, "#f2c14e");
    rect(prop.x + 24, prop.y + 9, 12, 8, "#5da9e9");
    rect(prop.x + 40, prop.y + 9, 12, 8, "#6fbf73");
    rect(prop.x + 8, prop.y + 22, 40, 3, "#4d5a59");
    return;
  }
  if (prop.type === "surveyBox") {
    rect(prop.x - 2, prop.y + 34, 44, 7, "rgba(0,0,0,.22)");
    rect(prop.x, prop.y + 12, 38, 28, "#466d9f");
    rect(prop.x + 4, prop.y + 8, 30, 8, "#f5f0df");
    rect(prop.x + 12, prop.y + 5, 14, 4, "#263036");
    rect(prop.x + 8, prop.y + 23, 22, 4, "#f2c14e");
    return;
  }
  if (prop.type === "dataCards") {
    rect(prop.x - 2, prop.y + 33, 54, 6, "rgba(0,0,0,.22)");
    rect(prop.x, prop.y + 8, 46, 28, "#263036");
    rect(prop.x + 6, prop.y + 24, 6, 8, "#6fbf73");
    rect(prop.x + 17, prop.y + 18, 6, 14, "#f2c14e");
    rect(prop.x + 28, prop.y + 12, 6, 20, "#5da9e9");
    rect(prop.x + 7, prop.y + 12, 26, 3, "#f5f0df");
    return;
  }
  if (prop.type === "campaignTable") {
    rect(prop.x - 4, prop.y + 38, 64, 8, "rgba(0,0,0,.24)");
    rect(prop.x, prop.y + 18, 56, 22, "#8f5b3f");
    rect(prop.x + 4, prop.y + 10, 18, 12, "#e36b5d");
    rect(prop.x + 26, prop.y + 10, 22, 10, "#f5f0df");
    rect(prop.x + 30, prop.y + 14, 14, 3, "#4d5a59");
    rect(prop.x + 8, prop.y + 40, 5, 12, "#4b3128");
    rect(prop.x + 43, prop.y + 40, 5, 12, "#4b3128");
    return;
  }
  if (prop.type === "finalGate") {
    rect(prop.x - 6, prop.y + 50, 82, 8, "rgba(0,0,0,.24)");
    rect(prop.x, prop.y + 10, 18, 44, "#5c5470");
    rect(prop.x + 50, prop.y + 10, 18, 44, "#5c5470");
    rect(prop.x + 12, prop.y, 44, 14, "#f2c14e");
    rect(prop.x + 24, prop.y + 22, 20, 32, "#25233a");
    rect(prop.x + 28, prop.y + 28, 12, 4, "#d7d0c3");
    return;
  }
  if (prop.type === "examDesk") {
    rect(prop.x - 4, prop.y + 36, 62, 8, "rgba(0,0,0,.22)");
    rect(prop.x, prop.y + 18, 54, 22, "#8f5b3f");
    rect(prop.x + 6, prop.y + 8, 20, 14, "#f5f0df");
    rect(prop.x + 30, prop.y + 10, 18, 10, "#d7e8f3");
    rect(prop.x + 10, prop.y + 13, 12, 3, "#4d5a59");
    rect(prop.x + 10, prop.y + 18, 16, 3, "#b98231");
    rect(prop.x + 8, prop.y + 40, 5, 12, "#4b3128");
    rect(prop.x + 42, prop.y + 40, 5, 12, "#4b3128");
    return;
  }
  if (prop.type === "sourceArchive") {
    rect(prop.x - 3, prop.y + 42, 62, 7, "rgba(0,0,0,.22)");
    rect(prop.x, prop.y + 6, 54, 38, "#394d78");
    rect(prop.x + 5, prop.y + 11, 12, 28, "#f5f0df");
    rect(prop.x + 21, prop.y + 11, 12, 28, "#d7d0c3");
    rect(prop.x + 37, prop.y + 11, 12, 28, "#5da9e9");
    rect(prop.x + 7, prop.y + 18, 8, 3, "#4d5a59");
    rect(prop.x + 23, prop.y + 25, 8, 3, "#4d5a59");
    return;
  }
  if (prop.type === "debateBench") {
    rect(prop.x - 4, prop.y + 30, 70, 7, "rgba(0,0,0,.22)");
    rect(prop.x, prop.y + 8, 62, 10, "#8f5b3f");
    rect(prop.x + 4, prop.y + 20, 54, 8, "#b77752");
    rect(prop.x + 10, prop.y + 28, 5, 14, "#4b3128");
    rect(prop.x + 48, prop.y + 28, 5, 14, "#4b3128");
    rect(prop.x + 23, prop.y, 16, 8, "#f2c14e");
    return;
  }
  if (prop.type === "lamp") {
    rect(prop.x + 8, prop.y + 8, 5, 35, "#523a32");
    rect(prop.x + 4, prop.y + 2, 13, 9, "#60443a");
    rect(prop.x + 7, prop.y + 4, 7, 5, "#f4d06f");
    rect(prop.x + 2, prop.y + 42, 17, 4, "#3d302c");
    return;
  }
  if (prop.type === "flowers") {
    rect(prop.x, prop.y + 8, 30, 16, "#4e9b50");
    ["#f05d5e", "#ffe066", "#f7f0a3", "#e76f51"].forEach((color, i) => {
      rect(prop.x + 4 + i * 6, prop.y + 3 + (i % 2) * 5, 4, 4, color);
    });
    return;
  }
  if (prop.type === "bench") {
    rect(prop.x, prop.y, 66, 9, "#8f5b3f");
    rect(prop.x + 3, prop.y + 12, 60, 8, "#b77752");
    rect(prop.x + 8, prop.y + 20, 5, 14, "#4b3128");
    rect(prop.x + 52, prop.y + 20, 5, 14, "#4b3128");
  }
}

function drawStonePlaza() {
  if (state.currentLocation !== "village") return;
  const visual = locColors();
  for (let y = 192; y < 352; y += 16) {
    for (let x = 32; x < 704; x += 32) {
      const offset = (y / 16) % 2 ? 16 : 0;
      if ("#~T".includes(tileAtPixel(x + offset + 15, y + 7))) continue;
      rect(x + offset, y, 30, 14, visual.road || "#a8a79d");
      rect(x + offset, y + 12, 30, 2, "#7d8078");
      rect(x + offset + 28, y + 2, 2, 10, "#888b82");
      if (hashNoise(x, y, 11) > .72) rect(x + offset + 7, y + 6, 12, 2, "#8a8178");
    }
  }
  for (let x = 704; x < 850; x += 36) {
    rect(x, 306, 26, 14, "rgba(245,240,223,.18)");
    rect(x + 2, 318, 22, 2, "rgba(75,85,70,.18)");
  }
}

function drawBoat(x, y) {
  rect(x + 10, y + 40, 96, 5, "rgba(0,0,0,.2)");
  rect(x + 8, y + 15, 96, 28, "#6d3c2d");
  rect(x + 2, y + 21, 11, 15, "#8f5a3e");
  rect(x + 103, y + 21, 11, 15, "#8f5a3e");
  rect(x + 18, y + 8, 72, 30, "#a86445");
  for (let i = 0; i < 5; i += 1) {
    rect(x + 22 + i * 13, y + 11, 9, 24, "#c47b55");
    rect(x + 22 + i * 13, y + 33, 9, 3, "#5c332b");
  }
  rect(x + 42, y + 2, 28, 6, "#d29a68");
}

function drawMarketStall(x, y, canopy, label) {
  rect(x + 3, y + 38, 76, 8, "rgba(0, 0, 0, .25)");
  rect(x + 8, y + 20, 64, 24, "#8f5b3f");
  rect(x + 12, y + 23, 56, 3, "#c18455");
  rect(x + 4, y + 12, 72, 13, canopy);
  for (let i = 0; i < 4; i += 1) {
    rect(x + 6 + i * 18, y + 13, 12, 10, i % 2 ? "#f5f0df" : canopy);
  }
  rect(x + 14, y + 29, 12, 10, "#f2c14e");
  rect(x + 34, y + 28, 10, 11, "#6fbf73");
  rect(x + 54, y + 30, 9, 9, "#e36b5d");
  ctx.fillStyle = "#fff3d0";
  ctx.font = "10px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 40, y + 40);
}

function drawKiosk(x, y, label) {
  rect(x + 3, y + 35, 46, 5, "rgba(0,0,0,.24)");
  rect(x + 5, y + 14, 42, 26, "#8f4f44");
  rect(x + 2, y + 6, 48, 12, "#e6d3a4");
  rect(x + 8, y + 20, 12, 12, "#f5f0df");
  rect(x + 24, y + 21, 17, 3, "#f5f0df");
  rect(x + 24, y + 29, 12, 3, "#f2c14e");
  ctx.fillStyle = "#4d2c2b";
  ctx.font = "8px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, x + 26, y + 15);
}

function drawWorldLabel(x, y, text, accent = "#f2c14e", width = 74) {
  rect(x - width / 2 + 3, y + 14, width - 6, 5, "rgba(0,0,0,.24)");
  rect(x - width / 2, y, width, 18, "rgba(17,23,25,.9)");
  ctx.strokeStyle = accent;
  ctx.strokeRect(Math.round(x - width / 2), Math.round(y), width, 18);
  ctx.fillStyle = "#f5f0df";
  ctx.font = "10px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y + 12);
}

function miniGameMapStatus(id) {
  const game = MINI_GAMES[id];
  const score = state.miniGameScores[id]?.score;
  if (!game || !Number.isFinite(score)) return { label: "New", color: "#5da9e9" };
  const medal = miniGameMedal(score, game.rounds.length);
  if (medal === "gold") return { label: "Gold", color: "#f2c14e" };
  if (medal === "silver") return { label: "Silver", color: "#d7d0c3" };
  if (medal === "bronze") return { label: "Bronze", color: "#d88c5a" };
  return { label: "Try", color: "#e36b5d" };
}

function drawMiniGameHostMarkers() {
  npcs.filter((npc) => npc.miniGameId && MINI_GAMES[npc.miniGameId]).forEach((npc) => {
    const x = npc.x + 13;
    const y = npc.y - 42;
    const pulse = Math.floor(state.player.step / 24) % 2;
    const status = miniGameMapStatus(npc.miniGameId);
    const markerW = Math.max(44, status.label.length * 7 + 16);
    rect(x - markerW / 2, y + 7, markerW, 25, "rgba(17,23,25,.94)");
    ctx.strokeStyle = pulse ? status.color : "#f2c14e";
    ctx.strokeRect(Math.round(x - markerW / 2), y + 7, markerW, 25);
    rect(x - 10, y - 1, 20, 10, status.color);
    rect(x - 7, y + 1, 14, 6, "#141c1f");
    rect(x - 12, y + 2, 4, 4, "#f2c14e");
    rect(x + 8, y + 2, 4, 4, "#f2c14e");
    ctx.fillStyle = "#f5f0df";
    ctx.font = "9px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("Game", x, y + 17);
    ctx.fillStyle = status.color;
    ctx.fillText(status.label, x, y + 28);
  });
}

function drawMiniGameTriggerMarkers() {
  props.filter((prop) => prop.miniGameId && (!prop.location || prop.location === state.currentLocation) && MINI_GAMES[prop.miniGameId]).forEach((prop) => {
    const status = miniGameMapStatus(prop.miniGameId);
    const x = prop.x + 24;
    const y = prop.y - 16;
    rect(x - 16, y + 5, 32, 18, "rgba(17,23,25,.9)");
    ctx.strokeStyle = status.color;
    ctx.strokeRect(x - 16, y + 5, 32, 18);
    rect(x - 5, y - 2, 10, 10, status.color);
    ctx.fillStyle = "#141c1f";
    ctx.font = "8px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("!", x, y + 6);
    ctx.fillStyle = "#f5f0df";
    ctx.font = "8px Georgia";
    ctx.fillText("Play", x, y + 17);
    ctx.fillStyle = status.color;
    ctx.fillText(status.label, x, y + 27);
  });
}

const APATHY_TRACE_POINTS = {
  modernBritain: { flag: "challengedRumour", x: 548, y: 190 },
  rightsLaw: { flag: "defendedRights", x: 566, y: 70 },
  democracy: { flag: "usedEvidenceInDebate", x: 565, y: 54 },
  participation: { flag: "helpedVolunteer", x: 604, y: 80 },
  actionWorkshop: { flag: "plannedAction", x: 462, y: 286 }
};

function drawApathyTrace(x, y) {
  ctx.save();
  ctx.globalAlpha = .42;
  ctx.fillStyle = "#23172f";
  ctx.beginPath();
  ctx.ellipse(x, y + 18, 34, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .62;
  ctx.fillStyle = "#3b2752";
  ctx.beginPath();
  ctx.ellipse(x - 10, y + 4, 7, 19, -.25, 0, Math.PI * 2);
  ctx.ellipse(x + 5, y, 8, 23, .18, 0, Math.PI * 2);
  ctx.ellipse(x + 17, y + 8, 5, 16, .35, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = .85;
  rect(x - 5, y - 9, 4, 4, "#0f1517");
  rect(x + 6, y - 9, 4, 4, "#0f1517");
  ctx.restore();
}

function drawApathyTraces() {
  const trace = APATHY_TRACE_POINTS[state.currentLocation];
  if (!trace || state.storyFlags?.[trace.flag]) return;
  drawApathyTrace(trace.x, trace.y);
}

function drawFineDetails() {
  if (isInteriorLocation()) return;
  const id = state.currentLocation;
  if (id === "village") {
    for (let i = 0; i < 14; i += 1) {
      const x = 88 + Math.floor(hashNoise(i, 33, 5) * 710);
      const y = 70 + Math.floor(hashNoise(i, 37, 6) * 430);
      const tile = tileAtPixel(x, y);
      if ("#~=,:".includes(tile) || isBuildingBlocked(x, y, 16, 16)) continue;
      rect(x, y + 10, 18, 7, "#4f8f4a");
      rect(x + 4, y + 5, 4, 4, i % 2 ? "#f7f0a3" : "#f05d5e");
      rect(x + 11, y + 3, 4, 4, i % 3 ? "#ffe066" : "#e36b5d");
    }
  }
  if (id === "modernBritain") {
    drawKiosk(520, 236, "NEWS");
    drawMarketStall(92, 396, "#466d9f", "Cafe");
    drawMarketStall(668, 388, "#b94e48", "Press");
    drawWorldLabel(548, 206, "Media Plaza", "#5da9e9", 84);
  }
  if (id === "participation") {
    drawBoat(700, 418);
    drawBoat(58, 84);
    drawMarketStall(242, 396, "#6fbf73", "Leaflets");
    drawWorldLabel(246, 366, "Petition Hub", "#6fbf73", 82);
  }
  if (id === "actionWorkshop") {
    drawMarketStall(330, 300, "#b98231", "Tools");
    drawKiosk(584, 304, "DATA");
    drawWorldLabel(458, 264, "Plan Board", "#f2c14e", 78);
  }
  drawRegionLandmarks();
  for (let i = 0; i < 34; i += 1) {
    const x = 40 + Math.floor(hashNoise(i, 14, 1) * 850);
    const y = 46 + Math.floor(hashNoise(i, 21, 2) * 520);
    const tile = tileAtPixel(x, y);
    if (isHarborWater(x, y) || "#~=,:".includes(tile)) continue;
    rect(x, y, 2, 7, id === "rightsLaw" || id === "examHall" ? "#56635a" : "#2f7b42");
    rect(x + 2, y + 1, 3, 3, id === "democracy" ? "#e6d3a4" : "#78c86d");
  }
  if (id === "village") {
    rect(548, 92, 38, 8, "#e6d3a4");
    rect(552, 100, 30, 23, "#b98252");
    rect(558, 105, 18, 3, "#704633");
    rect(558, 113, 18, 3, "#704633");
    drawWorldLabel(566, 64, "Civic Square", "#f2c14e", 82);
  }
  drawApathyTraces();
}

function drawRegionLandmarks() {
  const id = state.currentLocation;
  if (id === "modernBritain") {
    rect(616, 96, 52, 30, "#263036");
    rect(620, 100, 44, 22, "#5da9e9");
    rect(624, 104, 10, 8, "#f5f0df");
    rect(638, 106, 20, 3, "#f5f0df");
    rect(638, 114, 14, 3, "#f2c14e");
    rect(74, 354, 42, 34, "#8f4f44");
    rect(78, 358, 34, 4, "#e6d3a4");
    rect(82, 366, 26, 2, "#5da9e9");
    rect(82, 374, 20, 2, "#6fbf73");
    for (let y = 78; y < 460; y += 42) {
      rect(470, y, 8, 20, "#263036");
      rect(466, y, 16, 4, "#f2c14e");
    }
    return;
  }
  if (id === "rightsLaw") {
    drawWorldLabel(564, 52, "Court Square", "#d7d0c3", 86);
    rect(648, 100, 4, 36, "#f2c14e");
    rect(630, 112, 40, 4, "#f2c14e");
    rect(636, 118, 12, 8, "#d7d0c3");
    rect(654, 118, 12, 8, "#d7d0c3");
    rect(536, 82, 56, 34, "#d7d0c3");
    rect(532, 78, 64, 6, "#665a7d");
    for (let i = 0; i < 4; i += 1) rect(542 + i * 11, 87, 5, 26, "#8d867d");
    rect(548, 72, 32, 5, "#f2c14e");
    rect(292, 242, 328, 5, "#d7d0c3");
    rect(292, 308, 328, 5, "#6f685f");
    return;
  }
  if (id === "democracy") {
    drawWorldLabel(564, 32, "Ballot Hall", "#f2c14e", 78);
    rect(636, 108, 46, 30, "#d8b36a");
    rect(642, 114, 34, 5, "#8f4f44");
    rect(646, 124, 22, 10, "#f5f0df");
    rect(652, 128, 4, 4, "#466d9f");
    rect(536, 74, 54, 46, "#d8b36a");
    rect(530, 70, 66, 8, "#8f4f44");
    rect(558, 48, 10, 24, "#d8b36a");
    rect(552, 44, 22, 5, "#f2c14e");
    rect(544, 86, 8, 20, "#513b35");
    rect(574, 86, 8, 20, "#513b35");
    rect(334, 284, 260, 6, "#e6d3a4");
    for (let x = 350; x < 580; x += 34) rect(x, 270, 8, 28, "#d8b36a");
    return;
  }
  if (id === "participation") {
    rect(438, 86, 5, 44, "#4b3128");
    rect(443, 88, 52, 22, "#6fbf73");
    rect(450, 95, 34, 3, "#f5f0df");
    rect(450, 103, 24, 3, "#f2c14e");
    rect(532, 86, 64, 34, "#b94e48");
    rect(536, 90, 56, 4, "#f5f0df");
    rect(538, 99, 50, 3, "#f2c14e");
    rect(538, 108, 34, 3, "#f5f0df");
    rect(596, 82, 7, 42, "#4b3128");
    rect(603, 84, 28, 18, "#e36b5d");
    for (let y = 100; y < 500; y += 34) {
      rect(162, y, 12, 4, "#c07458");
      rect(756, y + 8, 12, 4, "#c07458");
    }
    return;
  }
  if (id === "actionWorkshop") {
    rect(310, 302, 46, 38, "#d7d0c3");
    rect(316, 308, 34, 5, "#466d9f");
    rect(316, 318, 20, 4, "#6fbf73");
    rect(316, 328, 28, 4, "#f2c14e");
    rect(532, 82, 62, 36, "#9a633f");
    rect(538, 88, 20, 16, "#d7d0c3");
    rect(564, 88, 20, 16, "#d7d0c3");
    rect(541, 94, 14, 2, "#466d9f");
    rect(567, 94, 14, 2, "#6fbf73");
    rect(552, 112, 22, 5, "#f2c14e");
    rect(398, 294, 118, 58, "#263036");
    for (let i = 0; i < 4; i += 1) rect(410 + i * 24, 308, 15, 30, ["#5da9e9", "#6fbf73", "#f2c14e", "#e36b5d"][i]);
    return;
  }
  if (id === "examHall") {
    drawWorldLabel(564, 36, "Exam Gate", "#b089d6", 74);
    rect(636, 118, 56, 34, "#263036");
    rect(642, 124, 44, 6, "#5da9e9");
    rect(642, 134, 34, 4, "#f5f0df");
    rect(642, 143, 25, 4, "#f2c14e");
    rect(536, 72, 56, 48, "#6b5b8f");
    rect(530, 66, 16, 54, "#5c5470");
    rect(582, 66, 16, 54, "#5c5470");
    rect(548, 58, 32, 12, "#d7d0c3");
    rect(556, 94, 16, 24, "#2d2521");
    rect(540, 78, 6, 6, "#f2c14e");
    rect(586, 78, 6, 6, "#f2c14e");
    rect(292, 314, 330, 6, "#d7d0c3");
    rect(306, 330, 302, 4, "#5c5470");
    for (let x = 310; x < 610; x += 48) rect(x, 286, 18, 18, "#f2c14e");
  }
}

function drawInteractionHint() {
  const found = findInteractable();
  if (!found || activeQuestion || !dialogue.classList.contains("hidden")) return;
  const x = found.item.x + 12;
  const y = found.item.y - 24;
  const label = found.type === "examRoom"
    ? "E Practice"
    : found.type === "buildingDoor"
      ? "E Enter"
      : found.type === "studyStation"
        ? "E Study"
        : found.type === "exitDoor"
          ? "E Exit"
          : "E";
  const width = found.type === "examRoom"
    ? 72
    : found.type === "buildingDoor" || found.type === "studyStation"
      ? 68
      : found.type === "exitDoor"
        ? 56
        : 36;
  ctx.fillStyle = "#111719";
  ctx.fillRect(x - width / 2, y - 14, width, 20);
  ctx.strokeStyle = "#f2c14e";
  ctx.strokeRect(x - width / 2, y - 14, width, 20);
  ctx.fillStyle = "#f5f0df";
  ctx.font = "13px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y + 1);
}

function drawInteractionRangeHighlight() {
  const found = findInteractable();
  if (!found || activeQuestion || !dialogue.classList.contains("hidden")) return;
  const item = found.item;
  const x = item.x + 12;
  const y = item.y + 16;
  const color = found.type === "npc" && item.miniGameId ? "#5da9e9" : "#f2c14e";
  const baseRx = found.type === "npc" ? 24 : 20;
  const pulse = settings.reducedMotion ? 0 : 0.5 + 0.5 * Math.sin(animationClockMs / 260);
  ctx.save();
  ctx.globalAlpha = .72;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 22, baseRx, 8, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = .24;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 22, baseRx, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // §G9: gentle expanding pulse ring so an in-range interactable reads more clearly.
  if (pulse > 0) {
    ctx.globalAlpha = .34 * (1 - pulse);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + 22, baseRx + 3 + pulse * 7, 8 + pulse * 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWorld() {
  const visual = locColors();
  drawGroundLayer();
  drawPathLayer();
  drawBuildingLayer(visual);
  drawPropLayer();
  drawAmbientLayer();
  drawCharacterLayer();
  drawUiWorldLayer();
}

function drawGroundLayer() {
  const map = currentMap();
  map.forEach((row, r) => {
    [...row].forEach((ch, c) => drawTile(ch, c * LOGICAL_TILE, r * LOGICAL_TILE, r, c, map));
  });
}

function drawPathLayer() {
  drawStonePlaza();
}

function drawBuildingLayer(visual) {
  (currentLayout().buildings || WORLD_LAYOUTS.village.buildings).forEach((building, index) => {
    drawBuilding(
      building.x,
      building.y,
      building.w,
      building.h,
      building.wall,
      visual[building.roof] || visual.roofA || "#8f4f44",
      regionBuildingLabel(index),
      building.kind
    );
  });
}

function drawPropLayer() {
  if (isInteriorLocation()) {
    drawInteriorDecor();
    drawStudyStations();
    drawInteriorExit();
    return;
  }
  drawBuildingDoors();
  drawSigns();
  props.filter((prop) => !prop.location || prop.location === state.currentLocation).forEach(drawProp);
  drawMiniGameTriggerMarkers();
  drawFineDetails();
}

function drawAmbientLayer() {
  if (settings.reducedMotion) return;
  drawFootstepDust();
  drawAmbientParticles();
  if (!isInteriorLocation()) drawChimneySmoke();
}

function drawAmbientParticles() {
  const atmo = currentAtmosphere();
  if (!atmo.particle || atmo.particle === "none") return;
  const t = animationClockMs / 1000;
  const count = atmo.pCount || 20;
  ctx.save();
  for (let i = 0; i < count; i += 1) {
    const sx = hashNoise(i, 1, 13);
    const sy = hashNoise(i, 2, 13);
    const phase = hashNoise(i, 3, 13) * Math.PI * 2;
    let px = sx * VIEW_W;
    let py = sy * VIEW_H;
    let alpha = .4;
    let size = 2;
    if (atmo.particle === "pollen") {
      px += Math.sin(t * .5 + phase) * 10;
      py = (py - t * 12) % VIEW_H;
      if (py < 0) py += VIEW_H;
      alpha = .28 + .26 * (.5 + .5 * Math.sin(t * 1.6 + phase));
      size = 2 + (i % 2);
    } else if (atmo.particle === "dust") {
      px += Math.sin(t * .35 + phase) * 6;
      py += Math.cos(t * .3 + phase) * 6;
      alpha = .12 + .12 * (.5 + .5 * Math.sin(t * 1.1 + phase));
      size = 1 + (i % 2);
    } else if (atmo.particle === "sparkle") {
      const tw = .5 + .5 * Math.sin(t * 2.4 + phase);
      alpha = .1 + .46 * tw * tw;
      size = 1 + Math.round(tw);
    }
    ctx.fillStyle = `${atmo.pColor}${alpha.toFixed(3)})`;
    ctx.fillRect(Math.round(camera.x + px), Math.round(camera.y + py), size, size);
  }
  ctx.restore();
}

function drawChimneySmoke() {
  const buildings = currentLayout().buildings || [];
  if (!buildings.length) return;
  const t = animationClockMs / 1000;
  ctx.save();
  buildings.forEach((b, idx) => {
    const kind = b.kind || buildingKindFromLabel(regionBuildingLabel(idx));
    let cx, cy;
    if (kind === "press") {
      cx = b.x + 15;
      cy = b.y - 62;
    } else if (kind === "campaign" || kind === "generic") {
      cx = b.x + b.w - 14;
      cy = b.y - 46;
    } else {
      return; // typed roofs (townhall/court/library/police/garden/exam) have no smoking chimney
    }
    for (let p = 0; p < 3; p += 1) {
      const seed = hashNoise(idx, p, 21);
      const cycle = (t * .32 + seed) % 1;
      const puffY = cy - cycle * 30;
      const puffX = cx + Math.sin(cycle * 4 + seed * 6) * 5;
      const size = 3 + cycle * 6;
      const alpha = (1 - cycle) * .2;
      ctx.fillStyle = `rgba(226,226,232,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(puffX, puffY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function getAtmosphereVignette(key, strength) {
  if (atmosphereGradientCache[key]) return atmosphereGradientCache[key];
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy * .92, canvas.height * .26, cx, cy, canvas.height * .82);
  grad.addColorStop(0, "rgba(8,10,14,0)");
  grad.addColorStop(.7, `rgba(8,10,14,${(strength * .35).toFixed(3)})`);
  grad.addColorStop(1, `rgba(8,10,14,${strength.toFixed(3)})`);
  atmosphereGradientCache[key] = grad;
  return grad;
}

function drawAtmosphereOverlay() {
  const atmo = currentAtmosphere();
  const [r, g, b] = atmo.grade;
  ctx.save();
  ctx.fillStyle = `rgba(${r},${g},${b},${atmo.gradeAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!atmosphereGradientCache.lightTop) {
    const lg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    lg.addColorStop(0, "rgba(255,248,222,.10)");
    lg.addColorStop(.45, "rgba(255,248,222,0)");
    lg.addColorStop(1, "rgba(18,22,38,.13)");
    atmosphereGradientCache.lightTop = lg;
  }
  ctx.fillStyle = atmosphereGradientCache.lightTop;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = getAtmosphereVignette(`vig_${atmo.vignette}`, atmo.vignette);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// Ambient walkers are decorative villagers, separate from the interactive `npcs`
// array, so they never affect interaction, quests, doors/gates, routes or saves.
// They are NOT solid to the player (player collision only checks tiles/buildings),
// so they can never block a path. Rebuilt on every setLocation; not persisted.
function spawnAmbientWalkers() {
  ambientWalkers.length = 0;
  if (isInteriorLocation()) return;
  const map = currentMap();
  const cols = map[0].length;
  const rows = map.length;
  const spawn = safeSpawnFor();
  const count = 3;
  let tries = 0;
  while (ambientWalkers.length < count && tries < 220) {
    tries += 1;
    const seed = tries * 1.37 + ambientWalkers.length * 11.3;
    const col = 2 + Math.floor(hashNoise(seed, 1, 41) * (cols - 4));
    const row = 2 + Math.floor(hashNoise(seed, 2, 41) * (rows - 4));
    const x = col * LOGICAL_TILE + 5;
    const y = row * LOGICAL_TILE + 2;
    if (tileKind(map[row][col]) !== "grass") continue;
    if (isBlocked(x, y, 22, 32)) continue;
    if (Math.hypot(x - spawn.x, y - spawn.y) < 96) continue;
    if (ambientWalkers.some((w) => Math.hypot(x - w.homeX, y - w.homeY) < 70)) continue;
    const hairs = HAIR_COLORS;
    const skins = SKIN_TONES;
    const coat = WALKER_COATS[Math.floor(hashNoise(seed, 3, 41) * WALKER_COATS.length)];
    const walker = {
      x, y, homeX: x, homeY: y, tx: x, ty: y,
      w: 22, h: 32, dir: "down", step: 0, moving: false,
      pause: 300 + hashNoise(seed, 4, 41) * 1800,
      speed: 0.04 + hashNoise(seed, 5, 41) * 0.02,
      coat,
      coatLt: shadeHex(coat, 20),
      coatDk: shadeHex(coat, -22),
      skin: skins[Math.floor(hashNoise(seed, 6, 41) * skins.length)],
      hair: hairs[Math.floor(hashNoise(seed, 7, 41) * hairs.length)]
    };
    pickWalkerTarget(walker);
    ambientWalkers.push(walker);
  }
}

function pickWalkerTarget(w) {
  const radius = 56;
  for (let i = 0; i < 8; i += 1) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * radius;
    const tx = w.homeX + Math.cos(ang) * dist;
    const ty = w.homeY + Math.sin(ang) * dist;
    if (!isBlocked(tx, ty, w.w, w.h)) {
      w.tx = tx;
      w.ty = ty;
      return;
    }
  }
  w.tx = w.homeX;
  w.ty = w.homeY;
}

function updateAmbientWalkers(dt) {
  if (!ambientWalkers.length || isInteriorLocation()) return;
  if (settings.reducedMotion) {
    ambientWalkers.forEach((w) => { w.moving = false; });
    return;
  }
  ambientWalkers.forEach((w) => {
    if (w.pause > 0) {
      w.pause -= dt;
      w.moving = false;
      return;
    }
    const dx = w.tx - w.x;
    const dy = w.ty - w.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1.5) {
      w.pause = 700 + Math.random() * 2600;
      w.moving = false;
      pickWalkerTarget(w);
      return;
    }
    const stepPx = Math.min(dist, w.speed * dt);
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = w.x + ux * stepPx;
    const ny = w.y + uy * stepPx;
    let moved = false;
    if (!isBlocked(nx, w.y, w.w, w.h)) { w.x = nx; moved = true; }
    if (!isBlocked(w.x, ny, w.w, w.h)) { w.y = ny; moved = true; }
    if (!moved) {
      w.pause = 300 + Math.random() * 900;
      pickWalkerTarget(w);
      w.moving = false;
      return;
    }
    w.dir = Math.abs(ux) > Math.abs(uy) ? (ux < 0 ? "left" : "right") : (uy < 0 ? "up" : "down");
    w.step += stepPx;
    w.moving = true;
  });
}

function drawAmbientWalker(w) {
  const x = Math.round(w.x);
  const y = Math.round(w.y);
  const outline = "#1b232c";
  const frame = w.moving ? Math.floor(w.step / 4) % 4 : 0;
  const bob = frame === 1 || frame === 3 ? 1 : 0;
  const legA = frame === 1 ? 3 : 0;
  const legB = frame === 3 ? 3 : 0;
  ctx.save();
  ctx.globalAlpha = .26;
  ctx.fillStyle = "#10160f";
  ctx.beginPath();
  ctx.ellipse(x + 12, y + 46, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  rect(x + 6, y + 38, 6, 8 + legA, "#2b2d2f");
  rect(x + 14, y + 38, 6, 8 + legB, "#22262a");
  rect(x + 5, y + 45 + legA, 8, 3, "#4a2f25");
  rect(x + 14, y + 45 + legB, 8, 3, "#4a2f25");
  const torsoY = y + 16 + bob;
  rect(x + 3, torsoY - 1, 20, 23, outline);
  rect(x + 4, torsoY, 18, 21, w.coat);
  rect(x + 4, torsoY, 4, 21, w.coatLt);
  rect(x + 18, torsoY, 4, 21, w.coatDk);
  rect(x + 1, torsoY + 1, 4, 15, outline);
  rect(x + 2, torsoY + 2, 3, 13, w.coatDk);
  rect(x + 21, torsoY + 1, 4, 15, outline);
  rect(x + 22, torsoY + 2, 3, 13, w.coatLt);
  rect(x + 4, y + 1 + bob, 18, 17, outline);
  rect(x + 5, y + 2 + bob, 16, 15, w.skin);
  rect(x + 18, y + 3 + bob, 3, 13, shadeHex(w.skin, -24));
  if (w.dir === "up") {
    rect(x + 4, y + 1 + bob, 18, 13, w.hair);
  } else {
    rect(x + 4, y + bob, 18, 7, w.hair);
    rect(x + 4, y + 6 + bob, 3, 8, w.hair);
    rect(x + 19, y + 6 + bob, 3, 8, w.hair);
    rect(x + 4, y + bob, 18, 2, shadeHex(w.hair, 32));
    if (w.dir !== "down") {
      const ex = w.dir === "left" ? x + 8 : x + 14;
      rect(ex, y + 9 + bob, 2, 2, "#243140");
    } else {
      rect(x + 8, y + 9 + bob, 2, 2, "#243140");
      rect(x + 15, y + 9 + bob, 2, 2, "#243140");
    }
  }
}

function drawCharacterLayer() {
  const renderables = [
    ...npcs.map((npc) => ({ type: "npc", y: npc.y + 48, entity: npc })),
    ...ambientWalkers.map((w) => ({ type: "walker", y: w.y + 48, entity: w })),
    { type: "player", y: state.player.y + state.player.h, entity: state.player }
  ].sort((a, b) => a.y - b.y);

  renderables.forEach((renderable) => {
    if (renderable.type === "player") drawPlayer();
    else if (renderable.type === "walker") drawAmbientWalker(renderable.entity);
    else drawPerson(renderable.entity);
  });
  drawMiniGameHostMarkers();
}

function drawUiWorldLayer() {
  drawInteractionRangeHighlight();
  drawInteractionHint();
}

function regionBuildingLabel(index) {
  return (BUILDING_LABELS[state.currentLocation] || BUILDING_LABELS.village)[index];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  updateCamera();
  ctx.save();
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.translate(-camera.x, -camera.y);
  drawWorld();
  ctx.restore();
  drawAtmosphereOverlay();
  drawScreenUi();
}

function drawScreenUi() {
  if (state.knowledge >= 100) {
    ctx.fillStyle = "rgba(17, 23, 25, .74)";
    ctx.fillRect(canvas.width / 2 - 220, 18, 440, 52);
    ctx.strokeStyle = "#f2c14e";
    ctx.strokeRect(canvas.width / 2 - 220, 18, 440, 52);
    ctx.fillStyle = "#f5f0df";
    ctx.font = "20px Georgia";
    ctx.textAlign = "center";
    ctx.fillText("Chapter 1 complete: Informed Citizen", canvas.width / 2, 51);
  }
  drawRegionTransition();
}

// §G9: screen-space fade that eases out after a location change (peaks at the start,
// fades to clear). Skipped entirely under Reduced Motion (regionTransitionMs stays 0).
function drawRegionTransition() {
  if (regionTransitionMs <= 0) return;
  const t = regionTransitionMs / REGION_TRANSITION_MS;
  const alpha = Math.min(0.6, t * 0.6);
  ctx.save();
  ctx.fillStyle = `rgba(12, 16, 20, ${alpha.toFixed(3)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function loop() {
  const timestamp = nowMs();
  if (lastFrameTimestamp === null) lastFrameTimestamp = timestamp;
  frameDeltaMs = Math.min(100, Math.max(0, timestamp - lastFrameTimestamp));
  lastFrameTimestamp = timestamp;
  animationClockMs += frameDeltaMs;

  movePlayer();
  updateAmbientWalkers(frameDeltaMs);
  updateFootstepDust(frameDeltaMs);
  if (regionTransitionMs > 0) regionTransitionMs = Math.max(0, regionTransitionMs - frameDeltaMs);
  if (messageTimer > 0) {
    messageTimer -= 1;
    if (messageTimer === 0 && !activeNpc) hideDialogue();
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = inputKey(event);
  const typing = ["input", "textarea", "select"].includes(event.target?.tagName?.toLowerCase());
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === "escape") {
    if (closeTopOverlay()) return;
    if (!choicePanel.classList.contains("hidden")) {
      hidePanel();
      return;
    }
    if (!dialogue.classList.contains("hidden")) {
      hideDialogue();
      return;
    }
    return;
  }
  if (key === "i" && !typing) {
    event.preventDefault();
    toggleInventoryPanel();
    return;
  }
  if (key === "p" && !typing) {
    event.preventDefault();
    toggleProgressPanel();
    return;
  }
  if (key === "c" && !typing) {
    event.preventDefault();
    toggleCharacterPanel();
    return;
  }
  if (key === "g" && !typing) {
    event.preventDefault();
    openMiniGameHub();
    return;
  }
  if (key === "e" && !typing) interact();
  if (key === "r" && !typing) {
    if (window.confirm("Start a new game and delete saved progress?")) {
      resetGame();
    }
  }
  if (["1", "2", "3"].includes(key) && !typing) {
    clickVisibleAnswerButton(Number(key) - 1);
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(inputKey(event));
});

choicePanel.addEventListener("click", (event) => {
  const reviewChoice = event.target.closest("button[data-review-entry]");
  if (reviewChoice) {
    showReviewJournal(reviewChoice.dataset.reviewEntry);
    return;
  }
  const examPractice = event.target.closest("button[data-exam-practice]");
  if (examPractice) {
    completeExamPractice(examPractice.dataset.examPractice);
    return;
  }
  const studyStation = event.target.closest("button[data-study-station]");
  if (studyStation) {
    completeStudyStation(studyStation.dataset.studyStation);
    return;
  }
  const studyAnswer = event.target.closest("button[data-study-answer][data-study-station-id]");
  if (studyAnswer) {
    const station = currentStudyStations().find((item) => item.id === studyAnswer.dataset.studyStationId);
    const selected = Number(studyAnswer.dataset.studyAnswer);
    const correct = station?.correct ?? -1;
    markAnswerThen(studyAnswer, selected === correct, `button[data-study-answer="${correct}"][data-study-station-id="${studyAnswer.dataset.studyStationId}"]`, () => {
      answerStudyStation(studyAnswer.dataset.studyStationId, selected);
    });
    return;
  }
  const gateAnswer = event.target.closest("button[data-gate-answer]");
  if (gateAnswer) {
    const gate = state.pendingGate;
    const check = gate ? WORLD[gate.location]?.gateQuestions[gate.index] : null;
    const selected = Number(gateAnswer.dataset.gateAnswer);
    const correct = check?.correct ?? -1;
    markAnswerThen(gateAnswer, selected === correct, `button[data-gate-answer="${correct}"]`, () => answerGate(selected));
    return;
  }
  const questAnswer = event.target.closest("button[data-quest-answer]");
  if (questAnswer) {
    const selected = Number(questAnswer.dataset.questAnswer);
    const correct = pendingQuestTurnIn?.correct ?? -1;
    markAnswerThen(questAnswer, selected === correct, `button[data-quest-answer="${correct}"]`, () => answerQuest(selected));
    return;
  }
  const shopBuy = event.target.closest("button[data-shop-buy]");
  if (shopBuy) {
    buyShopItem(npcById(shopBuy.dataset.npc), Number(shopBuy.dataset.shopBuy));
    return;
  }
  const menuButton = event.target.closest("button[data-menu]");
  if (menuButton) {
    const action = menuButton.dataset.menu;
    const npc = npcById(menuButton.dataset.npc);
    if (action === "close") hidePanel();
    if (action === "finalEnding") {
      hidePanel();
      showFinalEnding();
    }
    if (action === "finalExam") {
      hidePanel();
      openMiniGame("examSimulation");
    }
    if (action === "back" && npc) showNpcMenu(npc);
    if (action === "talk" && npc) {
      hidePanel();
      showDialogue(npc.name, npc.intro, "Press E to close.", "talk");
    }
    if (action === "quests" && npc) showQuestList(npc);
    if (action === "askQuest" && npc) askQuestTarget(npc);
    if (action === "turnIn" && npc) showTurnInQuestion(npc);
    if (action === "trade" && npc) showTradeMenu(npc);
    if (action === "travel" && npc) showTravelGate(npc);
    if (action === "miniGame" && npc?.miniGameId) {
      hidePanel();
      openMiniGame(npc.miniGameId);
    }
    if (action === "acceptQuest") acceptQuest(menuButton.dataset.quest);
    return;
  }
  const button = event.target.closest("button[data-answer]");
  if (button) {
    const check = activeQuestion?.checks?.[activeCheckIndex];
    const selected = Number(button.dataset.answer);
    const correct = check?.correct ?? -1;
    markAnswerThen(button, selected === correct, `button[data-answer="${correct}"]`, () => answer(selected));
  }
});

inventoryList.addEventListener("click", (event) => {
  handleInventoryAction(event);
});

inventoryPanelBody?.addEventListener("click", (event) => {
  handleInventoryAction(event);
});

inventoryPanelBody?.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const selectedRow = event.target.closest("[data-item-select]");
  if (!selectedRow) return;
  event.preventDefault();
  selectedInventoryItemId = selectedRow.dataset.itemSelect;
  renderInventoryPanel();
});

inventoryOpenButton?.addEventListener("click", () => openInventoryPanel());
inventoryCloseButton?.addEventListener("click", () => closeInventoryPanel());
inventoryPanel?.addEventListener("click", (event) => {
  if (event.target === inventoryPanel) closeInventoryPanel();
});

progressOpenButton?.addEventListener("click", () => openProgressPanel("story"));
progressCloseButton?.addEventListener("click", () => closeProgressPanel());
progressPanel?.addEventListener("click", (event) => {
  if (event.target === progressPanel) {
    closeProgressPanel();
    return;
  }
  const miniGameButton = event.target.closest("button[data-minigame-start]");
  if (miniGameButton) {
    openMiniGame(miniGameButton.dataset.minigameStart);
    return;
  }
  const tabButton = event.target.closest("button[data-progress-tab]");
  if (!tabButton) return;
  currentProgressTab = tabButton.dataset.progressTab;
  renderProgressPanel();
});

characterOpenButton?.addEventListener("click", () => openCharacterPanel());
characterCloseButton?.addEventListener("click", () => closeCharacterPanel());
characterPanel?.addEventListener("click", (event) => {
  if (event.target === characterPanel) {
    closeCharacterPanel();
    return;
  }
  const statButton = event.target.closest("button[data-character-stat]");
  if (!statButton) return;
  allocateStat(statButton.dataset.characterStat);
});

storyContinueButton?.addEventListener("click", () => hideStoryPanel());
storyPanel?.addEventListener("click", (event) => {
  if (event.target === storyPanel) hideStoryPanel();
});

miniGameOpenButton?.addEventListener("click", () => openMiniGameHub());
miniGameCloseButton?.addEventListener("click", () => closeMiniGamePanel());
miniGamePanel?.addEventListener("click", (event) => {
  if (event.target === miniGamePanel) {
    closeMiniGamePanel();
    return;
  }
  const choice = event.target.closest("button[data-minigame-choice]");
  if (choice) {
    answerMiniGame(Number(choice.dataset.minigameChoice));
    return;
  }
  const letterKey = event.target.closest("button[data-minigame-letter]");
  if (letterKey) {
    guessLetter(letterKey.dataset.minigameLetter);
    return;
  }
  const defineChoice = event.target.closest("button[data-minigame-define]");
  if (defineChoice) {
    answerWordDefinition(Number(defineChoice.dataset.minigameDefine));
    return;
  }
  if (event.target.closest("button[data-minigame-next]")) {
    advanceMiniGame();
    return;
  }
  const replay = event.target.closest("button[data-minigame-replay]");
  if (replay) {
    openMiniGame(replay.dataset.minigameReplay);
    return;
  }
  if (event.target.closest("button[data-minigame-close]")) closeMiniGamePanel();
  if (event.target.closest("button[data-minigame-ending]")) {
    closeMiniGamePanel();
    showFinalEnding();
  }
});

settingsOpenButton?.addEventListener("click", () => openSettingsPanel());
settingsCloseButton?.addEventListener("click", () => closeSettingsPanel());
settingsPanel?.addEventListener("click", (event) => {
  if (event.target === settingsPanel) {
    closeSettingsPanel();
    return;
  }
  const toggle = event.target.closest("button[data-setting-toggle]");
  if (toggle) {
    toggleSetting(toggle.dataset.settingToggle);
    return;
  }
  if (event.target.closest("button[data-settings-reset-save]")) resetSaveFromSettings();
});

function handleInventoryAction(event) {
  const button = event.target.closest("button[data-action][data-item]");
  const unequipButton = event.target.closest("button[data-action='unequip'][data-slot]");
  const selectedRow = event.target.closest("[data-item-select]");
  if (!button && !unequipButton && !selectedRow) return;
  if (unequipButton) {
    unequipItem(unequipButton.dataset.slot);
    return;
  }
  if (!button && selectedRow) {
    selectedInventoryItemId = selectedRow.dataset.itemSelect;
    renderInventoryPanel();
    return;
  }
  const { action, item } = button.dataset;
  if (action === "equip") equipItem(item);
  if (action === "use") useItem(item);
  if (action === "sell") sellItem(item);
}

function overlayPanels() {
  return {
    inventory: inventoryPanel,
    progress: progressPanel,
    character: characterPanel,
    story: storyPanel,
    miniGame: miniGamePanel,
    settings: settingsPanel
  };
}

function closeOverlays(except = null) {
  Object.entries(overlayPanels()).forEach(([key, panel]) => {
    if (key !== except) panel?.classList.add("hidden");
  });
  if (except !== "miniGame") activeMiniGame = null;
}

function closeTopOverlay() {
  const open = Object.values(overlayPanels()).find((panel) => panel && !panel.classList.contains("hidden"));
  if (!open) return false;
  closeOverlays();
  return true;
}

function openInventoryPanel() {
  closeOverlays("inventory");
  renderInventoryPanel();
  inventoryPanel?.classList.remove("hidden");
}

function closeInventoryPanel() {
  inventoryPanel?.classList.add("hidden");
}

function toggleInventoryPanel() {
  if (!inventoryPanel) return;
  if (inventoryPanel.classList.contains("hidden")) openInventoryPanel();
  else closeInventoryPanel();
}

function openProgressPanel(tab = currentProgressTab) {
  closeOverlays("progress");
  currentProgressTab = tab;
  renderProgressPanel();
  progressPanel?.classList.remove("hidden");
}

function closeProgressPanel() {
  progressPanel?.classList.add("hidden");
}

function toggleProgressPanel() {
  if (!progressPanel) return;
  if (progressPanel.classList.contains("hidden")) openProgressPanel();
  else closeProgressPanel();
}

function openCharacterPanel() {
  closeOverlays("character");
  renderCharacterPanel();
  characterPanel?.classList.remove("hidden");
}

function closeCharacterPanel() {
  characterPanel?.classList.add("hidden");
}

function toggleCharacterPanel() {
  if (!characterPanel) return;
  if (characterPanel.classList.contains("hidden")) openCharacterPanel();
  else closeCharacterPanel();
}

function renderSettingsPanel() {
  if (!settingsPanelBody) return;
  const rows = [
    ["largeText", "Large text", "Increase interface text size for easier reading."],
    ["highContrast", "High contrast", "Use brighter text and stronger borders."],
    ["reducedMotion", "Reduced motion", "Minimise interface animation and transitions."]
  ].map(([key, label, description]) => `
    <div class="settings-row">
      <div>
        <strong>${label}</strong>
        <small>${description}</small>
      </div>
      <button type="button" class="settings-toggle${settings[key] ? " is-on" : ""}" data-setting-toggle="${key}" aria-pressed="${settings[key] ? "true" : "false"}">${settings[key] ? "On" : "Off"}</button>
    </div>
  `).join("");
  settingsPanelBody.innerHTML = `
    ${rows}
    <div class="settings-danger">
      <strong>Reset save</strong>
      <small>Delete local progress for this browser. Display settings are kept.</small>
      <button type="button" class="reset-button" data-settings-reset-save>Reset save</button>
    </div>
  `;
}

function openSettingsPanel() {
  closeOverlays("settings");
  renderSettingsPanel();
  settingsPanel?.classList.remove("hidden");
}

function closeSettingsPanel() {
  settingsPanel?.classList.add("hidden");
}

function toggleSetting(key) {
  if (!(key in settings)) return;
  settings[key] = !settings[key];
  saveSettings();
  applySettings();
  renderSettingsPanel();
}

function resetSaveFromSettings() {
  if (!window.confirm("Delete saved progress and return to the title screen?")) return;
  localStorage.removeItem(SAVE_KEY);
  closeOverlays();
  showTitleScreen({ restart: true });
}

reviewList?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-review-entry]");
  if (!button) return;
  showReviewJournal(button.dataset.reviewEntry);
});

reviewButton?.addEventListener("click", () => showReviewJournal());

function releaseTouchKey(event) {
  const key = event.currentTarget.dataset.touchKey;
  if (key) keys.delete(key);
  event.currentTarget.classList.remove("is-active");
}

if (touchControls) {
  touchControls.querySelectorAll("[data-touch-key]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      keys.add(button.dataset.touchKey);
      button.classList.add("is-active");
    });
    button.addEventListener("pointerup", releaseTouchKey);
    button.addEventListener("pointercancel", releaseTouchKey);
    button.addEventListener("pointerleave", releaseTouchKey);
    button.addEventListener("lostpointercapture", releaseTouchKey);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });
  touchControls.querySelector("[data-touch-action]")?.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    interact();
  });
}

resetButton.addEventListener("click", () => {
  showTitleScreen({ restart: true });
});

setupDevTravel();
bootstrapApp();

function bootstrapApp() {
  const titleEl = document.getElementById("titleScreen");
  const customEl = document.getElementById("customScreen");
  if (!titleEl || !customEl) {
    saveReady = true;
    if (!loadGame()) saveGame();
    updateHud();
    if (!gameStarted) { gameStarted = true; loop(); }
    return;
  }
  wireTitleScreen();
  wireCustomScreen();
  showTitleScreen({ restart: false });
}

function showTitleScreen({ restart }) {
  const titleEl = document.getElementById("titleScreen");
  const customEl = document.getElementById("customScreen");
  if (!titleEl) return;
  customEl?.classList.add("hidden");
  titleEl.classList.remove("hidden");
  const continueBtn = document.getElementById("titleContinueBtn");
  if (continueBtn) {
    const canContinue = !restart && hasSavedGame();
    continueBtn.disabled = !canContinue;
    continueBtn.classList.toggle("is-disabled", !canContinue);
  }
}

function wireTitleScreen() {
  document.getElementById("titleNewBtn")?.addEventListener("click", () => openCustomScreen());
  document.getElementById("titleContinueBtn")?.addEventListener("click", () => {
    if (!hasSavedGame()) return;
    document.getElementById("titleScreen")?.classList.add("hidden");
    startGameWithSave();
  });
  document.getElementById("titleCreditsBtn")?.addEventListener("click", () => {
    const box = document.getElementById("titleCredits");
    if (box) box.classList.toggle("hidden");
  });
}

function openCustomScreen() {
  const titleEl = document.getElementById("titleScreen");
  const customEl = document.getElementById("customScreen");
  if (!customEl) return;
  titleEl?.classList.add("hidden");
  const errorBox = document.getElementById("introError");
  if (errorBox) { errorBox.textContent = ""; errorBox.classList.add("hidden"); }
  try {
    ensureCustomControls();
    syncCustomControls();
  } catch (err) {
    console.error("[intro] render failed", err);
    if (errorBox) {
      errorBox.textContent = `Render error: ${err && err.message ? err.message : err}`;
      errorBox.classList.remove("hidden");
    }
  }
  customEl.classList.remove("hidden");
  const nameInput = document.getElementById("customNameInput");
  if (nameInput && !nameInput.value) nameInput.value = state.profile?.name || "Citizen";
}

function presetButtonHtml(preset) {
  const outfit = ITEMS[preset.outfit] || ITEMS.schoolJumper;
  const accent = ACCENT_COLORS[preset.accent] || ACCENT_COLORS.ember;
  const isOn = preset.id === customSelection.presetId;
  return `<button type="button" class="preset-card${isOn ? " is-selected" : ""}" data-preset="${preset.id}">`
    + `<span class="preset-avatar" style="background:${outfit.color}">`
    + `<span class="preset-accent" style="background:${accent}"></span>`
    + `<span class="preset-hair preset-hair-${preset.gender}"></span>`
    + `</span>`
    + `<span class="preset-label">${preset.label}</span>`
    + `<span class="preset-sub">${outfit.name}</span>`
    + `</button>`;
}

function ensureCustomControls() {
  const grid = document.getElementById("presetGrid");
  if (!grid) { console.warn("[intro] presetGrid missing"); return; }
  const row = document.getElementById("accentRow");
  if (!row) { console.warn("[intro] accentRow missing"); return; }
  if (!grid.querySelector("button[data-preset]")) {
    grid.innerHTML = PROFILE_PRESETS.map(presetButtonHtml).join("");
  }
  if (!row.querySelector("button[data-accent]")) {
    row.innerHTML = Object.entries(ACCENT_COLORS).map(([id, color]) => (
      `<button type="button" class="swatch" data-accent="${id}" style="background:${color}" aria-label="${id} accent"></button>`
    )).join("");
  }
  console.log("[intro] controls ready", grid.querySelectorAll("button[data-preset]").length, "presets");
}

function syncCustomControls() {
  document.querySelectorAll("#presetGrid button[data-preset]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.preset === customSelection.presetId);
  });
  document.querySelectorAll("#accentRow button[data-accent]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.accent === customSelection.accent);
  });
}

function handlePresetGridClick(event) {
  const btn = event.target.closest("button[data-preset]");
  if (!btn) return;
  const preset = PROFILE_PRESETS.find((p) => p.id === btn.dataset.preset);
  if (!preset) return;
  console.log("[intro] preset clicked", preset.id);
  customSelection.presetId = preset.id;
  customSelection.gender = preset.gender;
  customSelection.outfit = preset.outfit;
  customSelection.accent = preset.accent;
  syncCustomControls();
}

function handleAccentRowClick(event) {
  const btn = event.target.closest("button[data-accent]");
  if (!btn) return;
  console.log("[intro] accent clicked", btn.dataset.accent);
  customSelection.accent = btn.dataset.accent;
  syncCustomControls();
}

const customSelection = {
  presetId: "boySchool",
  gender: "boy",
  outfit: "schoolJumper",
  accent: "ember"
};

function wireCustomScreen() {
  const customEl = document.getElementById("customScreen");
  customEl?.addEventListener("pointerdown", handleCustomScreenActivation, true);
  customEl?.addEventListener("click", handleCustomScreenActivation, true);
}

function handleCustomScreenActivation(event) {
  const customEl = document.getElementById("customScreen");
  if (!customEl || customEl.classList.contains("hidden")) return;
  if (!event.target.closest("#customScreen")) return;
  const presetButton = event.target.closest("button[data-preset]");
  if (presetButton) {
    event.preventDefault();
    handlePresetGridClick(event);
    return;
  }
  const accentButton = event.target.closest("button[data-accent]");
  if (accentButton) {
    event.preventDefault();
    handleAccentRowClick(event);
    return;
  }
  if (event.target.closest("#customBackBtn")) {
    event.preventDefault();
    console.log("[intro] back clicked");
    showTitleScreen({ restart: false });
    return;
  }
  if (event.target.closest("#customStartBtn")) {
    event.preventDefault();
    console.log("[intro] start clicked", customSelection);
    const nameInput = document.getElementById("customNameInput");
    const profile = sanitiseProfile({
      name: nameInput?.value,
      presetId: customSelection.presetId,
      gender: customSelection.gender,
      outfit: customSelection.outfit,
      accent: customSelection.accent
    });
    document.getElementById("customScreen")?.classList.add("hidden");
    startGameNew(profile);
  }
}

function startGameWithSave() {
  saveReady = true;
  if (!loadGame()) {
    saveGame();
  }
  updateHud();
  if (!gameStarted) { gameStarted = true; loop(); }
}

function startGameNew(profile) {
  saveReady = true;
  resetGame({ profile });
  updateHud();
  showStoryBeat("intro", { force: true });
  if (!gameStarted) { gameStarted = true; loop(); }
}
