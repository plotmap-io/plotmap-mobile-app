import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

/**
 * Bar order is Search · Saved · Home · Menu — the web's `BottomNav`. `index`
 * is both the group's default route and the first tab, so the app opens on
 * the map, which is the front door everywhere.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Search' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
    </Tabs>
  );
}
