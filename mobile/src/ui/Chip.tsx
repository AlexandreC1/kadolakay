import type { Icon as PhosphorIcon } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useColors } from "@/data/StoreProvider";
import { hit, radius, space } from "@/theme/tokens";
import { Tap } from "./Tap";
import { T } from "./Text";

export function Chip({ label, selected, onPress, icon: Icon, count }: { label: string; selected?: boolean; onPress?: () => void; icon?: PhosphorIcon; count?: number }) {
  const c = useColors();
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={[styles.chip, { backgroundColor: selected ? c.ink : c.surface, borderColor: selected ? c.ink : c.line }]}
    >
      <View style={styles.row}>
        {Icon ? <Icon size={18} color={selected ? c.canvas : c.secondary} weight={selected ? "fill" : "regular"} /> : null}
        <T variant="label" style={{ color: selected ? c.canvas : c.ink }}>{label}</T>
        {count !== undefined ? <T variant="caption" style={{ color: selected ? c.canvas : c.muted }}>{count}</T> : null}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center", marginVertical: (hit - 40) / 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
});

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: space.xs }}>{children}</View>;
}
