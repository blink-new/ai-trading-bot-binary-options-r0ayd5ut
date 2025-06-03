import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LineChart, CandlestickChart } from 'react-native-chart-kit';
import { TradingBotEngine, MarketData, TechnicalIndicators } from '@/components/TradingBotEngine';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  RefreshCw,
  Calendar,
  Clock,
  DollarSign
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface ChartControlsProps {
  selectedSymbol: string;
  selectedTimeframe: string;
  onSymbolChange: (symbol: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  symbols: string[];
  timeframes: string[];
}

const ChartControls: React.FC<ChartControlsProps> = ({
  selectedSymbol,
  selectedTimeframe,
  onSymbolChange,
  onTimeframeChange,
  symbols,
  timeframes
}) => (
  <View style={styles.controlsContainer}>
    <View style={styles.controlGroup}>
      <Text style={styles.controlLabel}>Symbol</Text>
      <View style={styles.buttonGroup}>
        {symbols.map((symbol) => (
          <TouchableOpacity
            key={symbol}
            style={[
              styles.controlButton,
              selectedSymbol === symbol && styles.controlButtonActive
            ]}
            onPress={() => onSymbolChange(symbol)}
          >
            <Text style={[
              styles.controlButtonText,
              selectedSymbol === symbol && styles.controlButtonTextActive
            ]}>
              {symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    <View style={styles.controlGroup}>
      <Text style={styles.controlLabel}>Timeframe</Text>
      <View style={styles.buttonGroup}>
        {timeframes.map((timeframe) => (
          <TouchableOpacity
            key={timeframe}
            style={[
              styles.controlButton,
              selectedTimeframe === timeframe && styles.controlButtonActive
            ]}
            onPress={() => onTimeframeChange(timeframe)}
          >
            <Text style={[
              styles.controlButtonText,
              selectedTimeframe === timeframe && styles.controlButtonTextActive
            ]}>
              {timeframe}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </View>
);

interface TechnicalIndicatorCardProps {
  title: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  subtitle: string;
  icon: React.ReactNode;
}

const TechnicalIndicatorCard: React.FC<TechnicalIndicatorCardProps> = ({
  title,
  value,
  change,
  changePositive,
  subtitle,
  icon
}) => (
  <View style={styles.indicatorCard}>
    <View style={styles.indicatorHeader}>
      <View style={styles.indicatorIcon}>
        {icon}
      </View>
      <Text style={styles.indicatorTitle}>{title}</Text>
    </View>
    <Text style={styles.indicatorValue}>{value}</Text>
    {change && (
      <Text style={[
        styles.indicatorChange,
        { color: changePositive ? '#00ff88' : '#ff4757' }
      ]}>
        {change}
      </Text>
    )}
    <Text style={styles.indicatorSubtitle}>{subtitle}</Text>
  </View>
);

export default function ChartScreen() {
  const [tradingBot] = useState(() => new TradingBotEngine());
  const [selectedSymbol, setSelectedSymbol] = useState<string>('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1D');
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicators | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const symbols = tradingBot.getSupportedSymbols();
  const timeframes = ['1H', '4H', '1D', '1W'];

  useEffect(() => {
    loadChartData();
  }, [selectedSymbol, selectedTimeframe]);

  const loadChartData = async () => {
    setIsLoading(true);
    try {
      // Get historical data based on timeframe
      const period = getTimeframePeriod(selectedTimeframe);
      const data = await tradingBot.fetchHistoricalData(selectedSymbol + '=X', period);
      
      if (data.length > 0) {
        setMarketData(data);
        
        // Calculate technical indicators
        const indicators = tradingBot.calculateTechnicalIndicators(data);
        setTechnicalIndicators(indicators);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeframePeriod = (timeframe: string): string => {
    switch (timeframe) {
      case '1H':
        return '5d';
      case '4H':
        return '1mo';
      case '1D':
        return '3mo';
      case '1W':
        return '1y';
      default:
        return '3mo';
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadChartData();
    setIsRefreshing(false);
  };

  // Prepare chart data
  const prepareChartData = () => {
    if (marketData.length === 0) return null;

    const labels = marketData.slice(-50).map((data, index) => {
      const date = new Date(data.timestamp);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const prices = marketData.slice(-50).map(data => data.price);

    return {
      labels,
      datasets: [
        {
          data: prices,
          color: (opacity = 1) => `rgba(0, 212, 170, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  };

  // Prepare candlestick data
  const prepareCandlestickData = () => {
    if (marketData.length === 0) return [];

    return marketData.slice(-20).map(data => ({
      shadowH: data.high,
      shadowL: data.low,
      open: data.open,
      close: data.price,
    }));
  };

  const chartData = prepareChartData();
  const candlestickData = prepareCandlestickData();

  const chartConfig = {
    backgroundColor: '#1a1a1a',
    backgroundGradientFrom: '#1a1a1a',
    backgroundGradientTo: '#0a0a0a',
    decimalPlaces: 5,
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '1',
      stroke: '#00d4aa',
    },
    propsForVerticalLabels: {
      fontSize: 10,
    },
    propsForHorizontalLabels: {
      fontSize: 10,
    },
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
          <Text style={styles.headerTitle}>Market Charts</Text>
          <Text style={styles.headerSubtitle}>Real-time Price Analysis</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadChartData}
          disabled={isLoading}
        >
          <RefreshCw size={20} color="#00d4aa" />
        </TouchableOpacity>
      </View>

      {/* Chart Controls */}
      <ChartControls
        selectedSymbol={selectedSymbol}
        selectedTimeframe={selectedTimeframe}
        onSymbolChange={setSelectedSymbol}
        onTimeframeChange={setSelectedTimeframe}
        symbols={symbols}
        timeframes={timeframes}
      />

      {/* Current Price Display */}
      {marketData.length > 0 && (
        <View style={styles.priceContainer}>
          <View style={styles.priceCard}>
            <Text style={styles.priceSymbol}>{selectedSymbol}</Text>
            <Text style={styles.priceValue}>
              ${marketData[marketData.length - 1].price.toFixed(5)}
            </Text>
            <View style={styles.priceChange}>
              <Text style={[
                styles.priceChangeText,
                { color: marketData[marketData.length - 1].changePercent >= 0 ? '#00ff88' : '#ff4757' }
              ]}>
                {marketData[marketData.length - 1].changePercent >= 0 ? '+' : ''}
                {marketData[marketData.length - 1].changePercent.toFixed(2)}%
              </Text>
              {marketData[marketData.length - 1].changePercent >= 0 ? (
                <TrendingUp size={16} color="#00ff88" />
              ) : (
                <TrendingDown size={16} color="#ff4757" />
              )}
            </View>
          </View>
        </View>
      )}

      {/* Price Chart */}
      {chartData && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Price Chart</Text>
          <View style={styles.chartWrapper}>
            <LineChart
              data={chartData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* Technical Indicators */}
      {technicalIndicators && (
        <View style={styles.indicatorsContainer}>
          <Text style={styles.sectionTitle}>Technical Indicators</Text>
          <View style={styles.indicatorsGrid}>
            <TechnicalIndicatorCard
              title="RSI"
              value={technicalIndicators.rsi.toFixed(1)}
              subtitle={
                technicalIndicators.rsi < 30 ? 'Oversold' :
                technicalIndicators.rsi > 70 ? 'Overbought' : 'Neutral'
              }
              icon={<Activity size={16} color="#00d4aa" />}
            />
            <TechnicalIndicatorCard
              title="MACD"
              value={technicalIndicators.macd.macd.toFixed(4)}
              change={technicalIndicators.macd.histogram.toFixed(4)}
              changePositive={technicalIndicators.macd.histogram > 0}
              subtitle="Signal Line"
              icon={<TrendingUp size={16} color="#00d4aa" />}
            />
            <TechnicalIndicatorCard
              title="Volatility"
              value={`${(technicalIndicators.volatility * 100).toFixed(2)}%`}
              subtitle="Market Volatility"
              icon={<BarChart3 size={16} color="#00d4aa" />}
            />
            <TechnicalIndicatorCard
              title="SMA 20"
              value={technicalIndicators.sma20.toFixed(5)}
              subtitle="Simple Moving Average"
              icon={<DollarSign size={16} color="#00d4aa" />}
            />
          </View>
        </View>
      )}

      {/* Bollinger Bands */}
      {technicalIndicators && (
        <View style={styles.bollingerContainer}>
          <Text style={styles.sectionTitle}>Bollinger Bands</Text>
          <View style={styles.bollingerCard}>
            <View style={styles.bollingerRow}>
              <Text style={styles.bollingerLabel}>Upper Band:</Text>
              <Text style={styles.bollingerValue}>
                ${technicalIndicators.bollingerBands.upper.toFixed(5)}
              </Text>
            </View>
            <View style={styles.bollingerRow}>
              <Text style={styles.bollingerLabel}>Middle (SMA):</Text>
              <Text style={styles.bollingerValue}>
                ${technicalIndicators.bollingerBands.middle.toFixed(5)}
              </Text>
            </View>
            <View style={styles.bollingerRow}>
              <Text style={styles.bollingerLabel}>Lower Band:</Text>
              <Text style={styles.bollingerValue}>
                ${technicalIndicators.bollingerBands.lower.toFixed(5)}
              </Text>
            </View>
            
            {marketData.length > 0 && (
              <View style={styles.bollingerAnalysis}>
                <Text style={styles.bollingerAnalysisTitle}>Analysis:</Text>
                <Text style={styles.bollingerAnalysisText}>
                  {marketData[marketData.length - 1].price <= technicalIndicators.bollingerBands.lower
                    ? '💡 Price near lower band - potential oversold condition'
                    : marketData[marketData.length - 1].price >= technicalIndicators.bollingerBands.upper
                    ? '⚠️ Price near upper band - potential overbought condition'
                    : '✅ Price within normal range'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Support & Resistance */}
      {technicalIndicators && (
        <View style={styles.supportResistanceContainer}>
          <Text style={styles.sectionTitle}>Support & Resistance</Text>
          <View style={styles.supportResistanceCard}>
            <View style={styles.levelRow}>
              <View style={styles.levelItem}>
                <Text style={styles.levelLabel}>Resistance</Text>
                <Text style={[styles.levelValue, { color: '#ff4757' }]}>
                  ${technicalIndicators.resistance.toFixed(5)}
                </Text>
              </View>
              <View style={styles.levelDivider} />
              <View style={styles.levelItem}>
                <Text style={styles.levelLabel}>Support</Text>
                <Text style={[styles.levelValue, { color: '#00ff88' }]}>
                  ${technicalIndicators.support.toFixed(5)}
                </Text>
              </View>
            </View>
            
            {marketData.length > 0 && (
              <View style={styles.levelAnalysis}>
                <Text style={styles.levelAnalysisText}>
                  Current price: ${marketData[marketData.length - 1].price.toFixed(5)}
                </Text>
                <Text style={styles.levelDistanceText}>
                  Distance to resistance: {(((technicalIndicators.resistance - marketData[marketData.length - 1].price) / marketData[marketData.length - 1].price) * 100).toFixed(2)}%
                </Text>
                <Text style={styles.levelDistanceText}>
                  Distance to support: {(((marketData[marketData.length - 1].price - technicalIndicators.support) / marketData[marketData.length - 1].price) * 100).toFixed(2)}%
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Market Data Table */}
      {marketData.length > 0 && (
        <View style={styles.dataTableContainer}>
          <Text style={styles.sectionTitle}>Recent Market Data</Text>
          <View style={styles.dataTable}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Time</Text>
              <Text style={styles.tableHeaderText}>Open</Text>
              <Text style={styles.tableHeaderText}>High</Text>
              <Text style={styles.tableHeaderText}>Low</Text>
              <Text style={styles.tableHeaderText}>Close</Text>
            </View>
            {marketData.slice(-5).reverse().map((data, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCellTime}>
                  {new Date(data.timestamp).toLocaleDateString()}
                </Text>
                <Text style={styles.tableCell}>{data.open.toFixed(5)}</Text>
                <Text style={styles.tableCell}>{data.high.toFixed(5)}</Text>
                <Text style={styles.tableCell}>{data.low.toFixed(5)}</Text>
                <Text style={[
                  styles.tableCell,
                  { color: data.changePercent >= 0 ? '#00ff88' : '#ff4757' }
                ]}>
                  {data.price.toFixed(5)}
                </Text>
              </View>
            ))}
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
  refreshButton: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 12,
  },
  controlsContainer: {
    padding: 20,
  },
  controlGroup: {
    marginBottom: 16,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  controlButtonActive: {
    backgroundColor: '#00d4aa',
    borderColor: '#00d4aa',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  controlButtonTextActive: {
    color: '#000',
  },
  priceContainer: {
    padding: 20,
    paddingTop: 0,
  },
  priceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  priceSymbol: {
    color: '#888',
    fontSize: 16,
    marginBottom: 8,
  },
  priceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceChangeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    padding: 20,
    paddingTop: 0,
  },
  chartTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartWrapper: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 10,
  },
  chart: {
    borderRadius: 16,
  },
  indicatorsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  indicatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  indicatorCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: (width - 64) / 2,
    borderWidth: 1,
    borderColor: '#333',
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  indicatorIcon: {
    marginRight: 8,
  },
  indicatorTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  indicatorValue: {
    color: '#00d4aa',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  indicatorChange: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  indicatorSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  bollingerContainer: {
    padding: 20,
    paddingTop: 0,
  },
  bollingerCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  bollingerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bollingerLabel: {
    color: '#888',
    fontSize: 14,
  },
  bollingerValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bollingerAnalysis: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  bollingerAnalysisTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bollingerAnalysisText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 18,
  },
  supportResistanceContainer: {
    padding: 20,
    paddingTop: 0,
  },
  supportResistanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelItem: {
    flex: 1,
    alignItems: 'center',
  },
  levelDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
    marginHorizontal: 16,
  },
  levelLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  levelValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  levelAnalysis: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  levelAnalysisText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  levelDistanceText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 2,
  },
  dataTableContainer: {
    padding: 20,
    paddingTop: 0,
  },
  dataTable: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tableCellTime: {
    color: '#888',
    fontSize: 10,
    flex: 1,
    textAlign: 'center',
  },
  tableCell: {
    color: '#fff',
    fontSize: 10,
    flex: 1,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  bottomSpacing: {
    height: 40,
  },
});