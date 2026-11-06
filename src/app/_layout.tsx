import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import { FilterProvider } from '@/lib/filters';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <FilterProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
            <Stack.Screen name="messages" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="place" />
            <Stack.Screen name="alerts" />
            <Stack.Screen name="preferences" />
            <Stack.Screen name="account" />
            <Stack.Screen name="sellers" />
            <Stack.Screen name="support" />
            <Stack.Screen name="create" />
            <Stack.Screen name="u/[username]" />
            <Stack.Screen name="listing/[id]" />
            <Stack.Screen name="thread/[id]" />
          </Stack>
          </FilterProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
