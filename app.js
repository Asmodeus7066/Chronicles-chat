const SUPABASE_URL = "https://kxnyucaqvhwuahretwyk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnl1Y2Fxdmh3dWFocmV0d3lrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDM5NzYsImV4cCI6MjA5NjYxOTk3Nn0.abiVGk93QxW9S3Xlx15U0uYwZJUQ3k3Nyn5xhqMeZfE";

const client =
supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let currentUser = "";
let currentAvatar = "";

function enterChat(){

    currentUser =
    document.getElementById("username").value;

    currentAvatar =
    document.getElementById("avatar").value;

    if(!currentUser) return;

    localStorage.setItem(
        "username",
        currentUser
    );

    localStorage.setItem(
        "avatar",
        currentAvatar
    );

    document.getElementById(
        "overlay"
    ).style.display="none";
}

async function sendMessage(){

    const input =
    document.getElementById(
        "messageInput"
    );

    const text = input.value.trim();

    if(!text) return;

    await client
    .from("messages")
    .insert({
        username: currentUser,
        avatar: currentAvatar,
        content: text
    });

    input.value="";
}

function addMessage(msg){

    const wrap =
    document.createElement("div");

    wrap.className="message";

    wrap.innerHTML=`

    <img
      class="avatar"
      src="${
        msg.avatar ||
        'assets/default-avatar.png'
      }"
    >

    <div class="content">

      <div class="username">
        ${msg.username}
      </div>

      <div>
        ${msg.content}
      </div>

      <div class="time">
        ${
          new Date(
            msg.created_at
          ).toLocaleString()
        }
      </div>

    </div>
    `;

    document
    .getElementById("messages")
    .appendChild(wrap);
}

async function loadMessages(){

    const { data } =
    await client
    .from("messages")
    .select("*")
    .order(
      "created_at",
      { ascending:true }
    );

    document
    .getElementById(
      "messages"
    ).innerHTML="";

    data.forEach(addMessage);
}

client
.channel("chat")
.on(
    "postgres_changes",
    {
        event:"INSERT",
        schema:"public",
        table:"messages"
    },
    payload => {
        addMessage(payload.new);
    }
)
.subscribe();

window.onload = async () => {

    currentUser =
    localStorage.getItem(
      "username"
    ) || "";

    currentAvatar =
    localStorage.getItem(
      "avatar"
    ) || "";

    if(currentUser){
        document
        .getElementById(
          "overlay"
        ).style.display="none";
    }

    await loadMessages();
};