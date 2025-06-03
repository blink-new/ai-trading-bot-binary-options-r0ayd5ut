import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '@/components/NotificationService';
import { 
  Settings as SettingsIcon, 
  Bell,
  Shield,
  DollarSign,
  Brain,
  AlertTriangle,
  Info,
  Download,
  Trash2,
  RefreshCw,
  User,
  Lock,
  Globe,
  Smartphone
} from 'lucide-react-native';

interface SettingItemProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  rightComponent?: React.ReactNode;
  onPress?: () => void;
  showBorder?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  subtitle,
  icon,
  rightComponent,
  onPress,
  showBorder = true
}) => (
  <TouchableOpacity 
    style={[styles.settingItem, !showBorder && styles.settingItemNoBorder]}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={styles.settingLeft}>
      <View style={styles.settingIcon}>
        {icon}
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightComponent && (
      <View style={styles.settingRight}>
        {rightComponent}
      </View>
    )}
  </TouchableOpacity>
);

interface RiskSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: any;
  onSave: (settings: any) => void;
}

const RiskSettingsModal: React.FC<RiskSettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onSave
}) => {
  const [localSettings, setLocalSettings] = useState(settings);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Risk Management</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Position Sizing</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Position Size (%)</Text>
              <TextInput
                style={styles.textInput}
                value={localSettings.maxPositionSize?.toString() || '2'}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  maxPositionSize: parseFloat(text) || 2
                })}
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Daily Trades</Text>
              <TextInput
                style={styles.textInput}
                value={localSettings.maxDailyTrades?.toString() || '10'}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  maxDailyTrades: parseInt(text) || 10
                })}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Stop Loss & Take Profit</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Default Stop Loss (%)</Text>
              <TextInput
                style={styles.textInput}
                value={localSettings.defaultStopLoss?.toString() || '2'}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  defaultStopLoss: parseFloat(text) || 2
                })}
                keyboardType="numeric"
                placeholder="2"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Default Take Profit (%)</Text>
              <TextInput
                style={styles.textInput}
                value={localSettings.defaultTakeProfit?.toString() || '4'}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  defaultTakeProfit: parseFloat(text) || 4
                })}
                keyboardType="numeric"
                placeholder="4"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Signal Filtering</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Confidence (%)</Text>
              <TextInput
                style={styles.textInput}
                value={((localSettings.minConfidence || 0.6) * 100).toString()}
                onChangeText={(text) => setLocalSettings({
                  ...localSettings,
                  minConfidence: (parseFloat(text) || 60) / 100
                })}
                keyboardType="numeric"
                placeholder="60"
                placeholderTextColor="#666"
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              onSave(localSettings);
              onClose();
            }}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default function SettingsScreen() {
  const [notificationService] = useState(() => NotificationService.getInstance());
  
  // Notification Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [signalNotifications, setSignalNotifications] = useState(true);
  const [marketAlerts, setMarketAlerts] = useState(true);
  const [modelUpdates, setModelUpdates] = useState(false);

  // Trading Settings
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(false);
  const [riskSettingsVisible, setRiskSettingsVisible] = useState(false);
  const [riskSettings, setRiskSettings] = useState({
    maxPositionSize: 2,
    maxDailyTrades: 10,
    defaultStopLoss: 2,
    defaultTakeProfit: 4,
    minConfidence: 0.6
  });

  // App Settings
  const [darkMode, setDarkMode] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification settings
      const notifEnabled = await notificationService.areNotificationsEnabled();
      setNotificationsEnabled(notifEnabled);

      // Load other settings from AsyncStorage
      const settings = await AsyncStorage.getItem('app_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setSignalNotifications(parsed.signalNotifications ?? true);
        setMarketAlerts(parsed.marketAlerts ?? true);
        setModelUpdates(parsed.modelUpdates ?? false);
        setAutoTradingEnabled(parsed.autoTradingEnabled ?? false);
        setAdvancedMode(parsed.advancedMode ?? false);
        setRiskSettings(parsed.riskSettings ?? riskSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        signalNotifications,
        marketAlerts,
        modelUpdates,
        autoTradingEnabled,
        advancedMode,
        riskSettings
      };
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  useEffect(() => {
    saveSettings();
  }, [signalNotifications, marketAlerts, modelUpdates, autoTradingEnabled, advancedMode, riskSettings]);

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    await notificationService.enableNotifications(enabled);
    
    if (enabled) {
      Alert.alert(
        'Notifications Enabled',
        'You will now receive trading signals and market alerts.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleAutoTradingToggle = (enabled: boolean) => {
    if (enabled) {
      Alert.alert(
        'Enable Auto Trading?',
        'This will automatically generate trading signals based on AI analysis. Make sure you understand the risks.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: () => setAutoTradingEnabled(true),
            style: 'destructive'
          }
        ]
      );
    } else {
      setAutoTradingEnabled(false);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all trading history, model data, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              await notificationService.clearNotificationHistory();
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          }
        }
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'This feature will export your trading history and model performance data.',
      [
        { text: 'Cancel' },
        { text: 'Export', onPress: () => {
          Alert.alert('Coming Soon', 'Data export feature will be available in the next update.');
        }}
      ]
    );
  };

  const showAppInfo = () => {
    Alert.alert(
      'AI Trading Bot v1.0',
      'Developed with advanced machine learning algorithms for binary options trading.\n\n• Real-time market data from Yahoo Finance\n• Neural network predictions\n• Technical analysis indicators\n• Risk management tools\n\nFor support: contact@tradingbot.ai',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Configure your trading preferences</Text>
        </View>
        <SettingsIcon size={24} color="#00d4aa" />
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <SettingItem
          title="Push Notifications"
          subtitle="Enable/disable all notifications"
          icon={<Bell size={20} color="#00d4aa" />}
          rightComponent={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: '#333', true: '#00d4aa' }}
              thumbColor="#fff"
            />
          }
        />

        <SettingItem
          title="Trading Signals"
          subtitle="Get notified of new AI signals"
          icon={<Brain size={20} color="#ffa500" />}
          rightComponent={
            <Switch
              value={signalNotifications}
              onValueChange={setSignalNotifications}
              trackColor={{ false: '#333', true: '#00d4aa' }}
              thumbColor="#fff"
              disabled={!notificationsEnabled}
            />
          }
        />

        <SettingItem
          title="Market Alerts"
          subtitle="Important market events"
          icon={<AlertTriangle size={20} color="#ff4757" />}
          rightComponent={
            <Switch
              value={marketAlerts}
              onValueChange={setMarketAlerts}
              trackColor={{ false: '#333', true: '#00d4aa' }}
              thumbColor="#fff"
              disabled={!notificationsEnabled}
            />
          }
        />

        <SettingItem
          title="Model Updates"
          subtitle="AI performance notifications"
          icon={<RefreshCw size={20} color="#9c88ff" />}
          rightComponent={
            <Switch
              value={modelUpdates}
              onValueChange={setModelUpdates}
              trackColor={{ false: '#333', true: '#00d4aa' }}
              thumbColor="#fff"
              disabled={!notificationsEnabled}
            />
          }
          showBorder={false}
        />
      </View>

      {/* Trading Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trading</Text>
        
        <SettingItem
          title="Auto Trading"
          subtitle="Automatically generate signals"
          icon={<Globe size={20} color="#00ff88" />}
          rightComponent={
            <Switch
              value={autoTradingEnabled}
              onValueChange={handleAutoTradingToggle}
              trackColor={{ false: '#333', true: '#00d4aa' }}
              thumbColor="#fff"
            />
          }
        />

        <SettingItem
          title="Risk Management"
          subtitle="Configure position sizing and limits"
          icon={<Shield size={20} color="#ff6b9d" />}
          onPress={() => setRiskSettingsVisible(true)}
        />

        <SettingItem
          title="Advanced Mode"
          subtitle="Show detailed technical analysis"
          icon={<Brain size={20} color="#9c88ff" />}
          rightComponent={
            <Switch
              value={advancedMode}
              onValueChange={setAdvancedMode}
              trackColor={{ false: '#333', true: '#00d4aa' }}
              thumbColor="#fff"
            />
          }
          showBorder={false}
        />
      </View>

      {/* Data & Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        
        <SettingItem
          title="Export Data"
          subtitle="Download your trading history"
          icon={<Download size={20} color="#00d4aa" />}
          onPress={exportData}
        />

        <SettingItem
          title="Clear All Data"
          subtitle="Reset app to factory settings"
          icon={<Trash2 size={20} color="#ff4757" />}
          onPress={clearAllData}
        />

        <SettingItem
          title="Privacy Policy"
          subtitle="View our privacy policy"
          icon={<Lock size={20} color="#888" />}
          onPress={() => Alert.alert('Privacy Policy', 'Your data is stored locally and never shared without consent.')}
          showBorder={false}
        />
      </View>

      {/* App Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        
        <SettingItem
          title="About"
          subtitle="Version 1.0 - AI Trading Bot"
          icon={<Info size={20} color="#00d4aa" />}
          onPress={showAppInfo}
        />

        <SettingItem
          title="Support"
          subtitle="Get help and contact us"
          icon={<User size={20} color="#ffa500" />}
          onPress={() => Alert.alert('Support', 'Email: support@tradingbot.ai\nWebsite: www.tradingbot.ai')}
        />

        <SettingItem
          title="Device Info"
          subtitle="App and device information"
          icon={<Smartphone size={20} color="#888" />}
          onPress={() => Alert.alert('Device Info', 'Samsung S24 Ultra Compatible\nReact Native Expo\nReal-time Data via Yahoo Finance')}
          showBorder={false}
        />
      </View>

      {/* Current Settings Display */}
      {advancedMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Configuration</Text>
          <View style={styles.configCard}>
            <Text style={styles.configText}>Max Position Size: {riskSettings.maxPositionSize}%</Text>
            <Text style={styles.configText}>Daily Trade Limit: {riskSettings.maxDailyTrades}</Text>
            <Text style={styles.configText}>Stop Loss: {riskSettings.defaultStopLoss}%</Text>
            <Text style={styles.configText}>Take Profit: {riskSettings.defaultTakeProfit}%</Text>
            <Text style={styles.configText}>Min Confidence: {(riskSettings.minConfidence * 100).toFixed(0)}%</Text>
          </View>
        </View>
      )}

      <RiskSettingsModal
        visible={riskSettingsVisible}
        onClose={() => setRiskSettingsVisible(false)}
        settings={riskSettings}
        onSave={setRiskSettings}
      />

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
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingItemNoBorder: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  settingRight: {
    marginLeft: 16,
  },
  configCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  configText: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalClose: {
    color: '#00d4aa',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#00d4aa',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSpacing: {
    height: 40,
  },
});