import "@/global.css";

import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif";
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-store";

SplashScreen.preventAutoHideAsync();

// Signed URLs sind 60 min gültig; 45 min staleTime verhindert unnötige Neuabfragen
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 45 * 60 * 1000, gcTime: 60 * 60 * 1000 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    InstrumentSerif_400Regular_Italic,
  });
  const { session, ready } = useAuth();

  useEffect(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)/login" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
