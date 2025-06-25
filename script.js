// --- Configuration ---
const SUPABASE_URL = "https://fcleabfytfraizesirfx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbGVhYmZ5dGZyYWl6ZXNpcmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzE4MTksImV4cCI6MjA2NjAwNzgxOX0.Hx_0LvIvYdvlgceHWKyamIw0cpkZTI8NjikaVZfxaYA";
const OPENROUTER_API_KEY = "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";
const SITE_URL = "https://hunbot.com";
const SITE_NAME = "CHATGPT CLONE";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const authSection = document.getElementById("auth-section");
const chatUI = document.getElementById("chat-ui");
const btnSignUp = document.getElementById("sign-up");
const btnSignIn = document.getElementById("sign-in");
const btnSignOut = document.getElementById("sign-out");

// Auth modal elements
const authTabs = document.querySelectorAll(".auth-tab");
const authForms = document.querySelectorAll(".auth-form");

// Chat DOM elements (initialized after login)
let chatWindow = null;
let chatForm = null; 
let userInput = null;
let fileInput = null;
let newChatButton = null;
let chatHistoryList = null;
let sidebar = null;
let sidebarToggle = null;
let mainArea = null;

// --- State ---
let user = null;
let chats = {};
let currentChatId = null;
let struggledTopics = JSON.parse(localStorage.getItem("struggledTopics") || "{}");
let studyPlanOffered = JSON.parse(localStorage.getItem("studyPlanOffered") || "false");

// --- Auth Handlers ---
btnSignUp.onclick = async () => {
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  if (!email || !password) return alert("Enter email and password");
  
  // Show loading state
  const button = btnSignUp;
  const span = button.querySelector('span');
  const loader = button.querySelector('.button-loader');
  button.disabled = true;
  span.style.display = 'none';
  loader.style.display = 'block';
  
  const { error } = await supabase.auth.signUp({ email, password });
  
  // Reset button state
  button.disabled = false;
  span.style.display = 'block';
  loader.style.display = 'none';
  
  if (error) alert("Sign up error: " + error.message);
  else alert("Sign-up successful! Please confirm your email.");
};

btnSignIn.onclick = async () => {
  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;
  if (!email || !password) return alert("Enter email and password");
  
  // Show loading state
  const button = btnSignIn;
  const span = button.querySelector('span');
  const loader = button.querySelector('.button-loader');
  button.disabled = true;
  span.style.display = 'none';
  loader.style.display = 'block';
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  // Reset button state
  button.disabled = false;
  span.style.display = 'block';
  loader.style.display = 'none';
  
  if (error) return alert("Sign in error: " + error.message);
  user = data.user;
  await onLogin(user);
};

btnSignOut.onclick = async () => {
  await supabase.auth.signOut();
  location.reload();
};

// --- Auth Tab Switching ---
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetTab = tab.dataset.tab;
    
    // Update active tab
    authTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    // Update active form
    authForms.forEach(form => form.classList.remove('active'));
    document.getElementById(`${targetTab}-form`).classList.add('active');
  });
});

// Check for existing session on page load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    user = session.user;
    onLogin(user);
  }
});

// --- Login Setup ---
async function onLogin(loggedInUser) {
  try {
    user = loggedInUser;
    console.log("Login successful, setting up UI...");
    authSection.style.display = "none";
    chatUI.style.display = "flex";
    btnSignOut.style.display = "inline-block";

    // Initialize chat UI elements
    chatWindow = document.getElementById("chat-window");
    chatForm = document.getElementById("chat-form");
    userInput = document.getElementById("user-input");
    fileInput = document.getElementById("file-input");
    newChatButton = document.getElementById("new-chat");
    chatHistoryList = document.getElementById("chat-history");
    sidebar = document.querySelector(".sidebar");
    sidebarToggle = document.querySelector(".sidebar-toggle");
    mainArea = document.querySelector(".main");

    console.log("Chat UI elements found:", {
      chatWindow: !!chatWindow,
      chatForm: !!chatForm,
      userInput: !!userInput,
      sidebar: !!sidebar,
      mainArea: !!mainArea
    });

    // Ensure all elements are found
    if (!chatWindow || !chatForm || !userInput) {
      console.error("Failed to initialize chat UI elements");
      return;
    }

    // Load chats from DB (with fallback if DB fails)
    try {
      await loadChatsFromDB();
    } catch (error) {
      console.error("Failed to load chats from DB, continuing with empty chats:", error);
      chats = {};
      currentChatId = null;
    }

    // Setup UI event listeners
    setupUIEvents();

    if (Object.keys(chats).length === 0) {
      await startNewChat(); // note: await so initial DB save works
    } else {
      updateChatHistory();
      renderChat();
    }
  } catch (error) {
    console.error("Error in onLogin:", error);
    alert("There was an error setting up the chat interface. Please refresh the page.");
  }
}

// --- Load chats for logged in user ---
async function loadChatsFromDB() {
  try {
    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading chats:", error);
      // If table doesn't exist, initialize empty chats
      if (error.code === "42P01") {
        console.log("Chats table doesn't exist, starting with empty chats");
        chats = {};
        currentChatId = null;
        saveLocal();
        return;
      }
      throw error;
    }

    chats = {};
    if (data && data.length > 0) {
      data.forEach(row => {
        if (!chats[row.chat_id]) {
          chats[row.chat_id] = { name: row.chat_name, messages: [] };
        }
        chats[row.chat_id].messages.push({ role: row.role, text: row.message });
      });
    }

    currentChatId = Object.keys(chats)[0] || null;
    saveLocal();
  } catch (error) {
    console.error("Failed to load chats from database:", error);
    // Continue with empty chats if DB fails
    chats = {};
    currentChatId = null;
    saveLocal();
  }
}

// --- Save a chat message to DB ---
async function saveMessageToDB(chatId, chatName, role, message) {
  const { error } = await supabase.from("chats").insert({
    user_id: user.id,
    chat_id: chatId,
    chat_name: chatName,
    role,
    message,
  });

  if (error) console.error("Error saving message:", error);
}

// --- Delete all messages of a chat from DB ---
async function deleteChatFromDB(chatId) {
  const { error } = await supabase
    .from("chats")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", user.id);

  if (error) console.error("Error deleting chat from DB:", error);
}

// --- Setup UI event listeners ---
function setupUIEvents() {
  // Sidebar toggle for mobile
  sidebarToggle.addEventListener("click", () => {
    const struggleTracker = document.getElementById("struggle-tracker");
    const overlay = document.querySelector(".sidebar-overlay");

    sidebar.classList.toggle("hidden");
    sidebarToggle.classList.toggle("collapsed");

    if (struggleTracker) struggleTracker.classList.toggle("hidden");
    if (window.innerWidth <= 768 && overlay) overlay.classList.toggle("active");

    mainArea.style.marginLeft = sidebar.classList.contains("hidden") ? "0" : "0px";
  });

  // Overlay click hides sidebar on mobile
  const overlay = document.querySelector(".sidebar-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.add("hidden");
      sidebarToggle.classList.add("collapsed");
      overlay.classList.remove("active");
      const struggleTracker = document.getElementById("struggle-tracker");
      if (struggleTracker) struggleTracker.classList.add("hidden");
    });
  }

  // New chat button
  newChatButton.addEventListener("click", () => {
    startNewChat();
  });

  // Chat form submit
  chatForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentChatId) {
      alert("Please start a new chat first.");
      return;
    }

    const userText = userInput.value.trim();
    const file = fileInput.files[0];
    let message = userText;

    if (file) {
      message += `\n\n📎 **Uploaded file:** ${file.name}\n*[File content would be processed here - please describe what help you need]*`;
    }

    if (!message.trim() && !file) return;

    // Track struggle topics
    trackStruggle(message);

    // Add user message locally and in DB
    chats[currentChatId].messages.push({ role: "user", text: message });
    await saveMessageToDB(currentChatId, chats[currentChatId].name, "user", message);
    saveLocal();

    renderChat();

    userInput.value = "";
    fileInput.value = "";
    userInput.disabled = true;

    // Add typing indicator
    const typingMessage = { role: "bot", text: "Tutor is thinking", isTyping: true };
    chats[currentChatId].messages.push(typingMessage);
    renderChat();

    // Get AI response
    const aiReply = await sendMessageToAI(userText);

    // Remove typing indicator
    chats[currentChatId].messages.pop();

    // Add AI message locally and to DB
    const botMessage = { role: "bot", text: aiReply };
    chats[currentChatId].messages.push(botMessage);
    await saveMessageToDB(currentChatId, chats[currentChatId].name, "bot", aiReply);
    saveLocal();

    renderChat();

    // Animate typing of AI reply
    const lastBotMessageEl = chatWindow.querySelector(".chat-message.bot:last-child");
    const savedContent = lastBotMessageEl.innerHTML;
    lastBotMessageEl.innerHTML = "";
    typeMessage(aiReply, lastBotMessageEl);

    // Render LaTeX after typing animation completes
    setTimeout(() => {
      if (window.MathJax) {
        MathJax.typesetPromise([lastBotMessageEl]).catch(err => console.error("MathJax error:", err));
      }
    }, aiReply.length * 20 + 100);

    userInput.disabled = false;
    userInput.focus();
  });
}

// --- Chat functions ---

// Create a new chat with initial "Chat started" message saved to DB
async function startNewChat() {
  const name = prompt("Name this chat:") || `Chat_${Date.now()}`;
  const chatId = Date.now().toString();
  chats[chatId] = { name, messages: [] };
  currentChatId = chatId;

  // Save initial message to DB
  const initialMsg = "Chat started.";
  chats[chatId].messages.push({ role: "bot", text: initialMsg });
  await saveMessageToDB(chatId, name, "bot", initialMsg);

  saveLocal();
  updateChatHistory();
  renderChat();
}

// Save chat state to localStorage
function saveLocal() {
  localStorage.setItem("chats", JSON.stringify(chats));
  localStorage.setItem("currentChatId", currentChatId);
  localStorage.setItem("struggledTopics", JSON.stringify(struggledTopics));
  localStorage.setItem("studyPlanOffered", JSON.stringify(studyPlanOffered));
}

// Update sidebar chat history UI
function updateChatHistory() {
  chatHistoryList.innerHTML = "";
  updateStruggleDisplay();
  Object.keys(chats).forEach(id => {
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.justifyContent = "space-between";
    container.style.alignItems = "center";
    container.style.padding = "6px";
    container.style.cursor = "pointer";
    container.style.backgroundColor = id === currentChatId ? "#505050" : "transparent";

    const chatItem = document.createElement("div");
    chatItem.textContent = chats[id].name;
    chatItem.style.flexGrow = "1";
    chatItem.addEventListener("click", () => {
      currentChatId = id;
      saveLocal();
      renderChat();
      updateChatHistory();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️";
    deleteBtn.style.marginLeft = "8px";
    deleteBtn.addEventListener("click", async e => {
      e.stopPropagation();
      if (confirm("Delete this chat?")) {
        delete chats[id];
        await deleteChatFromDB(id);
        if (currentChatId === id) {
          currentChatId = Object.keys(chats)[0] || null;
        }
        saveLocal();
        updateChatHistory();
        renderChat();
      }
    });

    container.appendChild(chatItem);
    container.appendChild(deleteBtn);
    chatHistoryList.appendChild(container);
  });
}

// Render messages in chat window
function renderChat() {
  chatWindow.innerHTML = "";
  const messages = chats[currentChatId]?.messages || [];
  if (!currentChatId || messages.length === 0) {
    chatWindow.innerHTML = '<p class="chat-placeholder">Ask something to start chatting...</p>';
    return;
  }

  messages.forEach(msg => {
    const msgEl = document.createElement("div");
    msgEl.className = `chat-message ${msg.role}`;

    if (msg.isTyping) {
      msgEl.innerHTML = `<span>Tutor is thinking</span><span class="typing-animation">...</span>`;
    } else if (msg.role === "bot") {
      msgEl.innerHTML = formatBotMessage(msg.text);
    } else {
      msgEl.textContent = msg.text;
    }

    chatWindow.appendChild(msgEl);
  });

  // Render LaTeX equations
  if (window.MathJax) {
    MathJax.typesetPromise([chatWindow]).catch(err => console.error("MathJax error:", err));
  }

  setTimeout(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }, 100);
}

// Format AI messages with Markdown-like replacements
function formatBotMessage(text) {
  if (!text) return "";

  let formatted = text.replace(/\n/g, "<br>");
  formatted = formatted.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");
  formatted = formatted.replace(/`([^`]+)`/g, "<code>$1</code>");
  formatted = formatted.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  formatted = formatted.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  formatted = formatted.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  formatted = formatted.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  formatted = formatted.replace(/^- (.+)$/gm, "<li>$1</li>");
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
  formatted = formatted.replace(/(<li>.*<\/li>)/g, match => `<ul>${match.replace(/<\/li><li>/g, "</li><li>")}</ul>`);
  return formatted;
}

// Typing animation for AI messages
function typeMessage(text, element, speed = 20) {
  let i = 0;
  element.classList.add("typing-cursor");

  function typeNext() {
    if (i < text.length) {
      element.innerHTML = formatBotMessage(text.substring(0, i + 1));
      i++;
      chatWindow.scrollTop = chatWindow.scrollHeight;
      setTimeout(typeNext, speed);
    } else {
      element.classList.remove("typing-cursor");
    }
  }
  typeNext();
}

// Track struggle topics from user messages for personalized suggestions
function trackStruggle(message) {
  const topics = {
    math: ["equation", "algebra", "calculus", "geometry", "mathematics", "solve", "formula"],
    writing: ["essay", "paragraph", "thesis", "writing", "grammar", "structure"],
    science: ["chemistry", "physics", "biology", "experiment", "scientific"],
    history: ["history", "historical", "timeline", "war", "civilization"],
    programming: ["code", "programming", "function", "variable", "algorithm", "debug"],
  };

  Object.keys(topics).forEach(topic => {
    if (topics[topic].some(keyword => message.toLowerCase().includes(keyword))) {
      struggledTopics[topic] = (struggledTopics[topic] || 0) + 1;
    }
  });

  const totalStruggles = Object.values(struggledTopics).reduce((a, b) => a + b, 0);
  if (totalStruggles >= 3 && !studyPlanOffered) {
    setTimeout(() => offerStudyPlan(), 2000);
    studyPlanOffered = true;
  }
  saveLocal();
  updateStruggleDisplay();
}

// Update the struggle tracker display in sidebar
function updateStruggleDisplay() {
  const struggleList = document.getElementById("struggle-list");
  if (!struggleList) return;

  struggleList.innerHTML = "";
  Object.entries(struggledTopics).forEach(([topic, count]) => {
    const div = document.createElement("div");
    div.innerHTML = `${topic}: ${"⭐".repeat(Math.min(count, 5))} (${count})`;
    div.style.marginBottom = "4px";
    struggleList.appendChild(div);
  });
}

// Offer personalized study plan based on struggles
function offerStudyPlan() {
  const mostStruggledTopic = Object.keys(struggledTopics).reduce((a, b) =>
    struggledTopics[a] > struggledTopics[b] ? a : b
  );

  if (
    confirm(
      `I notice you've been working on ${mostStruggledTopic} concepts. Would you like me to create a personalized study plan or practice quiz for you?`
    )
  ) {
    const studyPlanMessage = {
      role: "bot",
      text: `Great! I'll create a personalized study plan for ${mostStruggledTopic}. Here's what I recommend:

**📚 Your Personalized ${mostStruggledTopic.toUpperCase()} Study Plan:**

**Week 1-2: Foundation Building**
1. Review basic concepts (15 min/day)
2. Practice simple problems
3. **Questions to ask yourself:** What are the core principles?

**Week 3-4: Application Practice**
1. Work on intermediate problems
2. Connect concepts to real examples
3. **Check your understanding:** Can you explain it to someone else?

**Week 5+: Mastery & Review**
1. Tackle complex problems
2. Create your own examples
3. Teach the concept back to me!

Would you like me to generate some practice questions to get started?`,
    };

    chats[currentChatId].messages.push(studyPlanMessage);
    saveLocal();
    renderChat();
  }
}

// --- AI messaging ---

async function sendMessageToAI(userMessage) {
  const tutorPrompt = `You are an expert tutor specializing in personalized learning.

For academic questions, use this approach:
1. Break down concepts into clear, simple steps (use numbered lists)
2. Guide with questions rather than giving direct answers
3. Provide hints and scaffolding to help students think through problems
4. For essays: Give structural ideas, thesis suggestions, and research directions - never write the essay
5. For assignments: Help break them into manageable tasks with clear steps
6. Always ask follow-up questions to check understanding
7. Identify struggle areas by noting when students ask similar questions repeatedly
8. Offer study guides and practice questions to help students master topics and prepare for exams
9. Give 5 chances. If the person still does not understand, then give the answer, but provide good enough explanation for them to understand.
10. Be supportive, only a growth mindset is allowed here.

Format academic responses with:
- Clear step-by-step breakdowns
- Guiding questions in **bold**
- Hints in *italics*
- Key concepts in ALL CAPS when first introduced
- ALWAYS use LaTeX format for ALL math equations (inline: $equation$ or display: $$equation$$)
- Examples: $x^2 + 3x - 4 = 0$, $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$, $\\sin(\\theta) = \\frac{opposite}{hypotenuse}$

Remember: Your goal is understanding, not just answers.;

User: ${userMessage}
Tutor:`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: tutorPrompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenRouter error:", data.error);
      return "Sorry, I had trouble understanding that. Please try again.";
    }

    return data.choices?.[0]?.message?.content || "Sorry, I did not get that.";
  } catch (e) {
    console.error("Error fetching AI response:", e);
    return "Sorry, something went wrong while contacting the AI.";
  }
}
