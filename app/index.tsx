import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { TradingBotEngine, TradingSignal, MarketData } from '@/components/TradingBotEngine';
import { NotificationService } from '@/components/NotificationService';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Bell, 
  Target,
  Brain,
  Zap,
  Clock,
  DollarSign,
  Activity
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface SignalDisplayProps {
  signal: TradingSignal | null;
  isLoading: boolean;
}

const SignalDisplay: React.FC<SignalDisplayProps> = ({ signal, isLoading }) => {
  if (isLoading) {
    return (
      <View style={[styles.signalCard, styles.loadingCard]}>
        <RefreshCw size={24} color="#00d4aa" />
        <Text style={styles.loadingText}>Analyzing Market Data...</Text>
        <Text style={styles.loadingSubtext}>AI is processing real-time signals</Text>
      </View>
    );
  }

  if (!signal) {
    return (
      <View style={[styles.signalCard, styles.noSignalCard]}>
        <Brain size={32} color="#666" />
        <Text style={styles.noSignalText}>No Signal Available</Text>
        <Text style={styles.noSignalSubtext}>Market conditions unclear</Text>
      </View>
    );
  }

  const isCall = signal.direction === 'CALL';
  const confidencePercentage = (signal.confidence * 100).toFixed(1);

  return (
    <View style={[
      styles.signalCard,
      isCall ? styles.callSignalCard : styles.putSignalCard
    ]}>
      <View style={styles.signalHeader}>
        <View style={styles.signalDirection}>
          {isCall ? (
            <TrendingUp size={28} color="#00ff88" />
          ) : (
            <TrendingDown size={28} color="#ff4757" />
          )}
          <Text style={[
            styles.directionText,
            { color: isCall ? '#00ff88' : '#ff4757' }
          ]}>
            {signal.direction}
          </Text>
        </View>
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>{confidencePercentage}%</Text>
          <Text style={styles.confidenceLabel}>Confidence</Text>
        </View>
      </View>

      <View style={styles.signalDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Symbol:</Text>
          <Text style={styles.detailValue}>{signal.symbol}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Entry Price:</Text>
          <Text style={styles.detailValue}>${signal.entryPrice.toFixed(5)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>{signal.duration} minute(s)</Text>
        </View>
        {signal.takeProfit && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Take Profit:</Text>
            <Text style={styles.detailValue}>${signal.takeProfit.toFixed(5)}</Text>
          </View>
        )}
        {signal.stopLoss && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stop Loss:</Text>
            <Text style={styles.detailValue}>${signal.stopLoss.toFixed(5)}</Text>
          </View>
        )}
      </View>

      <View style={styles.reasoningContainer}>
        <Text style={styles.reasoningTitle}>AI Analysis:</Text>
        {signal.reasoning.slice(0, 3).map((reason, index) => (
          <Text key={index} style={styles.reasoningText}>• {reason}</Text>
        ))}
      </View>
    </View>
  );
};

interface MarketDataCardProps {
  symbol: string;
  data: MarketData | null;
  onPress: () => void;
}

const MarketDataCard: React.FC<MarketDataCardProps> = ({ symbol, data, onPress }) => {
  if (!data) {
    return (
      <TouchableOpacity style={styles.marketCard} onPress={onPress}>
        <Text style={styles.marketSymbol}>{symbol}</Text>
        <Text style={styles.marketPrice}>Loading...</Text>
        <RefreshCw size={16} color="#666" />
      </TouchableOpacity>
    );
  }

  const isPositive = data.changePercent >= 0;

  return (
    <TouchableOpacity style={styles.marketCard} onPress={onPress}>
      <Text style={styles.marketSymbol}>{symbol}</Text>
      <Text style={styles.marketPrice}>${data.price.toFixed(5)}</Text>
      <View style={styles.changeContainer}>
        <Text style={[
          styles.changeText,
          { color: isPositive ? '#00ff88' : '#ff4757' }
        ]}>
          {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
        </Text>
        {isPositive ? (
          <TrendingUp size={14} color="#00ff88" />
        ) : (
          <TrendingDown size={14} color="#ff4757" />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function TradingBotScreen() {
  const [tradingBot] = useState(() => new TradingBotEngine());
  const [notificationService] = useState(() => NotificationService.getInstance());
  
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [selectedDuration, setSelectedDuration] = useState<1 | 3 | 5>(1);
  const [currentSignal, setCurrentSignal] = useState<TradingSignal | null>(null);
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoTrading, setAutoTrading] = useState(false);

  const symbols = tradingBot.getSupportedSymbols();
  const durations: Array<1 | 3 | 5> = [1, 3, 5];

  useEffect(() => {
    initializeServices();
    loadMarketData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (!isAnalyzing) {
        loadMarketData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoTrading) {
      const autoTradingInterval = setInterval(() => {
        if (!isAnalyzing) {
          generateSignal();
        }
      }, 60000); // Generate signal every minute when auto-trading

      return () => clearInterval(autoTradingInterval);
    }
  }, [autoTrading, selectedSymbol, selectedDuration, isAnalyzing]);

  const initializeServices = async () => {
    try {
      await notificationService.initialize();
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  };

  const loadMarketData = async () => {
    try {
      const dataPromises = symbols.map(async (symbol) => {
        const data = await tradingBot.getMarketData(symbol);
        return { symbol, data };
      });

      const results = await Promise.all(dataPromises);
      const newMarketData = new Map();
      
      results.forEach(({ symbol, data }) => {
        if (data) {
          newMarketData.set(symbol, data);
        }
      });

      setMarketData(newMarketData);
    } catch (error) {
      console.error('Error loading market data:', error);
    }
  };

  const generateSignal = async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    try {
      const signal = await tradingBot.generateTradingSignal(selectedSymbol, selectedDuration);
      setCurrentSignal(signal);

      if (signal) {
        // Send push notification
        await notificationService.sendTradingSignalNotification(signal);
        
        // Show alert for immediate attention
        Alert.alert(
          `🚀 ${signal.symbol} Signal`,
          `${signal.direction} with ${(signal.confidence * 100).toFixed(1)}% confidence`,
          [
            { text: 'Dismiss', style: 'cancel' },
            { text: 'View Details', onPress: () => {} }
          ]
        );
      } else {
        if (!autoTrading) {
          Alert.alert(
            'No Signal',
            'Market conditions are unclear. No trading signal generated.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error generating signal:', error);
      Alert.alert('Error', 'Failed to generate trading signal. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadMarketData();
    setIsRefreshing(false);
  };

  const toggleAutoTrading = () => {
    setAutoTrading(!autoTrading);
    if (!autoTrading) {
      Alert.alert(
        'Auto Trading Enabled',
        'The bot will now automatically generate signals every minute.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Trading Bot</Text>
          <Text style={styles.headerSubtitle}>Binary Options Signals</Text>
        </View>
        <TouchableOpacity 
          style={[styles.autoTradingButton, autoTrading && styles.autoTradingActive]}
          onPress={toggleAutoTrading}
        >
          <Zap size={20} color={autoTrading ? '#000' : '#fff'} />
          <Text style={[
            styles.autoTradingText,
            { color: autoTrading ? '#000' : '#fff' }
          ]}>
            {autoTrading ? 'AUTO ON' : 'AUTO OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Market Data Cards */}
      <View style={styles.marketDataContainer}>
        <Text style={styles.sectionTitle}>Live Market Data</Text>
        <View style={styles.marketCardsRow}>
          {symbols.map((symbol) => (
            <MarketDataCard
              key={symbol}
              symbol={symbol}
              data={marketData.get(symbol) || null}
              onPress={() => setSelectedSymbol(symbol)}
            />
          ))}
        </View>
      </View>

      {/* Symbol Selection */}
      <View style={styles.selectionContainer}>
        <Text style={styles.sectionTitle}>Select Trading Pair</Text>
        <View style={styles.symbolButtons}>
          {symbols.map((symbol) => (
            <TouchableOpacity
              key={symbol}
              style={[
                styles.symbolButton,
                selectedSymbol === symbol && styles.selectedSymbolButton
              ]}
              onPress={() => setSelectedSymbol(symbol)}
            >
              <Text style={[
                styles.symbolButtonText,
                selectedSymbol === symbol && styles.selectedSymbolButtonText
              ]}>
                {symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Duration Selection */}
      <View style={styles.selectionContainer}>
        <Text style={styles.sectionTitle}>Trade Duration</Text>
        <View style={styles.durationButtons}>
          {durations.map((duration) => (
            <TouchableOpacity
              key={duration}
              style={[
                styles.durationButton,
                selectedDuration === duration && styles.selectedDurationButton
              ]}
              onPress={() => setSelectedDuration(duration)}
            >
              <Clock size={18} color={selectedDuration === duration ? '#000' : '#fff'} />
              <Text style={[
                styles.durationButtonText,
                selectedDuration === duration && styles.selectedDurationButtonText
              ]}>
                {duration}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate Signal Button */}
      <TouchableOpacity
        style={[styles.generateButton, isAnalyzing && styles.generateButtonDisabled]}
        onPress={generateSignal}
        disabled={isAnalyzing}
      >
        <Target size={24} color="#000" />
        <Text style={styles.generateButtonText}>
          {isAnalyzing ? 'Analyzing...' : 'Generate AI Signal'}
        </Text>
      </TouchableOpacity>

      {/* Current Signal Display */}
      <View style={styles.signalContainer}>
        <Text style={styles.sectionTitle}>Current Signal</Text>
        <SignalDisplay signal={currentSignal} isLoading={isAnalyzing} />
      </View>

      {/* Quick Stats */}
      {currentSignal && (
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Technical Indicators</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>RSI</Text>
              <Text style={styles.statValue}>
                {currentSignal.technicalIndicators.rsi.toFixed(1)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>MACD</Text>
              <Text style={styles.statValue}>
                {currentSignal.technicalIndicators.macd.macd.toFixed(4)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Volatility</Text>
              <Text style={styles.statValue}>
                {(currentSignal.technicalIndicators.volatility * 100).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>SMA20</Text>
              <Text style={styles.statValue}>
                {currentSignal.technicalIndicators.sma20.toFixed(5)}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  autoTradingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  autoTradingActive: {
    backgroundColor: '#00d4aa',
  },
  autoTradingText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  marketDataContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  marketCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  marketCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  marketSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  marketPrice: {
    fontSize: 16,
    color: '#00d4aa',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectionContainer: {
    padding: 20,
    paddingTop: 0,
  },
  symbolButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  symbolButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedSymbolButton: {
    borderColor: '#00d4aa',
    backgroundColor: '#00d4aa',
  },
  symbolButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedSymbolButtonText: {
    color: '#000',
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  durationButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  selectedDurationButton: {
    borderColor: '#00d4aa',
    backgroundColor: '#00d4aa',
  },
  durationButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selectedDurationButtonText: {
    color: '#000',
  },
  generateButton: {
    flexDirection: 'row',
    backgroundColor: '#00d4aa',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    elevation: 4,
    shadowColor: '#00d4aa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#666',
    elevation: 0,
    shadowOpacity: 0,
  },
  generateButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signalContainer: {
    padding: 20,
    paddingTop: 0,
  },
  signalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
  },
  loadingCard: {
    borderColor: '#333',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#00d4aa',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
  noSignalCard: {
    borderColor: '#333',
    alignItems: 'center',
    paddingVertical: 40,
  },
  noSignalText: {
    color: '#666',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  noSignalSubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
  callSignalCard: {
    borderColor: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  putSignalCard: {
    borderColor: '#ff4757',
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  signalDirection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directionText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  confidenceContainer: {
    alignItems: 'center',
  },
  confidenceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d4aa',
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  signalDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#888',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasoningContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  reasoningTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  reasoningText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  statsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: (width - 64) / 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  statValue: {
    color: '#00d4aa',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});