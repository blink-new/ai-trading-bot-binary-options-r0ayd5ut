import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  sma20: number;
  sma50: number;
  ema12: number;
  ema26: number;
  stochastic: {
    k: number;
    d: number;
  };
  volatility: number;
  support: number;
  resistance: number;
}

export interface TradingSignal {
  symbol: string;
  direction: 'CALL' | 'PUT';
  confidence: number;
  duration: 1 | 3 | 5; // minutes
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
  reasoning: string[];
  technicalIndicators: TechnicalIndicators;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitableTrades: number;
}

export class TradingBotEngine {
  private symbols = ['EURUSD=X', 'EURJPY=X', 'USDCHF=X'];
  private marketData: Map<string, MarketData[]> = new Map();
  private modelWeights: Map<string, number[]> = new Map();
  private historicalPredictions: Map<string, any[]> = new Map();

  constructor() {
    this.initializeModels();
  }

  // Data Collection - Real-time and Historical Market Data
  async fetchRealTimeData(symbol: string): Promise<MarketData | null> {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const meta = result.meta;
        const quotes = result.indicators.quote[0];
        const timestamps = result.timestamp;
        
        if (timestamps && quotes.close) {
          const latestIndex = quotes.close.length - 1;
          const latestPrice = quotes.close[latestIndex];
          const previousPrice = quotes.close[latestIndex - 1] || latestPrice;
          
          return {
            symbol: symbol.replace('=X', ''),
            price: latestPrice,
            change: latestPrice - previousPrice,
            changePercent: ((latestPrice - previousPrice) / previousPrice) * 100,
            volume: quotes.volume?.[latestIndex] || 0,
            high: quotes.high?.[latestIndex] || latestPrice,
            low: quotes.low?.[latestIndex] || latestPrice,
            open: quotes.open?.[latestIndex] || latestPrice,
            timestamp: timestamps[latestIndex] * 1000
          };
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      return null;
    }
  }

  async fetchHistoricalData(symbol: string, period: string = '3mo'): Promise<MarketData[]> {
    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const data = await response.json();
      const historicalData: MarketData[] = [];
      
      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const quotes = result.indicators.quote[0];
        const timestamps = result.timestamp;
        
        for (let i = 0; i < timestamps.length; i++) {
          if (quotes.close[i] !== null) {
            const currentPrice = quotes.close[i];
            const previousPrice = i > 0 ? quotes.close[i - 1] : currentPrice;
            
            historicalData.push({
              symbol: symbol.replace('=X', ''),
              price: currentPrice,
              change: currentPrice - previousPrice,
              changePercent: ((currentPrice - previousPrice) / previousPrice) * 100,
              volume: quotes.volume?.[i] || 0,
              high: quotes.high?.[i] || currentPrice,
              low: quotes.low?.[i] || currentPrice,
              open: quotes.open?.[i] || currentPrice,
              timestamp: timestamps[i] * 1000
            });
          }
        }
      }
      
      this.marketData.set(symbol, historicalData);
      return historicalData;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }

  // Data Preprocessing
  normalizeData(data: number[]): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;
    
    if (range === 0) return data.map(() => 0.5);
    
    return data.map(value => (value - min) / range);
  }

  removeOutliers(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(value => value >= lowerBound && value <= upperBound);
  }

  // Feature Engineering - Technical Indicators
  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    for (let i = period + 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    
    // Calculate signal line (9-period EMA of MACD)
    const macdArray = [macd]; // Simplified for single value
    const signal = this.calculateEMA(macdArray, 9);
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): 
    { upper: number; middle: number; lower: number } {
    if (prices.length < period) {
      const lastPrice = prices[prices.length - 1];
      return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
    }
    
    const recentPrices = prices.slice(-period);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev)
    };
  }

  calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): 
    { k: number; d: number } {
    if (closes.length < period) {
      return { k: 50, d: 50 };
    }
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    const d = k; // Simplified - normally would be SMA of %K
    
    return { k, d };
  }

  calculateVolatility(prices: number[], period: number = 20): number {
    if (prices.length < period) return 0;
    
    const returns = [];
    for (let i = 1; i < Math.min(prices.length, period + 1); i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  calculateSupportResistance(highs: number[], lows: number[], period: number = 20): 
    { support: number; resistance: number } {
    if (highs.length < period || lows.length < period) {
      const lastHigh = highs[highs.length - 1] || 0;
      const lastLow = lows[lows.length - 1] || 0;
      return { support: lastLow, resistance: lastHigh };
    }
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    
    // Find local maxima and minima
    const resistance = Math.max(...recentHighs);
    const support = Math.min(...recentLows);
    
    return { support, resistance };
  }

  // Calculate all technical indicators
  calculateTechnicalIndicators(marketData: MarketData[]): TechnicalIndicators {
    if (marketData.length === 0) {
      return {
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        bollingerBands: { upper: 0, middle: 0, lower: 0 },
        sma20: 0,
        sma50: 0,
        ema12: 0,
        ema26: 0,
        stochastic: { k: 50, d: 50 },
        volatility: 0,
        support: 0,
        resistance: 0
      };
    }
    
    const prices = marketData.map(data => data.price);
    const highs = marketData.map(data => data.high);
    const lows = marketData.map(data => data.low);
    const closes = marketData.map(data => data.price);
    
    return {
      rsi: this.calculateRSI(prices),
      macd: this.calculateMACD(prices),
      bollingerBands: this.calculateBollingerBands(prices),
      sma20: this.calculateSMA(prices, 20),
      sma50: this.calculateSMA(prices, 50),
      ema12: this.calculateEMA(prices, 12),
      ema26: this.calculateEMA(prices, 26),
      stochastic: this.calculateStochastic(highs, lows, closes),
      volatility: this.calculateVolatility(prices),
      support: this.calculateSupportResistance(highs, lows).support,
      resistance: this.calculateSupportResistance(highs, lows).resistance
    };
  }

  // AI Model Implementation
  private initializeModels(): void {
    // Initialize neural network weights for each symbol
    this.symbols.forEach(symbol => {
      // Simple feedforward neural network weights
      const inputSize = 15; // Number of features
      const hiddenSize = 32;
      const outputSize = 1;
      
      const weights: number[] = [];
      
      // Input to hidden layer weights
      for (let i = 0; i < inputSize * hiddenSize; i++) {
        weights.push((Math.random() - 0.5) * 2);
      }
      
      // Hidden layer bias
      for (let i = 0; i < hiddenSize; i++) {
        weights.push((Math.random() - 0.5) * 2);
      }
      
      // Hidden to output layer weights
      for (let i = 0; i < hiddenSize * outputSize; i++) {
        weights.push((Math.random() - 0.5) * 2);
      }
      
      // Output bias
      weights.push((Math.random() - 0.5) * 2);
      
      this.modelWeights.set(symbol, weights);
    });
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  private relu(x: number): number {
    return Math.max(0, x);
  }

  // Neural Network Forward Pass
  private neuralNetworkPredict(features: number[], symbol: string): number {
    const weights = this.modelWeights.get(symbol);
    if (!weights) return 0.5;
    
    const inputSize = 15;
    const hiddenSize = 32;
    
    // Input to hidden layer
    const hidden: number[] = [];
    for (let h = 0; h < hiddenSize; h++) {
      let sum = 0;
      for (let i = 0; i < inputSize; i++) {
        sum += features[i] * weights[h * inputSize + i];
      }
      sum += weights[inputSize * hiddenSize + h]; // bias
      hidden.push(this.relu(sum));
    }
    
    // Hidden to output layer
    let output = 0;
    for (let h = 0; h < hiddenSize; h++) {
      output += hidden[h] * weights[inputSize * hiddenSize + hiddenSize + h];
    }
    output += weights[weights.length - 1]; // output bias
    
    return this.sigmoid(output);
  }

  // Feature extraction for ML model
  private extractFeatures(marketData: MarketData[], indicators: TechnicalIndicators): number[] {
    if (marketData.length === 0) return new Array(15).fill(0);
    
    const latest = marketData[marketData.length - 1];
    const normalized = this.normalizeData([
      indicators.rsi,
      indicators.macd.macd * 1000, // Scale MACD
      indicators.bollingerBands.upper,
      indicators.bollingerBands.middle,
      indicators.bollingerBands.lower,
      indicators.sma20,
      indicators.sma50,
      indicators.ema12,
      indicators.ema26,
      indicators.stochastic.k,
      indicators.stochastic.d,
      indicators.volatility * 100,
      latest.changePercent,
      (latest.price - indicators.support) / indicators.support,
      (indicators.resistance - latest.price) / latest.price
    ]);
    
    return normalized;
  }

  // Signal Generation
  async generateTradingSignal(symbol: string, duration: 1 | 3 | 5): Promise<TradingSignal | null> {
    try {
      // Get historical data
      const historicalData = await this.fetchHistoricalData(symbol);
      if (historicalData.length === 0) return null;
      
      // Get real-time data
      const currentData = await this.fetchRealTimeData(symbol);
      if (!currentData) return null;
      
      // Calculate technical indicators
      const indicators = this.calculateTechnicalIndicators([...historicalData, currentData]);
      
      // Extract features for ML model
      const features = this.extractFeatures([...historicalData, currentData], indicators);
      
      // Get ML prediction
      const mlPrediction = this.neuralNetworkPredict(features, symbol);
      
      // Rule-based analysis
      const ruleBasedSignals = this.analyzeRuleBasedSignals(indicators, currentData);
      
      // Combine ML and rule-based analysis
      const combinedConfidence = (mlPrediction * 0.6) + (ruleBasedSignals.confidence * 0.4);
      
      // Determine direction
      let direction: 'CALL' | 'PUT';
      let reasoning: string[] = [];
      
      if (combinedConfidence > 0.6) {
        direction = 'CALL';
        reasoning.push(`Strong bullish signal (${(combinedConfidence * 100).toFixed(1)}% confidence)`);
      } else if (combinedConfidence < 0.4) {
        direction = 'PUT';
        reasoning.push(`Strong bearish signal (${((1 - combinedConfidence) * 100).toFixed(1)}% confidence)`);
      } else {
        return null; // No clear signal
      }
      
      // Add technical analysis reasoning
      reasoning.push(...ruleBasedSignals.reasoning);
      
      // Calculate stop loss and take profit
      const volatilityAdjustment = indicators.volatility * currentData.price * 0.01;
      const stopLoss = direction === 'CALL' 
        ? currentData.price - volatilityAdjustment
        : currentData.price + volatilityAdjustment;
      
      const takeProfit = direction === 'CALL'
        ? currentData.price + (volatilityAdjustment * 2)
        : currentData.price - (volatilityAdjustment * 2);
      
      const signal: TradingSignal = {
        symbol: currentData.symbol,
        direction,
        confidence: Math.abs(combinedConfidence - 0.5) * 2, // Convert to 0-1 scale
        duration,
        entryPrice: currentData.price,
        stopLoss,
        takeProfit,
        timestamp: Date.now(),
        reasoning,
        technicalIndicators: indicators
      };
      
      // Store prediction for continuous learning
      this.storePrediction(symbol, signal, features);
      
      return signal;
    } catch (error) {
      console.error(`Error generating signal for ${symbol}:`, error);
      return null;
    }
  }

  private analyzeRuleBasedSignals(indicators: TechnicalIndicators, currentData: MarketData): 
    { confidence: number; reasoning: string[] } {
    let bullishSignals = 0;
    let bearishSignals = 0;
    const reasoning: string[] = [];
    
    // RSI Analysis
    if (indicators.rsi < 30) {
      bullishSignals++;
      reasoning.push('RSI oversold (< 30) - bullish signal');
    } else if (indicators.rsi > 70) {
      bearishSignals++;
      reasoning.push('RSI overbought (> 70) - bearish signal');
    }
    
    // MACD Analysis
    if (indicators.macd.macd > indicators.macd.signal && indicators.macd.histogram > 0) {
      bullishSignals++;
      reasoning.push('MACD bullish crossover');
    } else if (indicators.macd.macd < indicators.macd.signal && indicators.macd.histogram < 0) {
      bearishSignals++;
      reasoning.push('MACD bearish crossover');
    }
    
    // Bollinger Bands Analysis
    if (currentData.price <= indicators.bollingerBands.lower) {
      bullishSignals++;
      reasoning.push('Price at lower Bollinger Band - oversold');
    } else if (currentData.price >= indicators.bollingerBands.upper) {
      bearishSignals++;
      reasoning.push('Price at upper Bollinger Band - overbought');
    }
    
    // Moving Average Analysis
    if (indicators.ema12 > indicators.ema26 && currentData.price > indicators.sma20) {
      bullishSignals++;
      reasoning.push('Price above SMA20 with EMA12 > EMA26 - bullish trend');
    } else if (indicators.ema12 < indicators.ema26 && currentData.price < indicators.sma20) {
      bearishSignals++;
      reasoning.push('Price below SMA20 with EMA12 < EMA26 - bearish trend');
    }
    
    // Stochastic Analysis
    if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
      bullishSignals++;
      reasoning.push('Stochastic oversold - bullish signal');
    } else if (indicators.stochastic.k > 80 && indicators.stochastic.d > 80) {
      bearishSignals++;
      reasoning.push('Stochastic overbought - bearish signal');
    }
    
    // Support/Resistance Analysis
    const priceNearSupport = Math.abs(currentData.price - indicators.support) / currentData.price < 0.01;
    const priceNearResistance = Math.abs(currentData.price - indicators.resistance) / currentData.price < 0.01;
    
    if (priceNearSupport) {
      bullishSignals++;
      reasoning.push('Price near support level - potential bounce');
    } else if (priceNearResistance) {
      bearishSignals++;
      reasoning.push('Price near resistance level - potential rejection');
    }
    
    const totalSignals = bullishSignals + bearishSignals;
    const confidence = totalSignals === 0 ? 0.5 : bullishSignals / totalSignals;
    
    return { confidence, reasoning };
  }

  // Continuous Learning
  private async storePrediction(symbol: string, signal: TradingSignal, features: number[]): Promise<void> {
    try {
      const key = `predictions_${symbol}`;
      const existing = await AsyncStorage.getItem(key);
      let predictions = existing ? JSON.parse(existing) : [];
      
      predictions.push({
        timestamp: signal.timestamp,
        prediction: signal.direction,
        confidence: signal.confidence,
        features,
        actualOutcome: null // Will be updated later
      });
      
      // Keep only last 1000 predictions
      if (predictions.length > 1000) {
        predictions = predictions.slice(-1000);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(predictions));
      this.historicalPredictions.set(symbol, predictions);
    } catch (error) {
      console.error('Error storing prediction:', error);
    }
  }

  // Model Evaluation
  async evaluateModel(symbol: string): Promise<ModelMetrics> {
    try {
      const key = `predictions_${symbol}`;
      const stored = await AsyncStorage.getItem(key);
      const predictions = stored ? JSON.parse(stored) : [];
      
      if (predictions.length === 0) {
        return {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0,
          profitableTrades: 0
        };
      }
      
      // Filter predictions with actual outcomes
      const completedPredictions = predictions.filter((p: any) => p.actualOutcome !== null);
      
      if (completedPredictions.length === 0) {
        return {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          sharpeRatio: 0,
          winRate: 0,
          totalTrades: 0,
          profitableTrades: 0
        };
      }
      
      let correct = 0;
      let truePositives = 0;
      let falsePositives = 0;
      let falseNegatives = 0;
      let profitable = 0;
      
      completedPredictions.forEach((pred: any) => {
        const wasCorrect = pred.prediction === pred.actualOutcome;
        if (wasCorrect) {
          correct++;
          profitable++;
        }
        
        if (pred.prediction === 'CALL' && pred.actualOutcome === 'CALL') {
          truePositives++;
        } else if (pred.prediction === 'CALL' && pred.actualOutcome === 'PUT') {
          falsePositives++;
        } else if (pred.prediction === 'PUT' && pred.actualOutcome === 'CALL') {
          falseNegatives++;
        }
      });
      
      const accuracy = correct / completedPredictions.length;
      const precision = truePositives / (truePositives + falsePositives) || 0;
      const recall = truePositives / (truePositives + falseNegatives) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
      const winRate = profitable / completedPredictions.length;
      
      // Simplified Sharpe ratio calculation
      const returns = completedPredictions.map((pred: any) => 
        pred.prediction === pred.actualOutcome ? 0.8 : -1.0 // Binary options typical return
      );
      const avgReturn = returns.reduce((sum: number, ret: number) => sum + ret, 0) / returns.length;
      const variance = returns.reduce((sum: number, ret: number) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
      const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;
      
      return {
        accuracy,
        precision,
        recall,
        f1Score,
        sharpeRatio,
        winRate,
        totalTrades: completedPredictions.length,
        profitableTrades: profitable
      };
    } catch (error) {
      console.error('Error evaluating model:', error);
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        sharpeRatio: 0,
        winRate: 0,
        totalTrades: 0,
        profitableTrades: 0
      };
    }
  }

  // Get all supported symbols
  getSupportedSymbols(): string[] {
    return this.symbols.map(symbol => symbol.replace('=X', ''));
  }

  // Get market data for symbol
  async getMarketData(symbol: string): Promise<MarketData | null> {
    return await this.fetchRealTimeData(symbol + '=X');
  }

  // Get historical market data
  async getHistoricalData(symbol: string): Promise<MarketData[]> {
    return await this.fetchHistoricalData(symbol + '=X');
  }
}