import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { CaretLeft, X } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Platform, type RefreshControlProps, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCopy } from "@/copy";
import { useColors, useScheme } from "@/data/StoreProvider";
import { hit, radius, space } from "@/theme/tokens";
import { Tap } from "./Tap";
import { T } from "./Text";

export const TAB_BAR_SPACE = 92;
const BAR = 52;

/**
 * The frame every screen shares: a large title that hands over to a compact,
 * translucent bar as you scroll, an optional back or close control, and an
 * optional footer that stays above the keyboard and the home indicator.
 */
export function Screen({ title, eyebrow, subtitle, back, close, right, children, footer, inTabs, padded = true, largeTitle = true, refreshControl, hero }: {
  title: string; eyebrow?: ReactNode; subtitle?: ReactNode; back?: boolean; close?: boolean; right?: ReactNode; children: ReactNode;
  footer?: ReactNode; inTabs?: boolean; padded?: boolean; largeTitle?: boolean; refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Replaces the large title block, for screens that open on a picture or a card. */
  hero?: ReactNode;
}) {
  const c = useColors();
  const scheme = useScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useCopy();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const compact = useAnimatedStyle(() => ({ opacity: largeTitle || hero ? interpolate(y.value, [28, 56], [0, 1], Extrapolation.CLAMP) : 1 }));
  const barEdge = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 24], [0, 1], Extrapolation.CLAMP) }));
  const large = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [-80, 0, 60], [12, 0, -8], Extrapolation.CLAMP) }],
  }));
  const top = insets.top + BAR;
  const bottomSpace = footer ? 0 : (inTabs ? TAB_BAR_SPACE : 0) + insets.bottom + space.xl;
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={[styles.root, { backgroundColor: c.canvas }]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={refreshControl}
        contentContainerStyle={{ paddingTop: top, paddingBottom: bottomSpace, paddingHorizontal: padded ? space.md : 0 }}
      >
        {hero ?? (largeTitle ? (
          <Animated.View style={[styles.largeBlock, !padded && { paddingHorizontal: space.md }, large]}>
            {eyebrow ? <View style={{ marginBottom: 6 }}>{typeof eyebrow === "string" ? <T variant="overline" color="accentInk">{eyebrow}</T> : eyebrow}</View> : null}
            <T variant="largeTitle" accessibilityRole="header">{title}</T>
            {subtitle ? <View style={{ marginTop: 6 }}>{typeof subtitle === "string" ? <T color="muted">{subtitle}</T> : subtitle}</View> : null}
          </Animated.View>
        ) : null)}
        {children}
      </Animated.ScrollView>

      <View style={[styles.bar, { height: top, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, barEdge]} pointerEvents="none">
          {Platform.OS === "ios" ? (
            <BlurView intensity={60} tint={scheme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tabBar }]} />
          )}
          <View style={[styles.hairline, { backgroundColor: c.line }]} />
        </Animated.View>
        <View style={styles.barRow} pointerEvents="box-none">
          <View style={styles.side}>
            {back || close ? (
              <Tap accessibilityLabel={close ? t.common.close : t.common.back} onPress={leave} style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}>
                {close ? <X size={20} color={c.ink} weight="bold" /> : <CaretLeft size={20} color={c.ink} weight="bold" />}
              </Tap>
            ) : null}
          </View>
          <Animated.View style={[styles.compactTitle, compact]} pointerEvents="none">
            <T variant="heading" numberOfLines={1}>{title}</T>
          </Animated.View>
          <View style={[styles.side, styles.right]}>{right}</View>
        </View>
      </View>

      {footer ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.sm, backgroundColor: c.canvas, borderColor: c.line }]}>{footer}</View>
      ) : null}
    </View>
  );
}

export function RoundButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  const c = useColors();
  return (
    <Tap accessibilityLabel={label} onPress={onPress} style={[styles.round, { backgroundColor: c.surface, borderColor: c.line }]}>
      {children}
    </Tap>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  largeBlock: { paddingTop: space.xs, paddingBottom: space.lg },
  bar: { position: "absolute", top: 0, left: 0, right: 0 },
  hairline: { position: "absolute", left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  barRow: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: space.sm },
  side: { minWidth: hit, flexDirection: "row", gap: space.xs },
  right: { justifyContent: "flex-end" },
  compactTitle: { flex: 1, alignItems: "center", paddingHorizontal: space.xs },
  round: { width: hit, height: hit, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  footer: { paddingTop: space.sm, paddingHorizontal: space.md, borderTopWidth: StyleSheet.hairlineWidth, gap: space.xs },
});
