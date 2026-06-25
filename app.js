const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = false;
let hauntAngr = false;

/* ---------------- HELPERS ---------------- */

function el(id) {
    return document.getElementById(id);
}

/* ---------------- LOGIN ---------------- */

async function enterChat() {
    currentUser = el("username")?.value || "";
    currentAvatar = el("avatar")?.value || "";

    if (!currentUser) return;

    if (!currentAvatar) currentAvatar = "assets/default-avatar.png";

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    el("overlay").style.display = "none";

    await loadMessages();
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
}

/* ---------------- CHAT ---------------- */

async function sendMessage() {
    const input = el("messageInput");
    const text = input?.value.trim();

    if (!text || !currentUser) return;

    await client.from("messages").insert({
        username: currentUser,
        avatar: currentAvatar,
        content: text,
        haunt: isDM && hauntAngr
    });

    input.value = "";
    loadMessages();
}

async function loadMessages() {
    const { data } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    const container = el("messages");
    if (!container) return;

    container.innerHTML = "";

    (data || []).forEach(addMessage);
}

function addMessage(msg) {
    const wrap = document.createElement("div");
    wrap.className = "message";

    wrap.innerHTML = `
        <div><b>${msg.username}</b></div>
        <div class="${msg.haunt ? "haunt-angr" : ""}">${msg.content}</div>
        <small>${new Date(msg.created_at).toLocaleString()}</small>
    `;

    el("messages")?.appendChild(wrap);
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

/* ---------------- SESSION RESET (IMPORTANT FIX) ---------------- */

function hardResetSession() {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
}

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    // ALWAYS force fresh session state
    currentUser = "";
    currentAvatar = "";
    isDM = false;
    hauntAngr = false;

    el("overlay").style.display = "flex";
    if (el("dmPanel")) el("dmPanel").style.display = "none";

    await loadMessages();
};
