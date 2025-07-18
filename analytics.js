
// User Analytics and Tracking Module
class UserAnalytics {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = null;
    this.events = [];
    this.sessionStart = Date.now();
    this.lastActivity = Date.now();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startSessionTracking();
    console.log('Analytics initialized with session ID:', this.sessionId);
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  setUserId(userId) {
    this.userId = userId;
    this.trackEvent('user_login', { userId });
  }

  setupEventListeners() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden');
      } else {
        this.trackEvent('page_visible');
        this.lastActivity = Date.now();
      }
    });

    // Track user interactions
    document.addEventListener('click', (e) => {
      this.trackUserInteraction('click', e.target);
    });

    document.addEventListener('keydown', (e) => {
      this.lastActivity = Date.now();
      if (e.key === 'Enter' && e.target.id === 'user-input') {
        this.trackEvent('message_sent_keyboard');
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'chat-form') {
        this.trackEvent('message_sent_form');
      }
    });

    // Track voice interactions
    document.addEventListener('click', (e) => {
      if (e.target.id === 'voice-btn') {
        this.trackEvent('voice_button_clicked');
      }
    });
  }

  trackUserInteraction(type, element) {
    this.lastActivity = Date.now();
    
    const eventData = {
      type,
      elementId: element.id,
      elementClass: element.className,
      tagName: element.tagName,
      timestamp: Date.now()
    };

    // Track specific interactions
    if (element.classList.contains('auth-button')) {
      this.trackEvent('auth_interaction', eventData);
    } else if (element.classList.contains('settings-btn')) {
      this.trackEvent('settings_opened', eventData);
    } else if (element.classList.contains('chat-message')) {
      this.trackEvent('message_interaction', eventData);
    } else if (element.classList.contains('copy-button')) {
      this.trackEvent('copy_button_clicked', eventData);
    } else if (element.classList.contains('edit-button')) {
      this.trackEvent('edit_button_clicked', eventData);
    }
  }

  trackEvent(eventName, data = {}) {
    const event = {
      eventName,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...data
    };

    this.events.push(event);
    console.log('Event tracked:', eventName, data);

    // Store in localStorage for persistence
    this.saveEventsToStorage();

    // Send to analytics service (implement based on your needs)
    this.sendToAnalyticsService(event);
  }

  trackPageView(page = window.location.pathname) {
    this.trackEvent('page_view', {
      page,
      referrer: document.referrer,
      title: document.title
    });
  }

  trackChatMessage(messageData) {
    this.trackEvent('chat_message', {
      messageLength: messageData.text?.length || 0,
      hasFile: !!messageData.hasFile,
      role: messageData.role,
      responseTime: messageData.responseTime,
      topic: this.detectMessageTopic(messageData.text)
    });
  }

  trackUserProgress(progressData) {
    this.trackEvent('user_progress', {
      currentStreak: progressData.currentStreak,
      bestStreak: progressData.bestStreak,
      struggledTopics: Object.keys(progressData.struggledTopics || {}),
      achievementsUnlocked: Object.values(progressData.userAchievements || {}).filter(Boolean).length,
      totalMessages: progressData.totalMessages
    });
  }

  trackPerformance() {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const timing = {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint()
      };

      this.trackEvent('performance_metrics', timing);
    }
  }

  getFirstPaint() {
    const paint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint');
    return paint ? paint.startTime : null;
  }

  getFirstContentfulPaint() {
    const paint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint');
    return paint ? paint.startTime : null;
  }

  detectMessageTopic(message) {
    if (!message) return 'unknown';
    
    const topics = {
      math: ['equation', 'calculate', 'solve', 'algebra', 'geometry', 'calculus'],
      programming: ['code', 'function', 'variable', 'programming', 'javascript', 'python'],
      science: ['chemistry', 'physics', 'biology', 'experiment', 'theory'],
      writing: ['essay', 'paragraph', 'grammar', 'writing', 'composition'],
      general: ['help', 'question', 'explain', 'what', 'how', 'why']
    };

    const messageLower = message.toLowerCase();
    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        return topic;
      }
    }
    
    return 'general';
  }

  startSessionTracking() {
    // Track session duration every 30 seconds
    setInterval(() => {
      const sessionDuration = Date.now() - this.sessionStart;
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      
      // Consider session inactive after 5 minutes of no activity
      if (timeSinceLastActivity < 300000) {
        this.trackEvent('session_heartbeat', {
          sessionDuration,
          timeSinceLastActivity,
          isActive: timeSinceLastActivity < 60000 // Active if activity within last minute
        });
      }
    }, 30000);

    // Track when user leaves the page
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - this.sessionStart;
      this.trackEvent('session_end', {
        sessionDuration,
        totalEvents: this.events.length
      });
    });
  }

  saveEventsToStorage() {
    try {
      // Keep only last 100 events to avoid storage issues
      const recentEvents = this.events.slice(-100);
      localStorage.setItem('analytics_events', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to save analytics events:', error);
    }
  }

  loadEventsFromStorage() {
    try {
      const stored = localStorage.getItem('analytics_events');
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load analytics events:', error);
      this.events = [];
    }
  }

  sendToAnalyticsService(event) {
    // Implement your analytics service integration here
    // Examples: Google Analytics, Mixpanel, Custom API
    
    // For demo purposes, we'll use a mock API call
    if (this.shouldSendEvent(event)) {
      this.queueEventForSending(event);
    }
  }

  shouldSendEvent(event) {
    // Filter which events to send to avoid spam
    const importantEvents = [
      'user_login', 'chat_message', 'user_progress', 'session_end',
      'auth_interaction', 'voice_button_clicked', 'performance_metrics'
    ];
    
    return importantEvents.includes(event.eventName);
  }

  queueEventForSending(event) {
    // Queue events and send in batches to reduce API calls
    if (!this.eventQueue) {
      this.eventQueue = [];
    }
    
    this.eventQueue.push(event);
    
    // Send batch every 10 events or every 5 minutes
    if (this.eventQueue.length >= 10 || !this.sendTimer) {
      this.sendEventBatch();
    }
    
    // Set timer for next batch send
    if (!this.sendTimer) {
      this.sendTimer = setTimeout(() => {
        this.sendEventBatch();
      }, 300000); // 5 minutes
    }
  }

  async sendEventBatch() {
    if (!this.eventQueue || this.eventQueue.length === 0) return;
    
    try {
      // Mock API call - replace with your analytics endpoint
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: this.eventQueue,
          sessionId: this.sessionId,
          userId: this.userId
        })
      });
      
      if (response.ok) {
        console.log(`Sent ${this.eventQueue.length} analytics events`);
        this.eventQueue = [];
      }
    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      // Keep events in queue for retry
    }
    
    // Clear timer
    if (this.sendTimer) {
      clearTimeout(this.sendTimer);
      this.sendTimer = null;
    }
  }

  // Get analytics summary for user
  getAnalyticsSummary() {
    const summary = {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart,
      totalEvents: this.events.length,
      eventTypes: {},
      lastActivity: this.lastActivity,
      isActive: (Date.now() - this.lastActivity) < 60000
    };

    // Count events by type
    this.events.forEach(event => {
      summary.eventTypes[event.eventName] = (summary.eventTypes[event.eventName] || 0) + 1;
    });

    return summary;
  }

  // Export analytics data
  exportAnalyticsData() {
    const data = {
      summary: this.getAnalyticsSummary(),
      events: this.events,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${this.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize analytics
document.addEventListener('DOMContentLoaded', function() {
  window.userAnalytics = new UserAnalytics();
  
  // Track initial page view
  window.userAnalytics.trackPageView();
  
  // Track performance metrics after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      window.userAnalytics.trackPerformance();
    }, 1000);
  });
});
