import { CaretRight, type Icon as PhosphorIcon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useColors } from "@/data/StoreProvider";
import { hit, motion, radius, space } from "@/theme/tokens";
import { Tap } from "./Tap";
import { T } from "./Text";

export function Card({ children, style, onPress, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const c = useColors();
  const base = [styles.card, { backgroundColor: c.surface, borderColor: c.line }, style];
  return onPress ? <Tap onPress={onPress} accessibilityLabel={label} scaleTo={0.985} style={base}>{children}</Tap> : <View style={base}>{children}</View>;
}

/** Content arrives in reading order, a beat apart. Reanimated skips it under reduced motion. */
export function Reveal({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(motion.enter).delay(Math.min(index, 8) * motion.stagger)} style={style}>
      {children}
    </Animated.View>
  );
}

export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: space.sm }, style]}>
      <View style={styles.sectionHead}>
        <T variant="heading" accessibilityRole="header" style={{ flex: 1 }}>{title}</T>
        {action && onAction ? (
          <Tap onPress={onAction} accessibilityLabel={action} style={styles.sectionAction}>
            <T variant="label" color="accentInk">{action}</T>
          </Tap>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function Row({ icon: Icon, label, value, hint, onPress, danger, last }: { icon?: PhosphorIcon; label: string; value?: string; hint?: string; onPress?: () => void; danger?: boolean; last?: boolean }) {
  const c = useColors();
  return (
    <Tap onPress={onPress} accessibilityLabel={value ? `${label}, ${value}` : label} scaleTo={0.99} style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }]}>
      {Icon ? <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}><Icon size={20} color={danger ? c.error : c.accentInk} /></View> : null}
      <View style={{ flex: 1 }}>
        <T variant="bodyStrong" style={danger ? { color: c.error } : undefined}>{label}</T>
        {hint ? <T variant="caption" color="muted">{hint}</T> : null}
      </View>
      {value ? <T variant="label" color="muted">{value}</T> : null}
      {onPress && !danger ? <CaretRight size={16} color={c.muted} /> : null}
    </Tap>
  );
}

export function Group({ children }: { children: ReactNode }) {
  const c = useColors();
  return <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.line }]}>{children}</View>;
}

export function Banner({ children, tone = "info", icon: Icon }: { children: ReactNode; tone?: "info" | "warning" | "success"; icon?: PhosphorIcon }) {
  const c = useColors();
  const bg = tone === "warning" ? c.warningSurface : tone === "success" ? c.successSurface : c.accentSoft;
  const fg = tone === "warning" ? c.warning : tone === "success" ? c.success : c.accentInk;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="summary">
      {Icon ? <Icon size={20} color={fg} weight="fill" /> : null}
      <View style={{ flex: 1 }}>{typeof children === "string" ? <T variant="label" style={{ color: fg }}>{children}</T> : children}</View>
    </View>
  );
}

export function Empty({ icon: Icon, title, text, children }: { icon: PhosphorIcon; title?: string; text: string; children?: ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.accentSoft }]}><Icon size={28} color={c.accentInk} /></View>
      {title ? <T variant="heading" style={{ textAlign: "center" }}>{title}</T> : null}
      <T color="muted" style={{ textAlign: "center", maxWidth: 320 }}>{text}</T>
      {children}
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" | "warning" | "success" }) {
  const c = useColors();
  const bg = tone === "accent" ? c.accentSoft : tone === "warning" ? c.warningSurface : tone === "success" ? c.successSurface : c.surfaceMuted;
  const fg = tone === "accent" ? c.accentInk : tone === "warning" ? c.warning : tone === "success" ? c.success : c.secondary;
  return <View style={[styles.pill, { backgroundColor: bg }]}><T variant="overline" style={{ color: fg }}>{label}</T></View>;
}

/** Progress through a flow: one segment per step, the current one filled. */
export function Steps({ count, current, label }: { count: number; current: number; label: string }) {
  const c = useColors();
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={styles.steps}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.step, { backgroundColor: i <= current ? c.accentInk : c.line }]} />
      ))}
    </View>
  );
}

export function Stepper({ value, min = 0, max = 99, onChange, label }: { value: number; min?: number; max?: number; onChange: (n: number) => void; label: string }) {
  const c = useColors();
  const btn = (delta: number, sign: string, disabled: boolean) => (
    <Tap disabled={disabled} accessibilityLabel={`${label} ${sign}`} onPress={() => onChange(value + delta)} style={[styles.stepBtn, { borderColor: c.lineStrong, opacity: disabled ? 0.35 : 1 }]}>
      <T variant="heading">{sign}</T>
    </Tap>
  );
  return (
    <View style={styles.stepper} accessibilityLabel={`${label}: ${value}`}>
      {btn(-1, "−", value <= min)}
      <T variant="title" style={{ minWidth: 40, textAlign: "center" }} accessibilityLiveRegion="polite">{value}</T>
      {btn(1, "+", value >= max)}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: space.sm },
  sectionHead: { flexDirection: "row", alignItems: "center" },
  sectionAction: { minHeight: hit, justifyContent: "center", paddingLeft: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 56, paddingVertical: space.sm, paddingHorizontal: space.md },
  rowIcon: { width: 36, height: 36, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  group: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
  banner: { flexDirection: "row", gap: space.sm, alignItems: "flex-start", padding: space.md, borderRadius: radius.md },
  empty: { alignItems: "center", gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.md },
  emptyIcon: { width: 56, height: 56, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  steps: { flexDirection: "row", gap: 6 },
  step: { flex: 1, height: 4, borderRadius: 2 },
  stepper: { flexDirection: "row", alignItems: "center", gap: space.md },
  stepBtn: { width: hit, height: hit, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
