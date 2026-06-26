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
  const text = input?.value?.trim();

  console.log("▶ sendMessage fired");
  console.log("currentUser:", currentUser);
  console.log("currentAvatar:", currentAvatar);
  console.log("text:", text);

  if (!text) return;

  const payload = {
    username: currentUser,
    avatar: currentAvatar,
    content: text
  };

  console.log("📦 payload:", payload);

  try {
    const { data, error, status } = await client
      .from("messages")
      .insert([payload])
      .select();

    console.log("📡 status:", status);
    console.log("📡 data:", data);
    console.log("📡 error:", error);

    if (error) {
      alert("Insert error: " + JSON.stringify(error));
      return;
    }

    input.value = "";
    loadMessages();

  } catch (err) {
    console.error("💥 HARD FAIL:", err);
    alert("Hard failure — check console");
  }
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
