import { Stack } from 'expo-router';

import { CreateFlowProvider } from '@/lib/create-flow';

/**
 * Create listing is four screens over ONE draft, so the draft lives in the
 * layout: Photos → Where it is → Essentials → Review, each pushed onto the
 * last, all reading and writing the same listing on the server.
 */
export default function CreateLayout() {
  return (
    <CreateFlowProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="where" />
        <Stack.Screen name="essentials" />
        <Stack.Screen name="review" />
      </Stack>
    </CreateFlowProvider>
  );
}
