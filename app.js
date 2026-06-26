const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";

/* ---------------- HELPERS ---------------- */

const el = (id) => document.getElementById(id);

/* ---------------- LOGIN ---------------- */

function enterChat() {
  currentUser = el("username")?.value?.trim();
  currentAvatar = el("avatar")?.value?.trim() || "default.png";

  if (!currentUser) {
    alert("Enter username");
    return;
  }

  localStorage.setItem("username", currentUser);
  localStorage.setItem("avatar", currentAvatar);

  el("overlay").style.display = "none";

  initChat();
}

/* ---------------- MESSAGE RENDER ---------------- */

function appendMessage(msg) {
  const container = el("messages");
  if (!container) return;

  const div = document.createElement("div");
  div.className = "message";

  div.innerHTML = `
    <b>${msg.username}</b><br>
    ${msg.content}<br>
    <small>${new Date(msg.created_at).toLocaleString()}</small>
  `;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

/* ---------------- LOAD HISTORY ---------------- */

async function loadMessages() {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Load error:", error);
    return;
  }

  const container = el("messages");
  container.innerHTML = "";

  (data || []).forEach(appendMessage);
}

/* ---------------- REALTIME ---------------- */

function subscribeToMessages() {
  client
    .channel("messages-channel")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        appendMessage(payload.new);
      }
    )
    .subscribe();
}

/* ---------------- SEND MESSAGE ---------------- */

let cachedUsername = "";

async function sendMessage() {
  const input = el("messageInput");
  const text = input?.value?.trim();

  if (!text) return;

  const usernameEl = document.getElementById("username");
  const avatarEl = document.getElementById("avatar");

  if (usernameEl?.value?.trim()) {
    cachedUsername = usernameEl.value.trim();
    localStorage.setItem("username", cachedUsername);
  }

  const finalUsername = cachedUsername || "Anonymous";
  const avatar = avatarEl?.value?.trim() || "default.png";

  await client.from("messages").insert({
    username: finalUsername,
    avatar,
    content: text,
  });

  input.value = "";
}
/* ---------------- INIT ---------------- */

async function initChat() {
  await loadMessages();
  subscribeToMessages();
}

/* ---------------- GM MODE (FIXED) ---------------- */

/* IMPORTANT FIX: must be attached to window for inline HTML onclick */
window.enterGMMode = function () {
  const pass = prompt("Enter GM password:");

  if (pass === "Critical20") {
    alert("GM mode enabled");
  } else {
    alert("Incorrect password");
  }
};

/* ---------------- STARTUP ---------------- */

window.onload = () => {
  currentUser = localStorage.getItem("username") || "";
  currentAvatar = localStorage.getItem("avatar") || "default.png";

  if (currentUser) {
    el("overlay").style.display = "none";
    initChat();
  }
};
