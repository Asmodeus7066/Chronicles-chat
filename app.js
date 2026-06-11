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

/* ---------------- CHRONICLES DATA ---------------- */

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

/* ---------------- DERIVED TRAITS ---------------- */

const DERIVED_TRAITS = [
    "size",
    "health",
    "willpower",
    "initiative",
    "defense",
    "speed"
];

function calculateDerivedTraits() {
    const a = characterSheet.attributes;
    const s = characterSheet.skills;

    characterSheet.derived.size =
        characterSheet.derived.size ?? 5;

    characterSheet.derived.health =
        characterSheet.derived.health ??
        (characterSheet.derived.size + (a.stamina || 0));

    characterSheet.derived.willpower =
        characterSheet.derived.willpower ??
        ((a.resolve || 0) + (a.composure || 0));

    characterSheet.derived.initiative =
        characterSheet.derived.initiative ??
        ((a.dexterity || 0) + (a.composure || 0));

    characterSheet.derived.defense =
        characterSheet.derived.defense ??
        (Math.min(a.wits || 0, a.dexterity || 0) +
         (s.athletics || 0));

    characterSheet.derived.speed =
        characterSheet.derived.speed ??
        ((a.strength || 0) + (a.dexterity || 0) + 5);
}

/* ---------------- HELPERS ---------------- */

function el(id) {
    return document.getElementById(id);
}

/* ---------------- DM PANEL ---------------- */

function updateDMPanel() {
    const panel = el("dmPanel");
    if (!panel) return;

    panel.style.display = isDM ? "flex" : "none";

    if (isDM) {
        loadCharacterList();
    }
}

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = el("username")?.value || "";
    currentAvatar = el("avatar")?.value || "";

    if (!currentUser) return;

    if (!currentAvatar) {
        currentAvatar = "assets/default-avatar.png";
    }

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    const overlay = el("overlay");
    if (overlay) overlay.style.display = "none";

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

    alert("DM mode disabled");
}

/* ---------------- DM USERNAME OVERRIDE ---------------- */

function setUsernameForMessage() {
    if (!isDM) return;

    const newName = prompt("Set username (DM only):");

    if (newName && newName.trim()) {
        currentUser = newName.trim();
        alert("Username set to: " + currentUser);
    }
}

/* ---------------- HAUNT ---------------- */

function toggleHauntAngr() {
    if (!isDM) return;

    hauntAngr = !hauntAngr;
    alert("Haunt-ANGR: " + (hauntAngr ? "ON" : "OFF"));
}

/* ---------------- WIPE CHAT ---------------- */

async function wipeAllMessages() {
    if (!isDM) return;

    await client
        .from("messages")
        .delete()
        .neq("id", 0);

    const container = el("messages");
    if (container) container.innerHTML = "";
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

/* ---------------- BUILD STATS ---------------- */

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
            <div>
                <button onclick="changeStat('${type}','${name}',-1)">-</button>
                <span id="${type}-${name}">${characterSheet[type][name]}</span>
                <button onclick="changeStat('${type}','${name}',1)">+</button>
            </div>
        `;

        container.appendChild(row);
    });
}

/* ---------------- CHANGE STAT ---------------- */

function changeStat(type, name, delta) {
    characterSheet[type][name] += delta;

    if (characterSheet[type][name] < 0) {
        characterSheet[type][name] = 0;
    }

    const cell = el(`${type}-${name}`);
    if (cell) cell.innerText = characterSheet[type][name];
}

/* ---------------- SAVE SHEET ---------------- */

async function saveCharacterSheet() {
    const { error } = await client
        .from("character_sheets")
        .upsert({
            username: currentUser,
            attributes: characterSheet.attributes,
            skills: characterSheet.skills,
            derived: characterSheet.derived
        }, { onConflict: "username" });

    if (error) {
        console.error(error);
        alert("Failed to save character");
        return;
    }

    alert("Character saved!");

    const panel = el("charCreator");
    if (panel) panel.style.display = "none";
}

/* ---------------- LOAD SHEET ---------------- */

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

/* ---------------- CHARACTER LIST (DM) ---------------- */

async function loadCharacterList() {
    if (!isDM) return;

    const list = el("characterList");
    if (!list) return;

    list.innerHTML = "Loading...";

    const { data, error } = await client
        .from("character_sheets")
        .select("username");

    if (error || !data) {
        list.innerHTML = "Error loading characters";
        return;
    }

    if (data.length === 0) {
        list.innerHTML = "No characters found";
        return;
    }

    list.innerHTML = "";

    data.forEach(c => {
        const btn = document.createElement("button");
        btn.innerText = c.username;
        btn.onclick = () => inspectCharacter(c.username);
        list.appendChild(btn);
    });
}

/* ---------------- INSPECT CHARACTER ---------------- */

async function inspectCharacter(username) {
    const { data } = await client
        .from("character_sheets")
        .select("*")
        .eq("username", username)
        .single();

    if (!data) return;

    const box = el("characterInspect");
    if (!box) return;

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

    box.innerHTML = html;
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

/* ---------------- DELETE MESSAGE ---------------- */

async function deleteMessage(id, element) {
    if (!isDM) return;

    await client.from("messages").delete().eq("id", id);

    element.remove();
}

/* ---------------- LOAD MESSAGES ---------------- */

async function loadMessages() {
    const { data } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    const container = el("messages");
    if (!container) return;

    container.innerHTML = "";
    data?.forEach(addMessage);
}

/* ---------------- RENDER MESSAGE ---------------- */

function addMessage(msg) {
    const container = el("messages");
    if (!container) return;

    const wrap = document.createElement("div");
    wrap.className = "message";
    wrap.dataset.id = msg.id;

    wrap.innerHTML = `
        <img class="avatar" src="${msg.avatar || 'assets/default-avatar.png'}">

        <div class="content">

            <div class="username">${msg.username}</div>

            <div class="text ${msg.haunt ? 'haunt-angr' : ''}">
                ${msg.content}
            </div>

            <div class="time">
                ${new Date(msg.created_at).toLocaleString()}
            </div>

            ${isDM ? `<button class="dm-delete">Delete</button>` : ""}
        </div>
    `;

    const btn = wrap.querySelector(".dm-delete");
    if (btn) {
        btn.onclick = () => deleteMessage(msg.id, wrap);
    }

    container.appendChild(wrap);
}

/* ---------------- REALTIME ---------------- */

client
    .channel("chat")
    .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages"
    }, payload => addMessage(payload.new))
    .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "messages"
    }, payload => {
        const el = document.querySelector(`.message[data-id="${payload.old.id}"]`);
        if (el) el.remove();
    })
    .subscribe();

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    currentUser = localStorage.getItem("username") || "";
    currentAvatar = localStorage.getItem("avatar") || "";

    const overlay = el("overlay");
    if (currentUser && overlay) overlay.style.display = "none";

    updateDMPanel();

    if (currentUser) {
        openCharacterCreator();
    }

    await loadCharacterSheet();
    await loadMessages();

    updateDMPanel();
};

/* ---------------- ENTER KEY ---------------- */

document.addEventListener("DOMContentLoaded", () => {
    const input = el("messageInput");

    if (input) {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") sendMessage();
        });
    }
});
