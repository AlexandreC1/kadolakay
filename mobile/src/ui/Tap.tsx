import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { motion } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function haptic(kind: "select" | "success" | "light" = "select") {
  if (Platform.OS === "web") return;
  if (kind === "success") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else if (kind === "light") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else void Haptics.selectionAsync();
}

/**
 * Every tappable surface: settles in slightly under the finger and springs back,
 * so the app answers before the next screen arrives. Still under reduced motion.
 */
export function Tap({ children, style, scaleTo = 0.97, onPress, haptics = true, ...rest }: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number; haptics?: boolean;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => { if (!reduced) scale.set(withSpring(scaleTo, motion.press)); rest.onPressIn?.(e); }}
      onPressOut={(e) => { scale.set(withSpring(1, motion.press)); rest.onPressOut?.(e); }}
      onPress={(e) => { if (haptics) haptic(); onPress?.(e); }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
