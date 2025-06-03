import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TradingSignal } from './TradingBotEngine';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permissions
      await this.registerForPushNotificationsAsync();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
    }
  }

  private async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      this.expoPushToken = token.data;
      await AsyncStorage.setItem('expoPushToken', token.data);
      
      console.log('Push token:', token.data);
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private setupNotificationListeners(): void {
    // Handle notifications when app is in foreground
    Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification tap
    Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Handle navigation or actions based on notification data
    });
  }

  async sendTradingSignalNotification(signal: TradingSignal): Promise<void> {
    try {
      const title = `🚀 ${signal.symbol} Trading Signal`;
      const body = `${signal.direction} signal with ${(signal.confidence * 100).toFixed(1)}% confidence`;
      
      const notificationContent = {
        title,
        body,
        data: {
          type: 'trading_signal',
          signal: JSON.stringify(signal),
        },
        sound: 'default',
      };

      // Schedule local notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      // Store notification in history
      await this.storeNotificationHistory({
        id: Date.now().toString(),
        title,
        body,
        timestamp: Date.now(),
        data: signal,
        read: false,
      });

    } catch (error) {
      console.error('Error sending trading signal notification:', error);
    }
  }

  async sendMarketAlertNotification(symbol: string, message: string, type: 'warning' | 'info' | 'success'): Promise<void> {
    try {
      const icons = {
        warning: '⚠️',
        info: 'ℹ️',
        success: '✅',
      };

      const title = `${icons[type]} ${symbol} Market Alert`;
      
      const notificationContent = {
        title,
        body: message,
        data: {
          type: 'market_alert',
          symbol,
          alertType: type,
        },
        sound: 'default',
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      await this.storeNotificationHistory({
        id: Date.now().toString(),
        title,
        body: message,
        timestamp: Date.now(),
        data: { symbol, type },
        read: false,
      });

    } catch (error) {
      console.error('Error sending market alert notification:', error);
    }
  }

  async sendModelPerformanceNotification(symbol: string, accuracy: number, totalTrades: number): Promise<void> {
    try {
      const title = `📊 ${symbol} Model Update`;
      const body = `Model accuracy: ${(accuracy * 100).toFixed(1)}% (${totalTrades} trades)`;
      
      const notificationContent = {
        title,
        body,
        data: {
          type: 'model_performance',
          symbol,
          accuracy,
          totalTrades,
        },
        sound: 'default',
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      await this.storeNotificationHistory({
        id: Date.now().toString(),
        title,
        body,
        timestamp: Date.now(),
        data: { symbol, accuracy, totalTrades },
        read: false,
      });

    } catch (error) {
      console.error('Error sending model performance notification:', error);
    }
  }

  async scheduleMarketOpenNotification(): Promise<void> {
    try {
      // Cancel existing market open notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Schedule for market open times (simplified - assumes UTC)
      const marketOpenTimes = [
        { hour: 8, minute: 0 }, // London market
        { hour: 13, minute: 30 }, // New York market
        { hour: 0, minute: 0 }, // Tokyo market
      ];

      for (const time of marketOpenTimes) {
        const trigger = {
          hour: time.hour,
          minute: time.minute,
          repeats: true,
        };

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📈 Market Open',
            body: 'Major forex market is now open for trading',
            data: { type: 'market_open' },
            sound: 'default',
          },
          trigger,
        });
      }

    } catch (error) {
      console.error('Error scheduling market open notifications:', error);
    }
  }

  private async storeNotificationHistory(notification: any): Promise<void> {
    try {
      const key = 'notification_history';
      const existing = await AsyncStorage.getItem(key);
      let history = existing ? JSON.parse(existing) : [];
      
      history.unshift(notification); // Add to beginning
      
      // Keep only last 100 notifications
      if (history.length > 100) {
        history = history.slice(0, 100);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(history));
    } catch (error) {
      console.error('Error storing notification history:', error);
    }
  }

  async getNotificationHistory(): Promise<any[]> {
    try {
      const key = 'notification_history';
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting notification history:', error);
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const history = await this.getNotificationHistory();
      const updated = history.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      );
      
      await AsyncStorage.setItem('notification_history', JSON.stringify(updated));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async clearNotificationHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem('notification_history');
    } catch (error) {
      console.error('Error clearing notification history:', error);
    }
  }

  async getUnreadNotificationCount(): Promise<number> {
    try {
      const history = await this.getNotificationHistory();
      return history.filter(notification => !notification.read).length;
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  async enableNotifications(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('notifications_enabled', JSON.stringify(enabled));
      
      if (!enabled) {
        // Cancel all scheduled notifications
        await Notifications.cancelAllScheduledNotificationsAsync();
      } else {
        // Re-enable market open notifications
        await this.scheduleMarketOpenNotification();
      }
    } catch (error) {
      console.error('Error enabling/disabling notifications:', error);
    }
  }

  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem('notifications_enabled');
      return stored ? JSON.parse(stored) : true; // Default to enabled
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return true;
    }
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }
}