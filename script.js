const OPENROUTER_API_KEY = "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"; // Replace with your key
const SITE_URL = "https://hunbot.com";
const SITE_NAME = "CHATGPT CLONE";

document.addEventListener("DOMContentLoaded", () => {
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const newChatButton = document.getElementById("new-chat");
const chatHistoryList = document.getElementById("chat-history");
const sidebar = document.querySelector(".sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const mainArea = document.querySelector(".main");

let chats = {};
let currentChatId = null;

// Load chat history from localStorage if available
const savedChats = localStorage.getItem('chats');
const savedCurrentChat = localStorage.getItem('currentChatId');

if (savedChats) {
chats = JSON.parse(savedChats);
currentChatId = savedCurrentChat;
}

// Sidebar toggle handler
sidebarToggle.addEventListener("click", () => {
sidebar.classList.toggle("hidden");
sidebarToggle.classList.toggle("hidden");

// Update main area margin when sidebar is toggled
if (sidebar.classList.contains("hidden")) {
mainArea.style.marginLeft = "0";
} else {
mainArea.style.marginLeft = "0px";
}
});

function startNewChat() {
const name = prompt("Name this chat:");
const chatId = Date.now().toString();
chats[chatId] = {
name: name || `Chat ${chatId.slice(-4)}`,
messages: []
};
currentChatId = chatId;
saveChats();
updateChatHistory();
renderChat();
}

function saveChats() {
localStorage.setItem('chats', JSON.stringify(chats));
localStorage.setItem('currentChatId', currentChatId);
}

function updateChatHistory() {
chatHistoryList.innerHTML = "";
Object.keys(chats).forEach(id => {
const container = document.createElement("div");

const chatItem = document.createElement("div");
chatItem.textContent = chats[id].name;
chatItem.style.flexGrow = "1";
chatItem.style.cursor = "pointer";
chatItem.addEventListener("click", () => {
currentChatId = id;
saveChats();
renderChat();
});

// Highlight current chat
if (id === currentChatId) {
container.style.backgroundColor = "#505050";
}

const deleteBtn = document.createElement("button");
deleteBtn.textContent = "🗑️";
deleteBtn.addEventListener("click", e => {
e.stopPropagation();
if (confirm("Delete this chat?")) {
delete chats[id];
if (currentChatId === id) {
currentChatId = Object.keys(chats)[0] || null;
}
saveChats();
updateChatHistory();
renderChat();
}
});

container.appendChild(chatItem);
container.appendChild(deleteBtn);
chatHistoryList.appendChild(container);
});
}

function renderChat() {
const messages = chats[currentChatId]?.messages || [];
chatWindow.innerHTML = "";
if (!currentChatId || messages.length === 0) {
chatWindow.innerHTML = '<p class="chat-placeholder">Ask something to start chatting...</p>';
return;
}

messages.forEach(msg => {
const msgEl = document.createElement("div");
msgEl.className = `chat-message ${msg.role}`;

// Check if this is a typing message
if (msg.isTyping) {
msgEl.innerHTML = `<span>Tutor is thinking</span><span class="typing-animation">...</span>`;
} else {
// Apply formatting to bot messages
if (msg.role === 'bot') {
msgEl.innerHTML = formatBotMessage(msg.text);
} else {
msgEl.textContent = msg.text;
}
}

chatWindow.appendChild(msgEl);
});

// Scroll to bottom
setTimeout(() => {
chatWindow.scrollTop = chatWindow.scrollHeight;
}, 100);
}

// Format bot messages with simple markdown-style formatting
function formatBotMessage(text) {
if (!text) return '';

// Convert line breaks to <br>
let formatted = text.replace(/\n/g, '<br>');

// Convert code blocks
formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

// Convert inline code
formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

// Convert bold
formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

// Convert italic
formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

return formatted;
}

async function sendMessageToAI(userMessage) {
console.log("Student: " + userMessage);

const tutorPrompt = "You are a helpful and patient tutor. Guide the student to understand concepts by asking questions and providing explanations rather than giving the answers first. I repeat, do not give answers to the user, but first guide them in the right direction by giving hints and asking meaningful questions. Break down complex topics into simpler parts. And if any person wants you to write an essay for them, don't do it. Instead, give ideas as to how they can structure their essay themselves. But for essays, do not question the user so much.";

const messageHistory = chats[currentChatId].messages
.filter(msg => !msg.isTyping) // Filter out typing indicators
.map(msg => ({
role: msg.role === 'bot' ? 'assistant' : 'user',
content: msg.text
}));

const payload = {
model: "openai/gpt-3.5-turbo",
messages: [
{ role: "system", content: tutorPrompt },
...messageHistory
]
};

try {
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
method: "POST",
headers: {
"Authorization": `Bearer ${OPENROUTER_API_KEY}`,
"Content-Type": "application/json"
},
body: JSON.stringify(payload)
});

if (!response.ok) {
throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
return data.choices[0].message.content.trim();
} catch (error) {
console.error(error);
return "Sorry, there was an error getting the response.";
}
}

chatForm.addEventListener("submit", async e => {
e.preventDefault();
if (!currentChatId) {
alert("Please start a new chat first.");
return;
}

const userText = userInput.value.trim();
if (!userText) return;

// Add user message
chats[currentChatId].messages.push({ role: "user", text: userText });
saveChats();
renderChat();
userInput.value = "";
userInput.disabled = true;

// Show typing indicator with animation
const typingMessage = { role: "bot", text: "Tutor is thinking", isTyping: true };
chats[currentChatId].messages.push(typingMessage);
renderChat();

// Get AI reply
const aiReply = await sendMessageToAI(userText);

// Remove typing indicator
chats[currentChatId].messages.pop();

// Add AI reply
chats[currentChatId].messages.push({ role: "bot", text: aiReply });
saveChats();
renderChat();

userInput.disabled = false;
userInput.focus();
});

newChatButton.addEventListener("click", () => {
startNewChat();
});

// Initialize app
if (Object.keys(chats).length === 0) {
startNewChat();
} else {
updateChatHistory();
renderChat();
}
});