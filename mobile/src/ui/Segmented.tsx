import { useState } from "react";
import { type LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useColors } from "@/data/StoreProvider";
import { motion, radius } from "@/theme/tokens";
import { haptic } from "./Tap";
import { T } from "./Text";

/** Two to four options; the thumb glides to the chosen one. */
export function Segmented<K extends string>({ options, value, onChange, label }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void; label: string }) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const seg = width / options.length;
  const thumb = useAnimatedStyle(() => ({ width: seg - 4, transform: [{ translateX: withSpring(index * seg + 2, motion.spring) }] }), [index, seg]);
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: c.surfaceMuted }]}
    >
      {width > 0 ? <Animated.View style={[styles.thumb, { backgroundColor: c.surfaceRaised, shadowColor: c.shadow }, thumb]} /> : null}
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.key === value }}
          onPress={() => { if (o.key !== value) { haptic(); onChange(o.key); } }}
          style={styles.option}
        >
          <T variant="label" style={{ color: o.key === value ? c.ink : c.muted }}>{o.label}</T>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.md, padding: 2, minHeight: 40 },
  thumb: { position: "absolute", top: 2, bottom: 2, left: 0, borderRadius: radius.md - 2, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  option: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 40 },
});
