const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl5Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = false;
let hauntAngr = false;

let selectedNoteUser = "";

/* ---------------- HELPERS ---------------- */

function el(id) {
    return document.getElementById(id);
}

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = el("username")?.value || "";
    currentAvatar = el("avatar")?.value || "";

    if (!currentUser) return;

    if (!currentAvatar) currentAvatar = "assets/default-avatar.png";

    // NO CACHING (fresh login each time)

    el("overlay").style.display = "none";

    loadMessages();
    updateDMPanel();
}

/* ---------------- DM MODE ---------------- */

function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;

        alert("DM mode enabled");

        updateDMPanel();
        loadMessages();
    } else {
        alert("Incorrect password");
    }
}

function toggleDMMode() {
    isDM = false;
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

    const { data, error } = await client
        .from("user_notes")
        .select("notes")
        .eq("username", username)
        .maybeSingle();

    if (error) console.error(error);

    let notes = data?.notes ?? "";

    if (!data) {
        await client.from("user_notes").upsert({
            username,
            notes: ""
        }, { onConflict: "username" });
    }

    box.innerHTML = `
        <h3>Notes for ${username}</h3>
        <textarea id="dmNotesBox" style="width:100%; height:160px;"></textarea>
        <br><br>
        <button onclick="saveNotes()">Save Notes</button>
    `;

    el("dmNotesBox").value = notes;
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

    if (error) {
        console.error(error);
        alert("Failed to save notes");
        return;
    }

    alert("Notes saved");
}

/* ---------------- USER LIST (FIXED) ---------------- */

async function loadCharacterList() {
    if (!isDM) return;

    const list = el("characterList");
    if (!list) return;

    const { data } = await client
        .from("messages")
        .select("username");

    list.innerHTML = "";

    const seen = new Set();

    (data || []).forEach(m => {
        if (!m.username || seen.has(m.username)) return;

        seen.add(m.username);

        const btn = document.createElement("button");
        btn.textContent = m.username;
        btn.onclick = () => openNotes(m.username);

        list.appendChild(btn);
    });
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

    await client.from("messages").delete().neq("id", 0);
    el("messages").innerHTML = "";
}

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    currentUser = "";
    currentAvatar = "";
    isDM = false;
    hauntAngr = false;

    updateDMPanel();
    loadMessages();

    client
        .channel("messages")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "messages"
            },
            () => loadMessages()
        )
        .subscribe();
};
