const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = localStorage.getItem("isDM") === "true";
let hauntAngr = false;

let hasLoadedCharacter = false;

/* ---------------- CHARACTER SHEET ---------------- */

let characterSheet = {
    attributes: {},
    skills: {},
    derived: {}
};

/* ---------------- DATA ---------------- */

const ATTRIBUTES = [
    "strength","dexterity","stamina",
    "intelligence","wits","resolve",
    "presence","manipulation","composure"
];

const SKILLS = [
    "academics","computer","crafts","investigation","medicine","occult","politics","science",
    "athletics","brawl","drive","firearms","larceny","stealth","survival","weaponry",
    "animal_ken","empathy","expression","intimidation","persuasion","socialize","streetwise","subterfuge"
];

const DERIVED_TRAITS = [
    "size","health","willpower","initiative","defense","speed"
];

/* ---------------- HELPERS ---------------- */

function el(id) {
    return document.getElementById(id);
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

/* ---------------- CHARACTER CHECK ---------------- */

function hasCharacter() {
    return hasLoadedCharacter &&
        (Object.keys(characterSheet.attributes || {}).length > 0 ||
         Object.keys(characterSheet.skills || {}).length > 0);
}

/* ---------------- DERIVED ---------------- */

function calculateDerivedTraits() {
    const a = characterSheet.attributes || {};
    const s = characterSheet.skills || {};

    const strength = num(a.strength);
    const dexterity = num(a.dexterity);
    const stamina = num(a.stamina);
    const wits = num(a.wits);
    const resolve = num(a.resolve);
    const composure = num(a.composure);
    const athletics = num(s.athletics);

    const size = 5;

    characterSheet.derived = {
        size,
        health: size + stamina,
        willpower: resolve + composure,
        initiative: dexterity + composure,
        defense: Math.min(wits, dexterity) + athletics,
        speed: strength + dexterity + 5
    };
}

/* ---------------- SHEET TOGGLE (FIXED) ---------------- */

function toggleSheet() {
    const panel = el("charCreator");
    if (!panel) return;

    panel.style.display = "block";

    if (!hasCharacter()) {
        // ensure empty structure always renders correctly
        characterSheet.attributes ||= {};
        characterSheet.skills ||= {};
        characterSheet.derived ||= {};
    }

    renderCharacterEditor();
}

/* ---------------- CHARACTER EDITOR RENDER ---------------- */

function renderCharacterEditor() {
    calculateDerivedTraits();

    buildStats("attributes", ATTRIBUTES, "attributes");
    buildStats("skills", SKILLS, "skills");
    buildStats("derived", DERIVED_TRAITS, "derived");
}

/* ---------------- BUILD UI ---------------- */

function buildStats(containerId, list, type) {
    const container = el(containerId);
    if (!container) return;

    container.innerHTML = "";

    list.forEach(name => {
        if (!characterSheet[type]) characterSheet[type] = {};
        if (characterSheet[type][name] === undefined) {
            characterSheet[type][name] = 0;
        }

        const row = document.createElement("div");
        row.className = "stat-row";

        row.innerHTML = `
            <span>${name}</span>
            <input type="number"
                value="${characterSheet[type][name]}"
                onchange="
                    characterSheet.${type}.${name}=Number(this.value)||0;
                    calculateDerivedTraits();
                ">
        `;

        container.appendChild(row);
    });
}

/* ---------------- LOAD ---------------- */

async function loadCharacterSheet() {
    const { data } = await client
        .from("character_sheets")
        .select("*")
        .eq("username", currentUser)
        .maybeSingle();

    if (!data) {
        hasLoadedCharacter = false;
        return;
    }

    characterSheet.attributes = data.attributes || {};
    characterSheet.skills = data.skills || {};
    characterSheet.derived = data.derived || {};

    hasLoadedCharacter = true;
}

/* ---------------- SAVE ---------------- */

async function saveCharacterSheet() {
    calculateDerivedTraits();

    const { error } = await client.from("character_sheets").upsert({
        username: currentUser,
        attributes: characterSheet.attributes,
        skills: characterSheet.skills,
        derived: characterSheet.derived
    }, { onConflict: "username" });

    if (error) {
        console.error(error);
        alert("Save failed");
        return;
    }

    alert("Saved");
    el("charCreator").style.display = "none";
    hasLoadedCharacter = true;
}

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = el("username")?.value || "";
    currentAvatar = el("avatar")?.value || "";

    if (!currentUser) return;

    if (!currentAvatar) currentAvatar = "assets/default-avatar.png";

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    el("overlay").style.display = "none";
}
function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;
        localStorage.setItem("isDM", "true");

        alert("DM mode enabled");

        updateDMPanel?.();
        loadCharacterList?.();
        loadMessages?.();
    } else {
        alert("Incorrect password");
    }
}

function toggleDMMode() {
    isDM = false;
    localStorage.setItem("isDM", "false");

    hauntAngr = false;

    updateDMPanel?.();
    loadMessages?.();

    alert("DM mode disabled");
}
/* ---------------- CHAT OPEN SHEET BUTTON FIX ---------------- */

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("characterSheetButton");
    if (btn) {
        btn.onclick = toggleSheet;
    }
});

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    currentUser = localStorage.getItem("username") || "";
    currentAvatar = localStorage.getItem("avatar") || "";

    if (currentUser) el("overlay").style.display = "none";

    await loadCharacterSheet();
};
