const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");

function makeClassList() {
    const classes = new Set(["hidden"]);
    return {
        contains: (name) => classes.has(name),
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        toggle(name, force) {
            if (force === true) classes.add(name);
            else if (force === false) classes.delete(name);
            else if (classes.has(name)) classes.delete(name);
            else classes.add(name);
            return classes.has(name);
        }
    };
}

function makeElement(id = "") {
    return {
        id,
        classList: makeClassList(),
        style: {},
        dataset: {},
        innerHTML: "",
        textContent: "",
        value: "",
        disabled: false,
        addEventListener() { },
        setAttribute() { },
        getAttribute: () => null,
        querySelectorAll: () => [],
        querySelector: () => null,
        closest: () => null
    };
}

function loadGameVm() {
    const elements = new Map();
    const canvas = makeElement("game");
    canvas.width = 1280;
    canvas.height = 768;
    canvas.getContext = () => new Proxy({}, {
        get(target, property) {
            if (!(property in target)) target[property] = () => { };
            return target[property];
        },
        set(target, property, value) {
            target[property] = value;
            return true;
        }
    });
    elements.set("game", canvas);

    const context = {
        console,
        window: null,
        document: {
            getElementById(id) {
                if (!elements.has(id)) elements.set(id, makeElement(id));
                return elements.get(id);
            },
            querySelectorAll: () => [],
            querySelector: () => null
        },
        localStorage: {
            getItem: () => null,
            setItem() { },
            removeItem() { }
        },
        requestAnimationFrame() { },
        setTimeout(callback) { callback(); }
    };
    context.window = context;
    context.window.addEventListener = () => { };
    context.window.confirm = () => false;

    vm.createContext(context);
    const curriculumCode = fs.readFileSync(path.join(projectRoot, "curriculum.js"), "utf8");
    const gameCode = fs.readFileSync(path.join(projectRoot, "game.js"), "utf8");
    const expose = `
    globalThis.__UI_VALIDATION__ = {
      ACHIEVEMENTS,
      MINI_GAMES,
      renderInventoryPanel,
      renderProgressPanel,
      renderCharacterPanel,
      openMiniGame,
      closeMiniGamePanel,
      openProgressPanel,
      inventoryPanelBody,
      progressPanelBody,
      characterPanelBody,
      miniGamePanelBody,
      state
    };
  `;
    vm.runInContext(`${curriculumCode}\n${gameCode}\n${expose}`, context, { filename: "ui-validation-vm.js" });
    return context.__UI_VALIDATION__;
}

function validateMiniGames(failures, games) {
    Object.entries(games).forEach(([id, game]) => {
        if (!game.title) failures.push(`Mini-game ${id} is missing title.`);
        if (!game.region) failures.push(`Mini-game ${id} is missing region.`);
        if (!game.reward || typeof game.reward !== "object") failures.push(`Mini-game ${id} is missing reward.`);
        if (!Array.isArray(game.rounds) || game.rounds.length < 3) failures.push(`Mini-game ${id} needs at least 3 rounds.`);
        (game.rounds || []).forEach((round, index) => {
            if (!round.prompt) failures.push(`Mini-game ${id} round ${index + 1} is missing prompt.`);
            if (!Array.isArray(round.choices) || round.choices.length < 2) failures.push(`Mini-game ${id} round ${index + 1} needs at least 2 choices.`);
            if (!Number.isInteger(round.correct) || round.correct < 0 || round.correct >= (round.choices || []).length) failures.push(`Mini-game ${id} round ${index + 1} has invalid correct index.`);
        });
    });
}

function validateAchievements(failures, achievements) {
    const seen = new Set();
    achievements.forEach((achievement) => {
        if (!achievement.id) failures.push("Achievement missing id.");
        if (seen.has(achievement.id)) failures.push(`Duplicate achievement id: ${achievement.id}.`);
        seen.add(achievement.id);
        if (!achievement.name) failures.push(`Achievement ${achievement.id} missing name.`);
        if (!achievement.description) failures.push(`Achievement ${achievement.id} missing description.`);
    });
}

function validateStaticButtons(failures) {
    const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
    const buttonMatches = [...html.matchAll(/<button\b([^>]*)>/g)];
    const allowedDataAttributes = [
        "data-preset", "data-accent", "data-touch-key", "data-touch-action"
    ];
    buttonMatches.forEach((match, index) => {
        const attrs = match[1];
        const hasId = /\bid=/.test(attrs);
        const hasAllowedData = allowedDataAttributes.some((attr) => attrs.includes(attr));
        if (!hasId && !hasAllowedData) failures.push(`Static button ${index + 1} has no id or handled data-* action.`);
    });
}

function validateRenderSmoke(failures, ui) {
    try {
        ui.renderInventoryPanel();
        if (!ui.inventoryPanelBody.innerHTML.includes("Backpack")) failures.push("renderInventoryPanel did not render backpack content.");
    } catch (error) {
        failures.push(`renderInventoryPanel threw: ${error.message}`);
    }

    try {
        ["story", "quests", "buildings", "miniGames", "curriculum", "achievements"].forEach((tab) => ui.openProgressPanel(tab));
        if (!ui.progressPanelBody.innerHTML.includes("progress-tabs")) failures.push("renderProgressPanel did not render tabs.");
    } catch (error) {
        failures.push(`renderProgressPanel/openProgressPanel threw: ${error.message}`);
    }

    try {
        ui.renderCharacterPanel();
        if (!ui.characterPanelBody.innerHTML.includes("Readiness formula")) failures.push("renderCharacterPanel did not render readiness formula.");
    } catch (error) {
        failures.push(`renderCharacterPanel threw: ${error.message}`);
    }

    try {
        ui.openMiniGame("sourceDetective");
        if (!ui.miniGamePanelBody.innerHTML.includes("minigame-visual")) failures.push("openMiniGame did not render mini-game visual content.");
        ui.closeMiniGamePanel();
    } catch (error) {
        failures.push(`openMiniGame/renderMiniGamePanel threw: ${error.message}`);
    }
}

function main() {
    const failures = [];
    const ui = loadGameVm();
    validateMiniGames(failures, ui.MINI_GAMES);
    validateAchievements(failures, ui.ACHIEVEMENTS);
    validateStaticButtons(failures);
    validateRenderSmoke(failures, ui);

    if (failures.length) {
        console.error(`UI validation failed with ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
        failures.forEach((failure) => console.error(`- ${failure}`));
        process.exit(1);
    }
    console.log(`UI validation passed: ${Object.keys(ui.MINI_GAMES).length} mini-games, ${ui.ACHIEVEMENTS.length} achievements, render smoke checks.`);
}

main();