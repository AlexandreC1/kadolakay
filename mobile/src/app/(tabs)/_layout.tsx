import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import { Gift, House, ListChecks, Plus, UserCircle, type Icon } from "phosphor-react-native";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCopy } from "@/copy";
import { useColors, useScheme } from "@/data/StoreProvider";
import { motion, radius, space } from "@/theme/tokens";
import { haptic, Tap } from "@/ui/Tap";
import { T } from "@/ui/Text";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="lists" />
      <Tabs.Screen name="new" />
      <Tabs.Screen name="gifts" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const icons: Record<string, Icon> = { index: House, lists: ListChecks, gifts: Gift, account: UserCircle };

/**
 * A floating, translucent bar. The highlight glides between tabs; "New list" is
 * the one raised action and opens the create flow over whatever you were doing.
 */
function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const c = useColors();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { shell } = useCopy();
  const [width, setWidth] = useState(0);
  const labels: Record<string, string> = { index: shell.home, lists: shell.lists, new: shell.newList, gifts: shell.gifts, account: shell.account };
  const slot = width / state.routes.length;
  const pill = useAnimatedStyle(() => ({ width: slot - 12, transform: [{ translateX: withSpring(state.index * slot + 6, motion.spring) }] }), [state.index, slot]);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={shell.primary}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[styles.bar, { borderColor: c.line, shadowColor: c.shadow }]}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={70} tint={scheme === "dark" ? "dark" : "light"} style={[StyleSheet.absoluteFill, styles.clip]} />
        ) : (
          // Web and Android: near-opaque, with a backdrop blur where the browser supports it.
          <View style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: c.tabBar }, Platform.OS === "web" ? ({ backdropFilter: "blur(20px)" } as object) : null]} />
        )}
        {width > 0 && state.routes[state.index]?.name !== "new" ? <Animated.View style={[styles.pill, { backgroundColor: c.accentSoft }, pill]} /> : null}
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          if (route.name === "new") {
            return (
              <View key={route.key} style={styles.item}>
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={labels.new}
                  onPress={() => router.push("/create")}
                  style={[styles.newBtn, { backgroundColor: c.action, shadowColor: c.shadow }]}
                >
                  <Plus size={24} color={c.onAction} weight="bold" />
                </Tap>
              </View>
            );
          }
          const Icon = icons[route.name] ?? House;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={labels[route.name]}
              onPress={() => {
                const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) { haptic(); navigateToTab(route.key); }
              }}
              style={styles.item}
            >
              <Icon size={24} color={focused ? c.accentInk : c.muted} weight={focused ? "fill" : "regular"} />
              <T variant="caption" style={{ fontSize: 11, lineHeight: 14, color: focused ? c.ink : c.muted }} numberOfLines={1}>{labels[route.name]}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: space.md, alignItems: "center" },
  bar: {
    flexDirection: "row", width: "100%", maxWidth: 520, height: 64, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  clip: { borderRadius: radius.xl, overflow: "hidden" },
  pill: { position: "absolute", top: 6, bottom: 6, left: 0, borderRadius: radius.lg },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2 },
  newBtn: { width: 48, height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
});
