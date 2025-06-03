import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NewsData {
  title: string;
  content: string;
  sentiment: number; // -1 to 1
  source: string;
  timestamp: number;
  relevantSymbols: string[];
}

export interface EconomicData {
  indicator: string;
  value: number;
  previousValue?: number;
  country: string;
  currency: string;
  timestamp: number;
  impact: 'low' | 'medium' | 'high';
}

export interface SentimentAnalysis {
  symbol: string;
  overallSentiment: number; // -1 to 1
  newsCount: number;
  socialMediaMentions: number;
  fearGreedIndex: number;
  timestamp: number;
}

export class DataCollection {
  private newsApiKey: string | null = null;
  private economicCalendarData: EconomicData[] = [];
  private newsCache: Map<string, NewsData[]> = new Map();
  private sentimentCache: Map<string, SentimentAnalysis> = new Map();

  constructor() {
    this.loadCachedData();
  }

  // Load cached data from storage
  private async loadCachedData(): Promise<void> {
    try {
      const newsData = await AsyncStorage.getItem('cached_news_data');
      const economicData = await AsyncStorage.getItem('cached_economic_data');
      const sentimentData = await AsyncStorage.getItem('cached_sentiment_data');

      if (newsData) {
        const parsed = JSON.parse(newsData);
        this.newsCache = new Map(parsed);
      }

      if (economicData) {
        this.economicCalendarData = JSON.parse(economicData);
      }

      if (sentimentData) {
        const parsed = JSON.parse(sentimentData);
        this.sentimentCache = new Map(parsed);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  // Save data to cache
  private async saveCachedData(): Promise<void> {
    try {
      await AsyncStorage.setItem('cached_news_data', JSON.stringify([...this.newsCache]));
      await AsyncStorage.setItem('cached_economic_data', JSON.stringify(this.economicCalendarData));
      await AsyncStorage.setItem('cached_sentiment_data', JSON.stringify([...this.sentimentCache]));
    } catch (error) {
      console.error('Error saving cached data:', error);
    }
  }

  // Fetch financial news (using free news API)
  public async fetchFinancialNews(symbols: string[]): Promise<NewsData[]> {
    try {
      const allNews: NewsData[] = [];
      
      for (const symbol of symbols) {
        // Check cache first
        const cachedNews = this.newsCache.get(symbol);
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        
        if (cachedNews && cachedNews.some(news => news.timestamp > oneHourAgo)) {
          allNews.push(...cachedNews.filter(news => news.timestamp > oneHourAgo));
          continue;
        }

        // Fetch new data using free news sources
        const newsData = await this.fetchNewsFromFreeSource(symbol);
        this.newsCache.set(symbol, newsData);
        allNews.push(...newsData);
      }

      await this.saveCachedData();
      return allNews;
    } catch (error) {
      console.error('Error fetching financial news:', error);
      return [];
    }
  }

  // Fetch news from free sources (mock implementation)
  private async fetchNewsFromFreeSource(symbol: string): Promise<NewsData[]> {
    try {
      // This would normally call a real news API
      // For demo purposes, we'll generate mock data based on market conditions
      const mockNews: NewsData[] = [
        {
          title: `${symbol} Shows Strong Technical Indicators`,
          content: `Recent analysis shows ${symbol} displaying bullish technical patterns with strong momentum indicators.`,
          sentiment: 0.3,
          source: 'Financial Times',
          timestamp: Date.now(),
          relevantSymbols: [symbol]
        },
        {
          title: `Central Bank Policy Impact on ${symbol}`,
          content: `Latest central bank decisions are expected to have significant impact on ${symbol} trading pairs.`,
          sentiment: -0.1,
          source: 'Reuters',
          timestamp: Date.now() - 30 * 60 * 1000,
          relevantSymbols: [symbol]
        },
        {
          title: `Market Volatility Affects ${symbol} Trading`,
          content: `Increased market volatility has led to heightened trading activity in ${symbol} currency pairs.`,
          sentiment: -0.2,
          source: 'Bloomberg',
          timestamp: Date.now() - 60 * 60 * 1000,
          relevantSymbols: [symbol]
        }
      ];

      return mockNews;
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return [];
    }
  }

  // Simple sentiment analysis using keyword matching
  public analyzeSentiment(text: string): number {
    const positiveWords = [
      'bullish', 'positive', 'growth', 'strong', 'increase', 'rise', 'gains', 
      'optimistic', 'confident', 'rally', 'surge', 'boost', 'upward', 'promising'
    ];
    
    const negativeWords = [
      'bearish', 'negative', 'decline', 'weak', 'decrease', 'fall', 'losses',
      'pessimistic', 'uncertain', 'crash', 'drop', 'concerns', 'downward', 'volatile'
    ];

    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) {
        positiveCount++;
      }
      if (negativeWords.some(nw => word.includes(nw))) {
        negativeCount++;
      }
    }

    const totalSentimentWords = positiveCount + negativeCount;
    if (totalSentimentWords === 0) return 0;

    return (positiveCount - negativeCount) / totalSentimentWords;
  }

  // Fetch economic calendar data (mock implementation)
  public async fetchEconomicCalendar(): Promise<EconomicData[]> {
    try {
      // In a real implementation, this would fetch from an economic calendar API
      const mockEconomicData: EconomicData[] = [
        {
          indicator: 'Non-Farm Payrolls',
          value: 200000,
          previousValue: 185000,
          country: 'United States',
          currency: 'USD',
          timestamp: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
          impact: 'high'
        },
        {
          indicator: 'ECB Interest Rate Decision',
          value: 4.50,
          previousValue: 4.25,
          country: 'European Union',
          currency: 'EUR',
          timestamp: Date.now() + 48 * 60 * 60 * 1000, // Day after tomorrow
          impact: 'high'
        },
        {
          indicator: 'GDP Growth Rate',
          value: 2.1,
          previousValue: 1.8,
          country: 'Japan',
          currency: 'JPY',
          timestamp: Date.now() + 72 * 60 * 60 * 1000, // In 3 days
          impact: 'medium'
        },
        {
          indicator: 'Unemployment Rate',
          value: 3.5,
          previousValue: 3.7,
          country: 'Switzerland',
          currency: 'CHF',
          timestamp: Date.now() + 96 * 60 * 60 * 1000, // In 4 days
          impact: 'medium'
        }
      ];

      this.economicCalendarData = mockEconomicData;
      await this.saveCachedData();
      return mockEconomicData;
    } catch (error) {
      console.error('Error fetching economic calendar:', error);
      return this.economicCalendarData;
    }
  }

  // Calculate overall sentiment for a symbol
  public async calculateSentimentAnalysis(symbol: string): Promise<SentimentAnalysis> {
    try {
      // Check cache first
      const cached = this.sentimentCache.get(symbol);
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      
      if (cached && cached.timestamp > oneHourAgo) {
        return cached;
      }

      // Fetch news and analyze sentiment
      const newsData = await this.fetchFinancialNews([symbol]);
      const relevantNews = newsData.filter(news => 
        news.relevantSymbols.includes(symbol) && 
        news.timestamp > Date.now() - 24 * 60 * 60 * 1000
      );

      let totalSentiment = 0;
      let newsCount = relevantNews.length;

      for (const news of relevantNews) {
        totalSentiment += news.sentiment;
      }

      const overallSentiment = newsCount > 0 ? totalSentiment / newsCount : 0;

      // Mock social media mentions and fear & greed index
      const socialMediaMentions = Math.floor(Math.random() * 1000) + 500;
      const fearGreedIndex = Math.random() * 100;

      const sentimentAnalysis: SentimentAnalysis = {
        symbol,
        overallSentiment,
        newsCount,
        socialMediaMentions,
        fearGreedIndex,
        timestamp: Date.now()
      };

      this.sentimentCache.set(symbol, sentimentAnalysis);
      await this.saveCachedData();

      return sentimentAnalysis;
    } catch (error) {
      console.error(`Error calculating sentiment for ${symbol}:`, error);
      return {
        symbol,
        overallSentiment: 0,
        newsCount: 0,
        socialMediaMentions: 0,
        fearGreedIndex: 50,
        timestamp: Date.now()
      };
    }
  }

  // Get upcoming economic events for a currency
  public getUpcomingEvents(currency: string, days: number = 7): EconomicData[] {
    const futureTime = Date.now() + days * 24 * 60 * 60 * 1000;
    
    return this.economicCalendarData.filter(event => 
      event.currency === currency && 
      event.timestamp > Date.now() && 
      event.timestamp <= futureTime
    ).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get high impact events affecting multiple currencies
  public getHighImpactEvents(days: number = 3): EconomicData[] {
    const futureTime = Date.now() + days * 24 * 60 * 60 * 1000;
    
    return this.economicCalendarData.filter(event => 
      event.impact === 'high' && 
      event.timestamp > Date.now() && 
      event.timestamp <= futureTime
    ).sort((a, b) => a.timestamp - b.timestamp);
  }

  // Calculate market correlation based on news sentiment
  public calculateMarketCorrelation(symbols: string[]): { [key: string]: number } {
    const correlations: { [key: string]: number } = {};
    
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        
        const sentiment1 = this.sentimentCache.get(symbol1);
        const sentiment2 = this.sentimentCache.get(symbol2);
        
        if (sentiment1 && sentiment2) {
          // Simple correlation based on sentiment similarity
          const correlation = 1 - Math.abs(sentiment1.overallSentiment - sentiment2.overallSentiment);
          correlations[`${symbol1}-${symbol2}`] = correlation;
        }
      }
    }
    
    return correlations;
  }

  // Get market mood indicator
  public getMarketMoodIndicator(): { mood: string; score: number; description: string } {
    const allSentiments = Array.from(this.sentimentCache.values());
    
    if (allSentiments.length === 0) {
      return {
        mood: 'Neutral',
        score: 50,
        description: 'Insufficient data to determine market mood'
      };
    }
    
    const avgSentiment = allSentiments.reduce((sum, s) => sum + s.overallSentiment, 0) / allSentiments.length;
    const avgFearGreed = allSentiments.reduce((sum, s) => sum + s.fearGreedIndex, 0) / allSentiments.length;
    
    const combinedScore = ((avgSentiment + 1) * 50 + avgFearGreed) / 2;
    
    let mood: string;
    let description: string;
    
    if (combinedScore >= 70) {
      mood = 'Bullish';
      description = 'Market sentiment is very positive with high confidence';
    } else if (combinedScore >= 55) {
      mood = 'Optimistic';
      description = 'Market sentiment is positive with moderate confidence';
    } else if (combinedScore >= 45) {
      mood = 'Neutral';
      description = 'Market sentiment is balanced with mixed signals';
    } else if (combinedScore >= 30) {
      mood = 'Cautious';
      description = 'Market sentiment is negative with some concerns';
    } else {
      mood = 'Bearish';
      description = 'Market sentiment is very negative with high uncertainty';
    }
    
    return { mood, score: combinedScore, description };
  }

  // Clean old cached data
  public async cleanOldData(days: number = 7): Promise<void> {
    try {
      const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
      
      // Clean news cache
      for (const [symbol, newsArray] of this.newsCache) {
        const filteredNews = newsArray.filter(news => news.timestamp > cutoffTime);
        this.newsCache.set(symbol, filteredNews);
      }
      
      // Clean economic data
      this.economicCalendarData = this.economicCalendarData.filter(
        event => event.timestamp > cutoffTime
      );
      
      // Clean sentiment cache
      for (const [symbol, sentiment] of this.sentimentCache) {
        if (sentiment.timestamp <= cutoffTime) {
          this.sentimentCache.delete(symbol);
        }
      }
      
      await this.saveCachedData();
    } catch (error) {
      console.error('Error cleaning old data:', error);
    }
  }

  // Get cached news for display
  public getCachedNews(symbol?: string, limit: number = 10): NewsData[] {
    if (symbol) {
      const symbolNews = this.newsCache.get(symbol) || [];
      return symbolNews.slice(0, limit);
    }
    
    const allNews: NewsData[] = [];
    for (const newsArray of this.newsCache.values()) {
      allNews.push(...newsArray);
    }
    
    return allNews
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // Get sentiment summary for all symbols
  public getSentimentSummary(): { [symbol: string]: SentimentAnalysis } {
    const summary: { [symbol: string]: SentimentAnalysis } = {};
    
    for (const [symbol, sentiment] of this.sentimentCache) {
      summary[symbol] = sentiment;
    }
    
    return summary;
  }
}