
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: useClientOnlyValue(false, true),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Campus Feed',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'house.fill',
                android: 'home',
                web: 'home',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: 'My Reports',
          headerTitle: 'My Reports',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'doc.text.fill',
                android: 'description',
                web: 'description',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />

      <Tabs.Screen
  name="map"
  options={{
    title: 'Map',
    headerTitle: 'RVU Campus Map',
    tabBarIcon: ({ color }) => (
      <SymbolView
        name={{
          ios: 'map.fill',
          android: 'map',
          web: 'map',
        }}
        tintColor={color}
        size={24}
      />
    ),
  }}
/>

      <Tabs.Screen
        name="polls"
        options={{
          title: 'Polls',
          headerTitle: 'Campus Polls',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chart.bar.fill',
                android: 'poll',
                web: 'poll',
              }}
              tintColor={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
  );
}
