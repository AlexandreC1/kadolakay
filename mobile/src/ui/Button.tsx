import type { Icon as PhosphorIcon } from "phosphor-react-native";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useColors } from "@/data/StoreProvider";
import { hit, radius, space } from "@/theme/tokens";
import { Tap } from "./Tap";
import { T } from "./Text";

type Kind = "primary" | "secondary" | "quiet" | "accent";

export function Button({ label, onPress, kind = "primary", icon: Icon, disabled, busy, full, small, style, accessibilityHint }: {
  label: string; onPress?: () => void; kind?: Kind; icon?: PhosphorIcon; disabled?: boolean; busy?: boolean;
  full?: boolean; small?: boolean; style?: StyleProp<ViewStyle>; accessibilityHint?: string;
}) {
  const c = useColors();
  // "accent" is mint with evergreen text in both themes, for actions on dark surfaces.
  const bg = kind === "primary" ? c.action : kind === "accent" ? c.accent : kind === "secondary" ? c.surface : "transparent";
  const fg = kind === "primary" ? c.onAction : kind === "accent" ? "#102E29" : kind === "secondary" ? c.ink : c.accentInk;
  return (
    <Tap
      onPress={disabled || busy ? undefined : onPress}
      disabled={disabled || busy}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={[
        styles.base,
        small && styles.small,
        full && styles.full,
        { backgroundColor: bg, borderColor: kind === "secondary" ? c.lineStrong : "transparent", opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={styles.row}>
          {Icon ? <Icon size={small ? 18 : 20} color={fg} weight="bold" /> : null}
          <T variant={small ? "label" : "bodyStrong"} style={{ color: fg }} numberOfLines={1}>{label}</T>
        </View>
      )}
    </Tap>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, paddingHorizontal: space.lg, borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  small: { minHeight: hit, paddingHorizontal: space.md },
  full: { alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: space.xs },
});
