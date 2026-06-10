const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = "";
let currentAvatar = "";
let isDM = false;

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = document.getElementById("username").value;
    currentAvatar = document.getElementById("avatar").value;

    if (!currentUser) return;

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    document.getElementById("overlay").style.display = "none";
}

/* ---------------- DM MODE ---------------- */

function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;
        alert("DM mode enabled");
    } else {
        alert("Incorrect password");
    }
}

function setUsernameForMessage() {
    if (!isDM) return;

    const newName = prompt("Set username (DM only):");
    if (newName) {
        currentUser = newName;
        alert("Username set to: " + newName);
    }
}

/* ---------------- SEND MESSAGE ---------------- */

async function sendMessage() {
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text) return;

    await client.from("messages").insert({
        username: currentUser,
        avatar: currentAvatar,
        content: text
    });

    input.value = "";
}

/* ---------------- DELETE MESSAGE ---------------- */

async function deleteMessage(id, element) {
    if (!isDM) return;

    await client
        .from("messages")
        .delete()
        .eq("id", id);

    element.remove();
}

/* ---------------- RENDER MESSAGE ---------------- */

function addMessage(msg) {
    const wrap = document.createElement("div");
    wrap.className = "message";

    wrap.innerHTML = `
        <img class="avatar"
            src="${msg.avatar || 'assets/default-avatar.png'}"
        >

        <div class="content">

            <div class="username">
                ${msg.username}
            </div>

            <div>
                ${msg.content}
            </div>

            <div class="time">
                ${new Date(msg.created_at).toLocaleString()}
            </div>

            ${isDM ? `<button class="dm-delete">Delete</button>` : ""}

        </div>
    `;

    if (isDM) {
        wrap.querySelector(".dm-delete").onclick = () =>
            deleteMessage(msg.id, wrap);
    }

    document.getElementById("messages").appendChild(wrap);

    document.getElementById("messages").scrollTop =
        document.getElementById("messages").scrollHeight;
}

/* ---------------- LOAD MESSAGES ---------------- */

async function loadMessages() {
    const { data } = await client
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

    document.getElementById("messages").innerHTML = "";

    data.forEach(addMessage);
}

/* ---------------- REALTIME ---------------- */

client
    .channel("chat")
    .on(
        "postgres_changes",
        {
            event: "INSERT",
            schema: "public",
            table: "messages"
        },
        (payload) => {
            addMessage(payload.new);
        }
    )
    .subscribe();

/* ---------------- STARTUP ---------------- */

window.onload = async () => {
    currentUser = localStorage.getItem("username") || "";
    currentAvatar = localStorage.getItem("avatar") || "";

    if (currentUser) {
        document.getElementById("overlay").style.display = "none";
    }

    await loadMessages();
};
