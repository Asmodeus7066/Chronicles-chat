const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = localStorage.getItem("isDM") === "true";
let hauntAngr = false;

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

/* ---------------- DERIVED TRAITS ---------------- */

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

/* ---------------- DM PANEL ---------------- */

function updateDMPanel() {
    const panel = el("dmPanel");
    if (!panel) return;

    panel.style.display = isDM ? "flex" : "none";

    if (isDM) loadCharacterList();
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

    openCharacterCreator();
}

/* ---------------- DM MODE ---------------- */

function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;
        localStorage.setItem("isDM", "true");
        alert("DM mode enabled");
        updateDMPanel();
        loadMessages();
    } else {
        alert("Incorrect password");
    }
}

function toggleDMMode() {
    isDM = false;
    localStorage.setItem("isDM", "false");
    hauntAngr = false;
    updateDMPanel();
    loadMessages();
}

/* ---------------- CHAT DM TOOLS ---------------- */

function setUsernameForMessage() {
    if (!isDM) return;

    const n = prompt("Set username:");
    if (n?.trim()) currentUser = n.trim();
}

function toggleHauntAngr() {
    if (!isDM) return;
    hauntAngr = !hauntAngr;
}

async function wipeAllMessages() {
    if (!isDM) return;

    await client.from("messages").delete().neq("id", 0);
    el("messages").innerHTML = "";
}

/* ---------------- CHARACTER CREATOR ---------------- */

function openCharacterCreator() {
    const panel = el("charCreator");
    if (!panel) return;

    panel.style.display = "block";

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
        if (characterSheet[type][name] === undefined) {
            characterSheet[type][name] = 0;
        }

        const row = document.createElement("div");
        row.className = "stat-row";

        row.innerHTML = `
            <span>${name}</span>
            <input type="number" value="${characterSheet[type][name]}"
                onchange="characterSheet.${type}.${name}=Number(this.value)||0; calculateDerivedTraits();">
        `;

        container.appendChild(row);
    });
}

/* ---------------- SAVE / LOAD ---------------- */

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

    alert("Character saved");
    el("charCreator").style.display = "none";
}

async function loadCharacterSheet() {
    const { data } = await client
        .from("character_sheets")
        .select("*")
        .eq("username", currentUser)
        .single();

    if (!data) return;

    characterSheet.attributes = data.attributes || {};
    characterSheet.skills = data.skills || {};
    characterSheet.derived = data.derived || {};
}

/* ---------------- DM CHARACTER LIST ---------------- */

async function loadCharacterList() {
    if (!isDM) return;

    const list = el("characterList");
    if (!list) return;

    const { data } = await client
        .from("character_sheets")
        .select("username");

    list.innerHTML = "";

    (data || []).forEach(c => {
        const btn = document.createElement("button");
        btn.textContent = c.username;
        btn.onclick = () => inspectCharacter(c.username);
        list.appendChild(btn);
    });
}

/* ---------------- INSPECT ---------------- */

async function inspectCharacter(username) {
    const { data } = await client
        .from("character_sheets")
        .select("*")
        .eq("username", username)
        .single();

    if (!data) return;

    const box = el("characterInspect");

    let html = `<strong>${username}</strong><br><br>`;

    html += `<u>Attributes</u><br>`;
    for (const [k, v] of Object.entries(data.attributes || {})) {
        html += `${k}: ${v}<br>`;
    }

    html += `<br><u>Skills</u><br>`;
    for (const [k, v] of Object.entries(data.skills || {})) {
        html += `${k}: ${v}<br>`;
    }

    html += `<br><u>Derived</u><br>`;
    for (const [k, v] of Object.entries(data.derived || {})) {
        html += `${k}: ${v}<br>`;
    }

    html += `<br><button onclick="deleteCharacter('${username}')">Delete Character</button>`;

    box.innerHTML = html;
}

/* ---------------- DELETE CHARACTER ---------------- */

async function deleteCharacter(username) {
    if (!isDM) return;

    const ok = confirm(`Delete ${username}?`);
    if (!ok) return;

    const { error } = await client
        .from("character_sheets")
        .delete()
        .eq("username", username);

    if (error) {
        console.error(error);
        alert("Delete failed");
        return;
    }

    el("characterInspect").innerHTML = "";
    loadCharacterList();
}

/* ---------------- CHAT ---------------- */

async function sendMessage() {
    const input = el("messageInput");
    const text = input?.value.trim();

    if (!text) return;

    await client.from("messages").insert({
        username: currentUser,
        avatar: currentAvatar,
        content: text,
        haunt: isDM && hauntAngr
    });

    input.value = "";
}

async function loadMessages() {
    const { data } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    const container = el("messages");
    container.innerHTML = "";

    (data || []).forEach(addMessage);
}

function addMessage(msg) {
    const wrap = document.createElement("div");
    wrap.className = "message";

    wrap.innerHTML = `
        <div><b>${msg.username}</b></div>
        <div class="${msg.haunt ? 'haunt-angr' : ''}">${msg.content}</div>
        <small>${new Date(msg.created_at).toLocaleString()}</small>
    `;

    el("messages").appendChild(wrap);
}

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    currentUser = localStorage.getItem("username") || "";
    currentAvatar = localStorage.getItem("avatar") || "";

    if (currentUser) el("overlay").style.display = "none";

    updateDMPanel();

    await loadCharacterSheet();
    await loadMessages();
};
