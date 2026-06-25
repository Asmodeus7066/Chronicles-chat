const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl5Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = localStorage.getItem("isDM") === "true";
let hauntAngr = false;

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

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    el("overlay").style.display = "none";
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

function updateDMPanel() {
    const panel = el("dmPanel");
    if (!panel) return;

    panel.style.display = isDM ? "flex" : "none";
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

/* ---------------- DELETE SINGLE MESSAGE ---------------- */

async function deleteMessage(id, element) {
    if (!isDM) return;

    await client
        .from("messages")
        .delete()
        .eq("id", id);

    element.remove();
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
    // FORCE FRESH SESSION (no caching)
    localStorage.removeItem("username");
    localStorage.removeItem("avatar");
    localStorage.removeItem("isDM");

    currentUser = "";
    currentAvatar = "";
    isDM = false;
    hauntAngr = false;

    el("overlay").style.display = "flex";
    el("dmPanel").style.display = "none";
    el("sheetPanel").classList.remove("open");

    await loadMessages();
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
