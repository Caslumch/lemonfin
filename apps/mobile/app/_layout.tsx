import "../global.css";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  Outfit_600SemiBold,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from "@expo-google-fonts/dm-sans";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { useFonts } from "expo-font";
import { Providers } from "@/providers/providers";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_600SemiBold,
    Outfit_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <Providers>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </Providers>
  );
}
