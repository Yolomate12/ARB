// src/app/_layout.tsx
import "react-native-reanimated"; // musí byť úplne prvé

import { useColorScheme } from "@/components/useColorScheme";
import AuthProvider from "@/providers/AuthProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(user)",
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <AuthProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
              animationEnabled: false,
            }}
          >
            <Stack.Screen name="(user)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen
              name="modal"
              options={{
                presentation: "modal",
                gestureEnabled: false,
                animationEnabled: false,
              }}
            />
          </Stack>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
