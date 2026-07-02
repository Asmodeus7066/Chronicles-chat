const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------------- STATE ---------------- */

let currentUser = "";
let currentAvatar = "";
let isDM = false;

// NOTES STATE
let currentNotesUser = "";
let isViewingDMNotes = false;

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

/* ---------------- GM MODE ---------------- */

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

  if (!confirm("Delete ALL messages?")) return;

  const { error } = await client
    .from("messages")
    .delete()
    .neq("id", 0);

  if (error) {
    console.error(error);
    alert("Failed to delete messages");
    return;
  }

  loadMessages();
  const list = el("userList");
  if (list) list.innerHTML = "";
};

/* ---------------- LOAD USER LIST ---------------- */

window.loadUserList = async function () {
  if (!isDM) return;

  const { data, error } = await client
    .from("messages")
    .select("username");

  if (error) {
    console.error(error);
    return;
  }

  const usernames = [...new Set((data || []).map(r => r.username))].sort();

  const list = el("userList");
  if (!list) return;

  list.innerHTML = "";

  usernames.forEach(username => {
    const btn = document.createElement("button");
    btn.textContent = username;
    btn.onclick = () => deleteUser(username);
    list.appendChild(btn);
  });
};

/* ---------------- DELETE USER ---------------- */

window.deleteUser = async function (username) {
  if (!isDM) return;

  if (!confirm(`Delete all messages from ${username}?`)) return;

  const { error } = await client
    .from("messages")
    .delete()
    .eq("username", username);

  if (error) {
    console.error(error);
    return;
  }

  loadMessages();
  loadUserList();
};

/* ---------------- NOTES SYSTEM (PLAYER) ---------------- */

async function loadNotes(username) {
  const box = el("notesBox");
  if (!box) return;

  currentNotesUser = username;

  const { data, error } = await client
    .from("user_notes")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  // if no row exists, create it
  if (!data) {
    const created = await client
      .from("user_notes")
      .insert({
        username,
        notes: ""
      })
      .select()
      .maybeSingle();

    box.value = created?.data?.notes || "";
    return;
  }

  box.value = data.notes || "";
}

window.saveNotes = async function () {
  const box = el("notesBox");
  if (!box) return;

  const username = el("username")?.value?.trim();
  if (!username) return;

  const notes = box.value;

  await client.from("user_notes").upsert({
    username,
    notes
  });

  currentNotesUser = username;
};

/* ---------------- AUTO NOTES SYNC ---------------- */

function bindUsernameNotesSync() {
  const usernameInput = el("username");
  if (!usernameInput) return;

  usernameInput.addEventListener("input", () => {
    const name = usernameInput.value.trim();
    if (name) {
      loadNotes(name);
    }
  });
}

/* ---------------- GM NOTES VIEW ---------------- */

window.showNotesList = function () {
  const list = el("userList");
  const view = el("dmNotesView");

  if (list) list.style.display = "block";
  if (view) view.style.display = "none";

  loadUserList();
};

window.openUserNotes = async function (username) {
  const view = el("dmNotesView");
  const title = el("dmNotesTitle");
  const box = el("dmNotesBox");

  if (!view || !box) return;

  isViewingDMNotes = true;
  currentNotesUser = username;

  if (title) title.textContent = `Notes: ${username}`;

  const { data, error } = await client
    .from("user_notes")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) {
    await client.from("user_notes").insert({
      username,
      notes: ""
    });
    box.value = "";
  } else {
    box.value = data.notes || "";
  }

  view.style.display = "block";
};

window.saveDMNotes = async function () {
  const box = el("dmNotesBox");
  if (!box || !currentNotesUser) return;

  await client.from("user_notes").upsert({
    username: currentNotesUser,
    notes: box.value
  });
};

window.closeNotesView = function () {
  const view = el("dmNotesView");
  if (view) view.style.display = "none";

  isViewingDMNotes = false;
  currentNotesUser = "";
};

/* ---------------- HOOK INTO EXISTING STARTUP ---------------- */

const oldInit = initChat;

initChat = async function () {
  await oldInit();
  bindUsernameNotesSync();

  const username = el("username")?.value?.trim();
  if (username) loadNotes(username);
};
