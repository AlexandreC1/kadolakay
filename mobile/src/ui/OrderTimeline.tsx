import { Check } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useCopy } from "@/copy";
import { useColors } from "@/data/StoreProvider";
import { orderFlow } from "@/data/store";
import type { OrderStatus } from "@/data/types";
import { space } from "@/theme/tokens";
import { T } from "./Text";

/** Paid, confirmed by the shop, on the way, delivered: the steps done are filled. */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const c = useColors();
  const k = useCopy();
  const at = orderFlow.indexOf(status);
  return (
    <View accessibilityRole="list">
      {orderFlow.map((s, i) => {
        const done = i <= at;
        const last = i === orderFlow.length - 1;
        return (
          <View key={s} style={styles.step} accessibilityRole="text" accessibilityLabel={`${k.t.purchases.status[s]}${done ? ", ✓" : ""}`}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: done ? c.accentInk : c.surface, borderColor: done ? c.accentInk : c.lineStrong }]}>
                {done ? <Check size={12} color={c.canvas} weight="bold" /> : null}
              </View>
              {!last ? <View style={[styles.line, { backgroundColor: i < at ? c.accentInk : c.line }]} /> : null}
            </View>
            <T variant={i === at ? "bodyStrong" : "body"} color={done ? "ink" : "muted"} style={{ paddingBottom: last ? 0 : space.lg }}>{k.t.purchases.status[s]}</T>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: "row", gap: space.sm },
  rail: { alignItems: "center", width: 22 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  line: { width: 2, flex: 1, marginVertical: 2 },
});
