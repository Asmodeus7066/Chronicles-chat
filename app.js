const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = "";
let currentAvatar = "";
let isDM = localStorage.getItem("isDM") === "true";

/* ---------------- LOGIN ---------------- */

function enterChat() {
    currentUser = document.getElementById("username").value;
    currentAvatar = document.getElementById("avatar").value;

    if (!currentUser) return;

    if (!currentAvatar) {
        currentAvatar = "assets/default-avatar.png";
    }

    localStorage.setItem("username", currentUser);
    localStorage.setItem("avatar", currentAvatar);

    document.getElementById("overlay").style.display = "none";
}

/* ---------------- DM MODE ---------------- */

function enterDMMode() {
    const pass = prompt("Enter DM password:");

    if (pass === "Critical20") {
        isDM = true;
        localStorage.setItem("isDM", "true");
        alert("DM mode enabled");

        loadMessages(); // 🔥 IMPORTANT: re-render old messages with delete buttons
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

    const { error } = await client.from("messages").insert({
        username: currentUser,
        avatar: currentAvatar,
        content: text
    });

    if (error) {
        console.error("Send error:", error);
        return;
    }

    input.value = "";
}

/* ---------------- DELETE MESSAGE ---------------- */

async function deleteMessage(id, element) {
    if (!isDM) return;

    const { error } = await client
        .from("messages")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Delete error:", error);
        return;
    }

    element.remove();
}

/* ---------------- RENDER MESSAGE ---------------- */

function addMessage(msg) {
    const container = document.getElementById("messages");

    // prevent duplicates (important for realtime)
    if (document.querySelector(`.message[data-id="${msg.id}"]`)) return;

    const wrap = document.createElement("div");
    wrap.className = "message";
    wrap.dataset.id = msg.id;

    wrap.innerHTML = `
        <img class="avatar"
            src="${msg.avatar || 'assets/default-avatar.png'}"
        >

        <div class="content">

            <div class="username">
                ${msg.username}
            </div>

            <div class="text">
                ${msg.content}
            </div>

            <div class="time">
                ${new Date(msg.created_at).toLocaleString()}
            </div>

            ${isDM ? `<button class="dm-delete">Delete</button>` : ""}

        </div>
    `;

    const btn = wrap.querySelector(".dm-delete");
    if (btn) {
        btn.onclick = () => deleteMessage(msg.id, wrap);
    }

    container.appendChild(wrap);

    // auto-scroll (safe)
    const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 120;

    if (nearBottom) {
        container.scrollTop = container.scrollHeight;
    }
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

    const container = document.getElementById("messages");
    container.innerHTML = "";

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
    .on(
        "postgres_changes",
        {
            event: "DELETE",
            schema: "public",
            table: "messages"
        },
        (payload) => {
            const id = payload.old.id;
            const el = document.querySelector(`.message[data-id="${id}"]`);
            if (el) el.remove();
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

/* ---------------- ENTER KEY SUPPORT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("messageInput");

    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }
});
