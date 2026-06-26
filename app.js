const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl5Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */
let currentUser = "";
let currentAvatar = "";

/* ---------------- HELPERS ---------------- */

const el = (id) => document.getElementById(id);

/* ---------------- LOGIN ---------------- */

function enterChat() {
  currentUser = el("username").value.trim();
  currentAvatar = el("avatar").value.trim() || "default.png";

  if (!currentUser) return alert("Enter username");

  localStorage.setItem("username", currentUser);
  localStorage.setItem("avatar", currentAvatar);

  el("overlay").style.display = "none";

  loadMessages();
}

/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage() {
  const input = el("messageInput");
  const text = input.value.trim();

  if (!text) return;

  const { error } = await client
    .from("messages")
    .insert([{
      username: currentUser,
      avatar: currentAvatar,
      content: text
    }]);

  if (error) {
    console.error(error);
    alert("Failed to send message");
    return;
  }

  input.value = "";
  loadMessages();
}

/* ---------------- LOAD MESSAGES ---------------- */

async function loadMessages() {
  const { data, error } = await client
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return;
  }

  const box = el("messages");
  box.innerHTML = "";

  (data || []).forEach(msg => {
    const div = document.createElement("div");
    div.className = "message";

    div.innerHTML = `
      <b>${msg.username}</b><br>
      ${msg.content}
    `;

    box.appendChild(div);
  });
}

/* ---------------- START ---------------- */

window.onload = () => {
  currentUser = localStorage.getItem("username") || "";
  currentAvatar = localStorage.getItem("avatar") || "";

  if (currentUser) {
    el("overlay").style.display = "none";
    loadMessages();
  }
};
