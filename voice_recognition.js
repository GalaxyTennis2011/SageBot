
// Voice Recognition Module using Web Speech API
class VoiceRecognition {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.init();
  }

  init() {
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      // Configure recognition settings
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.setupEventListeners();
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  setupEventListeners() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceButton(true);
      console.log('Voice recognition started');
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log('Voice input received:', transcript, 'Confidence:', confidence);
      
      // Insert transcript into user input
      const userInput = document.getElementById('user-input');
      if (userInput) {
        userInput.value = transcript;
        userInput.focus();
        
        // Optionally auto-submit if confidence is high
        if (confidence > 0.8) {
          const chatForm = document.getElementById('chat-form');
          if (chatForm) {
            setTimeout(() => {
              chatForm.dispatchEvent(new Event('submit'));
            }, 500);
          }
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      this.updateVoiceButton(false);
      this.isListening = false;
      
      // Show user-friendly error messages
      const errorMessages = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'No microphone found. Please check your microphone.',
        'not-allowed': 'Microphone access denied. Please allow microphone access.',
        'network': 'Network error. Please check your connection.'
      };
      
      const message = errorMessages[event.error] || 'Voice recognition error. Please try again.';
      if (window.showNotification) {
        window.showNotification(message);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceButton(false);
      console.log('Voice recognition ended');
    };
  }

  startListening() {
    if (!this.recognition) {
      if (window.showNotification) {
        window.showNotification('Voice recognition not supported in this browser');
      }
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      if (window.showNotification) {
        window.showNotification('Error starting voice recognition');
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  updateVoiceButton(isListening) {
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
      if (isListening) {
        voiceBtn.classList.add('listening');
        voiceBtn.innerHTML = '🔴';
        voiceBtn.title = 'Stop listening';
      } else {
        voiceBtn.classList.remove('listening');
        voiceBtn.innerHTML = '🎤';
        voiceBtn.title = 'Voice input';
      }
    }
  }

  // Change language dynamically
  setLanguage(languageCode) {
    if (this.recognition) {
      this.recognition.lang = languageCode;
    }
  }
}

// Initialize voice recognition when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const voiceRecognition = new VoiceRecognition();
  
  // Add click event listener to voice button
  const voiceBtn = document.getElementById('voice-btn');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      voiceRecognition.startListening();
    });
  }

  // Make voice recognition available globally
  window.voiceRecognition = voiceRecognition;
});

// Update language when settings change
document.addEventListener('settingsChanged', function(event) {
  if (event.detail && event.detail.language && window.voiceRecognition) {
    const languageMap = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'it': 'it-IT',
      'pt': 'pt-BR',
      'ru': 'ru-RU',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };
    
    const speechLang = languageMap[event.detail.language] || 'en-US';
    window.voiceRecognition.setLanguage(speechLang);
  }
});
