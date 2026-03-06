const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const inputEl = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const newChatBtn = document.getElementById("newChatBtn");
const sessionBadge = document.getElementById("sessionBadge");

const SESSION_KEY = "nimbusdesk_chat_session_id";

function createSessionId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `sess_${Date.now()}_${rand}`;
}

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = createSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function shortSessionId(id) {
  if (!id) return "unknown";
  return `${id.slice(0, 12)}...`;
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appendMessage(role, text) {
  const card = document.createElement("article");
  card.className = `message ${role} enter`;

  const meta = document.createElement("div");
  meta.className = "message-meta";

  const roleEl = document.createElement("span");
  roleEl.className = "role";
  roleEl.textContent = role === "user" ? "You" : "Assistant";

  const time = document.createElement("time");
  time.className = "time";
  time.textContent = nowLabel();

  meta.appendChild(roleEl);
  meta.appendChild(time);

  const body = document.createElement("p");
  body.textContent = text;

  card.appendChild(meta);
  card.appendChild(body);
  messagesEl.appendChild(card);
  setTimeout(() => card.classList.remove("enter"), 260);

  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(loading) {
  sendBtn.disabled = loading;
  inputEl.disabled = loading;
  typingIndicator.classList.toggle("hidden", !loading);
}

function autoresizeInput() {
  inputEl.style.height = "auto";
  inputEl.style.height = `${Math.min(inputEl.scrollHeight, 180)}px`;
}

function updateSessionBadge() {
  const id = getSessionId();
  sessionBadge.textContent = `Session: ${shortSessionId(id)}`;
}

inputEl.addEventListener("input", autoresizeInput);

newChatBtn.addEventListener("click", () => {
  const newId = createSessionId();
  localStorage.setItem(SESSION_KEY, newId);
  updateSessionBadge();
  messagesEl.innerHTML = "";
  appendMessage("assistant", "New chat started. Ask your next question.");
  inputEl.focus();
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;

  appendMessage("user", text);
  inputEl.value = "";
  autoresizeInput();
  setLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        message: text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || "Request failed. Please try again.";
      appendMessage("assistant", `Error: ${errMsg}`);
      return;
    }

    const reply = data?.reply || "I could not generate a response.";
    appendMessage("assistant", reply);
  } catch (error) {
    appendMessage("assistant", "Network error: Unable to reach the server.");
  } finally {
    setLoading(false);
    inputEl.focus();
  }
});

updateSessionBadge();
autoresizeInput();
