import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

/**
 * Bar order is Home · Search · Saved · Menu. `index` stays the group's default
 * route, so the app still opens on Search — the screen with the listings —
 * while Home sits first in the bar.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="index" options={{ title: 'Search' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu' }} />
    </Tabs>
  );
}
