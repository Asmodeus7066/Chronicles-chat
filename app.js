const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = false;

/* ---------------- HELPERS ---------------- */

const el = (id) => document.getElementById(id);

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
  if (!container) return;

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
      (payload) => appendMessage(payload.new)
    )
    .subscribe();
}

/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage() {
  const input = el("messageInput");
  const text = input?.value?.trim();

  if (!text) return;

  const username = el("username")?.value?.trim();
  const avatar = el("avatar")?.value?.trim() || "default.png";

  if (!username) {
    alert("Set a username first");
    return;
  }

  currentUser = username;
  currentAvatar = avatar;

  localStorage.setItem("username", username);
  localStorage.setItem("avatar", avatar);

  const { error } = await client.from("messages").insert({
    username,
    avatar,
    content: text,
  });

  if (error) {
    console.error("Send error:", error);
    alert("Message failed");
    return;
  }

  input.value = "";
}

/* ---------------- INIT ---------------- */

async function initChat() {
  await loadMessages();
  subscribeToMessages();
}

/* ---------------- DM PANEL ---------------- */

window.enterGMMode = function () {
  const pass = prompt("Enter GM password:");

  if (pass === "Critical20") {
    isDM = true;

    const panel = el("dmPanel");
    if (panel) panel.style.display = "block";

    document.body.classList.add("dm-active");

    alert("DM mode enabled");
  } else {
    alert("Incorrect password");
  }
};

/* ---------------- DELETE ALL MESSAGES ---------------- */

window.deleteAllMessages = async function () {
  if (!isDM) return;

  const confirmDelete = confirm("Delete ALL messages?");
  if (!confirmDelete) return;

  const { error } = await client
    .from("messages")
    .delete()
    .neq("id", 0);

  if (error) {
    console.error(error);
    alert("Failed to delete messages");
    return;
  }

  const container = el("messages");
  if (container) container.innerHTML = "";
};

/* ---------------- STARTUP ---------------- */

window.onload = () => {
  currentUser = localStorage.getItem("username") || "";
  currentAvatar = localStorage.getItem("avatar") || "default.png";

  const userInput = el("username");
  const avatarInput = el("avatar");

  if (userInput) userInput.value = currentUser;
  if (avatarInput) avatarInput.value = currentAvatar;

  initChat();
};
