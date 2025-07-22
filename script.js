// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}


// --- Configuration ---
const SUPABASE_URL = "https://fcleabfytfraizesirfx.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbGVhYmZ5dGZyYWl6ZXNpcmZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MzE4MTksImV4cCI6MjA2NjAwNzgxOX0.Hx_0LvIvYdvlgceHWKyamIw0cpkZTI8NjikaVZfxaYA";
const OPENROUTER_API_KEY =
  "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";
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
let addSetButton = null;
let chatHistoryList = null;
let sidebar = null;
let sidebarToggle = null;
let mainArea = null;

// --- State ---
let user = null;
let userProfile = {
  displayName: '',
  profilePicture: ''
};
let chats = {};
let currentChatId = null;

// Safe JSON parsing with error handling
let chatSets = {};
try {
  chatSets = JSON.parse(localStorage.getItem("chatSets") || "{}");
} catch (e) {
  console.warn("Failed to load chat sets, using defaults:", e.message);
  chatSets = {};
}

let struggledTopics = {};
try {
  struggledTopics = JSON.parse(localStorage.getItem("struggledTopics") || "{}");
} catch (e) {
  console.warn("Failed to load struggled topics, using defaults:", e.message);
  struggledTopics = {};
}

let studyPlanOffered = false;
try {
  studyPlanOffered = JSON.parse(
    localStorage.getItem("studyPlanOffered") || "false",
  );
} catch (e) {
  console.warn("Failed to load study plan status, using defaults:", e.message);
  studyPlanOffered = false;
}

let userAchievements = {};
try {
  userAchievements = JSON.parse(
    localStorage.getItem("userAchievements") || "{}",
  );
} catch (e) {
  console.warn("Failed to load user achievements, using defaults:", e.message);
  userAchievements = {};
}

let studyStreak = { current: 0, best: 0, lastStudyDate: null };
try {
  studyStreak = JSON.parse(
    localStorage.getItem("studyStreak") ||
      '{"current": 0, "best": 0, "lastStudyDate": null}',
  );
} catch (e) {
  console.warn("Failed to load study streak, using defaults:", e.message);
  studyStreak = { current: 0, best: 0, lastStudyDate: null };
}

// --- Periodic Data Sync ---
let syncInterval = null;

function startPeriodicSync() {
  // Sync data every 30 seconds to prevent loss
  syncInterval = setInterval(async () => {
    if (user && user.id) {
      try {
        await saveUserLearningData();
      } catch (error) {
        console.warn("Periodic sync failed:", error);
      }
    }
  }, 30000); // 30 seconds
}

function stopPeriodicSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

// --- Auth Handlers ---
btnSignUp.onclick = async () => {
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  if (!email || !password) return alert("Enter email and password");

  // Show loading state
  const button = btnSignUp;
  const span = button.querySelector("span");
  const loader = button.querySelector(".button-loader");
  button.disabled = true;
  span.style.display = "none";
  loader.style.display = "block";

  const { error } = await supabase.auth.signUp({ email, password });

  // Reset button state
  button.disabled = false;
  span.style.display = "block";
  loader.style.display = "none";

  if (error) alert("Sign up error: " + error.message);
  else alert("Sign-up successful! Please confirm your email.");
};

btnSignIn.onclick = async () => {
  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value;
  if (!email || !password) return alert("Enter email and password");

  // Show loading state
  const button = btnSignIn;
  const span = button.querySelector("span");
  const loader = button.querySelector(".button-loader");
  button.disabled = true;
  span.style.display = "none";
  loader.style.display = "block";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Reset button state
  button.disabled = false;
  span.style.display = "block";
  loader.style.display = "none";

  if (error) return alert("Sign in error: " + error.message);
  user = data.user;
  await onLogin(user);
};

btnSignOut.onclick = async () => {
  // Stop periodic sync
  stopPeriodicSync();
  
  // Save final data before logout
  if (user && user.id) {
    try {
      await saveUserLearningData();
    } catch (error) {
      console.warn("Final save before logout failed:", error);
    }
  }
  
  await supabase.auth.signOut();
  location.reload();
};

// --- Settings Modal ---
document.addEventListener("DOMContentLoaded", function () {
  const settingsButton = document.getElementById("settings-button");
  const settingsModal = document.getElementById("settings-modal");
  const closeButton = document.querySelector(".close-button");
  const saveSettingsButton = document.getElementById("save-settings");
  const responseLength = document.getElementById("response-length");
  const responseLengthValue = document.getElementById("response-length-value");
  const creativity = document.getElementById("creativity");
  const creativityValue = document.getElementById("creativity-value");
  const style = document.getElementById("style");
  const fontSize = document.getElementById("font-size");
  const fontSizeValue = document.getElementById("font-size-value");
  
  // Profile elements
  const displayNameInput = document.getElementById("display-name-input");
  const profilePictureInput = document.getElementById("profile-picture-input");
  const profilePicturePreview = document.getElementById("profile-picture-preview");
  const changePictureBtn = document.getElementById("change-picture-btn");

  // Event listeners
  if (settingsButton)
    settingsButton.addEventListener("click", openSettingsModal);
  if (closeButton) closeButton.addEventListener("click", closeSettingsModal);
  window.addEventListener("click", outsideClick);
  if (saveSettingsButton)
    saveSettingsButton.addEventListener("click", saveSettings);
  
  // Profile event listeners
  if (changePictureBtn) {
    changePictureBtn.addEventListener("click", () => {
      profilePictureInput.click();
    });
  }
  
  if (profilePictureInput) {
    profilePictureInput.addEventListener("change", handleProfilePictureChange);
  }
  
  if (displayNameInput) {
    displayNameInput.addEventListener("input", (e) => {
      userProfile.displayName = e.target.value;
    });
    
    // Save automatically when user stops typing (debounced)
    displayNameInput.addEventListener("input", debounce(async (e) => {
      if (user && user.id) {
        await saveUserLearningData();
      }
    }, 1000));
  }

  // Real-time value updates
  if (responseLength && responseLengthValue) {
    responseLength.addEventListener("input", function () {
      responseLengthValue.textContent = responseLength.value;
    });
  }

  if (creativity && creativityValue) {
    creativity.addEventListener("input", function () {
      creativityValue.textContent = creativity.value;
    });
  }

  if (fontSize && fontSizeValue) {
    fontSize.addEventListener("input", function () {
      fontSizeValue.textContent = fontSize.value + "px";
      // Apply font size immediately
      document.documentElement.style.setProperty(
        "--chat-font-size",
        fontSize.value + "px",
      );
    });
  }

  // Functions
  function openSettingsModal() {
    if (settingsModal) {
      settingsModal.style.display = "block";
      updateProfileUI();
    }
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.style.display = "none";
    }
  }

  function outsideClick(e) {
    if (e.target === settingsModal) {
      closeSettingsModal();
    }
  }

  // Profile picture handling
  function handleProfilePictureChange(e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size too large. Please choose an image under 5MB.");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        alert("Please select an image file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = async function(e) {
        const base64String = e.target.result;
        userProfile.profilePicture = base64String;
        updateProfilePicturePreview();
        
        // Save automatically when profile picture changes
        if (user && user.id) {
          await saveUserLearningData();
          if (window.showNotification) {
            window.showNotification("Profile picture updated!");
          }
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function updateProfilePicturePreview() {
    const preview = document.getElementById("profile-picture-preview");
    if (preview) {
      if (userProfile.profilePicture) {
        preview.src = userProfile.profilePicture;
        preview.style.display = "block";
      } else {
        preview.src = "";
        preview.style.display = "block";
        preview.style.background = "linear-gradient(45deg, #e0e0e0 25%, transparent 25%, transparent 75%, #e0e0e0 75%, #e0e0e0)";
      }
    }
  }

  function updateProfileUI() {
    const displayNameInput = document.getElementById("display-name-input");
    if (displayNameInput) {
      displayNameInput.value = userProfile.displayName || "";
    }
    updateProfilePicturePreview();
    
    // Update any other UI elements that might display profile info
    updateProfileDisplayElements();
  }

  // Make updateProfileUI available globally for other functions
  window.updateProfileUI = updateProfileUI;
  
  function updateProfileDisplayElements() {
    // Update profile display elements throughout the app
    const profileDisplays = document.querySelectorAll('.profile-display-name');
    profileDisplays.forEach(element => {
      element.textContent = userProfile.displayName || user.email || 'User';
    });
    
    const profileImages = document.querySelectorAll('.profile-display-image');
    profileImages.forEach(element => {
      if (userProfile.profilePicture) {
        element.src = userProfile.profilePicture;
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });

    // Update sidebar profile section
    updateSidebarProfile();
  }

  // Update sidebar profile display
  function updateSidebarProfile() {
    const profileDisplayName = document.getElementById('profile-display-name');
    const profileDisplayEmail = document.getElementById('profile-display-email');
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const profileAvatarInitials = document.getElementById('profile-avatar-initials');

    if (profileDisplayName) {
      profileDisplayName.textContent = userProfile.displayName || (user ? user.email.split('@')[0] : 'User');
    }

    if (profileDisplayEmail && user) {
      profileDisplayEmail.textContent = user.email || 'user@example.com';
    }

    if (profileAvatarImg && profileAvatarInitials) {
      if (userProfile.profilePicture) {
        profileAvatarImg.src = userProfile.profilePicture;
        profileAvatarImg.style.display = 'block';
        profileAvatarInitials.style.display = 'none';
      } else {
        profileAvatarImg.style.display = 'none';
        profileAvatarInitials.style.display = 'block';
        
        // Generate initials from display name or email
        const name = userProfile.displayName || (user ? user.email.split('@')[0] : 'User');
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        profileAvatarInitials.textContent = initials;
      }
    }
  }

  // Make updateSidebarProfile available globally
  window.updateSidebarProfile = updateSidebarProfile;

  // Enhanced save settings function
  async function saveSettings() {
    try {
      // Save profile data to database
      if (user && user.id) {
        await saveUserLearningData();
      }
      
      // This is now handled by the SettingsManager class for other settings
      closeSettingsModal();
      
      // Update profile display elements
      updateProfileDisplayElements();
      
      // Show success message
      if (window.showNotification) {
        window.showNotification("Profile and settings saved successfully!");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      if (window.showNotification) {
        window.showNotification("Error saving profile data. Please try again.");
      }
    }
  }

  // Notification function (simple implementation)
  window.showNotification = function (message) {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0078d4;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  };

  // Settings are now handled by SettingsManager in index.html
});

// --- Auth Tab Switching ---
authTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetTab = tab.dataset.tab;

    // Update active tab
    authTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    // Update active form
    authForms.forEach((form) => form.classList.remove("active"));
    document.getElementById(`${targetTab}-form`).classList.add("active");
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
    if (!loggedInUser) {
      throw new Error("Invalid user object provided to onLogin");
    }

    user = loggedInUser;
    console.log("Login successful, setting up UI...");
    
    // Ensure DOM elements exist before proceeding
    if (!authSection || !chatUI || !btnSignOut) {
      throw new Error("Required auth DOM elements not found");
    }

    authSection.style.display = "none";
    chatUI.style.display = "flex";
    btnSignOut.style.display = "inline-block";
    
    // Initialize analytics with user ID
    if (window.userAnalytics && user.id) {
      window.userAnalytics.setUserId(user.id);
    }

    // Initialize chat UI elements
    chatWindow = document.getElementById("chat-window");
    chatForm = document.getElementById("chat-form");
    userInput = document.getElementById("user-input");
    fileInput = document.getElementById("file-input");
    newChatButton = document.getElementById("new-chat");
    addSetButton = document.getElementById("add-set");
    chatHistoryList = document.getElementById("chat-history");
    sidebar = document.querySelector(".sidebar");
    sidebarToggle = document.querySelector(".sidebar-toggle");
    mainArea = document.querySelector(".main");

    console.log("Chat UI elements found:", {
      chatWindow: !!chatWindow,
      chatForm: !!chatForm,
      userInput: !!userInput,
      sidebar: !!sidebar,
      mainArea: !!mainArea,
    });

    // Ensure all critical elements are found
    if (!chatWindow || !chatForm || !userInput) {
      throw new Error("Failed to initialize critical chat UI elements");
    }

    // Initialize user tables and load data
    try {
      await initializeUserTables();
    } catch (error) {
      console.warn("User tables initialization failed:", error);
      // Continue without database functionality
    }

    // Load chats from DB (with fallback if DB fails)
    try {
      await loadChatsFromDB();
    } catch (error) {
      console.error(
        "Failed to load chats from DB, continuing with empty chats:",
        error,
      );
      chats = {};
      currentChatId = null;
    }

    // Load user profile data
    try {
      await loadUserLearningData();
    } catch (error) {
      console.warn("Failed to load user learning data:", error);
      // Continue with default values
    }

    // Update sidebar profile display after loading data
    updateSidebarProfile();

    // Setup UI event listeners
    try {
      setupUIEvents();
      setupProgressModalEvents();
    } catch (error) {
      console.error("Failed to setup UI events:", error);
      throw error; // This is critical for functionality
    }

    // Start periodic data sync
    try {
      startPeriodicSync();
    } catch (error) {
      console.warn("Failed to start periodic sync:", error);
      // Continue without periodic sync
    }

    // Initialize with chat or create new one
    try {
      if (Object.keys(chats).length === 0) {
        await startNewChat(); // note: await so initial DB save works
      } else {
        updateChatHistory();
        renderChat();
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      // Create a minimal fallback
      chats = {};
      currentChatId = null;
      await startNewChat();
    }

    console.log("Login setup completed successfully");
    
  } catch (error) {
    console.error("Error in onLogin:", error);
    
    // Provide more specific error message
    let errorMessage = "There was an error setting up the chat interface.";
    if (error.message) {
      errorMessage += ` (${error.message})`;
    }
    errorMessage += " Please refresh the page and try again.";
    
    alert(errorMessage);
    
    // Reset UI state on error
    try {
      if (authSection) authSection.style.display = "block";
      if (chatUI) chatUI.style.display = "none";
      if (btnSignOut) btnSignOut.style.display = "none";
    } catch (resetError) {
      console.error("Failed to reset UI state:", resetError);
    }
  }
}

// --- Setup Learning Progress Modal Events ---
function setupProgressModalEvents() {
  const openModalBtn = document.getElementById('open-progress-modal');
  const closeModalBtn = document.getElementById('close-progress-modal');
  const modalOverlay = document.getElementById('learning-progress-overlay');

  if (openModalBtn) {
    openModalBtn.addEventListener('click', openProgressModal);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeProgressModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeProgressModal();
      }
    });
  }

  // Keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
      closeProgressModal();
    }
  });
}

function openProgressModal() {
  const modalOverlay = document.getElementById('learning-progress-overlay');
  if (modalOverlay) {
    modalOverlay.classList.add('show');
    populateProgressModal();
    document.body.style.overflow = 'hidden';
  }
}

function closeProgressModal() {
  const modalOverlay = document.getElementById('learning-progress-overlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('show');
    document.body.style.overflow = '';
  }
}

function populateProgressModal() {
  // Populate progress stats
  const statsGrid = document.getElementById('progress-stats-grid');
  if (statsGrid) {
    const totalMessages = Object.values(chats).reduce(
      (total, chat) => total + chat.messages.filter((msg) => msg.role === "user").length,
      0,
    );

    const achievementCount = Object.values(userAchievements).filter(Boolean).length;
    const totalAchievements = Object.keys(achievements).length;
    const topicCount = Object.keys(struggledTopics).length;

    statsGrid.innerHTML = `
      <div class="stat-card">
        <span class="stat-icon">🔥</span>
        <div class="stat-value">${studyStreak.current}</div>
        <div class="stat-label">Current Streak</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🏆</span>
        <div class="stat-value">${studyStreak.best}</div>
        <div class="stat-label">Best Streak</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">💬</span>
        <div class="stat-value">${totalMessages}</div>
        <div class="stat-label">Messages Sent</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🏅</span>
        <div class="stat-value">${achievementCount}/${totalAchievements}</div>
        <div class="stat-label">Achievements</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📚</span>
        <div class="stat-value">${topicCount}</div>
        <div class="stat-label">Topics Studied</div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">💡</span>
        <div class="stat-value">${Object.keys(chats).length}</div>
        <div class="stat-label">Chat Sessions</div>
      </div>
    `;
  }

  // Populate achievements
  const achievementGrid = document.getElementById('modal-achievement-grid');
  if (achievementGrid) {
    let achievementHTML = '';
    Object.entries(achievements).forEach(([id, achievement]) => {
      const unlocked = userAchievements[id];
      const cardClass = unlocked ? 'achievement-card unlocked' : 'achievement-card locked';
      
      achievementHTML += `
        <div class="${cardClass}">
          <span class="achievement-icon">${achievement.icon}</span>
          <div class="achievement-info">
            <h4>${achievement.name} ${unlocked ? '✅' : '🔒'}</h4>
            <p>${achievement.description}</p>
          </div>
        </div>
      `;
    });
    achievementGrid.innerHTML = achievementHTML;
  }

  // Populate topics
  const topicsList = document.getElementById('modal-topics-list');
  if (topicsList) {
    let topicsHTML = '';
    if (Object.keys(struggledTopics).length === 0) {
      topicsHTML = '<div class="topic-item"><span class="topic-name">No topics studied yet</span><span class="topic-stars">🌟</span></div>';
    } else {
      Object.entries(struggledTopics).forEach(([topic, count]) => {
        const stars = '⭐'.repeat(Math.min(count, 5));
        topicsHTML += `
          <div class="topic-item">
            <span class="topic-name">${topic.charAt(0).toUpperCase() + topic.slice(1)}</span>
            <span class="topic-stars">${stars} (${count})</span>
          </div>
        `;
      });
    }
    topicsList.innerHTML = topicsHTML;
  }
}

// --- Enhanced user data management with Supabase integration ---
async function initializeUserTables() {
  try {
    // Create user_profiles table if it doesn't exist
    await supabase.rpc('create_user_profile_if_not_exists');
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      // Create new user profile only if it doesn't exist
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          display_name: '',
          profile_picture: '',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        });

      if (profileError) console.warn("Profile creation warning:", profileError);
    } else {
      // Update last login time for existing profile
      await supabase
        .from('user_profiles')
        .update({
          last_login: new Date().toISOString()
        })
        .eq('user_id', user.id);
    }

    // Load user's learning data
    await loadUserLearningData();
    
  } catch (error) {
    console.warn("User table initialization warning:", error);
  }
}

async function loadUserLearningData() {
  try {
    // Load user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.warn("Profile load error:", profileError);
    }

    if (profileData) {
      userProfile = {
        displayName: profileData.display_name || '',
        profilePicture: profileData.profile_picture || ''
      };
      
      // Update UI elements with loaded profile data
      if (window.updateProfileUI) {
        updateProfileUI();
      }
      updateSidebarProfile();
    } else {
      // Initialize empty profile if none exists
      userProfile = {
        displayName: '',
        profilePicture: ''
      };
      updateSidebarProfile();
    }

    // Load achievements
    const { data: achievementData } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id);

    if (achievementData && achievementData.length > 0) {
      userAchievements = {};
      achievementData.forEach(row => {
        userAchievements[row.achievement_id] = row.unlocked;
      });
    }

    // Load study streak and progress data
    const { data: streakData, error: streakError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      console.warn("Streak load error:", streakError);
    }

    if (streakData) {
      studyStreak = {
        current: streakData.current_streak || 0,
        best: streakData.best_streak || 0,
        lastStudyDate: streakData.last_study_date ? streakData.last_study_date : null
      };
      struggledTopics = streakData.struggled_topics || {};
      studyPlanOffered = streakData.study_plan_offered || false;
      
      console.log("Loaded study streak from database:", studyStreak);
      
      // Check if we need to reset streak due to missed days
      if (studyStreak.lastStudyDate) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const lastStudyDate = new Date(studyStreak.lastStudyDate);
        const lastStudyStr = lastStudyDate.toISOString().split('T')[0];
        
        // Calculate days difference
        const daysDiff = Math.floor((today - lastStudyDate) / (1000 * 60 * 60 * 24));
        
        console.log("Days since last study:", daysDiff);
        
        if (daysDiff > 1) {
          // More than 1 day gap, reset current streak but keep best streak
          console.log("Resetting streak due to gap of", daysDiff, "days");
          studyStreak.current = 0;
          // Don't update lastStudyDate here - let updateStudyStreak handle it
        }
      }
    } else {
      // Initialize with default values if no data exists
      studyStreak = { current: 0, best: 0, lastStudyDate: null };
      struggledTopics = {};
      studyPlanOffered = false;
      
      console.log("Initialized default study streak:", studyStreak);
    }

    // Update UI to reflect loaded data
    updateStruggleDisplay();

  } catch (error) {
    console.warn("Learning data load warning:", error);
  }
}

async function saveUserLearningData() {
  try {
    if (!user || !user.id) {
      console.warn("Cannot save user data: no user logged in");
      return;
    }

    // Save user profile with proper error handling
    const profileData = {
      user_id: user.id,
      email: user.email,
      display_name: userProfile.displayName || '',
      profile_picture: userProfile.profilePicture || '',
      last_login: new Date().toISOString()
    };

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'user_id' });

    if (profileError) {
      console.warn("Profile save error:", profileError);
      // If table doesn't exist or schema mismatch, try to create profile
      if (profileError.code === 'PGRST204' || profileError.code === '42P01') {
        console.log("Attempting to create profile with INSERT...");
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(profileData);
        
        if (insertError && insertError.code !== '23505') { // 23505 is duplicate key error
          console.warn("Profile insert error:", insertError);
        } else {
          console.log("Profile created successfully");
        }
      }
    } else {
      console.log("Profile saved successfully:", {
        displayName: userProfile.displayName,
        hasProfilePicture: !!userProfile.profilePicture
      });
    }

    // Save achievements
    const achievementEntries = Object.entries(userAchievements)
      .filter(([_, unlocked]) => unlocked)
      .map(([achievementId]) => ({
        user_id: user.id,
        achievement_id: achievementId,
        unlocked: true,
        unlocked_at: new Date().toISOString()
      }));

    if (achievementEntries.length > 0) {
      const { error: achievementError } = await supabase
        .from('user_achievements')
        .upsert(achievementEntries, { onConflict: 'user_id,achievement_id' });
      
      if (achievementError) {
        console.warn("Achievement save error:", achievementError);
      }
    }

    // Save progress data with explicit streak information
    const progressData = {
      user_id: user.id,
      current_streak: studyStreak.current || 0,
      best_streak: studyStreak.best || 0,
      last_study_date: studyStreak.lastStudyDate,
      struggled_topics: struggledTopics || {},
      study_plan_offered: studyPlanOffered || false,
      updated_at: new Date().toISOString()
    };

    const { error: progressError } = await supabase
      .from('user_progress')
      .upsert(progressData, { onConflict: 'user_id' });

    if (progressError) {
      console.warn("Progress save error:", progressError);
    } else {
      console.log("Progress data saved successfully:", {
        currentStreak: studyStreak.current,
        bestStreak: studyStreak.best,
        lastStudyDate: studyStreak.lastStudyDate
      });
    }

  } catch (error) {
    console.error("Learning data save error:", error);
    throw error; // Re-throw to handle in calling function
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
      data.forEach((row) => {
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

    mainArea.style.marginLeft = sidebar.classList.contains("hidden")
      ? "0"
      : "0px";
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

  // Add set button
  addSetButton.addEventListener("click", () => {
    createNewSet();
  });

  // Profile section click handler - opens settings
  const profileSection = document.getElementById("profile-section");
  if (profileSection) {
    profileSection.addEventListener("click", () => {
      const settingsModal = document.getElementById("settings-modal");
      if (settingsModal) {
        settingsModal.classList.add("show");
        document.body.style.overflow = "hidden";
      }
    });
  }

  // Chat form submit
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentChatId) {
      alert("Please start a new chat first.");
      return;
    }

    const userText = userInput.value.trim();
    const file = fileInput.files[0];
    let message = userText;
    let fileContent = null;

    // Process file if uploaded
    if (file) {
      try {
        fileContent = await readFileContent(file);
        message += `\n\n📎 **Uploaded file:** ${file.name}`;
      } catch (error) {
        console.error("Error reading file:", error);
        message += `\n\n📎 **File upload failed:** ${file.name} - ${error.message}`;
      }
    }

    if (!message.trim() && !file) return;

    // Track struggle topics
    trackStruggle(message);

    // Update gamification
    console.log("Updating study streak for message...");
    await updateStudyStreak();
    checkAchievements();

    // Add user message locally and in DB
    chats[currentChatId].messages.push({ role: "user", text: message });
    await saveMessageToDB(
      currentChatId,
      chats[currentChatId].name,
      "user",
      message,
    );
    saveLocal();

    renderChat();

    userInput.value = "";
    fileInput.value = "";
    userInput.disabled = true;

    // Add typing indicator
    const typingMessage = {
      role: "bot",
      text: "Tutor is thinking",
      isTyping: true,
    };
    chats[currentChatId].messages.push(typingMessage);
    renderChat();

    // Get AI response with file content
    const aiReply = await sendMessageToAI(userText, fileContent);

    // Remove typing indicator
    chats[currentChatId].messages.pop();

    // Add AI message locally and to DB
    const botMessage = { role: "bot", text: aiReply };
    chats[currentChatId].messages.push(botMessage);
    await saveMessageToDB(
      currentChatId,
      chats[currentChatId].name,
      "bot",
      aiReply,
    );
    saveLocal();

    renderChat();

    // Animate typing of AI reply
    const lastBotMessageEl = chatWindow.querySelector(
      ".chat-message.bot:last-child",
    );
    const savedContent = lastBotMessageEl.innerHTML;
    lastBotMessageEl.innerHTML = "";
    typeMessage(aiReply, lastBotMessageEl);

    userInput.disabled = false;
    userInput.focus();
  });
}

// --- Chat functions ---

// Create a new set/folder for organizing chats
function createNewSet() {
  const setName = prompt("Name this set/folder:");
  if (!setName || setName.trim() === "") return;

  const setId = Date.now().toString();
  chatSets[setId] = {
    name: setName.trim(),
    chatIds: [],
    created: new Date().toISOString(),
  };

  saveLocal();
  updateChatHistory();
}

// Assign chat to a set
function assignChatToSet(chatId) {
  const setOptions = Object.keys(chatSets)
    .map((setId) => `${setId}: ${chatSets[setId].name}`)
    .join("\n");
  if (setOptions === "") {
    alert("No sets available. Create a set first using the 'Add Set' button.");
    return;
  }

  const selectedSet = prompt(
    `Select a set for this chat:\n${setOptions}\n\nEnter the set ID:`,
  );
  if (!selectedSet || !chatSets[selectedSet]) return;

  // Remove chat from any existing set
  Object.keys(chatSets).forEach((setId) => {
    const index = chatSets[setId].chatIds.indexOf(chatId);
    if (index > -1) {
      chatSets[setId].chatIds.splice(index, 1);
    }
  });

  // Add to new set
  chatSets[selectedSet].chatIds.push(chatId);
  saveLocal();
  updateChatHistory();
}

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

// Enhanced save function with database sync
function saveLocal() {
  try {
    localStorage.setItem("chats", JSON.stringify(chats));
    localStorage.setItem("currentChatId", currentChatId);
    localStorage.setItem("chatSets", JSON.stringify(chatSets));
    localStorage.setItem("struggledTopics", JSON.stringify(struggledTopics));
    localStorage.setItem("studyPlanOffered", JSON.stringify(studyPlanOffered));
    localStorage.setItem("userAchievements", JSON.stringify(userAchievements));
    localStorage.setItem("studyStreak", JSON.stringify(studyStreak));
    console.log("Data saved to localStorage");
    
    // Also save to database if user is logged in
    if (user && user.id) {
      saveUserLearningData().catch(error => 
        console.warn("Database sync warning:", error)
      );
    }
    
  } catch (e) {
    console.error("Failed to save data to localStorage:", e.message);
  }
}

// Enhanced Gamification system with more engaging achievements
const achievements = {
  firstChat: {
    name: "First Steps",
    icon: "🚀",
    description: "Started your first chat",
    category: "beginner"
  },
  streak3: {
    name: "Consistent Learner",
    icon: "🔥",
    description: "3-day study streak",
    category: "streak"
  },
  streak7: {
    name: "Weekly Warrior",
    icon: "⚡",
    description: "7-day study streak",
    category: "streak"
  },
  streak30: {
    name: "Monthly Master",
    icon: "🏆",
    description: "30-day study streak",
    category: "streak"
  },
  streak100: {
    name: "Centurion Scholar",
    icon: "👑",
    description: "100-day study streak",
    category: "legendary"
  },
  explorer: {
    name: "Topic Explorer",
    icon: "🧭",
    description: "Studied 5 different topics",
    category: "learning"
  },
  polymath: {
    name: "Renaissance Mind",
    icon: "🎭",
    description: "Mastered 10 different subjects",
    category: "legendary"
  },
  fileUploader: {
    name: "File Master",
    icon: "📎",
    description: "Uploaded your first file",
    category: "beginner"
  },
  studyPlan: {
    name: "Strategic Planner",
    icon: "📋",
    description: "Created a study plan",
    category: "organization"
  },
  chatMaster: {
    name: "Chat Master",
    icon: "💬",
    description: "Sent 100 messages",
    category: "communication"
  },
  conversationalist: {
    name: "Great Conversationalist",
    icon: "🗣️",
    description: "Sent 500 messages",
    category: "communication"
  },
  helpSeeker: {
    name: "Curious Mind",
    icon: "🙋",
    description: "Asked 50 questions",
    category: "learning"
  },
  persistent: {
    name: "Never Give Up",
    icon: "💪",
    description: "Continued after struggling with a topic",
    category: "resilience"
  },
  resourceful: {
    name: "Resourceful Learner",
    icon: "📚",
    description: "Used 5 different learning resources",
    category: "learning"
  },
  problemSolver: {
    name: "Problem Solver",
    icon: "💡",
    description: "Solved 10 complex problems",
    category: "analytical"
  },
  consistentContributor: {
    name: "Daily Contributor",
    icon: "✍️",
    description: "Sent messages on 5 different days",
    category: "consistency"
  },
  nightOwl: {
    name: "Night Owl Scholar",
    icon: "🦉",
    description: "Studied after 10 PM",
    category: "special"
  },
  earlyBird: {
    name: "Early Bird Learner",
    icon: "🐦",
    description: "Studied before 6 AM",
    category: "special"
  },
  weekendWarrior: {
    name: "Weekend Warrior",
    icon: "⚔️",
    description: "Studied on weekends",
    category: "dedication"
  },
  mathWizard: {
    name: "Math Wizard",
    icon: "🧙‍♂️",
    description: "Solved 20 math problems",
    category: "subject"
  },
  wordSmith: {
    name: "Word Smith",
    icon: "✒️",
    description: "Improved 10 writing pieces",
    category: "subject"
  },
  scienceEnthusiast: {
    name: "Science Enthusiast",
    icon: "🔬",
    description: "Explored 15 science concepts",
    category: "subject"
  },
  codeNinja: {
    name: "Code Ninja",
    icon: "👨‍💻",
    description: "Debugged 10 programming problems",
    category: "subject"
  },
  speedLearner: {
    name: "Speed Learner",
    icon: "⚡",
    description: "Completed 5 topics in one day",
    category: "efficiency"
  },
  deepThinker: {
    name: "Deep Thinker",
    icon: "🤔",
    description: "Spent 2+ hours on complex topics",
    category: "analytical"
  },
  socialLearner: {
    name: "Social Learner",
    icon: "👥",
    description: "Shared learning progress",
    category: "social"
  },
  goalSetter: {
    name: "Goal Setter",
    icon: "🎯",
    description: "Set and achieved learning goals",
    category: "organization"
  },
  multitasker: {
    name: "Efficient Multitasker",
    icon: "🤹",
    description: "Studied multiple subjects in one session",
    category: "efficiency"
  },
  perfectionist: {
    name: "Perfectionist",
    icon: "💎",
    description: "Achieved 100% accuracy on 5 topics",
    category: "excellence"
  },
  mentor: {
    name: "Peer Mentor",
    icon: "👨‍🏫",
    description: "Helped explain concepts to others",
    category: "social"
  },
  innovator: {
    name: "Creative Innovator",
    icon: "💡",
    description: "Found unique solutions to problems",
    category: "creativity"
  }
};

function checkAchievements() {
  const newAchievements = [];
  const currentHour = new Date().getHours();
  const today = new Date().toDateString();

  // Basic achievements
  if (!userAchievements.firstChat && Object.keys(chats).length >= 1) {
    userAchievements.firstChat = true;
    newAchievements.push("firstChat");
  }

  // Streak achievements
  if (!userAchievements.streak3 && studyStreak.current >= 3) {
    userAchievements.streak3 = true;
    newAchievements.push("streak3");
  }

  if (!userAchievements.streak7 && studyStreak.current >= 7) {
    userAchievements.streak7 = true;
    newAchievements.push("streak7");
  }

  if (!userAchievements.streak30 && studyStreak.current >= 30) {
    userAchievements.streak30 = true;
    newAchievements.push("streak30");
  }

  if (!userAchievements.streak100 && studyStreak.current >= 100) {
    userAchievements.streak100 = true;
    newAchievements.push("streak100");
  }

  // Learning achievements
  if (!userAchievements.explorer && Object.keys(struggledTopics).length >= 5) {
    userAchievements.explorer = true;
    newAchievements.push("explorer");
  }

  if (!userAchievements.polymath && Object.keys(struggledTopics).length >= 10) {
    userAchievements.polymath = true;
    newAchievements.push("polymath");
  }

  // File and planning achievements
  if (!userAchievements.fileUploader && fileInput && fileInput.files.length > 0) {
    userAchievements.fileUploader = true;
    newAchievements.push("fileUploader");
  }

  if (!userAchievements.studyPlan && studyPlanOffered) {
    userAchievements.studyPlan = true;
    newAchievements.push("studyPlan");
  }

  // Time-based achievements
  if (!userAchievements.nightOwl && currentHour >= 22) {
    userAchievements.nightOwl = true;
    newAchievements.push("nightOwl");
  }

  if (!userAchievements.earlyBird && currentHour <= 6) {
    userAchievements.earlyBird = true;
    newAchievements.push("earlyBird");
  }

  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  if (!userAchievements.weekendWarrior && isWeekend) {
    userAchievements.weekendWarrior = true;
    newAchievements.push("weekendWarrior");
  }

  // Subject-specific achievements
  const mathCount = struggledTopics.math || 0;
  if (!userAchievements.mathWizard && mathCount >= 20) {
    userAchievements.mathWizard = true;
    newAchievements.push("mathWizard");
  }

  const writingCount = struggledTopics.writing || 0;
  if (!userAchievements.wordSmith && writingCount >= 10) {
    userAchievements.wordSmith = true;
    newAchievements.push("wordSmith");
  }

  const scienceCount = struggledTopics.science || 0;
  if (!userAchievements.scienceEnthusiast && scienceCount >= 15) {
    userAchievements.scienceEnthusiast = true;
    newAchievements.push("scienceEnthusiast");
  }

  const programmingCount = struggledTopics.programming || 0;
  if (!userAchievements.codeNinja && programmingCount >= 10) {
    userAchievements.codeNinja = true;
    newAchievements.push("codeNinja");
  }

  // Count total messages and study days
  const totalMessages = Object.values(chats).reduce(
    (total, chat) =>
      total + chat.messages.filter((msg) => msg.role === "user").length,
    0,
  );

  const studyDaysCount = new Set();
  Object.values(chats).forEach((chat) => {
    chat.messages.filter((msg) => msg.role === "user").forEach(() => {
      studyDaysCount.add(today);
    });
  });

  // Communication achievements
  if (!userAchievements.helpSeeker && totalMessages >= 50) {
    userAchievements.helpSeeker = true;
    newAchievements.push("helpSeeker");
  }

  if (!userAchievements.chatMaster && totalMessages >= 100) {
    userAchievements.chatMaster = true;
    newAchievements.push("chatMaster");
  }

  if (!userAchievements.conversationalist && totalMessages >= 500) {
    userAchievements.conversationalist = true;
    newAchievements.push("conversationalist");
  }

  if (!userAchievements.consistentContributor && studyDaysCount.size >= 5) {
    userAchievements.consistentContributor = true;
    newAchievements.push("consistentContributor");
  }

  // Additional achievements
  if (!userAchievements.persistent && Object.keys(struggledTopics).length >= 3) {
    userAchievements.persistent = true;
    newAchievements.push("persistent");
  }

  if (!userAchievements.speedLearner && Object.keys(struggledTopics).length >= 5) {
    userAchievements.speedLearner = true;
    newAchievements.push("speedLearner");
  }

  // Show achievement notifications
  newAchievements.forEach((achievementId) => {
    showAchievementUnlocked(achievementId);
  });

  // Save to both local storage and database
  saveLocal();
  saveUserLearningData();
}

function showAchievementUnlocked(achievementId) {
  const achievement = achievements[achievementId];
  if (!achievement) return;

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    color: #333;
    padding: 16px 24px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(255, 215, 0, 0.4);
    z-index: 10000;
    font-weight: bold;
    text-align: center;
    animation: achievementSlide 0.5s ease;
    border: 2px solid #ffed4e;
  `;

  notification.innerHTML = `
    <div style="font-size: 24px; margin-bottom: 4px;">${achievement.icon}</div>
    <div style="font-size: 16px; margin-bottom: 2px;">Achievement Unlocked!</div>
    <div style="font-size: 14px; font-weight: normal;">${achievement.name}</div>
    <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${achievement.description}</div>
  `;

  // Add animation keyframes
  if (!document.getElementById("achievement-styles")) {
    const style = document.createElement("style");
    style.id = "achievement-styles";
    style.textContent = `
      @keyframes achievementSlide {
        from { opacity: 0; transform: translateX(-50%) translateY(-50px) scale(0.8); }
        to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "achievementSlide 0.5s ease reverse";
    setTimeout(() => notification.remove(), 500);
  }, 4000);
}

async function updateStudyStreak() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  console.log("Updating streak. Today:", todayStr, "Last study date:", studyStreak.lastStudyDate);

  // Check if lastStudyDate is null or undefined
  if (!studyStreak.lastStudyDate) {
    // If there's no previous study date, start a new streak
    studyStreak.current = 1;
    studyStreak.lastStudyDate = todayStr;
    studyStreak.best = Math.max(studyStreak.best || 0, studyStreak.current);
    console.log("Starting new streak - first time");
  } else {
    // Convert lastStudyDate to YYYY-MM-DD format for consistent comparison
    const lastStudyDate = new Date(studyStreak.lastStudyDate);
    const lastStudyStr = lastStudyDate.toISOString().split('T')[0];
    
    console.log("Comparing dates - Last:", lastStudyStr, "Today:", todayStr);

    if (lastStudyStr !== todayStr) {
      // Calculate yesterday in YYYY-MM-DD format
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log("Different dates. Yesterday:", yesterdayStr);

      if (lastStudyStr === yesterdayStr) {
        // Continuing streak from yesterday
        studyStreak.current = (studyStreak.current || 0) + 1;
        console.log("Continuing streak, new count:", studyStreak.current);
      } else {
        // Breaking streak or gap in days - start new streak
        studyStreak.current = 1;
        console.log("Breaking streak, starting fresh");
      }

      studyStreak.lastStudyDate = todayStr;
      studyStreak.best = Math.max(studyStreak.best || 0, studyStreak.current);
    } else {
      console.log("Already studied today, no streak update needed");
      return; // Already studied today, no update needed
    }
  }
  
  // Save immediately to both localStorage and database
  saveLocal();
  await saveUserLearningData();
  
  console.log("Study streak updated:", studyStreak);
}

// Update sidebar chat history UI
function updateChatHistory() {
  chatHistoryList.innerHTML = "";
  updateStruggleDisplay();

  // Get chats that are not in any set
  const chatsInSets = new Set();
  Object.values(chatSets).forEach((set) => {
    set.chatIds.forEach((chatId) => chatsInSets.add(chatId));
  });

  // Display sets first
  Object.keys(chatSets).forEach((setId) => {
    const setContainer = document.createElement("div");
    setContainer.style.marginBottom = "8px";

    // Set header
    const setHeader = document.createElement("div");
    setHeader.style.display = "flex";
    setHeader.style.justifyContent = "space-between";
    setHeader.style.alignItems = "center";
    setHeader.style.padding = "8px";
    setHeader.style.backgroundColor = "#4a4a4a";
    setHeader.style.borderRadius = "6px";
    setHeader.style.marginBottom = "4px";
    setHeader.style.fontWeight = "bold";
    setHeader.style.color = "#0078d4";

    const setTitle = document.createElement("span");
    setTitle.textContent = `📁 ${chatSets[setId].name}`;
    setTitle.style.fontSize = "14px";

    const setDeleteBtn = document.createElement("button");
    setDeleteBtn.textContent = "🗑️";
    setDeleteBtn.style.background = "none";
    setDeleteBtn.style.border = "none";
    setDeleteBtn.style.color = "#bbb";
    setDeleteBtn.style.cursor = "pointer";
    setDeleteBtn.style.padding = "2px";
    setDeleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (
        confirm(
          `Delete set "${chatSets[setId].name}"? Chats will not be deleted.`,
        )
      ) {
        delete chatSets[setId];
        saveLocal();
        updateChatHistory();
      }
    });

    setHeader.appendChild(setTitle);
    setHeader.appendChild(setDeleteBtn);
    setContainer.appendChild(setHeader);

    // Chats in this set
    chatSets[setId].chatIds.forEach((chatId) => {
      if (chats[chatId]) {
        const chatContainer = createChatItem(chatId, true);
        setContainer.appendChild(chatContainer);
      }
    });

    chatHistoryList.appendChild(setContainer);
  });

  // Display ungrouped chats
  const ungroupedChats = Object.keys(chats).filter(
    (id) => !chatsInSets.has(id),
  );
  if (ungroupedChats.length > 0) {
    const ungroupedHeader = document.createElement("div");
    ungroupedHeader.style.padding = "8px 4px";
    ungroupedHeader.style.fontWeight = "bold";
    ungroupedHeader.style.color = "#888";
    ungroupedHeader.style.fontSize = "12px";
    ungroupedHeader.textContent = "UNGROUPED CHATS";
    chatHistoryList.appendChild(ungroupedHeader);

    ungroupedChats.forEach((id) => {
      const chatContainer = createChatItem(id, false);
      chatHistoryList.appendChild(chatContainer);
    });
  }
}

// Helper function to create chat item
function createChatItem(id, isInSet) {
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.justifyContent = "space-between";
  container.style.alignItems = "center";
  container.style.padding = "6px";
  container.style.cursor = "pointer";
  container.style.backgroundColor =
    id === currentChatId ? "#505050" : "transparent";
  container.style.marginLeft = isInSet ? "16px" : "0";
  container.style.borderRadius = "4px";
  container.style.marginBottom = "2px";

  const chatItem = document.createElement("div");
  chatItem.textContent = chats[id].name;
  chatItem.style.flexGrow = "1";
  chatItem.style.fontSize = isInSet ? "13px" : "14px";
  chatItem.addEventListener("click", () => {
    currentChatId = id;
    saveLocal();
    renderChat();
    updateChatHistory();
  });

  const buttonContainer = document.createElement("div");
  buttonContainer.style.display = "flex";
  buttonContainer.style.gap = "4px";

  // Add to set button (only for ungrouped chats)
  if (!isInSet) {
    const addToSetBtn = document.createElement("button");
    addToSetBtn.textContent = "📁";
    addToSetBtn.title = "Add to set";
    addToSetBtn.style.background = "none";
    addToSetBtn.style.border = "none";
    addToSetBtn.style.color = "#bbb";
    addToSetBtn.style.cursor = "pointer";
    addToSetBtn.style.padding = "2px";
    addToSetBtn.style.fontSize = "12px";
    addToSetBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      assignChatToSet(id);
    });
    buttonContainer.appendChild(addToSetBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";
  deleteBtn.style.background = "none";
  deleteBtn.style.border = "none";
  deleteBtn.style.color = "#bbb";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.style.padding = "2px";
  deleteBtn.style.fontSize = "12px";
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      // Remove from sets
      Object.keys(chatSets).forEach((setId) => {
        const index = chatSets[setId].chatIds.indexOf(id);
        if (index > -1) {
          chatSets[setId].chatIds.splice(index, 1);
        }
      });

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

  buttonContainer.appendChild(deleteBtn);
  container.appendChild(chatItem);
  container.appendChild(buttonContainer);

  return container;
}

// Function to edit user messages like ChatGPT
function addEditButton(messageElement, messageText, messageIndex) {
  const editButton = document.createElement("button");
  editButton.className = "edit-button";
  editButton.innerHTML = "✏️ Edit";
  editButton.title = "Edit message";

  editButton.addEventListener("click", (e) => {
    e.stopPropagation();

    // Store the original content
    const originalContent = messageElement.innerHTML;

    // Create edit interface
    const editInterface = document.createElement("div");
    editInterface.className = "edit-interface";

    const editTextarea = document.createElement("textarea");
    editTextarea.className = "edit-textarea";
    editTextarea.value = messageText;
    editTextarea.placeholder = "Edit your message...";

    const editButtons = document.createElement("div");
    editButtons.className = "edit-buttons";

    const saveButton = document.createElement("button");
    saveButton.className = "save-button-edit";
    saveButton.innerHTML = "💾 Save & Submit";

    const cancelButton = document.createElement("button");
    cancelButton.className = "cancel-button";
    cancelButton.innerHTML = "❌ Cancel";

    editButtons.appendChild(saveButton);
    editButtons.appendChild(cancelButton);
    editInterface.appendChild(editTextarea);
    editInterface.appendChild(editButtons);

    // Replace message content with edit interface
    messageElement.innerHTML = "";
    messageElement.appendChild(editInterface);

    // Focus on textarea
    editTextarea.focus();
    editTextarea.select();

    // Save button event - ChatGPT style
    saveButton.addEventListener("click", async () => {
      const newText = editTextarea.value.trim();
      if (newText && newText !== messageText) {
        // Remove all messages after this edited message (like ChatGPT)
        chats[currentChatId].messages = chats[currentChatId].messages.slice(
          0,
          messageIndex + 1,
        );

        // Update the edited message
        chats[currentChatId].messages[messageIndex].text = newText;

        // Save to database and local storage
        await saveMessageToDB(
          currentChatId,
          chats[currentChatId].name,
          "user",
          newText,
        );
        saveLocal();

        // Re-render chat with updated message
        renderChat();

        // Generate new AI response to the edited message
        userInput.disabled = true;

        // Add typing indicator
        const typingMessage = {
          role: "bot",
          text: "Tutor is thinking",
          isTyping: true,
        };
        chats[currentChatId].messages.push(typingMessage);
        renderChat();

        // Get AI response
        const aiReply = await sendMessageToAI(newText);

        // Remove typing indicator
        chats[currentChatId].messages.pop();

        // Add AI message
        const botMessage = { role: "bot", text: aiReply };
        chats[currentChatId].messages.push(botMessage);
        await saveMessageToDB(
          currentChatId,
          chats[currentChatId].name,
          "bot",
          aiReply,
        );
        saveLocal();

        renderChat();

        // Animate typing of AI reply
        const lastBotMessageEl = chatWindow.querySelector(
          ".chat-message.bot:last-child",
        );
        if (lastBotMessageEl) {
          const savedContent = lastBotMessageEl.innerHTML;
          lastBotMessageEl.innerHTML = "";
          typeMessage(aiReply, lastBotMessageEl);
        }

        userInput.disabled = false;
        userInput.focus();
      } else if (newText === messageText) {
        // No changes, just cancel
        messageElement.innerHTML = originalContent;
      } else {
        // Empty input, show warning
        editTextarea.style.borderColor = "#ef4444";
        editTextarea.placeholder = "Message cannot be empty!";
        setTimeout(() => {
          editTextarea.style.borderColor = "";
          editTextarea.placeholder = "Edit your message...";
        }, 2000);
      }
    });

    // Cancel button event
    cancelButton.addEventListener("click", () => {
      messageElement.innerHTML = originalContent;
    });

    // Escape key to cancel
    editTextarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        messageElement.innerHTML = originalContent;
      }
    });
  });

  messageElement.appendChild(editButton);
}

// Function to add edit button to user messages
function addUserMessageButtons(messageElement, messageText, messageIndex) {
  addEditButton(messageElement, messageText, messageIndex);
}

// Function to copy text to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

// Function to strip HTML tags and get plain text
function stripHtmlTags(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

// Function to add copy button to bot messages
function addCopyButton(messageElement, messageText) {
  const copyButton = document.createElement("button");
  copyButton.className = "copy-button";
  copyButton.innerHTML = "📋 Copy";
  copyButton.title = "Copy message";

  copyButton.addEventListener("click", async (e) => {
    e.stopPropagation();

    // Get the plain text version of the message
    const plainText = stripHtmlTags(messageText);

    // Copy to clipboard
    const success = await copyToClipboard(plainText);

    if (success) {
      // Show success feedback
      copyButton.innerHTML = "✅ Copied!";
      copyButton.classList.add("copied");

      // Reset button after 2 seconds
      setTimeout(() => {
        copyButton.innerHTML = "📋 Copy";
        copyButton.classList.remove("copied");
      }, 2000);
    } else {
      // Show error feedback
      copyButton.innerHTML = "❌ Failed";
      setTimeout(() => {
        copyButton.innerHTML = "📋 Copy";
      }, 2000);
    }
  });

  messageElement.appendChild(copyButton);
}

// Function to add feedback buttons to bot messages
function addFeedbackButtons(messageElement, messageIndex) {
  const feedbackContainer = document.createElement("div");
  feedbackContainer.className = "feedback-container";
  feedbackContainer.style.cssText = `
    position: absolute;
    top: 8px;
    right: 60px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 10;
  `;

  const thumbsUp = document.createElement("button");
  thumbsUp.className = "feedback-button positive";
  thumbsUp.innerHTML = "👍";
  thumbsUp.title = "Helpful response";
  thumbsUp.style.cssText = `
    background: rgba(40, 167, 69, 0.8);
    border: 1px solid rgba(40, 167, 69, 0.4);
    color: white;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  `;

  const thumbsDown = document.createElement("button");
  thumbsDown.className = "feedback-button negative";
  thumbsDown.innerHTML = "👎";
  thumbsDown.title = "Not helpful";
  thumbsDown.style.cssText = `
    background: rgba(220, 53, 69, 0.8);
    border: 1px solid rgba(220, 53, 69, 0.4);
    color: white;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
  `;

  thumbsUp.addEventListener("click", (e) => {
    e.stopPropagation();
    handleFeedback(messageIndex, "positive");
    thumbsUp.innerHTML = "✅";
    thumbsUp.style.background = "rgba(40, 167, 69, 1)";
    thumbsDown.style.opacity = "0.5";
    thumbsDown.disabled = true;
  });

  thumbsDown.addEventListener("click", (e) => {
    e.stopPropagation();
    handleFeedback(messageIndex, "negative");
    thumbsDown.innerHTML = "❌";
    thumbsDown.style.background = "rgba(220, 53, 69, 1)";
    thumbsUp.style.opacity = "0.5";
    thumbsUp.disabled = true;
  });

  feedbackContainer.appendChild(thumbsUp);
  feedbackContainer.appendChild(thumbsDown);
  messageElement.appendChild(feedbackContainer);

  // Show feedback buttons on hover
  messageElement.addEventListener("mouseenter", () => {
    feedbackContainer.style.opacity = "1";
  });

  messageElement.addEventListener("mouseleave", () => {
    if (!thumbsUp.disabled && !thumbsDown.disabled) {
      feedbackContainer.style.opacity = "0";
    }
  });
}

// Handle feedback submission
function handleFeedback(messageIndex, type) {
  const feedback = {
    messageIndex,
    type,
    timestamp: new Date().toISOString(),
    chatId: currentChatId,
  };

  // Store feedback locally
  let feedbackData = JSON.parse(
    localStorage.getItem("messageFeedback") || "[]",
  );
  feedbackData.push(feedback);
  localStorage.setItem("messageFeedback", JSON.stringify(feedbackData));

  // Show feedback acknowledgment
  if (window.showNotification) {
    window.showNotification(
      type === "positive"
        ? "Thanks for the positive feedback!"
        : "Thanks for the feedback - I'll improve!",
    );
  }

  // Optional: Send feedback to analytics (implement if needed)
  console.log("Feedback submitted:", feedback);
}

// Render messages in chat window
function renderChat() {
  if (!chatWindow) {
    console.warn("Chat window not initialized yet");
    return;
  }

  chatWindow.innerHTML = "";
  const messages = chats[currentChatId]?.messages || [];

  if (!currentChatId || messages.length === 0) {
    chatWindow.innerHTML =
      '<p class="chat-placeholder">Ask something to start chatting...</p>';
    return;
  }

  messages.forEach((msg, index) => {
    const msgEl = document.createElement("div");
    msgEl.className = `chat-message ${msg.role}`;

    if (msg.isTyping) {
      msgEl.innerHTML = `<span>Tutor is thinking</span><span class="typing-animation"></span>`;
    } else if (msg.role === "bot") {
      const formattedText = formatBotMessage(msg.text);
      msgEl.innerHTML = formattedText;
      // Add copy button and feedback buttons to bot messages
      addCopyButton(msgEl, formattedText);
      addFeedbackButtons(msgEl, index);
    } else {
      // User message
      msgEl.textContent = msg.text;
      // Add edit button to user messages
      addUserMessageButtons(msgEl, msg.text, index);
    }

    chatWindow.appendChild(msgEl);
  });

  // Render LaTeX equations after all messages are added
  if (window.MathJax) {
    MathJax.typesetPromise([chatWindow]).catch((err) =>
      console.error("MathJax error:", err),
    );
  }

  // Auto-scroll to bottom
  setTimeout(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }, 100);
}

// Function to generate AI response (mock implementation)
function generateAIResponse(userMessage) {
  // Add typing indicator
  const typingMessage = { role: "bot", text: "", isTyping: true };
  chats[currentChatId].messages.push(typingMessage);
  renderChat();

  // Simulate AI thinking time
  setTimeout(() => {
    // Remove typing indicator
    chats[currentChatId].messages.pop();

    // Generate contextual response based on the edited message
    let aiResponse = generateContextualResponse(userMessage);

    // Add actual AI response
    chats[currentChatId].messages.push({
      role: "bot",
      text: aiResponse,
    });

    renderChat();
    saveLocal();
  }, 1500); // Simulate thinking time
}

// Function to generate contextual responses based on user input
function generateContextualResponse(userMessage) {
  return sendMessageToAI(userMessage, null);
}

// Function to send message (removed - now handled in setupUIEvents)

// Initial render will be called after login in onLogin() function

// Format AI messages with enhanced Markdown-like replacements and clickable links
function formatBotMessage(text) {
  if (!text) return "";

  let formatted = text.replace(/\n/g, "<br>");
  
  // Enhanced code block formatting with syntax highlighting
  formatted = formatted.replace(
    /```(\w+)?\n?([\s\S]*?)```/g,
    (match, language, code) => {
      const lang = language || 'text';
      return `<div class="code-block">
        <div class="code-header">
          <span class="code-language">${lang}</span>
          <button class="copy-code-btn" onclick="copyCodeToClipboard(this)">Copy</button>
        </div>
        <pre><code class="language-${lang}">${code.trim()}</code></pre>
      </div>`;
    }
  );
  
  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // Enhanced link formatting - make all links clickable
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );
  
  // Auto-link URLs that aren't already linked
  formatted = formatted.replace(
    /(?<!href=["'])(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );
  
  // Text formatting
  formatted = formatted.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  
  // Headers
  formatted = formatted.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  formatted = formatted.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  formatted = formatted.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  
  // Lists
  formatted = formatted.replace(/^- (.+)$/gm, "<li>$1</li>");
  formatted = formatted.replace(/^(\d+)\. (.+)$/gm, "<li>$2</li>");
  formatted = formatted.replace(
    /(<li>.*<\/li>)/g,
    (match) => `<ul>${match.replace(/<\/li><li>/g, "</li><li>")}</ul>`,
  );
  
  // Enhanced learning resources section formatting
  formatted = formatted.replace(
    /📚 Learning Resources:?/gi,
    '<div class="learning-resources"><h4>📚 Learning Resources</h4>'
  );
  
  // Close learning resources div if it was opened
  if (formatted.includes('<div class="learning-resources">')) {
    formatted = formatted.replace(
      /(<div class="learning-resources">[\s\S]*?)(<br><br>|$)/,
      '$1</div>$2'
    );
  }
  
  return formatted;
}

// Function to copy code to clipboard
function copyCodeToClipboard(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code').textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = 'rgba(40, 167, 69, 0.4)';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '';
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy code:', err);
    button.textContent = 'Copy failed';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  });
}

// Typing animation for AI messages
function typeMessage(text, element, speed = 20) {
  let i = 0;
  element.classList.add("typing-cursor");

  function typeNext() {
    if (i < text.length) {
      const formattedText = formatBotMessage(text.substring(0, i + 1));
      element.innerHTML = formattedText;

      // Add copy button when typing is complete
      if (i === text.length - 1) {
        addCopyButton(element, formattedText);

        // Render LaTeX after typing is complete
        if (window.MathJax) {
          MathJax.typesetPromise([element]).catch((err) =>
            console.error("MathJax error:", err),
          );
        }
      }

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
    math: [
      "equation",
      "algebra",
      "calculus",
      "geometry",
      "questions",
      "mathematics",
      "solve",
      "formula",
      "theorem",
      "statistics",
      "arithmetic",
      "integration",
      "differentiation",
      "numbers",
    ],
    writing: [
      "essay",
      "paragraph",
      "thesis",
      "writing",
      "grammar",
      "structure",
      "narrative",
      "persuasive",
      "argumentative",
      "style",
      "syntax",
      "composition",
    ],
    science: [
      "chemistry",
      "physics",
      "biology",
      "experiment",
      "scientific",
      "hypothesis",
      "observation",
      "analysis",
      "theory",
      "research",
      "evidence",
    ],
    history: [
      "history",
      "historical",
      "timeline",
      "war",
      "civilization",
      "ancient",
      "modern",
      "events",
      "politics",
      "culture",
      "society",
    ],
    programming: [
      "code",
      "programming",
      "function",
      "variable",
      "algorithm",
      "debug",
      "software",
      "logic",
      "syntax",
      "computer",
      "development",
    ],
    english: [
      "literature",
      "poetry",
      "novel",
      "shakespeare",
      "analysis",
      "interpretation",
      "language",
      "words",
      "reading",
      "writing",
      "text",
    ],
  };

  Object.keys(topics).forEach((topic) => {
    if (
      topics[topic].some((keyword) => message.toLowerCase().includes(keyword))
    ) {
      struggledTopics[topic] = (struggledTopics[topic] || 0) + 1;
    }
  });

  const totalStruggles = Object.values(struggledTopics).reduce(
    (a, b) => a + b,
    0,
  );
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

  // Study streak display
  const streakDiv = document.createElement("div");
  streakDiv.innerHTML = `🔥 Streak: ${studyStreak.current} days (Best: ${studyStreak.best})`;
  streakDiv.style.cssText =
    "margin-bottom: 8px; padding: 4px; background: rgba(255,140,0,0.2); border-radius: 4px; font-weight: bold;";
  struggleList.appendChild(streakDiv);

  // Achievement count
  const achievementCount =
    Object.values(userAchievements).filter(Boolean).length;
  const totalAchievements = Object.keys(achievements).length;
  const achievementDiv = document.createElement("div");
  achievementDiv.innerHTML = `🏆 Achievements: ${achievementCount}/${totalAchievements}`;
  achievementDiv.style.cssText =
    "margin-bottom: 8px; padding: 4px; background: rgba(255,215,0,0.2); border-radius: 4px; cursor: pointer;";
  achievementDiv.title = "Click to view achievements";
  achievementDiv.addEventListener("click", showAchievementModal);
  struggleList.appendChild(achievementDiv);

  // Topics studied
  Object.entries(struggledTopics).forEach(([topic, count]) => {
    const div = document.createElement("div");
    div.innerHTML = `${topic}: ${"⭐".repeat(Math.min(count, 5))} (${count})`;
    div.style.marginBottom = "4px";
    struggleList.appendChild(div);
  });
}

function showAchievementModal() {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const content = document.createElement("div");
  content.style.cssText = `
    background: var(--bg-secondary);
    border-radius: 16px;
    padding: 24px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    border: 1px solid var(--border-color);
  `;

  let achievementHTML =
    '<h2 style="margin-bottom: 16px; color: var(--text-primary);">🏆 Your Achievements</h2>';

  Object.entries(achievements).forEach(([id, achievement]) => {
    const unlocked = userAchievements[id];
    achievementHTML += `
      <div style="display: flex; align-items: center; padding: 8px; margin: 8px 0; border-radius: 8px; background: ${unlocked ? "rgba(255,215,0,0.1)" : "rgba(128,128,128,0.1)"}; ${unlocked ? "" : "opacity: 0.5;"}">
        <span style="font-size: 24px; margin-right: 12px;">${achievement.icon}</span>
        <div>
          <div style="font-weight: bold; color: var(--text-primary);">${achievement.name} ${unlocked ? "✅" : "🔒"}</div>
          <div style="font-size: 12px; color: var(--text-muted);">${achievement.description}</div>
        </div>
      </div>
    `;
  });

  achievementHTML +=
    '<button onclick="this.closest(\'.achievement-modal\').remove()" style="margin-top: 16px; padding: 8px 16px; background: var(--primary-color); color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>';

  content.innerHTML = achievementHTML;
  modal.className = "achievement-modal";
  modal.appendChild(content);
  document.body.appendChild(modal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Enhanced study plan system with time-based customization
function offerStudyPlan() {
  const mostStruggledTopic = Object.keys(struggledTopics).reduce((a, b) =>
    struggledTopics[a] > struggledTopics[b] ? a : b,
  );

  if (
    confirm(
      `I notice you've been working on ${mostStruggledTopic} concepts. Would you like me to create a personalized study plan for you?`,
    )
  ) {
    // Ask for study duration
    const studyDays = prompt(
      "How many days do you have to study this topic? (Enter a number between 1-365)",
      "30",
    );
    const days = parseInt(studyDays) || 30;

    const studyPlanMessage = {
      role: "bot",
      text: generateCustomStudyPlan(mostStruggledTopic, days),
    };

    chats[currentChatId].messages.push(studyPlanMessage);
    saveLocal();
    renderChat();
  }
}

// Generate custom study plan based on topic and duration
function generateCustomStudyPlan(topic, days) {
  let plan = `Great! I'll create a personalized ${days}-day study plan for ${topic}.\n\n`;
  plan += `**📚 Your ${days}-Day ${topic.toUpperCase()} Study Plan:**\n\n`;

  if (days <= 7) {
    // Intensive short-term plan
    plan += `**Intensive ${days}-Day Plan:**\n`;
    plan += `**Days 1-2: Foundation Crash Course** (2-3 hrs/day)\n`;
    plan += `• Master core concepts and terminology\n`;
    plan += `• Complete basic practice problems\n`;
    plan += `• Create summary notes and flashcards\n\n`;

    plan += `**Days 3-4: Application & Practice** (2-3 hrs/day)\n`;
    plan += `• Work through intermediate problems\n`;
    plan += `• Apply concepts to real examples\n`;
    plan += `• Take practice quizzes\n\n`;

    plan += `**Days 5-${days}: Mastery & Review** (1-2 hrs/day)\n`;
    plan += `• Solve challenging problems\n`;
    plan += `• Review weak areas\n`;
    plan += `• Do final practice tests\n\n`;
  } else if (days <= 30) {
    // Standard monthly plan
    const phase1 = Math.ceil(days * 0.4);
    const phase2 = Math.ceil(days * 0.4);
    const phase3 = days - phase1 - phase2;

    plan += `**Phase 1: Foundation (Days 1-${phase1})** - 45-60 min/day\n`;
    plan += `• Study basic concepts (20 min)\n`;
    plan += `• Practice simple problems (25 min)\n`;
    plan += `• Review and note-taking (15 min)\n\n`;

    plan += `**Phase 2: Application (Days ${phase1 + 1}-${phase1 + phase2})** - 60-75 min/day\n`;
    plan += `• Work on intermediate problems (30 min)\n`;
    plan += `• Connect theory to practice (25 min)\n`;
    plan += `• Self-assessment quizzes (20 min)\n\n`;

    plan += `**Phase 3: Mastery (Days ${phase1 + phase2 + 1}-${days})** - 45-60 min/day\n`;
    plan += `• Tackle advanced problems (25 min)\n`;
    plan += `• Review weak areas (20 min)\n`;
    plan += `• Teach concepts back to me (15 min)\n\n`;
  } else {
    // Long-term comprehensive plan
    const weeks = Math.ceil(days / 7);
    plan += `**Long-term ${weeks}-Week Plan:**\n\n`;

    plan += `**Weeks 1-2: Foundation Building** (30-45 min/day)\n`;
    plan += `• Master fundamental concepts\n`;
    plan += `• Build vocabulary and terminology\n`;
    plan += `• Create comprehensive notes\n\n`;

    plan += `**Weeks 3-4: Skill Development** (45-60 min/day)\n`;
    plan += `• Practice problem-solving techniques\n`;
    plan += `• Work through examples step-by-step\n`;
    plan += `• Start connecting concepts\n\n`;

    plan += `**Weeks 5-6: Application & Practice** (60 min/day)\n`;
    plan += `• Apply knowledge to complex problems\n`;
    plan += `• Work on real-world examples\n`;
    plan += `• Take regular practice tests\n\n`;

    plan += `**Final Weeks: Mastery & Review** (45 min/day)\n`;
    plan += `• Focus on weak areas\n`;
    plan += `• Intensive practice and review\n`;
    plan += `• Teach concepts to reinforce learning\n\n`;
  }

  // Add daily tracking suggestions
  plan += `**📊 Daily Progress Tracking:**\n`;
  plan += `• Rate your understanding (1-10) each day\n`;
  plan += `• Track time spent studying\n`;
  plan += `• Note areas that need more attention\n`;
  plan += `• Celebrate daily achievements! 🎉\n\n`;

  // Add topic-specific resources
  plan += `**🎯 ${topic.charAt(0).toUpperCase() + topic.slice(1)}-Specific Tips:**\n`;

  const topicTips = {
    math: [
      "Practice problems daily - consistency is key",
      "Show your work step-by-step",
      "Use visual aids like graphs and diagrams",
      "Teach formulas by explaining when to use them",
    ],
    writing: [
      "Read examples of good writing daily",
      "Practice different essay structures",
      "Focus on clarity and organization",
      "Get feedback on your writing",
    ],
    science: [
      "Connect concepts to real-world examples",
      "Use diagrams and visual representations",
      "Practice explaining concepts simply",
      "Do hands-on experiments when possible",
    ],
    history: [
      "Create timelines and visual maps",
      "Connect events to their broader context",
      "Practice analyzing primary sources",
      "Discuss different historical perspectives",
    ],
    programming: [
      "Code daily, even if just for 15 minutes",
      "Break down complex problems into smaller parts",
      "Debug code step-by-step",
      "Build small projects to apply concepts",
    ],
  };

  if (topicTips[topic]) {
    topicTips[topic].forEach((tip) => {
      plan += `• ${tip}\n`;
    });
  } else {
    plan += `• Break complex topics into smaller parts\n`;
    plan += `• Practice active recall and spaced repetition\n`;
    plan += `• Connect new knowledge to what you already know\n`;
    plan += `• Test yourself regularly\n`;
  }

  plan += `\n**Ready to start? Type "Day 1" and I'll give you your first lesson!**`;

  return plan;
}

// --- Enhanced File Reading Functions ---

async function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const content = e.target.result;

      // Handle different file types
      if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
        resolve(content);
      } else if (file.type === "application/pdf") {
        // Enhanced PDF handling - provide file info and ask for description
        const fileSize = (file.size / 1024).toFixed(2);
        resolve(`[PDF Document: ${file.name} (${fileSize} KB)]
File uploaded successfully. I can help you with PDF content analysis, but I'll need you to describe the key content or paste specific text sections you'd like help with.

What would you like me to help you with regarding this PDF?
- Summarize specific sections
- Explain concepts mentioned
- Create study materials
- Answer questions about the content`);
      } else if (file.type.startsWith("image/")) {
        // Enhanced image handling
        const fileSize = (file.size / 1024).toFixed(2);
        resolve(`[Image File: ${file.name} (${fileSize} KB)]
Image uploaded successfully! I can help you with:
- Analyzing diagrams, charts, or graphs (describe what you see)
- Explaining mathematical equations in images
- Interpreting scientific illustrations
- Creating study notes from visual content

Please describe what's in the image or what specific help you need with it.`);
      } else if (file.type.startsWith("audio/")) {
        // Audio file handling
        const fileSize = (file.size / 1024).toFixed(2);
        const duration = file.duration
          ? `${Math.round(file.duration)}s`
          : "unknown duration";
        resolve(`[Audio File: ${file.name} (${fileSize} KB, ${duration})]
Audio file uploaded! I can help you with:
- Creating transcripts (please provide the audio content)
- Analyzing lecture recordings (describe the main topics)
- Study material from audio lessons
- Note-taking strategies for audio content

What type of audio content is this, and how can I help you study from it?`);
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword" ||
        file.name.endsWith(".docx") ||
        file.name.endsWith(".doc")
      ) {
        // Word document handling
        const fileSize = (file.size / 1024).toFixed(2);
        resolve(`[Word Document: ${file.name} (${fileSize} KB)]
Word document uploaded! I can help you with:
- Document analysis and summarization
- Essay feedback and improvement suggestions
- Research paper organization
- Citation and formatting guidance

Please copy and paste the text content you'd like me to review, or describe what type of help you need.`);
      } else if (
        file.type ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        file.type === "application/vnd.ms-powerpoint" ||
        file.name.endsWith(".pptx") ||
        file.name.endsWith(".ppt")
      ) {
        // PowerPoint handling
        const fileSize = (file.size / 1024).toFixed(2);
        resolve(`[PowerPoint Presentation: ${file.name} (${fileSize} KB)]
Presentation uploaded! I can help you with:
- Creating study notes from slides
- Explaining complex concepts from presentations
- Preparing for exams based on lecture slides
- Organizing information from presentations

Please describe the presentation content or paste specific text/concepts you need help with.`);
      } else if (file.name.endsWith(".csv") || file.type === "text/csv") {
        // CSV file handling - try to read as text
        reader.readAsText(file);
        return;
      } else if (
        file.name.endsWith(".json") ||
        file.type === "application/json"
      ) {
        // JSON file handling
        try {
          const jsonData = JSON.parse(content);
          resolve(`[JSON Data File: ${file.name}]
JSON file content:
\`\`\`json
${JSON.stringify(jsonData, null, 2)}
\`\`\`

I can help you understand this data structure, analyze the content, or use it for learning purposes.`);
        } catch (e) {
          resolve(
            `[JSON File: ${file.name}] - File appears to be JSON but couldn't parse. Please paste the content you'd like help with.`,
          );
        }
        return;
      } else if (file.type.startsWith("video/")) {
        // Video file handling
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        resolve(`[Video File: ${file.name} (${fileSize} MB)]
Video uploaded! I can help you with:
- Creating study notes from educational videos
- Explaining concepts from video lectures
- Summarizing video content
- Building study materials from visual learning

Please describe the video content or key concepts you'd like help understanding.`);
      } else {
        // Try to read as text for unknown types
        resolve(
          content ||
            `[File: ${file.name}] - Please describe the content of this file or paste the text you'd like help with.`,
        );
      }
    };

    reader.onerror = function () {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    // Read strategy based on file type
    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".txt") ||
      file.name.endsWith(".js") ||
      file.name.endsWith(".html") ||
      file.name.endsWith(".css") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".py") ||
      file.name.endsWith(".java") ||
      file.name.endsWith(".cpp") ||
      file.name.endsWith(".c") ||
      file.name.endsWith(".md")
    ) {
      reader.readAsText(file);
    } else {
      // For binary files, still try to read as text to get file info
      reader.readAsText(file);
    }
  });
}

// --- Build conversation context for AI ---

function buildConversationContext() {
  if (!currentChatId || !chats[currentChatId]) return "";

  const messages = chats[currentChatId].messages || [];
  const contextMessages = messages.slice(-10); // Get last 10 messages for context

  let context = "\n\nPrevious conversation context:\n";
  contextMessages.forEach((msg, index) => {
    if (!msg.isTyping) {
      context += `${msg.role === "user" ? "Student" : "Tutor"}: ${msg.text}\n`;
    }
  });

  return context;
}

// --- Enhanced Rich Media Processing ---
async function processRichMediaContent(userMessage, aiResponse) {
  try {
    // Generate rich media content based on user query
    if (window.externalAPIs) {
      const richContent = await window.externalAPIs.generateRichContent(userMessage);
      if (richContent) {
        return aiResponse + '\n\n' + richContent;
      }
    }
    return aiResponse;
  } catch (error) {
    console.warn('Rich media processing error:', error);
    return aiResponse;
  }
}

// --- AI messaging ---

async function sendMessageToAI(userMessage, fileContent = null) {
  const startTime = Date.now();
  
  // Track analytics for message
  if (window.userAnalytics) {
    window.userAnalytics.trackChatMessage({
      text: userMessage,
      hasFile: !!fileContent,
      role: 'user'
    });
  }

  // Build conversation context
  const conversationContext = buildConversationContext();

  // Include file content if provided
  let fullMessage = userMessage;
  if (fileContent) {
    fullMessage += `\n\nAttached file content:\n${fileContent}`;
  }

  // Get current language setting
  const currentLanguage = window.settingsManager
    ? window.settingsManager.getSettings().language
    : "en";

  const languageInstructions = {
    en: "Respond in English",
    es: "Responde en español",
    fr: "Répondez en français",
    de: "Antworten Sie auf Deutsch",
    it: "Rispondi in italiano",
    pt: "Responda em português",
    ru: "Отвечайте на русском языке",
    zh: "用中文回答",
    ja: "日本語で答えてください",
    ko: "한국어로 답변해주세요",
    ar: "أجب باللغة العربية",
    hi: "हिंदी में उत्तर दें",
  };

  const tutorPrompt = `You are an expert tutor specializing in personalized learning. ${languageInstructions[currentLanguage] || "Respond in English"}.

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
10. If user asks to code something, do it, but add explanations and comments to the code.
11. Be supportive, only a growth mindset is allowed here.
12. **ALWAYS include relevant learning resources** at the end of responses when appropriate (also, make sure to format properly):
    - [Khan Academy](https://www.khanacademy.org) links for math/science concepts
    - [Coursera](https://www.coursera.org)/[edX](https://www.edx.org) courses for deeper learning
    - [YouTube](https://www.youtube.com) educational channels
    - Free textbooks and reference materials
    - Interactive learning tools and simulators

Format academic responses with:
- Clear step-by-step breakdowns
- Guiding questions in **bold**
- Hints in *italics*
- For code responses, use code blocks, when writing the code, with comments
- Key concepts in ALL CAPS when first introduced
- ALWAYS use LaTeX format for ALL math equations (inline: $equation$ or display: $$equation$$)
- Examples: $x^2 + 3x - 4 = 0$, $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$, $\\sin(\\theta) = \\frac{opposite}{hypotenuse}$
- **📚 Learning Resources section** with clickable links when helpful
- Make all external links clickable with proper [link text](URL) format

Remember: Your goal is understanding, not just answers. Use the previous conversation context to provide continuity and reference earlier discussions when relevant. Also, if the user asks for a detailed report on a file that you are provided, give them the detailed report back.

${conversationContext}

Current message: ${fullMessage}
Tutor:`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
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
      },
    );

    const data = await response.json();

    if (data.error) {
      console.error("OpenRouter error:", data.error);
      return "Sorry, I had trouble understanding that. Please try again.";
    }

    let aiResponse = data.choices?.[0]?.message?.content || "Sorry, I did not get that.";
    
    // Process rich media content
    aiResponse = await processRichMediaContent(userMessage, aiResponse);
    
    // Track response analytics
    const responseTime = Date.now() - startTime;
    if (window.userAnalytics) {
      window.userAnalytics.trackChatMessage({
        text: aiResponse,
        role: 'bot',
        responseTime
      });
    }
    
    return aiResponse;
  } catch (e) {
    console.error("Error fetching AI response:", e);
    return "Sorry, something went wrong while contacting the AI.";
  }
}
