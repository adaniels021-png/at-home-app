import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
  headerShown: false,
  tabBarActiveTintColor: '#4F46E5',
  tabBarInactiveTintColor: '#64748B',
  tabBarStyle: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    height: 76,
    borderRadius: 28,
    borderTopWidth: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingBottom: 12,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
    elevation: 8,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  tabBarIconStyle: {
    marginTop: 2,
  },
}}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="daily-lessons"
        options={{
          title: 'Lessons',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="routines"
        options={{
          title: 'Routine',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="communication"
        options={{
          title: 'Talk',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="activities"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="saved"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="worksheets"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="progress"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}