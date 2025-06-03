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
import { TradingBotEngine, ModelMetrics } from '@/components/TradingBotEngine';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Activity,
  BarChart3,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface PerformanceCardProps {
  title: string;
  value: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
}

const PerformanceCard: React.FC<PerformanceCardProps> = ({ 
  title, value, subtitle, color, icon 
}) => (
  <View style={[styles.performanceCard, { borderColor: color }]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </View>
    <Text style={[styles.cardValue, { color }]}>{value}</Text>
    <Text style={styles.cardSubtitle}>{subtitle}</Text>
  </View>
);

interface ModelAnalysisProps {
  symbol: string;
  metrics: ModelMetrics;
  isLoading: boolean;
}

const ModelAnalysisCard: React.FC<ModelAnalysisProps> = ({ symbol, metrics, isLoading }) => {
  if (isLoading) {
    return (
      <View style={[styles.modelCard, styles.loadingCard]}>
        <RefreshCw size={20} color="#00d4aa" />
        <Text style={styles.modelSymbol}>{symbol}</Text>
        <Text style={styles.loadingText}>Evaluating...</Text>
      </View>
    );
  }

  const accuracyColor = metrics.accuracy >= 0.6 ? '#00ff88' : metrics.accuracy >= 0.5 ? '#ffa500' : '#ff4757';
  const winRateColor = metrics.winRate >= 0.6 ? '#00ff88' : metrics.winRate >= 0.5 ? '#ffa500' : '#ff4757';

  return (
    <View style={styles.modelCard}>
      <View style={styles.modelHeader}>
        <Text style={styles.modelSymbol}>{symbol}</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: accuracyColor + '20', borderColor: accuracyColor }
        ]}>
          <Text style={[styles.statusText, { color: accuracyColor }]}>
            {metrics.accuracy >= 0.6 ? 'GOOD' : metrics.accuracy >= 0.5 ? 'FAIR' : 'POOR'}
          </Text>
        </View>
      </View>
      
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Accuracy</Text>
          <Text style={[styles.metricValue, { color: accuracyColor }]}>
            {(metrics.accuracy * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Win Rate</Text>
          <Text style={[styles.metricValue, { color: winRateColor }]}>
            {(metrics.winRate * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Precision</Text>
          <Text style={styles.metricValue}>
            {(metrics.precision * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>F1 Score</Text>
          <Text style={styles.metricValue}>
            {(metrics.f1Score * 100).toFixed(1)}%
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Sharpe Ratio</Text>
          <Text style={styles.metricValue}>
            {metrics.sharpeRatio.toFixed(2)}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Trades</Text>
          <Text style={styles.metricValue}>
            {metrics.totalTrades}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function AnalysisScreen() {
  const [tradingBot] = useState(() => new TradingBotEngine());
  const [modelMetrics, setModelMetrics] = useState<Map<string, ModelMetrics>>(new Map());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const symbols = tradingBot.getSupportedSymbols();

  useEffect(() => {
    loadModelMetrics();
  }, []);

  const loadModelMetrics = async () => {
    setIsEvaluating(true);
    try {
      const metricsPromises = symbols.map(async (symbol) => {
        const metrics = await tradingBot.evaluateModel(symbol);
        return { symbol, metrics };
      });

      const results = await Promise.all(metricsPromises);
      const newMetrics = new Map();
      
      results.forEach(({ symbol, metrics }) => {
        newMetrics.set(symbol, metrics);
      });

      setModelMetrics(newMetrics);
    } catch (error) {
      console.error('Error loading model metrics:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadModelMetrics();
    setIsRefreshing(false);
  };

  // Calculate overall performance
  const calculateOverallPerformance = () => {
    const allMetrics = Array.from(modelMetrics.values());
    if (allMetrics.length === 0) {
      return {
        avgAccuracy: 0,
        avgWinRate: 0,
        totalTrades: 0,
        avgSharpe: 0
      };
    }

    const avgAccuracy = allMetrics.reduce((sum, m) => sum + m.accuracy, 0) / allMetrics.length;
    const avgWinRate = allMetrics.reduce((sum, m) => sum + m.winRate, 0) / allMetrics.length;
    const totalTrades = allMetrics.reduce((sum, m) => sum + m.totalTrades, 0);
    const avgSharpe = allMetrics.reduce((sum, m) => sum + m.sharpeRatio, 0) / allMetrics.length;

    return { avgAccuracy, avgWinRate, totalTrades, avgSharpe };
  };

  const overallPerf = calculateOverallPerformance();

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
          <Text style={styles.headerTitle}>AI Model Analysis</Text>
          <Text style={styles.headerSubtitle}>Deep Learning Performance Metrics</Text>
        </View>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={loadModelMetrics}
          disabled={isEvaluating}
        >
          <RefreshCw size={20} color="#00d4aa" />
        </TouchableOpacity>
      </View>

      {/* Overall Performance Cards */}
      <View style={styles.performanceContainer}>
        <Text style={styles.sectionTitle}>Overall Performance</Text>
        <View style={styles.performanceGrid}>
          <PerformanceCard
            title="Avg Accuracy"
            value={`${(overallPerf.avgAccuracy * 100).toFixed(1)}%`}
            subtitle="Model Precision"
            color="#00ff88"
            icon={<Target size={20} color="#00ff88" />}
          />
          <PerformanceCard
            title="Win Rate"
            value={`${(overallPerf.avgWinRate * 100).toFixed(1)}%`}
            subtitle="Profitable Trades"
            color="#00d4aa"
            icon={<TrendingUp size={20} color="#00d4aa" />}
          />
          <PerformanceCard
            title="Total Trades"
            value={overallPerf.totalTrades.toString()}
            subtitle="Completed Signals"
            color="#ffa500"
            icon={<Activity size={20} color="#ffa500" />}
          />
          <PerformanceCard
            title="Sharpe Ratio"
            value={overallPerf.avgSharpe.toFixed(2)}
            subtitle="Risk-Adjusted Return"
            color="#ff6b9d"
            icon={<BarChart3 size={20} color="#ff6b9d" />}
          />
        </View>
      </View>

      {/* AI Model Architecture */}
      <View style={styles.architectureContainer}>
        <Text style={styles.sectionTitle}>AI Architecture</Text>
        <View style={styles.architectureCard}>
          <View style={styles.architectureHeader}>
            <Brain size={24} color="#00d4aa" />
            <Text style={styles.architectureTitle}>Hybrid Neural Network</Text>
          </View>
          
          <View style={styles.layerContainer}>
            <View style={styles.layer}>
              <Text style={styles.layerTitle}>Input Layer</Text>
              <Text style={styles.layerDesc}>15 Features: RSI, MACD, Bollinger Bands, Moving Averages, Stochastic, Volatility</Text>
            </View>
            
            <View style={styles.layer}>
              <Text style={styles.layerTitle}>Hidden Layer</Text>
              <Text style={styles.layerDesc}>32 Neurons with ReLU Activation</Text>
            </View>
            
            <View style={styles.layer}>
              <Text style={styles.layerTitle}>Output Layer</Text>
              <Text style={styles.layerDesc}>1 Neuron with Sigmoid Activation (Call/Put Probability)</Text>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Feature Engineering:</Text>
            <Text style={styles.featureItem}>• Technical Indicators (RSI, MACD, Bollinger Bands)</Text>
            <Text style={styles.featureItem}>• Moving Averages (SMA20, SMA50, EMA12, EMA26)</Text>
            <Text style={styles.featureItem}>• Stochastic Oscillator (%K, %D)</Text>
            <Text style={styles.featureItem}>• Volatility Analysis</Text>
            <Text style={styles.featureItem}>• Support/Resistance Levels</Text>
            <Text style={styles.featureItem}>• Price Action Patterns</Text>
          </View>
        </View>
      </View>

      {/* Individual Model Performance */}
      <View style={styles.modelsContainer}>
        <Text style={styles.sectionTitle}>Individual Model Performance</Text>
        {symbols.map((symbol) => (
          <ModelAnalysisCard
            key={symbol}
            symbol={symbol}
            metrics={modelMetrics.get(symbol) || {
              accuracy: 0,
              precision: 0,
              recall: 0,
              f1Score: 0,
              sharpeRatio: 0,
              winRate: 0,
              totalTrades: 0,
              profitableTrades: 0
            }}
            isLoading={isEvaluating}
          />
        ))}
      </View>

      {/* Training Information */}
      <View style={styles.trainingContainer}>
        <Text style={styles.sectionTitle}>Training & Learning</Text>
        <View style={styles.trainingCard}>
          <View style={styles.trainingItem}>
            <CheckCircle size={16} color="#00ff88" />
            <Text style={styles.trainingText}>Supervised Learning with Historical Data</Text>
          </View>
          <View style={styles.trainingItem}>
            <CheckCircle size={16} color="#00ff88" />
            <Text style={styles.trainingText}>Backpropagation Weight Updates</Text>
          </View>
          <View style={styles.trainingItem}>
            <CheckCircle size={16} color="#00ff88" />
            <Text style={styles.trainingText}>Cross-Validation to Prevent Overfitting</Text>
          </View>
          <View style={styles.trainingItem}>
            <CheckCircle size={16} color="#00ff88" />
            <Text style={styles.trainingText}>Continuous Learning from New Data</Text>
          </View>
          <View style={styles.trainingItem}>
            <Zap size={16} color="#ffa500" />
            <Text style={styles.trainingText}>Real-time Model Adaptation</Text>
          </View>
          <View style={styles.trainingItem}>
            <AlertTriangle size={16} color="#ff4757" />
            <Text style={styles.trainingText}>Risk Management Integration</Text>
          </View>
        </View>
      </View>

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
  performanceContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  performanceCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: (width - 64) / 2,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#888',
    fontSize: 12,
  },
  architectureContainer: {
    padding: 20,
    paddingTop: 0,
  },
  architectureCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  architectureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  architectureTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  layerContainer: {
    marginBottom: 20,
  },
  layer: {
    backgroundColor: '#0f0f0f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00d4aa',
  },
  layerTitle: {
    color: '#00d4aa',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  layerDesc: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
  },
  featuresContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  featuresTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  featureItem: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 18,
  },
  modelsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  modelCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modelSymbol: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metricItem: {
    width: (width - 80) / 3,
  },
  metricLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trainingContainer: {
    padding: 20,
    paddingTop: 0,
  },
  trainingCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  trainingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trainingText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});