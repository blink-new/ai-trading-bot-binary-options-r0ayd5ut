import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { TrendingUp, Brain, Settings, BarChart3 } from 'lucide-react-native';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1a1a1a',
            borderTopWidth: 0,
            height: 80,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#00d4aa',
          tabBarInactiveTintColor: '#666',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Trading Bot',
            tabBarIcon: ({ color, size }) => (
              <TrendingUp color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="analysis"
          options={{
            title: 'AI Analysis',
            tabBarIcon: ({ color, size }) => (
              <Brain color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="chart"
          options={{
            title: 'Charts',
            tabBarIcon: ({ color, size }) => (
              <BarChart3 color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Settings color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      <StatusBar style="light" />
    </>
  );
}