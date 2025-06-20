// API configuration - using your OpenRouter API key
const OPENROUTER_API_KEY = "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";
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
  let struggledTopics = JSON.parse(localStorage.getItem('struggledTopics') || '{}');
  let studyPlanOffered = JSON.parse(localStorage.getItem('studyPlanOffered') || 'false');

  // Load chat history from localStorage if available
  const savedChats = localStorage.getItem('chats');
  const savedCurrentChat = localStorage.getItem('currentChatId');

  if (savedChats) {
    chats = JSON.parse(savedChats);
    currentChatId = savedCurrentChat;
  }

  // Sidebar toggle handler
  sidebarToggle.addEventListener("click", () => {
    const struggleTracker = document.getElementById("struggle-tracker");
    const overlay = document.querySelector(".sidebar-overlay");
    
    sidebar.classList.toggle("hidden");
    sidebarToggle.classList.toggle("collapsed");
    
    // Toggle the struggle tracker along with the sidebar
    if (struggleTracker) {
      struggleTracker.classList.toggle("hidden");
    }

    // Handle mobile overlay
    if (window.innerWidth <= 768) {
      if (overlay) {
        overlay.classList.toggle("active");
      }
    }

    // Update main area margin when sidebar is toggled
    if (sidebar.classList.contains("hidden")) {
      mainArea.style.marginLeft = "0";
    } else {
      mainArea.style.marginLeft = "0px";
    }
  });

  // Close sidebar when clicking overlay (mobile)
  const overlay = document.querySelector(".sidebar-overlay");
  if (overlay) {
    overlay.addEventListener("click", () => {
      sidebar.classList.add("hidden");
      sidebarToggle.classList.add("collapsed");
      overlay.classList.remove("active");
      const struggleTracker = document.getElementById("struggle-tracker");
      if (struggleTracker) {
        struggleTracker.classList.add("hidden");
      }
    });
  }

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
    localStorage.setItem('struggledTopics', JSON.stringify(struggledTopics));
    localStorage.setItem('studyPlanOffered', JSON.stringify(studyPlanOffered));
  }

  function trackStruggle(message) {
    // Simple keyword detection for struggle areas
    const topics = {
      'math': ['equation', 'algebra', 'calculus', 'geometry', 'mathematics', 'solve', 'formula'],
      'writing': ['essay', 'paragraph', 'thesis', 'writing', 'grammar', 'structure'],
      'science': ['chemistry', 'physics', 'biology', 'experiment', 'scientific'],
      'history': ['history', 'historical', 'timeline', 'war', 'civilization'],
      'programming': ['code', 'programming', 'function', 'variable', 'algorithm', 'debug']
    };

    Object.keys(topics).forEach(topic => {
      if (topics[topic].some(keyword => message.toLowerCase().includes(keyword))) {
        struggledTopics[topic] = (struggledTopics[topic] || 0) + 1;
      }
    });

    // Offer study plan after 3 struggles in any topic
    const totalStruggles = Object.values(struggledTopics).reduce((a, b) => a + b, 0);
    if (totalStruggles >= 3 && !studyPlanOffered) {
      setTimeout(() => offerStudyPlan(), 2000);
      studyPlanOffered = true;
    }
  }

  function offerStudyPlan() {
    const mostStruggledTopic = Object.keys(struggledTopics).reduce((a, b) => 
      struggledTopics[a] > struggledTopics[b] ? a : b
    );
    
    if (confirm(`I notice you've been working on ${mostStruggledTopic} concepts. Would you like me to create a personalized study plan or practice quiz for you?`)) {
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

Would you like me to generate some practice questions to get started?`
      };
      
      chats[currentChatId].messages.push(studyPlanMessage);
      saveChats();
      renderChat();
    }
  }

  function updateStruggleDisplay() {
    const struggleList = document.getElementById('struggle-list');
    if (!struggleList) return;
    
    struggleList.innerHTML = '';
    Object.entries(struggledTopics).forEach(([topic, count]) => {
      const div = document.createElement('div');
      div.innerHTML = `${topic}: ${'⭐'.repeat(Math.min(count, 5))} (${count})`;
      div.style.marginBottom = '4px';
      struggleList.appendChild(div);
    });
  }

  function updateChatHistory() {
    chatHistoryList.innerHTML = "";
    updateStruggleDisplay();
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

    // Render LaTeX equations for all messages
    if (window.MathJax) {
      MathJax.typesetPromise([chatWindow]).catch((err) => console.log('MathJax error:', err));
    }

    // Scroll to bottom
    setTimeout(() => {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 100);
  }

  // Format bot messages with comprehensive markdown-style formatting
  function formatBotMessage(text) {
    if (!text) return '';

    // Convert line breaks to <br>
    let formatted = text.replace(/\n/g, '<br>');

    // Convert code blocks (must be done before inline code)
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Convert inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert bold (must be done before italic to avoid conflicts)
    formatted = formatted.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');

    // Convert italic (avoid matching already processed bold)
    formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');

    // Convert headings
    formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Convert lists (basic support)
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>');

    // Wrap consecutive list items in ul/ol tags
    formatted = formatted.replace(/(<li>.*<\/li>)/g, function(match) {
      return '<ul>' + match.replace(/<\/li><li>/g, '</li><li>') + '</ul>';
    });

    return formatted;
  }

  async function sendMessageToAI(userMessage) {
    console.log("Student: " + userMessage);

    const tutorPrompt = `You are an expert tutor specializing in personalized learning.

For simple greetings from the user (hello, hi, hey), respond briefly and naturally like: "Hello! How are you doing today? What subject can I help you with?"

For academic questions, use this approach:
1. Break down concepts into clear, simple steps (use numbered lists)
2. Guide with questions rather than giving direct answers
3. Provide hints and scaffolding to help students think through problems
4. For essays: Give structural ideas, thesis suggestions, and research directions - never write the essay
5. For assignments: Help break them into manageable tasks with clear steps
6. Always ask follow-up questions to check understanding
7. Identify struggle areas by noting when students ask similar questions repeatedly
8. Offer study guides and practice questions to help students master topics and prepare for exams
9. Give 5 chances. If the person still does not understand, then give the answer, but provide good enough explination for them to understand.
10. Be supportive, only a growth mindset is allowed here.

Format academic responses with:
- Clear step-by-step breakdowns
- Guiding questions in **bold**
- Hints in *italics*
- Key concepts in ALL CAPS when first introduced
- ALWAYS use LaTeX format for ALL math equations, and make sure to tell the user to create a new chant and then delete it, then the math will render properly (inline: $equation$ or display: $$equation$$)
- Examples: $x^2 + 3x - 4 = 0$, $$\frac{-b \pm \sqrt{b^2-4ac}}{2a}$$, $\sin(\theta) = \frac{opposite}{hypotenuse}$

Remember: Your goal is understanding, not just answers.`;

    const messageHistory = chats[currentChatId].messages
      .filter(msg => !msg.isTyping) // Filter out typing indicators
      .map(msg => ({
        role: msg.role === 'bot' ? 'assistant' : 'user',
        content: msg.text
      }));

    const payload = {
      model: "openai/gpt-4o-mini",
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
          "Content-Type": "application/json",
          "HTTP-Referer": SITE_URL,
          "X-Title": SITE_NAME
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

  // The improved typing animation function
  function typeMessage(text, element, speed = 20) {
    let i = 0;
    element.classList.add("typing-cursor");

    function typeNextChar() {
      if (i < text.length) {
        // Format the text as we go, showing proper formatting during typing
        const formattedText = formatBotMessage(text.substring(0, i + 1));
        element.innerHTML = formattedText;
        i++;
        chatWindow.scrollTop = chatWindow.scrollHeight;
        setTimeout(typeNextChar, speed);
      } else {
        // When done typing, remove the cursor
        element.classList.remove("typing-cursor");
      }
    }

    typeNextChar();
  }

  chatForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentChatId) {
      alert("Please start a new chat first.");
      return;
    }

    const userText = userInput.value.trim();
    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];
    
    let message = userText;
    if (file) {
      message += `\n\n📎 **Uploaded file:** ${file.name}\n*[File content would be processed here - for now, please describe what help you need with this file]*`;
    }
    
    if (!message.trim() && !file) return;

    // Track potential struggle areas
    trackStruggle(message);

    // Add user message
    chats[currentChatId].messages.push({ role: "user", text: message });
    saveChats();
    renderChat();
    userInput.value = "";
    fileInput.value = "";
    userInput.disabled = true;

    // Show typing indicator with animation
    const typingMessage = { role: "bot", text: "Tutor is thinking", isTyping: true };
    chats[currentChatId].messages.push(typingMessage);
    renderChat();

    // Get AI reply
    const aiReply = await sendMessageToAI(userText);

    // Remove typing indicator
    chats[currentChatId].messages.pop();

    // Add the AI message to chat history first (but don't render yet)
    const botMessage = { role: "bot", text: aiReply };
    chats[currentChatId].messages.push(botMessage);
    saveChats();

    // Re-render, but this time with the complete message
    renderChat();

    // Find the last bot message element that was just rendered
    const lastBotMessageEl = chatWindow.querySelector(".chat-message.bot:last-child");

    // Clear it for the typing animation
    const savedContent = lastBotMessageEl.innerHTML;
    lastBotMessageEl.innerHTML = "";

    // Start typing animation on the existing element
    typeMessage(aiReply, lastBotMessageEl);

    // Render LaTeX equations after typing is complete
    setTimeout(() => {
      if (window.MathJax) {
        MathJax.typesetPromise([lastBotMessageEl]).catch((err) => console.log('MathJax error:', err));
      }
    }, aiReply.length * 20 + 100); // Wait for typing to complete

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
