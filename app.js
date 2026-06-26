const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl5Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = localStorage.getItem("isDM") === "true";
let hauntAngr = false;

let selectedNoteUser = "";

/* ---------------- HELPERS ---------------- */

function el(id) {
    return document.getElementById(id);
}

function logError(prefix, error) {
    if (error) {
        console.error(prefix, error);
    }
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

    loadMessages();
    updateDMPanel();
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

/* ---------------- DM PANEL ---------------- */

function updateDMPanel() {
    const panel = el("dmPanel");
    if (!panel) return;

    panel.style.display = isDM ? "flex" : "none";

    if (isDM) loadCharacterList();
}

/* ---------------- NOTES SYSTEM ---------------- */

async function openNotes(username) {
    if (!isDM) return;

    selectedNoteUser = username;

    const box = el("characterInspect");
    if (!box) return;

    box.innerHTML = "Loading notes...";

    let { data, error } = await client
        .from("user_notes")
        .select("notes")
        .eq("username", username)
        .maybeSingle();

    logError("Fetch notes error:", error);

    if (!data) {
        const res = await client
            .from("user_notes")
            .upsert({ username, notes: "" }, { onConflict: "username" })
            .select()
            .maybeSingle();

        data = res.data;
    }

    const notes = data?.notes || "";

    box.innerHTML = `
        <h3>Notes for ${username}</h3>
        <textarea id="dmNotesBox" style="width:100%; height:160px;">${notes}</textarea>
        <br><br>
        <button onclick="saveNotes()">Save Notes</button>
    `;
}

async function saveNotes() {
    if (!isDM || !selectedNoteUser) return;

    const text = el("dmNotesBox")?.value || "";

    const { error } = await client
        .from("user_notes")
        .upsert({
            username: selectedNoteUser,
            notes: text
        }, { onConflict: "username" });

    logError("Save notes error:", error);

    if (error) {
        alert("Failed to save notes");
        return;
    }

    alert("Notes saved");
}

/* ---------------- USER LIST ---------------- */

async function loadCharacterList() {
    if (!isDM) return;

    const list = el("characterList");
    if (!list) return;

    const { data, error } = await client
        .from("messages")
        .select("username");

    logError("User list error:", error);

    list.innerHTML = "";

    const uniqueUsers = [...new Set((data || []).map(m => m.username))];

    uniqueUsers.forEach(username => {
        const btn = document.createElement("button");
        btn.textContent = username;
        btn.onclick = () => openNotes(username);
        list.appendChild(btn);
    });
}

/* ---------------- CHAT (THIS WAS YOUR REAL BUG AREA) ---------------- */

async function sendMessage() {
    const input = el("messageInput");
    const text = input?.value?.trim();

    if (!text) return;

    const payload = {
        username: currentUser,
        avatar: currentAvatar,
        content: text,
        haunt: isDM && hauntAngr
    };

    console.log("Sending message:", payload);

    const { data, error } = await client
        .from("messages")
        .insert([payload])
        .select();

    logError("Send message error:", error);

    if (error) {
        alert("Message failed to send (check console)");
        return;
    }

    input.value = "";

    loadMessages();
}

async function loadMessages() {
    const { data, error } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    logError("Load messages error:", error);

    const container = el("messages");
    if (!container) return;

    container.innerHTML = "";

    (data || []).forEach(msg => {
        const wrap = document.createElement("div");
        wrap.className = "message";

        wrap.innerHTML = `
            <div><b>${msg.username}</b></div>
            <div class="${msg.haunt ? "haunt-angr" : ""}">${msg.content}</div>
            <small>${new Date(msg.created_at).toLocaleString()}</small>
        `;

        container.appendChild(wrap);
    });
}

/* ---------------- DM TOOLS ---------------- */

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

    const { error } = await client
        .from("messages")
        .delete()
        .neq("id", 0);

    logError("Wipe error:", error);

    el("messages").innerHTML = "";
}

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    currentUser = localStorage.getItem("username") || "";
    currentAvatar = localStorage.getItem("avatar") || "";

    if (currentUser) {
        const overlay = el("overlay");
        if (overlay) overlay.style.display = "none";
    }

    updateDMPanel();
    await loadMessages();
};
