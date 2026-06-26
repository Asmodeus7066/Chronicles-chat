const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl5Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = localStorage.getItem("username") || "";
let currentAvatar = localStorage.getItem("avatar") || "";
let isDM = localStorage.getItem("isDM") === "true";
let hauntAngr = false;

let selectedNoteUser = "";

/* ---------------- HELPERS ---------------- */

function el(id) {
    return document.getElementById(id);
}

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    if (currentUser) {
        el("overlay").style.display = "none";
    }

    updateDMPanel();
    await loadMessages();
};

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = el("username")?.value?.trim();
    currentAvatar = el("avatar")?.value?.trim();

    if (!currentUser) return;

    if (!currentAvatar) {
        currentAvatar = "assets/default-avatar.png";
    }

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    el("overlay").style.display = "none";

    loadMessages();
    updateDMPanel();
}

/* ---------------- DM MODE ---------------- */

function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;
        localStorage.setItem("isDM", "true");
        alert("DM enabled");

        updateDMPanel();
        loadMessages();
    } else {
        alert("Wrong password");
    }
}

function toggleDMMode() {
    isDM = false;
    localStorage.setItem("isDM", "false");
    hauntAngr = false;

    updateDMPanel();
    loadMessages();
}

/* ---------------- DM PANEL ---------------- */

function updateDMPanel() {
    const panel = el("dmPanel");
    if (!panel) return;

    panel.style.display = isDM ? "flex" : "none";

    if (isDM) loadUserList();
}

/* ---------------- NOTES SYSTEM ---------------- */

async function openNotes(username) {
    if (!isDM) return;

    selectedNoteUser = username;

    const box = el("characterInspect");
    box.innerHTML = "Loading notes...";

    const { data, error } = await client
        .from("user_notes")
        .select("*")
        .eq("username", username)
        .maybeSingle();

    if (error) console.error(error);

    const notes = data?.notes || "";

    box.innerHTML = `
        <h3>Notes: ${username}</h3>
        <textarea id="dmNotesBox" style="width:100%;height:150px">${notes}</textarea>
        <br><br>
        <button onclick="saveNotes()">Save</button>
    `;
}

async function saveNotes() {
    if (!isDM || !selectedNoteUser) return;

    const text = el("dmNotesBox")?.value || "";

    const { data, error } = await client
        .from("user_notes")
        .upsert({
            username: selectedNoteUser,
            notes: text
        }, { onConflict: "username" })
        .select();

    if (error) {
        console.error("SAVE NOTES ERROR:", error);
        alert("Failed saving notes");
        return;
    }

    alert("Notes saved");
}

/* ---------------- USER LIST ---------------- */

async function loadUserList() {
    const list = el("characterList");
    if (!list) return;

    const { data, error } = await client
        .from("messages")
        .select("username");

    if (error) {
        console.error("USER LIST ERROR:", error);
        return;
    }

    const uniqueUsers = [...new Set((data || []).map(x => x.username))];

    list.innerHTML = "";

    uniqueUsers.forEach(u => {
        const btn = document.createElement("button");
        btn.textContent = u;
        btn.onclick = () => openNotes(u);
        list.appendChild(btn);
    });
}

/* ---------------- MESSAGES ---------------- */

async function sendMessage() {
    const input = el("messageInput");
    const text = input?.value?.trim();

    if (!text) return;

    const payload = {
        username: currentUser,
        avatar: currentAvatar,
        content: text,
        haunt: isDM && hauntAngr,
        created_at: new Date().toISOString()
    };

    const { error } = await client.from("messages").insert(payload);

    if (error) {
        console.error("SEND ERROR:", error);
        alert("Message failed (check console)");
        return;
    }

    input.value = "";
    await loadMessages();
}

async function loadMessages() {
    const { data, error } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("LOAD ERROR:", error);
        return;
    }

    const container = el("messages");
    if (!container) return;

    container.innerHTML = "";

    (data || []).forEach(msg => {
        const div = document.createElement("div");
        div.className = "message";

        div.innerHTML = `
            <b>${msg.username}</b><br>
            <div class="${msg.haunt ? "haunt-angr" : ""}">${msg.content}</div>
            <small>${new Date(msg.created_at).toLocaleString()}</small>
        `;

        container.appendChild(div);
    });
}

/* ---------------- DM TOOLS ---------------- */

function setUsernameForMessage() {
    if (!isDM) return;
    const n = prompt("Username:");
    if (n) currentUser = n;
}

function toggleHauntAngr() {
    if (!isDM) return;
    hauntAngr = !hauntAngr;
}

async function wipeAllMessages() {
    if (!isDM) return;

    const { error } = await client
        .from("messages")
        .delete()
        .neq("id", 0);

    if (error) console.error(error);

    el("messages").innerHTML = "";
}
