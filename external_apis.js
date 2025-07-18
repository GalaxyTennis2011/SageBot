
// External APIs Module for Rich Media Content
class ExternalAPIs {
  constructor() {
    this.apiKeys = {
      // Add your API keys here - these are examples
      weather: 'ff267de0545b6b7ce5b7d65d433179b4', // OpenWeatherMap
      news: '8307472fc8f147c3822f5105a1f4f389', // NewsAPI
      youtube: 'AIzaSyBT6mriWSNcPfRIi-6xkpKHmqHY5NxMCXs', // YouTube Data API
      unsplash: 'usfR7T-8xPTM2PjLaSxmBdYizsWQfRC7L5Q8KZLIDfA' // Unsplash
    };
  }

  // Weather information
  async getWeatherInfo(city = 'London') {
    try {
      // Using a free weather service (no API key required for demo)
      const response = await fetch(`https://wttr.in/${city}?format=j1`);
      const data = await response.json();
      
      const current = data.current_condition[0];
      const weather = data.weather[0];
      
      return {
        location: city,
        temperature: current.temp_C,
        description: current.weatherDesc[0].value,
        humidity: current.humidity,
        windSpeed: current.windspeedKmph,
        icon: this.getWeatherIcon(current.weatherCode)
      };
    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  }

  getWeatherIcon(code) {
    const iconMap = {
      '113': '☀️', // Clear/Sunny
      '116': '⛅', // Partly cloudy
      '119': '☁️', // Cloudy
      '122': '☁️', // Overcast
      '143': '🌫️', // Mist
      '176': '🌦️', // Patchy rain possible
      '179': '🌨️', // Patchy snow possible
      '200': '⛈️', // Thundery outbreaks possible
      '227': '❄️', // Blowing snow
      '230': '❄️', // Blizzard
      '248': '🌫️', // Fog
      '260': '🌫️', // Freezing fog
      '263': '🌦️', // Patchy light drizzle
      '266': '🌧️', // Light drizzle
      '281': '🌧️', // Freezing drizzle
      '284': '🌧️', // Heavy freezing drizzle
      '293': '🌦️', // Patchy light rain
      '296': '🌧️', // Light rain
      '299': '🌧️', // Moderate rain at times
      '302': '🌧️', // Moderate rain
      '305': '🌧️', // Heavy rain at times
      '308': '🌧️', // Heavy rain
      '311': '🌧️', // Light freezing rain
      '314': '🌧️', // Moderate or heavy freezing rain
      '317': '🌧️', // Light sleet
      '320': '🌧️', // Moderate or heavy sleet
      '323': '🌨️', // Patchy light snow
      '326': '🌨️', // Light snow
      '329': '🌨️', // Patchy moderate snow
      '332': '❄️', // Moderate snow
      '335': '❄️', // Patchy heavy snow
      '338': '❄️', // Heavy snow
      '350': '🌧️', // Ice pellets
      '353': '🌦️', // Light rain shower
      '356': '🌧️', // Moderate or heavy rain shower
      '359': '🌧️', // Torrential rain shower
      '362': '🌨️', // Light sleet showers
      '365': '🌨️', // Moderate or heavy sleet showers
      '368': '🌨️', // Light snow showers
      '371': '❄️', // Moderate or heavy snow showers
      '374': '🌧️', // Light showers of ice pellets
      '377': '🌧️', // Moderate or heavy showers of ice pellets
      '386': '⛈️', // Patchy light rain with thunder
      '389': '⛈️', // Moderate or heavy rain with thunder
      '392': '⛈️', // Patchy light snow with thunder
      '395': '⛈️'  // Moderate or heavy snow with thunder
    };
    
    return iconMap[code] || '🌤️';
  }

  // News articles
  async getNewsArticles(topic = 'technology', limit = 3) {
    try {
      // Using a free news service (NewsAPI alternative)
      const response = await fetch(`https://newsapi.org/v2/everything?q=${topic}&pageSize=${limit}&apiKey=demo`);
      
      if (!response.ok) {
        // Fallback to mock data for demo
        return this.getMockNews(topic, limit);
      }
      
      const data = await response.json();
      return data.articles?.slice(0, limit) || this.getMockNews(topic, limit);
    } catch (error) {
      console.error('News API error:', error);
      return this.getMockNews(topic, limit);
    }
  }

  getMockNews(topic, limit) {
    const mockArticles = [
      {
        title: `Latest ${topic} developments`,
        description: `Recent advances in ${topic} are reshaping the industry...`,
        url: '#',
        urlToImage: 'https://via.placeholder.com/300x200?text=News',
        publishedAt: new Date().toISOString(),
        source: { name: 'Tech News' }
      },
      {
        title: `${topic} trends to watch`,
        description: `Industry experts predict significant changes in ${topic}...`,
        url: '#',
        urlToImage: 'https://via.placeholder.com/300x200?text=Trends',
        publishedAt: new Date().toISOString(),
        source: { name: 'Industry Today' }
      },
      {
        title: `Innovation in ${topic}`,
        description: `Breakthrough innovations are driving ${topic} forward...`,
        url: '#',
        urlToImage: 'https://via.placeholder.com/300x200?text=Innovation',
        publishedAt: new Date().toISOString(),
        source: { name: 'Innovation Weekly' }
      }
    ];
    
    return mockArticles.slice(0, limit);
  }

  // Educational videos (YouTube search)
  async getEducationalVideos(query, limit = 3) {
    try {
      // Mock educational videos for demo (replace with actual YouTube API)
      // Generate topic-specific educational video IDs
      const topicVideoIds = {
        programming: ['_OlhveQCx7M', 'PkZNo7MFNFg', 'JR9WfAkdJKI'], // Programming tutorials
        javascript: ['W6NZfCO5SIk', 'PkZNo7MFNFg', 'hdI2bqOjy3c'], // JavaScript tutorials
        python: ['_uQrJ0TkZlc', 'rfscVS0vtbw', 'kqtD5dpn9C8'], // Python tutorials
        math: ['9rIy0xY99a0', 'WUvTyaaNkzM', 'fNk_zzaMoSs'], // Math tutorials
        science: ['IhsXrjdiMaA', 'C1kK3nx5XIg', 'AuylQllZW18'], // Science tutorials
        physics: ['ZM8ECpBuQYE', '_WHRWLnVm_M', 'IhsXrjdiMaA'], // Physics tutorials
        chemistry: ['dM_R4OvJAFs', 'Rd4a1X3B61w', 'C1kK3nx5XIg'], // Chemistry tutorials
        biology: ['QnQe0xW_JY4', 'AuylQllZW18', 'hf1KLh3d1oE'], // Biology tutorials
        history: ['xuCn8ux2gbs', 'BEhemOTCzIE', 'J5iJSXaVvao'], // History tutorials
        english: ['9fyf6MQmJe0', 'mBXKDqq-6rU', 'rWwqpQdYEQc'], // English/Literature
        writing: ['mBXKDqq-6rU', '9fyf6MQmJe0', 'kJzux3V2uPs'] // Writing tutorials
      };

      // Find matching topic or use programming as default
      const queryLower = query.toLowerCase();
      let videoIds = topicVideoIds.programming; // default
      
      for (const [topic, ids] of Object.entries(topicVideoIds)) {
        if (queryLower.includes(topic) || topic.includes(queryLower)) {
          videoIds = ids;
          break;
        }
      }

      const mockVideos = [
        {
          id: { videoId: videoIds[0] },
          snippet: {
            title: `Learn ${query} - Complete Tutorial`,
            description: `Comprehensive tutorial covering ${query} fundamentals and advanced concepts.`,
            thumbnails: {
              medium: { url: 'https://via.placeholder.com/320x180?text=Tutorial' }
            },
            channelTitle: 'EduChannel',
            publishedAt: new Date().toISOString()
          }
        },
        {
          id: { videoId: videoIds[1] },
          snippet: {
            title: `${query} Explained Simply`,
            description: `Easy-to-understand explanation of ${query} concepts for beginners.`,
            thumbnails: {
              medium: { url: 'https://via.placeholder.com/320x180?text=Explained' }
            },
            channelTitle: 'SimpleLearn',
            publishedAt: new Date().toISOString()
          }
        },
        {
          id: { videoId: videoIds[2] },
          snippet: {
            title: `Advanced ${query} Techniques`,
            description: `Master advanced ${query} techniques with this in-depth guide.`,
            thumbnails: {
              medium: { url: 'https://via.placeholder.com/320x180?text=Advanced' }
            },
            channelTitle: 'ProCoder',
            publishedAt: new Date().toISOString()
          }
        }
      ];
      
      return mockVideos.slice(0, limit);
    } catch (error) {
      console.error('Video API error:', error);
      return [];
    }
  }

  // Generate rich media content based on query
  async generateRichContent(userMessage, messageType = 'general') {
    let richContent = '';
    
    // Detect content type from message
    if (this.isWeatherQuery(userMessage)) {
      const city = this.extractCityFromMessage(userMessage);
      const weather = await this.getWeatherInfo(city);
      if (weather) {
        richContent += this.formatWeatherWidget(weather);
      }
    }
    
    if (this.isNewsQuery(userMessage)) {
      const topic = this.extractTopicFromMessage(userMessage);
      const news = await this.getNewsArticles(topic, 2);
      richContent += this.formatNewsItems(news);
    }
    
    if (this.isLearningQuery(userMessage)) {
      const topic = this.extractLearningTopic(userMessage);
      const videos = await this.getEducationalVideos(topic, 2);
      richContent += this.formatEducationalVideos(videos);
    }
    
    return richContent;
  }

  // Helper methods for content detection
  isWeatherQuery(message) {
    const weatherKeywords = ['weather', 'temperature', 'forecast', 'climate', 'rain', 'sunny', 'cloudy'];
    return weatherKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isNewsQuery(message) {
    const newsKeywords = ['news', 'latest', 'current events', 'headlines', 'breaking'];
    return newsKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  isLearningQuery(message) {
    const learningKeywords = ['learn', 'tutorial', 'how to', 'explain', 'teach', 'lesson', 'guide'];
    return learningKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  extractCityFromMessage(message) {
    // Simple city extraction - can be enhanced with NLP
    const words = message.split(' ');
    const prepositions = ['in', 'at', 'for'];
    for (let i = 0; i < words.length; i++) {
      if (prepositions.includes(words[i].toLowerCase()) && words[i + 1]) {
        return words[i + 1].replace(/[.,!?]/g, '');
      }
    }
    return 'London'; // Default
  }

  extractTopicFromMessage(message) {
    // Extract topic after "news about" or similar patterns
    const patterns = [/news about (\w+)/i, /latest (\w+)/i, /(\w+) news/i];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }
    return 'technology'; // Default
  }

  extractLearningTopic(message) {
    // Extract learning topic
    const patterns = [/learn (\w+)/i, /how to (\w+)/i, /explain (\w+)/i, /teach me (\w+)/i];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }
    return 'programming'; // Default
  }

  // Formatting methods
  formatWeatherWidget(weather) {
    return `
      <div class="weather-widget">
        <div class="weather-main">
          <span class="weather-icon">${weather.icon}</span>
          <div class="temperature">${weather.temperature}°C</div>
          <div class="description">${weather.description}</div>
        </div>
        <div class="weather-details">
          <span>📍 ${weather.location}</span>
          <span>💧 ${weather.humidity}%</span>
          <span>💨 ${weather.windSpeed} km/h</span>
        </div>
      </div>
    `;
  }

  formatNewsItems(articles) {
    if (!articles || articles.length === 0) return '';
    
    let newsHTML = '<div class="news-section"><h4>📰 Related News</h4>';
    articles.forEach(article => {
      newsHTML += `
        <div class="news-item">
          <h4><a href="${article.url}" target="_blank" rel="noopener">${article.title}</a></h4>
          <p>${article.description}</p>
          <small>Source: ${article.source.name} | ${new Date(article.publishedAt).toLocaleDateString()}</small>
        </div>
      `;
    });
    newsHTML += '</div>';
    return newsHTML;
  }

  formatEducationalVideos(videos) {
    if (!videos || videos.length === 0) return '';
    
    let videosHTML = '<div class="videos-section"><h4>🎥 Educational Videos</h4>';
    videos.forEach(video => {
      const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
      videosHTML += `
        <div class="media-item">
          <img src="${video.snippet.thumbnails.medium.url}" alt="Video thumbnail" class="video-thumbnail">
          <div class="media-content">
            <h4><a href="${videoUrl}" target="_blank" rel="noopener">${video.snippet.title}</a></h4>
            <p>${video.snippet.description}</p>
            <small>Channel: ${video.snippet.channelTitle}</small>
          </div>
        </div>
      `;
    });
    videosHTML += '</div>';
    return videosHTML;
  }
}

// Initialize External APIs
window.externalAPIs = new ExternalAPIs();
