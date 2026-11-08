import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_500Medium } from "@expo-google-fonts/figtree/500Medium";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_700Bold } from "@expo-google-fonts/figtree/700Bold";
import { Fraunces_400Regular_Italic } from "@expo-google-fonts/fraunces/400Regular_Italic";
import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces/600SemiBold";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, SplashScreen, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StoreProvider, useColors, useScheme, useStore } from "@/data/StoreProvider";
import { ToastProvider } from "@/ui/Toast";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Fraunces_600SemiBold, Fraunces_400Regular_Italic,
  });
  // Fonts are bundled, so this only waits for a moment on first launch; on failure the system font is used.
  // The splash stays up until the saved session is checked too (see Themed).
  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StoreProvider>
        <Themed />
      </StoreProvider>
    </GestureHandlerRootView>
  );
}

const sheet = { presentation: "formSheet", sheetGrabberVisible: true, sheetCornerRadius: 28 } as const;

function Themed() {
  const { state } = useStore();
  // Hide the splash once the session is known, or after a few seconds offline.
  useEffect(() => {
    if (state.booted) { void SplashScreen.hideAsync(); return; }
    const id = setTimeout(() => void SplashScreen.hideAsync(), 5000);
    return () => clearTimeout(id);
  }, [state.booted]);
  const scheme = useScheme();
  const c = useColors();
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.canvas, card: c.surface, text: c.ink, border: c.line, primary: c.accentInk } }}>
      <ToastProvider>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.canvas }, animation: "default" }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="offer/[item]" options={{ ...sheet, sheetAllowedDetents: [0.92] }} />
          <Stack.Screen name="share/[slug]" options={{ ...sheet, sheetAllowedDetents: [0.86] }} />
          <Stack.Screen name="pick-list" options={{ ...sheet, sheetAllowedDetents: [0.5, 0.9] }} />
          <Stack.Screen name="create" options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }} />
          <Stack.Screen name="sign-in" options={{ presentation: "modal" }} />
          <Stack.Screen name="welcome" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}
