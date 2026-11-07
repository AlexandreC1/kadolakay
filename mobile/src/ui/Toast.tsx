import { CheckCircle } from "phosphor-react-native";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/data/StoreProvider";
import { radius, space } from "@/theme/tokens";
import { haptic } from "./Tap";
import { T } from "./Text";
import { TAB_BAR_SPACE } from "./Screen";

const ToastContext = createContext<(message: string) => void>(() => {});

/** Calm, specific confirmations ("Added to Maryaj Jean & Rose"), announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    haptic("success");
    setMessage(m);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={[styles.layer, { bottom: insets.bottom + TAB_BAR_SPACE }]}>
        {message ? (
          <Animated.View key={message} entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(180)} style={[styles.toast, { backgroundColor: c.ink }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <CheckCircle size={20} color={c.accent} weight="fill" />
            <T variant="label" style={{ color: c.canvas, flexShrink: 1 }}>{message}</T>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  layer: { position: "absolute", left: space.md, right: space.md, alignItems: "center" },
  toast: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingVertical: 12, paddingHorizontal: space.md, borderRadius: radius.pill, maxWidth: 480 },
});
