const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- USER STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = localStorage.getItem("isDM") === "true";

let hauntAngr = false;

/* ---------------- CHARACTER SHEET ---------------- */

let characterSheet = {
    attributes: {},
    skills: {}
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

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = document.getElementById("username").value;
    currentAvatar = document.getElementById("avatar").value;

    if (!currentUser) return;

    if (!currentAvatar) {
        currentAvatar = "assets/default-avatar.png";
    }

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    document.getElementById("overlay").style.display = "none";

    openCharacterCreator();
}

/* ---------------- DM MODE ---------------- */

function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;
        localStorage.setItem("isDM", "true");

        alert("DM mode enabled");

        loadMessages();
        updateDMPanel();
    } else {
        alert("Incorrect password");
    }
}

function toggleDMMode() {
    isDM = false;
    localStorage.setItem("isDM", "false");

    hauntAngr = false;

    alert("DM mode disabled");

    loadMessages();
    updateDMPanel();
}

/* ---------------- HAUNT ---------------- */

function toggleHauntAngr() {
    if (!isDM) return;

    hauntAngr = !hauntAngr;
    alert("Haunt-ANGR: " + (hauntAngr ? "ON" : "OFF"));
}

/* ---------------- CHARACTER CREATOR UI ---------------- */

function openCharacterCreator() {
    document.getElementById("charCreator").style.display = "block";

    buildStats("attributes", ATTRIBUTES, "attributes");
    buildStats("skills", SKILLS, "skills");
}

/* ---------------- BUILD STAT UI ---------------- */

function buildStats(containerId, list, type) {
    const container = document.getElementById(containerId);
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

    document.getElementById(`${type}-${name}`).innerText =
        characterSheet[type][name];
}

/* ---------------- SAVE SHEET ---------------- */

async function saveCharacterSheet() {
    const { error } = await client
        .from("character_sheets")
        .upsert({
            username: currentUser,
            attributes: characterSheet.attributes,
            skills: characterSheet.skills
        }, { onConflict: "username" });

    if (error) {
        console.error(error);
        alert("Failed to save character");
        return;
    }

    alert("Character saved!");

    document.getElementById("charCreator").style.display = "none";
}

/* ---------------- LOAD SHEET ---------------- */

async function loadCharacterSheet() {
    const { data, error } = await client
        .from("character_sheets")
        .select("*")
        .eq("username", currentUser)
        .single();

    if (error || !data) return;

    characterSheet.attributes = data.attributes || {};
    characterSheet.skills = data.skills || {};
}

/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

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

    await client
        .from("messages")
        .delete()
        .eq("id", id);

    element.remove();
}

/* ---------------- LOAD MESSAGES ---------------- */

async function loadMessages() {
    const { data } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    document.getElementById("messages").innerHTML = "";

    data.forEach(addMessage);
}

/* ---------------- RENDER MESSAGE ---------------- */

function addMessage(msg) {
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

    document.getElementById("messages").appendChild(wrap);
}

/* ---------------- REALTIME ---------------- */

client
    .channel("chat")
    .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages"
    }, payload => {
        addMessage(payload.new);
    })
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

    if (currentUser) {
        document.getElementById("overlay").style.display = "none";
        openCharacterCreator();
    }

    await loadCharacterSheet();
    await loadMessages();
    updateDMPanel();
};

/* ---------------- ENTER KEY ---------------- */

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("messageInput");

    if (input) {
        input.addEventListener("keydown", e => {
            if (e.key === "Enter") sendMessage();
        });
    }
});
