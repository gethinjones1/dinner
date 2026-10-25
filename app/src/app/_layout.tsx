import Stack from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { SessionProvider, useSession } from '../lib/session';
import { colors } from '../lib/theme';

function RootStack() {
  const { session, loading } = useSession();
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" />
        <Stack.Screen name="post" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <RootStack />
    </SessionProvider>
  );
}
